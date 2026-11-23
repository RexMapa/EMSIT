const $ = selector => document.querySelector(selector);
const settings = $('#password-settings');
const settingsToggle = $('#settings-toggle');
const passwordForm = $('#password-form');

function setSettings(open) {
  settings.hidden = !open;
  settingsToggle.setAttribute('aria-expanded', String(open));
  if (open) {
    passwordForm.elements.currentPassword.focus();
  } else {
    passwordForm.reset();
    $('#password-status').textContent = '';
  }
}

settingsToggle.addEventListener('click', () => setSettings(settings.hidden));
passwordForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = passwordForm.querySelector('button[type="submit"]');
  const status = $('#password-status');
  const {currentPassword, newPassword, confirmPassword} = Object.fromEntries(new FormData(passwordForm));
  if (newPassword !== confirmPassword) {
    status.textContent = 'The new passwords must match.';
    return;
  }
  button.disabled = true;
  status.textContent = 'Saving password…';
  try {
    await api('/api/session', {method:'PATCH',body:JSON.stringify({currentPassword,newPassword})});
    passwordForm.reset();
    status.textContent = 'Password changed. Other sessions have been signed out.';
  } catch (error) {
    if (error.status === 401) {
      signedIn(false);
      $('#admin-status').textContent = 'Your session expired. Please sign in again.';
    } else {
      status.textContent = error.message;
    }
  } finally {
    button.disabled = false;
  }
});

const forms = [...document.querySelectorAll('.inbox-tabs button')];
let activeForm = forms[0];
const requests = $('#requests');
const liveInterval = 5000;
let offset = 0;
let hasMore = false;
let pendingSaves = 0;
let lastItems;
let requestController;
let liveTimer;
$('#search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  requestController?.abort();
  searchTimer = setTimeout(() => {
    searchTimer = undefined;
    offset = 0;
    load();
  }, 300);
});

document.addEventListener('visibilitychange', () => scheduleLiveUpdate(0));
async function api(path, options={}) {
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(!response.ok){const error=new Error(data.error||'Request failed.');error.status=response.status;throw error}
  return data;
}
function signedIn(value) {
  document.body.dataset.adminAuthenticated = String(value);
  $('#login-panel').hidden = value;
  $('#inbox').hidden = !value;
  $('.admin-header-actions').hidden = !value;
  if (!value) {
    clearTimeout(liveTimer);
    clearTimeout(searchTimer);
    searchTimer = undefined;
    requestController?.abort();
    lastItems = undefined;
    requests.replaceChildren();
    setSettings(false);
  }
}
function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el}
function render(items){
  const list=$('#requests');list.replaceChildren();
  if(!items.length){list.append(element('p','No requests match these filters.','admin-note'));return}
  for(const item of items){
    const card=element('article',undefined,'request-card'),top=element('div',undefined,'request-top'),identity=element('div');
    identity.append(element('span',activeForm.textContent,'eyebrow'),element('h2',item.first_name+' '+item.last_name));
    const meta=element('div',undefined,'request-meta'), email=element('a',item.email);email.href='mailto:'+encodeURIComponent(item.email);meta.append(email,element('div',item.company||'Company not supplied'));identity.append(meta);
    const label=element('label','Status'),select=element('select');select.setAttribute('aria-label','Status for '+item.first_name+' '+item.last_name);
    for(const value of ['new','contacted','closed'])select.add(new Option(value[0].toUpperCase()+value.slice(1),value));
    select.value=item.status;label.append(select);top.append(identity,label);card.append(top);
    card.append(element('p',item.message||'No additional message.','request-message'));
    const foot=element('div',undefined,'request-footer'),reply=element('a','Reply by email ↗','button outline');
    reply.href='mailto:'+encodeURIComponent(item.email)+'?subject='+encodeURIComponent('Your EMSIT submission');
    foot.append(element('span',new Date(item.created_at).toLocaleString()+' · '+item.id.slice(0,8).toUpperCase()),reply);card.append(foot);
    const feedback=element('p','','request-feedback');feedback.setAttribute('role','status');card.append(feedback);
    select.addEventListener('change',async()=>{select.disabled=true;++pendingSaves;try{await api('/api/requests',{method:'PATCH',body:JSON.stringify({id:item.id,status:select.value})});item.status=select.value;feedback.textContent='Status saved. No email was sent.'}catch(error){select.value=item.status;feedback.textContent=error.message;if(error.status===401)signedIn(false)}finally{--pendingSaves;select.disabled=false}});
    list.append(card);
  }
}
function inboxVisible() {
  return !$('#inbox').hidden && !document.hidden;
}

function safeToUpdate() {
  return pendingSaves === 0 && !requests.contains(document.activeElement);
}

function scheduleLiveUpdate(delay = liveInterval) {
  clearTimeout(liveTimer);
  if (!inboxVisible()) return;
  liveTimer = setTimeout(() => {
    if (searchTimer || !safeToUpdate()) {
      scheduleLiveUpdate();
      return;
    }
    load({background:true});
  }, delay);
}

async function load({background = false} = {}) {
  if ($('#inbox').hidden) return;
  clearTimeout(liveTimer);
  requestController?.abort();
  const controller = new AbortController();
  requestController = controller;
  const status = $('#admin-status');
  const previous = $('#previous');
  const next = $('#next');
  if (!background) {
    status.textContent = 'Loading requests…';
    previous.disabled = true;
    next.disabled = true;
    lastItems = undefined;
  }
  try {
    const query = new URLSearchParams({
      kind: activeForm.dataset.kind,
      status: $('#status').value,
      search: $('#search').value.trim(),
      offset
    });
    const result = await api('/api/requests?' + query, {signal:controller.signal});
    if (controller.signal.aborted || (background && !safeToUpdate())) return;

    const snapshot = JSON.stringify(result.items);
    if (snapshot !== lastItems) {
      render(result.items);
      lastItems = snapshot;
    }
    hasMore = result.hasMore;
    $('#page-number').textContent = 'Page ' + (offset / 50 + 1);
    status.textContent = '';
    previous.disabled = offset === 0;
    next.disabled = !hasMore;
  } catch (error) {
    if (controller.signal.aborted) return;
    if (error.status === 401) {
      signedIn(false);
      status.textContent = 'Your session expired. Please sign in again.';
    } else if (background) {
      status.textContent = 'Live updates paused. Reconnecting…';
    } else {
      status.textContent = error.message;
      requests.replaceChildren();
    }
  } finally {
    if (requestController === controller && !controller.signal.aborted) scheduleLiveUpdate();
  }
}
$('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('#login-status').textContent='Signing in…';try{await api('/api/session',{method:'POST',body:JSON.stringify({password:new FormData(event.currentTarget).get('password')})});$('#login-form').reset();$('#login-status').textContent='';signedIn(true);await load()}catch(error){$('#login-status').textContent=error.message}finally{button.disabled=false}});
$('#logout').addEventListener('click',async()=>{try{await api('/api/session',{method:'DELETE'});signedIn(false);$('#admin-status').textContent='Signed out.'}catch(error){$('#admin-status').textContent=error.message}});
$('#status').addEventListener('change',()=>{offset=0;load()});
for (const button of forms) {
  button.addEventListener('click', () => {
    if (button === activeForm) return;
    activeForm.setAttribute('aria-pressed', 'false');
    activeForm = button;
    activeForm.setAttribute('aria-pressed', 'true');
    offset = 0;
    $('#requests').replaceChildren();
    load();
  });
}
$('#next').addEventListener('click',()=>{if(hasMore){offset+=50;load()}});$('#previous').addEventListener('click',()=>{offset=Math.max(0,offset-50);load()});
let searchTimer;$('#search').addEventListener('input',()=>{clearTimeout(searchTimer);++loadId;searchTimer=setTimeout(()=>{offset=0;load()},300)});
api('/api/session').then(()=>{signedIn(true);load()}).catch(error=>{signedIn(false);$('#admin-status').textContent=error.status===401?'':error.message});

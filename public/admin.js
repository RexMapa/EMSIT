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
let offset=0, hasMore=false, loadId=0;
async function api(path, options={}) {
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const data=await response.json();
  if(!response.ok){const error=new Error(data.error||'Request failed.');error.status=response.status;throw error}
  return data;
}
function signedIn(value){document.body.dataset.adminAuthenticated=String(value);if(!value)++loadId;$('#login-panel').hidden=value;$('#inbox').hidden=!value;$('.admin-header-actions').hidden=!value;if(!value)setSettings(false);if(!value)$('#requests').replaceChildren();}
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
    select.addEventListener('change',async()=>{select.disabled=true;try{await api('/api/requests',{method:'PATCH',body:JSON.stringify({id:item.id,status:select.value})});item.status=select.value;feedback.textContent='Status saved. No email was sent.'}catch(error){select.value=item.status;feedback.textContent=error.message;if(error.status===401)signedIn(false)}finally{select.disabled=false}});
    list.append(card);
  }
}
async function load(){const current=++loadId;$('#admin-status').textContent='Loading requests…';$('#previous').disabled=true;$('#next').disabled=true;try{const result=await api('/api/requests?'+new URLSearchParams({kind:activeForm.dataset.kind,status:$('#status').value,search:$('#search').value.trim(),offset}));if(current!==loadId)return;hasMore=result.hasMore;render(result.items);$('#page-number').textContent='Page '+(offset/50+1);$('#admin-status').textContent='';$('#previous').disabled=offset===0;$('#next').disabled=!hasMore}catch(error){if(current!==loadId)return;$('#admin-status').textContent=error.message;$('#requests').replaceChildren();if(error.status===401)signedIn(false)}}
$('#login-form').addEventListener('submit',async event=>{event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;$('#login-status').textContent='Signing in…';try{await api('/api/session',{method:'POST',body:JSON.stringify({password:new FormData(event.currentTarget).get('password')})});$('#login-form').reset();$('#login-status').textContent='';signedIn(true);await load()}catch(error){$('#login-status').textContent=error.message}finally{button.disabled=false}});
$('#logout').addEventListener('click',async()=>{try{await api('/api/session',{method:'DELETE'});++loadId;signedIn(false);$('#admin-status').textContent='Signed out.'}catch(error){$('#admin-status').textContent=error.message}});
$('#refresh').addEventListener('click',load);$('#status').addEventListener('change',()=>{offset=0;load()});
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

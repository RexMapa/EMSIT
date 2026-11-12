const menu=document.querySelector('.menu');menu.addEventListener('click',()=>{const on=document.querySelector('header').classList.toggle('open');menu.setAttribute('aria-expanded',String(on));menu.setAttribute('aria-label',on?'Close menu':'Open menu');menu.textContent=on?'×':'☰'});
const tabs=[...document.querySelectorAll('.contact-tabs [role=tab]')];function activateTab(index,focus=false){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=i!==index});if(focus)tabs[index].focus();history.replaceState(null,'',index?'#book':'#message')};tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>activateTab(i));tab.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();activateTab(e.key==='Home'?0:e.key==='End'?1:1-i,true)}})});function hashTab(){activateTab(location.hash==='#message'?0:1)}hashTab();window.addEventListener('hashchange',hashTab);
const today=new Date();today.setHours(0,0,0,0);let month=new Date(today.getFullYear(),today.getMonth(),1),selected='';const days=document.querySelector('.calendar-days');function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`};function drawCalendar(){document.querySelector('#calendar-month').textContent=month.toLocaleDateString('en-US',{month:'long',year:'numeric'});document.querySelector('#prev-month').disabled=month.getFullYear()===today.getFullYear()&&month.getMonth()===today.getMonth();days.replaceChildren();for(let n=0;n<month.getDay();n++){const empty=document.createElement('span');empty.setAttribute('aria-hidden','true');days.append(empty)}const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();for(let n=1;n<=count;n++){const date=new Date(month.getFullYear(),month.getMonth(),n),key=dateKey(date),button=document.createElement('button');button.type='button';button.textContent=n;button.disabled=date<today;button.setAttribute('aria-label',date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}));button.setAttribute('aria-pressed',String(key===selected));if(key===dateKey(today))button.classList.add('today');button.addEventListener('click',()=>{selected=key;document.querySelector('#preferred-date').value=key;document.querySelector('#date-summary').textContent=date.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})+' · preferred date';drawCalendar();[...days.querySelectorAll('button')].find(b=>b.getAttribute('aria-pressed')==='true')?.focus()});days.append(button)}}drawCalendar();document.querySelector('#prev-month').addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);drawCalendar()});document.querySelector('#next-month').addEventListener('click',()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);drawCalendar()});
const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;const tzSelect=document.querySelector('#timezone');if(tz){if(![...tzSelect.options].some(option=>option.value===tz)){const option=new Option(tz.replaceAll('_',' '),tz);tzSelect.add(option)}tzSelect.value=tz}
const requestIds = new WeakMap();
document.querySelectorAll('#message-form, #booking-form').forEach(form => form.addEventListener('submit', async event => {
  event.preventDefault();
  const booking = form.id === 'booking-form', status = form.querySelector('.form-status'), button = form.querySelector('[type=submit]');
  if (button.disabled) return;
  if (booking && !selected) { status.textContent = 'Please choose your preferred date.'; document.querySelector('.calendar-days button:not(:disabled)')?.focus(); return; }
  if (!form.reportValidity()) return;
  const body = Object.fromEntries(new FormData(form));
  const fingerprint = JSON.stringify(body);
  let attempt = requestIds.get(form);
  if (!attempt || attempt.fingerprint !== fingerprint) { attempt = {fingerprint, id: crypto.randomUUID()}; requestIds.set(form, attempt); }
  body.requestId = attempt.id;
  button.disabled = true; form.setAttribute('aria-busy','true'); status.textContent = 'Sending your request…';
  try {
    const response = await fetch(booking ? '/api/bookings' : '/api/contact', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || 'We could not save your request. Please try again.');
    status.textContent = booking ? 'Your call request has been received. Our team will contact you to confirm a time.' : 'Thank you. Your message has been received by the EMSIT team.';
    if(result.id) status.textContent += ' Reference: ' + result.id.slice(0,8).toUpperCase() + '.';
    form.reset(); requestIds.delete(form);
    if (booking) { selected=''; document.querySelector('#preferred-date').value=''; document.querySelector('#date-summary').textContent='Select your preferred date'; drawCalendar(); if(tz)tzSelect.value=tz; }
  } catch(error) { status.textContent = error.message === 'Failed to fetch' ? 'Connection interrupted. Please try again. Your details have been kept.' : error.message; }
  finally { button.disabled=false; form.removeAttribute('aria-busy'); }
}));
document.querySelector('#year').textContent=new Date().getFullYear();

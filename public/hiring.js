(()=>{
const menu=document.querySelector('.menu');menu.addEventListener('click',()=>{const open=document.querySelector('header').classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');});
document.querySelector('#year').textContent=new Date().getFullYear();
const form=document.querySelector('#hiring-form');let attempt;
form.addEventListener('submit',async event=>{
event.preventDefault();if(!form.reportValidity())return;
const button=form.querySelector('[type=submit]'),status=form.querySelector('.form-status');if(button.disabled)return;
const data=Object.fromEntries(new FormData(form));
const labels={jobTitle:'Role',phone:'Phone',businessWebsite:'Business website',description:'Job description',programs:'Essential programs',hours:'Working hours / time zone',headcount:'Number of hires',workplace:'Workplace preference',country:'Talent location preference',referral:'Referring agent',source:'How you heard about us',additional:'Additional details'};
const message='HIRING REQUEST\n\n'+Object.entries(labels).map(([key,label])=>`${label}: ${data[key]||'Not provided'}`).join('\n\n');
if(message.length>3000){status.textContent='Please shorten your job description or additional details to submit.';return;}
const payload={firstName:data.firstName,lastName:data.lastName,email:data.email,company:data.company,website:data.website,role:'Help defining a role',message};
const fingerprint=JSON.stringify(payload);if(!attempt||attempt.fingerprint!==fingerprint)attempt={fingerprint,id:crypto.randomUUID()};
button.disabled=true;form.setAttribute('aria-busy','true');status.textContent='Sending your hiring request…';
try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:attempt.id})});const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Unable to submit your request. Please try again.');status.textContent='Thank you. Your hiring request has been received by EMSIT.';form.reset();attempt=null;}
catch(error){status.textContent=error.message==='Failed to fetch'?'Connection interrupted. Your details have been kept. Please try again.':error.message;}
finally{button.disabled=false;form.removeAttribute('aria-busy');}
});
})();

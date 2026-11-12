(()=>{
 const form=document.querySelector('.service-inquiry-form');let attempt;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const button=form.querySelector('[type=submit]'),status=form.querySelector('.form-status');if(button.disabled)return;
  const data=Object.fromEntries(new FormData(form)),service=form.dataset.service;
  const payload={firstName:data.firstName,lastName:data.lastName,email:data.email,company:data.company,website:data.website,role:service==='Bookkeeping'?'Bookkeeping support':service==='Invoicing & payments'?'AP / AR support':'Help defining a role',message:`SERVICE INQUIRY: ${service}\nPhone: ${data.phone||'Not provided'}\n\n${data.message}`};
  const fingerprint=JSON.stringify(payload);if(!attempt||attempt.fingerprint!==fingerprint)attempt={fingerprint,id:crypto.randomUUID()};
  button.disabled=true;form.setAttribute('aria-busy','true');status.textContent='Sending your inquiry…';
  try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,requestId:attempt.id})});const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Unable to send your inquiry. Please try again.');status.textContent=`Thank you. Your ${service.toLowerCase()} inquiry has been received by EMSIT.`;form.reset();attempt=null;}
  catch(error){status.textContent=error.message==='Failed to fetch'?'Connection interrupted. Your details have been kept. Please try again.':error.message;}
  finally{button.disabled=false;form.removeAttribute('aria-busy');}
 });
})();

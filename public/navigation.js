(()=>{
  const services=document.querySelector('.nav-services');
  if(!services)return;
  document.addEventListener('click',event=>{if(!services.contains(event.target))services.open=false;});
  services.addEventListener('keydown',event=>{if(event.key==='Escape'){services.open=false;services.querySelector('summary').focus();}});
  services.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{services.open=false;}));
})();

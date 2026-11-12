(()=>{
  const service=new URLSearchParams(location.search).get('service');
  const services=['Virtual assistant','Recruiting','Data entry','Customer service','Inventory management','Data processing','Invoicing & payments','Application processing','Medical billing','Bookkeeping','Project management','Property management','Email management','Product listing'];
  if(!services.includes(service))return;
  const form=document.querySelector('#message-form');if(!form)return;
  form.elements.role.value=service==='Bookkeeping'?'Bookkeeping support':service==='Invoicing & payments'?'AP / AR support':'Help defining a role';
  if(!form.elements.message.value)form.elements.message.value=`I would like to discuss ${service.toLowerCase()} support for my team.\n\nOur priorities are: `;
})();

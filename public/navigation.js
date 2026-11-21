(()=>{
  const services=document.querySelector('.nav-services');
  if(!services)return;
  document.addEventListener('click',event=>{if(!services.contains(event.target))services.open=false;});
  services.addEventListener('keydown',event=>{if(event.key==='Escape'){services.open=false;services.querySelector('summary').focus();}});
  services.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{services.open=false;}));
})();

(() => {
  const contactLink = document.querySelector('header nav a[href="/contact#contact-details"]');
  const menuButton = document.querySelector('header :is(.menu, .menu-toggle)');
  if (!contactLink || !menuButton) return;

  function updateContactLink() {
    const mobileMenuVisible = getComputedStyle(menuButton).display !== 'none';
    contactLink.href = mobileMenuVisible ? '/contact#contact-details' : '/contact#top';
  }

  updateContactLink();
  window.addEventListener('resize', updateContactLink);
})();

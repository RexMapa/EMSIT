(()=>{
  document.querySelectorAll('.onboarding-card').forEach(card=>{
    const button=card.querySelector('button');
    let pinned=false;
    const sync=()=>button.setAttribute('aria-expanded',String(pinned||card.matches(':focus-within')||(matchMedia('(hover:hover)').matches&&card.matches(':hover'))));
    button.addEventListener('click',()=>{pinned=!pinned;card.classList.toggle('is-open',pinned);sync();});
    ['pointerenter','pointerleave','focusin'].forEach(event=>card.addEventListener(event,sync));
    card.addEventListener('focusout',()=>queueMicrotask(sync));
    card.addEventListener('keydown',event=>{if(event.key==='Escape'){pinned=false;card.classList.remove('is-open');button.blur();sync();}});
  });
})();

(()=>{
// Progressive enhancement: native scrolling, bounded pointer depth, no animation library.
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const pointerPreference = matchMedia('(hover: hover) and (pointer: fine)');
const header = document.querySelector('header');
const heroVisual = document.querySelector('.hero-visual');
const heroPhoto = document.querySelector('.photo-frame img');
const progress = document.createElement('div');
progress.className = 'reading-progress'; progress.setAttribute('aria-hidden','true'); document.body.append(progress);
let scrollFrame = 0, pointerFrame = 0;
function updateScroll() {
  scrollFrame = 0;
  const total = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${total > 0 ? Math.min(1,Math.max(0,scrollY/total)) : 0})`;
  header?.classList.toggle('scrolled',scrollY>30);
  if(heroPhoto && !motionPreference.matches && innerWidth>760) {
    const rect=heroPhoto.parentElement.getBoundingClientRect();
    if(rect.bottom>0 && rect.top<innerHeight) heroPhoto.style.setProperty('--photo-y',`${Math.max(-12,Math.min(12,-rect.top*.035))}px`);
  }
}
function scheduleScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(updateScroll)}
addEventListener('scroll',scheduleScroll,{passive:true});addEventListener('resize',scheduleScroll,{passive:true});scheduleScroll();
function clearTilt(){cancelAnimationFrame(pointerFrame);pointerFrame=0;heroVisual?.style.removeProperty('--tilt-x');heroVisual?.style.removeProperty('--tilt-y')}
heroVisual?.addEventListener('pointermove',event=>{
  if(motionPreference.matches||!pointerPreference.matches||innerWidth<=760)return;
  const rect=heroVisual.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width-.5,y=(event.clientY-rect.top)/rect.height-.5;
  cancelAnimationFrame(pointerFrame);pointerFrame=requestAnimationFrame(()=>{heroVisual.style.setProperty('--tilt-x',`${-y*4}deg`);heroVisual.style.setProperty('--tilt-y',`${x*4}deg`);pointerFrame=0});
});
heroVisual?.addEventListener('pointerleave',clearTilt);
function entrance(){document.documentElement.classList.remove('motion-ready');requestAnimationFrame(()=>document.documentElement.classList.add('motion-ready'))}
const intro=document.querySelector('.intro');
document.addEventListener('emsit:intro-exit',entrance);
if(intro&&!intro.classList.contains('done')){const observer=new MutationObserver(()=>{if(intro.classList.contains('done')&&!document.documentElement.classList.contains('motion-ready'))entrance()});observer.observe(intro,{attributes:true,attributeFilter:['class']})}else entrance();
// Role changes transition the panel contents without changing focus or tab semantics.
document.querySelectorAll('[data-role]').forEach(tab=>tab.addEventListener('click',()=>{
  if(motionPreference.matches||document.documentElement.classList.contains('splash-active'))return;
  const panel=document.querySelector('#role-panel');
  if(panel?.animate){panel.getAnimations().forEach(animation=>animation.cancel());panel.animate([{opacity:.4,translate:'0 10px'},{opacity:1,translate:'0 0'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'})}
}));
if('IntersectionObserver' in window){
  const links=[...document.querySelectorAll('nav a[href^="#"]')];
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){links.forEach(link=>{if(link.hash==='#'+entry.target.id)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current')})}}},{rootMargin:'-20% 0px -55% 0px'});
  links.forEach(link=>{const section=document.getElementById(link.hash.slice(1));if(section)observer.observe(section)});
}
motionPreference.addEventListener('change',()=>{clearTilt();if(motionPreference.matches){heroPhoto?.style.removeProperty('--photo-y');document.querySelector('#skip')?.click()}scheduleScroll()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTilt();cancelAnimationFrame(scrollFrame);scrollFrame=0}else scheduleScroll()});

// Cross-page transitions retain ordinary links, history, downloads and hash scrolling.
let navigationPending=false, navigationTimer=0, recoveryTimer=0;
function resetPageTransition(){
  clearTimeout(navigationTimer);clearTimeout(recoveryTimer);navigationPending=false;
  document.documentElement.classList.remove('page-leaving');
}
function enterPage(){
  resetPageTransition();
  if(motionPreference.matches||document.documentElement.classList.contains('splash-active'))return;
  document.documentElement.classList.remove('page-entering');
  requestAnimationFrame(()=>document.documentElement.classList.add('page-entering'));
}
enterPage();
addEventListener('pageshow',event=>{if(event.persisted)enterPage()});
document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||motionPreference.matches)return;
  const link=event.target.closest?.('a[href]');
  if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
  const destination=new URL(link.href,location.href);
  if(destination.origin!==location.origin||!['http:','https:'].includes(destination.protocol))return;
  const normalize=path=>path.replace(/\/index\.html$/,'/').replace(/\.html$/,'');
  if(normalize(destination.pathname)===normalize(location.pathname)&&destination.search===location.search)return;
  if(destination.pathname.startsWith('/api/'))return;
  event.preventDefault();
  if(navigationPending)return;
  navigationPending=true;
  document.documentElement.classList.remove('page-entering');
  document.documentElement.classList.add('page-leaving');
  navigationTimer=setTimeout(()=>location.assign(destination.href),220);
  // Restore the page if navigation is cancelled or fails to leave this document.
  recoveryTimer=setTimeout(resetPageTransition,1600);
});
motionPreference.addEventListener('change',()=>{
  if(motionPreference.matches)document.documentElement.classList.remove('page-entering','page-leaving');
});

})();

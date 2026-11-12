const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const intro=document.querySelector('.intro');
const pageSections=[...document.querySelectorAll('body > header, body > main, body > footer')];
let introFrame,restoreFocus=null,introFallback,introExitTimer,introExiting=false,introRun=0;
function dismissIntro(){intro.classList.add('done');pageSections.forEach(el=>el.inert=false);cancelAnimationFrame(introFrame);clearTimeout(introFallback);clearTimeout(introExitTimer);intro.getAnimations().forEach(a=>a.cancel());document.documentElement.classList.remove('splash-active');if(document.activeElement===document.querySelector('#skip'))(restoreFocus?.isConnected&&restoreFocus!==document.body?restoreFocus:document.querySelector('.logo')).focus({preventScroll:true})}
async function finishIntro(){
  if(introExiting||intro.classList.contains('done'))return;
  introExiting=true;clearTimeout(introExitTimer);cancelAnimationFrame(introFrame);
  document.querySelector('#intro-count').textContent='100';
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||!intro.animate){dismissIntro();return}
  const run=introRun;
  intro.classList.add('intro-exiting');
  document.documentElement.classList.add('splash-revealing');
  document.dispatchEvent(new Event('emsit:intro-exit'));
  const animation=intro.animate([{transform:'translateY(0)',opacity:1},{transform:'translateY(-8%)',opacity:1,offset:.3},{transform:'translateY(-100%)',opacity:0}],{duration:1100,easing:'cubic-bezier(.76,0,.24,1)',fill:'forwards'});
  try{await animation.finished}catch{}
  if(run===introRun)dismissIntro();
}
function startIntro(){
  introRun++;clearTimeout(introFallback);clearTimeout(introExitTimer);cancelAnimationFrame(introFrame);
  intro.getAnimations().forEach(a=>a.cancel());introExiting=false;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){dismissIntro();return}
  restoreFocus=document.activeElement;pageSections.forEach(el=>el.inert=true);
  document.documentElement.classList.remove('splash-revealing','motion-ready','page-entering');
  document.documentElement.classList.add('splash-active');
  intro.classList.remove('done','intro-out-now','intro-exiting');intro.style.display='none';void intro.offsetWidth;intro.style.display='';
  document.querySelector('#skip').focus({preventScroll:true});const started=performance.now();
  function tick(now){document.querySelector('#intro-count').textContent=String(Math.min(100,Math.floor((now-started)/32))).padStart(2,'0');if(!introExiting&&!intro.classList.contains('done'))introFrame=requestAnimationFrame(tick)}
  introFrame=requestAnimationFrame(tick);introExitTimer=setTimeout(finishIntro,3250);
  introFallback=setTimeout(()=>{if(!introExiting)finishIntro();else dismissIntro()},6500);
}
document.querySelector('#skip').addEventListener('click',finishIntro);
intro.addEventListener('keydown',e=>{if(e.key==='Escape')finishIntro();if(e.key==='Tab'){e.preventDefault();document.querySelector('#skip').focus()}});
document.querySelector('#replay').addEventListener('click',startIntro);
let internalArrival=false;
try{internalArrival=!!document.referrer&&new URL(document.referrer).origin===location.origin}catch{}
const historyArrival=performance.getEntriesByType('navigation')[0]?.type==='back_forward';
if(internalArrival||historyArrival)dismissIntro();else startIntro();
if(!reduced&&'IntersectionObserver' in window){document.documentElement.classList.add('js-motion');const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
const menu=document.querySelector('.menu');menu.addEventListener('click',()=>{const open=document.querySelector('header').classList.toggle('open');menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close menu':'Open menu');menu.textContent=open?'×':'☰'});document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelector('header').classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');menu.textContent='☰'}));
const roles=[{kicker:'KEEP THE BOOKS MOVING',title:'More clarity.<br>Less catching up.',description:'Support for transaction coding, reconciliation preparation, and month-end schedules.',price:'$1,910',saving:'65%'},{kicker:'KEEP CASH FLOWING',title:'Stay on top.<br>Keep things moving.',description:'Support for bill entry, vendor follow-ups, billing, aging, and cash application.',price:'$1,970',saving:'63%'},{kicker:'MAKE SPACE FOR CLIENTS',title:'A smoother day.<br>A stronger practice.',description:'Support for client document requests, CRM updates, scheduling, and task tracking.',price:'$1,790',saving:'63%'}];
const tabs=[...document.querySelectorAll('[data-role]')];function selectRole(index){const role=roles[index];tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1});document.querySelector('#role-panel').setAttribute('aria-labelledby',`tab-${index}`);document.querySelector('#role-kicker').textContent=role.kicker;document.querySelector('#role-title').innerHTML=role.title;document.querySelector('#role-description').textContent=role.description;document.querySelector('#role-price').innerHTML=role.price+'<span> / mo</span>';document.querySelector('#role-saving').innerHTML='Up to '+role.saving+'<br><small>vs. a U.S. hire</small>'}
tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>selectRole(i));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(i+1)%tabs.length;if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();selectRole(next);tabs[next].focus()}})});
document.querySelector('#year').textContent=new Date().getFullYear();

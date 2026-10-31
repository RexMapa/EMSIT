import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
function classes(){const values=new Set();return {add(...keys){keys.forEach(k=>values.add(k))},remove(...keys){keys.forEach(k=>values.delete(k))},contains(key){return values.has(key)}}}
function environment(){
  const events={},animations=[],sections=[{inert:false},{inert:false},{inert:false}];
  const root={classList:classes()};const skip={focus(){},addEventListener(type,fn){events['skip-'+type]=fn}};
  const intro={classList:classes(),style:{},offsetWidth:1,getAnimations(){return []},addEventListener(type,fn){events[type]=fn},animate(frames,options){let resolve;const finished=new Promise(r=>resolve=r);const animation={frames,options,finished,resolve};animations.push(animation);return animation}};
  const nodes={'.intro':intro,'#skip':skip,'#replay':{addEventListener(){}},'#intro-count':{textContent:''},'.logo':{focus(){}}};
  const document={querySelector(key){return nodes[key]},querySelectorAll(){return sections},documentElement:root,activeElement:null,referrer:'',dispatchEvent(){},body:{}};
  return {intro,sections,events,animations,context:vm.createContext({document,matchMedia:()=>({matches:false}),performance:{now:()=>0,getEntriesByType:()=>[]},location:{origin:'https://example.com'},URL,Event,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame:()=>1,cancelAnimationFrame(){}})};
}
test('splash waits for animated exit before hiding and releasing page controls',async()=>{
  const source=(await readFile('public/app.js','utf8')).split("if(!reduced&&'IntersectionObserver'")[0];
  const env=environment();vm.runInContext(source,env.context);
  assert(env.sections.every(section=>section.inert));
  const finished=vm.runInContext('finishIntro()',env.context);
  assert.equal(env.intro.classList.contains('done'),false);assert.equal(env.animations.length,1);
  assert.equal(env.animations[0].options.duration,1100);assert(env.sections.every(section=>section.inert));
  env.animations[0].resolve();await finished;
  assert.equal(env.intro.classList.contains('done'),true);assert(env.sections.every(section=>!section.inert));
});
test('Skip starts the same animated outro and repeated clicks do not duplicate it',async()=>{
  const source=(await readFile('public/app.js','utf8')).split("if(!reduced&&'IntersectionObserver'")[0];
  const env=environment();vm.runInContext(source,env.context);
  const finish=env.events['skip-click']();env.events['skip-click']();assert.equal(env.animations.length,1);
  assert.equal(env.intro.classList.contains('done'),false);env.animations[0].resolve();await finish;
  assert.equal(env.intro.classList.contains('done'),true);
});

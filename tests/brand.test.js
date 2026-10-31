import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
test('all application pages use the fixed wordmark and brand stylesheet',async()=>{
  for(const name of ['index.html','contact.html','admin.html']){
    const html=await readFile('public/'+name,'utf8');
    assert(html.includes('/brand.css'));assert(html.includes('/assets/emsit-navy.svg'));
    assert(!/href="\/?(?:luxury|style)\.css"/.test(html));
    assert(!html.includes('contact-emblem'));assert(!html.includes('sculpture'));
    for(const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)){
      if(match[1]==='/contact'||match[1]==='/')continue;
      await access('public'+match[1]);
    }
  }
});
test('brand palette, Segoe stack, and logo proportions are preserved',async()=>{
  const css=await readFile('public/brand.css','utf8');
  for(const value of ['#183153','#F8FAFC','#E8EEF5','#334155','#A8C7E8','#F28772','#F7E5E3','#A55C4E','#FFFFFF'])assert(css.includes(value));
  assert(css.includes('Segoe UI Semilight'));assert(css.includes('Segoe UI Variable Text'));
  assert(!css.includes('@import'));assert(css.includes('prefers-reduced-motion'));
  const svg=await readFile('public/assets/emsit-navy.svg','utf8');assert(svg.includes('viewBox="-160 -160 2125 632"'));assert(!svg.includes('<text'));assert(svg.includes('fill="#183153"'));
  assert(190*1805/2125>=160);
});

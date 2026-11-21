import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
test('all application pages use the fixed wordmark and brand stylesheet',async()=>{
  for(const name of ['index.html','contact.html','hiring.html','admin.html']){
    const html=await readFile('public/'+name,'utf8');
    assert(html.includes(name === 'index.html' ? '/home.css' : '/brand.css'));assert(html.includes('/assets/emsit-dark-brown-wordmark.png'));
    assert(!/href="\/?(?:luxury|style)\.css"/.test(html));
    assert(!html.includes('contact-emblem'));
    for(const match of html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)){
      if(match[1]==='/contact'||match[1]==='/')continue;
      await access('public'+match[1]+(!match[1].split('/').pop().includes('.')?'.html':''));
    }
  }
});
test('brand palette, Segoe stack, and logo proportions are preserved',async()=>{
  const css=await readFile('public/brand.css','utf8');
  for(const value of ['#2A1E18','#F3F6FF','#E2E9FF','#4A372D','#C6D4FF','#FFFFFF'])assert(css.includes(value));
  assert(css.includes('Segoe UI Semilight'));assert(css.includes('Segoe UI Variable Text'));
  assert(!css.includes('@import'));assert(css.includes('prefers-reduced-motion'));
  const logo = await readFile('public/assets/emsit-dark-brown-wordmark.png');
  assert.equal(logo.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.equal(logo.readUInt32BE(16), 2172);
  assert.equal(logo.readUInt32BE(20), 724);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
test('all service entry points resolve to complete, distinct service pages',async()=>{
 const pages=await readdir('public/services');assert.equal(pages.length,14);
 const titles=new Set();
 for(const page of pages){
  const html=await readFile('public/services/'+page,'utf8');
  titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
  assert(html.includes('class="service-inquiry-form"'));assert(html.includes('id="inquire"'));
  assert((html.match(/<details/g)||[]).length>=8);assert(html.includes('/service-pages.js'));
  for(const [,path] of html.matchAll(/(?:src|href)="(\/[^"?#]*)(?:[?#][^"]*)?"/g)){
   if(path==='/')continue;
   await access('public'+path+(path.split('/').pop().includes('.')?'':'.html'));
  }
 }
 assert.equal(titles.size,14);
 const home=await readFile('public/index.html','utf8');
 assert.equal((home.match(/class="service-card[^>]*href="\/services\//g)||[]).length,14);
 assert(!home.includes('href="/contact?service='));
});

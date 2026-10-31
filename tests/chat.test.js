import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {chatEndpoint} from '../api/chat.js';
import {adminChatEndpoint} from '../api/admin-chat.js';
import {sessionToken} from '../lib/auth.js';
process.env.SESSION_SECRET='chat-test-only-secret-longer-than-thirty-two-characters';
process.env.ADMIN_PASSWORD='chat-test-admin-password-1234';delete process.env.VERCEL;
let db,sql,visitor,admin;
before(async()=>{db=new PGlite();for(const name of ['schema.sql','chat.sql'])await db.exec(await readFile(new URL('../database/'+name,import.meta.url),'utf8'));sql=async(strings,...values)=>(await db.query(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values)).rows;visitor=chatEndpoint(()=>sql);admin=adminChatEndpoint(()=>sql);});
after(async()=>db?.close());
async function call(handler,{method='GET',cookie='',body,url='/api/chat',origin='http://localhost:4174'}={}){const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.data=JSON.parse(value);}};await handler({method,url,body,headers:{host:'localhost:4174',origin,cookie,'content-type':'application/json'},socket:{remoteAddress:'test-client'}},res);return res;}
async function start(){const initial=await call(visitor);const cookie=initial.headers['Set-Cookie'].split(';')[0];const body={name:'Jane',email:'jane@example.com',message:'Hello EMSIT',clientId:randomUUID()};const sent=await call(visitor,{method:'POST',cookie,body});assert.equal(sent.statusCode,201);const result=await call(visitor,{cookie});return {cookie,body,id:result.data.thread.id,messageId:sent.data.id};}
const adminCookie=()=> 'emsit_admin='+sessionToken();
test('private recovery codes move access to a new browser without exposing plaintext in storage',async()=>{
  const a=await start();let res=await call(visitor,{method:'POST',cookie:a.cookie,body:{action:'code'}});
  const code=res.data.code;assert.match(code,/^EMSIT-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  const saved=(await sql`SELECT recovery_hash FROM emsit_chats WHERE id=${a.id}`)[0];assert.notEqual(saved.recovery_hash,code);assert.equal(saved.recovery_hash.length,64);
  const other=await start();res=await call(visitor,{method:'POST',cookie:other.cookie,body:{action:'recover',code:code.toLowerCase()}});assert.equal(res.statusCode,200);
  const recoveredCookie=res.headers['Set-Cookie'].split(';')[0];res=await call(visitor,{cookie:recoveredCookie});assert.equal(res.data.thread.id,a.id);assert.equal(res.data.messages.length,1);
  res=await call(visitor,{cookie:a.cookie});assert.equal(res.data.thread,null);
  res=await call(visitor,{cookie:other.cookie});assert.equal(res.data.thread.id,other.id);
  res=await call(visitor,{method:'POST',cookie:recoveredCookie,body:{action:'code'}});assert.notEqual(res.data.code,code);
  res=await call(visitor,{method:'POST',cookie:other.cookie,body:{action:'recover',code}});assert.equal(res.statusCode,400);assert.equal(res.headers['Set-Cookie'],undefined);
});
test('new conversation detaches the browser without deleting the previous chat',async()=>{
  const a=await start();const res=await call(visitor,{method:'POST',cookie:a.cookie,body:{action:'new'}});assert.equal(res.statusCode,200);
  const cookie=res.headers['Set-Cookie'].split(';')[0];assert.equal((await call(visitor,{cookie})).data.thread,null);
  assert.equal((await sql`SELECT id FROM emsit_chats WHERE id=${a.id}`).length,1);
  const sent=await call(visitor,{method:'POST',cookie,body:{message:'Anonymous question',clientId:randomUUID()}});assert.equal(sent.statusCode,201);
});
test('opening resets new guest expiry; expired guests are deleted with messages and legacy chats survive',async()=>{
  const a=await start();await sql`UPDATE emsit_chats SET expires_at=now()+interval '1 hour' WHERE id=${a.id}`;
  await call(visitor,{method:'PATCH',cookie:a.cookie,body:{lastId:a.messageId,opened:true}});
  let rows=await sql`SELECT expires_at>now()+interval '2 days' AS extended FROM emsit_chats WHERE id=${a.id}`;assert.equal(rows[0].extended,true);
  const legacy=await start();await sql`UPDATE emsit_chats SET expires_at=NULL WHERE id=${legacy.id}`;
  const code=(await call(visitor,{method:'POST',cookie:a.cookie,body:{action:'code'}})).data.code;
  await sql`UPDATE emsit_chats SET expires_at=now()-interval '1 minute' WHERE id=${a.id}`;
  const expired=await call(visitor,{cookie:a.cookie});assert.equal(expired.statusCode,200);assert.equal(expired.data.thread,null);
  assert.equal((await sql`SELECT id FROM emsit_chat_messages WHERE chat_id=${a.id}`).length,0);
  assert.equal((await call(visitor,{cookie:legacy.cookie})).data.thread.id,legacy.id);
  assert.equal((await call(visitor,{method:'POST',cookie:legacy.cookie,body:{action:'recover',code}})).statusCode,400);
});
test('visitor messages persist, retry safely and remain private to their cookie',async()=>{const a=await start();let res=await call(visitor,{method:'POST',cookie:a.cookie,body:a.body});assert.equal(res.data.id,a.messageId);res=await call(visitor,{cookie:a.cookie});assert.equal(res.data.messages.length,1);res=await call(visitor,{url:'/api/chat?id='+a.id});assert.equal(res.data.thread,null);res=await call(visitor,{method:'POST',cookie:a.cookie,body:{...a.body,message:'Changed'}});assert.equal(res.statusCode,409);});
test('admin authentication and same-origin checks protect chat access',async()=>{let res=await call(admin);assert.equal(res.statusCode,401);assert.equal(res.headers['Cache-Control'],'no-store');res=await call(admin,{method:'POST',cookie:adminCookie(),origin:'https://evil.example',body:{}});assert.equal(res.statusCode,403);res=await call(visitor,{method:'POST',origin:'https://evil.example',body:{}});assert.equal(res.statusCode,403);});
test('admin receives chat and visitor receives replies; read receipts preserve later arrivals',async()=>{const a=await start(),cookie=adminCookie();let res=await call(admin,{cookie,url:'/api/admin-chat'});assert.equal(res.data.items.find(c=>c.id===a.id).unread,1);res=await call(admin,{method:'PATCH',cookie,body:{id:a.id,action:'read',lastId:a.messageId}});assert.equal(res.statusCode,200);const reply={id:a.id,message:'We can help.',clientId:randomUUID()};res=await call(admin,{method:'POST',cookie,body:reply});assert.equal(res.statusCode,201);const firstReply=res.data.id;await call(admin,{method:'POST',cookie,body:{...reply,message:'A second reply',clientId:randomUUID()}});res=await call(visitor,{cookie:a.cookie,url:'/api/chat?after='+a.messageId});assert.equal(res.data.messages.length,2);assert.equal(res.data.unread,2);await call(visitor,{method:'PATCH',cookie:a.cookie,body:{lastId:firstReply}});res=await call(visitor,{cookie:a.cookie});assert.equal(res.data.unread,1);res=await call(admin,{cookie});assert.equal(res.data.items.find(c=>c.id===a.id).unread,0);});
test('closed chats reopen on new messages and invalid messages are rejected',async()=>{const a=await start(),cookie=adminCookie();let res=await call(admin,{method:'PATCH',cookie,body:{id:a.id,action:'status',status:'closed'}});assert.equal(res.data.status,'closed');res=await call(visitor,{method:'POST',cookie:a.cookie,body:{message:'New question',clientId:randomUUID()}});assert.equal(res.statusCode,201);res=await call(visitor,{cookie:a.cookie});assert.equal(res.data.thread.status,'open');for(const body of [{message:'',clientId:randomUUID()},{message:'x'.repeat(3001),clientId:randomUUID()},{message:'Hi',clientId:'invalid'}]){res=await call(visitor,{method:'POST',cookie:a.cookie,body});assert.equal(res.statusCode,400);}});
test('message cursors drain long histories without duplicates',async()=>{const a=await start();for(let i=0;i<102;i++)await sql`INSERT INTO emsit_chat_messages(chat_id,client_id,sender,body) VALUES(${a.id},${randomUUID()},'admin',${'Reply '+i})`;let res=await call(visitor,{cookie:a.cookie});assert.equal(res.data.messages.length,100);assert.equal(res.data.hasMore,true);const last=res.data.messages.at(-1).id;res=await call(visitor,{cookie:a.cookie,url:'/api/chat?after='+last});assert.equal(res.data.messages.length,3);assert.equal(res.data.hasMore,false);assert.ok(Number(res.data.messages[0].id)>Number(last));});

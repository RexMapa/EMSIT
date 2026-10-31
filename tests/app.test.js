import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { validateSubmission } from '../lib/validation.js';
import { saveRequest, consumeLimit, listRequests, updateStatus } from '../lib/store.js';
import { submissionEndpoint } from '../lib/submit.js';
import { sessionToken, validToken, passwordMatches, requireAdmin } from '../lib/auth.js';
import requestsEndpoint from '../api/requests.js';
process.env.SESSION_SECRET='test-only-secret-with-more-than-thirty-two-characters';
process.env.ADMIN_PASSWORD='test-only-password-123456';
delete process.env.VERCEL;
const now=new Date('2030-01-01T12:00:00Z');
function message(overrides={}) {return {requestId:randomUUID(),firstName:'Jane',lastName:'Smith',email:'Jane@example.com',company:'Example',role:'Bookkeeping support',message:'Help with our month-end close.',...overrides};}
function booking(overrides={}){return message({date:'2030-01-10',time:'10:30',timezone:'America/New_York',...overrides});}
let db,sql;
before(async()=>{db=new PGlite();await db.exec(await readFile(new URL('../database/schema.sql',import.meta.url),'utf8'));sql=async(strings,...values)=>{const query=strings.reduce((text,part,index)=>text+(index?'$'+index:'')+part,'');return (await db.query(query,values)).rows;};});
after(async()=>db?.close());
test('server validates email, role, length and UUID',()=>{
  assert.equal(validateSubmission(message(),'message').email,'jane@example.com');
  for(const changes of [{email:'bad'},{role:'Unknown'},{firstName:' '},{message:'x'.repeat(3001)},{requestId:'not-an-id'}])assert.throws(()=>validateSubmission(message(changes),'message'),{status:400});
});
test('booking validation respects dates, time zones and future-time rules',()=>{
  assert.equal(validateSubmission(booking(),'booking',now).timezone,'America/New_York');
  for(const changes of [{date:'2030-02-30'},{time:'25:90'},{timezone:'Not/AZone'},{date:'2029-12-31'},{date:'2032-01-10'}])assert.throws(()=>validateSubmission(booking(changes),'booking',now),{status:400});
  assert.throws(()=>validateSubmission(booking({date:'2030-01-01',time:'06:00'}),'booking',now),{status:400});
});
test('messages persist, duplicate retries do not duplicate rows, conflicts are rejected',async()=>{
  const value=validateSubmission(message({message:"O'Brien <script>alert(1)</script>"}),'message');
  await saveRequest(sql,value);await saveRequest(sql,value);
  const rows=await sql`SELECT * FROM emsit_requests WHERE id=${value.id}`;
  assert.equal(rows.length,1);assert.equal(rows[0].message,value.message);
  await assert.rejects(saveRequest(sql,{...value,message:'different payload'}),{status:409});
});
test('booking data persists and admin can change status; messages cannot be confirmed',async()=>{
  const value=validateSubmission(booking(),'booking',now);await saveRequest(sql,value);
  assert.equal((await updateStatus(sql,value.id,'confirmed')).status,'confirmed');
  const items=await listRequests(sql,{kind:'booking',status:'confirmed',offset:0});
  assert.equal(items[0].preferred_date,'2030-01-10');assert.equal(items[0].timezone,'America/New_York');
  const msg=validateSubmission(message(),'message');await saveRequest(sql,msg);
  await assert.rejects(updateStatus(sql,msg.id,'confirmed'),{status:404});
});
test('database rate limiter caps attempts across invocations',async()=>{
  const key=randomUUID();await consumeLimit(sql,key,2);await consumeLimit(sql,key,2);
  await assert.rejects(consumeLimit(sql,key,2),{status:429});
  await sql`UPDATE emsit_rate_limits SET expires_at=now()-interval '1 minute' WHERE key=${key}`;
  await consumeLimit(sql,key,2);
});
test('admin sessions reject forged, expired, and password-rotated cookies',()=>{
  const time=Date.now(),token=sessionToken(time);assert.equal(validToken(token,time),true);
  assert.equal(validToken(token+'x',time),false);assert.equal(validToken(token,time+9*3600000),false);
  assert.equal(passwordMatches(process.env.ADMIN_PASSWORD),true);assert.equal(passwordMatches('bad'),false);
  assert.doesNotThrow(()=>requireAdmin({headers:{cookie:'emsit_admin='+token}}));
  const old=process.env.ADMIN_PASSWORD;process.env.ADMIN_PASSWORD='another-password-123456';assert.equal(validToken(token,time),false);process.env.ADMIN_PASSWORD=old;
});
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.data=JSON.parse(value);}};}
function request(body,origin='http://localhost:4174'){return {method:'POST',headers:{host:'localhost:4174',origin,'content-type':'application/json'},body,socket:{remoteAddress:randomUUID()}};}
test('API rejects cross-origin and malformed submissions without writing',async()=>{
  const handler=submissionEndpoint('message',()=>sql);
  let res=response();await handler(request(message(),'https://attacker.example'),res);assert.equal(res.statusCode,403);
  res=response();await handler(request({...message(),email:'invalid'}),res);assert.equal(res.statusCode,400);
});
test('API writes to PostgreSQL and reports success only after persistence',async()=>{
  const handler=submissionEndpoint('message',()=>sql),body=message(),res=response();
  await handler(request(body),res);assert.equal(res.statusCode,201);assert.equal(res.data.id,body.requestId);
  assert.equal((await sql`SELECT id FROM emsit_requests WHERE id=${body.requestId}`).length,1);
  const failing=submissionEndpoint('message',()=>{throw new Error('DB offline')});const failure=response();await failing(request(message()),failure);assert.equal(failure.statusCode,503);assert.equal(failure.data.ok,undefined);
});
test('private inbox rejects unauthenticated requests',async()=>{
  const res=response();await requestsEndpoint({method:'GET',headers:{},url:'/api/requests'},res);assert.equal(res.statusCode,401);assert.equal(res.headers['Cache-Control'],'no-store');
});

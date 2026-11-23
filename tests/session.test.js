import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sessionEndpoint} from '../api/session.js';
const config={ADMIN_PASSWORD:'test-password-long-enough',SESSION_SECRET:'test-secret-that-is-longer-than-32-characters',DATABASE_URL:'postgresql://test:test@localhost/test'};
async function login(sql,password=config.ADMIN_PASSWORD){const response={headers:{},setHeader(k,v){this.headers[k]=v},end(value){this.data=JSON.parse(value)}};await sessionEndpoint(()=>sql)({method:'POST',headers:{host:'localhost',origin:'http://localhost','content-type':'application/json'},body:{password},socket:{remoteAddress:'test'}},response);return response;}
test('login identifies missing configuration without returning secret values',async()=>{delete process.env.VERCEL;for(const key of Object.keys(config)){Object.assign(process.env,config);delete process.env[key];const res=await login(()=>{throw Error('Database must not be called')});assert.equal(res.statusCode,503);assert.ok(res.data.error.includes(key));for(const secret of Object.values(config))assert.ok(!res.data.error.includes(secret));assert.equal(res.headers['Set-Cookie'],undefined);}});
test('login distinguishes missing schema, unavailable database and invalid password',async()=>{Object.assign(process.env,config);let res=await login(async()=>{throw Object.assign(new Error('private connection details'),{code:'42P01'})});assert.equal(res.statusCode,503);assert.match(res.data.error,/schema.sql/);res=await login(async()=>{throw Error('private connection details')});assert.equal(res.statusCode,503);assert.match(res.data.error,/cannot connect/);assert.ok(!res.data.error.includes('private connection details'));res=await login(async([query])=>query.includes('SELECT password_hash')?[]:[{hits:1}],'wrong');assert.equal(res.statusCode,401);assert.equal(res.headers['Set-Cookie'],undefined);res=await login(async([query])=>query.includes('SELECT password_hash')?[]:[{hits:1}]);assert.equal(res.statusCode,200);assert.match(res.headers['Set-Cookie'],/HttpOnly/);});

test('password settings require a session and current password, then rotate existing sessions',async()=>{
  Object.assign(process.env,config);
  let passwordHash;
  const sql=async([query],...values)=>{
    if(query.includes('SELECT password_hash'))return passwordHash?[{password_hash:passwordHash}]:[];
    if(query.includes('INSERT INTO emsit_admin_credentials')){
      if(passwordHash)return [];
      passwordHash=values[0];
      return [{id:1}];
    }
    if(query.includes('emsit_rate_limits'))return [{hits:1}];
    throw Error('Unexpected SQL');
  };
  const handler=sessionEndpoint(()=>sql);
  const next='new-password-long-enough';
  const initial=await login(sql);
  const oldCookie=initial.headers['Set-Cookie'].split(';')[0];
  async function request(method,cookie='',body){
    const response={headers:{},setHeader(k,v){this.headers[k]=v},end(value){this.data=JSON.parse(value)}};
    await handler({method,headers:{host:'localhost',origin:'http://localhost',cookie,'content-type':'application/json'},body},response);
    return response;
  }
  const change={currentPassword:config.ADMIN_PASSWORD,newPassword:next};
  assert.equal((await request('PATCH','',change)).statusCode,401);
  assert.equal((await request('PATCH',oldCookie,{...change,currentPassword:'wrong'})).statusCode,400);
  assert.equal(passwordHash,undefined);
  const saved=await request('PATCH',oldCookie,change);
  assert.equal(saved.statusCode,200);
  assert.match(passwordHash,/^[a-f0-9]{32}:[a-f0-9]{128}$/);
  const newCookie=saved.headers['Set-Cookie'].split(';')[0];
  assert.equal((await request('GET',oldCookie)).statusCode,401);
  assert.equal((await request('GET',newCookie)).statusCode,200);
  assert.equal((await login(sql,config.ADMIN_PASSWORD)).statusCode,401);
  assert.equal((await login(sql,next)).statusCode,200);
});

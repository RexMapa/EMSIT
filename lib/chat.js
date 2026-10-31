import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { HttpError, uuid } from './validation.js';
export function visitorIdentity(req,res,renew=false) {
  let token=renew?null:(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('emsit_visitor='))?.slice(14);
  if(!/^[a-f0-9]{64}$/.test(token||'')) {
    token=randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie',`emsit_visitor=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000${process.env.VERCEL?'; Secure':''}`);
  }
  return createHash('sha256').update(token).digest('hex');
}
export function chatText(value,max=3000) {
  if(typeof value!=='string'||!value.trim()||value.length>max||value.includes('\0'))throw new HttpError(400,'Please enter a valid message.');
  return value.trim();
}
export function messageInput(body){
  if(!uuid.test(body.clientId||''))throw new HttpError(400,'Invalid message reference.');
  return {clientId:body.clientId,text:chatText(body.message)};
}
export function cursor(value){const n=Number(value||0);if(!Number.isSafeInteger(n)||n<0)throw new HttpError(400,'Invalid message cursor.');return n;}
export function threadId(value){if(!uuid.test(value||''))throw new HttpError(400,'Invalid conversation.');return value;}
export async function visitorThread(sql,hash){const rows=await sql`SELECT id,name,email,status,visitor_read_id,expires_at FROM emsit_chats WHERE visitor_hash=${hash}`;return rows[0]||null;}
export async function ensureThread(sql,hash,body){
  const name=chatText(body.name||'Guest',100),email=body.email?chatText(body.email,160).toLowerCase():'';
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Please enter a valid email address.');
  const rows=await sql`INSERT INTO emsit_chats(id,visitor_hash,name,email,expires_at) VALUES(${randomUUID()},${hash},${name},${email},now()+interval '3 days')
    ON CONFLICT(visitor_hash) DO UPDATE SET visitor_hash=EXCLUDED.visitor_hash RETURNING id,name,email,status`;
  return rows[0];
}
export async function sendChatMessage(sql,id,sender,input){
  // Lock/update the conversation before allocating its next message ID.
  const rows=await sql`WITH gate AS (UPDATE emsit_chats SET updated_at=now(),status='open' WHERE id=${id} RETURNING id)
    INSERT INTO emsit_chat_messages(chat_id,client_id,sender,body)
    SELECT id,${input.clientId},${sender},${input.text} FROM gate
    ON CONFLICT(chat_id,client_id) DO NOTHING RETURNING id`;
  if(rows.length)return rows[0];
  const existing=await sql`SELECT id,sender,body FROM emsit_chat_messages WHERE chat_id=${id} AND client_id=${input.clientId}`;
  if(!existing.length)throw new HttpError(404,'Conversation not found.');
  if(existing[0].sender!==sender||existing[0].body!==input.text)throw new HttpError(409,'This message reference was already used. Please try a new message.');
  return {id:existing[0].id};
}
export async function chatMessages(sql,id,after){
  const rows=await sql`SELECT id::text,sender,body,created_at FROM emsit_chat_messages WHERE chat_id=${id} AND id>${after} ORDER BY emsit_chat_messages.id LIMIT 101`;
  return {messages:rows.slice(0,100),hasMore:rows.length>100};
}
export async function markChatRead(sql,id,reader,lastId){
  // Only mark through an actual rendered message; never mark unseen later arrivals.
  if(reader==='admin')await sql`UPDATE emsit_chats SET admin_read_id=GREATEST(admin_read_id,${lastId}) WHERE id=${id} AND EXISTS(SELECT 1 FROM emsit_chat_messages WHERE chat_id=${id} AND id=${lastId})`;
  else await sql`UPDATE emsit_chats SET visitor_read_id=GREATEST(visitor_read_id,${lastId}) WHERE id=${id} AND EXISTS(SELECT 1 FROM emsit_chat_messages WHERE chat_id=${id} AND id=${lastId})`;
}
export async function chatList(sql,status,offset){
  const rows=await sql`SELECT c.id,c.name,c.email,c.status,c.updated_at,
    (SELECT count(*)::int FROM emsit_chat_messages m WHERE m.chat_id=c.id AND m.sender='visitor' AND m.id>c.admin_read_id) AS unread,
    (SELECT body FROM emsit_chat_messages m WHERE m.chat_id=c.id ORDER BY m.id DESC LIMIT 1) AS preview
    FROM emsit_chats c WHERE (${status}='all' OR c.status=${status}) ORDER BY c.updated_at DESC,c.id LIMIT 51 OFFSET ${offset}`;
  const totals=await sql`SELECT count(*)::int AS unread FROM emsit_chat_messages m JOIN emsit_chats c ON c.id=m.chat_id WHERE m.sender='visitor' AND m.id>c.admin_read_id`;
  return {items:rows.slice(0,50),hasMore:rows.length>50,unread:totals[0].unread};
}

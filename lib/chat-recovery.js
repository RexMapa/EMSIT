import {createHash,randomBytes} from 'node:crypto';
import {HttpError} from './validation.js';
const digest=value=>createHash('sha256').update(value).digest('hex');
export async function expireChats(sql){
  // Existing chats with no expiry are preserved. Only new guest chats expire.
  await sql`WITH expired AS (SELECT id FROM emsit_chats WHERE expires_at<now() FOR UPDATE),
    removed AS (DELETE FROM emsit_chat_messages WHERE chat_id IN (SELECT id FROM expired) RETURNING id)
    DELETE FROM emsit_chats WHERE id IN (SELECT id FROM expired) AND (SELECT count(*) FROM removed)>=0`;
}
export async function issueChatCode(sql,id){
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for(let attempt=0;attempt<5;attempt++){
    const letters=Array.from(randomBytes(12),byte=>alphabet[byte%alphabet.length]).join('');
    const code='EMSIT-'+letters.match(/.{4}/g).join('-');
    try{const rows=await sql`UPDATE emsit_chats SET recovery_hash=${digest(code)} WHERE id=${id} RETURNING id`;if(!rows.length)throw new HttpError(404,'Conversation not found.');return code;}
    catch(error){if(error.code!=='23505')throw error;}
  }
  throw new HttpError(503,'Could not generate a chat code. Please try again.');
}
export async function recoverChat(sql,code,hash){
  const clean=typeof code==='string'?code.toUpperCase().replace(/[\s-]/g,''):'';
  if(!/^EMSIT[A-HJ-NP-Z2-9]{12}$/.test(clean))throw new HttpError(400,'Enter a valid EMSIT chat code.');
  const formatted='EMSIT-'+clean.slice(5).match(/.{4}/g).join('-');
  const rows=await sql`UPDATE emsit_chats SET visitor_hash=${hash},expires_at=CASE WHEN expires_at IS NULL THEN NULL ELSE now()+interval '3 days' END WHERE recovery_hash=${digest(formatted)} AND (expires_at IS NULL OR expires_at>now()) RETURNING id`;
  if(!rows.length)throw new HttpError(400,'This chat code is invalid or expired.');
  return rows[0];
}

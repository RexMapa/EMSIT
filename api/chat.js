import {database} from '../lib/db.js';
import {endpoint,requireMethod,sameOrigin,readJson,json} from '../lib/http.js';
import {clientKey,consumeLimit} from '../lib/store.js';
import {HttpError} from '../lib/validation.js';
import {visitorIdentity,visitorThread,ensureThread,messageInput,sendChatMessage,chatMessages,markChatRead,cursor} from '../lib/chat.js';
export function chatEndpoint(getDatabase=database){return endpoint(async(req,res)=>{
  requireMethod(req,res,['GET','POST','PATCH']);
  if(req.method!=='GET')sameOrigin(req);
  const hash=visitorIdentity(req,res),sql=getDatabase();
  let thread=await visitorThread(sql,hash);
  if(req.method==='GET'){
    if(!thread)return json(res,200,{thread:null,messages:[],hasMore:false,unread:0});
    const after=cursor(new URL(req.url,'http://localhost').searchParams.get('after'));
    const unread=await sql`SELECT count(*)::int AS unread FROM emsit_chat_messages WHERE chat_id=${thread.id} AND sender='admin' AND id>${thread.visitor_read_id}`;
    const {visitor_read_id,...publicThread}=thread;
    return json(res,200,{thread:publicThread,...await chatMessages(sql,thread.id,after),unread:unread[0].unread});
  }
  const body=await readJson(req);
  if(req.method==='PATCH'){
    if(!thread)throw new HttpError(404,'Conversation not found.');
    await markChatRead(sql,thread.id,'visitor',cursor(body.lastId));return json(res,200,{ok:true});
  }
  const input=messageInput(body);
  await consumeLimit(sql,clientKey(req,'chat-send'),60);
  if(!thread){await consumeLimit(sql,clientKey(req,'chat-start'),10);thread=await ensureThread(sql,hash,body);}
  const message=await sendChatMessage(sql,thread.id,'visitor',input);
  json(res,201,{ok:true,id:String(message.id)});
});}
export default chatEndpoint();

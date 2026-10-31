import {database} from '../lib/db.js';
import {endpoint,requireMethod,sameOrigin,readJson,json} from '../lib/http.js';
import {requireAdmin} from '../lib/auth.js';
import {HttpError} from '../lib/validation.js';
import {chatList,chatMessages,markChatRead,messageInput,sendChatMessage,cursor,threadId} from '../lib/chat.js';
export function adminChatEndpoint(getDatabase=database){return endpoint(async(req,res)=>{
  requireMethod(req,res,['GET','POST','PATCH']);requireAdmin(req);
  if(req.method!=='GET')sameOrigin(req);
  const sql=getDatabase(),params=new URL(req.url,'http://localhost').searchParams;
  if(req.method==='GET'){
    if(params.has('id')){
      const id=threadId(params.get('id'));
      const rows=await sql`SELECT id,name,email,status FROM emsit_chats WHERE id=${id}`;
      if(!rows.length)throw new HttpError(404,'Conversation not found.');
      return json(res,200,{thread:rows[0],...await chatMessages(sql,id,cursor(params.get('after')))});
    }
    const status=params.get('status')||'all',offset=cursor(params.get('offset'));
    if(!['all','open','closed'].includes(status)||offset>1000000)throw new HttpError(400,'Invalid filter.');
    return json(res,200,await chatList(sql,status,offset));
  }
  const body=await readJson(req),id=threadId(body.id);
  if(req.method==='POST'){const message=await sendChatMessage(sql,id,'admin',messageInput(body));return json(res,201,{ok:true,id:String(message.id)});}
  if(body.action==='read'){await markChatRead(sql,id,'admin',cursor(body.lastId));return json(res,200,{ok:true});}
  if(body.action==='status'&&['open','closed'].includes(body.status)){
    const rows=await sql`UPDATE emsit_chats SET status=${body.status},updated_at=now() WHERE id=${id} RETURNING id,status`;
    if(!rows.length)throw new HttpError(404,'Conversation not found.');return json(res,200,rows[0]);
  }
  throw new HttpError(400,'Invalid action.');
});}
export default adminChatEndpoint();

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import contact from '../api/contact.js';
import bookings from '../api/bookings.js';
import session from '../api/session.js';
import requests from '../api/requests.js';
import chat from '../api/chat.js';
import adminChat from '../api/admin-chat.js';
const routes = {'/api/contact':contact,'/api/bookings':bookings,'/api/session':session,'/api/requests':requests,'/api/chat':chat,'/api/admin-chat':adminChat};
const root = resolve('public');
const server = http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost');
    if(routes[url.pathname]) return await routes[url.pathname](req,res);
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
    let pathname = decodeURIComponent(url.pathname);
    if(pathname==='/')pathname='/index.html';
    else if(!extname(pathname))pathname+='.html';
    const file = resolve(root,'.'+pathname);
    if(!file.startsWith(root+sep)){res.writeHead(403);return res.end()}
    const data = await readFile(file);
    res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');
    res.setHeader('X-Content-Type-Options','nosniff');res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Not found')}
});
server.listen(Number(process.env.PORT || 4174),'127.0.0.1',()=>console.log(`EMSIT app: http://127.0.0.1:${server.address().port}`));

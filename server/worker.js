import {DurableObject} from 'cloudflare:workers';
import {newRoom,joinRoom,publicRoom,applyCommand,advanceAI,RoomError} from './room.js';
import {decisionPlayer} from '../src/game.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const digest=async token=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const TTL=7*24*60*60*1000;
export class GameRoom extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);this.ctx=ctx;
  ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room (id INTEGER PRIMARY KEY, data TEXT NOT NULL)');
  this.room=[...ctx.storage.sql.exec('SELECT data FROM room WHERE id=1')].map(r=>JSON.parse(r.data))[0]||null;
  ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));
 }
 save(room){this.ctx.storage.sql.exec('INSERT OR REPLACE INTO room(id,data) VALUES(1,?)',JSON.stringify(room));this.room=room;}
 online(){return [...new Set(this.ctx.getWebSockets().map(ws=>ws.deserializeAttachment()?.key).filter(Boolean))];}
 send(ws,value){try{ws.send(JSON.stringify(value));}catch{try{ws.close(1011,'连接已断开');}catch{}}}
 snapshot(ws,extra={}){
  const key=ws.deserializeAttachment()?.key,seat=this.room?.seats.findIndex(s=>s.key===key);
  if(seat===undefined||seat<0){this.send(ws,{type:'error',error:'身份已失效',fatal:true});ws.close(4001,'身份已失效');return;}
  this.send(ws,{type:'snapshot',seat,room:publicRoom(this.room,this.online()),...extra});
 }
 broadcast(extra={}){for(const ws of this.ctx.getWebSockets())if(ws.deserializeAttachment()?.key)this.snapshot(ws,extra);}
 async schedule(){
  if(!this.room)return;
  let time=this.room.updated+TTL;
  const online=this.online();
  for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment();if(!a?.key)time=Math.min(time,(a?.opened||Date.now())+15000);}
  if(this.room.status==='playing'&&online.length){
   const seat=this.room.seats[decisionPlayer(this.room.game)];
   time=Math.min(time,seat.kind==='ai'?Math.max(this.room.readyAt,Date.now()+500):this.room.deadline);
  }
  await this.ctx.storage.setAlarm(Math.max(Date.now()+100,time));
 }
 async fetch(request){
  try{
   const url=new URL(request.url),op=url.pathname.split('/').at(-1);
   if(op==='ws'&&request.headers.get('Upgrade')?.toLowerCase()==='websocket'){
    if(!this.room)return json({error:'房间不存在或已过期'},404);
    if(this.ctx.getWebSockets().length>=48)return json({error:'房间连接过多'},429);
    const [client,server]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(server);server.serializeAttachment({opened:Date.now()});
    await this.schedule();return new Response(null,{status:101,webSocket:client});
   }
   if(request.method!=='POST'||!['create','join'].includes(op))return json({error:'接口不存在'},404);
   const body=await request.text();if(body.length>4096)return json({error:'请求过大'},413);
   const input=JSON.parse(body),token=crypto.randomUUID()+crypto.randomUUID(),key=await digest(token);
   if(op==='create'){
    if(this.room)return json({error:'房间已经存在'},409);
    this.save(newRoom(input.code,input,key));
   }else{
    if(!this.room)return json({error:'房间不存在或已过期'},404);
    this.save(joinRoom(this.room,input,key));
   }
   this.broadcast();await this.schedule();return json({code:this.room.code,token});
  }catch(e){return json({error:e instanceof RoomError?e.message:'请求无效'},400);}
 }
 async webSocketMessage(ws,message){
  try{
   if(typeof message!=='string'||message.length>8192)throw new RoomError('消息过大');
   const input=JSON.parse(message),attachment=ws.deserializeAttachment()||{};
   if(!attachment.key){
    if(input.type!=='auth'||typeof input.token!=='string'||input.token.length>100)throw new RoomError('请重新连接房间');
    const key=await digest(input.token);
    if(!this.room?.seats.some(s=>s.kind==='human'&&s.key===key)){this.send(ws,{type:'error',error:'身份无效，请使用原浏览器重连',fatal:true});ws.close(4001,'身份无效');return;}
    // One active connection per browser identity; a refreshed tab replaces its old socket.
    for(const other of this.ctx.getWebSockets())if(other!==ws&&other.deserializeAttachment()?.key===key)other.close(4002,'此身份已在另一页面连接');
    if(!this.online().length&&this.room.status==='playing'){
     const now=Date.now();this.save({...this.room,version:this.room.version+1,readyAt:now,deadline:now+120000});
    }
    ws.serializeAttachment({key,last:Date.now(),count:0});
    this.snapshot(ws,{reset:true});this.broadcast({presence:true});await this.schedule();return;
   }
   const now=Date.now(),count=now-attachment.last<1000?attachment.count+1:1;
   ws.serializeAttachment({...attachment,last:now,count});if(count>12)throw new RoomError('操作过于频繁');
   if(input.type==='sync'){this.snapshot(ws,{reset:true});return;}
   const result=applyCommand(this.room,attachment.key,input);
   if(!result.duplicate){this.save(result.room);this.broadcast({action:result.action?{type:result.action.type}:null,receipt:input.id});}
   else this.snapshot(ws,{receipt:input.id});
   await this.schedule();
  }catch(e){this.send(ws,{type:'error',error:e instanceof RoomError?e.message:'操作未完成，请重试'});if(this.room)this.snapshot(ws);}
 }
 async webSocketClose(ws,code,reason){try{ws.close(code,reason);}catch{}this.broadcast({presence:true});await this.schedule();}
 async webSocketError(ws){try{ws.close(1011,'连接错误');}catch{}await this.schedule();}
 async alarm(){
  for(const ws of this.ctx.getWebSockets()){const a=ws.deserializeAttachment();if(!a?.key&&Date.now()-(a?.opened||0)>14000)ws.close(4001,'登录超时');}
  if(!this.room)return;
  if(Date.now()>this.room.updated+TTL){for(const ws of this.ctx.getWebSockets())ws.close(4004,'房间已过期');this.ctx.storage.sql.exec('DELETE FROM room');this.room=null;return;}
  if(this.online().length){
   const result=advanceAI(this.room);if(result.room!==this.room){this.save(result.room);this.broadcast({action:{type:result.action.type}});}
  }
  await this.schedule();
 }
}
// Rooms can only be addressed through the Pages binding, never this entry point.
export default {fetch(){return new Response('Not found',{status:404});}};

// Per-source limits prevent anonymous room creation / connection floods from exhausting quotas.
// Pages supplies a SHA-256 IP key, never a raw address; buckets expire after one hour.
export class TrafficGuard extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, reset INTEGER NOT NULL)');}
 async fetch(request){
  const op=new URL(request.url).pathname.slice(1),now=Date.now();
  const max=op==='create'?30:op==='join'?60:180,window=op==='create'?3600000:60000;
  const row=[...this.ctx.storage.sql.exec('SELECT count,reset FROM limits WHERE bucket=?',op)][0];
  if(row&&row.reset>now&&row.count>=max)return new Response(null,{status:429});
  this.ctx.storage.sql.exec('INSERT OR REPLACE INTO limits(bucket,count,reset) VALUES(?,?,?)',op,row&&row.reset>now?row.count+1:1,row&&row.reset>now?row.reset:now+window);
  await this.ctx.storage.setAlarm(now+3600000);return new Response(null,{status:204});
 }
 async alarm(){this.ctx.storage.sql.exec('DELETE FROM limits');}
}

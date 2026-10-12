import assert from 'node:assert/strict';
const base=process.env.BASE_URL||'http://localhost:8788';
const sockets=[];
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function post(path,data,headers={}){const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};}
async function connect(identity){
 const ws=new WebSocket(base.replace(/^http/,'ws')+`/api/rooms/${identity.code}/ws`),messages=[];sockets.push(ws);
 ws.addEventListener('message',e=>{try{messages.push(JSON.parse(e.data));}catch{}});
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 ws.send(JSON.stringify({type:'auth',token:identity.token}));
 const peer={ws,messages,get latest(){return messages.filter(m=>m.type==='snapshot').at(-1);}};
 await wait(()=>peer.latest);return peer;
}
async function wait(check,timeout=25000){const until=Date.now()+timeout;while(!check()){assert.ok(Date.now()<until,'protocol wait timed out');await delay(60);}}
async function command(peer,body){const m={...body,id:crypto.randomUUID(),version:peer.latest.room.version};peer.ws.send(JSON.stringify(m));await wait(()=>peer.messages.some(x=>x.receipt===m.id));return m;}
const animation=peer=>wait(()=>Date.now()>peer.latest.room.readyAt+50);
try{
 assert.equal((await post('/api/rooms',{name:'外站'},{Origin:'https://not-allowed.example'})).status,403);
 assert.equal((await post('/api/rooms',{name:'x'.repeat(5000)})).status,413);
 const created=await post('/api/rooms',{name:'协议测试'});assert.equal(created.status,200);const identity=created.data,p=await connect(identity);
 await command(p,{type:'settings',settings:{aiCount:1,kind:'classic',size:20,rounds:1}});
 await command(p,{type:'start'});
 await command(p,{type:'action',action:{type:'CARD',card:'dice',value:2}});await animation(p);
 const rolled=await command(p,{type:'action',action:{type:'ROLL',value:6,eventSeed:.99}});
 assert.equal(p.latest.room.game.dice,2);assert.equal(p.latest.room.game.phase,'draw');
 assert.ok(p.latest.room.game.eventDraw.offerIds.every(id=>id.startsWith('hidden-')));
 assert.deepEqual(p.messages.find(m=>m.receipt===rolled.id).action,{type:'ROLL'});
 const version=p.latest.room.version;const length=p.messages.length;p.ws.send(JSON.stringify(rolled));await wait(()=>p.messages.length>length);assert.equal(p.latest.room.version,version);
 assert.equal((await post(`/api/rooms/${identity.code}/join`,{name:'迟到'})).status,400);
 await animation(p);await command(p,{type:'action',action:{type:'DRAW_EVENT',index:0}});await animation(p);
 // Resolve one event; finish any legitimate choices via the actual room's engine AI.
 const {aiAction}=await import('../src/game.js');
 while(p.latest.room.game.current===0&&p.latest.room.status==='playing'){
  const game=p.latest.room.game,input=aiAction(game);
  await command(p,{type:'action',action:input});await animation(p);
 }
 const aiVersion=p.latest.room.version;await wait(()=>p.latest.room.version>aiVersion||p.latest.room.status==='finished',20000);
 const durable=JSON.stringify(p.latest.room.game);p.ws.close();await delay(250);
 const resumed=await connect(identity);assert.equal(resumed.latest.seat,0);assert.ok(resumed.latest.room.version>=aiVersion);
 // Active AI may legitimately progress during reconnect; it must never reset to a lobby.
 assert.notEqual(resumed.latest.room.status,'lobby');assert.ok(resumed.latest.room.game.players[0].pos>0);
 console.log(JSON.stringify({ok:true,base,checks:['same-origin enforcement','body limits','hidden card identities and seeds','duplicate receipts','no midgame joins','AI alarm progression','persistent reconnect']}));
}finally{for(const ws of sockets)ws.close();}

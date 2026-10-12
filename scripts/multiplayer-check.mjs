import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.BASE_URL||'http://localhost:8788';
const browser=await chromium.launch({channel:'chrome',headless:true});
const contexts=[],errors=[];
async function client(width=1440,height=960){
 const c=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});contexts.push(c);
 await c.addInitScript(()=>{const Native=window.WebSocket;window._snapshots=[];window._errors=[];window.WebSocket=class extends Native{constructor(...args){super(...args);window._socket=this;this.addEventListener('message',e=>{try{const m=JSON.parse(e.data);if(m.type==='snapshot'){window._snapshot=m;window._snapshots.push(m);}if(m.type==='error')window._errors.push(m.error);}catch{}});}};});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));return p;
}
const waitVersion=async(p,v)=>p.waitForFunction(v=>window._snapshot?.room.version>=v,v);
const snapshot=p=>p.evaluate(()=>window._snapshot);
async function readyAt(p){await p.waitForFunction(()=>Date.now()>window._snapshot.room.readyAt+300,null,{timeout:20000});}
async function raw(p,body){return p.evaluate(body=>{const m={id:crypto.randomUUID(),version:window._snapshot.room.version,...body};window._socket.send(JSON.stringify(m));return m.id;},body);}
try{
 const host=await client(),guest=await client(390,844);
 await host.goto(base);await host.getByLabel('昵称',{exact:true}).fill('房主测试');await host.getByRole('button',{name:'创建房间',exact:true}).click();
 await host.getByRole('heading',{name:'准备大厅'}).waitFor();const code=(await snapshot(host)).room.code;
 await guest.goto(`${base}/?room=${code}`);await guest.getByLabel('昵称',{exact:true}).fill('访客测试');await guest.getByRole('button',{name:'加入房间',exact:true}).click();await guest.getByRole('heading',{name:'准备大厅'}).waitFor();
 await host.waitForFunction(()=>window._snapshot.room.seats.length===2);const setupVersion=(await snapshot(host)).room.version;
 await host.getByLabel('AI 人数').fill('0');await host.getByRole('button',{name:'保存设置',exact:true}).click();await waitVersion(guest,setupVersion+1);await guest.getByRole('button',{name:'准备',exact:true}).click();await host.waitForFunction(()=>window._snapshot.room.seats.every(s=>s.ready));
 await host.getByRole('button',{name:'开始对局',exact:true}).click();await host.getByRole('button',{name:'掷骰子',exact:true}).waitFor();await guest.locator('.board').waitFor();
 let s=await snapshot(host);assert.equal((await snapshot(guest)).seat,1);assert.deepEqual((await snapshot(guest)).room.game,s.room.game);
 await raw(guest,{type:'action',action:{type:'ROLL',actor:0,value:6}});await guest.waitForFunction(()=>window._errors.some(e=>e.includes('决策回合')));
 assert.equal((await snapshot(host)).room.version,s.room.version);
 // Controlled dice is a legal player choice. The unauthenticated raw dice value is not.
 await raw(host,{type:'action',action:{type:'CARD',card:'dice',value:1}});await waitVersion(host,s.room.version+1);await readyAt(host);
 await host.getByRole('button',{name:'掷骰子',exact:true}).click();await waitVersion(host,s.room.version+2);
 // Reload after the authoritative roll, even if visual movement was in progress.
 await host.reload();await host.locator('.board').waitFor();await readyAt(host);await host.getByRole('button',{name:'购买 ¥ 2,200',exact:true}).click();await waitVersion(host,s.room.version+3);await readyAt(host);
 const bought=await snapshot(host);assert.equal(bought.room.game.properties[1].owner,0);
 await raw(host,{type:'action',action:{type:'END'}});await waitVersion(guest,bought.room.version+1);await readyAt(guest);
 await raw(guest,{type:'action',action:{type:'CARD',card:'dice',value:1}});await waitVersion(guest,bought.room.version+2);await readyAt(guest);
 await guest.getByRole('button',{name:'掷骰子',exact:true}).click();await waitVersion(guest,bought.room.version+3);await readyAt(guest);
 await guest.getByRole('button',{name:/提出收购/}).click();await waitVersion(host,bought.room.version+4);await readyAt(host);
 await host.getByRole('button',{name:'拒绝收购',exact:true}).click();await waitVersion(guest,bought.room.version+5);await readyAt(guest);
 await guest.getByRole('button',{name:/^支付租金/}).click();await waitVersion(guest,bought.room.version+6);await readyAt(guest);
 const before=await snapshot(guest);const resets=await guest.evaluate(()=>window._snapshots.filter(s=>s.reset).length);await guest.context().setOffline(true);await guest.evaluate(()=>window._socket.close());await guest.context().setOffline(false);await guest.waitForFunction(n=>window._snapshots.filter(s=>s.reset).length>n&&window._socket.readyState===1,resets);
 await guest.reload();await guest.locator('.board').waitFor();const after=await snapshot(guest);assert.equal(after.seat,1);assert.deepEqual(after.room.game,before.room.game);
 assert.equal(await guest.evaluate(()=>localStorage.getItem('city-dice-v1')),null);
 await mkdir('artifacts',{recursive:true});await host.screenshot({path:'artifacts/multiplayer-desktop.png'});await guest.screenshot({path:'artifacts/multiplayer-mobile.png'});
 for(const p of [host,guest])assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,base,checks:['two identities','server authority','turn ownership','controlled dice','refresh persistence','human seller reply','rent synchronization','reconnect','local-save isolation','desktop/mobile layout'],version:after.room.version}));
}catch(e){for(const c of contexts){for(const p of c.pages()){console.error(JSON.stringify({url:p.url(),state:await p.evaluate(()=>({snapshot:window._snapshot,errors:window._errors})),buttons:await p.getByRole('button').allTextContents()}));await p.screenshot({path:`artifacts/multiplayer-fail-${contexts.indexOf(c)}.png`});}}throw e;}finally{await browser.close();}

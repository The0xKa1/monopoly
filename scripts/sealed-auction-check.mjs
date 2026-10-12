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
 // Enter a city auction through legal actions, with two independent human identities.
 await raw(host,{type:'action',action:{type:'CARD',card:'dice',value:1}});await waitVersion(host,s.room.version+1);await readyAt(host);
 await host.getByRole('button',{name:'掷骰子',exact:true}).click();await waitVersion(host,s.room.version+2);await readyAt(host);
 await host.getByRole('button',{name:/^不购买/}).click();await waitVersion(guest,s.room.version+3);await readyAt(guest);
 await host.getByRole('heading',{name:/^密封拍卖/}).waitFor();await guest.getByRole('heading',{name:/^密封拍卖/}).waitFor();
 assert.equal(await guest.getByRole('button',{name:'提交保密报价'}).isEnabled(),true);
 for(const width of [320,390,1440]){await guest.setViewportSize({width,height:960});assert.ok(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 const auction=await snapshot(host),originalVersion=auction.room.version;
 await host.getByLabel('我的报价').fill('2457');await guest.getByLabel('我的报价').fill('2457');
 await host.getByRole('button',{name:'提交保密报价'}).click();await waitVersion(guest,originalVersion+1);await waitVersion(host,originalVersion+1);
 const hidden=await snapshot(guest),own=await snapshot(host);
 assert.equal(hidden.room.game.auction.bids,undefined);assert.equal(hidden.room.game.auction.ownBid,undefined);
 assert.ok(!JSON.stringify(hidden).includes('2457'));assert.equal(hidden.action.type,'AUCTION_SUBMIT');
 assert.equal(own.room.game.auction.ownBid,2457);assert.equal(hidden.room.game.players[0].cash,12000);
 assert.equal(hidden.room.deadline,auction.room.deadline);
 await host.reload();await host.locator('.board').waitFor();assert.equal((await snapshot(host)).room.game.auction.ownBid,2457);
 assert.match(await host.locator('.auction-actions').innerText(),/2,457/);
 assert.equal(await host.getByRole('button',{name:'提交保密报价'}).count(),0);
 // Deliver the other browser's quote based on its original snapshot, as happens in a network race.
 await raw(guest,{version:originalVersion,type:'action',action:{type:'AUCTION_BID',amount:2457,auctionId:auction.room.game.auction.id,seed:0}});
 await waitVersion(host,originalVersion+2);await waitVersion(guest,originalVersion+2);await readyAt(host);
 const revealed=await snapshot(host),result=revealed.room.game.lastAuctionResult;
 assert.deepEqual(result.tied,[0,1]);assert.ok([0,1].includes(result.winner));
 assert.equal(revealed.room.game.players[result.winner].cash,9543);assert.equal(revealed.room.game.players[1-result.winner].cash,12000);
 assert.deepEqual((await snapshot(guest)).room.game,revealed.room.game);
 await host.locator('.sealed-result').waitFor();assert.match(await host.locator('.sealed-result').innerText(),/同价随机抽签/);
 await mkdir('artifacts/sealed-auction',{recursive:true});
 await host.screenshot({path:'artifacts/sealed-auction/revealed-desktop.png'});
 await guest.setViewportSize({width:390,height:844});await guest.screenshot({path:'artifacts/sealed-auction/revealed-mobile.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(await guest.evaluate(()=>window._errors),[]);
 console.log('PASS: two simultaneous human bidders, server snapshot secrecy, hidden pass/bid action, personal quote after refresh, stale-version concurrent submission, server tie draw, one winner charged, full reveal, responsive layouts, no JS errors.');
}catch(e){for(const c of contexts){for(const p of c.pages()){console.error(JSON.stringify({url:p.url(),state:await p.evaluate(()=>({snapshot:window._snapshot,errors:window._errors})),buttons:await p.getByRole('button').allTextContents()}));await p.screenshot({path:`artifacts/multiplayer-fail-${contexts.indexOf(c)}.png`});}}throw e;}finally{await browser.close();}

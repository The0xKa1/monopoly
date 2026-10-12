import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,joinRoom,applyCommand,publicRoom,advanceAI,safeAction,HUMAN_TIMEOUT} from '../server/room.js';
import {decisionPlayer,rent,upgradeCost,transition} from '../src/game.js';
let n=0;
const msg=(room,body)=>({id:`command-${++n}`,version:room.version,...body});
const command=(room,key,body,now=1e6,rng=()=>0)=>applyCommand(room,key,msg(room,body),now,rng).room;
function lobby(){let r=newRoom('ABCDEF123456',{name:'甲'},'host',0);r=joinRoom(r,{name:'乙'},'guest',0);return command(r,'host',{type:'settings',settings:{aiCount:0,kind:'classic',size:20,rounds:20}});}
function started(){let r=lobby();r=command(r,'guest',{type:'ready',ready:true});return command(r,'host',{type:'start'});}
const action=(r,key,a)=>command(r,key,{type:'action',action:a},r.readyAt+1);
test('lobby validates names, seats, host permissions and readiness',()=>{
 const r=lobby();assert.throws(()=>joinRoom(r,{name:'甲'},'other'),/昵称已存在/);
 assert.throws(()=>command(r,'guest',{type:'start'}),/房主/);
 assert.throws(()=>command(r,'host',{type:'start'}),/准备/);
 assert.throws(()=>command(r,'guest',{type:'settings',settings:{}}),/房主/);
 assert.throws(()=>command(r,'host',{type:'settings',settings:{aiCount:20,kind:'classic',size:20,rounds:20}}),/人数/);
 assert.throws(()=>command(r,'host',{type:'settings',settings:{aiCount:0,kind:'invalid',size:20,rounds:20}}),/地图/);
 const kicked=command(r,'host',{type:'kick',seat:1});assert.throws(()=>command(kicked,'guest',{type:'ready',ready:true}),/身份/);
});
test('a nonzero seat owns its turn, cards and seller decision; client actor cannot forge identity',()=>{
 let r=started();assert.throws(()=>action(r,'guest',{type:'ROLL',actor:0}),/决策回合/);
 r=action(r,'host',{type:'ROLL',value:6,eventSeed:.99});assert.equal(r.game.dice,1);
 r=action(r,'host',{type:'BUY'});r=action(r,'host',{type:'END'});
 r=action(r,'guest',{type:'CARD',actor:0,card:'dice',value:1});assert.equal(r.game.players[1].controlled,1);
 r=action(r,'guest',{type:'ROLL'});r=action(r,'guest',{type:'OFFER'});assert.equal(decisionPlayer(r.game),0);
 assert.throws(()=>action(r,'guest',{type:'OFFER_REPLY',actor:0,accept:true}),/决策回合/);
 r=action(r,'host',{type:'OFFER_REPLY',actor:999,accept:true});assert.equal(r.game.properties[1].owner,1);
 // Reverse the setup: human seat 1 must answer an offer made during seat 0's turn.
 r.game={...r.game,current:0,phase:'rent',pendingRent:{tile:1,owner:1,amount:100},players:r.game.players.map(p=>({...p,pos:1}))};
 r=action(r,'host',{type:'OFFER'});assert.equal(decisionPlayer(r.game),1);
 r=action(r,'guest',{type:'OFFER_REPLY',accept:false});assert.equal(r.game.phase,'rent');
});
test('server generates randomness, strips unexpected fields and hides card backs',()=>{
 assert.deepEqual(safeAction({type:'ROLL',value:6,eventSeed:.9,game:{cash:999}},1,()=>0),{type:'ROLL',actor:1,value:1,eventSeed:0});
 assert.equal(safeAction({type:'RESOLVE_EVENT',seed:.99},0,()=>.25).seed,.25);
 assert.throws(()=>safeAction({type:'SET_ROUNDS'},0),/未知/);
 assert.throws(()=>safeAction({type:'__proto__'},0),/未知/);
 const r=started();r.game.eventDraw={source:'chance',offerIds:['a','b','c']};const out=publicRoom(r,['host']);
 assert.deepEqual(out.game.eventDraw.offerIds,['hidden-0','hidden-1','hidden-2']);
 assert.equal(out.seats[0].key,undefined);assert.equal(out.recent,undefined);assert.equal(out.seats[0].online,true);
 assert.equal(r.game.eventDraw.offerIds[0],'a');
});
test('duplicate commands are persisted and idempotent; stale and invalid actions fail',()=>{
 const r=started(),m=msg(r,{type:'action',action:{type:'ROLL'}}),result=applyCommand(r,'host',m,r.readyAt+1,()=>0);
 const restored=JSON.parse(JSON.stringify(result.room));assert.equal(applyCommand(restored,'host',m).duplicate,true);
 assert.throws(()=>applyCommand(restored,'host',{...m,id:'other-id'}),/状态已更新/);
 assert.throws(()=>action(r,'host',{type:'BUY'}),/当前阶段/);
 assert.throws(()=>action(r,'unknown',{type:'ROLL'}),/身份/);
 assert.throws(()=>applyCommand(result.room,'host',msg(result.room,{type:'action',action:{type:'BUY'}}),result.room.readyAt-1),/动画/);
});
test('online economy gives all seats equal perks, including passing start',()=>{
 let r=started(),g=r.game;g.players[0].pos=19;g=transition(g,{type:'ROLL',value:1});assert.equal(g.players[0].cash,13000);
 g.properties[1]={owner:0,level:0};const base=rent(g,1);g.properties[1].owner=2;assert.equal(rent(g,1),base);
 g.current=0;const price=upgradeCost(g,1);g.current=1;assert.equal(upgradeCost(g,1),price);
 assert.deepEqual(r.game.players[0].cards,r.game.players[1].cards);
});
test('timeout AI advances a human only after deadline; full mixed games finish',()=>{
 let r=started();assert.equal(advanceAI(r,r.readyAt+1).room,r);
 r=advanceAI(r,r.deadline+1,()=>.3).room;assert.equal(r.version,started().version+1);
 let l=newRoom('ABCDEF123456',{name:'甲'},'host',0);l=command(l,'host',{type:'settings',settings:{aiCount:3,kind:'mixed',size:36,rounds:2}});r=command(l,'host',{type:'start'});
 let steps=0;while(r.status==='playing'&&steps++<1500){const now=r.seats[decisionPlayer(r.game)].kind==='human'?r.deadline+1:r.readyAt+1;r=advanceAI(r,now,()=>.4).room;}
 assert.equal(r.status,'finished');assert.ok(steps<1500);assert.ok(r.game.players.every(p=>p.cash>=0));
 r=command(r,'host',{type:'lobby'});assert.equal(r.status,'lobby');assert.equal(r.seats.length,1);
});
test('twenty human seats can join, ready and start; twenty-first and late joins fail',()=>{
 let r=newRoom('ABCDEF123456',{name:'玩家0'},'key-0',0);
 r=command(r,'key-0',{type:'settings',settings:{aiCount:0,kind:'world',size:36,rounds:1}});
 for(let i=1;i<20;i++)r=joinRoom(r,{name:`玩家${i}`},`key-${i}`,0);
 assert.throws(()=>joinRoom(r,{name:'多余玩家'},'extra',0),/已满/);
 for(let i=1;i<20;i++)r=command(r,`key-${i}`,{type:'ready',ready:true});
 r=command(r,'key-0',{type:'start'});assert.equal(r.game.players.length,20);
 assert.throws(()=>joinRoom(r,{name:'后来玩家'},'extra',0),/已经开始|已开始/);
 let steps=0;while(r.status==='playing'&&steps++<1000)r=advanceAI(r,r.deadline+1,()=>.7).room;
 assert.equal(r.status,'finished');assert.equal(r.game.round,1);
});
test('a competing command with the same base version never mutates a newer state',()=>{
 let r=started();const first=msg(r,{type:'action',action:{type:'CARD',card:'shield'}}),second=msg(r,{type:'action',action:{type:'CARD',card:'build'}});
 r=applyCommand(r,'host',first,r.readyAt+1).room;const before=JSON.stringify(r);
 assert.throws(()=>applyCommand(r,'host',second,r.readyAt+1),/状态已更新/);
 assert.equal(JSON.stringify(r),before);assert.equal(r.game.players[0].cards.build,1);
});

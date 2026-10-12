import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,aiAction,rent} from '../src/game.js';
import {reserve,exposure,sellerAccepts} from '../src/ai.js';
import {getTiles} from '../src/board.js';
import {generateMap} from '../src/board.js';
const act=(s,type,fields={})=>transition(s,{type,...fields});
const rng=seed=>{let n=seed>>>0;return()=>((n=(n*1664525+1013904223)>>>0)/2**32);};
const aiTurn=(s,id)=>{s.current=id;s.phase='roll';return s;};

test('AI may play its own item cards, but nobody can play cards for another seat',()=>{
 const s=aiTurn(initialState(),1);s.players[1].cards={dice:0,shield:1,build:0};
 assert.equal(act(s,'CARD',{card:'shield'}),s,'human click during an AI turn is ignored');
 const used=act(s,'CARD',{card:'shield',actor:1});assert.equal(used.players[1].shield,true);assert.equal(used.players[1].cards.shield,0);
 assert.equal(act(used,'CARD',{card:'shield',actor:1}),used,'a second shield is rejected');
});

test('dice card steers away from a ruinous rent toward a group-completing city',()=>{
 const s=aiTurn(initialState(),1),tiles=getTiles(s);s.players[1].cards={dice:1,shield:0,build:0};
 // 北京(1) 2 steps ahead is owned by the human at max level; 西安(3) completes 阿橙's group.
 s.players[1].pos=0;s.properties[1]={owner:0,level:3,upgradeSpent:3300};
 const group=tiles.flatMap((t,i)=>t.type==='city'&&t.group===tiles[3].group&&i!==3?[i]:[]);
 for(const i of group)if(i!==1)s.properties[i]={owner:1,level:0};
 const action=aiAction(s,()=>.5);assert.equal(action.type,'CARD');assert.equal(action.card,'dice');assert.notEqual(action.value,1);
 const after=act(s,'CARD',action);assert.ok(after.players[1].controlled);assert.equal(aiAction(after,()=>.5).type,'ROLL');
});

test('shield is raised when an expensive city waits on the next roll; subsidy is activated with an upgradable city',()=>{
 const s=aiTurn(initialState(),2);s.players[2].cards={dice:0,shield:1,build:1};s.players[2].pos=0;
 s.properties[3]={owner:2,level:0};
 assert.deepEqual(aiAction(s,()=>.5),{type:'CARD',card:'build',actor:2});
 const built=act(s,'CARD',{card:'build',actor:2});
 built.properties[4]={owner:0,level:3,upgradeSpent:2700};built.properties[5]={owner:3,level:3,upgradeSpent:2700};
 assert.ok(exposure(built,2).max>=900);assert.deepEqual(aiAction(built,()=>.5),{type:'CARD',card:'shield',actor:2});
});

test('buying keeps a buffer sized to the rents ahead, and strategic cities lower it',()=>{
 const s=act(aiTurn(initialState(),1),'ROLL',{value:1});assert.equal(s.phase,'buy');
 assert.equal(aiAction(s,()=>.5).type,'BUY');
 const poor=structuredClone(s);poor.players[1].cash=getTiles(s)[1].price+100;
 for(const i of [2,3,4,5,6,7])poor.properties[i]={owner:3,level:3,upgradeSpent:3000};
 assert.ok(reserve(poor,1)>100);assert.equal(aiAction(poor,()=>.5).type,'END');
});

test('sellers keep completed groups and sell when short of cash; buyers do not ask pointlessly',()=>{
 const s=initialState(),tiles=getTiles(s),group=tiles.flatMap((t,i)=>t.type==='city'&&t.group===tiles[1].group?[i]:[]);
 for(const i of group)s.properties[i]={owner:1,level:1,upgradeSpent:1100};
 assert.equal(sellerAccepts(s,1,1,2),false);
 const lone=initialState();lone.properties[1]={owner:1,level:0};lone.players[1].cash=200;assert.equal(sellerAccepts(lone,1,1,2),true);
 const visit=initialState();visit.current=2;visit.properties={1:{owner:1,level:0},4:{owner:1,level:0},5:{owner:1,level:0}};const landed=act(visit,'ROLL',{value:1});
 assert.equal(landed.phase,'rent');assert.equal(aiAction(landed,()=>.5).type,'PAY_RENT','a healthy AI seller with a portfolio would refuse, so no offer');
 const small=initialState();small.current=2;small.properties={1:{owner:1,level:1,upgradeSpent:1100}};const asked=act(small,'ROLL',{value:1});
 assert.equal(aiAction(asked,()=>.5).type,'PAY_RENT','a cash-healthy seller should keep a revenue-producing asset at cost price');
 const stressed=structuredClone(small);stressed.players[1].cash=200;const urgent=act(stressed,'ROLL',{value:1});
 assert.equal(aiAction(urgent,()=>.5).type,'OFFER','a cash-stressed seller may still be offered liquidity');
 const reply=aiAction(act(urgent,'OFFER'),()=>.5);assert.deepEqual(reply,{type:'OFFER_REPLY',actor:1,accept:true});
});

test('a healthy AI rejects a cost-price offer for its only city',()=>{
 const s=initialState();s.properties[1]={owner:1,level:0,upgradeSpent:0};
 assert.equal(s.players[1].cash,12000);assert.equal(sellerAccepts(s,1,1,0),false);
 s.players[1].cash=200;assert.equal(sellerAccepts(s,1,1,0),true);
});

test('AI chooses the most valuable event card instead of blindly taking the first offer',()=>{
 const s=initialState();s.current=1;s.phase='draw';s.eventDraw={source:'chance',offerIds:['repair_bill','travel_refund','found_envelope']};
 const action=aiAction(s,()=>0);assert.deepEqual(action,{type:'DRAW_EVENT',index:1});
 assert.equal(act(s,'DRAW_EVENT',action).activeEvent.id,'travel_refund');
});

test('AI discounts duplicate item rewards and takes a better inventory option',()=>{
 const s=initialState();s.current=1;s.phase='event-choice';s.activeEvent={id:'mystery_vending',actor:1,source:'chance'};
 s.players[1].cards={dice:1,shield:1,build:0};
 const action=aiAction(s,()=>0);assert.deepEqual(action,{type:'EVENT_CHOICE',value:'dice'});
 assert.deepEqual(act(s,'EVENT_CHOICE',action).players[1].cards,{dice:2,shield:1,build:0});
});

test('debt is covered by the least productive asset before a completed group',()=>{
 const s=initialState(),tiles=getTiles(s),group=tiles.flatMap((t,i)=>t.type==='city'&&t.group===tiles[1].group?[i]:[]);
 for(const i of group)s.properties[i]={owner:1,level:2,upgradeSpent:2200};
 const lone=tiles.findIndex((t,i)=>t.type==='city'&&!group.includes(i));s.properties[lone]={owner:1,level:0};
 s.current=1;s.phase='debt';s.players[1].cash=0;s.debt={to:0,amount:600,label:'测试'};
 assert.deepEqual(aiAction(s,()=>.5),{type:'MORTGAGE',tile:lone});
});

test('all-AI games on every map kind finish without a stalled action and use items',()=>{
 let cards=0;
 for(const [kind,size] of [['classic',20],['china',20],['world',28],['mixed',36]])for(let seed=1;seed<=4;seed++){
  let s=kind==='classic'?initialState():initialState(undefined,generateMap(kind,size,rng(seed))),random=rng(seed*7),steps=0;
  while(s.phase!=='finished'&&steps++<5000){const action=aiAction(s,random);if(action.type==='CARD')cards++;const next=transition(s,action);assert.notEqual(next,s,`${kind}-${seed} stalled at ${s.phase}: ${JSON.stringify(action)}`);s=next;assert.ok(s.players.every(p=>Number.isFinite(p.cash)&&p.cash>=0));}
  assert.equal(s.phase,'finished');
 }
 assert.ok(cards>0,'items are actually played');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {CARDS,initialState,transition,aiAction,rent,worth} from '../src/game.js';
import {generateMap,getTiles} from '../src/board.js';
import {validRosterSave} from '../src/players.js';
import {EVENT_CARDS,getEventCard,eligibleEventCards} from '../src/eventCards.js';

const act=(state,type,fields={})=>transition(state,{type,...fields});
const rng=seed=>()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
const cash=state=>state.players.map(player=>player.cash);
const totalCash=state=>cash(state).reduce((sum,value)=>sum+value,0);
function arrive(card,{state=initialState(),source='chance'}={}){
 state.eventDeck=[card];
 const index=getTiles(state).findIndex(tile=>tile.type===source);
 assert.ok(index>0);
 state.players[state.current].pos=index-1;
 return act(state,'ROLL',{value:1,eventSeed:.25});
}
function reveal(card,options){return act(arrive(card,options),'DRAW_EVENT',{index:1});}
function resolve(card,options){return act(reveal(card,options),'RESOLVE_EVENT',{seed:.25});}
function assertLedger(before,after){
 for(let id=0;id<before.players.length;id++){
  const delta=after.transactions.reduce((sum,entry)=>sum+(entry.to===id?entry.amount:0)-(entry.from===id?entry.amount:0),0);
  assert.equal(after.players[id].cash,before.players[id].cash+delta,`player ${id} must match the transfer ledger`);
 }
 for(const entry of after.transactions)assert.ok(Number.isInteger(entry.amount)&&entry.amount>0);
}

test('arrival and reveal do not apply an event; the chosen card is announced exactly once',()=>{
 const original=initialState(),before=cash(original),inventory=structuredClone(original.players[0].cards);
 let state=arrive('found_envelope',{state:original});
 assert.equal(state.phase,'draw');assert.deepEqual(state.eventDraw.offerIds,['found_envelope','found_envelope','found_envelope']);
 assert.deepEqual(cash(state),before);assert.deepEqual(state.players[0].cards,inventory);assert.deepEqual(state.transactions,[]);
 for(const action of [{type:'END'},{type:'RESOLVE_EVENT',seed:.25},{type:'DRAW_EVENT',index:-1},{type:'DRAW_EVENT',index:3},{type:'DRAW_EVENT',index:1.5}])assert.equal(transition(state,action),state);
 state=act(state,'DRAW_EVENT',{index:1});assert.equal(state.phase,'event');assert.equal(state.activeEvent.id,'found_envelope');assert.equal(state.activeEvent.actor,0);assert.equal(state.activeEvent.slot,1);
 assert.deepEqual(cash(state),before);assert.deepEqual(state.transactions,[]);
 const announcements=state.journal.filter(entry=>entry.category==='event-card');assert.equal(announcements.length,1);assert.equal(announcements[0].cardId,'found_envelope');
 for(const field of ['title','story','rule'])assert.ok(typeof announcements[0][field]==='string'&&announcements[0][field].length>0);
 assert.equal(act(state,'DRAW_EVENT',{index:0}),state);assert.equal(act(state,'END'),state);
 const beforeResolve=state;state=act(state,'RESOLVE_EVENT',{seed:.25});assert.equal(state.phase,'end');assert.equal(state.players[0].cash,12800);assertLedger(beforeResolve,state);
 assert.equal(state.journal.filter(entry=>entry.category==='event-card').length,1);assert.equal(act(state,'RESOLVE_EVENT',{seed:.25}),state);
});

test('bank income and expenses use the stated amounts and directional transfers',()=>{
 for(const [id,amount] of [['found_envelope',800],['street_performer',600],['travel_refund',1000],['repair_bill',-700],['souvenir_spree',-500]]){
  const before=reveal(id),state=act(before,'RESOLVE_EVENT',{seed:.1});
  assert.equal(state.phase,'end');assert.equal(state.players[0].cash,12000+amount);assert.deepEqual(cash(state).slice(1),[12000,12000,12000]);
  assert.equal(state.transactions.length,1);assert.equal(state.transactions[0].from,amount>0?'bank':0);assert.equal(state.transactions[0].to,amount>0?0:'bank');assert.equal(state.transactions[0].amount,Math.abs(amount));assertLedger(before,state);
 }
});

test('the amount printed on a bank card applies equally to every current player',()=>{
 for(let actor=0;actor<4;actor++){
  const initial=initialState();initial.current=actor;const before=reveal('found_envelope',{state:initial}),state=act(before,'RESOLVE_EVENT',{seed:0});
  assert.equal(state.players[actor].cash,12800);assert.equal(state.transactions[0].amount,800);assertLedger(before,state);
 }
});

test('proposal gifts pay every other solvent player and conserve money between players',()=>{
 const initial=initialState();initial.current=2;initial.players[1].bankrupt=true;initial.players[1].cash=0;
 const before=reveal('park_proposal',{state:initial}),state=act(before,'RESOLVE_EVENT',{seed:.3});
 assert.equal(state.phase,'end');assert.deepEqual(cash(state),[13000,0,10000,13000]);assert.equal(totalCash(state),totalCash(before));
 assert.deepEqual(state.transactions.map(({from,to,amount})=>({from,to,amount})),[{from:2,to:0,amount:1000},{from:2,to:3,amount:1000}]);assertLedger(before,state);
});

test('multi-player gifts wait for sufficient mortgage funds before paying any recipient',()=>{
 const initial=initialState();initial.players[0].cash=100;initial.properties[1]={owner:0,level:2,upgradeSpent:2200};
 let state=resolve('park_proposal',{state:initial});
 assert.equal(state.phase,'debt');assert.equal(state.debt.amount,3000);assert.deepEqual(state.debt.payments,[{to:1,amount:1000},{to:2,amount:1000},{to:3,amount:1000}]);
 assert.deepEqual(cash(state),[100,12000,12000,12000]);assert.deepEqual(state.transactions,[]);assert.equal(act(state,'SETTLE_DEBT'),state);assert.equal(act(state,'BANKRUPT'),state);assert.equal(act(state,'END'),state);
 const net=worth(state,0);state=act(state,'MORTGAGE',{tile:1});assert.equal(state.properties[1].owner,'bank');assert.equal(state.players[0].cash,3400);assert.deepEqual(cash(state).slice(1),[12000,12000,12000]);assert.equal(worth(state,0),net);
 const before=state;state=act(state,'SETTLE_DEBT');assert.equal(state.phase,'end');assert.deepEqual(cash(state),[400,13000,13000,13000]);assert.equal(totalCash(state),totalCash(before));assert.equal(worth(state,0),net);assertLedger(before,state);
 assert.equal(state.debt,undefined);assert.equal(act(state,'SETTLE_DEBT'),state);assert.equal(act(state,'RESOLVE_EVENT',{seed:.2}),state);
});

test('bankruptcy distributes only remaining cash with deterministic integer remainders',()=>{
 const initial=initialState();initial.players[0].cash=1000;initial.properties[3]={owner:'bank',mortgagor:0,mortgageAmount:800,level:0};
 const before=resolve('park_proposal',{state:initial}),state=act(before,'BANKRUPT');
 assert.equal(state.players[0].bankrupt,true);assert.deepEqual(cash(state),[0,12334,12333,12333]);assert.equal(totalCash(state),totalCash(before));assert.equal(state.properties[3],undefined);assert.equal(state.debt,undefined);
 assert.deepEqual(state.transactions.map(entry=>entry.amount),[334,333,333]);assertLedger(before,state);assert.equal(state.journal[0].category,'bankruptcy');assert.equal(act(state,'BANKRUPT'),state);
});

test('a zero-cash gift bankruptcy never invents a bank payment',()=>{
 const initial=initialState();initial.players[0].cash=0;initial.players[2].bankrupt=true;initial.players[2].cash=0;
 const before=resolve('park_proposal',{state:initial}),state=act(before,'BANKRUPT');
 assert.deepEqual(cash(state),cash(before));assert.deepEqual(state.transactions,[]);assert.equal(state.players[0].bankrupt,true);
});

test('twenty-player gift bankruptcy pays all nineteen recipients without creating money',()=>{
 const initial=initialState(Array.from({length:20},(_,id)=>({name:`玩家${id+1}`})));
 const before=resolve('park_proposal',{state:initial});assert.equal(before.phase,'debt');assert.equal(before.debt.amount,19000);assert.equal(before.debt.payments.length,19);
 const state=act(before,'BANKRUPT');assert.equal(state.players[0].cash,0);assert.equal(state.players[0].bankrupt,true);assert.equal(state.transactions.length,19);assert.equal(totalCash(state),totalCash(before));
 assert.equal(state.transactions.reduce((sum,entry)=>sum+entry.amount,0),12000);assert.deepEqual(state.transactions.map(entry=>entry.amount),[...Array(11).fill(632),...Array(8).fill(631)]);assertLedger(before,state);
});

test('the richest active opponent contributes at most their cash and never goes negative',()=>{
 for(const richest of [400,16000]){
  const initial=initialState();initial.players[0].cash=20000;initial.players[1].cash=richest;initial.players[2].cash=100;initial.players[3].cash=99999;initial.players[3].bankrupt=true;
  const before=reveal('lucky_patron',{state:initial}),state=act(before,'RESOLVE_EVENT',{seed:.4}),amount=Math.min(richest,600);
  assert.equal(state.players[0].cash,20000+amount);assert.equal(state.players[1].cash,richest-amount);assert.equal(state.players[3].cash,99999);assert.equal(totalCash(state),totalCash(before));
  assert.deepEqual(state.transactions.map(({from,to,amount})=>({from,to,amount})),[{from:1,to:0,amount}]);assertLedger(before,state);
 }
 const initial=initialState();initial.players.slice(1).forEach(player=>{player.cash=0;});const state=resolve('lucky_patron',{state:initial});assert.equal(state.players[0].cash,12000);assert.deepEqual(state.transactions,[]);
});

test('bank expense events retain the pending debt across a JSON reload',()=>{
 const initial=initialState();initial.players[0].cash=100;initial.properties[3]={owner:0,level:0};
 let state=resolve('repair_bill',{state:initial});assert.equal(state.phase,'debt');assert.equal(state.debt.amount,700);assert.equal(state.debt.to,'bank');assert.deepEqual(state.transactions,[]);
 state=JSON.parse(JSON.stringify(state));assert.ok(validRosterSave(state));assert.equal(act(state,'RESOLVE_EVENT',{seed:.5}),state);
 state=act(state,'MORTGAGE',{tile:3});const before=state;state=act(state,'SETTLE_DEBT');assert.equal(state.players[0].cash,200);assert.equal(state.transactions[0].to,'bank');assert.equal(state.transactions[0].amount,700);assertLedger(before,state);
});

test('item events give inventory without activating it and each item retains its actual game effect',()=>{
 for(const [id,item] of [['pocket_compass','dice'],['lucky_umbrella','shield'],['toolbox_drop','build']]){
  const initial=initialState();initial.players[0].cards[item]=0;
  let state=resolve(id,{state:initial,source:'chance'});assert.equal(state.phase,'end');assert.equal(state.players[0].cards[item],1);assert.deepEqual(state.transactions,[]);assert.deepEqual(cash(state),[12000,12000,12000,12000]);
  assert.ok(!state.players[0].controlled&&!state.players[0].shield&&!state.players[0].subsidy);
  state.phase='roll';state.players[0].pos=0;state=act(state,'CARD',{card:item,value:1});assert.equal(state.players[0].cards[item],0);
  if(item==='dice'){state=act(state,'ROLL',{value:6});assert.equal(state.players[0].pos,1);assert.equal(state.lastDice,1);}
  if(item==='shield'){state.properties[1]={owner:1,level:0};state=act(state,'ROLL',{value:1});assert.equal(state.phase,'end');assert.equal(state.players[0].cash,12000);assert.equal(state.players[0].shield,false);}
  if(item==='build'){state.properties[1]={owner:0,level:0};state=act(state,'ROLL',{value:1});state=act(state,'UPGRADE');assert.equal(state.properties[1].level,1);assert.equal(state.properties[1].upgradeSpent,500);assert.equal(state.players[0].cash,11500);assert.equal(state.players[0].subsidy,false);}
 }
});

test('travel only accepts cities present on the current map and does not grant a start allowance',()=>{
 for(const kind of ['china','world','mixed'])for(const size of [20,28,36]){
  const initial=initialState(undefined,generateMap(kind,size,rng(14)));
  let state=resolve('night_flight',{state:initial});assert.equal(state.phase,'event-destination');const tiles=getTiles(state),destination=tiles.findIndex(tile=>tile.type==='city');
  for(const tile of [-1,0,tiles.length,1.5])assert.equal(act(state,'EVENT_DESTINATION',{tile}),state);
  const before=state;state=act(state,'EVENT_DESTINATION',{tile:destination});assert.equal(state.players[0].pos,destination);assert.equal(state.phase,'buy');assert.deepEqual(cash(state),cash(before));assert.deepEqual(state.transactions,[]);
  assert.equal(act(state,'EVENT_DESTINATION',{tile:destination}),state);state=act(state,'BUY');assert.equal(state.properties[destination].owner,0);assert.equal(state.players[0].cash,12000-tiles[destination].price);
 }
});

test('travel arrival uses ordinary owned, rented, shielded and bank-held property rules',()=>{
 for(const scenario of ['owned','rented','shielded','bank']){
  const initial=initialState();initial.properties[1]=scenario==='bank'?{owner:'bank',mortgagor:2,mortgageAmount:1100,level:2}:{owner:scenario==='owned'?0:1,level:1};initial.players[0].shield=scenario==='shielded';
  let state=resolve('open_ticket',{state:initial});state=act(state,'EVENT_DESTINATION',{tile:1});assert.equal(state.players[0].pos,1);assert.deepEqual(cash(state),[12000,12000,12000,12000]);
  if(scenario==='owned')assert.equal(state.phase,'upgrade');
  if(scenario==='rented'){assert.equal(state.phase,'rent');assert.equal(state.pendingRent.amount,rent(state,1));state=act(state,'PAY_RENT');assert.equal(state.players[1].cash,12704);}
  if(scenario==='shielded'){assert.equal(state.phase,'end');assert.equal(state.players[0].shield,false);}
  if(scenario==='bank'){assert.equal(state.phase,'end');assert.equal(rent(state,1),0);assert.equal(act(state,'BUY'),state);assert.equal(act(state,'OFFER'),state);}
 }
});

test('map event is explicitly resolved once and never transfers cash',()=>{
 const before=reveal('city_remix'),oldTiles=getTiles(before).map(tile=>tile.cityId||tile.type);
 assert.deepEqual(getTiles(before).map(tile=>tile.cityId||tile.type),oldTiles);
 for(const seed of [undefined,NaN,Infinity,-1,1.01])assert.equal(act(before,'RESOLVE_EVENT',{seed}),before);
 const state=act(before,'RESOLVE_EVENT',{seed:.73});assert.equal(state.phase,'end');assert.notDeepEqual(getTiles(state).map(tile=>tile.cityId||tile.type),oldTiles);assert.deepEqual(cash(state),cash(before));assert.deepEqual(state.transactions,[]);assert.equal(act(state,'RESOLVE_EVENT',{seed:.99}),state);
});

test('draw, reveal and destination selections survive saving without redrawing or repeating announcements',()=>{
 const draw=arrive('night_flight'),event=act(draw,'DRAW_EVENT',{index:2}),destination=act(event,'RESOLVE_EVENT',{seed:.25});
 for(const [state,action] of [[draw,{type:'DRAW_EVENT',index:2}],[event,{type:'RESOLVE_EVENT',seed:.25}],[destination,{type:'EVENT_DESTINATION',tile:1}]]){
  const saved=JSON.parse(JSON.stringify(state));assert.ok(validRosterSave(saved));assert.deepEqual(saved,state);assert.deepEqual(transition(saved,action),transition(state,action));
  assert.equal(saved.journal.filter(entry=>entry.category==='event-card').length,state===draw?0:1);
 }
});

test('AI progresses through drawing, reveal and destination phases and resolves resulting debt',()=>{
 for(const id of ['found_envelope','repair_bill','park_proposal','night_flight','pocket_compass','city_remix']){
  const initial=initialState();initial.current=1;if(id==='park_proposal'){initial.players[1].cash=0;initial.properties[1]={owner:1,level:3,upgradeSpent:3300};}
  let state=arrive(id,{state:initial}),steps=0;
  while(!['end','buy','upgrade','rent'].includes(state.phase)&&steps++<12){const next=transition(state,aiAction(state,()=>.35));assert.notEqual(next,state,`${id} is stuck at ${state.phase}`);state=next;}
  assert.ok(steps<12,`${id} completes all mandatory decisions`);assert.ok(state.players.every(player=>Number.isFinite(player.cash)&&player.cash>=0));assert.equal(state.journal.filter(entry=>entry.category==='event-card').length,1);
 }
});

test('custom decks are map-independent and invalid or empty decks safely fall back',()=>{
 for(const deck of [[],['unknown-event'],['found_envelope','unknown-event'],null])for(const source of ['chance']){
  const initial=initialState(undefined,generateMap('world',36,rng(5)));initial.eventDeck=deck;const tile=getTiles(initial).findIndex(tile=>tile.type===source);initial.players[0].pos=tile-1;
  let state=act(initial,'ROLL',{value:1,eventSeed:.4});assert.equal(state.phase,'draw');assert.equal(state.eventDraw.offerIds.length,3);assert.ok(state.eventDraw.offerIds.every(id=>typeof id==='string'&&id!=='unknown-event'));
  state=act(state,'DRAW_EVENT',{index:0});assert.equal(state.phase,'event');assert.ok(state.activeEvent.id);state=act(state,'RESOLVE_EVENT',{seed:.4});assert.notEqual(state.phase,'event');
 }
});

test('the event catalog covers all effect families and item descriptions match their usable effects',()=>{
 assert.equal(EVENT_CARDS.length,30);assert.equal(new Set(EVENT_CARDS.map(card=>card.id)).size,EVENT_CARDS.length);
 assert.deepEqual(new Set(EVENT_CARDS.map(card=>card.effect.type)),new Set(['bank','gift_all','richest_gift','shuffle','travel','item','collect_all','redistribution','interest','property_fee','property_dividend','relief','item_choice','reward_choice','renovate','redeem_grant','shield_all']));
 for(const card of EVENT_CARDS){
  assert.equal(getEventCard(card.id),card);for(const field of ['title','story','rule','icon','category'])assert.ok(typeof card[field]==='string'&&card[field].length>0);
  if(card.effect.type==='item'){assert.ok(CARDS[card.effect.card]);assert.match(card.rule,new RegExp(CARDS[card.effect.card].name));assert.equal(card.effect.count,1);}
 }
 assert.match(getEventCard('toolbox_drop').rule,/600/);assert.doesNotMatch(getEventCard('toolbox_drop').rule,/减半/);
 assert.equal(getEventCard('unknown'),undefined);
});

test('the same independently configured deck works on every map and survives a reset',()=>{
 const deck=['night_flight','found_envelope','night_flight','unknown'];
 for(const kind of ['classic','china','world','mixed']){
  const initial=initialState(undefined,generateMap(kind,20,rng(5)),deck);
  assert.notEqual(initial.eventDeck,deck);assert.deepEqual(eligibleEventCards(initial).map(card=>card.id),['night_flight','found_envelope']);
  const reset=initialState(initial.players,initial.map,initial.eventDeck);assert.deepEqual(reset.eventDeck,deck);assert.notEqual(reset.eventDeck,initial.eventDeck);
  initial.players[0].pos=getTiles(initial).findIndex(tile=>tile.type==='chance')-1;
  const draw=act(initial,'ROLL',{value:1,eventSeed:.67});assert.ok(draw.eventDraw.offerIds.every(id=>['night_flight','found_envelope'].includes(id)));
 }
 for(const eventDeck of [undefined,[],['unknown'],null])assert.deepEqual(eligibleEventCards({eventDeck}),EVENT_CARDS);
});

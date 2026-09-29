import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/game.js';
import {eventChoices,eventDestinations} from '../src/eventOptions.js';
import {getTiles,generateMap} from '../src/board.js';
import {EVENT_CARDS} from '../src/eventCards.js';
import {validRosterSave} from '../src/players.js';
import {loadGame,saveGame} from '../src/gameStorage.js';
const act=(s,type,fields={})=>game.transition(s,{type,...fields});
const citySlots=s=>getTiles(s).flatMap((t,i)=>t.type==='city'?[i]:[]);
const cash=s=>s.players.map(p=>p.cash);
const sum=s=>cash(s).reduce((a,b)=>a+b,0);
function reveal(id,s=game.initialState()){
 s.eventDeck=[id];s.players[s.current].pos=getTiles(s).findIndex(t=>t.type==='chance')-1;
 return act(act(s,'ROLL',{value:1,eventSeed:.2}),'DRAW_EVENT',{index:0});
}
const resolve=(id,s)=>act(reveal(id,s),'RESOLVE_EVENT',{seed:.6});
function ledger(before,after){for(let i=0;i<before.players.length;i++)assert.equal(after.players[i].cash,before.players[i].cash+after.transactions.reduce((n,e)=>n+(e.to===i?e.amount:0)-(e.from===i?e.amount:0),0));assert.ok(after.transactions.every(t=>Number.isInteger(t.amount)&&t.amount>0));}
const expansion=['birthday_collect','robin_hood','sleepy_interest','property_inspection','rooftop_dividend','fresh_start','mirror_map','city_carousel','vacant_express','homecoming','runaway_bus','mystery_vending','bonus_choice','overnight_renovation','bank_amnesty','city_siesta'];
test('expanded catalog retains the original fourteen cards plus sixteen distinct additions',()=>{
 assert.equal(EVENT_CARDS.length,30);assert.equal(new Set(EVENT_CARDS.map(c=>c.id)).size,30);
 for(const id of expansion)assert.ok(EVENT_CARDS.some(c=>c.id===id));
});
test('birthday collection caps each active opponent independently and conserves cash without debt',()=>{
 const s=game.initialState(Array.from({length:20},(_,i)=>({name:`玩家${i}`})));s.current=4;
 s.players.forEach((p,i)=>{p.cash=i===4?700:i%3===0?0:i%3===1?125:900;});s.players[7].bankrupt=true;s.players[7].cash=888;
 const before=reveal('birthday_collect',s),after=act(before,'RESOLVE_EVENT',{seed:.2});
 const expected=before.players.map((p,i)=>i===4||p.bankrupt?0:Math.min(300,p.cash));
 assert.equal(after.players[4].cash,700+expected.reduce((a,b)=>a+b,0));
 for(let i=0;i<20;i++)if(i!==4)assert.equal(after.players[i].cash,before.players[i].cash-expected[i]);
 assert.equal(after.phase,'end');assert.equal(after.debt,undefined);assert.equal(sum(after),sum(before));ledger(before,after);
 assert.equal(act(after,'RESOLVE_EVENT',{seed:.3}),after);
});
test('redistribution includes the actor, resolves ties by player order and skips equal wealth',()=>{
 for(const [balances,expected] of [[[1000,1000,0,0],[200,1000,800,0]],[[0,600,10,20],[600,0,10,20]],[[50,50,50,50],[50,50,50,50]]]){
  const s=game.initialState();s.players.forEach((p,i)=>p.cash=balances[i]);
  const before=reveal('robin_hood',s),after=act(before,'RESOLVE_EVENT',{seed:.3});
  assert.deepEqual(cash(after),expected);assert.equal(sum(after),sum(before));assert.equal(after.debt,undefined);ledger(before,after);
 }
 const s=game.initialState();s.players[0].cash=0;s.players[1].cash=400;s.players[2].cash=900;s.players[3].cash=99999;s.players[3].bankrupt=true;
 assert.deepEqual(cash(resolve('robin_hood',s)),[800,400,100,99999]);
});
test('interest floors its cash percentage and caps income, including zero',()=>{
 for(const [amount,expected] of [[0,0],[9,0],[999,99],[15000,1500],[99999,1500]]){
  const s=game.initialState();s.players[0].cash=amount;const before=reveal('sleepy_interest',s),after=act(before,'RESOLVE_EVENT',{seed:.1});
  assert.equal(after.players[0].cash,amount+expected);assert.equal(after.phase,'end');ledger(before,after);
 }
});
test('property fees count unpledged property once and retain the original debt amount after mortgage',()=>{
 const s=game.initialState(),[a,b,c,d]=citySlots(s);s.players[0].cash=100;
 s.properties[a]={owner:0,level:0,upgradeSpent:0};s.properties[b]={owner:0,level:1,upgradeSpent:700};s.properties[c]={owner:'bank',mortgagor:0,mortgageAmount:1000,level:1};s.properties[d]={owner:1,level:2};
 let after=resolve('property_inspection',s);assert.equal(after.phase,'debt');assert.equal(after.debt.amount,400);assert.equal(after.debt.to,'bank');assert.deepEqual(after.transactions,[]);
 assert.equal(act(after,'RESOLVE_EVENT',{seed:.3}),after);assert.equal(act(after,'END'),after);
 after=act(after,'MORTGAGE',{tile:a});assert.equal(after.debt.amount,400);
 const before=after;after=act(after,'SETTLE_DEBT');assert.equal(after.phase,'end');assert.equal(after.players[0].cash,before.players[0].cash-400);ledger(before,after);
 assert.equal(act(after,'SETTLE_DEBT'),after);
 const zero=resolve('property_inspection');assert.equal(zero.players[0].cash,12000);assert.equal(zero.phase,'end');assert.deepEqual(zero.transactions,[]);
});
test('property dividends exclude mortgages and other players while relief includes mortgaged holdings',()=>{
 const s=game.initialState(),[a,b,c]=citySlots(s);s.properties[a]={owner:0,level:3};s.properties[b]={owner:'bank',mortgagor:0,mortgageAmount:1500,level:1};s.properties[c]={owner:1,level:2};
 assert.equal(resolve('rooftop_dividend',structuredClone(s)).players[0].cash,12300);
 assert.equal(resolve('fresh_start',structuredClone(s)).players[0].cash,12400);
 delete s.properties[a];assert.equal(resolve('fresh_start',structuredClone(s)).players[0].cash,12400);
 delete s.properties[b];assert.equal(resolve('fresh_start',s).players[0].cash,13500);
 assert.equal(resolve('rooftop_dividend').players[0].cash,12000);
});
test('reverse and rotate maps preserve property, mortgage, occupant identity and fixed stations',()=>{
 for(const id of ['mirror_map','city_carousel'])for(const kind of ['classic','world']){
  const s=game.initialState(undefined,generateMap(kind,kind==='classic'?20:36,()=>.35));const [a,b]=citySlots(s);
  s.properties[a]={owner:1,level:2,upgradeSpent:321};s.properties[b]={owner:'bank',mortgagor:0,mortgageAmount:1234,level:1,upgradeSpent:456};s.players[1].pos=a;s.players[2].pos=b;
  const before=reveal(id,s),tiles=getTiles(before),order=tiles.filter(t=>t.type==='city').map(t=>t.cityId);const after=act(before,'RESOLVE_EVENT',{seed:.2}),out=getTiles(after);
  assert.deepEqual(out.filter(t=>t.type==='city').map(t=>t.cityId),id==='mirror_map'?[...order].reverse():[order.at(-1),...order.slice(0,-1)]);
  for(let i=0;i<tiles.length;i++)if(tiles[i].type!=='city')assert.deepEqual(out[i],tiles[i]);
  const newA=out.findIndex(t=>t.cityId===tiles[a].cityId),newB=out.findIndex(t=>t.cityId===tiles[b].cityId);
  assert.deepEqual(after.properties[newA],before.properties[a]);assert.deepEqual(after.properties[newB],before.properties[b]);assert.equal(after.players[1].pos,newA);assert.equal(after.players[2].pos,newB);assert.equal(after.players[0].pos,before.players[0].pos);assert.deepEqual(cash(after),cash(before));assert.deepEqual(after.transactions,[]);
 }
});
test('vacant and homeward travel restrict destinations and reject forged target choices',()=>{
 for(const id of ['vacant_express','homecoming']){
  const s=game.initialState(),[a,b,c,d]=citySlots(s);s.properties[a]={owner:0,level:0};s.properties[b]={owner:'bank',mortgagor:0,mortgageAmount:500,level:0};s.properties[c]={owner:1,level:0};
  let after=resolve(id,s);assert.equal(after.phase,'event-destination');
  const choices=eventDestinations(after);assert.deepEqual(choices,id==='homecoming'?[a]:citySlots(s).filter(i=>![a,b,c].includes(i)));
  for(const tile of [b,c,0,-1,NaN,1.5,999,...(id==='homecoming'?[d]:[a])])assert.equal(act(after,'EVENT_DESTINATION',{tile}),after);
  const target=id==='homecoming'?a:d,before=after;after=act(after,'EVENT_DESTINATION',{tile:target});assert.equal(after.players[0].pos,target);assert.equal(after.phase,id==='homecoming'?'upgrade':'buy');assert.deepEqual(cash(after),cash(before));
 }
});
test('unavailable targeted travel pays its fallback once, without fabricating a destination',()=>{
 for(const id of ['vacant_express','homecoming']){
  const s=game.initialState();for(const tile of citySlots(s))s.properties[tile]={owner:'bank',mortgagor:0,mortgageAmount:500,level:0};
  const after=resolve(id,s);assert.equal(after.phase,'end');assert.equal(after.players[0].cash,12500);assert.equal(after.transactions.length,1);assert.equal(after.transactions[0].from,'bank');assert.equal(act(after,'RESOLVE_EVENT',{seed:.1}),after);
 }
});
test('forward bus selects exactly the third city clockwise across start without a start allowance',()=>{
 let before=reveal('runaway_bus');const slots=citySlots(before),tiles=getTiles(before);before.players[0].pos=slots.at(-2);
 let cursor=before.players[0].pos,count=0;while(count<3){cursor=(cursor+1)%tiles.length;if(tiles[cursor].type==='city')count++;}
 before.properties[cursor]={owner:1,level:0};const stage=act(before,'RESOLVE_EVENT',{seed:.4});assert.equal(stage.phase,'event-destination');assert.deepEqual(eventDestinations(stage),[cursor]);
 assert.equal(act(stage,'EVENT_DESTINATION',{tile:slots[0]}),stage);
 const after=act(stage,'EVENT_DESTINATION',{tile:cursor});assert.equal(after.phase,'rent');assert.equal(after.players[0].cash,before.players[0].cash);assert.equal(after.players[0].pos,cursor);assert.equal(after.transactions.length,0);
});
test('item and reward choices reject invalid input and grant exactly the selected benefit once',()=>{
 for(const [id,values] of [['mystery_vending',['dice','shield','build']],['bonus_choice',['cash','dice']]])for(const value of values){
  let s=resolve(id);assert.equal(s.phase,'event-choice');assert.deepEqual(eventChoices(s).map(c=>c.value),values);
  for(const invalid of ['unknown','',0,null])assert.equal(act(s,'EVENT_CHOICE',{value:invalid}),s);
  assert.equal(act(s,'END'),s);assert.equal(act(s,'RESOLVE_EVENT',{seed:.1}),s);
  const before=s;s=act(s,'EVENT_CHOICE',{value});assert.equal(s.phase,'end');
  assert.equal(s.players[0].cash,before.players[0].cash+(value==='cash'?800:0));
  for(const item of ['dice','shield','build'])assert.equal(s.players[0].cards[item],before.players[0].cards[item]+(item===value?(id==='bonus_choice'?2:1):0));
  assert.equal(act(s,'EVENT_CHOICE',{value}),s);ledger(before,s);
 }
});
test('free renovation changes only the selected eligible level and preserves paid cost and subsidy',()=>{
 for(const legacy of [false,true]){
  const s=game.initialState(),[a,b,c,d]=citySlots(s);s.properties[a]={owner:0,level:1,...(legacy?{}:{upgradeSpent:123})};s.properties[b]={owner:0,level:3,upgradeSpent:200};s.properties[c]={owner:'bank',mortgagor:0,level:1,mortgageAmount:500};s.properties[d]={owner:1,level:1};s.players[0].subsidy=true;
  const before=resolve('overnight_renovation',s),spent=game.upgradeSpent(before,a);assert.equal(before.phase,'event-choice');assert.deepEqual(eventChoices(before).map(c=>c.value),[String(a)]);
  for(const value of [String(b),String(c),String(d),'bogus'])assert.equal(act(before,'EVENT_CHOICE',{value}),before);
  const after=act(before,'EVENT_CHOICE',{value:String(a)});assert.equal(after.properties[a].level,2);assert.equal(game.upgradeSpent(after,a),spent);assert.equal(after.players[0].subsidy,true);assert.deepEqual(cash(after),cash(before));assert.equal(after.transactions.length,0);assert.deepEqual(after.properties[b],before.properties[b]);assert.equal(act(after,'EVENT_CHOICE',{value:String(a)}),after);
 }
 assert.equal(resolve('overnight_renovation').players[0].cash,12500);
});
test('bank amnesty restores only the chosen mortgage with its level and cash intact',()=>{
 const s=game.initialState(),[a,b,c]=citySlots(s);s.properties[a]={owner:'bank',mortgagor:0,mortgageAmount:1500,level:2,upgradeSpent:789};s.properties[b]={owner:'bank',mortgagor:1,mortgageAmount:400,level:1};s.properties[c]={owner:0,level:0};
 const before=resolve('bank_amnesty',s);assert.equal(before.phase,'event-choice');assert.deepEqual(eventChoices(before).map(c=>c.value),[String(a)]);assert.equal(act(before,'EVENT_CHOICE',{value:String(b)}),before);
 const after=act(before,'EVENT_CHOICE',{value:String(a)});assert.equal(after.properties[a].owner,0);assert.equal(after.properties[a].level,2);assert.equal(after.properties[a].upgradeSpent,789);assert.equal(after.properties[a].mortgagor,undefined);assert.equal(after.properties[a].mortgageAmount,undefined);assert.deepEqual(after.properties[b],before.properties[b]);assert.deepEqual(cash(after),cash(before));assert.equal(after.transactions.length,0);
 assert.equal(resolve('bank_amnesty').players[0].cash,12500);
});
test('collective shield applies once to active players without adding inventory, then blocks one rent',()=>{
 const s=game.initialState();s.players[1].shield=true;s.players[3].bankrupt=true;const inventory=s.players.map(p=>({...p.cards}));
 let after=resolve('city_siesta',s);assert.deepEqual(after.players.map(p=>!!p.shield),[true,true,true,false]);assert.deepEqual(after.players.map(p=>p.cards),inventory);assert.deepEqual(cash(after),[12000,12000,12000,12000]);assert.equal(act(after,'RESOLVE_EVENT',{seed:.1}),after);
 after.phase='roll';after.players[0].pos=0;after.properties[1]={owner:1,level:0};after=act(after,'ROLL',{value:1});assert.equal(after.phase,'end');assert.equal(after.players[0].shield,false);assert.equal(after.players[0].cash,12000);
 after.phase='roll';after.players[0].pos=0;after=act(after,'ROLL',{value:1});assert.equal(after.phase,'rent');
});
test('event-choice and constrained destinations survive a real save/load and cannot execute twice',()=>{
 const db={data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);},removeItem(k){this.data.delete(k);}};
 for(const id of ['mystery_vending','bonus_choice','overnight_renovation','bank_amnesty','homecoming','vacant_express']){
  const source=game.initialState(),[a,b]=citySlots(source);source.properties[a]={owner:0,level:0};source.properties[b]={owner:'bank',mortgagor:0,mortgageAmount:500,level:1};
  const before=resolve(id,source);assert.ok(validRosterSave(before));saveGame(db,before);const restored=loadGame(db);assert.deepEqual(restored,before);
  const action=before.phase==='event-choice'?{type:'EVENT_CHOICE',value:eventChoices(before)[0].value}:{type:'EVENT_DESTINATION',tile:eventDestinations(before)[0]};
  const after=game.transition(restored,action);assert.deepEqual(after,game.transition(before,action));assert.equal(game.transition(after,action),after);
 }
});
test('AI completes every new mandatory event decision without invalid targets or negative balances',()=>{
 for(const id of expansion){
  const source=game.initialState();source.current=1;const [a,b]=citySlots(source);source.properties[a]={owner:1,level:0};source.properties[b]={owner:'bank',mortgagor:1,mortgageAmount:500,level:1};
  let s=reveal(id,source),steps=0;
  while(['event','event-choice','event-destination','debt'].includes(s.phase)&&steps++<12){const action=game.aiAction(s,()=>.35),next=game.transition(s,action);assert.notEqual(next,s,`${id}: AI stuck at ${s.phase}, ${JSON.stringify(action)}`);s=next;}
  assert.ok(steps<12,id);assert.ok(s.players.every(p=>Number.isFinite(p.cash)&&p.cash>=0));assert.ok(!['event','event-choice','event-destination','debt'].includes(s.phase),id);
 }
});
test('deterministic map cards permit omitted seeds and reject supplied invalid seeds without mutation',()=>{
 for(const id of ['mirror_map','city_carousel']){
  const s=reveal(id),before=structuredClone(s);
  for(const seed of [NaN,Infinity,-1,2,null,'0.5'])assert.equal(act(s,'RESOLVE_EVENT',{seed}),s);
  assert.deepEqual(s,before);const after=act(s,'RESOLVE_EVENT');assert.equal(after.phase,'end');assert.notDeepEqual(getTiles(after).map(t=>t.cityId),getTiles(s).map(t=>t.cityId));
 }
});

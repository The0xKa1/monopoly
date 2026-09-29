import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_CATALOG} from '../src/cityCatalog.js';
import {CITY_EVENT_CARDS} from '../src/cityEventCards.js';
import {EVENT_CARDS,getEventCard,eligibleEventCards,eligibleCityEventCards} from '../src/eventCards.js';
import {initialState,transition,aiAction,upgradeSpent} from '../src/game.js';
import {getTiles,generateMap,shuffleCityMap} from '../src/board.js';
import {eventChoices,eventDestinations} from '../src/eventOptions.js';
import {createEventTestState} from '../src/eventLab.js';
import {saveGame,loadGame,SAVE,LAB_SAVE} from '../src/gameStorage.js';
const act=(s,type,fields={})=>transition(s,{type,...fields});
const mapFor=id=>({kind:'mixed',size:20,cityIds:[id,...CITY_CATALOG.filter(c=>c.id!==id).slice(0,11).map(c=>c.id)]});
const cities=s=>getTiles(s).filter(t=>t.type==='city');
const cardOf=type=>{const c=CITY_EVENT_CARDS.find(c=>c.effect.type===type);assert.ok(c,`city catalog includes ${type}`);return c;};
const cash=s=>s.players.map(p=>p.cash);
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
function arrive(source='city-event',s=initialState(),seed=.3){const index=getTiles(s).findIndex(t=>t.type===source);assert.ok(index>=0);s.players[s.current].pos=index-1;return act(s,'ROLL',{value:1,eventSeed:seed});}
function reveal(card,s=initialState(undefined,mapFor(card.cityId))){s=arrive('city-event',s);s.eventDraw.offerIds=[card.id,card.id,card.id];return act(s,'DRAW_EVENT',{index:1});}
const resolve=(card,s)=>act(reveal(card,s),'RESOLVE_EVENT',{seed:.4});
function ledger(before,after){for(let i=0;i<before.players.length;i++)assert.equal(after.players[i].cash,before.players[i].cash+after.transactions.reduce((n,t)=>n+(t.to===i?t.amount:0)-(t.from===i?t.amount:0),0));assert.ok(after.transactions.every(t=>t.amount>0&&Number.isInteger(t.amount)));}
const storage=()=>({data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);},removeItem(k){this.data.delete(k);}});
test('city events cover all 88 cities once and stay separate from the 30 general cards',()=>{
 assert.equal(CITY_EVENT_CARDS.length,88);assert.equal(EVENT_CARDS.length,30);
 assert.deepEqual(new Set(CITY_EVENT_CARDS.map(c=>c.cityId)),new Set(CITY_CATALOG.map(c=>c.id)));
 assert.equal(new Set([...EVENT_CARDS,...CITY_EVENT_CARDS].map(c=>c.id)).size,118);
 for(const card of CITY_EVENT_CARDS){assert.equal(card.id,`city_${card.cityId}`);assert.equal(getEventCard(card.id),card);for(const key of ['title','story','rule','icon','category'])assert.ok(typeof card[key]==='string'&&card[key].length>0,`${card.id}.${key}`);if(['travel','renovate','redeem_grant','city_host'].includes(card.effect.type))assert.equal(card.effect.cityId,card.cityId);}
});
test('each board keeps city indices and has a single scaled city-event station plus one chance station',()=>{
 assert.equal(getTiles(initialState())[8].type,'city-event');assert.equal(getTiles(initialState())[2].type,'chance');assert.equal(getTiles(initialState())[18].type,'industry');
 assert.deepEqual(cities(initialState()).map(t=>t.cityId),['beijing','xian','chengdu','chongqing','wuhan','nanjing','hangzhou','shanghai','guangzhou','shenzhen','xiamen','qingdao']);
 for(const size of [20,28,36]){const s=initialState(undefined,generateMap('mixed',size,rng(22))),tiles=getTiles(s);assert.equal(tiles.length,size);assert.equal(cities(s).length,size-8);assert.equal(tiles.filter(t=>t.type==='city-event').length,1);assert.equal(tiles.filter(t=>t.type==='chance').length,1);assert.equal(tiles[Math.floor(8*size/20)].type,'city-event');}
});
test('city pool equals this map regardless of custom general deck or shuffle order',()=>{
 for(const kind of ['classic','china','world','mixed'])for(const size of kind==='classic'?[20]:[20,28,36]){
  const s=initialState(undefined,generateMap(kind,size,rng(28)),['city_paris','found_envelope']);const expected=new Set(cities(s).map(t=>`city_${t.cityId}`));
  assert.deepEqual(new Set(eligibleCityEventCards(s).map(c=>c.id)),expected);
  assert.deepEqual(eligibleEventCards(s).map(c=>c.id),['found_envelope']);
  for(const mode of ['shuffle','reverse','rotate']){const moved={...s,...shuffleCityMap(s,.37,mode)};assert.deepEqual(new Set(eligibleCityEventCards(moved).map(c=>c.id)),expected);}
 }
 const s=initialState();const world=initialState(undefined,generateMap('world',36,rng(10)));assert.ok(eligibleCityEventCards(s).every(c=>!eligibleCityEventCards(world).some(other=>other.id===c.id)));
});
test('city-only eventDeck cannot leak cities into the general pool and does not restrict city draws',()=>{
 for(const deck of [['city_beijing'],['city_beijing','unknown'],['city_beijing','found_envelope','city_paris','found_envelope']]){
  const s=initialState(undefined,undefined,deck),general=eligibleEventCards(s);
  assert.ok(general.every(c=>!c.cityId));assert.equal(general.length,deck.includes('found_envelope')?1:30);
  const normal=arrive('chance',structuredClone(s));assert.ok(normal.eventDraw.offerIds.every(id=>!getEventCard(id).cityId));
  const city=arrive('city-event',structuredClone(s));assert.equal(city.eventDraw.source,'city-event');assert.ok(city.eventDraw.offerIds.every(id=>eligibleCityEventCards(s).some(c=>c.id===id)));
 }
});
test('all city station draws contain exactly three choices only from active map cities',()=>{
 for(const kind of ['classic','china','world','mixed'])for(const size of kind==='classic'?[20]:[20,28,36])for(const seed of [0,.19,.5,.99,1]){
  const s=arrive('city-event',initialState(undefined,generateMap(kind,size,rng(3))),seed),pool=new Set(eligibleCityEventCards(s).map(c=>c.id));assert.equal(s.phase,'draw');assert.equal(s.eventDraw.source,'city-event');assert.equal(s.eventDraw.offerIds.length,3);assert.ok(s.eventDraw.offerIds.every(id=>pool.has(id)));
  const after=act(s,'DRAW_EVENT',{index:2});assert.equal(after.phase,'event');assert.ok(pool.has(after.activeEvent.id));assert.deepEqual(cash(after),cash(s));
 }
});
test('draw validation rejects wrong-source or absent-city cards without changing state',()=>{
 const present=eligibleCityEventCards(initialState())[0].id,absent=CITY_EVENT_CARDS.find(c=>!cities(initialState()).some(t=>t.cityId===c.cityId)).id;
 for(const [source,id] of [['chance',present],['shop',present],['city-event','found_envelope'],['city-event',absent]]){
  const s=arrive(source==='shop'?'chance':source);s.eventDraw.source=source;s.eventDraw.offerIds=[id,id,id];const before=structuredClone(s);assert.equal(act(s,'DRAW_EVENT',{index:0}),s);assert.deepEqual(s,before);
 }
});
test('old pending chance cards on index 8 still reveal and settle as general events',()=>{
 const s=initialState();s.players[0].pos=8;s.phase='draw';s.eventDraw={source:'chance',offerIds:['found_envelope','found_envelope','found_envelope']};
 const db=storage();saveGame(db,s);let restored=loadGame(db);assert.equal(restored.players[0].pos,8);assert.equal(restored.eventDraw.source,'chance');restored=act(restored,'DRAW_EVENT',{index:1});assert.equal(restored.activeEvent.id,'found_envelope');restored=act(restored,'RESOLVE_EVENT',{seed:.2});assert.equal(restored.players[0].cash,12800);assert.equal(restored.phase,'end');
});
test('changed maps invalidate pending city reveal, destination and property actions instead of retargeting',()=>{
 for(const type of ['bank','travel','renovate','redeem_grant','city_host']){
  const card=cardOf(type);let s=reveal(card);const target=getTiles(s).findIndex(t=>t.cityId===card.cityId);
  if(type==='renovate')s.properties[target]={owner:0,level:0};if(type==='redeem_grant')s.properties[target]={owner:'bank',mortgagor:0,mortgageAmount:500,level:1};
  const wrongMap={kind:'mixed',size:20,cityIds:CITY_CATALOG.filter(c=>c.id!==card.cityId).slice(0,12).map(c=>c.id)};
  const forged={...s,map:wrongMap};assert.equal(act(forged,'RESOLVE_EVENT',{seed:.2}),forged);
  if(['travel','renovate','redeem_grant'].includes(type)){
   const pending=act(s,'RESOLVE_EVENT',{seed:.2}),stale={...pending,map:wrongMap};
   assert.equal(act(stale,type==='travel'?'EVENT_DESTINATION':'EVENT_CHOICE',type==='travel'?{tile:target}:{value:String(target)}),stale);
   assert.deepEqual(type==='travel'?eventDestinations(stale):eventChoices(stale),[]);
  }
 }
});
test('city-bound travel offers exactly its own city and normal arrival semantics without start cash',()=>{
 const card=cardOf('travel');
 for(const owner of [undefined,0,1,'bank']){
  const s=initialState(undefined,mapFor(card.cityId)),target=getTiles(s).findIndex(t=>t.cityId===card.cityId);if(owner!==undefined)s.properties[target]=owner==='bank'?{owner,mortgagor:1,mortgageAmount:500,level:1}:{owner,level:1};
  const before=resolve(card,s);assert.equal(before.phase,'event-destination');assert.deepEqual(eventDestinations(before),[target]);const other=getTiles(before).findIndex((t,i)=>t.type==='city'&&i!==target);assert.equal(act(before,'EVENT_DESTINATION',{tile:other}),before);
  const after=act(before,'EVENT_DESTINATION',{tile:target});assert.equal(after.players[0].pos,target);assert.equal(after.phase,owner===undefined?'buy':owner===0?'upgrade':owner===1?'rent':'end');assert.deepEqual(cash(after),cash(before));assert.deepEqual(after.transactions,[]);
 }
});
test('city hosts pay actor and eligible owner from bank, including self ownership and twenty players',()=>{
 const card=cardOf('city_host');assert.equal(card.effect.amount,600);assert.equal(card.effect.ownerBonus,400);
 for(const scenario of ['unowned','other','self','bank','bankrupt'])for(const count of [4,20]){
  const s=initialState(Array.from({length:count},(_,i)=>({name:`玩家${i}`}))),map=mapFor(card.cityId);s.map=map;const target=getTiles(s).findIndex(t=>t.cityId===card.cityId);
  if(scenario!=='unowned')s.properties[target]=scenario==='bank'?{owner:'bank',mortgagor:1,mortgageAmount:500,level:0}:{owner:scenario==='self'?0:1,level:0};if(scenario==='bankrupt')s.players[1].bankrupt=true;
  const before=reveal(card,s),after=act(before,'RESOLVE_EVENT',{seed:.4});assert.equal(after.phase,'end');assert.equal(after.players[0].cash,12600+(scenario==='self'?400:0));assert.equal(after.players[1].cash,12000+(scenario==='other'?400:0));assert.ok(after.transactions.every(t=>t.from==='bank'));assert.equal(after.transactions.reduce((sum,t)=>sum+t.amount,0),['self','other'].includes(scenario)?1000:600);ledger(before,after);assert.equal(act(after,'RESOLVE_EVENT',{seed:.5}),after);
 }
});
test('city renovation only upgrades the linked eligible property, preserving legacy paid cost and subsidy',()=>{
 const card=cardOf('renovate');
 for(const condition of ['eligible','max','other','bank','unowned']){
  const s=initialState(undefined,mapFor(card.cityId)),slots=getTiles(s).flatMap((t,i)=>t.type==='city'?[i]:[]),[target,other]=slots;s.players[0].subsidy=true;s.properties[other]={owner:0,level:0};
  if(condition!=='unowned')s.properties[target]=condition==='bank'?{owner:'bank',mortgagor:0,mortgageAmount:500,level:1}:{owner:condition==='other'?1:0,level:condition==='max'?3:1};
  const cost=condition!=='unowned'?upgradeSpent(s,target):0,before=resolve(card,s);
  if(condition==='eligible'){assert.deepEqual(eventChoices(before).map(c=>c.value),[String(target)]);assert.equal(act(before,'EVENT_CHOICE',{value:String(other)}),before);const after=act(before,'EVENT_CHOICE',{value:String(target)});assert.equal(after.properties[target].level,2);assert.equal(upgradeSpent(after,target),cost);assert.equal(after.players[0].subsidy,true);assert.deepEqual(cash(after),cash(before));assert.deepEqual(after.properties[other],before.properties[other]);}
  else{assert.equal(before.phase,'end');assert.equal(before.players[0].cash,12500);assert.deepEqual(before.properties,s.properties);}
 }
});
test('city mortgage grant cannot redeem another city or another borrower and preserves cash',()=>{
 const card=cardOf('redeem_grant');
 for(const eligible of [true,false]){
  const s=initialState(undefined,mapFor(card.cityId)),[target,other]=getTiles(s).flatMap((t,i)=>t.type==='city'?[i]:[]);s.properties[target]={owner:'bank',mortgagor:eligible?0:1,mortgageAmount:1300,level:2,upgradeSpent:678};s.properties[other]={owner:'bank',mortgagor:0,mortgageAmount:900,level:1};
  const before=resolve(card,s);
  if(eligible){assert.deepEqual(eventChoices(before).map(c=>c.value),[String(target)]);assert.equal(act(before,'EVENT_CHOICE',{value:String(other)}),before);const after=act(before,'EVENT_CHOICE',{value:String(target)});assert.equal(after.properties[target].owner,0);assert.equal(after.properties[target].level,2);assert.equal(after.properties[target].upgradeSpent,678);assert.equal(after.properties[target].mortgageAmount,undefined);assert.deepEqual(after.properties[other],before.properties[other]);assert.deepEqual(cash(after),cash(before));}
  else{assert.equal(before.phase,'end');assert.equal(before.players[0].cash,12500);assert.deepEqual(before.properties,s.properties);}
 }
});
test('all 88 city test fixtures use the city source, bind property samples and reject absent-city requests',()=>{
 for(const card of CITY_EVENT_CARDS){
  const source=initialState(undefined,mapFor(card.cityId)),original=structuredClone(source),sample=createEventTestState(source,card.id);assert.deepEqual(source,original);assert.equal(sample.eventDraw.source,'city-event');assert.deepEqual(sample.eventDraw.offerIds,[card.id,card.id,card.id]);assert.equal(sample.testRun.id,card.id);
  const target=getTiles(sample).findIndex(t=>t.cityId===card.cityId);if(card.effect.type==='renovate')assert.equal(sample.properties[target].owner,0);if(card.effect.type==='redeem_grant'){assert.equal(sample.properties[target].owner,'bank');assert.equal(sample.properties[target].mortgagor,0);}if(card.effect.type==='city_host')assert.equal(sample.properties[target].owner,1);
  source.map={kind:'mixed',size:20,cityIds:CITY_CATALOG.filter(c=>c.id!==card.cityId).slice(0,12).map(c=>c.id)};assert.throws(()=>createEventTestState(source,card.id));
 }
});
test('all 88 city cards complete human and AI event decisions without negative money',()=>{
 for(const card of CITY_EVENT_CARDS)for(const actor of [0,1]){
  let s=createEventTestState(initialState(undefined,mapFor(card.cityId)),card.id);s.current=actor;const target=getTiles(s).findIndex(t=>t.cityId===card.cityId);if(card.effect.type==='renovate')s.properties[target]={owner:actor,level:1,upgradeSpent:300};if(card.effect.type==='redeem_grant')s.properties[target]={owner:'bank',mortgagor:actor,level:1,mortgageAmount:500,upgradeSpent:300};
  let count=0;while(['draw','event','event-choice','event-destination','debt'].includes(s.phase)&&count++<12){const action=aiAction(s,()=>.4),after=transition(s,action);assert.notEqual(after,s,`${card.id}: ${actor} stuck at ${s.phase}`);s=after;}
  assert.ok(count<12,card.id);assert.ok(!['draw','event','event-choice','event-destination','debt'].includes(s.phase),card.id);assert.ok(s.players.every(p=>p.cash>=0&&Number.isFinite(p.cash)),card.id);
 }
});
test('city draw, reveal, property choice and travel reload without redrawing or damaging normal saves',()=>{
 const db=storage(),normal=initialState();normal.players[0].cash=2468;saveGame(db,normal);const saved=db.getItem(SAVE);
 for(const type of ['bank','travel','renovate','redeem_grant','city_host']){
  const card=cardOf(type),sample=createEventTestState(initialState(undefined,mapFor(card.cityId)),card.id),revealState=act(sample,'DRAW_EVENT',{index:1}),pending=act(revealState,'RESOLVE_EVENT',{seed:.2});
  assert.equal(revealState.phase,'event');assert.notEqual(pending.phase,'event');
  for(const s of [sample,revealState,pending]){saveGame(db,s);assert.equal(db.getItem(SAVE),saved);assert.deepEqual(loadGame(db),s);}
  if(pending.phase==='event-choice'||pending.phase==='event-destination'){const action=pending.phase==='event-choice'?{type:'EVENT_CHOICE',value:eventChoices(pending)[0].value}:{type:'EVENT_DESTINATION',tile:eventDestinations(pending)[0]};const done=transition(loadGame(db),action);assert.deepEqual(done,transition(pending,action));assert.equal(transition(done,action),done);}
 }
 saveGame(db,normal);assert.equal(db.getItem(LAB_SAVE),null);assert.equal(db.getItem(SAVE),saved);
});
test('city-bound destinations, grants and host bonus follow city identity after a map reorder',()=>{
 for(const type of ['travel','renovate','redeem_grant','city_host']){
  const card=cardOf(type),source=initialState(undefined,mapFor(card.cityId));let s=reveal(card,source),before=getTiles(s).findIndex(t=>t.cityId===card.cityId);
  if(type==='renovate')s.properties[before]={owner:0,level:1,upgradeSpent:123};
  if(type==='redeem_grant')s.properties[before]={owner:'bank',mortgagor:0,mortgageAmount:456,level:1,upgradeSpent:123};
  if(type==='city_host')s.properties[before]={owner:1,level:1};
  s={...s,...shuffleCityMap(s,.4,'rotate')};const target=getTiles(s).findIndex(t=>t.cityId===card.cityId);assert.notEqual(target,before);
  const pending=act(s,'RESOLVE_EVENT',{seed:.5});
  if(type==='travel'){assert.deepEqual(eventDestinations(pending),[target]);assert.equal(act(pending,'EVENT_DESTINATION',{tile:before}),pending);assert.equal(act(pending,'EVENT_DESTINATION',{tile:target}).players[0].pos,target);}
  else if(type==='city_host'){assert.equal(pending.players[0].cash,12600);assert.equal(pending.players[1].cash,12400);}
  else{assert.deepEqual(eventChoices(pending).map(c=>c.value),[String(target)]);assert.equal(act(pending,'EVENT_CHOICE',{value:String(before)}),pending);const done=act(pending,'EVENT_CHOICE',{value:String(target)});assert.equal(done.properties[target].owner,0);assert.equal(done.properties[target].level,type==='renovate'?2:1);}
 }
});

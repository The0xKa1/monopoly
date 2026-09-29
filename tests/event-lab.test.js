import test from 'node:test';
import assert from 'node:assert/strict';
import {createEventTestState,prepareItemTrial} from '../src/eventLab.js';
import {loadGame,loadNormalGame,saveGame,SAVE,LAB_SAVE} from '../src/gameStorage.js';
import {initialState,transition} from '../src/game.js';
import {generateMap,getTiles} from '../src/board.js';
import {EVENT_CARDS} from '../src/eventCards.js';
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const execute=s=>transition(transition(s,{type:'DRAW_EVENT',index:1}),{type:'RESOLVE_EVENT',seed:.5});
test('every card has a deterministic test draw using the current map without changing the original match',()=>{
 for(const kind of ['classic','china','world','mixed'])for(const card of EVENT_CARDS){
  const source=initialState(undefined,generateMap(kind,kind==='classic'?20:36));source.players[0].cash=4567;source.phase='debt';source.debt={to:1,amount:9000,label:'原欠款'};source.properties[1]={owner:0,level:2};const before=structuredClone(source);
  const sample=createEventTestState(source,card.id);assert.deepEqual(source,before);assert.deepEqual(sample.map,source.map);assert.equal(sample.phase,'draw');assert.equal(sample.current,0);assert.deepEqual(sample.eventDraw.offerIds,Array(3).fill(card.id));assert.equal(sample.testRun.id,card.id);assert.equal(sample.debt,undefined);assert.equal(sample.players[0].name,source.players[0].name);assert.equal(sample.testRun.baseline.cash[0],sample.players[0].cash);assert.notEqual(execute(sample).phase,'draw');
 }
 assert.throws(()=>createEventTestState(initialState(),'unknown'));
});
test('normal twenty-player gift test is solvent; cash-short samples enter the real debt flow',()=>{
 const source=initialState(Array.from({length:20},(_,i)=>({name:`玩家${i}`})));
 assert.equal(execute(createEventTestState(source,'park_proposal')).phase,'end');
 for(const id of ['park_proposal','repair_bill','souvenir_spree','property_inspection']){let s=execute(createEventTestState(initialState(),id,'short-cash'));assert.equal(s.phase,'debt');assert.equal(s.players[0].cash,100);const collateral=Object.keys(s.properties).find(i=>s.properties[i].owner===0);s=transition(s,{type:'MORTGAGE',tile:Number(collateral)});s=transition(s,{type:'SETTLE_DEBT'});assert.equal(s.phase,'end');assert.ok(s.players[0].cash>=0);}
 assert.equal(createEventTestState(initialState(),'night_flight','short-cash').testRun.variant,'normal');
});
test('obtained items can be tried through the actual card and dice rules',()=>{
 for(const [id,item] of [['pocket_compass','dice'],['lucky_umbrella','shield'],['toolbox_drop','build']]){
  let s=execute(createEventTestState(initialState(),id));assert.equal(s.players[0].cards[item],1);const before=structuredClone(s);s=prepareItemTrial(s);assert.equal(s.phase,'roll');assert.deepEqual(before.testRun.baseline,s.testRun.baseline);assert.ok(s.testRun.itemTrial);assert.equal(prepareItemTrial(s),s);
  const cash=s.players[0].cash;s=transition(s,{type:'CARD',card:item,value:1});s=transition(s,{type:'ROLL',value:6});
  if(item==='dice')assert.equal(s.players[0].pos,1);
  if(item==='shield'){assert.equal(s.phase,'end');assert.equal(s.players[0].cash,cash);assert.equal(s.players[0].shield,false);}
  if(item==='build'){assert.equal(s.phase,'upgrade');const cost=Math.max(0,getTiles(s)[s.players[0].pos].price*.5-600);s=transition(s,{type:'UPGRADE'});assert.equal(s.players[0].cash,cash-cost);}
 }
});
test('test saves and reloading never overwrite the normal game and exiting removes only the test save',()=>{
 const db=storage(),original=initialState();original.players[0].cash=4321;original.properties[1]={owner:0,level:2};saveGame(db,original);const saved=db.getItem(SAVE);
 let sample=createEventTestState(original,'city_remix');saveGame(db,sample);assert.equal(db.getItem(SAVE),saved);assert.deepEqual(loadGame(db),sample);assert.deepEqual(loadNormalGame(db),original);
 sample=execute(sample);saveGame(db,sample);assert.equal(db.getItem(SAVE),saved);assert.deepEqual(loadGame(db),sample);assert.ok(loadGame(db).map.cityOrder);
 saveGame(db,loadNormalGame(db));assert.equal(db.getItem(LAB_SAVE),null);assert.equal(db.getItem(SAVE),saved);assert.deepEqual(loadGame(db),original);
});
test('malformed test state safely falls back to the intact normal save',()=>{
 const db=storage(),original=initialState();saveGame(db,original);
 for(const value of ['{','null',JSON.stringify({...original,testRun:{id:'unknown'}}),JSON.stringify({...original,testRun:{id:'city_remix',baseline:{}}})]){db.setItem(LAB_SAVE,value);assert.deepEqual(loadGame(db),original);}
});

test('lab property and shield baselines capture original sample state without sharing mutable references',()=>{
 for(const id of ['overnight_renovation','bank_amnesty','city_siesta']){
  const sample=createEventTestState(initialState(),id),tiles=getTiles(sample),baseline=sample.testRun.baseline;
  assert.deepEqual(baseline.shields,sample.players.map(p=>!!p.shield));
  for(const [index,property] of Object.entries(sample.properties)){
   assert.deepEqual(baseline.properties[tiles[index].cityId],property);
   assert.notEqual(baseline.properties[tiles[index].cityId],property);
  }
  const before=structuredClone(baseline);let result=execute(sample);
  if(result.phase==='event-choice'){
   const tile=Object.keys(result.properties).find(index=>id==='bank_amnesty'?result.properties[index].owner==='bank'&&result.properties[index].mortgagor===0:result.properties[index].owner===0&&result.properties[index].level<3);
   result=transition(result,{type:'EVENT_CHOICE',value:tile});
  }
  assert.deepEqual(result.testRun.baseline,before);
 }
});
test('chosen item rewards can be used in the actual trial while cash rewards cannot',()=>{
 for(const [id,values] of [['mystery_vending',['dice','shield','build']],['bonus_choice',['dice','cash']]])for(const value of values){
  let s=execute(createEventTestState(initialState(),id));assert.equal(s.phase,'event-choice');assert.equal(prepareItemTrial(s),s);
  s=transition(s,{type:'EVENT_CHOICE',value});assert.equal(s.phase,'end');
  if(value==='cash'){assert.equal(prepareItemTrial(s),s);continue;}
  assert.equal(s.testRun.chosenItem,value);assert.equal(s.players[0].cards[value],id==='bonus_choice'?2:1);
  const before=structuredClone(s);s=prepareItemTrial(s);assert.equal(s.phase,'roll');assert.deepEqual(s.testRun.baseline,before.testRun.baseline);
  s=transition(s,{type:'CARD',card:value,value:1});assert.equal(s.players[0].cards[value],before.players[0].cards[value]-1);
  s=transition(s,{type:'ROLL',value:6});
  if(value==='dice')assert.equal(s.players[0].pos,1);
  if(value==='shield'){assert.equal(s.phase,'end');assert.equal(s.players[0].shield,false);assert.equal(s.players[0].cash,before.players[0].cash);}
  if(value==='build'){assert.equal(s.phase,'upgrade');s=transition(s,{type:'UPGRADE'});assert.equal(s.players[0].subsidy,false);}
 }
});

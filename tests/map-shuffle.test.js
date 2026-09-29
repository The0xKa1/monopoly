import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASSIC_MAP,TILES,MAP_SIZES,generateMap,getTiles,getGroups,validateMap,shuffleCityMap} from '../src/board.js';
import {initialState,rent,worth} from '../src/game.js';

const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const maps=()=>[CLASSIC_MAP,...['china','world','mixed'].flatMap(kind=>MAP_SIZES.map(size=>generateMap(kind,size,rng(17))))];
const cityIds=state=>getTiles(state).filter(tile=>tile.type==='city').map(tile=>tile.cityId);
const cityIndex=(state,id)=>getTiles(state).findIndex(tile=>tile.cityId===id);

test('shuffle changes only city order for classic and every map scope/size',()=>{
 for(const map of maps()){
  const state=initialState(undefined,map),before=getTiles(state),patch=shuffleCityMap(state,.417),after=getTiles(patch);
  assert.notDeepEqual(cityIds(patch),cityIds(state));
  assert.deepEqual([...cityIds(patch)].sort(),[...cityIds(state)].sort());
  assert.equal(patch.map.kind,map.kind);assert.equal(patch.map.size,map.size);
  assert.deepEqual(patch.map.cityIds,map.cityIds);
  assert.deepEqual(getGroups(patch),getGroups(state));
  assert.equal(after.length,before.length);
  before.forEach((tile,index)=>{if(tile.type!=='city')assert.deepEqual(after[index],tile);});
 }
});

test('property identity, bank collateral and occupants follow their cities without economic changes',()=>{
 for(const map of maps()){
  const state=initialState(undefined,map),tiles=getTiles(state),slots=tiles.flatMap((tile,index)=>tile.type==='city'?[index]:[]);
  state.properties[slots[0]]={owner:0,level:3,upgradeSpent:1234};
  state.properties[slots[1]]={owner:'bank',mortgagor:1,mortgageAmount:1700,level:2,upgradeSpent:1100};
  state.properties[slots[2]]={owner:2,level:0,upgradeSpent:0};
  state.players[0]={...state.players[0],pos:slots[0],cash:777,cards:{dice:3,shield:2,build:1},shield:true};
  state.players[1]={...state.players[1],pos:slots[1],cash:421,bankrupt:false};
  state.players[2]={...state.players[2],pos:slots[0],cash:18};
  state.players[3]={...state.players[3],pos:tiles.findIndex(tile=>tile.type==='chance'),cash:333};
  const snapshot=structuredClone(state),patch=shuffleCityMap(state,.85),next={...state,...patch};
  assert.deepEqual(state,snapshot);
  assert.equal(Object.keys(next.properties).length,3);
  for(const [index,property] of Object.entries(state.properties)){
   const target=cityIndex(next,tiles[index].cityId);
   assert.deepEqual(next.properties[target],property);
   assert.equal(rent(next,target),rent(state,Number(index)));
  }
  state.players.forEach((player,index)=>{
   const oldTile=tiles[player.pos],newTile=getTiles(next)[next.players[index].pos];
   if(oldTile.type==='city')assert.equal(newTile.cityId,oldTile.cityId);
   else assert.equal(next.players[index].pos,player.pos);
   assert.deepEqual({...next.players[index],pos:player.pos},player);
   assert.equal(worth(next,index),worth(state,index));
  });
  assert.equal(next.players[0].pos,next.players[2].pos);
  assert.equal(next.round,state.round);assert.equal(next.current,state.current);
  assert.deepEqual(next.transactions,state.transactions);assert.deepEqual(next.journal,state.journal);
 }
});

test('repeated shuffles are deterministic, nonidentity, and remap current positions',()=>{
 const state=initialState(undefined,generateMap('mixed',36,rng(12)));
 state.players[0].pos=1;state.properties[1]={owner:0,level:1,upgradeSpent:400};
 for(const seed of [0,.001,.15,.5,.999,1]){
  const first=shuffleCityMap(state,seed);
  assert.deepEqual(first,shuffleCityMap(state,seed));
  assert.notDeepEqual(cityIds(first),cityIds(state));
 }
 let next=state;
 for(let i=0;i<100;i++){
  const previous=next;next={...next,...shuffleCityMap(next,i/100)};
  assert.notDeepEqual(cityIds(next),cityIds(previous));
  assert.equal(getTiles(next)[next.players[0].pos].cityId,getTiles(state)[1].cityId);
  assert.deepEqual(next.properties[next.players[0].pos],state.properties[1]);
 }
 for(const seed of [undefined,null,NaN,Infinity,-.1,1.1,'0.5'])assert.throws(()=>shuffleCityMap(state,seed));
});

test('saved and reset maps keep shuffled order and independent validated arrays',()=>{
 for(const map of maps()){
  const state=initialState(undefined,map),patch=shuffleCityMap(state,.237),loaded=validateMap(JSON.parse(JSON.stringify(patch.map)));
  assert.deepEqual(loaded,patch.map);assert.notEqual(loaded.cityOrder,patch.map.cityOrder);
  assert.deepEqual(getTiles({map:loaded}),getTiles(patch));
  assert.deepEqual(initialState(state.players,loaded).map,loaded);
  const original=[...loaded.cityOrder];patch.map.cityOrder.reverse();assert.deepEqual(loaded.cityOrder,original);
 }
});

test('cityOrder accepts only a complete permutation of the base map',()=>{
 for(const map of maps()){
  const baseIds=cityIds({map}),unrelated=map.kind==='world'?'beijing':'paris';
  const valid={...map,cityOrder:[...baseIds].reverse()};
  assert.deepEqual(validateMap(valid),valid);
  for(const cityOrder of [null,{},'abc',[],baseIds.slice(1),[...baseIds,baseIds[0]],baseIds.map(()=>baseIds[0]),[undefined,...baseIds.slice(1)],['unknown-city',...baseIds.slice(1)],[unrelated,...baseIds.filter(id=>id!==unrelated).slice(1)]]){
   assert.throws(()=>validateMap({...map,cityOrder}));
  }
 }
 assert.throws(()=>validateMap({kind:'classic',size:28}));
});

test('legacy maps and version-one indices remain compatible without cityOrder',()=>{
 assert.equal(getTiles({}),TILES);assert.equal(getTiles({map:CLASSIC_MAP}),TILES);
 assert.equal(validateMap(undefined),CLASSIC_MAP);assert.equal(validateMap({kind:'classic'}),CLASSIC_MAP);
 const legacy=initialState();delete legacy.map;legacy.properties[3]={owner:'bank',mortgagor:0,mortgageAmount:800,level:0};legacy.players[0].pos=3;
 const next={...legacy,...shuffleCityMap(legacy,.72)};
 assert.equal(getTiles(next)[next.players[0].pos].cityId,TILES[3].cityId);
 assert.deepEqual(next.properties[next.players[0].pos],legacy.properties[3]);
 for(const map of maps())assert.deepEqual(validateMap(map),map);
});

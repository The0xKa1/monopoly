import test from 'node:test';
import assert from 'node:assert/strict';
import {TILES,MAP_SIZES,generateMap,getTiles,getGroups,validateMap,tilePosition,mapDimensions} from '../src/board.js';
import {getCity} from '../src/cityCatalog.js';
import {initialState,transition,rent,worth,aiAction} from '../src/game.js';
import {movementPath} from '../src/useGameController.js';
const rng=seed=>()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
test('all scopes and sizes generate unique balanced cities from the central catalog',()=>{
 for(const kind of ['china','world','mixed'])for(const size of MAP_SIZES){const map=generateMap(kind,size,rng(5)),tiles=getTiles({map});
 assert.deepEqual(validateMap(JSON.parse(JSON.stringify(map))),map);assert.equal(tiles.length,size);assert.equal(tiles.filter(t=>t.type!=='city').length,8);assert.equal(tiles[0].type,'start');
 assert.equal(new Set(map.cityIds).size,size-8);
 for(const group of Object.keys(getGroups({map})))assert.equal(tiles.filter(t=>t.group===group).length,(size-8)/4);
 for(const t of tiles.filter(t=>t.type==='city')){const c=getCity(t.cityId);assert.equal(t.price,c.gameplay.price);assert.equal(t.asset,c.asset);if(kind!=='mixed')assert.equal(c.scope,kind);}
 }
 assert.notDeepEqual(generateMap('world',28,rng(1)),generateMap('world',28,rng(2)));
});
test('every perimeter coordinate is unique, adjacent and within bounds at all sizes',()=>{
 for(const size of MAP_SIZES){const p=Array.from({length:size},(_,i)=>tilePosition(i,size)),{columns,rows}=mapDimensions(size);
 assert.equal(new Set(p.map(p=>`${p.gridColumn},${p.gridRow}`)).size,size);
 p.forEach((a,i)=>{const b=p[(i+1)%size];assert.equal(Math.abs(a.gridColumn-b.gridColumn)+Math.abs(a.gridRow-b.gridRow),1);assert.ok(a.gridColumn>=1&&a.gridColumn<=columns&&a.gridRow>=1&&a.gridRow<=rows);});}
});
test('old saves retain exact classic indices; malformed dynamic maps are rejected',()=>{
 const old=initialState();delete old.map;assert.equal(getTiles(old),TILES);assert.equal(validateMap(undefined).kind,'classic');
 const map=generateMap('world',28,rng(7));
 assert.throws(()=>validateMap({...map,size:24}));assert.throws(()=>validateMap({...map,cityIds:map.cityIds.slice(1)}));assert.throws(()=>validateMap({...map,cityIds:map.cityIds.map(()=>map.cityIds[0])}));assert.throws(()=>validateMap({...map,cityIds:['unknown',...map.cityIds.slice(1)]}));assert.throws(()=>validateMap({...map,kind:'china'}));
});
test('movement, purchase, rent, assets and group bonus use the selected map',()=>{
 let s=initialState(undefined,generateMap('world',36,rng(8)));const tiles=getTiles(s),city=tiles[1];
 s.players[0].pos=35;s=transition(s,{type:'ROLL',value:2});assert.equal(s.players[0].pos,1);assert.equal(s.players[0].cash,13200);assert.deepEqual(movementPath(35,3,36),[0,1,2]);
 s=transition(s,{type:'BUY'});assert.equal(s.players[0].cash,13200-city.price);assert.equal(worth(s,0),13200);
 const base=rent(s,1);for(let i=0;i<tiles.length;i++)if(tiles[i].group===city.group)s.properties[i]={owner:0,level:0};assert.equal(rent(s,1),Math.round(city.price*.16*1.5*(city.group==='east'?1.3:1)));
 assert.ok(rent(s,1)>base);s.current=1;s.phase='roll';const before=s.players[0].cash;s=transition(s,{type:'ROLL',value:1});s=transition(s,{type:'PAY_RENT'});assert.equal(s.transactions[0].to,0);assert.equal(s.players[0].cash,before+rent(s,1));
 const reset=initialState(s.players,s.map);assert.deepEqual(reset.map,s.map);assert.deepEqual(reset.properties,{});assert.ok(reset.players.every(p=>p.pos===0&&p.cash===12000));
});
test('all dynamic map variants complete full games with finite assets',()=>{
 for(const kind of ['china','world','mixed'])for(const size of MAP_SIZES){let s=initialState(undefined,generateMap(kind,size,rng(21))),random=rng(42),steps=0;while(s.phase!=='finished'&&steps++<2000)s=transition(s,aiAction(s,random));assert.equal(s.phase,'finished');assert.equal(worth(s,s.winner),Math.max(...s.players.map((_,i)=>worth(s,i))));assert.ok(s.players.every(p=>p.cash>=0&&Number.isFinite(p.cash)));}
});

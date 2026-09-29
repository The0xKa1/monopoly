import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,aiAction,TILES,rent,worth,upgradeCost} from '../src/game.js';
import {getTiles} from '../src/board.js';
test('exactly twelve Chinese cities in four groups',()=>{const cities=TILES.filter(t=>t.type==='city');assert.equal(cities.length,12);assert.equal(new Set(cities.map(t=>t.name)).size,12);for(const g of ['north','west','east','south'])assert.equal(cities.filter(t=>t.group===g).length,3);});
test('controlled dice, purchase and save serialization',()=>{let s=initialState();s=transition(s,{type:'CARD',card:'dice',value:1});s=transition(s,{type:'ROLL',value:6});assert.equal(s.players[0].pos,1);assert.equal(s.phase,'buy');s=transition(s,{type:'BUY'});assert.equal(s.players[0].cash,9800);assert.deepEqual(s.properties[1],{owner:0,level:0});assert.equal(worth(s,0),12000);assert.deepEqual(JSON.parse(JSON.stringify(s)),s);assert.deepEqual(transition(s,{type:'BUY'}),s);});
test('region, season and investor bonuses stack',()=>{const s=initialState();[11,12,19].forEach(i=>s.properties[i]={owner:2,level:1});assert.equal(rent(s,12),Math.round(2600*.16*2*1.5*1.3*1.15));});
test('shield blocks exactly one rent payment',()=>{let s=initialState();s.properties[1]={owner:1,level:0};s=transition(s,{type:'CARD',card:'shield'});s=transition(s,{type:'ROLL',value:1});assert.equal(s.players[0].cash,12000);assert.equal(s.players[1].cash,12000);assert.equal(s.players[0].shield,false);assert.equal(s.players[0].cards.shield,0);});
test('subsidy applies once and cannot exceed upgrade cost',()=>{let s=initialState();s.properties[1]={owner:0,level:0};s=transition(s,{type:'CARD',card:'build'});s=transition(s,{type:'ROLL',value:1});assert.equal(upgradeCost(s,1),500);s=transition(s,{type:'UPGRADE'});assert.equal(s.players[0].cash,11500);assert.equal(s.properties[1].level,1);assert.equal(s.players[0].subsidy,false);});
test('start allowance and player perk only granted on crossing',()=>{let s=initialState();s.players[0].pos=19;s=transition(s,{type:'ROLL',value:1});assert.equal(s.players[0].cash,13200);s=transition(s,{type:'ROLL',value:1});assert.equal(s.players[0].cash,13200);});
test('invalid actions preserve state and inventory',()=>{const s=initialState();for(const a of [{type:'BUY'},{type:'UPGRADE'},{type:'END'},{type:'ROLL',value:7},{type:'CARD',card:'dice',value:0},{type:'CARD',card:'unknown'}])assert.deepEqual(transition(s,a),s);});
test('fifty seeded full games reach settlement with valid finances',()=>{for(let seed=1;seed<=50;seed++){let n=seed;const random=()=>((n=(n*1664525+1013904223)>>>0)/2**32);let s=initialState(),count=0;while(s.phase!=='finished'&&count++<2000){s=transition(s,aiAction(s,random));for(const p of s.players){assert.ok(p.cash>=0);assert.ok(Number.isFinite(p.cash));}for(const [i,p] of Object.entries(s.properties)){assert.ok(['city','industry'].includes(getTiles(s)[i].type));if(getTiles(s)[i].type==='industry')assert.equal(p.level,0);assert.ok(p.level<=3);assert.ok(!s.players[p.owner==='bank'?p.mortgagor:p.owner].bankrupt);}}assert.equal(s.phase,'finished');assert.ok(s.winner!==null);assert.ok(s.round<=20);assert.equal(worth(s,s.winner),Math.max(...s.players.map((_,i)=>worth(s,i))));}});

test('ledger preserves start income and rent as separate directional transfers',()=>{
 let s=initialState();s.players[0].pos=19;s.properties[1]={owner:1,level:0};
 const before=s.players.map(p=>p.cash);s=transition(s,{type:'ROLL',value:2});const income=s.transactions;s=transition(s,{type:'PAY_RENT'});const entries=[...income,...s.transactions];
 assert.deepEqual(entries,[{from:'bank',to:0,amount:1200,label:'经过起点 · 旅途补给'},{from:0,to:1,amount:352,label:'北京 · 城市租金'}]);
 for(let i=0;i<4;i++){const delta=entries.reduce((sum,e)=>sum+(e.to===i?e.amount:0)-(e.from===i?e.amount:0),0);assert.equal(s.players[i].cash,before[i]+delta);}
});
test('purchase and upgrade transactions are not replayed by END',()=>{
 let s=transition(initialState(),{type:'ROLL',value:1});s=transition(s,{type:'BUY'});
 assert.deepEqual(s.transactions,[{from:0,to:'bank',amount:2200,label:'购买北京'}]);
 s=transition(s,{type:'END'});assert.deepEqual(s.transactions,[]);
});
test('shield emits no rent and cash shortfalls wait for mortgage decisions',()=>{
 let s=initialState();s.players[0].shield=true;s.properties[1]={owner:1,level:2};
 assert.deepEqual(transition(s,{type:'ROLL',value:1}).transactions,[]);
 s.players[0].shield=false;s.players[0].cash=10;s.properties[3]={owner:0,level:0};
 const next=transition(transition(s,{type:'ROLL',value:1}),{type:'PAY_RENT'});
 assert.equal(next.phase,'debt');assert.equal(next.players[0].cash,10);assert.equal(next.players[1].cash,12000);assert.equal(next.properties[3].owner,0);assert.deepEqual(next.transactions,[]);
});

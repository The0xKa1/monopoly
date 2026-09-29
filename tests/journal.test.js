import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,transfer} from '../src/game.js';
test('crossing start and paying rent remain separate announcements after END and reload',()=>{
 let s=initialState();s.players[0].pos=19;s.properties[1]={owner:1,level:0};s=transition(s,{type:'ROLL',value:2});s=transition(s,{type:'PAY_RENT'});
 assert.deepEqual(s.journal.map(({from,to,amount})=>({from,to,amount})),[{from:0,to:1,amount:352},{from:'bank',to:0,amount:1200}]);
 const journal=structuredClone(s.journal);s=transition(s,{type:'END'});assert.deepEqual(s.transactions,[]);assert.deepEqual(JSON.parse(JSON.stringify(s)).journal,journal);
});
test('non-monetary outcomes appear as events without inventing a transfer',()=>{
 let s=initialState();s.players[0].shield=true;s.properties[1]={owner:1,level:0};s=transition(s,{type:'ROLL',value:1});assert.equal(s.journal.length,1);assert.equal(s.journal[0].kind,'event');assert.match(s.journal[0].text,/免付/);assert.deepEqual(s.transactions,[]);
 s=initialState();s.eventDeck=['lucky_umbrella'];s.players[0].pos=1;s=transition(s,{type:'ROLL',value:1});s=transition(s,{type:'DRAW_EVENT',index:0});s=transition(s,{type:'RESOLVE_EVENT',seed:.3});assert.equal(s.journal[0].kind,'event');assert.match(s.journal[0].text,/租金护盾/);assert.deepEqual(s.transactions,[]);
});
test('journal migrates lazily, is bounded, and clears on a new match',()=>{
 let s=initialState();s.eventDeck=['found_envelope'];delete s.journal;s=transition(s,{type:'ROLL',value:2});s=transition(s,{type:'DRAW_EVENT',index:0});s=transition(s,{type:'RESOLVE_EVENT',seed:.3});assert.ok(s.journal.some(e=>e.kind==='transaction'));assert.ok(s.journal.some(e=>e.kind==='event'));
 for(let i=0;i<50;i++)transfer(s,'bank',0,1,`记录${i}`);assert.equal(s.journal.length,40);assert.equal(s.journal[0].label,'记录49');assert.equal(s.journal.at(-1).label,'记录10');
 assert.deepEqual(initialState(s.players,s.map).journal,[]);
});

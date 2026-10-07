import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,aiAction,roundLimit,worth} from '../src/game.js';
const act=(s,type,fields={})=>transition(s,{type,...fields});
const lastTurn=s=>{s.current=s.players.length-1;s.phase='end';return s;};

test('default and old saves keep 20 rounds; a custom limit ends the game after that round',()=>{
 assert.equal(roundLimit(initialState()),20);const old=initialState();delete old.roundLimit;assert.equal(roundLimit(old),20);
 const five=initialState(undefined,undefined,undefined,{roundLimit:5});assert.equal(five.roundLimit,5);
 let s=lastTurn(structuredClone(five));s.round=4;s=act(s,'END');assert.equal(s.round,5);assert.equal(s.phase,'roll');
 s=lastTurn(s);s=act(s,'END');assert.equal(s.phase,'finished');assert.equal(s.round,5);
 assert.equal(initialState(undefined,undefined,undefined,{roundLimit:0}).roundLimit,20,'invalid falls back');
 assert.equal(initialState(undefined,undefined,undefined,{roundLimit:5000}).roundLimit,999,'capped');
});

test('unlimited games never end on rounds and survive a save round-trip',()=>{
 let s=initialState(undefined,undefined,undefined,{roundLimit:null});assert.equal(roundLimit(s),Infinity);
 s=JSON.parse(JSON.stringify(s));assert.equal(s.roundLimit,null);assert.equal(roundLimit(s),Infinity);
 s=lastTurn(s);s.round=250;s=act(s,'END');assert.equal(s.phase,'roll');assert.equal(s.round,251);
});

test('rounds can change mid-game, never below the current round; settle ends on the human turn',()=>{
 let s=initialState();s.round=8;
 assert.equal(act(s,'SET_ROUNDS',{limit:0}),s);assert.equal(act(s,'SET_ROUNDS',{limit:'x'}),s);assert.equal(act(s,'SET_ROUNDS',{limit:20}),s,'no-op');
 assert.equal(act(s,'SET_ROUNDS',{limit:3}).roundLimit,8);assert.equal(act(s,'SET_ROUNDS',{limit:null}).roundLimit,null);
 assert.equal(act(s,'SETTLE').phase,'finished');const ai=structuredClone(s);ai.current=1;assert.equal(act(ai,'SETTLE'),ai);
 const rent=initialState();rent.properties[1]={owner:1,level:0};const pending=act(rent,'ROLL',{value:1});assert.equal(act(pending,'SETTLE'),pending,'not while rent is pending');
 const done=act(s,'SETTLE');assert.equal(worth(done,done.winner),Math.max(...done.players.map((_,i)=>worth(done,i))));
});

test('AI plays out short and unlimited games without stalling',()=>{
 for(const limit of [3,null]){let s=initialState(undefined,undefined,undefined,{roundLimit:limit}),n=7,steps=0;const random=()=>((n=(n*1664525+1013904223)>>>0)/2**32);
  while(s.phase!=='finished'&&steps++<(limit?2000:3000)){const next=transition(s,aiAction(s,random));assert.notEqual(next,s,`stalled at ${s.phase}`);s=next;}
  if(limit)assert.equal(s.phase,'finished');else assert.ok(s.round>20||s.phase==='finished','unlimited runs past 20');}
});

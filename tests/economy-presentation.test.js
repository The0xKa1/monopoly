import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition} from '../src/game.js';
import {detectFx} from '../src/gameFx.js';
import {loadNormalGame,saveGame} from '../src/gameStorage.js';

const fresh=()=>initialState(undefined,undefined,undefined,{roundLimit:null});
const act=(s,type,rest={})=>transition(s,{type,...rest});
test('auction and contest snapshots survive the actual local storage loader',()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 let buy=fresh();buy.players[0].pos=1;buy.phase='buy';
 const auction=act(buy,'END');
 let rent=fresh();rent.round=21;rent.properties[1]={owner:1,level:0};rent=act(rent,'ROLL',{value:1});
 const contest=act(rent,'CONTEST',{actor:0});
 for(const state of [auction,contest]){saveGame(storage,state);assert.deepEqual(loadNormalGame(storage),state);}
});
test('auction bid and sale effects reflect accepted transactions, not requests',()=>{
 let s=fresh();s.phase='buy';s.players[0].pos=1;
 let next=act(s,'END');assert.ok(detectFx(s,next).some(f=>f.type==='auction'));s=next;
 next=act(s,'AUCTION_BID',{actor:0,amount:s.auction.minimum});assert.ok(detectFx(s,next).some(f=>f.type==='auction-bid'&&f.player===0));s=next;
 const invalid=act(s,'AUCTION_BID',{actor:0,amount:999999});assert.equal(invalid,s);assert.deepEqual(detectFx(s,invalid),[]);
 for(const actor of [1,2,3]){next=act(s,'AUCTION_PASS',{actor});if(actor===3)assert.ok(detectFx(s,next).some(f=>f.type==='auction-sale'&&f.player===0));s=next;}
});
test('contest defense and takeover have distinct pixel effect signals',()=>{
 let s=fresh();s.round=21;s.properties[1]={owner:1,level:0};s=act(s,'ROLL',{value:1});
 const c=act(s,'CONTEST',{actor:0});assert.ok(detectFx(s,c).some(f=>f.type==='contest'));
 const d=act(c,'CONTEST_REPLY',{actor:1,accept:false});assert.ok(detectFx(c,d).some(f=>f.type==='defense'&&f.player===1));
 const sold=act(c,'CONTEST_REPLY',{actor:1,accept:true});assert.ok(detectFx(c,sold).some(f=>f.type==='contest-sale'&&f.player===0));
});
test('operating fee effect reports actual payment; supply changes only at thresholds',()=>{
 let s=fresh();s.round=40;s.current=3;s.phase='end';
 const next=act(s,'END');assert.ok(detectFx(s,next).some(f=>f.type==='operating'&&f.amount===200&&f.player===0));
 for(const round of [10,20]){s=fresh();s.round=round;s.current=3;s.phase='end';assert.ok(detectFx(s,act(s,'END')).some(f=>f.type==='supply'));}
 s=fresh();s.round=11;s.current=3;s.phase='end';assert.ok(!detectFx(s,act(s,'END')).some(f=>f.type==='supply'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,joinRoom,applyCommand,advanceAI,safeAction,publicRoom} from '../server/room.js';
import {decisionPlayer,aiAction,transition} from '../src/game.js';
import {auctionMinimum,contestQuote} from '../src/economy.js';
let serial=0;
const command=(r,key,body)=>applyCommand(r,key,{id:`economy-${++serial}`,version:r.version,...body},r.readyAt+1,()=>0).room;
const act=(r,key,action)=>command(r,key,{type:'action',action:{...action,...(r.game.auction?.mode==='sealed'?{auctionId:r.game.auction.id}:{})}});
function started(){
 let r=newRoom('ECONOMY12345',{name:'甲'},'host',0);
 r=joinRoom(r,{name:'乙'},'guest',0);
 r=command(r,'host',{type:'settings',settings:{aiCount:0,kind:'classic',size:20,rounds:null}});
 r=command(r,'guest',{type:'ready',ready:true});
 return command(r,'host',{type:'start'});
}
function auction(){let r=started();r=act(r,'host',{type:'ROLL'});return act(r,'host',{type:'END'});}
function contest(){
 const r=started();r.game.round=21;r.game.current=0;r.game.phase='rent';r.game.players[0].pos=1;
 r.game.properties[1]={owner:1,level:0,spent:0};r.game.pendingRent={tile:1,owner:1,amount:200};
 return act(r,'host',{type:'CONTEST'});
}
test('auction authorizes the bidder, validates bids, and strips unrelated client prices',()=>{
 let r=auction();assert.equal(r.game.phase,'auction');
 const bidder=decisionPlayer(r.game),key=bidder===0?'host':'guest',other=bidder===0?'guest':'host';
 const otherBid=act(r,other,{type:'AUCTION_BID',actor:bidder,amount:auctionMinimum(r.game)});assert.deepEqual(otherBid.game.auction.submitted,[1-bidder]);
 for(const amount of [-1,0,NaN,Infinity,1.1,'2000',r.game.players[bidder].cash+1])assert.throws(()=>act(r,key,{type:'AUCTION_BID',amount}),/当前阶段/);
 const amount=auctionMinimum(r.game),cash=r.game.players[bidder].cash;
 r=act(r,key,{type:'AUCTION_BID',amount,price:0,actor:999});
 while(r.game.phase==='auction')r=act(r,decisionPlayer(r.game)===0?'host':'guest',{type:'AUCTION_PASS'});
 assert.equal(r.game.properties[1].owner,bidder);assert.equal(r.game.players[bidder].cash,cash-amount);
});
test('contest seller alone chooses and cannot spoof transfer or defense price',()=>{
 let r=contest();assert.equal(r.game.phase,'contest');assert.equal(decisionPlayer(r.game),1);
 const {price,defenseFee}=contestQuote(r.game,1),buyerCash=r.game.players[0].cash,sellerCash=r.game.players[1].cash;
 assert.throws(()=>act(r,'host',{type:'CONTEST_REPLY',accept:true}),/决策回合/);
 const sold=act(r,'guest',{type:'CONTEST_REPLY',accept:true,price:1,defenseFee:0});
 assert.equal(sold.game.properties[1].owner,0);assert.equal(sold.game.players[0].cash,buyerCash-price);assert.equal(sold.game.players[1].cash,sellerCash+price);
 const defended=act(r,'guest',{type:'CONTEST_REPLY',accept:false,defenseFee:0});
 assert.equal(defended.game.properties[1].owner,1);assert.equal(defended.game.players[1].cash,sellerCash-defenseFee);
 assert.throws(()=>act(defended,'host',{type:'CONTEST'}),/当前阶段/);
});
test('new action whitelist preserves only user decisions',()=>{
 assert.deepEqual(safeAction({type:'CONTEST',price:1,actor:0},1),{type:'CONTEST',actor:1});
 assert.deepEqual(safeAction({type:'AUCTION_BID',amount:700,cash:999999,actor:0},1,()=>.25),{type:'AUCTION_BID',actor:1,amount:700,seed:.25});
});
test('AI handles auction and contest decisions legally, including seller with no defense cash',()=>{
 const rooms=[auction(),contest()];rooms[1].game.players[1].cash=0;
 for(const r of rooms){const a=aiAction(r.game,()=>.5),g=transition(r.game,{...a,actor:decisionPlayer(r.game)});assert.notEqual(g,r.game);const advanced=advanceAI(r,r.deadline+1,()=>.5);assert.notEqual(advanced.room,r);}
});
test('operating debt remains the charged player decision and settlement resumes roll',()=>{
 let r=started();r.game.round=40;r.game.current=1;r.game.phase='end';r.game.players[0].cash=0;r.game.properties[1]={owner:0,level:0,upgradeSpent:0};
 r=act(r,'guest',{type:'END'});assert.equal(r.game.round,41);assert.equal(r.game.phase,'debt');assert.equal(decisionPlayer(r.game),0);assert.equal(r.game.debt.amount,200);
 assert.throws(()=>act(r,'guest',{type:'MORTGAGE',tile:1}),/决策回合/);
 assert.throws(()=>act(r,'host',{type:'END'}),/当前阶段/);
 r=act(r,'host',{type:'MORTGAGE',tile:1});r=act(r,'host',{type:'SETTLE_DEBT',amount:0});
 assert.equal(r.game.phase,'roll');assert.equal(r.game.current,0);
});

test('same-version concurrent bids are accepted without leaking private amounts or extending deadline',()=>{
 const r=auction(),id=r.game.auction.id,version=r.version,now=r.readyAt+1;
 const bid=(key,amount,request)=>({key,message:{type:'action',id:request,version,action:{type:'AUCTION_BID',amount,auctionId:id}}});
 const first=bid('guest',1783,'sealed-guest'),second=bid('host',2347,'sealed-host');
 const a=applyCommand(r,first.key,first.message,now,()=>.5).room;
 assert.equal(a.deadline,r.deadline);assert.equal(a.readyAt,r.readyAt);
 for(const viewer of [null,0]){
  const visible=publicRoom(a,[],viewer);assert.equal(visible.game.auction.bids,undefined);
  assert.equal(JSON.stringify(visible).includes('1783'),false);
 }
 assert.equal(publicRoom(a,[],1).game.auction.ownBid,1783);
 assert.equal(a.game.players[1].cash,12000);
 assert.throws(()=>applyCommand(a,'guest',{...first.message,id:'sealed-again',version:a.version},now),/决策回合/);
 const b=applyCommand(a,second.key,second.message,now,()=>.5).room;
 assert.equal(b.game.properties[1].owner,0);assert.equal(b.game.lastAuctionResult.bids[1].amount,1783);
 assert.equal(applyCommand(b,second.key,second.message,now).duplicate,true);
 assert.throws(()=>applyCommand(b,'guest',{...first.message,id:'sealed-obsolete'},b.readyAt+1),/状态已更新/);
});
test('sealed ties use server randomness, not client seed or submission order',()=>{
 let r=auction();r=act(r,'guest',{type:'AUCTION_BID',amount:2000});
 const result=applyCommand(r,'host',{id:'sealed-tie-final',version:r.version,type:'action',action:{type:'AUCTION_BID',amount:2000,auctionId:r.game.auction.id,seed:0}},r.readyAt+1,()=>.99).room;
 assert.equal(result.game.lastAuctionResult.winner,1);assert.deepEqual(result.game.lastAuctionResult.tied,[0,1]);
});
test('AI submits independently and timeout completes all outstanding humans without resetting deadline',()=>{
 let r=auction();r.seats[1].kind='ai';
 const first=advanceAI(r,r.readyAt+1,()=>.5).room;
 assert.deepEqual(first.game.auction.submitted,[1]);assert.equal(first.deadline,r.deadline);
 const saved=JSON.parse(JSON.stringify(first));
 assert.equal(advanceAI(saved,r.deadline-1).room,saved);
 const finished=advanceAI(saved,r.deadline+1,()=>.5).room;
 assert.notEqual(finished.game.phase,'auction');assert.equal(finished.game.lastAuctionResult.bids.length,2);
});
test('wrong auction identity is rejected even at current version',()=>{
 const r=auction();assert.throws(()=>applyCommand(r,'host',{id:'wrong-auction-id',version:r.version,type:'action',action:{type:'AUCTION_PASS',auctionId:r.game.auction.id+1}},r.readyAt+1),/决策回合/);
});

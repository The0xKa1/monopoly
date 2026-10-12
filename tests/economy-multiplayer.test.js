import test from 'node:test';
import assert from 'node:assert/strict';
import {newRoom,joinRoom,applyCommand,advanceAI,safeAction} from '../server/room.js';
import {decisionPlayer,aiAction,transition} from '../src/game.js';
import {auctionMinimum,contestQuote} from '../src/economy.js';
let serial=0;
const command=(r,key,body)=>applyCommand(r,key,{id:`economy-${++serial}`,version:r.version,...body},r.readyAt+1,()=>0).room;
const act=(r,key,action)=>command(r,key,{type:'action',action});
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
 assert.throws(()=>act(r,other,{type:'AUCTION_BID',actor:bidder,amount:auctionMinimum(r.game)}),/决策回合/);
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
 assert.deepEqual(safeAction({type:'AUCTION_BID',amount:700,cash:999999,actor:0},1),{type:'AUCTION_BID',actor:1,amount:700});
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

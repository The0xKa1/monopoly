import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,decisionPlayer} from '../src/game.js';
import {startSupply,operatingFee,canContest,contestQuote,auctionMinimum} from '../src/economy.js';
const game=()=>initialState(undefined,undefined,undefined,{roundLimit:null});
const auction=s=>transition(Object.assign(s,{phase:'buy'}),{type:'END'});
function passAll(s){while(s.phase==='auction')s=transition(s,{type:'AUCTION_PASS',actor:decisionPlayer(s)});return s;}
test('supply decreases by round and legacy saves preserve previous income',()=>{
 const s=game();for(const [round,amount] of [[1,1200],[10,1200],[11,600],[20,600],[21,0],[100,0]]){s.round=round;assert.equal(startSupply(s,1200),amount);s.players[0].pos=19;assert.equal(transition(s,{type:'ROLL',value:1}).players[0].cash,12000+amount);}
 delete s.economyVersion;assert.equal(startSupply(s,1200),1200);assert.equal(operatingFee(s),0);
});
test('sealed bids can arrive in any order, lock once, and charge only the winner after reveal',()=>{
 let s=game();s.players[0].pos=1;s=auction(s);assert.equal(auctionMinimum(s),1100);
 assert.equal(transition(s,{type:'AUCTION_BID',actor:0,amount:13000}),s);
 s=transition(s,{type:'AUCTION_BID',actor:2,amount:1800});
 assert.equal(s.properties[1],undefined);assert.equal(s.players[2].cash,12000);
 assert.equal(transition(s,{type:'AUCTION_PASS',actor:2}),s);
 s=transition(s,{type:'AUCTION_BID',actor:0,amount:1200});
 s=transition(s,{type:'AUCTION_PASS',actor:3});
 s=transition(s,{type:'AUCTION_PASS',actor:1});
 assert.equal(s.phase,'end');assert.equal(s.properties[1].owner,2);assert.equal(s.players[2].cash,10200);assert.equal(s.players[0].cash,12000);
 assert.deepEqual(s.lastAuctionResult.bids.map(b=>b.amount),[1200,null,1800,null]);
 assert.equal(transition(s,{type:'AUCTION_PASS',actor:0}),s);
});
test('all passing leaves asset unowned; low cash arrival still permits auction',()=>{
 let s=game();s.players[0].cash=0;s=transition(s,{type:'ROLL',value:1});assert.equal(s.phase,'buy');s=passAll(transition(s,{type:'END'}));assert.equal(s.phase,'end');assert.equal(s.properties[1],undefined);
});
test('contest requires round and budget; paid defense blocks further offers and contests',()=>{
 let s=game();s.round=20;s.properties[1]={owner:1,level:1,upgradeSpent:1100};s=transition(s,{type:'ROLL',value:1});assert.equal(canContest(s),false);s.round=21;assert.equal(canContest(s),true);assert.deepEqual(contestQuote(s,1),{price:4950,defenseFee:990});
 s=transition(s,{type:'CONTEST'});assert.equal(decisionPlayer(s),1);assert.equal(transition(s,{type:'CONTEST_REPLY',actor:0,accept:true}),s);
 s=transition(s,{type:'CONTEST_REPLY',actor:1,accept:false});assert.equal(s.players[1].cash,11010);assert.equal(canContest(s),false);assert.equal(transition(s,{type:'OFFER'}),s);assert.equal(s.phase,'rent');
});
test('contest sale retains upgrades and pays owner, never bank; defense cannot use credit',()=>{
 let s=game();s.round=21;s.properties[1]={owner:1,level:2,upgradeSpent:2200};s.players[1].cash=0;s=transition(transition(s,{type:'ROLL',value:1}),{type:'CONTEST'});
 assert.equal(transition(s,{type:'CONTEST_REPLY',actor:1,accept:false}),s);s=transition(s,{type:'CONTEST_REPLY',actor:1,accept:true});assert.equal(s.properties[1].owner,0);assert.equal(s.properties[1].level,2);assert.equal(s.players[0].cash,5400);assert.equal(s.players[1].cash,6600);assert.equal(s.pendingRent,undefined);
});
test('operating fee runs once before roll and mortgage debt resumes that turn',()=>{
 let s=game();s.round=40;s.current=3;s.phase='end';s.players[0].cash=0;s.properties[1]={owner:0,level:0};s=transition(s,{type:'END'});assert.equal(s.round,41);assert.equal(s.current,0);assert.equal(s.phase,'debt');assert.equal(s.debt.amount,200);
 s=transition(s,{type:'MORTGAGE',tile:1});s=transition(s,{type:'SETTLE_DEBT'});assert.equal(s.phase,'roll');assert.equal(s.players[0].cash,900);s=transition(s,{type:'ROLL',value:1});assert.equal(s.players[0].cash,900);
 s=transition(s,{type:'END'});assert.equal(s.current,1);assert.equal(s.players[1].cash,11800);assert.equal(s.phase,'roll');
});
test('bankruptcy auctions released mortgages and resumes next player fee without skipping',()=>{
 let s=game();s.round=41;s.current=0;s.phase='debt';s.debt={to:'bank',amount:200,label:'经营费',resume:'roll'};s.players[0].cash=0;s.properties[1]={owner:'bank',mortgagor:0,mortgageAmount:1100,level:2};s.properties[3]={owner:'bank',mortgagor:0,mortgageAmount:1000,level:0};
 s=transition(s,{type:'BANKRUPT'});assert.equal(s.players[0].bankrupt,true);assert.equal(s.phase,'auction');assert.equal(s.auction.tile,1);assert.equal(s.auction.active.includes(0),false);
 s=passAll(s);assert.equal(s.current,1);assert.equal(s.phase,'roll');assert.equal(s.players[1].cash,11800);assert.equal(s.properties[1],undefined);assert.equal(s.auctionQueue,undefined);
});
test('final survivor ends immediately with no auction or extra operating fee',()=>{
 let s=game();s.players[2].bankrupt=s.players[3].bankrupt=true;s.round=42;s.phase='debt';s.players[0].cash=0;s.debt={to:'bank',amount:400,label:'经营费'};s.properties[1]={owner:'bank',mortgagor:0,mortgageAmount:1100,level:0};s=transition(s,{type:'BANKRUPT'});assert.equal(s.phase,'finished');assert.equal(s.winner,1);assert.equal(s.players[1].cash,12000);
});
test('legacy decline and bankruptcy retain their prior phases',()=>{
 let s=game();delete s.economyVersion;s.players[0].pos=1;s.phase='buy';s=transition(s,{type:'END'});assert.equal(s.phase,'roll');assert.equal(s.current,1);
 s.phase='debt';s.players[1].cash=0;s.debt={to:'bank',amount:100,label:'fee'};s=transition(s,{type:'BANKRUPT'});assert.equal(s.phase,'end');
});
test('auction queue and bid survive reload; bankrupt collateral sells at reset level',()=>{
 let s=game();s.phase='debt';s.players[0].cash=0;s.debt={to:'bank',amount:500,label:'fee'};s.properties[1]={owner:'bank',mortgagor:0,mortgageAmount:2200,level:2,upgradeSpent:1100};s=transition(s,{type:'BANKRUPT'});
 s=transition(s,{type:'AUCTION_BID',actor:1,amount:1100});s=JSON.parse(JSON.stringify(s));s=transition(s,{type:'AUCTION_PASS',actor:2});s=transition(s,{type:'AUCTION_PASS',actor:3});
 assert.deepEqual(s.properties[1],{owner:1,level:0});assert.equal(s.players[1].cash,10900);assert.equal(s.current,1);assert.equal(s.phase,'roll');assert.equal(s.transactions.reduce((total,t)=>total+(t.to==='bank'?t.amount:0),0),1100);
});
test('fees skip bankrupt seats, grow each round, and finish finite games before charging',()=>{
 let s=game();s.round=41;s.current=3;s.phase='end';s.players[0].bankrupt=true;s=transition(s,{type:'END'});assert.equal(s.round,42);assert.equal(s.current,1);assert.equal(s.players[1].cash,11600);assert.equal(s.players[0].cash,12000);
 s.roundLimit=42;s.current=3;s.phase='end';const cash=s.players.map(p=>p.cash);s=transition(s,{type:'END'});assert.equal(s.phase,'finished');assert.deepEqual(s.players.map(p=>p.cash),cash);
});
test('settling bankruptcy and next turn fees share a balanced ledger',()=>{
 let s=game();s.round=41;s.current=0;s.phase='debt';s.debt={to:2,amount:200,label:'rent'};s.players[0].cash=50;const before=s.players.map(p=>p.cash);s=transition(s,{type:'BANKRUPT'});
 for(let id=0;id<s.players.length;id++){const delta=s.transactions.reduce((n,t)=>n+(t.to===id?t.amount:0)-(t.from===id?t.amount:0),0);assert.equal(s.players[id].cash,before[id]+delta);}
 assert.equal(s.current,1);assert.equal(s.phase,'roll');assert.equal(s.players[1].cash,11800);
});
test('an in-progress legacy public auction finishes under its saved rules',()=>{
 let s=game();s.phase='auction';s.auctionQueue={tiles:[],resume:'end'};
 s.auction={tile:1,active:[0,1,2,3],bidder:1,highestBid:1100,highestBidder:0,minimum:1100,increment:100};
 s=JSON.parse(JSON.stringify(s));
 for(const actor of [1,2,3])s=transition(s,{type:'AUCTION_PASS',actor});
 assert.equal(s.phase,'end');assert.equal(s.properties[1].owner,0);assert.equal(s.players[0].cash,10900);
});
test('sealed validation rejects invalid amounts and unknown actors without changing state',()=>{
 let s=game();s.players[0].pos=1;s=auction(s);
 for(const amount of [0,-1,1000,1100.5,NaN,Infinity,'1200',13000])assert.equal(transition(s,{type:'AUCTION_BID',actor:0,amount}),s);
 assert.equal(transition(s,{type:'AUCTION_PASS',actor:99}),s);
 assert.equal(transition(s,{type:'AUCTION_BID',actor:0,amount:1200,auctionId:'obsolete'}),s);
});

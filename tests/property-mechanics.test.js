import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,rent,worth,owned,mortgaged,upgradeSpent,purchaseQuote,mortgageValue,aiAction,decisionPlayer} from '../src/game.js';
import {validRosterSave} from '../src/players.js';
const act=(s,type,fields={})=>transition(s,{type,...fields});
function visit(owner=1,level=1,spent=500){const s=initialState();s.properties[1]={owner,level,upgradeSpent:spent};return act(s,'ROLL',{value:1});}
test('landing defers rent, blocks ending, and only one proposal is allowed after refusal',()=>{
 let s=visit();assert.equal(s.phase,'rent');assert.equal(s.players[0].cash,12000);assert.deepEqual(s.transactions,[]);assert.equal(act(s,'END'),s);
 s=act(s,'OFFER');assert.equal(s.offer.price,2700);assert.equal(decisionPlayer(s),1);assert.equal(act(s,'OFFER_REPLY',{actor:0,accept:true}),s);
 s=act(s,'OFFER_REPLY',{actor:1,accept:false});assert.equal(s.phase,'rent');assert.equal(s.players[0].cash,12000);assert.equal(act(s,'OFFER'),s);
 s=act(s,'PAY_RENT');assert.equal(s.phase,'end');assert.equal(s.players[0].cash,12000-704);assert.equal(s.players[1].cash,12000+704);assert.equal(act(s,'PAY_RENT'),s);
});
test('consented purchase preserves buildings and transfers the price without charging rent',()=>{
 let s=act(visit(),'OFFER');s=act(s,'OFFER_REPLY',{actor:1,accept:true});
 assert.equal(s.properties[1].owner,0);assert.equal(s.properties[1].level,1);assert.equal(s.properties[1].upgradeSpent,500);
 assert.deepEqual(s.transactions,[{from:0,to:1,amount:2700,label:'收购北京'}]);assert.equal(s.players[0].cash,9300);assert.equal(s.players[1].cash,14700);assert.equal(s.pendingRent,undefined);assert.equal(s.offer,undefined);assert.equal(act(s,'OFFER_REPLY',{actor:1,accept:true}),s);
 const low=visit();low.players[0].cash=100;assert.equal(act(low,'OFFER'),low);
});
test('actual subsidized upgrades and legacy standard upgrades are priced consistently',()=>{
 let s=initialState();s.current=1;s.phase='upgrade';s.players[1].pos=1;s.players[1].subsidy=true;s.properties[1]={owner:1,level:0};
 s=act(s,'UPGRADE');assert.equal(upgradeSpent(s,1),280);assert.equal(purchaseQuote(s,1),2480);assert.equal(mortgageValue(s,1),1380);
 const old=initialState();old.properties[1]={owner:0,level:2};assert.equal(upgradeSpent(old,1),2200);assert.equal(mortgageValue(old,1),3300);
});
function rescued(){let s=initialState();s.players[0].cash=10;s.properties[1]={owner:1,level:2};s.properties[3]={owner:0,level:1,upgradeSpent:500};s=act(s,'ROLL',{value:1});return act(s,'PAY_RENT');}
test('mortgage funds debt without overpaying the creditor or inflating net assets',()=>{
 let s=rescued();const net=worth(s,0);assert.equal(s.debt.amount,1056);assert.equal(s.players[1].cash,12000);
 assert.equal(act(s,'BANKRUPT'),s);assert.equal(act(s,'SETTLE_DEBT'),s);assert.equal(act(s,'MORTGAGE',{tile:1}),s);
 s=act(s,'MORTGAGE',{tile:3});assert.equal(s.players[0].cash,1310);assert.equal(s.properties[3].owner,'bank');assert.equal(s.properties[3].mortgagor,0);assert.equal(s.properties[3].mortgageAmount,1300);assert.equal(s.properties[3].level,1);assert.equal(worth(s,0),net);assert.equal(rent(s,3),0);assert.equal(act(s,'MORTGAGE',{tile:3}),s);
 s=act(s,'SETTLE_DEBT');assert.equal(s.players[0].cash,254);assert.equal(s.players[1].cash,13056);assert.equal(worth(s,0),net);assert.equal(s.phase,'end');assert.deepEqual(owned(s,0),[]);assert.deepEqual(mortgaged(s,0),[3]);assert.equal(s.debt,undefined);
});
test('bank-held property cannot be rented, purchased, upgraded or offered; only its mortgagor can redeem',()=>{
 let s=act(rescued(),'MORTGAGE',{tile:3});s=act(s,'SETTLE_DEBT');assert.equal(act(s,'REDEEM',{tile:3}),s);
 let visitor=structuredClone(s);visitor.current=2;visitor.players[2].pos=2;visitor.phase='roll';visitor=act(visitor,'ROLL',{value:1});assert.equal(visitor.phase,'end');assert.deepEqual(visitor.transactions,[]);
 for(const type of ['BUY','UPGRADE','OFFER','REDEEM'])assert.equal(act(visitor,type,{tile:3}),visitor);
 s.players[0].cash=1800;const net=worth(s,0);s=act(s,'REDEEM',{tile:3});assert.equal(s.players[0].cash,500);assert.equal(s.properties[3].owner,0);assert.equal(s.properties[3].mortgageAmount,undefined);assert.equal(s.properties[3].level,1);assert.equal(worth(s,0),net);assert.ok(rent(s,3)>0);assert.equal(act(s,'REDEEM',{tile:3}),s);
});
test('mortgaged city breaks the group rent bonus and regains it after redemption',()=>{
 let s=initialState();for(const i of [1,3,9])s.properties[i]={owner:0,level:0};const full=rent(s,1);s.phase='debt';s.debt={amount:20000,to:'bank',label:'测试费用'};s=act(s,'MORTGAGE',{tile:3});assert.ok(rent(s,1)<full);
 s.phase='roll';delete s.debt;s=act(s,'REDEEM',{tile:3});assert.equal(rent(s,1),full);
});
test('bankruptcy pays only remaining cash and returns all collateral to the public market',()=>{
 let s=initialState();s.players[0].cash=0;s.properties[1]={owner:1,level:3};s.properties[3]={owner:0,level:0};s.properties[4]={owner:'bank',mortgagor:0,mortgageAmount:900,level:0};
 s=act(act(s,'ROLL',{value:1}),'PAY_RENT');s=act(s,'MORTGAGE',{tile:3});assert.equal(s.players[0].cash,800);s=act(s,'BANKRUPT');assert.equal(s.players[0].bankrupt,true);assert.equal(s.players[0].cash,0);assert.equal(s.players[1].cash,12800);assert.deepEqual(Object.keys(s.properties),['1']);assert.deepEqual(s.journal[0].released,[3,4]);assert.equal(s.journal[0].category,'bankruptcy');assert.match(s.journal[0].text,/重新进入市场/);
 s=act(s,'END');s.players[s.current].pos=2;s=act(s,'ROLL',{value:1});assert.equal(s.phase,'buy');s=act(s,'BUY');assert.equal(s.properties[3].level,0);assert.equal(s.properties[3].owner,1);
});
test('negative chance expense waits for collateral before any debit',()=>{
 let s=initialState();s.eventDeck=['souvenir_spree'];s.players[0].cash=100;s.properties[3]={owner:0,level:0};s=act(s,'ROLL',{value:2});s=act(s,'DRAW_EVENT',{index:0});s=act(s,'RESOLVE_EVENT',{seed:.2});assert.equal(s.phase,'debt');assert.equal(s.debt.to,'bank');assert.equal(s.debt.amount,500);assert.equal(s.players[0].cash,100);assert.deepEqual(s.transactions,[]);
});
test('pending rent, consent and debt survive JSON saves; AI handles every new decision',()=>{
 const states=[visit(),act(visit(),'OFFER'),rescued()];for(const s of states){const saved=JSON.parse(JSON.stringify(s));assert.ok(validRosterSave(saved));assert.deepEqual(saved,s);assert.notEqual(transition(saved,aiAction(saved,()=>.9)),saved);}
 let incoming=initialState();incoming.current=1;incoming.properties[1]={owner:0,level:0};incoming=act(incoming,'ROLL',{value:1});incoming=act(incoming,'OFFER');assert.equal(decisionPlayer(incoming),0);assert.equal(aiAction(incoming).actor,0);
});

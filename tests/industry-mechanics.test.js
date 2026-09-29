import test from 'node:test';
import assert from 'node:assert/strict';
import * as game from '../src/game.js';
import {INDUSTRIES,quoteIndustry} from '../src/industries.js';
import {getTiles,generateMap,shuffleCityMap} from '../src/board.js';
import {eventChoices,eventDestinations} from '../src/eventOptions.js';
import {loadGame,saveGame} from '../src/gameStorage.js';
const act=(s,type,fields={})=>game.transition(s,{type,...fields});
const idx=(s,id)=>getTiles(s).findIndex(t=>t.industryId===id);
const own=(s,id,owner=0)=>{s.properties[idx(s,id)]={owner,level:0};return s;};
function visit(id,s=game.initialState(),dice=1){const to=idx(s,id);assert.ok(to>0);s.players[s.current].pos=(to-dice+getTiles(s).length)%getTiles(s).length;return act(s,'ROLL',{value:dice});}
function event(id,s=game.initialState()){s.eventDeck=[id];s.players[s.current].pos=1;return act(act(act(s,'ROLL',{value:1,eventSeed:.3}),'DRAW_EVENT',{index:0}),'RESOLVE_EVENT',{seed:.3});}
const quote=(id,ownedIds=[id],extra={})=>quoteIndustry(id,{dice:4,round:3,visitorCities:2,ownedIds,...extra});
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const db=()=>({data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);},removeItem(k){this.data.delete(k);}});
test('five distinct purchasable industries replace fixed stations while all city indices remain stable',()=>{
 assert.equal(INDUSTRIES.length,5);assert.ok(Object.isFrozen(INDUSTRIES));assert.ok(INDUSTRIES.every(Object.isFrozen));
 const expected={railway:1800,airline:2400,shipping:2000,space:3000,utility:2200};for(const record of INDUSTRIES){assert.equal(record.price,expected[record.id]);for(const key of ['name','shortName','asset','color','rule'])assert.ok(record[key]);}
 for(const size of [20,28,36]){const s=game.initialState(undefined,generateMap('mixed',size,rng(1))),tiles=getTiles(s);assert.equal(tiles.length,size);assert.equal(tiles.filter(t=>t.type==='city').length,size-8);assert.equal(tiles.filter(t=>t.type==='industry').length,5);for(const [index,id] of [[6,'railway'],[10,'shipping'],[13,'airline'],[16,'space'],[18,'utility']]){assert.equal(tiles[Math.floor(index*size/20)].type,'industry');assert.equal(tiles[Math.floor(index*size/20)].industryId,id);}assert.equal(tiles.some(t=>['shop','rest','festival','rail'].includes(t.type)),false);}
 assert.deepEqual(getTiles(game.initialState()).flatMap((t,i)=>t.type==='city'?[i]:[]),[1,3,4,5,7,9,11,12,14,15,17,19]);
});
test('independent quote formulas cover all five industries and dynamic limits',()=>{
 assert.equal(quote('railway').amount,200);assert.equal(quote('railway',['railway','airline']).amount,400);assert.equal(quote('railway',['railway','airline','shipping']).amount,800);assert.equal(quote('railway',['railway','utility','space']).amount,200);
 assert.equal(quote('airline').amount,400);assert.equal(quote('airline',['airline','railway']).amount,600);assert.equal(quote('airline',['airline','shipping']).amount,400);
 assert.equal(quote('shipping').amount,360);assert.equal(quote('shipping',['shipping','utility']).amount,540);assert.equal(quote('shipping',['shipping'],{visitorCities:99}).amount,1000);assert.equal(quote('shipping',['shipping','utility'],{visitorCities:10}).amount,1500);
 assert.equal(quote('space').amount,400);assert.equal(quote('space',['space','airline']).amount,600);assert.equal(quote('space',['space'],{round:20}).amount,1250);
 assert.equal(quote('utility').amount,320);assert.equal(quote('utility',['utility','railway']).amount,400);assert.equal(quote('utility',Object.keys({railway:1,airline:1,shipping:1,space:1,utility:1})).amount,640);
 for(const record of INDUSTRIES){const q=quote(record.id);assert.ok(Number.isFinite(q.base));assert.ok(q.basis);assert.ok(Array.isArray(q.bonuses));assert.ok(Array.isArray(q.links));}
});
test('purchasing each industry records ownership without upgrading or granting old station rewards',()=>{
 for(const record of INDUSTRIES){let s=visit(record.id);assert.equal(s.phase,'buy');assert.equal(s.players[0].cash,12000);assert.deepEqual(s.transactions,[]);s=act(s,'BUY');assert.equal(s.properties[idx(s,record.id)].owner,0);assert.equal(s.properties[idx(s,record.id)].level,0);assert.equal(s.players[0].cash,12000-record.price);assert.equal(game.worth(s,0),12000);assert.equal(act(s,'BUY'),s);const after=visit(record.id,{...s,phase:'roll'});assert.equal(after.phase,'end');assert.equal(act(after,'UPGRADE'),after);}
});
test('industry operating ownership is separate from city ownership but counts in assets',()=>{
 const s=game.initialState();s.properties[1]={owner:0,level:1,upgradeSpent:500};own(s,'railway');own(s,'airline');const ship=idx(s,'shipping');s.properties[ship]={owner:'bank',mortgagor:0,mortgageAmount:1000,level:0};
 assert.deepEqual(game.owned(s,0),[1]);assert.deepEqual(new Set(game.ownedIndustries(s,0)),new Set([idx(s,'railway'),idx(s,'airline')]));assert.deepEqual(new Set(game.ownedAssets(s,0)),new Set([1,idx(s,'railway'),idx(s,'airline')]));assert.deepEqual(new Set(game.holdings(s,0)),new Set([1,idx(s,'railway'),idx(s,'airline'),ship]));assert.ok(game.mortgaged(s,0).includes(ship));
 assert.equal(game.propertyValue(s,ship),2000);assert.equal(game.propertyEquity(s,0),3300+1800+2400+1000);
});
test('service fee snapshots use actual dice and exclude seasons, city groups and investor bonuses',()=>{
 for(const owner of [1,2])for(const round of [1,5,9]){
  const s=game.initialState();s.round=round;own(s,'airline',owner);own(s,'railway',owner);s.players[0].shield=true;
  const pending=visit('airline',s,6);assert.equal(pending.phase,'rent');assert.equal(pending.pendingRent.kind,'industry');assert.equal(pending.pendingRent.amount,900);assert.equal(pending.pendingRent.pricing.amount,900);assert.equal(pending.players[0].shield,true);assert.deepEqual(pending.transactions,[]);
  const paid=act(pending,'PAY_RENT');assert.equal(paid.players[0].cash,11100);assert.equal(paid.players[owner].cash,12900);assert.equal(paid.players[0].shield,true);assert.equal(paid.transactions[0].amount,900);assert.equal(act(paid,'PAY_RENT'),paid);
 }
});
test('linked services require the same operating owner and resume after original-value redemption',()=>{
 const cases=[['railway','airline',400,200],['railway','shipping',400,200],['airline','railway',600,400],['shipping','utility',300,200],['space','airline',450,300],['utility','railway',400,320],['utility','airline',400,320],['utility','shipping',400,320],['utility','space',400,320]];
 for(const [id,link,full,cut] of cases){let s=game.initialState();s.current=1;s.dice=4;s.lastDice=4;own(s,id,1);own(s,link,1);const tile=idx(s,id),linked=idx(s,link);assert.equal(game.getIndustryQuote(s,tile,0).amount,full,`${id} + ${link}`);
  s.phase='debt';s.debt={to:'bank',amount:99999,label:'抵押测试'};s=act(s,'MORTGAGE',{tile:linked});assert.equal(game.getIndustryQuote(s,tile,0).amount,cut);s.phase='roll';delete s.debt;s=act(s,'REDEEM',{tile:linked});assert.equal(game.getIndustryQuote(s,tile,0).amount,full);s.properties[linked].owner=2;assert.equal(game.getIndustryQuote(s,tile,0).amount,cut);
 }
});
test('shipping counts only visitor unmortgaged cities and caps the visitor count at ten',()=>{
 const s=game.initialState(undefined,generateMap('world',36,rng(3)));s.current=0;own(s,'shipping',1);own(s,'utility',1);const slots=getTiles(s).flatMap((t,i)=>t.type==='city'?[i]:[]);slots.slice(0,12).forEach(i=>s.properties[i]={owner:0,level:0});own(s,'railway',0);assert.equal(game.getIndustryQuote(s,idx(s,'shipping')).amount,1500);
 slots.slice(0,5).forEach(i=>s.properties[i]={owner:'bank',mortgagor:0,mortgageAmount:500,level:0});assert.equal(game.getIndustryQuote(s,idx(s,'shipping')).amount,(200+80*7)*1.5);
});
test('unaffordable shipping service locks its debt quote even when mortgaging reduces visitor city count',()=>{
 let s=game.initialState();own(s,'shipping',1);own(s,'utility',1);s.properties[1]={owner:0,level:0};s.properties[3]={owner:0,level:0};s.players[0].cash=50;
 s=visit('shipping',s);assert.equal(s.pendingRent.amount,540);s=act(s,'PAY_RENT');assert.equal(s.phase,'debt');assert.equal(s.debt.amount,540);const net=game.worth(s,0);s=act(s,'MORTGAGE',{tile:1});assert.equal(game.getIndustryQuote(s,idx(s,'shipping')).amount,420);assert.equal(s.debt.amount,540);assert.equal(game.worth(s,0),net);s=act(s,'SETTLE_DEBT');assert.equal(s.players[0].cash,610);assert.equal(s.players[1].cash,12540);assert.equal(game.worth(s,0),net);assert.equal(s.transactions[0].amount,540);
});
test('industry collateral preserves net worth, ignores any forged upgrade value and redeems for the fixed amount',()=>{
 let s=game.initialState();own(s,'space');const i=idx(s,'space');s.properties[i].upgradeSpent=9999;s.properties[i].level=3;
 assert.equal(game.upgradeSpent(s,i),0);assert.equal(game.purchaseQuote(s,i),3000);assert.equal(game.mortgageValue(s,i),1500);assert.equal(game.propertyValue(s,i),3000);
 s.phase='debt';s.debt={to:'bank',amount:50000,label:'资金测试'};const net=game.worth(s,0);s=act(s,'MORTGAGE',{tile:i});assert.equal(s.players[0].cash,13500);assert.equal(s.properties[i].mortgageAmount,1500);assert.equal(game.worth(s,0),net);assert.equal(act(s,'MORTGAGE',{tile:i}),s);s.phase='end';delete s.debt;const before=game.worth(s,0);s=act(s,'REDEEM',{tile:i});assert.equal(s.players[0].cash,12000);assert.equal(s.properties[i].owner,0);assert.equal(game.worth(s,0),before);
});
test('industry acquisitions require owner consent including a human owner on an AI turn',()=>{
 let s=game.initialState();s.current=1;own(s,'railway',0);s=visit('railway',s);s=act(s,'OFFER');assert.equal(s.phase,'offer');assert.equal(game.decisionPlayer(s),0);assert.equal(s.offer.price,1800);assert.equal(act(s,'OFFER_REPLY',{actor:1,accept:true}),s);
 const refused=act(s,'OFFER_REPLY',{actor:0,accept:false});assert.equal(refused.phase,'rent');assert.equal(act(refused,'OFFER'),refused);const paid=act(refused,'PAY_RENT');assert.equal(paid.players[0].cash,12200);
 const accepted=act(s,'OFFER_REPLY',{actor:0,accept:true});assert.equal(accepted.properties[idx(s,'railway')].owner,1);assert.equal(accepted.properties[idx(s,'railway')].level,0);assert.equal(accepted.players[1].cash,10200);assert.equal(accepted.players[0].cash,13800);assert.equal(accepted.pendingRent,undefined);assert.equal(accepted.transactions.length,1);
});
test('bank-held industries are free and cannot be bought, upgraded or acquired',()=>{
 for(const record of INDUSTRIES){const s=game.initialState(),i=idx(s,record.id);s.properties[i]={owner:'bank',mortgagor:1,mortgageAmount:record.price/2,level:0};const after=visit(record.id,s,2);assert.equal(after.phase,'end');assert.deepEqual(after.transactions,[]);assert.equal(game.getIndustryQuote(after,i).amount,0);assert.equal(after.players[0].cash,12000);for(const type of ['BUY','UPGRADE','OFFER','REDEEM'])assert.equal(act(after,type,{tile:i}),after);}
});
test('forged upgrade phase cannot upgrade an industry or consume a building subsidy',()=>{
 for(const record of INDUSTRIES){const s=game.initialState();own(s,record.id);s.phase='upgrade';s.players[0].pos=idx(s,record.id);s.players[0].subsidy=true;const before=structuredClone(s);assert.equal(act(s,'UPGRADE'),s);assert.deepEqual(s,before);}
});
test('city event property counts and destinations exclude industries, including mortgage relief choices',()=>{
 const source=game.initialState();INDUSTRIES.forEach(record=>own(source,record.id));for(const id of ['property_inspection','rooftop_dividend']){const s=event(id,structuredClone(source));assert.equal(s.players[0].cash,12000);assert.deepEqual(s.transactions,[]);}
 assert.equal(event('fresh_start',structuredClone(source)).players[0].cash,13500);assert.equal(event('overnight_renovation',structuredClone(source)).players[0].cash,12500);
 source.properties[idx(source,'railway')]={owner:'bank',mortgagor:0,mortgageAmount:900,level:0};assert.equal(event('bank_amnesty',structuredClone(source)).players[0].cash,12500);assert.equal(event('fresh_start',structuredClone(source)).players[0].cash,13500);
 source.properties[1]={owner:0,level:0};let s=event('overnight_renovation',structuredClone(source));assert.deepEqual(eventChoices(s).map(c=>c.tile),[1]);s=event('homecoming',structuredClone(source));assert.deepEqual(eventDestinations(s),[1]);s=event('night_flight',structuredClone(source));assert.ok(eventDestinations(s).every(i=>getTiles(s)[i].type==='city'));
});
test('bankruptcy must mortgage both kinds of asset and returns every city and industry to market',()=>{
 let s=game.initialState();s.players[0].cash=0;s.properties[1]={owner:0,level:0};own(s,'railway');s.properties[idx(s,'airline')]={owner:'bank',mortgagor:0,mortgageAmount:1200,level:0};s.phase='debt';s.debt={to:1,amount:50000,label:'大额欠款'};
 assert.equal(act(s,'BANKRUPT'),s);s=act(s,'MORTGAGE',{tile:1});assert.equal(act(s,'BANKRUPT'),s);s=act(s,'MORTGAGE',{tile:idx(s,'railway')});assert.equal(s.players[0].cash,2000);s=act(s,'BANKRUPT');assert.equal(s.players[0].bankrupt,true);assert.equal(s.players[1].cash,14000);assert.deepEqual(s.properties,{});assert.deepEqual(new Set(s.journal[0].released),new Set([1,6,13]));
});
test('map shuffles keep industries and their mortgages fixed while relocating city ownership',()=>{
 for(const size of [20,28,36]){let s=game.initialState(undefined,generateMap('mixed',size,rng(5)));for(const record of INDUSTRIES)own(s,record.id,1);const railroad=idx(s,'railway');s.properties[railroad]={owner:'bank',mortgagor:0,mortgageAmount:900,level:0};s.players[0].pos=railroad;s.properties[1]={owner:0,level:2};const cityId=getTiles(s)[1].cityId;const out={...s,...shuffleCityMap(s,.4,'rotate')};for(const record of INDUSTRIES){const tile=idx(s,record.id);assert.deepEqual(getTiles(out)[tile],getTiles(s)[tile]);assert.deepEqual(out.properties[tile],s.properties[tile]);}assert.equal(out.players[0].pos,railroad);assert.equal(out.properties[getTiles(out).findIndex(t=>t.cityId===cityId)].level,2);}
});
test('industry rent/debt/offer and old pending shop cards survive saves; reset retains layout and clears assets',()=>{
 const store=db();let s=game.initialState();own(s,'utility',1);s=visit('utility',s,3);for(const state of [s,act(s,'OFFER')]){saveGame(store,state);assert.deepEqual(loadGame(store),state);}s.players[0].cash=0;s=act(s,'PAY_RENT');saveGame(store,s);assert.deepEqual(loadGame(store),s);
 const old=game.initialState();old.players[0].pos=13;old.phase='draw';old.eventDraw={source:'shop',offerIds:['pocket_compass','lucky_umbrella','toolbox_drop']};saveGame(store,old);const restored=loadGame(store);let done=act(restored,'DRAW_EVENT',{index:0});done=act(done,'RESOLVE_EVENT',{seed:.2});assert.equal(done.phase,'end');assert.equal(done.players[0].cards.dice,3);assert.equal(getTiles(done)[13].type,'industry');
 const reset=game.initialState(s.players,s.map,s.eventDeck);assert.deepEqual(reset.properties,{});assert.deepEqual(reset.map,s.map);assert.equal(getTiles(reset).filter(t=>t.type==='industry').length,5);
});
test('AI buys industries, funds service debt with industrial collateral and finishes twenty-player matches',()=>{
 let s=visit('airline');assert.equal(game.aiAction(s,()=>.2).type,'BUY');s=game.initialState();s.current=1;s.players[1].cash=0;own(s,'railway',1);own(s,'space',2);s=visit('space',s);s=act(s,'PAY_RENT');let steps=0;while(s.phase==='debt'&&steps++<10){const next=game.transition(s,game.aiAction(s,()=>.2));assert.notEqual(next,s);s=next;}assert.equal(s.phase,'end');assert.ok(s.players[1].cash>=0);
 for(let seed=1;seed<=3;seed++){let state=game.initialState(Array.from({length:20},(_,i)=>({name:`玩家${i}`}))),random=rng(seed),turns=0;while(state.phase!=='finished'&&turns++<6000){const next=game.transition(state,game.aiAction(state,random));assert.notEqual(next,state,`simulation stuck at ${state.phase}`);state=next;assert.ok(state.players.every(p=>p.cash>=0&&Number.isFinite(p.cash)));for(const [i,property] of Object.entries(state.properties))if(getTiles(state)[i].type==='industry')assert.equal(property.level,0);}assert.equal(state.phase,'finished');assert.equal(game.worth(state,state.winner),Math.max(...state.players.map((_,i)=>game.worth(state,i))));}
});

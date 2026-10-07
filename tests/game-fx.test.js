import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition} from '../src/game.js';
import {detectFx,seasonIndex,BIG_RENT} from '../src/gameFx.js';
const act=(s,type,fields={})=>transition(s,{type,...fields});
const types=fx=>fx.map(f=>f.type);

test('purchase, upgrade and turn change are detected from real transitions',()=>{
 let s=act(initialState(),'ROLL',{value:1});assert.equal(s.phase,'buy');
 let next=act(s,'BUY');assert.deepEqual(detectFx(s,next),[{type:'buy',tile:1,player:0}]);
 const ended=act(next,'END');assert.deepEqual(detectFx(next,ended),[{type:'turn',player:1,round:1}]);
 const up=initialState();up.properties[1]={owner:0,level:0,upgradeSpent:0};const landed=act(up,'ROLL',{value:1});assert.equal(landed.phase,'upgrade');
 const upgraded=act(landed,'UPGRADE');assert.deepEqual(detectFx(landed,upgraded),[{type:'upgrade',tile:1,player:0,level:2}]);
});

test('rent, takeover and start bonus carry amounts and tiles',()=>{
 const s=initialState();s.properties[1]={owner:1,level:3,upgradeSpent:3000};const landed=act(s,'ROLL',{value:1});
 const paid=act(landed,'PAY_RENT'),rent=detectFx(landed,paid).find(f=>f.type==='rent');
 assert.equal(rent.tile,1);assert.equal(rent.from,0);assert.equal(rent.to,1);assert.equal(rent.big,rent.amount>=BIG_RENT);assert.ok(rent.amount>0);
 const offered=act(act(landed,'OFFER'),'OFFER_REPLY',{actor:1,accept:true});
 assert.deepEqual(detectFx(act(landed,'OFFER'),offered),[{type:'takeover',tile:1,player:0,from:1}]);
 const lap=initialState();lap.players[0].pos=19;const passed=act(lap,'ROLL',{value:2});
 assert.ok(detectFx(lap,passed).some(f=>f.type==='start-bonus'&&f.player===0&&f.amount>0));
});

test('season, bankruptcy and finale are reported once; shuffles and no-ops are ignored',()=>{
 const a=initialState();a.round=4;a.current=3;const b=structuredClone(a);b.round=5;b.current=0;
 assert.deepEqual(types(detectFx(a,b)),['season','turn']);assert.equal(seasonIndex(b),1);
 const c=structuredClone(a);c.properties[1]={owner:2,level:1};const d=structuredClone(c);d.players[2].bankrupt=true;delete d.properties[1];
 assert.deepEqual(detectFx(c,d),[{type:'bankrupt',player:2,tiles:[1]}]);
 const e=structuredClone(c);e.phase='finished';e.winner=0;assert.deepEqual(detectFx(c,e),[{type:'finale',winner:0}]);
 const shuffled=structuredClone(c);shuffled.map={...(shuffled.map||{}),cityOrder:['shanghai']};shuffled.properties={5:{owner:2,level:1}};
 assert.ok(!detectFx(c,shuffled).some(f=>f.type==='buy'));
 assert.deepEqual(detectFx(c,c),[]);assert.deepEqual(detectFx(null,c),[]);
});

test('item cards spent by any seat are reported with the chosen dice value',()=>{
 const s=initialState();s.current=1;s.players[1].cards={dice:1,shield:0,build:0};
 const used=act(s,'CARD',{card:'dice',value:4,actor:1});
 assert.deepEqual(detectFx(s,used),[{type:'item',player:1,card:'dice',value:4}]);
});

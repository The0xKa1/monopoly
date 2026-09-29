import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultAppearance,normalizeAppearance,renderAvatar,applyAppearance,migrateAppearances,APPEARANCE_OPTIONS} from '../src/appearance.js';
import {initialState,transition} from '../src/game.js';
test('old saves receive editable appearances without changing finance or positions',()=>{
 const s=initialState();for(const p of s.players)delete p.appearance;
 s.players[0].pos=7;s.players[0].cash=8765;s.properties={4:{owner:0,level:2}};
 const migrated=migrateAppearances(s);
 assert.equal(s.players[0].appearance,undefined);
 for(const [id,p] of migrated.players.entries())assert.deepEqual(p.appearance,defaultAppearance(id));
 const originalShape=structuredClone(migrated);for(const p of originalShape.players)delete p.appearance;
 assert.deepEqual(originalShape,s);
});
test('appearance values are allowlisted and unknown fields are discarded',()=>{
 const a=normalizeAppearance({skin:'<script>',shirt:'red',cash:999999,hair:null},2);
 assert.deepEqual(a,{...defaultAppearance(2),shirt:'red'});
 for(const value of [null,undefined,'bad',[],123])assert.deepEqual(normalizeAppearance(value),defaultAppearance());
});
test('cosmetic update cannot modify economic state or another player',()=>{
 const s=initialState();s.transactions=[{from:0,to:1,amount:300}];s.phase='finished';
 const result=applyAppearance(s,0,{...defaultAppearance(),shirt:'pink',cash:999});
 assert.equal(s.players[0].appearance.shirt,'green');assert.equal(result.players[0].appearance.shirt,'pink');
 result.players[0].appearance=s.players[0].appearance;
 assert.deepEqual(result,s);assert.strictEqual(applyAppearance(s,9,{}),s);
});
test('changing appearance has no effect on movement or economic results',()=>{
 const a=initialState(),b=applyAppearance(a,0,{...defaultAppearance(),hat:'cap',shirt:'red'});
 a.players[0].pos=19;b.players[0].pos=19;
 const x=transition(a,{type:'ROLL',value:2}),y=transition(b,{type:'ROLL',value:2});
 for(const p of x.players)delete p.appearance;for(const p of y.players)delete p.appearance;
 assert.deepEqual(x,y);
});
test('each appearance choice and walking frame changes the generated sprite',()=>{
 const base=defaultAppearance(),svg=renderAvatar(base);
 for(const [key,options] of Object.entries(APPEARANCE_OPTIONS))for(const [value] of options){
  if(base[key]!==value)assert.notEqual(renderAvatar({...base,[key]:value}),svg,`${key}: ${value}`);
 }
 assert.notEqual(renderAvatar(base,0),renderAvatar(base,1));
 assert.notEqual(svg,renderAvatar(base,0));assert.doesNotMatch(renderAvatar({shirt:'<script>'}),/<script/);
});

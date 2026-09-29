import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,transition,aiAction,worth} from '../src/game.js';
import {addPlayer,mergePendingPlayers,validRosterSave,MAX_PLAYERS} from '../src/players.js';
const fullRoster=()=>{let s=initialState();while(s.players.length<MAX_PLAYERS)s=addPlayer(s,{name:`玩家${s.players.length+1}`,appearance:{shirt:'red'}}).state;return s;};
test('append up to twenty, validate nicknames, preserve the existing match',()=>{
 const s=initialState();s.players[0].cash=9000;s.properties[1]={owner:0,level:2};
 const {state:next}=addPlayer(s,{name:'  新角色  ',appearance:{hair:'long'}});
 assert.equal(s.players.length,4);assert.deepEqual(next.players.slice(0,4),s.players);assert.deepEqual(next.properties,s.properties);
 assert.equal(next.players[4].name,'新角色');assert.equal(next.players[4].cash,12000);assert.equal(next.players[4].appearance.hair,'long');
 for(const name of ['', '小满','1234567890123','a\nb'])assert.ok(addPlayer(s,{name}).error);
 assert.ok(addPlayer(fullRoster(),{name:'第21位'}).error);assert.ok(addPlayer({...s,phase:'finished'},{name:'新角色'}).error);
});
test('twenty-player turn sequence includes every player, skips bankruptcy, and wraps only after the last',()=>{
 let s=fullRoster();for(let id=0;id<20;id++){assert.equal(s.current,id);assert.equal(s.round,1);s.phase='end';s=transition(s,{type:'END'});}
 assert.equal(s.current,0);assert.equal(s.round,2);
 s.current=18;s.phase='end';s.players[19].bankrupt=true;s.players[0].bankrupt=true;
 s=transition(s,{type:'END'});assert.equal(s.current,1);assert.equal(s.round,3);
 s.round=20;s.current=18;s.phase='end';s=transition(s,{type:'END'});assert.equal(s.phase,'finished');assert.equal(s.round,20);
});
test('new-player property purchase and rent record the correct owner and wallet',()=>{
 let s=fullRoster();s.current=19;s=transition(s,{type:'ROLL',value:1});s=transition(s,{type:'BUY'});
 assert.equal(s.properties[1].owner,19);assert.equal(s.players[19].cash,9800);
 s.current=18;s.phase='roll';s=transition(s,{type:'ROLL',value:1});s=transition(s,{type:'PAY_RENT'});assert.equal(s.transactions[0].to,19);assert.equal(s.players[19].cash,10152);
});
test('reset preserves all identities but clears bankruptcy, cards, finances and positions',()=>{
 const s=fullRoster();s.players[19].cash=0;s.players[19].pos=12;s.players[19].bankrupt=true;s.players[19].shield=true;s.players[19].cards.dice=5;
 const fresh=initialState(s.players);assert.equal(fresh.players.length,20);
 fresh.players.forEach((p,i)=>{assert.equal(p.name,s.players[i].name);assert.deepEqual(p.appearance,s.players[i].appearance);assert.equal(p.cash,12000);assert.equal(p.pos,0);assert.ok(!p.bankrupt);assert.ok(!p.shield);});
 assert.equal(fresh.players[19].cards.dice,0);assert.equal(fresh.players[0].cards.dice,2);
});
test('pending move preserves additions and newer appearance without overwriting economic result',()=>{
 const start=initialState(),pending=transition(start,{type:'ROLL',value:6}),latest=addPlayer(start,{name:'新角色'}).state;
 latest.players[0].appearance.hair='long';const merged=mergePendingPlayers(pending.players,latest.players);
 assert.equal(merged.length,5);assert.equal(merged[0].cash,12000);assert.equal(merged[0].pos,6);assert.equal(merged[0].appearance.hair,'long');assert.equal(merged[4].name,'新角色');
});
test('saved twenty-player games reload and invalid roster bounds are rejected',()=>{
 assert.ok(validRosterSave(initialState()));assert.ok(validRosterSave(JSON.parse(JSON.stringify(fullRoster()))));
 const s=fullRoster();s.current=19;assert.ok(validRosterSave(s));s.current=20;assert.ok(!validRosterSave(s));s.current=0;s.players.push(s.players[0]);assert.ok(!validRosterSave(s));
});
test('twenty-player seeded full games reach a valid settlement',()=>{
 for(let seed=1;seed<=5;seed++){let s=fullRoster(),n=seed,count=0;const random=()=>((n=(n*1664525+1013904223)>>>0)/2**32);
 while(s.phase!=='finished'&&count++<5000){s=transition(s,aiAction(s,random));for(const p of s.players)assert.ok(Number.isFinite(p.cash)&&p.cash>=0);}
 assert.equal(s.phase,'finished');assert.equal(worth(s,s.winner),Math.max(...s.players.map((_,i)=>worth(s,i))));}
});

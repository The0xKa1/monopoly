// Offline, blind-card AI self-play. Never connects to or mutates a live room.
import {mkdir,writeFile} from 'node:fs/promises';
import {initialState,transition,aiAction,decisionPlayer} from '../src/game.js';
import {generateMap} from '../src/board.js';
const seeds = Number(process.env.SEEDS || 20);
const maxRounds = Number(process.env.MAX_ROUNDS || 300);
const randomFor = seed => {let value=seed>>>0;return ()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/2**32;};};
const runs=[];
for(let seed=1;seed<=seeds;seed++){
 const random=randomFor(seed), roster=Array.from({length:10},(_,i)=>({name:`玩家${i+1}`,kind:'ai'}));
 let s=initialState(roster,generateMap('classic',20,random),undefined,{roundLimit:null});
 s.multiplayer=true;s.players.forEach(p=>{p.cards={dice:2,shield:1,build:1};});
 let steps=0,bankIn=0,bankOut=0;const bankruptcies=[],rounds=[],counts={};let failure=null;
 while(s.phase!=='finished'&&s.round<=maxRounds&&steps<200000){
  const actor=decisionPlayer(s), a=s.phase==='draw'?{type:'DRAW_EVENT',index:Math.floor(random()*s.eventDraw.offerIds.length)}:aiAction(s,random);
  a.actor=actor;counts[a.type]=(counts[a.type]||0)+1;
  const next=transition(s,a);steps++;
  if(next===s){failure={phase:s.phase,round:s.round,actor,action:a};break;}
  const before=s.players.reduce((v,p)=>v+p.cash,0),after=next.players.reduce((v,p)=>v+p.cash,0);
  // Net cash only: do not label this a full gross bank ledger.
  bankIn+=Math.max(0,after-before);bankOut+=Math.max(0,before-after);
  next.players.forEach((p,i)=>{if(p.bankrupt&&!s.players[i].bankrupt)bankruptcies.push({seat:i,round:next.round});});
  if(next.round!==s.round)rounds.push({round:next.round,alive:next.players.filter(p=>!p.bankrupt).length,cash:after});
  s=next;
 }
 runs.push({seed,finished:s.phase==='finished',round:s.round,alive:s.players.filter(p=>!p.bankrupt).length,cash:s.players.reduce((v,p)=>v+p.cash,0),steps,netPositiveActionCash:bankIn,netNegativeActionCash:bankOut,bankruptcies,counts,failure,rounds});
}
const finished=runs.filter(r=>r.finished).map(r=>r.round).sort((a,b)=>a-b);
const report={kind:'offline blind-card AI simulation, not live multiplayer',seeds,maxRounds,finished:finished.length,min:finished[0]??null,median:finished.length?finished[Math.floor(finished.length/2)]:null,max:finished.at(-1)??null,failures:runs.filter(r=>r.failure),runs};
await mkdir('artifacts/economy-rebalance',{recursive:true});
await writeFile('artifacts/economy-rebalance/offline-balance.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,runs:undefined},null,2));
if(report.failures.length)process.exitCode=1;

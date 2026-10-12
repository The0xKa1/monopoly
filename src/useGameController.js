import {useState,useEffect,useRef,useCallback} from 'react';
import {initialState,transition,aiAction,decisionPlayer} from './game.js';
import {getEventCard} from './eventCards.js';
import {pendingBidders} from './economy.js';
import {getTiles} from './board.js';
import {addPlayer,mergePendingPlayers,renamePlayer} from './players.js';
import {applyAppearance} from './appearance.js';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export const movementPath=(from,steps,size=20)=>Array.from({length:steps},(_,i)=>(from+i+1)%size);

// Local transitions commit after arrival. Online results are already persisted
// by the server; this controller only plays them back and snaps on reconnect.
export function useGameController(load,onTick,paused=false,remote=null){
 const [game,setGame]=useState(()=>remote?.room.game||load()),[commit,setCommit]=useState(null),[motion,setMotion]=useState(null),[animating,setAnimating]=useState(false),[shownDice,setShownDice]=useState(game.dice),[finance,setFinance]=useState(null),[mapMotion,setMapMotion]=useState(null);
 const state=useRef(game),locked=useRef(false),epoch=useRef(0),tick=useRef(onTick);
 tick.current=onTick;
 const dispatch=useCallback(async (action,authoritative)=>{
  if(locked.current)return;
  if(!authoritative&&['AUCTION_BID','AUCTION_PASS'].includes(action.type))action={...action,seed:Math.random()};
  const before=state.current,next=authoritative||transition(before,action);
  if(next===before)return;
  const token=epoch.current,isValid=()=>token===epoch.current;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  locked.current=true;setAnimating(true);
  if(action.type==='ROLL'){
   const id=before.current,from=before.players[id].pos,steps=next.dice,path=movementPath(from,steps,getTiles(before).length),to=path.at(-1);
   setMotion({player:id,from,to,path,at:from,step:0,total:steps,phase:'dice'});
   for(let i=0;i<(reduced?1:7);i++){setShownDice(Math.floor(Math.random()*6)+1);tick.current?.('dice',{step:i});await pause(reduced?40:75);if(!isValid())return;}
   setShownDice(steps);await pause(reduced?60:300);if(!isValid())return;
   for(let i=0;i<path.length;i++){
    setMotion({player:id,from,to,path,at:path[i],step:i+1,total:steps,phase:'walk'});tick.current?.('step',{step:i+1,player:id});
    await pause(reduced?90:420);if(!isValid())return;
   }
   setMotion({player:id,from,to,path,at:to,step:steps,total:steps,phase:'land'});tick.current?.('arrive',{player:id});
   await pause(reduced?100:400);if(!isValid())return;
  }
  const shuffle=action.type==='RESOLVE_EVENT'&&getEventCard(before.activeEvent?.id)?.effect.type==='shuffle';
  if(shuffle){
   const board=document.querySelector('.board'),bounds=board?.getBoundingClientRect(),offsets={};
   if(bounds)board.querySelectorAll('.tile.city').forEach(tile=>{const box=tile.getBoundingClientRect();offsets[tile.dataset.tile]={x:bounds.left+bounds.width/2-box.left-box.width/2,y:bounds.top+bounds.height/2-box.top-box.height/2};});
   setMapMotion({phase:'out',offsets});await pause(reduced?100:900);if(!isValid())return;
   setMapMotion({phase:'in',offsets});
  }
  if(action.type==='EVENT_DESTINATION'){
   const id=before.current,from=before.players[id].pos,to=next.players[id].pos;
   if(getEventCard(before.activeEvent?.id)?.effect.target==='forward'){
    const size=getTiles(before).length,steps=(to-from+size)%size||size,path=movementPath(from,steps,size);
    for(let i=0;i<path.length;i++){
     setMotion({player:id,from,to,path,at:path[i],step:i+1,total:steps,phase:'walk'});tick.current?.('step',{step:i+1,player:id});
     await pause(reduced?60:280);if(!isValid())return;
    }
    setMotion({player:id,from,to,path,at:to,step:steps,total:steps,phase:'land'});tick.current?.('arrive',{player:id});
    await pause(reduced?80:400);if(!isValid())return;
   }else{
    setMotion({player:id,from,to,path:[to],at:from,step:0,total:1,phase:'teleport'});
    await pause(reduced?80:450);if(!isValid())return;
    setMotion({player:id,from,to,path:[to],at:to,step:1,total:1,phase:'teleport'});tick.current?.('arrive',{player:id});
    await pause(reduced?80:500);if(!isValid())return;
   }
  }
  // Preserve roster additions and cosmetic edits made during movement.
  // Settings changed while animating (round limit) also survive the commit.
  const committed=authoritative?next:{...next,players:mergePendingPlayers(next.players,state.current.players),...('roundLimit' in state.current?{roundLimit:state.current.roundLimit}:{})};
  state.current=committed;setGame(committed);setCommit(c=>({prev:before,next:committed,seq:(c?.seq||0)+1}));
  if(action.type==='DRAW_EVENT'){await pause(reduced?100:800);if(!isValid())return;}
  if(shuffle){await pause(reduced?100:1000);if(!isValid())return;setMapMotion(null);}
  for(let i=0;i<(next.transactions||[]).length;i++){
   setFinance({...next.transactions[i],key:`${Date.now()}-${i}`,tile:next.players[before.current].pos});
   tick.current?.('coin',next.transactions[i]);await pause(reduced?180:next.transactions.length>4?450:1250);if(!isValid())return;
  }
  setFinance(null);setMotion(null);locked.current=false;setAnimating(false);
 },[]);
 const replaceGame=useCallback(next=>{tick.current?.('cancel');epoch.current++;locked.current=false;state.current=next;setGame(next);setMotion(null);setMapMotion(null);setFinance(null);setShownDice(next.dice||1);setAnimating(false);},[]);
 const reset=useCallback((map,rounds)=>replaceGame(initialState(state.current.players,map||state.current.map,state.current.eventDeck,{roundLimit:rounds===undefined?state.current.roundLimit:rounds})),[replaceGame]);
 const updateAppearance=useCallback((id,appearance)=>{const next=applyAppearance(state.current,id,appearance);state.current=next;setGame(next);},[]);
 const renameCharacter=useCallback((id,name)=>{const result=renamePlayer(state.current,id,name);if(result.error)return result.error;if(result.state!==state.current){state.current=result.state;setGame(result.state);}return '';},[]);
 // Round settings apply immediately, even mid-animation (dispatch would be ignored while locked).
 const setRoundLimit=useCallback(limit=>{const next=transition(state.current,{type:'SET_ROUNDS',limit});if(next!==state.current){state.current=next;setGame(next);}},[]);
 const addCharacter=useCallback(profile=>{const result=addPlayer(state.current,profile);if(result.error)return result.error;state.current=result.state;setGame(result.state);return '';},[]);
 useEffect(()=>{const bidder=pendingBidders(game).find(id=>id!==0);if(remote||paused||(game.testRun&&!['offer','contest','auction'].includes(game.phase))||animating||(game.auction?.mode==='sealed'?bidder===undefined:decisionPlayer(game)===0)||game.phase==='finished')return;const timer=setTimeout(()=>{const next=structuredClone(state.current);if(next.auction?.mode==='sealed'){next.auction.active=[bidder,...next.auction.active.filter(id=>id!==bidder)];next.auction.bids={};}dispatch(aiAction(next));},game.phase==='event'?2200:['draw','event-destination','event-choice'].includes(game.phase)?1200:game.phase==='roll'?800:650);return()=>clearTimeout(timer);},[game,animating,dispatch,paused,!!remote]);

 const playbackVersion=useRef(remote?.room.version??0),queue=useRef([]),draining=useRef(false),generation=useRef(0);
 useEffect(()=>{
  if(!remote?.room.game)return;
  if(remote.resetKey!==generation.current){
   generation.current=remote.resetKey;queue.current=[];draining.current=false;
   playbackVersion.current=remote.room.version;replaceGame(remote.room.game);return;
  }
  if(remote.room.version<=playbackVersion.current)return;
  playbackVersion.current=remote.room.version;
  queue.current.push({game:remote.room.game,action:remote.action});
  if(draining.current)return;
  draining.current=true;const run=generation.current;
  (async()=>{
   while(queue.current.length&&run===generation.current){
    const next=queue.current.shift();
    if(next.action)await dispatch(next.action,next.game);else replaceGame(next.game);
   }
   if(run===generation.current)draining.current=false;
  })();
 },[remote?.room.version,remote?.resetKey,dispatch,replaceGame]);
 useEffect(()=>()=>{epoch.current++;generation.current++;queue.current=[];},[]);
 const send=action=>{if(!locked.current&&!draining.current)remote.send({type:'action',action});};
 return {game,commit,renameCharacter,setRoundLimit,motion,mapMotion,animating,shownDice,finance,dispatch:remote?send:dispatch,reset,replaceGame,updateAppearance,addCharacter};
}

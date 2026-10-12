import {initialState,transition,decisionPlayer,aiAction} from '../src/game.js';
import {pendingBidders,canBid} from '../src/economy.js';
import {generateMap} from '../src/board.js';
import {playerNameError,MAX_PLAYERS} from '../src/players.js';
import {normalizeAppearance} from '../src/appearance.js';

export class RoomError extends Error {}
const check=(ok,message)=>{if(!ok)throw new RoomError(message);};
export const random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/2**32;
export const HUMAN_TIMEOUT=120000;
export function newRoom(code,profile,key,now=Date.now()) {
 check(!playerNameError(profile?.name,[]),playerNameError(profile?.name,[]));
 return {schema:1,code,version:1,status:'lobby',host:key,created:now,updated:now,seats:[{key,kind:'human',name:profile.name.trim(),appearance:normalizeAppearance(profile.appearance,0),ready:true}],settings:{aiCount:2,kind:'classic',size:20,rounds:20},game:null,recent:[],readyAt:now,deadline:0};
}
export function joinRoom(room,profile,key,now=Date.now()) {
 check(room.status==='lobby','对局已开始，只有原玩家可以重连');
 check(room.seats.length+room.settings.aiCount<MAX_PLAYERS,'房间已满');
 const error=playerNameError(profile?.name,room.seats);check(!error,error);
 return {...room,version:room.version+1,updated:now,seats:[...room.seats,{key,kind:'human',name:profile.name.trim(),appearance:normalizeAppearance(profile.appearance,room.seats.length),ready:false}]};
}
// Broadcast only public fields. Tokens, receipts and unrevealed card identities stay in the room.
export function publicRoom(room,online=[],viewer=null) {
 const game=room.game?structuredClone(room.game):null;
 if(game?.auction?.mode==='sealed'){const a=game.auction;a.ownBid=Number.isInteger(viewer)&&Object.hasOwn(a.bids,viewer)?a.bids[viewer]:undefined;delete a.bids;}
 if(game?.eventDraw)game.eventDraw.offerIds=game.eventDraw.offerIds.map((_,i)=>`hidden-${i}`);
 return {code:room.code,version:room.version,status:room.status,host:room.seats.findIndex(s=>s.key===room.host),settings:room.settings,seats:room.seats.map(({name,appearance,kind,ready,key})=>({name,appearance,kind,ready,online:online.includes(key)})),game,readyAt:room.readyAt,deadline:room.deadline};
}
const fields={CARD:['card','value'],ROLL:[],DRAW_EVENT:['index'],RESOLVE_EVENT:[],EVENT_CHOICE:['value'],EVENT_DESTINATION:['tile'],BUY:[],UPGRADE:[],OFFER:[],OFFER_REPLY:['accept'],CONTEST:[],CONTEST_REPLY:['accept'],AUCTION_BID:['amount','auctionId'],AUCTION_PASS:['auctionId'],PAY_RENT:[],MORTGAGE:['tile'],SETTLE_DEBT:[],BANKRUPT:[],REDEEM:['tile'],END:[]};
export function safeAction(input,actor,rng=random) {
 check(input&&Object.hasOwn(fields,input.type),'未知操作');
 const action={type:input.type,actor};
 for(const field of fields[input.type])if(input[field]!==undefined)action[field]=input[field];
 if(action.type==='ROLL'){action.value=1+Math.floor(rng()*6);action.eventSeed=rng();}
 if(['RESOLVE_EVENT','AUCTION_BID','AUCTION_PASS'].includes(action.type))action.seed=rng();
 return action;
}
// A conservative animation window lets every client finish before the next decision.
export function animationDelay(before,next,action) {
 let delay=action.type==='ROLL'?1300+next.dice*420:action.type==='EVENT_DESTINATION'?11500:action.type==='RESOLVE_EVENT'?2100:action.type==='DRAW_EVENT'?900:150;
 const count=next.transactions?.length||0;
 return delay+count*(count>4?450:1250)+250;
}
export function applyCommand(room,key,message,now=Date.now(),rng=random) {
 const seat=room.seats.findIndex(s=>s.key===key&&s.kind==='human');check(seat>=0,'身份已失效');
 check(typeof message.id==='string'&&/^[\w-]{8,80}$/.test(message.id),'操作编号无效');
 if(room.recent.some(r=>r.key===key&&r.id===message.id))return {room,duplicate:true};
 const sealed=message.type==='action'&&['AUCTION_BID','AUCTION_PASS'].includes(message.action?.type)&&canBid(room.game||{},seat)&&message.action.auctionId===room.game.auction.id;
 check(message.version===room.version||(sealed&&Number.isInteger(message.version)&&message.version<room.version),'状态已更新，请重试');
 const next=structuredClone(room);let action=null;
 const host=key===room.host;
 if(message.type==='ready'){
  check(room.status==='lobby','对局已经开始');next.seats[seat].ready=!!message.ready;
 }else if(message.type==='profile'){
  check(room.status==='lobby','请在准备大厅修改外观');
  const error=playerNameError(message.name,room.seats.filter((_,i)=>i!==seat));check(!error,error);
  next.seats[seat].name=message.name.trim();next.seats[seat].appearance=normalizeAppearance(message.appearance,seat);
  next.seats[seat].ready=false;
 }else if(message.type==='settings'){
  check(host&&room.status==='lobby','只有房主可以设置大厅');
  const {aiCount,kind,size,rounds}=message.settings||{};
  check(Number.isInteger(aiCount)&&aiCount>=0&&aiCount+room.seats.length<=MAX_PLAYERS,'AI 人数无效');
  check(['classic','china','world','mixed'].includes(kind)&&[20,28,36].includes(size),'地图设置无效');
  check(rounds===null||Number.isInteger(rounds)&&rounds>=1&&rounds<=999,'轮数无效');
  next.settings={aiCount,kind,size:kind==='classic'?20:size,rounds};
  next.seats.forEach(s=>{s.ready=s.key===room.host;});
 }else if(message.type==='kick'){
  check(host&&room.status==='lobby','只有房主可以管理大厅');
  check(Number.isInteger(message.seat)&&message.seat!==seat&&!!room.seats[message.seat],'不能移除此玩家');
  next.seats.splice(message.seat,1);
 }else if(message.type==='start'){
  check(host&&room.status==='lobby','只有房主可以开始对局');
  check(room.seats.every(s=>s.ready),'请等待所有玩家准备');
  check(room.seats.length+room.settings.aiCount>=2,'至少需要两个角色');
  for(let i=0;i<room.settings.aiCount;i++){
   let name=`电脑${i+1}`;while(next.seats.some(s=>s.name===name))name+='号';
   next.seats.push({key:`ai-${i}`,name,kind:'ai',appearance:normalizeAppearance(null,next.seats.length),ready:true});
  }
  next.game=initialState(next.seats,generateMap(room.settings.kind,room.settings.size,rng),undefined,{roundLimit:room.settings.rounds});
  // The local prototype's seat perks remain local; online starts everyone on equal terms.
  next.game.multiplayer=true;next.game.auctionSession=crypto.randomUUID();
  next.game.players.forEach(p=>{p.cards={dice:2,shield:1,build:1};});
  next.status='playing';next.readyAt=now;next.deadline=now+HUMAN_TIMEOUT;
 }else if(message.type==='lobby'){
  check(host&&room.status==='finished','结束后由房主返回大厅');
  next.seats=next.seats.filter(s=>s.kind==='human').map(s=>({...s,ready:s.key===room.host}));
  next.status='lobby';next.game=null;next.deadline=0;
 }else if(message.type==='action'){
  check(room.status==='playing','对局尚未开始或已经结束');
  check(now>=room.readyAt,'请等待动画结束');
  check(sealed||(room.game.auction?.mode!=='sealed'&&decisionPlayer(room.game)===seat),'现在不是你的决策回合');
  action=safeAction(message.action,seat,rng);
  const game=transition(room.game,action);check(game!==room.game,'当前阶段不能执行此操作');
  next.game=game;next.status=game.phase==='finished'?'finished':'playing';
  if(sealed&&game.auction?.id===room.game.auction.id&&game.phase==='auction'){next.readyAt=room.readyAt;next.deadline=room.deadline;}
  else {next.readyAt=now+animationDelay(room.game,game,action);next.deadline=next.readyAt+HUMAN_TIMEOUT;}
 }else throw new RoomError('未知房间操作');
 next.version++;next.updated=now;next.recent=[...next.recent,{key,id:message.id}].slice(-256);
 return {room:next,action};
}
export function automaticActor(room){
 const pending=pendingBidders(room.game||{});
 return pending.find(id=>room.seats[id].kind==='ai')??pending[0]??decisionPlayer(room.game);
}
export function advanceAI(room,now=Date.now(),rng=random) {
 if(room.status!=='playing'||now<room.readyAt)return {room};
 const actor=automaticActor(room);
 if(room.seats[actor].kind!=='ai'&&now<room.deadline)return {room};
 // Neither humans nor AI can inspect the backs of event cards.
 const aiGame=structuredClone(room.game);
 if(aiGame.auction?.mode==='sealed'){aiGame.auction.active=[actor,...aiGame.auction.active.filter(id=>id!==actor)];aiGame.auction.bids={};}
 const input=room.game.phase==='draw'?{type:'DRAW_EVENT',index:Math.floor(rng()*room.game.eventDraw.offerIds.length)}:aiAction(aiGame,rng);
 const action=safeAction(input,actor,rng),game=transition(room.game,action);
 check(game!==room.game,'自动行动未能推进对局');
 const continuing=room.game.auction?.mode==='sealed'&&game.phase==='auction'&&game.auction?.id===room.game.auction.id;
 const readyAt=continuing?room.readyAt:now+animationDelay(room.game,game,action);
 return {room:{...room,game,version:room.version+1,updated:now,status:game.phase==='finished'?'finished':'playing',readyAt,deadline:continuing?room.deadline:readyAt+HUMAN_TIMEOUT},action};
}

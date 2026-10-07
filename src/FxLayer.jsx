import React,{useEffect,useRef,useState} from 'react';
import {Flower2,Sun,Leaf,Snowflake,Crown,Dices,Shield,Hammer} from 'lucide-react';
import {PixelPlayer} from './PixelPlayer.jsx';
import {season,money,worth} from './game.js';
import {getTiles} from './board.js';
import {detectFx} from './gameFx.js';

// Presentation-only overlay. It reads committed state changes and draws short,
// non-blocking effects above the board; it never dispatches game actions.
const DURATION={item:1500,buy:1300,takeover:1300,upgrade:1500,rent:1200,'start-bonus':1500,turn:1150,season:3400,bankrupt:2000,finale:5200};
const SEASON_ICONS=[Flower2,Sun,Leaf,Snowflake];
const reducedMotion=()=>typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const rand=(a,b)=>a+Math.random()*(b-a);
const rectOf=el=>{const r=el?.getBoundingClientRect();return r&&r.width>0?{x:r.left,y:r.top,w:r.width,h:r.height}:null;};
const tileRect=i=>rectOf(document.querySelector(`.board [data-tile="${i}"]`));
const boardRect=()=>rectOf(document.querySelector('.board'))||{x:0,y:0,w:innerWidth,h:innerHeight};
const tokenRect=id=>rectOf(document.querySelector(`.board [data-token="${id}"]`));
const bump=(el,frames,options)=>{try{el?.animate?.(frames,options);}catch{/* cosmetic only */}};
const box=r=>({left:r.x,top:r.y,width:r.w,height:r.h});

function burst(n,{spread=90,lift=70,fall=60,colors}){
 return Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2+rand(-.3,.3),d=rand(.45,1)*spread;
  return {dx:Math.cos(a)*d,dy:Math.sin(a)*d*.6-lift*rand(.5,1),fall:rand(.6,1.2)*fall,rot:rand(-540,540),c:colors[i%colors.length],delay:rand(0,90),s:rand(.7,1.3)};});
}
const particleStyle=p=>({'--dx':`${p.dx}px`,'--dy':`${p.dy}px`,'--fall':`${p.fall}px`,'--rot':`${p.rot}deg`,'--c':p.c,'--delay':`${p.delay}ms`,'--s':p.s});

export function FxLayer({commit,game,play,onFinale}){
 const [items,setItems]=useState([]),seen=useRef(0),timers=useRef(new Set());
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);timers.current.clear();},[]);
 const later=(fn,ms)=>{const t=setTimeout(()=>{timers.current.delete(t);fn();},ms);timers.current.add(t);};
 useEffect(()=>{
  if(!commit||commit.seq===seen.current)return;seen.current=commit.seq;
  const list=detectFx(commit.prev,commit.next);
  if(!list.length)return;
  if(reducedMotion()){const finale=list.find(f=>f.type==='finale');if(finale)later(()=>onFinale?.(),300);return;}
  const state=commit.next,tiles=getTiles(state),spawned=[];
  list.forEach((fx,order)=>{
   const id=`${commit.seq}-${order}`,color=typeof fx.player==='number'?state.players[fx.player]?.color:'#d2ab57';
   const item={...fx,id,color};
   if(['buy','takeover','upgrade','rent','start-bonus'].includes(fx.type)){
    item.rect=tileRect(fx.tile);if(!item.rect)return;
    const el=document.querySelector(`.board [data-tile="${fx.tile}"]`);
    if(fx.type==='buy'||fx.type==='takeover'){item.parts=burst(26,{spread:item.rect.w*1.1,lift:item.rect.h*.5,fall:item.rect.h*.6,colors:[color,'#f3c75b','#fffdf0',color,'#5d9c78']});bump(el,[{transform:'scale(1)'},{transform:'scale(1.08) translateY(-4px)'},{transform:'scale(.98)'},{transform:'scale(1)'}],{duration:520,delay:150,easing:'ease-out'});play?.('buy');}
    if(fx.type==='upgrade'){item.parts=Array.from({length:12},()=>({x:rand(.1,.9),delay:rand(0,500),rise:rand(.8,1.5),s:rand(.7,1.3)}));bump(el,[{transform:'translateY(0)'},{transform:'translateY(-10px) scale(1.06)'},{transform:'translateY(0) scale(1)'}],{duration:620,delay:220,easing:'cubic-bezier(.2,1.6,.4,1)'});play?.('upgrade');}
    if(fx.type==='rent'){item.big=fx.big&&(fx.from===0||fx.to===0);item.parts=burst(item.big?20:12,{spread:item.rect.w*(item.big?1.3:.9),lift:item.rect.h*.4,fall:item.rect.h*.8,colors:['#f3c75b','#e0a93a','#f8e39a']});item.board=boardRect();
     // Only shake for rent the local player pays or receives; AI-to-AI rent stays calm.
     if(item.big){const b=document.querySelector('.board');bump(b,[{translate:'0 0'},{translate:'-3px 1px'},{translate:'3px -1px'},{translate:'-2px 0'},{translate:'0 0'}],{duration:300,delay:80});play?.('rent-big');}}
    if(fx.type==='start-bonus'){item.parts=burst(16,{spread:item.rect.w,lift:item.rect.h*.6,fall:item.rect.h*.5,colors:['#f3c75b','#5d9c78','#fffdf0','#d79456']});play?.('start-bonus');}
   }else if(fx.type==='item'){
    item.focus=tokenRect(fx.player)||tileRect(state.players[fx.player]?.pos);if(!item.focus)return;play?.('turn');
   }else if(fx.type==='turn'){
    item.board=boardRect();item.player=fx.player;
    if(list.some(f=>f.type==='season')){item.delay=3300;later(()=>play?.('turn'),3300);}else play?.('turn');
   }else if(fx.type==='season'){
    item.board=boardRect();item.climate=season(state);
    item.highlights=tiles.map((t,i)=>t.group===item.climate.group?tileRect(i):null).filter(Boolean);
    item.parts=Array.from({length:44},()=>({x:rand(0,1),delay:rand(0,1400),dur:rand(1600,2600),sway:rand(-60,60),s:rand(.6,1.4),rot:rand(-360,360)}));play?.('season');
   }else if(fx.type==='bankrupt'){
    item.board=boardRect();item.focus=tokenRect(fx.player)||tileRect(state.players[fx.player]?.pos)||item.board;
    item.cracks=fx.tiles.map(i=>({i,rect:tileRect(i),debris:Array.from({length:7},()=>({x:rand(.1,.9),dx:rand(-20,20),fall:rand(30,70),delay:rand(100,500),s:rand(.6,1.2)}))})).filter(c=>c.rect);
    fx.tiles.forEach(i=>bump(document.querySelector(`.board [data-tile="${i}"]`),[{filter:'none',transform:'translateX(0)'},{filter:'grayscale(1) brightness(.85)',transform:'translateX(-3px)'},{filter:'grayscale(1) brightness(.85)',transform:'translateX(3px)'},{filter:'grayscale(.6)',transform:'translateX(0)'},{filter:'none',transform:'translateX(0)'}],{duration:1600,delay:250,easing:'ease-out'}));
    play?.('bankrupt');
   }else if(fx.type==='finale'){
    item.board=boardRect();item.winner=fx.winner;play?.('fanfare');later(()=>onFinale?.(),1900);
   }
   spawned.push(item);
  });
  if(!spawned.length)return;
  setItems(current=>[...current,...spawned]);
  spawned.forEach(item=>later(()=>setItems(current=>current.filter(x=>x.id!==item.id)),(item.delay||0)+DURATION[item.type]));
 },[commit]);
 if(!items.length)return null;
 return <div className="fx-layer" aria-hidden="true">{items.map(item=><Fx key={item.id} item={item} game={game}/>)}</div>;
}

function Fx({item,game}){
 const players=game.players;
 switch(item.type){
  case 'buy':case 'takeover':return <div className="fx-tile fx-buy" style={{...box(item.rect),'--owner':item.color}}>
   <span className="fx-flash"/><span className="fx-ring"/><span className="fx-ring fx-ring-late"/>
   <span className="fx-stamp"><b>{item.type==='buy'?'购买':'收购'}</b><small>{players[item.player]?.name}</small></span>
   {item.parts.map((p,i)=><i key={i} className="fx-confetti" style={particleStyle(p)}/>)}</div>;
  case 'upgrade':return <div className="fx-tile fx-upgrade" style={{...box(item.rect),'--owner':item.color}}>
   <span className="fx-beam"/><span className="fx-ring fx-ring-gold"/>
   {item.parts.map((p,i)=><i key={i} className="fx-spark" style={{left:`${p.x*100}%`,'--delay':`${p.delay}ms`,'--rise':p.rise,'--s':p.s}}/>)}
   <span className="fx-level"><b>{item.level} 级</b><em>{[1,2,3,4].map(n=><i key={n} className={n<=item.level?'on':''} style={{'--n':n}}/>)}</em></span></div>;
  case 'rent':return <>{item.big&&<div className="fx-impact" style={box(item.board)}/>}
   <div className={`fx-tile fx-rent ${item.big?'big':''}`} style={box(item.rect)}>
   <span className="fx-ring fx-ring-gold"/>{item.parts.map((p,i)=><i key={i} className="fx-coin" style={particleStyle(p)}/>)}
   <span className="fx-amount"><small>{players[item.from]?.name} → {players[item.to]?.name}</small><b>−{money(item.amount)}</b></span></div></>;
  case 'start-bonus':return <div className="fx-tile fx-start" style={box(item.rect)}>
   <span className="fx-ring fx-ring-gold"/><span className="fx-ribbon"><b>+{money(item.amount)}</b></span>
   {item.parts.map((p,i)=><i key={i} className="fx-confetti" style={particleStyle(p)}/>)}</div>;
  case 'item':{const Icon={dice:Dices,shield:Shield,build:Hammer}[item.card],label={dice:'遥控骰子',shield:'租金护盾',build:'建设补贴'}[item.card];
   return <div className="fx-item" style={{left:item.focus.x+item.focus.w/2,top:item.focus.y,'--owner':item.color}}><span><Icon size={18}/></span><b>{label}{item.value?` · ${item.value} 点`:''}</b><small>{players[item.player]?.name}</small></div>;}
  case 'turn':{const p=players[item.player];if(!p)return null;
   return <div className="fx-turn" style={{left:item.board.x+item.board.w/2,top:item.board.y+Math.min(item.board.h*.28,150),'--owner':p.color,'--delay':`${item.delay||0}ms`}}>
    <span className="fx-turn-avatar"><PixelPlayer player={p} id={item.player}/></span><b>{item.player===0?'你的回合':`${p.name}的回合`}</b><small>第 {item.round} 轮</small></div>;}
  case 'season':{const Icon=SEASON_ICONS[item.index]||Sun;
   return <><div className={`fx-season fx-season-${item.index}`} style={box(item.board)}>
    {item.parts.map((p,i)=><i key={i} className="fx-flake" style={{left:`${p.x*100}%`,'--delay':`${p.delay}ms`,'--dur':`${p.dur}ms`,'--sway':`${p.sway}px`,'--s':p.s,'--rot':`${p.rot}deg`,'--h':`${item.board.h}px`}}/>)}
    <div className="fx-season-card"><span className="fx-season-icon"><Icon size={30}/></span><b>{item.climate.name}</b><small>{item.climate.desc}</small></div></div>
    {item.highlights.map((r,i)=><span key={i} className={`fx-hot fx-season-${item.index}`} style={{...box(r),'--i':i}}/>)}</>;}
  case 'bankrupt':{const p=players[item.player];
   return <><div className="fx-dim" style={box(item.board)}/>
    {item.cracks.map(c=><div key={c.i} className="fx-tile fx-crumble" style={box(c.rect)}>
     <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="50,0 44,22 58,38 40,58 55,76 47,100"/><polyline points="44,22 20,30 8,26"/><polyline points="40,58 72,66 92,60"/></svg>
     {c.debris.map((d,i)=><i key={i} className="fx-debris" style={{left:`${d.x*100}%`,'--dx':`${d.dx}px`,'--fall':`${d.fall}px`,'--delay':`${d.delay}ms`,'--s':d.s}}/>)}</div>)}
    <div className="fx-bankrupt-stamp" style={{left:item.focus.x+item.focus.w/2,top:item.focus.y+item.focus.h/2}}><b>破产</b><small>{p?.name}</small></div></>;}
  case 'finale':{const p=players[item.winner];
   return <><Fireworks colors={[...players.map(x=>x.color),'#f3c75b','#fffdf0']}/>
    <div className="fx-finale" style={{left:item.board.x+item.board.w/2,top:item.board.y+item.board.h/2}}>
     <span className="fx-finale-crown"><Crown size={34}/></span>{p&&<span className="fx-finale-avatar"><PixelPlayer player={p} id={item.winner}/></span>}
     <b>{p?`${p.name}获胜`:'对局结束'}</b>{p&&<small>总资产 {money(worth(game,item.winner))}</small>}</div></>;}
  default:return null;
 }
}

// Pixel fireworks on a canvas: square particles, no smoothing, ~5s.
function Fireworks({colors}){
 const ref=useRef(null);
 useEffect(()=>{
  const canvas=ref.current,ctx=canvas?.getContext?.('2d');if(!ctx)return;
  const dpr=Math.min(2,window.devicePixelRatio||1),W=innerWidth,H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.scale(dpr,dpr);ctx.imageSmoothingEnabled=false;
  const px=Math.max(4,Math.round(Math.min(W,H)/170)),rockets=[],sparks=[],start=performance.now();let raf,launched=0;
  const launch=()=>{rockets.push({x:(Math.random()<.5?rand(.04,.3):rand(.7,.96))*W,y:H+10,vy:-rand(H*.012,H*.017),target:rand(.1,.42)*H,c:colors[Math.floor(Math.random()*colors.length)]});launched++;};
  const explode=r=>{const n=56+Math.floor(Math.random()*24),ring=Math.random()<.4,c2=colors[Math.floor(Math.random()*colors.length)];
   for(let k=0;k<n;k++){const a=k/n*Math.PI*2,s=ring?4.2:rand(1.4,5.2);sparks.push({x:r.x,y:r.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(55,90),age:0,c:Math.random()<.25?'#fffdf0':k%3?r.c:c2});}};
  const dot=(x,y,size)=>ctx.fillRect(Math.round(x/px)*px,Math.round(y/px)*px,size,size);
  const frame=now=>{
   const t=now-start;if(t<3800&&launched<Math.floor(t/210)+3)launch();
   ctx.clearRect(0,0,W,H);
   for(let i=rockets.length-1;i>=0;i--){const r=rockets[i];r.y+=r.vy;ctx.globalAlpha=1;ctx.fillStyle='#fff6d5';dot(r.x,r.y,px);ctx.globalAlpha=.45;dot(r.x,r.y+px*2,px);ctx.globalAlpha=.2;dot(r.x,r.y+px*4,px);
    if(r.y<=r.target){rockets.splice(i,1);explode(r);}}
   for(let i=sparks.length-1;i>=0;i--){const s=sparks[i];s.age++;s.vy+=.06;s.vx*=.982;s.vy*=.982;s.x+=s.vx;s.y+=s.vy;if(s.age>s.life){sparks.splice(i,1);continue;}
    const fade=Math.max(0,1-s.age/s.life);ctx.fillStyle=s.c;ctx.globalAlpha=fade*.25;dot(s.x-px*.5,s.y-px*.5,px*2);ctx.globalAlpha=fade;dot(s.x,s.y,px);}
   ctx.globalAlpha=1;
   if(t<5200||sparks.length)raf=requestAnimationFrame(frame);
  };
  raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);
 },[]);
 return <canvas ref={ref} className="fx-fireworks"/>;
}

// Result modal podium: top three rise in order 3 → 2 → 1, winner gets the crown.
export function Podium({game}){
 const ranked=game.players.map((p,id)=>({p,id,total:worth(game,id)})).sort((a,b)=>b.total-a.total).slice(0,3);
 const order=[ranked[1],ranked[0],ranked[2]].filter(Boolean),place=r=>ranked.indexOf(r)+1;
 return <div className="podium" aria-label="前三名">{order.map(r=><div key={r.id} className={`podium-col place-${place(r)}`} style={{'--owner':r.p.color}}>
  <span className="podium-avatar">{place(r)===1&&<span className="podium-crown"><Crown size={22}/></span>}<PixelPlayer player={r.p} id={r.id}/></span>
  <b>{r.p.name}</b><span className="podium-step"><strong>{place(r)}</strong><small>{money(r.total)}</small></span></div>)}</div>;
}

// Big dice roll over the board centre while the controller is in its dice phase.
// Purely visual: it mirrors the value the controller is already flickering.
const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
export function DiceRoll({rolling,value,color}){
 const [shown,setShown]=useState(null),timer=useRef(null);
 useEffect(()=>{
  clearTimeout(timer.current);
  if(reducedMotion())return;
  if(rolling){const r=boardRect();setShown({x:r.x+r.w/2,y:r.y+r.h/2,phase:'roll'});}
  else setShown(current=>{if(!current)return current;timer.current=setTimeout(()=>setShown(null),720);return {...current,phase:'land'};});
  return ()=>clearTimeout(timer.current);
 },[rolling]);
 if(!shown)return null;
 const pips=PIPS[value]||PIPS[1];
 return <div className={`fx-dice ${shown.phase}`} style={{left:shown.x,top:shown.y,'--owner':color||'#3c775b'}} aria-hidden="true">
  <span className="fx-dice-shadow"/>
  <span className="fx-dice-body"><span className="fx-die-face">{Array.from({length:9},(_,i)=><i key={i} className={pips.includes(i)?'dot':''}/>)}</span></span>
  {shown.phase==='land'&&<><span className="fx-ring fx-dice-ring"/><b className="fx-dice-value">{value} 点</b></>}
 </div>;
}

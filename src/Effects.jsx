import React,{useState,useEffect,useLayoutEffect,useRef} from 'react';
import {Coins,ArrowRight,Landmark} from 'lucide-react';
import {PixelPlayer} from './PixelPlayer.jsx';
import {money} from './game.js';
export function AnimatedMoney({value}){
 const [display,setDisplay]=useState(value),previous=useRef(value);
 useEffect(()=>{const start=previous.current;previous.current=value;let raf;const time=performance.now();const frame=now=>{const t=Math.min(1,(now-time)/750);setDisplay(Math.round(start+(value-start)*(1-(1-t)**3)));if(t<1)raf=requestAnimationFrame(frame);};if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)setDisplay(value);else raf=requestAnimationFrame(frame);return()=>cancelAnimationFrame(raf);},[value]);
 return <span>{money(display)}</span>;
}
export function MoneyEffects({event,players}){
 const [route,setRoute]=useState(null);
 useLayoutEffect(()=>{if(!event){setRoute(null);return;}
  const point=(id,fallback)=>{const wallet=document.querySelector(`[data-wallet="${id}"]`);const r=wallet?.getBoundingClientRect();if(r&&r.width>0&&r.height>0&&r.top>30&&r.bottom<innerHeight-140)return {x:r.x+r.width/2,y:r.y+r.height/2};const f=document.querySelector(fallback)?.getBoundingClientRect();return f?{x:f.x+f.width/2,y:f.y+f.height/2}:{x:innerWidth/2,y:innerHeight-80};};
  const update=()=>setRoute({from:point(event.from,'.transfer-from'),to:point(event.to,'.transfer-to')});update();window.addEventListener('resize',update);window.addEventListener('scroll',update,{passive:true});return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update);};
 },[event]);
 if(!event)return null;
 const portrait=id=>typeof id==='number'?<PixelPlayer player={players[id]} id={id}/>:<Landmark size={26}/>;
 const name=id=>typeof id==='number'?players[id].name:'城市银行';
 return <div className="money-effects" aria-live="polite"><div className="transfer-toast" key={event.key} data-testid="money-transfer" data-from={event.from} data-to={event.to}>
 <div className="transfer-caption"><Coins size={15}/>{event.label}<strong>{money(event.amount)}</strong></div>
 <div className="transfer-route"><span className="transfer-from">{portrait(event.from)}<b>{name(event.from)}</b></span><span className="transfer-stream"><i>¥</i><i>¥</i><i>¥</i><ArrowRight size={22}/></span><span className="transfer-to">{portrait(event.to)}<b>{name(event.to)}</b></span></div></div>
 {route&&Array.from({length:8},(_,i)=><span key={`${event.key}-${i}`} className="flying-coin" style={{'--sx':`${route.from.x}px`,'--sy':`${route.from.y}px`,'--dx':`${route.to.x-route.from.x}px`,'--dy':`${route.to.y-route.from.y}px`,'--delay':`${i*65}ms`,'--arc':`${-60-i%3*24}px`}}>¥</span>)}
 </div>;
}

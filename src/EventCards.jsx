import React,{useEffect,useRef} from 'react';
import {getTiles} from './board.js';
import {getEventCard} from './eventCards.js';
import {getCity} from './cityCatalog.js';
import {eventDestinations,eventChoices} from './eventOptions.js';
import {PixelEventIcon} from './PixelEventIcon.jsx';
import './event-cards.css';

export function EventCards({game,animating,dispatch}){
 const panel=useRef(null),focusedPhase=useRef(null);
 useEffect(()=>{
  if(!['draw','event','event-destination','event-choice'].includes(game.phase)){focusedPhase.current=null;return;}
  if(animating||game.current!==0||focusedPhase.current===game.phase)return;
  focusedPhase.current=game.phase;
  if(game.phase!=='draw')panel.current?.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
 },[game.phase,game.current,animating]);
 if(!['draw','event','event-destination','event-choice'].includes(game.phase))return null;
 const actor=game.activeEvent?.actor??game.current,player=game.players[actor],human=actor===0,disabled=animating||!human;
 const card=getEventCard(game.activeEvent?.id),isDraw=game.phase==='draw',tiles=getTiles(game);
 const source=game.eventDraw?.source||game.activeEvent?.source,isCityEvent=source==='city-event'||!!card?.cityId,city=card?.cityId?getCity(card.cityId):null;
 return <section ref={panel} className={`event-cards-panel ${isDraw?'is-drawing':'is-revealed'} ${isCityEvent?'city-event-cards':''}`} aria-label="特殊事件" data-event-source={isCityEvent?'city-event':source} data-event-phase={game.phase} aria-busy={animating}>
  <header className="event-panel-heading"><span className="event-heading-mark">{isCityEvent?<img src="/assets/stations/city-event.svg" alt=""/>:<PixelEventIcon name="moon" size={24}/>}</span><div><h3>{isDraw?(isCityEvent?'抽取城市事件':'抽取事件卡'):game.phase==='event-destination'?'选择目的地':game.phase==='event-choice'?'选择事件结果':isCityEvent?'城市事件':'特殊事件'}</h3><p>{player.name}{isDraw?' · 从三张卡中选择一张':card?` · ${city?city.name+' · ':''}${card.category}`:''}</p></div><span className="event-edition">{isCityEvent?'城市事件':source==='shop'?'道具':'奇遇'}</span></header>
  {isDraw?<>
   <div className="event-card-fan" aria-label="待抽取的事件卡">{(game.eventDraw?.offerIds||[]).map((id,index)=><button key={`${id}-${index}`} className="event-card-back" style={{'--card-tilt':`${(index-1)*9}deg`,'--card-lift':index===1?'-7px':'5px','--card-delay':`${index*90}ms`}} disabled={disabled} aria-label={`抽取第 ${index+1} 张事件卡`} onClick={()=>dispatch({type:'DRAW_EVENT',index})}>
    <span className="event-card-inlay"><span className="event-card-stars" aria-hidden="true">✦ · ✦</span><span className="event-card-sigil">{isCityEvent?<img src="/assets/stations/city-event.svg" alt=""/>:<PixelEventIcon name="moon" size={48}/>}</span><span className="event-card-seal" aria-hidden="true">{isCityEvent?'城':'?'}</span><span className="event-card-number" aria-hidden="true">{['I','II','III'][index]}</span></span>
   </button>)}</div>
   <p className="event-draw-caption" role="status">{human?'选择一张事件卡':`${player.name} 正在抽卡`}</p>
  </>:card?<>
   <article key={card.id} className="event-card-reveal" data-card-id={card.id} aria-live="polite">
    <div className="event-reveal-art"><span className="event-art-spark spark-one"/>{city?<img className="event-city-landmark" src={city.asset} alt={`${city.name}像素地标`}/>:<PixelEventIcon name={card.icon} size={72}/>}<span className="event-art-spark spark-two"/><span className="event-art-caption">{city?'CITY EVENT':'EVENT CARD'}</span></div>
    <div className="event-reveal-copy"><span className="event-card-category">{city&&<span className="event-card-city-mark">{city.name}</span>}{card.category}</span><h4>{card.title}</h4><p className="event-card-story">{card.story}</p><p className="event-card-rule"><span>效果</span>{card.rule}</p></div>
   </article>
   {game.phase==='event-destination'?<div className="event-destination-area"><p>仅列出本局符合条件的城市 · 不领取起点奖励</p><div className="event-destination-list" aria-label="可前往的城市">{eventDestinations(game).map(index=>{const tile=tiles[index];return <button key={tile.cityId||index} disabled={disabled} onClick={()=>dispatch({type:'EVENT_DESTINATION',tile:index})} aria-label={`前往${tile.name}`}><img src={tile.asset} alt=""/><span>{tile.name}</span><small>{index+1} 号格</small></button>;})}</div>{!human&&<p role="status">等待 {player.name} 选择目的地</p>}</div>:game.phase==='event-choice'?<div className="event-choice-area"><div className="event-choice-list" role="group" aria-label="事件选项">{eventChoices(game).map(choice=>{const tile=Number.isInteger(choice.tile)?tiles[choice.tile]:null;return <button key={choice.value} type="button" data-event-choice={choice.value} disabled={disabled} aria-label={choice.label} onClick={()=>dispatch({type:'EVENT_CHOICE',value:choice.value})}><span className="event-choice-art">{tile?<img src={tile.asset} alt=""/>:<PixelEventIcon name={choice.icon||choice.item||card.icon} size={36}/>}</span><span><b>{choice.label}</b><small>{choice.detail}</small></span><span className="event-choice-arrow" aria-hidden="true">→</span></button>;})}</div>{!human&&<p role="status">等待 {player.name} 选择</p>}</div>:<div className="event-card-footer">{human?<button className="event-resolve-button" disabled={disabled} onClick={()=>dispatch({type:'RESOLVE_EVENT',seed:Math.random()})}>执行事件 <span aria-hidden="true">→</span></button>:<p role="status">等待 {player.name} 执行事件</p>}</div>}
  </>:<p className="event-draw-caption" role="status">正在读取事件卡</p>}
 </section>;
}

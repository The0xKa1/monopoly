import React,{useState} from 'react';
import {ArrowRight,Coins,Dices,Shield,Hammer,Sparkles,ScrollText,Backpack} from 'lucide-react';
import {CARDS,money,owned,ownedIndustries,season} from './game.js';
import {getTiles} from './board.js';
import {getEventCard} from './eventCards.js';
import {getCity} from './cityCatalog.js';
import {PixelEventIcon} from './PixelEventIcon.jsx';
import {PixelPlayer} from './PixelPlayer.jsx';
import {AnimatedMoney} from './Effects.jsx';
const ICONS={dice:Dices,shield:Shield,build:Hammer};
const activeCard=(p,key)=>key==='shield'?p.shield:key==='build'?p.subsidy:p.controlled;
function announcementLabel(entry){const card=getEventCard(entry.cardId);return entry.category==='bankruptcy'?'全体公告':card?.cityId?`城市事件 · ${getCity(card.cityId).name}`:entry.category==='event-card'?entry.source==='shop'?'道具抽卡公告':'奇遇抽卡公告':'特殊事件';}
function EventAnnouncement({entry}){const card=getEventCard(entry.cardId),city=card?.cityId?getCity(card.cityId):null;return <div className={card?`hub-card-announcement ${city?'city-announcement':''}`:''}>{city?<img src={city.asset} alt=""/>:card?<PixelEventIcon name={card.icon} size={28}/>:null}<p>{entry.text}</p></div>;}
function Transaction({entry,players}){
 const name=id=>typeof id==='number'?players[id]?.name:'城市银行';
 return <div className="hub-transaction"><div><Coins size={13}/><b>{entry.label}</b><strong>{money(entry.amount)}</strong></div><p><span>{name(entry.from)}</span><ArrowRight size={11}/><span>{name(entry.to)}</span></p></div>;
}
export function BoardHub({game,motion,mapMotion,finance,animating,onWallet,onCard,style}){
 const [view,setView]=useState('activity'),tiles=getTiles(game),current=game.players[game.current],human=game.players[0],climate=season(game),journal=game.journal||[];
 const latest=finance||journal.find(e=>e.kind==='transaction'),event=journal.find(e=>e.kind==='event');
 const cityEvent=(game.eventDraw?.source||game.activeEvent?.source)==='city-event';
 const status=game.phase==='finished'?'对局结束':mapMotion?'城市正在重排':finance?'正在结算':motion?.phase==='dice'?'正在掷骰':motion?.phase==='teleport'?'正在传送':motion?.phase==='walk'?`${motion.step} / ${motion.total} 步`:motion?.phase==='land'?'已抵达':({roll:'等待掷骰',buy:'等待购买',upgrade:'等待升级',end:'回合结束',rent:game.pendingRent?.kind==='industry'?'等待服务费 / 收购':'等待付租 / 收购',offer:'等待业主答复',debt:'等待抵押筹款',draw:cityEvent?'等待城市抽卡':'等待抽卡',event:cityEvent?'城市事件已揭晓':'事件已揭晓','event-destination':'选择目的地','event-choice':'选择事件结果'})[game.phase];
 const cardCount=Object.values(human.cards).reduce((a,b)=>a+b,0),blocked=animating||game.current!==0||game.phase!=='roll';
 return <section className="board-center board-hub" aria-label="对局信息" style={style}><div className="hub-shell">
  <div className="activity-ribbon hub-actor" data-motion={motion?.phase||'idle'} style={{'--actor-color':current.color}}>
   <button className="activity-person" aria-label={`查看${current.name}的资产`} onClick={()=>onWallet(game.current)}><PixelPlayer player={current} id={game.current} frame={motion?.phase==='walk'?motion.step%2:null}/><b>{current.name}</b></button>
   <div className="hub-status"><strong>{status}</strong><span>{motion?`${tiles[motion.from].name} → ${tiles[motion.to].name}`:tiles[current.pos].name}</span></div>
   <div className="hub-cash"><small>现金</small><b><AnimatedMoney value={current.cash}/></b><span>{owned(game,game.current).length} 城市 · {ownedIndustries(game,game.current).length} 产业</span></div>
  </div>
  <div className="hub-tabs" role="group" aria-label="对局信息分类"><button aria-pressed={view==='activity'} onClick={()=>setView('activity')}><Sparkles size={13}/>动态</button><button aria-pressed={view==='news'} onClick={()=>setView('news')}><ScrollText size={13}/>公告</button><button aria-pressed={view==='cards'} aria-expanded={view==='cards'} aria-controls="item-cards" aria-label={view==='cards'?'收起道具':'展开道具'} onClick={()=>setView(view==='cards'?'activity':'cards')}><Backpack size={13}/>道具 <em>{cardCount}</em></button></div>
  <div className="hub-content" hidden={view!=='activity'}>
   <div className="hub-overview">
    <div className="hub-season"><div><Sparkles size={13}/><b>{climate.name}</b><small>剩余 {4-(game.round-1)%4} 轮</small></div><p>{climate.desc}</p></div>
    {(current.shield||current.subsidy||current.controlled||current.bankrupt)&&<div className="hub-buffs">{current.shield&&<span>租金护盾</span>}{current.subsidy&&<span>建设补贴</span>}{current.controlled&&<span>遥控骰子 {current.controlled} 步</span>}{current.bankrupt&&<span>已破产</span>}</div>}
    {latest?<Transaction entry={latest} players={game.players}/>:<p className="hub-empty">暂无交易</p>}
    {event&&<div className="hub-event"><small>{announcementLabel(event)} · 第 {event.round} 轮</small><EventAnnouncement entry={event}/></div>}
   </div>
  </div>
  <div className="hub-content" hidden={view!=='news'}><div className="hub-news-heading"><b>交易与事件</b><small>最近 40 条</small></div><div className="hub-news" aria-live="polite">{journal.length?journal.map((entry,i)=><article key={i}><small>{entry.kind==='event'?announcementLabel(entry)+' · ':''}第 {entry.round} 轮</small>{entry.kind==='transaction'?<Transaction entry={entry} players={game.players}/>:<EventAnnouncement entry={entry}/>}</article>):<p className="hub-empty">暂无公告</p>}</div><details className="hub-records"><summary>回合记录</summary>{game.logs.slice(0,20).map((l,i)=><p key={i}><small>{l.round} 轮</small>{l.text}</p>)}</details></div>
  <div id="item-cards" className="hub-content hub-inventory" hidden={view!=='cards'}><div className="hub-inventory-heading"><b>我的道具</b><small>{human.bankrupt?'已破产':game.phase==='finished'?'对局已结束':game.current!==0?'等待我的回合':animating?'行动结束后可用':game.phase!=='roll'?'下次掷骰前可用':'掷骰前使用'}</small></div><div className="hub-cards">{Object.entries(CARDS).map(([key,c])=>{const Icon=ICONS[key],active=activeCard(human,key);return <button key={key} className={`strategy-card hub-card ${key}`} title={`${c.name}：${active?'已生效':c.desc}`} disabled={blocked||!human.cards[key]||!!active||human.bankrupt} onClick={()=>onCard(key)}><Icon size={22}/><span><b>{c.name}</b><small>{active?'已生效':c.desc}</small></span><em>{active?'已生效':`×${human.cards[key]}`}</em></button>;})}</div></div>
 </div></section>;
}

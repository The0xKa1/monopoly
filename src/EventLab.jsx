import React,{useState} from 'react';
import {EVENT_CARDS,getEventCard,eligibleCityEventCards} from './eventCards.js';
import {getCity} from './cityCatalog.js';
import {PixelEventIcon} from './PixelEventIcon.jsx';
import {getTiles} from './board.js';
import {CARDS,money} from './game.js';
import './event-lab.css';

const supportsDebt=card=>['gift_all','property_fee'].includes(card.effect.type)||(card.effect.type==='bank'&&card.effect.amount<0);

export function EventLabPicker({game,onStart}){
 const [category,setCategory]=useState('全部'),[variant,setVariant]=useState('normal'),[pool,setPool]=useState(getEventCard(game?.testRun?.id)?.cityId?'city':'chance');
 const cityCards=eligibleCityEventCards(game),activePool=pool==='city'?cityCards:EVENT_CARDS,categories=['全部',...new Set(activePool.map(card=>card.category))];
 const cards=activePool.filter(card=>category==='全部'||card.category===category);
 return <section className="event-lab-picker" aria-label="选择测试卡牌">
  <div className="event-lab-emblem"><PixelEventIcon name="moon" size={36}/></div>
  <h2>事件卡测试</h2>
  <p className="event-lab-intro">选择卡牌进入独立测试，原对局保留。</p>
  <div className="event-lab-pools" role="group" aria-label="事件卡池"><button type="button" aria-pressed={pool==='chance'} onClick={()=>{setPool('chance');setCategory('全部');}}>奇遇 · {EVENT_CARDS.length}</button><button type="button" aria-pressed={pool==='city'} onClick={()=>{setPool('city');setCategory('全部');}}>城市事件 · {cityCards.length}</button></div>
  <div className="event-lab-controls"><label>测试场景<select aria-label="测试场景" value={variant} onChange={event=>setVariant(event.target.value)}><option value="normal">普通</option><option value="short-cash">现金不足</option></select></label><span>{variant==='short-cash'?'支出卡使用低现金场景，其余卡正常测试。':`共 ${activePool.length} 张 · ${pool==='city'?'仅包含本局地图城市':'包含抽卡、动画与结算'}`}</span></div>
  <div className="event-lab-filters" aria-label="卡牌分类">{categories.map(value=><button key={value} type="button" aria-pressed={category===value} onClick={()=>setCategory(value)}>{value}</button>)}</div>
  <div className="event-lab-card-list" aria-label="可测试的事件卡" data-event-pool={pool}>{cards.map(card=><button className={`event-lab-card ${card.cityId?'is-city-card':''}`} key={card.id} data-test-card-id={card.id} type="button" aria-label={`测试${card.title}`} onClick={()=>onStart(card.id,variant==='short-cash'&&supportsDebt(card)?'short-cash':'normal')}>
   <span className="event-lab-card-icon">{card.cityId?<img src={getCity(card.cityId).asset} alt=""/>:<PixelEventIcon name={card.icon} size={36}/>}</span>
   <span className="event-lab-card-copy"><span className="event-lab-card-category">{card.cityId?getCity(card.cityId).name+' · ':''}{card.category}{variant==='short-cash'&&supportsDebt(card)?' · 现金不足':''}</span><strong>{card.title}</strong><span className="event-lab-card-rule">{card.rule}</span></span><span className="event-lab-card-start" aria-hidden="true">测试 →</span>
  </button>)}</div>
 </section>;
}

function stepText(game,animating){
 if(animating)return '动画播放中，可观察地图与资产变化。';
 if(game.testRun.itemTrial){
  if(game.phase==='roll')return '在棋盘中央“道具”中用卡，再投掷骰子。';
  if(game.phase==='upgrade')return '点击“升级”，查看建设补贴后的实际支出。';
  if(game.phase==='end')return '本次行动已结束，可在“实际变化”查看结果。';
 }
 const steps={draw:'点击下方任意一张金卡，抽取已选事件。',event:'查看卡面，点击“执行事件”。','event-destination':'从本局符合条件的城市中选择目的地。','event-choice':'选择一项结果，查看实际变化与公告。',debt:'选择房产抵押，筹足后支付欠款。',rent:'已到达其他玩家房产，可收购或支付租金。',offer:'等待业主决定是否出售。',buy:'已到达目标城市，可购买或不购买。',upgrade:'已到达自己的城市，可升级或不升级。',end:'事件已执行，可查看公告与实际变化。',finished:'对局已结算，可查看实际变化。'};
 return steps[game.phase]||'使用游戏中的操作，观察卡牌效果。';
}

function propertySummary(property,players){
 if(!property)return '无主';
 const owner=property.owner==='bank'?`银行代持（${players[property.mortgagor]?.name||'原持有人'}）`:players[property.owner]?.name||'—';
 return `${owner} · ${property.level+1} 级`;
}

function PropertyChanges({game,baseline,tiles}){
 const rows=tiles.flatMap((tile,index)=>{
  if(tile.type!=='city')return [];
  const before=baseline.properties?.[tile.cityId],current=game.properties[index];
  return before?.owner===0||before?.mortgagor===0||current?.owner===0||current?.mortgagor===0?[{tile,before,current}]:[];
 });
 return <div className="event-lab-property-list"><table><caption>房产与等级</caption><thead><tr><th scope="col">城市</th><th scope="col">测试前</th><th scope="col">当前</th></tr></thead><tbody>{rows.map(({tile,before,current})=><tr key={tile.cityId} data-city-id={tile.cityId}><th scope="row">{tile.name}</th><td>{baseline.properties?propertySummary(before,game.players):'未记录'}</td><td>{propertySummary(current,game.players)}</td></tr>)}</tbody></table>{!rows.length&&<p className="event-lab-account-note">本次样本中没有自己的房产。</p>}</div>;
}

export function EventLabBar({game,animating,onPick,onRetry,onExit,onUseItem}){
 const run=game.testRun;if(!run)return null;
 const card=getEventCard(run.id);if(!card)return null;
 const baseline=run.baseline||{},tiles=getTiles(game),order=tiles.filter(tile=>tile.type==='city').map(tile=>tile.cityId);
 const changed=Array.isArray(baseline.cityOrder)&&order.some((id,index)=>id!==baseline.cityOrder[index]);
 const item=card.effect.type==='item'?card.effect.card:run.chosenItem;
 const inventoryItems=['item_choice','reward_choice'].includes(card.effect.type)?Object.keys(CARDS):CARDS[item]?[item]:[];
 const directCash=(game.journal||[]).filter(entry=>entry.kind==='transaction'&&entry.label?.includes(`事件 · ${card.title}`)).reduce((sum,entry)=>sum+(entry.to===0?entry.amount:0)-(entry.from===0?entry.amount:0),0);
 return <section className="event-lab-bar" aria-label="事件卡测试对局">
  <div className="event-lab-bar-header">{card.cityId?<img className="event-lab-city-portrait" src={getCity(card.cityId).asset} alt=""/>:<PixelEventIcon name={card.icon} size={32}/>}<div className="event-lab-bar-title"><p>{card.cityId?getCity(card.cityId).name+'城市事件测试':'测试对局'} · 原对局已保留</p><h3>{card.title}{run.variant==='short-cash'&&<span>现金不足</span>}{run.itemTrial&&<span>道具试用</span>}</h3></div><div className="event-lab-bar-actions"><button type="button" onClick={onPick}>换一张</button><button type="button" onClick={onRetry}>重新测试</button><button type="button" className="event-lab-exit" onClick={onExit}>返回原对局</button></div></div>
  <p className="event-lab-effect">{card.rule}</p>
  <div className="event-lab-step"><p role="status">{stepText(game,animating)}</p>{CARDS[item]&&game.players[0].cards[item]>0&&game.phase==='end'&&!run.itemTrial&&<button type="button" className="event-lab-use" disabled={animating} onClick={onUseItem}>继续试用道具 <span aria-hidden="true">→</span></button>}</div>
  <details className="event-lab-changes"><summary>实际变化</summary><div className="event-lab-change-content">
   <p className="event-lab-result">我的事件直接收支：<b>{directCash>0?'+':directCash<0?'−':''}{money(Math.abs(directCash))}</b></p>
   <p className="event-lab-account-note">现金对比包含抵押、付租等所有实际收支。</p>
   <div className="event-lab-cash-list"><table><caption>现金对比</caption><thead><tr><th scope="col">玩家</th><th scope="col">测试前 → 当前</th><th scope="col">变化</th></tr></thead><tbody>{game.players.map((player,index)=>{const before=baseline.cash?.[index]??player.cash,delta=player.cash-before;return <tr key={index}><th scope="row">{player.name}</th><td>{money(before)}<span aria-hidden="true"> → </span>{money(player.cash)}</td><td className={delta>0?'is-gain':delta<0?'is-loss':''}>{delta>0?'+':delta<0?'−':''}{money(Math.abs(delta))}</td></tr>;})}</tbody></table></div>
   {inventoryItems.map(key=><p key={key} className="event-lab-result" data-item={key}>{CARDS[key].name}：<b>{baseline.cards?.[0]?.[key]??0} → {game.players[0].cards[key]||0} 张</b>{run.itemTrial&&key===item&&<span>{item==='shield'?game.players[0].shield?'护盾已生效，等待租金触发。':'护盾当前未生效。':item==='build'?game.players[0].subsidy?'补贴已生效，等待升级。':'补贴当前未生效。':game.players[0].controlled?'已指定骰子点数。':'使用后可指定骰子点数。'}</span>}</p>)}
   {['renovate','redeem_grant'].includes(card.effect.type)&&<PropertyChanges game={game} baseline={baseline} tiles={tiles}/>}
   {card.effect.type==='shield_all'&&<div className="event-lab-shield-list"><h4>租金护盾状态</h4><ul>{game.players.map((player,index)=><li key={index} data-shield-player={index}><span>{player.name}</span><b>{baseline.shields?.[index]?'已生效':'未生效'} → {player.shield?'已生效':'未生效'}</b>{player.bankrupt&&<small>已破产</small>}</li>)}</ul></div>}
   {card.effect.type==='shuffle'&&<p className="event-lab-result">城市排列：<b>{changed?'已变化':'尚未变化'}</b><span>人物、产权与抵押随对应城市移动。</span></p>}
   {card.effect.type==='travel'&&<p className="event-lab-result">{game.players[0].name} 的位置：<b>{baseline.positions?.[0]||'—'} → {tiles[game.players[0].pos]?.name||'—'}</b></p>}
   {game.debt&&<p className="event-lab-result">待付款：<b>{money(game.debt.amount)}</b><span>筹款后的现金也包含在上方变化中。</span></p>}
  </div></details>
 </section>;
}

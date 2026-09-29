import React from 'react';
import {Landmark,Handshake} from 'lucide-react';
import {getTiles} from './board.js';
import {money,ownedAssets,mortgageValue,purchaseQuote,decisionPlayer} from './game.js';
export function PropertyActions({game,animating,dispatch}){
 const tiles=getTiles(game),player=game.players[game.current],human=decisionPlayer(game)===0,disabled=animating||!human;
 if(game.phase==='rent'){
  const due=game.pendingRent,quote=purchaseQuote(game,due.tile),industry=due.kind==='industry'||tiles[due.tile].type==='industry',feeName=industry?'服务费':'租金';
  return <section className="property-actions" aria-label={industry?'服务费与收购':'租金与收购'}><div className="property-action-title"><Handshake size={20}/><div><h3>{tiles[due.tile].name} · {feeName} {money(due.amount)}</h3><p>{due.offerRejected?`业主已拒绝，本次继续支付${feeName}。`:`业主：${game.players[due.owner].name} · 收购价 ${money(quote)}`}</p></div></div>{industry&&due.pricing&&<div className="industry-fee-snapshot" aria-label="本次服务费计价"><b>本次计价</b><span>{due.pricing.basis}</span>{due.pricing.bonuses?.length>0&&<small>{due.pricing.bonuses.map(b=>b.label).join(' · ')}</small>}</div>}<div className="property-buttons"><button className="text-button" disabled={disabled||due.offerRejected||player.cash<quote} onClick={()=>dispatch({type:'OFFER'})}>提出收购 {money(quote)}</button><button className="primary" disabled={disabled} onClick={()=>dispatch({type:'PAY_RENT'})}>{player.cash<due.amount?'抵押筹款':`支付${feeName}`} {money(due.amount)}</button></div>{!human&&<small>等待 {player.name} 决定</small>}</section>;
 }
 if(game.phase==='offer'){
  const o=game.offer,industry=tiles[o.tile].type==='industry';
  return <section className="property-actions" aria-label="收购请求"><div className="property-action-title"><Handshake size={20}/><div><h3>{game.players[o.buyer].name} 请求收购 {tiles[o.tile].name}</h3><p>报价 {money(o.price)} · 同意后转让产权，{industry?'免本次服务费':'本次免租'}</p></div></div>{human?<div className="property-buttons"><button className="text-button" disabled={disabled} onClick={()=>dispatch({type:'OFFER_REPLY',actor:0,accept:false})}>拒绝收购</button><button className="primary" disabled={disabled} onClick={()=>dispatch({type:'OFFER_REPLY',actor:0,accept:true})}>同意收购 {money(o.price)}</button></div>:<p>等待 {game.players[o.seller].name} 决定</p>}</section>;
 }
 if(game.phase==='debt'){
  const due=game.debt,available=ownedAssets(game,game.current),enough=player.cash>=due.amount;
  return <section className="property-actions debt-actions" aria-label="银行抵押"><div className="property-action-title"><Landmark size={21}/><div><h3>待付 {money(due.amount)} · {due.label}</h3><p>现金 {money(player.cash)} · 缺口 {money(Math.max(0,due.amount-player.cash))}</p></div></div><p className="mortgage-rule">城市抵押款为原价的一半加实际升级支出；产业抵押款为原价的一半。银行代持期间不收费、不可购买，产业联动暂停。</p>{!enough&&available.length>0&&<div className="mortgage-list">{available.map(i=><button key={i} disabled={disabled} onClick={()=>dispatch({type:'MORTGAGE',tile:i})}><img src={tiles[i].asset} alt=""/><span><b>{tiles[i].name}</b><small>{tiles[i].type==='industry'?'公共事业':`${game.properties[i].level+1} 级城市`}</small></span><strong>抵押 {money(mortgageValue(game,i))}</strong></button>)}</div>}<div className="property-buttons">{enough?<button className="primary" disabled={disabled} onClick={()=>dispatch({type:'SETTLE_DEBT'})}>支付欠款 {money(due.amount)}</button>:!available.length?<button className="primary danger-button" disabled={disabled} onClick={()=>dispatch({type:'BANKRUPT'})}>确认破产</button>:null}</div>{!enough&&!available.length&&<p>已无可抵押资产。破产后城市和产业回到市场，城市等级归零。</p>}{!human&&<small>等待 {player.name} 处理</small>}</section>;
 }
 return null;
}

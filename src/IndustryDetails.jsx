import React,{useState} from 'react';
import {ArrowRight,Building2} from 'lucide-react';
import {getTiles} from './board.js';
import {getIndustry} from './industries.js';
import {getIndustryQuote,money,owned,ownerName} from './game.js';
import './industries.css';

export function IndustryDetails({game,index,onClose}){
 const tile=getTiles(game)[index],industry=getIndustry(tile.industryId),property=game.properties[index],bank=property?.owner==='bank';
 const [dice,setDice]=useState(Math.min(6,Math.max(1,game.lastDice||game.dice||1)));
 const [visitor,setVisitor]=useState(game.players[game.current]?.bankrupt?game.players.findIndex(p=>!p.bankrupt):game.current);
 const owner=property?.owner??game.current,preview={...game,dice,lastDice:dice},quote=getIndustryQuote(preview,index,visitor,owner);
 const visitorCount=owned(game,visitor).length;
 return <section className="industry-details" aria-label="产业详情" data-industry-id={industry.id} style={{'--industry-color':industry.color}}>
  <div className="industry-detail-heading"><div className="industry-detail-art"><img src={industry.asset} alt={`${industry.name}像素场景`}/></div><div><span><Building2 size={12}/>公共事业</span><h2>{industry.name}</h2><p>{property?bank?'银行代持 · 暂停收费与联动':`业主：${ownerName(game,property)}`:'未售 · 到访时可购买'}</p></div></div>
  <div className="industry-detail-stats"><div><small>购买价格</small><b>{money(industry.price)}</b></div><div><small>{bank?'当前抵押款':'抵押金额'}</small><b>{money(bank?property.mortgageAmount:Math.round(industry.price*.5))}</b></div><div><small>产权状态</small><b>{bank?'银行代持':property?'在营':'未售'}</b></div></div>
  <p className="industry-rule">{industry.rule}</p>
  <div className="industry-preview" aria-label="服务费计价预览">
   <div className="industry-preview-heading"><h3>计价预览</h3><span>{bank?'暂停收费':property?'按当前业主联动':`假定 ${game.players[owner]?.name||'当前玩家'} 购入`}</span></div>
   <div className="industry-preview-controls"><label>骰点<select aria-label="计价预览骰点" value={dice} onChange={event=>setDice(Number(event.target.value))}>{[1,2,3,4,5,6].map(value=><option key={value} value={value}>{value} 点</option>)}</select></label><label>来客<select aria-label="计价预览来客" value={visitor} onChange={event=>setVisitor(Number(event.target.value))}>{game.players.map((player,id)=>!player.bankrupt&&<option key={id} value={id}>{player.name}</option>)}</select></label></div>
   <p className="industry-preview-context">第 {game.round} 轮 · 来客持有 {visitorCount} 座未抵押城市</p>
   <div className="industry-preview-result"><span>服务费</span><strong>{money(quote.amount)}</strong></div>
   <p className="industry-preview-formula" data-industry-basis>{quote.basis}</p>
   <div className="industry-links"><h4>产业联动</h4><ul>{(quote.links||[]).map(link=><li key={link.id} className={link.active?'active':''} data-industry-link={link.id} data-link-active={link.active}><i aria-hidden="true"/><span>{link.label}</span><b>{link.active?'生效':'未生效'}</b></li>)}</ul>{!quote.links?.length&&<p>银行代持期间不参与联动。</p>}</div>
   <p className="industry-preview-note">预览不改变对局。本次待付金额以到站时的计价为准。</p>
  </div>
  <p className="industry-detail-note">产业不可升级，业主本人到访不付服务费。服务费不受城市租金护盾、季节或同色组影响，也不消耗护盾。抵押后可原额赎回。</p>
  <button className="primary wide" onClick={onClose}>返回棋盘 <ArrowRight size={16}/></button>
 </section>;
}

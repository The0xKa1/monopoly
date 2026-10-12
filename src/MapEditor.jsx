import React,{useState} from 'react';
import {CLASSIC_MAP,MAP_SCOPES,MAP_SIZES,generateMap,getTiles,getGroups} from './board.js';
import {DEFAULT_ROUNDS,MAX_ROUNDS} from './game.js';
const PRESETS=[10,20,30,50];
// rounds: positive integer or null (unlimited). Map changes restart the game;
// a rounds-only change can be saved into the running game.
export function MapEditor({map=CLASSIC_MAP,rounds=DEFAULT_ROUNDS,currentRound=1,onApply,onSaveRounds,onCancel}){
 const [draft,setDraft]=useState(map);
 const [unlimited,setUnlimited]=useState(rounds===null);
 const [text,setText]=useState(String(rounds===null?DEFAULT_ROUNDS:rounds));
 const count=/^\d+$/.test(text.trim())?Number(text.trim()):NaN,setCount=n=>setText(String(n));
 const tiles=getTiles({map:draft}),cities=tiles.filter(t=>t.type==='city'),groups=getGroups({map:draft});
 const valid=unlimited||Number.isInteger(count)&&count>=1&&count<=MAX_ROUNDS,limit=unlimited?null:count;
 const mapChanged=draft!==map,roundsChanged=limit!==rounds;
 return <div className="map-editor"><h2>地图设置</h2>
 <div className="map-fields"><label>城市范围<select aria-label="地图城市范围" value={draft.kind} onChange={e=>setDraft(generateMap(e.target.value,draft.size))}>{Object.entries(MAP_SCOPES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>棋盘大小<select aria-label="棋盘大小" value={draft.size} disabled={draft.kind==='classic'} onChange={e=>setDraft(generateMap(draft.kind,Number(e.target.value)))}>{MAP_SIZES.map(size=><option key={size} value={size}>{size} 格</option>)}</select></label></div>
 <div className="round-fields"><label>对局轮数<input type="number" aria-label="对局轮数" min={1} max={MAX_ROUNDS} step={1} inputMode="numeric" value={unlimited?'':text} placeholder="∞" disabled={unlimited} onChange={e=>setText(e.target.value)}/></label>
  <div className="round-presets" role="group" aria-label="常用轮数">{PRESETS.map(n=><button key={n} type="button" className={!unlimited&&count===n?'active':''} onClick={()=>{setUnlimited(false);setCount(n);}}>{n}</button>)}<button type="button" className={unlimited?'active':''} aria-pressed={unlimited} onClick={()=>setUnlimited(v=>!v)}>无限</button></div>
  <small>{unlimited?'不限轮数：只剩一人未破产时结束，也可在“重新开始”里立即结算。':!valid?`请输入 1～${MAX_ROUNDS} 的整数。`:`${count} 轮后按总资产结算${count<currentRound?`；已到第 ${currentRound} 轮，将在本轮结束时结算`:''}。`}</small></div>
 <div className="map-preview-heading"><span>{cities.length} 座城市 · 8 个特殊格</span><button className="text-button" disabled={draft.kind==='classic'} onClick={()=>setDraft(generateMap(draft.kind,draft.size))}>重新随机</button></div>
 <div className="map-city-preview">{cities.map(city=><div key={city.cityId}><img src={city.asset} alt=""/><span>{city.name}</span><i style={{background:groups[city.group].color}}/></div>)}</div>
 <p className="map-reset-note">{mapChanged?'应用后重新开始对局，保留角色名单与外观。':'只改轮数可直接保存到当前对局；使用地图会重新开始对局。'}</p>
 <div className="appearance-actions"><button className="text-button" onClick={onCancel}>取消</button>{!mapChanged&&onSaveRounds&&<button className="text-button" disabled={!valid||!roundsChanged} onClick={()=>onSaveRounds(limit)}>只保存轮数</button>}<button className="primary" disabled={!valid} onClick={()=>onApply(draft,limit)}>使用地图并重开</button></div>
 </div>;
}

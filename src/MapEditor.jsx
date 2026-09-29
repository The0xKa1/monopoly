import React,{useState} from 'react';
import {CLASSIC_MAP,MAP_SCOPES,MAP_SIZES,generateMap,getTiles,getGroups} from './board.js';
export function MapEditor({map=CLASSIC_MAP,onApply,onCancel}){
 const [draft,setDraft]=useState(map);
 const tiles=getTiles({map:draft}),cities=tiles.filter(t=>t.type==='city'),groups=getGroups({map:draft});
 return <div className="map-editor"><h2>地图设置</h2>
 <div className="map-fields"><label>城市范围<select aria-label="地图城市范围" value={draft.kind} onChange={e=>setDraft(generateMap(e.target.value,draft.size))}>{Object.entries(MAP_SCOPES).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>棋盘大小<select aria-label="棋盘大小" value={draft.size} disabled={draft.kind==='classic'} onChange={e=>setDraft(generateMap(draft.kind,Number(e.target.value)))}>{MAP_SIZES.map(size=><option key={size} value={size}>{size} 格</option>)}</select></label></div>
 <div className="map-preview-heading"><span>{cities.length} 座城市 · 8 个特殊格</span><button className="text-button" disabled={draft.kind==='classic'} onClick={()=>setDraft(generateMap(draft.kind,draft.size))}>重新随机</button></div>
 <div className="map-city-preview">{cities.map(city=><div key={city.cityId}><img src={city.asset} alt=""/><span>{city.name}</span><i style={{background:groups[city.group].color}}/></div>)}</div>
 <p className="map-reset-note">应用后重新开始对局，保留角色名单与外观。</p>
 <div className="appearance-actions"><button className="text-button" onClick={onCancel}>取消</button><button className="primary" onClick={()=>onApply(draft)}>使用地图并重开</button></div>
 </div>;
}

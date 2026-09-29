import React, {useMemo, useState} from 'react';
import {Search, ArrowUpRight} from 'lucide-react';
import {CITY_CATALOG} from './cityCatalog.js';
import {TILES} from './board.js';

const KIND_LABELS = {capital:'省会 / 首府', municipality:'直辖市', sar:'特别行政区', tourism:'旅游城市', world:'世界城市'};

export function CityLibrary({onSelect,tiles=TILES}) {
 const BOARD_CITIES=useMemo(()=>new Set(tiles.filter(t=>t.type==='city').map(t=>t.cityId)),[tiles]);
 const [scope, setScope] = useState('china');
 const [query, setQuery] = useState('');
 const [region, setRegion] = useState('all');
 const [capitalsOnly, setCapitalsOnly] = useState(false);
 const scoped = useMemo(() => CITY_CATALOG.filter(city => scope === 'board' ? BOARD_CITIES.has(city.id) : city.scope === scope), [scope,BOARD_CITIES]);
 const regions = [...new Set(scoped.map(city => city.region))];
 const normalized = query.trim().toLocaleLowerCase();
 const cities = scoped.filter(city =>
  (region === 'all' || region === city.region) &&
  (!capitalsOnly || ['capital', 'municipality', 'sar'].includes(city.kind)) &&
  (!normalized || [city.name, city.nameEn, city.region, city.country, city.landmark].join(' ').toLocaleLowerCase().includes(normalized))
 );
 function changeScope(value) {setScope(value); setRegion('all'); setCapitalsOnly(false);}
 return <section className="album panel city-library" aria-label="城市库">
  <div className="library-heading"><div><h2>城市图鉴</h2><p>城市库 {CITY_CATALOG.length} 座 · 当前棋盘 {BOARD_CITIES.size} 座</p></div></div>
  <div className="library-tabs" role="group" aria-label="城市范围">
   {[['china','中国'],['world','世界'],['board','当前棋盘']].map(([value,label]) => <button key={value} aria-pressed={scope === value} onClick={() => changeScope(value)}>{label}<span>{CITY_CATALOG.filter(c => value === 'board' ? BOARD_CITIES.has(c.id) : c.scope === value).length}</span></button>)}
  </div>
  <div className="library-filters">
   <label className="city-search"><Search size={16}/><input type="search" aria-label="搜索城市" placeholder="城市、地区或地标" value={query} onChange={e => setQuery(e.target.value)}/></label>
   <select aria-label="地区筛选" value={region} onChange={e => setRegion(e.target.value)}><option value="all">全部地区</option>{regions.map(value => <option key={value}>{value}</option>)}</select>
   {scope === 'china' && <label className="capital-filter"><input type="checkbox" checked={capitalsOnly} onChange={e => setCapitalsOnly(e.target.checked)}/>省会、首府、直辖市及港澳</label>}
  </div>
  <div className="library-count" role="status">{cities.length} 座城市</div>
  <div className="city-collection library-collection">
   {cities.map(city => <button key={city.id} data-city-id={city.id} aria-label={`查看${city.name}`} onClick={() => onSelect(city)}>
    <div className="library-art"><img src={city.asset} alt="" loading="lazy" width="128" height="112"/></div>
    <div className="library-card-copy"><small>{city.scope === 'china' ? city.region : city.country}</small><h3>{city.name}<ArrowUpRight size={13}/></h3><p>{city.landmark}</p></div>
   </button>)}
  </div>
  {!cities.length && <div className="library-empty"><p>未找到城市</p><button onClick={() => {setQuery('');setRegion('all');setCapitalsOnly(false);}}>清除筛选</button></div>}
 </section>;
}

export function CatalogCityDetails({city, onBoardDetails,tiles=TILES}) {
 const tile = tiles.findIndex(t => t.type === 'city' && t.cityId === city.id);
 return <>
  <div className="catalog-detail-art"><img src={city.asset} alt={`${city.name}：${city.landmark}`}/></div>
  <div className="eyebrow">{city.scope === 'china' ? city.region : `${city.country} · ${city.region}`}</div>
  <h2>{city.name}</h2>
  <p className="catalog-name-en">{city.nameEn}</p>
  <dl className="catalog-facts"><div><dt>地标</dt><dd>{city.landmark}</dd></div><div><dt>分类</dt><dd>{KIND_LABELS[city.kind]}</dd></div><div><dt>地图</dt><dd>{tile >= 0 ? '当前棋盘' : '城市库'}</dd></div></dl>
  {tile >= 0 && <button className="primary wide" onClick={() => onBoardDetails(tile)}>查看地产 <ArrowUpRight size={16}/></button>}
 </>;
}

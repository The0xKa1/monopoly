import React from 'react';
import {eligibleCityEventCards} from './eventCards.js';
import {getCity} from './cityCatalog.js';
import './city-events.css';

export function CityEvents({game}){
 const cards=eligibleCityEventCards(game);
 return <section className="city-events-library" aria-label="本局城市事件卡池">
  <div className="city-events-title"><img src="/assets/stations/city-event.svg" alt=""/><div><span>本局卡池</span><h2>城市事件</h2></div><b>{cards.length} 张</b></div>
  <p className="city-events-intro">停在城市事件格时抽取。每座本局城市对应一张，随地图更新。</p>
  <div className="city-events-list">{cards.map(card=>{const city=getCity(card.cityId);return <article className="city-event-preview" key={card.id} data-city-card-id={card.id}>
   <header><div className="city-event-landmark"><img src={city.asset} alt={`${city.name}像素地标`}/></div><div><span className="city-event-stamp">{city.name}</span><h3>{card.title}</h3><small>{city.landmark}</small></div></header>
   <p className="city-event-story">{card.story}</p><p className="city-event-rule"><span>效果</span>{card.rule}</p>
  </article>;})}</div>
 </section>;
}

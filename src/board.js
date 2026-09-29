import {CITY_CATALOG,getCity} from './cityCatalog.js';
import {getIndustry} from './industries.js';

// Keep version-1 tile indices stable: saves store positions and properties by index.
export const GROUPS = { north: { name: '古都人文', color: '#ca9778' }, west: { name: '西南烟火', color: '#b9a0ce' }, east: { name: '江南水乡', color: '#81b5b3' }, south: { name: '滨海假日', color: '#e0bb6b' } };
function city(cityId) {
 const definition=getCity(cityId);
 if(!definition.gameplay)throw new Error(`City has no gameplay configuration: ${cityId}`);
 return Object.freeze({...definition,...definition.gameplay,type:'city',cityId});
}
function industry(industryId){const definition=getIndustry(industryId);return Object.freeze({...definition,type:'industry',industryId,desc:definition.rule});}
export const TILES = [
 {type:'start',name:'旅程起点',desc:'每次经过获得 ¥1,000；小满额外获得 ¥200'},
 city('beijing'),
 {type:'chance',name:'奇遇',desc:'抽取一张特殊事件卡，揭示后执行卡面效果'},
 city('xian'),
 city('chengdu'),
 city('chongqing'),
 industry('railway'),
 city('wuhan'),
 {type:'city-event',name:'城市事件',desc:'到达时从本局城市卡池抽取一张专属事件卡；点击查看本局卡池'},
 city('nanjing'),
 industry('shipping'),
 city('hangzhou'),
 city('shanghai'),
 industry('airline'),
 city('guangzhou'),
 city('shenzhen'),
 industry('space'),
 city('xiamen'),
 industry('utility'),
 city('qingdao'),
];

export const MAP_SIZES=[20,28,36];
export const MAP_SCOPES={classic:'经典地图',china:'中国城市',world:'世界城市',mixed:'混合城市'};
export const CLASSIC_MAP=Object.freeze({kind:'classic',size:20});
const MAP_GROUPS=Object.freeze(Object.fromEntries(Object.entries(GROUPS).map(([key,g],i)=>[key,{...g,name:['赤色组','紫色组','青色组','金色组'][i]}])));
const SPECIAL_TILES=TILES.map((tile,index)=>({tile,index})).filter(({tile})=>tile.type!=='city');
const CLASSIC_CITY_IDS=TILES.filter(tile=>tile.type==='city').map(tile=>tile.cityId);
export function validateMap(map){
 if(!map)return CLASSIC_MAP;
 let result,base;
 if(map.kind==='classic'){
  if(map.size!==undefined&&map.size!==20)throw new Error('经典地图大小无效');
  result=CLASSIC_MAP;base=CLASSIC_CITY_IDS;
 }else{
  if(!['china','world','mixed'].includes(map.kind)||!MAP_SIZES.includes(map.size)||!Array.isArray(map.cityIds)||map.cityIds.length!==map.size-8||new Set(map.cityIds).size!==map.cityIds.length)throw new Error('地图配置无效');
  for(const id of map.cityIds){const c=getCity(id);if(map.kind!=='mixed'&&c.scope!==map.kind)throw new Error('城市不在地图范围内');}
  result={kind:map.kind,size:map.size,cityIds:[...map.cityIds]};base=map.cityIds;
 }
 if(map.cityOrder!==undefined){
  const order=map.cityOrder,allowed=new Set(base);
  if(!Array.isArray(order)||order.length!==base.length||new Set(order).size!==base.length||order.some(id=>!allowed.has(id)))throw new Error('地图城市顺序无效');
  result={...result,cityOrder:[...order]};
 }
 return result;
}
function shuffle(list,random){const a=[...list];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function generateMap(kind='china',size=20,random=Math.random){
 if(kind==='classic')return CLASSIC_MAP;
 if(!['china','world','mixed'].includes(kind)||!MAP_SIZES.includes(size))throw new Error('地图选项无效');
 const pool=CITY_CATALOG.filter(c=>kind==='mixed'||c.scope===kind),quota=(size-8)/4;
 const selected=Object.keys(GROUPS).flatMap(group=>{const candidates=pool.filter(c=>c.gameplay.group===group);if(candidates.length<quota)throw new Error('该组城市不足');return shuffle(candidates,random).slice(0,quota);});
 return {kind,size,cityIds:shuffle(selected,random).map(c=>c.id)};
}
export function getTiles(state){
 const map=state?.map||CLASSIC_MAP;if(map.kind==='classic'&&!map.cityOrder)return TILES;
 let cursor=0;const special=new Map(SPECIAL_TILES.map(({tile,index})=>[Math.floor(index*map.size/20),tile]));
 const order=map.cityOrder||map.cityIds;
 return Array.from({length:map.size},(_,index)=>special.get(index)||city(order[cursor++]));
}
// Return a state patch. City identity, ownership and occupants move together;
// special stations stay fixed and no game/economy action is triggered here.
export function shuffleCityMap(state,seed,mode='shuffle'){
 if(!Number.isFinite(seed)||seed<0||seed>1)throw new Error('地图重排随机数无效');
 if(!['shuffle','reverse','rotate'].includes(mode))throw new Error('地图重排方式无效');
 const base=validateMap(state.map),before=getTiles({map:base}),ids=before.filter(tile=>tile.type==='city').map(tile=>tile.cityId);
 let randomState=Math.floor(seed*0xffffffff)>>>0;
 const random=()=>((randomState=(Math.imul(randomState,1664525)+1013904223)>>>0)/2**32);
 let cityOrder=mode==='reverse'?[...ids].reverse():mode==='rotate'?[ids.at(-1),...ids.slice(0,-1)]:shuffle(ids,random);
 if(cityOrder.every((id,index)=>id===ids[index]))cityOrder=[...cityOrder.slice(1),cityOrder[0]];
 const map={...base,cityOrder},after=getTiles({map});
 const positions=new Map(after.flatMap((tile,index)=>tile.type==='city'?[[tile.cityId,index]]:[]));
 const move=index=>before[index]?.type==='city'?positions.get(before[index].cityId):Number(index);
 const properties=Object.fromEntries(Object.entries(state.properties).map(([index,property])=>[move(index),{...property}]));
 const players=state.players.map(player=>({...player,pos:move(player.pos)}));
 return {map,properties,players};
}
export function getGroups(state){return !state?.map||state.map.kind==='classic'?GROUPS:MAP_GROUPS;}
export function mapDimensions(size=20){const columns=7+(size-20)/4;return {columns,rows:columns-2};}
export function tilePosition(index,size=20){
 const {columns:c,rows:r}=mapDimensions(size);
 if(index<c)return {gridColumn:index+1,gridRow:1};
 if(index<c+r-1)return {gridColumn:c,gridRow:index-c+2};
 if(index<2*c+r-2)return {gridColumn:2*c+r-2-index,gridRow:r};
 return {gridColumn:1,gridRow:size-index+1};
}

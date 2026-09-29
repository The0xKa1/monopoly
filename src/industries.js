// Original prototype economics. This registry is independent of city identity,
// game state and rendering; callers provide only the current pricing inputs.
export const INDUSTRIES=Object.freeze([
 {id:'railway',name:'铁路公司',shortName:'铁路',price:1800,color:'#b98e68',description:'连接铁路、航空与航运，按同业主交通产业数量计费。',rule:'基础通行费 ¥200；同业主在营的铁路、航空、航运合计 1 / 2 / 3 种时，分别收取 ¥200 / ¥400 / ¥800。'},
 {id:'airline',name:'航空公司',shortName:'航空',price:2400,color:'#7aa8bd',description:'按本次骰点计费，铁路联运提高收入。',rule:'本次骰点 × ¥100；同业主的铁路公司在营时，再乘 1.5。'},
 {id:'shipping',name:'航运公司',shortName:'航运',price:2000,color:'#70a99c',description:'按来访者未抵押城市数量计费，水电供应提供加成。',rule:'¥200 + ¥80 × 来访者未抵押城市数，最多计 10 座；同业主的水利电力公司在营时，再乘 1.5。'},
 {id:'space',name:'太空冒险公司',shortName:'太空',price:3000,color:'#aa91ba',description:'随对局轮数提高费用，航空联运提供加成。',rule:'¥300 + ¥50 ×（当前轮数 − 1），轮数按 1～20 计；同业主的航空公司在营时，再乘 1.5。'},
 {id:'utility',name:'水利电力公司',shortName:'水电',price:2200,color:'#aab777',description:'按本次骰点计费，同业主其他在营产业提高每点费用。',rule:'本次骰点 ×（¥80 + ¥20 × 同业主其他在营产业数），最多计 4 种其他产业。'},
].map(industry=>Object.freeze({...industry,asset:`/assets/industries/${industry.id}.svg`})));

const byId=new Map(INDUSTRIES.map(industry=>[industry.id,industry]));
export function getIndustry(id){
 const industry=byId.get(id);
 if(!industry)throw new Error(`Unknown industry ID: ${id}`);
 return industry;
}
const bounded=(value,min,max,fallback)=>Number.isFinite(value)?Math.min(max,Math.max(min,Math.trunc(value))):fallback;
const money=value=>`¥${value.toLocaleString('en-US')}`;

export function quoteIndustry(id,{dice=1,round=1,visitorCities=0,ownedIds=[]}={}){
 getIndustry(id);
 const points=bounded(dice,1,6,1),turn=bounded(round,1,20,1),cities=bounded(visitorCities,0,10,0);
 const owned=new Set((Array.isArray(ownedIds)?ownedIds:[]).filter(key=>byId.has(key)));
 // The company being quoted counts as its own operational holding, even when
 // asking for its standalone price with no ownership list.
 owned.add(id);
 const links=[],bonuses=[];
 let base,basis,amount;
 const linked=(other,multiplier,label)=>{
  const active=owned.has(other);
  links.push({id:other,label,active});
  if(active)bonuses.push({id:other,label,multiplier});
 };
 if(id==='railway'){
  base=200;
  linked('airline',2,'同业主的航空公司在营：铁路通行费 ×2');
  linked('shipping',2,'同业主的航运公司在营：铁路通行费 ×2');
  const count=1+bonuses.length;
  amount=Math.round(base*2**(count-1));
  basis=`${money(base)} × 2^(${count} − 1) = ${money(amount)}；同业主在营交通产业 ${count} 种`;
 }else if(id==='airline'){
  base=points*100;
  linked('railway',1.5,'同业主的铁路公司在营：航空费用 ×1.5');
  amount=Math.round(base*(bonuses.length?1.5:1));
  basis=`${points} 点 × ¥100${bonuses.length?' × 1.5':''} = ${money(amount)}`;
 }else if(id==='shipping'){
  base=200+80*cities;
  linked('utility',1.5,'同业主的水利电力公司在营：航运费用 ×1.5');
  amount=Math.round(base*(bonuses.length?1.5:1));
  basis=`(¥200 + ¥80 × ${cities} 座)${bonuses.length?' × 1.5':''} = ${money(amount)}；来访者未抵押城市最多计 10 座`;
 }else if(id==='space'){
  base=300+50*(turn-1);
  linked('airline',1.5,'同业主的航空公司在营：太空费用 ×1.5');
  amount=Math.round(base*(bonuses.length?1.5:1));
  basis=`(¥300 + ¥50 × (${turn} − 1))${bonuses.length?' × 1.5':''} = ${money(amount)}；第 ${turn} 轮`;
 }else{
  base=points*80;
  for(const other of INDUSTRIES.filter(industry=>industry.id!=='utility'))links.push({id:other.id,label:`同业主的${other.name}在营：每点费用 + ¥20`,active:owned.has(other.id)});
  const count=links.filter(link=>link.active).length;
  if(count)bonuses.push({id:'network',label:`产业网络：每点费用 + ¥20 × ${count}`,multiplier:(80+20*count)/80});
  amount=Math.round(points*(80+20*count));
  basis=`${points} 点 × (¥80 + ¥20 × ${count} 种) = ${money(amount)}；同业主其他在营产业 ${count} 种`;
 }
 return {amount,base,basis,bonuses,links};
}

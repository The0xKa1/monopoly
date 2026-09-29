import {createPlayer} from './players.js';
import {migrateAppearances} from './appearance.js';
import {getTiles,getGroups,validateMap,CLASSIC_MAP,shuffleCityMap} from './board.js';
import {EVENT_CARDS,getEventCard,eligibleEventCards,eligibleCityEventCards} from './eventCards.js';
import {eventDestinations,eventChoices} from './eventOptions.js';
import {quoteIndustry} from './industries.js';
export {TILES,GROUPS} from './board.js';
export const CARDS = {
 dice:{name:'遥控骰子',desc:'指定下一次移动步数',detail:'指定下一次骰子点数：1～6。'},
 shield:{name:'租金护盾',desc:'免付下一次城市租金',detail:'免付下一次城市租金，触发后失效。'},
 build:{name:'建设补贴',desc:'下一次升级减免 ¥600',detail:'下次升级最多抵扣 ¥600，使用后失效。'},
};
export const SEASONS = [
 {name:'春日旅行季',desc:'江南水乡的城市租金 +30%',group:'east',icon:'flower'},
 {name:'夏日海岸线',desc:'滨海假日的城市租金 +30%',group:'south',icon:'sun'},
 {name:'秋日古都行',desc:'古都人文的城市租金 +30%',group:'north',icon:'leaf'},
 {name:'冬日烟火气',desc:'西南烟火的城市租金 +30%',group:'west',icon:'coffee'},
];
export const season = s => {const season=SEASONS[Math.floor((s.round-1)/4)%4];return !s.map||s.map.kind==='classic'?season:{...season,desc:`${getGroups(s)[season.group].name}的城市租金 +30%`};};
export const ownedAssets = (s,id) => Object.keys(s.properties).filter(k=>s.properties[k].owner===id).map(Number);
export const owned = (s,id) => {const tiles=getTiles(s);return ownedAssets(s,id).filter(i=>tiles[i]?.type==='city');};
export const ownedIndustries = (s,id) => {const tiles=getTiles(s);return ownedAssets(s,id).filter(i=>tiles[i]?.type==='industry');};
export const mortgaged = (s,id) => Object.keys(s.properties).filter(k=>s.properties[k].owner==='bank'&&s.properties[k].mortgagor===id).map(Number);
export const holdings = (s,id) => [...ownedAssets(s,id),...mortgaged(s,id)].sort((a,b)=>a-b);
export const cityHoldings = (s,id) => {const tiles=getTiles(s);return holdings(s,id).filter(i=>tiles[i]?.type==='city');};
export const upgradeSpent = (s,index) => getTiles(s)[index].type==='industry'?0:s.properties[index]?.upgradeSpent ?? (s.properties[index]?.level||0)*Math.round(getTiles(s)[index].price*.5);
export const propertyValue = (s,index) => {const tile=getTiles(s)[index];return tile.price+(tile.type==='industry'?0:(s.properties[index]?.level||0)*Math.round(tile.price*.5));};
export const purchaseQuote = (s,index) => getTiles(s)[index].price+upgradeSpent(s,index);
export const mortgageValue = (s,index) => Math.round(getTiles(s)[index].price*.5)+upgradeSpent(s,index);
export const propertyEquity = (s,id) => holdings(s,id).reduce((sum,i)=>sum+propertyValue(s,i)-(s.properties[i].owner==='bank'?s.properties[i].mortgageAmount:0),0);
export const worth = (s,id) => s.players[id].cash+propertyEquity(s,id)-(s.debt&&s.current===id?s.debt.amount:0);
export const ownerName = (s,prop) => prop?.owner==='bank'?'城市银行':s.players[prop?.owner]?.name||'无';
export const ownerColor = (s,prop) => prop?.owner==='bank'?'#98a29b':s.players[prop?.owner]?.color||'transparent';
export const decisionPlayer = s => s.phase==='offer'?s.offer?.seller:s.current;
export const canRedeem = (s,index,id) => s.current===id&&['roll','end'].includes(s.phase)&&s.properties[index]?.owner==='bank'&&s.properties[index]?.mortgagor===id&&s.players[id].cash>=s.properties[index].mortgageAmount;
// Pricing stays pure so the detail panel can preview dice and visitors. Only
// active properties count; the queried company is a hypothetical new purchase
// when unowned. The actual landing quote is frozen in pendingRent below.
export function getIndustryQuote(s,index,visitor=s.current,owner=s.properties[index]?.owner??visitor){
 const tiles=getTiles(s),tile=tiles[index];
 if(tile?.type!=='industry')return null;
 const ids=owner==='bank'?[]:ownedIndustries(s,owner).map(i=>tiles[i].industryId);
 const quote=quoteIndustry(tile.industryId,{dice:s.lastDice??s.dice,round:s.round,visitorCities:owned(s,visitor).length,ownedIds:ids});
 return owner==='bank'?{...quote,amount:0,basis:'银行代持，暂停收费与产业联动。',bonuses:[],links:quote.links.map(link=>({...link,active:false}))}:quote;
}
export const money = n => '¥ '+n.toLocaleString('en-US');
export function initialState(roster,map=CLASSIC_MAP,eventDeck){return migrateAppearances({version:1,map:validateMap(map),...(Array.isArray(eventDeck)?{eventDeck:[...eventDeck]}:{}),round:1,current:0,phase:'roll',dice:1,lastDice:1,players:roster?roster.map(createPlayer):[
 {name:'小满',role:'旅行家',ability:'经过起点额外获得 ¥200',color:'#518c6c',cash:12000,pos:0,cards:{dice:2,shield:1,build:1}},
 {name:'阿橙',role:'建筑师',ability:'城市升级费用减少 20%',color:'#d79456',cash:12000,pos:0,cards:{dice:0,shield:0,build:0}},
 {name:'小紫',role:'投资人',ability:'收取城市租金增加 15%',color:'#9a81b5',cash:12000,pos:0,cards:{dice:0,shield:0,build:0}},
 {name:'蓝仔',role:'幸运星',ability:'',color:'#699eb6',cash:12000,pos:0,cards:{dice:0,shield:0,build:0}},
],properties:{},journal:[],logs:[{text:'对局开始，每位玩家初始现金 ¥12,000。',round:1}],notice:'等待掷骰。',winner:null});}
export function transfer(s,from,to,amount,label){if(amount<=0)return;if(typeof from==='number')s.players[from].cash-=amount;if(typeof to==='number')s.players[to].cash+=amount;s.transactions.push({from,to,amount,label});s.journal=[{kind:'transaction',round:s.round,from,to,amount,label},...(s.journal||[])].slice(0,40);}
function log(s,text,kind,meta={}){if(kind==='event')s.journal=[{kind,round:s.round,text,...meta},...(s.journal||[])].slice(0,40);s.logs.unshift({text,round:s.round});s.logs=s.logs.slice(0,60);s.notice=text;}
export function rent(s,index){const TILES=getTiles(s);const t=TILES[index],p=s.properties[index];if(!p||p.owner==='bank')return 0;if(t.type==='industry')return getIndustryQuote(s,index).amount;const set=TILES.map((x,i)=>x.type==='city'&&x.group===t.group?i:-1).filter(i=>i>=0);const combo=set.every(i=>s.properties[i]?.owner===p.owner);return Math.round(t.price*.16*(p.level+1)*(combo?1.5:1)*(season(s).group===t.group?1.3:1)*(p.owner===2?1.15:1));}
export function upgradeCost(s,index){const TILES=getTiles(s);if(TILES[index].type!=='city')return 0;return Math.max(0,Math.round(TILES[index].price*.5*(s.current===1?.8:1))-(s.players[s.current].subsidy?600:0));}
function finish(s){s.phase='finished';s.winner=s.players.map((p,i)=>({id:i,worth:worth(s,i)})).filter(p=>!s.players[p.id].bankrupt).sort((a,b)=>b.worth-a.worth)[0].id;log(s,`${s.players[s.winner].name}以 ${money(worth(s,s.winner))} 总资产获胜。`);}
// Obligations stay pending until cash is available. Creditors never receive
// money that the debtor has not paid, and mortgages never sell a property.
function payObligation(s,due,amount=due.amount){
 const payments=due.payments||[{to:due.to,amount:due.amount}];
 const parts=payments.map(x=>({...x,paid:Math.floor(amount*x.amount/due.amount)}));
 let remainder=amount-parts.reduce((sum,x)=>sum+x.paid,0);
 for(const part of parts){if(remainder>0&&part.paid<part.amount){part.paid++;remainder--;}transfer(s,s.current,part.to,part.paid,due.label);}
}
function charge(s,to,amount,label,payments){
 const p=s.players[s.current],due={to,amount,label,...(payments?{payments}:{})};
 if(p.cash>=amount){if(amount>0)payObligation(s,due);s.phase='end';log(s,`${p.name}支付${label} ${money(amount)}。`);}
 else{s.debt=due;s.phase='debt';log(s,`${p.name}待付 ${money(amount)}，现金不足，可抵押城市或产业。`,'event');}
}
function arriveCity(s){
 const p=s.players[s.current],tile=getTiles(s)[p.pos],prop=s.properties[p.pos];s.phase='end';
 if(!prop){s.phase=p.cash>=tile.price?'buy':'end';s.notice=`抵达${tile.name}，${p.cash>=tile.price?'可购买。':'现金不足，暂时无法购买。'}`;}
 else if(prop.owner==='bank')s.notice=`${tile.name}由银行代持，免租且不可购买。`;
 else if(prop.owner===s.current){s.phase=prop.level<3&&p.cash>=upgradeCost(s,p.pos)?'upgrade':'end';s.notice=`${tile.name} · ${prop.level<3?'可升级。':'已满级。'}`;}
 else if(p.shield){p.shield=false;log(s,`${p.name}的租金护盾生效，免付${tile.name}租金。`,'event');}
 else{s.pendingRent={tile:p.pos,owner:prop.owner,amount:rent(s,p.pos),offerRejected:false};s.phase='rent';s.notice=`${tile.name} · 支付租金前可提出收购。`;}
}
function arriveIndustry(s){
 const p=s.players[s.current],tile=getTiles(s)[p.pos],prop=s.properties[p.pos];s.phase='end';
 if(!prop){s.phase=p.cash>=tile.price?'buy':'end';s.notice=`抵达${tile.name}，${p.cash>=tile.price?'可购买。':'现金不足，暂时无法购买。'}`;}
 else if(prop.owner==='bank')s.notice=`${tile.name}由银行代持，暂停收费、交易与产业联动。`;
 else if(prop.owner===s.current)s.notice=`${tile.name}为自己持有，无需支付服务费。`;
 else{const pricing=getIndustryQuote(s,p.pos);s.pendingRent={tile:p.pos,owner:prop.owner,amount:pricing.amount,offerRejected:false,kind:'industry',pricing};s.phase='rent';s.notice=`${tile.name} · 支付服务费前可提出收购。`;}
}
function eventPool(s,source){
 if(source==='city-event')return eligibleCityEventCards(s);
 // The retired shop source only resumes an already saved draw or reveal.
 if(source!=='chance'&&source!=='shop')return [];
 let pool=eligibleEventCards(s);
 if(source==='shop'){pool=pool.filter(c=>['item','item_choice'].includes(c.effect.type));if(!pool.length)pool=EVENT_CARDS.filter(c=>['item','item_choice'].includes(c.effect.type));}
 return pool;
}
function validActiveEvent(s,card){
 return card&&s.activeEvent?.actor===s.current&&eventPool(s,s.activeEvent.source).some(candidate=>candidate.id===card.id);
}
function drawOptions(s,source,seed=0){
 const pool=eventPool(s,source);
 if(!pool.length){s.phase='end';delete s.eventDraw;log(s,'本局没有可抽取的城市事件。','event');return;}
 let n=Math.floor((Number.isFinite(seed)?Math.abs(seed)%1:0)*0x100000000)>>>0;
 const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/0x100000000);
 const cards=[...pool];for(let i=cards.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 s.eventDraw={source,offerIds:Array.from({length:3},(_,i)=>cards[i%cards.length].id)};s.phase='draw';s.notice=source==='shop'?'道具驿站 · 抽取一张卡。':source==='city-event'?'城市事件 · 从本局城市卡池抽取一张卡。':'奇遇 · 抽取一张事件卡。';
}
function bankrupt(s){
 const id=s.current,p=s.players[id],tiles=getTiles(s),released=holdings(s,id),payment=Math.min(p.cash,s.debt.amount);
 if(payment>0)payObligation(s,{...s.debt,label:'破产结算 · '+s.debt.label},payment);
 const unpaid=s.debt.amount-payment;p.cash=0;p.bankrupt=true;
 for(const i of released)delete s.properties[i];
 delete s.debt;delete s.pendingRent;delete s.offer;s.phase='end';
 log(s,`${p.name}破产。${released.length?released.map(i=>tiles[i].name).join('、')+'重新进入市场，城市等级归零。':'无资产回流。'}${unpaid?`未付 ${money(unpaid)} 不再追偿。`:''}`,'event',{category:'bankruptcy',player:id,released});
}
export function transition(state,action){const s=structuredClone(state);const TILES=getTiles(s);const p=s.players[s.current];if(s.phase==='finished')return state;s.transactions=[];
 switch(action.type){
 case 'CARD':{if(s.phase!=='roll'||s.current!==0||!CARDS[action.card]||!p.cards[action.card])return state;if(action.card==='shield'&&p.shield||action.card==='build'&&p.subsidy||action.card==='dice'&&p.controlled)return state;
 if(action.card==='dice'){if(!Number.isInteger(action.value)||action.value<1||action.value>6)return state;p.controlled=action.value;}
 if(action.card==='shield')p.shield=true;if(action.card==='build')p.subsidy=true;p.cards[action.card]--;log(s,`${p.name}使用了${CARDS[action.card].name}${action.card==='dice'?`，下一次前进 ${action.value} 步`:''}。`);break;}
 case 'ROLL':{if(s.phase!=='roll'||!Number.isInteger(action.value)||action.value<1||action.value>6)return state;const steps=p.controlled||action.value;delete p.controlled;s.dice=steps;s.lastDice=steps;const next=p.pos+steps;if(next>=TILES.length){const bonus=s.current===0?1200:1000;transfer(s,'bank',s.current,bonus,'经过起点 · 旅途补给');log(s,`${p.name}经过起点，获得 ${money(bonus)}。`);}p.pos=next%TILES.length;const tile=TILES[p.pos];s.phase='end';log(s,`${p.name}掷出 ${steps} 点，抵达${tile.name}。`);
 if(tile.type==='city')arriveCity(s);
 else if(tile.type==='industry')arriveIndustry(s);
 else if(tile.type==='chance')drawOptions(s,'chance',action.eventSeed??(action.event??0)/4);
 else if(tile.type==='city-event')drawOptions(s,'city-event',action.eventSeed??(action.event??0)/4);
 break;}
 case 'DRAW_EVENT':{
  if(s.phase!=='draw'||!s.eventDraw||!Number.isInteger(action.index)||action.index<0||action.index>=s.eventDraw.offerIds.length)return state;
  const card=getEventCard(s.eventDraw.offerIds[action.index]);if(!card||!eventPool(s,s.eventDraw.source).some(candidate=>candidate.id===card.id))return state;
  s.activeEvent={id:card.id,actor:s.current,source:s.eventDraw.source,slot:action.index};delete s.eventDraw;s.phase='event';
  log(s,`${p.name}抽到${card.cityId?'城市事件':''}「${card.title}」。${card.rule}`,'event',{category:'event-card',cardId:card.id,title:card.title,story:card.story,rule:card.rule,player:s.current,source:s.activeEvent.source,...(card.cityId?{cityId:card.cityId}:{})});break;
 }
 case 'RESOLVE_EVENT':{
  const active=s.activeEvent,card=active&&getEventCard(active.id);if(s.phase!=='event'||!validActiveEvent(s,card))return state;
  const effect=card.effect,label=`事件 · ${card.title}`;
  if(effect.type==='travel'||['item_choice','reward_choice','renovate','redeem_grant'].includes(effect.type)){
   const targets=effect.type==='travel'?eventDestinations(s):eventChoices(s);
   if(targets.length){s.phase=effect.type==='travel'?'event-destination':'event-choice';s.notice=effect.type==='travel'?'选择本局符合条件的城市。':'选择本次事件的奖励或房产。';break;}
   delete s.activeEvent;s.phase='end';
   transfer(s,'bank',s.current,effect.fallback||0,label);
   log(s,`没有符合条件的城市，${p.name}获得 ${money(effect.fallback||0)}。`,'event');break;
  }
  if(effect.type==='shuffle'&&(!effect.mode||action.seed!==undefined)&&(!Number.isFinite(action.seed)||action.seed<0||action.seed>1))return state;
  delete s.activeEvent;s.phase='end';
  if(effect.type==='bank'){
   if(effect.amount>0){const amount=effect.amount;transfer(s,'bank',s.current,amount,label);log(s,`${p.name}获得 ${money(amount)}。`);}
   else charge(s,'bank',-effect.amount,label);
  }else if(effect.type==='gift_all'){
   const payments=s.players.flatMap((other,to)=>to!==s.current&&!other.bankrupt?[{to,amount:effect.amount}]:[]);
   charge(s,'players',payments.length*effect.amount,label,payments);
  }else if(effect.type==='richest_gift'){
   const donor=s.players.map((other,id)=>({other,id})).filter(x=>x.id!==s.current&&!x.other.bankrupt).sort((a,b)=>b.other.cash-a.other.cash||a.id-b.id)[0];
   const amount=donor?Math.min(donor.other.cash,effect.amount):0;if(amount>0)transfer(s,donor.id,s.current,amount,label);
   log(s,amount?`${donor.other.name}向${p.name}赠送 ${money(amount)}。`:'其他玩家没有可赠送的现金。','event');
  }else if(effect.type==='item'){
   p.cards[effect.card]=(p.cards[effect.card]||0)+effect.count;log(s,`${p.name}获得${CARDS[effect.card].name} ×${effect.count}。${CARDS[effect.card].detail}`,'event');
  }else if(effect.type==='shuffle'){
   Object.assign(s,shuffleCityMap(s,action.seed??0,effect.mode));log(s,`${card.title}：城市顺序已重排，产权与人物所在城市保持。`,'event');
  }else if(effect.type==='collect_all'){
   let total=0;
   s.players.forEach((other,id)=>{if(id===s.current||other.bankrupt)return;const amount=Math.min(effect.amount,other.cash);transfer(s,id,s.current,amount,label);total+=amount;});
   log(s,`${p.name}通过「${card.title}」收到 ${money(total)}，每位旅伴按现有现金支付。`,'event');
  }else if(effect.type==='redistribution'){
   const active=s.players.map((other,id)=>({other,id})).filter(x=>!x.other.bankrupt);
   const donor=active.slice().sort((a,b)=>b.other.cash-a.other.cash||a.id-b.id)[0];
   const recipient=active.filter(x=>x.id!==donor?.id).sort((a,b)=>a.other.cash-b.other.cash||a.id-b.id)[0];
   const amount=recipient&&donor.other.cash>recipient.other.cash?Math.min(effect.amount,donor.other.cash):0;
   if(amount)transfer(s,donor.id,recipient.id,amount,label);
   log(s,amount?`${donor.other.name}向${recipient.other.name}支付 ${money(amount)}。`:'现有玩家现金相同，无需转账。','event');
  }else if(effect.type==='interest'){
   const amount=Math.min(effect.cap,Math.floor(p.cash*effect.rate));transfer(s,'bank',s.current,amount,label);
   log(s,`${p.name}领取现金利息 ${money(amount)}。`,'event');
  }else if(effect.type==='property_fee'){
   charge(s,'bank',owned(s,s.current).length*effect.amount,label);
  }else if(effect.type==='property_dividend'||effect.type==='relief'){
   const amount=effect.type==='property_dividend'?owned(s,s.current).length*effect.amount:cityHoldings(s,s.current).length?effect.owned:effect.empty;
   transfer(s,'bank',s.current,amount,label);log(s,`${p.name}获得 ${money(amount)}。`,'event');
  }else if(effect.type==='shield_all'){
   s.players.forEach(other=>{if(!other.bankrupt)other.shield=true;});
   log(s,'所有未破产玩家获得一次免租，已有护盾不叠加。','event');
  }else if(effect.type==='city_host'){
   const index=TILES.findIndex(tile=>tile.type==='city'&&tile.cityId===card.cityId),owner=s.properties[index]?.owner;
   transfer(s,'bank',s.current,effect.amount,label);
   const host=Number.isInteger(owner)&&s.players[owner]&&!s.players[owner].bankrupt;
   if(host)transfer(s,'bank',owner,effect.ownerBonus,label);
   log(s,`${p.name}获得活动补贴 ${money(effect.amount)}。${host?`${s.players[owner].name}作为${TILES[index].name}业主另获 ${money(effect.ownerBonus)}。`:'本城没有可领取额外奖励的业主。'}`,'event');
  }break;
 }
 case 'EVENT_CHOICE':{
  const card=s.activeEvent&&getEventCard(s.activeEvent.id);
  if(s.phase!=='event-choice'||!validActiveEvent(s,card))return state;
  const choice=eventChoices(s).find(option=>option.value===action.value);if(!choice)return state;
  const effect=card.effect,label=`事件 · ${card.title}`;
  delete s.activeEvent;s.phase='end';
  if(effect.type==='item_choice'||effect.type==='reward_choice'){
   if(choice.item){
    const count=effect.type==='reward_choice'?2:effect.count;
    p.cards[choice.item]=(p.cards[choice.item]||0)+count;
    if(s.testRun)s.testRun.chosenItem=choice.item;
    log(s,`${p.name}通过「${card.title}」选择${CARDS[choice.item].name} ×${count}。${CARDS[choice.item].detail}`,'event');
   }else{transfer(s,'bank',s.current,800,label);log(s,`${p.name}选择领取 ¥800。`,'event');}
  }else if(effect.type==='renovate'){
   const prop=s.properties[choice.tile];prop.upgradeSpent=upgradeSpent(s,choice.tile);prop.level++;
   log(s,`${p.name}通过「${card.title}」将${TILES[choice.tile].name}免费升至 ${prop.level+1} 级。`,'event');
  }else if(effect.type==='redeem_grant'){
   const prop=s.properties[choice.tile],amount=prop.mortgageAmount;prop.owner=s.current;delete prop.mortgagor;delete prop.mortgageAmount;
   log(s,`${p.name}选择${TILES[choice.tile].name}，银行免除抵押款 ${money(amount)}，恢复产权与收租。`,'event');
  }break;
 }
 case 'EVENT_DESTINATION':{
  const card=s.activeEvent&&getEventCard(s.activeEvent.id),i=action.tile;
  if(s.phase!=='event-destination'||!validActiveEvent(s,card)||card.effect.type!=='travel'||!Number.isInteger(i)||!eventDestinations(s).includes(i))return state;
  delete s.activeEvent;p.pos=i;log(s,`${p.name}通过「${card.title}」抵达${TILES[i].name}。`,'event');arriveCity(s);break;
 }
 case 'BUY':{if(s.phase!=='buy'||!['city','industry'].includes(TILES[p.pos].type)||s.properties[p.pos]||p.cash<TILES[p.pos].price)return state;transfer(s,s.current,'bank',TILES[p.pos].price,`购买${TILES[p.pos].name}`);s.properties[p.pos]={owner:s.current,level:0};s.phase='end';log(s,`${p.name}购买${TILES[p.pos].name}。`);break;}
 case 'UPGRADE':{if(s.phase!=='upgrade'||TILES[p.pos].type!=='city')return state;const prop=s.properties[p.pos];if(!prop||prop.owner!==s.current||prop.level>=3)return state;const cost=upgradeCost(s,p.pos);if(p.cash<cost)return state;transfer(s,s.current,'bank',cost,`升级${TILES[p.pos].name}`);prop.upgradeSpent=upgradeSpent(s,p.pos)+cost;p.subsidy=false;prop.level++;s.phase='end';log(s,`${p.name}花费 ${money(cost)} 将${TILES[p.pos].name}升至 ${prop.level+1} 级。`);break;}
 case 'OFFER':{
  const due=s.pendingRent,prop=s.properties[due?.tile];
  if(s.phase!=='rent'||!due||due.offerRejected||!prop||prop.owner==='bank'||prop.owner!==due.owner||p.cash<purchaseQuote(s,due.tile))return state;
  s.offer={tile:due.tile,buyer:s.current,seller:due.owner,price:purchaseQuote(s,due.tile),...(due.kind?{kind:due.kind}:{})};s.phase='offer';
  log(s,`${p.name}向${s.players[due.owner].name}提出收购${TILES[due.tile].name}，报价 ${money(s.offer.price)}。`,'event');break;
 }
 case 'OFFER_REPLY':{
  const offer=s.offer,prop=s.properties[offer?.tile];
  if(s.phase!=='offer'||!offer||action.actor!==offer.seller||typeof action.accept!=='boolean'||!prop||prop.owner!==offer.seller||s.players[offer.seller].bankrupt)return state;
  if(action.accept){if(p.cash<offer.price)return state;transfer(s,offer.buyer,offer.seller,offer.price,`收购${TILES[offer.tile].name}`);prop.owner=offer.buyer;s.phase='end';delete s.pendingRent;log(s,`${s.players[offer.seller].name}同意收购，${TILES[offer.tile].name}归${p.name}所有，${offer.kind==='industry'?'免付本次服务费':'本次免租'}。`,'event');}
  else{s.phase='rent';s.pendingRent.offerRejected=true;log(s,`${s.players[offer.seller].name}拒绝收购${TILES[offer.tile].name}，继续支付${offer.kind==='industry'?'服务费':'租金'}。`,'event');}
  delete s.offer;break;
 }
 case 'PAY_RENT':{
  const due=s.pendingRent,prop=s.properties[due?.tile];
  if(s.phase!=='rent'||!due||!prop||prop.owner!==due.owner||prop.owner==='bank')return state;
  delete s.pendingRent;charge(s,due.owner,due.amount,`${TILES[due.tile].name} · ${due.kind==='industry'?'产业服务费':'城市租金'}`);break;
 }
 case 'MORTGAGE':{
  const i=action.tile,prop=s.properties[i];if(s.phase!=='debt'||!s.debt||!Number.isInteger(i)||!prop||prop.owner!==s.current||p.cash>=s.debt.amount)return state;
  const amount=mortgageValue(s,i);prop.owner='bank';prop.mortgagor=s.current;prop.mortgageAmount=amount;
  transfer(s,'bank',s.current,amount,`抵押${TILES[i].name}`);log(s,`${p.name}抵押${TILES[i].name}，银行代持，暂停${TILES[i].type==='industry'?'收费、交易与产业联动':'收租与交易'}。`,'event');break;
 }
 case 'SETTLE_DEBT':{
  if(s.phase!=='debt'||!s.debt||p.cash<s.debt.amount)return state;
  const due=s.debt;delete s.debt;charge(s,due.to,due.amount,due.label,due.payments);break;
 }
 case 'BANKRUPT':{
  if(s.phase!=='debt'||!s.debt||p.cash>=s.debt.amount||ownedAssets(s,s.current).length)return state;
  bankrupt(s);break;
 }
 case 'REDEEM':{
  const i=action.tile;if(!Number.isInteger(i)||!canRedeem(s,i,s.current))return state;
  const prop=s.properties[i],amount=prop.mortgageAmount;
  transfer(s,s.current,'bank',amount,`赎回${TILES[i].name}`);prop.owner=s.current;delete prop.mortgagor;delete prop.mortgageAmount;
  log(s,`${p.name}赎回${TILES[i].name}，恢复产权与${TILES[i].type==='industry'?'收费、产业联动':'收租'}。`,'event');break;
 }
 case 'END':{if(!['end','buy','upgrade'].includes(s.phase))return state;if(s.players.filter(x=>!x.bankrupt).length<=1){finish(s);break;}do{s.current=(s.current+1)%s.players.length;if(s.current===0)s.round++;}while(s.players[s.current].bankrupt);if(s.round>20){s.round=20;finish(s);}else s.phase='roll';break;}
 default:return state;
 }return s;}
export function aiAction(s,random=Math.random){
 const TILES=getTiles(s),p=s.players[s.current];
 if(s.phase==='draw')return {type:'DRAW_EVENT',index:Math.min(s.eventDraw.offerIds.length-1,Math.floor(random()*s.eventDraw.offerIds.length))};
 if(s.phase==='event')return {type:'RESOLVE_EVENT',seed:random()};
 if(s.phase==='event-choice'){
  const options=eventChoices(s);return {type:'EVENT_CHOICE',value:options[Math.min(options.length-1,Math.floor(random()*options.length))]?.value};
 }
 if(s.phase==='event-destination'){const cities=eventDestinations(s);const safe=cities.filter(i=>!s.properties[i]||s.properties[i].owner===s.current||s.properties[i].owner==='bank');const options=safe.length?safe:cities;return {type:'EVENT_DESTINATION',tile:options[Math.min(options.length-1,Math.floor(random()*options.length))]};}
 if(s.phase==='offer'){
  const {seller,tile}=s.offer,group=TILES[tile].group,complete=TILES[tile].type==='city'&&TILES.every((t,i)=>t.type!=='city'||t.group!==group||s.properties[i]?.owner===seller);
  return {type:'OFFER_REPLY',actor:seller,accept:s.players[seller].cash<3000||(!complete&&ownedAssets(s,seller).length<=2)};
 }
 if(s.phase==='rent')return !s.pendingRent.offerRejected&&p.cash-purchaseQuote(s,p.pos)>=1800&&random()<.35?{type:'OFFER'}:{type:'PAY_RENT'};
 if(s.phase==='debt'){
  if(p.cash>=s.debt.amount)return {type:'SETTLE_DEBT'};
  const available=ownedAssets(s,s.current).sort((a,b)=>mortgageValue(s,a)-mortgageValue(s,b));
  return available.length?{type:'MORTGAGE',tile:available[0]}:{type:'BANKRUPT'};
 }
 if(s.phase==='roll'){
  const redeem=mortgaged(s,s.current).find(i=>p.cash-s.properties[i].mortgageAmount>=2000);
  if(redeem!==undefined)return {type:'REDEEM',tile:redeem};
  return {type:'ROLL',value:Math.floor(random()*6)+1,eventSeed:random()};
 }
 if(s.phase==='buy'&&p.cash-TILES[p.pos].price>=900)return {type:'BUY'};
 if(s.phase==='upgrade'&&p.cash-upgradeCost(s,p.pos)>=1200)return {type:'UPGRADE'};
 return {type:'END'};
}

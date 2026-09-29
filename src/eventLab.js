import {CARDS,initialState} from './game.js';
import {getTiles} from './board.js';
import {getEventCard} from './eventCards.js';

export function createEventTestState(source,id,variant='normal'){
 const card=getEventCard(id);if(!card)throw new Error('未知事件卡');
 const state=initialState(source.players,source.map,[id]),tiles=getTiles(state);
 const cities=tiles.flatMap((tile,index)=>tile.type==='city'?[index]:[]);
 if(card.cityId&&!cities.some(index=>tiles[index].cityId===card.cityId))throw new Error('该城市不在本局地图中');
 state.players.forEach((p,i)=>{p.cash=i===0?Math.max(12000,(state.players.length-1)*1000+2000):4000+i*1000;p.cards={dice:0,shield:0,build:0};if(i>0)p.pos=cities[(i-1)%cities.length];});
 const canOwe=card.effect.type==='gift_all'||card.effect.type==='property_fee'||card.effect.type==='bank'&&card.effect.amount<0;
 const scenario=variant==='short-cash'&&canOwe?'short-cash':'normal';
 if(scenario==='short-cash')state.players[0].cash=100;
 const [visitor,own,collateral]=cities,level=scenario==='short-cash'?3:1;
 state.properties[visitor]={owner:1,level:1,upgradeSpent:Math.round(tiles[visitor].price*.5)};
 state.properties[own]={owner:0,level,upgradeSpent:level*Math.round(tiles[own].price*.5)};
 state.properties[collateral]={owner:'bank',mortgagor:0,level:1,upgradeSpent:Math.round(tiles[collateral].price*.5),mortgageAmount:2*Math.round(tiles[collateral].price*.5)};
 if(card.effect.type==='relief'){delete state.properties[own];delete state.properties[collateral];}
 if(card.cityId){
  const index=cities.find(index=>tiles[index].cityId===card.cityId),spent=Math.round(tiles[index].price*.5);
  if(card.effect.type==='renovate')state.properties[index]={owner:0,level:1,upgradeSpent:spent};
  if(card.effect.type==='redeem_grant')state.properties[index]={owner:'bank',mortgagor:0,level:1,upgradeSpent:spent,mortgageAmount:spent*2};
  if(card.effect.type==='city_host')state.properties[index]={owner:1,level:1,upgradeSpent:spent};
 }
 const sourceType=card.cityId?'city-event':'chance';state.players[0].pos=tiles.findIndex(t=>t.type===sourceType);
 state.phase='draw';state.eventDraw={source:sourceType,offerIds:[id,id,id]};state.notice=`事件卡测试 · ${card.title}`;state.logs=[{round:1,text:state.notice}];
 state.testRun={id,variant:scenario,baseline:{cash:state.players.map(p=>p.cash),cards:state.players.map(p=>({...p.cards})),shields:state.players.map(p=>!!p.shield),properties:Object.fromEntries(cities.map(index=>[tiles[index].cityId,state.properties[index]?{...state.properties[index]}:null])),positions:state.players.map(p=>tiles[p.pos].name),cityOrder:tiles.filter(t=>t.type==='city').map(t=>t.cityId)}};
 return state;
}
export function prepareItemTrial(game){
 const card=getEventCard(game.testRun?.id),item=card?.effect.type==='item'?card.effect.card:game.testRun?.chosenItem;
 if(!CARDS[item]||game.phase!=='end'||game.testRun?.itemTrial||!game.players[0].cards[item])return game;
 const next=structuredClone(game),p=next.players[0],tiles=getTiles(next);
 next.current=0;next.phase='roll';next.transactions=[];next.testRun.itemTrial=true;
 delete p.shield;delete p.subsidy;delete p.controlled;
 if(item==='dice')p.pos=0;
 else{
  const index=tiles.findIndex((t,i)=>t.type==='city'&&(item==='shield'?Number.isInteger(next.properties[i]?.owner)&&next.properties[i].owner!==0:next.properties[i]?.owner===0&&next.properties[i].level<3));
  if(index<0)return game;
  p.pos=(index-1+tiles.length)%tiles.length;p.controlled=1;
 }
 next.notice='在棋盘中央打开道具，使用后掷骰。';return next;
}

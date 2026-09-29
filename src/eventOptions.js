import {getTiles} from './board.js';
import {getEventCard} from './eventCards.js';

// Both the UI and reducer use these live targets. A saved event never embeds a
// city from another map, and forged or stale selections cannot bypass filters.
export function eventDestinations(game){
 const effect=getEventCard(game.activeEvent?.id)?.effect;
 if(effect?.type!=='travel')return [];
 const tiles=getTiles(game),actor=game.current;
 const cities=tiles.flatMap((tile,i)=>tile.type==='city'?[i]:[]);
 if(effect.target==='city')return cities.filter(i=>tiles[i].cityId===effect.cityId);
 if(effect.target==='unowned')return cities.filter(i=>!game.properties[i]);
 if(effect.target==='owned')return cities.filter(i=>game.properties[i]?.owner===actor);
 if(effect.target==='forward'){
  const from=game.players[actor].pos;
  const ahead=cities.slice().sort((a,b)=>((a-from+tiles.length-1)%tiles.length)-((b-from+tiles.length-1)%tiles.length));
  return ahead.length?[ahead[(effect.steps-1)%ahead.length]]:[];
 }
 return cities;
}

const itemOptions=[
 {value:'dice',item:'dice',icon:'dice',label:'遥控骰子',detail:'指定下一次骰子点数：1～6。'},
 {value:'shield',item:'shield',icon:'shield',label:'租金护盾',detail:'免付下一次城市租金。'},
 {value:'build',item:'build',icon:'build',label:'建设补贴',detail:'下次升级最多抵扣 ¥600。'},
];
export function eventChoices(game){
 const effect=getEventCard(game.activeEvent?.id)?.effect,actor=game.current;
 if(effect?.type==='item_choice')return itemOptions.map(option=>({...option,detail:`获得 ${effect.count} 张。${option.detail}`}));
 if(effect?.type==='reward_choice')return [
  {value:'cash',icon:'envelope',label:'领取 ¥800',detail:'银行向你支付 ¥800。'},
  {value:'dice',item:'dice',icon:'dice',label:'遥控骰子 ×2',detail:'获得两张，可在掷骰前指定点数。'},
 ];
 if(!['renovate','redeem_grant'].includes(effect?.type))return [];
 return getTiles(game).flatMap((tile,i)=>{
  const prop=game.properties[i];
  const eligible=effect.type==='renovate'?prop?.owner===actor&&prop.level<3:prop?.owner==='bank'&&prop.mortgagor===actor;
  if(tile.type!=='city'||!eligible||(effect.cityId&&tile.cityId!==effect.cityId))return [];
  return [{value:String(i),tile:i,label:tile.name,detail:effect.type==='renovate'?`${prop.level+1} 级 → ${prop.level+2} 级 · 免费`:`免除抵押款 ¥${prop.mortgageAmount.toLocaleString('en-US')} · 恢复产权`}];
 });
}

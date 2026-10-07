import {normalizeAppearance} from './appearance.js';
export const MAX_PLAYERS=20;
export const MAX_NAME_LENGTH=12;
const COLORS=['#518c6c','#d79456','#9a81b5','#699eb6','#be786b','#9b9857','#689d95','#a87d98'];
export function playerNameError(name,players){
 const trimmed=typeof name==='string'?name.trim():'';
 if(!trimmed)return '请输入昵称';
 if([...trimmed].length>MAX_NAME_LENGTH)return '昵称最多 12 个字';
 if(/[\p{Cc}\p{Cf}]/u.test(trimmed))return '昵称包含无效字符';
 if(players.some(p=>p.name===trimmed))return '昵称已存在';
 return '';
}
export function nextPlayerName(players){let n=players.length+1;while(players.some(p=>p.name===`玩家${n}`))n++;return `玩家${n}`;}
export function createPlayer(profile,id){return {
 name:profile.name.trim(),color:profile.color||COLORS[id%COLORS.length],
 appearance:normalizeAppearance(profile.appearance,id),cash:12000,pos:0,
 cards:{dice:id===0?2:0,shield:id===0?1:0,build:id===0?1:0},
 ...(profile.role?{role:profile.role,ability:profile.ability}:{}),
};}
export function addPlayer(state,profile){
 if(state.players.length>=MAX_PLAYERS)return {error:'角色已达 20 个'};
 if(state.phase==='finished')return {error:'对局已结束，请先重新开始'};
 const error=playerNameError(profile?.name,state.players);if(error)return {error};
 const player=createPlayer(profile,state.players.length);
 return {state:{...state,players:[...state.players,player]}};
}
// Append-only roster changes are safe while dice/movement is awaiting completion.
// Pending economic results win, but newer names, appearances and added players survive.
export function mergePendingPlayers(pending,latest){return [...pending.map((p,id)=>({...p,name:latest[id].name,appearance:normalizeAppearance(latest[id].appearance,id)})),...latest.slice(pending.length)];}
// Rename any seat; the name must stay unique among the other players.
export function renamePlayer(state,id,name){
 if(!state.players[id])return {error:'角色不存在'};
 const trimmed=typeof name==='string'?name.trim():'';
 if(trimmed===state.players[id].name)return {state};
 const error=playerNameError(trimmed,state.players.filter((_,i)=>i!==id));if(error)return {error};
 return {state:{...state,players:state.players.map((p,i)=>i===id?{...p,name:trimmed}:p)}};
}
export function validRosterSave(state){return state?.version===1&&Array.isArray(state.players)&&state.players.length>=4&&state.players.length<=MAX_PLAYERS&&Number.isInteger(state.current)&&state.current>=0&&state.current<state.players.length&&['roll','buy','upgrade','rent','offer','debt','draw','event','event-destination','event-choice','end','finished'].includes(state.phase);}

// Appearance is cosmetic data. Values are restricted to this palette and these parts.
export const APPEARANCE_OPTIONS = {
 skin:[['light','浅肤','#f4d2ad'],['warm','暖肤','#e9b98d'],['tan','小麦','#ca9067'],['brown','棕肤','#a96f50'],['deep','深肤','#79513e']],
 hair:[['short','短发'],['bob','短直发'],['long','长发'],['curly','卷发']],
 hairColor:[['ink','墨黑','#3c4141'],['brown','栗棕','#70503c'],['gold','金黄','#c59c59'],['silver','银灰','#b6bdba'],['red','赤棕','#a55746'],['violet','灰紫','#85728b']],
 shirt:[['green','松绿','#528867'],['orange','暖橙','#d49451'],['purple','灰紫','#9777ad'],['blue','湖蓝','#609ab2'],['red','砖红','#b86556'],['cream','奶油','#ddc994'],['pink','藕粉','#c18d9c'],['black','炭灰','#505961']],
 pants:[['dark','深灰','#4e5b55'],['denim','靛蓝','#526d88'],['sand','沙色','#ae9674'],['brown','咖啡','#795846']],
 hat:[['none','无'],['cap','鸭舌帽'],['beanie','针织帽'],['brim','宽檐帽']],
 glasses:[['none','无'],['round','圆框'],['square','方框']],
 accessory:[['none','无'],['backpack','背包'],['scarf','围巾']]
};
export function defaultAppearance(id=0) {
 return {skin:'warm',hair:['short','curly','bob','long'][id]||'short',hairColor:'brown',shirt:['green','orange','purple','blue'][id]||'green',pants:'dark',hat:'none',glasses:'none',accessory:'none'};
}
export function normalizeAppearance(value,id=0) {
 const fallback=defaultAppearance(id),source=value&&typeof value==='object'?value:{};
 return Object.fromEntries(Object.entries(APPEARANCE_OPTIONS).map(([key,options])=>[key,options.some(([v])=>v===source[key])?source[key]:fallback[key]]));
}
export function randomAppearance(random=Math.random) {
 return Object.fromEntries(Object.entries(APPEARANCE_OPTIONS).map(([key,options])=>[key,options[Math.min(options.length-1,Math.max(0,Math.floor(random()*options.length)))][0]]));
}
export function applyAppearance(state,id,value) {
 if(!Number.isInteger(id)||!state.players[id])return state;
 return {...state,players:state.players.map((p,i)=>i===id?{...p,appearance:normalizeAppearance(value,id)}:p)};
}
export function migrateAppearances(state) {
 return {...state,players:state.players.map((p,id)=>({...p,appearance:normalizeAppearance(p.appearance,id)}))};
}
const rect=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
export function renderAvatar(value,frame=null) {
 const a=normalizeAppearance(value),color=key=>APPEARANCE_OPTIONS[key].find(([v])=>v===a[key])[2];
 const skin=color('skin'),hair=color('hairColor'),shirt=color('shirt'),pants=color('pants');
 const step=frame===0?-2:frame===1?2:0;
 let s=rect(11,59,28,2,'#64896c44');
 if(a.hair==='long')s+=rect(9,12,30,29,hair)+rect(7,21,5,22,hair)+rect(36,21,5,22,hair);
 if(a.accessory==='backpack')s+=rect(8,32,31,17,'#af9065')+rect(6,35,5,14,'#d4b57a')+rect(37,34,5,16,'#d4b57a');
 s+=rect(14,31,21,18,shirt)+rect(14,31,4,17,'#ffffff22')+rect(23,32,3,16,'#f6e4b2')+rect(11,32+step,4,13,shirt)+rect(10,43+step,5,5,skin)+rect(35,32-step,4,13,shirt)+rect(35,43-step,5,5,skin);
 s+=rect(16,48,7,8+step,pants)+rect(28,48,7,8-step,pants)+rect(14,55+step,9,4,'#374d43')+rect(28,55-step,10,4,'#374d43');
 s+=rect(11,9,27,17,hair)+rect(14,12,20,18,skin)+rect(11,17,4,8,skin)+rect(33,17,4,8,skin)+rect(17,19,3,4,'#343e38')+rect(28,19,3,4,'#343e38')+rect(17,19,1,1,'#fff5dc')+rect(28,19,1,1,'#fff5dc')+rect(22,27,6,2,'#985f49');
 if(a.hair==='short')s+=rect(12,6,24,7,hair)+rect(10,10,11,6,hair)+rect(12,13,5,4,hair);
 if(a.hair==='bob')s+=rect(11,6,26,9,hair)+rect(8,13,7,19,hair)+rect(34,13,6,19,hair)+rect(18,13,12,3,hair);
 if(a.hair==='long')s+=rect(13,5,22,9,hair)+rect(10,10,11,8,hair)+rect(31,12,6,9,hair);
 if(a.hair==='curly')for(const [x,y] of [[11,7],[18,4],[25,5],[32,8],[8,13],[34,14]])s+=rect(x,y,8,7,hair)+rect(x+2,y-2,4,2,hair);
 if(a.hat==='cap')s+=rect(11,7,25,8,shirt)+rect(13,5,19,3,shirt)+rect(29,14,15,4,shirt)+rect(14,8,4,5,'#ffffff33');
 if(a.hat==='beanie')s+=rect(11,7,26,9,shirt)+rect(15,3,18,5,shirt)+rect(22,0,6,4,shirt)+rect(10,14,28,4,'#e5d4a9')+rect(18,5,2,8,'#ffffff33');
 if(a.hat==='brim')s+=rect(13,5,22,9,shirt)+rect(6,14,37,4,shirt)+rect(13,11,22,3,'#dbc288');
 if(a.glasses!=='none'){
  for(const x of [15,26])s+=a.glasses==='square'?rect(x,17,9,8,'#4c5153')+rect(x+2,19,5,4,'#a7c3b9'):
   rect(x+1,17,7,1,'#4c5153')+rect(x,18,1,6,'#4c5153')+rect(x+8,18,1,6,'#4c5153')+rect(x+1,24,7,1,'#4c5153');
  s+=rect(24,20,2,2,'#4c5153');
 }
 if(a.accessory==='scarf')s+=rect(13,30,23,4,'#e0b572')+rect(29,33,5,12,'#e0b572')+rect(29,43,5,2,'#ba8554');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 64" shape-rendering="crispEdges">${s}</svg>`;
}

import {writeFileSync,mkdirSync} from 'node:fs';
import {defaultAppearance,renderAvatar} from '../src/appearance.js';
import {generateCityAssets} from './draw-city-library.mjs';
import {drawCityEventStation} from './draw-city-event-station.mjs';
import {generateIndustryAssets} from './draw-industries.mjs';
generateCityAssets();
generateIndustryAssets();
for(const dir of ['players','stations'])mkdirSync(`public/assets/${dir}`,{recursive:true});
const R=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const P=(p,c)=>`<polygon points="${p}" fill="${c}"/>`;
const G=(x,y,s)=>`<g transform="translate(${x} ${y})">${s}</g>`;
const wrap=(s,w=96,h=80)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${s}</svg>`;
const C={ink:'#4b5547',cream:'#f7e4b4',gold:'#d2a14f',roof:'#54857a',red:'#b45f4f',water:'#88c8c1'};
function tree(x,y,c='#709b68'){return G(x,y,R(7,15,3,12,'#887657')+R(3,5,12,13,c)+R(0,9,18,8,c)+R(6,2,6,5,c)+R(4,7,5,6,'#a3bb7e')+R(4,26,12,2,'#8ea68a'));}
function roof(x,y,w,c=C.roof){return R(x-3,y,w+6,3,'#4a6860')+R(x,y-3,w,3,c)+R(x+4,y-6,w-8,3,c)+R(x+8,y-8,w-16,2,c)+R(x-3,y-2,3,2,c)+R(x+w,y-2,3,2,c)+R(x+5,y-4,w-10,1,'#d7bb73');}
function windows(x,y,w,h,c='#ffe1a0'){let s='';for(let yy=y;yy<y+h;yy+=6)for(let xx=x;xx<x+w;xx+=6)s+=R(xx,yy,2,3,c);return s;}
function tower(x,y,w,h,c){return R(x,y,w,h,c)+R(x+w,y+4,4,h-4,'#607f80')+R(x,y,w,2,'#d6dcbd')+windows(x+3,y+5,w-5,h-6);}
function house(x,y,w=20,c=C.red){return R(x,y,w,18,C.cream)+R(x+w,y+2,4,16,'#cbb994')+roof(x-1,y,w+2,c)+R(x+3,y+5,4,5,'#799b97')+R(x+w-6,y+5,3,5,'#799b97')+R(x+w/2-2,y+10,5,8,'#866f55');}
function base(water=false){let s=P('5,62 69,57 94,64 76,75 13,76 1,70','#b6c79e')+P('1,70 13,76 76,75 94,64 94,69 77,80 12,80 1,75','#81977b')+P('7,64 71,60 88,65 73,71 16,72','#cbd5ae');if(water){s+=P('3,66 47,62 93,67 74,75 11,74',C.water);for(let i=0;i<7;i++)s+=R(8+i*11,68+i%2*4,6,1,'#c4e5cd');}return s;}
function person(x,y,c='#dc9b65'){return G(x,y,R(1,0,3,3,'#584e43')+R(1,2,3,3,'#f0cc9a')+R(0,5,5,5,c)+R(0,10,2,3,'#526357')+R(3,10,2,3,'#526357'));}
function lantern(x,y){return R(x,y,1,6,'#71664a')+R(x-2,y+5,5,6,'#d18459')+R(x,y+11,1,3,'#e1b765');}
function pagoda(x,y,levels,c=C.roof){let s=R(x+13,y-9,2,10,C.gold);for(let i=0;i<levels;i++){const w=18+i*6,xx=x+14-w/2,yy=y+i*12;s+=R(xx,yy,w,11,'#dbb27b')+R(xx+w-3,yy,3,11,'#ad8661')+R(x+12,yy+4,4,6,'#735b4c')+roof(xx-3,yy,w+6,c);}return s;}
// Default appearance exports are reference assets; the app composes live player appearances.
for(let id=0;id<4;id++)for(const frame of [null,0,1]){
 writeFileSync(`public/assets/players/${id}${frame===null?'':`-walk-${frame}`}.svg`,renderAvatar(defaultAppearance(id),frame));
}
const stations={
 start:base()+R(22,20,4,43,'#7d8f6b')+P('26,20 61,20 53,30 61,39 26,39','#6b9b69')+R(29,24,7,7,'#e7e9be')+R(36,31,7,7,'#e7e9be')+R(19,60,18,6,'#bdcba0')+tree(64,40)+person(46,56),
 chance:base()+R(24,27,45,35,'#bf995d')+R(22,39,49,5,'#9c794c')+R(28,22,37,6,'#e4c27e')+R(24,27,45,5,'#eccf8a')+R(44,36,8,15,'#e5bd60')+R(46,40,4,6,'#826d46')+P('46,5 50,15 60,19 50,23 46,33 42,23 32,19 42,15','#f4d781')+R(16,18,4,4,'#f5dfa2')+R(74,27,5,5,'#f5dfa2')+R(65,9,3,3,'#ddba69'),
};
for(const [name,s] of Object.entries(stations))writeFileSync(`public/assets/stations/${name}.svg`,wrap(s));
drawCityEventStation();
console.log('Drawn: city library, 5 industries, 4 portraits + 8 walking frames, 3 special stations.');

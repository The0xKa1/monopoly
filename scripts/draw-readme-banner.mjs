// Original pixel lettering and scenery; characters use the game's own renderer.
// Rebuild from the repository root: node scripts/draw-readme-banner.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { defaultAppearance, renderAvatar } from '../src/appearance.js';

const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const glyphs = {
 M:['10001','11011','10101','10101','10001','10001','10001'],
 O:['01110','10001','10001','10001','10001','10001','01110'],
 N:['10001','11001','11001','10101','10011','10011','10001'],
 P:['11110','10001','10001','11110','10000','10000','10000'],
 L:['10000','10000','10000','10000','10000','10000','11111'],
 Y:['10001','10001','01010','00100','00100','00100','00100'],
};
const letter = (char, x, y, fill) => glyphs[char].map((row, j) => [...row].map((v, i) => v === '1' ? rect(x+i*14,y+j*14,14,14,fill) : '').join('')).join('');
const words = (dx,dy,fill) => [...'MONOPOLY'].map((c,i)=>letter(c,151+i*84+dx,118+dy,fill)).join('');
const avatar = (id, x, y, motion) => {
 const a = {...defaultAppearance(id), ...(id === 0 ? {hat:'cap'} : id === 2 ? {accessory:'scarf'} : {})};
 const body = frame => renderAvatar(a,frame).replace(/^<svg[^>]*>/,'').replace(/<\/svg>$/,'');
 return `<g transform="translate(${x} ${y})"><g class="${motion}"><g class="frame-a">${body(0)}</g><g class="frame-b">${body(1)}</g></g></g>`;
};
const house = (x,y,color) => `<g transform="translate(${x} ${y})">${rect(0,24,56,40,'#eddcba')}${rect(8,8,40,8,color)}${rect(0,16,56,8,color)}${rect(-8,24,72,8,color)}${rect(8,38,12,12,'#fffbec')}${rect(36,38,12,12,'#fffbec')}${rect(24,44,10,20,'#9a7758')}${rect(-4,64,64,4,'#cbbd97')}</g>`;
const coin = `<path d="M-6-12H6V-8H10V8H6V12H-6V8H-10V-8H-6Z" fill="#d8a646"/><path d="M-3-8H3V8H-3Z" fill="#fff0ad"/>`;
const cloud = (x,y) => `<g transform="translate(${x} ${y})" fill="#fffdf3">${rect(8,0,32,8,'#fffdf3')}${rect(0,8,56,8,'#fffdf3')}</g>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="340" viewBox="0 0 960 340" role="img" aria-labelledby="title description" shape-rendering="crispEdges">
<title id="title">MONOPOLY — 像素城市大富翁</title>
<desc id="description">绿色像素大标题，四位游戏角色在字母上跳跃、掷骰、接金币。奶油色街景配有房屋和棋盘路线，动画每12秒循环，支持减少动态。</desc>
<style>
.frame-b{opacity:0;animation:step-b .4s steps(1,end) infinite}.frame-a{animation:step-a .4s steps(1,end) infinite}
.runner{animation:run 12s linear infinite}.hopper{animation:hop 12s linear infinite}.thrower{animation:throw 12s steps(2,end) infinite}.catcher{animation:catch 12s linear infinite}
.dice{animation:dice 12s linear infinite;transform-box:fill-box;transform-origin:center}.coin{animation:coin 12s linear infinite}.spark{animation:spark 12s steps(1,end) infinite}
@keyframes step-a{0%,49%{opacity:1}50%,100%{opacity:0}}@keyframes step-b{0%,49%{opacity:0}50%,100%{opacity:1}}
@keyframes run{0%,8%{transform:translateX(0)}38%,53%{transform:translateX(210px)}83%,100%{transform:translateX(0)}}
@keyframes hop{0%,12%{transform:translate(0,0)}18%{transform:translate(42px,-36px)}24%,30%{transform:translate(84px,0)}36%{transform:translate(126px,-36px)}42%,55%{transform:translate(168px,0)}61%{transform:translate(126px,-36px)}67%,73%{transform:translate(84px,0)}79%{transform:translate(42px,-36px)}85%,100%{transform:translate(0,0)}}
@keyframes throw{0%,20%,40%,100%{transform:translateY(0)}25%,35%{transform:translateY(-6px)}}
@keyframes dice{0%,20%{transform:translate(0,0) rotate(0)}30%{transform:translate(42px,-58px) rotate(180deg)}40%,70%{transform:translate(84px,0) rotate(360deg)}80%{transform:translate(42px,-58px) rotate(180deg)}90%,100%{transform:translate(0,0) rotate(0)}}
@keyframes coin{0%,43%,82%,100%{opacity:0;transform:translate(0,0)}45%{opacity:1;transform:translate(0,0)}56%{opacity:1;transform:translate(60px,-52px)}68%{opacity:1;transform:translate(120px,0)}72%{opacity:0;transform:translate(120px,0)}}
@keyframes catch{0%,62%,75%,100%{transform:translateY(0)}68%{transform:translateY(-16px)}}
@keyframes spark{0%,65%,77%,100%{opacity:0}66%,76%{opacity:1}}
@media(prefers-reduced-motion:reduce){*{animation:none!important}.frame-a{opacity:1}.frame-b,.coin,.spark{opacity:0}}
</style>
${rect(0,0,960,340,'#f7f0dd')}
${rect(12,12,936,316,'#e8dfc4')}${rect(14,14,932,312,'#f7f0dd')}
${cloud(62,62)}${cloud(824,48)}${cloud(590,34)}
${rect(882,88,16,16,'#e9bc62')}${rect(878,92,24,8,'#e9bc62')}
${words(4,8,'#b7c0a0')}${words(0,0,'#355f4b')}
<g opacity=".3">${[...Array(8)].map((_,i)=>rect(151+i*84,230,70,4,['#b56b50','#e0b75c','#7c9b7c','#6f99a5'][i%4])).join('')}</g>
${house(54,199,'#bc785d')}${house(850,197,'#78977b')}
${rect(40,296,880,4,'#b3b899')}${rect(40,300,880,12,'#e4dbc0')}
${Array.from({length:44},(_,i)=>rect(44+i*20,304,10,2,'#c7bfa3')).join('')}
${avatar(0,165,238,'runner')}${avatar(1,546,238,'thrower')}${avatar(2,312,58,'hopper')}${avatar(3,752,238,'catcher')}
<g transform="translate(608 270)"><g class="dice">${rect(-16,-16,32,32,'#355f4b')}${rect(-12,-12,24,24,'#fffaf0')}${[[-7,-7],[3,-7],[-2,-2],[-7,3],[3,3]].map(([x,y])=>rect(x,y,4,4,'#355f4b')).join('')}</g></g>
<g transform="translate(656 252)"><g class="coin">${coin}</g></g>
<g class="spark" fill="#d8a646">${rect(773,218,4,16,'#d8a646')}${rect(767,224,16,4,'#d8a646')}${rect(796,238,8,4,'#d8a646')}</g>
</svg>\n`;
mkdirSync(new URL('../public/assets/readme/', import.meta.url), {recursive:true});
writeFileSync(new URL('../public/assets/readme/monopoly-banner.svg',import.meta.url),svg);
writeFileSync(new URL('../public/assets/readme/monopoly-banner-still.svg',import.meta.url),svg.replace(/<style>[\s\S]*?<\/style>/, '<style>.frame-b,.coin,.spark{display:none}</style>'));
console.log(`Generated MONOPOLY banner (${Buffer.byteLength(svg)} bytes)`);

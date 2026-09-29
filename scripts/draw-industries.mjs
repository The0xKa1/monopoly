/** Original pixel geometry, no external image inputs. Regenerate all industries. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {INDUSTRIES} from '../src/industries.js';

const C={ink:'#4c6059',cream:'#f0dfb8',white:'#f8efd8',gold:'#d6aa60',red:'#b97560',green:'#709476',roof:'#5d887e',blue:'#739fa8',water:'#8ac7c2',shadow:'#829e83',stone:'#b1b8a0'};
const R=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
const P=(points,color)=>`<polygon points="${points}" fill="${color}"/>`;
const G=(x,y,content)=>`<g transform="translate(${x} ${y})">${content}</g>`;
const base=(water=false)=>P('5,62 69,58 94,65 77,76 13,76 1,70',water?'#96bfad':'#b5c99e')+P('1,70 13,76 77,76 94,65 94,69 78,80 12,80 1,75',C.shadow)+P('7,64 71,61 88,66 74,72 16,72',water?C.water:'#d0d8b1');
const windows=(x,y,count,color=C.blue)=>Array.from({length:count},(_,i)=>R(x+i*7,y,4,6,color)+R(x+i*7,y,4,1,'#c6e2d6')).join('');
const person=(x,y,color=C.red)=>G(x,y,R(1,0,3,2,C.ink)+R(1,2,3,3,'#eac89e')+R(0,5,5,5,color)+R(0,10,2,3,C.ink)+R(3,10,2,3,C.ink));
const shrub=(x,y)=>G(x,y,R(2,2,8,8,C.green)+R(0,5,12,5,C.green)+R(3,3,4,3,'#a0ba84')+R(4,10,4,3,'#8c7e5d'));
const waves=(y)=>Array.from({length:7},(_,i)=>R(9+i*11,y+i%2*3,6,1,'#d0e8d1')).join('');

const art={
 railway:()=>base()+
  R(7,55,81,3,'#7a8474')+R(7,65,81,2,'#7a8474')+Array.from({length:13},(_,i)=>R(9+i*6,55,2,13,'#a69776')).join('')+
  R(9,25,49,26,C.cream)+R(58,29,5,22,'#baad89')+R(6,22,56,4,C.roof)+R(11,18,46,4,'#81a18a')+R(19,14,30,4,C.roof)+
  R(29,8,12,12,C.cream)+R(31,10,8,8,C.white)+R(34,11,1,5,C.ink)+R(34,15,3,1,C.ink)+windows(14,30,6)+R(28,40,10,11,'#9b886e')+
  R(13,40,51,3,'#d8bc85')+R(15,42,2,12,C.ink)+R(54,42,2,11,C.ink)+
  R(24,46,33,15,C.red)+R(28,42,25,4,C.cream)+R(28,48,7,6,C.blue)+R(37,48,7,6,C.blue)+R(47,48,6,6,C.blue)+R(25,58,31,3,'#e0b472')+
  R(56,47,27,14,C.roof)+R(59,41,11,14,C.roof)+R(61,43,7,7,C.blue)+R(73,39,5,10,C.ink)+R(71,37,9,3,C.ink)+R(80,50,5,9,C.gold)+R(55,58,29,4,C.gold)+
  [29,48,61,76].map(x=>R(x,61,6,5,C.ink)+R(x+2,62,2,2,'#b6bba3')).join('')+
  R(75,27,6,6,'#c9cdb8')+R(78,19,8,6,'#daddc7')+R(71,13,9,5,'#e8e6ce')+person(10,48,'#839bae')+shrub(79,64),
 airline:()=>base()+
  P('3,62 52,58 91,64 83,71 20,73','#a9b4a0')+R(8,67,12,2,C.white)+R(26,67,12,2,C.white)+R(45,66,10,2,C.white)+
  R(7,37,43,19,C.cream)+R(6,33,45,4,C.roof)+R(11,29,34,4,'#aabbaa')+windows(10,39,5)+R(12,48,32,8,'#92adb0')+R(18,48,2,8,C.cream)+R(32,48,2,8,C.cream)+
  R(20,18,8,17,'#c0baa0')+R(15,11,19,12,C.blue)+R(17,8,15,3,C.ink)+R(15,11,19,2,C.cream)+R(21,13,2,8,C.cream)+R(29,13,2,8,C.cream)+R(24,3,2,5,C.ink)+R(22,2,6,2,C.gold)+
  P('43,55 69,53 71,29 75,29 79,51 90,48 93,50 86,57 94,62 92,65 79,61 69,65 52,65 42,60',C.ink)+
  P('45,55 69,54 72,31 74,31 78,54 90,50 91,51 84,58 91,63 90,64 78,59 68,63 52,63 44,59',C.white)+
  R(51,56,24,3,'#d9dbbc')+R(49,55,7,3,C.blue)+R(58,55,3,2,C.blue)+R(64,55,3,2,C.blue)+R(70,55,3,2,C.blue)+R(73,31,1,13,C.red)+R(53,63,4,3,C.ink)+R(75,61,4,3,C.ink)+
  R(3,53,3,7,C.gold)+R(4,48,1,5,C.ink)+R(4,48,9,3,C.red)+person(35,52,C.gold)+shrub(3,61),
 shipping:()=>base(true)+
  R(6,59,25,9,'#c4b78e')+R(8,66,3,8,'#8b8f74')+R(25,64,3,8,'#8b8f74')+
  R(8,24,4,37,C.gold)+R(8,20,27,4,C.gold)+R(11,16,19,4,'#b78c53')+R(29,24,2,17,C.ink)+R(27,40,6,3,C.ink)+R(28,37,2,5,C.ink)+R(9,29,7,2,'#e4c27e')+R(9,39,7,2,'#e4c27e')+
  R(37,27,16,27,C.cream)+R(40,22,10,5,C.white)+R(40,31,4,7,C.blue)+R(46,31,4,7,C.blue)+R(44,13,2,9,C.ink)+R(46,14,9,5,C.red)+
  R(52,38,17,15,C.red)+R(54,40,2,11,'#dfab7e')+R(60,40,2,11,'#dfab7e')+R(66,40,2,11,'#dfab7e')+R(69,40,17,13,C.green)+R(71,42,2,9,'#b0c18e')+R(77,42,2,9,'#b0c18e')+R(82,42,2,9,'#b0c18e')+
  P('30,51 92,51 86,64 41,67 31,59',C.ink)+P('33,52 89,52 84,61 42,64 34,58',C.roof)+R(35,52,52,3,C.gold)+R(42,57,6,3,C.white)+R(52,57,6,3,C.white)+R(78,56,4,4,C.white)+
  R(15,43,8,15,C.white)+R(16,37,6,6,C.red)+R(14,36,10,2,C.ink)+R(17,40,4,3,C.gold)+R(15,50,8,3,C.red)+person(23,52,'#8f9ead')+waves(69),
 space:()=>base()+
  R(21,63,56,7,'#b5b5a0')+R(24,59,47,5,'#d4c6a4')+R(25,18,5,42,'#92948e')+R(40,18,4,42,'#92948e')+R(25,17,20,4,C.red)+R(28,13,13,4,'#baada0')+
  [25,35,45,55].map(y=>R(26,y,18,3,'#baa08a')+P(`28,${y+3} 31,${y+3} 42,${y+10} 39,${y+10}`,C.stone)).join('')+
  R(40,25,21,4,C.red)+R(42,40,17,3,C.red)+
  R(53,20,15,33,C.ink)+R(55,17,11,36,C.white)+R(57,13,7,4,C.white)+R(59,9,3,4,C.red)+R(57,17,7,5,C.red)+R(58,26,6,7,C.blue)+R(59,27,3,4,'#b6d9d7')+
  R(55,37,11,4,C.red)+R(57,46,7,7,'#c8c7af')+P('53,40 48,50 48,57 55,52',C.red)+P('68,40 73,50 73,57 66,52',C.red)+R(57,53,7,5,C.gold)+R(59,57,3,8,'#f1c570')+R(57,57,2,4,'#e6a567')+R(62,57,2,4,'#e6a567')+
  R(5,47,18,16,C.cream)+R(3,44,22,4,C.roof)+windows(8,50,2)+R(16,57,4,6,'#97876d')+R(9,36,2,8,C.ink)+P('8,34 15,29 18,32 12,38',C.blue)+
  R(78,16,3,3,C.gold)+R(76,19,7,1,C.gold)+R(78,20,3,2,C.gold)+R(83,37,2,2,C.gold)+R(49,6,2,2,'#d8c389')+person(78,55,'#a58db1'),
 utility:()=>base(true)+
  P('12,32 48,28 64,39 60,61 48,68 14,61',C.ink)+P('14,33 48,30 61,40 57,60 47,65 16,59',C.stone)+R(14,31,35,5,'#d9d5b7')+P('49,32 61,40 58,57 50,51','#a2ab94')+
  [19,30,41].map((x,i)=>R(x,37,7,19,'#7c958d')+R(x+1,43,5,16,'#9bd7cc')+R(x+2,43,2,16,'#d2ead7')+P(`${x+1},59 ${x+6},59 ${x+11},67 ${x+3},70`,'#a4dacf')).join('')+
  R(9,29,44,3,C.gold)+R(11,25,2,5,C.ink)+R(25,25,2,5,C.ink)+R(39,25,2,5,C.ink)+R(11,24,30,2,C.ink)+
  R(72,25,3,37,'#d6d4b7')+R(70,22,7,6,C.ink)+R(72,23,3,3,C.white)+P('73,22 71,5 74,3 76,21',C.white)+P('71,25 57,31 54,29 69,22',C.white)+P('76,25 86,35 86,39 73,28',C.white)+
  R(65,53,15,13,C.roof)+R(67,51,11,3,C.cream)+R(69,54,6,9,C.gold)+P('72,54 69,59 72,59 70,63 76,57 73,57',C.white)+
  R(85,39,2,28,'#9b9275')+R(80,42,12,2,C.ink)+R(81,37,2,6,C.blue)+R(88,37,2,6,C.blue)+R(77,42,4,1,C.ink)+R(77,42,1,13,C.ink)+waves(71)+shrub(2,50),
};

const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
export function generateIndustryAssets(publicDir=fileURLToPath(new URL('../public/',import.meta.url))){
 const files=INDUSTRIES.map(industry=>{
  if(!art[industry.id])throw new Error(`Missing industry drawing: ${industry.id}`);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 80" shape-rendering="crispEdges" role="img" aria-labelledby="title"><title id="title">${escape(industry.name)}</title>${art[industry.id]()}</svg>\n`;
  return {path:resolve(publicDir,'.'+industry.asset),svg};
 });
 for(const id of Object.keys(art))if(!INDUSTRIES.some(industry=>industry.id===id))throw new Error(`Unregistered industry drawing: ${id}`);
 for(const file of files){mkdirSync(dirname(file.path),{recursive:true});writeFileSync(file.path,file.svg);}
 return files.length;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(`Generated ${generateIndustryAssets()} industry assets.`);

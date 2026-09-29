import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Original pixel geometry for the city-event kiosk. No external image inputs.
const rect=(x,y,w,h,fill)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const poly=(points,fill)=>`<polygon points="${points}" fill="${fill}"/>`;
const card=(x,y,w,h)=>rect(x,y,w,h,'#896b35')+rect(x+2,y+2,w-4,h-4,'#e6bf66')+rect(x+4,y+4,w-8,h-8,'#fcf0b4')+rect(x+6,y+8,3,h-15,'#839a64')+rect(x+10,y+5,4,h-12,'#68855b')+rect(x+15,y+10,3,h-17,'#a4b677')+rect(x+5,y+h-8,w-10,2,'#d3b76e');
export function drawCityEventStation(){
 const scene=poly('5,62 69,57 94,64 76,75 13,76 1,70','#b6c79e')+poly('1,70 13,76 76,75 94,64 94,69 77,80 12,80 1,75','#81977b')+poly('7,64 71,60 88,65 73,71 16,72','#d5ddb2')+
  rect(17,31,4,35,'#7b885b')+rect(75,31,4,35,'#7b885b')+rect(17,61,62,6,'#899965')+
  poly('12,28 22,15 72,15 84,28','#587a56')+rect(13,28,70,5,'#78945f')+rect(23,16,47,3,'#b6c985')+
  card(23,34,24,26)+card(47,31,25,29)+rect(47,33,2,25,'#f7e9a5')+
  rect(40,9,16,14,'#e2bd64')+rect(43,7,10,2,'#e2bd64')+rect(44,12,8,3,'#fbefb2')+rect(47,15,3,5,'#758753')+
  rect(5,45,9,3,'#a8bc75')+rect(7,42,6,9,'#a8bc75')+rect(9,50,2,14,'#a09363')+
  rect(84,47,8,10,'#86a16c')+rect(82,51,12,7,'#86a16c')+rect(87,57,2,10,'#8f855e')+
  rect(65,6,3,10,'#f2d488')+rect(62,9,9,3,'#f2d488')+rect(8,21,3,3,'#e7c477')+
  rect(35,67,28,3,'#a9b98b')+rect(27,68,4,2,'#f4e5b2');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 80" shape-rendering="crispEdges"><title>城市事件像素站点</title>${scene}</svg>`;
 const path=resolve(dirname(fileURLToPath(import.meta.url)),'../public/assets/stations/city-event.svg');
 mkdirSync(dirname(path),{recursive:true});writeFileSync(path,svg);return path;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(`Drawn: ${drawCityEventStation()}`);

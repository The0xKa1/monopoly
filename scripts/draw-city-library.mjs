/** One generator for every registered city. Run from any working directory. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {CITY_CATALOG} from '../src/cityCatalog.js';
import {CLASSIC_CITY_ART} from './city-art/classic.mjs';
import {PIXEL_CITY_ART} from './city-art/pixel.mjs';
const renderers={classic:CLASSIC_CITY_ART,pixel:PIXEL_CITY_ART};
const escape=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function generateCityAssets(publicDir=fileURLToPath(new URL('../public/',import.meta.url))) {
 // Validate the whole catalog before writing, so a missing renderer never produces a partial library.
 const files=CITY_CATALOG.map(city=>{
  const art=renderers[city.artStyle]?.[city.id];
  if(!art)throw new Error(`Missing city drawing: ${city.id} (${city.artStyle})`);
  const svg=city.artStyle==='classic'?art:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 116" shape-rendering="crispEdges" role="img" aria-labelledby="title"><title id="title">${escape(city.name+' · '+city.landmark)}</title>${art}</svg>\n`;
  return {path:resolve(publicDir,'.'+city.asset),svg};
 });
 for(const [style,art] of Object.entries(renderers))for(const id of Object.keys(art)){
  if(!CITY_CATALOG.some(city=>city.id===id&&city.artStyle===style))throw new Error(`Unregistered city drawing: ${id}`);
 }
 for(const file of files){mkdirSync(dirname(file.path),{recursive:true});writeFileSync(file.path,file.svg);}
 return files.length;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 console.log(`Generated ${generateCityAssets()} city-library assets.`);
}

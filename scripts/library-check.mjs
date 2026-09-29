import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {CITY_CATALOG, CHINA_REGIONS} from '../src/cityCatalog.js';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const loadVisibleCollection=()=>page.locator('.library-art img').evaluateAll(images=>Promise.all(images.map(image=>{image.loading='eager';return image.decode();})));
 await page.goto('http://localhost:5173');
 const save=await page.evaluate(()=>localStorage.getItem('city-dice-v1'));
 await page.getByRole('button',{name:'城市图鉴',exact:true}).click();
 const cards=page.locator('.library-collection>button');
 assert.equal(await cards.count(),CITY_CATALOG.filter(c=>c.scope==='china').length);
 await page.getByRole('checkbox').check();
 assert.equal(await cards.count(),CHINA_REGIONS.length);
 await loadVisibleCollection();
 await page.screenshot({path:'artifacts/library-capitals.png',fullPage:true,animations:'disabled'});
 await page.getByRole('checkbox').uncheck();
 await page.getByRole('searchbox',{name:'搜索城市'}).fill('Paris');
 assert.equal(await cards.count(),0);
 await page.getByRole('button',{name:'清除筛选',exact:true}).click();
 await page.getByRole('group',{name:'城市范围'}).getByRole('button',{name:/世界/}).click();
 await page.getByRole('searchbox',{name:'搜索城市'}).fill('Paris');
 assert.equal(await cards.count(),1);
 await cards.first().click();
 assert.equal(await page.getByRole('dialog').locator('h2').innerText(),'巴黎');
 assert.match(await page.locator('.catalog-facts').innerText(),/城市库/);
 assert.equal(await page.getByRole('dialog').getByRole('button',{name:'查看地产'}).count(),0);
 await page.keyboard.press('Escape');
 await page.getByRole('searchbox',{name:'搜索城市'}).fill('');
 const continent=CITY_CATALOG.find(c=>c.name==='巴黎').region;
 await page.getByRole('combobox',{name:'地区筛选'}).selectOption(continent);
 assert.equal(await cards.count(),CITY_CATALOG.filter(c=>c.scope==='world'&&c.region===continent).length);
 await page.getByRole('combobox',{name:'地区筛选'}).selectOption('all');
 await loadVisibleCollection();
 await page.screenshot({path:'artifacts/library-world.png',fullPage:true,animations:'disabled'});
 // All assets must load, including images initially outside the lazy-loading viewport.
 const assets=await page.evaluate(async cities=>Promise.all(cities.map(async c=>{
  const image=new Image();image.src=c.asset;
  try{await image.decode();return {id:c.id,loaded:image.naturalWidth>0};}catch{return {id:c.id,loaded:false};}
 })),CITY_CATALOG);
 assert.deepEqual(assets.filter(a=>!a.loaded),[]);
 await page.getByRole('group',{name:'城市范围'}).getByRole('button',{name:/当前棋盘/}).click();
 assert.equal(await cards.count(),12);
 await page.getByRole('button',{name:'查看北京',exact:true}).click();
 await page.getByRole('button',{name:'查看地产',exact:true}).click();
 assert.match(await page.locator('.detail-stats').innerText(),/2,200/);
 await page.keyboard.press('Escape');
 assert.equal(await page.evaluate(()=>localStorage.getItem('city-dice-v1')),save,'library browsing does not modify game state');
 for(const width of [390,320]) {
  await page.setViewportSize({width,height:844});
  await page.getByRole('group',{name:'城市范围'}).getByRole('button',{name:/中国/}).click();
  await page.getByRole('searchbox',{name:'搜索城市'}).fill('拉萨');
  await cards.first().click();
  await page.screenshot({path:`artifacts/library-detail-${width}.png`,fullPage:true,animations:'disabled'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.keyboard.press('Escape');
  await page.getByRole('searchbox',{name:'搜索城市'}).fill('');
  await loadVisibleCollection();
  await page.screenshot({path:`artifacts/library-${width}.png`,fullPage:true,animations:'disabled'});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 assert.deepEqual(errors,[]);
 // Compact contact sheets make every landmark available for visual review.
 const sheet=await browser.newPage({viewport:{width:1280,height:1300}});
 for(const scope of ['china','world']) {
  await sheet.goto('http://localhost:5173');
  await sheet.evaluate(cities=>{
   document.head.innerHTML='<style>body{margin:0;padding:20px;background:#faf9f1;font-family:system-ui;color:#45614a}main{display:grid;grid-template-columns:repeat(8,1fr);gap:8px}article{text-align:center;background:#edf2e2;border:1px solid #d9e2ce;border-radius:6px;padding:8px}img{width:128px;height:106px;object-fit:contain;image-rendering:pixelated}b{display:block;font-size:12px}small{display:block;font-size:9px;margin-top:5px;color:#819373}</style>';
   document.body.replaceChildren();const grid=document.createElement('main');document.body.append(grid);
   for(const city of cities){const card=document.createElement('article'),img=document.createElement('img'),name=document.createElement('b'),landmark=document.createElement('small');img.src=city.asset;name.textContent=city.name;landmark.textContent=city.landmark;card.append(img,name,landmark);grid.append(card);}
  },CITY_CATALOG.filter(c=>c.scope===scope));
  await sheet.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await sheet.screenshot({path:`artifacts/library-${scope}-sheet.png`,fullPage:true,animations:'disabled'});
 }
 await sheet.close();
 console.log(`PASS: ${CITY_CATALOG.length} assets load; ${CHINA_REGIONS.length} regions; search, scope/region filters, city details, original property data, save unchanged, mobile 320/390; no JS errors.`);
} finally {await browser.close();}

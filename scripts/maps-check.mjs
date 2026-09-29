import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState} from '../src/game.js';
import {getTiles,generateMap} from '../src/board.js';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-dice-v1')));
 const seed=async s=>{await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();};
 await page.goto('http://localhost:5173');const old=initialState();delete old.map;old.properties={1:{owner:0,level:1}};old.players[0].cash=8888;await seed(old);
 assert.equal((await state()).players[0].cash,8888);assert.equal(await page.locator('.world-art,.camera-controls').count(),0);assert.equal(await page.locator('.board').evaluate(e=>getComputedStyle(e).transform),'none');
 const before=await state();await page.getByRole('button',{name:'地图设置',exact:true}).click();await page.getByLabel('地图城市范围').selectOption('world');await page.getByLabel('棋盘大小').selectOption('36');assert.equal(await page.locator('.map-city-preview>div').count(),28);
 const cities=await page.locator('.map-city-preview span').allTextContents();await page.getByRole('button',{name:'重新随机',exact:true}).click();assert.notDeepEqual(await page.locator('.map-city-preview span').allTextContents(),cities);
 await page.screenshot({path:'artifacts/maps-editor-mobile.png',fullPage:true});await page.getByRole('button',{name:'取消',exact:true}).click();assert.deepEqual(await state(),before);
 await page.getByRole('button',{name:'地图设置',exact:true}).click();await page.getByLabel('地图城市范围').selectOption('world');await page.getByLabel('棋盘大小').selectOption('36');const preview=await page.locator('.map-city-preview span').allTextContents();await page.getByRole('button',{name:'使用地图并重开',exact:true}).click();
 let s=await state();assert.equal(s.map.size,36);assert.deepEqual(s.properties,{});assert.equal(s.players[0].cash,12000);assert.deepEqual(s.players.map(p=>p.appearance),before.players.map(p=>p.appearance));assert.deepEqual(await page.locator('.tile.city>b').allTextContents(),preview);assert.equal(await page.locator('.tile').count(),36);
 await page.reload();assert.deepEqual((await state()).map,s.map);assert.equal(await page.locator('.tile').count(),36);
 await page.getByRole('button',{name:'城市图鉴',exact:true}).click();await page.getByRole('button',{name:/当前棋盘/}).click();assert.equal(await page.locator('.library-collection button').count(),28);
 const first=getTiles(s)[1];await page.locator(`[data-city-id="${first.cityId}"]`).click();await page.getByRole('button',{name:'查看地产',exact:true}).click();assert.equal(await page.getByRole('dialog').locator('h2').innerText(),first.name);await page.keyboard.press('Escape');await page.getByRole('button',{name:'城市棋盘',exact:true}).click();
 await page.emulateMedia({reducedMotion:'reduce'});s.players[0].pos=35;await seed(s);
 await page.getByRole('button',{name:'展开道具',exact:true}).click();await page.getByRole('button',{name:/遥控骰子/}).click();assert.match(await page.getByRole('button',{name:'选择 2 点',exact:true}).innerText(),new RegExp(first.name));await page.getByRole('button',{name:'选择 2 点',exact:true}).click();
 await page.getByRole('button',{name:'掷骰子',exact:true}).click();await page.getByRole('button',{name:`购买 ¥ ${first.price.toLocaleString('en-US')}`,exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.transfer-toast'));s=await state();assert.equal(s.properties[1].owner,0);assert.equal(s.players[0].cash,13200-first.price);
 await page.locator('.roster-strip button').first().click();assert.match(await page.locator('.wallet-properties').innerText(),new RegExp(first.name));await page.keyboard.press('Escape');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px page overflow`);assert.ok(await page.locator('.tile-price').evaluateAll(items=>items.every(e=>{const r=e.getBoundingClientRect(),t=e.closest('.tile').getBoundingClientRect();return r.height>5&&r.bottom<=t.bottom;})),`${width}px prices fit`);await page.screenshot({path:`artifacts/maps-world-${width}.png`,fullPage:true});}
 // Applying another map while a move is in progress cancels the previous result.
 await page.emulateMedia({reducedMotion:'no-preference'});s=initialState(undefined,generateMap('china',28));s.players[0].controlled=6;await seed(s);await page.getByRole('button',{name:'掷骰子',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.activity-ribbon').dataset.motion==='walk');
 await page.getByRole('button',{name:'地图设置',exact:true}).click();await page.getByLabel('地图城市范围').selectOption('mixed');await page.getByLabel('棋盘大小').selectOption('20');await page.getByRole('button',{name:'使用地图并重开',exact:true}).click();await page.waitForTimeout(3200);s=await state();assert.equal(s.map.kind,'mixed');assert.equal(s.map.size,20);assert.equal(s.phase,'roll');assert.equal(s.players[0].pos,0);assert.equal(s.players[0].cash,12000);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/maps-topdown-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: top-down only, no central art, old-save migration, map preview/cancel/randomize, 36-tile world map, persistent IDs, current-board catalog, wrapped movement/purchase/wallet, responsive layouts, mid-move map reset; no JS errors.');
}finally{await browser.close();}

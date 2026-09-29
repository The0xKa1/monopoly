import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {initialState,transition} from '../src/game.js';
import {generateMap} from '../src/board.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-dice-v1')));
 const seed=async s=>{await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();};
 await page.goto('http://localhost:5173');await seed(initialState());
 assert.equal(await page.locator('.board-hub').count(),1);assert.equal(await page.locator('.backpack,.match-records').count(),0);assert.match(await page.locator('.hub-status').innerText(),/等待掷骰/);
 await page.getByRole('button',{name:'展开道具',exact:true}).click();assert.equal(await page.locator('#item-cards .strategy-card').count(),3);
 await page.screenshot({path:'artifacts/hub-cards-mobile.png',fullPage:true});
 await page.getByRole('button',{name:/租金护盾/}).click();await page.getByRole('dialog').getByRole('button',{name:'使用',exact:true}).click();assert.equal((await state()).players[0].shield,true);assert.ok(await page.getByRole('button',{name:/租金护盾/}).isDisabled());
 await page.getByRole('button',{name:'动态',exact:true}).click();assert.match(await page.locator('.hub-buffs').innerText(),/租金护盾/);
 await page.locator('.hub-actor .activity-person').click();assert.equal(await page.getByRole('dialog').locator('h2').innerText(),'小满');await page.keyboard.press('Escape');
 let s=initialState();s.players[0].pos=19;s.players[0].controlled=2;s.properties[1]={owner:1,level:0};await seed(s);await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('button',{name:'掷骰子',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).players[0].pos===1);await page.getByRole('button',{name:/^支付租金/}).click();await page.waitForFunction(()=>!document.querySelector('.transfer-toast'));
 await page.getByRole('button',{name:'公告',exact:true}).click();assert.equal(await page.locator('.hub-news article').count(),2);assert.match(await page.locator('.hub-news').innerText(),/352/);assert.match(await page.locator('.hub-news').innerText(),/1,200/);
 await page.screenshot({path:'artifacts/hub-news-mobile.png',fullPage:true});const journal=(await state()).journal;await page.reload();await page.getByRole('button',{name:'公告',exact:true}).click();assert.deepEqual((await state()).journal,journal);
 s=initialState(undefined,undefined,['found_envelope']);s=transition(s,{type:'ROLL',value:2});s=transition(s,{type:'DRAW_EVENT',index:0});s=transition(s,{type:'RESOLVE_EVENT',seed:.2});await seed(s);assert.match(await page.locator('.hub-event').innerText(),/800/);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`artifacts/hub-activity-${width}.png`,fullPage:true});}
 // The center panel remains interactive when a large map is panned to either side.
 await page.setViewportSize({width:390,height:844});s=initialState(undefined,generateMap('world',36));s.players[0].name='十二字昵称测试角色甲乙丙丁'.slice(0,12);await seed(s);
 for(const fraction of [0,1,.5]){
  await page.locator('.board-scroll').evaluate((el,f)=>{el.scrollLeft=(el.scrollWidth-el.clientWidth)*f;el.scrollTop=(el.scrollHeight-el.clientHeight)*f;},fraction);
  await page.getByRole('button',{name:'公告',exact:true}).click();await page.getByRole('button',{name:'展开道具',exact:true}).click();
  await page.getByRole('button',{name:/建设补贴/}).click();await page.getByRole('dialog').getByRole('button',{name:'关闭',exact:true}).click();await page.getByRole('button',{name:'动态',exact:true}).click();
 }
 await page.screenshot({path:'artifacts/hub-large-mobile.png',fullPage:true});
 // On an AI turn the inventory still belongs to the local player and cannot be used.
 s=initialState();s.current=1;s.players[1].cards.shield=9;await seed(s);await page.getByRole('button',{name:'展开道具',exact:true}).click();assert.match(await page.locator('.hub-inventory-heading').innerText(),/等待我的回合/);assert.equal(await page.locator('.hub-card.shield em').innerText(),'×1');assert.ok(await page.locator('.hub-card.shield').isDisabled());
 assert.deepEqual(errors,[]);console.log('PASS: center status and wallet, own-card use/effects/AI lock, separate persistent transaction announcements, events, mobile/desktop and panned large-map controls; no JS errors.');
}finally{await browser.close();}

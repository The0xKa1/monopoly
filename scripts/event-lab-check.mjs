import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {initialState} from '../src/game.js';
import {generateMap,getTiles} from '../src/board.js';
import {EVENT_CARDS} from '../src/eventCards.js';
import {eventDestinations} from '../src/eventOptions.js';
import {SAVE,LAB_SAVE} from '../src/gameStorage.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://localhost:5173');
 const original=initialState(undefined,generateMap('world',36,()=>.4));original.players[0].cash=9631;original.properties[1]={owner:0,level:2,upgradeSpent:1500};original.phase='end';
 await page.evaluate(({original,SAVE,LAB_SAVE})=>{localStorage.removeItem(LAB_SAVE);localStorage.setItem(SAVE,JSON.stringify(original));},{original,SAVE,LAB_SAVE});await page.reload();
 const saved=await page.evaluate(key=>localStorage.getItem(key),SAVE),lab=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LAB_SAVE);
 const phase=p=>page.waitForFunction(({key,p})=>JSON.parse(localStorage.getItem(key))?.phase===p,{key:LAB_SAVE,p});
 const idle=()=>page.waitForFunction(()=>!document.querySelector('.transfer-toast,[aria-busy="true"],.map-shuffling-in,.map-shuffling-out,.teleporting'));
 const pick=async(id,variant='normal')=>{await page.getByRole('button',{name:'事件卡测试',exact:true}).click();await page.getByLabel('测试场景',{exact:true}).selectOption(variant);await page.getByRole('button',{name:`测试${EVENT_CARDS.find(c=>c.id===id).title}`,exact:true}).click();await phase('draw');};
 const draw=async()=>{await page.getByRole('button',{name:'抽取第 2 张事件卡',exact:true}).click();await phase('event');};
 const execute=()=>page.getByRole('button',{name:'执行事件',exact:true}).click();
 await page.getByRole('button',{name:'事件卡测试',exact:true}).click();assert.equal(await page.locator('.event-lab-card').count(),EVENT_CARDS.length);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`artifacts/event-lab-picker-${width}.png`,fullPage:true});}
 await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});
 for(const card of EVENT_CARDS){await pick(card.id);assert.equal((await lab()).testRun.id,card.id);assert.deepEqual((await lab()).map,original.map);await draw();await execute();
  if(card.effect.type==='travel'){
   await phase('event-destination');const s=await lab(),tiles=getTiles(s),options=eventDestinations(s),target=options.find(i=>!s.properties[i])??options[0],property=s.properties[target];
   assert.equal(await page.locator('.event-destination-list button').count(),options.length);
   await page.getByRole('button',{name:`前往${tiles[target].name}`,exact:true}).click();
   await phase(!property?'buy':property.owner===0&&property.level<3?'upgrade':typeof property.owner==='number'&&property.owner!==0?'rent':'end');
  }else if(['item_choice','reward_choice','renovate','redeem_grant'].includes(card.effect.type)){
   await phase('event-choice');await page.locator('.event-choice-list button').first().click();await phase('end');
  }else await phase('end');
  await idle();assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),saved);
 }
 // Choose the construction card explicitly; catalog order is not an item-trial contract.
 await pick('toolbox_drop');await draw();await execute();await phase('end');await idle();
 await page.getByRole('button',{name:'继续试用道具',exact:true}).click();await phase('roll');if(await page.getByRole('button',{name:'展开道具',exact:true}).count())await page.getByRole('button',{name:'展开道具',exact:true}).click();await page.getByRole('button',{name:/建设补贴/}).click();await page.getByRole('dialog').getByRole('button',{name:'使用',exact:true}).click();assert.equal((await lab()).players[0].subsidy,true);await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('upgrade');await page.getByRole('button',{name:/^升级 ¥/}).click();await phase('end');await idle();assert.equal((await lab()).players[0].subsidy,false);
 await pick('repair_bill','short-cash');await draw();await execute();await phase('debt');await page.locator('.mortgage-list button').click();await page.getByRole('button',{name:/^支付欠款/}).click();await phase('end');await idle();await page.getByText('实际变化',{exact:true}).click();assert.match(await page.locator('.event-lab-changes').innerText(),/现金对比/);assert.match(await page.locator('.event-lab-changes').innerText(),/我的事件直接收支：.*700/s);await page.screenshot({path:'artifacts/event-lab-results-mobile.png',fullPage:true});
 // Original save survives a reload in the laboratory and returning restores it exactly.
 await page.reload();assert.equal((await lab()).testRun.id,'repair_bill');await page.getByRole('button',{name:'返回原对局',exact:true}).click();await page.waitForFunction(key=>!localStorage.getItem(key),LAB_SAVE);assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),saved);
 // An AI owner may still answer a purchase proposal during a travel test.
 await pick('night_flight');await draw();await execute();await phase('event-destination');let s=await lab(),tiles=getTiles(s),target=Number(Object.keys(s.properties).find(i=>s.properties[i].owner===1));await page.getByRole('button',{name:`前往${tiles[target].name}`,exact:true}).click();await phase('rent');await page.getByRole('button',{name:/^提出收购/}).click();await phase('end');assert.equal((await lab()).properties[target].owner,0);await idle();
 // Exit/retry while an animation is in flight cancels its pending update.
 await page.emulateMedia({reducedMotion:'no-preference'});await pick('city_remix');await draw();await execute();await page.locator('.map-shuffling-out').waitFor();await page.getByRole('button',{name:'返回原对局',exact:true}).click();await page.waitForTimeout(1900);assert.equal(await page.locator('.event-lab-bar').count(),0);assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),saved);
 await page.emulateMedia({reducedMotion:'reduce'});await pick('found_envelope');await draw();await execute();await phase('end');await page.getByRole('button',{name:'重新测试',exact:true}).click();await phase('draw');assert.equal((await lab()).players[0].cash,12000);assert.equal((await lab()).journal.length,0);await page.getByRole('button',{name:'返回原对局',exact:true}).click();
 assert.deepEqual(errors,[]);console.log('PASS: visible entry, all 30 deterministic cards, 320/390/1440 picker, actual item use, mortgage scenario, original save isolation/reload/return, AI owner consent, mid-animation exit/retry; no JS errors.');
}finally{await browser.close();}

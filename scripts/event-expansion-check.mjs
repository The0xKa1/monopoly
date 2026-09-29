import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState,transition} from '../src/game.js';
import {getTiles} from '../src/board.js';
import {createEventTestState} from '../src/eventLab.js';
import {eventDestinations,eventChoices} from '../src/eventOptions.js';
import {SAVE,LAB_SAVE} from '../src/gameStorage.js';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://localhost:5173');
 const original=initialState();original.phase='end';original.players[0].cash=8765;original.properties[1]={owner:0,level:2,upgradeSpent:345};
 await page.evaluate(({SAVE,LAB_SAVE,original})=>{localStorage.removeItem(LAB_SAVE);localStorage.setItem(SAVE,JSON.stringify(original));},{SAVE,LAB_SAVE,original});await page.reload();
 const saved=await page.evaluate(key=>localStorage.getItem(key),SAVE);
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),LAB_SAVE);
 const phase=value=>page.waitForFunction(({key,value})=>JSON.parse(localStorage.getItem(key))?.phase===value,{key:LAB_SAVE,value});
 const idle=()=>page.waitForFunction(()=>!document.querySelector('.transfer-toast,[aria-busy="true"],.map-shuffling-in,.map-shuffling-out,.walking,.teleporting'));
 const seed=async s=>{await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:LAB_SAVE,s});await page.reload();};
 const sample=id=>transition(createEventTestState(original,id),{type:'DRAW_EVENT',index:1});
 const enter=async id=>{await seed(sample(id));await page.getByRole('button',{name:'执行事件',exact:true}).click();};
 const details=async()=>{const el=page.locator('.event-lab-changes');if(!await el.evaluate(node=>node.open))await el.locator('summary').click();};
 const choose=async value=>{await page.locator(`[data-event-choice="${value}"]`).click();await phase('end');await idle();};
 // A pending choice survives refresh; only the chosen item enters inventory and can be tried.
 await enter('mystery_vending');await phase('event-choice');assert.equal(await page.locator('.event-choice-list button').count(),3);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('[data-event-phase="event-choice"]').screenshot({path:`artifacts/event-expansion-choice-${width}.png`,animations:'disabled'});}
 const pending=await state();await page.reload();assert.deepEqual((await state()).activeEvent,pending.activeEvent);assert.equal((await state()).phase,'event-choice');await choose('shield');assert.deepEqual((await state()).players[0].cards,{dice:0,shield:1,build:0});
 await details();assert.match(await page.locator('[data-item="shield"]').innerText(),/0 → 1/);await page.getByRole('button',{name:'继续试用道具',exact:true}).click();await phase('roll');if(await page.getByRole('button',{name:'展开道具',exact:true}).count())await page.getByRole('button',{name:'展开道具',exact:true}).click();await page.getByRole('button',{name:/租金护盾/}).click();await page.getByRole('dialog').getByRole('button',{name:'使用',exact:true}).click();await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('end');await idle();assert.equal((await state()).players[0].shield,false);assert.equal((await state()).players[0].cash,12000);
 // Both reward branches have distinct amounts and trial availability.
 for(const value of ['cash','dice']){await enter('bonus_choice');await phase('event-choice');await choose(value);const s=await state();assert.equal(s.players[0].cash,value==='cash'?12800:12000);assert.equal(s.players[0].cards.dice,value==='dice'?2:0);assert.equal(await page.getByRole('button',{name:'继续试用道具',exact:true}).count(),value==='dice'?1:0);}
 // Property changes compare the actual city identity, level, mortgage and unchanged cash.
 for(const id of ['overnight_renovation','bank_amnesty']){
  await enter(id);await phase('event-choice');const before=await state(),option=eventChoices(before)[0],city=getTiles(before)[option.tile];await choose(option.value);const after=await state();assert.equal(after.players[0].cash,before.players[0].cash);await details();
  const row=page.locator(`.event-lab-property-list tr[data-city-id="${city.cityId}"]`);assert.ok((await row.innerText()).includes(city.name));
  if(id==='overnight_renovation'){assert.equal(after.properties[option.tile].level,before.properties[option.tile].level+1);assert.equal(after.properties[option.tile].upgradeSpent,before.properties[option.tile].upgradeSpent);}
  else{assert.equal(after.properties[option.tile].owner,0);assert.equal(after.properties[option.tile].mortgageAmount,undefined);assert.match(await row.innerText(),/银行/);}
  await page.setViewportSize({width:320,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.event-lab-bar').screenshot({path:`artifacts/event-expansion-${id}.png`});
 }
 await enter('city_siesta');await phase('end');await idle();await details();assert.ok((await state()).players.every(p=>p.shield));assert.equal(await page.locator('[data-shield-player]').count(),4);for(let i=0;i<4;i++)assert.match(await page.locator(`[data-shield-player="${i}"]`).innerText(),/未生效 → 已生效/);await page.locator('.event-lab-bar').screenshot({path:'artifacts/event-expansion-shields.png'});
 // Targeted travel lists only legal cities; an unavailable owned destination grants fallback.
 for(const id of ['vacant_express','homecoming']){await enter(id);await phase('event-destination');const s=await state(),options=eventDestinations(s);assert.equal(await page.locator('.event-destination-list button').count(),options.length);const target=options[0];await page.getByRole('button',{name:`前往${getTiles(s)[target].name}`,exact:true}).click();await phase(id==='homecoming'?'upgrade':'buy');await idle();assert.equal((await state()).players[0].cash,s.players[0].cash);}
 let empty=sample('homecoming');empty.properties={};await seed(empty);await page.getByRole('button',{name:'执行事件',exact:true}).click();await phase('end');await idle();assert.equal((await state()).players[0].cash,12500);assert.equal(await page.locator('.event-destination-list').count(),0);
 // Forward travel follows the board one tile at a time, passing special tiles without payout.
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});let bus=sample('runaway_bus'),tiles=getTiles(bus),cities=tiles.flatMap((t,i)=>t.type==='city'?[i]:[]);bus.players[0].pos=cities.at(-2);bus=transition(bus,{type:'RESOLVE_EVENT',seed:.5});const target=eventDestinations(bus)[0];delete bus.properties[target];await seed(bus);await page.getByRole('button',{name:`前往${tiles[target].name}`,exact:true}).click();await page.locator('.board-token.walking').waitFor();assert.equal(await page.locator('.teleporting').count(),0);assert.equal((await state()).players[0].pos,bus.players[0].pos);
 const visited=new Set();while((await state()).phase==='event-destination'){visited.add(Number(await page.locator('[data-token="0"]').getAttribute('data-position')));await page.waitForTimeout(60);}
 await phase('buy');await idle();assert.ok(visited.has(0),'walk visibly crosses start');assert.ok(visited.has(2),'walk visibly passes chance tile');assert.equal((await state()).players[0].cash,bus.players[0].cash);assert.equal((await state()).players[0].pos,target);assert.equal((await state()).transactions.length,0);
 await page.getByRole('button',{name:'返回原对局',exact:true}).click();await page.waitForFunction(key=>!localStorage.getItem(key),LAB_SAVE);assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),saved);assert.deepEqual(errors,[]);
 console.log('PASS: choice refresh/selected item trial, both reward branches, property and shield comparisons, filtered/fallback destinations, visible forward travel across special tiles without payout, 320/390/1440 layouts and untouched normal save; no JS errors.');
}finally{await browser.close();}

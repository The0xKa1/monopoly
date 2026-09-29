import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState} from '../src/game.js';
import {getTiles,generateMap} from '../src/board.js';
import {CITY_CATALOG} from '../src/cityCatalog.js';
import {CITY_EVENT_CARDS} from '../src/cityEventCards.js';
import {getEventCard,eligibleCityEventCards} from '../src/eventCards.js';
import {eventChoices,eventDestinations} from '../src/eventOptions.js';
import {SAVE,LAB_SAVE} from '../src/gameStorage.js';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://localhost:5173');
 const state=(key=SAVE)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const phase=(value,key=SAVE)=>page.waitForFunction(({key,value})=>JSON.parse(localStorage.getItem(key))?.phase===value,{key,value});
 const idle=()=>page.waitForFunction(()=>!document.querySelector('.transfer-toast,[aria-busy="true"],.map-shuffling-in,.map-shuffling-out,.walking,.teleporting'));
 const seed=async s=>{await page.evaluate(({s,SAVE,LAB_SAVE})=>{localStorage.removeItem(LAB_SAVE);localStorage.setItem(SAVE,JSON.stringify(s));},{s,SAVE,LAB_SAVE});await page.reload();};
 const pool=()=>page.getByRole('region',{name:'本局城市事件卡池',exact:true});
 const showPool=()=>page.getByRole('button',{name:'查看本局城市事件',exact:true}).click();
 const showLab=async()=>{await page.getByRole('button',{name:'事件卡测试',exact:true}).click();await page.getByRole('group',{name:'事件卡池',exact:true}).getByRole('button',{name:/^城市事件 ·/}).click();};
 const chooseTest=async card=>{await showLab();await page.locator(`[data-test-card-id="${card.id}"]`).click();await phase('draw',LAB_SAVE);};
 const draw=async(key=SAVE)=>{await page.getByRole('button',{name:'抽取第 1 张事件卡',exact:true}).click();await phase('event',key);};
 const execute=()=>page.getByRole('button',{name:'执行事件',exact:true}).click();
 const mapFor=card=>({kind:'mixed',size:20,cityIds:[card.cityId,...CITY_CATALOG.filter(c=>c.id!==card.cityId).slice(0,11).map(c=>c.id)]});
 // Actual arrival triggers the independent draw source; card art refers to a city on this board.
 let s=initialState();s.players[0].pos=7;s.players[0].controlled=1;await seed(s);await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('draw');s=await state();assert.equal(s.players[0].pos,8);assert.equal(s.eventDraw.source,'city-event');assert.ok(s.eventDraw.offerIds.every(id=>eligibleCityEventCards(s).some(c=>c.id===id)));assert.equal(await page.locator('[data-event-source="city-event"] .event-card-back').count(),3);
 await draw();s=await state();const drawn=getEventCard(s.activeEvent.id),city=CITY_CATALOG.find(c=>c.id===drawn.cityId);assert.ok(city);const reveal=page.locator(`[data-card-id="${drawn.id}"]`);assert.equal(await reveal.locator('img.event-city-landmark').getAttribute('src'),city.asset);await reveal.screenshot({path:'artifacts/city-events-reveal-mobile.png',animations:'disabled'});
 const pending=structuredClone(s);await page.reload();assert.deepEqual((await state()).activeEvent,pending.activeEvent);assert.equal((await state()).journal.filter(e=>e.cardId===drawn.id).length,1);
 // The pool has one card per current map city, including after changing scope or size.
 for(const [kind,size] of [['classic',20],['china',28],['world',36]]){
  const game=initialState(undefined,generateMap(kind,size,()=>.37));game.phase='end';await seed(game);await showPool();const expected=eligibleCityEventCards(game).map(c=>c.id),shown=await pool().locator('[data-city-card-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.cityCardId));assert.deepEqual(new Set(shown),new Set(expected));assert.equal(shown.length,size-8);
  if(kind==='world')assert.equal(shown.includes('city_beijing'),false);
  if(kind==='classic')for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await pool().screenshot({path:`artifacts/city-events-pool-${width}.png`,animations:'disabled'});}
  await page.keyboard.press('Escape');await showLab();assert.equal(await page.locator('[data-event-pool="city"] [data-test-card-id]').count(),size-8);const labIds=await page.locator('[data-event-pool="city"] [data-test-card-id]').evaluateAll(nodes=>nodes.map(node=>node.dataset.testCardId));assert.deepEqual(new Set(labIds),new Set(expected));await page.getByRole('group',{name:'事件卡池',exact:true}).getByRole('button',{name:/^奇遇 ·/}).click();assert.equal(await page.locator('[data-test-card-id]').count(),30);await page.keyboard.press('Escape');
 }
 // City-only laboratory effects and destination restrictions use the real UI and preserve normal save.
 for(const type of ['bank','city_host','travel','renovate','redeem_grant','item_choice']){
  const card=CITY_EVENT_CARDS.find(c=>c.effect.type===type);assert.ok(card,`missing ${type} fixture`);const game=initialState(undefined,mapFor(card));game.phase='end';game.players[0].cash=6543;await seed(game);const saved=await page.evaluate(key=>localStorage.getItem(key),SAVE);await chooseTest(card);assert.equal((await state(LAB_SAVE)).eventDraw.source,'city-event');await draw(LAB_SAVE);await execute();
  if(type==='travel'){
   await phase('event-destination',LAB_SAVE);const before=await state(LAB_SAVE),targets=eventDestinations(before);assert.equal(targets.length,1);assert.equal(await page.locator('.event-destination-list button').count(),1);assert.equal(getTiles(before)[targets[0]].cityId,card.cityId);const prop=before.properties[targets[0]];await page.getByRole('button',{name:`前往${getTiles(before)[targets[0]].name}`,exact:true}).click();await phase(!prop?'buy':prop.owner===0?'upgrade':prop.owner==='bank'?'end':'rent',LAB_SAVE);await idle();assert.equal((await state(LAB_SAVE)).players[0].cash,before.players[0].cash);
  }else if(['renovate','redeem_grant','item_choice'].includes(type)){
   await phase('event-choice',LAB_SAVE);const before=await state(LAB_SAVE),choices=eventChoices(before);assert.equal(await page.locator('.event-choice-list button').count(),choices.length);if(type!=='item_choice'){assert.equal(choices.length,1);assert.equal(getTiles(before)[choices[0].tile].cityId,card.cityId);}
   await page.reload();assert.equal((await state(LAB_SAVE)).phase,'event-choice');await page.locator(`[data-event-choice="${choices[0].value}"]`).click();await phase('end',LAB_SAVE);await idle();if(type!=='item_choice'){await page.locator('.event-lab-changes summary').click();assert.ok(await page.locator(`.event-lab-property-list [data-city-id="${card.cityId}"]`).count());}
  }else{await phase('end',LAB_SAVE);await idle();if(type==='city_host'){const after=await state(LAB_SAVE);assert.equal(after.players[0].cash-after.testRun.baseline.cash[0],600);assert.equal(after.players[1].cash-after.testRun.baseline.cash[1],400);}}
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),saved);await page.getByRole('button',{name:'返回原对局',exact:true}).click();await page.waitForFunction(key=>!localStorage.getItem(key),LAB_SAVE);assert.equal(await page.evaluate(key=>localStorage.getItem(key),SAVE),saved);
 }
 assert.deepEqual(errors,[]);console.log('PASS: real city-event station draw, source and landmark, pending refresh, independent classic12/china20/world28 pools, map-limited city laboratory vs general30, bound travel/grants/host/item choice, original save restoration, 320/390/1440 layouts; no JS errors.');
}finally{await browser.close();}

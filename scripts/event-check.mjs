import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState,transition} from '../src/game.js';
import {generateMap,getTiles} from '../src/board.js';
import {EVENT_CARDS,getEventCard} from '../src/eventCards.js';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-dice-v1')));
 const seed=async s=>{await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();};
 const phase=p=>page.waitForFunction(p=>JSON.parse(localStorage.getItem('city-dice-v1')).phase===p,p);
 const idle=()=>page.waitForFunction(()=>!document.querySelector('.transfer-toast')&&!document.querySelector('[aria-busy="true"]')&&!document.querySelector('.map-shuffling-out,.map-shuffling-in'));
 const enter=async(id,map)=>{const s=initialState(undefined,map,[id]);s.players[0].pos=getTiles(s).findIndex(t=>t.type==='chance')-1;s.players[0].controlled=1;await seed(s);await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('draw');};
 const draw=async()=>{await page.getByRole('button',{name:'抽取第 1 张事件卡',exact:true}).click();await phase('event');};
 const resolve=()=>page.getByRole('button',{name:'执行事件',exact:true}).click();
 await enter('park_proposal');assert.equal((await state()).players[0].cash,12000);assert.equal(await page.locator('.event-card-back').count(),3);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`artifacts/events-draw-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:390,height:844});await draw();assert.equal((await state()).players[0].cash,12000);await page.locator('[data-card-id="park_proposal"]').waitFor();await page.screenshot({path:'artifacts/events-proposal-mobile.png',fullPage:true,animations:'disabled'});
 const pending=await state();await page.reload();assert.deepEqual((await state()).activeEvent,pending.activeEvent);await resolve();await phase('end');await idle();let s=await state();assert.deepEqual(s.players.map(p=>p.cash),[9000,13000,13000,13000]);
 await page.getByRole('button',{name:'公告',exact:true}).click();assert.match(await page.locator('.hub-news').innerText(),/抽卡公告/);assert.match(await page.locator('.hub-news').innerText(),/求婚成功/);await page.screenshot({path:'artifacts/events-news-mobile.png',fullPage:true});
 // The catalog can be swapped independently of the board and every card has an actual effect.
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const card of EVENT_CARDS.filter(c=>['bank','richest_gift','item'].includes(c.effect.type))){
  let start=initialState(undefined,undefined,[card.id]);start=transition(start,{type:'ROLL',value:2,eventSeed:.25});start=transition(start,{type:'DRAW_EVENT',index:1});await seed(start);assert.equal(await page.locator('[data-card-id]').getAttribute('data-card-id'),card.id);await resolve();await phase('end');await idle();const result=await state();
  if(card.effect.type==='bank')assert.equal(result.players[0].cash,12000+card.effect.amount);
  if(card.effect.type==='richest_gift'){assert.equal(result.players[0].cash,12600);assert.equal(result.players[1].cash,11400);}
  if(card.effect.type==='item')assert.equal(result.players[0].cards[card.effect.card],start.players[0].cards[card.effect.card]+1);
 }
 // A pending draw saved before the old shop was replaced can still finish.
 s=initialState(undefined,undefined,['city_remix']);s.players[0].pos=13;s.phase='draw';s.eventDraw={source:'shop',offerIds:['pocket_compass','lucky_umbrella','toolbox_drop']};await seed(s);await draw();await resolve();await phase('end');await idle();assert.equal((await state()).players[0].cards.dice,3);
 // All destination choices are cities present in this 36-tile world map.
 const map=generateMap('world',36,()=>.42);await enter('night_flight',map);await draw();await resolve();await phase('event-destination');
 const beforeTravel=await state(),tiles=getTiles(beforeTravel),cities=tiles.map((t,i)=>({...t,index:i})).filter(t=>t.type==='city');assert.equal(await page.locator('.event-destination-list button').count(),28);assert.equal(await page.getByRole('button',{name:'前往北京',exact:true}).count(),0);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`artifacts/events-travel-${width}.png`,fullPage:true,animations:'disabled'});}
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});const target=cities.at(-1);await page.getByRole('button',{name:`前往${target.name}`,exact:true}).click();await page.waitForFunction(()=>document.querySelector('.teleporting'));
 assert.equal((await state()).players[0].pos,beforeTravel.players[0].pos);await phase('buy');s=await state();assert.equal(s.players[0].pos,target.index);assert.equal(s.players[0].cash,12000);await page.getByRole('button',{name:/^购买 ¥/}).click();await idle();assert.equal((await state()).properties[target.index].owner,0);
 // Shuffle visibly gathers and deals city tiles; mortgages and occupants follow identity.
 await enter('city_remix');s=await state();s.properties={1:{owner:1,level:2,upgradeSpent:1700},3:{owner:'bank',mortgagor:0,level:1,upgradeSpent:500,mortgageAmount:1300}};s.players[1].pos=1;await seed(s);await draw();await resolve();await page.locator('.map-shuffling-out').waitFor();await page.waitForFunction(()=>{const r=document.querySelector('.board-scroll').getBoundingClientRect();return Math.min(innerHeight,r.bottom)-Math.max(0,r.top)>300;});await page.waitForTimeout(100);await page.screenshot({path:'artifacts/events-shuffle-out.png',fullPage:true});
 await page.locator('.map-shuffling-in').waitFor();await page.waitForTimeout(300);await page.screenshot({path:'artifacts/events-shuffle-in.png',fullPage:true});await idle();const shuffled=await state(),after=getTiles(shuffled),beijing=after.findIndex(t=>t.cityId==='beijing'),xian=after.findIndex(t=>t.cityId==='xian');assert.notDeepEqual(after.map(t=>t.cityId),getTiles(s).map(t=>t.cityId));assert.equal(shuffled.properties[beijing].owner,1);assert.equal(shuffled.properties[xian].owner,'bank');assert.equal(shuffled.players[1].pos,beijing);assert.equal(shuffled.players[0].cash,s.players[0].cash);
 await page.reload();assert.deepEqual((await state()).map,shuffled.map);await page.locator(`[data-tile="${xian}"]`).click();assert.match(await page.getByRole('dialog').innerText(),/银行代持/);await page.keyboard.press('Escape');
 // Cancelling a shuffle through restart must cancel its pending commit.
 await enter('midnight_rewrite');await draw();await resolve();await page.locator('.map-shuffling-out').waitFor();await page.getByRole('button',{name:'重新开始',exact:true}).click();await page.getByRole('button',{name:'确认重开',exact:true}).click();await page.waitForTimeout(1700);assert.equal((await state()).phase,'roll');assert.equal((await state()).map.cityOrder,undefined);
 // A cash shortfall from an event uses the same collateral/payment interaction.
 await page.emulateMedia({reducedMotion:'reduce'});s=initialState(undefined,undefined,['repair_bill']);s.players[0].cash=50;s.properties[3]={owner:0,level:0};s=transition(transition(s,{type:'ROLL',value:2}),{type:'DRAW_EVENT',index:0});await seed(s);await resolve();await phase('debt');assert.equal((await state()).players[0].cash,50);await page.locator('.mortgage-list button').click();await page.getByRole('button',{name:/^支付欠款/}).click();await phase('end');await idle();assert.equal((await state()).players[0].cash,150);
 // AI reveals a card publicly, waits visibly, executes and continues its turn.
 s=initialState(undefined,undefined,['found_envelope']);s.current=1;s.players[1].controlled=2;await seed(s);await phase('event');assert.equal((await state()).players[1].cash,12000);assert.match(await page.locator('.event-card-reveal').innerText(),/旧外套的惊喜/);await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).players[1].cash===12800);assert.ok((await state()).journal.some(e=>e.cardId==='found_envelope'&&e.player===1));
 assert.deepEqual(errors,[]);console.log('PASS: golden fan draw/reveal, persistent pending cards, all money/item effects, public announcements, legacy shop draw, live-map destinations/teleport, animated shuffle with collateral and occupants, restart cancellation, mortgage debt, AI reveal, 320/390/1440 layouts; no JS errors.');
}finally{await browser.close();}

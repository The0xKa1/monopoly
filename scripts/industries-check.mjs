import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState,transition} from '../src/game.js';
import {getTiles} from '../src/board.js';
import {INDUSTRIES} from '../src/industries.js';
import {LAB_SAVE} from '../src/gameStorage.js';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://localhost:5173');
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-dice-v1')));
 const seed=async s=>{await page.evaluate(({s,labKey})=>{localStorage.removeItem(labKey);localStorage.setItem('city-dice-v1',JSON.stringify(s));},{s,labKey:LAB_SAVE});await page.reload();};
 const phase=p=>page.waitForFunction(p=>JSON.parse(localStorage.getItem('city-dice-v1')).phase===p,p);
 const idle=()=>page.waitForFunction(()=>!document.querySelector('.transfer-toast'));
 const close=()=>page.getByRole('button',{name:'关闭',exact:true}).click();
 const detail=i=>page.locator(`[data-tile="${i}"]`).click();
 const amount=async n=>assert.equal((await page.locator('.industry-preview-result strong').innerText()).replace(/[^0-9]/g,''),String(n));
 const wallet=()=>page.locator('.roster-strip').getByRole('button',{name:'查看小满的资产',exact:true}).click();
 let s=initialState();await seed(s);
 assert.equal(await page.locator('.tile.industry').count(),5);
 for(const industry of INDUSTRIES){const i=getTiles(s).findIndex(t=>t.industryId===industry.id);await detail(i);assert.equal(await page.locator('.industry-details').getAttribute('data-industry-id'),industry.id);assert.match(await page.locator('.industry-detail-stats').innerText(),new RegExp(industry.price.toLocaleString('en-US')));assert.ok(await page.locator('.industry-detail-art img').evaluate(img=>img.complete&&img.naturalWidth>0));await close();}
 // Actual movement and purchase create a separate non-upgradable asset.
 s.players[0].pos=5;s.players[0].controlled=1;await seed(s);await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('buy');
 assert.match(await page.locator('.industry-purchase-note').innerText(),/不可升级/);await page.getByRole('button',{name:/^购买 ¥/}).click();await phase('end');await idle();assert.equal((await state()).players[0].cash,10200);assert.equal((await state()).properties[6].owner,0);
 await wallet();assert.equal(await page.locator('[data-asset-kind="industry"]').count(),1);assert.match(await page.locator('.wallet-properties').innerText(),/公共事业/);await page.getByRole('button',{name:/^查看.*计价$/}).click();await amount(200);await close();
 // Preview controls do not alter the saved game and use owner links and visitor cities.
 s=initialState();s.properties={6:{owner:1,level:0},13:{owner:1,level:0},10:{owner:1,level:0},18:{owner:1,level:0},1:{owner:0,level:0},3:{owner:0,level:0}};await seed(s);let baseline=await state();await detail(13);await page.getByLabel('计价预览骰点',{exact:true}).selectOption('6');await amount(900);assert.equal(await page.locator('[data-industry-link="railway"]').getAttribute('data-link-active'),'true');assert.deepEqual(await state(),baseline);await close();await detail(10);await page.getByLabel('计价预览来客',{exact:true}).selectOption('0');await amount(540);await page.getByLabel('计价预览来客',{exact:true}).selectOption('2');await amount(300);await close();
 // Service fee uses the arrival snapshot, preserves the city shield, and survives reload.
 s.players[0].pos=7;s.players[0].controlled=6;s.players[0].shield=true;await seed(s);await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('rent');assert.equal((await state()).pendingRent.amount,900);assert.match(await page.getByLabel('本次服务费计价',{exact:true}).innerText(),/6/);await page.reload();await phase('rent');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`fee overflow ${width}`);await page.screenshot({path:`artifacts/industry-fee-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:/^支付服务费/}).click();await phase('end');await idle();assert.equal((await state()).players[0].cash,11100);assert.equal((await state()).players[1].cash,12900);assert.equal((await state()).players[0].shield,true);
 // Industrial collateral can fund a locked debt; original-value redemption restores links.
 s=initialState();s.players[0].cash=100;s.players[0].pos=15;s.players[0].controlled=1;s.properties={6:{owner:0,level:0},13:{owner:0,level:0},16:{owner:1,level:0}};await seed(s);await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('rent');await page.getByRole('button',{name:/^抵押筹款/}).click();await phase('debt');
 assert.equal(await page.locator('.mortgage-list button').count(),2);await page.locator('.mortgage-list button').filter({hasText:'铁路'}).click();await idle();assert.equal((await state()).properties[6].owner,'bank');assert.equal((await state()).players[0].cash,1000);await page.reload();await phase('debt');await page.getByRole('button',{name:/^支付欠款/}).click();await phase('end');await idle();assert.equal((await state()).players[0].cash,700);
 await detail(13);await page.getByLabel('计价预览骰点',{exact:true}).selectOption('6');await amount(600);assert.equal(await page.locator('[data-industry-link="railway"]').getAttribute('data-link-active'),'false');await close();await wallet();assert.ok(await page.getByRole('button',{name:/^赎回/}).isDisabled());await close();
 s=await state();s.players[0].cash=1000;await seed(s);await wallet();await page.getByRole('button',{name:/^赎回/}).click();await idle();assert.equal((await state()).properties[6].owner,0);assert.equal((await state()).players[0].cash,100);await close();await detail(13);await page.getByLabel('计价预览骰点',{exact:true}).selectOption('6');await amount(900);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`detail overflow ${width}`);await page.screenshot({path:`artifacts/industry-detail-${width}.png`,fullPage:false});}await close();
 // A human owner must explicitly consent on another player's turn.
 s=initialState();s.current=1;s.players[1].pos=5;s.properties[6]={owner:0,level:0};s=transition(transition(s,{type:'ROLL',value:1}),{type:'OFFER'});await seed(s);await page.waitForTimeout(1100);assert.equal((await state()).phase,'offer');assert.match(await page.getByLabel('收购请求',{exact:true}).innerText(),/免本次服务费/);await page.getByRole('button',{name:/^同意收购/}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).properties[6].owner===1);assert.equal((await state()).players[0].cash,13800);
 // Bank-held services are free and cannot be purchased from the market.
 s=initialState();s.players[0].pos=5;s.players[0].controlled=1;s.properties[6]={owner:'bank',mortgagor:1,mortgageAmount:900,level:0};await seed(s);await detail(6);await amount(0);assert.match(await page.locator('.industry-detail-heading').innerText(),/暂停收费与联动/);await close();await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('end');assert.equal((await state()).players[0].cash,12000);assert.equal(await page.getByRole('button',{name:/^购买 ¥/}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: five industry scenes, actual purchase, asset detail, preview controls, operating links, saved service snapshot/shield, industry mortgage/debt/redeem, human consent, bank immunity and 320/390/1440 screenshots.');
}finally{await browser.close();}

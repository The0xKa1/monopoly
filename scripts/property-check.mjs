import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState,transition} from '../src/game.js';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('http://localhost:5173');
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-dice-v1')));
 const seed=async s=>{await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();};
 const phase=async p=>page.waitForFunction(p=>JSON.parse(localStorage.getItem('city-dice-v1')).phase===p,p);
 const idle=()=>page.waitForFunction(()=>!document.querySelector('.transfer-toast'));
 const roll=async()=>{await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('rent');};
 const wallet=()=>page.locator('.roster-strip').getByRole('button',{name:'查看小满的资产',exact:true}).click();
 let s=initialState();s.players[0].controlled=1;s.properties[1]={owner:1,level:1,upgradeSpent:880};await seed(s);await roll();
 assert.equal((await state()).players[0].cash,12000);
 await page.screenshot({path:'artifacts/property-offer-mobile.png',fullPage:true});
 await page.getByRole('button',{name:/^提出收购/}).click();await phase('end');await idle();
 let result=await state();assert.equal(result.properties[1].owner,0);assert.equal(result.players[0].cash,8920);assert.equal(result.players[1].cash,15080);assert.equal(result.properties[1].level,1);
 // AI refuses when it owns three properties; rent still requires an explicit action.
 s=initialState();s.players[0].controlled=1;s.properties={1:{owner:1,level:0},3:{owner:1,level:0},4:{owner:1,level:0}};await seed(s);await roll();await page.getByRole('button',{name:/^提出收购/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).pendingRent?.offerRejected);
 assert.equal((await state()).players[0].cash,12000);assert.ok(await page.getByRole('button',{name:/^提出收购/}).isDisabled());await page.getByRole('button',{name:/^支付租金/}).click();await phase('end');await idle();assert.equal((await state()).players[0].cash,11648);
 // Human owner must decide even while another player is taking the turn.
 s=initialState();s.current=1;s.properties[1]={owner:0,level:0};s=transition(transition(s,{type:'ROLL',value:1}),{type:'OFFER'});await seed(s);await page.waitForTimeout(1100);assert.equal((await state()).phase,'offer');
 await page.screenshot({path:'artifacts/property-owner-mobile.png',fullPage:true});await page.getByRole('button',{name:/^同意收购/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).properties[1].owner===1);assert.equal((await state()).players[0].cash,14200);
 // Insufficient rent -> collateral -> reload pending debt -> actual payment.
 s=initialState();s.players[0].cash=10;s.players[0].controlled=1;s.properties={1:{owner:1,level:2},3:{owner:0,level:1,upgradeSpent:500}};await seed(s);await roll();await page.getByRole('button',{name:/^抵押筹款/}).click();await phase('debt');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`artifacts/property-mortgage-${width}.png`,fullPage:true});}
 await page.setViewportSize({width:390,height:844});await page.locator('.mortgage-list button').click();await idle();result=await state();assert.equal(result.players[0].cash,1310);assert.equal(result.players[1].cash,12000);assert.equal(result.properties[3].owner,'bank');
 await page.reload();await phase('debt');await page.getByRole('button',{name:/^支付欠款/}).click();await phase('end');await idle();result=await state();assert.equal(result.players[0].cash,254);assert.equal(result.players[1].cash,13056);
 await wallet();assert.match(await page.locator('.wallet-properties').innerText(),/银行代持/);assert.ok(await page.getByRole('button',{name:/^赎回/}).isDisabled());await page.keyboard.press('Escape');
 s=await state();s.players[0].cash=1800;await seed(s);await wallet();await page.screenshot({path:'artifacts/property-redeem-mobile.png',fullPage:true});await page.getByRole('button',{name:/^赎回/}).click();await idle();result=await state();assert.equal(result.properties[3].owner,0);assert.equal(result.properties[3].level,1);assert.equal(result.players[0].cash,500);await page.keyboard.press('Escape');
 // Bankruptcy returns collateral to the market and announces the released cities.
 s=initialState();s.players[0].cash=0;s.players[0].controlled=1;s.properties={1:{owner:1,level:3},3:{owner:0,level:0},4:{owner:'bank',mortgagor:0,mortgageAmount:900,level:0}};await seed(s);await roll();await page.getByRole('button',{name:/^抵押筹款/}).click();await page.locator('.mortgage-list button').click();await idle();await page.getByRole('button',{name:'确认破产',exact:true}).click();await idle();
 result=await state();assert.ok(result.players[0].bankrupt);assert.equal(result.players[1].cash,12800);assert.equal(result.properties[3],undefined);assert.equal(result.properties[4],undefined);assert.ok(result.journal.some(x=>x.category==='bankruptcy'&&x.released.length===2));
 await page.getByRole('button',{name:'公告',exact:true}).click();assert.match(await page.locator('.hub-news').innerText(),/全体公告/);assert.match(await page.locator('.hub-news').innerText(),/西安、成都重新进入市场/);await page.screenshot({path:'artifacts/property-bankruptcy-mobile.png',fullPage:true});
 // Bank-held city can neither charge rent nor be purchased by a visitor.
 s=initialState();s.players[0].controlled=1;s.properties[1]={owner:'bank',mortgagor:2,mortgageAmount:1100,level:0};await seed(s);await page.getByRole('button',{name:'掷骰子',exact:true}).click();await phase('end');assert.equal((await state()).players[0].cash,12000);assert.equal(await page.locator('.property-actions').count(),0);assert.equal(await page.locator('.board .bank-held').count(),1);assert.equal(await page.getByRole('button',{name:/^购买 ¥/}).count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: offer acceptance/refusal, explicit human consent, mortgage and pending reload, repayment, original-amount redemption, bankruptcy announcement/release, bank immunity, 320/390/1440 layouts; no JS errors.');
}finally{await browser.close();}

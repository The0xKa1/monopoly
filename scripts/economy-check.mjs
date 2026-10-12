import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState,transition} from '../src/game.js';
import {auctionMinimum} from '../src/economy.js';
mkdirSync('artifacts/economy-rebalance',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
let page;
try{
 page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(`${process.env.BASE_URL||'http://localhost:5180'}/?local=1`);
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-dice-v1')));
 const seed=async s=>{await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();};
 const fresh=()=>initialState(undefined,undefined,undefined,{roundLimit:null});
 let s=fresh();s.current=1;s.players[1].pos=1;s.players.slice(1).forEach(p=>p.cash=0);s.phase='buy';s=transition(s,{type:'END'});
 assert.equal(s.phase,'auction');assert.equal(s.auction.bidder,0);
 await seed(s);await page.getByRole('heading',{name:/公开拍卖/}).waitFor();
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/economy-rebalance/auction-${width}.png`,fullPage:true});
 }
 await page.reload();assert.equal((await state()).phase,'auction');
 const bid=auctionMinimum(s);await page.getByRole('button',{name:/^出价/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).properties[1]?.owner===0);
 assert.equal((await state()).players[0].cash,12000-bid);
 // The property owner can respond while someone else is taking the turn.
 s=fresh();s.round=21;s.current=1;s.properties[1]={owner:0,level:0};
 s=transition(transition(s,{type:'ROLL',value:1}),{type:'CONTEST',actor:1});
 assert.equal(s.phase,'contest');await seed(s);await page.locator('.property-actions').getByRole('heading',{name:/争夺/}).waitFor();
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'artifacts/economy-rebalance/contest-mobile.png',fullPage:true});
 await page.getByRole('button',{name:/^保留产权/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).pendingRent?.contested);
 assert.equal((await state()).players[0].cash,12000-s.contest.defenseFee);
 // Fee debt survives refresh, then collateral and repayment restore roll.
 s=fresh();s.current=3;s.round=40;s.phase='end';s.players[0].cash=100;s.properties[3]={owner:0,level:0};s=transition(s,{type:'END'});
 assert.equal(s.phase,'debt');assert.equal(s.debt.resume,'roll');await seed(s);
 await page.locator('.property-actions').getByRole('heading',{name:/经营费/}).waitFor();await page.reload();
 await page.screenshot({path:'artifacts/economy-rebalance/operating-debt-mobile.png',fullPage:true});
 await page.locator('.mortgage-list button').click();await page.getByRole('button',{name:/^支付欠款/}).waitFor();
 await page.getByRole('button',{name:/^支付欠款/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).phase==='roll');
 assert.equal((await state()).round,41);
 assert.match(await page.locator('.hub-economy').innerText(),/下一轮.*400/);
 await page.getByRole('button',{name:'游戏规则',exact:true}).click();
 assert.match(await page.locator('.rules-grid').innerText(),/最终经营期/);await page.keyboard.press('Escape');
 s=fresh();delete s.economyVersion;await seed(s);assert.equal(await page.locator('.hub-economy').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS: off-turn human auction, cash-only settlement, auction refresh, owner contest defense, fee debt refresh/mortgage/repayment, new/legacy rules, 320/390/1440 layouts, no JS errors.');
}catch(error){
 if(page){await page.screenshot({path:'artifacts/economy-rebalance/browser-failure.png',fullPage:true});console.error('Failure state:',await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('city-dice-v1'));return {phase:s?.phase,round:s?.round,current:s?.current};}));}
 throw error;
}finally{await browser.close();}

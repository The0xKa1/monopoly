import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {initialState} from '../src/game.js';
import {movementPath} from '../src/useGameController.js';
assert.deepEqual(movementPath(18,4),[19,0,1,2]);
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1080}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');
 const seed=async s=>{await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();};
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-dice-v1')));
 const idle=()=>page.waitForFunction(()=>document.querySelector('.activity-ribbon')?.dataset.motion==='idle'&&!document.querySelector('.transfer-toast'));
 await page.getByRole('button',{name:'展开道具',exact:true}).click();
 await page.getByRole('button',{name:/遥控骰子/}).click();await page.getByRole('button',{name:'选择 4 点',exact:true}).click();
 await page.evaluate(()=>{window.positions=[];window.track=setInterval(()=>{const pos=Number(document.querySelector('[data-token="0"]').dataset.position);if(window.positions.at(-1)!==pos)window.positions.push(pos);},20);});
 await page.getByRole('button',{name:/掷骰子/}).click();
 await page.waitForFunction(()=>document.querySelector('[data-token="0"]').dataset.position==='2');
 assert.equal((await state()).players[0].pos,0,'movement has not committed before arrival');
 await page.screenshot({path:'artifacts/moving-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'购买 ¥ 1,800'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>{clearInterval(window.track);return window.positions;}),[0,1,2,3,4]);
 await page.getByRole('button',{name:'购买 ¥ 1,800'}).click();
 await page.locator('[data-testid="money-transfer"]').waitFor();
 assert.equal(await page.locator('.transfer-toast').getAttribute('data-from'),'0');
 assert.equal(await page.locator('.transfer-toast').getAttribute('data-to'),'bank');
 assert.equal(await page.locator('.flying-coin').count(),8);
 await page.screenshot({path:'artifacts/coins-desktop.png',fullPage:true});await idle();
 await page.locator('.roster-strip').getByRole('button',{name:'查看小满的资产',exact:true}).click();
 assert.ok((await page.locator('.wallet-properties').innerText()).includes('成都'));
 assert.ok((await page.locator('.detail-stats').innerText()).includes('12,000'));
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('.board').evaluate(e=>getComputedStyle(e).transform),'none');
 assert.equal(await page.locator('.camera-controls').count(),0);
 // Crossing the start and paying rent creates two explicit, sequential effects.
 let s=initialState();s.players[0].pos=19;s.players[0].controlled=2;s.properties[1]={owner:1,level:0};await seed(s);
 await page.getByRole('button',{name:/掷骰子/}).click();
 await page.locator('.transfer-toast[data-from="bank"][data-to="0"]').waitFor();
 await page.getByRole('button',{name:/^支付租金/}).click();
 await page.locator('.transfer-toast[data-from="0"][data-to="1"]').waitFor();
 assert.equal((await state()).players[0].cash,12848);assert.equal((await state()).players[1].cash,12352);await idle();
 // Reset while walking must cancel every outstanding callback.
 s=initialState();s.players[0].controlled=6;await seed(s);await page.getByRole('button',{name:/掷骰子/}).click();
 await page.waitForFunction(()=>document.querySelector('.activity-ribbon').dataset.motion==='walk');
 await page.getByRole('button',{name:'重新开始',exact:true}).click();await page.getByRole('button',{name:'确认重开',exact:true}).click();
 await page.waitForTimeout(2800);assert.equal((await state()).players[0].pos,0);assert.equal((await state()).phase,'roll');
 // Refresh while walking restores the last committed state.
 s=initialState();s.players[0].controlled=6;await seed(s);await page.getByRole('button',{name:/掷骰子/}).click();
 await page.waitForFunction(()=>document.querySelector('.activity-ribbon').dataset.motion==='walk');await page.reload();assert.equal((await state()).players[0].pos,0);assert.equal((await state()).phase,'roll');
 // Mobile has readable accounting and a visible transaction even offscreen from wallets.
 await page.setViewportSize({width:390,height:844});s=initialState();s.players[0].controlled=1;s.properties[1]={owner:1,level:0};await seed(s);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(await page.locator('.asset-breakdown').count(),4);
 await page.getByRole('button',{name:/掷骰子/}).click();await page.getByRole('button',{name:/^支付租金/}).click();await page.locator('.transfer-toast').waitFor();
 await page.screenshot({path:'artifacts/coins-mobile.png',fullPage:true});await idle();
 await page.emulateMedia({reducedMotion:'reduce'});s=initialState();s.players[0].controlled=2;await seed(s);await page.getByRole('button',{name:/掷骰子/}).click();await idle();
 // Await committed move (idle can be transient immediately after browser input).
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).players[0].pos===2);await idle();
 assert.deepEqual(errors,[]);console.log('PASS: sequential route, atomic arrival, eight coin particles, wallets, top-down board, bank income + player rent, reset cancellation, refresh recovery, mobile, reduced motion; zero JS errors.');
}finally{await browser.close();}

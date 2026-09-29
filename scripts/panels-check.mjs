import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState,worth,money} from '../src/game.js';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:5173');
 assert.equal(await page.locator('#player-details').isVisible(),false);
 assert.equal(await page.locator('#item-cards').isVisible(),false);
 assert.equal(await page.locator('.roster-strip').innerText(),'小满\n阿橙\n小紫\n蓝仔');
 const turn=await page.locator('.turn-bar').boundingBox();assert.ok(turn.y+turn.height<=844,'roll controls fit the first mobile screen');
 await page.locator('[data-token="0"]').click();
 assert.equal(await page.locator('.participant-picker button').count(),4);
 await page.getByRole('dialog').getByRole('button',{name:'查看小紫的资产'}).click();
 assert.equal(await page.getByRole('dialog').locator('h2').innerText(),'小紫');
 assert.match(await page.locator('.wallet-properties').innerText(),/暂无地产/);
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'展开玩家资产',exact:true}).focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#player-details').isVisible(),true);
 await page.screenshot({path:'artifacts/compact-expanded-mobile.png',fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'收起玩家资产',exact:true}).click();
 await page.getByRole('button',{name:'展开道具',exact:true}).click();
 assert.equal(await page.locator('#item-cards').isVisible(),true);
 await page.getByRole('button',{name:'收起道具',exact:true}).click();
 const s=initialState();s.players.forEach((p,i)=>{p.pos=i+1;p.cash=9000+i*500;});s.properties={1:{owner:0,level:1},4:{owner:1,level:2},7:{owner:2,level:0},14:{owner:3,level:3}};
 await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();
 for(let i=0;i<4;i++) {
  await page.locator('.roster-strip button').nth(i).click();
  const stats=await page.locator('.detail-stats b').allTextContents();
  assert.deepEqual(stats,[money(s.players[i].cash),money(worth(s,i)-s.players[i].cash),money(worth(s,i))]);
  assert.equal(await page.locator('.wallet-properties>div').count(),1);
  assert.match(await page.locator('.wallet-properties').innerText(),new RegExp(`${[2,3,1,4][i]} 级`));
  await page.keyboard.press('Escape');
  await page.locator(`[data-token="${i}"]`).click();
  assert.equal(await page.getByRole('dialog').locator('h2').innerText(),s.players[i].name);
  await page.keyboard.press('Escape');
 }
 await page.locator('.roster-strip button').nth(1).click();
 await page.screenshot({path:'artifacts/compact-wallet-mobile.png',fullPage:true,animations:'disabled'});await page.keyboard.press('Escape');
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:width===320?740:1000});await page.reload();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px no horizontal overflow`);
  await page.screenshot({path:`artifacts/compact-${width}.png`,fullPage:true,animations:'disabled'});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: collapsed defaults, keyboard toggles, first-screen mobile dice, shared-tile selector, all four avatar/token wallets and balances, property levels, 320/390/768/1440 layouts; no JS errors.');
} finally {await browser.close();}

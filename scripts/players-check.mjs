import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState} from '../src/game.js';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-dice-v1')));
 const seed=async s=>{await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();};
 await page.goto('http://localhost:5173');await seed(initialState());
 await page.getByRole('button',{name:'新增角色',exact:true}).click();await page.getByLabel('昵称',{exact:true}).fill('小满');await page.getByRole('button',{name:'添加角色',exact:true}).click();
 assert.equal(await page.getByRole('alert').innerText(),'昵称已存在');assert.equal((await state()).players.length,4);
 await page.getByLabel('昵称',{exact:true}).fill('小麦');await page.getByRole('button',{name:'发型：长发',exact:true}).click();
 await page.screenshot({path:'artifacts/players-create-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'添加角色',exact:true}).click();assert.equal((await state()).players[4].appearance.hair,'long');
 // Adding while a move is pending must survive the eventual arrival commit.
 let s=await state();s.players[0].controlled=6;await seed(s);
 await page.getByRole('button',{name:'掷骰子',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.activity-ribbon').dataset.motion==='walk');
 await page.getByRole('button',{name:'新增角色',exact:true}).click();await page.getByLabel('昵称',{exact:true}).fill('同行');await page.getByRole('button',{name:'添加角色',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).players[0].pos===6);
 assert.equal((await state()).players.length,6);assert.equal((await state()).players[0].cash,12000);
 // Fill the roster exclusively through the public UI.
 for(let n=7;n<=20;n++){await page.getByRole('button',{name:'新增角色',exact:true}).click();await page.getByRole('button',{name:'添加角色',exact:true}).click();}
 assert.equal((await state()).players.length,20);assert.ok(await page.getByRole('button',{name:'新增角色',exact:true}).isDisabled());
 await page.reload();assert.equal((await state()).players.length,20);
 await page.locator('.roster-strip button').nth(19).click();assert.equal(await page.getByRole('dialog').locator('h2').innerText(),'玩家20');assert.match(await page.locator('.detail-stats').innerText(),/12,000/);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'重新开始',exact:true}).click();await page.getByRole('button',{name:'确认重开',exact:true}).click();assert.equal((await state()).players.length,20);assert.equal((await state()).players[4].name,'小麦');
 await page.locator('.token-count').click();assert.equal(await page.locator('.participant-picker button').count(),20);await page.getByRole('dialog').getByRole('button',{name:'查看玩家20的资产',exact:true}).click();assert.equal(await page.getByRole('dialog').locator('h2').innerText(),'玩家20');await page.keyboard.press('Escape');
 await page.waitForTimeout(450);
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}px overflow`);await page.screenshot({path:`artifacts/players-${width}.png`,fullPage:true});}
 s=await state();s.players[19].name='十二字昵称测试角色甲乙丙丁';s.players[19].name=[...s.players[19].name].slice(0,12).join('');await seed(s);await page.setViewportSize({width:320,height:844});await page.locator('.roster-strip button').nth(19).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.keyboard.press('Escape');
 // The twentieth AI uses movement, purchase and end-turn normally, then wraps to player zero.
 await page.emulateMedia({reducedMotion:'reduce'});s=await state();s.current=19;s.phase='roll';s.players[19].controlled=1;await seed(s);
 assert.ok(await page.locator('[data-token="19"]').isVisible());
 await page.waitForFunction(()=>{const s=JSON.parse(localStorage.getItem('city-dice-v1'));return s.current===0&&s.round===2;},{},{timeout:20000});
 s=await state();assert.equal(s.players[19].pos,1);assert.equal(s.properties[1].owner,19);assert.equal(s.players[19].cash,9800);
 assert.deepEqual(errors,[]);console.log('PASS: nickname validation, custom new avatar, mid-move add, twenty-player limit, reload/reset, crowded tile selection, twentieth AI purchase and turn wrap, mobile/desktop; no JS errors.');
}finally{await browser.close();}

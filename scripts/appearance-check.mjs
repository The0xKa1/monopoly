import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {initialState} from '../src/game.js';
import {renderAvatar} from '../src/appearance.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('city-dice-v1')));
 const seed=async s=>{await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();};
 const source=a=>`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderAvatar(a))}`;
 await page.goto('http://localhost:5173');
 const old=initialState();old.players.forEach(p=>delete p.appearance);old.players[0].cash=9456;old.properties={1:{owner:0,level:1}};
 await seed(old);
 assert.equal((await state()).players[0].cash,9456);assert.equal((await state()).properties[1].level,1);
 const before=await state();
 await page.getByRole('button',{name:'编辑我的外观'}).click();
 await page.getByRole('button',{name:'发型：长发',exact:true}).click();
 await page.getByRole('button',{name:'服装',exact:true}).click();
 await page.getByRole('button',{name:'上衣：砖红',exact:true}).click();
 await page.getByRole('button',{name:'配饰',exact:true}).click();
 await page.getByRole('button',{name:'眼镜：圆框',exact:true}).click();
 await page.getByRole('button',{name:'动作预览',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.appearance-stage img').dataset.frame==='1');
 await page.screenshot({path:'artifacts/appearance-custom-mobile.png',fullPage:true,animations:'disabled'});
 await page.getByRole('button',{name:'保存外观',exact:true}).click();
 const after=await state(),appearance=after.players[0].appearance;
 assert.equal(appearance.shirt,'red');assert.equal(appearance.hair,'long');assert.equal(appearance.glasses,'round');
 const withoutAppearance=s=>{s.players.forEach(p=>delete p.appearance);return s;};
 assert.deepEqual(withoutAppearance(structuredClone(after)),withoutAppearance(structuredClone(before)));
 assert.equal(await page.locator('.wallet-portrait img').getAttribute('src'),source(appearance));
 await page.keyboard.press('Escape');
 for(const selector of ['.roster-strip [data-avatar="0"]','[data-token="0"] img','.activity-person img'])assert.equal(await page.locator(selector).getAttribute('src'),source(appearance));
 await page.reload();assert.deepEqual((await state()).players[0].appearance,appearance);
 await page.getByRole('button',{name:'编辑我的外观'}).click();
 await page.getByRole('button',{name:'肤色：深肤',exact:true}).click();await page.getByRole('button',{name:'取消',exact:true}).click();
 assert.deepEqual((await state()).players[0].appearance,appearance);
 // Each player can be edited independently through their wallet.
 await page.locator('.roster-strip button').nth(2).click();await page.getByRole('button',{name:'编辑外观',exact:true}).click();
 await page.getByRole('button',{name:'发型：卷发',exact:true}).click();await page.getByRole('button',{name:'保存外观',exact:true}).click();
 assert.equal((await state()).players[2].appearance.hair,'curly');assert.deepEqual((await state()).players[0].appearance,appearance);await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'重新开始',exact:true}).click();await page.getByRole('button',{name:'确认重开',exact:true}).click();
 assert.deepEqual((await state()).players[0].appearance,appearance);assert.equal((await state()).players[0].cash,12000);
 // A pending movement must not overwrite an appearance saved while it is in flight.
 let s=await state();s.players[0].controlled=6;await seed(s);
 await page.getByRole('button',{name:'掷骰子',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.activity-ribbon').dataset.motion==='walk');
 await page.getByRole('button',{name:'编辑我的外观'}).click();await page.getByRole('button',{name:'发型：卷发',exact:true}).click();await page.getByRole('button',{name:'保存外观',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).players[0].pos===6);
 assert.equal((await state()).players[0].appearance.hair,'curly');assert.equal((await state()).players[0].cash,12000);await page.keyboard.press('Escape');
 // Money transfers must use the same customized portrait.
 s=await state();s.current=0;s.phase='roll';s.players[0].pos=0;s.players[0].controlled=1;s.properties={1:{owner:1,level:0}};await seed(s);
 await page.getByRole('button',{name:'掷骰子',exact:true}).click();await page.getByRole('button',{name:/^支付租金/}).click();await page.locator('.transfer-toast').waitFor();
 assert.equal(await page.locator('.transfer-from img').getAttribute('src'),source(s.players[0].appearance));
 await page.waitForFunction(()=>!document.querySelector('.transfer-toast'));
 for(const width of [320,1440]) {
  await page.setViewportSize({width,height:900});await page.getByRole('button',{name:'编辑我的外观'}).click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`artifacts/appearance-${width}.png`,fullPage:true,animations:'disabled'});await page.keyboard.press('Escape');
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: old-save migration, independent appearance edits, preview walking, all portraits, cancel, reload, reset retention, mid-move save, coin portrait, 320/390/1440 layouts; no JS errors.');
}finally{await browser.close();}

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {initialState} from '../src/game.js';
const base=process.env.BASE_URL||'http://localhost:8788';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];
const page=await browser.newPage({viewport:{width:1440,height:960}});
await page.addInitScript(()=>{
 const Native=window.AudioContext;window.audioProbe={contexts:[],starts:[],sources:[],notes:0};
 window.AudioContext=class extends Native{
  constructor(...args){super(...args);audioProbe.contexts.push(this);}
  createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s),stop=s.stop.bind(s);audioProbe.sources.push(s);s.start=(...args)=>{audioProbe.starts.push({duration:s.buffer.duration,offset:args[1]||0});start(...args);};s.stop=(...args)=>{s.stopped=true;stop(...args);};return s;}
  createOscillator(){audioProbe.notes++;return super.createOscillator();}
 };
});
page.on('pageerror',e=>errors.push(e.message));
const open=()=>page.getByRole('button',{name:'音频设置',exact:true}).click();
const close=()=>page.getByRole('button',{name:'关闭音频设置'}).click();
const waitSong=duration=>page.waitForFunction(d=>audioProbe.starts.some(s=>Math.abs(s.duration-d)<.03),duration);
try{
 await mkdir('artifacts/audio-integration',{recursive:true});
 await page.goto(base);assert.equal(await page.evaluate(()=>audioProbe.contexts.length),0);
 await open();await waitSong(41.739);await page.getByText('田埂午后 · 正在播放',{exact:true}).waitFor();
 await page.getByRole('slider',{name:'背景音乐音量',exact:true}).fill('32');
 await page.getByRole('slider',{name:'音效音量',exact:true}).fill('60');
 await page.getByRole('button',{name:'试听音效',exact:true}).click();assert.ok(await page.evaluate(()=>audioProbe.notes>0));
 await page.getByRole('checkbox',{name:/^背景音乐/}).uncheck();await page.getByText('田埂午后 · 已静音',{exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>audioProbe.sources.every(s=>s.stopped)));
 await page.getByRole('checkbox',{name:/^背景音乐/}).check();await page.getByText('田埂午后 · 正在播放',{exact:true}).waitFor();
 for(const width of [1440,390,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`artifacts/audio-integration/settings-${width}.png`});}
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 await page.reload();await open();assert.equal(await page.getByRole('slider',{name:'背景音乐音量',exact:true}).inputValue(),'32');await close();
 await page.getByLabel('昵称',{exact:true}).fill('音频测试');await page.getByRole('button',{name:'创建房间',exact:true}).click();await page.getByRole('heading',{name:'准备大厅'}).waitFor();await waitSong(36.923);
 await open();await page.getByText('窗边等你 · 正在播放',{exact:true}).waitFor();await close();
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.ok(await page.evaluate(()=>audioProbe.sources.every(s=>s.stopped)));
 const n=await page.evaluate(()=>audioProbe.starts.length);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(n=>audioProbe.starts.length>n,n);
 await page.getByRole('button',{name:'开始对局',exact:true}).click();await page.locator('.board').waitFor();await waitSong(68.571);
 await page.locator('.network-bar').getByRole('button',{name:'房间信息',exact:true}).click();await open();await page.getByText('窗边等你 · 正在播放',{exact:true}).waitFor();await close();
 // Independent local saves exercise both stage thresholds and the finished state.
 for(const [round,roundLimit,duration,title] of [[15,20,68.571,'街角慢跑'],[16,20,48,'夜色将至'],[40,null,68.571,'街角慢跑'],[41,null,48,'夜色将至']]){
  const s=initialState();s.round=round;s.roundLimit=roundLimit;
  await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.goto(`${base}/?local=1`);await open();await waitSong(duration);await page.getByText(`${title} · 正在播放`,{exact:true}).waitFor();await close();
 }
 const finished=initialState();finished.phase='finished';finished.winner=0;
 await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),finished);await page.goto(`${base}/?local=1`);
 if(await page.getByRole('button',{name:'关闭',exact:true}).count())await page.getByRole('button',{name:'关闭',exact:true}).click();await open();await page.getByText('无曲目 · 暂无背景音乐',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>audioProbe.starts.length),0);
 assert.deepEqual(errors,[]);console.log('PASS: gesture unlock, independent volumes/mute, persistence, ready/lobby/local game stages, background resume, finished silence, 320/390/1440 settings; no JS errors.');
}finally{await browser.close();}

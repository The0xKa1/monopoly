import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {initialState} from '../src/game.js';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.audioProbe={notes:[],contexts:[]};const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   constructor(...a){super(...a);window.audioProbe.contexts.push(this);this.probe=this.createAnalyser();this.probe.fftSize=256;}
   createGain(){const g=super.createGain();if(!this.master){this.master=g;g.connect(this.probe);}return g;}
   createOscillator(){const o=super.createOscillator(),start=o.start.bind(o),stop=o.stop.bind(o),setFrequency=o.frequency.setValueAtTime.bind(o.frequency);let frequency; o.frequency.setValueAtTime=(value,time)=>{frequency=value;return setFrequency(value,time);};o.start=t=>{window.audioProbe.notes.push({frequency,wave:o.type,time:t});start(t);};o.stop=t=>{window.audioProbe.lastStop=performance.now();stop(t);};return o;}
  };
 });
 await page.goto('http://localhost:5173');
 const seed=async s=>{await page.evaluate(s=>localStorage.setItem('city-dice-v1',JSON.stringify(s)),s);await page.reload();};
 let s=initialState();s.players[0].controlled=1;await seed(s);
 assert.equal(await page.getByRole('button',{name:'关闭音效',exact:true}).isVisible(),true);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.equal(await page.evaluate(()=>audioProbe.contexts.length),0,'no audio context until user gesture');
 await page.getByRole('button',{name:/掷骰子/}).click();
 await page.waitForFunction(()=>audioProbe.notes.some(n=>n.wave==='square'));
 const stepNotes=await page.evaluate(()=>audioProbe.notes.filter(n=>n.wave==='square').length);assert.equal(stepNotes,1);
 assert.equal(await page.evaluate(()=>audioProbe.contexts[0].state),'running');
 await page.getByRole('button',{name:'购买 ¥ 2,200'}).click();
 await page.locator('.transfer-toast').waitFor();
 const debit=await page.evaluate(()=>audioProbe.notes.filter(n=>n.wave==='sine').map(n=>n.frequency));
 assert.equal(debit.length,8);assert.ok(debit[0]>debit[6],'spend sound falls');
 const peak=await page.evaluate(async()=>{let peak=0;const ctx=audioProbe.contexts[0],data=new Float32Array(ctx.probe.fftSize);for(let i=0;i<10;i++){ctx.probe.getFloatTimeDomainData(data);peak=Math.max(peak,...data.map(Math.abs));await new Promise(r=>setTimeout(r,15));}return peak;});assert.ok(peak>.001&&peak<.5,`audible, bounded signal ${peak}`);
 await page.getByRole('button',{name:'关闭音效',exact:true}).click();
 assert.equal(await page.evaluate(()=>audioProbe.contexts[0].master.gain.value),0);
 await page.reload();assert.equal(await page.getByRole('button',{name:'开启音效',exact:true}).isVisible(),true);
 s=initialState();s.players[0].controlled=2;await seed(s);await page.getByRole('button',{name:/掷骰子/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('city-dice-v1')).players[0].pos===2);
 assert.equal(await page.evaluate(()=>audioProbe.notes.length),0,'muted actions never create notes');
 s=initialState();s.players[0].pos=19;s.players[0].controlled=1;await seed(s);
 await page.getByRole('button',{name:'开启音效',exact:true}).click();
 await page.getByRole('button',{name:/掷骰子/}).click();await page.locator('.transfer-toast').waitFor();
 const credit=await page.evaluate(()=>audioProbe.notes.filter(n=>n.wave==='sine').map(n=>n.frequency));assert.equal(credit.length,8);assert.ok(credit[0]<credit[6],'income sound rises');
 await page.getByRole('button',{name:'关闭音效',exact:true}).click();
 await page.waitForTimeout(80);
 assert.equal(await page.evaluate(()=>{const ctx=audioProbe.contexts[0],data=new Float32Array(256);ctx.probe.getFloatTimeDomainData(data);return Math.max(...data.map(Math.abs));}),0,'mute silences pending coin notes');
 assert.deepEqual(errors,[]);
 console.log(`PASS: mobile toggle, gesture unlock, one step per tile, spend/income jingles, audible output (peak ${peak.toFixed(3)}), immediate mute and persistence; no JS errors.`);
}finally{await browser.close();}

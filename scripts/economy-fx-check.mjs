import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {initialState,transition} from '../src/game.js';
mkdirSync('artifacts/economy-rebalance',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.BASE_URL||'http://localhost:5180'}/?local=1`);
 await page.locator('.board').waitFor();
 await page.evaluate(async()=>{
  const React=(await import('/node_modules/.vite/deps/react.js')).default;
  const {createRoot}=(await import('/node_modules/.vite/deps/react-dom_client.js')).default;
  const {FxLayer}=await import('/src/FxLayer.jsx');
  const el=document.createElement('div');document.body.append(el);const root=createRoot(el);
  window.renderEconomyFx=({prev,next,seq})=>root.render(React.createElement(FxLayer,{key:seq,commit:{prev,next,seq},game:next}));
 });
 const fresh=()=>initialState(undefined,undefined,undefined,{roundLimit:null});
 const act=(s,type,rest={})=>transition(s,{type,...rest});
 let buy=fresh();buy.phase='buy';buy.players[0].pos=1;
 const auction=act(buy,'END'),bid=act(auction,'AUCTION_BID',{actor:0,amount:1100});
 let closing=act(act(bid,'AUCTION_PASS',{actor:1}),'AUCTION_PASS',{actor:2});
 let rent=fresh();rent.round=21;rent.properties[1]={owner:1,level:0};rent=act(rent,'ROLL',{value:1});
 const contest=act(rent,'CONTEST',{actor:0});
 let fee=fresh();fee.round=40;fee.current=3;fee.phase='end';
 let supply=fresh();supply.round=20;supply.current=3;supply.phase='end';
 const cases=[['auction',buy,auction],['auction-bid',auction,bid],['auction-sale',closing,act(closing,'AUCTION_PASS',{actor:3})],['contest',rent,contest],['defense',contest,act(contest,'CONTEST_REPLY',{actor:1,accept:false})],['contest-sale',contest,act(contest,'CONTEST_REPLY',{actor:1,accept:true})],['operating',fee,act(fee,'END')],['supply',supply,act(supply,'END')]];
 let seq=1;
 for(const [type,prev,next] of cases){
  await page.evaluate(arg=>window.renderEconomyFx(arg),{prev,next,seq:seq++});
  const receipt=page.locator(`.fx-economy-${type}`);await receipt.waitFor();
  assert.equal(await receipt.locator('.pixel-economy-icon').count(),1);
  assert.ok(await receipt.evaluate(el=>el.getAnimations().length>0));
  await page.waitForTimeout(250);
  await receipt.screenshot({path:`artifacts/economy-rebalance/fx-${type}.png`,animations:'allow'});
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(arg=>window.renderEconomyFx(arg),{prev:buy,next:auction,seq:seq++});
 await page.waitForTimeout(100);assert.equal(await page.locator('.fx-economy').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: eight committed economy effects render pixel icons and animate; reduced-motion suppresses overlays; no JS errors.');
}finally{await browser.close();}

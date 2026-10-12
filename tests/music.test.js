import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_AUDIO,normalizeAudio,readAudioSettings,gameplayMusic,createMusicPlayer} from '../src/music.js';

test('audio preferences migrate mute and sanitize persisted values',()=>{
 assert.equal(readAudioSettings({getItem:key=>key==='city-dice-sound'?'off':null}).effectsEnabled,false);
 assert.deepEqual(readAudioSettings({getItem:()=>'{oops'}),DEFAULT_AUDIO);
 assert.deepEqual(normalizeAudio({effectsEnabled:false,effectsVolume:140,musicEnabled:'no',musicVolume:-2}),{effectsEnabled:false,effectsVolume:100,musicEnabled:true,musicVolume:0});
});
test('late music uses final quarter or round 41, and stops at settlement',()=>{
 for(const [round,roundLimit,expected] of [[15,20,'playing'],[16,20,'late'],[40,null,'playing'],[41,null,'late'],[1,1,'playing'],[3,4,'playing'],[4,4,'late']])assert.equal(gameplayMusic({round,roundLimit}),expected);
 assert.equal(gameplayMusic({round:60,roundLimit:null,phase:'finished'}),null);
});
function harness(){
 const pending=new Map(),starts=[],sources=[],states=[];let created=0;
 const param=()=>({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const ctx={state:'running',currentTime:0,destination:{},createGain:()=>({gain:param(),connect(){},disconnect(){}}),createBufferSource(){const s={connect(){},disconnect(){},start(t,offset){starts.push({source:s,offset});},stop(){s.stopped=true;s.onended?.();}};sources.push(s);return s;},decodeAudioData:async()=>({duration:10}),resume(){this.state='running';return Promise.resolve();},suspend(){this.state='suspended';return Promise.resolve();},close(){this.state='closed';return Promise.resolve();}};
 const player=createMusicPlayer({makeContext:()=>{created++;return ctx;},onStatus:s=>states.push(s),fetchAudio:url=>new Promise((resolve,reject)=>pending.set(url,{resolve,reject}))});
 const resolve=track=>pending.get(`/assets/music/${track}.wav`).resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
 return {player,pending,starts,sources,states,ctx,resolve,get created(){return created;}};
}
const flush=()=>new Promise(r=>setImmediate(r));
test('no autoplay; stale fetch cannot start; cache and scene changes do not layer loops',async()=>{
 const h=harness();h.player.setTrack('lobby');assert.equal(h.created,0);assert.equal(h.pending.size,0);
 h.player.unlock();h.player.setTrack('ready');h.resolve('lobby');await flush();assert.equal(h.starts.length,0);
 h.resolve('ready');await flush();assert.equal(h.starts.length,1);
 h.player.unlock();h.player.setTrack('ready');await flush();assert.equal(h.starts.length,1);
 h.player.setTrack('lobby');await flush();assert.equal(h.starts.length,2);assert.equal(h.sources[0].stopped,true);
 h.player.dispose();assert.equal(h.ctx.state,'closed');
});
test('mute, background and dispose invalidate pending loads; resume preserves loop position',async()=>{
 const h=harness();h.player.setTrack('lobby');h.player.unlock();h.player.configure({...DEFAULT_AUDIO,musicEnabled:false});h.resolve('lobby');await flush();assert.equal(h.starts.length,0);
 h.player.configure(DEFAULT_AUDIO);await flush();assert.equal(h.starts.length,1);
 h.ctx.currentTime=3;h.player.setHidden(true);await flush();assert.equal(h.sources[0].stopped,true);
 h.ctx.currentTime=8;h.player.setHidden(false);await flush();assert.equal(h.starts.at(-1).offset,3);
 h.player.setTrack('late');h.player.dispose();h.resolve('late');await flush();assert.equal(h.starts.length,2);
});
test('failed music load can be retried without affecting the application',async()=>{
 const h=harness();h.player.setTrack('lobby');h.player.unlock();h.pending.get('/assets/music/lobby.wav').reject(new Error('offline'));await flush();assert.equal(h.states.at(-1),'error');
 h.player.retry();h.resolve('lobby');await flush();assert.equal(h.starts.length,1);h.player.dispose();
});

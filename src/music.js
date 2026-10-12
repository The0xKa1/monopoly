export const AUDIO_SETTINGS_KEY='monopoly-audio-v1';
export const MUSIC_TRACKS={lobby:{title:'田埂午后',src:'/assets/music/lobby.wav'},ready:{title:'窗边等你',src:'/assets/music/ready.wav'},playing:{title:'街角慢跑',src:'/assets/music/playing.wav'},late:{title:'夜色将至',src:'/assets/music/late.wav'}};
export const DEFAULT_AUDIO={effectsEnabled:true,effectsVolume:70,musicEnabled:true,musicVolume:45};
export function normalizeAudio(value={}){
 const v=value&&typeof value==='object'?value:{};
 return Object.fromEntries(Object.entries(DEFAULT_AUDIO).map(([key,fallback])=>[key,typeof fallback==='boolean'?(typeof v[key]==='boolean'?v[key]:fallback):(Number.isFinite(v[key])?Math.round(Math.max(0,Math.min(100,v[key]))):fallback)]));
}
export function readAudioSettings(storage){
 try{const saved=storage.getItem(AUDIO_SETTINGS_KEY);if(saved)return normalizeAudio(JSON.parse(saved));return {...DEFAULT_AUDIO,effectsEnabled:storage.getItem('city-dice-sound')!=='off'};}catch{return {...DEFAULT_AUDIO};}
}
export function gameplayMusic(game){
 if(!game||game.phase==='finished')return null;
 const limit=game.roundLimit===null?Infinity:game.roundLimit||20;
 const lateAt=Number.isFinite(limit)?Math.max(2,Math.floor(limit*.75)+1):41;
 return game.round>=lateAt?'late':'playing';
}

// One persistent player. Async decodes are generation-checked; no stale scene may start.
export function createMusicPlayer({onStatus=()=>{},makeContext=()=>new (window.AudioContext||window.webkitAudioContext)(),fetchAudio=url=>fetch(url)}={}){
 let ctx=null,master=null,current=null,track=null,enabled=true,volume=.45,hidden=false,unlocked=false,disposed=false,generation=0,offset=0,state='waiting';
 const cache=new Map(),retiring=new Set();
 function report(next){state=next;onStatus(next);}
 function stop(fade=false,remember=false){
  if(!current)return;
  const old=current;current=null;
  if(remember)offset=(old.offset+Math.max(0,ctx.currentTime-old.started))%old.buffer.duration;
  try{if(fade){old.gain.gain.cancelScheduledValues(ctx.currentTime);old.gain.gain.setValueAtTime(old.gain.gain.value,ctx.currentTime);old.gain.gain.linearRampToValueAtTime(0,ctx.currentTime+.2);retiring.add(old);old.source.stop(ctx.currentTime+.21);}else old.source.stop();}catch{}
 }
 async function start(){
  if(disposed)return;
  if(!enabled||volume===0){report('off');return;}
  if(!track){report('idle');return;}
  if(hidden){report('paused');return;}
  if(!unlocked||!ctx||ctx.state!=='running'){report('waiting');return;}
  if(current?.track===track){report('playing');return;}
  const token=++generation,wanted=track;
  report('loading');
  try{
   if(!cache.has(wanted)){
    const promise=fetchAudio(MUSIC_TRACKS[wanted].src).then(r=>{if(!r.ok)throw new Error('Music request failed');return r.arrayBuffer();}).then(data=>ctx.decodeAudioData(data));
    cache.set(wanted,promise);promise.catch(()=>{if(cache.get(wanted)===promise)cache.delete(wanted);});
   }
   const buffer=await cache.get(wanted);
   if(disposed||token!==generation||track!==wanted||!enabled||volume===0||hidden||ctx.state!=='running')return;
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;
   gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(1,ctx.currentTime+.3);source.connect(gain);gain.connect(master);
   const voice={source,gain,track:wanted,buffer,started:ctx.currentTime,offset:offset%buffer.duration};current=voice;
   source.onended=()=>{source.disconnect();gain.disconnect();retiring.delete(voice);};source.start(0,voice.offset);report('playing');
  }catch{if(!disposed&&token===generation)report('error');}
 }
 function unlock(){
  if(disposed)return;
  unlocked=true;
  if(!enabled||volume===0||hidden||!track)return;
  try{
   if(!ctx){ctx=makeContext();master=ctx.createGain();master.gain.value=volume;master.connect(ctx.destination);}
   if(ctx.state==='running'){if(state!=='loading'&&state!=='playing')void start();}
   else void ctx.resume().then(()=>start()).catch(()=>report('waiting'));
  }catch{report('error');}
 }
 function setTrack(next){
  next=MUSIC_TRACKS[next]?next:null;if(next===track){if(!track)report('idle');return;}
  generation++;stop(true);track=next;offset=0;
  if(unlocked)unlock();void start();
 }
 function configure(prefs){
  const nextEnabled=prefs.musicEnabled,nextVolume=prefs.musicVolume/100;
  const changed=enabled!==nextEnabled||volume!==nextVolume;enabled=nextEnabled;volume=nextVolume;
  if(master){master.gain.cancelScheduledValues(ctx.currentTime);master.gain.setValueAtTime(volume,ctx.currentTime);}
  if(!changed)return;
  if(!enabled||volume===0){generation++;stop(false,true);for(const v of retiring){try{v.source.stop();}catch{}}report('off');}
  else if(!current&&state!=='loading'){if(unlocked)unlock();void start();}
 }
 function setHidden(value){
  hidden=value;generation++;
  if(hidden){stop(false,true);for(const v of retiring){try{v.source.stop();}catch{}}report('paused');if(ctx?.state==='running')void ctx.suspend().then(()=>{if(!hidden&&!disposed&&unlocked)unlock();}).catch(()=>{});}
  else if(unlocked)unlock();
 }
 function dispose(){disposed=true;generation++;stop();for(const v of retiring){try{v.source.stop();}catch{}}retiring.clear();cache.clear();if(ctx&&ctx.state!=='closed')void ctx.close().catch(()=>{});}
 return {setTrack,configure,unlock,setHidden,dispose,retry:()=>{generation++;stop();report('waiting');unlock();}};
}

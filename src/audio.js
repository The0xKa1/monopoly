// Original, locally synthesized chiptune effects. No downloads or audio assets.
export function soundNotes(type,detail={}){
 const note=(frequency,delay,duration,gain=.055,wave='triangle',end=frequency)=>({frequency,delay,duration,gain,wave,end});
 if(type==='dice')return [note(330+(detail.step%3)*85,0,.045,.035,'triangle',180)];
 if(type==='step')return [note(detail.step%2?190:155,0,.085,.09,'triangle',65),note(720,0,.022,.012,'square',280)];
 if(type==='arrive')return [note(523.25,0,.12,.035),note(783.99,.085,.18,.035)];
 if(type==='coin'){
  const frequencies=detail.from===0?[1318.51,1174.66,987.77,783.99]:detail.to===0?[783.99,987.77,1174.66,1567.98]:[987.77,1318.51,1174.66,1567.98];
  return frequencies.flatMap((f,i)=>[note(f,i*.11,.18,.05,'sine'),note(f*2,i*.11,.07,.012,'sine')]);
 }
 return [];
}

export function createGameAudio(){
 let context=null,master=null,enabled=false,disposed=false;
 const voices=new Set();
 function stop(){for(const o of voices){try{o.stop();}catch{}}voices.clear();}
 function enable(value){enabled=value;if(master)master.gain.setValueAtTime(value ? 0.7 : 0,context.currentTime);if(!value)stop();}
 // Called directly by an interaction, before animation timers run (mobile Safari).
 function unlock(){
  if(!enabled||disposed)return;
  try{
   if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;context=new Audio();master=context.createGain();master.gain.value=.7;master.connect(context.destination);}
   if(context.state==='suspended')context.resume().catch(()=>{});
  }catch{/* Sound is optional and must never interrupt a turn. */}
 }
 function play(type,detail={}){
  if(type==='cancel'){stop();return;}
  if(!enabled||disposed||document.hidden||context?.state!=='running')return;
  try{
   for(const n of soundNotes(type,detail)){
    const t=context.currentTime+n.delay,o=context.createOscillator(),g=context.createGain();
    o.type=n.wave;o.frequency.setValueAtTime(n.frequency,t);o.frequency.exponentialRampToValueAtTime(n.end,t+n.duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(n.gain,t+.003);g.gain.exponentialRampToValueAtTime(.0001,t+n.duration);
    o.connect(g);g.connect(master);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+n.duration+.01);
   }
  }catch{/* An unavailable output device should not affect game state. */}
 }
 function dispose(){disposed=true;stop();if(context&&context.state!=='closed')context.close().catch(()=>{});}
 return {enable,unlock,play,stop,dispose};
}

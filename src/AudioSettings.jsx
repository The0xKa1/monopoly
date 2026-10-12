import React,{createContext,useContext,useEffect,useRef,useState,useCallback} from 'react';
import {createPortal} from 'react-dom';
import {Volume2,X} from 'lucide-react';
import {createGameAudio} from './audio.js';
import {AUDIO_SETTINGS_KEY,MUSIC_TRACKS,readAudioSettings,normalizeAudio,createMusicPlayer} from './music.js';
import './audio-settings.css';
const AudioContext=createContext(null);
export const useGameSound=()=>useContext(AudioContext);
export function useMusicScene(track){const {setTrack}=useGameSound();useEffect(()=>{if(track!==undefined)setTrack(track);},[track,setTrack]);}
export function AudioSettingsButton(){const {openSettings}=useGameSound();return <button className="audio-settings-button" title="音频设置" aria-label="音频设置" onClick={openSettings}><Volume2 size={18}/><span>音频</span></button>;}
export function AudioProvider({children}){
 const [settings,setSettings]=useState(()=>{try{return readAudioSettings(localStorage);}catch{return readAudioSettings(null);}}),[track,setTrack]=useState(null),[status,setStatus]=useState('waiting'),[open,setOpen]=useState(false);
 const effects=useRef(null),music=useRef(null),dialog=useRef(null),latest=useRef(settings),selected=useRef(track);
 latest.current=settings;selected.current=track;
 useEffect(()=>{
  effects.current=createGameAudio();music.current=createMusicPlayer({onStatus:setStatus});
  effects.current.enable(latest.current.effectsEnabled);effects.current.setVolume(latest.current.effectsVolume/100);music.current.configure(latest.current);music.current.setTrack(selected.current);
  const unlock=()=>{effects.current?.unlock();music.current?.unlock();};
  const visibility=()=>{if(document.hidden)effects.current?.stop();music.current?.setHidden(document.hidden);};
  visibility();window.addEventListener('pointerdown',unlock,{capture:true});window.addEventListener('keydown',unlock,{capture:true});document.addEventListener('visibilitychange',visibility);
  return()=>{window.removeEventListener('pointerdown',unlock,{capture:true});window.removeEventListener('keydown',unlock,{capture:true});document.removeEventListener('visibilitychange',visibility);effects.current?.dispose();music.current?.dispose();effects.current=null;music.current=null;};
 },[]);
 useEffect(()=>{
  effects.current?.enable(settings.effectsEnabled);effects.current?.setVolume(settings.effectsVolume/100);music.current?.configure(settings);
  try{localStorage.setItem(AUDIO_SETTINGS_KEY,JSON.stringify(settings));localStorage.setItem('city-dice-sound',settings.effectsEnabled?'on':'off');}catch{}
 },[settings]);
 useEffect(()=>{music.current?.setTrack(track);},[track]);
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();},[open]);
 const playSound=useCallback((type,detail)=>effects.current?.play(type,detail),[]);
 const openSettings=useCallback(()=>setOpen(true),[]);
 function update(patch){setSettings(old=>normalizeAudio({...old,...patch}));}
 const labels={waiting:'点击页面后播放',loading:'加载中…',playing:'正在播放',paused:'后台暂停',off:'已静音',idle:'暂无背景音乐',error:'音乐加载失败'};
 return <AudioContext.Provider value={{playSound,setTrack,openSettings}}>{children}{open&&createPortal(<dialog ref={dialog} className="audio-settings-dialog" aria-labelledby="audio-settings-title" onClose={()=>setOpen(false)} onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}>
  <div className="audio-settings-heading"><h2 id="audio-settings-title">音频设置</h2><button aria-label="关闭音频设置" autoFocus onClick={()=>dialog.current.close()}><X size={20}/></button></div>
  <p className="audio-settings-note">设置自动保存，仅影响当前浏览器。</p>
  {[['effects','音效'],['music','背景音乐']].map(([key,title])=><section className="audio-settings-group" key={key}>
   <label className="audio-settings-toggle"><span>{title}</span><input type="checkbox" checked={settings[`${key}Enabled`]} onChange={e=>update({[`${key}Enabled`]:e.target.checked})}/><b>{settings[`${key}Enabled`]?'开启':'关闭'}</b></label>
   <label className="audio-settings-volume"><span>{title}音量</span><output>{settings[`${key}Volume`]}%</output><input aria-label={`${title}音量`} type="range" min="0" max="100" step="1" disabled={!settings[`${key}Enabled`]} value={settings[`${key}Volume`]} onChange={e=>update({[`${key}Volume`]:Number(e.target.value)})}/></label>
   {key==='effects'?<button className="audio-settings-preview" disabled={!settings.effectsEnabled||!settings.effectsVolume} onClick={()=>{effects.current?.unlock();effects.current?.play('arrive');}}>试听音效</button>:<><p className="audio-settings-track">{MUSIC_TRACKS[track]?.title||'无曲目'} · {labels[status]}</p>{status==='error'&&<button className="audio-settings-preview" onClick={()=>music.current?.retry()}>重试音乐</button>}</>}
  </section>)}
  <p className="audio-settings-note">音乐随界面与对局阶段切换；切到后台时暂停。</p>
 </dialog>,document.body)}</AudioContext.Provider>;
}

import React,{useState,useEffect} from 'react';
import {APPEARANCE_OPTIONS,normalizeAppearance,randomAppearance} from './appearance.js';
import {PixelPlayer} from './PixelPlayer.jsx';
const TABS={face:{name:'发型肤色',fields:[['skin','肤色'],['hair','发型'],['hairColor','发色']]},clothes:{name:'服装',fields:[['shirt','上衣'],['pants','裤装']]},extras:{name:'配饰',fields:[['hat','帽子'],['glasses','眼镜'],['accessory','随身配饰']]}};
export function AppearanceEditor({player,id,onSave,onCancel,creating=false}) {
 const [draft,setDraft]=useState(()=>normalizeAppearance(player.appearance,id)),[tab,setTab]=useState('face'),[walking,setWalking]=useState(false),[frame,setFrame]=useState(0),[name,setName]=useState(player.name),[error,setError]=useState('');
 useEffect(()=>{if(!walking)return;const timer=setInterval(()=>setFrame(f=>1-f),420);return()=>clearInterval(timer);},[walking]);
 return <div className="appearance-editor">
  <h2>{creating?'新增角色':'编辑外观'}</h2>
  {creating&&<div className="character-name"><label htmlFor="character-name">昵称</label><input id="character-name" value={name} onChange={e=>{setName(e.target.value);setError('');}} aria-invalid={!!error} aria-describedby="character-rule character-error"/><p id="character-rule">AI 控制 · 初始现金 ¥12,000 · 上限 20 个</p><span id="character-error" role="alert">{error}</span></div>}
  <div className="appearance-preview"><div className="appearance-stage"><PixelPlayer player={{...player,appearance:draft}} id={id} frame={walking?frame:null}/></div><div><b>{creating?name:player.name}</b><button type="button" aria-pressed={walking} onClick={()=>setWalking(!walking)}>动作预览</button><button type="button" onClick={()=>setDraft(randomAppearance())}>随机外观</button></div></div>
  <div className="appearance-tabs" role="group" aria-label="外观分类">{Object.entries(TABS).map(([key,t])=><button key={key} aria-pressed={tab===key} onClick={()=>setTab(key)}>{t.name}</button>)}</div>
  <div className="appearance-options">{TABS[tab].fields.map(([key,label])=><fieldset key={key}><legend>{label}</legend><div className={`appearance-choices ${APPEARANCE_OPTIONS[key][0][2]?'swatches':''}`}>{APPEARANCE_OPTIONS[key].map(([value,name,color])=><button key={value} aria-label={`${label}：${name}`} aria-pressed={draft[key]===value} onClick={()=>setDraft({...draft,[key]:value})}>{color&&<i style={{background:color}}/>}<span>{name}</span></button>)}</div></fieldset>)}</div>
  <div className="appearance-actions"><button className="text-button" onClick={onCancel}>取消</button><button className="primary" onClick={()=>{const message=onSave(draft,name);if(message)setError(message);}}>{creating?'添加角色':'保存外观'}</button></div>
 </div>;
}

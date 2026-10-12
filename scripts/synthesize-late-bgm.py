#!/usr/bin/env python3
"""Original restrained late-game chiptune. Python + NumPy, no external audio.
Run: python3 scripts/synthesize-late-bgm.py
"""
import json, math, shutil, subprocess, wave
from pathlib import Path
import numpy as np
SR,BPM=32000,120
BEAT=60/BPM
OUT=Path('artifacts/bgm-late-v2');OUT.mkdir(parents=True,exist_ok=True)
# D minor with suspended voicings and a quiet harmonic-minor dominant.
HARMONY=[(38,[53,57,62]),(38,[52,57,62]),(34,[53,58,62]),(36,[55,60,64]),
         (43,[53,58,62]),(34,[53,57,62]),(33,[52,57,61]),(33,[55,57,61])]
PHRASE=[
 [(0,69,.6),(1.5,65,.45),(2.5,64,.4),(3.5,62,.35)],
 [(.5,64,.5),(1.5,65,.6),(3,69,.5)],
 [(0,70,.8),(1.5,69,.45),(2.5,65,.8)],
 [(.5,67,.5),(1.5,64,.6),(3,60,.6)],
 [(0,65,.65),(1,67,.4),(2.5,70,.65)],
 [(.5,69,.65),(2,65,.45),(3,62,.6)],
 [(0,64,.6),(1.5,61,.45),(2.5,64,.5),(3.5,69,.3)],
 [(.5,67,.6),(2,64,.5),(3,61,.5)],
]


def tone(pitch,secs,voice):
 t=np.arange(max(80,round(secs*SR)))/SR;f=440*2**((pitch-69)/12);p=2*np.pi*f*t
 if voice=='pulse':
  y=sum(np.sin(np.pi*h*.25)*np.cos(h*p-np.pi*h*.25)/h*np.exp(-h*f/2100)*np.exp(-t*(4+h*.5)) for h in range(1,min(16,int(SR/2/f))))
 elif voice=='lead':
  y=(np.sin(p)+.24*np.sin(3*p)+.075*np.sin(5*p))*np.exp(-t*2)
 elif voice=='pad':
  y=(np.sin(p)+.10*np.sin(3*p))*np.exp(-t*.8)
 else:
  y=sum((-1)**((h-1)//2)*np.sin(h*p)/h**2 for h in (1,3,5,7))*np.exp(-t*5)
 y/=max(.01,np.max(abs(y)));y=np.round(y*95)/95
 attack=min(len(y)//4,round(SR*(.08 if voice=='pad' else .008)))
 release=min(len(y)//3,round(SR*.055))
 y[:attack]*=np.linspace(0,1,attack);y[-release:]*=np.linspace(1,0,release)
 return y


def drum(kind):
 t=np.arange(round(SR*.12))/SR
 if kind=='kick':
  f=45+45*np.exp(-t*55);y=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*32)
 else:y=(np.sin(2*np.pi*610*t)+.2*np.sin(2*np.pi*940*t))*np.exp(-t*85)
 y[:64]*=np.linspace(0,1,64);y[-128:]*=np.linspace(1,0,128)
 return y


mix=np.zeros((round(24*4*BEAT*SR),2))
def add(y,beat,gain,pan=0,echo=False):
 idx=(round(beat*BEAT*SR)+np.arange(len(y)))%len(mix)
 stereo=np.array([math.cos((pan+1)*np.pi/4),math.sin((pan+1)*np.pi/4)])
 np.add.at(mix,idx,y[:,None]*gain*stereo)
 if echo:np.add.at(mix,(idx+round(.14*SR))%len(mix),y[:,None]*gain*.09*stereo[::-1])


for bar in range(24):
 section,k=divmod(bar,8);start=bar*4;root,chord=HARMONY[k]
 # Three-three-two grouping supplies urgency without loud percussion.
 for beat in [0,1.5,3]:add(tone(root,.20,'bass'),start+beat,.16 if beat==0 else .11)
 for beat,pitch in [(0.5,chord[0]),(2,chord[1]),(3.5,chord[0]+12)]:
  if section==1 and beat==3.5:continue
  add(tone(pitch,.16,'pulse'),start+beat,.046 if section!=1 else .032,.28)
 for pitch in chord:add(tone(pitch,1.45,'pad'),start,.025,-.3,True)
 phrase=PHRASE[k]
 if section==1:phrase=[(beat,pitch-12,dur*1.25) for beat,pitch,dur in phrase[::2]]
 if section==2 and k in (2,4):phrase=phrase[:-1]+[(2.5,chord[2]+12,.8)]
 for beat,pitch,duration in phrase:add(tone(pitch,duration*BEAT,'lead'),start+beat,.112,-.08,True)
 for beat in ([0] if section==1 else [0,2.75]):add(drum('kick'),start+beat,.071)
 for beat in ([2] if section==1 else [1,3]):add(drum('rim'),start+beat,.023,.2)
 # The returning phrase adds a low answering note, not a cymbal or volume ramp.
 if section==2 and k%2==1:add(tone(chord[1],.18,'pulse'),start+2.25,.027,-.4)

mix-=mix.mean(axis=0)
mix*=min(.095/np.sqrt(np.mean(mix**2)),.71/np.max(abs(mix)))
assert np.isfinite(mix).all() and np.max(abs(mix))<1

def wav(path,data):
 with wave.open(str(path),'wb') as f:
  f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((data*32767).astype('<i2').tobytes())

wav(OUT/'last-lights-loop.wav',mix)
for stem,data in [('last-lights',mix.copy()),('last-lights-two-cycles',np.tile(mix,(2,1)))]:
 data[:320]*=np.linspace(0,1,320)[:,None];data[-25600:]*=np.linspace(1,0,25600)[:,None]
 wav(OUT/(stem+'.wav'),data)
 if shutil.which('afconvert'):subprocess.run(['afconvert','-f','m4af','-d','aac','-b','160000',str(OUT/(stem+'.wav')),str(OUT/(stem+'.m4a'))],check=True)
meta=dict(title='夜色将至',purpose='Late-game candidate',bpm=BPM,key='D minor',bars=24,seconds=len(mix)/SR,peak_dbfs=round(20*np.log10(np.max(abs(mix))),2),rms_dbfs=round(20*np.log10(np.sqrt(np.mean(mix**2))),2),loop_boundary_delta=float(np.max(abs(mix[0]-mix[-1]))),arrangement='8-bar pulse theme / 8-bar sparse low-register reply / 8-bar return; no high noise hats or loud snare',source='Original score and procedural synthesis; no third-party samples or melody quotation.')
(OUT/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
ext='m4a' if shutil.which('afconvert') else 'wav'
(OUT/'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>夜色将至 · 后期对局音乐</title><style>*{box-sizing:border-box}body{margin:0;padding:40px 20px;background:#e6e9e0;color:#354a43;font:15px/1.7 system-ui,sans-serif}main{max-width:740px;margin:auto}article{background:#f8faef;border:2px solid #91a491;box-shadow:4px 4px #c2cbbc;padding:26px;margin:24px 0}h1{font-size:28px}h2{font-size:18px}p{color:#627365}audio{width:100%;margin:12px 0}a{color:#496454}</style><main><h1>夜色将至</h1><p>后期对局候选 · 120 BPM · D 小调 · 原创 8-bit<br>低音脉冲、悬置和声与短句呼应；中段减少配器，无高频踩镲和强军鼓。尚未接入游戏。</p><article><h2>单轮试听 · 48 秒</h2><audio controls preload="metadata" src="last-lights.'''+ext+'''"></audio></article><article><h2>连续两轮 · 96 秒</h2><p>第 48 秒回到开头，可听循环衔接。</p><audio controls preload="metadata" src="last-lights-two-cycles.'''+ext+'''"></audio></article><p><a href="../bgm-playing-v2/index.html">对比已选定的常规对局音乐《街角慢跑》</a></p></main><script>document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>document.querySelectorAll('audio').forEach(b=>{if(a!==b)b.pause()})))</script></html>''')
print(json.dumps(meta,ensure_ascii=False,indent=2))

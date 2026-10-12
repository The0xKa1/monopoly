#!/usr/bin/env python3
"""Original, restrained 8-bit groove for long board-game sessions.
Python 3 + NumPy. No third-party samples, quoted melodies, or app changes.
Run: python3 scripts/synthesize-playing-bgm.py
"""
import json, math, shutil, subprocess, wave
from pathlib import Path
import numpy as np
SR, BPM = 32000, 112
BEAT=60/BPM
OUT=Path('artifacts/bgm-playing-v2');OUT.mkdir(parents=True,exist_ok=True)
RNG=np.random.default_rng(101204)
# Eb-major; warm sixth/ninth voicings, with a quieter relative-minor middle.
HARMONY=[
 (39,[55,58,63,65]),(46,[53,58,62,65]),(48,[55,58,60,63]),(44,[55,60,63,65]),
 (41,[53,56,60,63]),(43,[55,58,62,65]),(44,[55,60,63,65]),(46,[53,58,63,65]),
]
MIDDLE=[HARMONY[i] for i in [2,5,3,0,4,3,7,1]]
A=[
 [(0,67,.4),(.75,70,.35),(1.5,72,.4),(2.5,70,.35),(3,67,.7)],
 [(.5,65,.4),(1.5,62,.65),(2.5,65,.4),(3.5,70,.35)],
 [(0,67,.65),(1,63,.35),(1.75,67,.35),(2.5,70,.8)],
 [(.5,72,.45),(1.5,70,.45),(2.5,68,1)],
 [(0,65,.4),(.75,68,.35),(1.5,72,.65),(3,70,.5)],
 [(.5,67,.6),(1.5,65,.35),(2.25,62,.4),(3,67,.7)],
 [(0,68,.4),(1,67,.4),(1.75,65,.5),(2.75,63,.8)],
 [(.5,65,.4),(1.5,62,.5),(2.5,65,.45),(3.5,67,.3)],
]
B=[
 [(0,70,1.3),(2,67,.65)],[(.5,65,.8),(2,62,1.3)],
 [(0,63,.65),(1.5,68,1.2)],[(.5,67,1.4),(2.5,65,.6)],
 [(0,65,1.2),(2,68,.65)],[(.5,72,.9),(2,70,1.3)],
 [(0,68,.6),(1.5,65,.65),(3,63,.6)],[(.5,62,.65),(2,65,1)],
]


def tone(pitch,duration,voice):
    t=np.arange(max(64,round(duration*SR)))/SR
    f=440*2**((pitch-69)/12);phase=2*np.pi*f*t
    if voice=='lead':
        y=np.zeros(len(t))
        for h in range(1,min(14,int(SR/2/f))):
            y+=np.sin(np.pi*h*.375)*np.cos(h*phase-np.pi*h*.375)/h*np.exp(-h*f/2900)*np.exp(-t*(2.7+h*.8))
    elif voice=='bass':
        y=sum((-1)**((h-1)//2)*np.sin(h*phase)/h**2 for h in (1,3,5,7))*np.exp(-t*4.7)
    elif voice=='chord':
        y=(np.sin(phase)+.18*np.sin(3*phase)+.06*np.sin(5*phase))*np.exp(-t*7)
    elif voice=='soft':
        y=(np.sin(phase)+.2*np.sin(3*phase))*np.exp(-t*1.5)
    else:
        y=(np.sin(phase)+.13*np.sin(2*phase))*np.exp(-t*10)
    y/=max(.01,np.max(abs(y)))
    y=np.round(y*127)/127
    a=min(len(t)//4,round(SR*(.028 if voice=='soft' else .005)))
    r=min(len(t)//3,round(SR*.04))
    y[:a]*=np.linspace(0,1,a);y[-r:]*=np.linspace(1,0,r)
    return y


def drum(kind):
    t=np.arange(round(SR*(.14 if kind=='kick' else .07)))/SR
    if kind=='kick':
        f=49+70*np.exp(-t*50);y=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*29)
    elif kind=='rim':
        y=(np.sin(2*np.pi*720*t)+.3*np.sin(2*np.pi*1190*t))*np.exp(-t*83)
    else:
        n=np.repeat(RNG.uniform(-1,1,math.ceil(len(t)/4)),4)[:len(t)]
        y=(n-np.roll(n,2))*.25*np.exp(-t*65)
    y[:32]*=np.linspace(0,1,32);y[-80:]*=np.linspace(1,0,80)
    return y


mix=np.zeros((round(32*4*BEAT*SR),2))

def add(y,beat,gain,pan=0,echo=False):
    index=(round(beat*BEAT*SR)+np.arange(len(y)))%len(mix)
    stereo=np.array([math.cos((pan+1)*np.pi/4),math.sin((pan+1)*np.pi/4)])
    np.add.at(mix,index,y[:,None]*gain*stereo)
    if echo:np.add.at(mix,(index+round(.11*SR))%len(mix),y[:,None]*gain*.07*stereo[::-1])


for bar in range(32):
    section,k=divmod(bar,8);quiet=section==2;start=bar*4
    root,chord=(MIDDLE if quiet else HARMONY)[k]
    phrase=B[k] if quiet else A[k]
    if section==1 and k in (2,3,6):
        # Answer the motif with an altered ending instead of copying eight bars.
        phrase=phrase[:-1]+[(3, chord[2]+12 if k==3 else chord[1]+12,.65)]
    if section==3 and k==7:phrase=[(.5,65,.4),(1.5,62,.4),(2.5,65,.4)]
    for beat,pitch,length in phrase:
        add(tone(pitch,length*BEAT,'soft' if quiet else 'lead'),start+beat,.13 if quiet else .14,-.1,True)
    for beat,pitch,length,gain in [(0,root,.55,.16),(1.5,root+12,.25,.09),(2.5,root+7,.35,.11)]:
        if quiet and beat==1.5:continue
        add(tone(pitch,length*BEAT,'bass'),start+beat,gain)
    if not quiet and k%2==1:add(tone(root+12,.16,'bass'),start+3.75,.065)
    for beat in ([1,3] if quiet else [.75,2,3.25]):
        for j,pitch in enumerate(chord):
            add(tone(pitch,.40 if quiet else .23,'chord'),start+beat+j*.012,.021 if quiet else .028,.4,True)
    for beat in ([0] if quiet else [0,2]):add(drum('kick'),start+beat,.067 if quiet else .08)
    if not quiet:
        for beat in [1,3]:add(drum('rim'),start+beat,.035,.2)
    for beat in ([1.5,3.5] if quiet else [.5,1.5,2.5,3.5]):add(drum('hat'),start+beat,.023,-.4)
    if section in (1,3) and k in (1,5):
        for beat,pitch in [(2.75,chord[1]+12),(3.5,chord[0]+12)]:
            add(tone(pitch,.25,'bell'),start+beat,.028,.5)

mix-=mix.mean(axis=0)
mix*=min(.105/np.sqrt(np.mean(mix**2)),.79/np.max(abs(mix)))
assert np.isfinite(mix).all() and np.max(abs(mix))<1


def save(path,data):
    with wave.open(str(path),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
        f.writeframes((data*32767).astype('<i2').tobytes())


save(OUT/'city-stroll-loop.wav',mix)
preview=mix.copy();preview[:320]*=np.linspace(0,1,320)[:,None];preview[-round(.8*SR):]*=np.linspace(1,0,round(.8*SR))[:,None]
save(OUT/'city-stroll.wav',preview)
# Interior join is unmodified: useful for auditioning two actual consecutive cycles.
twice=np.tile(mix,(2,1));twice[:320]*=np.linspace(0,1,320)[:,None];twice[-round(.8*SR):]*=np.linspace(1,0,round(.8*SR))[:,None]
save(OUT/'city-stroll-two-cycles.wav',twice)
metadata=dict(title='街角慢跑',purpose='Regular gameplay candidate',bpm=BPM,meter='4/4',key='Eb major',bars=32,seconds=round(len(mix)/SR,3),arrangement='A / varied A / sparse B / returning A; eight bars each',peak_dbfs=round(20*np.log10(np.max(abs(mix))),2),rms_dbfs=round(20*np.log10(np.sqrt(np.mean(mix**2))),2),loop_boundary_delta=float(np.max(abs(mix[0]-mix[-1]))),source='Original composition; band-limited pulse, triangle bass, synthesized percussion. No third-party samples or melody quotation.')
(OUT/'manifest.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
ext='wav'
if shutil.which('afconvert'):
    for stem in ['city-stroll','city-stroll-two-cycles']:
        subprocess.run(['afconvert','-f','m4af','-d','aac','-b','160000',str(OUT/(stem+'.wav')),str(OUT/(stem+'.m4a'))],check=True)
    ext='m4a'
(OUT/'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>街角慢跑 · 常规对局音乐</title><style>*{box-sizing:border-box}body{margin:0;padding:40px 20px;background:#eeefdf;color:#354d3e;font:15px/1.7 system-ui,sans-serif}main{max-width:740px;margin:auto}article{background:#fffcf0;border:2px solid #9bad86;box-shadow:4px 4px #c9d1b8;padding:26px;margin:24px 0}h1{font-size:28px}h2{font-size:18px}p{color:#627253}audio{width:100%;margin:12px 0}a{color:#49683d}</style><main><h1>街角慢跑</h1><p>常规对局候选 · 112 BPM · 32 小节 · 原创 8-bit<br>短句主旋律、切分低音与轻鼓点，中间一段减少配器。尚未接入游戏。</p><article><h2>单轮试听 · 约69秒</h2><audio controls preload="metadata" src="city-stroll.'''+ext+'''"></audio></article><article><h2>连续两轮 · 约2分17秒</h2><p>约 1:09 处进入第二轮，可听衔接及重复感。</p><audio controls preload="metadata" src="city-stroll-two-cycles.'''+ext+'''"></audio></article><p>已选定：<a href="../bgm-folk-v2/index.html">大厅《田埂午后》</a> · <a href="../bgm-ready-v2/index.html">准备《窗边等你》</a></p></main><script>document.querySelectorAll('audio').forEach(a=>a.addEventListener('play',()=>document.querySelectorAll('audio').forEach(b=>{if(a!==b)b.pause()})))</script></html>''')
print(json.dumps(metadata,ensure_ascii=False,indent=2))

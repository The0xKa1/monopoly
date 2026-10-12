#!/usr/bin/env python3
"""Original 3/4 waiting-room chiptune. NumPy; no samples or quoted melodies.
Run: python3 scripts/synthesize-ready-bgm.py
Produces a scored preview and a separate 16-bar PCM loop master.
"""
import json, math, shutil, subprocess, wave
from pathlib import Path
import numpy as np
SR, BPM = 32000, 78
BEAT = 60/BPM
OUT = Path('artifacts/bgm-ready-v2')
OUT.mkdir(parents=True,exist_ok=True)
# Bb-major colour chords; pitches and rhythm intentionally differ from the lobby score.
CHORDS = [
 (46,[58,62,65,69]),(43,[58,62,67,69]),(39,[58,63,67,72]),(41,[57,60,65,70]),
 (36,[58,60,63,67]),(39,[58,63,65,67]),(38,[57,62,65,69]),(41,[57,60,65,67]),
 (43,[58,62,65,67]),(38,[57,62,65,69]),(39,[58,63,67,70]),(46,[58,62,65,69]),
 (36,[58,60,63,67]),(41,[57,60,65,70]),(39,[58,63,65,67]),(46,[58,62,65,70]),
]
# Offbeat entrances and long rests leave room for player conversation.
MELODY = [
 [(0,74,1.35),(1.5,72,.4),(2,70,.65)],
 [(.5,69,.65),(1.5,67,1.1)],
 [(0,70,.7),(1,75,1.3),(2.5,74,.35)],
 [(0,72,1.8)],
 [(.5,67,.6),(1.5,70,.5),(2,72,.6)],
 [(0,75,.8),(1,74,.6),(2,70,.7)],
 [(0,69,1.3),(1.5,65,.5),(2.5,67,.3)],
 [(0,69,1),(1.5,72,1)],
 [(.5,74,.6),(1.5,77,1.1)],
 [(0,76,.65),(1,74,.65),(2,69,.65)],
 [(0,75,1.3),(1.5,74,.45),(2,70,.65)],
 [(.5,72,.5),(1.5,74,1.15)],
 [(0,75,.7),(1,72,.7),(2,70,.7)],
 [(.5,69,.6),(1.5,72,.6),(2.5,70,.35)],
 [(0,67,.75),(1,70,1.2)],
 [(0,74,.7),(1,72,.5),(1.5,70,1.35)],
]


def note(pitch,secs,voice):
    t=np.arange(max(64,round(secs*SR)))/SR
    f=440*2**((pitch-69)/12);phase=2*np.pi*f*t
    if voice=='keys':
        # Two-operator chip FM: soft tine attack, clean decaying fundamental.
        y=np.sin(phase+1.35*np.exp(-t*9)*np.sin(2*phase))*np.exp(-t*2.4)
        y+=.12*np.sin(3*phase)*np.exp(-t*8)
    elif voice=='pad':
        y=(np.sin(phase)+.16*np.sin(3*phase)+.04*np.sin(5*phase))*np.exp(-t*1.2)
    elif voice=='bass':
        y=sum((-1)**((h-1)//2)*np.sin(h*phase)/h**2 for h in (1,3,5,7))*np.exp(-t*3)
    else:
        y=(np.sin(phase)+.2*np.sin(2*phase))*np.exp(-t*7)
    y/=max(.01,np.max(abs(y)))
    y=np.round(y*95)/95
    a=min(len(t)//4,round(SR*(.065 if voice=='pad' else .008)))
    r=min(len(t)//3,round(SR*.07))
    y[:a]*=np.linspace(0,1,a);y[-r:]*=np.linspace(1,0,r)
    return y


def tick():
    t=np.arange(round(.06*SR))/SR
    y=(np.sin(2*np.pi*530*t)+.3*np.sin(2*np.pi*910*t))*np.exp(-t*95)
    y[:64]*=np.linspace(0,1,64);y[-100:]*=np.linspace(1,0,100)
    return y


def render(preview):
    bars=20 if preview else 16
    buf=np.zeros((round((bars*3*BEAT+(1 if preview else 0))*SR),2))
    def add(y,beat,gain,pan=0,echo=False):
        offset=round(beat*BEAT*SR)
        stereo=np.array([math.cos((pan+1)*math.pi/4),math.sin((pan+1)*math.pi/4)])
        indices=(offset+np.arange(len(y)))%len(buf)
        if preview:
            valid=offset+np.arange(len(y))<len(buf);indices=indices[valid];y=y[valid]
        np.add.at(buf,indices,y[:,None]*gain*stereo)
        if echo:
            indices=(indices+round(.13*SR))%len(buf)
            np.add.at(buf,indices,y[:,None]*gain*.095*stereo[::-1])
    for bar in range(bars):
        k=bar-2 if preview else bar
        active=0<=k<16
        root,chord=CHORDS[k] if active else CHORDS[0 if bar!=1 else 2]
        start=bar*3;ending=preview and bar==bars-1
        add(note(root,.85,'bass'),start,.17)
        # Bass / soft chord / soft chord, a gentle waltz instead of a pop backbeat.
        for beat in ([0] if ending else [1,2]):
            for j,pitch in enumerate(chord):
                add(note(pitch,1.3 if ending else .57,'pad'),start+beat+j*.012,.032,-.33,True)
        if active:
            for beat,pitch,duration in MELODY[k]:
                add(note(pitch,duration*BEAT,'keys'),start+beat,.16,.12,True)
            if k%2==1:add(tick(),start+2,.016,.4)
            # A sparse high answer in the second phrase, not a constant arpeggio.
            if k in (3,7,11):
                add(note(chord[2]+12,.4,'bell'),start+2,.025,.5)
                add(note(chord[0]+12,.35,'bell'),start+2.5,.021,-.4)
        elif bar==1:
            add(note(65,.42,'keys'),start+2,.09,.12)
        elif bar==18:
            add(note(74,.8,'keys'),start,.13,.12)
            add(note(72,.45,'keys'),start+1.5,.1,.12)
        elif ending:add(note(70,1.6,'keys'),start,.15,.12,True)
    buf-=buf.mean(axis=0)
    buf*=min(.105/np.sqrt(np.mean(buf**2)),.79/np.max(abs(buf)))
    if preview:
        buf[:320]*=np.linspace(0,1,320)[:,None]
        buf[-SR:]*=np.linspace(1,0,SR)[:,None]
    assert np.isfinite(buf).all() and np.max(abs(buf))<1
    return buf


def save(path,data):
    with wave.open(str(path),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
        f.writeframes((data*32767).astype('<i2').tobytes())

preview,loop=render(True),render(False)
path=OUT/'waiting-window.wav'
save(path,preview);save(OUT/'waiting-window-loop.wav',loop)
meta=dict(title='窗边等你',purpose='Ready-room candidate; lobby selection is country-afternoon.',bpm=BPM,meter='3/4',key='Bb major',duration=round(len(preview)/SR,3),loop_duration=round(len(loop)/SR,3),peak_dbfs=round(20*np.log10(np.max(abs(preview))),2),rms_dbfs=round(20*np.log10(np.sqrt(np.mean(preview**2))),2),loop_boundary_delta=float(np.max(abs(loop[0]-loop[-1]))),source='Original score and procedural chip FM / triangle synthesis; no samples or quoted melodies.')
(OUT/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
ext='wav'
if shutil.which('afconvert'):
    subprocess.run(['afconvert','-f','m4af','-d','aac','-b','160000',str(path),str(path.with_suffix('.m4a'))],check=True);ext='m4a'
(OUT/'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>窗边等你 · 准备界面音乐</title><style>*{box-sizing:border-box}body{margin:0;padding:48px 20px;background:#e9edde;color:#3c533f;font:15px/1.8 system-ui,sans-serif}main{max-width:680px;margin:auto;padding:32px;background:#fffced;border:2px solid #82976d;box-shadow:6px 6px #c9cfb2}h1{font-size:28px;margin:8px 0}p{color:#657451}small{letter-spacing:2px}audio{width:100%;margin:22px 0}a{color:#49683d}</style><main><small>原创 8-BIT · 准备界面试听</small><h1>窗边等你</h1><p>78 BPM · 三拍子 · 芯片电钢琴与柔和低音<br>轻柔和弦、短句与留白。尚未接入游戏。</p><audio controls preload="metadata" src="waiting-window.'''+ext+'''"></audio><p><a href="../bgm-folk-v2/index.html">对比已选定的大厅音乐《田埂午后》</a></p></main></html>''')
print(json.dumps(meta,ensure_ascii=False,indent=2))

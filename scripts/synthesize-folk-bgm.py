#!/usr/bin/env python3
"""Original swung, folk-flavoured chiptune sketch; no samples or quoted melodies.
Requires NumPy. Run: python3 scripts/synthesize-folk-bgm.py
AAC preview is optional and uses macOS afconvert when available.
"""
import json
import math
import shutil
import subprocess
import wave
from pathlib import Path
import numpy as np

SR, BPM = 32000, 92
BEAT = 60 / BPM
OUT = Path('artifacts/bgm-folk-v2')
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(101203)
# Original F-major song: two-bar introduction, sixteen-bar theme, two-bar ending.
CHORDS = [
 (41,[57,60,65,67]), (40,[55,60,64,67]),
 (38,[57,60,62,65]), (34,[53,57,60,62]),
 (43,[55,58,62,65]), (45,[57,60,65,69]),
 (34,[53,57,60,65]), (36,[55,60,65,67]),
 (38,[57,60,65,69]), (45,[57,60,65,67]),
 (34,[53,57,60,62]), (41,[57,60,65,69]),
 (43,[55,58,62,65]), (36,[55,60,64,67]),
 (34,[53,57,60,65]), (41,[57,60,65,67]),
]
# (start beat, MIDI pitch, duration); syncopation and breath between phrases.
MELODY = [
 [(0.5,69,.5),(1,72,.75),(2,74,.5),(2.5,72,.5),(3,69,.7)],
 [(0,67,1.3),(1.5,65,.5),(2,64,.75),(3,67,.45)],
 [(0.5,65,.5),(1,69,1),(2.5,72,.5),(3,74,.7)],
 [(0,72,.65),(1,69,.7),(2,65,1.5)],
 [(0,67,.7),(1,70,.5),(1.5,69,.5),(2,67,.6),(3,65,.5)],
 [(0.5,69,.5),(1,72,1.3),(2.5,69,.5),(3,67,.7)],
 [(0,65,1),(1.5,62,.5),(2,65,.6),(3,69,.5)],
 [(0,67,1.5),(2,65,.5),(2.5,64,.5),(3.5,60,.35)],
 [(0,74,1),(1.5,77,.5),(2,76,.8),(3,74,.5)],
 [(0.5,72,.5),(1,69,.75),(2,67,.5),(3,69,.5),(3.5,72,.35)],
 [(0,74,.8),(1,72,.5),(1.5,69,.5),(2.5,65,1)],
 [(0,69,1.2),(1.5,72,.5),(2,77,1.5)],
 [(0.5,74,.5),(1,70,.8),(2,69,.5),(3,67,.7)],
 [(0,67,.6),(1,64,.5),(1.5,67,.5),(2,72,1.2)],
 [(0.5,69,.5),(1,65,.8),(2,62,.5),(2.5,65,.5),(3,67,.5)],
 [(0,69,.8),(1,67,.5),(1.5,65,2)],
]


def synth(note, duration, voice):
    t = np.arange(max(64, round(duration*SR))) / SR
    freq = 440 * 2**((note-69)/12)
    phase = 2*np.pi*freq*t
    y = np.zeros(len(t))
    if voice in ('pluck','chord'):
        # Narrow pulse-derived harmonics decay at different rates: a chip picking a string.
        decay = 2.7 if voice=='pluck' else 5.5
        for h in range(1, min(18, int(SR/2/freq))):
            amplitude = np.sin(h*np.pi*.28) / h**1.18
            y += amplitude*np.cos(h*phase-.4*h)*np.exp(-t*(decay+h*1.6))
    elif voice=='flute':
        phase += .014*np.sin(2*np.pi*4.8*t)*np.clip((t-.15)*3,0,1)
        y = (.78*np.sin(phase)+.16*np.sin(3*phase)+.06*np.sin(5*phase))*np.exp(-t*.6)
    elif voice=='bass':
        for h in (1,3,5,7):
            y += (-1)**((h-1)//2)*np.sin(h*phase)/h**2
        y *= np.exp(-t*5)
    elif voice=='bell':
        y = (np.sin(phase)+.22*np.sin(2*phase))*np.exp(-t*10)
    y /= max(np.max(np.abs(y)),.01)
    # Mild DAC staircase is deliberate; no full-mix bit crushing.
    y = np.round(y*63)/63
    attack = min(len(t)//4, round((.018 if voice=='flute' else .003)*SR))
    release = min(len(t)//3, round(.045*SR))
    y[:attack] *= np.linspace(0,1,attack)
    y[-release:] *= np.linspace(1,0,release)
    return y


def percussion(kind):
    t=np.arange(round(SR*(.09 if kind=='brush' else .13)))/SR
    if kind=='brush':
        n=np.repeat(RNG.uniform(-1,1,math.ceil(len(t)/4)),4)[:len(t)]
        y=(n-np.roll(n,2))*.25*np.exp(-t*45)
    elif kind=='wood':
        y=(np.sin(2*np.pi*820*t)+.4*np.sin(2*np.pi*1270*t))*np.exp(-t*70)
    else:
        f=48+35*np.exp(-t*50)
        y=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*32)
    y[:32]*=np.linspace(0,1,32)
    y[-80:]*=np.linspace(1,0,80)
    return y


def swing(beat):
    whole=math.floor(beat);part=beat-whole
    return whole+(part*1.24 if part<=.5 else .62+(part-.5)*.76)


mix=np.zeros((round((20*4*BEAT+1.3)*SR),2))
loopmix=np.zeros((round(16*4*BEAT*SR),2))

def place(sound, beat, gain, pan=0, echo=False):
    offset=round(swing(beat)*BEAT*SR)
    n=min(len(sound),len(mix)-offset)
    if n<=0:return
    stereo=np.array([math.cos((pan+1)*np.pi/4),math.sin((pan+1)*np.pi/4)])
    mix[offset:offset+n] += sound[:n,None]*gain*stereo
    if 8 <= beat < 72:
        indices=(round((swing(beat)-8)*BEAT*SR)+np.arange(len(sound)))%len(loopmix)
        np.add.at(loopmix,indices,sound[:,None]*gain*stereo)
        if echo:np.add.at(loopmix,(indices+round(.105*SR))%len(loopmix),sound[:,None]*gain*.08*stereo[::-1])
    if echo:
        # One quiet room reflection, not a constant rhythmic delay.
        offset+=round(.105*SR);n=min(len(sound),len(mix)-offset)
        if n>0:mix[offset:offset+n] += sound[:n,None]*gain*.08*stereo[::-1]


for bar in range(20):
    theme=bar-2
    root,chord=CHORDS[theme%16] if 0<=theme<16 else CHORDS[0 if bar in (0,18,19) else 6]
    start=bar*4
    last=bar==19
    place(synth(root,BEAT*.8,'bass'),start,.23)
    if not last:
        place(synth(root+7,BEAT*.5,'bass'),start+2,.16)
        if 0<=theme<16 and theme%4==3:place(synth(root+12,BEAT*.3,'bass'),start+3.5,.075)
    # Alternating two strings and loose upstrokes; not a continuous arpeggio bed.
    hits=[(0,[0,2],.062),(.5,[1],.06),(1.5,[0,1,2,3],.029),(2.5,[2],.053),(3,[1,2,3],.034)] if not last else [(0,[0,1,2,3],.075)]
    for beat,strings,gain in hits:
        for j,i in enumerate(strings):
            place(synth(chord[i],1.2 if last else .52,'chord'),start+beat+j*.022,gain,-.45,True)
    if 0<=theme<16:
        for beat,note,duration in MELODY[theme]:
            voice='flute' if theme>=8 else 'pluck'
            place(synth(note,duration*BEAT,voice),start+beat,.115 if voice=='flute' else .19,.18,True)
        # Light, earthy rhythm; no snare backbeat or straight eighth-note hi-hats.
        place(percussion('thump'),start,.07)
        place(percussion('wood'),start+2,.035)
        for beat in [.5,1.5,2.5,3.5]:place(percussion('brush'),start+beat,.042 if beat==2.5 else .028,.55)
        if theme in (3,7,11):
            for beat,note in [(3,84),(3.5,81)]:place(synth(note,.28,'bell'),start+beat,.025,-.1)
    elif bar==1:
        for beat,note in [(2,60),(2.5,65),(3,67)]:place(synth(note,.32,'pluck'),start+beat,.12,.18)
    elif bar==18:
        for beat,note in [(0,72),(1.5,69),(2.5,67)]:place(synth(note,.65,'pluck'),start+beat,.14,.18)
    elif last:
        place(synth(65,1.6,'pluck'),start,.18,.18,True)

mix-=mix.mean(axis=0)
# Match preview listening level while retaining transient headroom.
mix*=min(.11/np.sqrt(np.mean(mix**2)),.79/np.max(abs(mix)))
mix[:320]*=np.linspace(0,1,320)[:,None]
mix[-SR:]*=np.linspace(1,0,SR)[:,None]
assert np.isfinite(mix).all() and np.max(abs(mix))<1
path=OUT/'country-afternoon.wav'
with wave.open(str(path),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
    f.writeframes((mix*32767).astype('<i2').tobytes())
loopmix-=loopmix.mean(axis=0)
loopmix*=min(.11/np.sqrt(np.mean(loopmix**2)),.79/np.max(abs(loopmix)))
with wave.open(str(OUT/'country-afternoon-loop.wav'),'wb') as f:
    f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
    f.writeframes((loopmix*32767).astype('<i2').tobytes())
meta=dict(title='田埂午后',bpm=BPM,key='F major',swing_ratio='62:38',duration=round(len(mix)/SR,3),peak_dbfs=round(20*np.log10(np.max(abs(mix))),2),rms_dbfs=round(20*np.log10(np.sqrt(np.mean(mix**2))),2),source='Original composition and procedural synthesis; no third-party samples or melody quotation.',arrangement='2-bar intro, 8-bar plucked theme, 8-bar flute answer, 2-bar outro; preview has an ending, not a loop master.')
(OUT/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
ext='wav'
if shutil.which('afconvert'):
    subprocess.run(['afconvert','-f','m4af','-d','aac','-b','160000',str(path),str(path.with_suffix('.m4a'))],check=True)
    ext='m4a'
(OUT/'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>田埂午后 · 8-bit 试听</title><style>*{box-sizing:border-box}body{margin:0;padding:48px 20px;background:#efeedc;color:#3c533f;font:15px/1.8 system-ui,sans-serif}main{max-width:680px;margin:auto;padding:32px;background:#fffced;border:2px solid #82976d;box-shadow:6px 6px #c9cfb2}h1{font-size:28px;margin:8px 0}p{color:#657451}small{letter-spacing:2px}audio{width:100%;margin:22px 0}a{color:#49683d}</style><main><small>原创 8-BIT · 第二版</small><h1>田埂午后</h1><p>92 BPM · 摇摆节奏 · 拨弦与芯片笛音<br>前半段拨弦主题，后半段笛音回应。试听版，尚未接入游戏。</p><audio controls preload="metadata" src="country-afternoon.'''+ext+'''"></audio><p><a href="../bgm-v1/index.html">对比第一版五段试听</a></p></main></html>''')
print(json.dumps(meta,ensure_ascii=False,indent=2))

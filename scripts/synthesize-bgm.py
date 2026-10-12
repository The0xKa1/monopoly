#!/usr/bin/env python3
"""Original chiptune BGM sketches. Python 3 + NumPy; no samples or external melodies.
Run: python3 scripts/synthesize-bgm.py [output-dir]
Writes stereo PCM previews, seamless loop masters, a sampler, and measurements.
"""
import json
import math
import sys
import wave
from pathlib import Path
import numpy as np

SR = 32000
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else 'artifacts/bgm-v1')
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(20261012)


def tone(note, seconds, kind='pulse', duty=.5):
    n = max(1, round(seconds * SR))
    t = np.arange(n) / SR
    f = 440 * 2 ** ((note - 69) / 12)
    # Band-limited oscillators retain chip character without aliased upper partials.
    phase = 2 * np.pi * f * t + .008 * np.sin(2 * np.pi * 5 * t) * np.minimum(t / .12, 1)
    y = np.zeros(n)
    if kind == 'triangle':
        for h in range(1, min(31, int(SR / 2 / f)), 2):
            y += (-1) ** ((h - 1) // 2) * np.sin(h * phase) / h ** 2
    else:
        for h in range(1, min(22, int(SR / 2 / f))):
            y += np.sin(np.pi * h * duty) / h * np.cos(h * phase - np.pi * h * duty) * np.exp(-h * f / 6500)
    y /= max(.01, np.max(np.abs(y)))
    a, r = min(n//3, int(.005*SR)), min(n//3, int(.035*SR))
    env = .68 + .32 * np.exp(-t / .08)
    env[:a] *= np.linspace(0, 1, a)
    env[-r:] *= np.linspace(1, 0, r)
    return y * env


def drum(kind):
    duration = {'kick': .16, 'snare': .13, 'hat': .043}[kind]
    t = np.arange(round(duration * SR)) / SR
    if kind == 'kick':
        freq = 46 + 112 * np.exp(-t * 43)
        y = np.sin(2*np.pi*np.cumsum(freq)/SR)*np.exp(-t*25)
        y += .12*RNG.uniform(-1,1,len(t))*np.exp(-t*150)
    else:
        # Sample-and-hold noise approximates the coarse noise channel of a console.
        hold = 3 if kind == 'snare' else 2
        noise = np.repeat(RNG.choice([-1.,1.], math.ceil(len(t)/hold)),hold)[:len(t)]
        if kind == 'snare':
            y = (.65*noise + .35*np.sin(2*np.pi*165*t))*np.exp(-t*32)
        else:
            y = (noise - np.roll(noise,1))*.35*np.exp(-t*95)
    y[:32] *= np.linspace(0,1,32)
    y[-64:] *= np.linspace(1,0,64)
    return y


def add(buf, sound, beat, spb, amp, pan=0):
    idx = round(beat * spb * SR)
    # Wrap releases at the loop boundary instead of cutting them off.
    indices = (idx + np.arange(len(sound))) % len(buf)
    gain = np.array([math.cos((pan+1)*math.pi/4),math.sin((pan+1)*math.pi/4)])
    np.add.at(buf, indices, sound[:,None]*amp*gain)

# Each melody bar totals four beats; None is an intentional rest.
LOBBY = [
 [(76,.5),(79,.5),(81,1),(79,.5),(76,.5),(74,.5),(72,.5)],
 [(74,.5),(76,.5),(79,1.5),(76,.5),(74,1)],
 [(72,.5),(76,.5),(77,1),(76,.5),(72,.5),(69,1)],
 [(71,.5),(74,.5),(76,1),(74,1),(None,.5),(79,.5)],
 [(76,.5),(79,.5),(84,1),(83,.5),(81,.5),(79,1)],
 [(81,.75),(79,.25),(76,1),(74,.5),(76,.5),(79,1)],
 [(77,.5),(76,.5),(74,1),(72,.5),(74,.5),(76,.5),(72,.5)],
 [(74,1),(71,1),(72,1.5),(None,.5)],
]
ROOM = [
 [(72,1),(76,.5),(79,.5),(76,1),(None,1)],
 [(71,1.5),(74,.5),(76,1),(None,1)],
 [(69,1),(72,1),(76,1.5),(None,.5)],
 [(67,1.5),(71,.5),(74,1),(None,1)],
 [(72,.5),(76,.5),(79,1.5),(81,.5),(79,1)],
 [(76,1),(74,1),(71,1),(None,1)],
 [(69,.5),(72,.5),(76,1),(74,1),(72,1)],
 [(71,1),(74,1),(72,1.5),(None,.5)],
]
GAME = [
 [(79,.75),(76,.25),(74,.5),(72,.5),(76,.75),(79,.25),(81,1)],
 [(79,.5),(76,.5),(74,1),(71,.5),(74,.5),(79,.5),(None,.5)],
 [(76,.75),(72,.25),(69,.5),(72,.5),(76,1),(79,.5),(76,.5)],
 [(77,.5),(76,.5),(74,.75),(72,.25),(74,1),(None,1)],
 [(81,.5),(79,.5),(76,.75),(79,.25),(84,1),(81,1)],
 [(83,.5),(81,.5),(79,1),(74,.5),(76,.5),(79,1)],
 [(81,.75),(79,.25),(77,.5),(76,.5),(74,1),(77,.5),(76,.5)],
 [(74,.5),(71,.5),(67,.5),(71,.5),(72,1.5),(None,.5)],
]
LATE = [
 [(76,.5),(76,.25),(None,.25),(79,.5),(76,.5),(83,.75),(81,.25),(79,.5),(76,.5)],
 [(74,.5),(77,.5),(81,.75),(79,.25),(77,.5),(74,.5),(72,1)],
 [(72,.5),(76,.5),(79,.5),(83,.5),(84,1),(83,.5),(79,.5)],
 [(80,.5),(76,.5),(71,.5),(74,.5),(76,1),(None,.5),(80,.5)],
 [(81,.75),(83,.25),(84,.5),(83,.5),(81,.5),(79,.5),(76,1)],
 [(77,.5),(81,.5),(84,1),(83,.5),(81,.5),(77,1)],
 [(79,.5),(76,.5),(74,.5),(72,.5),(71,.5),(74,.5),(77,.5),(74,.5)],
 [(80,.5),(83,.5),(88,.75),(83,.25),(80,.5),(76,.5),(None,1)],
]
RESULT = [
 [(72,.5),(76,.5),(79,.5),(84,1.5),(79,.5),(76,.5)],
 [(81,1),(79,.5),(76,.5),(74,1),(None,1)],
 [(77,.5),(81,.5),(84,1),(83,.5),(81,.5),(79,1)],
 [(79,.5),(76,.5),(74,1),(71,1),(None,1)],
 [(76,.5),(79,.5),(84,1.5),(83,.5),(81,1)],
 [(79,1),(76,1),(77,.5),(76,.5),(74,1)],
 [(72,.5),(76,.5),(79,.5),(84,.5),(83,.5),(79,.5),(74,1)],
 [(76,1),(74,.5),(71,.5),(72,2)],
]
TRACKS = [
 dict(id='01-lobby',title='大厅 · 像素小城',bpm=108,melody=LOBBY,roots=[48,55,53,55,48,45,53,55],chords=['maj','maj','maj','maj','maj','min','maj','maj'],reps=2,mode='bright'),
 dict(id='02-ready',title='准备房间 · 等你加入',bpm=88,melody=ROOM,roots=[48,47,45,43,48,47,53,55],chords=['maj','min','min','maj','maj','min','maj','maj'],reps=1,mode='soft'),
 dict(id='03-playing',title='常规对局 · 城市漫步',bpm=116,melody=GAME,roots=[48,55,45,53,48,55,53,55],chords=['maj','maj','min','maj','maj','maj','maj','maj'],reps=2,mode='groove'),
 dict(id='04-late-game',title='后期对局 · 最后几轮',bpm=140,melody=LATE,roots=[45,50,48,52,45,53,55,52],chords=['min','min','maj','maj','min','maj','maj','maj'],reps=2,mode='tense'),
 dict(id='05-results',title='结算 · 满载而归',bpm=104,melody=RESULT,roots=[48,45,53,55,48,53,55,48],chords=['maj','min','maj','maj','maj','maj','maj','maj'],reps=1,mode='finish'),
]


def render(spec):
    spb = 60/spec['bpm']
    bars = 8*spec['reps']
    buf = np.zeros((round(bars*4*spb*SR),2),dtype=np.float64)
    mode = spec['mode']
    soft, tense = mode=='soft', mode=='tense'
    for bar in range(bars):
        k=bar%8; root=spec['roots'][k]; minor=spec['chords'][k]=='min'
        chord=[root+12,root+15 if minor else root+16,root+19,root+24]
        pos=bar*4
        melody=spec['melody'][k]
        assert abs(sum(d for _,d in melody)-4)<1e-8
        for note,duration in melody:
            if note is not None:
                # Answer the first phrase in a softer register in the second pass.
                pitch=note-(12 if bar>=8 and k<4 else 0)
                lead=tone(pitch,duration*spb*.86,'triangle' if soft else 'pulse',.25 if tense else .5)
                add(buf,lead,pos,spb,.17 if soft else .135,-.12)
                add(buf,lead,pos+.75,spb,.024,.45)
                if mode=='finish' and bar in (0,4,7):
                    add(buf,tone(pitch-12,duration*spb*.8,'triangle'),pos,spb,.05,.12)
            pos+=duration
        bass_beats=[0,2] if soft else [0,1.5,2,3.5]
        for i,b in enumerate(bass_beats):
            note=root+(7 if i%2 else 0)
            if tense and i==3:note=root+12
            add(buf,tone(note,spb*(1.35 if soft else .38),'triangle'),bar*4+b,spb,.16)
        # Quiet broken-chord backing, with gaps for the lead and game sound effects.
        arp_pattern=[0,2,1,2,3,2,1,2]
        for step,c in enumerate(arp_pattern):
            if soft and step%2:continue
            note=chord[c]+(12 if tense else 0)
            add(buf,tone(note,spb*.20,'pulse',.25),bar*4+step*.5,spb,.026 if soft else .033,.55 if step%2 else -.55)
        for b in ([0] if soft else [0,2]):add(buf,drum('kick'),bar*4+b,spb,.14 if tense else .105)
        if not soft:
            for b in [1,3]:add(buf,drum('snare'),bar*4+b,spb,.058 if tense else .043,.12)
        for step in range(8):
            if soft and step not in [2,6]:continue
            add(buf,drum('hat'),bar*4+step*.5,spb,.021 if step%2 else .014,-.30)
        if k==7 and not soft:
            for b in [3.25,3.5,3.75]:add(buf,drum('snare'),bar*4+b,spb,.025,.20)
    buf-=buf.mean(axis=0)
    # Consistent RMS, safe headroom, no clipped samples.
    rms=np.sqrt(np.mean(buf**2)); peak=np.max(np.abs(buf))
    buf*=min(.12/rms,.79/peak)
    return buf


def wav(path,data):
    with wave.open(str(path),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR)
        f.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())

manifest=[];sampler=[]
for spec in TRACKS:
    loop=render(spec);preview=loop.copy()
    preview[:int(.04*SR)]*=np.linspace(0,1,int(.04*SR))[:,None]
    preview[-int(.85*SR):]*=np.linspace(1,0,int(.85*SR))[:,None]
    wav(OUT/(spec['id']+'-loop.wav'),loop)
    wav(OUT/(spec['id']+'.wav'),preview)
    excerpt=loop[:min(len(loop),int(15*SR))].copy()
    excerpt[:int(.06*SR)]*=np.linspace(0,1,int(.06*SR))[:,None]
    excerpt[-int(.6*SR):]*=np.linspace(1,0,int(.6*SR))[:,None]
    sampler.extend([excerpt,np.zeros((int(.6*SR),2))])
    manifest.append(dict(id=spec['id'],title=spec['title'],bpm=spec['bpm'],duration=round(len(loop)/SR,3),peak_dbfs=round(20*np.log10(np.max(np.abs(loop))),2),rms_dbfs=round(20*np.log10(np.sqrt(np.mean(loop**2))),2),loop_boundary_delta=float(np.max(abs(loop[0]-loop[-1])))))
wav(OUT/'00-all-previews.wav',np.concatenate(sampler))
(OUT/'manifest.json').write_text(json.dumps(dict(sample_rate=SR,channels=2,source='Original score and procedural synthesis; no third-party audio samples. Project-owned preview assets, not yet integrated or published.',tracks=manifest),ensure_ascii=False,indent=2)+'\n')
print(json.dumps(manifest,ensure_ascii=False,indent=2))

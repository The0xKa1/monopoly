#!/usr/bin/env python3
"""Rebuild approved music and copy exact PCM loops to public assets (Python + NumPy)."""
import hashlib, json, shutil, subprocess, sys, wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
TRACKS=[('lobby','folk','bgm-folk-v2/country-afternoon-loop.wav'),('ready','ready','bgm-ready-v2/waiting-window-loop.wav'),('playing','playing','bgm-playing-v2/city-stroll-loop.wav'),('late','late','bgm-late-v2/last-lights-loop.wav')]
output=ROOT/'public/assets/music';output.mkdir(parents=True,exist_ok=True)
manifest=[]
for name,script,source in TRACKS:
 subprocess.run([sys.executable,str(ROOT/f'scripts/synthesize-{script}-bgm.py')],cwd=ROOT,check=True,stdout=subprocess.DEVNULL)
 dest=output/(name+'.wav');shutil.copyfile(ROOT/'artifacts'/source,dest)
 with wave.open(str(dest)) as f:
  assert (f.getnchannels(),f.getsampwidth(),f.getframerate())==(2,2,32000)
  seconds=f.getnframes()/f.getframerate()
 manifest.append(dict(file=dest.name,seconds=seconds,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
(output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared four approved PCM loops and SHA-256 manifest.')

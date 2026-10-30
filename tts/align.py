"""Word timestamps for a clip, as JSON [{"w", "s", "e"}], using Vosk offline speech recognition.

    python align.py clip.mp3 model_dir

Used by tts/gen.mjs to put each block's start just before its first words. Optional: without Vosk the
generator falls back to snapping block starts to pauses.
"""
import json
import subprocess
import sys

from vosk import KaldiRecognizer, Model, SetLogLevel

SetLogLevel(-1)
rec = KaldiRecognizer(Model(sys.argv[2]), 16000)
rec.SetWords(True)
pcm = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', sys.argv[1], '-ac', '1', '-ar', '16000', '-f', 's16le', '-'],
                     capture_output=True, check=True).stdout
words = []
for i in range(0, len(pcm), 8000):
    if rec.AcceptWaveform(pcm[i:i + 8000]):
        words += json.loads(rec.Result()).get('result', [])
words += json.loads(rec.FinalResult()).get('result', [])
print(json.dumps([{'w': w['word'], 's': round(w['start'], 2), 'e': round(w['end'], 2)} for w in words]))

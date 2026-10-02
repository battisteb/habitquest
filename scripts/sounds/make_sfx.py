"""Synthesizes HabitQuest's own 8-bit sound effects (no third-party audio).

    python scripts/sounds/make_sfx.py [name…]   # needs ffmpeg on the PATH (or FFMPEG=...)

Writes assets/sounds/<name>.m4a (AAC, mono, 44.1 kHz), like the other sounds of
the app (src/lib/audio/sound-registry.ts). Each sound is a list of notes:
(start s, duration s, frequency Hz, wave, volume).
"""
import math
import os
import struct
import subprocess
import tempfile
import wave

RATE = 44100
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'sounds')
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')

# Note frequencies.
C5, D5, E5, G5, A5, B5 = 523.25, 587.33, 659.25, 783.99, 880.0, 987.77
C6, E6, G6, C7 = 1046.5, 1318.5, 1568.0, 2093.0
E7, G7, C8 = 2637.0, 3136.0, 4186.0


def tone(t, f, wave_kind):
    phase = (t * f) % 1.0
    if wave_kind == 'square':
        return 1.0 if phase < 0.5 else -1.0
    if wave_kind == 'pulse':  # 25% duty: thinner, typical 8-bit lead
        return 1.0 if phase < 0.25 else -1.0
    if wave_kind == 'triangle':
        return 4 * abs(phase - 0.5) - 1
    return math.sin(2 * math.pi * f * t)


def render(notes, length, vibrato=None):
    out = [0.0] * int(length * RATE)
    for start, dur, f, kind, vol in notes:
        n0, n = int(start * RATE), int(dur * RATE)
        for i in range(n):
            if n0 + i >= len(out):
                break
            t = i / RATE
            freq = f * (1 + 0.012 * math.sin(2 * math.pi * 6 * t)) if vibrato and dur >= vibrato else f
            # Short attack, exponential release: no clicks.
            env = min(1.0, t / 0.004) * math.exp(-3.2 * t / dur)
            out[n0 + i] += vol * env * tone(t, freq, kind)
    peak = max(1e-9, max(abs(x) for x in out))
    return [x / peak * 0.85 for x in out]


SOUNDS = {
    # One daily mission done: a bright two-note chime.
    'mission-done': (render([(0, 0.11, G5, 'pulse', 0.6), (0.09, 0.22, C6, 'pulse', 0.6),
                             (0.09, 0.22, C7, 'sine', 0.15)], 0.36)),
    # All three missions done: a rising run that lands on a bright chord.
    'missions-all': (render([(0.00, 0.08, C5, 'square', 0.5), (0.07, 0.08, E5, 'square', 0.5),
                             (0.14, 0.08, G5, 'square', 0.5), (0.21, 0.08, C6, 'square', 0.5),
                             (0.28, 0.45, E6, 'pulse', 0.45), (0.28, 0.45, C6, 'triangle', 0.5),
                             (0.28, 0.45, G6, 'sine', 0.15)], 0.8)),
    # Claiming a reward: a short cascade of coins.
    'reward-coins': (render([(0.00, 0.07, B5, 'square', 0.5), (0.05, 0.16, E6, 'square', 0.5),
                             (0.12, 0.07, B5, 'square', 0.4), (0.17, 0.16, E6, 'square', 0.4),
                             (0.24, 0.07, B5, 'square', 0.35), (0.29, 0.22, E6, 'square', 0.35)], 0.55)),
    # Level up: a short "ta-da" landing on a held high C, with a sparkle
    # (Battiste kept only this part: a win ends high).
    'level-up': (render([(0.00, 0.09, G6, 'pulse', 0.55),
                         (0.12, 0.75, C7, 'pulse', 0.6), (0.12, 0.75, G6, 'triangle', 0.35),
                         (0.12, 0.75, E6, 'triangle', 0.3), (0.22, 0.06, E7, 'sine', 0.12),
                         (0.30, 0.06, G7, 'sine', 0.12), (0.38, 0.10, C8, 'sine', 0.12)], 0.95,
                        vibrato=0.5)),
}


def write_m4a(name, samples):
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, f'{name}.wav')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(RATE)
            w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s)) * 32767)) for s in samples))
        out = os.path.join(ROOT, f'{name}.m4a')
        subprocess.run([FFMPEG, '-v', 'error', '-y', '-i', wav, '-af', 'lowpass=f=6000',
                        '-c:a', 'aac', '-b:a', '96k', out], check=True)
        print('wrote', os.path.relpath(out))


if __name__ == '__main__':
    import sys
    names = sys.argv[1:] or list(SOUNDS)  # e.g. make_sfx.py level-up
    for name in names:
        write_m4a(name, SOUNDS[name])

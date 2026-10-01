"""
Original 8-bit music and sound effects for HabitQuest marketing videos.

Everything is synthesized here (pulse and triangle waves, noise drums), so the
audio is ours: no licence, no "generic stock music" feel.

    python marketing/audio/chiptune.py previews   -> marketing/audio/out/preview-*.wav
    python marketing/audio/chiptune.py theme NAME  -> marketing/audio/out/theme-NAME.wav (full length)

The previews are ~20 s of each theme plus the level-up candidates, to choose from.
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
OUT = Path(__file__).parent / 'out'
NOTES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6,
         'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}


def freq(note):
    """'A4' -> 440 Hz; None or '-' is a rest."""
    if note in (None, '-'):
        return 0.0
    name, octave = note[:-1], int(note[-1])
    midi = 12 * (octave + 1) + NOTES[name]
    return 440.0 * 2 ** ((midi - 69) / 12)


# ---------------------------------------------------------------- oscillators

def pulse(f, n, duty=0.25, vib=0.0):
    t = np.arange(n) / SR
    if vib:
        f = f * (1 + vib * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 4, 0, 1))
        phase = np.cumsum(f / SR)
    else:
        phase = f * t
    return np.where((phase % 1) < duty, 1.0, -1.0)


def triangle(f, n):
    t = np.arange(n) / SR
    return 2 * np.abs(2 * ((f * t) % 1) - 1) - 1


def envelope(n, a=0.005, d=0.08, s=0.6, r=0.04):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    env = np.full(n, s)
    env[:a_n] = np.linspace(0, 1, a_n) if a_n else env[:a_n]
    end_d = min(n, a_n + d_n)
    env[a_n:end_d] = np.linspace(1, s, end_d - a_n)
    if r_n and n > r_n:
        env[-r_n:] *= np.linspace(1, 0, r_n)
    return env


def noise(n, seed):
    return np.random.default_rng(seed).uniform(-1, 1, n)


# ---------------------------------------------------------------- instruments

def voice(track, notes, bpm, wave_fn, gain, start_beat=0.0, **env):
    """notes: list of (note, beats). Writes into track (float array)."""
    beat = 60 / bpm
    pos = start_beat
    for note, beats in notes:
        f = freq(note)
        n = int(beats * beat * SR)
        i = int(pos * beat * SR)
        if f and i < len(track):
            seg = wave_fn(f, n) * envelope(n, **env) * gain
            track[i:i + n] += seg[: max(0, len(track) - i)]
        pos += beats
    return pos


def drums(track, pattern, bpm, bars, gain=0.5, steps=16, swing=0.0, start_bar=0):
    """pattern: dict of 'k'/'s'/'h' -> string of x/. over `steps` per bar."""
    step = 60 / bpm * 4 / steps
    for bar in range(bars):
        for k, row in pattern.items():
            for j, c in enumerate(row):
                if c != 'x':
                    continue
                t = (start_bar + bar) * steps * step + j * step + (swing * step if j % 2 else 0)
                i = int(t * SR)
                if k == 'k':  # kick: falling sine
                    n = int(0.12 * SR)
                    tt = np.arange(n) / SR
                    seg = np.sin(2 * np.pi * (150 * np.exp(-tt * 30) + 45) * tt) * np.exp(-tt * 18) * 1.1
                elif k == 's':  # snare: noise burst
                    n = int(0.11 * SR)
                    seg = noise(n, i) * np.exp(-np.arange(n) / SR * 28) * 0.55
                else:  # hat
                    n = int(0.03 * SR)
                    seg = noise(n, i) * np.exp(-np.arange(n) / SR * 120) * 0.25
                track[i:i + n] += (seg * gain)[: max(0, len(track) - i)]


def echo(x, delay=0.25, fb=0.3, mix=0.25):
    d = int(delay * SR)
    y = x.copy()
    for k in range(1, 4):
        y[d * k:] += x[: len(x) - d * k] * (fb ** k) * mix / fb
    return y


def master(left, right, fade_in=0.05, fade_out=1.0):
    st = np.stack([left, right], axis=1)
    st = np.tanh(st * 1.1)  # soft clip, warmer than hard clipping
    st /= max(1e-9, np.max(np.abs(st))) / 0.89
    fi, fo = int(fade_in * SR), int(fade_out * SR)
    st[:fi] *= np.linspace(0, 1, fi)[:, None]
    if fo:
        st[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return st


def save(name, st):
    OUT.mkdir(parents=True, exist_ok=True)
    data = (st * 32767).astype(np.int16)
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(f'{name}.wav  {len(st) / SR:.1f} s')


# ---------------------------------------------------------------- music helpers

def arp(chord, octave, beats_per_note, total_beats):
    """Broken-chord pattern from root names, e.g. ['A','C','E']."""
    seq, b = [], 0.0
    i = 0
    while b < total_beats - 1e-9:
        seq.append((f'{chord[i % len(chord)]}{octave}', beats_per_note))
        b += beats_per_note
        i += 1
    return seq


def bass_line(roots, octave, pattern_beats):
    """One root per bar, played as the rhythm in pattern_beats (sums to 4)."""
    seq = []
    for r in roots:
        for d in pattern_beats:
            seq.append((f'{r}{octave}', d))
    return seq


# ---------------------------------------------------------------- themes

def theme_quest(bars_repeat=1):
    """Upbeat adventure, 140 BPM, C major: the hero sets out."""
    bpm = 140
    prog = ['C', 'G', 'A', 'F']  # I V vi IV
    chords = {'C': ['C', 'E', 'G'], 'G': ['G', 'B', 'D'], 'A': ['A', 'C', 'E'], 'F': ['F', 'A', 'C']}
    hook = [('E5', .5), ('G5', .5), ('C6', 1), ('B5', .5), ('G5', .5), ('A5', 1),
            ('A5', .5), ('G5', .5), ('E5', 1), ('D5', .5), ('E5', .5), ('G5', 1),
            ('A5', .5), ('C6', .5), ('E6', 1), ('D6', .5), ('C6', .5), ('B5', 1),
            ('A5', .75), ('G5', .25), ('A5', .5), ('C6', .5), ('D6', 2)]
    answer = [('C6', .5), ('B5', .5), ('G5', 1), ('E5', .5), ('G5', .5), ('A5', 1),
              ('G5', .5), ('E5', .5), ('D5', 1), ('C5', .5), ('D5', .5), ('E5', 1),
              ('F5', .5), ('A5', .5), ('C6', 1), ('B5', .5), ('A5', .5), ('G5', 1),
              ('E5', .5), ('D5', .5), ('C5', 1), ('-', 2)]
    sections = []
    for _ in range(bars_repeat):
        sections += [hook, answer]
    bars = 8 * len(sections) // 2
    n = int(bars * 4 * 60 / bpm * SR) + SR
    lead, harm, bass, dr = (np.zeros(n) for _ in range(4))
    pos = 0.0
    for sec in sections:
        pos = voice(lead, sec, bpm, lambda f, k: pulse(f, k, .25, vib=.004), .32, pos, d=.06, s=.7)
    roots = (prog * 2) * (bars // 8)
    b = 0.0
    for r in roots:
        voice(harm, arp(chords[r], 4, .25, 4), bpm, lambda f, k: pulse(f, k, .125), .10, b, d=.05, s=.3, r=.02)
        b += 4
    voice(bass, bass_line(roots, 2, [1, .5, .5, 1, 1]), bpm, triangle, .55, 0, d=.05, s=.8)
    drums(dr, {'k': 'x...x...x...x...', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}, bpm, bars, gain=.6)
    left = lead * .9 + harm * 1.1 + bass + dr
    right = echo(lead, 60 / bpm * .75, .35, .3) * .9 + harm * .7 + bass + dr
    return master(left, right)


def theme_chill(bars_repeat=1):
    """Lo-fi chiptune, 88 BPM, A minor, swung hats: focus and routine."""
    bpm = 88
    prog = ['Am7', 'Fmaj7', 'C', 'G']
    chords = {'Am7': ['A', 'C', 'E', 'G'], 'Fmaj7': ['F', 'A', 'C', 'E'], 'C': ['C', 'E', 'G', 'C'], 'G': ['G', 'B', 'D', 'G']}
    roots = {'Am7': 'A', 'Fmaj7': 'F', 'C': 'C', 'G': 'G'}
    melody = [('E5', 1.5), ('D5', .5), ('C5', 1), ('A4', 1),
              ('C5', 1.5), ('E5', .5), ('G5', 2),
              ('G5', 1), ('E5', .5), ('D5', .5), ('C5', 1), ('D5', 1),
              ('E5', 3), ('-', 1),
              ('A5', 1.5), ('G5', .5), ('E5', 1), ('C5', 1),
              ('D5', 1.5), ('E5', .5), ('C5', 2),
              ('B4', 1), ('C5', .5), ('D5', .5), ('E5', 1), ('G5', 1),
              ('A4', 3), ('-', 1)]
    seq = melody * bars_repeat
    bars = 8 * bars_repeat
    n = int(bars * 4 * 60 / bpm * SR) + SR
    lead, keys, bass, dr = (np.zeros(n) for _ in range(4))
    voice(lead, seq, bpm, lambda f, k: triangle(f, k) * .6 + pulse(f, k, .5) * .15, .42, 0, a=.02, d=.2, s=.55, r=.12)
    b = 0.0
    for c in (prog * 2) * bars_repeat:
        voice(keys, arp(chords[c], 4, .5, 4), bpm, lambda f, k: pulse(f, k, .5), .07, b, a=.01, d=.25, s=.25, r=.08)
        b += 4
    voice(bass, bass_line([roots[c] for c in (prog * 2) * bars_repeat], 2, [1.5, .5, 2]), bpm, triangle, .6, 0, a=.01, d=.3, s=.7)
    drums(dr, {'k': 'x.......x.x.....', 's': '....x.......x...', 'h': 'x.x.x.x.x.x.x.x.'}, bpm, bars, gain=.42, swing=.33)
    left = echo(lead, 60 / bpm * .5, .4, .35) + keys * 1.2 + bass + dr
    right = lead * .9 + echo(keys, 60 / bpm * .75, .4, .3) + bass + dr
    return master(left, right)


def theme_epic(bars_repeat=1):
    """Heroic march, 124 BPM, D minor: duels and the arena."""
    bpm = 124
    prog = ['Dm', 'Bb', 'C', 'A']
    chords = {'Dm': ['D', 'F', 'A'], 'Bb': ['Bb', 'D', 'F'], 'C': ['C', 'E', 'G'], 'A': ['A', 'C#', 'E']}
    roots = {'Dm': 'D', 'Bb': 'Bb', 'C': 'C', 'A': 'A'}
    theme = [('D5', 1), ('A4', .5), ('D5', .5), ('F5', 1), ('E5', .5), ('D5', .5),
             ('F5', 1), ('D5', .5), ('F5', .5), ('Bb5', 2),
             ('A5', 1), ('G5', .5), ('F5', .5), ('E5', 1), ('C5', 1),
             ('E5', 1.5), ('F5', .5), ('E5', 1), ('C#5', 1),
             ('D5', 1), ('F5', .5), ('A5', .5), ('D6', 1.5), ('C6', .5),
             ('Bb5', 1), ('A5', .5), ('G5', .5), ('F5', 2),
             ('G5', .5), ('A5', .5), ('Bb5', 1), ('C6', .5), ('Bb5', .5), ('A5', 1),
             ('A5', 2), ('C#6', 1), ('E6', 1)]
    seq = theme * bars_repeat
    bars = 8 * bars_repeat
    n = int(bars * 4 * 60 / bpm * SR) + SR
    lead, low, bass, dr = (np.zeros(n) for _ in range(4))
    voice(lead, seq, bpm, lambda f, k: pulse(f, k, .25, vib=.005), .3, 0, d=.08, s=.75)
    voice(low, [(n_[:-1] + str(int(n_[-1]) - 1), d) if n_ != '-' else (n_, d) for n_, d in seq], bpm,
          lambda f, k: pulse(f, k, .5), .12, 0, d=.08, s=.6)
    voice(bass, bass_line([roots[c] for c in (prog * 2) * bars_repeat], 2, [.5] * 8), bpm, triangle, .55, 0, d=.04, s=.8, r=.02)
    b = 0.0
    harm = np.zeros(n)
    for c in (prog * 2) * bars_repeat:
        voice(harm, [(f'{x}4', 4) for x in chords[c]], bpm, lambda f, k: pulse(f, k, .125), .05, b, a=.05, d=.5, s=.5, r=.2)
        b += 4
    drums(dr, {'k': 'x.....x.x.......', 's': '....x.......x..x', 'h': '..x...x...x...x.'}, bpm, bars, gain=.62)
    left = lead + low * .6 + harm + bass + dr
    right = echo(lead, 60 / bpm * .5, .3, .25) + low + harm * .8 + bass + dr
    return master(left, right)


THEMES = {'quest': theme_quest, 'chill': theme_chill, 'epic': theme_epic}


# ---------------------------------------------------------------- level-up jingles

def levelup(kind):
    n = int(1.4 * SR)
    a, b = np.zeros(n), np.zeros(n)
    if kind == 1:  # bright rising arpeggio + held chord
        pos = voice(a, [('C5', .25), ('E5', .25), ('G5', .25), ('C6', .25)], 150, lambda f, k: pulse(f, k, .25), .5, 0, d=.03, s=.8)
        for x in ['C6', 'E6', 'G6']:
            voice(b, [(x, 2)], 150, lambda f, k: pulse(f, k, .125), .18, pos, d=.3, s=.4, r=.3)
    elif kind == 2:  # power-up sweep then a major chord
        k = int(.35 * SR)
        f = np.linspace(300, 1400, k)
        a[:k] += np.where((np.cumsum(f / SR) % 1) < .5, 1, -1) * np.linspace(.2, .5, k)
        for x in ['G5', 'B5', 'D6', 'G6']:
            voice(b, [(x, 2.2)], 150, lambda f, k: pulse(f, k, .25), .16, .9, d=.35, s=.35, r=.35)
    else:  # two-note fanfare + sparkle
        pos = voice(a, [('G5', .33), ('G5', .17), ('C6', 1.5)], 140, lambda f, k: pulse(f, k, .25, vib=.006), .5, 0, d=.05, s=.75, r=.2)
        for i, x in enumerate(['E7', 'G7', 'C8', 'G7']):
            voice(b, [(x, .12)], 140, lambda f, k: pulse(f, k, .5), .09, .5 + i * .14, d=.03, s=.2, r=.02)
    st = master(a + b, echo(a, .09, .3, .3) + b, fade_out=.25)
    return st


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'previews'
    if cmd == 'previews':
        for name, fn in THEMES.items():
            save(f'preview-theme-{name}', fn(1))
        for k in (1, 2, 3):
            save(f'preview-levelup-{k}', levelup(k))
    elif cmd == 'theme':
        name = sys.argv[2]
        save(f'theme-{name}', THEMES[name](int(sys.argv[3]) if len(sys.argv) > 3 else 6))
    elif cmd == 'levelup':
        save(f'levelup-{sys.argv[2]}', levelup(int(sys.argv[2])))

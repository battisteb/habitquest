"""
Original 8-bit music and sound effects for HabitQuest marketing videos.

Everything is synthesized here (pulse and triangle waves, noise drums), so the
audio is ours: no licence, no "generic stock music" feel.

    python marketing/audio/chiptune.py previews   -> marketing/audio/out/preview-*.wav
    python marketing/audio/chiptune.py theme NAME  -> marketing/audio/out/theme-NAME.wav (full length)
    python marketing/audio/chiptune.py reel SPEC.json OUT.wav -> a track written for one reel (build-reels.js)
    python marketing/audio/chiptune.py sfx         -> marketing/audio/out/whoosh|pixel|pop.wav (transitions)

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


# ---------------------------------------------------------------- reel tracks (beat-synced)
#
# Battiste (2026-10-03): the themes above felt generic. Each reel now gets its own track, written
# for its timeline by build-reels.js: four-on-the-floor kick, pumping octave bass, 16th arpeggios,
# a syncopated (3-3-2) hook, a riser and a drop on the reel's key moment, snare fills on every
# scene change, a key change on the "level up" moment and a final hit on the CTA.

def midi(note):
    name, octave = note[:-1], int(note[-1])
    return 12 * (octave + 1) + NOTES[name]


def mfreq(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def hp(x):
    """Crude high-pass (first difference): brighter noise for hats and crashes."""
    return np.diff(x, prepend=0.0)


def lp(x, k):
    """Crude low-pass (moving average over k samples)."""
    return np.convolve(x, np.ones(k) / k, mode='same')


def add(track, i, seg):
    if i >= len(track) or i + len(seg) <= 0:
        return
    if i < 0:
        seg, i = seg[-i:], 0
    track[i:i + len(seg)] += seg[: len(track) - i]


def drum(kind, seed=0):
    if kind == 'k':  # punchy kick: pitch drop + click
        n = int(0.2 * SR)
        tt = np.arange(n) / SR
        f = 48 + 150 * np.exp(-tt * 38)
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 13)
        return body * 1.25 + noise(n, seed) * np.exp(-tt * 500) * 0.35
    if kind == 's':  # snare: tone body + bright noise
        n = int(0.16 * SR)
        tt = np.arange(n) / SR
        return hp(noise(n, seed)) * np.exp(-tt * 20) * 0.5 + np.sin(2 * np.pi * 185 * tt) * np.exp(-tt * 32) * 0.5
    if kind == 'h':
        n = int(0.04 * SR)
        return hp(noise(n, seed)) * np.exp(-np.arange(n) / SR * 110) * 0.22
    if kind == 'o':  # open hat
        n = int(0.16 * SR)
        return hp(noise(n, seed)) * np.exp(-np.arange(n) / SR * 22) * 0.16
    if kind == 'c':  # crash
        n = int(1.6 * SR)
        tt = np.arange(n) / SR
        return hp(noise(n, seed)) * np.exp(-tt * 2.6) * 0.38
    raise ValueError(kind)


def tone(m, n, kind):
    f = mfreq(m)
    if kind == 'lead':
        w = pulse(f, n, .25, vib=.005 if n > 0.25 * SR else 0) + pulse(f / 2, n, .5) * .35
        return w * envelope(n, a=.003, d=.07, s=.65, r=.03)
    if kind == 'arp':
        return pulse(f, n, .125) * envelope(n, a=.001, d=.05, s=.25, r=.01)
    if kind == 'bass':
        return (triangle(f, n) + pulse(f, n, .5) * .22) * envelope(n, a=.002, d=.06, s=.75, r=.015)
    if kind == 'pad':
        return pulse(f, n, .5) * envelope(n, a=.02, d=.3, s=.45, r=.08)
    if kind == 'stab':
        tt = np.arange(n) / SR
        return (pulse(f, n, .25, vib=.006) + pulse(f / 2, n, .5) * .4) * np.exp(-tt * 1.6) * np.clip(tt * 300, 0, 1)
    raise ValueError(kind)


def bars(*rows):
    out = list(rows)
    for r in out:
        assert abs(sum(d for _, d in r) - 4) < 1e-9, r
    return out


REEL_THEMES = {
    # Bright adventure, C major, I-V-vi-IV.
    'quest': {
        'bpm': 140,
        'prog': [['C', 'E', 'G'], ['G', 'B', 'D'], ['A', 'C', 'E'], ['F', 'A', 'C']],
        'hook': bars(
            [('C6', .75), ('G5', .75), ('E5', .5), ('G5', .5), ('C6', .5), ('D6', .5), ('E6', .5)],
            [('D6', .75), ('B5', .75), ('G5', .5), ('B5', .5), ('D6', .5), ('D6', .5), ('B5', .5)],
            [('C6', .75), ('A5', .75), ('E5', .5), ('A5', .5), ('C6', .5), ('E6', .5), ('D6', .5)],
            [('C6', .75), ('A5', .75), ('F5', .5), ('G5', 1.5), ('-', .5)],
            [('C6', .75), ('G5', .75), ('E5', .5), ('G5', .5), ('C6', .5), ('D6', .5), ('E6', .5)],
            [('D6', .75), ('B5', .75), ('G5', .5), ('B5', .5), ('D6', .5), ('D6', .5), ('B5', .5)],
            [('C6', .75), ('A5', .75), ('E5', .5), ('A5', .5), ('C6', .5), ('E6', .5), ('D6', .5)],
            [('B5', .75), ('D6', .75), ('G6', 1.5), ('-', .5), ('G5', .25), ('B5', .25)],
        ),
        'gallop': False,
    },
    # Duels and the arena, D minor, i-VI-VII-V, galloping bass.
    'epic': {
        'bpm': 150,
        'prog': [['D', 'F', 'A'], ['Bb', 'D', 'F'], ['C', 'E', 'G'], ['A', 'C#', 'E']],
        'hook': bars(
            [('D5', .75), ('F5', .75), ('A5', .5), ('D6', .5), ('C6', .5), ('A5', .5), ('F5', .5)],
            [('Bb5', .75), ('A5', .75), ('F5', .5), ('D5', .5), ('F5', .5), ('Bb5', .5), ('D6', .5)],
            [('C6', .75), ('G5', .75), ('E5', .5), ('G5', .5), ('C6', .5), ('E6', .5), ('D6', .5)],
            [('C#6', 1.5), ('A5', .5), ('E5', .5), ('A5', .5), ('C#6', .5), ('E6', .5)],
            [('D5', .75), ('F5', .75), ('A5', .5), ('D6', .5), ('C6', .5), ('A5', .5), ('F5', .5)],
            [('Bb5', .75), ('A5', .75), ('F5', .5), ('D5', .5), ('F5', .5), ('Bb5', .5), ('D6', .5)],
            [('C6', .75), ('G5', .75), ('E5', .5), ('G5', .5), ('C6', .5), ('E6', .5), ('D6', .5)],
            [('E6', .75), ('C#6', .75), ('A5', 2), ('-', .5)],
        ),
        'gallop': True,
    },
    # Focus and routine, A minor, i-VI-III-VII, still with a beat.
    'chill': {
        'bpm': 128,
        'prog': [['A', 'C', 'E'], ['F', 'A', 'C'], ['C', 'E', 'G'], ['G', 'B', 'D']],
        'hook': bars(
            [('E5', .75), ('C5', .75), ('A4', .5), ('C5', .5), ('E5', .5), ('G5', .5), ('E5', .5)],
            [('F5', .75), ('C5', .75), ('A4', .5), ('C5', .5), ('F5', .5), ('A5', .5), ('G5', .5)],
            [('G5', .75), ('E5', .75), ('C5', .5), ('E5', .5), ('G5', .5), ('C6', .5), ('B5', .5)],
            [('B5', 1.5), ('G5', .5), ('D5', .5), ('G5', .5), ('B5', .5), ('D6', .5)],
            [('E5', .75), ('C5', .75), ('A4', .5), ('C5', .5), ('E5', .5), ('G5', .5), ('E5', .5)],
            [('F5', .75), ('C5', .75), ('A4', .5), ('C5', .5), ('F5', .5), ('A5', .5), ('G5', .5)],
            [('G5', .75), ('E5', .75), ('C5', .5), ('E5', .5), ('G5', .5), ('C6', .5), ('B5', .5)],
            [('D6', .75), ('B5', .75), ('G5', 2), ('-', .5)],
        ),
        'gallop': False,
    },
}


def reel_track(spec):
    """spec (seconds, from build-reels.js): theme, bpm, total, drop, lift (or None), cta, hit, fills.
    Every time is on the beat grid (t = 0 is a beat)."""
    th = REEL_THEMES[spec['theme']]
    bpm = spec.get('bpm') or th['bpm']
    B = 60 / bpm
    beat = lambda t: round(t / B * 4) / 4  # noqa: E731
    total = spec['total']
    drop, cta, hit = beat(spec['drop']), beat(spec['cta']), beat(spec['hit'])
    lift = beat(spec['lift']) if spec.get('lift') is not None else None
    fills = [beat(f) for f in spec.get('fills', [])]
    n = int((total + 2) * SR)
    lead, arpt, bass, pad, dr, fx = (np.zeros(n) for _ in range(6))
    at = lambda b: int(b * B * SR)  # noqa: E731
    key = lambda b: 2 if lift is not None and b >= lift else 0  # noqa: E731
    chord_of = lambda b: th['prog'][int((b - drop) // 4) % 4]  # noqa: E731
    root = lambda c, octave: midi(f'{c[0]}{octave}')  # noqa: E731
    last_beat = int(hit)

    # Drums, bass and arpeggio, 16th by 16th up to the final hit.
    for s in range(int(hit * 4)):
        b = s / 4
        in_gap = drop - 0.5 <= b < drop  # half a beat of silence before the drop
        main = b >= drop
        pos = (b - drop) % 4
        c = chord_of(b)
        k = key(b)
        if in_gap:
            continue
        if s % 4 == 0:
            add(dr, at(b), drum('k', s))
        if main:
            if abs(pos - 1) < 1e-9 or abs(pos - 3) < 1e-9:
                add(dr, at(b), drum('s', s))
            add(dr, at(b), drum('h', s) * (0.75 if s % 2 == 0 else 0.4))
            if s % 4 == 2:
                add(dr, at(b), drum('o', s))
        elif s % 2 == 0:
            add(dr, at(b), drum('h', s) * 0.7)
        # Bass: 8ths jumping octaves (gallop: 8th + two 16ths), pumping with the kick.
        if s % 2 == 0 or (th['gallop'] and main and s % 4 == 3):
            if th['gallop'] and main:
                dur = .5 if s % 4 == 0 else .25
            else:
                dur = .5
            if dur:
                octave = 3 if (main and s % 4 == 2) else 2
                m = root(c, octave) + k
                add(bass, at(b), tone(m, int(dur * B * SR * .9), 'bass'))
        # Arpeggio: chord tones over two octaves, quieter before the drop and rising in.
        steps = [0, 1, 2, 3, 4, 3, 2, 1]
        idx = steps[s % 8]
        m = root([c[idx % 3]], 5 if idx >= 3 else 4) + k
        g = 1.0 if main else 0.35 + 0.65 * (b / max(drop, 1))
        add(arpt, at(b), tone(m, int(.25 * B * SR), 'arp') * g)

    # Pads (whole bars, from the drop) and the hook.
    b = drop
    bar = 0
    while b < hit:
        c = chord_of(b)
        length = min(4, hit - b)
        for x in c:
            add(pad, at(b), tone(root([x], 4) + key(b), int(length * B * SR), 'pad'))
        pb = b
        for note, d in th['hook'][bar % 8]:
            if pb >= hit:
                break
            if note != '-':
                add(lead, at(pb), tone(midi(note) + key(pb), int(min(d, hit - pb) * B * SR * .95), 'lead'))
            pb += d
        b += 4
        bar += 1

    # Riser into the drop (and the key change): noise swelling + a rising pulse.
    for target, beats in [(drop, min(4, drop))] + ([(lift, 2)] if lift is not None else []):
        if beats <= 0:
            continue
        i0, m_ = at(target - beats), at(target) - at(target - beats)
        tt = np.linspace(0, 1, m_)
        f = 300 * 2 ** (tt * 2.5)
        sweep = np.where((np.cumsum(f / SR) % 1) < .25, 1.0, -1.0)
        add(fx, i0, hp(noise(m_, i0)) * tt ** 2 * 0.22 + sweep * tt ** 1.5 * 0.1)
        # Snare roll, 16ths then 32nds, getting louder.
        r = target - min(beats, 2)
        while r < target - 1e-9:
            frac = (r - (target - min(beats, 2))) / min(beats, 2)
            add(dr, at(r), drum('s', int(r * 97)) * (0.35 + 0.65 * frac))
            r += .25 if frac < 0.5 else .125
    # Snare fill on the beat before every scene change, crash on the big moments.
    for f_ in fills:
        if drop < f_ < hit:
            for j in range(4):
                add(dr, at(f_ - 1 + j / 4), drum('s', int(f_ * 31) + j) * (0.4 + 0.15 * j))
    for c_ in [drop, cta] + ([lift] if lift is not None else []):
        add(dr, at(c_), drum('c', int(c_ * 7)))

    # Final hit on the CTA: kick, crash and the tonic chord ringing out, then a sparkle.
    tonic = th['prog'][0]
    k = key(hit)
    add(dr, at(hit), drum('k', 1) * 1.2 + 0)
    add(dr, at(hit), drum('c', 2) * 1.3)
    ring = int(max(total - hit * B, 0.5) * SR) + SR
    for j, x in enumerate(tonic):
        add(lead, at(hit), tone(root([x], 5) + k, ring, 'stab') * (0.8 if j == 0 else 0.55))
    add(bass, at(hit), tone(root(tonic, 2) + k, ring, 'stab') * .6)
    for j, x in enumerate(tonic + [tonic[0]]):
        add(arpt, at(hit + .5 + j * .25), tone(root([x], 6 if j < 3 else 7) + k, int(.25 * B * SR), 'arp') * .8)

    # Sidechain pump: the bass, the arpeggio and the pads duck on every kick.
    tt = np.arange(n) / SR
    since = (tt % B)
    pump = 1 - 0.55 * np.exp(-since / 0.07)
    pump[at(hit):] = 1
    arpt *= pump
    pad *= pump
    bass *= 1 - 0.35 * np.exp(-since / 0.06) * (tt < hit * B)

    left = lead * .32 + echo(arpt, B * .75, .35, .3) * .2 + bass * .5 + pad * .05 + dr * .62 + fx
    right = echo(lead, B * .5, .3, .3) * .32 + arpt * .2 + bass * .5 + pad * .05 + dr * .62 + fx
    st = np.stack([left[: int(total * SR)], right[: int(total * SR)]], axis=1)
    # Gentle saturation only on the loudest peaks (keeps the punch of the kick); build-reels.js
    # then normalizes the final mix to -14 LUFS.
    st /= np.percentile(np.abs(st), 99.9) / 0.75
    st = np.tanh(st)
    st *= 0.89 / np.max(np.abs(st))
    fo = int(0.25 * SR)
    st[-fo:] *= np.linspace(1, 0, fo)[:, None]
    return st


# ---------------------------------------------------------------- transition sounds

def sfx_whoosh():
    """3D flip: a short noise sweep that pans across."""
    n = int(0.5 * SR)
    tt = np.linspace(0, 1, n)
    nz = noise(n, 11)
    bright = np.sin(np.pi * tt) ** 2
    x = (lp(nz, 18) * (1 - bright) * 2.2 + hp(nz) * bright * 0.6) * np.sin(np.pi * np.clip(tt * 1.15, 0, 1)) ** 2
    pan = np.clip(tt * 1.4 - 0.2, 0, 1)
    return master(x * (1 - pan * .7), x * (0.3 + pan * .7), fade_in=0.01, fade_out=0.05) * 0.75


def sfx_pixel():
    """Pixel transition: a quick 8-bit blip run, down then up."""
    n = int(0.45 * SR)
    x = np.zeros(n)
    notes = [84, 79, 76, 72, 67, 72, 76, 79, 84, 88]
    step = n // len(notes)
    for j, m in enumerate(notes):
        x[j * step:(j + 1) * step] += pulse(mfreq(m), step, .5) * envelope(step, a=.001, d=.02, s=.4, r=.005)
    return master(x, x, fade_in=0.005, fade_out=0.03) * 0.5


def sfx_pop():
    """Sticker popping in: tiny rising blip."""
    n = int(0.09 * SR)
    tt = np.arange(n) / SR
    f = 600 * 2 ** (tt / 0.09 * 1.5)
    x = np.where((np.cumsum(f / SR) % 1) < .5, 1.0, -1.0) * np.exp(-tt * 25)
    return master(x, x, fade_in=0.002, fade_out=0.01) * 0.45


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'previews'
    if cmd == 'reel':  # python chiptune.py reel spec.json out.wav  (called by build-reels.js)
        import json
        st = reel_track(json.loads(Path(sys.argv[2]).read_text(encoding='utf8')))
        out = Path(sys.argv[3])
        with wave.open(str(out), 'wb') as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((st * 32767).astype(np.int16).tobytes())
        sys.exit(0)
    if cmd == 'sfx':
        save('whoosh', sfx_whoosh())
        save('pixel', sfx_pixel())
        save('pop', sfx_pop())
        sys.exit(0)
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

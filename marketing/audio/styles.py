"""
Other music styles for the story reels, written for each reel's timeline like chiptune.reel_track
(same spec from build-reels.js: bpm, total, drop, lift, cta, hit, fills; music.theme picks the style).
Everything is synthesized here, so the tracks are ours (no licence, no Content ID).

    phonk  — drift phonk, the sound of anime edits: pitched cowbell riff, sliding distorted 808,
             hard kick and clap, rolling hats. Filtered and sparse before the drop.
    rise   — emotional piano that turns epic: soft piano and strings for the story, then taikos,
             string ostinato, brass and choir from the drop (anime "training arc" OST feel).
    sawano — trap-orchestral (Solo Leveling / Attack on Titan feel): staccato strings, choir,
             808 and trap hats, a "braaam" on the drop.

    python marketing/audio/styles.py SPEC.json OUT.wav   (theme taken from the spec)
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

from chiptune import SR, add, echo, hp, lp, midi, mfreq, noise

TAU = 2 * np.pi


# ---------------------------------------------------------------- instruments

def saw(f, n, detune=0.0):
    t = np.arange(n) / SR
    return 2 * ((f * (1 + detune) * t) % 1) - 1


def adsr(n, a=0.01, d=0.1, s=0.7, r=0.05):
    e = np.full(n, s)
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na, nd = min(na, n), min(nd, max(n - na, 0))
    e[:na] = np.linspace(0, 1, na) if na else e[:na]
    e[na:na + nd] = np.linspace(1, s, nd) if nd else e[na:na + nd]
    if nr and nr < n:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def cowbell(m, n):
    """808 cowbell, pitched: two square waves a fifth-ish apart, band-limited, quick decay."""
    f = mfreq(m)
    t = np.arange(n) / SR
    w = np.sign(np.sin(TAU * f * t)) * 0.6 + np.sign(np.sin(TAU * f * 1.48 * t)) * 0.4
    w = hp(lp(w, 3))
    return w * np.exp(-t * 9) * 0.9


def bass808(m, n, slide_from=None, drive=2.5):
    f1 = mfreq(m)
    t = np.arange(n) / SR
    if slide_from is not None:
        f0 = mfreq(slide_from)
        f = f1 + (f0 - f1) * np.exp(-t * 18)
    else:
        f = f1 * (1 + 0.6 * np.exp(-t * 60))
    w = np.sin(TAU * np.cumsum(f) / SR)
    return np.tanh(w * drive) / np.tanh(drive) * np.exp(-t * 1.4) * np.clip(t * 400, 0, 1)


def kick(hard=1.0, seed=0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = 45 + 170 * np.exp(-t * 35)
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 9)
    return np.tanh((body * 1.3 + noise(n, seed) * np.exp(-t * 600) * 0.4) * (1 + hard)) * 0.9


def clap(seed=0):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    nz = hp(noise(n, seed))
    env = np.exp(-t * 18)
    for k in (0.0, 0.011, 0.022):  # three quick bursts, like hands
        env += np.exp(-np.maximum(t - k, 0) * 140) * (t >= k) * 0.8
    return nz * env * 0.45


def hat(seed=0, length=0.035):
    n = int(length * SR)
    return hp(hp(noise(n, seed))) * np.exp(-np.arange(n) / SR * (3.2 / length)) * 0.18


def crash(seed=0, length=2.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    return hp(noise(n, seed)) * np.exp(-t * 2.2) * 0.32


def taiko(seed=0, big=1.0):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = 62 + 70 * np.exp(-t * 20)
    body = np.sin(TAU * np.cumsum(f) / SR) * np.exp(-t * 5)
    skin = lp(noise(n, seed), 6) * np.exp(-t * 30) * 0.6
    return np.tanh((body + skin) * 1.6 * big) * 0.85


def piano(m, n, vel=1.0):
    f = mfreq(m)
    t = np.arange(n) / SR
    w = np.zeros(n)
    for k, a in enumerate([1, .5, .3, .18, .1, .06], start=1):
        w += a * np.sin(TAU * f * k * (1 + 0.0004 * k * k) * t) * np.exp(-t * (1.8 + 1.1 * k))
    hammer = noise(n, m) * np.exp(-t * 400) * 0.08
    return (w + hammer) * vel * np.clip(t * 600, 0, 1) * 0.5


def strings(m, n, att=0.25, rel=0.3, bright=6):
    f = mfreq(m)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(TAU * 5.2 * t)
    w = sum(2 * ((f * d * np.cumsum(vib) / SR) % 1) - 1 for d in (0.996, 1.0, 1.005)) / 3
    return lp(w, bright) * adsr(n, a=att, d=0.2, s=0.85, r=rel) * 0.4


def staccato(m, n):
    f = mfreq(m)
    t = np.arange(n) / SR
    w = (saw(f, n) + saw(f, n, 0.006)) / 2
    return lp(w, 4) * np.exp(-t * 14) * np.clip(t * 300, 0, 1) * 0.45


def brass(m, n):
    f = mfreq(m)
    t = np.arange(n) / SR
    w = (saw(f, n) + saw(f, n, -0.004) + saw(f / 2, n) * 0.6) / 2.6
    bright = np.clip(t / 0.08, 0, 1)
    return (lp(w, 10) * (1 - bright * 0.5) + lp(w, 3) * bright * 0.5) * adsr(n, a=0.04, d=0.3, s=0.7, r=0.15) * 0.5


def choir(m, n):
    """'Aah' pad: detuned saws through two crude formant bands (~700 and ~1100 Hz)."""
    f = mfreq(m)
    t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(TAU * 4.8 * t + m)
    w = sum(2 * ((f * d * np.cumsum(vib) / SR) % 1) - 1 for d in (0.993, 1.0, 1.008)) / 3
    f1 = lp(w, int(SR / 700 / 2)) - lp(w, int(SR / 700))
    f2 = lp(w, int(SR / 1100 / 2)) - lp(w, int(SR / 1100))
    return (f1 + f2 * 0.6 + lp(w, 30) * 0.4) * adsr(n, a=0.35, d=0.2, s=0.9, r=0.4) * 0.6


def braaam(m, n):
    t = np.arange(n) / SR
    w = sum(saw(mfreq(m + o), n, d) for o, d in [(0, 0), (0, 0.004), (-12, 0), (7, 0.002), (12, -0.003)]) / 4
    return np.tanh(lp(w, 8) * 2.2) * np.exp(-t * 0.9) * np.clip(t * 60, 0, 1) * 0.55


def riser(n, seed=0):
    tt = np.linspace(0, 1, n)
    f = 200 * 2 ** (tt * 3)
    sweep = np.sin(TAU * np.cumsum(f) / SR)
    return hp(noise(n, seed)) * tt ** 2 * 0.25 + sweep * tt ** 2 * 0.06


def reverb(x, mix=0.25):
    out = x.copy()
    for d, g in [(0.031, .5), (0.047, .42), (0.071, .35), (0.113, .28), (0.157, .2), (0.211, .14)]:
        k = int(d * SR)
        out[k:] += lp(x[:-k], 8) * g * mix
    return out


# ---------------------------------------------------------------- styles

def chord_tones(name, octave):
    """'Dm' / 'Bb' / 'C#m' → MIDI notes of the triad."""
    minor = name.endswith('m')
    root = midi(f'{name.rstrip("m")}{octave}')
    return [root, root + (3 if minor else 4), root + 7]


class Track:
    def __init__(self, spec):
        self.bpm = spec['bpm']
        self.B = 60 / self.bpm
        q = lambda t: round(t / self.B * 4) / 4  # noqa: E731
        self.total = spec['total']
        self.drop, self.cta, self.hit = q(spec['drop']), q(spec['cta']), q(spec['hit'])
        self.lift = q(spec['lift']) if spec.get('lift') is not None else None
        self.fills = [q(f) for f in spec.get('fills', [])]
        self.n = int((self.total + 3) * SR)
        self.bus = {}

    def at(self, b):
        return int(b * self.B * SR)

    def key(self, b):
        return 2 if self.lift is not None and b >= self.lift else 0

    def put(self, bus, b, seg, gain=1.0):
        if bus not in self.bus:
            self.bus[bus] = np.zeros(self.n)
        add(self.bus[bus], self.at(b), seg * gain)

    def get(self, bus):
        return self.bus.get(bus, np.zeros(self.n))

    def length(self, beats):
        return int(beats * self.B * SR)

    def risers(self):
        for target, beats in [(self.drop, min(4, self.drop))] + ([(self.lift, 2)] if self.lift is not None else []):
            if beats > 0:
                self.put('fx', target - beats, riser(self.length(beats), int(target * 13)))

    def finish(self, mix):
        st = np.stack([mix[0][: int(self.total * SR)], mix[1][: int(self.total * SR)]], axis=1)
        st /= np.percentile(np.abs(st), 99.9) / 0.75
        st = np.tanh(st)
        st *= 0.89 / np.max(np.abs(st))
        fo = int(0.25 * SR)
        st[-fo:] *= np.linspace(1, 0, fo)[:, None]
        return st


def phonk(spec):
    tr = Track(spec)
    drop, hit = tr.drop, tr.hit
    prog = ['C#m', 'C#m', 'A', 'B']  # i i VI VII
    # Cowbell riff, two bars (C# minor), 16ths and 8ths with the typical stutter.
    riff = [
        [('C#5', .5), ('C#5', .25), ('C#5', .25), ('E5', .5), ('C#5', .5), ('G#4', .5), ('A4', .5), ('B4', .5), ('G#4', .5)],
        [('C#5', .5), ('C#5', .25), ('C#5', .25), ('E5', .5), ('F#5', .5), ('E5', .5), ('C#5', .5), ('B4', .5), ('G#4', .5)],
    ]
    bass_notes = [('C#1', 0), ('C#1', 1.5), ('E1', 2.5), ('C#1', 3)]  # 808 hits per bar (beat offsets)
    bar = 0
    b = 0.0
    while b < hit:
        k = tr.key(b)
        main = b >= drop
        gain = 1.0 if main else 0.9 + 0.3 * (b / max(drop, 1))
        pb = b
        for note, d in riff[bar % 2]:
            if pb >= hit:
                break
            if not (drop - 0.5 <= pb < drop):
                seg = cowbell(midi(note) + k, tr.length(d * 0.95))
                tr.put('bell', pb, seg if main else lp(seg, 2), gain)
            pb += d
        if main:
            prev = None
            for note, off in bass_notes:
                m = midi(note) + k + (midi(prog[bar % 4].rstrip('m') + '1') - midi('C#1'))
                tr.put('808', b + off, bass808(m, tr.length(1.4), slide_from=prev), 0.9)
                prev = m
            for off in (0, 0.75, 2.5):
                tr.put('drums', b + off, kick(1.2, int(b * 7 + off * 3)))
            for off in (1, 3):
                tr.put('drums', b + off, clap(int(b * 5 + off)))
            for s in range(16):
                roll = (bar % 2 == 1 and s >= 12)
                tr.put('drums', b + s / 4, hat(int(b * 3 + s)), 0.9 if s % 2 == 0 else 0.55)
                if roll:  # triplet roll at the end of every other bar
                    tr.put('drums', b + s / 4 + 1 / 12, hat(int(b * 3 + s) + 50), 0.45)
                    tr.put('drums', b + s / 4 + 2 / 12, hat(int(b * 3 + s) + 90), 0.45)
        else:
            # Before the drop: just a muffled kick on 1 and sparse hats, the riff filtered.
            tr.put('808', b, bass808(midi(prog[bar % 4].rstrip('m') + '1') + k, tr.length(3), drive=1.5), 0.55)
            if b >= drop - 8:
                tr.put('drums', b, lp(kick(0.4, int(b)), 8), 0.8)
                tr.put('drums', b + 2, lp(clap(int(b)), 4), 0.6)
            for s in range(0, 16, 4):
                tr.put('drums', b + s / 4 + 0.5, hat(int(b + s)), 0.5)
        b += 4
        bar += 1
    tr.risers()
    for c in [drop, tr.cta] + ([tr.lift] if tr.lift is not None else []):
        tr.put('drums', c, crash(int(c * 7)), 0.8)
    # Final hit: 808 + kick + the riff's last note ringing.
    k = tr.key(hit)
    tr.put('drums', hit, kick(1.5, 9))
    tr.put('808', hit, bass808(midi('C#1') + k, tr.length(6), drive=3), 1.1)
    tr.put('bell', hit, cowbell(midi('C#5') + k, tr.length(3)), 1.2)
    tr.put('drums', hit, crash(3, 3.0), 1.1)
    t = np.arange(tr.n) / SR
    pump = 1 - 0.5 * np.exp(-(t % tr.B) / 0.08) * (t < hit * tr.B) * (t >= drop * tr.B)
    bell = echo(reverb(tr.get('bell'), 0.35), tr.B * 0.75, 0.3, 0.25)
    b808 = tr.get('808') * pump
    dr, fx = tr.get('drums'), tr.get('fx')
    left = bell * .42 + b808 * .55 + dr * .6 + fx
    right = np.roll(bell, int(0.012 * SR)) * .42 + b808 * .55 + dr * .6 + fx
    return tr.finish((left, right))


def rise(spec):
    tr = Track(spec)
    drop, hit = tr.drop, tr.hit
    prog = ['Dm', 'Bb', 'F', 'C']
    melody = [  # piano / strings melody over the 4 chords (D minor), one bar each
        [('A5', 1.5), ('F5', .5), ('E5', 1), ('D5', 1)],
        [('F5', 1.5), ('D5', .5), ('C5', 1), ('Bb4', 1)],
        [('C5', 1.5), ('A4', .5), ('C5', 1), ('F5', 1)],
        [('E5', 2), ('G5', 1), ('E5', 1)],
    ]
    bar = 0
    b = 0.0
    while b < hit:
        k = tr.key(b)
        main = b >= drop
        name = prog[bar % 4]
        tones = chord_tones(name.rstrip('m') + ('m' if name.endswith('m') else ''), 3)
        L = min(4, hit - b)
        # Piano arpeggio, 8ths (before the drop: soft, alone; after: under everything).
        arp = [tones[0], tones[1], tones[2], tones[1] + 12, tones[2] + 12, tones[1] + 12, tones[2], tones[1]]
        for i, m in enumerate(arp):
            if b + i / 2 >= hit or (drop - 0.5 <= b + i / 2 < drop):
                continue
            tr.put('piano', b + i / 2, piano(m + 12 + k, tr.length(2), 0.7 if main else 0.55))
        # Strings pad on the chord.
        for m in tones:
            tr.put('str', b, strings(m + 12 + k, tr.length(L), att=0.5 if not main else 0.15), 0.6 if not main else 0.9)
        pb = b
        for note, d in melody[bar % 4]:
            if pb >= hit:
                break
            if main or b >= drop - 8:
                tr.put('lead', pb, piano(midi(note) + k, tr.length(d + 0.5), 1.0 if main else 0.6))
                if main:
                    tr.put('lead', pb, strings(midi(note) + k, tr.length(d), att=0.06, rel=0.15, bright=4), 0.7)
            pb += d
        if main:
            # Taikos, string ostinato (16ths), brass on each new chord, choir pad.
            for off, big in [(0, 1.3), (1.5, .8), (2, 1.0), (3, .9), (3.5, .7)]:
                tr.put('drums', b + off, taiko(int(b * 9 + off * 4), big))
            for s in range(16):
                m = tones[0] + (12 if s % 4 == 2 else 0) + (7 if s % 8 == 5 else 0)
                tr.put('ost', b + s / 4, staccato(m + k, tr.length(0.22)), 0.85 if s % 4 == 0 else 0.6)
            for m in tones:
                tr.put('brass', b, brass(m + k, tr.length(1.6)), 0.75)
                tr.put('choir', b, choir(m + 12 + k, tr.length(L)), 0.7)
            for s in range(0, 16, 2):
                tr.put('drums', b + s / 4, hat(int(b + s), 0.03), 0.4)
        elif b >= drop - 8:
            tr.put('drums', b, taiko(int(b), 0.5), 0.5)  # heartbeat before the drop
        b += 4
        bar += 1
    tr.risers()
    for f in tr.fills:
        if drop < f < hit:
            for j, off in enumerate((-.5, -.25)):
                tr.put('drums', f + off, taiko(int(f * 11) + j, 0.7))
    for c in [drop, tr.cta] + ([tr.lift] if tr.lift is not None else []):
        tr.put('drums', c, crash(int(c * 7), 2.5), 0.9)
        tr.put('drums', c, taiko(int(c), 1.8))
    k = tr.key(hit)
    for m in chord_tones('Dm', 3):
        tr.put('brass', hit, brass(m + k, tr.length(6)), 1.0)
        tr.put('choir', hit, choir(m + 12 + k, tr.length(6)), 0.9)
        tr.put('piano', hit, piano(m + 24 + k, tr.length(6)), 0.9)
    tr.put('drums', hit, taiko(5, 2.0))
    tr.put('drums', hit, crash(4, 3.0), 1.2)
    piano_bus = reverb(tr.get('piano') + tr.get('lead'), 0.45)
    pads = reverb(tr.get('str') + tr.get('choir'), 0.35)
    left = piano_bus * .55 + pads * .35 + tr.get('ost') * .35 + tr.get('brass') * .4 + tr.get('drums') * .6 + tr.get('fx')
    right = np.roll(piano_bus, int(0.009 * SR)) * .55 + np.roll(pads, int(0.015 * SR)) * .35 \
        + np.roll(tr.get('ost'), int(0.006 * SR)) * .35 + tr.get('brass') * .4 + tr.get('drums') * .6 + tr.get('fx')
    return tr.finish((left, right))


def sawano(spec):
    tr = Track(spec)
    drop, hit = tr.drop, tr.hit
    prog = ['Em', 'C', 'Am', 'B']
    hook = [  # brass/choir hook, E minor
        [('E5', .75), ('G5', .75), ('B5', .5), ('A5', 1), ('G5', 1)],
        [('E5', .75), ('G5', .75), ('C6', .5), ('B5', 1), ('G5', 1)],
        [('A5', .75), ('C6', .75), ('E6', .5), ('D6', 1), ('C6', 1)],
        [('B5', 1.5), ('D#6', .5), ('F#6', 1), ('B5', 1)],
    ]
    bar = 0
    b = 0.0
    while b < hit:
        k = tr.key(b)
        main = b >= drop
        name = prog[bar % 4]
        tones = chord_tones(name, 3)
        L = min(4, hit - b)
        # Staccato strings, 8ths with an accent pattern (3-3-2), from the start, rising in.
        g = 1.0 if main else 0.75 + 0.25 * (b / max(drop, 1))
        for s in range(8):
            if drop - 0.5 <= b + s / 2 < drop:
                continue
            m = tones[0] + (12 if s in (0, 3, 6) else 0)
            tr.put('ost', b + s / 2, staccato(m + 12 + k, tr.length(0.4)), g * (1.0 if s in (0, 3, 6) else 0.6))
        for m in tones:
            tr.put('choir', b, choir(m + 12 + k, tr.length(L)), 0.9 if main else 0.7)
            if not main:
                tr.put('808', b, bass808(tones[0] - 24 + k, tr.length(4), drive=1.0), 0.16)
        if main:
            pb = b
            for note, d in hook[bar % 4]:
                if pb >= hit:
                    break
                tr.put('lead', pb, brass(midi(note) - 12 + k, tr.length(d)), 0.8)
                tr.put('lead', pb, strings(midi(note) + k, tr.length(d), att=0.03, rel=0.1, bright=3), 0.5)
                pb += d
            # Half-time trap: kick 0 and 2.5, clap on 2, hats with rolls, 808 on the root.
            for off in (0, 2.5, 2.75 if bar % 2 else None):
                if off is not None:
                    tr.put('drums', b + off, kick(1.0, int(b * 3 + off)))
            tr.put('drums', b + 2, clap(int(b)) * 1.1)
            tr.put('drums', b + 2, taiko(int(b), 0.9), 0.7)
            for s in range(8):
                tr.put('drums', b + s / 2, hat(int(b * 7 + s)), 0.7)
                if bar % 2 and s >= 6:
                    for r in range(1, 4):
                        tr.put('drums', b + s / 2 + r / 8, hat(int(b + s * 9 + r)), 0.35)
            tr.put('808', b, bass808(tones[0] - 24 + k, tr.length(2.4)), 0.95)
            tr.put('808', b + 2.5, bass808(tones[0] - 24 + k, tr.length(1.4)), 0.8)
        else:
            for s in range(0, 8, 2):
                tr.put('drums', b + s / 2, hat(int(b + s), 0.025), 0.5)  # ticking clock
        b += 4
        bar += 1
    tr.risers()
    for c in [drop] + ([tr.lift] if tr.lift is not None else []):
        tr.put('fx', c, braaam(midi('E2') + tr.key(c), tr.length(6)), 1.0)
        tr.put('drums', c, crash(int(c * 7), 2.5), 0.9)
        tr.put('drums', c, taiko(int(c), 2.0))
    tr.put('drums', tr.cta, crash(9, 2.0), 0.8)
    k = tr.key(hit)
    tr.put('fx', hit, braaam(midi('E2') + k, tr.length(6)), 1.1)
    for m in chord_tones('Em', 3):
        tr.put('choir', hit, choir(m + 12 + k, tr.length(6)), 1.0)
    tr.put('drums', hit, taiko(7, 2.2))
    tr.put('drums', hit, kick(1.4, 3), 0.6)
    tr.put('drums', hit, crash(5, 3.0), 1.2)
    t = np.arange(tr.n) / SR
    pump = 1 - 0.45 * np.exp(-((t - drop * tr.B) % (2 * tr.B)) / 0.1) * (t >= drop * tr.B) * (t < hit * tr.B)
    pads = reverb(tr.get('choir'), 0.4) * pump
    lead = reverb(tr.get('lead'), 0.3)
    left = tr.get('ost') * .4 + pads * .35 + lead * .45 + tr.get('808') * .5 + tr.get('drums') * .6 + tr.get('fx')
    right = np.roll(tr.get('ost'), int(0.008 * SR)) * .4 + np.roll(pads, int(0.014 * SR)) * .35 + lead * .45 \
        + tr.get('808') * .5 + tr.get('drums') * .6 + tr.get('fx')
    return tr.finish((left, right))


STYLES = {'phonk': phonk, 'rise': rise, 'sawano': sawano}


def write(st, out):
    with wave.open(str(out), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


if __name__ == '__main__':
    spec = json.loads(Path(sys.argv[1]).read_text(encoding='utf8'))
    write(STYLES[spec['theme']](spec), Path(sys.argv[2]))

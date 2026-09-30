import sys, importlib
from PIL import Image, ImageDraw

def shade(hexc, f):
    hexc = hexc.lstrip('#'); r, g, b = (int(hexc[i:i+2], 16) for i in (0, 2, 4))
    if f < 1: return '#%02x%02x%02x' % tuple(int(c * f) for c in (r, g, b))
    return '#%02x%02x%02x' % tuple(min(255, int(c + (255 - c) * (f - 1))) for c in (r, g, b))

def palette(skin='#f4c98a', hair='#4a3728', eye='#3a4a8a', p='#6b5b95', q='#4a3f6b', n='#3b4a6b', f='#3a2a1a', a='#b0b8c0', x='#d4af37'):
    return {
        'o': '#1b1428', 's': skin, 'S': shade(skin, .82), 'c': shade(skin, .9) if False else '#eaa79a',
        'w': '#f4f1ea', 'e': eye, 'm': '#a8584a',
        'h': hair, 'H': shade(hair, .7), 'L': shade(hair, 1.35),
        'p': p, 'P': shade(p, .72), 'l': shade(p, 1.3), 'q': q, 'Q': shade(q, .72),
        'b': '#5a3a1a', 'B': '#e0b04a', 'n': n, 'N': shade(n, .72), 'f': f, 'F': shade(f, .7),
        'a': a, 'A': shade(a, .7), 'g': shade(a, 1.4), 'x': x, 'X': shade(x, .72), 'y': shade(x, 1.35),
    }

def render(layers, pal, scale=12, bg=(40, 44, 70)):
    img = Image.new('RGB', (32 * scale, 32 * scale), bg)
    d = ImageDraw.Draw(img)
    for rows in layers:
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch == '.' or ch == ' ': continue
                d.rectangle([x * scale, y * scale, (x + 1) * scale - 1, (y + 1) * scale - 1], fill=pal.get(ch, '#ff00ff'))
    return img

def sheet(items, out, scale=8):
    imgs = [render(l, p, scale) for l, p in items]
    W = sum(i.width for i in imgs) + 4 * (len(imgs) - 1)
    s = Image.new('RGB', (W, imgs[0].height), (10, 10, 20)); x = 0
    for i in imgs: s.paste(i, (x, 0)); x += i.width + 4
    s.save(out)

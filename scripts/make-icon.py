"""
App icon, splash and favicons: Pip, smiling and blue (Battiste, 2026-10-04).

The sprite is read from src/features/mascot/sprites.ts, so the icon follows Pip
if it changes in the app. usage: python scripts/make-icon.py [expression] [mood]
Writes assets/ (Expo icon, Android adaptive, splash, favicon), public/ (web icons,
also used by the auth e-mails), docs/assets/icon.png, marketing/assets/icon.png and the profile picture
marketing/brand/pip-avatar-blue.png.
"""
import os
import re
import sys
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPRESSION = sys.argv[1] if len(sys.argv) > 1 else 'joy'
MOOD = sys.argv[2] if len(sys.argv) > 2 else 'worried'  # the blue palette

src = open(os.path.join(ROOT, 'src/features/mascot/sprites.ts'), encoding='utf-8').read()
body = re.findall(r"'([.\w]{16})'", src[src.index('const BODY'):src.index('/** Rows that differ')])
faces = src[src.index('const FACES'):src.index('export function pipSprite')]
face_src = re.search(EXPRESSION + r': \{(.*?)\}', faces, re.S).group(1)
face = {int(i): row for i, row in re.findall(r"(\d+): '([.\w]{16})'", face_src)}
rows = [face.get(i, r) for i, r in enumerate(body)]

def palette_of(block):
    return dict(re.findall(r"(\w): '(#[0-9A-Fa-f]{6})'", block))
shared = palette_of(re.search(r'const SHARED = \{(.*?)\}', src).group(1))
mood = palette_of(re.search(MOOD + r': \{ \.\.\.SHARED,(.*?)\}', src).group(1))
pal = {**shared, **mood}

# Only the drawn pixels, so the slime is centred whatever the empty rows above it.
px = {(x, y): pal[c] for y, row in enumerate(rows) for x, c in enumerate(row) if c != '.' and c != 'z'}
xs = [x for x, _ in px]; ys = [y for _, y in px]
X0, Y0, W, H = min(xs), min(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1

def sprite(scale, color=None):
    img = Image.new('RGBA', (W * scale, H * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for (x, y), c in px.items():
        if color and c in (pal['k'], pal['r']):
            continue  # monochrome: the outline and the face become holes, so Pip keeps its face
        d.rectangle([(x - X0) * scale, (y - Y0) * scale, (x - X0 + 1) * scale - 1, (y - Y0 + 1) * scale - 1], fill=color or c)
    return img

def background(size):
    bg = Image.new('RGB', (size, size), '#1e2448')
    d = ImageDraw.Draw(bg)
    for r in range(size // 2, 0, -max(1, size // 128)):  # stepped radial glow, pixel feel
        t = r / (size / 2)
        c = tuple(int(a + (b - a) * (1 - t)) for a, b in zip((30, 36, 72), (58, 68, 128)))
        d.ellipse([size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r], fill=c)
    return bg

def centred(canvas, sp):
    canvas.alpha_composite(sp, ((canvas.width - sp.width) // 2, (canvas.height - sp.height) // 2))
    return canvas

def icon(size, fill=0.68):
    sp = sprite(max(1, int(size * fill / max(W, H))))
    return centred(background(size).convert('RGBA'), sp).convert('RGB')

def out(rel):
    p = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p

big = icon(1024)  # iOS / store: opaque, no transparency
for rel in ('assets/icon.png', 'docs/assets/icon.png', 'marketing/assets/icon.png'):
    big.save(out(rel))
# Profile picture of the English accounts (TikTok, YouTube): the app icon, a bit smaller
# so the round crop keeps all of Pip. The Japanese account keeps the pink Pip (brand/).
icon(1080, 0.6).save(out('marketing/brand/pip-avatar-blue.png'))
for rel, size in (('public/icon-512.png', 512), ('public/icon-192.png', 192), ('public/apple-touch-icon.png', 180), ('assets/favicon.png', 48)):
    icon(size).save(out(rel))
# Android adaptive: transparent foreground inside the 66 % safe zone, background apart.
centred(Image.new('RGBA', (512, 512), (0, 0, 0, 0)), sprite(22)).save(out('assets/android-icon-foreground.png'))
background(512).save(out('assets/android-icon-background.png'))
centred(Image.new('RGBA', (432, 432), (0, 0, 0, 0)), sprite(18, (255, 255, 255, 255))).save(out('assets/android-icon-monochrome.png'))
# Splash: Pip on transparent, shown over the #1e2448 splash background.
centred(Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)), sprite(40)).save(out('assets/splash-icon.png'))
print('ok', EXPRESSION, MOOD, f'{W}x{H}')

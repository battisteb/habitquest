from PIL import Image, ImageDraw
import sys, os
out = sys.argv[1]
N = 16
W, S, G, GD, B, F, O, Y, K = '#f0f0ff', '#a9aed6', '#f5c518', '#c9960c', '#8b4a2b', '#e94560', '#ff8a3d', '#ffe066', '#0d0f1c'
px = {}
for t in range(8):                      # blade, 2 px thick, bottom-left to top-right
    px[(13 - t, 2 + t)] = W
    px[(14 - t, 2 + t)] = S
px[(14, 1)] = W
for k in range(-2, 3):                  # cross-guard
    px[(6 + k, 9 + k)] = G if k else GD
for x, y in [(5, 10), (4, 11), (3, 12)]:  # grip
    px[(x, y)] = B
for x, y in [(1, 13), (2, 13), (1, 14), (2, 14)]:  # pommel
    px[(x, y)] = G
flame = {                               # streak flame, bottom-right
    9: {12: F}, 10: {11: F, 12: F}, 11: {10: F, 11: O, 12: F, 13: F},
    12: {10: F, 11: O, 12: O, 13: F}, 13: {10: F, 11: O, 12: Y, 13: O, 14: F},
    14: {10: F, 11: O, 12: Y, 13: O, 14: F}, 15: {11: F, 12: F, 13: F},
}
for y, row in flame.items():
    for x, c in row.items():
        px[(x, y)] = c
# 1 px dark outline around the sprite
outline = {}
for (x, y) in px:
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        p = (x + dx, y + dy)
        if p not in px and 0 <= p[0] < N and 0 <= p[1] < N:
            outline[p] = K

def sprite(scale, pad):
    img = Image.new('RGBA', (N * scale + 2 * pad, N * scale + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for layer in (outline, px):
        for (x, y), c in layer.items():
            d.rectangle([pad + x * scale, pad + y * scale, pad + (x + 1) * scale - 1, pad + (y + 1) * scale - 1], fill=c)
    return img

def background(size):
    bg = Image.new('RGB', (size, size), '#1e2448')
    d = ImageDraw.Draw(bg)
    for r in range(size // 2, 0, -4):   # soft radial glow, stepped for a pixel feel
        t = r / (size / 2)
        c = tuple(int(a + (b - a) * (1 - t)) for a, b in zip((30, 36, 72), (58, 68, 128)))
        d.ellipse([size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r], fill=c)
    return bg

os.makedirs(out, exist_ok=True)
# iOS / store icon: 1024, sprite fills ~70 %
icon = background(1024).convert('RGBA')
sp = sprite(44, 0)
icon.alpha_composite(sp, ((1024 - sp.width) // 2, (1024 - sp.height) // 2))
icon.convert('RGB').save(f'{out}/icon.png')
# Android adaptive: transparent foreground inside the 66 % safe zone
fg = Image.new('RGBA', (512, 512), (0, 0, 0, 0)); sp2 = sprite(20, 0)
fg.alpha_composite(sp2, ((512 - sp2.width) // 2, (512 - sp2.height) // 2)); fg.save(f'{out}/android-icon-foreground.png')
background(512).save(f'{out}/android-icon-background.png')
mono = Image.new('RGBA', (432, 432), (0, 0, 0, 0)); sp3 = sprite(17, 0)
a = sp3.split()[3]; white = Image.new('RGBA', sp3.size, (255, 255, 255, 255)); white.putalpha(a)
mono.alpha_composite(white, ((432 - sp3.width) // 2, (432 - sp3.height) // 2)); mono.save(f'{out}/android-icon-monochrome.png')
# Splash: sprite on transparent, shown over the #1e2448 splash background
sp4 = sprite(40, 0); splash = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
splash.alpha_composite(sp4, ((1024 - sp4.width) // 2, (1024 - sp4.height) // 2)); splash.save(f'{out}/splash-icon.png')
icon.convert('RGB').resize((48, 48), Image.NEAREST).save(f'{out}/favicon.png')
print('ok')

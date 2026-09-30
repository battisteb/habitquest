from preview import *
from base import BODY, HAIR
from outfits import OUTFITS
C = {'outfit_peasant': ('#8B7355', '#6b5b45', '#c9a86a'), 'outfit_leather': ('#8B4513', '#654321', '#caa25a'),
     'outfit_forest': ('#2d6a2e', '#1a3a10', '#8bc34a'), 'outfit_mage': ('#4B0082', '#6A0DAD', '#f0c43c'),
     'outfit_ice': ('#7fd3f7', '#0288D1', '#e0f7ff'), 'outfit_crimson': ('#B71C1C', '#880E0E', '#d9d9d9'),
     'outfit_golden': ('#DAA520', '#B8860B', '#fff3b0'), 'outfit_royal': ('#6a1b9a', '#4A148C', '#f0c43c'),
     'outfit_shadow': ('#262640', '#1a1a2e', '#7b68ee')}
sheet([([BODY, OUTFITS[k], HAIR], palette(p=p, q=q, x=x)) for k, (p, q, x) in C.items()], 'outfits.png', 6)

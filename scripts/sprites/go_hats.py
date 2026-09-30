from preview import *
from base import BODY, HAIR, TUNIC
from hats import HATS
C = {'hat_adventurer': ('#8B7355', '#b5402f'), 'hat_knight': ('#8a95a5', '#c0c0c0'), 'hat_pirate': ('#2a2a2a', '#e8c35a'),
     'hat_wizard': ('#4B0082', '#f0c43c'), 'hat_viking': ('#8a7a60', '#eee8dc'), 'hat_samurai': ('#8B0000', '#e0b84a'),
     'hat_crown': ('#d8324a', '#DAA520')}
from base import HAIR
from hats import SHOWS_HAIR
C['hat_halo']=('#fff6c2','#FFD700'); C['hat_dragon']=('#5a0a0a','#c0392b')
sheet([([BODY, TUNIC] + ([HAIR] if k in SHOWS_HAIR else []) + [HATS[k]], palette(a=a, x=x)) for k, (a, x) in C.items()], 'hats.png', 7)

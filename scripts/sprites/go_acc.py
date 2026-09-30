from preview import *
from base import BODY, HAIR, TUNIC
from accessories import ACCESSORIES
C = {'acc_shield_wood': ('#9a6b3a', '#6b6b6b'), 'acc_shield': ('#8a95a5', '#b22222'), 'acc_sword': ('#d0d6de', '#8B7355'),
     'acc_flame_sword': ('#ffb347', '#e0452a'), 'acc_scarf': ('#e94560', '#f0c43c'), 'acc_amulet': ('#7b68ee', '#e0b84a'),
     'acc_cape': ('#9b1b1b', '#DAA520'), 'acc_wings': ('#eeeeee', '#FFD700'), 'acc_aura': ('#7B68EE', '#c77dff')}
def layers(k):
    where, g = ACCESSORIES[k]
    return [g, BODY, TUNIC, HAIR] if where == 'back' else [BODY, TUNIC, HAIR, g]
sheet([(layers(k), palette(a=a, x=x)) for k, (a, x) in C.items()], 'acc.png', 6)

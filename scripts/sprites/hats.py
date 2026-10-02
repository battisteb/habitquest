from base import mirror, grid

def top(rows):  # hats only use the top rows
    return mirror(rows)

HATS = {
  'hat_adventurer': top([
"................", "................", "................",
"..........oooooo",  # 3
".........oaaaaaa",
"........oagaaaaa",
".......oaaaaaaaa",
".......oAAAAAxxx",  # 7 band
".....ooAAAAAAAAA",
"....oaaaaaaaaaaa",  # 9 brim
".....ooooooooooo",
  ]),
  'hat_knight': top([
"................",
"...........ooooo",  # 2
".........ooaaaaa",
"........oagaaaaa",
".......oagaaaaaa",
".......oaaaaaaax",  # 6 crest ridge
".......oaaaaaaax",
".......oAaaaaaax",
".......oAoooooxx",  # 9 visor slit
".......oAaaaaaaa",
".......oAAoooooo",
".......oAo......",
"........o.......",
  ]),
  'hat_pirate': top([
"................", "................",
".............ooo",  # 3
"...........ooaaa",
".....oo...oaaaaa",
"....oaaooaaaaaax",
"....oaaaaaaaaxyx",  # 7 skull emblem
".....oaaaaaaaaxx",
"......oAAAAAAAAA",
"......oxxxxxxxxx",  # 10 gold trim
".......ooooooooo",
  ]),
  'hat_wizard': top([
"...............o",  # 0 tip
"..............oa",
".............oaa",
"............oaga",
"...........oagax",  # 5 star
"..........oaaaxy",
".........oaaaaax",
"........oAAAAAAA",
".......oAxxxxxxx",  # 9 gold band
"....ooaaaaaaaaaa",  # 10 brim, above the eyes
".....ooooooooooo",
  ]),
  'hat_viking': top([
".....oo.........",
"....oxxo........",
"....oxyo........",
"....oxxo...ooooo",  # 4 horns
"....oxxxooaaaaaa",
".....oxxoagaaaaa",
"......ooaaaaaaaa",
".......oaaaaaaaa",
".......oAAAAAAAA",
".......oxoxoxoxo",  # 10 rivets band
"........ooooooo.",
  ]),
  'hat_samurai': top([
".........oo.....",
"........oxxo....",
".........oxxooo.",  # 4 crescent crest
"..........oxxaaa",
".........ooaaaaa",
"........oagaaaaa",
".......oaaaaaaaa",
"......oAAAAAAAAA",
"....ooaaoaaoaaoa",  # 10 neck guard plates
"....oAAoAAoAAoAA",
".....ooooooooooo",
  ]),
  'hat_crown': top([
"................", "................",
"........o...o...",
".......oxo.oxo..",  # 3 points
".......oxo.oxo.o",
".......oxxoxxxox",
".......oxyxxxxxx",
".......oXXXaXXXX",  # 7 jewels
".......oxxxxxxxx",
"........oooooooo",
  ]),
  # Premium item of the month, October 2026.
  'hat_pumpkin': top([
"...............o",
"..............ox",
"..........ooooox",
"........ooaagaAa",
".......oaagaaAaa",
"......oaagaaaAaa",
"......oaaaaaaAaa",
"......oaaaaaaAaa",
"......oAaaaaaAaa",
".....ooAAAAAAAAA",
".....ooooooooooo",
  ]),
  # Premium item of the month, December 2026.
  'hat_winter': top([
"..............oo",
".............oxy",
".............oxx",
"..........oooooo",
"........ooaagaaa",
".......oaagaaaaa",
"......oaaaaaaaaa",
"......oAaaaaaaaa",
".....oxxxxxxxxxx",
".....oxXxxXxxXxx",
".....ooooooooooo",
  ]),
}

# These two keep the hair visible (drawn over it).
HATS['hat_halo'] = top([
"................",
"..........oooooo",
".........oxxxxxx",  # 2 ring
"........oxyooooo",
".........oxxxxxx",
"..........oooooo",
])
HATS['hat_dragon'] = top([
"................",
"......oo........",
".....oxo........",
".....oxxo.......",
"......oxxo......",  # 4 horns
"......oxxxo.....",
".......oxXo.....",
"........oo......",
])
SHOWS_HAIR = {'hat_halo', 'hat_dragon'}

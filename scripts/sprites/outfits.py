from base import mirror

def torso(rows):
    """Rows 19-26 of the left half; the rest is empty."""
    return mirror(["................"] * 19 + rows)

OUTFITS = {
  # Rope-belted tunic with patches.
  'outfit_peasant': torso([
"..........oppp..",
".........opppppp",
"........opPoPppp",
"........opPoPpqp",
"........o..oPppp",
"...........oxxxx",
"............oPpp",
  ]),
  # Leather jerkin with straps and buckles.
  'outfit_leather': torso([
"..........oppp..",
".........oPpppxp",
"........opPoPpxp",
"........opPoPpxp",
"........opPoPpxp",
"...........obbbB",
"............oPPp",
  ]),
  # Hooded ranger: collar hood + leaf clasp.
  'outfit_forest': torso([
".........oppppqq",
"........opppppqx",
"........opPoPppp",
"........opPoPlpp",
"........opPoPppp",
"...........obbbB",
"............oPpp",
  ]),
  # Long mage robe with golden trim down to the feet.
  'outfit_mage': mirror(["................"] * 19 + [
"..........opppxx",
".........opppppx",
"........oppPoppx",
"........oppPoplx",
"........oppPoppx",
"........opoPpppx",
"...........oPppx",
"...........oPppx",
"...........oPppx",
"...........oPppx",
"...........oxxxx",
  ]),
  # Plate armour: pauldrons, breastplate highlight.
  'outfit_ice': torso([
".......ooopppo..",
"......oplpppplpp",
"......oPPoPplppp",
".......oPoPpplpp",
"........o..oPPpp",
"...........oxxxx",
"............oPpp",
  ]),
  'outfit_crimson': torso([
".......ooopppo..",
"......oplpppplpp",
"......oPPoPpxppp",
".......oPoPpxxpp",
"........o..oPPpp",
"...........obbbB",
"............oPpp",
  ]),
  'outfit_golden': torso([
".......ooopppo..",
"......oplppppllp",
"......oPPoPplxlp",
".......oPoPppxpp",
"........o..oPPpp",
"...........oxxxx",
"............oPPp",
  ]),
  # Royal vestments: fur collar, sash.
  'outfit_royal': torso([
"........oowwwwww",
".......owwpppppp",
"........opPoPxpp",
"........opPoPpxp",
"........opPoPppx",
"...........oxxxx",
"............oPpp",
  ]),
  # Shadow cloak: hood falls on the shoulders, cloak to the knees.
  'outfit_shadow': mirror(["................"] * 18 + [
"........oooopppp",
".......oppppPppp",
"......oppPoPpppp",
"......oppPoPpppp",
"......oppPoPpppp",
"......oPpPoPpppp",
"......oPPo.oPPpq",
"......oPo...oPpp",
".......o.....oPp",
  ]),
}

W = 32

def grid(rows):
    rows = [r.ljust(W, '.') for r in rows]
    rows += ['.' * W] * (W - len(rows))
    assert len(rows) == W and all(len(r) == W for r in rows), [(i, len(r)) for i, r in enumerate(rows) if len(r) != W]
    return rows

def mirror(half):
    """16-char left halves -> symmetric 32-char rows."""
    out = []
    for i, h in enumerate(half):
        h = h.ljust(16, '.')
        assert len(h) == 16, (i, h)
        out.append(h + h[::-1])
    return grid(out)

# Bare hero: head, neck, torso, arms, legs, feet.
BODY = mirror([
"................",  # 0
"................",
"................",
"................",
"................",
"................",  # 5
"..........oooooo",  # 6 head top (flat)
"........oossssss",
"........osssssss",
"........osssssss",
"........osssssss",  # 10
"........ossewsss",  # eyes
"........osseesss",
"........occsssss",  # cheeks
"........oSssssss",
"........oSsssssm",  # 15 mouth
"........oSSsssss",  # square jaw
".........oSSSSSS",
"..........oooooo",  # 18 chin on the shoulders
"..........oooSss",
".........osssssS",  # 20 shoulders / torso
"........ossossss",
"........ossossss",
"........ossossss",
"........oSsossss",
"........osso.ooo",  # 25 hands, hips
".........oo.onno",
"............onno",
"............onno",
"............oNno",
"...........offfo",  # 30 feet
"...........ooooo",
])

# Default hair (drawn when no hat).
HAIR = mirror([
"................",
"................",
"................",
"................",
"................",
"..........oooooo",  # 5
".........ohhhhhh",
"........ohhhLLhh",
".......ohhhLhhhh",
".......ohhHhhhHh",
".......ohoHho.oH",  # 10 bangs
".......oo.......",
])

# Default tunic.
TUNIC = mirror([
"................",
"................", "................", "................", "................",
"................", "................", "................", "................", "................",
"................", "................", "................", "................", "................",
"................", "................", "................", "................",
"..........oppp..",  # 19 collar
".........opppppp",  # 20
"........opPoPppp",
"........opPoPlpp",
"........o..oPppp",
"...........obbbB",  # 24 belt
"............oPpp",  # 25 hem
])

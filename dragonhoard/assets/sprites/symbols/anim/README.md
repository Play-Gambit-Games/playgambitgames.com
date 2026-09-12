# Idle frame overlays for the scatter and the wild

`sc_glow.{webp,json}` and `wd_glow.{webp,json}`. Built by
`scripts/build_symbol_anim.py`, judged by `scripts/compare_symbol_anim.py`.

These are **additive light overlays, not replacement symbols.** Each frame carries only
the light to add, with the light's hue in RGB and its intensity in alpha, so under
`blendMode="add"` the contribution is `rgb * a`. They composite identically on the
opaque tile and on a transparent cutout, and they cannot damage the art underneath.

## Wiring contract

Five things, and the third is the one that will bite.

1. One `<AnimatedSprite>` with `blendMode="add"`, drawn **after** the base `<Sprite>` and
   **before** the idle glint, so the layer order stays
   `bloom -> base -> overlay -> glint`.

2. Play at `meta.fps` from the JSON, not a hardcoded number. It is 15, the loop is 36
   frames, and a 2.4 second cycle is load bearing: the wild's beat holds shut for 0.34s
   inside it.

3. **Draw it at `ART`, not at `SYMBOL_SIZE`.**

   ```svelte
   import { SYMBOL_SIZE, SYMBOL_ART_SCALE } from '../game/constants';
   const ART = SYMBOL_SIZE * SYMBOL_ART_SCALE;
   ...
   <Sprite key={...} width={ART} height={ART} anchor={0.5} />
   <AnimatedSprite ... width={ART} height={ART} anchor={0.5} blendMode="add" />
   ```

   The overlay covers the **same 512px source frame** as the base texture, so it has to
   be drawn at the same size the base is. `SymbolShape.svelte` draws the base at `ART`
   because `SYMBOL_ART_SCALE` is above 1: the nine textures were composed around a whole
   tile, so once the furniture is cut off the subject fills only 0.48 to 0.75 of its
   canvas. Draw the overlay at bare `SYMBOL_SIZE` and it misregisters against its own
   base by 30%, which reads as a bug rather than a beat.

   **Read the constant, do not copy the number.** It is a tuning value and it has already
   moved once.

4. Only SC and WD have overlays. Everything else on the board keeps the procedural
   treatment alone, and `hasIdleLife` still gates that on tier `high` or `wild`.

5. **Frame names carry the symbol code: `sc_1.png`, not `1.png`.**

   PIXI's texture Cache is global and keyed by frame name, and `Spritesheet.parse()`
   registers every frame in it. These two sheets are 36 frames each and
   `coin/treasure_coins.json` is 4, so while all three named their first frame `1.png`
   the second and third to parse collided on every overlapping key and PIXI logged
   `[Cache] already has key: 1.png` for each one: exactly 36 + 4 = 40 warnings on every
   boot, measured on the shipped build.

   Nothing rendered wrong, and it is worth knowing why before anyone goes hunting a
   texture bug. `pixi-svelte`'s `PROCESS_METHOD_MAP.spriteSheet` returns
   `Object.values(rawAsset.textures)`, the Spritesheet instance's own map, so each atlas
   keeps its own frames and never reads through the poisoned global cache. It is fixed
   anyway because a clean console is an explicit Stake approval item, and 40 warnings is
   what a reviewer sees the moment they open one.

   Frame ORDER is what `game/symbolAnim.ts` consumes, via `Object.values` in insertion
   order. Neither the old names nor the new ones are integer-like strings, so JSON key
   order is preserved either way and the 36-frame loop is unchanged. Any atlas added to
   this game later needs its own prefix for the same reason.

## Do not regenerate casually

The user has signed off on these files. Blobs as shipped, re-verified 2026-09-11:

```
sc_glow.webp  ffe174d8717aa37272702e4fbbf2b45742f12a24
sc_glow.json  e0edec45e166cc09a5111d4e08850c31d52f463f
wd_glow.webp  4859b99a7808e935583e272e23109461adb593ac
wd_glow.json  67ac82c45b6c8cc15a232aa30c8a96bdb2ffe1fe
```

`git hash-object <file>` to check.

### Two corrections to what this file used to say

**The webp hashes above are not the ones this file used to list.** It named
`b477def49204573b98ed7b7153a2dca5f25a82be` for `sc_glow.webp` and
`95262c41a74a3f33a75133924435e355d7e9d616` for `wd_glow.webp`, and said those two "are the
originals and have not moved". They moved: commit `9d30bb48` ("Give the wild a word you can read,
and rebuild everything keyed to its eye") rebuilt both sheets and did not update this file, so
anyone checking the four hashes before committing would have found two mismatches and had no way
to tell whether that was their own doing.

**A rebuild IS byte reproducible here.** This file said it is not, and that a rebuild re-encodes
larger than the shipped blobs on this machine's libwebp. Measured 2026-09-11: running
`python3 scripts/build_symbol_anim.py` with no arguments reproduced all four files byte for byte,
hash for hash, with a maximum per-pixel difference of zero on both sheets. The warning was true of
the state this file was written in and is not true now.

That measurement also answers a live question. The 2026-09-11 asset inventory recorded `wd_glow`
as "derived from the PREVIOUS wild master", which would have meant the overlay drawn over the wild
on every resting frame was keyed to art wild v2 replaced, and the plan's item 10 asked for a
rebuild to fix it. It does not need one: the rebuild against today's shipped `WD.webp` reproduces
today's shipped `wd_glow` exactly, so the overlay is already keyed to the current wild. The
inventory row is wrong and this paragraph is the evidence.

What stays true: the builder prefers `static/assets/sprites/symbols-cutout/` when it exists and
falls back to a plate median estimate when it does not. That directory is not tracked in this
repo and was absent for the shipped build, which is why the fallback path is the reproducible
one. A checkout that has it will produce a genuinely different asset. Rebuild when the symbol art
changes, and re-measure with `compare_symbol_anim.py` when you do.

Full derivation, measurements and the flash safety numbers are in `AGENT-REPORT.md` at
the repo root.

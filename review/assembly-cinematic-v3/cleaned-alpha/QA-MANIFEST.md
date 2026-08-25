# Assembly cinematic v3 — transparent asset QA

## Method

Local Pillow boundary-connected matting was used on existing RGB checkerboard renders. The process identifies bright, low-chroma background pixels connected to the image boundary, retains the largest coherent foreground component, applies a restrained sub-pixel feather, and extends foreground color through the feather to prevent a baked white/gray matte.

- No ImageGen or external API was used.
- No software was installed.
- Original source candidates were not overwritten.
- Previously approved assets were preserved unchanged.
- Output alpha was checked over white, black, neutral gray, and Foundation green `#0b7f47`.

## Production-ready assets

Pillow alpha bounds below use exclusive right/bottom coordinates.

| Asset | Dimensions | Alpha bounds | Corner alpha | Status |
| --- | ---: | --- | --- | --- |
| `closed-anchor-v2.png` | 1254×1254 RGBA | `(27,184)-(1229,1075)` | `0,0,0,0` | Preserved approved anchor; both translucent LED barrels retained |
| `../production-candidates/enclosure-front-v1.png` | 1254×1254 RGBA | `(55,192)-(1236,1170)` | `0,0,0,0` | Preserved approved enclosure front |
| `enclosure-reverse-v1.png` | 1254×1254 RGBA | `(66,187)-(1195,1049)` | `0,0,0,0` | Pass; reverse/interior alternate cleaned without checker fringe |
| `../production-candidates/solar-lid-front-v2.png` | 1536×1024 RGBA | `(0,84)-(1536,1002)` | `0,0,0,0` | Preserved approved solar lid front |
| `module-front-v3.png` | 1254×1254 RGBA | `(90,241)-(1254,972)` | `0,0,0,0` | Preserved approved module front; wires and pins retained |
| `module-edge-v1.png` | 1254×1254 RGBA | `(232,234)-(1254,925)` | `0,0,0,0` | Pass; edge/three-quarter alternate cleaned; right-side wires and board pins retained |
| `battery-front-v3.png` | 1254×1254 RGBA | `(58,159)-(1200,1181)` | `0,0,0,0` | Preserved approved battery front; foil and wires retained |
| `battery-edge-v1.png` | 1254×1254 RGBA | `(230,189)-(999,998)` | `0,0,0,0` | Pass; edge alternate cleaned; bright foil, amber wrap, and both wires retained |
| `led-pair-front-v3.png` | 1254×1254 RGBA | `(149,117)-(1092,1033)` | `0,0,0,0` | Preserved approved LED pair; pins and translucent barrels retained |

## Explicit source gaps

These views were not fabricated from mismatched imagery. No dedicated alternate exists in the current v3 candidates or older local assembly image pack.

| Requested view | Status |
| --- | --- |
| Battery reverse | Gap — edge view is available, but no true reverse source exists |
| Module back | Gap — edge/three-quarter view is available, but no true board-back source exists |
| LED three-quarter | Gap — only the approved front pair exists |
| Solar lid edge | Gap — only the approved front/oblique lid exists |
| Solar lid back | Gap — no back source exists |

## Contact sheets and proofs

- `contact-sheet-neutral.jpg` — all and only the nine production-ready candidates on neutral gray.
- `contact-sheet-green.jpg` — the same nine candidates on Foundation green `#0b7f47`.
- `qa-contact-sheet-white.jpg` — QA proof on white.
- `qa-contact-sheet-black.jpg` — QA proof on black.

Normal-size and full-resolution inspection found no visible checkerboard islands or white/gray matte on the three new cutouts. The translucent LED barrels, battery foil and wires, and module wires/pins remain intact.

## Reproduction

`../finalize_asset_pack.py` reproduces the three deterministic cutouts and the four QA/contact sheets from the untouched v3 source candidates.

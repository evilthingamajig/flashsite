# Feature-flagged 3D assembly prototype (`?ffasm=3d`)

Gray-model checkpoint per `THREEJS-BUILD-BRIEF.md`. The approved PNG assembly
remains the default; this prototype activates **only** with the `ffasm=3d`
query flag on the homepage.

## Local preview URL

```powershell
python -m http.server 8000
# then open:
http://127.0.0.1:8000/index.html?ffasm=3d
```

Any static file server rooted at the repo works. No build step, no CDN, no
runtime AI/network dependencies — Three.js r160 and GLTFLoader are vendored
and pinned under `js/vendor/three/`.

- Default page (no flag): unchanged PNG scroll assembly.
- `?ffasm=3d`: canvas prototype in the same `#assembly-sequence` section.
- If WebGL or module loading fails, the flag mode degrades silently and the
  accessible HTML component list remains in place.

## Asset pipeline

```powershell
node tools\build-assembly-glb.mjs      # rebuilds assets/3d/flashlight-assembly.glb
node tools\verify-assembly3d.mjs       # static + headless Chrome verification
node tools\verify-assembly3d.mjs --quick   # fewer scroll samples
```

- Sources: `source-assets/stl/enclosure.stl` (binary Blender STL, 84 x 84 x
  13.5 mm, Z -5.75..7.75, 1.5 mm floor slab, ~3 mm walls) and
  `source-assets/stl/switch.stl` (48.816 x 7.971 x 10.429 mm, seated in its
  actual +Y aperture).
- The builder works in millimetres, repairs degenerate/duplicate faces
  without moving surviving vertices (silhouette preserved), and converts to
  metres on GLB export.
- Procedural parts (mm): solar lid 80 x 80 x 2.5 seated on the rim (z 7.75
  to 10.25); battery 42 x 30 x 5 on the inner floor (top z -4.25) at
  (0, -20); charge module 26.3 x 17.1 x 5.6 at (0, 8); two 3 mm LEDs
  piercing the -Y wall at x = +/-8. Interior corner ribs and the +Y switch
  housing were scanned from the mesh to keep seats collision-free.
- Output: one GLB, 6 named nodes (`enclosure`, `switch`, `solar_lid`,
  `battery`, `charge_module`, `led_pair`), 1,749 triangles, 140,532 bytes
  (limits: 5,000 tris / 250 KB). Rebuilds are byte-identical (SHA-256
  checked); `assets/3d/assembly-manifest.json` records provenance, seats,
  bounds, and the seating collision report.

## Timeline

One deterministic, reversible scroll timeline (pure function of scroll
progress): intro (assembled) -> explode -> six inspection chapters (lid,
battery, module, LEDs, switch, enclosure; each lifts, turns 160-210
degrees with cubic ease-in-out, holds with zero velocity, returns; exactly
one primary part moves and one callout is active) -> reassembly in the
order enclosure, switch, LED pair, charge module, battery, lid -> final
seated hold. Final seating equals the GLB seat transforms exactly
(`window.__ffasm3d.seatedCheck()`).

Camera distance is solved every frame from the projected bounds of the
framed subject against the pane with hard clearance insets; during chapter
blends the whole-assembly and active-part framings are interpolated.
Non-active parts dim to 25% opacity during inspection for focus; meshes are
never swapped or replaced by imagery.

## Verification (automated, headless Chrome via CDP)

`node tools\verify-assembly3d.mjs` — 71/71 checks passing at 1440 x 900 and
390 x 844:

- GLB budget, node names, manifest provenance, builder determinism.
- Model lazy-loads; rendering pauses offscreen/hidden (IntersectionObserver
  + visibilitychange); DPR capped at 1.75.
- Full-timeline sampling at 41 points: at most one active callout, zero
  horizontal overflow, silhouette within pane clearances (>= 32 px
  horizontal / >= 40 px vertical desktop; >= 16 px mobile; <= 86 vw and
  <= 46 svh mobile).
- At each chapter hold: silhouette fills 58-68% of the pane (measured on
  the pane's binding dimension; see notes), clearances hold, and the
  leader endpoint lands within 1.5 px of the projected mesh-local anchor
  (measured 0.00 px).
- Reverse scrub determinism: 14 absolute scroll positions revisited
  top-to-bottom reproduce identical state.
- Final seating geometrically continuous; footer reachable in one descent;
  zero console errors at both viewports.
- Screenshots: `review/assembly-3d/*.png`; machine results:
  `review/assembly-3d/report.json`.

## Interpretation notes

- "58-68% of its visual pane" is enforced as the silhouette filling
  58-68% of the pane's binding (larger) projected dimension. A
  height-only reading is geometrically impossible for the wide, flat
  switch/battery slabs once the mandated clearances also hold.
- The desktop "visual pane" is the stage minus the callout gutters and
  safe margins; mobile subtracts the docked callout height.

## Known visual gaps (gray-model checkpoint)

- Deliberately untextured gray PBR material; no photographic look yet.
- LEDs pierce the solid -Y wall (the source enclosure has no LED holes);
  the intersection is visible up close.
- The switch seat keeps its authoritative transform; the source data
  grazes the aperture's lower-left floor fillet by ~0.4 mm (left as-is to
  avoid altering the silhouette).
- Procedural parts are plain primitives: no USB lip on the charge module,
  no cell detail on the battery, plain slab lid without panel framing.
- Leader lines are 1 px hairlines with 3 px dots; callout typography reuses
  the site palette but the 3D scene has no shadows/bloom by design.
- During chapter camera blends, dimmed background parts may briefly cross
  the pane edges; the active part always holds its clearances.

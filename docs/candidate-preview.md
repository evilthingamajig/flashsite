# Candidate preview (`candidate-preview.html`)

Standalone local viewer for the gated Blender candidate asset
`assets/3d/flashlight-assembly-blender-candidate.glb`. **Candidate-only and
gated:** this page is not linked from any production navigation, is marked
`noindex, nofollow`, and must not be promoted or deployed without an
independent visual review (see `docs/blender-candidate.md`). The approved
production GLB and `index.html` are untouched.

## Local URL

```powershell
python -m http.server 8000
# then open:
http://127.0.0.1:8000/candidate-preview.html
```

Any static file server rooted at the repo works. No build step; Three.js
r160 and GLTFLoader are vendored under `js/vendor/three/` via import map.
No external network assets.

## What it does

- Full-screen dark neutral stage in the Flash Forward visual language
  (Lausanne type, green accent, hairline borders), with a compact accessible
  parts list, a collapsible supplied solar-reference panel, a bottom scrub
  progress indicator, direct timeline/reset controls, restrained helper copy,
  and a live loading/status pill.
- The timeline range input and Reset button mirror the scroll position. Reset
  uses an instant seek when `prefers-reduced-motion: reduce` is enabled.
- The live status pill identifies the current pose as `Closed`, `Scrubbing`,
  or `Exploded`, and the progressbar exposes the same state through
  `aria-valuetext`.
- Scrub is deterministic: scroll progress maps to
  `THREE.AnimationMixer.setTime(progress * duration)` on one mixer bound to
  the GLB scene root. Every clip whose name starts with `ScrollSequence`
  (`ScrollSequence`, `.001`, … — one per part) is activated as a
  `LoopOnce` + `clampWhenFinished` action, so all parts scrub together;
  `action.paused` is cleared before each absolute seek so reverse
  scrubbing never sticks at the final frame.
- Camera framing interpolates between the closed (p=0) and exploded (p=1)
  bounds with a slow azimuth/elevation drift; everything is a pure function
  of progress.

## Performance and fallbacks

- Render-on-demand: rendering pauses when the stage is offscreen
  (IntersectionObserver) or the document is hidden (visibilitychange).
- Pixel ratio capped at 1.75.
- Text fallback replaces the canvas when WebGL is unavailable or the GLB
  fails to load; the parts list remains readable, and a `<noscript>` notice
  covers JS-less browsing.

## Files added

- `candidate-preview.html`
- `js/candidate-preview.js`
- `css/candidate-preview.css`
- `docs/candidate-preview.md`

## Verification

```powershell
node --check js\candidate-preview.js
node tools\verify-candidate-preview.mjs
```

The tracked headless Chrome check (via `tools/cdp.mjs`, SwiftShader): page loads
with zero console errors, reports ready state with 7 ScrollSequence clips at
4.17 s, scrubs to p=0 / p=0.5 / p=1 and back deterministically, exposes the
timeline/reset controls, and keeps
`renderPaused` true while the document is hidden. Candidate diagnostics also
prove transform separation: `battery` and `charge_module` report distinct
world positions at progress 0 versus 1 (closed vs exploded), confirming the
per-part ScrollSequence actions move each part independently. The preview is checkpointed
locally but remains intentionally unlinked from production navigation. The
same smoke check also validates the 390 × 844 mobile layout for overflow and
control reachability.

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

For a shareable starting pose, append `?p=0` for closed, `?p=0.67` for the
exploded review tableau, or `?p=1` for the reassembled final view. Intermediate
numeric values open at the corresponding scrub point; deep links seek
instantly on load so browser scroll restoration cannot override the requested
pose.

Any static file server rooted at the repo works. No build step; Three.js
r160 and GLTFLoader are vendored under `js/vendor/three/` via import map.
No external network assets.

## What it does

- Full-screen dark neutral stage in the Flash Forward visual language
  (Lausanne type, green accent, hairline borders), with a compact accessible
  parts list, a collapsible supplied solar-reference panel, a bottom scrub
  progress indicator, direct timeline/reset controls, restrained helper copy,
  and a live loading/status pill.
- The parts list stays open by default on desktop and starts collapsed below
  760px so the mobile product view remains visible; it remains a native,
  user-expandable disclosure.
- The timeline range input and Reset button mirror the scroll position. Reset
  uses an instant seek when `prefers-reduced-motion: reduce` is enabled.
- The live status pill identifies the current pose as `Closed`, `Scrubbing`,
  `Exploded`, or `Reassembled`, and the progressbar exposes the same state through
  `aria-valuetext`.
- Scrub is deterministic: scroll progress maps to
  `THREE.AnimationMixer.setTime(progress * duration)` on one mixer bound to
  the GLB scene root. Every clip whose name starts with `ScrollSequence`
  (`ScrollSequence`, `.001`, … — one per part) is activated as a
  `LoopOnce` + `clampWhenFinished` action, so all parts scrub together;
  `action.paused` is cleared before each absolute seek so reverse
  scrubbing never sticks at the final frame.
- The scrub rail carries three decorative chapter markers: `Closed` at 0%,
  `Exploded review` at 67%, and `Reassembled` at 100%. They do not alter the
  scroll mapping or live status text.
- Camera framing interpolates between the closed (p=0) and exploded-review
  (p=0.67) bounds with a slow azimuth/elevation drift, then settles into a
  distinct measured three-quarter product angle as the product reassembles at
  p=1; everything is a pure function of progress, extended with responsive
  portrait framing: when `camera.aspect < 0.9` the interpolated distance gains
  a smooth bounded multiplier,
  `min(1.75, 1 + (sin(FOV/2) / sin(atan(tan(FOV/2)·aspect)) − 1) · smoothstep(clamp01((0.9 − aspect)/0.9)))`,
  which pulls the camera back so the full product — including both seated LEDs
  — stays inside the frame at narrow mobile widths, while the multiplier is
  exactly 1 (desktop framing unchanged) at `aspect ≥ 0.9`.
- During the exploded review, one plain two-line editorial label appears at a
  time and fades to the next part as the timeline advances. Each label uses a
  dotted SVG leader and the provisional second line `Cost TBD` until
  authoritative pricing is supplied. Labels and leaders stay hidden in the
  closed and reassembled poses so the product view remains uncluttered.
- While a callout is active, its matching parts-list row(s) get a subtle green
  accent and `aria-current="step"`; both LED rows highlight together for
  `led_pair`. Highlighting clears whenever no callout is active (closed,
  reassembled, or outside the annotation band). No new elements are added.

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
5.00 s, scrubs to p=0 / p=0.67 / p=1 and back deterministically, exposes the
timeline/reset controls, and keeps
`renderPaused` true while the document is hidden. Candidate diagnostics also
prove transform separation: `battery` and `charge_module` report distinct
world positions at progress 0 versus 1 (closed vs exploded), confirming the
per-part ScrollSequence actions move each part independently. The preview is checkpointed
locally but remains intentionally unlinked from production navigation. The
same smoke check also validates the 390 × 844 mobile layout for overflow and
control reachability. It also guards closed-pose seating: both LEDs must stay
at the negative-X short end with their pair axis across Z, and the switch must
remain within the enclosure-centered seating envelope. The final deep-link
check additionally proves the movable parts return to those seats after the
exploded review.

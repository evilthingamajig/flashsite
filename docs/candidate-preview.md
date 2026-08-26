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

To avoid a port conflict with an existing server, use an alternate port such as
8001; the command must be run from the repository root so the static files are
served from this checkout:

```powershell
python -m http.server 8001
Start-Process "http://127.0.0.1:8001/candidate-preview.html"
```

For a shareable starting pose, append `?p=0` for closed, `?p=0.67` for the
exploded review tableau, or `?p=1` for the reassembled final view. Intermediate
numeric values open at the corresponding scrub point; deep links seek
instantly on load so browser scroll restoration cannot override the requested
pose.

Any static file server rooted at the repo works. No build step; Three.js
r160 and GLTFLoader are vendored under `js/vendor/three/` via import map.
No external network assets.

The candidate stylesheet, module, and GLB URLs carry the same release token.
Increment that token whenever these coordinated assets change so a full browser
cannot combine a new controller with stale cached CSS or 3D geometry.

## What it does

- Full-screen white stage in the Flash Forward visual language
  (Lausanne type, dark black-green text, green accent, hairline borders), with a compact accessible
  parts list, two collapsible media-library reference panels (the supplied
   solar reference JPG at `assets/3d/references/solarpanel.jpg` — a flat image
   only, not a solar-panel CAD model — and the flashlight-internals reference), a
   bottom scrub
  progress indicator, direct timeline/reset controls, restrained helper copy,
  and a live loading/status pill.
- The parts list starts collapsed on all viewports so part descriptions are not
  visible continuously; it remains a native, user-expandable disclosure.
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
  (p=0.67) bounds with a slow azimuth/elevation drift, then reaches a distinct
  measured three-quarter product angle at the authored reassembly boundary
  (p≈0.833) and holds it while the parts finish returning through p=1;
  everything is a pure function of progress, extended with responsive
  portrait framing: when `camera.aspect < 0.9` the interpolated distance gains
  a smooth bounded multiplier,
  `min(1.75, 1 + (sin(FOV/2) / sin(atan(tan(FOV/2)·aspect)) − 1) · smoothstep(clamp01((0.9 − aspect)/0.9)))`,
  which pulls the camera back so the full product — including both seated LEDs
  — stays inside the frame at narrow mobile widths, while the multiplier is
  exactly 1 (desktop framing unchanged) at `aspect ≥ 0.9`.
- Camera fitting samples the complete animation path and applies a restrained
  header-safe vertical offset, so intermediate inspection poses remain inside
  the viewport and below the large program title rather than only fitting the
  three named checkpoints.
- During the exploded review, one plain two-line editorial label appears at a
  time and crossfades to the next part as the timeline advances. Labels use the
  site's Lausanne type, sentence-case copy, and a dotted SVG leader; the
  provisional second line is `Cost: TBD` until authoritative pricing is supplied.
  Labels and leaders stay hidden in the
  closed and reassembled poses so the product view remains uncluttered.
- The active callout's two visible text spans are the sole polite atomic live
  announcement for assistive technology; inactive labels remain mounted for
  the visual opacity crossfade but are `aria-hidden` and never highlighted.
  The container has no redundant label that could duplicate the announcement.
- While a callout is active, its matching parts-list row(s) get a subtle accent
  and `aria-current="step"`; both LED rows highlight together for
  `led_pair`. Highlighting clears whenever no callout is active (closed,
  reassembled, or outside the annotation band). No new elements are added.

## Performance and fallbacks

- Render-on-demand: rendering pauses when the stage is offscreen
  (IntersectionObserver) or the document is hidden (visibilitychange).
- Desktop rendering uses the high-performance GPU preference and one stable
  framebuffer for both moving and settled poses: device-pixel ratio is capped
  at 1.0 with a 1.5-million-pixel budget and 0.75 lower bound. Avoiding
  mid-scrub framebuffer reallocations prevents blank flashes and resize jank.
- Only the seven major assembly parts participate in the 512 px shadow pass;
  small decorative meshes still render normally without duplicating dozens of
  shadow draw calls. Only the active editorial callout is projected each frame.
- While the timeline is actively moving, the viewer reuses the previous shadow
  map. After 140 ms idle, shadows refresh once at the settled pose without
  resizing the canvas.
- The four glass-style UI panels temporarily replace `backdrop-filter` blur
  with opaque white while scrubbing, avoiding repeated resampling of the moving
  WebGL canvas. The glass treatment returns at the same idle boundary.
- Direct range-input dragging uses immediate scroll synchronization rather than
  restarting native smooth scrolling on every pointer event; duplicate
  sub-pixel progress samples are discarded.
- WebGL context-loss fallback: on `webglcontextlost`, the handler calls
  `preventDefault()` to block the browser default, stops rendering via
  `showFallback`, and surfaces the existing parts-list-and-controls
  fallback without a reload loop.
- bfcache-safe pagehide cleanup: on `pagehide` (non-persisted), the handler
  stops all mixer actions and disposes the renderer so the page is safe for
  bfcache eviction; persisted navigations are skipped.
- Text fallback replaces the canvas when WebGL is unavailable or the GLB
  fails to load; the parts list remains readable, and a `<noscript>` notice
  covers JS-less browsing.

## Files added

- `candidate-preview.html`
- `js/candidate-preview.js`
- `css/candidate-preview.css`
- `docs/candidate-preview.md`
- `tools/verify-candidate-preview.mjs`
- `tools/build-blender-candidate.py`
- `tools/verify-blender-candidate.py`
- `tools/render-blender-candidate-review.py` — reproducible headless Blender
  render for the retained review frame.
- `assets/3d/flashlight-assembly-blender-candidate.glb`
- `assets/3d/blender-candidate-manifest.json`
- `assets/3d/references/solarpanel.jpg` — supplied solar reference image
  (flat JPG only; no solar-panel CAD/model is supplied or implied)
- `assets/3d/references/flashlight-internals-charging-board.png` —
  flashlight-internals reference shown in the second disclosure panel
- `review/blender-candidate-frame-120.png` — retained Blender review frame at
  the authored reassembly boundary (frame 120 of 120), used for visual QA of
  the closed-pose seating and camera-settle three-quarter framing.
- `review/blender-candidate-frame-60.png` — retained exploded mid-sequence
  review frame showing the separated case, panel, board, battery, LEDs, and
  switch.

The Blender review renderer explicitly binds each imported `ScrollSequence`
action to its named object and fits the camera to the requested authored pose;
for example, pass `60` to inspect the exploded mid-sequence without clipping.

## Verification

```powershell
node --check js\candidate-preview.js
node tools\verify-candidate-preview.mjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python tools\render-blender-candidate-review.py -- 120
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
control reachability, and the active one-at-a-time callout must stay inside the
viewport above the mobile parts disclosure. A reverse-scrub assertion moves
from the reassembled pose back to the exploded pose and then closed, proving
that the active leader/callout returns and hidden-state cleanup remains intact.
It also guards closed-pose seating: both LEDs must stay
at the negative-X short end with their pair axis across Z, and the transferred
long-slider switch must stay on the negative-Y case wall with a constant
switch-to-enclosure offset throughout the timeline. The final deep-link
check additionally proves the movable parts return to those seats after the
exploded review. The camera-settle assertion also guards that the three-quarter
framing is stable once authored reassembly begins. The verification suite also
validates a required runtime asset inventory (candidate file presence and MIME
types served by the local verification server), a bfcache-safe `pagehide`
cleanup (non-persisted navigations stop the mixer and dispose the renderer),
and a WebGL context-loss fallback (synthetic `webglcontextlost` event
triggers `preventDefault`, the existing fallback surfaces, and no reload loop
occurs). The current candidate suite contains 34 checks, including a focused
regression check that the active annotation is exactly two plain text lines,
with only its dotted leader visible, plus a stable scrub-render budget check
that verifies moving and settled frames use the same framebuffer allocation.

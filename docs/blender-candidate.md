# Blender candidate asset

This is a gated candidate build produced from the supplied rectangular case STL
and FreeCAD-converted meshes of the supplied TP4056, LiPo, and LED STEP files.
It does not replace `assets/3d/flashlight-assembly.glb`.

## Build and validation

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" `
  --background --factory-startup --python tools\build-blender-candidate.py
```

The exported candidate is `assets/3d/flashlight-assembly-blender-candidate.glb`.
The converted source meshes are kept under
`source-assets/external/user-supplied/`, and the supplied solar reference photo
is kept at `assets/3d/references/solarpanel.jpg`. The candidate uses that
reference for its cell layout; no solar-panel CAD was supplied.
Blender 5.2.1 imports it with these named objects:

`enclosure`, `solar_panel_placeholder`, `battery`, `charge_module`,
`led_left`, `led_right`, `switch`, and `ScrollSequence`.

The GLB contains a named `ScrollSequence` action and is approximately 2.1 MB.
The candidate was built and re-imported headlessly on the local Blender 5.2.1
installation.

## Evidence and provisional decisions

- The supplied case STL measures 105 × 65 × 15 mm; raw STL values were treated
  as millimetres and scaled to Blender metres.
- FreeCAD measurements for the supplied component sources are recorded in the
  manifest: TP4056 board 29.3 × 17.4 × 4.14 mm, LiPo 53.1 × 46.821 × 6.0 mm,
  and LED 5.58 × 6.0 × 36.5 mm.
- TP4056, LiPo, and LED STEP dimensions were validated in FreeCAD before this
  candidate was created, then tessellated into browser-safe STL meshes.
- The solar panel is a placeholder because its photo was not baked into this
  candidate.
- The supplied battery mesh has lightweight provisional yellow Kapton and
  label-plate cues parented to it; these inherit the battery's authored motion.
- Motion is authored per component: the enclosure stays stable, the panel
  reveals, the battery rolls, the board turns, the LEDs splay symmetrically,
  and the switch lifts. The exact degree values are recorded in the candidate
  manifest under `motionProfiles`.
- The second LED is a duplicate of the supplied single LED and must be
  confirmed against the final product.
- Battery, switch, solar-panel placement, and internal seating remain
  provisional until the user supplies exact mounting/wiring references.
- The existing approved GLB and its manifest remain untouched.

Do not point the production feature flag at this candidate until an independent
visual review confirms the authored action, pivots, physical seating, and
responsive web framing.

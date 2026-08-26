# Blender candidate asset

This is a gated candidate build produced from the supplied rectangular case STL
and the repository's browser-safe CAD-derived mesh derivatives. It does not
replace `assets/3d/flashlight-assembly.glb`.

## Build and validation

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" `
  --background --factory-startup --python tools\build-blender-candidate.py
```

The exported candidate is `assets/3d/flashlight-assembly-blender-candidate.glb`.
Blender 5.2.1 imports it with these named objects:

`enclosure`, `solar_panel_placeholder`, `battery`, `charge_module`,
`led_left`, `led_right`, `switch`, and `ScrollSequence`.

The GLB contains a named `ScrollSequence` action and is approximately 1.1 MB.
The candidate was built and re-imported headlessly on the local Blender 5.2.1
installation.

## Evidence and provisional decisions

- The supplied case STL measures 105 × 65 × 15 mm; raw STL values were treated
  as millimetres and scaled to Blender metres.
- TP4056, LiPo, and LED STEP dimensions were validated in FreeCAD before this
  candidate was created.
- The solar panel is a placeholder because its photo was not baked into this
  candidate.
- The second LED is a duplicate of the supplied single LED and must be
  confirmed against the final product.
- Battery, switch, solar-panel placement, and internal seating remain
  provisional until the user supplies exact mounting/wiring references.
- The existing approved GLB and its manifest remain untouched.

Do not point the production feature flag at this candidate until an independent
visual review confirms the authored action, pivots, physical seating, and
responsive web framing.

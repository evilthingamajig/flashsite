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

The exported binary can be checked directly with Blender after building:

```powershell
& "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" `
  --background --factory-startup --python tools\verify-blender-candidate.py
```

That gate checks the seven named parts, seven animation actions, measured pass9
switch dimensions, parented battery and switch detail meshes, frame bars, bus
lines, cell strips, and frame-120 return-to-seat.

The GLB contains a named `ScrollSequence` action and is approximately 2.1 MB.
The candidate was built and re-imported headlessly on the local Blender 5.2.1
installation.

An additional Blender Workbench render of frame 120 was visually inspected at
the authored three-quarter camera framing. It shows the rectangular solar
surface and cell details, enclosure depth, four panel fasteners, and both LED
heads seated on the short end. No production asset was changed during this
review.
The build removes exact duplicate triangle faces from the decimated supplied
battery and TP4056 meshes before export; Blender's invalid-mesh export warnings
are absent on the current candidate build.

## Evidence and provisional decisions

- The supplied case STL measures 105 × 65 × 15 mm; raw STL values were treated
  as millimetres and scaled to Blender metres.
- The enclosure's four interior mount posts now carry small metallic fastener
  heads parented to the posts; these are generic visual cues, not an
  authoritative fastener CAD claim.
- FreeCAD measurements for the supplied component sources are recorded in the
  manifest: TP4056 board 29.3 × 17.4 × 4.14 mm, LiPo 53.1 × 46.821 × 6.0 mm,
  LED 5.58 × 6.0 × 36.5 mm, and pass9 slide switch 4.1 × 7.82 × 6.0 mm.
- An independent FreeCAD 1.1.3 re-audit reproduced those three assembly-root
  bounds from the transferred STEP files: TP4056_Charging_Module_Type_C_v12
  at 29.300 × 17.400 × 4.140 mm, Bateria_LiPo_3_7V_1000mA_503450_v23 at
  53.100 × 46.821 × 6.000 mm, and _5mm_LED at 5.580 × 6.000 × 36.500 mm.
- TP4056, LiPo, and LED STEP dimensions were validated in FreeCAD before this
  candidate was created, then tessellated into browser-safe STL meshes. The
  TP4056 candidate now uses `tp4056-authoritative-freecad.stl`, regenerated from
  the supplied STEP assembly root with FreeCAD's 0.15 mm linear and 0.3 rad
  angular tessellation settings. After reduction, its exported envelope is
  restored to the measured 29.3 × 17.4 × 4.14 mm source bounds.
- The solar panel is a placeholder because its photo was not baked into this
  candidate; its front has a darkened cell surface with a raised pale frame
  (wider bezel bars with metallic finish), brighter bus lines, brighter
  cell-strip grid, four enlarged corner screw heads, and its rear has a
  thickened parented connector/wire cue for the exploded view.
- The supplied battery mesh has lightweight provisional silver-pouch (high-
  metallic bright foil), warm-amber Kapton, dark label plate, tinned-lead,
  and wire cues parented to it; these inherit the battery's authored motion.
- The supplied TP4056 mesh has lightweight vivid-blue PCB, bright USB-C
  port, brightened chip/resistor-bank, and input-wire cues parented to it;
  these inherit the board's authored motion.
- The supplied pass9 switch mesh has a contrasting actuator cue parented
  to it; the switch body is darker matte plastic and the actuator is
  lighter with higher contrast; the native verifier requires that child
  while preserving the measured source envelope.
- The switch also carries short red/black inward-running wire cues, parented to
  the switch so they follow its authored motion; their exact routing remains
  provisional pending authoritative wiring references.
- The enclosure carries four lightweight dark-plastic interior corner mounting
  blocks, parented to the case shell and sized from the media evidence; these
  are reference-informed candidate details, not a new authoritative CAD claim.
- Both LED meshes carry restrained parented wire cues and retain their
  negative-X short-end seats. Each LED has a small inner die cylinder
  parented to it for physical lens contrast, and the clear-lens material
  has subtle warm-white emission.
- Motion is authored per component: the enclosure stays stable, the panel
  reveals, the battery rolls, the board turns, the LEDs splay symmetrically,
  and the switch lifts. The exact degree values are recorded in the candidate
  manifest under `motionProfiles`.
- The second LED is a duplicate of the supplied single LED and must be
  confirmed against the final product.
- Battery and solar-panel placement remain provisional until the user supplies
  exact mounting/wiring references; the switch is seated against the positive-Y
  case wall so its body reads as mounted in the closed three-quarter view.
- The existing approved GLB and its manifest remain untouched.

Do not point the production feature flag at this candidate until an independent
visual review confirms the authored action, pivots, physical seating, and
responsive web framing.

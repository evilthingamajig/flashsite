# Flash Forward 3D animation handoff

## Starting point

- Repository: `https://github.com/evilthingamajig/flashsite`
- Branch: `feat/threejs-assembly-v2`
- Preserved website checkpoint: `aa6bc9a2fc1fc5d74eae89c79371313872db6722`
- The checkpoint passed 558/558 automated checks plus independent forward/reverse visual and technical review.
- Do not rewrite, squash, merge, deploy, or modify `main` without explicit user approval.
- Preserve `aa6bc9a` as the working fallback before beginning the Blender replacement.

## User intent

Replace the current browser-authored 3D choreography with a professional, scroll-scrubbed product-explosion animation. The user wants a large, screen-filling product presentation—not a square stage or generic AI landing-page treatment.

The sequence should:

1. Begin with the completed solar study light.
2. Explode it into its real physical components.
3. Present one large component at a time with concise alternating left/right copy and restrained leader lines.
4. Give each part motion appropriate to its geometry: lifts, turns, reveals, zooms, and settles rather than uniform twirling.
5. Reassemble the components physically into the finished product.
6. End on a flattering three-quarter product angle showing the solar surface, enclosure depth, and both protruding LED heads.
7. Scrub smoothly and deterministically in both directions on desktop and mobile.

Avoid blank frames, snapping, clipping, overlong holds, choppy handoffs, identical movements, excessive scroll distance, unrealistic materials, and hardcoded pose compensation.

## Delegation preference

The primary agent should coordinate, define checkpoints, and review rather than personally own most implementation. Delegate bounded implementation work primarily to Luna agents and use fresh independent reviewers after meaningful checkpoints. Do not allow agents to edit overlapping files concurrently.

Commit before and after every meaningful validated change. Do not weaken tests just to turn them green.

## Critical geometry discrepancy

The supplied `box2 5 3.stl` and repository `source-assets/stl/enclosure.stl` are byte-identical. Their measured bounds are exactly:

- 84.000 × 84.000 × 13.500 mm
- X/Y aspect ratio: 1.000

The current generated enclosure and panel are therefore genuinely square. The GLB enclosure is about 84.5 × 84.5 × 13.5 mm and the visible solar surface is 82 × 82 mm.

However, existing photographs and handwritten media-library notes indicate an approximately 100 × 60 mm rectangular solar panel/product. Treat the square STL as a temporary or potentially outdated source. Do not author final geometry until the user confirms the target footprint or supplies the authoritative rectangular STEP/STP/STL.

## Current asset limitations

The current `assets/3d/flashlight-assembly.glb` is a coarse six-node procedural assembly. Several parts and materials were invented or simplified:

- Square navy 6×6 solar-cell grid does not match the black rectangular physical panel with narrow cell strips, bus lines, frame, screws, and wires.
- Green simplified PCB does not match the blue, densely populated physical charging board.
- Battery foil is too smooth, pale, and clean; the physical LiPo has silver pouch texture, yellow Kapton, label, and leads.
- LEDs appear overly cyan and are combined into one `led_pair` node; they should be separate physical objects.
- The visible switch was invented instead of being derived from authoritative geometry.
- Runtime movement is encoded through `SOLO_MOTION`, `CHAPTERS`, `samplePartPose()`, `applyPose()`, camera-fit loops, and many corrective constants. This is the source of the brittle/choppy choreography.

## Recommended production pipeline

1. Use FreeCAD or another OCCT-based CAD tool to inspect authoritative CAD, units, solids, and dimensions.
2. Use Blender as the editable master for cleanup, pivots, materials, lighting, and animation.
3. Separate physical objects: enclosure, lid/frame, solar panel, battery, charging board, LED 1, LED 2, switch body, switch actuator, wires/connectors, screws/fasteners.
4. Establish real seated positions, origins, insertion axes, and part hierarchy.
5. Build lightweight realistic PBR materials from the physical references.
6. Animate one authored master action such as `ScrollSequence` using keyframes and Graph Editor curves. Each component must receive bespoke timing and motion.
7. Export a self-contained animated GLB.
8. Load it using Three.js `GLTFLoader`; scrub the authored action using `AnimationMixer.setTime()`.
9. Drive the playhead with one GSAP ScrollTrigger timeline using named chapter labels and deliberate proportional durations.
10. Keep responsive camera/framing, annotations, and editorial opacity in the web layer. Remove most procedural per-part pose math and compensating fit constants.
11. Validate the uncompressed GLB first. Optimize with Meshopt/Draco and KTX2 only after geometry, materials, and motion are approved.

## Preserve from the current site

- Existing typography, visual language, and Sponsor a Light messaging
- Homepage layout and two-sided education story
- Callout and leader-line design
- Accessibility fallback content
- GLB lazy loading and render pausing
- Device-pixel-ratio cap and performance safeguards
- Mobile layout and footer behavior
- Screenshot/verifier infrastructure
- Existing brand images and icons

Do not introduce unrelated design systems, new icon styles, or generic AI-generated interface elements.

## Required reference inputs

Ask the user for the new absolute path to the transferred media library. Before final geometry, obtain or confirm:

- Correct rectangular enclosure STEP/STP/STL
- Whether the final product is 84×84 mm or approximately 100×60 mm
- Closed front, rear, side, top, and bottom photographs
- Open-interior photograph
- Solar-panel front and rear
- Battery front/back, label, wiring, and exact part number
- Charging-board front/back and part number
- Both LEDs and their mounting/wiring arrangement
- Switch body and actuator
- A ruler or caliper reference
- Exact component links/specifications where available

If authoritative information is missing, stop that modeling decision and ask instead of inventing it.

## Hardware and software

The destination machine is expected to have an Intel Core i7-1165G7, 32 GB RAM, and Intel Iris Xe integrated graphics. This is workable for a low-poly product scene using Eevee/material preview, moderate textures, and light baking. Avoid heavy Cycles rendering, dense simulations, and unnecessary subdivision.

Confirm Blender and FreeCAD versions before beginning. Prefer a current Blender LTS/stable release compatible with the machine.

## First actions on the destination PC

1. Clone the repository and check out `feat/threejs-assembly-v2`.
2. Verify `HEAD` includes `aa6bc9a` and the worktree is clean.
3. Read this document and `AGENTS.md` completely.
4. Locate the copied media library and authoritative CAD.
5. Inventory Blender/FreeCAD availability and hardware acceleration.
6. Create a staged plan with explicit user approval checkpoints for geometry, materials, animation, web integration, performance, and final deployment.
7. Show geometry and material previews before authoring the full animation.
8. Keep the existing Three.js implementation available as a fallback until the replacement passes independent visual and technical review.

## Deployment boundary

No production deployment, `main` merge, or further push is authorized merely by this handoff. Work locally, checkpoint changes, provide localhost previews, and request explicit approval before any external release action.

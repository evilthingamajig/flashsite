import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[1]
GLB = ROOT / 'assets' / '3d' / 'flashlight-assembly-blender-candidate.glb'
EXPECTED_PARTS = {
    'enclosure', 'solar_panel_placeholder', 'battery', 'charge_module',
    'led_left', 'led_right', 'switch',
}


def fail(message):
    print('FAIL  ' + message)
    raise SystemExit(1)


def passed(message):
    print('PASS  ' + message)


if not GLB.exists():
    fail('candidate GLB is missing: ' + str(GLB))

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(GLB))
parts = {obj.name: obj for obj in bpy.data.objects if obj.type == 'MESH'}
missing = sorted(EXPECTED_PARTS - parts.keys())
if missing:
    fail('missing top-level mesh names: ' + ', '.join(missing))
passed('seven named candidate parts present')

actions = [action.name for action in bpy.data.actions if action.name.startswith('ScrollSequence')]
if len(actions) != 7:
    fail('expected seven ScrollSequence actions, found %d: %s' % (len(actions), actions))
passed('seven ScrollSequence actions present')

switch_dimensions = sorted(float(value) for value in parts['switch'].dimensions)
expected_dimensions = sorted((0.0041, 0.00782, 0.006))
if any(abs(actual - expected) > 0.0002 for actual, expected in zip(switch_dimensions, expected_dimensions)):
    fail('switch dimensions %.6f, %.6f, %.6f m do not match measured pass9 source' % tuple(parts['switch'].dimensions))
passed('switch dimensions match measured pass9 source')

battery_children = {child.name for child in parts['battery'].children}
required_children = {'battery_kapton_band', 'battery_label_plate'}
if not required_children.issubset(battery_children):
    fail('battery detail children missing: ' + ', '.join(sorted(required_children - battery_children)))
passed('battery detail children present')

scene = bpy.context.scene
scene.frame_set(1)
closed_locations = {name: tuple(obj.location) for name, obj in parts.items() if name in EXPECTED_PARTS}
scene.frame_set(120)
reassembled_locations = {name: tuple(obj.location) for name, obj in parts.items() if name in EXPECTED_PARTS}
max_delta = max(
    sum((a - b) ** 2 for a, b in zip(closed_locations[name], reassembled_locations[name])) ** 0.5
    for name in EXPECTED_PARTS
)
if max_delta > 0.0005:
    fail('reassembled part locations drift by %.6f m' % max_delta)
passed('frame 120 returns top-level parts to frame 1 locations')
print('SUMMARY  Blender candidate verification passed')

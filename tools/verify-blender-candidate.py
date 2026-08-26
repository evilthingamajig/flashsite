import sys
from pathlib import Path

import bpy
from mathutils import Vector

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
parts = {obj.name: obj for obj in bpy.data.objects if obj.type == 'MESH' and obj.parent is None}
missing = sorted(EXPECTED_PARTS - parts.keys())
if missing:
    fail('missing top-level mesh names: ' + ', '.join(missing))
passed('seven named candidate parts present')

actions = [action.name for action in bpy.data.actions if action.name.startswith('ScrollSequence')]
if len(actions) != 7:
    fail('expected seven ScrollSequence actions, found %d: %s' % (len(actions), sorted(actions)))
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

switch_children = {child.name for child in parts['switch'].children}
required_switch = {'switch_actuator', 'switch_red_wire', 'switch_black_wire'}
if not required_switch.issubset(switch_children):
    fail('switch detail children missing: ' + ', '.join(sorted(required_switch - switch_children)))
passed('switch actuator and both wire detail children present')

solar_children = {child.name for child in parts['solar_panel_placeholder'].children}
solar_screws = {name for name in solar_children if name.startswith('solar_screw_head_')}
if 'solar_rear_connector' not in solar_children or 'solar_rear_wire' not in solar_children or 'solar_center_divider' not in solar_children or len(solar_screws) != 4:
    fail('solar rear connector detail children are missing')
passed('solar connector and reference details present')

enclosure_children = {child.name for child in parts['enclosure'].children}
expected_mounts = {'enclosure_mount_block_1', 'enclosure_mount_block_2', 'enclosure_mount_block_3', 'enclosure_mount_block_4'}
missing_mounts = expected_mounts - enclosure_children
if missing_mounts:
    fail('enclosure mount block children missing: ' + ', '.join(sorted(missing_mounts)))
passed('four enclosure corner mount blocks present')

_TOL = 0.001
_scene = bpy.context.scene
_enc = parts['enclosure']
_mbs = [next(child for child in _enc.children if child.name == n) for n in sorted(expected_mounts)]
for _frame in (1, 120):
    _scene.frame_set(_frame)
    _enc_corners = [_enc.matrix_world @ Vector(c) for c in _enc.bound_box]
    _enc_lo = Vector((min(v.x for v in _enc_corners),
                       min(v.y for v in _enc_corners),
                       min(v.z for v in _enc_corners)))
    _enc_hi = Vector((max(v.x for v in _enc_corners),
                       max(v.y for v in _enc_corners),
                       max(v.z for v in _enc_corners)))
    for _mb in _mbs:
        _mb_corners = [_mb.matrix_world @ Vector(c) for c in _mb.bound_box]
        _mb_lo = Vector((min(v.x for v in _mb_corners),
                          min(v.y for v in _mb_corners),
                          min(v.z for v in _mb_corners)))
        _mb_hi = Vector((max(v.x for v in _mb_corners),
                          max(v.y for v in _mb_corners),
                          max(v.z for v in _mb_corners)))
        if (_mb_lo.x - _enc_lo.x < -_TOL or _mb_lo.y - _enc_lo.y < -_TOL or
                _mb_lo.z - _enc_lo.z < -_TOL or _enc_hi.x - _mb_hi.x < -_TOL or
                _enc_hi.y - _mb_hi.y < -_TOL or _enc_hi.z - _mb_hi.z < -_TOL):
            fail('mount block %s world AABB exceeds enclosure AABB at frame %d' % (_mb.name, _frame))
passed('all mount block AABB corners inside enclosure AABB at frame 1 and 120 (0.001 m tolerance)')

scene = bpy.context.scene
scene.frame_set(1)
closed_locations = {name: tuple(obj.location) for name, obj in parts.items() if name in EXPECTED_PARTS}
scene.frame_set(120)
reassembled_locations = {name: tuple(obj.location) for name, obj in parts.items() if name in EXPECTED_PARTS}
deltas = {
    name: sum((a - b) ** 2 for a, b in zip(closed_locations[name], reassembled_locations[name])) ** 0.5
    for name in EXPECTED_PARTS
}
max_delta = max(deltas.values())
if max_delta > 0.0005:
    worst_part = max(deltas, key=deltas.get)
    fail('reassembled part locations drift by %.6f m; worst offending part: %s (%.6f m)' % (max_delta, worst_part, deltas[worst_part]))
passed('frame 120 returns top-level parts to frame 1 locations')
print('SUMMARY  Blender candidate verification passed')

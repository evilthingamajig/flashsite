import math
import sys
from collections import Counter
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
expected_dimensions = sorted((0.048816, 0.007971, 0.010429))
if any(abs(actual - expected) > 0.0002 for actual, expected in zip(switch_dimensions, expected_dimensions)):
    fail('switch dimensions %.6f, %.6f, %.6f m do not match original transferred source' % tuple(parts['switch'].dimensions))
passed('switch dimensions match original transferred long-slider source')

def dimensions_match(part, expected, tolerance=0.0002):
    obj = parts[part]
    return dimensions_match_obj(obj, expected, tolerance)


def dimensions_match_obj(obj, expected, tolerance=0.0002):
    actual = sorted(float(value) for value in obj.dimensions)
    target = sorted(expected)
    return all(abs(value - wanted) <= tolerance for value, wanted in zip(actual, target)), actual

case_dimensions_ok, case_dimensions = dimensions_match('enclosure', (0.105, 0.065, 0.015))
if not case_dimensions_ok:
    fail('exported enclosure dimensions %.6f, %.6f, %.6f m do not match FreeCAD case source' % tuple(case_dimensions))
passed('exported enclosure dimensions match FreeCAD case source')

panel_dimensions_ok, panel_dimensions = dimensions_match('solar_panel_placeholder', (0.098, 0.058, 0.0018))
if not panel_dimensions_ok:
    fail('exported solar panel footprint %.6f, %.6f, %.6f m is unexpected' % tuple(panel_dimensions))
passed('exported solar panel footprint matches candidate target')

for part, expected, label in (
    ('charge_module', (0.0293, 0.0174, 0.00414), 'FreeCAD TP4056 source'),
    ('battery', (0.0531, 0.046821, 0.006), 'FreeCAD LiPo source'),
    ('led_left', (0.00558, 0.006, 0.0365), 'FreeCAD LED source'),
):
    matches, measured = dimensions_match(part, expected)
    if not matches:
        fail('exported %s dimensions %.6f, %.6f, %.6f m do not match %s' % (part, *measured, label))
    passed('exported %s dimensions match %s' % (part, label))

battery_children = {child.name for child in parts['battery'].children}
required_children = {'battery_kapton_band', 'battery_label_plate'}
if not required_children.issubset(battery_children):
    fail('battery detail children missing: ' + ', '.join(sorted(required_children - battery_children)))
passed('battery detail children present')

switch_children = {child.name for child in parts['switch'].children}
required_switch = {'switch_red_wire', 'switch_black_wire'}
if not required_switch.issubset(switch_children):
    fail('switch detail children missing: ' + ', '.join(sorted(required_switch - switch_children)))
passed('original switch mesh and both wire detail children present')

scene = bpy.context.scene
scene.frame_set(1)
if abs(parts['switch'].location.x) > 0.001 or abs(parts['switch'].location.y + 0.029) > 0.001:
    fail('switch is not seated in the user-identified negative-Y case opening: %s'
         % (tuple(parts['switch'].location),))
passed('switch is seated on the user-identified case wall')

def led_die_child(part):
    for child in parts[part].children:
        if child.name.split('.')[0] == 'led_die_' + part:
            materials = {material.name for material in child.data.materials if material}
            if 'LedDie' not in materials:
                fail('%s inner die is missing LedDie material' % part)
            return child
    fail('%s inner die child is missing' % part)

led_die_child('led_left')
led_die_child('led_right')
passed('both LED inner die children use LedDie material')

duplicate_faces = {}
for part in ('battery', 'charge_module'):
    signatures = [tuple(sorted(poly.vertices)) for poly in parts[part].data.polygons]
    duplicate_faces[part] = sum(count - 1 for count in Counter(signatures).values() if count > 1)
if any(count for count in duplicate_faces.values()):
    fail('exported battery/charge meshes retain duplicate faces: %s' % duplicate_faces)
passed('exported battery and charge meshes contain no duplicate triangle faces')

solar_children = {child.name for child in parts['solar_panel_placeholder'].children}
# GLB import appends .001 .002 suffixes to repeated base names; match by
# the base prefix so both the original and any suffixed duplicates count.
solar_screws = {name for name in solar_children if name.split('.')[0].startswith('solar_screw_head_')}
solar_frame = {name for name in solar_children if name.split('.')[0].startswith('solar_frame_')}
solar_bus = {name for name in solar_children if name.split('.')[0] == 'solar_bus'}
solar_cells = {name for name in solar_children if name.split('.')[0].startswith('solar_cell_line')}
if ('solar_rear_connector' not in solar_children or 'solar_rear_wire' not in solar_children
        or 'solar_center_divider' not in solar_children or len(solar_screws) != 4
        or len(solar_frame) != 4 or len(solar_bus) != 2 or len(solar_cells) < 12):
    fail('solar detail children are missing or incomplete')
passed('solar connector, frame bars, bus lines, cell strips, and screw details present')

enclosure_children = {child.name for child in parts['enclosure'].children}
expected_mounts = {'enclosure_mount_block_1', 'enclosure_mount_block_2', 'enclosure_mount_block_3', 'enclosure_mount_block_4'}
missing_mounts = expected_mounts - enclosure_children
if missing_mounts:
    fail('enclosure mount block children missing: ' + ', '.join(sorted(missing_mounts)))
passed('four enclosure corner mount blocks present')

expected_screws = {"mount_screw_enclosure_mount_block_%d" % index for index in range(1, 5)}
mount_screws = {child.name for mount in parts['enclosure'].children for child in mount.children}
missing_screws = expected_screws - mount_screws
if missing_screws:
    fail('enclosure mount screw children missing: ' + ', '.join(sorted(missing_screws)))
passed('four metallic mount screw cues present and parented to mount blocks')

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

def action_rotation_angle(part, frame):
    action = next((item for item in bpy.data.actions if item.name.startswith('ScrollSequence')
                   and any(slot.identifier == 'OB' + part for slot in item.slots)), None)
    if action is None:
        fail('%s ScrollSequence action is missing' % part)
    bag = next((bag for bag in action.layers[0].strips[0].channelbags
                if bag.slot.identifier == 'OB' + part), None)
    curves = {curve.array_index: curve for curve in bag.fcurves if curve.data_path == 'rotation_quaternion'}
    if len(curves) != 4:
        fail('%s quaternion rotation tracks are incomplete' % part)
    w = max(-1.0, min(1.0, abs(curves[0].evaluate(frame))))
    return math.degrees(2.0 * math.acos(w))

mid_angles = {name: action_rotation_angle(name, 60) for name in EXPECTED_PARTS}
rotating_parts = {name: angle for name, angle in mid_angles.items()
                  if name not in {'enclosure', 'switch'} and angle > 0.5}
if mid_angles['enclosure'] > 0.5 or mid_angles['switch'] > 0.5 or len(rotating_parts) != 5:
    fail('mid-action rotation coverage is incomplete at frame 60: %s' % mid_angles)
if min(rotating_parts.values()) < 2.0:
    fail('mid-action rotation is too weak at frame 60: %s' % mid_angles)
passed('bespoke mid-action rotations cover five loose parts while switch stays mounted')

scene.frame_set(1)
switch_case_offset = Vector(parts['switch'].location) - Vector(parts['enclosure'].location)
for frame in (30, 60, 84, 100, 120):
    scene.frame_set(frame)
    current_offset = Vector(parts['switch'].location) - Vector(parts['enclosure'].location)
    if (current_offset - switch_case_offset).length > 0.0001:
        fail('switch leaves its mounted case-side seat at frame %d: offset=%s expected=%s'
             % (frame, tuple(current_offset), tuple(switch_case_offset)))
passed('switch remains mounted in the case-side opening for the full timeline')

print('SUMMARY  Blender candidate verification passed')

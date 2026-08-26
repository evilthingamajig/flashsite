import bpy
import os
import json
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "3d", "flashlight-assembly-blender-candidate.glb")
MANIFEST = os.path.join(ROOT, "assets", "3d", "blender-candidate-manifest.json")
BLENDER_MM = 0.001

CASE = r"C:\Users\romir\Downloads\Revamp Flashlight w addon.stl"
SWITCH = os.path.join(ROOT, "source-assets", "stl", "switch.stl")
TP4056 = os.path.join(ROOT, "source-assets", "external", "pass9", "tp4056-usbc.stl")
LED = os.path.join(ROOT, "source-assets", "external", "pass9", "derived", "led-d5-clear.stl")

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.length_unit = 'MILLIMETERS'
    scene.render.engine = 'BLENDER_EEVEE'

def mat(name, color, metallic=0.0, roughness=0.45, transmission=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1.0)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = roughness
    if 'Transmission Weight' in bs.inputs:
        bs.inputs['Transmission Weight'].default_value = transmission
    return m

def import_stl(path, name, scale=BLENDER_MM):
    bpy.ops.wm.stl_import(filepath=path)
    ob = bpy.context.selected_objects[0]
    ob.name = name
    ob.scale = (scale, scale, scale)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return ob

def cube(name, dims, loc, material):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material)
    return ob

def set_mat(ob, material):
    ob.data.materials.clear()
    ob.data.materials.append(material)

def add_keyframes(ob, seat, explode, inspect, frame_inspect):
    ob.location = seat
    ob.rotation_euler = (0.0, 0.0, 0.0)
    ob.keyframe_insert('location', frame=1)
    ob.keyframe_insert('rotation_euler', frame=1)
    ob.location = explode
    ob.rotation_euler = (0.0, 0.35, 0.0)
    ob.keyframe_insert('location', frame=30)
    ob.keyframe_insert('rotation_euler', frame=30)
    ob.location = inspect
    ob.rotation_euler = (0.0, 1.2 if frame_inspect % 2 else -1.0, 0.25)
    ob.keyframe_insert('location', frame=frame_inspect)
    ob.keyframe_insert('rotation_euler', frame=frame_inspect)
    ob.location = seat
    ob.rotation_euler = (0.0, 0.0, 0.0)
    ob.keyframe_insert('location', frame=100)
    ob.keyframe_insert('rotation_euler', frame=100)
    if ob.animation_data and ob.animation_data.action:
        ob.animation_data.action.name = 'ScrollSequence'

def main():
    clear()
    charcoal = mat('CaseCharcoal', (0.025, 0.035, 0.04), roughness=0.62)
    solar = mat('SolarPlaceholder', (0.012, 0.035, 0.07), roughness=0.3)
    foil = mat('BatteryFoil', (0.42, 0.45, 0.46), metallic=0.45, roughness=0.32)
    pcb = mat('PcbGreen', (0.015, 0.16, 0.07), roughness=0.42)
    ledmat = mat('LedClear', (0.62, 0.9, 1.0), roughness=0.12, transmission=0.6)
    switchmat = mat('SwitchPlastic', (0.055, 0.06, 0.065), roughness=0.48)

    enclosure = import_stl(CASE, 'enclosure')
    set_mat(enclosure, charcoal)
    # Case STL is unitless raw millimetres; center it for authored pivots.
    b = [enclosure.matrix_world @ Vector(c) for c in enclosure.bound_box]
    center = sum(b, Vector()) / 8.0
    enclosure.location -= center

    panel = cube('solar_panel_placeholder', (0.098, 0.058, 0.0018), (0.0, 0.0, 0.0088), solar)
    battery = cube('battery', (0.0506, 0.0335, 0.005), (0.0, -0.014, -0.003), foil)
    charge = import_stl(TP4056, 'charge_module')
    set_mat(charge, pcb)
    charge.location = (0.0, 0.016, -0.002)
    led_a = import_stl(LED, 'led_left')
    led_b = import_stl(LED, 'led_right')
    set_mat(led_a, ledmat); set_mat(led_b, ledmat)
    led_a.location = (-0.012, -0.033, 0.0)
    led_b.location = (0.012, -0.033, 0.0)
    sw = import_stl(SWITCH, 'switch')
    set_mat(sw, switchmat)
    sw.location = (0.018, 0.025, 0.0)

    parts = [enclosure, panel, battery, charge, led_a, led_b, sw]
    seats = {p.name: tuple(p.location) for p in parts}
    for i, p in enumerate(parts):
        s = Vector(seats[p.name])
        explode = s + Vector(((i - 3) * 0.014, ((i % 2) * 2 - 1) * 0.018, 0.035 + i * 0.004))
        inspect = s + Vector(((-1 if i % 2 else 1) * 0.06, (i - 3) * 0.01, 0.055 + i * 0.004))
        add_keyframes(p, s, explode, inspect, 42 + i * 7)

    # A named control action makes the authored timeline discoverable by GLTFLoader.
    bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
    control = bpy.context.object
    control.name = 'ScrollSequence'
    control.scale = (1, 1, 1); control.keyframe_insert('scale', frame=1)
    control.scale = (1.001, 1.001, 1.001); control.keyframe_insert('scale', frame=100)
    control.animation_data.action.name = 'ScrollSequence'
    control.hide_render = True
    control.hide_viewport = True

    scene = bpy.context.scene
    scene.frame_start = 1; scene.frame_end = 100; scene.render.fps = 24
    scene.frame_set(1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_apply=True)

    manifest = {
        'kind': 'candidate-only', 'generator': 'tools/build-blender-candidate.py',
        'targetFootprint': 'approximately 100x60 mm; supplied STL measured 105x65x15 mm',
        'sourceCase': CASE, 'sourceCaseUnits': 'raw STL values interpreted as millimetres',
        'parts': ['enclosure','solar_panel_placeholder','battery','charge_module','led_left','led_right','switch'],
        'provisional': ['solar panel is a geometry placeholder; no CAD/photo baked in', 'led_right duplicates the supplied single LED', 'battery and switch seating are provisional', 'electronics/LED meshes use repository CAD-derived browser-safe STL derivatives pending direct STEP bake'],
        'authoredAction': 'ScrollSequence', 'frameRange': [1, 100],
        'fallbackPreserved': 'assets/3d/flashlight-assembly.glb',
        'validation': {'blender': 'export completed; inspect GLB node/action metadata before web integration'}
    }
    with open(MANIFEST, 'w', encoding='utf-8') as f: json.dump(manifest, f, indent=2)

if __name__ == '__main__': main()

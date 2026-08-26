import bpy
import bmesh
import math
import os
import json
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "3d", "flashlight-assembly-blender-candidate.glb")
MANIFEST = os.path.join(ROOT, "assets", "3d", "blender-candidate-manifest.json")
BLENDER_MM = 0.001

CASE = r"C:\Users\romir\Downloads\Revamp Flashlight w addon.stl"
SWITCH = os.path.join(ROOT, "source-assets", "stl", "switch.stl")
TP4056 = os.path.join(ROOT, "source-assets", "external", "user-supplied", "tp4056-user-supplied.stl")
BATTERY = os.path.join(ROOT, "source-assets", "external", "user-supplied", "battery-user-supplied.stl")
LED = os.path.join(ROOT, "source-assets", "external", "user-supplied", "led-user-supplied.stl")
SOLAR_PHOTO = os.path.join(ROOT, "assets", "3d", "references", "solarpanel.jpg")

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Blender 5.x may still restore the startup scene when invoked headless;
    # remove every inherited object so the candidate bounds contain only the
    # authored flashlight assembly.
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)
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

def solar_material():
    # Cell layout and proportions follow the supplied solar-panel reference
    # photo. Geometry details below are used instead of the contact-sheet
    # pixels so the GLB stays self-contained and free of white background.
    return mat('SolarPhotoCell', (0.012, 0.035, 0.07), metallic=0.15, roughness=0.28)

def add_solar_details(panel, bus_material, line_material):
    details = []
    for x in (-0.025, 0.025):
        details.append(cube('solar_bus', (0.0012, 0.054, 0.00025), (x, 0.0, 0.00105), bus_material))
    for y in (-0.023, -0.015, -0.007, 0.001, 0.009, 0.017, 0.025):
        details.append(cube('solar_cell_line', (0.094, 0.00035, 0.00022), (0.0, y, 0.00104), line_material))
    for detail in details:
        detail.parent = panel
        detail.location = (detail.location.x, detail.location.y, 0.00105)
    return details

def import_stl(path, name, scale=BLENDER_MM):
    bpy.ops.wm.stl_import(filepath=path)
    ob = bpy.context.selected_objects[0]
    ob.name = name
    ob.data.name = name
    ob.scale = (scale, scale, scale)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return ob

def cube(name, dims, loc, material):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.data.name = name
    ob.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.data.materials.append(material)
    return ob

def set_mat(ob, material):
    ob.data.materials.clear()
    ob.data.materials.append(material)

def reduce_mesh(ob, ratio=0.35):
    if len(ob.data.polygons) < 1500:
        return
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.000001)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    mod = ob.modifiers.new('Candidate lightweight reduction', 'DECIMATE')
    mod.ratio = ratio
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.modifier_apply(modifier=mod.name)

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
    solar = solar_material()
    solar_bus = mat('SolarBus', (0.06, 0.065, 0.055), metallic=0.3, roughness=0.3)
    solar_line = mat('SolarCellLine', (0.22, 0.28, 0.34), metallic=0.25, roughness=0.25)
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
    add_solar_details(panel, solar_bus, solar_line)
    charge = import_stl(TP4056, 'charge_module')
    set_mat(charge, pcb)
    reduce_mesh(charge, 0.03)
    charge.location = (0.0, 0.016, -0.002)
    battery = import_stl(BATTERY, 'battery')
    set_mat(battery, foil)
    reduce_mesh(battery, 0.03)
    battery.location = (0.0, -0.014, -0.003)
    led_a = import_stl(LED, 'led_left')
    led_b = import_stl(LED, 'led_right')
    set_mat(led_a, ledmat); set_mat(led_b, ledmat)
    # The supplied STEP's long axis imports along Z. Apply a 90° X rotation
    # to the mesh so the LEDs run through the case's front wall along Y while
    # the authored animation can still use clean object rotations.
    for led in (led_a, led_b):
        led.rotation_euler.x = math.radians(90)
        bpy.context.view_layer.objects.active = led
        led.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        led.select_set(False)
    # Case front wall is approximately y=-32.5 mm; center the 36.5 mm body
    # at -23 mm so its clear lens projects about 8-9 mm beyond that wall.
    led_a.location = (-0.012, -0.023, 0.0)
    led_b.location = (0.012, -0.023, 0.0)
    sw = import_stl(SWITCH, 'switch', scale=1.0)
    set_mat(sw, switchmat)
    sw.location = (0.018, 0.025, 0.0)

    parts = [enclosure, panel, battery, charge, led_a, led_b, sw]
    seats = {p.name: tuple(p.location) for p in parts}
    for i, p in enumerate(parts):
        s = Vector(seats[p.name])
        explode = s + Vector(((i - 3) * 0.014, ((i % 2) * 2 - 1) * 0.018, 0.035 + i * 0.004))
        inspect = s + Vector(((-1 if i % 2 else 1) * 0.06, (i - 3) * 0.01, 0.055 + i * 0.004))
        add_keyframes(p, s, explode, inspect, 42 + i * 7)

    # Defensive cleanup for headless Blender startup datablocks that can
    # survive factory reset and otherwise export as a 2 m default Cube.
    for ob in list(bpy.data.objects):
        if ob.name in {'Cube', 'Camera', 'Light'}:
            bpy.data.objects.remove(ob, do_unlink=True)

    scene = bpy.context.scene
    scene.frame_start = 1; scene.frame_end = 100; scene.render.fps = 24
    scene.frame_set(1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_apply=True)

    manifest = {
        'kind': 'candidate-only', 'generator': 'tools/build-blender-candidate.py',
        'targetFootprint': 'approximately 100x60 mm; supplied STL measured 105x65x15 mm',
        'sourceCase': CASE, 'sourceCaseUnits': 'raw STL values interpreted as millimetres',
        'referencePhoto': 'assets/3d/references/solarpanel.jpg',
        'convertedCadSources': {
            'charge_module': 'source-assets/external/user-supplied/tp4056-user-supplied.stl',
            'battery': 'source-assets/external/user-supplied/battery-user-supplied.stl',
            'led': 'source-assets/external/user-supplied/led-user-supplied.stl',
        },
        'parts': ['enclosure','solar_panel_placeholder','battery','charge_module','led_left','led_right','switch'],
        'provisional': ['solar panel is reference-informed geometry; no solar-panel CAD supplied', 'led_right duplicates the supplied single LED', 'battery and switch seating are provisional', 'user-supplied STEP files were converted to coarse browser-safe STL meshes through FreeCAD'],
        'authoredAction': 'ScrollSequence', 'frameRange': [1, 100],
        'fallbackPreserved': 'assets/3d/flashlight-assembly.glb',
        'validation': {'blender': 'export completed; inspect GLB node/action metadata before web integration'}
    }
    with open(MANIFEST, 'w', encoding='utf-8') as f: json.dump(manifest, f, indent=2)

if __name__ == '__main__': main()

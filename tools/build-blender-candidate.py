import bpy
import bmesh
import math
import os
import json
from mathutils import Matrix, Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "3d", "flashlight-assembly-blender-candidate.glb")
MANIFEST = os.path.join(ROOT, "assets", "3d", "blender-candidate-manifest.json")
BLENDER_MM = 0.001

CASE = r"C:\Users\romir\Downloads\Revamp Flashlight w addon.stl"
SWITCH = os.path.join(ROOT, "source-assets", "external", "pass9", "derived", "switch-dip-slide.stl")
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
    frame_material = bpy.data.materials.get('SolarFrame') or mat('SolarFrame', (0.018, 0.022, 0.024), metallic=0.45, roughness=0.32)
    # A thin raised frame keeps the reference-informed panel from reading as
    # a floating blue rectangle while staying below the case scale.
    frame_parts = [
        ('solar_frame_top', (0.098, 0.0018, 0.0008), (0.0, 0.0281, 0.00125)),
        ('solar_frame_bottom', (0.098, 0.0018, 0.0008), (0.0, -0.0281, 0.00125)),
        ('solar_frame_left', (0.0018, 0.0544, 0.0008), (-0.0481, 0.0, 0.00125)),
        ('solar_frame_right', (0.0018, 0.0544, 0.0008), (0.0481, 0.0, 0.00125)),
    ]
    details.extend(cube(name, dims, loc, frame_material) for name, dims, loc in frame_parts)
    for x in (-0.025, 0.025):
        details.append(cube('solar_bus', (0.0012, 0.054, 0.00025), (x, 0.0, 0.00105), bus_material))
    for y in (-0.023, -0.015, -0.007, 0.001, 0.009, 0.017, 0.025):
        details.append(cube('solar_cell_line', (0.094, 0.00035, 0.00022), (0.0, y, 0.00104), line_material))
    for detail in details:
        detail.parent = panel
        detail.location = (detail.location.x, detail.location.y, detail.location.z)
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

def parent_detail(detail, parent, location):
    detail.parent = parent
    detail.location = location
    return detail

def add_battery_details(battery, kapton, battery_label, lead_material):
    # Keep the supplied pouch as the authoritative envelope and add only the
    # visible physical cues that survive the low-poly browser export.
    band = cube('battery_kapton_band', (0.054, 0.006, 0.0064), (0.0, 0.0, 0.0), kapton)
    parent_detail(band, battery, (0.0, 0.011, 0.0002))
    tag = cube('battery_label_plate', (0.022, 0.014, 0.00024), (0.0, 0.0, 0.0), battery_label)
    parent_detail(tag, battery, (0.008, -0.006, 0.0031))
    lead = cube('battery_lead_pair', (0.012, 0.0012, 0.0008), (0.0, 0.0, 0.0), lead_material)
    parent_detail(lead, battery, (0.022, 0.023, 0.0022))

def add_charge_details(charge, solder, usb_metal):
    # TP4056 boards are visually defined by the blue PCB, USB-C end, and a
    # handful of dark/silver components; these cues remain intentionally light.
    port = cube('charge_usb_c_port', (0.0045, 0.009, 0.0032), (0.0, 0.0, 0.0), usb_metal)
    parent_detail(port, charge, (0.0148, 0.0, 0.0018))
    chip = cube('charge_controller_chip', (0.006, 0.005, 0.0012), (0.0, 0.0, 0.0), solder)
    parent_detail(chip, charge, (-0.003, 0.002, 0.0022))
    resistor = cube('charge_resistor_bank', (0.011, 0.002, 0.001), (0.0, 0.0, 0.0), solder)
    parent_detail(resistor, charge, (-0.008, -0.004, 0.0021))

def center_mesh_origin(ob):
    """Move imported geometry around its own bounds so location is its seat."""
    center = sum((Vector(c) for c in ob.bound_box), Vector()) / 8.0
    ob.data.transform(Matrix.Translation(Vector((-center.x, -center.y, -center.z))))
    ob.data.update()

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

MOTION_PROFILES = {
    'enclosure': {
        'explode_rotation': (0.0, 0.0, 0.0),
        'inspect_rotation': (0.0, 0.0, 0.0),
    },
    'solar_panel_placeholder': {
        'explode_rotation': (math.radians(-8.0), 0.0, 0.0),
        'inspect_rotation': (math.radians(-18.0), math.radians(6.0), 0.0),
    },
    'battery': {
        'explode_rotation': (math.radians(9.0), 0.0, 0.0),
        'inspect_rotation': (math.radians(24.0), 0.0, 0.0),
    },
    'charge_module': {
        'explode_rotation': (0.0, 0.0, math.radians(12.0)),
        'inspect_rotation': (math.radians(-6.0), 0.0, math.radians(38.0)),
    },
    'led_left': {
        'explode_rotation': (0.0, 0.0, math.radians(10.0)),
        'inspect_rotation': (math.radians(-8.0), 0.0, math.radians(26.0)),
    },
    'led_right': {
        'explode_rotation': (0.0, 0.0, math.radians(-10.0)),
        'inspect_rotation': (math.radians(-8.0), 0.0, math.radians(-26.0)),
    },
    'switch': {
        'explode_rotation': (math.radians(-6.0), 0.0, 0.0),
        'inspect_rotation': (math.radians(-14.0), 0.0, 0.0),
    },
}

def add_keyframes(ob, seat, explode, inspect, frame_inspect, profile):
    explode_rot = profile['explode_rotation']
    inspect_rot = profile['inspect_rotation']
    ob.location = seat
    ob.rotation_euler = (0.0, 0.0, 0.0)
    ob.keyframe_insert('location', frame=1)
    ob.keyframe_insert('rotation_euler', frame=1)
    ob.location = explode
    ob.rotation_euler = explode_rot
    ob.keyframe_insert('location', frame=30)
    ob.keyframe_insert('rotation_euler', frame=30)
    ob.location = inspect
    ob.rotation_euler = inspect_rot
    ob.keyframe_insert('location', frame=frame_inspect)
    ob.keyframe_insert('rotation_euler', frame=frame_inspect)
    # Hold the exploded inspection state through the middle of the authored
    # timeline, then return every part to its real closed-pose seat for the
    # final product view.
    ob.location = explode
    ob.rotation_euler = explode_rot
    ob.keyframe_insert('location', frame=100)
    ob.keyframe_insert('rotation_euler', frame=100)
    ob.location = seat
    ob.rotation_euler = (0.0, 0.0, 0.0)
    ob.keyframe_insert('location', frame=120)
    ob.keyframe_insert('rotation_euler', frame=120)
    if ob.animation_data and ob.animation_data.action:
        ob.animation_data.action.name = 'ScrollSequence'

def main():
    clear()
    charcoal = mat('CaseCharcoal', (0.025, 0.035, 0.04), roughness=0.62)
    solar = solar_material()
    solar_bus = mat('SolarBus', (0.06, 0.065, 0.055), metallic=0.3, roughness=0.3)
    solar_line = mat('SolarCellLine', (0.22, 0.28, 0.34), metallic=0.25, roughness=0.25)
    foil = mat('BatteryFoil', (0.48, 0.50, 0.49), metallic=0.62, roughness=0.27)
    kapton = mat('BatteryKapton', (0.72, 0.38, 0.035), roughness=0.48)
    battery_label = mat('BatteryLabel', (0.035, 0.04, 0.038), roughness=0.62)
    battery_lead = mat('BatteryLead', (0.11, 0.12, 0.12), metallic=0.4, roughness=0.36)
    pcb = mat('PcbBlue', (0.012, 0.07, 0.18), roughness=0.38)
    solder = mat('PcbComponent', (0.27, 0.30, 0.29), metallic=0.45, roughness=0.28)
    usb_metal = mat('UsbMetal', (0.16, 0.18, 0.18), metallic=0.8, roughness=0.2)
    ledmat = mat('LedClear', (0.88, 0.92, 0.94), roughness=0.10, transmission=0.85)
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
    add_charge_details(charge, solder, usb_metal)
    battery = import_stl(BATTERY, 'battery')
    set_mat(battery, foil)
    reduce_mesh(battery, 0.03)
    battery.location = (0.0, -0.014, -0.003)
    # Lightweight provisional LiPo surface cues. Keep these as children of
    # the supplied battery mesh so the existing single battery action carries
    # them through the exploded and reassembled poses.
    add_battery_details(battery, kapton, battery_label, battery_lead)
    led_a = import_stl(LED, 'led_left')
    led_b = import_stl(LED, 'led_right')
    set_mat(led_a, ledmat); set_mat(led_b, ledmat)
    # Normalize the imported part origins before seating them. The supplied
    # LED mesh is offset along its long axis, which otherwise makes a correct
    # location look displaced and makes the two lens directions ambiguous.
    for led in (led_a, led_b):
        center_mesh_origin(led)
        led.rotation_euler.y = math.radians(90)
        bpy.context.view_layer.objects.active = led
        led.select_set(True)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        led.select_set(False)
    # The LEDs belong on the short end of the case. Their clear/lens end is
    # the negative-X end after the Y rotation; the body runs back into the
    # enclosure from an X seat near the end wall.
    led_a.location = (-0.046, -0.012, 0.0)
    led_b.location = (-0.046, 0.012, 0.0)
    sw = import_stl(SWITCH, 'switch', scale=BLENDER_MM)
    set_mat(sw, switchmat)
    center_mesh_origin(sw)
    sw.location = (0.0, 0.018, 0.0)

    parts = [enclosure, panel, battery, charge, led_a, led_b, sw]
    seats = {p.name: tuple(p.location) for p in parts}
    explode_offsets = {
        'enclosure': (0.000, 0.000, 0.035),
        'solar_panel_placeholder': (0.000, 0.000, 0.040),
        'battery': (-0.060, -0.020, 0.047),
        'charge_module': (0.060, 0.024, 0.052),
        'led_left': (-0.032, -0.050, 0.045),
        'led_right': (0.032, -0.050, 0.045),
        'switch': (0.060, 0.052, 0.055),
    }
    for i, p in enumerate(parts):
        s = Vector(seats[p.name])
        explode = s + Vector(explode_offsets[p.name])
        inspect = s + Vector(((-1 if i % 2 else 1) * 0.06, (i - 3) * 0.01, 0.055 + i * 0.004))
        add_keyframes(p, s, explode, inspect, 42 + i * 7, MOTION_PROFILES[p.name])

    # Defensive cleanup for headless Blender startup datablocks that can
    # survive factory reset and otherwise export as a 2 m default Cube.
    for ob in list(bpy.data.objects):
        if ob.name in {'Cube', 'Camera', 'Light'}:
            bpy.data.objects.remove(ob, do_unlink=True)

    scene = bpy.context.scene
    scene.frame_start = 1; scene.frame_end = 120; scene.render.fps = 24
    scene.frame_set(1)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_apply=True)

    manifest = {
        'kind': 'candidate-only', 'generator': 'tools/build-blender-candidate.py',
        'targetFootprint': 'approximately 100x60 mm; supplied STL measured 105x65x15 mm',
        'sourceCase': CASE, 'sourceCaseUnits': 'raw STL values interpreted as millimetres',
        'sourceDimensionsMm': {
            'case': [105.0, 65.0, 15.0],
            'charge_module': [29.3, 17.4, 4.14],
            'battery': [53.1, 46.821, 6.0],
            'led': [5.58, 6.0, 36.5],
            'switch': [4.1, 7.82, 6.0],
        },
        'referencePhoto': 'assets/3d/references/solarpanel.jpg',
        'convertedCadSources': {
            'charge_module': 'source-assets/external/user-supplied/tp4056-user-supplied.stl',
            'battery': 'source-assets/external/user-supplied/battery-user-supplied.stl',
            'led': 'source-assets/external/user-supplied/led-user-supplied.stl',
            'switch': 'source-assets/external/pass9/derived/switch-dip-slide.stl',
        },
        'parts': ['enclosure','solar_panel_placeholder','battery','charge_module','led_left','led_right','switch'],
        'motionProfiles': {
            name: {key: [round(math.degrees(value), 1) for value in rotation] for key, rotation in profile.items()}
            for name, profile in MOTION_PROFILES.items()
        },
        'visualDetails': ['solar panel has a raised frame, bus lines, and cell-strip details', 'battery has lightweight provisional Kapton band, label plate, and lead cue parented to the supplied mesh', 'TP4056 board has lightweight blue PCB, USB-C, and component cues parented to the supplied mesh'],
        'provisional': ['solar panel is reference-informed geometry; no solar-panel CAD supplied', 'led_right duplicates the supplied single LED', 'battery and switch seating are provisional', 'user-supplied STEP files were converted to coarse browser-safe STL meshes through FreeCAD'],
        'authoredAction': 'ScrollSequence', 'frameRange': [1, 120],
        'timeline': {'closed': 0.0, 'explodedReview': 0.67, 'reassembled': 1.0},
        'fallbackPreserved': 'assets/3d/flashlight-assembly.glb',
        'validation': {'blender': 'export completed; inspect GLB node/action metadata before web integration'}
    }
    with open(MANIFEST, 'w', encoding='utf-8') as f: json.dump(manifest, f, indent=2)

if __name__ == '__main__': main()

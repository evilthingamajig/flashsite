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
TP4056 = os.path.join(ROOT, "source-assets", "external", "user-supplied", "tp4056-authoritative-freecad.stl")
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

def mat(name, color, metallic=0.0, roughness=0.45, transmission=0.0,
        emission=None, emission_strength=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1.0)
    bs.inputs['Metallic'].default_value = metallic
    bs.inputs['Roughness'].default_value = roughness
    if 'Transmission Weight' in bs.inputs:
        bs.inputs['Transmission Weight'].default_value = transmission
    if emission is not None:
        if 'Emission Color' in bs.inputs:
            bs.inputs['Emission Color'].default_value = (*emission, 1.0)
        if 'Emission Strength' in bs.inputs:
            bs.inputs['Emission Strength'].default_value = emission_strength
    return m

def solar_material():
    # Cell layout and proportions follow the supplied solar-panel reference
    # photo. Geometry details below are used instead of the contact-sheet
    # pixels so the GLB stays self-contained and free of white background.
    # Darken the base so the pale frame, bright bus lines, and cell strips
    # read as physically distinct layers on the dark cell surface.
    return mat('SolarPhotoCell', (0.006, 0.018, 0.04), metallic=0.12, roughness=0.32)

def add_solar_details(panel, bus_material, line_material):
    details = []
    frame_material = bpy.data.materials.get('SolarFrame') or mat('SolarFrame', (0.78, 0.76, 0.68), metallic=0.22, roughness=0.32)
    screw_material = bpy.data.materials.get('SolarScrew') or mat('SolarScrew', (0.62, 0.64, 0.62), metallic=0.85, roughness=0.18)
    # The supplied product photo shows a pale perimeter frame, four corner
    # screws, a dark center divider, and fine parallel cell strips.
    # Wider frame bars with a raised profile so the pale perimeter reads as a
    # physical bezel that visibly contains the dark cell strips.
    frame_parts = [
        ('solar_frame_top', (0.098, 0.0026, 0.0011), (0.0, 0.0277, 0.00135)),
        ('solar_frame_bottom', (0.098, 0.0026, 0.0011), (0.0, -0.0277, 0.00135)),
        ('solar_frame_left', (0.0026, 0.0534, 0.0011), (-0.0477, 0.0, 0.00135)),
        ('solar_frame_right', (0.0026, 0.0534, 0.0011), (0.0477, 0.0, 0.00135)),
    ]
    details.extend(cube(name, dims, loc, frame_material) for name, dims, loc in frame_parts)
    # Centre divider and bus lines sit visibly above the cell surface.
    details.append(cube('solar_center_divider', (0.0036, 0.054, 0.00036), (0.0, 0.0, 0.00122), bus_material))
    for x in (-0.025, 0.025):
        details.append(cube('solar_bus', (0.0016, 0.054, 0.00032), (x, 0.0, 0.00118), bus_material))
    # Cell-strip lines are raised above the dark base so they read as the
    # fine conductive grid visible on a real panel.
    for index in range(13):
        y = -0.024 + index * 0.004
        details.append(cube('solar_cell_line', (0.094, 0.00022, 0.00028), (0.0, y, 0.00116), line_material))
    # Enlarge screw heads so the four corner fasteners are legible at
    # product-explosion scale.
    for index, (x, y) in enumerate(((-0.042, -0.022), (0.042, -0.022), (-0.042, 0.022), (0.042, 0.022))):
        screw = cylinder('solar_screw_head_' + str(index + 1), 0.0016, 0.00055, (x, y, 0.00175), screw_material)
        details.append(screw)
    for detail in details:
        detail.parent = panel
        detail.location = (detail.location.x, detail.location.y, detail.location.z)
    return details

def add_solar_connection_details(panel, connector_material, lead_material):
    # Make the rear connector block and wire thicker so they read as a
    # physical solder point and lead on the panel underside.
    connector = cube('solar_rear_connector', (0.008, 0.010, 0.0020), (0.0, 0.0, 0.0), connector_material)
    parent_detail(connector, panel, (0.028, 0.014, -0.0014))
    wire_detail('solar_rear_wire', panel, [
        (0.028, 0.014, -0.0015), (0.034, 0.018, -0.0012), (0.041, 0.018, -0.0010)
    ], lead_material, bevel=0.00052)

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

def cylinder(name, radius, depth, loc, material):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=depth, location=loc)
    ob = bpy.context.object
    ob.name = name
    ob.data.name = name
    ob.data.materials.append(material)
    return ob

def set_mat(ob, material):
    ob.data.materials.clear()
    ob.data.materials.append(material)

def parent_detail(detail, parent, location):
    detail.parent = parent
    detail.location = location
    return detail

def wire_detail(name, parent, points, material, bevel=0.00042):
    curve_data = bpy.data.curves.new(name, type='CURVE')
    curve_data.dimensions = '3D'
    curve_data.resolution_u = 2
    curve_data.bevel_depth = bevel
    curve_data.bevel_resolution = 1
    spline = curve_data.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1.0)
    wire = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(wire)
    wire.data.materials.append(material)
    wire.parent = parent
    wire.location = (0.0, 0.0, 0.0)
    return wire

def add_battery_details(battery, kapton, battery_label, lead_material):
    # Keep the supplied pouch as the authoritative envelope and add only the
    # visible physical cues that survive the low-poly browser export.
    band = cube('battery_kapton_band', (0.054, 0.006, 0.0064), (0.0, 0.0, 0.0), kapton)
    parent_detail(band, battery, (0.0, 0.011, 0.0002))
    tag = cube('battery_label_plate', (0.022, 0.014, 0.00024), (0.0, 0.0, 0.0), battery_label)
    parent_detail(tag, battery, (0.008, -0.006, 0.0031))
    lead = cube('battery_lead_pair', (0.012, 0.0012, 0.0008), (0.0, 0.0, 0.0), lead_material)
    parent_detail(lead, battery, (0.022, 0.023, 0.0022))
    wire_detail('battery_lead_wire', battery, [
        (0.018, 0.023, 0.0022), (0.027, 0.025, 0.0028), (0.034, 0.022, 0.0030)
    ], lead_material)

def add_charge_details(charge, solder, usb_metal, lead_material):
    # TP4056 boards are visually defined by the blue PCB, USB-C end, and a
    # handful of dark/silver components; these cues remain intentionally light.
    port = cube('charge_usb_c_port', (0.0045, 0.009, 0.0032), (0.0, 0.0, 0.0), usb_metal)
    parent_detail(port, charge, (0.0148, 0.0, 0.0018))
    chip = cube('charge_controller_chip', (0.006, 0.005, 0.0012), (0.0, 0.0, 0.0), solder)
    parent_detail(chip, charge, (-0.003, 0.002, 0.0022))
    resistor = cube('charge_resistor_bank', (0.011, 0.002, 0.001), (0.0, 0.0, 0.0), solder)
    parent_detail(resistor, charge, (-0.008, -0.004, 0.0021))
    wire_detail('charge_input_wire', charge, [
        (-0.014, 0.006, 0.0018), (-0.019, 0.008, 0.0015), (-0.024, 0.006, 0.0012)
    ], lead_material)

def add_led_wire(led, lead_material, side):
    z = 0.0012 if side == 'left' else -0.0012
    wire_detail('led_wire_' + side, led, [
        (0.010, 0.0, 0.0), (0.016, 0.0, z), (0.022, 0.0, z)
    ], lead_material)

def add_switch_details(switch, actuator_material, red_material, black_material):
    # The pass9 mesh remains the authoritative switch body; this inset slider
    # makes the body/actuator relationship legible without changing its seat.
    actuator = cube('switch_actuator', (0.0024, 0.0034, 0.0018), (0.0, 0.0, 0.0), actuator_material)
    parent_detail(actuator, switch, (0.0, 0.0, 0.0020))
    # Two short inward-running wire cues exiting from the switch's positive-Y
    # seat toward negative Y into the enclosure.  The switch sits at y ≈ 0.029
    # (positive-Y case wall); these 3-point polylines drop ~2 mm in Z over a
    # ~6 mm Y run so they read as short leads routed into the shell interior.
    wire_detail('switch_red_wire', switch, [
        (0.0008, 0.0, 0.0024),
        (0.0008, -0.003, 0.0016),
        (0.0008, -0.006, 0.0010),
    ], red_material, bevel=0.00028)
    wire_detail('switch_black_wire', switch, [
        (-0.0008, 0.0, 0.0024),
        (-0.0008, -0.003, 0.0016),
        (-0.0008, -0.006, 0.0010),
    ], black_material, bevel=0.00028)

def add_led_details(led, die_material):
    die = cylinder('led_die_' + led.name, 0.0012, 0.0007, (0.0, 0.0, 0.0), die_material)
    parent_detail(die, led, (-0.002, 0.0, 0.0))
    return die

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
    # The supplied battery and TP4056 meshes can retain exact duplicate
    # triangles after decimation. Remove only duplicate vertex-index sets so
    # the visible shell and all measured bounds remain unchanged.
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    seen_faces = set()
    duplicate_faces = []
    for face in bm.faces:
        signature = tuple(sorted(vertex.index for vertex in face.verts))
        if signature in seen_faces:
            duplicate_faces.append(face)
        else:
            seen_faces.add(signature)
    if duplicate_faces:
        bmesh.ops.delete(bm, geom=duplicate_faces, context='FACES')
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(ob.data)
        ob.data.update()
    bm.free()

def fit_dimensions(ob, dimensions):
    """Restore a decimated derived mesh to its measured CAD envelope."""
    measured = tuple(float(value) for value in ob.dimensions)
    ob.scale = tuple(target / actual for target, actual in zip(dimensions, measured))
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    ob.select_set(False)
    ob.data.update()

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
    # Brighter bus bars and cell lines so they contrast against the darkened
    # cell surface; the pale frame already sits higher via add_solar_details.
    solar_bus = mat('SolarBus', (0.18, 0.20, 0.17), metallic=0.5, roughness=0.25)
    solar_line = mat('SolarCellLine', (0.40, 0.50, 0.58), metallic=0.30, roughness=0.22)
    foil = mat('BatteryFoil', (0.74, 0.75, 0.74), metallic=0.78, roughness=0.18)
    kapton = mat('BatteryKapton', (0.90, 0.64, 0.07), roughness=0.40)
    battery_label = mat('BatteryLabel', (0.02, 0.03, 0.055), roughness=0.55)
    battery_lead = mat('BatteryLead', (0.48, 0.46, 0.43), metallic=0.72, roughness=0.24)
    pcb = mat('PcbBlue', (0.02, 0.12, 0.42), roughness=0.34)
    solder = mat('PcbComponent', (0.55, 0.56, 0.55), metallic=0.65, roughness=0.22)
    usb_metal = mat('UsbMetal', (0.42, 0.44, 0.44), metallic=0.85, roughness=0.18)
    ledmat = mat('LedClear', (0.88, 0.92, 0.94), roughness=0.10, transmission=0.85,
                 emission=(0.95, 0.92, 0.82), emission_strength=0.08)
    led_die = mat('LedDie', (0.92, 0.88, 0.72), roughness=0.22,
                  emission=(1.0, 0.94, 0.78), emission_strength=0.12)
    switchmat = mat('SwitchPlastic', (0.040, 0.042, 0.045), roughness=0.55)
    actuator_mat = mat('SwitchActuator', (0.20, 0.20, 0.19), metallic=0.12, roughness=0.30)
    wire_red = mat('SwitchWireRed', (0.78, 0.05, 0.03), roughness=0.36)
    wire_black = mat('SwitchWireBlack', (0.012, 0.012, 0.012), roughness=0.52)

    enclosure = import_stl(CASE, 'enclosure')
    set_mat(enclosure, charcoal)
    # Case STL is unitless raw millimetres; center it for authored pivots.
    b = [enclosure.matrix_world @ Vector(c) for c in enclosure.bound_box]
    center = sum(b, Vector()) / 8.0
    enclosure.location -= center

    mount_mat = mat('MountBlockPlastic', (0.04, 0.045, 0.05), roughness=0.55)
    block_dims = (0.005, 0.005, 0.006)
    block_z = -0.0045
    mount_positions = [
        ('enclosure_mount_block_1', ( 0.042,  0.024, block_z)),
        ('enclosure_mount_block_2', (-0.042,  0.024, block_z)),
        ('enclosure_mount_block_3', (-0.042, -0.024, block_z)),
        ('enclosure_mount_block_4', ( 0.042, -0.024, block_z)),
    ]
    mount_blocks = []
    for mname, mloc in mount_positions:
        blk = cube(mname, block_dims, (0.0, 0.0, 0.0), mount_mat)
        # The imported case mesh keeps its raw STL origin while the object is
        # translated by -center. Convert the desired world seat to the
        # enclosure's local coordinates so the child stays inside the shell.
        parent_detail(blk, enclosure, tuple(Vector(mloc) - enclosure.location))
        mount_blocks.append(blk)
    # Seat a small fastener head into the top of each interior mount post so
    # the blocks read as real screw-down points rather than floating plastic.
    screw_head_mat = mat('MountScrew', (0.60, 0.62, 0.60), metallic=0.85, roughness=0.20)
    for blk in mount_blocks:
        screw = cylinder('mount_screw_' + blk.name, 0.0011, 0.0010, (0.0, 0.0, 0.0), screw_head_mat)
        screw.parent = blk
        screw.location = (0.0, 0.0, 0.0032)

    panel = cube('solar_panel_placeholder', (0.098, 0.058, 0.0018), (0.0, 0.0, 0.0088), solar)
    add_solar_details(panel, solar_bus, solar_line)
    add_solar_connection_details(panel, usb_metal, battery_lead)
    charge = import_stl(TP4056, 'charge_module')
    set_mat(charge, pcb)
    reduce_mesh(charge, 0.03)
    fit_dimensions(charge, (0.0293, 0.0174, 0.00414))
    charge.location = (0.0, 0.016, -0.002)
    add_charge_details(charge, solder, usb_metal, battery_lead)
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
    add_led_details(led_a, led_die)
    add_led_details(led_b, led_die)
    add_led_wire(led_a, battery_lead, 'left')
    add_led_wire(led_b, battery_lead, 'right')
    # The LEDs belong on the short end of the case. Their clear/lens end is
    # the negative-X end after the Y rotation; the body runs back into the
    # enclosure from an X seat near the end wall.
    led_a.location = (-0.046, -0.012, 0.0)
    led_b.location = (-0.046, 0.012, 0.0)
    sw = import_stl(SWITCH, 'switch', scale=BLENDER_MM)
    set_mat(sw, switchmat)
    center_mesh_origin(sw)
    # Seat the switch against the positive-Y case wall. Keeping its body
    # centered on the wall edge makes the control read as physically mounted
    # in the closed three-quarter view instead of floating inside the shell.
    sw.location = (0.0, 0.029, 0.0)
    add_switch_details(sw, actuator_mat, wire_red, wire_black)

    switch_surround_mat = mat('SwitchSurround', (0.04, 0.045, 0.05), roughness=0.55)
    switch_surround = cube('switch_case_surround', (0.012, 0.0010, 0.008), (0.0, 0.0, 0.0), switch_surround_mat)
    # Parent to the enclosure so the surround follows the case shell through
    # the closed and exploded poses.  Convert the switch's world seat to the
    # enclosure's local coordinates and align the bracket's positive-Y face
    # flush with the switch's positive-Y seating edge.
    parent_detail(switch_surround, enclosure, tuple(Vector(sw.location) - enclosure.location))
    switch_surround.location.y -= 0.0006

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
        'mediaLibraryReferences': ['assets/3d/references/solar-panel-tops.png', 'assets/3d/references/flashlight-units-group.png', 'assets/3d/references/flashlight-internals-charging-board.png'],
        'convertedCadSources': {
            'charge_module': 'source-assets/external/user-supplied/tp4056-authoritative-freecad.stl',
            'battery': 'source-assets/external/user-supplied/battery-user-supplied.stl',
            'led': 'source-assets/external/user-supplied/led-user-supplied.stl',
            'switch': 'source-assets/external/pass9/derived/switch-dip-slide.stl',
        },
        'parts': ['enclosure','solar_panel_placeholder','battery','charge_module','led_left','led_right','switch'],
        'motionProfiles': {
            name: {key: [round(math.degrees(value), 1) for value in rotation] for key, rotation in profile.items()}
            for name, profile in MOTION_PROFILES.items()
        },
        'visualDetails': ['solar panel has a raised pale frame with enhanced metallic contrast, brighter bus lines, brighter cell-strip grid, four enlarged corner screw heads, and a thickened rear connector/wire cue', 'battery has lightweight provisional Kapton band, label plate, and lead cue parented to the supplied mesh', 'TP4056 board has lightweight blue PCB, USB-C, and component cues parented to the supplied mesh', 'switch body is darker matte plastic with a lighter contrasting actuator cue parented to the pass9 source mesh', 'switch has two short inward-running wire cues (switch_red_wire, switch_black_wire) parented to the switch, routed toward negative Y into the enclosure', 'LED lenses have subtle warm-white emission with an inner die cylinder for physical lens contrast', 'enclosure has four interior corner mount blocks (enclosure_mount_block_1..4) parented to the case shell', 'mount blocks are 5x5x6 mm dark plastic cubes at ±42 mm X, ±24 mm Y, z −4.5 mm', 'each interior mount block carries a small metallic fastener head (mount_screw_enclosure_mount_block_1..4) seated into its top so the posts read as real screw-down points'],
        'provisional': ['solar panel is reference-informed geometry; no solar-panel CAD supplied', 'led_right duplicates the supplied single LED', 'battery and switch seating are provisional', 'user-supplied STEP files were converted to coarse browser-safe STL meshes through FreeCAD'],
        'authoredAction': 'ScrollSequence', 'frameRange': [1, 120],
        'timeline': {'closed': 0.0, 'explodedReview': 0.67, 'reassembled': 1.0},
        'fallbackPreserved': 'assets/3d/flashlight-assembly.glb',
        'validation': {'blender': 'export completed; inspect GLB node/action metadata before web integration'}
    }
    with open(MANIFEST, 'w', encoding='utf-8') as f: json.dump(manifest, f, indent=2)

if __name__ == '__main__': main()

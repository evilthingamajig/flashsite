"""Headless Blender 5.2+ review render of the candidate flashlight GLB.

Writes a Workbench-shaded PNG to review/blender-candidate-frame-<frame>.png
from a three-quarter camera angle, with no scene lights required.

Usage (run from the repository root)::

    blender -b --python tools/render-blender-candidate-review.py
    blender -b --python tools/render-blender-candidate-review.py -- 120
"""
import bpy
import math
import os
import sys
from mathutils import Vector

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GLB = os.path.join(ROOT, "assets", "3d", "flashlight-assembly-blender-candidate.glb")
REVIEW_DIR = os.path.join(ROOT, "review")

# Default frame after Blender's "--" separator; falls back to 120.
FRAME = int(sys.argv[sys.argv.index("--") + 1]) if "--" in sys.argv else 120


def main():
    if not os.path.isfile(GLB):
        raise FileNotFoundError("candidate GLB not found: " + GLB)

    bpy.ops.wm.read_factory_settings(use_empty=True)

    bpy.ops.import_scene.gltf(filepath=GLB)
    imported = list(bpy.context.selected_objects)

    # Compute bounds of all imported meshes for camera framing.
    world_min = Vector((float("inf"),) * 3)
    world_max = Vector((float("-inf"),) * 3)
    for obj in imported:
        if obj.type != "MESH":
            continue
        for corner in obj.bound_box:
            world = obj.matrix_world @ Vector(corner)
            world_min.x = min(world_min.x, world.x)
            world_min.y = min(world_min.y, world.y)
            world_min.z = min(world_min.z, world.z)
            world_max.x = max(world_max.x, world.x)
            world_max.y = max(world_max.y, world.y)
            world_max.z = max(world_max.z, world.z)

    center = (world_min + world_max) / 2.0
    span = (world_max - world_min).length
    radius = span / 2.0

    scene = bpy.context.scene
    scene.frame_set(FRAME)

    # Set up the camera at a three-quarter angle.
    cam_data = bpy.data.cameras.new("ReviewCamera")
    cam_data.clip_start = 0.001
    cam_data.clip_end = max(radius * 10, 1.0)
    cam_data.lens = 50
    cam_data.type = "PERSP"
    cam_obj = bpy.data.objects.new("ReviewCamera", cam_data)
    scene.collection.objects.link(cam_obj)

    # View from the negative-X short end so both LED heads remain visible.
    cam_distance = radius * 2.8
    elevation = math.radians(22)
    azimuth = math.radians(135)
    cam_pos = Vector((
        center.x + cam_distance * math.cos(elevation) * math.cos(azimuth),
        center.y + cam_distance * math.cos(elevation) * math.sin(azimuth),
        center.z + cam_distance * math.sin(elevation),
    ))
    cam_obj.location = cam_pos
    direction = center - cam_obj.location
    rot = direction.to_track_quat("-Z", "Y")
    cam_obj.rotation_euler = rot.to_euler("XYZ")
    scene.camera = cam_obj

    # Workbench renderer: no lights, no world – solid viewport colors.
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "FLAT"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shadow_shift = 0.1
    scene.view_settings.view_transform = "Standard"

    # Render settings.
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"

    os.makedirs(REVIEW_DIR, exist_ok=True)
    out_path = os.path.join(REVIEW_DIR, "blender-candidate-frame-%d.png" % FRAME)
    scene.render.filepath = out_path

    bpy.ops.render.render(write_still=True)
    print("Wrote review render to: " + out_path)


if __name__ == "__main__":
    main()

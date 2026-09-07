"""Build the web duck from the selected CC0 Plat251 / Poly Haven asset.

Run with Blender 5.2 or newer:
    blender --background --python tools/build_duck.py

The script opens the local 1K Blend source, adds one Catmull-Clark subdivision
pass for a smooth hero-scale silhouette, saves an editable packed .blend, and
exports a self-contained web GLB. No network request is made during the build.
"""

from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "tools" / "blender" / "vendor" / "polyhaven-rubber-duck" / "rubber_duck_toy_1k.blend"
MODEL_DIR = ROOT / "assets" / "models"
BLENDER_DIR = ROOT / "tools" / "blender"
PREVIEW_DIR = ROOT / "output" / "playwright"
GLB_PATH = MODEL_DIR / "ave-duck.glb"
BLEND_PATH = BLENDER_DIR / "ave-duck.blend"
PREVIEW_PATH = PREVIEW_DIR / "ave-duck-preview.png"

for directory in (MODEL_DIR, BLENDER_DIR, PREVIEW_DIR):
    directory.mkdir(parents=True, exist_ok=True)


def scene_bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


def point_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_area(name, location, target, energy, size, color):
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name = name
    light.data.energy = energy
    light.data.shape = "DISK"
    light.data.size = size
    light.data.color = color
    point_at(light, target)
    return light


if not SOURCE.exists():
    raise FileNotFoundError(f"Missing local CC0 source: {SOURCE}")

bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
if not meshes:
    raise RuntimeError("The selected duck asset did not contain a mesh")

for obj in meshes:
    obj.name = "Plat251 Rubber Duck" if len(meshes) == 1 else f"Plat251 Rubber Duck {obj.name}"
    for polygon in obj.data.polygons:
        polygon.use_smooth = True

    # The source carries Blender's optional auto-smooth geometry-nodes helper.
    # Smooth shading plus subdivision is enough here and keeps export topology clean.
    for modifier in list(obj.modifiers):
        if modifier.type == "NODES" and modifier.name == "Auto Smooth":
            obj.modifiers.remove(modifier)

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    subdivision = obj.modifiers.new("Hero silhouette resolution", "SUBSURF")
    subdivision.subdivision_type = "CATMULL_CLARK"
    subdivision.levels = 1
    subdivision.render_levels = 1
    subdivision.show_only_control_edges = True
    bpy.ops.object.modifier_apply(modifier=subdivision.name)
    obj.select_set(False)

    for material_slot in obj.material_slots:
        material = material_slot.material
        if material:
            material.name = "Plat251 Duck PBR"

# Put an explicit root at the model centre. duck.js recentres the final bounds,
# while this root keeps the asset tidy for future Blender edits.
minimum, maximum = scene_bounds(meshes)
center = (minimum + maximum) * 0.5
root = bpy.data.objects.new("Ave Duck Root", None)
bpy.context.collection.objects.link(root)
root.location = center
for obj in meshes:
    world_matrix = obj.matrix_world.copy()
    obj.parent = root
    obj.matrix_world = world_matrix

# Pack the original 1K PBR maps into the editable Blender source.
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

# Export only the duck root and mesh. Textures are embedded in the GLB.
bpy.ops.object.select_all(action="DESELECT")
root.select_set(True)
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(
    filepath=str(GLB_PATH),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_materials="EXPORT",
    export_image_format="AUTO",
    export_texcoords=True,
    export_normals=True,
    export_tangents=True,
    export_draco_mesh_compression_enable=False,
)

# Add a restrained studio setup for a truthful local preview. These lights are
# intentionally added after GLB export, so the browser owns its lighting.
minimum, maximum = scene_bounds(meshes)
center = (minimum + maximum) * 0.5
size = maximum - minimum
radius = max(size) * 0.5

bpy.ops.object.camera_add(
    location=(center.x + radius * 0.75, center.y - radius * 4.2, center.z + radius * 0.28)
)
camera = bpy.context.object
camera.name = "Preview Camera"
camera.data.lens = 58
point_at(camera, center)
bpy.context.scene.camera = camera

add_area(
    "Soft neutral key",
    center + Vector((-radius * 2.7, -radius * 3.1, radius * 3.4)),
    center,
    42,
    radius * 3.1,
    (1.0, 0.92, 0.78),
)
add_area(
    "Gentle fill",
    center + Vector((radius * 3.0, -radius * 1.6, radius * 1.7)),
    center,
    24,
    radius * 2.8,
    (0.78, 0.88, 1.0),
)
add_area(
    "Warm rim",
    center + Vector((radius * 0.5, radius * 2.8, radius * 2.8)),
    center,
    34,
    radius * 2.2,
    (1.0, 0.62, 0.28),
)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1200
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.film_transparent = False
if scene.world is None:
    scene.world = bpy.data.worlds.new("Preview World")
scene.world.color = (0.015, 0.015, 0.012)
scene.render.filepath = str(PREVIEW_PATH)
try:
    scene.view_settings.look = "AgX - Medium High Contrast"
except TypeError:
    scene.view_settings.look = "Medium High Contrast"
bpy.ops.render.render(write_still=True)

# Keep camera and studio lights in the editable source for convenient inspection.
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))

triangles = 0
for obj in meshes:
    dependency_graph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(dependency_graph)
    temporary_mesh = evaluated.to_mesh()
    temporary_mesh.calc_loop_triangles()
    triangles += len(temporary_mesh.loop_triangles)
    evaluated.to_mesh_clear()

print(f"Source: {SOURCE}")
print(f"Saved: {BLEND_PATH}")
print(f"Saved: {GLB_PATH} ({GLB_PATH.stat().st_size} bytes, {triangles} triangles)")
print(f"Rendered: {PREVIEW_PATH}")

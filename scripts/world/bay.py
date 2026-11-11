# blender --background --python scripts/world/bay.py -- scripts/world/bay-opening.json out.glb [bake_size] [samples]
# The Range Rover's engine bay, built to the measured opening of the car, with its light baked in so it costs almost
# nothing to draw. Site coordinates: x across, y up, z towards the front of the car. Empty where the V8 has just left.
import bpy, bmesh, json, math, os, sys
from mathutils import Vector, Matrix

a = sys.argv[sys.argv.index("--") + 1:]
data, out = os.path.abspath(a[0]), os.path.abspath(a[1])
SIZE = int(a[2]) if len(a) > 2 else 2048
SAMPLES = int(a[3]) if len(a) > 3 else 96
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)

S = lambda x, y, z: Vector((x, -z, y))  # site to Blender (z up)

COL = {
    "paint": (.6, .59, .57, .42), "paintdark": (.075, .076, .08, .5), "black": (.018, .018, .02, .55), "soft": (.008, .008, .009, .8),
    "plastic": (.035, .036, .04, .42), "alu": (.46, .47, .49, .35), "steel": (.22, .23, .24, .4), "hose": (.012, .012, .013, .6),
    "orange": (.95, .24, .02, .4), "red": (.62, .02, .025, .35), "yellow": (.9, .62, .03, .35), "blue": (.03, .16, .6, .35),
    "milk": (.34, .31, .22, .35), "fin": (.16, .165, .17, .5),
}
B = {k: bmesh.new() for k in COL}


def box(m, c, s, bev=0.0):
    bm = B[m]
    M = Matrix.Translation(S(*c)) @ Matrix.Diagonal((s[0], s[2], s[1], 1))
    v = bmesh.ops.create_cube(bm, size=1, matrix=M)["verts"]
    if bev:
        edges = list({e for x in v for e in x.link_edges})
        bmesh.ops.bevel(bm, geom=edges, offset=bev, segments=2, profile=.5, affect="EDGES", clamp_overlap=True)


def cyl(m, p0, p1, r0, r1=None, seg=20, caps=True):
    bm = B[m]
    r1 = r0 if r1 is None else r1
    p0, p1 = S(*p0), S(*p1)
    d = p1 - p0
    M = Matrix.Translation((p0 + p1) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.create_cone(bm, cap_ends=caps, cap_tris=False, segments=seg, radius1=r0, radius2=r1, depth=d.length, matrix=M)


def tube(m, pts, r, seg=9, sub=10):
    bm = B[m]
    P = [S(*p) for p in pts]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    C = []
    for i in range(1, len(P) - 2):
        for k in range(sub):
            t = k / sub
            p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
            C.append(.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t))
    C.append(P[-2])
    up = Vector((.13, .29, .95))
    rings = []
    for i, c in enumerate(C):
        tan = (C[min(i + 1, len(C) - 1)] - C[max(i - 1, 0)]).normalized()
        x = tan.cross(up).normalized()
        up = x.cross(tan).normalized()
        rings.append([bm.verts.new(c + (x * math.cos(j / seg * 6.283) + up * math.sin(j / seg * 6.283)) * r) for j in range(seg)])
    for a_, b_ in zip(rings, rings[1:]):
        for j in range(seg):
            k = (j + 1) % seg
            bm.faces.new((a_[j], a_[k], b_[k], b_[j]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])


# ---------------------------------------------------- the shell, from the measured opening
raw = json.load(open(data))["bay"]
top = {}
for x, y, z in raw:
    if y > .8:
        k = (round(x, 2), round(z + 6, 2))
        top[k] = max(top.get(k, 0), y)
CZ = 1.5
ring = sorted(([x, y, z] for (x, z), y in top.items()), key=lambda p: math.atan2(p[0], p[2] - CZ))
print("ring", len(ring))


def inset(p, d):
    v = Vector((p[0], p[2] - CZ))
    k = max(0, 1 - d / v.length)
    return p[0] * k, CZ + (p[2] - CZ) * k


def loop(m, d, y=None, dy=0):
    return [(*inset(p, d), (p[1] + dy) if y is None else y) for p in ring], m


LOOPS = [loop("paint", 0, dy=-.012), loop("paint", 0, dy=-.05), loop("paint", .035, dy=-.075), loop("paint", .115, dy=-.085), loop("paint", .125, dy=-.12),
         loop("paint", .135, y=.72), loop("paintdark", .17, y=.60), loop("black", .19, y=.40)]
prev = None
for pts, m in LOOPS:
    bm = B[m]
    cur = [bm.verts.new(S(x, y, z)) for x, z, y in pts]
    if prev is not None:
        pm, pv = prev
        if pm != m:  # a new material starts a fresh strip on the same line
            pv = [B[m].verts.new(v.co.copy()) for v in pv]
        for i in range(len(cur)):
            j = (i + 1) % len(cur)
            B[m].faces.new((pv[i], pv[j], cur[j], cur[i]))
    prev = (m, cur)
B["black"].faces.new(prev[1][::-1])

# ---------------------------------------------------- the bulkhead, across the back
box("plastic", (0, 1.075, .91), (1.56, .13, .16), .022)                      # the scuttle
for i in range(-13, 14):
    box("soft", (i * .054, 1.10, .993), (.03, .055, .012), .002)             # its vents
box("paintdark", (0, .80, .875), (1.52, .42, .05))                           # the bulkhead panel
for i in range(6):
    box("paintdark", (0, .635 + i * .058, .905), (1.36 - .02 * abs(i - 2), .026, .016), .006)  # stamped ribs
cyl("black", (0, .47, .86), (0, .47, 1.30), .25, .22, 28)                    # transmission tunnel
cyl("soft", (0, .47, 1.3), (0, .47, 1.31), .19, .19, 28)

# brake booster, master cylinder, fluid reservoir
cyl("black", (-.45, .80, .92), (-.45, .80, 1.07), .125, .125, 32)
cyl("steel", (-.45, .80, 1.07), (-.45, .80, 1.09), .10, .08, 28)
cyl("alu", (-.45, .80, 1.09), (-.45, .80, 1.25), .04, .036, 16)
box("milk", (-.45, .875, 1.165), (.17, .065, .09), .018)
cyl("yellow", (-.45, .905, 1.165), (-.45, .935, 1.165), .032, .03, 16)
tube("steel", [(-.40, .79, 1.2), (-.30, .74, 1.14), (-.22, .72, 1.02), (-.20, .72, .92)], .006, 6)
tube("steel", [(-.40, .77, 1.2), (-.28, .71, 1.16), (-.18, .69, 1.03), (-.16, .69, .92)], .006, 6)

# battery and its cable
box("black", (.46, .735, 1.03), (.30, .19, .19), .012)
box("plastic", (.46, .835, 1.03), (.31, .022, .20), .008)
box("red", (.575, .855, .985), (.06, .03, .055), .012)
cyl("steel", (.355, .845, .985), (.355, .875, .985), .018, .018, 12)
tube("red", [(.575, .865, .985), (.63, .90, 1.0), (.70, .92, 1.08), (.76, .90, 1.16)], .012)
tube("hose", [(.355, .87, .985), (.30, .90, .96), (.24, .93, .95)], .01)

# hybrid high-voltage cables: this is the PHEV
tube("orange", [(.10, .95, .93), (.13, .86, 1.0), (.18, .68, 1.03), (.28, .60, 1.16), (.42, .58, 1.3), (.52, .63, 1.46)], .021)
tube("orange", [(.04, .95, .93), (.07, .85, 1.02), (.12, .66, 1.08), (.22, .57, 1.21), (.36, .55, 1.36), (.48, .60, 1.5)], .021)
box("black", (.145, .80, 1.015), (.13, .024, .05), .006)
box("black", (.25, .60, 1.13), (.13, .024, .05), .006)

# heater hoses, with their clamps
for x, ex in ((-.10, -.02), (-.03, .05)):
    tube("hose", [(x, .86, .91), (x, .80, 1.0), (ex, .71, 1.12), (ex + .03, .62, 1.27), (ex + .05, .60, 1.42)], .022)
    cyl("alu", (x, .872, .905), (x, .86, .935), .027, .027, 12)
# the wiring loom, sagging along the bulkhead with its clips
tube("soft", [(-.70, .985, .96), (-.40, .965, .965), (-.05, .975, .965), (.30, .96, .965), (.70, .985, .96)], .017, 8, 14)
for x in (-.55, -.2, .15, .5):
    box("plastic", (x, .972, .972), (.03, .055, .03), .004)

# ---------------------------------------------------- the strut towers, in the car's own paint
for k in (-1, 1):
    x = k * .655
    cyl("paint", (x, .60, 1.26), (x, .985, 1.26), .20, .135, 36)
    cyl("paint", (x, .985, 1.26), (x, 1.0, 1.26), .135, .118, 36)
    cyl("black", (x, 1.0, 1.26), (x, 1.022, 1.26), .082, .07, 24)
    cyl("steel", (x, 1.022, 1.26), (x, 1.05, 1.26), .023, .02, 8)
    for i in range(3):
        an = i * 2.094 + .5
        bx, bz = x + math.cos(an) * .105, 1.26 + math.sin(an) * .105
        cyl("steel", (bx, 1.0, bz), (bx, 1.022, bz), .017, .017, 6)
    tube("steel", [(x - k * .19, .86, 1.12), (x - k * .13, .90, 1.05), (x - k * .02, .92, 1.03), (x + k * .09, .90, 1.08)], .006, 6)

# ---------------------------------------------------- ahead of the towers
# the air box, and its duct to where the engine was
box("plastic", (.50, .765, 1.66), (.42, .25, .43), .05)
box("black", (.50, .90, 1.66), (.36, .025, .37), .012)
for i in range(4):
    box("steel", (.33 + i * .115, .905, 1.86), (.03, .02, .018), .004)
cyl("plastic", (.33, .78, 1.58), (.30, .78, 1.57), .09, .09, 24)
tube("hose", [(.30, .78, 1.57), (.2, .76, 1.54), (.11, .70, 1.55), (.09, .63, 1.62)], .068, 14, 12)
cyl("alu", (.09, .635, 1.62), (.09, .585, 1.64), .074, .074, 20)

# coolant header tank, and hoses
box("milk", (-.50, .845, 1.62), (.30, .19, .22), .05)
box("milk", (-.50, .845, 1.62), (.312, .012, .232), .004)
cyl("yellow", (-.50, .94, 1.62), (-.50, .985, 1.62), .046, .042, 20)
tube("hose", [(-.36, .80, 1.60), (-.24, .78, 1.58), (-.12, .68, 1.66), (-.09, .60, 1.82)], .021)
tube("hose", [(-.56, .755, 1.64), (-.56, .68, 1.76), (-.44, .62, 1.88), (-.2, .60, 1.93)], .018)
# the fuse box
box("black", (-.50, .73, 1.92), (.30, .13, .17), .018)
box("plastic", (-.50, .80, 1.92), (.31, .022, .18), .008)
box("plastic", (-.61, .815, 1.92), (.03, .03, .05), .004)
box("plastic", (-.39, .815, 1.92), (.03, .03, .05), .004)
# washer filler with its blue cap
cyl("black", (.72, .84, 1.42), (.72, .95, 1.44), .028, .03, 14)
cyl("blue", (.72, .95, 1.44), (.72, .975, 1.44), .036, .034, 14)

# ---------------------------------------------------- the cooling pack and the slam panel at the front
box("fin", (0, .80, 2.03), (1.26, .24, .05), .004)
for i in range(30):
    box("alu", (-.6 + i * .0414, .80, 2.0), (.008, .225, .018))
box("paint", (0, .955, 2.03), (1.5, .05, .12), .018)
box("paint", (0, .925, 2.075), (1.3, .08, .03), .01)
box("black", (0, .985, 2.04), (.15, .022, .08), .008)
box("plastic", (-.28, .988, 2.03), (.05, .02, .05), .01)
box("plastic", (.28, .988, 2.03), (.05, .02, .05), .01)
box("steel", (.0, 1.0, 2.04), (.05, .02, .04), .006)
tube("hose", [(.42, .70, 1.97), (.3, .60, 1.92), (.15, .56, 1.78), (.1, .55, 1.68)], .03, 12)

# ---------------------------------------------------- the empty middle: subframe, mounts, steering rack
for k in (-1, 1):
    box("alu", (k * .34, .46, 1.45), (.09, .07, 1.05), .012)
    # the engine mount, sitting empty
    cyl("alu", (k * .30, .49, 1.46), (k * .30, .53, 1.46), .085, .07, 24)
    cyl("soft", (k * .30, .53, 1.46), (k * .30, .595, 1.46), .058, .052, 20)
    cyl("steel", (k * .30, .595, 1.46), (k * .30, .615, 1.46), .056, .056, 20)
    cyl("alu", (k * .30, .615, 1.46), (k * .30, .645, 1.46), .018, .016, 8)
    for i in range(4):
        an = i * 1.571 + .78
        bx, bz = k * .30 + math.cos(an) * .068, 1.46 + math.sin(an) * .068
        cyl("steel", (bx, .49, bz), (bx, .525, bz), .01, .01, 6)
box("alu", (0, .455, 1.86), (.74, .06, .09), .012)
box("alu", (0, .455, 1.10), (.74, .06, .09), .012)
cyl("steel", (-.5, .50, 1.27), (.5, .50, 1.27), .03, .03, 14)
for k in (-1, 1):
    for i in range(6):
        cyl("soft", (k * (.28 + i * .022), .50, 1.27), (k * (.29 + i * .022), .50, 1.27), .046, .046, 14)
for z in (1.42, 1.55, 1.68):
    box("soft", (0, .425, z), (1.0, .018, .03), .004)  # ribs in the splash shield

# ---------------------------------------------------- into one mesh, one bake
objs = []
for k, bm in B.items():
    if not bm.faces:
        bm.free()
        continue
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    for e in bm.edges:
        e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0) < .7
    me = bpy.data.meshes.new(k)
    bm.to_mesh(me)
    bm.free()
    me.polygons.foreach_set("use_smooth", [True] * len(me.polygons))
    mt = bpy.data.materials.new(k)
    mt.use_nodes = True
    p = next(n for n in mt.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = (*COL[k][:3], 1)
    p.inputs["Roughness"].default_value = COL[k][3]
    me.materials.append(mt)
    o = bpy.data.objects.new(k, me)
    bpy.context.scene.collection.objects.link(o)
    objs.append(o)
bpy.ops.object.select_all(action="DESELECT")
for o in objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.object.join()
kit = bpy.context.view_layer.objects.active
kit.name = "BayKit"
print("faces", len(kit.data.polygons), "verts", len(kit.data.vertices))

bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=.004)
bpy.ops.object.mode_set(mode="OBJECT")

# the light: heat where the V8 sat, and a soft lamp under the raised bonnet
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.samples = SAMPLES
sc.cycles.device = "CPU"
sc.cycles.use_denoising = False
w = bpy.data.worlds.new("w")
w.use_nodes = True
bg = next(n for n in w.node_tree.nodes if n.type == "BACKGROUND")
bg.inputs[0].default_value = (.5, .55, .62, 1)
bg.inputs[1].default_value = .06
sc.world = w


def light(kind, at, power, col, size=.5, aim=None):
    l = bpy.data.lights.new("l", kind)
    l.energy = power
    l.color = col
    if kind == "AREA":
        l.size = size
    else:
        l.shadow_soft_size = size
    o = bpy.data.objects.new("l", l)
    o.location = S(*at)
    if aim:
        o.rotation_euler = (S(*aim) - S(*at)).to_track_quat("-Z", "Y").to_euler()
    sc.collection.objects.link(o)


light("AREA", (0, 1.95, 1.75), 30, (1, .95, .88), 1.5, (0, .6, 1.05))  # the lamp, from the raised bonnet towards the bulkhead
light("POINT", (0, .78, 1.46), 7, (1, .36, .1), .22)                  # the heat where it sat
light("POINT", (-.62, 1.2, 1.55), 1.1, (1, .85, .7), .2)
light("POINT", (.62, 1.2, 1.55), 1.1, (1, .85, .7), .2)

img = bpy.data.images.new("bay_bake", SIZE, SIZE, alpha=False, float_buffer=True)
for mt in kit.data.materials:
    n = mt.node_tree.nodes.new("ShaderNodeTexImage")
    n.image = img
    mt.node_tree.nodes.active = n
    n.select = True
kit.select_set(True)
bk = sc.render.bake
bk.margin = 10
bk.use_pass_direct = bk.use_pass_indirect = True
bk.use_pass_diffuse = bk.use_pass_emit = True
bk.use_pass_glossy = bk.use_pass_transmission = False
bpy.ops.object.bake(type="COMBINED")

# Cycles bakes linear light: this curve keeps the shadows open and the white paint from clipping
px = list(img.pixels)
for i in range(0, len(px), 4):
    for c in range(3):
        v = px[i + c]
        px[i + c] = min(1, (v * 1.5 / (1 + v * .8))) ** (1 / 2.2)
final = bpy.data.images.new("bay_map", SIZE, SIZE, alpha=False)
final.pixels[:] = px
final.filepath_raw = out.rsplit(".", 1)[0] + "-bake.png"
final.file_format = "PNG"
final.save()

m2 = bpy.data.materials.new("BayKit")
m2.use_nodes = True
p = next(n for n in m2.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
t = m2.node_tree.nodes.new("ShaderNodeTexImage")
t.image = final
m2.node_tree.links.new(t.outputs[0], p.inputs["Base Color"])
kit.data.materials.clear()
kit.data.materials.append(m2)
for lo in [o for o in bpy.data.objects if o.type == "LIGHT"]:
    bpy.data.objects.remove(lo, do_unlink=True)
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=False, export_normals=False, export_image_format="WEBP", export_image_quality=82, export_materials="EXPORT", export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=out.rsplit(".", 1)[0] + ".blend")
print("done", out)

"""Render the Zatsu World star workshop, its turntable and board medallion with Blender."""
import math
import os
import sys
from pathlib import Path
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
out = Path(args[0]).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = True
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new("Observatory sky")
scene.world.use_nodes = True
scene.world.node_tree.nodes["Background"].inputs[0].default_value = (.33, .42, .54, 1)
scene.world.node_tree.nodes["Background"].inputs[1].default_value = .6
try:
    scene.view_settings.view_transform = 'AgX'
except TypeError:
    scene.view_settings.view_transform = 'Filmic'

def material(name, color, metal=0, rough=.36):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = rough
    return m

mint = material('Zatsu mint enamel', (.22, .81, .64))
cream = material('Ivory porcelain', (.99, .90, .70))
ink = material('Eyes - dark plum', (.025, .018, .045), 0, .18)
rose = material('Coral cheeks', (.99, .28, .39))
gold = material('Brushed brass', (.88, .51, .15), .65, .25)
navy = material('Midnight blue', (.035, .105, .18), .27)
blue = material('Sea glass', (.12, .51, .79), .12)
shine = material('Starlight', (1, .85, .38), .18)
plum = material('Lavender enamel', (.58, .37, .78))
def finish(obj, name, mat, smooth=True):
    obj.name = name
    obj.data.materials.append(mat)
    if smooth:
        for face in obj.data.polygons:
            face.use_smooth = True
    return obj
def ball(name, at, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, location=at)
    o = bpy.context.object
    o.scale = scale
    return finish(o, name, mat)
def cylinder(name, pos, radius, height, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=72, radius=radius, depth=height, location=pos)
    o = finish(bpy.context.object, name, mat, False)
    be = o.modifiers.new('Rounded rims', 'BEVEL')
    be.width = min(.065, height * .24)
    be.segments = 4
    o.modifiers.new('Polished flat caps', 'WEIGHTED_NORMAL')
    return o
def ring(name, pos, big, small, mat, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_torus_add(major_segments=80, minor_segments=12, location=pos, major_radius=big, minor_radius=small, rotation=rotation)
    return finish(bpy.context.object, name, mat)
def star(name, pos, radius, depth, mat, roll=0):
    vs=[]
    for y in (-depth, depth):
        for i in range(10):
            a=i*math.pi/5+math.pi/2+roll
            r=radius*(.44 if i%2 else 1)
            vs.append((r*math.cos(a),y,r*math.sin(a)))
    fs=[tuple(range(10)),tuple(range(19,9,-1))]
    fs.extend((i,10+i,10+(i+1)%10,(i+1)%10) for i in range(10))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vs,[],fs)
    mesh.update()
    o=bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(o)
    o.location=pos
    finish(o,name,mat,False)
    be=o.modifiers.new('Soft points','BEVEL')
    be.width=radius*.075
    be.segments=3
    o.modifiers.new('Faceted light','WEIGHTED_NORMAL')
    return o

def friend(name,x,y,z,s,mat,ears):
    ball(name+' body',(x,y,z),(.65*s,.58*s,.58*s),mat)
    for side in (-1,1):
        ball(name+' eye',(x+side*.208*s,y-.525*s,z+.055*s),(.058*s,.050*s,.077*s),ink)
        ball(name+' eye light',(x+(side*.208-.015)*s,y-.568*s,z+.08*s),(.016*s,.013*s,.019*s),cream)
        ball(name+' cheek',(x+side*.362*s,y-.46*s,z-.050*s),(.10*s,.034*s,.047*s),rose)
        if ears:
            ball(name+' ear',(x+side*.385*s,y+.02*s,z+.42*s),(.19*s,.15*s,.21*s),mat)
        ball(name+' foot',(x+side*.31*s,y-.22*s,z-.47*s),(.20*s,.22*s,.15*s),mat)
    ball(name+' smile',(x,y-.57*s,z-.069*s),(.063*s,.027*s,.034*s),ink)
cylinder('Observatory base',(0,0,-.30),2.46,.40,navy)
cylinder('Brass edge',(0,0,-.12),2.43,.09,gold)
cylinder('Table felt',(0,0,-.035),2.37,.10,mint)
for r in [2.15,1.93]:
    ring('Engraved guide',(0,0,.027),r,.012,gold)
for i in range(24):
    a=i*math.tau/24
    ball('Minute pearl',(2.25*math.cos(a),2.25*math.sin(a),.027),(.037,.037,.028),cream if i%3 else gold)
cylinder('Centre pedestal',(0,.13,.18),.92,.33,navy)
ring('Pedestal lip',(0,.13,.34),.88,.041,gold)
friend('Zatsu',0,.02,1.00,1.18,mint,True)
friend('Ishikoro',-1.29,-.19,.45,.75,plum,False)
friend('Bebi',1.28,-.18,.43,.72,cream,True)
ring('Orrery outer',(0,.5,1.22),1.85,.056,gold,(math.radians(71),.20,-.12))
ring('Orrery inner',(0,.5,1.22),1.64,.031,blue,(math.radians(59),-.32,.23))
star('North star',(.30,.88,3.01),.40,.07,shine,.12)
star('Comet',(-1.71,.38,1.72),.19,.045,cream,-.21)
star('Companion star',(1.64,.52,1.81),.23,.05,shine,.26)
for i in range(9):
    a=i*math.tau/9
    ball('Constellation bead',(1.83*math.cos(a),.53+.48*math.sin(a),1.23+1.65*math.sin(a)),(.072,.072,.072),rose if i%3==0 else cream)

def light(name, pos, energy, size, color):
    lamp=bpy.data.lights.new(name,'AREA')
    lamp.energy=energy
    lamp.shape='DISK'
    lamp.size=size
    lamp.color=color
    obj=bpy.data.objects.new(name,lamp)
    scene.collection.objects.link(obj)
    obj.location=pos
    obj.rotation_euler=(Vector((0,0,.75))-obj.location).to_track_quat('-Z','Y').to_euler()
light('Window',(-3.4,-4.2,6.5),560,5,(1,.89,.79))
light('Sea fill',(4,-2,4),410,4,(.69,.88,1))
light('Gold rim',(1.4,3.4,5.4),680,3.5,(1,.76,.57))
bpy.ops.object.camera_add()
cam=bpy.context.object
scene.camera=cam
cam.data.type='ORTHO'
def pose(angle,width):
    cam.location=(6.7*math.sin(angle),-6.7*math.cos(angle),4.15)
    cam.rotation_euler=(Vector((0,0,1.03))-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=width
def render(name,w,h):
    scene.render.resolution_x=w
    scene.render.resolution_y=h
    scene.render.filepath=str(out/(name+'.png'))
    bpy.ops.render.render(write_still=True)
pose(.12,6.8)
render('atelier',1000,720)
for i in range(8):
    pose(i*math.tau/8,5.85)
    render('view-%d'%i,400,340)

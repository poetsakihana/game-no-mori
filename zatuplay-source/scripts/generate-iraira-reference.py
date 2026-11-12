# Independent Python evaluation of the APK's start(I)V float/double instructions.
# f32 is applied after each Java float operation; Math.sin operands remain double.
import struct,math,json,hashlib,pathlib
f=lambda x:struct.unpack('<f',struct.pack('<f',x))[0]
levels=[]
for level in range(30):
 points=[]
 for i in range(221):
  t=f(i/220.0);a=t*math.pi
  outer=f(math.sin(a))
  amplitude=f(f(min(level,20)*f(1.4))+75.0)
  fundamental=f(amplitude*f(math.sin(((level%6)+2)*a+.59*level)))
  ripple=f(f(math.sin(a*10.0+level))*22.0)
  x=f(f(outer*f(fundamental+ripple))+180.0);y=f(666.0-f(t*500.0))
  points.append([x,y])
 levels.append({'level':level,'width':f(74.0-f(level*f(1.12))),'limit':75-level,'points':points})
p=pathlib.Path(__file__).with_name('iraira-native-courses.json')
p.write_text(json.dumps({'method':'DEX start(I)V independently evaluated with Python float32 operations','levels':levels},separators=(',',':'))+'\n')
print(p.stat().st_size,hashlib.sha256(p.read_bytes()).hexdigest())

import * as T from './three.module.js';
import {buildBatch} from './batch-models.js';
import {clayMaterial,handmadeGeometry,mergeModel} from './clay-material.js';
const tc=document.createElement('canvas');tc.width=tc.height=256;const tx=tc.getContext('2d');tx.fillStyle='#eaaeb6';tx.fillRect(0,0,256,256);for(let i=0;i<95;i++){let a=i*2.399;tx.fillStyle=i%3?'rgba(194,43,66,.32)':'rgba(226,87,108,.31)';tx.beginPath();tx.ellipse(128+Math.cos(a)*100,128+Math.sin(a*1.2)*102,28+(i%13),13+(i%9),a,0,6.28);tx.fill();}const paintMap=new T.CanvasTexture(tc);paintMap.colorSpace=T.SRGBColorSpace;const paintedTofu=clayMaterial(0xffffff).clone();paintedTofu.map=paintMap;
export function createWork(number=1){
const obj=new T.Group(),mat=clayMaterial;
const white=mat(0xeee6e5),red=mat(0xce3e59),green=mat(0x3e7d27),brown=mat(0x8c5137);
function mesh(g,m,x=0,y=0,z=0){const a=new T.Mesh(handmadeGeometry(g),m);a.position.set(x,y,z);a.castShadow=a.receiveShadow=true;obj.add(a);return a;}
const variant=String(number),second=variant==='2',third=variant==='3',fourth=variant==='4';
const profile=[[0,.06],[.5,.06],[1.35,.09],[1.62,.17],[1.8,.35],[1.83,.4],[1.76,.43],[1.55,.28],[1.3,.19],[.5,.17],[0,.17]].map(p=>new T.Vector2(...p));const plate=mesh(new T.LatheGeometry(profile,72),fourth?mat(0xffd916):white);if(fourth)plate.scale.set(.94,1,1.14);

let seed=56;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
if(Number(variant)>=5&&Number(variant)<=64){const title=buildBatch(Number(variant),{mesh,mat,obj,plate});}else if(fourth){
 
 function oval(color,x,y,z,sx,sy,sz,angle=0){const g=new T.SphereGeometry(1,36,24),p=g.attributes.position;for(let i=0;i<p.count;i++){const a=p.getX(i),b=p.getY(i),c=p.getZ(i),w=1+.018*Math.sin(a*19+b*13+c*11)+.012*Math.sin(a*41-c*29);p.setXYZ(i,a*w,b*w,c*w);}g.computeVertexNormals();const m=mesh(g,mat(color),x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=angle;return m;}
 for(let i=0;i<13;i++){const a=i*Math.PI*2/13;const leaf=oval(i%2?0x9fc45b:0xb0ce72,Math.cos(a)*1.05,.32,Math.sin(a)*1.28,.24,.085,.48,-a+Math.PI/2);leaf.rotation.z=.18*Math.sin(a*3);}
 for(let i=0;i<24;i++){const a=rand()*Math.PI*2,r=.7+rand()*.45;const shred=oval(0xa3c975,Math.cos(a)*r,.4,Math.sin(a)*r*1.1,.018,.025,.21,rand()*6);}
 oval(0xf2e4ac,0,.5,0,.64,.36,.7);
 for(const [x,z] of [[-.86,-.36],[.88,-.67],[.04,1.1]])oval(0xbc3930,x,.48,z,.27,.18,.28);
 for(const [x,z,a] of [[-.72,.38,.4],[-.5,.74,.6],[.73,.25,-.5],[.66,.73,-.6],[-.1,-1,-.3],[.48,-1.1,.4]]){const group=new T.Group();const edge=new T.Mesh(new T.CylinderGeometry(.23,.23,.15,32),mat(0x287244));const face=new T.Mesh(new T.CircleGeometry(.205,32),mat(0xb0d18a));face.rotation.x=-Math.PI/2;face.position.y=.078;group.add(edge,face);group.position.set(x,.46,z);group.rotation.z=a;group.rotation.x=.2;group.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});obj.add(group);}
 for(let i=0;i<6;i++)oval(0xf4d222,-.26+i*.1,.82+rand()*.025,-.12+rand()*.2,.068,.04,.07);
 oval(0xe6a14f,.25,.77,.35,.16,.045,.14);
 
}else if(third){
 
 function oval(color,x,y,z,sx,sy,sz,angle=0){let m=mesh(new T.SphereGeometry(1,24,16),mat(color,.95),x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=angle;return m;}
 function leaves(x,y,z,spread=.16,color=0x337b38){for(let i=0;i<5;i++){let a=i*Math.PI*2/5;let leaf=oval(color,x+Math.cos(a)*spread,y,z+Math.sin(a)*spread,.075,.035,.24,-a+Math.PI/2);}}
 function carrot(x,z,angle){const g=new T.Group();let body=new T.Mesh(new T.ConeGeometry(.13,.65,20),mat(0xf07b25));body.rotation.x=-Math.PI/2;body.castShadow=true;g.add(body);g.position.set(x,.36,z);g.rotation.y=angle;obj.add(g);oval(0x739d30,x,.37,z+.26,.09,.07,.08);}
 // Pale cabbage at the centre, tomatoes and aubergines at the front.
 oval(0xd5de54,.35,.48,.1,.5,.36,.51);for(let i=0;i<8;i++){let a=i*2.4;oval(i%2?0xc9d846:0xdce76a,.35+Math.cos(a)*.28,.57,.1+Math.sin(a)*.28,.24,.09,.25,a);}
 for(const [x,z] of [[-.3,1.02],[.35,1.16]]){oval(0xc82f24,x,.4,z,.27,.24,.26);leaves(x,.63,z,.08);}
 for(const [x,z,a] of [[.8,.78,-.4],[.92,.45,-.5],[-1,.05,.3]]){oval(0x39283e,x,.4,z,.19,.18,.43,a);leaves(x,.48,z-.3,.065);}
 for(const [x,z] of [[-1.05,.65],[1.1,.68],[.25,-.65]]){for(let i=0;i<6;i++)oval(i%2?0x397e44:0x478e50,x+(rand()-.5)*.24,.39+rand()*.1,z+(rand()-.5)*.24,.13,.12,.14);}
 for(const [x,z] of [[-1,-.55],[-.92,.43],[1,-.55]])oval(0xc7a55a,x,.34,z,.22,.17,.2);
 for(const [x,z,a] of [[-.7,.72,.9],[-1,-.9,-.9],[1,.04,1.1]])carrot(x,z,a);
 for(let i=0;i<3;i++)oval(0x267744,-.45+i*.19,.37,-.72,.085,.09,.48,.1);
 for(const [x,z,a] of [[-.63,-.06,.7],[-.63,.28,.5]])oval(0x963e59,x,.39,z,.18,.13,.41,a);
 oval(0xe5e5df,.63,.45,-1,.62,.2,.2,-.35);leaves(.03,.48,-1.15,.12,0x69ac30);
 oval(0xe58a29,1.1,.4,.18,.25,.19,.24);
 
}else if(second){
 
 const clayMat=mat(0xe28b80,.98);const geometry=new T.SphereGeometry(1,48,24);const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);const wobble=1+.055*Math.sin(Math.atan2(z,x)*7)+.025*Math.sin(x*27+z*19+y*17);positions.setXYZ(i,x*wobble,y*(1+.05*Math.sin(x*31+z*21)),z*wobble);}geometry.computeVertexNormals();const patty=mesh(geometry,clayMat,0,.34,0);patty.scale.set(1.05,.19,1.08);
 for(let i=0;i<140;i++){let a=rand()*Math.PI*2,r=Math.sqrt(rand())*.96;const dot=mesh(new T.SphereGeometry(.018+rand()*.016,5,4),mat(i%3===0?0xf2c5ac:0xd97871),Math.cos(a)*r,.35+.18*Math.sqrt(Math.max(0,1-r*r)),Math.sin(a)*r);dot.scale.y=.4;}
 for(let i=0;i<6;i++){const ring=mesh(new T.TorusGeometry(.13,.044,8,16),mat(i%2?0x8aab29:0x75971e),-.12+(i%2)*.22,.59+rand()*.04,-.42+i*.15);ring.rotation.set(-Math.PI/2+rand()*.65,rand()*.3,rand());}
 
}else{
 mesh(new T.CylinderGeometry(1.36,1.3,.025,64),mat(0xc85465),0,.19,0);
 for(let i=0;i<16;i++){let a=i*2.399,r=Math.sqrt(i/16)*1.15,x=Math.cos(a)*r,z=Math.sin(a)*r;const p=mesh(new T.BoxGeometry(.5+rand()*.15,.34+rand()*.11,.52+rand()*.13),i%3?paintedTofu:mat(0xe494a1),x,.4+rand()*.07,z);p.rotation.set((rand()-.5)*.25,rand()*3,(rand()-.5)*.25);}
 for(let i=0;i<54;i++){let a=rand()*Math.PI*2,r=.55+rand()*.94;let b=mesh(new T.SphereGeometry(1,9,7),brown,Math.cos(a)*r,.27+rand()*.06,Math.sin(a)*r);b.scale.set(.065+rand()*.035,.065,.075);}
 for(let i=0;i<30;i++){let a=rand()*Math.PI*2,r=rand()*1.22;let g=mesh(new T.TorusGeometry(.045,.016,6,12),green,Math.cos(a)*r,.65+rand()*.025,Math.sin(a)*r);g.rotation.x=-Math.PI/2+rand()*.4;}
}

// Thin fibres, food grains and pressed surface details are actual geometry.
let detailSeed=number*731+5;const rng=()=>{detailSeed=(detailSeed*1664525+1013904223)>>>0;return detailSeed/4294967296;};
function bead(c,x,y,z,sx,sy,sz){const m=mesh(new T.SphereGeometry(1,8,5),mat(c),x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=rng()*6.28;return m;}
if([20,41,47].includes(number)){
 const count=number===47?0:95;for(let i=0;i<count;i++){const a=rng()*6.28,r=Math.sqrt(rng());const x=(number===20?-.6:0)+Math.cos(a)*r*(number===20?.53:.83),z=Math.sin(a)*r*(number===20?.92:.8),y=(number===20?.4:.35)+.16*Math.sqrt(1-r*r);bead(0xeee9df,x,y,z,.025,.018,.052);}}
if([42,64].includes(number)){const cx=number===42?-.65:0,cz=number===42?-.3:0;for(let i=0;i<42;i++){const a=rng()*6.28,r=Math.sqrt(rng())*.43;bead(0xf3dfb6,cx+Math.cos(a)*r,(number===42?.99:.83)+(number===42?.28:.2)*Math.sqrt(1-r*r/.3),cz+Math.sin(a)*r,.014,.013,.037);}}
if(number===63){for(const [x,z] of [[-.45,-.65],[.45,-.65],[-.45,.65],[.45,.65]]){const path=new T.CatmullRomCurve3([new T.Vector3(x*.55,.2,z*.3),new T.Vector3(x*.82,.19,z*.63),new T.Vector3(x,.19,z)]);mesh(new T.TubeGeometry(path,10,.125,10,false),mat(0xe8e4d7));}}
if(number===57){for(let i=0;i<3;i++)for(let j=0;j<3;j++)mesh(new T.BoxGeometry(.25,.08,.32),mat(0x55443c),.55+i*.27,.43,-.43+j*.37);}
if(number===3||number===4||number===5){for(let i=0;i<13;i++){const a=i*6.28/13;const curve=new T.CatmullRomCurve3([new T.Vector3(Math.cos(a)*.85,.38,Math.sin(a)),new T.Vector3(Math.cos(a)*1.05,.4,Math.sin(a)*1.18),new T.Vector3(Math.cos(a)*1.2,.39,Math.sin(a)*1.3)]);mesh(new T.TubeGeometry(curve,6,.008,3,false),mat(0xc1d293));}}
obj.updateMatrixWorld(true);const result=mergeModel(obj);result.userData.number=number;return result;
}

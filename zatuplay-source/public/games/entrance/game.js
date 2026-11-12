
const ASSETS={"wall": "assets/wall.png", "floor": "assets/floor.png", "ceiling": "assets/ceiling.png", "red": "assets/red.png", "commuter": "assets/commuter.png"};

'use strict';
const $=id=>document.getElementById(id);let canvas=$('view');
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let settings={master:65,ambient:75,sfx:80,bgm:24,sensitivity:50,headbob:true,quality:'normal',mute:false};
Object.assign(settings,EntranceStore.initial.settings);
function saveSettings(){/* Browser adapter installs isolated persistence. */}
let stage=1,z=5,x=0,yaw=0,pitch=0,eye=1.65,active=false,paused=false,finalHall=false,anomaly=0,round=0,time=0,walkTime=0,last=0,toastEnd=0,walkDistance=0,transitioning=false,turnTarget=null;
let keys={},stick={x:0,y:0},lastFootDistance=0,nextNpcStep=0,npcZ=65,textureReady=false;
const LENGTH=125,names=['正常','逆さまの案内板','赤い蛍光灯','消えたポスター','異様に背の高い人影','赤い通路の裂け目','出口を示す偽の扉','青い誘導線','消えた誘導線','蛇行する誘導線','天井から垂れる柱','通路を横切る赤い配管','浮遊する箱','床から生えた柱','壁一面の目','巨大な赤いポスター','増殖したポスター','右壁のポスター','床に落ちた案内板','左向きの矢印','存在しない9番入口','真っ黒な案内板','二人になった人影','消えた人影','赤い人影','浮かぶ人影','通路に並ぶ黒い箱','天井の赤い穴','床の白い足跡','壁の赤い縦線','巨大な振り子'];
let gl=null,software=false,ctx2=null,program,uniforms,attribs,rendererReason='';
function softwareRenderer(reason){
 rendererReason=reason;software=true;
 // A canvas that has acquired WebGL cannot later acquire a 2D context.
 const previous=canvas;canvas=previous.cloneNode(false);previous.replaceWith(canvas);
 ctx2=canvas.getContext('2d',{alpha:false});
 if(!ctx2)throw new Error('No drawing context available');
 gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getError:()=>0},{get:(t,p)=>p in t?t[p]:typeof p==='string'&&p.toUpperCase()===p?0:()=>({})});
}
try{if(!location.hash.includes('light'))gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'default',preserveDrawingBuffer:false});}catch(e){rendererReason=String(e);}

const vertexSource=`attribute vec3 aPos;attribute vec2 aUV;attribute vec3 aNormal;attribute vec4 aColor;attribute float aEmissive;uniform mediump vec4 uCamera;uniform vec4 uView;varying mediump vec2 vUV;varying mediump vec3 vPos;varying mediump vec3 vNormal;varying mediump vec4 vColor;varying mediump float vDepth;varying mediump float vEmissive;void main(){vec3 d=aPos-uCamera.xyz;float cs=cos(uCamera.w),sn=sin(uCamera.w);float dx=d.x*cs-d.z*sn;float dz=d.z*cs+d.x*sn;float cp=cos(uView.x),sp=sin(uView.x);float yy=d.y*cp-dz*sp;float zz=dz*cp+d.y*sp;gl_Position=vec4(dx*uView.y/uView.z,yy*uView.y,zz*1.0010005-.16008004,zz);vUV=aUV;vPos=aPos;vNormal=aNormal;vColor=aColor;vDepth=zz;vEmissive=aEmissive;}`;
const fragmentSource=`precision mediump float;uniform sampler2D uTexture;uniform mediump vec4 uCamera;uniform vec3 uMode;varying mediump vec2 vUV;varying mediump vec3 vPos;varying mediump vec3 vNormal;varying mediump vec4 vColor;varying mediump float vDepth;varying mediump float vEmissive;void main(){vec4 tex=texture2D(uTexture,vUV)*vColor;if(tex.a<.12)discard;vec3 n=normalize(vNormal);float lz=floor((vPos.z-2.)/5.+.5)*5.+2.;vec3 L=vec3(0.,3.49,lz)-vPos;float d=length(L);float diffuse=abs(dot(n,L/max(d,.01)));float edge=1.-.14*pow(abs(vPos.x)/3.,4.);float illumination=(.48+.48*diffuse/(1.+.08*d*d)+.18*exp(-abs(vPos.z-lz)*.22))*edge;float flicker=1.;if(uMode.y>0.5&&abs(vPos.z-57.)<8.)flicker=.76+.24*sin(uMode.x*17.)*sin(uMode.x*37.);illumination*=flicker;vec3 color=tex.rgb*mix(vec3(.91,.98,.89)*illumination,vec3(1.15),vEmissive);if(uMode.y>0.5){float redLight=exp(-length(vPos-vec3(0.,3.5,57.))*.5);color+=redLight*vec3(.37,-.08,-.06);}vec3 V=normalize(uCamera.xyz-vPos);vec3 R=reflect(-normalize(L),n);float spec=pow(max(dot(R,V),0.),25.);color+=vec3(.12,.135,.10)*spec*(1.-vEmissive);float fog=1.-exp(-max(vDepth,0.)*.0105);color=mix(color,vec3(.11,.145,.12),min(fog,.83));gl_FragColor=vec4(color,tex.a);}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
function initializeProgram(){
 program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 uniforms=Object.fromEntries(['uCamera','uView','uMode','uTexture'].map(n=>[n,gl.getUniformLocation(program,n)]));
 attribs=[['aPos',3,0],['aUV',2,3],['aNormal',3,5],['aColor',4,8],['aEmissive',1,12]].map(([n,s,o])=>[gl.getAttribLocation(program,n),s,o]);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.clearColor(.11,.145,.12,1);
}
try{if(!gl)softwareRenderer(rendererReason||'WebGL unavailable');initializeProgram();}catch(e){
 console.warn('Using compatibility rendering:',String(e));
 try{if(gl.getExtension)gl.getExtension('WEBGL_lose_context')?.loseContext();}catch(ignore){}
 softwareRenderer(String(e));initializeProgram();
}
const textures={},images={};let buildBatches=new Map(),staticBatches=[],dynamicBatches=[];
function uploadTexture(name,im){if(software){textures[name]=im;return im;}const t=textures[name]||gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);textures[name]=t;return t;}
function textureCanvas(name,w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);images[name]=cv;uploadTexture(name,cv);return cv;}
textureCanvas('white',2,2,g=>{g.fillStyle='#fff';g.fillRect(0,0,2,2);});
function colorArray(c){if(Array.isArray(c))return c;const n=parseInt(c.replace('#',''),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255,1];}
function surface(points,mat='white',col='#ffffff',emissive=0,flip=false){let arr=buildBatches.get(mat);if(!arr)buildBatches.set(mat,arr=[]);const a=points[0],b=points[1],d=points[3],u=b.map((v,i)=>v-a[i]),v=d.map((w,i)=>w-a[i]);let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],mag=Math.hypot(...n)||1;n=n.map(q=>q/mag);let uv=flip?[[1,0],[0,0],[0,1],[1,1]]:[[0,1],[1,1],[1,0],[0,0]],co=colorArray(col);for(const i of [0,1,2,0,2,3])arr.push(...points[i],...uv[i],...n,...co,emissive);}
function textured(p,m){surface(p,m);}
function face(p,col){surface(p,'white',col,col==='#e3efd0'||col==='#ff2525'?.7:0);}
function quad(x1,y1,z1,x2,y2,z2,col,plane){if(plane==='z')face([[x1,y1,z1],[x2,y1,z1],[x2,y2,z1],[x1,y2,z1]],col);else if(plane==='x')face([[x1,y1,z1],[x1,y1,z2],[x1,y2,z2],[x1,y2,z1]],col);else face([[x1,y1,z1],[x2,y1,z1],[x2,y1,z2],[x1,y1,z2]],col);}
function box(a,b,col){quad(a[0],a[1],a[2],b[0],b[1],a[2],col,'z');quad(a[0],a[1],b[2],b[0],b[1],b[2],col,'z');quad(a[0],a[1],a[2],a[0],b[1],b[2],col,'x');quad(b[0],a[1],a[2],b[0],b[1],b[2],col,'x');quad(a[0],b[1],a[2],b[0],b[1],b[2],col,'y');quad(a[0],a[1],a[2],b[0],a[1],b[2],col,'y');}
function commitBatches(usage=gl.STATIC_DRAW){return [...buildBatches].map(([mat,v])=>{const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const data=new Float32Array(v);gl.bufferData(gl.ARRAY_BUFFER,data,usage);return{mat,buffer,data,count:v.length/13};});}
function drawBatches(batches){for(const b of batches){gl.bindTexture(gl.TEXTURE_2D,textures[b.mat]||textures.white);gl.bindBuffer(gl.ARRAY_BUFFER,b.buffer);for(const [a,n,o]of attribs){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,n,gl.FLOAT,false,52,o*4);}gl.drawArrays(gl.TRIANGLES,0,b.count);}}
function clearBatches(b){for(const v of b)gl.deleteBuffer(v.buffer);}
function signTexture(){textureCanvas('sign',1024,256,(g,w,h)=>{g.fillStyle='#161d18';g.fillRect(0,0,w,h);g.fillStyle='#ecbd44';g.fillRect(20,20,190,216);g.fillStyle='#182019';g.font='bold 190px Arial';g.textAlign='center';g.fillText(anomaly===20?'9':finalHall?'8':stage,115,198);g.textAlign='left';g.fillStyle='#f1f1e1';g.font='bold 77px sans-serif';g.fillText(finalHall?'改札口':'番入口',250,125);g.font='27px Arial';g.fillText(finalHall?'Ticket gates':'Entrance / 地下連絡通路',257,190);g.font='100px sans-serif';g.fillText(anomaly===19?'←':'→',850,155);g.strokeStyle='#58634f';g.lineWidth=3;g.strokeRect(2,2,w-4,h-4);});}
function makeDecorations(){
 textureCanvas('exit',768,256,(g,w,h)=>{g.fillStyle='#164d36';g.fillRect(0,0,w,h);g.fillStyle='#ebefdd';g.font='bold 88px sans-serif';g.textAlign='center';g.fillText('改札口  →',w/2,115);g.font='32px Arial';g.fillText('TICKET GATES',w/2,192);});
 textureCanvas('back',768,256,(g,w,h)=>{g.fillStyle='#1b211c';g.fillRect(0,0,w,h);g.fillStyle='#e4bc48';g.font='bold 77px sans-serif';g.textAlign='center';g.fillText('←  引き返す',w/2,112);g.fillStyle='#d5dacb';g.font='29px Arial';g.fillText('RETURN / 地下連絡通路',w/2,188);});
 const themes=[['#64878b','#dfe5d1','深呼吸を、ひとつ。','TAKE A LITTLE BREAK','GREEN DAYS'],['#c2a577','#3e4c42','次の休日は、','ひと駅先の街へ。','WEEKEND TRAVEL'],['#617451','#e4dfbd','まいにちの、その先へ。','OPEN YOUR NEXT DOOR','CITY LIFE']];
 themes.forEach(([bg,fg,t1,t2,en],i)=>textureCanvas('poster'+i,512,768,(g,w,h)=>{g.fillStyle=bg;g.fillRect(0,0,w,h);g.fillStyle=fg;g.font='16px Arial';g.fillText('UNDERGROUND / 2026',36,52);g.beginPath();g.arc(256,320,145,0,Math.PI*2);g.fillStyle=i===0?'#c9cbb1':i===1?'#e1ca98':'#c6cdb1';g.fill();g.fillStyle=bg;g.beginPath();g.moveTo(70,430);g.lineTo(245,220);g.lineTo(432,430);g.fill();g.fillStyle=fg;g.font='bold 29px sans-serif';g.fillText(t1,32,555);g.font='23px sans-serif';g.fillText(t2,32,601);g.fillRect(34,655,50,2);g.font='15px Arial';g.fillText(en,34,698);}));
 textureCanvas('eye',256,128,(g,w,h)=>{g.fillStyle='#d5d2bc';g.fillRect(0,0,w,h);g.fillStyle='#eee9d2';g.beginPath();g.ellipse(128,64,110,49,0,0,7);g.fill();g.fillStyle='#333b2b';g.beginPath();g.arc(128,64,43,0,7);g.fill();g.fillStyle='#090d09';g.beginPath();g.arc(128,64,20,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(117,51,6,0,7);g.fill();});
 textureCanvas('shadow',128,128,(g,w,h)=>{const grad=g.createRadialGradient(64,64,2,64,64,62);grad.addColorStop(0,'#0009');grad.addColorStop(1,'#0000');g.fillStyle=grad;g.fillRect(0,0,w,h);});
}
function makeWalkFrame(name,im,frame){
 const key=name+'Walk'+frame;if(textures[key])return key;
 const scale=Math.min(1,240/im.width),w=im.width*scale,h=im.height*scale,hip=h*.57,mid=w*.54;
 const phase=frame/16*Math.PI*2,swing=Math.sin(phase),bob=Math.cos(phase*2)*h*.003;
 const cv=document.createElement('canvas');cv.width=Math.ceil(w+30);cv.height=Math.ceil(h+20);const g=cv.getContext('2d');
 function leg(sx,sw,pivot,sign){g.save();g.translate(15+pivot,10+hip+bob);g.rotate(swing*.065*sign);g.drawImage(im,sx/scale,hip/scale,sw/scale,(h-hip)/scale,sx-pivot,0,sw,h-hip);g.restore();}
 leg(0,mid,mid*.72,1);leg(mid,w-mid,mid+(w-mid)*.3,-1);g.drawImage(im,0,0,im.width,(hip+4)/scale,15,10+bob,w,hip+4);
 uploadTexture(key,cv);return key;
}
function walkMaterial(name,frame){try{return makeWalkFrame(name,images[name],frame);}catch(e){console.warn('Walking frame skipped:',String(e));return name;}}
function makeFallbackAssets(){
 for(const [name,base,line]of [['wall','#a1a998','#707f73'],['floor','#788275','#59675c'],['ceiling','#8d9985','#74806d']])textureCanvas(name,96,96,g=>{g.fillStyle=base;g.fillRect(0,0,96,96);g.strokeStyle=line;g.lineWidth=2;g.strokeRect(0,0,96,96);g.beginPath();g.moveTo(0,48);g.lineTo(96,48);g.stroke();});
 for(const name of ['commuter','red'])textureCanvas(name,120,180,g=>{g.clearRect(0,0,120,180);g.fillStyle=name==='red'?'#c23e35':'#555e51';g.beginPath();g.arc(60,24,15,0,Math.PI*2);g.fill();g.fillRect(38,42,44,74);g.fillRect(32,48,12,65);g.fillRect(76,48,12,65);g.fillRect(40,111,16,67);g.fillRect(64,111,16,67);});
}
function buildScene(){clearBatches(staticBatches);buildBatches=new Map();baseScene();signTexture();
 // Recessed service doors, rails, fittings and tactile dots make the existing corridor legible.
 for(let zz=15;zz<115;zz+=25){box([2.93,0,zz],[2.98,2.55,zz+1.35],'#778477');quad(2.915,.06,zz+.06,2.915,2.48,zz+1.29,'#667464','x');box([2.88,1.05,zz+.17],[2.925,1.1,zz+.45],'#bdc3ac');for(let y=1.9;y<2.3;y+=.09)quad(2.90,y,zz+.2,2.90,y+.025,zz+1.15,'#3e5142','x');}
 for(let zz=0;zz<130;zz+=5){box([-.49,3.54,zz+.9],[.49,3.59,zz+3.1],'#48584a');quad(-.38,3.52,zz+1,.38,3.52,zz+3,anomaly===2&&zz===55?'#ff2525':'#e3efd0','y');for(let xx of [-.2,0,.2])for(let az=zz+.13;az<zz+5;az+=.34)if(anomaly!==8){const shift=anomaly===9?Math.sin(zz*.2)*1.4:0;quad(xx-.035+shift,.019,az,xx+.035+shift,.019,az+.08,anomaly===7?'#69b4d1':'#e0c66a','y');}}
 let pi=0;for(let zz=10;zz<130;zz+=20){if(anomaly===3&&zz===50)continue;surface([[-2.925,1.04,zz+.14],[-2.925,1.04,zz+2.25],[-2.925,2.47,zz+2.25],[-2.925,2.47,zz+.14]],'poster'+pi++%3);}
 if(anomaly===14)for(let az=42;az<80;az+=6)surface([[2.875,1.3,az+1.5],[2.875,1.3,az],[2.875,2.15,az],[2.875,2.15,az+1.5]],'eye');
 if(anomaly!==21)surface([[-1.65,2.64,23.93],[1.65,2.64,23.93],[1.65,3.26,23.93],[-1.65,3.26,23.93]],'sign','#fffFFF',.65,anomaly===1);
 box([-1.7,2.6,100],[1.7,3.3,100.15],'#16251a');surface([[1.65,2.64,100.17],[-1.65,2.64,100.17],[-1.65,3.26,100.17],[1.65,3.26,100.17]],'back','#ffffff',.45);
 surface([[-1.4,2.5,123],[1.4,2.5,123],[1.4,3.15,123],[-1.4,3.15,123]],finalHall?'exit':'sign','#ffffff',.5);
 // Open doorways at both ends: visible wall returns conceal the round transition.
 box([-3,0,130],[-1.4,3.6,131],'#8c9683');box([1.4,0,130],[3,3.6,131],'#8c9683');box([-3,0,-6],[-1.4,3.6,-5],'#8c9683');box([1.4,0,-6],[3,3.6,-5],'#8c9683');
 if(finalHall)for(let xx=-2;xx<=2;xx+=2){box([xx-.4,.65,119],[xx-.15,.9,120.1],'#b8c3ac');quad(xx-.36,1.155,118.3,xx+.05,1.155,118.65,'#3684a0','y');}
 staticBatches=commitBatches();}
function commuter(cx,zz,kind){const tall=kind===4?1.7:1,base=kind===25?.85:0,top=base+2.04*tall;const name=kind===24?'red':'commuter',phase=Math.floor(walkTime*12)%16;surface([[cx-.64,base-.025,zz],[cx+.64,base-.025,zz],[cx+.64,top+.025,zz],[cx-.64,top+.025,zz]],walkMaterial(name,phase));surface([[cx-.55,.027,zz-.25],[cx+.55,.027,zz-.25],[cx+.55,.027,zz+.5],[cx-.55,.027,zz+.5]],'shadow');}
function resize(){const ratio=software?Math.min(1,640/innerWidth,400/innerHeight):Math.min(window.devicePixelRatio||1,settings.quality==='high'?2:1.15);canvas.width=Math.round(innerWidth*ratio);canvas.height=Math.round(innerHeight*ratio);gl.viewport(0,0,canvas.width,canvas.height);}
onresize=resize;resize();
function render(){clearBatches(dynamicBatches);buildBatches=new Map();if(textureReady&&anomaly!==23){commuter(1.7,npcZ,anomaly);if(anomaly===22)commuter(-1.65,npcZ,0);}if(anomaly===30){let px=Math.sin(time*.85)*1.6;box([px-.07,1.25,58],[px+.07,3.6,58.15],'#73653e');box([px-.5,.7,57.8],[px+.5,1.5,58.6],'#a55a37');}dynamicBatches=commitBatches(gl.DYNAMIC_DRAW);if(software){renderSoftware();return;}gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniform4f(uniforms.uCamera,x,eye,z,yaw);gl.uniform4f(uniforms.uView,pitch,1/Math.tan(Math.PI*64/360),innerWidth/innerHeight,0);gl.uniform3f(uniforms.uMode,time,anomaly===2?1:0,0);gl.uniform1i(uniforms.uTexture,0);gl.disable(gl.BLEND);drawBatches(staticBatches);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);drawBatches(dynamicBatches);gl.disable(gl.BLEND);}
function renderSoftware(){const W=canvas.width,H=canvas.height,f=H/(2*Math.tan(Math.PI*64/360)),cs=Math.cos(yaw),sn=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),all=[];ctx2.setTransform(1,0,0,1,0,0);ctx2.fillStyle='#26372a';ctx2.fillRect(0,0,W,H);
 const proj=v=>({x:W/2+v[0]*f/v[2],y:H/2-v[1]*f/v[2],u:v[3],v:v[4],d:v[2]});
 for(const b of [...staticBatches,...dynamicBatches])for(let off=0;off<b.data.length;off+=78){const d=b.data;let vertices=[];for(const vi of [0,1,2,5]){let i=off+vi*13,dx=d[i]-x,dy=d[i+1]-eye,dz=d[i+2]-z,dz2=dz*cs+dx*sn;vertices.push([dx*cs-dz*sn,dy*cp-dz2*sp,dz2*cp+dy*sp,d[i+3],d[i+4]]);}let depth=vertices.reduce((s,v)=>s+v[2],0)/4;if(vertices.every(v=>v[2]<.12)||depth>110)continue;
 // Clip world surfaces against the near plane instead of dropping whole walls.
 const clipped=[];for(let i=0;i<vertices.length;i++){let a=vertices[i],b=vertices[(i+1)%vertices.length],ina=a[2]>=.12,inb=b[2]>=.12;if(ina)clipped.push(a);if(ina!==inb){let t=(.12-a[2])/(b[2]-a[2]);clipped.push(a.map((v,j)=>v+(b[j]-v)*t));}}if(clipped.length<3)continue;let pts=clipped.map(proj);if(pts.every(p=>p.x<0)||pts.every(p=>p.x>W)||pts.every(p=>p.y<0)||pts.every(p=>p.y>H))continue;let area=Math.abs((pts[1].x-pts[0].x)*(pts[2].y-pts[0].y)-(pts[1].y-pts[0].y)*(pts[2].x-pts[0].x));if(area<.3)continue;
 const pz=d[off+2],lz=Math.round((pz-2)/5)*5+2,illum=.76+.14*Math.exp(-Math.abs(pz-lz)*.22),em=d[off+12];all.push({pts,depth:depth+(Math.abs(d[off+6])>.9?(d[off+1]>3?1:-1)*d[off+1]*.001:0),mat:b.mat,c:[d[off+8],d[off+9],d[off+10]],shade:Math.max(0,1-(illum*(1-em)+em))+.48*(1-Math.exp(-depth*.016))});}
 all.sort((a,b)=>b.depth-a.depth);for(const q of all){const p=q.pts;ctx2.beginPath();p.forEach((a,i)=>i?ctx2.lineTo(a.x,a.y):ctx2.moveTo(a.x,a.y));ctx2.closePath();if(q.mat==='white'){ctx2.fillStyle=`rgb(${q.c.map(v=>Math.round(v*255)).join(',')})`;ctx2.fill();}else{const im=textures[q.mat];if(im)for(let i=1;i<p.length-1;i++)softwareTriangle(im,p[0],p[i],p[i+1]);}if(q.mat.startsWith('commuter')||q.mat.startsWith('red')||q.mat==='shadow')continue;ctx2.beginPath();p.forEach((a,i)=>i?ctx2.lineTo(a.x,a.y):ctx2.moveTo(a.x,a.y));ctx2.closePath();ctx2.fillStyle=`rgba(20,34,23,${clamp(q.shade,0,.70)})`;ctx2.fill();}}
function softwareTriangle(im,a,b,c,level=0){if(level<3&&Math.max(a.d,b.d,c.d)/Math.min(a.d,b.d,c.d)>1.18&&Math.max(Math.hypot(a.x-b.x,a.y-b.y),Math.hypot(b.x-c.x,b.y-c.y),Math.hypot(c.x-a.x,c.y-a.y))>55){const mid=(p,q)=>({x:(p.x*p.d+q.x*q.d)/(p.d+q.d),y:(p.y*p.d+q.y*q.d)/(p.d+q.d),u:(p.u+q.u)/2,v:(p.v+q.v)/2,d:(p.d+q.d)/2}),ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);softwareTriangle(im,a,ab,ca,level+1);softwareTriangle(im,ab,b,bc,level+1);softwareTriangle(im,ca,bc,c,level+1);softwareTriangle(im,ab,bc,ca,level+1);return;}const u0=a.u*im.width,v0=a.v*im.height,u1=b.u*im.width,v1=b.v*im.height,u2=c.u*im.width,v2=c.v*im.height,det=u0*(v1-v2)+u1*(v2-v0)+u2*(v0-v1);if(Math.abs(det)<.001)return;const A=(a.x*(v1-v2)+b.x*(v2-v0)+c.x*(v0-v1))/det,B=(a.y*(v1-v2)+b.y*(v2-v0)+c.y*(v0-v1))/det,C=(a.x*(u2-u1)+b.x*(u0-u2)+c.x*(u1-u0))/det,D=(a.y*(u2-u1)+b.y*(u0-u2)+c.y*(u1-u0))/det;ctx2.save();ctx2.beginPath();ctx2.moveTo(a.x,a.y);ctx2.lineTo(b.x,b.y);ctx2.lineTo(c.x,c.y);ctx2.closePath();ctx2.clip();ctx2.transform(A,B,C,D,a.x-A*u0-C*v0,a.y-B*u0-D*v0);ctx2.drawImage(im,0,0);ctx2.restore();}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;AudioGame.suspend();$('error').textContent='3D表示が一時停止しました。画面の復帰を待つか、アプリを開き直してください。';$('error').classList.remove('hidden');});canvas.addEventListener('webglcontextrestored',()=>location.reload());

// Original synthesized station soundscape. All audio is generated locally, offline.
const AudioGame=(()=>{
 let ac,master,limiter,buses={},wet,convolver,impulse,footBuffers=[],lastTrain=0,trainCount=0,started=false,suspendedByHost=false;
 let ambientLoops=[],humGain,humPan,droneFilter,droneGain,noiseBuffer;
 const liveSources=new Set();
 function randomBuffer(seconds,fn,channels=1){const b=ac.createBuffer(channels,Math.floor(ac.sampleRate*seconds),ac.sampleRate);for(let ch=0;ch<channels;ch++){const a=b.getChannelData(ch);let brown=0;for(let i=0;i<a.length;i++){brown=(brown+.025*(Math.random()*2-1))/1.015; // bounded random-walk component
 if(Math.abs(brown)>1)brown*=.5;a[i]=fn(i/ac.sampleRate,i,a.length,ch,brown);}}return b;}
 function track(s){liveSources.add(s);s.onended=()=>liveSources.delete(s);return s;}
 function gainAt(value,dest){let g=ac.createGain();g.gain.value=value;g.connect(dest);return g;}
 function source(buffer,dest,at,rate=1,loop=false){const s=track(ac.createBufferSource());s.buffer=buffer;s.playbackRate.value=rate;s.loop=loop;s.connect(dest);s.start(at);return s;}
 function noise(){return Math.random()*2-1;}
 function reverb(){const b=ac.createBuffer(2,Math.floor(ac.sampleRate*1.9),ac.sampleRate);for(let ch=0;ch<2;ch++){const a=b.getChannelData(ch);let prev=0;for(let i=0;i<a.length;i++){const t=i/ac.sampleRate;prev=prev*.65+noise()*.35;a[i]=t>.025?prev*Math.exp(-t*3.7)*.17:0;}for(const [d,v] of [[.037,.15],[.073,.10],[.119,.075],[.183,.035]])a[Math.floor((d+ch*.003)*ac.sampleRate)]+=v;}return b;}
 function footstepBuffer(variant){const dur=.31;let b=ac.createBuffer(1,Math.ceil(ac.sampleRate*dur),ac.sampleRate),a=b.getChannelData(0),lp=0,hp=0;const f=64+variant*3.7;for(let i=0;i<a.length;i++){let t=i/ac.sampleRate,n=noise();lp=.76*lp+.24*n;hp=n-lp;const heel=Math.sin(2*Math.PI*(f*t-37*t*t))*Math.exp(-t*42)*.56;const click=hp*Math.exp(-t*190)*.23;const toe=t>.052?(Math.sin(2*Math.PI*(110+variant*5)*(t-.052))*.16+lp*.44)*Math.exp(-(t-.052)*47):0;const grit=lp*.24*Math.exp(-t*16)*(1-Math.exp(-t*50));a[i]=(heel+click+toe+grit)*Math.min(t*1000,1);}return b;}
 function panGain(bus,volume,pan=0,send=.24){const g=ac.createGain(),p=ac.createStereoPanner();g.gain.value=volume;p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(buses[bus]);if(send>0){let s=ac.createGain();s.gain.value=send;p.connect(s);s.connect(convolver);}return{g,p};}
 function spatial(cx,zz,base=1){let dx=cx-x,dz=zz-z,d=Math.hypot(dx,dz),localX=dx*Math.cos(yaw)-dz*Math.sin(yaw);return{gain:base/(1+d*.18+d*d*.015),pan:clamp(localX/(d||1),-.9,.9)};}
 function tone(f,t,d,vol,bus='sfx',pan=0,slide=0){const {g}=panGain(bus,vol,pan,.18);const o=track(ac.createOscillator());o.type='sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(slide,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);o.start(t);o.stop(t+d+.04);}
 function makeAmbience(){
  noiseBuffer=randomBuffer(9,(t,i,n,ch,b)=>b*.45+noise()*.09);
  const ventFilter=ac.createBiquadFilter();ventFilter.type='lowpass';ventFilter.frequency.value=460;ventFilter.Q.value=.35;const vg=gainAt(.22,buses.ambient);ventFilter.connect(vg);ambientLoops.push(source(noiseBuffer,ventFilter,ac.currentTime,1,true));
  const airFilter=ac.createBiquadFilter();airFilter.type='bandpass';airFilter.frequency.value=1900;airFilter.Q.value=.7;const ag=gainAt(.026,buses.ambient);airFilter.connect(ag);ambientLoops.push(source(noiseBuffer,airFilter,ac.currentTime,.83,true));
  humGain=ac.createGain();humPan=ac.createStereoPanner();humGain.gain.value=.014;humGain.connect(humPan);humPan.connect(buses.ambient);
  for(const [freq,vol] of [[100,.42],[200,.17],[300,.045],[401,.018]]){const o=ac.createOscillator();o.frequency.value=freq;const g=gainAt(vol,humGain);o.connect(g);o.start();ambientLoops.push(o);}
  droneFilter=ac.createBiquadFilter();droneFilter.type='lowpass';droneFilter.frequency.value=320;droneFilter.Q.value=.35;droneGain=gainAt(.19,buses.bgm);droneFilter.connect(droneGain);
  for(const [freq,vol]of [[65.406,.13],[65.52,.08],[97.999,.07],[130.813,.036],[146.832,.012]]){const o=ac.createOscillator();o.type='triangle';o.frequency.value=freq;const g=gainAt(vol,droneFilter);o.connect(g);o.start();ambientLoops.push(o);}
 }
 function mix(){if(!ac)return;const t=ac.currentTime;master.gain.setTargetAtTime(settings.mute?0:settings.master/100,t,.06);for(const bus of ['ambient','sfx','bgm'])buses[bus].gain.setTargetAtTime(settings[bus]/100,t,.08);}
 function unlock(){if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});master=ac.createGain();limiter=ac.createDynamicsCompressor();limiter.threshold.value=-8;limiter.knee.value=12;limiter.ratio.value=8;limiter.attack.value=.004;limiter.release.value=.18;master.connect(limiter);limiter.connect(ac.destination);for(const n of ['ambient','sfx','bgm']){buses[n]=ac.createGain();buses[n].connect(master);}convolver=ac.createConvolver();convolver.normalize=false;impulse=reverb();convolver.buffer=impulse;wet=gainAt(.64,buses.sfx);convolver.connect(wet);footBuffers=Array.from({length:8},(_,i)=>footstepBuffer(i));makeAmbience();mix();started=true;lastTrain=ac.currentTime+9;}
 suspendedByHost=false;if(ac.state==='suspended')ac.resume().catch(()=>{});return ac;}
 function footstep(left=false,cx=null,zz=null){if(!ac||ac.state!=='running'||settings.mute)return;const p=cx===null?{gain:.73,pan:left?-.13:.13}:spatial(cx,zz,.50);if(p.gain<.009)return;const {g}=panGain('sfx',p.gain,p.pan,cx===null?.30:.55);source(footBuffers[Math.floor(Math.random()*8)],g,ac.currentTime,.94+Math.random()*.12);}
 function train(){const t=ac.currentTime,{g,p}=panGain('ambient',0,-.7,.05),filter=ac.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(125,t);filter.frequency.linearRampToValueAtTime(520,t+4);filter.frequency.linearRampToValueAtTime(100,t+9);filter.Q.value=.6;filter.connect(g);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.34,t+4);g.gain.exponentialRampToValueAtTime(.0001,t+10);p.pan.setValueAtTime(-.7,t);p.pan.linearRampToValueAtTime(.7,t+9);const s=source(noiseBuffer,filter,t,.71,true);s.stop(t+10.1);tone(46,t,9,.04,'ambient',-.3,39);trainCount++;}
 function update(){if(!ac||ac.state!=='running'||!active||paused)return;const t=ac.currentTime,lz=Math.round((z-2)/5)*5+2,sp=spatial(0,lz,.035);humGain.gain.setTargetAtTime(sp.gain*(.93+.07*Math.sin(t*1.1)),t,.16);humPan.pan.setTargetAtTime(sp.pan,t,.15);droneGain.gain.setTargetAtTime(.17+.04*Math.sin(t*.075),t,.5);droneFilter.frequency.setTargetAtTime(250+55*Math.sin(t*.08),t,.5);if(t>lastTrain){train();lastTrain=t+30+Math.random()*20;}}
 function effect(kind){if(!ac||ac.state!=='running')return;const t=ac.currentTime;if(kind==='correct'||kind==='start'){tone(740,t,.14,.11);tone(990,t+.15,.22,.07);}if(kind==='wrong'){tone(130,t,.48,.12,'sfx',0,72);const {g}=panGain('sfx',.13,0,.35);source(footBuffers[3],g,t,.55);}if(kind==='trap'){tone(65,t,.9,.19,'sfx',0,33);const {g}=panGain('sfx',.3,0,.4);source(footBuffers[0],g,t,.38);}if(kind==='turn'){const {g}=panGain('sfx',.09,-.1,.2);source(footBuffers[5],g,t,.7);}if(kind==='clear'){[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,t+i*.17,1,.10,'sfx',0));}}
 function suspend(){keys={};resetStick();suspendedByHost=true;if(ac)ac.suspend().catch(()=>{});}
 function resume(){keys={};resetStick();suspendedByHost=false;if(ac&&active&&!paused&&!document.hidden)ac.resume().catch(()=>{});}
 function pause(){if(ac)ac.suspend().catch(()=>{});}
 function resumeGame(){if(ac&&!document.hidden&&!suspendedByHost)ac.resume().catch(()=>{});}
 function stopAfterEnd(){if(ac){for(const bus of ['ambient','bgm'])buses[bus].gain.setTargetAtTime(0,ac.currentTime,.45);}}
 return {unlock,footstep,effect,update,mix,suspend,resume,pause,resumeGame,stopAfterEnd,debug:()=>({state:ac?.state||'not-started',sampleRate:ac?.sampleRate||0,liveSources:liveSources.size,trainCount,started}),get context(){return ac;},get footBuffers(){return footBuffers;}};
})();
// Audio must never prevent starting or moving through the corridor.
let audioFailed=false;
for(const method of ['unlock','footstep','effect','update','mix','suspend','resume','pause','resumeGame','stopAfterEnd']){
 const original=AudioGame[method];AudioGame[method]=(...args)=>{
  if(audioFailed)return;
  try{return original(...args);}catch(e){audioFailed=true;try{AudioGame.context?.close().catch(()=>{});}catch(ignore){}console.warn('Audio disabled:',String(e));}
 };
}

function baseScene(){
for(let zz=0;zz<LENGTH+10;zz+=5){quad(-2.99,.38,zz,-2.99,.5,zz+5,'#294f3c','x');quad(2.99,.38,zz,2.99,.5,zz+5,'#294f3c','x');quad(-2.99,2.9,zz,-2.99,3,zz+5,'#727e70','x');for(let xx=-3;xx<3;xx++)quad(xx,0.008,zz,xx+.015,0,zz+5,'#5d6860','y');quad(-.4,3.57,zz+1,.4,3.57,zz+3,anomaly===2&&zz===55?'#ff2525':'#e3efd0','y');if(anomaly!==8){let shift=anomaly===9?Math.sin(zz*.2)*1.4:0;for(let dz=0;dz<5;dz+=2.5)quad(-.35+shift,.012,zz+dz,.35+shift,.012,zz+dz+2.5,anomaly===7?'#39a6f2':'#c4ad51','y');}if(zz%20===10&&!(anomaly===3&&zz===50)){quad(-2.97,.9,zz,-2.97,2.6,zz+2.4,'#253b35','x');}if(zz%20===0)quad(2.97,.1,zz,2.97,2.7,zz+.07,'#717e74','x')}
box([-1.7,2.6,24],[1.7,3.3,24.15],anomaly===21?'#080d0b':anomaly===1?'#605633':'#163c2d');if(anomaly===5)quad(-1.5,.025,74,1.5,.025,78,'#a92c25','y');if(anomaly===6){quad(2.94,0,80,2.94,2.8,82,'#b33126','x');quad(2.92,1.2,80.2,2.92,1.5,81.8,'#ffe7a3','x')}if(finalHall){for(let xx=-2;xx<=2;xx+=2){box([xx-.4,0,118],[xx+.1,1.15,120],'#47685c');quad(xx+.15,.6,119,xx+1.3,.6,119,'#5ad5a1','z')}}

// Each ID adds a distinct world-space anomaly; 0 is the normal reference.
if(anomaly===10)box([-.35,1.4,57],[.35,3.6,57.6],'#4c5f56');
if(anomaly===11)box([-3,1.1,58],[3,1.35,58.25],'#a1352e');
if(anomaly===12)box([-.6,1.5,59],[.6,2.7,60.2],'#baaa72');
if(anomaly===13)box([-.45,0,60],[.45,3.6,60.7],'#7f8f83');
if(anomaly===14){for(let az=42;az<80;az+=6){quad(2.94,1.3,az,2.94,2.15,az+1.5,'#e9e8d0','x');quad(2.91,1.45,az+.5,2.91,2,az+1,'#101a16','x');}}
if(anomaly===15)quad(-2.9,.2,49,-2.9,3.45,54,'#a82e27','x');
if(anomaly===16){for(let az=42;az<60;az+=3)quad(-2.9,.9,az,-2.9,2.6,az+2.3,'#b9ab6a','x');}
if(anomaly===17){quad(2.9,.9,50,2.9,2.6,52.4,'#c4af7a','x');quad(2.88,1.5,50.5,2.88,2,51.8,'#e4debe','x');}
if(anomaly===18)box([-1.6,.03,54],[1.6,.12,55.4],'#184b35');

if(anomaly===26){for(let az=48;az<76;az+=6)box([-.65,0,az],[.65,1.2,az+1.3],'#17211c');}
if(anomaly===27)quad(-1.4,3.55,50,1.4,3.55,57,'#a72e29','y');
if(anomaly===28){for(let az=40;az<70;az+=2){let ax=az%4===0?-.7:-.15;quad(ax,.03,az,ax+.24,.03,az+.65,'#e6e8da','y');}}
if(anomaly===29){for(let az=40;az<75;az+=2)quad(-2.92,.1,az,-2.92,3.4,az+.15,'#ac2927','x');}

for(let zz=0;zz<135;zz+=2.5){
 for(let xx=-3;xx<3;xx+=1.5){textured([[xx,.006,zz],[xx+1.5,.006,zz],[xx+1.5,.006,zz+2.5],[xx,.006,zz+2.5]],'floor');textured([[xx,3.59,zz],[xx+1.5,3.59,zz],[xx+1.5,3.59,zz+2.5],[xx,3.59,zz+2.5]],'ceiling');}
 textured([[-2.985,0,zz],[-2.985,0,zz+2.5],[-2.985,3.6,zz+2.5],[-2.985,3.6,zz]],'wall');textured([[2.985,0,zz+2.5],[2.985,0,zz],[2.985,3.6,zz],[2.985,3.6,zz+2.5]],'wall');
}

}

function say(t,duration=4){$('toast').textContent=t;toastEnd=time+duration;$('toast').style.opacity=1;}
let seenBag=[];
function chooseAnomaly(){if(round===1)return 0;if(Math.random()<.43)return 0;if(!seenBag.length)seenBag=Array.from({length:30},(_,i)=>i+1).sort(()=>Math.random()-.5);return seenBag.pop();}
function setup(forceAnomaly=null){walkTime=0;walkDistance=0;lastFootDistance=0;round++;z=5;x=0;yaw=0;pitch=0;eye=1.65;turnTarget=null;npcZ=65;nextNpcStep=.3;finalHall=stage===9;anomaly=finalHall?0:forceAnomaly===null?chooseAnomaly():forceAnomaly;$('num').textContent=finalHall?'08':String(stage).padStart(2,'0');buildScene();}
function transition(fn){if(transitioning)return;transitioning=true;resetInput();$('flash').style.opacity=1;setTimeout(()=>{fn();$('flash').style.opacity=0;setTimeout(()=>transitioning=false,210);},210);}
function decide(back){if(finalHall){if(back)transition(()=>{stage=8;setup();say('改札は、8番入口を越えた先にある。');});else end(true);return;}const correct=back===(anomaly!==0),reason=anomaly?names[anomaly]+'を見逃した。':'異変はなかった。';AudioGame.effect(correct?'correct':'wrong');transition(()=>{if(correct){stage++;setup();say(finalHall?'8番入口の先 ─ 改札を通り抜けてください。':stage+'番入口へ。よく観察して進もう。');}else{stage=1;round=0;setup();say(reason+' 1番入口に戻りました。',5);}});}
function end(win){if(!active)return;AudioGame.effect(win?'clear':'trap');AudioGame.stopAfterEnd();active=false;paused=false;resetInput();$('overlay').classList.remove('hidden');for(const id of ['hud','controls','dot'])$(id).classList.add('hidden');$('title').textContent=win?'脱出成功':'また、入口へ';$('lead').textContent=win?'8つの入口を越えて、改札の向こうへ。':'その違和感には、近づいてはいけなかった。';$('intro').innerHTML=win?'<ul class="rules"><li>あなたは、違和感を見逃さなかった。</li><li>次の通路では、別の異変が待っている。</li></ul>':'<ul class="rules"><li>赤い裂け目は脇を通り、<b>引き返す。</b></li><li>赤い扉には触れず、<b>引き返す。</b></li></ul>';$('start').textContent='もう一度、入口へ →';$('toast').textContent='';}
function resetStick(){stick.x=stick.y=0;const knob=$('knob');if(knob)knob.style.transform='translate(0,0)';}
function resetInput(){keys={};resetStick();lookPointer=null;movePointer=null;}
let movePointer=null,lookPointer=null,lookLast={x:0,y:0};
$('stick').onpointerdown=e=>{if(!active||paused)return;movePointer=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);setStick(e);};
function setStick(e){if(e.pointerId!==movePointer)return;const r=$('stick').getBoundingClientRect(),mx=e.clientX-r.left-r.width/2,my=e.clientY-r.top-r.height/2,range=r.width*.33,len=Math.hypot(mx,my),scale=Math.min(1,range/(len||1));stick.x=mx*scale/range;stick.y=my*scale/range;$('knob').style.transform=`translate(${mx*scale}px,${my*scale}px)`;}
$('stick').onpointermove=setStick;$('stick').onpointerup=$('stick').onpointercancel=$('stick').onlostpointercapture=()=>{movePointer=null;resetStick();};
canvas.onpointerdown=e=>{if(!active||paused)return;lookPointer=e.pointerId;lookLast={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(e.pointerId!==lookPointer||paused)return;const sens=settings.sensitivity*.000085;yaw+=(e.clientX-lookLast.x)*sens;pitch=clamp(pitch+(e.clientY-lookLast.y)*sens,-.65,.65);turnTarget=null;lookLast={x:e.clientX,y:e.clientY};};canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>lookPointer=null;
function turn(){if(!active||paused||transitioning)return;turnTarget=yaw+Math.PI;AudioGame.effect('turn');}
$('turn').onclick=turn;
window.onkeydown=e=>{if([' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)&&active)e.preventDefault();if(e.code==='Escape'){if(!$('settings').classList.contains('hidden'))closeSettings();else openSettings();return;}if(!active||paused)return;keys[e.key.toLowerCase()]=true;if(e.code==='Space'&&!e.repeat)turn();};window.onkeyup=e=>delete keys[e.key.toLowerCase()];window.onblur=()=>{resetInput();if(active&&!paused)openSettings();};
function openSettings(){resetInput();paused=true;AudioGame.pause();$('settings').classList.remove('hidden');$('closeSettings').focus();}
function closeSettings(){$('settings').classList.add('hidden');paused=false;if(active)AudioGame.resumeGame();$('pause').focus();}
$('pause').onclick=$('audioSettings').onclick=openSettings;$('closeSettings').onclick=$('closeSettingsTop').onclick=closeSettings;
for(const key of ['master','ambient','sfx','bgm']){const slider=$(key+'Volume'),out=$(key+'Out');slider.value=settings[key];out.textContent=settings[key];slider.oninput=()=>{settings[key]=Number(slider.value);out.textContent=settings[key];AudioGame.mix();saveSettings();};}
$('sensitivity').value=settings.sensitivity;$('sensitivityOut').textContent=settings.sensitivity;$('sensitivity').oninput=()=>{settings.sensitivity=Number($('sensitivity').value);$('sensitivityOut').textContent=settings.sensitivity;saveSettings();};
$('headbob').checked=settings.headbob;$('headbob').onchange=()=>{settings.headbob=$('headbob').checked;saveSettings();};$('quality').value=settings.quality;$('quality').onchange=()=>{settings.quality=$('quality').value;resize();saveSettings();};
function muteLabel(){$('mute').textContent=settings.mute?'音を戻す':'消音する';}$('mute').onclick=()=>{settings.mute=!settings.mute;muteLabel();AudioGame.mix();saveSettings();};muteLabel();
$('start').onclick=()=>{AudioGame.unlock();AudioGame.mix();stage=1;round=0;setup();active=true;paused=false;transitioning=false;$('overlay').classList.add('hidden');for(const id of ['hud','controls','dot'])$(id).classList.remove('hidden');say('正常な通路を覚えよう ─ 最初は異変なし。',5);AudioGame.effect('start');};
document.addEventListener('visibilitychange',()=>{resetInput();if(document.hidden){AudioGame.suspend();if(active){paused=true;$('settings').classList.remove('hidden');}}else{AudioGame.resume();last=performance.now();}});
function blocked(nx,nz){if(anomaly===13&&nz>59.65&&nz<61.05&&Math.abs(nx)<.78)return true;if(anomaly===26&&Math.abs(nx)<.95)for(let az=48;az<76;az+=6)if(nz>az-.28&&nz<az+1.58)return true;if(finalHall&&nz>117.7&&nz<120.3)for(let xx=-2;xx<=2;xx+=2)if(nx>xx-.65&&nx<xx+.3)return true;return false;}
function update(dt){time+=dt;if(!active||paused||transitioning)return;walkTime+=dt;npcZ=65-walkTime*1.12; // One continuous pass; never teleports back into view.
 if(turnTarget!==null){const d=turnTarget-yaw;yaw+=d*Math.min(1,dt*10);if(Math.abs(d)<.009){yaw=turnTarget;turnTarget=null;}}
 let f=(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0)-stick.y,side=(keys.d?1:0)-(keys.a?1:0)+stick.x;
 if(keys.arrowleft)yaw-=dt*1.7;if(keys.arrowright)yaw+=dt*1.7;
 const len=Math.hypot(f,side);if(len>1){f/=len;side/=len;}if(Math.abs(f)<.09)f=0;if(Math.abs(side)<.09)side=0;
 const speed=3.8,dx=(Math.sin(yaw)*f+Math.cos(yaw)*side)*dt*speed,dz=(Math.cos(yaw)*f-Math.sin(yaw)*side)*dt*speed;
 const nx=clamp(x+dx,-2.55,2.55),nz=z+dz,oldx=x,oldz=z;if(!blocked(nx,z))x=nx;if(!blocked(x,nz))z=nz;
 const distance=Math.hypot(x-oldx,z-oldz);walkDistance+=distance;
 if(walkDistance-lastFootDistance>1.65){lastFootDistance=walkDistance;AudioGame.footstep(Math.floor(walkDistance/1.65)%2===0);}
 const moving=distance>.0001;eye=1.65+(moving&&settings.headbob?Math.sin(walkDistance/3.3*Math.PI*2)*.018:0);
 if(walkTime>nextNpcStep&&npcZ>-4&&anomaly!==23){nextNpcStep=walkTime+.53;AudioGame.footstep(false,1.7,npcZ);if(anomaly===22)AudioGame.footstep(true,-1.65,npcZ+.3);}
 AudioGame.update();if(anomaly===5&&z>74&&z<78&&Math.abs(x)<1.5)end(false);else if(anomaly===6&&z>80&&z<82&&x>2.1)end(false);else if(z>LENGTH)decide(false);else if(z<.4)decide(true);
}
function loop(ts){const dt=last?Math.min((ts-last)/1000,.05):0;last=ts;if(!document.hidden){update(dt);if(time>toastEnd)$('toast').style.opacity=0;render();}requestAnimationFrame(loop);}
// The playable corridor is prepared first. Optional image decoding never gates Start.
function loadAssets(){
 let remaining=Object.keys(ASSETS).length,failed=0;
 function settled(ok){if(!ok)failed++;remaining--;if(!remaining)BootGuard.ready(software?'軽量モードで起動しました。':failed?'一部の素材を代替表示しています。ゲームを開始できます。':'準備ができました。入口へお進みください。');}
 for(const [name,url]of Object.entries(ASSETS)){
  let finished=false;const im=new Image();
  const finish=ok=>{if(finished)return;finished=true;clearTimeout(timer);settled(ok);};
  const timer=setTimeout(()=>{im.onload=im.onerror=null;im.src='';finish(false);},4000);
  im.onload=()=>{try{
   uploadTexture(name,im);images[name]=im;
   if(name==='commuter'||name==='red')for(let frame=0;frame<16;frame++){const key=name+'Walk'+frame;if(textures[key]){if(!software)gl.deleteTexture(textures[key]);delete textures[key];}}
   finish(true);
  }catch(e){console.warn('Using fallback asset:',name,String(e));finish(false);}};
  im.onerror=()=>finish(false);
  try{im.src=url;}catch(e){finish(false);}
 }
}
try{
 makeFallbackAssets();makeDecorations();setup(0);textureReady=true;
 $('start').disabled=false;$('start').textContent='入口へ進む →';
 BootGuard.ready(software?'軽量モードで起動しました。':'入口へ進めます。画像を仕上げています。');
 requestAnimationFrame(loop);setTimeout(loadAssets,0);
}catch(e){console.error('Startup failed:',String(e));BootGuard.fail('通路を用意できませんでした。軽量モードで開き直してください。');}

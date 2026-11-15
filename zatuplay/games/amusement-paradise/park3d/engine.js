/* Paradise 3D — dependency-free WebGL renderer. */
(function(global){
'use strict';
const TAU=Math.PI*2;
function normalize(a){const n=Math.hypot(...a)||1;return a.map(v=>v/n);}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function camera(eye,target,aspect){
 const z=normalize(eye.map((v,i)=>v-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x),dot=a=>-a.reduce((s,v,i)=>s+v*eye[i],0);
 const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,dot(x),dot(y),dot(z),1]);
 const f=1/Math.tan(55*Math.PI/360),near=.2,far=520;
 return mul(new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]),view);
}
function color(c){if(Array.isArray(c))return c;return [(c>>16&255)/255,(c>>8&255)/255,(c&255)/255];}
const shapes={};
function tri(out,a,b,c,n){n=n||normalize(cross(b.map((v,i)=>v-a[i]),c.map((v,i)=>v-a[i])));for(const p of [a,b,c])out.push(...p,...n);}
function box(){const v=[],p=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];for(const q of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]]){tri(v,p[q[0]],p[q[1]],p[q[2]]);tri(v,p[q[0]],p[q[2]],p[q[3]]);}return new Float32Array(v);}
function cylinder(n=10,top=1){const v=[];for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n,p=[Math.cos(a)*.5,-.5,Math.sin(a)*.5],q=[Math.cos(b)*.5,-.5,Math.sin(b)*.5],r=[Math.cos(b)*.5*top,.5,Math.sin(b)*.5*top],s=[Math.cos(a)*.5*top,.5,Math.sin(a)*.5*top];tri(v,p,r,q);tri(v,p,s,r);tri(v,[0,.5,0],r,s);tri(v,[0,-.5,0],p,q);}return new Float32Array(v);}
function gem(){const v=[],p=[[1,0,0],[0,0,1],[-1,0,0],[0,0,-1]];for(let i=0;i<4;i++){tri(v,[0,1,0],p[i],p[(i+1)%4]);tri(v,[0,-1,0],p[(i+1)%4],p[i]);}return new Float32Array(v.map((x,i)=>i%6<3?x*.5:x));}
function sphere(lat=6,lon=10){const v=[];const point=(a,b)=>[Math.sin(a)*Math.cos(b)*.5,Math.cos(a)*.5,Math.sin(a)*Math.sin(b)*.5];for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){const a=i*Math.PI/lat,b=(i+1)*Math.PI/lat,c=j*TAU/lon,d=(j+1)*TAU/lon;tri(v,point(a,c),point(b,c),point(b,d));tri(v,point(a,c),point(b,d),point(a,d));}return new Float32Array(v);}
function ring(){const v=[];for(let i=0;i<12;i++){const a=i*TAU/12,b=(i+1)*TAU/12,p=(t,y,r)=>[Math.cos(t)*r,y,Math.sin(t)*r];for(const q of [[p(a,-.5,.5),p(a,.5,.5),p(b,.5,.5),p(b,-.5,.5)],[p(a,.5,.42),p(a,-.5,.42),p(b,-.5,.42),p(b,.5,.42)],[p(a,.5,.5),p(a,.5,.42),p(b,.5,.42),p(b,.5,.5)]]){tri(v,q[0],q[1],q[2]);tri(v,q[0],q[2],q[3]);}}return new Float32Array(v);}
shapes.ring=ring();shapes.sphere=sphere();shapes.box=box();shapes.cyl=cylinder();shapes.cone=cylinder(10,0);shapes.gem=gem();
const cpuShapes={...shapes,sphere:sphere(3,6),cyl:cylinder(6),cone:cylinder(6,0)};
class Engine{
 constructor(canvas){
  this.canvas=canvas;const low=new URLSearchParams(location.search).get('quality')==='low';this.lowFallback=low;this.gl=canvas.getContext('webgl',{antialias:!low,alpha:false,powerPreference:low?'low-power':'high-performance'});if(!this.gl&&!low){this.lowFallback=true;this.gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'});}if(!this.gl){
   this.ctx2d=canvas.getContext('2d',{alpha:false});if(!this.ctx2d)throw Error('この端末では描画を利用できません。');
   this.renderer='canvas2d';this.lowFallback=true;this.data=new Float32Array(1800000);this.items=[];this.drawDistance=155;this.eye=[0,15,22];this.target=[0,0,0];this.day=1;this.quality=0;this.sky=[.7,.86,.91];return;
  }this.renderer='webgl';
  const gl=this.gl,compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const vs=compile(gl.VERTEX_SHADER,'attribute vec3 aPos;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uVP;uniform vec3 uEye;varying vec3 vColor;varying float vFog;void main(){vec3 light=normalize(vec3(-0.5,1.0,0.35));float shade=0.58+0.42*max(dot(normalize(aNormal),light),0.0);vColor=aColor*shade;vFog=clamp((distance(aPos,uEye)-95.0)/160.0,0.0,0.92);gl_Position=uVP*vec4(aPos,1.0);}');
  const fs=compile(gl.FRAGMENT_SHADER,'precision mediump float;varying vec3 vColor;varying float vFog;uniform vec3 uSky;uniform float uDay;void main(){vec3 col=vColor*(0.52+0.48*uDay);gl_FragColor=vec4(mix(col,uSky,vFog),1.0);}');
  this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);for(const [i,n] of ['aPos','aNormal','aColor'].entries()){const loc=gl.getAttribLocation(this.program,n);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,36,i*12);}
  this.uniform={};for(const n of ['uVP','uEye','uSky','uDay'])this.uniform[n]=gl.getUniformLocation(this.program,n);
  gl.enable(gl.DEPTH_TEST);this.data=new Float32Array(1800000);this.items=[];this.drawDistance=155;this.eye=[0,15,22];this.target=[0,0,0];this.day=1;this.quality=1;this.sky=[.7,.86,.91];
 }
 clear(){this.items.length=0;}
 add(type,x,y,z,sx,sy,sz,c){const m={geo:(this.ctx2d?cpuShapes:shapes)[type]||shapes.box,x,y,z,sx,sy,sz,c:color(c),yaw:0,roll:0,pitch:0,visible:true};this.items.push(m);return m;}
 beam(a,b,width,c){const d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d),m=this.add('box',(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,width,len,width,c);m.roll=-Math.atan2(Math.hypot(d[0],d[2]),d[1]);m.yaw=-Math.atan2(d[2],d[0]);return m;}
 render(){
  const gl=this.gl,c=this.canvas,ratio=Math.min(devicePixelRatio||1,this.quality===0?1:1.5),w=Math.floor(c.clientWidth*ratio),h=Math.floor(c.clientHeight*ratio);if(c.width!==w||c.height!==h){c.width=w;c.height=h;if(gl)gl.viewport(0,0,w,h);}
  this.vp=camera(this.eye,this.target,w/h);const vp=this.vp,planes=[];for(const row of [0,1,2])for(const sign of [-1,1]){const v=[vp[3]+sign*vp[row],vp[7]+sign*vp[4+row],vp[11]+sign*vp[8+row],vp[15]+sign*vp[12+row]],n=Math.hypot(v[0],v[1],v[2]);planes.push(v.map(x=>x/n));}let p=0;
  for(const m of this.items){if(!m.visible)continue;const radius=Math.hypot(m.sx,m.sy,m.sz)*.5;if(Math.hypot(m.x-this.eye[0],m.y-this.eye[1],m.z-this.eye[2])>this.drawDistance+radius)continue;if(planes.some(v=>v[0]*m.x+v[1]*m.y+v[2]*m.z+v[3]<-radius))continue;const need=p+m.geo.length/6*9;if(need>this.data.length){const grown=new Float32Array(Math.max(need,this.data.length*2));grown.set(this.data.subarray(0,p));this.data=grown;}if(m._cache&&m._x===m.x&&m._y===m.y&&m._z===m.z&&m._sx===m.sx&&m._sy===m.sy&&m._sz===m.sz&&m._yaw===m.yaw&&m._pitch===m.pitch&&m._roll===m.roll&&m._r===m.c[0]&&m._g===m.c[1]&&m._b===m.c[2]){this.data.set(m._cache,p);p+=m._cache.length;continue;}const begin=p;const cy=Math.cos(m.yaw),sy=Math.sin(m.yaw),cr=Math.cos(m.roll),sr=Math.sin(m.roll),cp=Math.cos(m.pitch),sp=Math.sin(m.pitch),g=m.geo;
   for(let i=0;i<g.length;i+=6){let x=g[i]*m.sx,y=g[i+1]*m.sy,z=g[i+2]*m.sz,py=y*cp-z*sp,pz=y*sp+z*cp,rx=x*cr-py*sr,ry=x*sr+py*cr;z=pz;
    this.data[p++]=m.x+rx*cy+z*sy;this.data[p++]=m.y+ry;this.data[p++]=m.z-rx*sy+z*cy;
    x=g[i+3];y=g[i+4];z=g[i+5];py=y*cp-z*sp;pz=y*sp+z*cp;rx=x*cr-py*sr;ry=x*sr+py*cr;z=pz;this.data[p++]=rx*cy+z*sy;this.data[p++]=ry;this.data[p++]=-rx*sy+z*cy;
    this.data[p++]=m.c[0];this.data[p++]=m.c[1];this.data[p++]=m.c[2];
   }
   if(!m._cache)m._cache=new Float32Array(p-begin);m._cache.set(this.data.subarray(begin,p));m._x=m.x;m._y=m.y;m._z=m.z;m._sx=m.sx;m._sy=m.sy;m._sz=m.sz;m._yaw=m.yaw;m._pitch=m.pitch;m._roll=m.roll;m._r=m.c[0];m._g=m.c[1];m._b=m.c[2];
  }
  if(p>this.data.length)throw Error('描画データ上限');
  if(this.ctx2d){this.renderCPU(p,w,h);this.vertices=p/9;return;}
  gl.clearColor(...this.sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniform.uVP,false,this.vp);gl.uniform3fv(this.uniform.uEye,this.eye);gl.uniform3fv(this.uniform.uSky,this.sky);gl.uniform1f(this.uniform.uDay,this.day);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.data.subarray(0,p),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,p/9);this.vertices=p/9;
 }
 // CPU projection of the SAME transformed triangles. Gameplay and ride cameras are untouched.
 renderCPU(count,width,height){
  const ctx=this.ctx2d,buf=this.data,mat=this.vp,polygons=[],light=normalize([-.5,1,.35]);
  const rgb=c=>'rgb('+c.map(v=>Math.round(Math.max(0,Math.min(1,v))*255)).join(',')+')';
  ctx.fillStyle=rgb(this.sky);ctx.fillRect(0,0,width,height);
  const clip=p=>{let intersection=63,union=0;for(const v of p){let mask=0;for(let k=0;k<3;k++){if(v[3]+v[k]<0)mask|=1<<(k*2);if(v[3]-v[k]<0)mask|=1<<(k*2+1);}intersection&=mask;union|=mask;}if(intersection)return [];if(!union)return p;
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
   if(!p.length)return p;const q=[];for(let j=0;j<p.length;j++){
    const a=p[j],b=p[(j+1)%p.length],da=a[3]+sign*a[axis],db=b[3]+sign*b[axis];
    if(da>=0)q.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);q.push(a.map((v,k)=>v+(b[k]-v)*t));}
   }p=q;
  }return p;};
  for(let i=0;i<count;i+=27){
   // Closed procedural solids: discard faces pointing away before projection.
   if(buf[i+3]*(this.eye[0]-buf[i])+buf[i+4]*(this.eye[1]-buf[i+1])+buf[i+5]*(this.eye[2]-buf[i+2])<=0)continue;
   let poly=[],distance=0;
   for(let j=0;j<3;j++){const k=i+j*9,x=buf[k],y=buf[k+1],z=buf[k+2];distance+=Math.hypot(x-this.eye[0],y-this.eye[1],z-this.eye[2])/3;
    poly.push([mat[0]*x+mat[4]*y+mat[8]*z+mat[12],mat[1]*x+mat[5]*y+mat[9]*z+mat[13],mat[2]*x+mat[6]*y+mat[10]*z+mat[14],mat[3]*x+mat[7]*y+mat[11]*z+mat[15]]);
   }
   poly=clip(poly);if(poly.length<3||poly.some(v=>v[3]<=0||!v.every(Number.isFinite)))continue;
   const shade=.58+.42*Math.max(0,buf[i+3]*light[0]+buf[i+4]*light[1]+buf[i+5]*light[2]),fog=Math.max(0,Math.min(.92,(distance-95)/160));
   const fill=rgb([0,1,2].map(k=>buf[i+6+k]*shade*(.52+.48*this.day)*(1-fog)+this.sky[k]*fog));
   const depth=poly.reduce((sum,v)=>sum+v[3],0)/poly.length;
   polygons.push({depth,fill,points:poly.map(v=>[(v[0]/v[3]*.5+.5)*width,(.5-v[1]/v[3]*.5)*height])});
  }
  polygons.sort((a,b)=>b.depth-a.depth);
  for(const p of polygons){ctx.fillStyle=p.fill;ctx.beginPath();ctx.moveTo(...p.points[0]);for(let j=1;j<p.points.length;j++)ctx.lineTo(...p.points[j]);ctx.closePath();ctx.fill();}
  this.cpuTriangles=polygons.length;
 }
 project(x,y,z){if(!this.vp)return null;const m=this.vp,w=m[3]*x+m[7]*y+m[11]*z+m[15];if(w<=0)return null;return {x:(m[0]*x+m[4]*y+m[8]*z+m[12])/w*.5+.5,y:.5-(m[1]*x+m[5]*y+m[9]*z+m[13])/w*.5};}
}
global.P3D={Engine,color,camera,mul,TAU};
})(typeof window!=='undefined'?window:globalThis);

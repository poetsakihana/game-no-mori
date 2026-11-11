"use strict";
function makeKeychain(canvas) {
  const frontSource="assets/key-front.webp",backSource="assets/key-back.webp";
  const stage=canvas.parentElement,reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let yaw=-.22,pitch=-.075,draw=()=>{},release=()=>{},frame=0,alive=true,grab=null;
  function turn(){cancelAnimationFrame(frame);const from=yaw;const start=performance.now();
    function step(t){const f=reduce?1:Math.min(1,(t-start)/680);yaw=from+Math.PI*f*f*(3-2*f);draw();if(f<1&&alive)frame=requestAnimationFrame(step)}step(start)}
  function down(e){if(e.target.closest("button"))return;cancelAnimationFrame(frame);grab=[e.clientX,e.clientY,yaw,pitch];stage.setPointerCapture(e.pointerId)}
  function move(e){if(!grab)return;yaw=grab[2]+(e.clientX-grab[0])*.013;pitch=Math.max(-.48,Math.min(.48,grab[3]+(e.clientY-grab[1])*.004));draw()}
  function up(){grab=null}
  stage.addEventListener("pointerdown",down);stage.addEventListener("pointermove",move);stage.addEventListener("pointerup",up);stage.addEventListener("pointercancel",up);
  function fallback(){
    canvas.hidden=true;
    const rig=document.createElement("div");
    rig.className="fallback-rig";
    rig.innerHTML='<div class="fallback-model"><i class="f-ring"></i><i class="f-link"></i><div class="f-tag f-front"><img src="'+frontSource+'" alt="でらええがね"></div><div class="f-tag f-back"><img src="'+backSource+'" alt="全市踏破"></div></div>';
    stage.prepend(rig);const m=rig.firstElementChild;
    draw=()=>{m.style.transform='rotateX('+pitch+'rad) rotateY('+yaw+'rad) rotateZ(-.04rad)'};draw();
  }
  let gl;
  try {gl=canvas.getContext("webgl",{alpha:true,antialias:true,powerPreference:"low-power"})} catch {}
  if(!gl){fallback()}else{
    const objects=[];
    try {
      const vert='attribute vec3 aPos,aNormal;attribute vec2 aUV;uniform vec2 uAngles;uniform float uAspect;varying vec3 nrm,pos;varying vec2 uv;void main(){float cy=cos(uAngles.x),sy=sin(uAngles.x),cx=cos(uAngles.y),sx=sin(uAngles.y);mat3 ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy);mat3 rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);mat3 rz=mat3(.997,-.077,0.,.077,.997,0.,0.,0.,1.);mat3 rot=rx*ry*rz;pos=rot*aPos;nrm=rot*aNormal;uv=aUV;float p=5.8/(5.8-pos.z);gl_Position=vec4(p*pos.x/(1.93*uAspect),p*pos.y/1.93,-pos.z/5.,1.);}';
      const frag='precision mediump float;varying vec3 nrm,pos;varying vec2 uv;uniform sampler2D uTex;uniform float uMetal;void main(){vec3 n=normalize(nrm);vec3 l=normalize(vec3(-.55,.8,1.25));vec3 v=normalize(vec3(0.,0.,5.8)-pos);vec3 h=normalize(l+v);float lam=max(0.,dot(n,l));float sp=pow(max(0.,dot(n,h)),29.);vec3 r=reflect(-v,n);float stripe=pow(.5+.5*cos(6.*r.y+2.3*r.x),6.);vec3 base=texture2D(uTex,uv).rgb;vec3 enamel=base*(.76+.30*lam)+.075*sp;vec3 metal=vec3(.87,.60,.21)*(.48+.47*lam+.22*r.y)+vec3(.62,.52,.31)*stripe+vec3(.9,.87,.70)*sp;gl_FragColor=vec4(mix(enamel,metal,uMetal),1.);}';
      function shader(type,src){const s=gl.createShader(type);objects.push(["Shader",s]);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error("shader");return s}
      const program=gl.createProgram();objects.push(["Program",program]);gl.attachShader(program,shader(gl.VERTEX_SHADER,vert));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error("shader link");gl.useProgram(program);
      const vertex=[],groups=[];
      function v(p,n,uv=[.5,.5]){vertex.push(...p,...n,...uv)}
      function group(which,fn){const first=vertex.length/8;fn();groups.push({first,count:vertex.length/8-first,which})}
      const shape=[[-.78,-1.56],[.78,-1.56],[.89,-1.45],[.89,.22],[.61,.52],[-.61,.52],[-.89,.22],[-.89,-1.45]];
      const texUV=([x,y],back)=>[(back?1:-1)*(-x/1.78)+.5,1-(y+1.56)/2.08];
      function face(side){for(let i=0;i<shape.length;i++){const p=shape[i],q=shape[(i+1)%shape.length];for(const a of [[0,-.52],p,q])v([a[0]*.98,a[1],side*.084],[0,0,side],texUV(a,side<0))}}
      group(0,()=>face(1));group(1,()=>face(-1));
      function torus(center,r,t,tilt=0,slope=0,ell=1){
        function point(i,j){const a=i*2*Math.PI/72,b=j*2*Math.PI/14;
          const nx=Math.cos(a)*Math.cos(b),ny=Math.sin(a)*Math.cos(b),nz=Math.sin(b);
          const x=r*Math.cos(a)+t*nx,y=r*ell*Math.sin(a)+t*ny+slope*i/72,z=t*nz;
          const c=Math.cos(tilt),s=Math.sin(tilt);
          return [[center[0]+x*c+z*s,center[1]+y,center[2]-x*s+z*c],[nx*c+nz*s,ny,-nx*s+nz*c]]}
        for(let i=0;i<72;i++)for(let j=0;j<14;j++)for(const [a,b] of [[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]])v(...point(a,b))
      }
      group(2,()=>{
        for(let i=0;i<shape.length;i++){const p=shape[i],q=shape[(i+1)%shape.length];const len=Math.hypot(q[0]-p[0],q[1]-p[1]),nx=(q[1]-p[1])/len,ny=(p[0]-q[0])/len;
          for(const [inA,zA,inB,zB,nz] of [[.98,.084,1,.061,.6],[1,.061,1,-.061,0],[1,-.061,.98,-.084,-.6]]) {
            for(const [pt,k,z] of [[p,inA,zA],[q,inA,zA],[q,inB,zB],[p,inA,zA],[q,inB,zB],[p,inB,zB]])v([pt[0]*k,(pt[1]+.52)*k-.52,z],[nx,ny,nz])
          }
        }
        torus([0,1.27,-.025],.43,.052,.13,0,1.02);
        torus([0,1.26,.018],.419,.032,.13,0,1.02);
        torus([.008,.825,.015],.112,.033,1.13,0,1.62);
        torus([-.012,.565,.013],.113,.034,.22,0,1.5);
        torus([0,.336,.085],.078,.023,0);
      });
      const buffer=gl.createBuffer();objects.push(["Buffer",buffer]);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertex),gl.STATIC_DRAW);
      [["aPos",3,0],["aNormal",3,12],["aUV",2,24]].forEach(([name,size,offset])=>{const loc=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset)});
      const textures=[frontSource,backSource].map(src=>{
        const tex=gl.createTexture();objects.push(["Texture",tex]);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([37,86,69,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        const img=new Image();img.onload=()=>{if(!alive)return;gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);draw()};img.src=src;return tex;
      });
      const angles=gl.getUniformLocation(program,"uAngles"),aspect=gl.getUniformLocation(program,"uAspect"),metal=gl.getUniformLocation(program,"uMetal");
      gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
      draw=()=>{const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);
        const width=Math.max(2,Math.round(r.width*d)),height=Math.max(2,Math.round(r.height*d));
        if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
        gl.viewport(0,0,width,height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform2f(angles,yaw,pitch);gl.uniform1f(aspect,width/height);
        for(const g of groups){gl.uniform1f(metal,g.which===2?1:0);gl.bindTexture(gl.TEXTURE_2D,textures[g.which%2]);gl.drawArrays(gl.TRIANGLES,g.first,g.count)}
      };draw();const observer=new ResizeObserver(draw);observer.observe(stage);
      release=()=>{observer.disconnect();for(const [kind,o] of objects)gl["delete"+kind](o);gl.getExtension("WEBGL_lose_context")?.loseContext()};
    }catch{for(const [kind,o] of objects)gl["delete"+kind](o);fallback()}
  }
  return {turn,dispose:()=>{alive=false;cancelAnimationFrame(frame);release();stage.removeEventListener("pointerdown",down);stage.removeEventListener("pointermove",move);stage.removeEventListener("pointerup",up);stage.removeEventListener("pointercancel",up)}};
}

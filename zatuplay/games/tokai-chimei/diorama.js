"use strict";
// The local GLB uses baked world coordinates and one indexed mesh per material.
function openDiorama(canvas,status,controls){
  let alive=true,drag=null,yaw=-.65,pitch=.40,zoom=1,paint=()=>{};
  let gl,observer;
  const resources=[],abort=new AbortController();
  const uniform=(p,n)=>gl.getUniformLocation(p,n);
  function fallback(){
    if(!alive)return;
    canvas.hidden=true;
    controls.hidden=false;
    const image=document.createElement("img");
    image.className="spin-frame";image.alt="回転して眺められる名古屋城の3Dジオラマ";image.draggable=false;
    canvas.parentElement.appendChild(image);
    status.textContent="指で左右に動かすと、一周して眺められるよ。";
    let angle=0,size=1,lastFrame=-1;
    const path=i=>"assets/turntable/"+String(i).padStart(2,"0")+".webp";
    const pool=new Map();
    function preload(i){
      const index=(i+24)%24;
      if(!pool.has(index)){const img=new Image();img.src=path(index);pool.set(index,img)}
    }
    function show(){
      const index=((Math.round(angle)%24)+24)%24;
      if(index!==lastFrame){image.src=path(index);lastFrame=index;preload(index+1);preload(index-1)}
      image.style.transform="scale("+size+")";
    }
    image.onpointerdown=e=>{drag=[e.clientX,angle];image.setPointerCapture(e.pointerId)};
    image.onpointermove=e=>{if(drag){angle=drag[1]+(e.clientX-drag[0])/12;show()}};
    image.onpointerup=image.onpointercancel=()=>{drag=null};
    controls.onclick=e=>{const act=e.target.closest("button")?.dataset.view;
      if(act==="left")angle-=2;if(act==="right")angle+=2;
      if(act==="zoom")size=size===1?1.27:1;
      if(act==="reset"){angle=0;size=1}show()};
    show();
  }
  function redraw(){if(alive)paint()}
  function down(e){drag=[e.clientX,e.clientY,yaw,pitch];canvas.setPointerCapture(e.pointerId)}
  function move(e){if(!drag)return;yaw=drag[2]+(e.clientX-drag[0])*.011;pitch=Math.max(.02,Math.min(1.28,drag[3]+(e.clientY-drag[1])*.008));redraw()}
  function up(){drag=null}
  canvas.onpointerdown=down;canvas.onpointermove=move;canvas.onpointerup=canvas.onpointercancel=up;
  controls.onclick=e=>{const act=e.target.closest("button")?.dataset.view;
    if(act==="left")yaw-=Math.PI/6;if(act==="right")yaw+=Math.PI/6;
    if(act==="zoom")zoom=zoom===1?1.28:1;
    if(act==="reset"){zoom=1;yaw=-.65;pitch=.4}redraw()};
  (async()=>{
    try{
      gl=canvas.getContext("webgl",{alpha:true,antialias:true,powerPreference:"low-power"});
      if(!gl)throw Error();
      const res=await fetch("assets/castle.glb",{signal:abort.signal});if(!res.ok)throw Error();
      const bytes=await res.arrayBuffer();if(!alive)return;
      const header=new DataView(bytes),jsonSize=header.getUint32(12,true),start=20+jsonSize+8;
      const model=JSON.parse(new TextDecoder().decode(new Uint8Array(bytes,20,jsonSize)));
      const vert='attribute vec3 p,n;uniform vec3 angles;uniform float aspect;varying vec3 normal;void main(){float cy=cos(angles.x),sy=sin(angles.x),cx=cos(angles.y),sx=sin(angles.y);mat3 ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy),rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);vec3 world=rx*ry*(p-vec3(0.,3.15,0.));normal=n;float scale=angles.z*min(1.,aspect/1.2);gl_Position=vec4(world.x*scale/(6.1*aspect),world.y*scale/6.1,-world.z/23.,1.);}';
      const frag='precision mediump float;varying vec3 normal;uniform vec4 color;void main(){vec3 n=normalize(normal);vec3 light=normalize(vec3(-.5,1.,.5));float lum=.49+.38*max(n.y,0.)+.36*max(dot(n,light),0.);vec3 rgb=pow(max(vec3(0.),color.rgb*lum),vec3(.4545));gl_FragColor=vec4(rgb,1.);}';
      const prog=gl.createProgram();resources.push(["Program",prog]);
      for(const [kind,src] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]){const sh=gl.createShader(kind);resources.push(["Shader",sh]);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error();gl.attachShader(prog,sh)}
      gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error();gl.useProgram(prog);
      const buffers=model.bufferViews.map(v=>{const b=gl.createBuffer();resources.push(["Buffer",b]);const t=v.target||gl.ARRAY_BUFFER;gl.bindBuffer(t,b);gl.bufferData(t,new Uint8Array(bytes,start+(v.byteOffset||0),v.byteLength),gl.STATIC_DRAW);return b});
      const meshes=model.nodes.flatMap(node=>model.meshes[node.mesh]?.primitives||[]);
      const apos=gl.getAttribLocation(prog,"p"),anorm=gl.getAttribLocation(prog,"n");
      const ang=uniform(prog,"angles"),asp=uniform(prog,"aspect"),col=uniform(prog,"color");
      gl.enableVertexAttribArray(apos);gl.enableVertexAttribArray(anorm);gl.enable(gl.DEPTH_TEST);gl.clearColor(0,0,0,0);
      if(meshes.some(m=>model.accessors[m.indices].componentType===5125)&&!gl.getExtension("OES_element_index_uint"))throw Error();
      function attr(loc,id){const a=model.accessors[id],v=model.bufferViews[a.bufferView];gl.bindBuffer(gl.ARRAY_BUFFER,buffers[a.bufferView]);gl.vertexAttribPointer(loc,3,a.componentType,!!a.normalized,v.byteStride||0,a.byteOffset||0)}
      paint=()=>{
        const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}
        gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform3f(ang,yaw,pitch,zoom);gl.uniform1f(asp,w/h);
        for(const m of meshes){attr(apos,m.attributes.POSITION);attr(anorm,m.attributes.NORMAL);const a=model.accessors[m.indices];gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,buffers[a.bufferView]);gl.uniform4fv(col,model.materials[m.material].pbrMetallicRoughness.baseColorFactor);gl.drawElements(gl.TRIANGLES,a.count,a.componentType,a.byteOffset||0)}
      };
      status.textContent="指で左右・上下に動かして眺められるよ。";controls.hidden=false;redraw();
      observer=new ResizeObserver(redraw);observer.observe(canvas.parentElement);
    }catch{fallback()}
  })();
  return ()=>{alive=false;abort.abort();observer?.disconnect();for(const [kind,r] of resources)gl["delete"+kind](r);gl?.getExtension("WEBGL_lose_context")?.loseContext()};
}

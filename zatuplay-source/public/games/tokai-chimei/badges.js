"use strict";

// Geographic meshes are derived from MLIT's N03 administrative boundaries.
// Local geometry and textures keep the collection available offline in Android.
const BADGE_COLORS = {
  chikusa: "#377865", higashi: "#9a6550", kita: "#6a7860", nishi: "#586f88",
  nakamura: "#b58338", naka: "#a55043", showa: "#7b6285", mizuho: "#496d84",
  atsuta: "#397a74", nakagawa: "#577c64", minato: "#366f91", minami: "#a06c43",
  moriyama: "#4c7954", midori: "#467c68", meito: "#806f98", tempaku: "#6b7c94"
};

function badgeShape(w) { return WARD_SHAPES[w.id] || CITY_SHAPES[w.id] || GIFU_SHAPES[w.id] || MIE_SHAPES[w.id]; }
function badgeColor(w) {
  const colors=['#377865','#9a6550','#586f88','#a55043','#7b6285','#b58338','#397a74','#6a7860'];
  return BADGE_COLORS[w.id] || colors[Number(w.code) % colors.length];
}
function badgePath(shape, flipX = false) {
  return shape.polygons.flatMap(p => [p.outer, ...p.holes]).map(ring =>
    ring.map(([x, y], i) => (i ? "L" : "M") + (flipX ? -x : x) + "," + (-y)).join("") + "Z"
  ).join("");
}

function badgeIcon(w, locked = false) {
  if (locked) return '<span class="badge-mystery" aria-hidden="true"><svg><use href="#i-lock"/></svg></span>';
  const shape = badgeShape(w);
  return '<svg class="badge-silhouette" viewBox="-1.15 -1.15 2.3 2.3" aria-hidden="true"><path d="' +
    badgePath(shape) + '" fill="' + badgeColor(w) +
    '" fill-rule="evenodd" stroke="' + "#c7a158" +
    '" stroke-width=".035" stroke-linejoin="round"/></svg>';
}

function makeWardBadge(canvas, ward) {
  const shape = badgeShape(ward), stage = canvas.parentElement;
  const color = badgeColor(ward);
  const nameSize = Math.min(.17, shape.labelRadius * 1.6 / ward.name.length);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let yaw = -.28, pitch = .16, frame = 0, alive = true, grab = null;
  let draw = () => {}, release = () => {};

  function turn() {
    cancelAnimationFrame(frame);
    const initial = yaw, started = performance.now();
    function step(now) {
      const t = reduced ? 1 : Math.min(1, (now - started) / 850);
      yaw = initial + Math.PI * t * t * (3 - 2 * t);
      draw();
      if (t < 1 && alive) frame = requestAnimationFrame(step);
    }
    step(started);
  }
  function reset() { cancelAnimationFrame(frame); yaw = 0; pitch = 0; draw(); }
  function down(e) {
    cancelAnimationFrame(frame);
    grab = [e.clientX, e.clientY, yaw, pitch];
    stage.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!grab) return;
    yaw = grab[2] + (e.clientX - grab[0]) * .014;
    pitch = Math.max(-.7, Math.min(.7, grab[3] + (e.clientY - grab[1]) * .006));
    draw();
  }
  function up() { grab = null; }
  stage.addEventListener("pointerdown", down);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);

  function fallback() {
    canvas.hidden = true;
    const rig = document.createElement("div");
    rig.className = "badge-rig";
    const path = badgePath(shape), backPath = badgePath(shape, true);
    const [lx, ly] = shape.label;
    const svg = (d, fill, label, back = false) =>
      '<svg viewBox="-1.12 -1.12 2.24 2.24" aria-hidden="true"><path fill-rule="evenodd" d="' + d +
      '" fill="' + fill + '" stroke="#d7b771" stroke-width=".025" stroke-linejoin="round"/>' +
      (label ? '<text x="' + (back ? -lx : lx) + '" y="' + (-ly) +
      '" text-anchor="middle" dominant-baseline="middle" fill="#fff7d9" stroke="none" font-family="serif" font-weight="bold" font-size="' + nameSize + '">' + label + '</text>' : '') + '</svg>';
    let layers = "";
    for (let z = -7; z <= 7; z++) {
      layers += '<div class="badge-layer" style="transform:translateZ(' + z + 'px)">' +
        svg(path, z % 3 === 0 ? "#d4ad60" : "#a77f39", "") + '</div>';
    }
    rig.innerHTML = '<div class="badge-model">' + layers +
      '<div class="badge-face" style="transform:translateZ(8px)">' + svg(path, color, ward.name) + '</div>' +
      '<div class="badge-face" style="transform:rotateY(180deg) translateZ(8px)">' + svg(backPath, "#aa844a", "踏破", true) + '</div></div>';
    stage.prepend(rig);
    draw = () => { rig.firstElementChild.style.transform = 'rotateX(' + pitch + 'rad) rotateY(' + yaw + 'rad)'; };
    draw();
    release = () => rig.remove();
  }

  let gl;
  try { gl = canvas.getContext("webgl", { alpha: true, antialias: true, powerPreference: "low-power" }); } catch {}
  if (!gl) fallback();
  else {
    const objects = [];
    try {
      const vertexSource = `attribute vec3 aPos,aNormal;attribute vec2 aUV;
        uniform vec2 uAngles;uniform float uAspect;varying vec3 normal,pos;varying vec2 uv;
        void main(){float cy=cos(uAngles.x),sy=sin(uAngles.x),cx=cos(uAngles.y),sx=sin(uAngles.y);
        mat3 ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy);mat3 rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx);
        pos=rx*ry*aPos;normal=rx*ry*aNormal;uv=aUV;float p=5./(5.-pos.z);
        gl_Position=vec4(p*pos.x/(1.3*max(1.,uAspect)),p*pos.y/(1.3*max(1.,1./uAspect)),-pos.z/5.,1.);}`;
      const fragmentSource = `precision mediump float;varying vec3 normal,pos;varying vec2 uv;
        uniform sampler2D uTex;uniform float uMetal;
        void main(){vec3 n=normalize(normal),l=normalize(vec3(-.6,.85,1.2)),v=normalize(vec3(0.,0.,5.)-pos);
        float lam=max(0.,dot(n,l));float spec=pow(max(0.,dot(n,normalize(l+v))),36.);
        vec3 r=reflect(-v,n);float stripe=pow(.5+.5*cos(6.*r.y+2.*r.x),5.);
        vec3 paint=texture2D(uTex,uv).rgb*(.79+.24*lam)+vec3(.13)*spec;
        vec3 metal=vec3(.83,.59,.24)*(.6+.5*lam)+vec3(.37,.30,.16)*stripe+vec3(.5)*spec;
        gl_FragColor=vec4(mix(paint,metal,uMetal),1.);}`;
      function shader(type, source) {
        const s = gl.createShader(type); objects.push(["Shader", s]);
        gl.shaderSource(s, source); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error("Badge shader compilation");
        return s;
      }
      const program = gl.createProgram(); objects.push(["Program", program]);
      gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error("Badge shader linking");
      gl.useProgram(program);
      const data = [], groups = [];
      function point(x, y, z, nx, ny, nz, back = false) {
        data.push(x, y, z, nx, ny, nz, (back ? -x : x) / 2 + .5, .5 - y / 2);
      }
      for (const side of [1, -1]) {
        const first = data.length / 8;
        for (const i of shape.triangles) {
          const [x, y] = shape.vertices[i]; point(x, y, side * .065, 0, 0, side, side < 0);
        }
        groups.push({ first, count: data.length / 8 - first, texture: side > 0 ? 0 : 1 });
      }
      const edgeStart = data.length / 8;
      for (const polygon of shape.polygons) for (const ring of [polygon.outer, ...polygon.holes]) {
        for (let i = 0; i < ring.length; i++) {
          const a = ring[i], b = ring[(i + 1) % ring.length];
          const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (!length) continue;
          const nx = (b[1] - a[1]) / length, ny = (a[0] - b[0]) / length;
          for (const [p, z] of [[a,.065],[b,.065],[b,-.065],[a,.065],[b,-.065],[a,-.065]]) point(p[0],p[1],z,nx,ny,0);
        }
      }
      groups.push({ first: edgeStart, count: data.length / 8 - edgeStart, texture: 0, metal: true });
      const buffer = gl.createBuffer(); objects.push(["Buffer", buffer]);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      for (const [name, size, offset] of [["aPos",3,0],["aNormal",3,12],["aUV",2,24]]) {
        const loc = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 32, offset);
      }
      const textures = [false, true].map(back => {
        const texCanvas = document.createElement("canvas"); texCanvas.width = texCanvas.height = 1024;
        const ctx = texCanvas.getContext("2d");
        ctx.fillStyle = back ? "#ae884d" : color; ctx.fillRect(0, 0, 1024, 1024);
        ctx.save(); ctx.translate(512,512); ctx.scale(512,512);
        ctx.strokeStyle = "#e4c278"; ctx.lineWidth = .04; ctx.lineJoin = "round";
        ctx.stroke(new Path2D(badgePath(shape, back))); ctx.restore();
        const x = 512 + shape.label[0] * 512 * (back ? -1 : 1), y = 512 - shape.label[1] * 512;
        ctx.fillStyle = "#fff2cd"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = 'bold ' + Math.round(nameSize * 512) + 'px serif'; ctx.fillText(back ? "踏破" : ward.name, x, y, 340);
        ctx.font = '22px sans-serif'; ctx.fillText(back ? "TOKAI / REGION COMPLETE" : ward.roman.toUpperCase(), x, y + 66, Math.min(330, shape.labelRadius * 760));
        const texture = gl.createTexture(); objects.push(["Texture", texture]);
        gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,texCanvas);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        return texture;
      });
      const angles = gl.getUniformLocation(program,"uAngles"), aspect = gl.getUniformLocation(program,"uAspect"), metal = gl.getUniformLocation(program,"uMetal");
      gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);
      draw = () => {
        const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1,2);
        const w = Math.max(2,Math.round(rect.width*dpr)), h = Math.max(2,Math.round(rect.height*dpr));
        if (canvas.width !== w || canvas.height !== h) { canvas.width=w; canvas.height=h; }
        gl.viewport(0,0,w,h); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.uniform2f(angles,yaw,pitch); gl.uniform1f(aspect,w/h);
        for (const group of groups) {
          gl.uniform1f(metal,group.metal?1:0); gl.bindTexture(gl.TEXTURE_2D,textures[group.texture]);
          gl.drawArrays(gl.TRIANGLES,group.first,group.count);
        }
      };
      draw(); const observer = new ResizeObserver(draw); observer.observe(stage);
      release = () => { observer.disconnect(); for(const [kind,obj] of objects) gl["delete"+kind](obj); gl.getExtension("WEBGL_lose_context")?.loseContext(); };
    } catch {
      for(const [kind,obj] of objects) gl["delete"+kind](obj);
      fallback();
    }
  }
  return {turn, reset, dispose() {
    alive=false; cancelAnimationFrame(frame); release();
    stage.removeEventListener("pointerdown",down); stage.removeEventListener("pointermove",move);
    stage.removeEventListener("pointerup",up); stage.removeEventListener("pointercancel",up);
  }};
}

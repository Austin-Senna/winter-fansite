// Liquid chrome background: one WebGL2 quad rendered to a texture, then a glitch/scanline post pass.
// GLSL ported from demo/index.html. No dependencies.
export interface Palette { a: string; b: string; glow: string; mode: 0 | 1 | 2 | 3 }

const VS = `#version 300 es
in vec2 p; out vec2 vUv; void main(){ vUv=p*.5+.5; gl_Position=vec4(p,0.,1.); }`;

const SCENE = `#version 300 es
precision highp float; out vec4 o; in vec2 vUv;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uMouseV; uniform float uOct;
uniform vec3 uA0,uB0,uG0,uA1,uB1,uG1; uniform float uMode0,uMode1,uPortal;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,.6,-.6,.8);
  for(int i=0;i<4;i++){ if(float(i)>=uOct) break; v+=a*noise(p); p=r*p*2.03; a*=.5; } return v;}
float field(vec2 uv,float t){
  vec2 q=vec2(fbm(uv+t*.05),fbm(uv+vec2(5.2,1.3)-t*.04));
  vec2 r=vec2(fbm(uv+2.2*q+vec2(1.7,9.2)+t*.06),fbm(uv+2.2*q+vec2(8.3,2.8)-t*.045));
  return fbm(uv+2.0*r);}
vec3 shade(float h,vec3 n,vec3 A,vec3 B,vec3 G,float mode){
  vec3 L=normalize(vec3(.45,.6,.65)); vec3 V=vec3(0.,0.,1.);
  float diff=clamp(dot(n,L),0.,1.);
  vec3 H=normalize(L+V); float spec=pow(clamp(dot(n,H),0.,1.),70.);
  float fres=pow(1.-clamp(dot(n,V),0.,1.),3.);
  vec3 base=mix(A,B,smoothstep(.28,.72,h));
  vec3 irid=.5+.5*cos(6.2831*(fres*1.6+h*.8)+vec3(0.,2.1,4.2));
  if(mode<.5) return base*(.38+.62*diff)+G*spec*1.2+irid*fres*.32;            // chrome
  if(mode<1.5) return base*(.55+.45*diff)+G*spec*.3+irid*fres*.12;            // matte
  if(mode<2.5){ float l=dot(base,vec3(.299,.587,.114)); return vec3(l)*(.3+.7*diff)+vec3(spec)*1.5+vec3(fres*.12);} // mono
  return base*(.82+.18*diff)+G*spec*.45+irid*fres*.18;                            // candy
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float t=uTime;
  vec2 m=(uMouse-.5*uRes)/uRes.y; vec2 d=uv-m; float dd=dot(d,d);
  uv+= d*exp(-dd*14.)*uMouseV*.5;
  vec2 p=uv*1.05;
  float h=field(p,t);
  vec3 n=normalize(vec3(-dFdx(h)*uRes.y*.55,-dFdy(h)*uRes.y*.55,1.));
  vec3 col=shade(h,n,uA0,uB0,uG0,uMode0);
  if(uPortal>.001){
    vec3 c1=shade(h,n,uA1,uB1,uG1,uMode1);
    float edge=length(uv)+fbm(uv*3.+t)*.3;
    float r=uPortal*2.4;
    float mask=smoothstep(r-.35,r,edge);
    col=mix(c1,col,mask);
    col+=vec3(1.)*(1.-smoothstep(0.,.06,abs(edge-r+.17)))*.35*(1.-uPortal);
  }
  o=vec4(col,1.);
}`;

const POST = `#version 300 es
precision highp float; out vec4 o; in vec2 vUv;
uniform sampler2D uTex; uniform vec2 uRes; uniform float uGlitch,uTime;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec2 uv=vUv; float t=uTime;
  if(uGlitch>.001){
    float row=floor(uv.y*42.); float seed=floor(t*22.);
    float on=step(1.-uGlitch*.55,hash(vec2(row*3.1,seed+7.)));
    uv.x+=(hash(vec2(row,seed))-.5)*.22*uGlitch*on;
    float block=step(1.-uGlitch*.08,hash(vec2(floor(uv.x*6.),floor(uv.y*6.)+seed)));
    uv.y+=block*.08*uGlitch;
  }
  float off=uGlitch*.014;
  vec3 c; c.r=texture(uTex,uv+vec2(off,0.)).r; c.g=texture(uTex,uv).g; c.b=texture(uTex,uv-vec2(off,0.)).b;
  c*=1.-uGlitch*.3*(.5+.5*sin(uv.y*uRes.y*1.3));
  float vig=smoothstep(1.5,.35,length(vUv-.5)*1.6);
  c*=mix(.82,1.,vig);
  c+=(hash(gl_FragCoord.xy+fract(t))-.5)*.018;
  o=vec4(c,1.);
}`;

const hex = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const inOut = (x: number) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export function mountShader(canvas: HTMLCanvasElement, initial: Palette, opts: { reduced: boolean; coarse: boolean }) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const dpr = Math.min(window.devicePixelRatio || 1, opts.coarse ? 1 : 1.5);
  const OCT = opts.coarse ? 2 : 4;
  const compile = (type: number, s: string) => { const sh = gl.createShader(type)!; gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) || 'shader'); return sh; };
  const program = (fs: string) => { const p = gl.createProgram()!; gl.attachShader(p, compile(gl.VERTEX_SHADER, VS)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link'); return p; };
  const progScene = program(SCENE), progPost = program(POST);
  const loc = (p: WebGLProgram, names: string[]) => Object.fromEntries(names.map(n => [n, gl.getUniformLocation(p, n)])) as Record<string, WebGLUniformLocation | null>;
  const locS = loc(progScene, ['uRes','uTime','uMouse','uMouseV','uOct','uA0','uB0','uG0','uA1','uB1','uG1','uMode0','uMode1','uPortal']);
  const locP = loc(progPost, ['uTex','uRes','uGlitch','uTime']);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  for (const p of [progScene, progPost]) { const a = gl.getAttribLocation(p, 'p'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); }
  const tex = gl.createTexture()!, fbo = gl.createFramebuffer()!;
  let W = 0, H = 0, running = false, raf = 0;
  const u = { glitch: 0, portal: 0, mouseV: 0 };
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
  let pal0 = initial, pal1 = initial;
  const t0 = performance.now();

  function resize() {
    W = Math.floor(innerWidth * dpr); H = Math.floor(innerHeight * dpr); canvas.width = W; canvas.height = H;
    gl!.bindTexture(gl!.TEXTURE_2D, tex); gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, W, H, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.MIRRORED_REPEAT); gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.MIRRORED_REPEAT);
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo); gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0); gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    if (opts.reduced) frame();
  }
  function frame() {
    const g = gl!;
    const t = (performance.now() - t0) / 1000;
    mouse.x += (mouse.tx - mouse.x) * .08; mouse.y += (mouse.ty - mouse.y) * .08; u.mouseV *= .94;
    g.bindFramebuffer(g.FRAMEBUFFER, fbo); g.viewport(0, 0, W, H); g.useProgram(progScene);
    g.uniform2f(locS.uRes, W, H); g.uniform1f(locS.uTime, opts.reduced ? 12 : t);
    g.uniform2f(locS.uMouse, mouse.x * dpr, (innerHeight - mouse.y) * dpr); g.uniform1f(locS.uMouseV, u.mouseV); g.uniform1f(locS.uOct, OCT);
    g.uniform3fv(locS.uA0, hex(pal0.a)); g.uniform3fv(locS.uB0, hex(pal0.b)); g.uniform3fv(locS.uG0, hex(pal0.glow)); g.uniform1f(locS.uMode0, pal0.mode);
    g.uniform3fv(locS.uA1, hex(pal1.a)); g.uniform3fv(locS.uB1, hex(pal1.b)); g.uniform3fv(locS.uG1, hex(pal1.glow)); g.uniform1f(locS.uMode1, pal1.mode);
    g.uniform1f(locS.uPortal, u.portal); g.drawArrays(g.TRIANGLES, 0, 3);
    g.bindFramebuffer(g.FRAMEBUFFER, null); g.viewport(0, 0, W, H); g.useProgram(progPost);
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, tex); g.uniform1i(locP.uTex, 0);
    g.uniform2f(locP.uRes, W, H); g.uniform1f(locP.uGlitch, u.glitch); g.uniform1f(locP.uTime, t); g.drawArrays(g.TRIANGLES, 0, 3);
  }
  function loop() { if (!running) return; frame(); raf = requestAnimationFrame(loop); }
  function start() { if (running || opts.reduced) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  const onMove = (ev: PointerEvent) => { const dx = ev.clientX - mouse.tx, dy = ev.clientY - mouse.ty; mouse.tx = ev.clientX; mouse.ty = ev.clientY; u.mouseV = Math.min(1, u.mouseV + Math.hypot(dx, dy) / 60); };
  const onVis = () => document.hidden ? stop() : start();
  addEventListener('resize', resize); addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('visibilitychange', onVis);
  resize(); start(); if (opts.reduced) frame();

  function tween(key: 'glitch' | 'portal', to: number, ms: number, ease: (x: number) => number, done?: () => void) {
    const from = u[key], s = performance.now();
    const step = () => { const k = Math.min(1, (performance.now() - s) / ms); u[key] = from + (to - from) * ease(k); if (opts.reduced) frame(); if (k < 1) requestAnimationFrame(step); else done?.(); };
    requestAnimationFrame(step);
  }
  return {
    setPalette(p: Palette, animate = true) {
      if (!animate || opts.reduced) { pal0 = pal1 = p; u.portal = 0; if (opts.reduced) frame(); return; }
      pal1 = p; tween('portal', 1, 1000, inOut, () => { pal0 = p; u.portal = 0; });
    },
    glitch(amount: number, ms: number) { tween('glitch', amount, ms * .35, x => x * x, () => tween('glitch', 0, ms * .65, x => 1 - (1 - x) * (1 - x))); },
    destroy() { stop(); removeEventListener('resize', resize); removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', onVis); },
  };
}

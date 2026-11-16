// fx-gl.js: the @remotion/effects rows Reelwright had no CSS/SVG answer for (2.3.1 remainder, 2.3.7 edges and 3D), as WebGL2 fragment shaders
// and two canvas-2D effects. Clean-room: written from Remotion's public docs (what each effect does and what its options mean), no Remotion code.
// Load after engine.js and fx-color.js. Every effect is a pure function of its options: build once at load, call set(...) from render(t).
//
// Two ways to use an effect, by what you hand it:
//   source (canvas, <img>, <video>, ImageBitmap, or another fx handle: effects chain in call order, as Remotion's `effects={[…]}` array)
//     KIT.fx.outline(src, { w, h, parent, ...options }) → { el, set(options) }   el is a w × h canvas in `parent` (default KIT.stage, null = not
//     attached); set(o) draws with { ...build options, ...o }: nothing is kept between calls. Runs in the page: preview, stills, both renderers.
//   DOM element (a scene, a card: anything not a source)
//     KIT.fx.outline(el, { at: [t0, t1], ...options }) → { at }                     any option may be a function of t. The page shows the plain
//     element; after frames are written, tools/renderers/shader_pass.mjs captures the element alone at each frame in [t0, t1) and composites the
//     effect over the rest (same pass as KIT.shader, SwiftShader, both renderers). Positions (center, position, foldPosition, …) are fractions of
//     the element's box; lengths are CSS px. The effect layer lands on top of everything else in the frame (shortcut: one capture of the rest,
//     no third capture for overlays above the element). Not inside a KIT.shader window (the transition wins there). Source-only effects
//     (lut, shatter, lightning) throw for a DOM element.
// Needs WebGL2: on SwiftShader in headless Chromium (the default there, and the hyperframes producer's software GL). Without it a source effect throws
// "needs WebGL2" (pvk on a GPU-less Linux box: launch Chromium with --enable-unsafe-swiftshader, or render with hyperframes).
//
// Options (Remotion's names and defaults; `disabled: true` passes the source through):
//   outline({ width = 8, color = '#ffffff', opacity = 1, outlineOnly = false })                   solid ring around the alpha silhouette
//   roughenEdges({ amount = 1, border = 26.5, scale = 0.07, seed = 231.2 })                      noisy alpha boundary (border px, scale ~ wavelength)
//   shrinkwrap({ amount = 1, displacement = 5, highlightIntensity = 0.75, wrinkleDensity = 0.42, edgeTension = 0.45, phase = 0, seed = 0 })
//   tear({ progress = 0, angle = 0, rotation = 20, jaggedness = 20 })                            zigzag rip, pieces swing out (rigid: no bend at the tip)
//   bevelAlpha({ edgeThickness = 2, lightAngle = -60, lightColor = 'white', lightIntensity = 0.4 })
//   cylinder({ radius = 250, rotation = 0, rotationX, rotationY, rotationZ = 0, position = [0.5, 0.5], render = 'both', shading = 0.35 })
//   sphere({ radius = 250, rotationX, rotationY, rotationZ = 0, position = [0.5, 0.5], render = 'both', shading = 0.35 })
//   pageTurn({ foldPosition = [0.7, 0.7], foldDirection = 315, foldRadius = 60, lightDirection = -45, render = 'both', backPageOpacity = 0.25,
//              paperColor = '#ffffff' })                                                          where the page has peeled away the layer below shows
//   magnify({ shape = 'circle' | 'square', center = [0.5, 0.5], magnification = 200 (%), size = 100, feather = 0, opacity = 1,
//             scaling = 'standard' | 'nearest', blendingMode = 'normal' | 'none' })
//   thermalVision({ amount = 1, palette = 8 colours dark blue → white })                         luminance → heat ramp (2 to 8 colours)
//   linearGradient({ start = [0, 0.5], end = [1, 0.5], startColor = '#000000', endColor = '#ffffff' })   fill (keeps the source alpha)
//   linearGradientTint({ start, end, startColor, endColor, amount = 0.5 })                        luminance × gradient colour, mixed by amount
//   halftoneLinearGradient({ firstStopDotSize = 0, secondStopDotSize = 40, firstStopPosition = [0, 0.5], secondStopPosition = [1, 0.5],
//                            gridSize = 24, colorMode = 'solid' | 'source', dotColor = 'black', maskToSourceAlpha = false })
//   radialProgressivePixelate({ center = [0.5, 0.5], width = 1, height = 1, rotation = 0, start = 0, startBlockSize = 1, endBlockSize = 40 })
//   uvTranslate({ u = 0, v = 0 })                                                                 move by fractions of the box (no wrap)
//   starburst({ rays = 12, colors = ['#ffcc00', '#ff6600'], rotation = 0, smoothness = 0, origin = [0.5, 0.5] })   ray fill (keeps alpha)
//   filmBurn({ progress = 0, center = [0.5, 0.5], seed = 0 })                                     charred holes with glowing rims; 1 = all gone
//   lut({ content })            a .cube 3D LUT (LUT_3D_SIZE, DOMAIN_MIN/MAX), trilinear on a half-float 3D texture. Source only.
//   shatter({ time = 0.5, pattern = 'bricks' | 'glass' | 'hexagons' | 'squares' | 'triangles', repetitions = 10, direction = 0,
//             origin = [0.5, 0.5], center = [0.5, 0.5], radius = 0.4, depth = 0.1, strength = 5, rotationSpeed = 0.2, randomness = 0.1,
//             viscosity = 0.1, massVariance = 0.3, gravity = 3, seed = 0, extrusionDepth = 0.05 })   canvas 2D, orthographic. Source only.
//   lightning({ origin = [0.5, 0], direction = [0.5, 1], conductivityState = 10, coreRadius = 3, coreOpacity = 0.75, coreColor = '#ffffff',
//               glowRadius = 50, glowOpacity = 0.5, glowColor = '#4059ff', turbulence = 1, forking = 0.25, decay = 0.3, complexity = 6,
//               terminationThreshold = 0.05, forkStrength = 0.5, seed = 0, compositeOnOriginal = true })   canvas 2D, 'strike' type. Source only.
// KIT.fx.gl.names: the GLSL effects; KIT.fx.gl.source(name) → its fragment shader (shader_pass.mjs reads it from here).
// shortcut: outline's edgeSimplification, lightning's other lightningTypes / alphaObstacle / fractalType, magnify's `link` are not built.
'use strict';
(function () {
  const K = window.KIT, X = K && K.fx;
  if (!X || !X.rgb) throw new Error('fx-gl.js: load tools/engine.js and tools/fx-color.js first');
  const D2R = Math.PI / 180, MODE = { both: 0, front: 1, back: 2 };
  const cx = document.createElement('canvas').getContext('2d');
  const rgba = (c) => {   // any CSS colour → [r, g, b, a] 0..1
    cx.fillStyle = '#000'; cx.fillStyle = c; const v = cx.fillStyle;
    if (v[0] === '#') return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).concat(1);
    const n = v.match(/[\d.]+/g).map(Number); return [n[0] / 255, n[1] / 255, n[2] / 255, n[3] ?? 1];
  };
  const rgb = (c) => rgba(c).slice(0, 3);
  const pal = (cols, max = 8) => {
    if (!Array.isArray(cols) || cols.length < 2 || cols.length > max) throw new Error(`fx-gl: give 2 to ${max} colours`);
    const a = cols.map(rgb); while (a.length < max) a.push(a[a.length - 1]); return a.flat();
  };

  // ── GLSL: box space. uv is 0..1 over the source (or the element's box), R its size in px; S(uv) samples it (premultiplied, 0 outside the frame) ──
  const VERT = '#version 300 es\nin vec2 a;out vec2 v_uv;void main(){v_uv=a*.5+.5;v_uv.y=1.-v_uv.y;gl_Position=vec4(a,0,1);}';
  const HEAD = `#version 300 es
precision highp float;
uniform sampler2D u_src;uniform vec4 u_box;uniform vec2 u_frame;in vec2 v_uv;out vec4 o;vec2 R;
const float PI=3.14159265358979;
vec4 S(vec2 uv){vec2 f=(u_box.xy+uv*u_box.zw)/u_frame;return(f.x<0.||f.y<0.||f.x>1.||f.y>1.)?vec4(0):texture(u_src,f);}
vec3 unp(vec4 c){return c.a>0.?c.rgb/c.a:vec3(0);}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*vnoise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return v;}
mat3 rotXYZ(vec3 r){float a=cos(r.x),b=sin(r.x),c=cos(r.y),d=sin(r.y),e=cos(r.z),f=sin(r.z);
 return mat3(e,f,0,-f,e,0,0,0,1)*mat3(c,0,-d,0,1,0,d,0,c)*mat3(1,0,0,0,a,b,0,-b,a);}
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
`;
  const MAIN = '\nvoid main(){R=u_box.zw;o=fx((v_uv*u_frame-u_box.xy)/u_box.zw);}';

  // each: glsl (defines vec4 fx(vec2 uv)), d (defaults), u(o, px) → uniforms (px = frame px per CSS px)
  const DEF = {
    outline: { d: { width: 8, color: '#ffffff', opacity: 1, outlineOnly: false },
      u: (o, px) => ({ u_w: o.width * px, u_col: rgb(o.color), u_op: o.opacity, u_only: +!!o.outlineOnly }),
      glsl: `uniform float u_w,u_op,u_only;uniform vec3 u_col;
vec4 fx(vec2 uv){vec4 c=S(uv);float d=c.a;
 if(u_w>0.)for(int i=0;i<32;i++){vec2 dir=vec2(cos(float(i)*PI/16.),sin(float(i)*PI/16.));
  for(int j=1;j<=8;j++)d=max(d,S(uv+dir*u_w*float(j)/8./R).a);}
 vec4 ol=vec4(u_col,1.)*d*u_op;return u_only>.5?ol:c+(1.-c.a)*ol;}` },

    roughenEdges: { d: { amount: 1, border: 26.5, scale: 0.07, seed: 231.2 },
      u: (o, px) => ({ u_amt: o.amount, u_b: o.border * px, u_s: o.scale * 400 * px, u_seed: o.seed }),
      glsl: `uniform float u_amt,u_b,u_s,u_seed;
vec4 fx(vec2 uv){vec4 c=S(uv);if(u_amt<=0.||u_b<=0.)return c;
 vec2 p=uv*R/u_s+u_seed*1.37;vec2 off=(vec2(fbm(p),fbm(p+vec2(19.1,7.3)))-.5)*2.5*u_b*u_amt;
 vec4 d=S(uv+off/R);float a=d.a;return vec4((c.a>.5?unp(c):unp(d))*a,a);}` },

    shrinkwrap: { d: { amount: 1, displacement: 5, highlightIntensity: 0.75, wrinkleDensity: 0.42, edgeTension: 0.45, phase: 0, seed: 0 },
      u: (o, px) => ({ u_amt: o.amount, u_disp: o.displacement * px, u_hi: o.highlightIntensity, u_den: o.wrinkleDensity, u_edge: o.edgeTension, u_ph: o.phase, u_seed: o.seed }),
      glsl: `uniform float u_amt,u_disp,u_hi,u_den,u_edge,u_ph,u_seed;
float H(vec2 p){vec2 q=p*mix(2.,9.,u_den)+vec2(u_seed*3.1+u_ph*.37,u_seed*1.7+u_ph*.23);return .65*(1.-abs(fbm(q)*2.-1.))+.35*fbm(q*.5+7.);}
vec4 fx(vec2 uv){vec4 s=S(uv);if(u_amt<=0.)return s;
 vec2 p=uv*vec2(R.x/R.y,1.);float e=1.5/R.y,h=H(p);vec2 g=vec2(H(p+vec2(e,0))-h,H(p+vec2(0,e))-h)/e;
 vec3 n=normalize(vec3(-g*.05,1.));vec4 c=S(uv+n.xy*u_disp*u_amt/R);
 vec3 L=normalize(vec3(-.4,-.6,.7));float sp=pow(max(dot(reflect(-L,n),vec3(0,0,1)),0.),20.)*u_hi;
 float ed=min(min(uv.x,1.-uv.x)*R.x,min(uv.y,1.-uv.y)*R.y);float te=u_edge*exp(-ed/16.)*(.55+.45*sin((uv.x-uv.y)*R.y*.08+h*6.));
 vec4 w=vec4(min(unp(c)+(sp+.6*te)*u_amt,1.)*c.a,c.a);return mix(s,w,clamp(u_amt,0.,1.));}` },

    tear: { d: { progress: 0, angle: 0, rotation: 20, jaggedness: 20 },
      u: (o, px) => ({ u_p: Math.max(0, o.progress), u_a: o.angle * D2R, u_rot: Math.min(90, Math.max(0, o.rotation)) * D2R, u_j: Math.max(0, o.jaggedness) * px }),
      glsl: `uniform float u_p,u_a,u_rot,u_j;
float J,P;vec2 dd,nn;
float zig(float k){return (mod(k,2.)<1.?1.:-1.)*J*(.45+.55*hash(vec2(k,3.7)));}
float seam(float s){float k=floor(s/P);return mix(zig(k),zig(k+1.),fract(s/P));}
vec4 fx(vec2 uv){vec2 p=uv*R,c=R*.5;dd=vec2(sin(u_a),cos(u_a));nn=vec2(cos(u_a),-sin(u_a));
 float Ld=abs(R.x*dd.x)+abs(R.y*dd.y),Ln=abs(R.x*nn.x)+abs(R.y*nn.y);J=min(u_j,.45*Ln);P=max(2.*J,16.);
 float s=dot(p-c,dd)+Ld*.5,q=dot(p-c,nn),tip=min(u_p,1.)*Ld;
 if(u_p<=0.||s>=tip)return S(uv);
 float ph=u_rot*min(u_p,1.),sep=max(u_p-1.,0.)*Ln*.5;vec2 pv=vec2(tip,seam(tip));
 for(int k=0;k<2;k++){float sg=k==0?1.:-1.;vec2 v=vec2(s,q)-pv-vec2(0,sg*sep);float a=sg*ph,ca=cos(a),sa=sin(a);
  vec2 r=vec2(ca*v.x-sa*v.y,sa*v.x+ca*v.y)+pv;
  if(r.x<tip&&r.x>=0.&&sg*(r.y-seam(r.x))>0.)return S((c+(r.x-Ld*.5)*dd+r.y*nn)/R);}
 return vec4(0);}` },

    bevelAlpha: { d: { edgeThickness: 2, lightAngle: -60, lightColor: 'white', lightIntensity: 0.4 },
      u: (o, px) => ({ u_th: Math.min(200, Math.max(0, o.edgeThickness)) * px, u_ang: o.lightAngle * D2R, u_lc: rgba(o.lightColor), u_int: o.lightIntensity }),
      glsl: `uniform float u_th,u_ang,u_int;uniform vec4 u_lc;
vec4 fx(vec2 uv){vec4 c=S(uv);if(u_th<=0.||u_int<=0.||c.a<=0.)return c;vec2 g=vec2(0);
 for(int i=-3;i<=3;i++)for(int j=-3;j<=3;j++)g+=vec2(i,j)*S(uv+vec2(i,j)*u_th/3./R).a;
 float k=clamp(length(g)/30.,0.,1.),sh=dot(normalize(-g+1e-6),vec2(sin(u_ang),-cos(u_ang)))*k*u_int*1.5;
 vec3 col=unp(c);col=sh>0.?col+u_lc.rgb*u_lc.a*sh:col*(1.+sh);return vec4(clamp(col,0.,1.)*c.a,c.a);}` },

    cylinder: { d: { radius: 250, rotation: 0, rotationX: 0, rotationY: 0, rotationZ: 0, position: [0.5, 0.5], render: 'both', shading: 0.35 },
      u: (o, px) => ({ u_r: o.radius * px, u_tr: o.rotation / 360, u_ang: [o.rotationX * D2R, o.rotationY * D2R, o.rotationZ * D2R], u_pos: o.position, u_mode: MODE[o.render], u_sh: o.shading }),
      glsl: `uniform float u_r,u_tr,u_mode,u_sh;uniform vec3 u_ang;uniform vec2 u_pos;
vec4 fx(vec2 uv){mat3 M=rotXYZ(u_ang),Mi=transpose(M);vec3 ro=Mi*vec3((uv-u_pos)*R,0.),rd=Mi*vec3(0,0,-1);
 float A=rd.x*rd.x+rd.z*rd.z,B=2.*(ro.x*rd.x+ro.z*rd.z),C=ro.x*ro.x+ro.z*ro.z-u_r*u_r,D=B*B-4.*A*C;vec4 col=vec4(0);
 if(A<1e-6||D<0.)return col;float sq=sqrt(D);
 for(int k=0;k<2;k++){bool fr=k==1;if((fr&&u_mode==2.)||(!fr&&u_mode==1.))continue;
  vec3 p=ro+(fr?(-B-sq):(-B+sq))/(2.*A)*rd;if(abs(p.y)>R.y*.5)continue;
  vec4 s=S(vec2(fract(atan(p.x,p.z)/(2.*PI)+.5-u_tr),p.y/R.y+.5));s.rgb*=1.-u_sh*(1.-abs((M*vec3(p.x,0,p.z)).z/u_r));col=s+(1.-s.a)*col;}
 return col;}` },

    sphere: { d: { radius: 250, rotationX: 0, rotationY: 0, rotationZ: 0, position: [0.5, 0.5], render: 'both', shading: 0.35 },
      u: (o, px) => ({ u_r: o.radius * px, u_ang: [o.rotationX * D2R, o.rotationY * D2R, o.rotationZ * D2R], u_pos: o.position, u_mode: MODE[o.render], u_sh: o.shading }),
      glsl: `uniform float u_r,u_mode,u_sh;uniform vec3 u_ang;uniform vec2 u_pos;
vec4 fx(vec2 uv){mat3 M=rotXYZ(u_ang),Mi=transpose(M);vec3 ro=Mi*vec3((uv-u_pos)*R,0.),rd=Mi*vec3(0,0,-1);
 float B=dot(ro,rd),C=dot(ro,ro)-u_r*u_r,D=B*B-C;vec4 col=vec4(0);if(D<0.)return col;float sq=sqrt(D);
 for(int k=0;k<2;k++){bool fr=k==1;if((fr&&u_mode==2.)||(!fr&&u_mode==1.))continue;
  vec3 p=ro+(fr?(-B-sq):(-B+sq))*rd;
  vec4 s=S(vec2(atan(p.x,p.z)/(2.*PI)+.5,acos(clamp(-p.y/u_r,-1.,1.))/PI));s.rgb*=1.-u_sh*(1.-abs((M*p).z/u_r));col=s+(1.-s.a)*col;}
 return col;}` },

    pageTurn: { d: { foldPosition: [0.7, 0.7], foldDirection: 315, foldRadius: 60, lightDirection: -45, render: 'both', backPageOpacity: 0.25, paperColor: '#ffffff' },
      u: (o, px) => ({ u_fp: o.foldPosition, u_dir: o.foldDirection * D2R, u_rad: Math.max(1e-3, o.foldRadius * px), u_lt: o.lightDirection * D2R, u_mode: MODE[o.render], u_bo: o.backPageOpacity, u_paper: rgba(o.paperColor) }),
      glsl: `uniform vec2 u_fp;uniform float u_dir,u_rad,u_lt,u_mode,u_bo;uniform vec4 u_paper;
vec4 face(vec2 q,bool back,float sh){vec2 s=q/R;if(s.x<0.||s.y<0.||s.x>1.||s.y>1.)return vec4(0);vec4 c=S(s);
 if(back){vec3 s=unp(c);c=vec4(mix(s,mix(u_paper.rgb,s,u_bo),u_paper.a)*c.a,c.a);}
 c.rgb*=sh;return c;}
vec4 fx(vec2 uv){vec2 p=uv*R,n=vec2(-sin(u_dir),cos(u_dir));float r=u_rad,d=dot(p-u_fp*R,n),L=.5+.5*dot(vec2(cos(u_lt),sin(u_lt)),-n);vec4 col=vec4(0),c;
 if(d<0.&&u_mode!=2.)col=face(p,false,1.);
 if(d>=0.&&d<=r){float a=asin(d/r);
  if(u_mode!=2.){c=face(p+(r*a-d)*n,false,(1.-.45*sin(a))*(.85+.15*L));col=c+(1.-c.a)*col;}
  if(u_mode!=1.){c=face(p+(r*(PI-a)-d)*n,true,.78+.22*L*cos(a));col=c+(1.-c.a)*col;}}
 if(d<0.&&u_mode!=1.){c=face(p+(PI*r-2.*d)*n,true,.78+.22*L);col=c+(1.-c.a)*col;}
 return col;}` },

    magnify: { d: { shape: 'circle', center: [0.5, 0.5], magnification: 200, size: 100, feather: 0, opacity: 1, scaling: 'standard', blendingMode: 'normal' },
      u: (o, px) => ({ u_c: o.center, u_mag: Math.max(1, o.magnification) / 100, u_size: Math.max(0, o.size) * px, u_fe: Math.max(1, o.feather * px), u_op: o.opacity, u_sq: +(o.shape === 'square'), u_near: +(o.scaling === 'nearest'), u_none: +(o.blendingMode === 'none') }),
      glsl: `uniform vec2 u_c;uniform float u_mag,u_size,u_fe,u_op,u_sq,u_near,u_none;
vec4 fx(vec2 uv){vec2 p=uv*R,C=u_c*R,dv=p-C;float dist=u_sq>.5?max(abs(dv.x),abs(dv.y)):length(dv);
 float m=u_size<=0.?0.:clamp((u_size-dist)/u_fe,0.,1.);vec2 sp=C+dv/u_mag;if(u_near>.5)sp=floor(sp)+.5;
 vec4 g=S(sp/R);return u_none>.5?g*m*u_op:mix(S(uv),g,m*u_op);}` },

    thermalVision: { d: { amount: 1, palette: ['#000033', '#0000ff', '#00ffff', '#00ff00', '#ffff00', '#ff8800', '#ff0000', '#ffffff'] },
      u: (o) => ({ u_amt: o.amount, u_pal: pal(o.palette), u_n: o.palette.length }),
      glsl: `uniform float u_amt,u_n;uniform vec3 u_pal[8];
vec4 fx(vec2 uv){vec4 c=S(uv);vec3 s=unp(c);float t=clamp(lum(s),0.,1.)*(u_n-1.);int i=int(min(floor(t),u_n-2.));
 vec3 h=mix(u_pal[i],u_pal[i+1],t-float(i));return vec4(mix(s,h,u_amt)*c.a,c.a);}` },

    linearGradient: { d: { start: [0, 0.5], end: [1, 0.5], startColor: '#000000', endColor: '#ffffff' },
      u: (o) => ({ u_a: o.start, u_b: o.end, u_c0: rgba(o.startColor), u_c1: rgba(o.endColor) }),
      glsl: `uniform vec2 u_a,u_b;uniform vec4 u_c0,u_c1;
vec4 fx(vec2 uv){vec2 ab=(u_b-u_a)*R;float t=clamp(dot((uv-u_a)*R,ab)/max(dot(ab,ab),1e-6),0.,1.);vec4 g=mix(u_c0,u_c1,t);
 float a=S(uv).a*g.a;return vec4(g.rgb*a,a);}` },

    linearGradientTint: { d: { start: [0, 0.5], end: [1, 0.5], startColor: '#000000', endColor: '#ffffff', amount: 0.5 },
      u: (o) => ({ u_a: o.start, u_b: o.end, u_c0: rgba(o.startColor), u_c1: rgba(o.endColor), u_amt: o.amount }),
      glsl: `uniform vec2 u_a,u_b;uniform vec4 u_c0,u_c1;uniform float u_amt;
vec4 fx(vec2 uv){vec2 ab=(u_b-u_a)*R;float t=clamp(dot((uv-u_a)*R,ab)/max(dot(ab,ab),1e-6),0.,1.);vec3 g=mix(u_c0.rgb,u_c1.rgb,t);
 vec4 c=S(uv);vec3 s=unp(c);return vec4(mix(s,lum(s)*g,u_amt)*c.a,c.a);}` },

    halftoneLinearGradient: { d: { firstStopDotSize: 0, secondStopDotSize: 40, firstStopPosition: [0, 0.5], secondStopPosition: [1, 0.5], gridSize: 24, colorMode: 'solid', dotColor: 'black', maskToSourceAlpha: false },
      u: (o, px) => ({ u_d0: o.firstStopDotSize * px, u_d1: o.secondStopDotSize * px, u_a: o.firstStopPosition, u_b: o.secondStopPosition, u_g: Math.max(1e-3, o.gridSize * px), u_src_: +(o.colorMode === 'source'), u_dc: rgba(o.dotColor), u_mask: +!!o.maskToSourceAlpha }),
      glsl: `uniform float u_d0,u_d1,u_g,u_src_,u_mask;uniform vec2 u_a,u_b;uniform vec4 u_dc;
vec4 fx(vec2 uv){vec2 p=uv*R,ab=(u_b-u_a)*R;vec4 s=S(uv),dot_=vec4(0);
 for(int i=-1;i<=1;i++)for(int j=-1;j<=1;j++){vec2 cc=(floor(p/u_g)+vec2(i,j)+.5)*u_g;
  float t=clamp(dot(cc-u_a*R,ab)/max(dot(ab,ab),1e-6),0.,1.),r=mix(u_d0,u_d1,t)*.5,cov=clamp(r-length(p-cc)+.5,0.,1.)*step(.001,r);
  if(cov>0.){vec4 dc=u_src_>.5?S(cc/R):u_dc*vec4(vec3(u_dc.a),1.);if(u_src_<.5&&u_mask>.5)dc*=S(cc/R).a;dc*=cov;dot_=dc+(1.-dc.a)*dot_;}}
 return u_src_>.5?dot_:dot_+(1.-dot_.a)*s;}` },

    radialProgressivePixelate: { d: { center: [0.5, 0.5], width: 1, height: 1, rotation: 0, start: 0, startBlockSize: 1, endBlockSize: 40 },
      u: (o, px) => ({ u_c: o.center, u_wh: [o.width, o.height], u_rot: o.rotation * D2R, u_st: Math.min(0.999, o.start), u_b0: Math.max(1, o.startBlockSize) * px, u_b1: Math.max(1, o.endBlockSize) * px }),
      glsl: `uniform vec2 u_c,u_wh;uniform float u_rot,u_st,u_b0,u_b1;
vec4 fx(vec2 uv){vec2 d=(uv-u_c)*R;float cr=cos(u_rot),sr=sin(u_rot);d=vec2(cr*d.x+sr*d.y,-sr*d.x+cr*d.y);
 float e=length(d/(u_wh*R*.5)),b=floor(mix(u_b0,u_b1,clamp((e-u_st)/(1.-u_st),0.,1.))+.5);if(b<=1.)return S(uv);
 vec2 p=uv*R;return S((floor(p/b)+.5)*b/R);}` },

    uvTranslate: { d: { u: 0, v: 0 }, u: (o) => ({ u_o: [o.u, o.v] }), glsl: `uniform vec2 u_o;vec4 fx(vec2 uv){return S(uv-u_o);}` },

    starburst: { d: { rays: 12, colors: ['#ffcc00', '#ff6600'], rotation: 0, smoothness: 0, origin: [0.5, 0.5] },
      u: (o) => { if (!(o.rays >= 2 && o.rays <= 100)) throw new Error('starburst: rays 2 to 100'); return { u_n: o.rays, u_pal: pal(o.colors), u_k: o.colors.length, u_rot: o.rotation * D2R, u_sm: Math.min(1, Math.max(0, o.smoothness)), u_o: o.origin }; },
      glsl: `uniform float u_n,u_k,u_rot,u_sm;uniform vec3 u_pal[8];uniform vec2 u_o;
vec4 fx(vec2 uv){vec2 d=(uv-u_o)*R;float a=fract((atan(d.y,d.x)-u_rot)/(2.*PI))*u_n,i=floor(a),f=a-i;
 vec3 c0=u_pal[int(mod(i,u_k))],c1=u_pal[int(mod(i+1.,u_k))],cm=u_pal[int(mod(i-1.+u_n,u_k))];float w=u_sm*.5;
 vec3 c=w>0.?mix(mix(cm,c0,smoothstep(-w,w,f)),c1,smoothstep(1.-w,1.+w,f)):c0;float al=S(uv).a;return vec4(c*al,al);}` },

    filmBurn: { d: { progress: 0, center: [0.5, 0.5], seed: 0 },
      u: (o) => ({ u_p: Math.min(1, Math.max(0, o.progress)), u_c: o.center, u_seed: (o.seed >>> 0) % 9973 }),
      glsl: `uniform float u_p,u_seed;uniform vec2 u_c;
vec4 fx(vec2 uv){vec4 s=S(uv);if(u_p<=0.)return s;if(u_p>=1.)return vec4(0);vec2 k=vec2(R.x/R.y,1.),p=uv*k;
 float f=length((uv-u_c)*k)*.55+fbm(p*3.+u_seed*.731)*.6+fbm(p*9.+u_seed*.17)*.25-.3,e=f-(-.2+1.2*u_p);
 float a=smoothstep(0.,.008,e),glow=1.-smoothstep(0.,.045,e),ch=1.-smoothstep(.02,.11,e);
 vec3 col=unp(s)*(1.-.8*ch)+vec3(1.,.42,.06)*glow*1.3+vec3(1.,.85,.45)*(1.-smoothstep(0.,.014,e))*.8;return vec4(min(col,1.)*s.a*a,s.a*a);}` },

    lut: { d: { content: '' }, srcOnly: true, u: () => ({}),
      glsl: `uniform highp sampler3D u_lut;uniform float u_n;uniform vec3 u_dmin,u_dmax;
vec4 fx(vec2 uv){vec4 c=S(uv);if(c.a<=0.)return c;vec3 s=clamp((unp(c)-u_dmin)/(u_dmax-u_dmin),0.,1.);
 return vec4(clamp(texture(u_lut,(s*(u_n-1.)+.5)/u_n).rgb,0.,1.)*c.a,c.a);}` },
  };
  const GLNAMES = Object.keys(DEF);

  // a .cube file → { n, data (RGBA float, red fastest), dmin, dmax }
  const parseCube = (txt) => {
    if (typeof txt !== 'string' || !txt.trim()) throw new Error('lut: pass the .cube file text as `content`');
    let n = 0, dmin = [0, 0, 0], dmax = [1, 1, 1]; const v = [];
    for (const raw of txt.split(/\r?\n/)) {
      const l = raw.trim(); if (!l || l[0] === '#') continue;
      const w = l.split(/\s+/);
      if (w[0] === 'LUT_3D_SIZE') n = +w[1];
      else if (w[0] === 'DOMAIN_MIN') dmin = w.slice(1, 4).map(Number);
      else if (w[0] === 'DOMAIN_MAX') dmax = w.slice(1, 4).map(Number);
      else if (/^[-+.\d]/.test(w[0])) v.push(+w[0], +w[1], +w[2], 1);
    }
    if (!(n >= 2 && n <= 256) || v.length !== n * n * n * 4) throw new Error(`lut: a 3D .cube needs LUT_3D_SIZE and N³ rows (got size ${n}, ${v.length / 4} rows)`);
    return { n, data: new Float32Array(v), dmin, dmax };
  };

  // ── one shared WebGL2 canvas (a page gets ~16 contexts): render there, copy into each handle's 2D canvas ──
  let G = null;
  const ctx = () => {
    if (G) return G;
    const cv = document.createElement('canvas'), g = cv.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!g) throw new Error('KIT.fx GL effects need WebGL2, which this browser has not got (render with hyperframes, or launch Chromium with --enable-unsafe-swiftshader)');
    const buf = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, buf); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
    const tex = g.createTexture(); g.bindTexture(g.TEXTURE_2D, tex);
    for (const [k, v] of [[g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE], [g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE], [g.TEXTURE_MIN_FILTER, g.LINEAR], [g.TEXTURE_MAG_FILTER, g.LINEAR]]) g.texParameteri(g.TEXTURE_2D, k, v);
    return (G = { cv, g, buf, tex, progs: {}, luts: new Map() });
  };
  const compile = (g, name) => {
    const sh = (src, type) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(`fx-gl ${name}: ${g.getShaderInfoLog(s)}`); return s; };
    const p = g.createProgram(); g.attachShader(p, sh(VERT, g.VERTEX_SHADER)); g.attachShader(p, sh(source(name), g.FRAGMENT_SHADER)); g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(`fx-gl ${name}: ${g.getProgramInfoLog(p)}`);
    return p;
  };
  const source = (name) => { if (!DEF[name]) throw new Error(`fx-gl: unknown effect "${name}"`); return HEAD + DEF[name].glsl + MAIN; };
  // uniforms → GL: number = float, [2..4] = vecN, longer = vec3 array
  const setU = (g, p, u) => {
    for (const [k, v] of Object.entries(u)) {
      const arr = Array.isArray(v), loc = g.getUniformLocation(p, arr && v.length > 4 ? k + '[0]' : k);
      if (loc == null) continue;
      if (!arr) g.uniform1f(loc, +v); else if (v.length > 4) g.uniform3fv(loc, v); else g['uniform' + v.length + 'fv'](loc, v);
    }
  };
  const lutTex = (g, content) => {
    if (G.luts.has(content)) return G.luts.get(content);
    const c = parseCube(content), t = g.createTexture(); g.bindTexture(g.TEXTURE_3D, t);
    for (const [k, v] of [[g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE], [g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE], [g.TEXTURE_WRAP_R, g.CLAMP_TO_EDGE], [g.TEXTURE_MIN_FILTER, g.LINEAR], [g.TEXTURE_MAG_FILTER, g.LINEAR]]) g.texParameteri(g.TEXTURE_3D, k, v);
    g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);   // must be off for an ArrayBufferView upload
    g.texImage3D(g.TEXTURE_3D, 0, g.RGBA16F, c.n, c.n, c.n, 0, g.RGBA, g.FLOAT, c.data);
    const r = { t, n: c.n, dmin: c.dmin, dmax: c.dmax }; G.luts.set(content, r); return r;
  };
  const draw = (name, img, o, w, h, out) => {
    const { g, cv, buf, tex, progs } = ctx(), p = progs[name] || (progs[name] = compile(g, name));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    g.viewport(0, 0, w, h); g.useProgram(p);
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, tex);
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false); g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL, g.NONE);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, img);
    g.uniform1i(g.getUniformLocation(p, 'u_src'), 0);
    if (name === 'lut') { const l = lutTex(g, o.content); g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_3D, l.t); g.uniform1i(g.getUniformLocation(p, 'u_lut'), 1);
      setU(g, p, { u_n: l.n, u_dmin: l.dmin, u_dmax: l.dmax }); g.activeTexture(g.TEXTURE0); }
    setU(g, p, { u_box: [0, 0, w, h], u_frame: [w, h], ...DEF[name].u(o, 1) });
    g.bindBuffer(g.ARRAY_BUFFER, buf); const a = g.getAttribLocation(p, 'a'); g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
    g.disable(g.BLEND); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT); g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
    out.clearRect(0, 0, w, h); out.drawImage(cv, 0, 0);
  };

  // ── canvas 2D effects (source only) ──
  const hash = (...a) => { let h = 0x811c9dc5; for (const c of a.join(':')) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193) >>> 0; return h; };
  const shatterDraw = (img, o, w, h, out) => {
    const T = Math.max(0, o.time);
    out.clearRect(0, 0, w, h);
    if (T <= 0) { out.drawImage(img, 0, 0, w, h); return; }
    const reps = Math.min(100, Math.max(1, o.repetitions)), cell = w / reps, rnd = X.rng(hash('shatter', o.seed, o.pattern, reps)), a = o.direction * D2R;
    const O = [o.origin[0] * w, o.origin[1] * h], toPx = ([x, y]) => [O[0] + x * Math.cos(a) - y * Math.sin(a), O[1] + x * Math.sin(a) + y * Math.cos(a)];
    const span = Math.ceil(Math.hypot(w, h) / cell) + 2, polys = [];
    const quad = (x, y, cw, ch) => [[x, y], [x + cw, y], [x + cw, y + ch], [x, y + ch]];
    if (o.pattern === 'hexagons') {
      const r = cell / Math.sqrt(3), dx = cell, dy = 1.5 * r;
      for (let j = -span; j <= span; j++) for (let i = -span; i <= span; i++) {
        const cxh = i * dx + (j & 1 ? dx / 2 : 0), cyh = j * dy;
        polys.push(Array.from({ length: 6 }, (_, k) => [cxh + r * Math.cos(Math.PI / 6 + k * Math.PI / 3), cyh + r * Math.sin(Math.PI / 6 + k * Math.PI / 3)]));
      }
    } else {
      const jit = o.pattern === 'glass' ? 0.38 : 0, P = {};
      const pt = (i, j) => P[i + ',' + j] || (P[i + ',' + j] = [i * cell + (jit ? (X.rng(hash(o.seed, i, j))() - 0.5) * 2 * jit * cell : 0), j * cell + (jit ? (X.rng(hash(o.seed, j, i, 1))() - 0.5) * 2 * jit * cell : 0)]);
      for (let j = -span; j <= span; j++) for (let i = -span; i <= span; i++) {
        if (o.pattern === 'bricks') { if (i & 1) continue; const x = i * cell + (j & 1 ? cell : 0); polys.push(quad(x, j * cell * 0.75, 2 * cell, 0.75 * cell)); continue; }
        if (o.pattern === 'squares') { polys.push(quad(i * cell, j * cell, cell, cell)); continue; }
        const q = [pt(i, j), pt(i + 1, j), pt(i + 1, j + 1), pt(i, j + 1)];   // triangles / glass: a seeded diagonal splits each cell
        if (X.rng(hash(o.seed, 'd', i, j))() < 0.5) polys.push([q[0], q[1], q[2]], [q[0], q[2], q[3]]); else polys.push([q[0], q[1], q[3]], [q[1], q[2], q[3]]);
      }
    }
    const F = [o.center[0] * w, o.center[1] * h, o.depth * w], Rad = o.radius * w, k = Math.min(1, Math.max(0, o.viscosity)) * 4, g = o.gravity * 0.1 * w;
    const frags = [], still = new Path2D(), path = (pp) => { const p2 = new Path2D(); pp.forEach(([x, y], i) => (i ? p2.lineTo(x, y) : p2.moveTo(x, y))); p2.closePath(); return p2; };
    for (const poly of polys) {
      const pp = poly.map(toPx), c = pp.reduce((s, q) => [s[0] + q[0] / pp.length, s[1] + q[1] / pp.length], [0, 0]);
      if (pp.every(([x, y]) => x < -cell || y < -cell || x > w + cell || y > h + cell)) continue;
      const r = X.rng(hash(o.seed, 'f', Math.round(c[0] * 8), Math.round(c[1] * 8))), v = [c[0] - F[0], c[1] - F[1], -F[2]], dist = Math.hypot(...v);
      const inf = Rad > 0 ? Math.max(0, 1 - dist / Rad) : 0;
      if (inf <= 0 || !o.strength) { pp.forEach(([x, y], i) => (i ? still.lineTo(x, y) : still.moveTo(x, y))); still.closePath(); continue; }
      const m = Math.max(0.2, 1 + o.massVariance * (r() * 2 - 1)), sp = o.strength * inf / m * 0.1 * w, rn = o.randomness;
      const dir = v.map((q, i) => q / (dist || 1) + rn * (r() * 2 - 1) + (i === 2 && !dist ? 1 : 0)), dl = Math.hypot(...dir) || 1;
      const s = k > 0 ? (1 - Math.exp(-k * T)) / k : T, tr = dir.map((q) => q / dl * sp * s); tr[1] += 0.5 * g * T * T;
      const ax = [r() - 0.5, r() - 0.5, r() - 0.5], al = Math.hypot(...ax) || 1, th = o.rotationSpeed * 2 * Math.PI * T * (0.5 + r()) * inf * (r() < 0.5 ? -1 : 1);
      const [ux, uy, uz] = ax.map((q) => q / al), C = Math.cos(th), Sn = Math.sin(th), Cc = 1 - C;   // Rodrigues
      const M = [[C + ux * ux * Cc, ux * uy * Cc - uz * Sn, ux * uz * Cc + uy * Sn], [uy * ux * Cc + uz * Sn, C + uy * uy * Cc, uy * uz * Cc - ux * Sn], [uz * ux * Cc - uy * Sn, uz * uy * Cc + ux * Sn, C + uz * uz * Cc]];
      frags.push({ pp, c, tr, M, z: tr[2] });
    }
    out.save(); out.clip(still); out.drawImage(img, 0, 0, w, h); out.restore();
    const ex = Math.min(1, Math.max(0, o.extrusionDepth)) * cell;
    for (const f of frags.sort((p, q) => p.z - q.z)) {
      const [[a, c2], [b, d]] = [[f.M[0][0], f.M[0][1]], [f.M[1][0], f.M[1][1]]], e = f.c[0] + f.tr[0] - a * f.c[0] - c2 * f.c[1], ff = f.c[1] + f.tr[1] - b * f.c[0] - d * f.c[1];
      const p2 = path(f.pp), shade = 0.55 * (1 - Math.abs(f.M[2][2]));
      for (const [ox, oy, dark] of ex > 0 ? [[f.M[0][2] * ex, f.M[1][2] * ex, 0.6], [0, 0, shade]] : [[0, 0, shade]]) {
        out.save(); out.setTransform(a, b, c2, d, e + ox, ff + oy); out.clip(p2); out.drawImage(img, 0, 0, w, h);
        if (dark > 0) { out.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`; out.fill(p2); }
        out.restore();
      }
    }
  };
  const lightningDraw = (img, o, w, h, out) => {
    out.clearRect(0, 0, w, h);
    if (o.compositeOnOriginal) out.drawImage(img, 0, 0, w, h);
    const r = X.rng(hash('bolt', o.seed >>> 0, Math.floor(o.conductivityState))), lv = Math.min(12, Math.max(1, Math.round(o.complexity)));
    const sub = (pts, n, amp) => { for (let l = 0; l < n; l++) { const q = [pts[0]];
      for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), off = (r() - 0.5) * L * amp;
        q.push([(a[0] + b[0]) / 2 - (b[1] - a[1]) / (L || 1) * off, (a[1] + b[1]) / 2 + (b[0] - a[0]) / (L || 1) * off], b); }
      pts = q; } return pts; };
    const amp = 0.45 * Math.min(10, Math.max(0, o.turbulence)), bolts = [];
    const grow = (a, b, n, inten, gen) => {
      const pts = sub([a, b], n, amp); bolts.push({ pts, inten });
      if (gen > 2 || n < 2) return;
      for (let i = 1; i < pts.length - 1; i++) if (r() < o.forking / Math.max(1, pts.length / 8)) {
        const fi = inten * (1 - o.decay) * 2 * o.forkStrength;
        if (fi < o.terminationThreshold) continue;
        const [p0, p1] = [pts[i - 1], pts[i]], ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + (r() < 0.5 ? -1 : 1) * (0.3 + 0.5 * r());
        const rest = Math.hypot(b[0] - p1[0], b[1] - p1[1]) * (0.25 + 0.35 * r());
        grow(p1, [p1[0] + Math.cos(ang) * rest, p1[1] + Math.sin(ang) * rest], n - 2, fi, gen + 1);
      }
    };
    grow([o.origin[0] * w, o.origin[1] * h], [o.direction[0] * w, o.direction[1] * h], lv, 1, 0);
    const stroke = (g, col, op, lw) => { const [cr, cg, cb, ca] = rgba(col);
      for (const b of bolts) { g.strokeStyle = `rgba(${cr * 255 | 0},${cg * 255 | 0},${cb * 255 | 0},${(ca * op * b.inten).toFixed(4)})`; g.lineWidth = lw; g.lineJoin = g.lineCap = 'round';
        g.beginPath(); b.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); } };
    out.save(); out.globalCompositeOperation = 'lighter';
    if (o.glowRadius > 0.5 && o.glowOpacity > 0) { out.filter = `blur(${(o.glowRadius / 2.5).toFixed(2)}px)`; stroke(out, o.glowColor, o.glowOpacity, Math.max(2, o.glowRadius * 0.35)); out.filter = 'none'; }
    if (o.coreOpacity > 0) stroke(out, o.coreColor, o.coreOpacity, Math.max(0.6, 2 * o.coreRadius));
    out.restore();
  };
  const C2D = {
    shatter: { d: { time: 0.5, pattern: 'bricks', repetitions: 10, direction: 0, origin: [0.5, 0.5], center: [0.5, 0.5], radius: 0.4, depth: 0.1, strength: 5, rotationSpeed: 0.2, randomness: 0.1, viscosity: 0.1, massVariance: 0.3, gravity: 3, seed: 0, extrusionDepth: 0.05 }, draw: shatterDraw },
    lightning: { d: { origin: [0.5, 0], direction: [0.5, 1], conductivityState: 10, coreRadius: 3, coreOpacity: 0.75, coreColor: '#ffffff', glowRadius: 50, glowOpacity: 0.5, glowColor: '#4059ff', turbulence: 1, forking: 0.25, decay: 0.3, complexity: 6, terminationThreshold: 0.05, forkStrength: 0.5, seed: 0, compositeOnOriginal: true }, draw: lightningDraw },
  };

  // ── handles ──
  const isSrc = (s) => s && (s.el instanceof HTMLCanvasElement || s instanceof HTMLCanvasElement || s instanceof HTMLImageElement || s instanceof HTMLVideoElement ||
    (typeof ImageBitmap !== 'undefined' && s instanceof ImageBitmap) || (typeof OffscreenCanvas !== 'undefined' && s instanceof OffscreenCanvas));
  const dom = [];   // DOM-element effects for the renderer's pass: { el, name, at, o }
  const make = (name, spec) => (target, opts = {}) => {
    if (isSrc(target)) {
      const img = target.el || target, { w = img.width || K.W_, h = img.height || K.H_, parent = K.stage, ...base } = opts;
      const el = document.createElement('canvas'); el.width = w; el.height = h;
      if (parent) { parent.appendChild(el); K.css(el, { position: 'absolute', left: '0px', top: '0px', width: w + 'px', height: h + 'px' }); }
      const out = el.getContext('2d');
      const h2 = { el, set(o = {}) {
        const all = { ...spec.d, ...base, ...o };
        if (all.disabled) { out.clearRect(0, 0, w, h); out.drawImage(img, 0, 0, w, h); return h2; }
        if (spec.draw) spec.draw(img, all, w, h, out); else draw(name, img, all, w, h, out);
        return h2;
      } };
      return h2;
    }
    if (!(target instanceof Element)) throw new Error(`KIT.fx.${name}: give a canvas / <img> / <video> / fx handle, or a DOM element`);
    if (spec.draw || spec.srcOnly) throw new Error(`KIT.fx.${name}: works on a canvas, <img> or <video> source, not a DOM element`);
    const { at = [0, Infinity], ...o } = opts;
    if (!(at[1] > at[0])) throw new Error(`KIT.fx.${name}: at = [t0, t1] in seconds, t1 > t0`);
    dom.push({ el: target, name, at, o });
    return { at };
  };
  for (const n of GLNAMES) X[n] = make(n, DEF[n]);
  for (const n of Object.keys(C2D)) X[n] = make(n, C2D[n]);

  // ── the renderer pass side (tools/renderers/shader_pass.mjs) ──
  X.gl = { names: GLNAMES, all: GLNAMES.concat(Object.keys(C2D)), source, vert: VERT, parseCube,
    get count() { return dom.length; },   // DOM-element effects registered; 0 = the pass has nothing to do frame by frame
    // effects on DOM elements active at t: [{ i, name, box: [x, y, w, h] frame px, u: uniforms }]; call after render(t)
    frame(t, scale = 1) {
      return dom.map((d, i) => ({ d, i })).filter(({ d }) => t >= d.at[0] && t < d.at[1]).map(({ d, i }) => {
        const o = { ...DEF[d.name].d }; for (const [k, v] of Object.entries(d.o)) o[k] = typeof v === 'function' ? v(t) : v;
        if (o.disabled) return null;
        const r = d.el.getBoundingClientRect();
        return { i, name: d.name, box: [r.left * scale, r.top * scale, r.width * scale, r.height * scale], u: DEF[d.name].u(o, scale) };
      }).filter(Boolean);
    },
  };
  // isolation for the pass: window.__kitFx = { base: true } hides every active effect element; { layer: i } shows only element i
  const css = document.createElement('style');
  css.textContent = 'html.kfx-layer,html.kfx-layer body{background:transparent!important}html.kfx-layer *:not([data-kfx="on"],[data-kfx="on"] *){visibility:hidden!important}' +
    '[data-kfx="on"]{visibility:visible}html.kfx-base [data-kfx="off"],html.kfx-base [data-kfx="off"] *{visibility:hidden!important}';
  document.head.appendChild(css);
  const post = () => {
    const iso = window.__kitFx, H = document.documentElement;
    H.classList.remove('kfx-layer', 'kfx-base'); for (const d of dom) d.el.removeAttribute('data-kfx');
    if (!iso) return;
    if (iso.base) { H.classList.add('kfx-base'); for (const i of iso.ids) dom[i].el.setAttribute('data-kfx', 'off'); }
    else { H.classList.add('kfx-layer'); dom[iso.layer].el.setAttribute('data-kfx', 'on'); }
  };
  const s = K.start;
  K.start = (o) => s({ ...o, render: (t) => { o.render(t); if (dom.length) post(); } });
})();

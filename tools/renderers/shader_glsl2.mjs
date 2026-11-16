// The 12 Remotion HTML-in-canvas shader presentations (row remotion:2.2.6) as KIT.shader transitions, for the same pass as shader_glsl.mjs
// (tools/renderers/shader_pass.mjs): blur-slide, book-flip, cross-zoom, crosswarp, dissolve, dreamy-zoom, film-burn, linear-blur, ripple, swap,
// zoom-blur, zoom-in-out. Clean-room from Remotion's docs (what each one does and its options); no Remotion code.
// crosswarp, cross-zoom, dreamy-zoom, linear-blur, ripple and swap follow the formulas of the gl-transitions collection of the same names
// (github.com/gl-transitions/gl-transitions, MIT; authors Eke Péter, rectalogic, Zeh Fernando, gre), rewritten for this header; the other six
// are written here. Extra options arrive as uniforms u_<name> (KIT.shader in tools/shaders.js fills the defaults).
import { H, NQ } from "./shader_glsl.mjs";

// y-up helpers as in gl-transitions: p = (0,0) bottom-left; A/B sample the outgoing / incoming scene, black outside
const U = H + NQ +
  "float ratio(){return u_resolution.x/u_resolution.y;}" +
  "bool inb(vec2 p){return p.x>=0.&&p.y>=0.&&p.x<=1.&&p.y<=1.;}" +
  "vec4 A(vec2 p){return inb(p)?texture2D(u_from,vec2(p.x,1.-p.y)):vec4(0,0,0,1);}" +
  "vec4 B(vec2 p){return inb(p)?texture2D(u_to,vec2(p.x,1.-p.y)):vec4(0,0,0,1);}" +
  "const float PI=3.141592653589793;\n";
const MAIN = "\nvoid main(){gl_FragColor=vec4(tr(vec2(v_uv.x,1.-v_uv.y)).rgb,1.);}";
const frag = (body) => ({ frag: U + body + MAIN });

export const SHADERS2 = {
  // both scenes whip along u_dir (y-up), blurred along the motion by up to u_blur of the frame at the midpoint
  "blur-slide": frag(
    "uniform vec2 u_dir;uniform float u_blur;" +
    "vec4 tr(vec2 p){float s=u_progress,L=u_blur*2.*min(s,1.-s);vec4 c=vec4(0);" +
    "for(int i=0;i<24;i++){vec2 q=p+u_dir*(float(i)/23.-.5)*L,a=q-u_dir*s,b=q-u_dir*(s-1.);c+=inb(a)?A(a):B(b);}return c/24.;}"),

  // the outgoing scene's half turns over a spine like a page; its back is the incoming scene's other half (u_dirk 0 right, 1 left, 2 bottom, 3 top)
  "book-flip": frag(
    "uniform float u_dirk;" +
    "vec2 tob(vec2 p){return u_dirk<.5?p:u_dirk<1.5?vec2(1.-p.x,p.y):u_dirk<2.5?vec2(1.-p.y,p.x):vec2(p.y,p.x);}" +
    "vec2 frb(vec2 q){return u_dirk<.5?q:u_dirk<1.5?vec2(1.-q.x,q.y):u_dirk<2.5?vec2(q.y,1.-q.x):vec2(q.y,q.x);}" +
    "vec4 tr(vec2 p){vec2 q=tob(p);float th=PI*u_progress,c=cos(th),sn=sin(th);" +
    "if(c>0.&&q.x>=.5&&q.x<=.5+.5*c){float u=(q.x-.5)/(.5*c),sy=.5+(q.y-.5)/(1.+.2*sn*u);" +
    " if(sy>=0.&&sy<=1.)return vec4(A(frb(vec2(.5+.5*u,sy))).rgb*(.55+.45*c),1.);}" +
    "if(c<0.&&q.x<=.5&&q.x>=.5+.5*c){float u=(.5-q.x)/(-.5*c),sy=.5+(q.y-.5)/(1.+.2*sn*u);" +
    " if(sy>=0.&&sy<=1.)return vec4(B(frb(vec2(.5-.5*u,sy))).rgb*(.55-.45*c),1.);}" +
    "float sh=1.-.35*sn*exp(-abs(q.x-.5-.5*c)*12.);" +
    "return vec4((q.x<.5?A(p):B(p)).rgb*sh,1.);}"),

  // gl-transitions CrossZoom (rectalogic, MIT): a weighted zoom smear toward a centre that travels across, through a crossfade
  "cross-zoom": frag(
    "uniform float u_strength;" +
    "float rnd(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}" +
    "float expio(float t){if(t<=0.)return 0.;if(t>=1.)return 1.;t*=2.;return t<1.?.5*pow(2.,10.*(t-1.)):.5*(2.-pow(2.,-10.*(t-1.)));}" +
    "vec4 tr(vec2 p){vec2 ce=vec2(.25+.5*u_progress,.5);float dis=expio(u_progress),st=-u_strength*.5*(cos(PI*u_progress/.5)-1.);" +
    "vec3 c=vec3(0);float tot=0.,off=rnd(p);vec2 tc=ce-p;" +
    "for(float t=0.;t<=40.;t++){float pc=(t+off)/40.,w=4.*(pc-pc*pc);vec2 q=p+tc*pc*st;c+=mix(A(q).rgb,B(q).rgb,dis)*w;tot+=w;}" +
    "return vec4(c/tot,1.);}"),

  // gl-transitions crosswarp (Eke Péter, MIT)
  crosswarp: frag(
    "vec4 tr(vec2 p){float x=smoothstep(0.,1.,u_progress*2.+p.x-1.);return mix(A((p-.5)*(1.-x)+.5),B((p-.5)*x+.5),x);}"),

  // a luminance-ordered burn through the outgoing scene with a glowing edge (spread → hot colour)
  dissolve: frag(
    "uniform float u_lineWidth,u_pow,u_intensity;uniform vec3 u_spreadColor,u_hotColor;" +
    "vec4 tr(vec2 p){vec4 a=A(p);float w=max(u_lineWidth,1e-4),d=dot(a.rgb,vec3(.299,.587,.114))-(u_progress*(1.+2.*w)-w);" +
    "float e=1.-clamp(abs(d)/w,0.,1.);vec3 burn=mix(u_spreadColor,u_hotColor,e*e)*pow(e,u_pow*.3)*u_intensity;" +
    "return vec4(min((d<0.?B(p):a).rgb+burn,1.),1.);}"),

  // gl-transitions DreamyZoom (Zeh Fernando, MIT): zoom and turn into a white flash, out of it on the other scene
  "dreamy-zoom": frag(
    "uniform float u_rotation,u_scale;" +
    "vec4 tr(vec2 p){bool f=u_progress<.5;float ph=f?u_progress*2.:(u_progress-.5)*2.,r=u_rotation*PI/180.;" +
    "float ao=f?mix(0.,r,ph):mix(-r,0.,ph),sc=f?mix(1.,u_scale,ph):mix(u_scale,1.,ph);" +
    "vec2 q=(p-.5)/sc*vec2(ratio(),1.);float an=atan(q.y,q.x)+ao,di=length(q);q=vec2(cos(an)*di/ratio()+.5,sin(an)*di+.5);" +
    "return min((f?A(q):B(q))+(f?ph:1.-ph),1.);}"),

  // a radial-blur crossfade under a drifting warm burn glow (seeded)
  "film-burn": frag(
    "uniform float u_seed;" +
    "vec4 tr(vec2 p){float s=sin(PI*u_progress);vec4 c=vec4(0);" +
    "for(int i=0;i<16;i++){vec2 q=.5+(p-.5)*(1.-.25*s*float(i)/15.);c+=mix(A(q),B(q),smoothstep(.3,.7,u_progress));}c/=16.;" +
    "float n=fbm(p*vec2(ratio(),1.)*2.5+u_seed*3.7+u_progress*1.3),g=smoothstep(.45,.9,n+.6*s-.3)*s;" +
    "return vec4(min(c.rgb+mix(vec3(1.,.35,.05),vec3(1.,.9,.6),smoothstep(.6,1.,n))*g*1.6,1.),1.);}"),

  // gl-transitions LinearBlur (gre, MIT); 10 × 10 samples (Remotion: 20 × 20) to keep SwiftShader frames near a second
  "linear-blur": frag(
    "uniform float u_intensity;" +
    "vec4 tr(vec2 p){vec4 a=vec4(0),b=vec4(0);float d=u_intensity*(.5-distance(.5,u_progress));" +
    "for(int i=0;i<10;i++)for(int j=0;j<10;j++){vec2 v=vec2(float(i),float(j))/10.-.5;a+=A(p+d*v);b+=B(p+d*v);}" +
    "return mix(a,b,u_progress)/100.;}"),

  // gl-transitions ripple (gre, MIT)
  ripple: frag(
    "uniform float u_amplitude,u_speed;" +
    "vec4 tr(vec2 p){vec2 d=p-.5;vec2 o=d*(sin(u_progress*length(d)*u_amplitude-u_progress*u_speed)+.5)/30.;" +
    "return mix(A(p+o),B(p),smoothstep(.2,1.,u_progress));}"),

  // gl-transitions swap (gre, MIT): the scenes trade places in depth over a reflective floor
  swap: frag(
    "uniform float u_reflection,u_perspective,u_depth;" +
    "bool ib(vec2 p){return p.x>0.&&p.y>0.&&p.x<1.&&p.y<1.;}" +
    "vec2 proj(vec2 p){return p*vec2(1.,-1.2)+vec2(0.,-.02);}" +
    "vec4 bg(vec2 pf,vec2 pt){vec4 c=vec4(0,0,0,1);pf=proj(pf);if(ib(pf))c+=A(pf)*u_reflection*(1.-pf.y);pt=proj(pt);if(ib(pt))c+=B(pt)*u_reflection*(1.-pt.y);return c;}" +
    "vec4 tr(vec2 p){float s=u_progress,sz=mix(1.,u_depth,s),pe=u_perspective*s;" +
    "vec2 pf=(p+vec2(0.,-.5))*vec2(sz/(1.-u_perspective*s),sz/(1.-sz*pe*p.x))+vec2(0.,.5);" +
    "sz=mix(1.,u_depth,1.-s);pe=u_perspective*(1.-s);" +
    "vec2 pt=(p+vec2(-1.,-.5))*vec2(sz/(1.-u_perspective*(1.-s)),sz/(1.-sz*pe*(.5-p.x)))+vec2(1.,.5);" +
    "if(s<.5){if(ib(pf))return A(pf);if(ib(pt))return B(pt);}if(ib(pt))return B(pt);if(ib(pf))return A(pf);return bg(pf,pt);}"),

  // the outgoing scene shrinks and turns to -rotation, the incoming one settles from close up at +rotation, under a radial zoom blur
  "zoom-blur": frag(
    "uniform float u_rotation;" +
    "vec2 xf(vec2 p,float sc,float a){vec2 d=(p-.5)*vec2(ratio(),1.);d=mat2(cos(a),sin(a),-sin(a),cos(a))*d/sc;return d/vec2(ratio(),1.)+.5;}" +
    "vec4 tr(vec2 p){float s=u_progress,bl=.3*sin(PI*s);vec4 c=vec4(0);" +
    "for(int i=0;i<16;i++){vec2 q=.5+(p-.5)*(1.-bl*float(i)/15.);c+=mix(A(xf(q,1.-.4*s,-u_rotation*s)),B(xf(q,1.6-.6*s,u_rotation*(1.-s))),smoothstep(.3,.7,s));}" +
    "return c/16.;}"),

  // the outgoing scene rushes toward the viewer, crossfading into the incoming one settling back from magnified
  "zoom-in-out": frag(
    "vec4 tr(vec2 p){float s=u_progress;return mix(A(.5+(p-.5)/(1.+1.5*s)),B(.5+(p-.5)/(1.+1.5*(1.-s))),smoothstep(.35,.65,s));}"),
};

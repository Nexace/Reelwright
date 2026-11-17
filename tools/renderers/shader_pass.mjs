// Shader transitions (tools/shaders.js, KIT.shader) for both renderers: after a renderer has written its frames, every
// frame inside a transition window is replaced by the WebGL composite of its two scenes. The film page is opened in
// plain Chromium, each side captured alone (window.__kitIsolate) and mixed by the ported HyperFrames GLSL
// (shader_glsl.mjs, shader_glsl2.mjs) on SwiftShader, so frames match across machines. The same pass applies KIT.fx GL effects on DOM elements
// (tools/fx-gl.js): outside transition windows, each frame with an active one is captured without those elements, then each element alone on
// transparency, and the effect's shader composites it back on top. Films that load neither shaders.js nor fx-gl.js are never opened.
// docs/playbook/shader-transitions.md, docs/playbook/effects.md
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import { SHADERS as HF, vertSrc, accentOf } from "./shader_glsl.mjs";
import { SHADERS2 } from "./shader_glsl2.mjs";
const SHADERS = { ...HF, ...SHADERS2 };

// what the producer uses for PRODUCER_BROWSER_GPU_MODE=software (engine/dist/services/browserManager.js)
// --disable-lcd-text: same as the vendored engine patch; will-change layers (KIT.words) otherwise pick LCD or greyscale AA per run
// --force-color-profile=srgb: the same colour the renderer's pages capture, so a composited frame matches its neighbours
export const GL_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-lcd-text", "--font-render-hinting=none", "--force-color-profile=srgb"];

// page: the film's index.html; frames: [{ t, file }] (.jpg written as jpeg 94 like the renderers' stills/, else png like their frames/)
export async function shaderPass(page, width, height, frames, scale = 1) {   // scale: --resolution (frames are scale x the layout size)
  if (!/shaders\.js|fx-gl\.js/.test(fs.readFileSync(page, "utf8"))) return;
  // shortcut: hf captures come from plain Chromium, not the producer, so glyph edges can differ by ~1px at the cut
  // into and out of a window; capture through the producer if that ever shows
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files", ...GL_ARGS]);
  try {
    const film = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    film.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
    await film.goto(pathToFileURL(page).href);
    if (!(await film.evaluate(async () => await window.READY))) throw new Error("shader transitions: the film page didn't load");
    const T = await film.evaluate(() => (window.KIT_MEDIA && window.KIT_MEDIA.transitions) || []);
    const all = frames.map((f) => ({ ...f, i: T.findIndex((x) => f.t >= x.t && f.t < x.t + x.dur) })), todo = all.filter((f) => f.i >= 0);
    const fxOn = await film.evaluate(() => !!(window.KIT && window.KIT.fx && window.KIT.fx.gl && window.KIT.fx.gl.count));
    const fxTodo = fxOn ? all.filter((f) => f.i < 0) : [];
    if (!todo.length && !fxTodo.length) return;
    const [fw, fh] = [Math.round(width * scale), Math.round(height * scale)];   // the frame's own pixels
    const gl = await browser.newPage({ viewport: { width: fw, height: fh }, deviceScaleFactor: 1 });
    await gl.setContent(`<body style="margin:0"><canvas id="t" width="${fw}" height="${fh}" style="display:block"></canvas>` +
      `<canvas id="f" width="${fw}" height="${fh}" style="display:none"></canvas></body>`);
    const err = await gl.evaluate(setup, { vert: vertSrc, frags: Object.fromEntries(T.map((x) => [x.shader, SHADERS[x.shader]?.frag])) });
    if (err) throw new Error("shader transitions: " + err);
    const out = (f) => gl.screenshot(/\.jpe?g$/i.test(f.file) ? { type: "jpeg", quality: 94 } : { type: "png" });
    const capture = async (i, side, t) => {
      await film.evaluate(([i, side, t]) => { window.__kitIsolate = { i, side }; return window.render(t); }, [i, side, t]);
      return (await film.screenshot({ type: "png" })).toString("base64");
    };
    // shortcut: one page, frame by frame (3 screenshots each); spread over pages if long transitions get slow
    for (const f of todo) {
      const x = T[f.i], from = await capture(f.i, "from", f.t), to = await capture(f.i, "to", f.t);
      const p = await film.evaluate(([i, t]) => window.KIT.shaderProgress(i, t), [f.i, f.t]);
      await gl.evaluate(draw, { shader: x.shader, from, to, p, accent: accentOf(x.accent), u: x.u || {}, width: fw, height: fh });
      fs.writeFileSync(f.file, await out(f));
    }
    if (todo.length) console.log(`shader transitions: ${todo.length} frame${todo.length === 1 ? "" : "s"} in ${T.length} transition${T.length === 1 ? "" : "s"}`);
    // KIT.fx effects on DOM elements: base (those elements hidden), then each element alone, composited by its shader
    let nfx = 0;
    const shot = async (iso, t, alpha) => {
      await film.evaluate(([iso, t]) => { window.__kitIsolate = null; window.__kitFx = iso; return window.render(t); }, [iso, t]);
      return (await film.screenshot({ type: "png", omitBackground: alpha })).toString("base64");
    };
    const glsl = fxTodo.length ? await film.evaluate(() => ({ vert: KIT.fx.gl.vert, src: Object.fromEntries(KIT.fx.gl.names.map((n) => [n, KIT.fx.gl.source(n)])) })) : null;
    for (const f of fxTodo) {
      const act = await film.evaluate(async ([t, s]) => { window.__kitIsolate = null; window.__kitFx = null; await window.render(t); return KIT.fx.gl.frame(t, s); }, [f.t, scale]);
      if (!act.length) continue;
      const base = await shot({ base: true, ids: act.map((a) => a.i) }, f.t, false), layers = [];
      for (const a of act) layers.push({ ...a, png: await shot({ layer: a.i }, f.t, true) });
      const e = await gl.evaluate(drawFx, { glsl, base, layers, width: fw, height: fh });
      if (e) throw new Error("KIT.fx GL effects: " + e);
      fs.writeFileSync(f.file, await out(f)); nfx++;
    }
    if (fxTodo.length) await film.evaluate(() => { window.__kitFx = null; });
    if (nfx) console.log(`fx-gl: ${nfx} frame${nfx === 1 ? "" : "s"} with effects on DOM elements`);
  } finally { await browser.close(); }
}

// in the GL page: compile every shader the film uses; returns an error string or null
function setup({ vert, frags }) {
  const g = document.getElementById("t").getContext("webgl", { preserveDrawingBuffer: true });
  if (!g) return "no WebGL in this browser";
  g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false);
  g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL, g.NONE);
  const sh = (src, type) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s);
    if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(s)); return s; };
  const progs = {};
  try {
    for (const [name, frag] of Object.entries(frags)) {
      if (!frag) return `unknown shader "${name}"`;
      const p = g.createProgram();
      g.attachShader(p, sh(vert, g.VERTEX_SHADER)); g.attachShader(p, sh(frag, g.FRAGMENT_SHADER)); g.linkProgram(p);
      if (!g.getProgramParameter(p, g.LINK_STATUS)) return `${name}: ${g.getProgramInfoLog(p)}`;
      progs[name] = p;
    }
  } catch (e) { return e.message; }
  const buf = g.createBuffer();
  g.bindBuffer(g.ARRAY_BUFFER, buf);
  g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
  const tex = [0, 1].map(() => { const t = g.createTexture(); g.bindTexture(g.TEXTURE_2D, t);
    for (const [k, v] of [[g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE], [g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE], [g.TEXTURE_MIN_FILTER, g.LINEAR], [g.TEXTURE_MAG_FILTER, g.LINEAR]])
      g.texParameteri(g.TEXTURE_2D, k, v);
    return t; });
  window.GL = { g, progs, tex };
  return null;
}

// in the GL page: one composite, as upstream renderShader (webgl.ts)
async function draw({ shader, from, to, p, accent, u: extra, width, height }) {
  const { g, progs, tex } = window.GL, prog = progs[shader];
  document.getElementById("t").style.display = "block"; document.getElementById("f").style.display = "none";
  const img = async (b64) => { const i = new Image(); i.src = "data:image/png;base64," + b64; await i.decode(); return i; };
  const imgs = await Promise.all([img(from), img(to)]);
  g.viewport(0, 0, width, height);
  g.useProgram(prog);
  imgs.forEach((im, k) => { g.activeTexture(g.TEXTURE0 + k); g.bindTexture(g.TEXTURE_2D, tex[k]);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, im); });
  const u = (n) => g.getUniformLocation(prog, n);
  g.uniform1i(u("u_from"), 0); g.uniform1i(u("u_to"), 1);
  g.uniform1f(u("u_progress"), p);
  g.uniform2f(u("u_resolution"), width, height);
  g.uniform3f(u("u_accent"), ...accent.accent); g.uniform3f(u("u_accent_dark"), ...accent.dark); g.uniform3f(u("u_accent_bright"), ...accent.bright);
  for (const [k, v] of Object.entries(extra)) { const l = u(k); if (l) Array.isArray(v) ? g["uniform" + v.length + "fv"](l, v) : g.uniform1f(l, v); }
  const a = g.getAttribLocation(prog, "a_pos");
  g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
  g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  g.finish();
}

// in the GL page: base (opaque) then each effect layer, premultiplied over it, on a WebGL2 canvas; returns an error string or null
async function drawFx({ glsl, base, layers, width, height }) {
  const cv = document.getElementById("f");
  document.getElementById("t").style.display = "none"; cv.style.display = "block";
  if (!window.FXG) {
    const g = cv.getContext("webgl2", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!g) return "no WebGL2 in this browser";
    const buf = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, buf); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
    const tex = g.createTexture(); g.bindTexture(g.TEXTURE_2D, tex);
    for (const [k, v] of [[g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE], [g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE], [g.TEXTURE_MIN_FILTER, g.LINEAR], [g.TEXTURE_MAG_FILTER, g.LINEAR]]) g.texParameteri(g.TEXTURE_2D, k, v);
    window.FXG = { g, buf, tex, progs: {} };
  }
  const { g, buf, tex, progs } = window.FXG;
  const COPY = "#version 300 es\nprecision highp float;uniform sampler2D u_src;in vec2 v_uv;out vec4 o;void main(){o=texture(u_src,v_uv);}";
  const prog = (name) => {
    if (progs[name]) return progs[name];
    const sh = (src, type) => { const s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s);
      if (!g.getShaderParameter(s, g.COMPILE_STATUS)) throw new Error(name + ": " + g.getShaderInfoLog(s)); return s; };
    const p = g.createProgram(); g.attachShader(p, sh(glsl.vert, g.VERTEX_SHADER)); g.attachShader(p, sh(name === "copy" ? COPY : glsl.src[name], g.FRAGMENT_SHADER)); g.linkProgram(p);
    if (!g.getProgramParameter(p, g.LINK_STATUS)) throw new Error(name + ": " + g.getProgramInfoLog(p));
    return (progs[name] = p);
  };
  const img = async (b64) => { const i = new Image(); i.src = "data:image/png;base64," + b64; await i.decode(); return i; };
  const pass = (p, im, u) => {
    g.useProgram(p); g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, tex);
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false); g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL, g.NONE);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, im); g.uniform1i(g.getUniformLocation(p, "u_src"), 0);
    for (const [k, v] of Object.entries(u)) { const arr = Array.isArray(v), l = g.getUniformLocation(p, arr && v.length > 4 ? k + "[0]" : k); if (l == null) continue;
      if (!arr) g.uniform1f(l, +v); else if (v.length > 4) g.uniform3fv(l, v); else g["uniform" + v.length + "fv"](l, v); }
    g.bindBuffer(g.ARRAY_BUFFER, buf); const a = g.getAttribLocation(p, "a"); g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  };
  try {
    g.viewport(0, 0, width, height); g.disable(g.BLEND); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
    pass(prog("copy"), await img(base), {});
    g.enable(g.BLEND); g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
    for (const l of layers) pass(prog(l.name), await img(l.png), { u_box: l.box, u_frame: [width, height], ...l.u });
    g.finish();
  } catch (e) { return e.message; }
  return null;
}

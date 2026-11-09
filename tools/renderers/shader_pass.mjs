// Shader transitions (tools/shaders.js, KIT.shader) for both renderers: after a renderer has written its frames, every
// frame inside a transition window is replaced by the WebGL composite of its two scenes. The film page is opened in
// plain Chromium, each side captured alone (window.__kitIsolate) and mixed by the ported HyperFrames GLSL
// (shader_glsl.mjs) on SwiftShader, so frames match across machines. Films that don't load shaders.js are never opened.
// docs/playbook/shader-transitions.md
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import { SHADERS, vertSrc, accentOf } from "./shader_glsl.mjs";

// what the producer uses for PRODUCER_BROWSER_GPU_MODE=software (engine/dist/services/browserManager.js)
// --disable-lcd-text: same as the vendored engine patch; will-change layers (KIT.words) otherwise pick LCD or greyscale AA per run
const GL_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--disable-lcd-text", "--font-render-hinting=none"];

// page: the film's index.html; frames: [{ t, file }] (.jpg written as jpeg 94 like the renderers, else png)
export async function shaderPass(page, width, height, frames) {
  if (!/shaders\.js/.test(fs.readFileSync(page, "utf8"))) return;
  // shortcut: hf captures come from plain Chromium, not the producer, so glyph edges can differ by ~1px at the cut
  // into and out of a window; capture through the producer if that ever shows
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files", ...GL_ARGS]);
  try {
    const film = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    film.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
    await film.goto(pathToFileURL(page).href);
    if (!(await film.evaluate(async () => await window.READY))) throw new Error("shader transitions: the film page didn't load");
    const T = await film.evaluate(() => (window.KIT_MEDIA && window.KIT_MEDIA.transitions) || []);
    const todo = frames.map((f) => ({ ...f, i: T.findIndex((x) => f.t >= x.t && f.t < x.t + x.dur) })).filter((f) => f.i >= 0);
    if (!todo.length) return;
    const gl = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await gl.setContent(`<body style="margin:0"><canvas width="${width}" height="${height}" style="display:block"></canvas></body>`);
    const err = await gl.evaluate(setup, { vert: vertSrc, frags: Object.fromEntries(T.map((x) => [x.shader, SHADERS[x.shader]?.frag])) });
    if (err) throw new Error("shader transitions: " + err);
    const capture = async (i, side, t) => {
      await film.evaluate(([i, side, t]) => { window.__kitIsolate = { i, side }; return window.render(t); }, [i, side, t]);
      return (await film.screenshot({ type: "png" })).toString("base64");
    };
    // shortcut: one page, frame by frame (3 screenshots each); spread over pages if long transitions get slow
    for (const f of todo) {
      const x = T[f.i], from = await capture(f.i, "from", f.t), to = await capture(f.i, "to", f.t);
      const p = await film.evaluate(([i, t]) => window.KIT.shaderProgress(i, t), [f.i, f.t]);
      await gl.evaluate(draw, { shader: x.shader, from, to, p, accent: accentOf(x.accent), width, height });
      fs.writeFileSync(f.file, await gl.screenshot(/\.jpe?g$/i.test(f.file) ? { type: "jpeg", quality: 94 } : { type: "png" }));
    }
    console.log(`shader transitions: ${todo.length} frame${todo.length === 1 ? "" : "s"} in ${T.length} transition${T.length === 1 ? "" : "s"}`);
  } finally { await browser.close(); }
}

// in the GL page: compile every shader the film uses; returns an error string or null
function setup({ vert, frags }) {
  const g = document.querySelector("canvas").getContext("webgl", { preserveDrawingBuffer: true });
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
async function draw({ shader, from, to, p, accent, width, height }) {
  const { g, progs, tex } = window.GL, prog = progs[shader];
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
  const a = g.getAttribLocation(prog, "a_pos");
  g.enableVertexAttribArray(a); g.vertexAttribPointer(a, 2, g.FLOAT, false, 0, 0);
  g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  g.finish();
}

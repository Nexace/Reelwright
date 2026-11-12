// blocks.mjs — HyperFrames registry blocks (hyperframes:block) for hf films. Maintainer steps:
//   node tools/blocks.mjs import <upstream registry/blocks dir>   classify and convert every block, verify the converted
//        ones, write vendor/hyperframes/registry/blocks/<name>/, index.json, CATALOG.md and UNSUPPORTED.md
//   node tools/blocks.mjs verify [names…]        re-run the page check on vendored blocks (all by default); prints FAILs
//   node tools/blocks.mjs render <out> <names…>  mount the blocks one after another in a scratch hf project, render stills
//                                                through the real hyperframes renderer into <out>
// Films use `reelwright add <block>` (tools/commands/add.mjs → installBlock below) and KIT.mount / KIT.block.
//
// A converted block is a <template> file KIT.mount (tools/compose.js) inlines: scoped CSS, bundled-font @font-face, the
// markup, and ONE wrapper script holding all of the block's scripts in order. The wrapper registers
// window.__timelines[<id>] = { seek(t) } that seeks the block's own timeline (GSAP totalTime, like HyperFrames), its
// hf-seek listeners, __hfThreeTime / __hfLottie users and data-start clips with the block's LOCAL time; module scripts run
// as async functions behind window.__hf.buildReady (which the HyperFrames runtime waits on, and so does verify).
// Libraries resolve to the kit only (gsap → kit/gsap/dist, lottie → kit/lottie, three ESM + addons → kit/three via an import
// map, three r147 global → kit/three-r147, d3 / topojson-client → kit/<lib>, atlas JSON → kit/{us,world,es}-atlas);
// anything else a block loads, or any file of its own without a known licence, makes it UNSUPPORTED with the reason. See vendor/hyperframes/VENDORED.md "Blocks".
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
export const BLOCKS = path.join(ROOT, "vendor", "hyperframes", "registry", "blocks");
const FONTS = path.join(ROOT, "fonts");
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";   // transparent 1x1
const isDir = (p) => fs.statSync(p, { throwIfNoEntry: false })?.isDirectory() ?? false;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const posix = (p) => p.split(path.sep).join("/");
const walk = (d, base = d) => fs.readdirSync(d).flatMap((f) => isDir(path.join(d, f)) ? walk(path.join(d, f), base) : [posix(path.relative(base, path.join(d, f)))]);

export const index = () => JSON.parse(fs.readFileSync(path.join(BLOCKS, "index.json"), "utf8"));

// ── bundled fonts ───────────────────────────────────────────────────────────
const bundled = () => {   // slug → { family, weights }
  const fam = {};
  for (const m of fs.readFileSync(path.join(FONTS, "LICENSES.md"), "utf8").matchAll(/^\| ([^|]+?) \| `fonts\/([\w-]+)\/`/gm)) fam[m[2]] = m[1];
  const out = {};
  for (const s of fs.readdirSync(FONTS).filter((d) => isDir(path.join(FONTS, d))))
    out[s] = { family: fam[s] || s, weights: fs.readdirSync(path.join(FONTS, s)).filter((f) => f.endsWith(".woff2")).map((f) => +f.slice(0, -6)).sort((a, b) => a - b) };
  return out;
};
// families the blocks name that fonts/ doesn't bundle → the nearest bundled one (recorded per block in index.json)
const NEAR = { "DM Sans": "inter", Lato: "inter", Geist: "inter", Roboto: "inter", Helvetica: "inter", "Helvetica Neue": "inter",
  Arial: "inter", "Segoe UI": "inter", "SF Pro Text": "inter", "SF Pro Display": "inter", "Libre Franklin": "work-sans",
  Poppins: "montserrat", "Arial Black": "archivo-black", Impact: "bebas-neue", "League Gothic": "bebas-neue", Oswald: "bebas-neue",
  "Big Shoulders Display": "bebas-neue", "Barlow Condensed": "barlow", Georgia: "source-serif-4", "Times New Roman": "source-serif-4",
  Gelasio: "source-serif-4", Menlo: "jetbrains-mono", Monaco: "jetbrains-mono", Consolas: "jetbrains-mono", "SF Mono": "jetbrains-mono",
  "Courier New": "ibm-plex-mono", "Courier Prime": "ibm-plex-mono", "Permanent Marker": "patrick-hand" };
// host-font keywords → a bundled family, so frames don't depend on the machine's system fonts
const SYSTEM = { "-apple-system": "Inter", BlinkMacSystemFont: "Inter", "system-ui": "Inter", "ui-sans-serif": "Inter",
  "ui-monospace": "JetBrains Mono", "ui-serif": "Source Serif 4" };

// ── asset licences ─────────────────────────────────────────────────────────
// upstream CREDITS.md (v0.9.19): the 3D-motion pieces are contributed under the repo's Apache-2.0, except these files
const CREDITED = ["canopy-part-title", "glass-shard-title", "code-slice-hero", "frost-sequence-camera-orbit", "cuboid-carousel", "orbit-card", "wireframe-portal-title"];
const UNCONFIRMED = ["canopy-part-title/assets/leaf-surface-color.webp", "canopy-part-title/assets/leaf-surface-normal.webp",
  "glass-shard-title/assets/matcap-1.png", "frost-sequence-camera-orbit/assets/shards-atlas.png",
  "frost-sequence-camera-orbit/assets/textures/ice-inclusions-generated.png", "frost-sequence-camera-orbit/assets/textures/bluenoise64.png"];
const LICENCE_FILE = /^(.*?)[-_.]?(LICEN[CS]E|OFL|NOTICE|COPYING)[^/]*$/i;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function licensed(dir, name, item, rel) {
  if (item.license) return true;
  if (CREDITED.includes(name)) return !UNCONFIRMED.includes(`${name}/${rel}`);
  const d = path.posix.dirname(rel), base = path.posix.basename(rel);
  // a licence text beside it: bare LICENSE/OFL.txt covers its folder, "inter-LICENSE.txt" covers inter* files
  return fs.readdirSync(path.join(dir, d)).some((f) => { const m = f.match(LICENCE_FILE); return m && f !== base && norm(base).startsWith(norm(m[1])); });
}

// ── classification ─────────────────────────────────────────────────────────
const MEDIA = /<(audio|video)\b/i;
function classify(html) {
  if (/data-requires-webgpu|navigator\.gpu|typegpu/.test(html)) return "needs WebGPU hardware";
  if (MEDIA.test(html)) return "plays <audio>/<video> media; KIT.mount doesn't re-time media inside a block";
  return null;
}
// a CDN URL → its kit path, "three" import spec, or null (not vendored)
function kitLib(u) {
  let m;
  if ((m = u.match(/gsap@[\d.]+\/dist\/(\w+?)(?:\.min)?\.js/)) || (m = u.match(/(?:^|\/)(gsap)[-\d.]*\.min\.js$/)))
    return fs.existsSync(path.join(ROOT, "vendor", "gsap", "dist", m[1] + ".min.js")) ? { src: `kit/gsap/dist/${m[1]}.min.js` } : null;
  if (/lottie(-web)?@[\d.]+/.test(u)) return { src: "kit/lottie/lottie.min.js" };
  if (/three@0\.1(7|8)\d\.\d+(\/build\/three\.module(\.min)?\.js|\/\+esm)?$/.test(u)) return { spec: "three" };
  if ((m = u.match(/three@0\.1[78]\d\.\d+\/examples\/jsm\/(.+?)(\/\+esm)?$/))) return addon(m[1]);
  // classic builds and data: a file of a vendor/<lib>/ folder, or null
  const has = (lib, f) => fs.existsSync(path.join(ROOT, "vendor", lib, f)) ? { src: `kit/${lib}/${f}` } : null;
  if ((m = u.match(/three@0\.147\.0\/build\/(three\.min\.js)$/))) return has("three-r147", m[1]);
  if ((m = u.match(/three@0\.147\.0\/(examples\/js\/.+\.js)$/))) return has("three-r147", m[1]);
  if (/\/npm\/d3@7(\/dist\/d3(\.min)?\.js)?$/.test(u)) return has("d3", "d3.min.js");
  if (/topojson-client@3[\d.]*\/dist\/topojson-client(\.min)?\.js$/.test(u)) return has("topojson-client", "topojson-client.min.js");
  return null;
}
// a three addon: vendor/three/addons/<path> (from three@0.187.0's examples/jsm) as "three/addons/<path>", or not vendored
const addon = (p) => fs.existsSync(path.join(ROOT, "vendor", "three", "addons", p)) ? { spec: "three/addons/" + p } : { addon: p };
const DATA = /https:\/\/cdn\.jsdelivr\.net\/npm\/(us-atlas|world-atlas)@[\w.]+\/([\w/.-]+\.json)/g;   // atlas JSON → kit/<lib>/
const libName = (u) => (u.match(/npm\/(@?[\w.-]+?)(?:@|\/)/) || u.match(/libs\/([\w.-]+)/) || [, new URL(u).host])[1];

const SKIP = /^(registry-item\.json|TEMPLATE\.md|SKILL\.md|README\.md|demo[^/]*|build-bundle\.mjs|source\/.*)$/i;   // upstream docs/demos
const LIBCOPY = /(^|\/)(gsap[-\d.]*\.min\.js|three\.(module|core)(\.min)?\.js|GSAP-NOTICE\.txt)$/;   // a block's own copy of a kit library
const IMAGE = /\.(svg|png|jpe?g|webp|gif)$/i;

// ── convert one upstream block ─────────────────────────────────────────────
export function convert(dir, name) {
  const item = JSON.parse(fs.readFileSync(path.join(dir, "registry-item.json"), "utf8"));
  const file = path.join(dir, name + ".html");
  if (!fs.existsSync(file)) return { reason: "no " + name + ".html" };
  const raw = fs.readFileSync(file, "utf8");
  const why = classify(raw);
  // licence first: a file the block uses with no known licence is the reason, whatever else it needs (fonts get a
  // bundled stand-in, image-variable samples a blank, so neither blocks it)
  const samples = JSON.stringify(item.variables || raw.match(/data-composition-variables\s*=\s*'[^']*'/)?.[0] || "");
  const gaps = walk(dir).filter((f) => f !== name + ".html" && !SKIP.test(f) && !LIBCOPY.test(f) && !/\.(woff2?|ttf|otf)$/i.test(f) &&
    raw.includes(f) && !licensed(dir, name, item, f) && !(IMAGE.test(f) && samples.includes(f)));
  if (gaps.length) return { reason: `asset licence unknown: ${gaps.join(", ")}${why ? ` (also: ${why})` : ""}` };
  if (why) return { reason: why };
  const notes = [];
  let src = raw.replace(/<!--[\s\S]*?-->/g, "");
  const tpl = src.match(/<template\b[^>]*>([\s\S]*)<\/template>/);
  let content;
  if (tpl && /data-composition-id/.test(tpl[1])) content = tpl[1];
  else content = ((src.match(/<head\b[^>]*>([\s\S]*?)<\/head>/) || [])[1] || "") + ((src.match(/<body\b[^>]*>([\s\S]*)<\/body>/) || [, src])[1]);
  content = content.replace(/<link\b[^>]*>/gi, "").replace(/<meta\b[^>]*>/gi, "").replace(/<title>[\s\S]*?<\/title>/gi, "");
  const id = (content.match(/data-composition-id\s*=\s*["']([^"']+)["']/) || [])[1];
  if (!id) return { reason: "no [data-composition-id] root" };
  const rootTag = content.match(/<[a-z][^>]*data-composition-id[^>]*>/i)[0];
  const rootId = (rootTag.match(/\sid\s*=\s*["']([^"']+)["']/) || [])[1];
  const W = item.dimensions?.width || +(rootTag.match(/data-width="(\d+)"/) || [])[1] || 1920;
  const H = item.dimensions?.height || +(rootTag.match(/data-height="(\d+)"/) || [])[1] || 1080;

  // styles and scripts out of the markup, in document order
  const styles = [];
  content = content.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => { styles.push(css); return ""; });
  const scripts = [];
  content = content.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (_, attrs, code) => {
    const a = (k) => (attrs.match(new RegExp(`\\b${k}\\s*=\\s*["']([^"']*)["']`)) || [])[1];
    scripts.push({ src: a("src"), type: (a("type") || "").toLowerCase(), code });
    return "";
  });
  let css = styles.join("\n"), parts = [], modules = [], imap = {};
  for (const s of scripts) {
    if (s.type === "importmap") { Object.assign(imap, JSON.parse(s.code).imports || {}); continue; }
    if (s.type && !/^(module|text\/javascript|application\/javascript)$/.test(s.type)) return { reason: `has a <script type="${s.type}"> (KIT.mount runs every script as JS)` };
    if (s.src) {
      if (/^https?:/.test(s.src)) {
        const k = kitLib(s.src);
        if (!k || !k.src) return { reason: `loads ${libName(s.src)} from ${new URL(s.src).host} (not vendored)` };
        if (s.type === "module") return { reason: `loads ${s.src} as a module` };
        parts.push(`__rwLib(${JSON.stringify(k.src)});`);
      } else if (kitLib(s.src)?.src) parts.push(`__rwLib(${JSON.stringify(kitLib(s.src).src)});`);   // a block-local gsap copy
      else if (s.type === "module") modules.push(`await import(${JSON.stringify("./" + s.src.replace(/^\.\//, ""))});`);
      else parts.push(`__rwLib(${JSON.stringify(s.src.replace(/^\.\//, ""))});`);
    } else if (s.type === "module") modules.push(s.code);
    else parts.push(s.code);
  }

  // import specifiers: CDN three → "three" (kit, via the import map); addons are not vendored
  let missing = null;
  const spec = (u) => {
    if (!/^https?:/.test(u)) return u;
    const k = kitLib(u);
    if (k?.spec) return k.spec;
    missing ||= k?.addon ? `needs three addon examples/jsm/${k.addon} (not vendored)` : `imports ${libName(u)} from ${new URL(u).host} (not vendored)`;
    return u;
  };
  for (const k of Object.keys(imap)) {
    if (/^three\/addons\/?$|^three\/examples/.test(k) && /^https?:/.test(imap[k])) missing ||= `needs three addons ${k} from ${new URL(imap[k]).host} (not vendored)`;
    else imap[k] = spec(imap[k]);
  }
  for (const m of modules) for (const x of m.matchAll(/\bfrom\s*["']([^"']+)["']|\bimport\s*\(?\s*["']([^"']+)["']/g)) {
    const u = x[1] || x[2];
    if (/^three\/(addons|examples)\//.test(u) && !Object.keys(imap).some((k) => k.endsWith("/") && u.startsWith(k) && !/^three\//.test(imap[k])) &&
      addon(u.replace(/^three\/(addons|examples\/jsm)\//, "")).addon) missing ||= `needs three addon ${u} (not vendored)`;
    spec(u);
  }
  if (missing) return { reason: missing };
  const data = (t) => t.replace(DATA, (u, lib, f) => fs.existsSync(path.join(ROOT, "vendor", lib, f)) ? `kit/${lib}/${f}` : u);
  parts = parts.map(data); modules = modules.map(data); content = data(content);
  modules = modules.map((m) => m.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(["'])(https?:[^"']+)\2/g, (_, a, q, u) => a + q + spec(u) + q));

  // fonts: keep a block's own licensed @font-face; remote or unlicensed faces and plain family names → bundled fonts/
  const B = bundled(), bySlugName = Object.fromEntries(Object.entries(B).map(([s, b]) => [b.family.toLowerCase(), s]));
  const pick = (fam, hint = "") => bySlugName[fam.toLowerCase()] || NEAR[fam] ||
    Object.keys(B).filter((s) => norm(hint).includes(norm(s))).sort((a, b) => b.length - a.length)[0] || "inter";
  const nearW = (slug, w) => B[slug].weights.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a);
  const slugs = new Set(), loads = [], declared = new Set(), drop = new Set();
  const all = () => [css, content, ...parts, ...modules].join("\n");
  for (const [k, v] of Object.entries(SYSTEM)) {
    const re = new RegExp(`(?<![\\w-])${esc(k)}(?![\\w-])`, "g"), q = `"${v}"`;
    css = css.replace(re, q); content = content.replace(re, v); parts = parts.map((p) => p.replace(re, v)); modules = modules.map((p) => p.replace(re, v));
  }
  css = css.replace(/@font-face\s*\{([^}]*)\}/g, (rule, body) => {
    const fam = (body.match(/font-family\s*:\s*["']?([^;"']+?)["']?\s*;/) || [])[1]?.trim();
    if (!fam) return rule;
    const w = +(body.match(/font-weight\s*:\s*(\d+)/) || [])[1] || 400;
    const urls = [...body.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)].map((m) => m[1]);
    if (!urls.length) return rule;   // local("Apple Color Emoji")
    declared.add(fam);
    const ok = urls.every((u) => !/^(https?:)?\/\//.test(u) && fs.existsSync(path.join(dir, u)) && licensed(dir, name, item, posix(path.normalize(u))));
    if (ok) { loads.push(`${w} 1em "${fam}"`); return rule; }
    const slug = pick(fam, urls[0]), bw = nearW(slug, w);
    for (const u of urls) if (!/^(https?:)?\/\//.test(u)) drop.add(posix(path.normalize(u)));
    slugs.add(slug); loads.push(`${w} 1em "${fam}"`);
    notes.push(`font ${fam} ${w} → bundled ${B[slug].family} ${bw}`);
    return rule.replace(/src\s*:[^;}]*;?/, `src: url("compositions/${name}/fonts/${slug}/${bw}.woff2") format("woff2");`);
  });
  css = css.replace(/@import\s+url\(\s*["']?https?:\/\/fonts\.(googleapis|gstatic)\.com[^)]*\)\s*;?/g, "");
  const fsrc = (s) => s.replace(/https:\/\/cdn\.jsdelivr\.net\/fontsource\/fonts\/([\w-]+)@[\w.]+\/latin-(\d+)-normal\.woff2/g, (_, f, w) => {
    const slug = pick(f.replace(/-/g, " "), f), bw = nearW(slug, +w);
    slugs.add(slug); notes.push(`font ${f} ${w} (fontsource) → bundled ${B[slug].family} ${bw}`);
    return `compositions/${name}/fonts/${slug}/${bw}.woff2`;
  });
  parts = parts.map(fsrc); modules = modules.map(fsrc);
  let faces = "";
  const text = all(), named = [...new Set([...Object.values(B).map((b) => b.family), ...Object.keys(NEAR)])];
  for (const fam of named) {
    if (declared.has(fam) || !new RegExp(`(?:["'\\s,:]|px\\s)${esc(fam)}(?=["'\\s,;}]|$)`, "m").test(text)) continue;
    const slug = pick(fam);
    slugs.add(slug);
    if (B[slug].family !== fam) notes.push(`font ${fam} → bundled ${B[slug].family}`);
    for (const w of B[slug].weights) {
      faces += `@font-face { font-family: "${fam}"; font-weight: ${w}; font-display: block; src: url("compositions/${name}/fonts/${slug}/${w}.woff2") format("woff2"); }\n`;
      loads.push(`${w} 1em "${fam}"`);
    }
  }

  // assets: the block's own files the code points at, minus copies of kit libraries; each needs a known licence
  let declared0 = item.variables;   // registry-item.json, else data-composition-variables on <html> or the root
  if (!declared0) try { declared0 = JSON.parse(((raw.match(/data-composition-variables\s*=\s*'([^']*)'/) || [])[1] || "[]").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&")); } catch { declared0 = []; }
  const vars = declared0.map((v) => ({ id: v.id, type: v.type, default: v.default }));
  const files = walk(dir).filter((f) => f !== name + ".html" && !SKIP.test(f) && !LIBCOPY.test(f) && !drop.has(f));
  const t = all() + JSON.stringify(imap);
  const dirs = (f) => f.split("/").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("/"));   // assets, assets/addons, …
  const used = new Set(files.filter((f) => t.includes(f) || dirs(f).some((d) => new RegExp(esc(d) + "/[\"'`]").test(t))));
  for (let grew = true; grew;) {   // files a used script / json names (orbit-scene.js → ./orbit-motion.js)
    grew = false;
    for (const f of [...used]) if (/\.(m?js|json|css)$/.test(f)) {
      const body = fs.readFileSync(path.join(dir, f), "utf8");
      for (const g of files) if (!used.has(g) && body.includes(path.posix.basename(g))) { used.add(g); grew = true; }
    }
  }
  for (const v of vars) if (v.type === "image" && typeof v.default === "string" && /^(\.\/)?[\w-]+\//.test(v.default) && !fs.existsSync(path.join(dir, v.default))) {
    const re = new RegExp(`(?<![\\w./-])(?:\\./)?${esc(v.default.replace(/^\.\//, ""))}`, "g");
    css = css.replace(re, PIXEL); content = content.replace(re, PIXEL); parts = parts.map((p) => p.replace(re, PIXEL)); modules = modules.map((p) => p.replace(re, PIXEL));
    notes.push(`variable ${v.id}: sample ${v.default} isn't shipped upstream — pass vars.${v.id}`); v.default = PIXEL;
  }
  const bad = [];
  for (const f of used) {
    if (licensed(dir, name, item, f)) continue;
    const v = vars.find((x) => x.default === f || x.default === "./" + f);
    if (IMAGE.test(f) && v) {   // an image variable's sample: ship a blank, the film passes its own
      for (const x of vars) if (x.default === f || x.default === "./" + f) x.default = PIXEL;
      const re = new RegExp(`(?<![\\w./-])(?:\\./)?${esc(f)}`, "g");
      css = css.replace(re, PIXEL); content = content.replace(re, PIXEL); parts = parts.map((p) => p.replace(re, PIXEL)); modules = modules.map((p) => p.replace(re, PIXEL));
      notes.push(`variable ${v.id}: sample ${f} left out (licence unknown) — pass vars.${v.id}`);
      used.delete(f);
    } else bad.push(f);
  }
  if (bad.length) return { reason: `asset licence unknown: ${bad.join(", ")}` };
  for (const f of files) if (!used.has(f) && /\.(txt|md)$/i.test(f) && LICENCE_FILE.test(path.posix.basename(f)) &&
    [...used].some((u) => path.posix.dirname(u) === path.posix.dirname(f))) used.add(f);   // keep licence texts beside what ships

  // paths: the block's own files live in compositions/<name>/ (relative to hf/index.html, where KIT.mount inlines it)
  const tops = [...new Set([...files].map((f) => f.split("/")[0]))];
  const base = `compositions/${name}/`;
  const rel = (s) => tops.reduce((s, top) => s.replace(new RegExp(`(?<![\\w./-])(?:\\./)?${esc(top)}(?=[/"'\`)\\s?#]|$)`, "gm"), base + top), s);
  css = rel(css); content = rel(content); parts = parts.map(rel); modules = modules.map(rel);
  for (const k of Object.keys(imap)) imap[k] = rel(imap[k]);
  for (const v of vars) if (typeof v.default === "string" && v.default !== PIXEL) v.default = rel(v.default);
  // kit copies of a block's own three build: the import map points them (and "three") at kit/three
  const map = { three: "./kit/three/three.module.js", "three/addons/": "./kit/three/addons/" };
  for (const f of walk(dir).filter((f) => /three\.(module|core)(\.min)?\.js$/.test(f)))
    map["./" + base + f] = /core/.test(f) ? "./kit/three/three.core.js" : "./kit/three/three.module.js";
  for (const [k, v] of Object.entries(imap)) map[k] = /^(\.|\/|three)/.test(v) ? v : "./" + v;
  if (map.three !== "./kit/three/three.module.js") map.three = "./kit/three/three.module.js";
  for (const k of Object.keys(map)) if (/^compositions\//.test(k)) { map["./" + k] = map[k]; delete map[k]; }

  // HyperFrames clip timing (data-start/data-duration) is ours to apply with local time; the host's window is KIT.mount's
  const clipRen = (s) => s.replace(/data-start(?![\w-])/g, "data-block-start").replace(/data-duration(?![\w-])/g, "data-block-duration")
    .replace(/dataset\.start\b/g, "dataset.blockStart").replace(/dataset\.duration\b/g, "dataset.blockDuration");
  css = clipRen(css); content = clipRen(content); parts = parts.map(clipRen); modules = modules.map(clipRen);
  // the root carries the variable declarations (defaults with their shipped paths); blocks read them from it or from <html>
  const decl = JSON.stringify(declared0.map((v) => ({ ...v, default: vars.find((x) => x.id === v.id).default })))
    .replace(/&/g, "&amp;").replace(/'/g, "&#39;");
  if (declared0.length) content = content.replace(/\sdata-composition-variables\s*=\s*('[^']*'|"[^"]*")/, "")
    .replace(/(<[a-z][^>]*?)(\sdata-composition-id\s*=)/i, `$1 data-composition-variables='${decl}'$2`);

  // CSS scoped to the root, like HyperFrames scopes an inlined sub-composition
  if (rootId) css = css.replace(new RegExp(`#${esc(rootId)}(?![\\w-])`, "g"), `[data-composition-id="${id}"]`);
  return { id, W, H, item, vars, notes, used: [...used].sort(), slugs: [...slugs].sort(), css, faces, content, parts, modules, map, loads };
}

// JS rewrites: the block's globals become wrapper locals, so the HyperFrames runtime never seeks them with film time
const js = (s) => s
  .replace(/(?<![\w$.])(?:window\.)?__timelines(?![\w$])/g, "__rwTL")
  .replace(/window\.__hyperframes\b/g, "__hyperframes")
  .replace(/window\.__hfThreeTime\b/g, "__hfThreeTime").replace(/window\.__hfLottie\b/g, "__hfLottie")
  .replace(/(?:window\.)?addEventListener\(\s*(["'])hf-seek\1\s*,/g, "__rwOnSeek(")
  .replace(/document\.documentElement\b/g, "__rwRoot").replace(/document\.body\b/g, "__rwRoot")
  .replace(/import\.meta\.url/g, "document.baseURI")
  .replace(/(?<![\w$.])(?:window\.)?fetch\(/g, "__rwFetch(").replace(/(?<![\w$.])d3\.json\(/g, "__rwJson(");
// static imports in a module → awaited dynamic imports (resolved through the import map)
let dynN = 0;
const dyn = (code) => code
  .replace(/^\s*import\s+(["'])([^"']+)\1\s*;?/gm, (_, q, s) => `await import(${JSON.stringify(s)});`)
  .replace(/^\s*import\s+([\s\S]*?)\s+from\s+(["'])([^"']+)\2\s*;?/gm, (_, clause, q, s) => {
    const S = JSON.stringify(s), out = [], m = clause.trim().match(/^([\w$]+)?\s*,?\s*(.*)$/s);
    const tmp = "__rwM" + ++dynN;
    out.push(`const ${tmp} = await import(${S});`);
    if (m[1]) out.push(`const ${m[1]} = ${tmp}.default;`);
    const rest = m[2].trim();
    if (rest.startsWith("*")) out.push(`const ${rest.replace(/^\*\s*as\s*/, "")} = ${tmp};`);
    else if (rest.startsWith("{")) out.push(`const ${rest.replace(/\s+as\s+/g, ": ")} = ${tmp};`);
    return out.join(" ");
  });

export function render(c, name) {
  const scope = `[data-composition-id="${c.id}"]`;
  const wrap = `(function () { // ${name}: the block's scripts, run by KIT.mount (tools/compose.js); see tools/blocks.mjs
const __rwHost = document.currentScript.parentNode, __rwRoot = __rwHost.querySelector('[data-composition-id]');
const __rwOuter = window.__hyperframes, __rwBase = ${JSON.stringify("compositions/" + name + "/")};
const __rwVars = Object.assign(${JSON.stringify(Object.fromEntries(c.vars.map((v) => [v.id, v.default])))}, (__rwOuter && __rwOuter.getVariables && __rwOuter.getVariables()) || {});
const __hyperframes = Object.assign({}, __rwOuter || {}, { getVariables: () => Object.assign({}, __rwVars),
  assetUrl: (p) => /^(compositions\\/|data:|blob:|\\/|https?:)/.test(p) ? p : __rwBase + String(p).replace(/^\\.\\//, '') });
let __rwTL = {}, __hfThreeTime = 0, __hfLottie = [];
// players the block puts on __hfLottie are marked, and hidden from the HyperFrames lottie adapter (it would seek them to film time)
__hfLottie.push = (...a) => { for (const x of a) if (x) x.__rwBlock = true; return Array.prototype.push.apply(__hfLottie, a); };
const __rwHideLottie = () => { const L = window.lottie; if (!L || L.__rwHidden || typeof L.getRegisteredAnimations !== 'function') return;
  const g = L.getRegisteredAnimations.bind(L); L.getRegisteredAnimations = () => g().filter((x) => !x.__rwBlock); L.__rwHidden = true; };
const __rwSeekers = [], __rwOnSeek = (f) => { __rwSeekers.push(f); };
// the block's own data files (kit/…, compositions/…) load synchronously: what it builds from them in .then() is done in
// microtasks right after mount, before the first seek, instead of racing it
const __rwGet = (u) => { const x = new XMLHttpRequest(); x.open('GET', u, false); x.send(); if (x.status >= 400) throw new Error(${JSON.stringify(name)} + ': ' + x.status + ' ' + u); return x.responseText; };
const __rwOwn = (u) => typeof u === 'string' && /^(\\.\\/)?(kit|compositions)\\//.test(u);
const __rwFetch = (u, o) => { if (o || !__rwOwn(u)) return window.fetch(u, o);
  try { const t = __rwGet(u); return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(t)), text: () => Promise.resolve(t) }); }
  catch (e) { return Promise.reject(e); } };
const __rwJson = (u, o) => __rwOwn(u) && !o ? __rwFetch(u).then((r) => r.json()) : window.d3.json(u, o);
const __rwReady = (k, p) => { const h = (window.__hf = window.__hf || {}); (h.buildReady = h.buildReady || {})[${JSON.stringify(c.id)} + ':' + k] = p; return p; };
const __rwLib = (src) => {   // a classic library, once per page, synchronously (scripts after it use it at once)
  const L = (window.__rwLibs = window.__rwLibs || {});
  if (L[src] || document.querySelector('script[src$="' + src + '"]') || (/\\/gsap\\.min\\.js$/.test(src) && window.gsap) || (/lottie\\.min\\.js$/.test(src) && window.lottie)) return;
  const x = new XMLHttpRequest(); x.open('GET', src, false); x.send();
  if (!x.responseText) throw new Error(${JSON.stringify(name)} + ': no ' + src);
  // an inline <script> runs at once, at global scope (top-level const/let stay visible to later scripts, unlike eval)
  const s = document.createElement('script'); s.textContent = x.responseText + '\\n//# sourceURL=' + src; document.head.appendChild(s); L[src] = true;
};
{ const m = document.createElement('script'); m.type = 'importmap'; m.textContent = ${JSON.stringify(JSON.stringify({ imports: c.map }))}; document.head.appendChild(m); }
__rwReady('fonts', Promise.all(${JSON.stringify(c.loads)}.map((f) => document.fonts.load(f))));
${c.parts.map(js).join("\n;\n")}
;${c.modules.map((m, i) => `
__rwReady('module${i}', (async () => {
${dyn(js(m))}
})().catch((e) => { console.error(${JSON.stringify(name)} + ' module:', e); throw e; }));`).join("")}
__rwHideLottie();
const __rwClips = [...__rwRoot.querySelectorAll('[data-block-start]')];
const __rwRun = (tl, t) => { if (!tl) return; if (tl.pause) tl.pause(); if (typeof tl.totalTime === 'function') tl.totalTime(t, false); else if (tl.seek) tl.seek(t, false); };
window.__timelines[${JSON.stringify(c.id)}] = { pause() {}, seek(t) {
  t = Math.max(0, t); __hfThreeTime = t;
  __rwRun(__rwTL[${JSON.stringify(c.id)}] || __rwTL[Object.keys(__rwTL)[0]], t);
  for (const f of __rwSeekers) f({ type: 'hf-seek', detail: { time: t, waitUntil() {} } });
  for (const a of __hfLottie) if (a.goToAndStop) a.goToAndStop(Math.min(t * (a.frameRate || 30), Math.max(0, (a.totalFrames || 1) - 1)), true);
  for (const el of __rwClips) { const s = parseFloat(el.dataset.blockStart), d = parseFloat(el.dataset.blockDuration);
    el.toggleAttribute('data-block-off', Number.isFinite(s) && (t < s || (d > 0 && t >= s + d))); }
} };
})();`;
  return `<!-- Changed from upstream HyperFrames (Apache-2.0, Copyright HeyGen): ${name} v0.9.19 turned into a KIT.mount template ` +
    `(tools/blocks.mjs): CSS scoped to the root, CDN scripts → kit/ (gsap 3.15.1, lottie, three r187 via an import map), ` +
    `Google/remote fonts → bundled fonts/, asset paths → compositions/${name}/, scripts in one wrapper seeked with local time. -->
<template>
<style>
${c.faces}${scope} { position: relative; width: ${c.W}px; height: ${c.H}px; overflow: hidden; }
[data-block-off] { visibility: hidden !important; }
</style>
<style>
${c.css.replace(/<\/style/gi, "<\\/style")}
</style>
${c.content.trim()}
<script>
${wrap.replace(/<\/script/gi, "<\\/script")}
</script>
</template>
`;
}

async function scope(c) {   // HyperFrames' own scoper (bare html/body/:root → the root box), plus bare * kept inside it
  const { scopeCssToComposition } = await import("../vendor/hyperframes/core/dist/compiler/compositionScoping.js");
  const s = `[data-composition-id="${c.id}"]`;
  const pre = c.css.replace(/(^|[{}])(\s*)\*(?=\s*[,{:])/g, `$1$2${s}, ${s} *`).replace(/,(\s*)\*(?=\s*[,{:])/g, `,$1${s} *`);
  c.css = scopeCssToComposition(pre, c.id, undefined, undefined, { scopeRootSelectors: true });
}

// ── install into a project (add.mjs) ───────────────────────────────────────
export function installBlock(name, hf) {
  const meta = index().blocks[name], src = path.join(BLOCKS, name);
  const dest = path.join(hf, "compositions");
  fs.mkdirSync(path.join(dest, name), { recursive: true });
  fs.copyFileSync(path.join(src, name + ".html"), path.join(dest, name + ".html"));
  for (const f of walk(src).filter((f) => f !== name + ".html" && f !== "registry-item.json")) {
    fs.mkdirSync(path.dirname(path.join(dest, name, f)), { recursive: true });
    fs.copyFileSync(path.join(src, f), path.join(dest, name, f));
  }
  for (const s of meta.fonts) fs.cpSync(path.join(FONTS, s), path.join(dest, name, "fonts", s), { recursive: true, filter: (f) => !/\.(md|mjs)$/.test(f) });
  return meta;
}

// ── verify: two pages, two shuffled seek orders, same pixels ───────────────
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="kit/kit.css">
<style>body { background: #000; margin: 0; }</style>
<script>const Q = new URLSearchParams(location.search); window.PROJECT = { fps: 30, width: +Q.get('w'), height: +Q.get('h') };</script>
</head><body><div id="root" data-composition-id="main" data-width="1920" data-height="1080"><div id="stage"></div></div>
<script src="kit/engine.js"></script><script src="kit/compose.js"></script>
<script>const S0 = +(Q.get('s') || 0); KIT.mount(Q.get('b'), { start: S0, dur: +Q.get('d') + 1 }); KIT.start({ dur: S0 + +Q.get('d') + 1, render() {} });</script>
</body></html>`;
export function chromeArgs() {   // the producer's software-GL and text flags, minus its BeginFrame capture control
  return ["--enable-features=CanvasDrawElement", "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=angle", "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader", "--disable-gpu-compositing", "--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb", "--force-device-scale-factor=1"];
}
const shuffle = (a, seed) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { seed = (seed * 16807) % 2147483647; const j = seed % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export async function verify(names, { log = console.log } = {}) {
  const { chromium } = await import("playwright");
  const { headlessShell } = await import("./renderers/hyperframes.mjs");
  const { copyKit } = await import("./kit_files.mjs");
  const { createFileServer } = await import("@hyperframes/producer");
  const meta = index().blocks, tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rw-blocks-"));
  // one hf folder per frame size (the producer reads the root's static size), served by the producer's own file server,
  // which injects the HyperFrames runtime, its GSAP stub and the render bridge into index.html exactly as a render does
  const servers = {}, base = {};
  for (const n of names) {
    const m = meta[n], k = `${m.width}x${m.height}`, hf = path.join(tmp, k);
    if (!servers[k]) {
      copyKit(hf);
      fs.writeFileSync(path.join(hf, "index.html"), PAGE.replace('data-width="1920" data-height="1080"', `data-width="${m.width}" data-height="${m.height}"`));
      servers[k] = await createFileServer({ projectDir: hf, fps: 30 });
      base[k] = servers[k].url;
    }
    installBlock(n, hf);
  }
  const browser = await chromium.launch({ executablePath: headlessShell(), args: chromeArgs() });
  const lab = await browser.newPage();
  // pixels off by > 2/255 between two screenshots, and pixels that differ from the corner (is anything drawn at all)
  const diff = (a, b) => lab.evaluate(async ([a, b]) => {
    const im = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [A, B] = await Promise.all([im(a), im(b)]);
    const px = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
    const p = px(A), q = px(B); let n = 0, ink = 0;
    for (let k = 0; k < p.length; k += 4) {
      if (Math.max(Math.abs(p[k] - q[k]), Math.abs(p[k + 1] - q[k + 1]), Math.abs(p[k + 2] - q[k + 2])) > 2) n++;
      if (Math.max(Math.abs(p[k] - p[0]), Math.abs(p[k + 1] - p[1]), Math.abs(p[k + 2] - p[2])) > 8) ink++;
    }
    return { n, ink: ink / (p.length / 4) };
  }, [a, b]);
  const result = {};
  const one = async (n) => {
    const m = meta[n], ts = [0.05, 0.2, 0.4, 0.6, 0.8, 0.97].map((f) => +(f * m.duration).toFixed(3));
    const errs = [], url = base[`${m.width}x${m.height}`], host = new URL(url).host;
    const open = async (s0) => {
      const p = await browser.newPage({ viewport: { width: m.width, height: m.height } });
      p.on("pageerror", (e) => errs.push("page error: " + e.message.split("\n")[0]));
      p.on("requestfailed", (r) => { if (!/^data:/.test(r.url())) errs.push("request failed: " + r.url()); });
      p.on("response", (r) => { if (r.status() >= 400) errs.push(`${r.status()} ${r.url().replace(/^http:\/\/[^/]+\//, "")}`); });
      await p.route((u) => !/^(data|blob):/.test(u.href) && u.host !== host, (r) => { errs.push("network: " + r.request().url()); r.abort(); });
      await p.goto(`${url}/index.html?b=${n}&d=${m.duration}&w=${m.width}&h=${m.height}&s=${s0}`);
      // poll from node: the HyperFrames runtime takes over the page's timers
      const ready = () => p.evaluate(() => !!window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0);
      for (let i = 0; !(await ready()); i++) { if (i > 300 || errs.length) throw new Error("HyperFrames runtime never became ready"); await new Promise((r) => setTimeout(r, 100)); }
      await p.evaluate(async () => { await window.READY; for (let i = 0; i < 3; i++) await Promise.all(Object.values((window.__hf || {}).buildReady || {})); });
      return p;
    };
    const shots = async (p, order, s0) => {
      const out = {};
      for (const t0 of order) {
        const t = t0 + s0;
        // re-raster after the seek (as engine.js's window.render does): a live page keeps stale compositor tiles that
        // the producer's BeginFrame capture doesn't, so without it the check measures Chromium, not the block
        await p.evaluate(async (t) => { window.__hf.seek(t); await window.__hfWaitForSeekCompletion?.();
          await Promise.all(Object.values((window.__hf || {}).buildReady || {}));
          const b = document.body.style, d = b.display; b.display = 'none'; void document.body.offsetHeight; b.display = d; }, t);
        out[t0] = "data:image/png;base64," + (await p.screenshot()).toString("base64");
      }
      return out;
    };
    try {
      // page 2 mounts the block 7 s later in the film: anything seeked with film time instead of the block's own shows up
      const [p1, p2] = [await open(0), await open(7)];
      const [a, b] = [await shots(p1, shuffle(ts, 7), 0), await shots(p2, shuffle(ts, 99991), 7)];
      await p1.close(); await p2.close();
      let ink = 0;
      for (const t of ts) {
        const d = await diff(a[t], b[t]); ink = Math.max(ink, d.ink);
        if (d.n > 64) errs.push(`t=${t}: ${d.n} px differ between seek orders / mount times`);
      }
      if (ink < 0.0005) errs.push("blank: nothing drawn in any frame");
    } catch (e) { errs.push(e.message.split("\n")[0]); }
    result[n] = errs.length ? [...new Set(errs)].slice(0, 3).join("; ") : null;
    log(`${result[n] ? "FAIL" : "ok  "} ${n}${result[n] ? " — " + result[n] : ""}`);
  };
  const queue = [...names];
  await Promise.all(Array.from({ length: Number(process.env.PAGES || 4) }, async () => { while (queue.length) await one(queue.shift()); }));
  await browser.close();
  for (const s of Object.values(servers)) s.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  return result;
}

// ── catalog files ──────────────────────────────────────────────────────────
function writeCatalog(idx) {
  fs.writeFileSync(path.join(BLOCKS, "index.json"), JSON.stringify(idx, null, 1) + "\n");
  const sup = Object.entries(idx.blocks).filter(([, b]) => b.status === "supported");
  const uns = Object.entries(idx.blocks).filter(([, b]) => b.status !== "supported");
  const size = (n) => walk(path.join(BLOCKS, n)).reduce((s, f) => s + fs.statSync(path.join(BLOCKS, n, f)).size, 0);
  fs.writeFileSync(path.join(BLOCKS, "CATALOG.md"), `# HyperFrames blocks (vendored, converted)\n\n` +
    `${sup.length} of ${sup.length + uns.length} upstream blocks (HyperFrames v${idx.version}, Apache-2.0) pass \`node tools/blocks.mjs verify\`. ` +
    `Install one with \`reelwright add <project> <name>\`, mount it with \`KIT.mount('<name>', { start, dur, vars })\`. ` +
    `Renderer: hyperframes only (pvk films are refused). The rest, with reasons: [UNSUPPORTED.md](UNSUPPORTED.md).\n\n` +
    `| Block | Title | Duration | Size | Tags | Notes |\n|---|---|---|---|---|---|\n` +
    sup.map(([n, b]) => `| \`${n}\` | ${b.title} | ${b.duration} s | ${b.width}×${b.height} | ${b.tags.join(", ")} | ${Math.round(size(n) / 1024)} KB${b.notes.length ? "; " + b.notes.join("; ") : ""} |`).join("\n") + "\n");
  fs.writeFileSync(path.join(BLOCKS, "UNSUPPORTED.md"), `# Unsupported HyperFrames blocks\n\n` +
    `${uns.length} upstream blocks are not vendored. \`reelwright add <name>\` prints the reason and exits 1.\n\n| Block | Reason |\n|---|---|\n` +
    uns.map(([n, b]) => `| \`${n}\` | ${b.reason.replace(/\|/g, "\\|")} |`).join("\n") + "\n");
}

async function importAll(up) {
  up = path.resolve(up);
  if (!isDir(up)) { console.error("usage: node tools/blocks.mjs import <upstream registry/blocks dir>"); process.exit(1); }
  fs.rmSync(BLOCKS, { recursive: true, force: true }); fs.mkdirSync(BLOCKS, { recursive: true });
  const idx = { version: "0.9.19", blocks: {} };
  for (const n of fs.readdirSync(up).filter((d) => isDir(path.join(up, d))).sort()) {
    const c = convert(path.join(up, n), n);
    if (c.reason) { idx.blocks[n] = { status: "unsupported", reason: c.reason }; continue; }
    await scope(c);
    const out = path.join(BLOCKS, n);
    fs.mkdirSync(out, { recursive: true });
    const html = render(c, n), urls = [...new Set((html.match(/https?:\/\/[^\s"'`)<>]+/g) || []).filter((u) => !/^http:\/\/www\.w3\.org\//.test(u)))];
    if (urls.length) { fs.rmSync(out, { recursive: true }); idx.blocks[n] = { status: "unsupported", reason: `remote URL left after conversion: ${urls.slice(0, 2).join(", ")}` }; continue; }
    fs.writeFileSync(path.join(out, n + ".html"), html);
    fs.copyFileSync(path.join(up, n, "registry-item.json"), path.join(out, "registry-item.json"));
    for (const f of c.used) { fs.mkdirSync(path.dirname(path.join(out, f)), { recursive: true }); fs.copyFileSync(path.join(up, n, f), path.join(out, f)); }
    idx.blocks[n] = { status: "supported", title: c.item.title, description: c.item.description, duration: c.item.duration, width: c.W, height: c.H,
      tags: c.item.tags || [], id: c.id, vars: c.vars.map(({ id, default: d }) => ({ id, default: d })), fonts: c.slugs, notes: c.notes };
  }
  writeCatalog(idx);
  const names = Object.keys(idx.blocks).filter((n) => idx.blocks[n].status === "supported");
  console.log(`converted ${names.length}; verifying…`);
  const res = await verify(names);
  for (const [n, r] of Object.entries(res)) if (r) { idx.blocks[n] = { status: "unsupported", reason: "failed verification: " + r }; fs.rmSync(path.join(BLOCKS, n), { recursive: true }); }
  writeCatalog(idx);
  const ok = Object.values(idx.blocks).filter((b) => b.status === "supported").length;
  const mb = walk(BLOCKS).reduce((n, f) => n + fs.statSync(path.join(BLOCKS, f)).size, 0) / 2 ** 20;
  console.log(`${ok} supported, ${Object.keys(idx.blocks).length - ok} unsupported, ${mb.toFixed(1)} MB in ${posix(path.relative(ROOT, BLOCKS))}`);
}

// ── render: the real producer, blocks one after another in a scratch hf project ─
async function renderBlocks(out, names) {
  const { copyKit } = await import("./kit_files.mjs");
  const meta = index().blocks, dir = fs.mkdtempSync(path.join(os.tmpdir(), "rw-blocks-render-")), hf = path.join(dir, "hf");
  copyKit(hf);
  let t = 0;
  const film = [], ts = [];
  for (const n of names) {
    const m = meta[n]; installBlock(n, hf);
    film.push(`KIT.css(KIT.mount(${JSON.stringify(n)}, { start: ${t}, dur: ${m.duration} }), { transform: 'scale(${Math.min(1920 / m.width, 1080 / m.height)})', transformOrigin: '0 0' });`);
    ts.push(+(t + m.duration * 0.3).toFixed(1), +(t + m.duration * 0.7).toFixed(1)); t += m.duration;
  }
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify({ renderer: "hyperframes", fps: 10, title: "blocks" }));
  fs.writeFileSync(path.join(hf, "kit-data.js"), "window.PROJECT={fps:10};\n");
  fs.writeFileSync(path.join(hf, "film.js"), film.join("\n") + `\nKIT.start({ dur: ${t}, render() {} });\n`);
  fs.writeFileSync(path.join(hf, "index.html"), PAGE.replace(/<script>const Q[^]*?<\/script>/, '<script src="kit-data.js"></script>')
    .replace(/<script>const S0[^]*?<\/script>/, '<script src="film.js"></script>'));
  const r = spawnSync(process.execPath, [path.join(ROOT, "tools", "render.mjs"), dir, "stills", ts.join(",")], { stdio: "inherit" });
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.existsSync(path.join(dir, "stills")) ? fs.readdirSync(path.join(dir, "stills")) : []) fs.copyFileSync(path.join(dir, "stills", f), path.join(out, f));
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`stills → ${out} (${names.map((n, i) => `${n} @ ${ts[2 * i]}, ${ts[2 * i + 1]}`).join("; ")})`);
  if (r.status) process.exit(r.status);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === "import") await importAll(a[0] || "");
  else if (cmd === "verify") {
    const all = Object.keys(index().blocks).filter((n) => index().blocks[n].status === "supported");
    const res = await verify(a.length ? a : all);
    const bad = Object.values(res).filter(Boolean).length;
    console.log(bad ? `${bad} FAIL` : `all ${Object.keys(res).length} ok`); process.exit(bad ? 1 : 0);
  } else if (cmd === "render" && a.length > 1) await renderBlocks(path.resolve(a[0]), a.slice(1));
  else { console.log("usage: node tools/blocks.mjs import <dir> | verify [names…] | render <outdir> <names…>"); process.exit(1); }
}

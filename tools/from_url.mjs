// `reelwright from-url` and `theme-from`: a film project or a draft theme from a page you own or may use.
//   fromUrl(url, name)       capture → projects/<name>/ (HyperFrames, tools/from_url/ template), returns { dir, lines }
//   themeFrom(src, name)     page or image → themes/<name>.css
// The script is drafted by rules, not AI: see draftLines. Text with data-like numbers is skipped, because those are the
// site's claims (not checked here) and the illustrative QA gate would want a label on them.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { capture } from "./capture_site.mjs";
import { draftTheme, imageFacts, themeCss } from "./theme_from.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DATA = /[$€£¥₹]\s?\d|\d\s?(%|×|x\b|[kKMB]\b)|\d{1,3}(,\d{3})+|\d\.\d/;   // same as tools/qa_page.mjs
const NAV = /^(faq|blog|docs?|documentation|pricing|sponsors?|partners?|newsletter|contact|resources|community|team|about|careers|legal|privacy|terms|changelog|news|support|menu|search|sign ?in|log ?in|get started)\b/i;
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const clean = (s = "") => s.replace(/[^\p{L}\p{N}\s.,:;!?'’&()/+-]/gu, " ").replace(/\s+/g, " ").trim();
// first sentence, ≤ max words, ending in a full stop; null if too long, empty, or it shows a data-like number
const sentence = (s, max) => {
  const t = clean(s).split(/(?<=[.!?])\s/)[0]?.replace(/[\s.,:;!?-]+$/, "");
  return t && words(t) <= max && !DATA.test(t) ? t + "." : null;
};
export const hostOf = (url) => new URL(url).hostname.replace(/^www\./, "") || "local-page";   // file:// pages (CI) have no host

export function draftLines(f, host) {
  const h1 = f.headings.find((h) => h.level === 1);
  const titleHead = f.title.split(/\s[|–—:-]\s/)[0];
  const name = [f.ogTitle, f.siteName, titleHead].map(clean).find((s) => s && words(s) <= 3) || host;
  const hook = [h1?.text, f.ogTitle, titleHead].map((s) => sentence(s, 12)).find(Boolean) || `Meet ${name}.`;
  const what = [f.description, h1?.body, ...f.paragraphs].map((s) => sentence(s, 20)).find((s) => s && words(s) >= 4 && s !== hook);
  const seen = new Set(), features = [];
  for (const h of f.headings) {
    const title = clean(h.text).replace(/[.:]$/, "");
    if (h.level < 2 || !h.shot || features.length === 3 || NAV.test(title) || DATA.test(title)) continue;
    if (words(title) < 2 || words(title) > 9 || seen.has(title.toLowerCase())) continue;
    seen.add(title.toLowerCase());
    const body = sentence(h.body, Math.min(14, 20 - words(title)));
    features.push({ id: `f${features.length + 1}`, title, body: body || "", shot: h.shot });
  }
  const btn = f.buttons.map((b) => clean(b.text)).find((t) => /^[\p{L} '’]+$/u.test(t) && words(t) <= 4 && (words(t) > 1 || t.length > 4)
    && !/^(search|menu|close|by|skip)/i.test(t));
  const cta = btn ? `${btn[0].toUpperCase() + btn.slice(1)} at ${host}` : `Visit ${host}`;
  const lines = [{ id: "hook", gap: 0, text: hook }];
  if (what) lines.push({ id: "what", gap: 0.7, text: what });
  for (const x of features) lines.push({ id: x.id, gap: 0.8, text: x.body ? `${x.title}. ${x.body}` : `${x.title}.` });
  lines.push({ id: "cta", gap: 0.8, text: cta + "." });
  return { lines, site: { name, host, what: what?.replace(/\.$/, "") || "", hero: "site/hero.jpg",
    features: features.map((x) => ({ ...x, shot: "site/" + x.shot, body: x.body.replace(/\.$/, "") })), cta } };
}

export async function fromUrl(url, name) {
  const host = hostOf(url);
  name ||= host.replace(/[^\w]+/g, "-");
  if (!/^[\w-]+$/.test(name)) throw new Error(`project name "${name}": use letters, digits, - and _`);
  const dir = path.join(ROOT, "projects", name), hf = path.join(dir, "hf"), shots = path.join(hf, "site");
  if (fs.existsSync(dir)) throw new Error(`projects/${name} already exists — edit it and run: reelwright all ${name}`);
  console.log(`capturing ${url} (read-only: non-GET requests are answered locally) …`);
  const facts = await capture(url, shots);
  const { lines, site } = draftLines(facts, host);
  const used = new Set(["hero.jpg", "site.json", ...site.features.map((x) => path.basename(x.shot))]);
  for (const f of fs.readdirSync(shots)) if (!used.has(f)) fs.rmSync(path.join(shots, f));
  const d = draftTheme(facts);
  for (const f of ["index.html", "film.js"]) fs.copyFileSync(path.join(ROOT, "tools", "from_url", f), path.join(hf, f));
  fs.writeFileSync(path.join(hf, "site.js"), `// drafted by reelwright from-url from ${url}: on-screen copy and shots (edit freely)\nwindow.SITE = ${JSON.stringify(site, null, 1)};\n`);
  fs.writeFileSync(path.join(dir, "brand.json"), JSON.stringify({ colors: d.tokens, fonts: d.fonts, tone: `drafted from ${url}: ${d.notes.join("; ")}` }, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify({
    title: `${site.name} — from ${host}`, source: url, renderer: "hyperframes", style: d.base, out: `out/${name}.mp4`, fps: 30,
    voice: "en-US-AndrewNeural", rate: "+4%", pitch: "+0Hz", lead: 0.8, tail: 2.4, snapToBeat: true, loudness: -14,
    music: { bpm: 100, duck_db: -10, style: "drive", drop_bar: 2 }, lines }, null, 2) + "\n");
  return { dir, name, lines };
}

const IMG = /\.(png|jpe?g|webp)$/i;
export async function themeFrom(src, name) {
  const isUrl = /^(https?|file):\/\//i.test(src);
  if (!isUrl && !(IMG.test(src) && fs.existsSync(src))) throw new Error(`${src}: give an http(s) URL or a .png/.jpg/.webp file`);
  name ||= (isUrl ? hostOf(src) : path.basename(src).replace(IMG, "")).replace(/[^\w]+/g, "-");
  if (!/^[\w-]+$/.test(name)) throw new Error(`theme name "${name}": use letters, digits, - and _`);
  const out = path.join(ROOT, "themes", name + ".css");
  if (fs.existsSync(out)) throw new Error(`themes/${name}.css already exists — pick another name`);
  let facts;
  if (isUrl) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-"));
    try { facts = await capture(src, tmp, { shots: false }); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  } else facts = await imageFacts(src);
  const d = draftTheme(facts);
  if (!isUrl) d.notes.push("fonts: not read from an image — kept from the base theme");
  fs.writeFileSync(out, themeCss(name, isUrl ? src : path.basename(src), d));
  return { out, name, d };
}

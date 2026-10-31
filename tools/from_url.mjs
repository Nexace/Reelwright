// `reelwright from-url` and `theme-from`: a film project or a draft theme from a page you own or may use.
//   fromUrl(url, name)       capture → projects/<name>/ (HyperFrames, tools/from_url/ template), returns { dir, lines, numbers }
//   themeFrom(src, name)     page or image → themes/<name>.css
// The script is drafted by rules, not AI: see draftLines. Text with data-like numbers is skipped, because those are the
// site's claims (not checked here) and the illustrative QA gate would want a label on them. Numbers inside screenshots
// are listed for approval, and the film credits the source ("Source: <host>") while such a shot is on screen.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { capture } from "./capture_site.mjs";
import { draftTheme, imageFacts, themeCss } from "./theme_from.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
// numbers that read as data (same as tools/qa_page.mjs): 40%, $12, 3×, 2.5k, 1,200, 4.8 — not versions (v8.3.4, 3.10.2)
const DATA = /[$€£¥₹]\s?\d|\d\s?(%|×|x\b|[kKMB]\b)|\d{1,3}(,\d{3})+|\d\.\d/, VER = /\bv?\d+(\.\d+){2,}\S*|\bv\d+(\.\d+)?\b/g;
const isData = (s = "") => DATA.test(s.replace(VER, ""));
// headings that are navigation, legal, social proof or sign-up chrome, not product features
const NAV = /^(faq|frequently asked|blog|docs?|documentation|pricing|plans|sponsors?|backers|partners?|newsletter|subscribe|contact|resources|community|team|about|careers|jobs|legal|privacy|terms|cookies?|changelog|releases?|news|support|menu|search|sign ?(in|up)|log ?in|get started|getting started|quick ?start|install|footer|follow|social|testimonials?|what people|loved by|trusted by|used by|supported by|sponsored|built with|made with|showcase|alternatives|browse|don.?t take|join|stay|on this page|table of contents|skip)\b|cookie|consent/i;
const CTA = /^(get|getting started|start|try|install|download|read|learn|explore|view|see|join|create|launch|build|begin|quick ?start|deploy|use)\b/i;
const CTA1 = /^(get started|getting started|start|try|install|download|deploy|quick ?start)\b/i;   // preferred
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const clean = (s = "") => s.replace(/[^\p{L}\p{N}\s.,:;!?'’&()/+%$€£¥₹×-]/gu, " ").replace(/\s+/g, " ").trim();
const tidy = (s) => (/\p{Lu}{4}/u.test(s) && s === s.toUpperCase() ? s[0] + s.slice(1).toLowerCase() : s);   // ALL CAPS → Sentence
const cap = (s) => s && s[0].toUpperCase() + s.slice(1);
const key = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
// a sentence ends at . ! ? and a space, but not after e.g. / i.e. / etc. / Dr. and the like
const ENDS = /(?<!\b(?:e\.g|i\.e|etc|vs|cf|approx|incl|Dr|Mr|Mrs|Ms|St|Inc|Ltd|Co|No)\.)(?<=[.!?])\s/i;
// first sentence (or the whole text if `whole` and it fits), min..max words, ending in . or ?. Too long: cut at the
// last comma or dash that leaves ≥ 8 words. null if it doesn't fit or shows a data-like number.
const sentence = (s, max, min = 1, whole = false) => {
  const c = tidy(clean(s));
  let t = (whole && words(c) <= max ? c : c.split(ENDS)[0] || "").replace(/[\s.,:;!-]+$/, "");
  if (words(t) > max) {
    const cut = [...t.matchAll(/,\s|\s[—–-]\s/g)].map((m) => t.slice(0, m.index)).filter((x) => words(x) >= 8 && words(x) <= max).pop();
    if (cut) t = cut;
  }
  return t && words(t) >= min && words(t) <= max && !isData(t) && /^[\p{L}\p{N}]/u.test(t) ? cap(/[?!]$/.test(t) ? t : t + ".") : null;
};
// body copy under a heading: a real sentence, so it must start with a capital (not "replaces npm · yarn")
const body = (s, max) => { const t = sentence(s, max, 4); return t && /^\p{Lu}/u.test(clean(s)) ? t : null; };
const nums = (s = "") => [...new Set((s.replace(VER, "").match(/\S*\d\S*/g) || []).filter(isData))].slice(0, 6);
export const hostOf = (url) => new URL(url).hostname.replace(/^www\./, "");   // "" for file:// pages

export function draftLines(f, host) {
  const head = (s = "") => clean(s.split(/\s[|–—:·•-]\s/)[0]);   // "Name | tagline" → first part
  const h1s = f.headings.filter((h) => h.level === 1), titleHead = head(f.title);
  const tail = (s = "") => clean(s.split(/\s[|–—:·•-]\s/).at(-1));   // "tagline | Name" → last part
  const name = [head(f.ogTitle), f.siteName, titleHead, tail(f.ogTitle), tail(f.title)].map(clean).find((s) => s && words(s) <= 3)
    || host || titleHead.split(" ").slice(0, 3).join(" ") || "this site";
  const seen = new Set(), fresh = (s) => s && ![...seen].some((k) => k.includes(key(s)) || key(s).includes(k)) && seen.add(key(s));
  const hook = [...h1s.map((h) => h.text), head(f.ogTitle), titleHead].map((s) => sentence(s, 14, 3, true)).find(fresh)
    || (fresh(`Meet ${name}.`), `Meet ${name}.`);
  // what it is: a "<Name> is …" sentence anywhere on the page, else the description, else "<Name> has/helps/lets …"
  // (not "has been": that's a testimonial), else the h1's paragraph
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const IS = new RegExp(`^${esc}\\s+(is|are)\\b`, "i"), DOES = new RegExp(`^${esc}\\s+(has (?!been)|helps|lets|makes|gives|brings|turns|builds)`, "i");
  const pool = [f.description, ...f.paragraphs, ...f.headings.map((h) => h.body)];
  const what = [...pool.filter((s) => IS.test(clean(s))), f.description, ...pool.filter((s) => DOES.test(clean(s))), ...h1s.map((h) => h.body)]
    .map((s) => body(s, 25)).find(fresh);
  const features = [];
  for (const h of f.headings) {
    if (features.length === 3) break;
    const title = sentence(h.text, 9, 2)?.replace(/\.$/, "");
    if (h.level < 2 || !h.shot || !title || NAV.test(title) || !fresh(title)) continue;
    const b = body(h.body, Math.min(16, 24 - words(title)));
    features.push({ id: `f${features.length + 1}`, title, body: b && fresh(b) ? b : "", shot: h.shot, text: h.shotText || "" });
  }
  const btns = f.buttons.map((b) => tidy(clean(b.text))).filter((t) => /^[\p{L} '’]+$/u.test(t) && words(t) <= 4 && CTA.test(t));
  let btn = cap(btns.find((t) => CTA1.test(t)) || btns[0] || "").replace(/^Getting started/i, "Get started");
  if (btn && words(btn) === 1) btn += " " + name;   // "Install" → "Install Bun"
  const cta = host ? (btn ? `${btn} at ${host}` : `Visit ${host}`) : btn ? `${btn.replace(new RegExp(`\\s${esc}$`), "")} with ${name}` : `Try ${name}`;
  const lines = [{ id: "hook", gap: 0, text: hook }];
  if (what) lines.push({ id: "what", gap: 0.7, text: what });
  const stop = (t) => (/[?!]$/.test(t) ? t : t + ".");
  for (const x of features) lines.push({ id: x.id, gap: 0.8, text: stop(x.title) + (x.body ? " " + x.body : "") });
  lines.push({ id: "cta", gap: 0.8, text: cta + "." });
  const numbers = [{ id: "what", nums: what ? nums(f.heroText) : [] }, ...features.map((x) => ({ id: x.id, nums: nums(x.text) }))].filter((n) => n.nums.length);
  return { lines, numbers, site: { name, host, credit: host || name, what: what?.replace(/\.$/, "") || "", hero: "site/hero.jpg",
    heroText: f.heroText || "", heroCredit: isData(f.heroText), cta,
    features: features.map((x) => ({ ...x, shot: "site/" + x.shot, body: x.body.replace(/\.$/, ""), credit: isData(x.text) })) } };
}

export async function fromUrl(input, name) {
  name ||= (hostOf(input) || "local-page").replace(/[^\w]+/g, "-");
  if (!/^[\w-]+$/.test(name)) throw new Error(`project name "${name}": use letters, digits, - and _`);
  const dir = path.join(ROOT, "projects", name), hf = path.join(dir, "hf"), shots = path.join(hf, "site");
  if (fs.existsSync(dir)) throw new Error(`projects/${name} already exists — edit it and run: reelwright all ${name}`);
  console.log(`capturing ${input} (read-only: writes are answered locally, no popups, workers or sockets) …`);
  // capture into a temp dir: a failed capture leaves no half-made project behind
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-"));
  let facts;
  try { facts = await capture(input, tmp); }
  catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); throw e; }
  const url = facts.url, host = hostOf(url);   // after redirects, no query or fragment
  const { lines, site, numbers } = draftLines(facts, host);
  const used = ["hero.jpg", "site.json", ...site.features.map((x) => path.basename(x.shot))];
  fs.mkdirSync(shots, { recursive: true });
  for (const f of used) fs.copyFileSync(path.join(tmp, f), path.join(shots, f));
  fs.rmSync(tmp, { recursive: true, force: true });
  const d = draftTheme(facts);
  for (const f of ["index.html", "film.js"]) fs.copyFileSync(path.join(ROOT, "tools", "from_url", f), path.join(hf, f));
  fs.writeFileSync(path.join(hf, "site.js"), `// drafted by reelwright from-url from ${url}: on-screen copy and shots (edit freely)\nwindow.SITE = ${JSON.stringify(site, null, 1)};\n`);
  fs.writeFileSync(path.join(dir, "brand.json"), JSON.stringify({ colors: d.tokens, fonts: d.fonts, tone: `drafted from ${url}: ${d.notes.join("; ")}` }, null, 2) + "\n");
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify({
    title: host ? `${site.name} — from ${host}` : site.name, source: url, renderer: "hyperframes", style: d.base, out: `out/${name}.mp4`, fps: 30,
    voice: "en-US-AndrewNeural", rate: "+4%", pitch: "+0Hz", lead: 0.8, tail: 2.4, snapToBeat: true, loudness: -14,
    music: { bpm: 100, duck_db: -10, style: "drive", drop_bar: 2 }, lines }, null, 2) + "\n");
  if (lines.length < 3) console.warn(`only ${lines.length} lines drafted: the page had little usable text — write the script by hand`);
  return { dir, name, lines, numbers };
}

const IMG = /\.(png|jpe?g|webp)$/i;
export async function themeFrom(src, name) {
  const isUrl = /^(https?|file):\/\//i.test(src);
  if (!isUrl && !(IMG.test(src) && fs.existsSync(src))) throw new Error(`${src}: give an http(s) URL or a .png/.jpg/.webp file`);
  name ||= ((isUrl ? hostOf(src) : path.basename(src).replace(IMG, "")) || "local-page").replace(/[^\w]+/g, "-");
  if (!/^[\w-]+$/.test(name)) throw new Error(`theme name "${name}": use letters, digits, - and _`);
  const out = path.join(ROOT, "themes", name + ".css");
  if (fs.existsSync(out)) throw new Error(`themes/${name}.css already exists — pick another name`);
  let facts;
  if (isUrl) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reelwright-"));
    try { facts = await capture(src, tmp, { shots: false }); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    src = facts.url;
  } else facts = await imageFacts(src);
  const d = draftTheme(facts);
  if (!isUrl) d.notes.push("fonts: not read from an image — kept from the base theme");
  fs.writeFileSync(out, themeCss(name, isUrl ? src : path.basename(src), d));
  return { out, name, d };
}

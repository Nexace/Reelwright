// tools/captions.mjs — feed a film's own words to the HyperFrames caption-style components (registry/components/caption-*, tag
// caption-style). The one transcript module: `reelwright captions` and the self-checks read it.
//   transcriptFrom(timeline)         → [{ text, start, end }, …]   timeline.json's VO words (reelwright audio/info), in film time, in order
//   transcriptFromTimeline(timeline) → the same (the name tools/caption_transcript.mjs used; that file is merged here)
//   writeTranscript(proj)            → <proj>/transcript.json       the same array, so a component or a tool outside reelwright can read it
//   captionComponents()              → names of the caption-* components that take a transcript (caption-blend-difference is a CSS blend recipe)
//   adaptCaption(html, words)        → html                         a vendored caption-* component with ITS demo script swapped for `words`
//   retarget(html, words, duration)  → html                         the older adapter, `captions`' fallback: the word list replaced, DURATION and
//                                          data-duration set to `duration`, KEYWORDS (emphasis) re-picked from the new words (the long ones),
//                                          and the CDN gsap <script src> dropped (KIT.block re-creates inline scripts only, so the film loads
//                                          vendor/gsap itself, as for every KIT.gsap film)
// The components hard-code a 28-word demo script (an array named WORDS, W or TRANSCRIPT) and, in 8 of them, group indexes into it
// (RAW_GROUPS pairs, GROUPS {wordStart,wordEnd,start,end}, or BLOCKS of line1/line2 or behind/front word indexes). adaptCaption
// replaces the array, regenerates the index lists with the same rule glitch-rgb uses (a group ends at a sentence end, a pause over
// 0.28 s, four words or 21 characters) and sets data-duration to the last word plus a 0.6 s tail. camera-follow's <template> wrapper is
// removed (KIT.block only runs scripts that are not inside a template). Components with no timed word list throw.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COMPONENTS = path.join(path.resolve(fileURLToPath(new URL("..", import.meta.url))), "vendor", "hyperframes", "registry", "components");
const r3 = (x) => Math.round(x * 1000) / 1000;

export function transcriptFrom(tl) {
  const out = [];
  for (const v of Object.values(tl.VO || {}).sort((a, b) => a.start - b.start))
    for (const w of v.words || []) out.push({ text: String(w.w), start: +w.t.toFixed(3), end: +(w.t + w.d).toFixed(3) });
  return out;
}
export const transcriptFromTimeline = transcriptFrom;

export function writeTranscript(proj) {
  const words = transcriptFrom(JSON.parse(fs.readFileSync(path.join(proj, "timeline.json"), "utf8")));
  if (!words.length) throw new Error(`${proj}/timeline.json has no VO words (run \`reelwright audio\` first)`);
  fs.writeFileSync(path.join(proj, "transcript.json"), JSON.stringify(words, null, 1));
  return words;
}

export const captionComponents = () => fs.readdirSync(COMPONENTS).filter((n) => n.startsWith("caption-") && n !== "caption-blend-difference").sort();

export function groupWords(words) {   // → [[first, last], …]
  const g = []; let start = 0, chars = 0;
  words.forEach((w, i) => {
    chars += w.text.length + 1;
    const gap = i + 1 < words.length ? words[i + 1].start - w.end : 0;
    if (/[.!?]$/.test(w.text) || gap > 0.28 || i - start >= 3 || chars >= 21 || i === words.length - 1) { g.push([start, i]); start = i + 1; chars = 0; }
  });
  return g;
}

const lit = (words) => "[\n" + words.map((w) => `          { text: ${JSON.stringify(w.text)}, start: ${w.start}, end: ${w.end} },`).join("\n") + "\n        ]";
// replace the first `var <NAME> = [ … ];` whose body is balanced, keeping everything else
function swapArray(html, name, body) {
  const m = new RegExp(`var ${name} = \\[`).exec(html);
  if (!m) return null;
  let i = m.index + m[0].length - 1, depth = 0;
  for (let j = i; j < html.length; j++) {
    if (html[j] === "[") depth++; else if (html[j] === "]" && --depth === 0) return html.slice(0, i) + body + html.slice(j + 1);
  }
  return null;
}

export function adaptCaption(html, words) {
  if (!words.length) throw new Error("no words");
  const groups = groupWords(words);
  let out = null, used = "";
  for (const n of ["WORDS", "TRANSCRIPT", "W"]) if ((out = swapArray(html, n, lit(words)))) { used = n; break; }
  if (!out) throw new Error("this component has no word array (WORDS / TRANSCRIPT / W)");
  const next = (gi) => (gi + 1 < groups.length ? words[groups[gi + 1][0]].start : Infinity);
  const gEnd = (gi, we) => r3(Math.min(words[we].end + 0.3, next(gi) - 0.05));
  const fixed = (n, body) => { const r = swapArray(out, n, body); if (r) out = r; };
  fixed("RAW_GROUPS", "[\n" + groups.map(([a, b]) => `          [${a}, ${b}],`).join("\n") + "\n        ]");
  if (/var GROUPS = \[\s*\{/.test(out)) fixed("GROUPS", "[\n" + groups.map(([a, b], gi) => `          { wordStart: ${a}, wordEnd: ${b}, start: ${words[a].start}, end: ${gEnd(gi, b)} },`).join("\n") + "\n        ]");
  if (/var BLOCKS = \[/.test(out)) {
    const longest = (ix) => ix.reduce((b, i) => (words[i].text.length > words[b].text.length ? i : b), ix[0]);
    const body = groups.map(([a, b]) => {
      const ix = Array.from({ length: b - a + 1 }, (_, k) => a + k);
      if (/line1:/.test(out.slice(out.indexOf("var BLOCKS")))) {   // editorial-emphasis: up to 3 words on line 1, the rest on line 2; the longest word is emphasised
        const em = ix.length > 1 && words[longest(ix)].text.length >= 6 ? longest(ix) : -1, tok = (i) => `[${i}, "${i === em ? "e" : "n"}"]`;
        const l1 = ix.slice(0, 3), l2 = ix.slice(3);
        return `        { line1: [${l1.map(tok).join(", ")}], line2: ${l2.length ? `[${l2.map(tok).join(", ")}]` : "null"} },`;
      }
      const behind = ix.length > 1 && words[longest(ix)].text.length >= 6 ? longest(ix) : -1;   // parallax-layers: the longest word sits behind the rest
      const front = ix.filter((i) => i !== behind);
      return `        { behind: ${behind >= 0 ? `[[${behind}]]` : "null"}, front: ${front.length ? `[${front.map((i) => `[${i}]`).join(", ")}]` : "null"} },`;
    }).join("\n");
    fixed("BLOCKS", "[\n" + body + "\n      ]");
  }
  const dur = Math.ceil((words.at(-1).end + 0.6) * 10) / 10;
  out = out.replace(/^\s*<template>\s*$/m, "").replace(/^\s*<\/template>\s*$/m, "");   // camera-follow's sub-composition wrapper: KIT.block runs scripts only outside a <template>
  return out.replace(/data-duration="[\d.]+"/, `data-duration="${dur}"`);
}

// the older adapter (`captions` falls back to it when adaptCaption throws)
export function retarget(html, words, duration) {
  const re = /var (TRANSCRIPT|WORDS|W) = \[[\s\S]*?\n\s*\];/;
  const m = re.exec(html);
  if (!m || !/start:\s*[\d.]+/.test(m[0])) throw new Error("this component has no timed word list (`var TRANSCRIPT|WORDS|W = [{ text, start, end }]`) to replace");
  const parallax = /var BLOCKS = \[\s*\{ behind:/.test(html);   // caption-parallax-layers: per group one emphasis word behind, the rest in front
  if (/var BLOCKS = \[/.test(html) && !parallax) throw new Error("this component's layout is hand-pinned to the sample words by index (BLOCKS)");
  const clean = (s) => s.replace(/[<>&"]/g, "");
  const list = words.map((w) => ({ text: clean(w.text), start: w.start, end: w.end }));
  const long = list.map((w, i) => [w.text.replace(/[^\p{L}\p{N}]/gu, ""), i]).filter(([t]) => t.length >= 7).slice(0, 8);
  const groups = [];   // index groups of up to 4 words, ended early by a sentence stop (the components that pre-group by index)
  for (let s = 0, i = 0; i < list.length; i++) if (i - s === 3 || /[.!?]$/.test(list[i].text) || i === list.length - 1) { groups.push([s, i]); s = i + 1; }
  const gobj = groups.map(([a, b]) => ({ wordStart: a, wordEnd: b, start: list[a].start, end: +(list[b].end + 0.1).toFixed(3) }));
  const blocks = groups.map(([a, b]) => {
    const idx = Array.from({ length: b - a + 1 }, (_, k) => a + k), pick = idx.filter((i) => list[i].text.length >= 7).sort((x, y) => list[y].text.length - list[x].text.length)[0];
    const front = idx.filter((i) => i !== pick).map((i) => [i]);
    return { behind: pick == null ? null : [[pick]], front: front.length ? front : null };
  });
  return html
    .replace(/var BLOCKS = \[[\s\S]*?\n\s*\];/, (all) => parallax ? `var BLOCKS = ${JSON.stringify(blocks)};` : all)
    .replace(/var GROUPS = \[\s*\{ wordStart[\s\S]*?\n\s*\];/, () => `var GROUPS = ${JSON.stringify(gobj)};`)
    .replace(/var RAW_GROUPS = \[[\s\S]*?\n\s*\];/, () => `var RAW_GROUPS = ${JSON.stringify(groups)};`)
    .replace(re, () => `var ${m[1]} = ${JSON.stringify(list)};`)
    .replace(/var DURATION = [\d.]+;/, `var DURATION = ${+duration.toFixed(3)};`)
    .replace(/data-duration="[\d.]+"/, `data-duration="${+duration.toFixed(3)}"`)
    .replace(/var KEYWORDS = new Set\(\[([^\]]*)\]\)/, (all, body) =>
      `var KEYWORDS = new Set([${/"/.test(body) ? long.map(([t]) => JSON.stringify(t.toLowerCase())) : long.map(([, i]) => i)}])`)
    .replace(/<script src="https?:[^"]*gsap[^"]*"><\/script>\s*/g, "");
}

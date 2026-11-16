// tools/caption_transcript.mjs — feed a film's own words to the HyperFrames caption-style components (E8).
//   transcriptFromTimeline(timeline) → [{ text, start, end }, …]   timeline.json's VO lines (reelwright audio/info), words in film time
//   adaptCaption(html, words)       → html                         a vendored caption-* component with ITS demo script swapped for `words`
//   captionComponents()             → names of the caption-* components that take a transcript (caption-blend-difference is a CSS blend recipe)
//   writeTranscript(proj)           → <proj>/transcript.json       what `reelwright captions` style tooling reads
// The components hard-code a 28-word demo script (an array named WORDS, W or TRANSCRIPT) and, in 8 of them, group indexes into it
// (RAW_GROUPS pairs, GROUPS {wordStart,wordEnd,start,end}, or BLOCKS of line1/line2 or behind/front word indexes). The adapter
// replaces the array, regenerates the index lists with the same rule glitch-rgb uses (a group ends at a sentence end, a pause over
// 0.28 s, four words or 21 characters) and sets data-duration to the last word plus a 0.6 s tail. camera-follow's <template> wrapper is
// removed (KIT.block only runs scripts that are not inside a template).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const COMPONENTS = path.join(path.resolve(fileURLToPath(new URL("..", import.meta.url))), "vendor", "hyperframes", "registry", "components");
const r3 = (x) => Math.round(x * 1000) / 1000;

export function transcriptFromTimeline(T) {
  const out = [];
  for (const v of Object.values(T.VO || {}).sort((a, b) => a.start - b.start))
    for (const w of v.words || []) out.push({ text: String(w.w), start: r3(w.t), end: r3(w.t + w.d) });
  return out.sort((a, b) => a.start - b.start);
}

export function writeTranscript(proj) {
  const words = transcriptFromTimeline(JSON.parse(fs.readFileSync(path.join(proj, "timeline.json"), "utf8")));
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

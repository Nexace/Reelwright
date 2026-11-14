// Transcript adapter for the HyperFrames caption-* components (registry/components/caption-*, tag caption-style).
//   transcriptFrom(timeline)            → [{ text, start, end }, ...] from timeline.json VO words (seconds in the film), in order
//   retarget(html, words, duration)     → the component's html with its word list (`var TRANSCRIPT|WORDS|W = [...]`) replaced by `words`,
//                                          DURATION and data-duration set to `duration`, KEYWORDS (emphasis) re-picked from the new words
//                                          (the long ones), and the CDN gsap <script src> dropped (KIT.block re-creates inline scripts
//                                          only, so the film loads vendor/gsap itself, as for every KIT.gsap film)
// A transcript file `transcript.json` is the same array, so a component or a tool outside reelwright can read it.
// Components with no timed word list (caption-blend-difference is a video overlay; caption-camera-follow has words without times) throw.
export function transcriptFrom(tl) {
  const out = [];
  for (const v of Object.values(tl.VO || {}).sort((a, b) => a.start - b.start))
    for (const w of v.words || []) out.push({ text: String(w.w), start: +w.t.toFixed(3), end: +(w.t + w.d).toFixed(3) });
  return out;
}

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

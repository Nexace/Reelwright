// tools/checks/caption-lint.page.mjs — WARN plug-in for `reelwright qa` (HyperFrames F2): the caption rules of HyperFrames'
// lint, ported to what a rendered Reelwright page can show. The vendored lint reads caption markup in hf/index.html (still
// run by hf-lint); this reads the live DOM, so it also covers captions the engine draws (KIT.subtitles → .kit-subs) and
// caption components (`reelwright add caption-*`). Caption elements = a class or id of caption, caption-group/-word/-line/…,
// subtitle…, cg-…, or the engine's kit-subs / kit-subrow. Sampled at each VO line's middle and end, plus quiet moments.
//   caption_text_overflow          a caption box runs past the frame, is clipped by its own overflow, or is nowrap with no max-width
//   caption_container_relative_position   position: relative on a caption container/group/line
//   caption_fittext_scale          a caption word scaled above 1× reaches outside the safe area (fit-text headroom missing)
//   caption_textshadow_on_group    text-shadow on a caption group whose words are semi-transparent (a glow box shows)
//   caption_exit_missing_hard_kill a caption still visible where no VO line is active (the exit never fully hid it)
//   caption_words_missing          a VO line without word times (captions/karaoke fall back to guessed timing; the
//                                  analogue of the transcript-not-inline rule: the caption text must come from transcript data)
// Off: project.json "qa": {"caption-lint": false}. Static source rules (nowrap, overflow:hidden, fitText maxWidth…) stay with hf-lint.
export const kind = "warn";

export default async (page, { P } = {}) => {
  if (P && P.qa && P.qa["caption-lint"] === false) return [];
  return page.evaluate(async () => {
    const CUE = /^(?:caption(?:[-_](?:group|word|line|block|cue|text|container|layer))?|subtitle(?:[-_](?:group|line|cue|text))?|cg-.+|kit-subs|kit-subrow)$/i;
    const WORD = /word|cue/i, found = new Map();   // rule + selector → first line
    const add = (code, t, sel, msg) => { const k = code + sel; if (!found.has(k)) found.set(k, `${code} ${t.toFixed(2)}s ${sel}: ${msg}`); };
    const sel = (e) => (e.id ? "#" + e.id : e.classList.length ? "." + [...e.classList][0] : e.tagName.toLowerCase());
    const isCap = (e) => [...e.classList, e.id].some((x) => x && CUE.test(x));
    const caps = () => [...document.querySelectorAll("body *")].filter(isCap);
    const visible = (e) => {
      const r = e.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      let op = 1;
      for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.display === "none" || s.visibility === "hidden") return false; op *= Number(s.opacity); }
      return op > 0.05;
    };
    const F = window.FILM || {}, VO = window.VO || {}, W = innerWidth, H = innerHeight, render = window.render;
    if (!render || !caps().length) return [];
    const safe = (window.KIT && window.KIT.safe) || { x: Math.round(W * 0.05), w: Math.round(W * 0.9) };
    const lines = Object.entries(VO), dur = F.DUR || Math.max(0, ...lines.map(([, v]) => v.end + 1));
    // word times: the transcript the captions are cut from
    for (const [id, v] of lines) if (!Array.isArray(v.words) || !v.words.length) add("caption_words_missing", v.start || 0, `line "${id}"`, "no word times; caption highlighting is guessed");
    // 1. active moments: middle and end of each line
    const active = lines.flatMap(([, v]) => [(v.start + v.end) / 2, v.end - 0.05]);
    if (!lines.length) for (let t = 0.5; t < dur; t += 0.5) active.push(t);
    for (const t of active) {
      await render(t);
      for (const e of caps().filter(visible)) {
        const r = e.getBoundingClientRect(), s = getComputedStyle(e), word = [...e.classList].some((c) => WORD.test(c)) || (e.parentElement && e.tagName === "SPAN");
        if (r.left < -1 || r.right > W + 1 || r.top < -1 || r.bottom > H + 1) add("caption_text_overflow", t, sel(e), `box ${Math.round(r.left)}–${Math.round(r.right)} px runs past the ${W} px frame`);
        else if (s.whiteSpace.startsWith("no") && s.maxWidth === "none" && r.width > 0.9 * W) add("caption_text_overflow", t, sel(e), "white-space: nowrap with no max-width and over 90% of the frame wide; longer text will clip");
        if (s.overflowX !== "visible" && e.scrollWidth > e.clientWidth + 1) add("caption_text_overflow", t, sel(e), `text is clipped by overflow: ${s.overflowX} (${e.scrollWidth} px of text in ${e.clientWidth} px)`);
        if (s.position === "relative" && !word) add("caption_container_relative_position", t, sel(e), "position: relative on a caption container breaks stacking; use absolute");
        const sc = new DOMMatrix(s.transform === "none" ? undefined : s.transform).a;
        if (sc > 1.001 && (r.left < safe.x - 1 || r.right > safe.x + safe.w + 1)) add("caption_fittext_scale", t, sel(e), `scaled ${sc.toFixed(2)}× it reaches ${Math.round(r.left)}–${Math.round(r.right)} px, outside the safe area ${safe.x}–${safe.x + safe.w}; fit the text at max-width ÷ ${sc.toFixed(2)}`);
        if (s.textShadow !== "none" && e.children.length && [...e.querySelectorAll("*")].some((c) => { const m = getComputedStyle(c).color.match(/[\d.]+/g) || []; return m.length > 3 && Number(m[3]) < 1; }))
          add("caption_textshadow_on_group", t, sel(e), "text-shadow on a group of semi-transparent words draws a box; put the shadow on the active word");
      }
    }
    // 2. quiet moments: no VO line is on (its fade-in/out included, plus slack): nothing caption-like may still show
    if (lines.length) {
      const busy = (t) => lines.some(([, v]) => t >= v.start - 0.5 && t <= v.end + 0.9);
      let n = 0;
      for (let t = 0.25; t < dur && n < 60; t += 0.5) {
        if (busy(t)) continue;
        n++; await render(t);
        for (const e of caps().filter(visible)) if ((e.textContent || "").trim()) add("caption_exit_missing_hard_kill", t, sel(e), "still visible with no voiceover line active; end the exit with opacity 0 and visibility: hidden");
      }
    }
    return [...found.values()].slice(0, 12);
  });
};

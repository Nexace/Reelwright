// p9-frames.mjs: Remotion's frame selection (`--frames`, `--every-nth-frame`, `--duration`) as pure functions.
//   parseFrames("0-9,30,100-")  → [{ from, to }] (to = null: to the last frame); throws on anything else
//   frameList(spec, { total, every = 1, duration, fps })  → ascending unique frame numbers below `total`. every N keeps the 1st, N+1th… frame of the
//                       selection (counted from its first frame); duration S (seconds, needs fps) drops frames more than S seconds after the first one.
//   selectExpr(list)    → an ffmpeg `select` expression (n = frame number) for exactly those frames, as runs with a constant step
export function parseFrames(spec) {
  if (spec == null || spec === "") return [{ from: 0, to: null }];
  return String(spec).split(",").map((tok) => {
    const m = /^\s*(\d+)\s*(?:(-)\s*(\d*))?\s*$/.exec(tok);
    if (!m) throw new Error(`frames: "${tok}" is not N, A-B or A-  (e.g. 0-9,30,100-)`);
    const from = +m[1], to = !m[2] ? from : m[3] === "" ? null : +m[3];
    if (to !== null && to < from) throw new Error(`frames: "${tok}" ends before it starts`);
    return { from, to };
  });
}

export function frameList(spec, { total, every = 1, duration, fps } = {}) {
  if (!(total > 0)) throw new Error("frameList: total is the film's frame count");
  if (!Number.isInteger(every) || every < 1) throw new Error("every-nth-frame is a whole number >= 1");
  const set = new Set();
  for (const { from, to } of parseFrames(spec)) for (let f = from; f <= Math.min(to ?? total - 1, total - 1); f++) set.add(f);
  let l = [...set].sort((a, b) => a - b);
  if (!l.length) throw new Error(`frames "${spec}" select nothing in a film of ${total} frames (0 to ${total - 1})`);
  const first = l[0];
  if (every > 1) l = l.filter((f) => (f - first) % every === 0);
  if (duration != null) {
    if (!(duration > 0) || !(fps > 0)) throw new Error("duration is seconds > 0 and needs fps");
    l = l.filter((f) => (f - first) / fps < duration);
  }
  return l;
}

export function selectExpr(list) {
  const runs = [];
  for (let i = 0; i < list.length;) {
    let j = i + 1;
    const step = j < list.length ? list[j] - list[i] : 1;
    while (j < list.length && list[j] - list[j - 1] === step) j++;
    if (j - i === 2 && step > 1) j = i + 1;   // two frames do not make a run: do not let a stride swallow the next frame
    runs.push(j - i === 1 ? `eq(n,${list[i]})` : `between(n,${list[i]},${list[j - 1]})${step > 1 ? `*not(mod(n-${list[i]},${step}))` : ""}`);
    i = j;
  }
  return runs.join("+");
}

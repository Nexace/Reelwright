// marks [project]   regenerate marks.json from the transcript: named markers from project.json "marks"
//                   ({ "<name>": "<line id>" } or { line, word, nth }) → { name: { line, [word, nth], t, dur } }.
//                   sched bakes them into window.MUSIC.marks, so a film says KIT.until("cta", t) instead of a number.
//                   Run sched (or film/all) after it. Offline. (tools/marks.py)
export default function ({ proj, PY, run }) {
  run(PY, "tools/marks.py", proj);
}

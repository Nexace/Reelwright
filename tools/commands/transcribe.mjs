// transcribe install [--model tiny|base|small] [--yes] | transcribe <audio|video> [--model m] [--lang l] [--out words.json]
//                  local speech to text with faster-whisper: word-level timings as [{text,start,end}] (the shape `captions` takes). `install` is opt-in:
//                  it prints the plan and sizes (a repo-local .venv-tts via uv, the model in .models/, both gitignored) and downloads only with --yes.
//                  `new --video/--audio` and `narrate check` use it once installed. tools/local_speech.mjs, tools/transcribe_fw.py.
import fs from "node:fs";
import { transcribeInstall, transcribeMedia } from "../local_speech.mjs";

export default async function transcribe({ args }) {
  const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; }, flag = (k) => { const i = args.indexOf(k); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const yes = flag("--yes"), model = opt("--model"), lang = opt("--lang") ?? process.env.REELWRIGHT_LANG, out = opt("--out");   // the dispatcher takes --lang for every command into REELWRIGHT_LANG
  if (args[0] === "install") { const r = transcribeInstall({ yes, model: model || "base" }); process.exit(r.ok ? 0 : 1); }
  if (!args[0]) { console.log("usage: reelwright transcribe install [--model tiny|base|small] [--yes] | transcribe <audio|video> [--model m] [--lang l] [--out words.json]"); process.exit(1); }
  try {
    const words = transcribeMedia(args[0], { model, lang });
    if (out) { fs.writeFileSync(out, JSON.stringify(words, null, 1)); console.log(`${out}: ${words.length} words`); }
    else console.log(JSON.stringify(words, null, 1));
  } catch (e) { console.error(e.message); process.exit(1); }
}

// tts install [--yes]   local Kokoro voiceover, opt-in: prints the plan and sizes (kokoro-onnx into the repo-local .venv-tts via uv, kokoro-v1.0.onnx and
//                  voices-v1.0.bin into .models/kokoro, both gitignored) and downloads only with --yes. Then "tts": "kokoro" in project.json makes `vo`
//                  use it; with `transcribe install` too the word times are aligned to the audio ("timing": "aligned") instead of estimated.
//                  tools/local_speech.mjs, tools/tts_kokoro.py.
import { ttsInstall } from "../local_speech.mjs";

export default async function tts({ args }) {
  if (args[0] === "install") { const r = ttsInstall({ yes: args.includes("--yes") }); process.exit(r.ok ? 0 : 1); }
  console.log("usage: reelwright tts install [--yes]");
  process.exit(1);
}

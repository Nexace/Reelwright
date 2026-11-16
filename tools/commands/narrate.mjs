// narrate providers | speak "<text>" [--provider say] [--voice V] [--rate 1] [--yes] | check <wav> "<text>" [--max-wer 0.1]
//                  narration providers beside edge-tts: say (macOS), piper, kokoro (local CLIs you installed), openai, gemini, elevenlabs (paid
//                  cloud: needs --yes and an API key). speak writes <project>/assets/narration/<sha1>.wav (the take is cached by hash: same text,
//                  voice and provider = no second call). check transcribes a take with whisper.cpp (`whisper-cli`, $WHISPER_MODEL) and fails
//                  when more than --max-wer of the words did not come back. Opt-in; the film's voice stays tools/vo.py. tools/p5-narrate.mjs.
import path from "node:path";
import { providers, synth, check, asrAvailable } from "../p5-narrate.mjs";

export default async ({ proj, args }) => {
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; }, flag = (k) => { const i = args.indexOf(k); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const yes = flag("--yes"), provider = opt("--provider", "say"), voice = opt("--voice"), rate = Number(opt("--rate", 1)), maxWer = Number(opt("--max-wer", 0.1));
  const [sub, a, b] = args;
  try {
    if (sub === "providers") {
      for (const [n, p] of Object.entries(providers)) console.log(`${p.available() ? "ready  " : "missing"}  ${n.padEnd(11)} ${p.kind}${p.kind === "cloud" ? " (paid)" : ""}`);
      return console.log(`${asrAvailable() ? "ready  " : "missing"}  whisper-cli  ASR for \`check\` (needs $WHISPER_MODEL)`);
    }
    if (sub === "speak" && a) { const r = await synth(provider, a, { dir: path.resolve(proj, "assets", "narration"), voice, rate, yes }); return console.log(`${r.cached ? "cached " : "spoke  "} ${r.file}`); }
    if (sub === "check" && a && b) {
      if (!asrAvailable()) { console.log("narrate check: needs whisper.cpp's `whisper-cli` on PATH and $WHISPER_MODEL (a ggml model file)"); process.exit(1); }
      const r = check(path.resolve(a), b, { maxWer });
      console.log(`${r.ok ? "PASS" : "FAIL"}  WER ${r.wer} (max ${maxWer})  heard: "${r.heard}"` + (r.missing.length ? `\n  not heard: ${r.missing.join(", ")}` : ""));
      if (!r.ok) process.exit(1);
      return;
    }
    console.log('usage: reelwright narrate providers | speak "<text>" [--provider p] [--voice v] [--rate r] [--yes] | check <wav> "<text>" [--max-wer w]');
    process.exit(1);
  } catch (e) { console.error(e.message); process.exit(1); }
};

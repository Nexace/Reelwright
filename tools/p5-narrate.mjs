// Narration providers beside the default edge-tts (tools/vo.py, which stays the film's voice and gives word timings). Opt-in, one file:
//   providers   say (macOS, built in), piper and kokoro (local CLIs you installed yourself), openai / gemini / elevenlabs (cloud: paid, network)
//   synth(provider, text, { dir, voice, rate, yes, fetch }) → { file, cached, provider }   a 24 kHz mono wav at <dir>/<sha1>.wav; the key is
//       sha1(provider | voice | rate | text), so the same line in the same voice is never spoken twice (the take is cached by hash)
//   wer(reference, heard) → word error rate (Levenshtein over words, case and punctuation folded)
//   check(wav, text, { asr, maxWer = 0.1 }) → { ok, wer, heard, missing }   "hears every word back": the take is transcribed by an ASR
//       (default: whisper.cpp's `whisper-cli`, model in $WHISPER_MODEL) and the words that did not come back are listed
// Cloud providers are never called without yes: true (a paid call; the character count is printed first), and their request shapes
// follow each vendor's documented REST API but have NOT been run from here (no key, no network in the self-check): they are tested
// against an injected fetch only. Local providers run the CLI you have; none is installed by Reelwright.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const which = (cmd) => spawnSync(process.platform === "win32" ? "where" : "which", [cmd], { encoding: "utf8" }).status === 0;
const run = (cmd, args, o = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...o });
  if (r.error || r.status !== 0) throw new Error(`${cmd} failed: ${(r.error && r.error.message) || (r.stderr || "").trim().split("\n").pop()}`);
  return r.stdout;
};
const toWav = (src, dst) => run("ffmpeg", ["-y", "-v", "error", "-i", src, "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", dst]);
const pcmToWav = (pcm, dst) => { const raw = dst + ".pcm"; fs.writeFileSync(raw, pcm); try { run("ffmpeg", ["-y", "-v", "error", "-f", "s16le", "-ar", "24000", "-ac", "1", "-i", raw, dst]); } finally { fs.rmSync(raw, { force: true }); } };

const needKey = (name) => { if (!process.env[name]) throw new Error(`set ${name} to use this provider`); return process.env[name]; };
const post = async (f, url, init) => {
  const r = await f(url, init);
  if (!r.ok) throw new Error(`${new URL(url).host}: HTTP ${r.status} ${(await r.text()).slice(0, 160)}`);
  return r;
};

export const providers = {
  say: { kind: "local", available: () => process.platform === "darwin" && which("say"),
    async synth({ text, voice, rate, out }) {
      const tmp = out + ".aiff";
      try { run("say", [...(voice ? ["-v", voice] : []), ...(rate ? ["-r", String(Math.round(175 * rate))] : []), "-o", tmp, "--", text]); toWav(tmp, out); }
      finally { fs.rmSync(tmp, { force: true }); }
    } },
  piper: { kind: "local", available: () => which("piper") && !!process.env.PIPER_MODEL,   // PIPER_MODEL = the .onnx voice file
    async synth({ text, voice, rate, out }) {
      const tmp = out + ".raw.wav";
      try { run("piper", ["--model", voice || process.env.PIPER_MODEL, "--output_file", tmp, ...(rate ? ["--length_scale", String(1 / rate)] : [])], { input: text }); toWav(tmp, out); }
      finally { fs.rmSync(tmp, { force: true }); }
    } },
  kokoro: { kind: "local", available: () => which("kokoro-tts"),
    async synth({ text, voice, rate, out }) {
      const txt = out + ".txt", tmp = out + ".raw.wav";
      try { fs.writeFileSync(txt, text); run("kokoro-tts", [txt, tmp, "--voice", voice || "af_sarah", "--speed", String(rate || 1)]); toWav(tmp, out); }
      finally { fs.rmSync(txt, { force: true }); fs.rmSync(tmp, { force: true }); }
    } },
  openai: { kind: "cloud", available: () => !!process.env.OPENAI_API_KEY,
    async synth({ text, voice, out, fetch: f }) {
      const r = await post(f, "https://api.openai.com/v1/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${needKey("OPENAI_API_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini-tts", voice: voice || "alloy", input: text, response_format: "wav" }) });
      const tmp = out + ".raw.wav"; fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer())); try { toWav(tmp, out); } finally { fs.rmSync(tmp, { force: true }); }
    } },
  elevenlabs: { kind: "cloud", available: () => !!process.env.ELEVENLABS_API_KEY,
    async synth({ text, voice, out, fetch: f }) {
      const r = await post(f, `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice || "21m00Tcm4TlvDq8ikWAM")}?output_format=mp3_44100_128`,
        { method: "POST", headers: { "xi-api-key": needKey("ELEVENLABS_API_KEY"), "Content-Type": "application/json" }, body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }) });
      const tmp = out + ".mp3"; fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer())); try { toWav(tmp, out); } finally { fs.rmSync(tmp, { force: true }); }
    } },
  gemini: { kind: "cloud", available: () => !!process.env.GEMINI_API_KEY,
    async synth({ text, voice, out, fetch: f }) {
      const r = await post(f, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent",
        { method: "POST", headers: { "x-goog-api-key": needKey("GEMINI_API_KEY"), "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || "Kore" } } } } }) });
      const j = await r.json(), b64 = j?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) throw new Error("gemini: no audio in the response");
      pcmToWav(Buffer.from(b64, "base64"), out);
    } },
};

export const keyOf = (provider, text, { voice = "", rate = 1 } = {}) => crypto.createHash("sha1").update([provider, voice, rate, text].join("\u0001")).digest("hex");

export async function synth(provider, text, { dir, voice, rate, yes = false, fetch: f = globalThis.fetch, log = console.log } = {}) {
  const p = providers[provider];
  if (!p) throw new Error(`narrate: no provider "${provider}" (have ${Object.keys(providers).join(", ")})`);
  if (!text || !String(text).trim()) throw new Error("narrate: no text");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, keyOf(provider, text, { voice, rate }) + ".wav");
  if (fs.existsSync(file)) return { file, cached: true, provider };
  if (!p.available() && !(p.kind === "cloud" && f !== globalThis.fetch)) throw new Error(`narrate: provider "${provider}" is not available here (${p.kind === "cloud" ? "set its API key" : "install it"}); \`reelwright narrate providers\``);
  if (p.kind === "cloud" && !yes) throw new Error(`narrate: ${provider} is a paid cloud call (${text.length} characters); pass yes: true / --yes after you have seen that`);
  await p.synth({ text, voice, rate, out: file, fetch: f });
  if (!fs.existsSync(file)) throw new Error(`narrate: ${provider} wrote no audio`);
  log(`narrate: ${provider} → ${file}`);
  return { file, cached: false, provider };
}

// ── hearing it back ─────────────────────────────────────────────────────────
const words = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, " ").split(/\s+/).filter(Boolean);
export function wer(reference, heard) {
  const a = words(reference), b = words(heard);
  if (!a.length) return b.length ? 1 : 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] / a.length;
}
export const asrAvailable = () => which("whisper-cli") && !!process.env.WHISPER_MODEL;
export const whisper = (wav) => run("whisper-cli", ["-m", process.env.WHISPER_MODEL, "-f", wav, "-nt", "-np"]).trim();   // whisper.cpp: text only on stdout
export function check(wav, text, { asr = whisper, maxWer = 0.1 } = {}) {
  const heard = asr(wav), w = wer(text, heard), got = new Set(words(heard));
  return { ok: w <= maxWer, wer: +w.toFixed(3), heard, missing: [...new Set(words(text))].filter((x) => !got.has(x)) };
}

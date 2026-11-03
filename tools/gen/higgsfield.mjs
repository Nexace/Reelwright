// Higgsfield provider for tools/gen.mjs (https://docs.higgsfield.ai): estimate, submit, poll. Paid, opt-in.
// Base URL: env REELWRIGHT_HIGGSFIELD_URL (tests point it at tools/gen/mock.mjs) or https://api.higgsfield.ai.
// Credentials arrive as arguments (never read here); they only go in the Authorization header, never in output.
import crypto from "node:crypto";

const base = () => (process.env.REELWRIGHT_HIGGSFIELD_URL || "https://api.higgsfield.ai").replace(/\/+$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (j) => (typeof j.detail === "string" ? j.detail : j.detail ? JSON.stringify(j.detail) : "");

function fail(status, j) {
  if (status === 401) return "Higgsfield rejected the credentials (401): check HIGGSFIELD_API_KEY_ID / HIGGSFIELD_API_KEY_SECRET";
  if (status === 403) return `Higgsfield: insufficient balance (403) — add funds at https://console.higgsfield.ai${text(j) ? ` [${text(j)}]` : ""}`;
  return `Higgsfield error ${status}: ${text(j) || "request failed"}`;
}

// 429: wait Retry-After and resend (same Idempotency-Key, at most 5x); 5xx / network: backoff, 3 tries
async function call(method, url, creds, body, idem) {
  const headers = { Authorization: `Key ${creds.HIGGSFIELD_API_KEY_ID}:${creds.HIGGSFIELD_API_KEY_SECRET}`, "Content-Type": "application/json" };
  if (idem) headers["Idempotency-Key"] = idem;
  for (let q = 0, e5 = 0; ;) {
    let r, j = {};
    try {
      r = await fetch(url, { method, headers, body: body && JSON.stringify(body) });
      j = await r.json().catch(() => ({}));
    } catch (e) {
      if (e5++ >= 3) throw new Error(`Higgsfield: network error (${e.cause?.code || "fetch failed"})`);   // never e.message: undici can echo the header values
      await sleep(1000 * 2 ** e5); continue;
    }
    if (r.status === 429 && q++ < 5) {
      const ra = r.headers.get("retry-after");
      await sleep(1000 * (ra !== null && ra.trim() !== "" && Number.isFinite(Number(ra)) ? Number(ra) : j.retry_after_seconds ?? 30)); continue;
    }
    if (r.status >= 500 && e5++ < 3) { await sleep(1000 * 2 ** e5); continue; }
    if (r.ok) return j;
    throw new Error(fail(r.status, j));
  }
}

const bodyOf = (req) => ({ prompt: req.prompt, ...req.opts });

export default {
  name: "higgsfield",
  envKeys: ["HIGGSFIELD_API_KEY_ID", "HIGGSFIELD_API_KEY_SECRET"],
  models: { image: "higgsfield-ai/soul/standard", video: "kling-video/v2.5-turbo/pro/text-to-video" },   // model id = endpoint path
  async estimate(req, creds) {
    return { usd: (await call("POST", `${base()}/estimate/${req.model}`, creds, bodyOf(req))).usd };
  },
  async submit(req, creds) {
    const j = await call("POST", `${base()}/${req.model}`, creds, bodyOf(req), crypto.randomUUID());
    // the key is sent only to the host we were configured for
    if (new URL(j.status_url, base()).origin !== new URL(base()).origin) throw new Error(`Higgsfield: status URL for request ${j.request_id} points at another host, refusing to send credentials`);
    return { id: j.request_id, statusUrl: new URL(j.status_url, base()).href };
  },
  async poll(job, creds) {
    const j = await call("GET", job.statusUrl, creds);
    const urls = (j.images ? j.images.map((i) => i.url) : j.video ? [j.video.url] : []).filter(Boolean);
    return { status: j.status, urls, error: j.error };
  },
};

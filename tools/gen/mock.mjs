// A local stand-in for the Higgsfield API, for tools/gen/test.mjs (never contacts the real service).
//   startMock({ scenario }) → { url, calls, close }   scenario: ok | queue-full-once | no-balance | bad-key
//   calls: every request { method, path, headers, t, ... }; polls also get { status }, the result fetch { url }
// Routes: POST /estimate/<model>, POST /<model>, GET /requests/<id>/status (queued → in_progress → completed),
// GET /dl/<id>.png|mp4?X-Amz-Signature=…&Expires=… (a signed-looking CDN URL).
import http from "node:http";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypmp42"), Buffer.alloc(16)]);

export async function startMock({ scenario = "ok" } = {}) {
  const calls = [], jobs = {};
  let n = 0, full = scenario === "queue-full-once";
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"), c = { method: req.method, path: u.pathname, headers: req.headers, t: performance.now() };
    calls.push(c);
    const send = (code, body, h = {}) => { res.writeHead(code, { "content-type": "application/json", ...h }); res.end(JSON.stringify(body)); };
    const dl = u.pathname.match(/^\/dl\/(.+)\.(png|mp4)$/);
    if (dl) { res.writeHead(200, { "content-type": dl[2] === "png" ? "image/png" : "video/mp4" }); return res.end(dl[2] === "png" ? PNG : MP4); }
    if (scenario === "bad-key") return send(401, { detail: "Invalid key" });
    const origin = `http://${req.headers.host}`;
    const status = u.pathname.match(/^\/requests\/([^/]+)\/status$/);
    if (req.method === "GET" && status) {
      const j = jobs[status[1]];
      if (!j) return send(404, { detail: "Not found" });
      const k = ++j.polls, s = k === 1 ? "queued" : k === 2 ? "in_progress" : "completed";
      c.status = s;
      if (s !== "completed") return send(200, { status: s, request_id: j.id });
      const ext = j.model.includes("video") ? "mp4" : "png", url = `${origin}/dl/${j.id}.${ext}?X-Amz-Signature=abc123&Expires=1999999999`;
      c.url = url;
      return send(200, { status: s, request_id: j.id, expires_at: "2099-01-01T00:00:00Z", error: null, ...(ext === "mp4" ? { video: { url } } : { images: [{ url }] }) });
    }
    req.resume();
    req.on("end", () => {
      if (u.pathname.startsWith("/estimate/")) return send(200, { usd: "0.094" });
      if (req.method !== "POST") return send(404, { detail: "not found" });
      if (scenario === "no-balance") return send(403, { detail: "Insufficient balance" });
      if (full) { full = false; return send(429, { code: "account_queue_full", retryable: true, retry_after_seconds: 1 }, { "retry-after": "1" }); }
      const id = `req-${++n}`;
      jobs[id] = { id, model: u.pathname.slice(1), polls: 0 };
      send(200, { status: "queued", request_id: id, status_url: `${origin}/requests/${id}/status`, cancel_url: `${origin}/requests/${id}/cancel`, expires_after: 3600 });
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}`, calls, close: () => new Promise((r) => { server.close(r); server.closeAllConnections(); }) };
}

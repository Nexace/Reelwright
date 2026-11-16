// node tools/selfcheck/capture-url.mjs — G3: `reelwright capture` (tools/capture_url.mjs) against a local fixture site served on
// loopback (--local-file). No network: asserts the SSRF guard (address ranges, host names, resolver answers, credentials, schemes,
// a refused loopback URL, a refused private sub-resource) and every output of a capture: 21 scroll shots, full-page plate,
// contact sheet, HTML/CSS/text, tokens, the downloaded web font, images and inline SVG, animation, Lottie/video/WebGL notes,
// AGENTS.md, and --video. Not covered (needs the internet): a real public site; Gemini captions are paid and skipped.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { isPrivateIp, assertPublicUrl, captureUrl, serveFolder } from "../capture_url.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── SSRF guard ──
for (const ip of ["127.0.0.1", "127.255.0.9", "10.0.0.1", "172.16.5.4", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255",
  "::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "::ffff:10.1.2.3", "64:ff9b::a00:1", "2002:7f00:1::", "::127.0.0.1", "not-an-ip"])
  assert.ok(isPrivateIp(ip), `${ip} should be private`);
for (const ip of ["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.15.0.1", "172.32.0.1", "100.63.0.1", "192.167.0.1", "2606:4700:4700::1111", "2001:db8::1", "::ffff:8.8.8.8", "64:ff9b::808:808"])
  assert.ok(!isPrivateIp(ip), `${ip} should be public`);
const pub = () => [{ address: "93.184.216.34", family: 4 }];
await assertPublicUrl("https://example.com/a?b=1", { lookup: pub });
for (const [u, lookup, why] of [
  ["http://127.0.0.1:8080/", pub, "loopback"], ["http://[::1]/", pub, "v6 loopback"], ["http://169.254.169.254/latest/meta-data/", pub, "metadata"],
  ["http://2130706433/", pub, "decimal loopback"], ["http://0x7f.1/", pub, "hex loopback"], ["http://localhost:3000/", pub, "localhost"], ["http://app.localhost/", pub, ".localhost"],
  ["http://[::ffff:10.0.0.1]/", pub, "mapped v4"], ["http://intranet.internal/", pub, ".internal"],
  ["http://evil.example/", () => [{ address: "93.184.216.34" }, { address: "10.0.0.5" }], "one private answer among public ones"],
  ["http://evil.example/", () => [], "no answer"], ["ftp://example.com/", pub, "scheme"], ["file:///etc/passwd", pub, "file"],
  ["https://user:pw@example.com/", pub, "credentials"], ["nonsense", pub, "not a URL"]])
  await assert.rejects(assertPublicUrl(u, { lookup }), `${u} (${why}) should be refused`);

// ── a refused loopback URL never reaches the browser ──
const srv = await serveFolder(path.join(HERE, "fixtures/capture"));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "capture-url-"));
try {
  await assert.rejects(captureUrl(srv.origin + "/index.html", path.join(tmp, "x")), /private or reserved/, "loopback without --local-file");
  assert.ok(!fs.existsSync(path.join(tmp, "x")), "nothing written for a refused URL");
  // the folder server answers only GET inside its root
  assert.equal((await fetch(srv.origin + "/..%2f..%2fpackage.json")).status, 404);
  assert.equal((await fetch(srv.origin + "/logo.svg")).status, 200);
  assert.equal((await fetch(srv.origin + "/logo.svg", { method: "POST" })).status, 404);
} finally { srv.close(); }

// ── a full capture of the fixture ──
const out = path.join(tmp, "cap"), logs = [];
try {
  const m = await captureUrl(path.join(HERE, "fixtures/capture/index.html"), out, { localFile: true, log: (s) => logs.push(s) });
  const has = (f) => assert.ok(fs.existsSync(path.join(out, f)) && fs.statSync(path.join(out, f)).size > 0, `${f} missing or empty`);
  assert.equal(m.screenshots.length, 21, "default 21 scroll shots");
  for (let i = 0; i < 21; i++) has(`screenshots/scroll-${String(i).padStart(2, "0")}.jpg`);
  assert.ok(m.screenshots.at(-1).y > m.screenshots[0].y && m.pageHeight > 2400, "scrolled the whole page");
  for (const f of ["full-page.png", "contact-sheet.jpg", "page.html", "styles.css", "text.txt", "tokens.json", "animations.json", "media.json", "AGENTS.md", "capture.json", "assets/fonts/fonts.json"]) has(f);
  const png = fs.readFileSync(path.join(out, "full-page.png"));
  assert.ok(png.readUInt32BE(20) >= 2400, "full-page plate is the whole page tall");
  assert.ok(png.readUInt32BE(16) === 1440);

  const text = fs.readFileSync(path.join(out, "text.txt"), "utf8");
  assert.ok(text.includes("Ship films from code") && text.includes("12,000 teams"), "visible text");
  const html = fs.readFileSync(path.join(out, "page.html"), "utf8");
  assert.ok(html.startsWith("<!doctype html>") && !/<script/i.test(html) && html.includes('id="s2"'), "html without scripts");
  const css = fs.readFileSync(path.join(out, "styles.css"), "utf8");
  assert.ok(css.includes("@keyframes pulse") && css.includes("--brand"), "css rules");

  const tok = JSON.parse(fs.readFileSync(path.join(out, "tokens.json"), "utf8"));
  assert.equal(tok.cssVariables["--brand"], "#e11d48");
  assert.ok(tok.colors.accent.some(([c]) => c === "#e11d48"), "accent colour found: " + JSON.stringify(tok.colors.accent));
  assert.ok(tok.fontFamilies.some(([f]) => f === "Fixture Sans") && tok.radii.some(([r]) => r === "14px") && tok.shadows.length, "fonts, radius, shadow tokens");

  const fonts = JSON.parse(fs.readFileSync(path.join(out, "assets/fonts/fonts.json"), "utf8")).fonts;
  assert.equal(fonts.length, 1);
  assert.ok(fonts[0].file && fs.readFileSync(path.join(out, fonts[0].file)).equals(fs.readFileSync(path.join(HERE, "fixtures/capture/site-font.woff2"))), "the web font file is downloaded byte for byte");
  const imgs = JSON.parse(fs.readFileSync(path.join(out, "assets/images/images.json"), "utf8"));
  assert.ok(imgs.some((i) => i.file?.endsWith(".svg")), "logo.svg downloaded");
  const bad = imgs.find((i) => i.from.includes("10.255.255.1"));
  assert.ok(bad?.error && /private or reserved/.test(bad.error) && !bad.file, "the private-address image is refused, not fetched");
  assert.ok(m.blocked.includes("10.255.255.1"), "reported as blocked");
  assert.ok(fs.readdirSync(path.join(out, "assets/svg")).length >= 1 && fs.readFileSync(path.join(out, "assets/svg/inline-00.svg"), "utf8").includes("xmlns"), "inline svg saved");

  const an = JSON.parse(fs.readFileSync(path.join(out, "animations.json"), "utf8"));
  assert.ok(an.keyframes.some((k) => k.name === "pulse") && an.declared.some((d) => d.animation.startsWith("pulse")) && an.transitions.length, "animation metadata");
  assert.ok(an.running.some((a) => a.name === "pulse"), "document.getAnimations lists the running one");
  const media = JSON.parse(fs.readFileSync(path.join(out, "media.json"), "utf8"));
  assert.ok(media.lottie.some((l) => l.includes("hero-animation.json")), "lottie player");
  assert.ok(media.videos.length === 1 && media.videos[0].loop && media.webgl && media.canvas.contexts.some((c) => /webgl/.test(c)), "video + webgl context");
  const agents = fs.readFileSync(path.join(out, "AGENTS.md"), "utf8");
  assert.ok(agents.includes("contact-sheet.jpg") && agents.includes("WebGL"), "AGENTS.md");
  assert.ok(!logs.some((l) => /^blocked http:\/\/127/.test(l)), "the fixture's own origin is not blocked");

  // fewer shots on request; a page shorter than the viewport gets one
  const m2 = await captureUrl(path.join(HERE, "fixtures/capture/index.html"), path.join(tmp, "cap2"), { localFile: true, shots: 5 });
  assert.equal(m2.screenshots.length, 5);
  // --video: a copy of the fixture whose <video> has a real (ffmpeg-made, 1 s) file; without the flag it is not downloaded
  const site = path.join(tmp, "site");
  fs.cpSync(path.join(HERE, "fixtures/capture"), site, { recursive: true });
  fs.writeFileSync(path.join(site, "index.html"), fs.readFileSync(path.join(site, "index.html"), "utf8").replace("missing.mp4", "clip.mp4"));
  execFileSync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "testsrc=size=160x90:rate=10:duration=1", "-pix_fmt", "yuv420p", path.join(site, "clip.mp4")]);
  const m3 = await captureUrl(path.join(site, "index.html"), path.join(tmp, "cap-video"), { localFile: true, shots: 2, video: true });
  assert.equal(m3.counts.videoFiles, 1);
  assert.ok(fs.readFileSync(path.join(tmp, "cap-video/assets/video/00-clip.mp4")).equals(fs.readFileSync(path.join(site, "clip.mp4"))), "the video file is downloaded byte for byte");
  assert.equal((await captureUrl(path.join(site, "index.html"), path.join(tmp, "cap-novideo"), { localFile: true, shots: 2 })).counts.videoFiles, 0);
  assert.ok(!fs.existsSync(path.join(tmp, "cap-novideo/assets/video")));
  await assert.rejects(captureUrl(path.join(tmp, "nope.html"), path.join(tmp, "cap3"), { localFile: true }), /not a file/);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
console.log("capture-url ok: SSRF guard + a full local capture (21 shots, plate, sheet, html/css/text, tokens, fonts, images, svg, animation, media, AGENTS.md)");

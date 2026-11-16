// capture <url> [--out dir] [--shots N] [--width W] [--video]   read-only capture of a public page you own or may use: N scroll screenshots
//                  (default 21), full-page plate, contact sheet, rendered HTML, CSS, visible text, design tokens, fonts and images
//                  downloaded, inline SVGs, animation and Lottie/video/WebGL notes, and an AGENTS.md → captures/<host>/ (or --out).
//                  --video also downloads the page's own <video> files. Refuses private, loopback and link-local addresses (SSRF guard).
// capture --local-file <file.html> [--out dir]   the same for a file on this machine, served on loopback; only that folder is reachable.
//                  `from-url` / `theme-from` (tools/capture_site.mjs) use the page for a film draft; this one is the raw material.
import path from "node:path";
import { captureUrl } from "../capture_url.mjs";

export default async function capture({ args, ROOT }) {
  const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args.splice(i, 2)[1] : d; };
  const video = args.includes("--video"); if (video) args.splice(args.indexOf("--video"), 1);
  const out0 = opt("--out"), shots = Number(opt("--shots", 21)), width = Number(opt("--width", 1440)), lf = opt("--local-file");
  const target = lf || args.find((a) => !a.startsWith("--"));
  if (!target || !(shots >= 1 && shots <= 60) || !(width >= 320)) {
    console.log("usage: reelwright capture <url> [--out dir] [--shots 1-60] [--width px]\n       reelwright capture --local-file <file.html> [--out dir]   (only sites you own or may use)"); process.exit(1);
  }
  const name = (lf ? path.basename(lf) : new URL(/^https?:/i.test(target) ? target : "http://" + target).hostname).replace(/[^\w.-]+/g, "-");
  const out = path.resolve(ROOT, out0 || path.join("captures", name));
  try {
    const m = await captureUrl(lf || target, out, { shots, width, localFile: !!lf, video, log: (s) => console.log(s) });
    console.log(`${out}\n  ${m.screenshots.length} scroll shots + full-page.png + contact-sheet.jpg; ${m.counts.fonts} fonts, ${m.counts.images} images, ${m.counts.inlineSvgs} svgs, ` +
      `${m.counts.animations} running animations, ${m.counts.videos} videos, webgl: ${m.webgl}\n  start with contact-sheet.jpg and AGENTS.md`);
  } catch (e) { console.log(e.message); process.exit(1); }
}

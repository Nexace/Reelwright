// lint [project] [--no-browser]   the native lint of a film, beside the vendored @hyperframes/lint that `qa` runs: every upstream
//                  finding that applies (errors, warnings, the five downgraded ones), the native ports of the rules qa skips,
//                  coordinate drift (a box that moves when you seek away and back) and the HDR check. Exit 1 on an upstream ERROR.
//                  Rules and reasons: docs/playbook/qa-lint.md. --no-browser leaves out drift, duplicate audio, HEVC and HDR sources.
// lint --components [name… | --all]   lint the catalog components installed in <project>/hf/blocks/ (or the named ones; --all =
//                  every vendored component) one by one as fragments, leaving out the rules only a host page can satisfy
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export default async function lint({ proj, args, ROOT, step }) {
  const { SKIP, DOWNGRADE, hfLint } = await import("../checks/hf-lint.mjs");
  const N = await import("../checks/native-lint.mjs");
  const DIR = path.resolve(proj), P = JSON.parse(fs.readFileSync(path.join(DIR, "project.json"), "utf8"));
  const flag = (f) => { const i = args.indexOf(f); return i >= 0 && !!args.splice(i, 1); };

  if (flag("--components")) {
    const reg = path.join(ROOT, "vendor", "hyperframes", "registry", "components");
    const all = flag("--all"), blocks = path.join(DIR, "hf/blocks");
    const names = all ? fs.readdirSync(reg).filter((n) => fs.existsSync(path.join(reg, n, n + ".html"))) : args;
    const files = names.length ? names.map((n) => path.join(reg, n, n + ".html"))
      : fs.existsSync(blocks) ? fs.readdirSync(blocks).filter((f) => f.endsWith(".html")).map((f) => path.join(blocks, f)) : [];
    const missing = files.filter((f) => !fs.existsSync(f));
    if (missing.length) { console.log(`no such component: ${missing.map((f) => path.basename(f, ".html")).join(", ")}`); process.exit(1); }
    step("lint --components");
    const found = await N.lintComponents(files, { SKIP, DOWNGRADE });
    for (const f of files) {
      const mine = found.filter((x) => x.file === f);
      console.log(`  ${mine.some((x) => x.level === "error") ? "FAIL" : mine.length ? "WARN" : "PASS"}  ${path.basename(f, ".html")}`);
      for (const x of mine) console.log(`          ${x.level}: ${x.line}`);
    }
    const errs = found.filter((x) => x.level === "error").length;
    console.log(`${files.length} component(s), ${errs} error(s), ${found.length - errs} other finding(s)`);
    process.exit(errs ? 1 : 0);
  }

  const noBrowser = flag("--no-browser"), hf = P.renderer === "hyperframes";
  step("lint");
  const up = hf ? await hfLint(DIR, P) : { gate: [], warn: [] };
  const native = hf ? N.staticChecks(DIR, P) : [];
  if (!noBrowser) {
    const { launch } = await import("../browser.mjs");
    (await import("../theme.mjs")).writeTheme(DIR, P);   // what a render writes before it opens the page
    if (hf) (await import("../kit_files.mjs")).copyKit(path.join(DIR, "hf"));
    const [W, H] = (process.env.REELWRIGHT_SIZE || `${P.width || 1920}x${P.height || 1080}`).split("x").map(Number);
    const b = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
    try {
      const p = await b.newPage({ viewport: { width: W, height: H } }), errs = [];
      p.on("pageerror", (e) => errs.push(e.message));
      await p.goto(pathToFileURL(path.join(DIR, hf ? "hf/index.html" : "film/index.html")).href);
      if (!(await p.evaluate(() => window.READY).catch(() => false))) { console.log(`the film page failed to load: ${errs.join("; ") || "READY never resolved"}`); process.exit(1); }
      native.push(...await N.pageChecks(p, { DIR, P }));
    } finally { await b.close(); }
  } else if (hf) native.push(...N.hdrCheck(DIR, P));
  for (const l of up.gate) console.log(`  FAIL  ${l}`);
  for (const l of [...up.warn, ...native]) console.log(`  WARN  ${l}`);
  console.log(`${up.gate.length} error(s), ${up.warn.length + native.length} warning(s)${hf ? "" : " (not a hyperframes film: native checks only)"}`);
  if (up.gate.length) process.exit(1);
}

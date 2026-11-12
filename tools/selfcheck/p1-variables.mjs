// node tools/selfcheck/p1-variables.mjs — row hyperframes:A5, composition variables (tools/variables.js).
// 1. the checks: all 7 types (string number color boolean enum font image) pass and fail as HyperFrames' validateVariables does;
//    declaration errors, unknown_variable_binding, variable_src_not_media, unknown_variable_usage, csv-free defaults + overrides.
// 2. in a page, on both renderers (pvk file:// page, hyperframes under the producer's file server with the HyperFrames
//    runtime): KIT.vars() = defaults, then overrides; data-var-text, data-var-src and the --id CSS property follow; the
//    pixels change with the override; a wrong type throws; declarations also come from <html data-composition-variables>.
// 3. the CLI: `--variables '<json>'` / `--variables-file` on `film` (bin/reelwright.mjs patch, tested on a copy when the
//    patch isn't applied yet) renders the override into the mp4, restores kit-vars.js after, and refuses a bad value
//    before rendering. No network; offline fixture (tools/selfcheck/p1-fixture.mjs).
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { launch } from "../browser.mjs";
import { copyKit } from "../kit_files.mjs";
import { createFileServer } from "@hyperframes/producer";
import { loadVars } from "../commands/batch.mjs";
import { ROOT, W, H, DECLS, tmpdir, makeProject, rw, pixel } from "./p1-fixture.mjs";

const V = loadVars(), tmp = tmpdir("variables");
const codes = (xs) => xs.map((i) => i.code);

// ── 1. the checks ───────────────────────────────────────────────────────────
{
  assert.deepEqual(V.TYPES, ["string", "number", "color", "boolean", "enum", "font", "image"]);
  assert.deepEqual(V.checkDecls(DECLS), [], "the fixture's 7 declarations are valid");
  const good = { title: "x", accent: "#fff", bars: 5, tone: "loud", dark: true, face: { name: "Inter", source: "inter.woff2" }, logo: { url: "a.png" } };
  assert.deepEqual(V.validate(good, DECLS), [], "a good value of every type passes");
  assert.deepEqual(V.validate({ face: "Georgia", logo: "b.png" }, DECLS), [], "font and image also take a plain string");
  const badVals = { title: 1, accent: 2, bars: "3", tone: "mid", dark: "yes", face: { name: 1 }, logo: { href: "x" } };
  for (const [id, v] of Object.entries(badVals)) {
    const r = V.validate({ [id]: v }, DECLS);
    assert.equal(r.length, 1, `${id}: ${JSON.stringify(v)} must be refused`);
    assert.equal(r[0].level, "error");
  }
  assert.deepEqual(codes(V.validate({ tone: "mid" }, DECLS)), ["variable_enum_out_of_range"]);
  assert.deepEqual(codes(V.validate({ bars: NaN }, DECLS)), ["variable_type_mismatch"], "NaN is not a number");
  assert.deepEqual(V.validate({ nope: 1 }, DECLS).map((i) => [i.level, i.code]), [["warn", "undeclared_variable"]]);
  assert.deepEqual(V.validate({ nope: 1 }, DECLS, { strict: true }).map((i) => i.level), ["error"], "--strict-variables: undeclared is an error");

  const r = V.resolve(DECLS, { title: "Hi", extra: 9 });
  assert.equal(r.values.title, "Hi"); assert.equal(r.values.bars, 3); assert.equal(r.values.extra, 9, "undeclared passes through, as in HyperFrames");

  assert.deepEqual(codes(V.checkDecls({})), ["variables_not_array"]);
  const d = (x) => codes(V.checkDecls([x]));
  assert.deepEqual(d({ id: "9x", type: "string", default: "" }), ["invalid_variable_id"]);
  assert.deepEqual(d({ id: "a", type: "date", default: "" }), ["invalid_variable_type"]);
  assert.deepEqual(d({ id: "a", type: "number" }), ["missing_default"]);
  assert.deepEqual(d({ id: "a", type: "number", default: "1" }), ["default_type_mismatch"]);
  assert.deepEqual(d({ id: "a", type: "enum", default: "x" }), ["invalid_enum_options"]);
  assert.deepEqual(d({ id: "a", type: "enum", default: "z", options: ["x", { value: "y", label: "Y" }] }), ["default_type_mismatch"]);
  assert.deepEqual(codes(V.checkDecls([{ id: "a", type: "string", default: "" }, { id: "a", type: "string", default: "" }])), ["duplicate_variable_id"]);

  const html = `<h1 data-var-text="title"></h1><img data-var-src="logo"><p data-var-text="ghost"></p><div data-var-src="logo"></div>`;
  assert.deepEqual(V.lintBindings(html, DECLS).map((i) => [i.code, i.id]), [["unknown_variable_binding", "ghost"], ["variable_src_not_media", "logo"]]);
  assert.deepEqual(V.lintBindings(`<span data-var-text='title'>`, DECLS), []);
  assert.deepEqual(V.lintScript("const a = KIT.vars().title; const { bars, tone: t, zzz = 1 } = KIT.vars(); KIT.vars().nope", DECLS).map((i) => i.id).sort(), ["nope", "zzz"]);
  const attr = JSON.stringify([{ id: "k", type: "string", default: "a\"b" }]).replace(/"/g, "&quot;");
  assert.deepEqual(V.parseHtmlDecls(`<html data-composition-variables="${attr}">`), [{ id: "k", type: "string", default: 'a"b' }]);
  assert.deepEqual(V.parseHtmlDecls("<html>"), []);
  assert.throws(() => V.parseHtmlDecls(`<html data-composition-variables="{bad">`), /not valid JSON/);
  assert.ok(!V.fileText(DECLS, { title: "</script>" }).includes("</script>"), "kit-vars.js can't close a script tag");
  console.log("PASS  checks: 7 types, declarations, enum, strict, bindings, script usage, html attribute");
}

// ── 2. in a page, both renderers ────────────────────────────────────────────
const proj = makeProject(path.join(tmp, "proj")), hf = path.join(proj, "hf");
fs.writeFileSync(path.join(hf, "kit-data.js"), `window.PROJECT={fps:10,width:${W},height:${H},speechEnd:0.9,tail:0.2};window.VO={a:{at:0,start:0.1,end:0.9,text:"hello there",words:[{w:"hello",t:0.1,d:0.35},{w:"there",t:0.5,d:0.35}]}};window.MUSIC={source:"synth",bpm:120,beat:0.5,bar:2,t0:0};\n`);
copyKit(hf);
// pvk copy of the same page: the kit by absolute file URL, the way tools/selfcheck/runtimes.mjs does it
const pvkDir = path.join(tmp, "pvk");
fs.mkdirSync(pvkDir, { recursive: true });
const urlOf = (f) => pathToFileURL(path.join(ROOT, "tools", f)).href;
const pvkPage = (extra = (s) => s) => extra(fs.readFileSync(path.join(hf, "index.html"), "utf8").replace(/kit\/(kit\.css|engine\.js|variables\.js)/g, (_, f) => urlOf(f)));
for (const f of ["kit-data.js", "film.js", "theme.css"]) fs.copyFileSync(path.join(hf, f), path.join(pvkDir, f));
const OVER = { title: "Overridden", accent: "#0000ff", bars: 5, tone: "loud", dark: false, logo: { url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='%2300f'/></svg>" } };
const setVars = (values, decls = DECLS) => { for (const d of [hf, pvkDir]) fs.writeFileSync(path.join(d, "kit-vars.js"), V.fileText(decls, V.resolve(decls, values).values)); };

async function open(renderer, mutate) {
  const dir = renderer === "pvk" ? pvkDir : hf;
  if (renderer === "pvk") fs.writeFileSync(path.join(pvkDir, "index.html"), pvkPage(mutate)); else if (mutate) fs.writeFileSync(path.join(hf, "index.html"), mutate(fs.readFileSync(path.join(hf, "index.html"), "utf8")));
  const browser = await launch(["--force-device-scale-factor=1", "--allow-file-access-from-files"]);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }), errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  const server = renderer === "pvk" ? null : await createFileServer({ projectDir: dir, fps: 10 });
  await page.goto(server ? server.url + "/index.html" : pathToFileURL(path.join(dir, "index.html")).href);
  const ready = renderer === "pvk" ? () => page.evaluate(() => window.READY === undefined ? false : window.READY) : () => page.evaluate(() => !!window.__hf && typeof window.__hf.seek === "function" && window.__hf.duration > 0);
  for (let i = 0; !(await ready().catch(() => false)); i++) { if (i > 100 || errs.length) break; await new Promise((r) => setTimeout(r, 100)); }
  const at = async (t) => {
    if (renderer === "pvk") await page.evaluate((t) => window.render(t), t); else await page.evaluate(async (t) => { window.__hf.seek(t); await window.__hfWaitForSeekCompletion?.(); }, t);
    return page.screenshot({ type: "png" });
  };
  const probe = () => page.evaluate(() => {
    const st = document.getElementById("stage"), bars = [...st.querySelectorAll(".bar")];
    return { vars: window.KIT.vars(), title: st.querySelector("h1").textContent, src: st.querySelector("img").getAttribute("src"), cssAccent: st.style.getPropertyValue("--accent"),
      barColor: getComputedStyle(bars[0]).backgroundColor, bars: bars.length, panel: getComputedStyle(st.querySelector(".panel")).backgroundColor };
  });
  return { page, errs, at, probe, close: async () => { await browser.close(); server && server.close(); } };
}
const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

const seen = {};
for (const renderer of ["pvk", "hyperframes"]) {
  setVars({});
  let p = await open(renderer);
  const defShot = await p.at(1), def = await p.probe();
  assert.deepEqual(p.errs, [], `${renderer}: page errors with defaults`);
  assert.deepEqual(def.vars, Object.fromEntries(DECLS.map((d) => [d.id, d.default])), `${renderer}: KIT.vars() = the declared defaults`);
  assert.equal(def.title, "Default title"); assert.equal(def.bars, 3); assert.equal(def.barColor, rgb("#2f9e6b"), "CSS var(--accent) = the default"); assert.equal(def.cssAccent, "#2f9e6b");
  await p.close();

  setVars(OVER);
  p = await open(renderer);
  const ovShot = await p.at(1), ov = await p.probe();
  assert.deepEqual(p.errs, [], `${renderer}: page errors with overrides`);
  assert.equal(ov.vars.title, "Overridden"); assert.equal(ov.vars.bars, 5); assert.equal(ov.vars.tone, "loud"); assert.equal(ov.vars.face, "Arial", "an unset variable keeps its default");
  assert.equal(ov.title, "Overridden", "data-var-text"); assert.equal(ov.src, OVER.logo.url, "data-var-src takes an image {url}");
  assert.equal(ov.bars, 5, "film.js built 5 bars from KIT.vars().bars"); assert.equal(ov.barColor, rgb("#0000ff"), "var(--accent) follows the override");
  assert.equal(ov.panel, rgb("#ee3333"), "enum tone=loud");
  assert.notDeepEqual(ovShot, defShot, `${renderer}: the override changes the pixels`);
  await p.close();
  seen[renderer] = ov;

  // a wrong type fails loudly at load
  setVars({}); fs.writeFileSync(path.join(renderer === "pvk" ? pvkDir : hf, "kit-vars.js"), V.fileText(DECLS, {}).replace("window.__hfVariables={", 'window.__hfVariables={"bars":"three",'));
  p = await open(renderer);
  assert.ok(p.errs.some((e) => /KIT\.vars: "bars" expected number, got string/.test(e)), `${renderer}: bad type throws; got ${p.errs.join(" | ")}`);
  await p.close();
}
assert.deepEqual({ ...seen.pvk, panel: 0 }, { ...seen.hyperframes, panel: 0 }, "both renderers see the same variables, text, src and CSS");

// declarations from <html data-composition-variables> alone (no __hfDeclared), the canonical HyperFrames shape
{
  const attr = JSON.stringify(DECLS).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  for (const d of [hf, pvkDir]) fs.writeFileSync(path.join(d, "kit-vars.js"), 'window.__hfVariables={"title":"From attribute"};\n');
  const p = await open("pvk", (s) => s.replace("<html>", `<html data-composition-variables="${attr}">`));
  const r = await p.probe(); await p.at(1);
  assert.deepEqual(p.errs, []);
  assert.equal(r.title, "From attribute"); assert.equal(r.vars.bars, 3, "defaults come from the html attribute");
  await p.close();
}
console.log("PASS  pages: pvk and hyperframes — defaults, overrides, data-var-text/src, --id CSS, pixels, bad type throws, html attribute");

// ── 3. the CLI: --variables / --variables-file on film ──────────────────────
{
  const pj = makeProject(path.join(tmp, "cli")), go = rw;   // rw runs bin/reelwright.mjs, or a copy with the P1 patch until it is applied
  {
    const before = fs.readFileSync(path.join(pj, "hf", "kit-vars.js"), "utf8");
    const bad = go("film", pj, "--variables", '{"bars":"three"}');
    assert.equal(bad.status, 1); assert.match(bad.out, /variable_type_mismatch/); assert.ok(!fs.existsSync(path.join(pj, "out")), "a bad value renders nothing");
    const unk = go("film", pj, "--variables", '{"zzz":1}', "--strict-variables");
    assert.equal(unk.status, 1); assert.match(unk.out, /undeclared_variable/);
    fs.writeFileSync(path.join(tmp, "v.json"), JSON.stringify({ accent: "#0000ff", bars: 4 }));
    const ok = go("film", pj, "--variables-file", path.join(tmp, "v.json"));
    assert.equal(ok.status, 0, ok.out);
    const mp4 = path.join(pj, "out", "fx.mp4");
    const [r, g, b] = pixel(mp4, 20, 132, 1.0);
    assert.ok(b > 200 && r < 60 && g < 60, `bar colour in the mp4 should be the blue override, got ${r},${g},${b}`);
    assert.equal(fs.readFileSync(path.join(pj, "hf", "kit-vars.js"), "utf8"), before, "kit-vars.js restored after the run");
    fs.rmSync(path.join(pj, "out"), { recursive: true });
    assert.equal(go("film", pj).status, 0);
    const [r2, g2, b2] = pixel(mp4, 20, 132, 1.0);
    assert.ok(g2 > 120 && b2 < 140 && r2 < 90, `no override: default green bar, got ${r2},${g2},${b2}`);
  }
  console.log("PASS  cli: --variables / --variables-file / --strict-variables on film change the mp4, bad values stop before rendering, kit-vars.js restored");
}
fs.rmSync(tmp, { recursive: true, force: true });

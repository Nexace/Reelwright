// gallery [shotcards|effects|all] [--out dir] [--check] [--only id,id]   render every shotcard helper and every fx-* effect at 3 to 5 moments
//                  (pvk renderer, offline, deterministic) → <out>/index.html (default docs/gallery: a grid with a module filter, a contact
//                  strip, the helper call and the recipe link per item) and <out>/refs/<id>.jpg. --check renders again and compares with
//                  <out>/refs/ (per-pixel tolerance), writes nothing and exits 1 listing the items that changed. --only takes ids such as
//                  outro.logoLockup, effects.fuiHud or fx-blur.zoomBlur (a partial run refreshes only those refs).
import { run } from "../gallery.mjs";

export default async function gallery({ args }) {
  const val = (f) => { const i = args.indexOf(f); return i < 0 ? undefined : args.splice(i, 2)[1]; };
  const out = val("--out") || "docs/gallery", only = (val("--only") || "").split(",").filter(Boolean);
  const ci = args.indexOf("--check"), check = ci >= 0; if (check) args.splice(ci, 1);
  const kind = args.shift() || "all";
  if (!["shotcards", "effects", "all"].includes(kind) || args.length) { console.log("usage: reelwright gallery [shotcards|effects|all] [--out dir] [--check] [--only id,id]"); process.exit(1); }
  const r = await run({ kinds: kind === "all" ? ["shotcards", "effects"] : [kind], out, check, only });
  if (check) {
    console.log(r.length ? `gallery check: ${r.length} item(s) changed or failed:\n  ${r.join("\n  ")}` : "gallery check: every item matches its reference strip");
    process.exit(r.length ? 1 : 0);
  }
  console.log(`gallery: ${r.length} item(s) → ${out}/${only.length ? "refs/" : "index.html"}`);
}

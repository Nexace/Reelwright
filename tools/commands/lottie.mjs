// lottie [project] <file.lottie> [out.json] [--animation <id>]   DEPRECATED alias of `add-lottie --inline` (same arguments, same output):
//                        unzip a dotLottie file into plain Lottie JSON (images inlined) for KIT.lottie. Use add-lottie.
import addLottie from "./add-lottie.mjs";

export default async function lottie(ctx) {
  console.error("note: `reelwright lottie` is deprecated: use `reelwright add-lottie --inline` (same arguments)");
  return addLottie({ ...ctx, args: ["--inline", ...ctx.args] });
}

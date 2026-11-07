# Vendored: GSAP

- Upstream: https://gsap.com (npm: https://www.npmjs.com/package/gsap)
- Version: **3.15.1**, the published npm tarball `gsap-3.15.1.tgz` (`npm pack gsap@3.15.1`,
  integrity `sha512-63yjWRFWj3QRP1UOuD8kcidCcy3nxb1mMRpwHr/xJRvPfm9GtWOXFAYUiL0ro1fgPq2nY53LR+98pAgy9BumBg==`)
- License: **not MIT and not open source.** GSAP is under Webflow's "Standard No Charge" GSAP License, see
  [LICENSE-GSAP.md](LICENSE-GSAP.md) (text fetched 2026-11-07, effective 2025-04-30).

## Read this about the license

- GSAP is NOT open source and NOT MIT. It is free to use under the Standard No Charge GSAP License, which has conditions.
- The copyright banner at the top of every `.min.js` must not be removed or altered (the license forbids it).
- The license is silent on redistributing GSAP inside another project. The owner approved bundling it here (2026-11-05).
- Its Prohibited Uses clause means Reelwright must never expose GSAP authoring in a visual no-code editor (studio).
  Keep studio work on KIT primitives.
- Webflow may amend the license. This copy was fetched on 2026-11-07; re-read the current terms when updating.

## What we took

From the tarball's `dist/`, byte for byte:

- `dist/gsap.min.js` (73,357 bytes, sha256 `3d1bea374ab1b703cc5c4105358eec63c4465efdc573931dc116e34a0a190c1b`): the GSAP core, used by `KIT.gsap` (tools/runtimes.js)
- `dist/CustomEase.min.js` (7,143 bytes, sha256 `2cf6fd7afab6c4b24b32d233430026c74748dc9af7f0f56b1959cd8a03598028`): custom ease curves
- `dist/CustomWiggle.min.js` (2,274 bytes, sha256 `85debf78438c95008df86abdf9708572e6faba7d2dd1167a707f133582e1dfef`): wiggle eases
- `dist/CustomBounce.min.js` (2,068 bytes, sha256 `ddf3240fba08935a1d9263e608ba8508eb166d1e573d020dbece2558df5ab987`): bounce eases
- `dist/EasePack.min.js` (2,437 bytes, sha256 `eb589605897f6806c5da89cc34bd0ee843486fed14fa79b43908e5f13f65a72e`): Rough, Slow and Expo-scale eases
- `dist/SplitText.min.js` (7,955 bytes, sha256 `7b299a6b26b36fd5ce1c0712f31d6d25f98f9a9860778c2d3a78ce8f880f2edf`): split text into chars, words and lines
- `dist/DrawSVGPlugin.min.js` (4,351 bytes, sha256 `e950c5fb54281dcc8b17212b6e5d2b1dc225c1f7e214192a804ca83a8a8ef2e6`): stroke draw-on
- `dist/MorphSVGPlugin.min.js` (21,195 bytes, sha256 `94274c58a52c17643cedcd08144e3d8dc5b05dde975c39abf7069f9ee5884fe3`): SVG path morphing
- `dist/TextPlugin.min.js` (10,570 bytes, sha256 `9511867ae7940c16c4ca18bf979406e26bfac99ef9847ab4fdfdb3a52c81efd0`): text replacement tweens
- `dist/Physics2DPlugin.min.js` (2,243 bytes, sha256 `ed882572b63a76ea81b6132ec2ef13dfe19c0d2c50825f2c854469dc51175e1e`): 2D velocity and gravity tweens
- `dist/PhysicsPropsPlugin.min.js` (1,989 bytes, sha256 `c1f21f6a8bc0e090b054237569fbb633179f2889953a400bd51ca24bb5cfaa7e`): physics on arbitrary properties
- `LICENSE-GSAP.md` (5,544 bytes, sha256 `1be7793987d9b8cea9069df9828c4b205b636d980c6a89e1b7185a2317a73709`): the license text, fetched from gsap.com (not part of the tarball)

Left out:

- ScrollTrigger, ScrollSmoother, ScrollTo, Observer, Draggable, Inertia, GSDevTools, MotionPathHelper, and the Pixi and Easel
  plugins: interactive or wall-clock driven, not seekable.
- Flip and CSSRulePlugin: seek behaviour unverified.
- MotionPathPlugin: failed a shuffled-seek test; the native `KIT.path` comes in checkpoint 10e.
- ScrambleTextPlugin: calls `Math.random` on every render.
- All `.map` files and the non-min builds.

## What we changed

Nothing. If you change a file, put this at its top: `/* Changed from upstream GSAP (GSAP Standard No Charge License): <what and why> */`
and list the change here. Never remove or alter the upstream banner.

## How it is loaded

- pvk films: `<script src="../../../vendor/gsap/dist/gsap.min.js">` (plus any plugin files) before `tools/runtimes.js`,
  which loads after `tools/engine.js`.
- HyperFrames films: the renderer (and `preview`) copies this folder to `hf/kit/gsap/`, so the page loads
  `kit/gsap/dist/gsap.min.js`. Keep the `dist/` part: it stops HyperFrames rewriting the script to its CDN.

## Updating

`npm pack gsap@<version>` in a scratch folder, copy the `dist/*.min.js` files listed above over these, re-fetch
`LICENSE-GSAP.md` and check whether the terms changed, update the version, integrity and sizes above, run
`node tools/selfcheck/runtimes.mjs`.

`kit.json` is ours, not upstream: it marks this folder for copying into `hf/kit/gsap/` (tools/kit_files.mjs). Keep it when updating.

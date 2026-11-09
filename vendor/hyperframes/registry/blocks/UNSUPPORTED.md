# Unsupported HyperFrames blocks

87 upstream blocks are not vendored. `reelwright add <name>` prints the reason and exits 1.

| Block | Reason |
|---|---|
| `apple-money-count` | plays <audio>/<video> media; KIT.mount doesn't re-time media inside a block |
| `aurora` | needs WebGPU hardware |
| `blob` | needs WebGPU hardware |
| `blue-sweater-intro-video` | plays <audio>/<video> media; KIT.mount doesn't re-time media inside a block |
| `canopy-part-title` | needs three addon examples/jsm/postprocessing/EffectComposer.js (not vendored) |
| `chrome-orb` | needs WebGPU hardware |
| `cinemagraph` | plays <audio>/<video> media; KIT.mount doesn't re-time media inside a block |
| `code-3d-extrude` | needs the three r147 global build (three.min.js); vendored three is r187 ES modules |
| `code-highlight` | failed verification: t=2: 56815 px differ between seek orders / mount times; t=3: 56815 px differ between seek orders / mount times; t=4: 56815 px differ between seek orders / mount times |
| `code-morph` | failed verification: t=1.4: 13569 px differ between seek orders / mount times; t=2.8: 16583 px differ between seek orders / mount times; t=4.2: 2961 px differ between seek orders / mount times |
| `code-particle-assemble` | needs the three r147 global build (three.min.js); vendored three is r187 ES modules |
| `code-scroll` | failed verification: t=2.4: 105384 px differ between seek orders / mount times; t=3.6: 153732 px differ between seek orders / mount times; t=4.8: 153732 px differ between seek orders / mount times |
| `code-shader-dissolve` | needs the three r147 global build (three.min.js); vendored three is r187 ES modules |
| `code-snippet-apple-terminal-pro` | failed verification: t=2.4: 1958 px differ between seek orders / mount times; t=7.2: 1958 px differ between seek orders / mount times |
| `code-snippet-dark-2026` | asset licence unknown: background.jpeg |
| `code-snippet-dark-modern` | asset licence unknown: background.jpeg |
| `code-typing` | failed verification: t=1: 224 px differ between seek orders / mount times; t=2: 224 px differ between seek orders / mount times; t=3: 192 px differ between seek orders / mount times |
| `color-wheel` | needs WebGPU hardware |
| `exploded-stack` | needs three addon examples/jsm/geometries/RoundedBoxGeometry.js (not vendored) |
| `extruded-logo` | needs three addon examples/jsm/loaders/FontLoader.js (not vendored) |
| `falling-lines` | needs WebGPU hardware |
| `flowchart` | failed verification: page error: Cannot read properties of undefined (reading 'hold5'); page error: KIT.mount: compositions/flowchart.html didn't register window.__timelines["flowchart"] with seek(t); HyperFrames runtime never became ready |
| `flowchart-vertical` | failed verification: page error: Cannot read properties of undefined (reading 'hold5'); page error: KIT.mount: compositions/flowchart-vertical.html didn't register window.__timelines["flowchart-vertical"] with seek(t); HyperFrames runtime never became ready |
| `flowing-gradient` | needs WebGPU hardware |
| `fractal-noise` | needs WebGPU hardware |
| `freeze-frame-dressing` | failed verification: t=1.6: 5963 px differ between seek orders / mount times; t=2.4: 6029 px differ between seek orders / mount times; t=3.2: 6029 px differ between seek orders / mount times |
| `frost` | needs WebGPU hardware |
| `frost-sequence-camera-orbit` | needs WebGPU hardware |
| `gabor-noise` | needs WebGPU hardware |
| `gallery-tunnel` | needs the three r147 global build (three.min.js); vendored three is r187 ES modules |
| `glass-shard-title` | loads d3-delaunay from cdn.jsdelivr.net (not vendored) |
| `godrays` | needs WebGPU hardware |
| `goo` | needs WebGPU hardware |
| `heatmap` | needs WebGPU hardware |
| `heygen-avatar-promo-card` | plays <audio>/<video> media; KIT.mount doesn't re-time media inside a block |
| `hologram` | needs WebGPU hardware |
| `holographic` | needs WebGPU hardware |
| `hw-write-title` | asset licence unknown: assets/baked/caveat-pen.js |
| `instagram-follow` | asset licence unknown: assets/avatar.jpg |
| `ios26-liquid-glass` | needs the three r147 global build (three.min.js + examples/js); vendored three is r187 ES modules |
| `lens-flare` | needs WebGPU hardware |
| `light-edge` | needs WebGPU hardware |
| `liquid-glass-notification` | needs the three r128 global build (three.min.js); vendored three is r187 ES modules |
| `liquid-glass-widgets` | needs the three r128 global build (three.min.js); vendored three is r187 ES modules |
| `liquid-metal` | needs WebGPU hardware |
| `macos-tahoe-liquid-glass` | needs the three r147 global build (three.min.js + examples/js); vendored three is r187 ES modules |
| `marble` | needs WebGPU hardware |
| `mesh-gradient` | needs WebGPU hardware |
| `nebula` | needs WebGPU hardware |
| `north-korea-locked-down` | asset licence unknown: assets/korea-map.png |
| `notification-cascade` | asset licence unknown: assets/desk-backdrop.jpg |
| `nyc-paris-flight` | plays <audio>/<video> media; KIT.mount doesn't re-time media inside a block |
| `obsidian` | needs WebGPU hardware |
| `plasma` | needs WebGPU hardware |
| `plastic` | needs WebGPU hardware |
| `prism` | needs WebGPU hardware |
| `product-turntable` | needs three addon examples/jsm/environments/RoomEnvironment.js (not vendored) |
| `ripples` | needs WebGPU hardware |
| `sine-wave` | needs WebGPU hardware |
| `slack-notification-ad` | asset licence unknown: assets/img/heygen-mark.svg, assets/img/slack-mark.svg |
| `spain-map` | needs d3 + topojson + atlas data (not vendored) |
| `spiral` | needs WebGPU hardware |
| `spiral-galaxy` | needs the three r147 global build (three.min.js); vendored three is r187 ES modules |
| `strands` | needs WebGPU hardware |
| `stripes` | needs WebGPU hardware |
| `sun-burst` | needs WebGPU hardware |
| `swirl` | needs WebGPU hardware |
| `thin-film` | needs WebGPU hardware |
| `tiktok-follow` | asset licence unknown: assets/avatar.jpg |
| `us-map` | needs d3 + topojson + atlas data (not vendored) |
| `us-map-bubble` | needs d3 + topojson + atlas data (not vendored) |
| `us-map-flow` | needs d3 + topojson + atlas data (not vendored) |
| `vfx-iphone-device` | needs the three r147 global build (three.min.js + examples/js); vendored three is r187 ES modules |
| `vfx-liquid-background` | needs the three r147 global build (three.min.js); vendored three is r187 ES modules |
| `vfx-liquid-glass` | needs the three r147 global build (three.min.js + examples/js); vendored three is r187 ES modules |
| `vfx-magnetic` | failed verification: t=3: 5944 px differ between seek orders / mount times; t=6: 5944 px differ between seek orders / mount times; t=9: 5944 px differ between seek orders / mount times |
| `vfx-portal` | needs the three r147 global build (three.min.js); vendored three is r187 ES modules |
| `vfx-shatter` | needs the three r147 global build (three.min.js); vendored three is r187 ES modules |
| `vfx-text-cursor` | failed verification: t=3.2: 204565 px differ between seek orders / mount times |
| `voronoi` | needs WebGPU hardware |
| `vpn-youtube-spot` | plays <audio>/<video> media; KIT.mount doesn't re-time media inside a block |
| `water` | needs WebGPU hardware |
| `waveform` | needs WebGPU hardware |
| `wireframe-portal-title` | loads clipper-lib from cdn.jsdelivr.net (not vendored) |
| `world-map` | needs d3 + topojson + atlas data (not vendored) |
| `worley-noise` | needs WebGPU hardware |
| `yt-lower-third` | asset licence unknown: assets/avatar.jpg |

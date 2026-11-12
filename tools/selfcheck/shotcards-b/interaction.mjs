// tools/shotcards/interaction.js: every helper once, with the arguments the recipes in docs/recipes/shotcards/ use.
export default { scripts: ["tools/shotcards/interaction.js"], build: `
const I = KIT.shotcards, u = KIT.u, W = KIT.W_, H = KIT.H_;
card('panelToCanvas', (b) => I.panelToCanvas({ parent: b, title: 'Roadmap', at: 0.1 }));
card('diagramCascade', (b) => I.diagramCascade({ parent: b, at: 0.1 }));
const scene = (parent) => { const bg = KIT.el('div', '', parent); KIT.css(bg, { left: '0px', top: '0px', width: W + 'px', height: H + 'px', background: 'var(--kit-bg)' });
  const t = KIT.el('div', '', parent, 'Theme'); KIT.css(t, { left: W * 0.3 + 'px', top: H * 0.4 + 'px', fontSize: 100 * u + 'px', fontWeight: 800, color: 'var(--kit-ink)' });
  const c = KIT.el('div', '', parent); KIT.css(c, { left: W * 0.3 + 'px', top: H * 0.7 + 'px', width: 200 * u + 'px', height: 40 * u + 'px', borderRadius: '99px', background: 'var(--kit-accent)' }); return {}; };
card('diagramCascade.orphan', (b) => I.diagramCascade({ parent: b, nodes: [{ label: 'A', x: 0.3, y: 0.3 }, { label: 'B', x: 0.7, y: 0.3 }, { label: 'Lost', x: 0.5, y: 0.8 }], edges: [[0, 1]], at: 0.1 }));
card('themeSwitch.sweep', (b) => I.themeSwitch({ parent: b, build: scene, theme: { '--kit-bg': '#f6f4ef', '--kit-ink': '#1d1b16', '--kit-accent': '#e11d48' }, kind: 'sweep', at: 0.1 }));
card('themeSwitch.ripple', (b) => I.themeSwitch({ parent: b, build: scene, theme: { '--kit-bg': '#f6f4ef', '--kit-ink': '#1d1b16', '--kit-accent': '#6d28d9' }, kind: 'ripple', from: { x: W / 2, y: H * 0.15 }, pick: 1, at: 0.1 }));
card('voiceWaveform', (b) => I.voiceWaveform({ parent: b, env: I.voiceWaveform.synth(3, 3), at: 0 }));
card('voiceWaveform.history', (b) => I.voiceWaveform({ parent: b, env: { fps: 30, rms: I.voiceWaveform.synth(5, 3) }, mode: 'history', at: 0 }));
card('collabCursors', (b) => I.collabCursors({ parent: b, cursors: [
  { name: 'Ana', pts: [[0.1, 100, 100], [0.9, 500, 200], [1.4, 500, 200], [2, 300, 380]], click: true },
  { name: 'Bo', pts: [[0.1, 800, 100], [1.2, 400, 300], [2, 700, 450]] }] }));
card('pickerCarousel', (b) => I.pickerCarousel({ parent: b, options: ['Design', 'Build', 'Ship'], every: 0.7, at: 0.1 }));
card('segmentedThumb', (b) => I.segmentedThumb({ parent: b, segments: ['Day', 'Week', 'Month'], at: 0, sel: [[0.5, 1], [1.4, 2], [2.3, 0]] }));
card('typeAndFilter', (b) => I.typeAndFilter({ parent: b, rows: ['Apple pie', 'Apricot tart', 'Banana bread', 'Blueberry muffin', 'Cherry cake', 'Apple crumble'], query: 'apple', at: 0.2 }));
` };

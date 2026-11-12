// tools/shotcards/data.js: every helper once, with the arguments the recipes in docs/recipes/shotcards/ use.
export default { scripts: ["tools/shotcards/data.js"], build: `
const D = KIT.shotcards, u = KIT.u;
const log = Array.from({ length: 14 }, (_, i) => ({ tag: 'v1.' + i, text: 'Release notes ' + (i + 1) }));
card('scrollBrake.changelog', (b) => D.scrollBrake({ parent: b, rows: log, target: 10, at: 0.1, dur: 2 }));
card('scrollBrake.reticle', (b) => D.scrollBrake({ parent: b, rows: log, target: 10, variant: 'reticle', at: 0.1, dur: 2 }));
card('beforeAfterSlider', (b) => D.beforeAfterSlider({ parent: b, at: 0.1 }));
card('oscilloscopeStream', (b) => D.oscilloscopeStream({ parent: b, at: 0, dur: 3 }));
card('unitDotSwarmRegroup', (b) => D.unitDotSwarmRegroup({ parent: b, groups: [{ label: 'Free', count: 24 }, { label: 'Pro', count: 12 }, { label: 'Team', count: 6 }], at: 0, regroupAt: 1 }));
card('axisRescaleShock', (b) => D.axisRescaleShock({ parent: b, values: [40, 55, 48, 62, 300], at: 0.1, shockAt: 1.2 }));
card('needleSweepSelftest', (b) => D.needleSweepSelftest({ parent: b, value: 72, at: 0.1, unit: '%' }));
card('tapeScrollFixedPointer', (b) => D.tapeScrollFixedPointer({ parent: b, from: 0, to: 240, step: 20, at: 0.1, unit: ' km/h' }));
card('timelineTravel', (b) => D.timelineTravel({ parent: b, events: [{ label: 'Founded', date: '2019' }, { label: 'Seed', date: '2021' }, { label: 'v1.0', date: '2023' }, { label: 'Global', date: '2025' }], at: 0.1 }));
` };

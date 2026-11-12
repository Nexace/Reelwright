// tools/shotcards/effects.js: every helper once, with the arguments the recipes in docs/recipes/shotcards/ use.
export default { scripts: ["tools/shotcards/effects.js"], build: `
const F = KIT.shotcards, u = KIT.u, W = KIT.W_, H = KIT.H_;
const solid = (b, css, html) => { const e = KIT.el('div', '', b, html || ''); KIT.css(e, Object.assign({ position: 'absolute' }, css)); return e; };
card('assembleThenTypeFlyin', (b) => F.assembleThenTypeFlyin({ parent: b, text: 'Assembled', at: 0.1 }));
card('risoPrintHits', (b) => F.risoPrintHits({ parent: b, text: 'PRINT', hits: [0.3, 0.9, 1.5] }));
card('scanlineAssembleFlyin', (b) => F.scanlineAssembleFlyin({ parent: b, items: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'], at: 0.1, dur: 1.5 }));
card('auroraBloomBgFlip', (b) => F.auroraBloomBgFlip({ parent: b, at: 0, flipAt: 1.2 }));
card('fuiHud', (b) => F.fuiHud({ parent: b, at: 0.1, lockAt: 1.4 }));
card('glowOrbAmbient', (b) => F.glowOrbAmbient({ parent: b }));
card('flylineArc', (b) => F.flylineArc({ parent: b, at: 0.1 }));
card('orbFlylineRelay', (b) => F.orbFlylineRelay({ parent: b, at: 0.1 }));
card('attentionBounce', (b) => F.attentionBounce({ el: solid(b, { left: W / 2 - 50 * u + 'px', top: H / 2 - 50 * u + 'px', width: 100 * u + 'px', height: 100 * u + 'px', background: '#6ee7b7', borderRadius: '24px' }), at: 0.1 }));
card('iconMorph', (b) => F.iconMorph({ parent: b, at: 0.2 }));
card('hitCounter', (b) => F.hitCounter({ parent: b, hits: [0.2, 0.5, 0.8, 1.2] }));
card('animeImpact', (b) => F.animeImpact({ parent: b, at: 0.2 }));
card('spotlightSweep', (b) => { solid(b, { left: '0px', top: '0px', width: W + 'px', height: H + 'px', background: 'linear-gradient(135deg, #6ee7b7, #93c5fd)' }); return F.spotlightSweep({ parent: b, at: 0.1, dur: 2 }); });
card('sheenSweep', (b) => { solid(b, { left: W * 0.2 + 'px', top: H * 0.3 + 'px', width: W * 0.6 + 'px', height: H * 0.4 + 'px', background: '#335', borderRadius: '14px' }); return F.sheenSweep({ parent: b, at: 0.1, every: 0.8, times: 2 }); });
card('radialRipplePhoneChips', (b) => F.radialRipplePhoneChips({ parent: b, at: 0.1 }));
card('scanBracketSweep', (b) => F.scanBracketSweep({ parent: b, at: 0.1 }));
card('scanlineAnnotateFocus', (b) => { solid(b, { left: W * 0.12 + 'px', top: H * 0.2 + 'px', width: W * 0.36 + 'px', height: H * 0.6 + 'px', background: '#475569', borderRadius: '14px' }); return F.scanlineAnnotateFocus({ parent: b, at: 0.1, label: 'The part that matters' }); });
card('kanadaPerspectiveSnap', (b) => F.kanadaPerspectiveSnap({ parent: b, at: 0.2, text: 'SNAP' }));
card('scoreSlam', (b) => F.scoreSlam({ parent: b, at: 0.1, value: 9850 }));
card('impactBurst', (b) => F.impactBurst({ parent: b, at: 0.2 }));
card('glowWakeSleepPanel', (b) => F.glowWakeSleepPanel({ parent: b, at: 0, wakeAt: 0.5, sleepAt: 2.2 }));
card('slideSpotlightPan', (b) => F.slideSpotlightPan({ parent: b, columns: ['Plan the shot', 'Record it', 'Cut it', 'Ship it'], every: 0.7, at: 0.1 }));
card('cornerSpotlightReveal', (b) => F.cornerSpotlightReveal({ parent: b, html: '<div style="position:absolute;inset:0;background:linear-gradient(135deg,#6ee7b7,#93c5fd);border-radius:14px"></div>', at: 0.1 }));
` };

// tools/shotcards/ui-entrance.js: every helper once, with the arguments the recipes in docs/recipes/shotcards/ use.
export default { scripts: ["tools/shotcards/ui-entrance.js"], build: `
const U = KIT.shotcards, u = KIT.u;
const names = ['Ana', 'Bo', 'Cy', 'Di', 'Ed', 'Flo'];
card('avatarBracketCarousel', (b) => U.avatarBracketCarousel({ parent: b, avatars: names.map((n) => ({ label: n[0] })), every: 0.5, at: 0.1 }));
card('bezierConverge', (b) => U.bezierConverge({ parent: b, at: 0.1, result: 'Merged' }));
card('cardStack', (b) => U.cardStack({ parent: b, cards: ['One', 'Two', 'Three', 'Four'], every: 0.6, at: 0.1 }));
card('clonerDepthEcho', (b) => { const e = KIT.el('div', '', b, 'ECHO'); KIT.css(e, { position: 'absolute', left: (KIT.W_ / 2 - 90 * u) + 'px', top: (KIT.H_ / 2 - 40 * u) + 'px', width: 180 * u + 'px', height: 80 * u + 'px', background: '#6ee7b7', color: '#0f1115', textAlign: 'center', lineHeight: 80 * u + 'px', borderRadius: '12px' }); return U.clonerDepthEcho({ el: e, at: 0, dur: 2 }); });
card('deckDealFlyin', (b) => U.deckDealFlyin({ parent: b, cards: 8, at: 0.1 }));
card('contactShadowLift', (b) => U.contactShadowLift({ parent: b, at: 0.1 }));
card('integrationHubMap', (b) => U.integrationHubMap({ parent: b, hub: 'Hub', nodes: ['Slack', 'Git', 'Docs', 'Mail', 'Cal'].map((label) => ({ label })), at: 0.1 }));
card('listStackPress', (b) => U.listStackPress({ parent: b, rows: ['Inbox', 'Drafts', 'Sent', 'Archive'], row: 1, at: 0.1 }));
card('neonFrameForerun', (b) => U.neonFrameForerun({ parent: b, at: 0.1 }));
card('neonFrameOrbitDrop', (b) => U.neonFrameOrbitDrop({ parent: b, at: 0.1 }));
card('pageWaterfallWall', (b) => U.pageWaterfallWall({ parent: b, at: 0, dur: 2 }));
card('productCardProgressive', (b) => U.productCardProgressive({ parent: b, at: 0.1 }));
card('radialWave', (b) => U.radialWave({ parent: b, count: 12, at: 0.1 }));
card('researchCardStackScroll', (b) => U.researchCardStackScroll({ parent: b, cards: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'].map((title) => ({ title, body: 'Source notes and summary.' })), at: 0.1 }));
card('rowEmbed', (b) => U.rowEmbed({ parent: b, rows: ['Report', 'Budget', 'Roadmap', 'Notes'], row: 1, close: true, at: 0.1 }));
card('valueStaggerGradient', (b) => U.valueStaggerGradient({ parent: b, values: [{ label: 'Speed', value: 35 }, { label: 'Quality', value: 72 }, { label: 'Reach', value: 94 }], suffix: '%', at: 0.1 }));
card('bentoLightUp', (b) => U.bentoLightUp({ parent: b, at: 0.1 }));
card('wireframeDrawOn', (b) => U.wireframeDrawOn({ parent: b, at: 0.1 }));
` };

// tools/shotcards/typography.js: every helper once, with the arguments the recipes in docs/recipes/shotcards/ use.
export default { scripts: ["tools/shotcards/typography.js"], build: `
const T = KIT.shotcards, u = KIT.u, W = KIT.W_, H = KIT.H_;
card('textColumnConverge', (b) => T.textColumnConverge({ parent: b, columns: [['Plan', 'Draft', 'Review'], ['Ship'], ['Measure', 'Learn', 'Repeat']], at: 0.1 }));
card('titleDemoteToLabel.A', (b) => T.titleDemoteToLabel({ parent: b, text: 'Reelwright', from: { x: W / 2, y: H / 2, size: 120 * u, color: '#f4f1ea' }, to: { x: 150 * u, y: 60 * u, size: 28 * u, color: '#6ee7b7' }, at: 0.2 }));
card('titleDemoteToLabel.B', (b) => T.titleDemoteToLabel({ parent: b, variant: 'B', text: 'Reelwright', label: 'Chapter one', from: { x: W / 2, y: H / 2, size: 120 * u, color: '#f4f1ea' }, to: { x: 150 * u, y: 60 * u, size: 28 * u, color: '#6ee7b7' }, at: 0.2 }));
card('countdownArcScatter', (b) => T.countdownArcScatter({ parent: b, from: 3, per: 0.6, at: 0.1 }));
card('flyingWords', (b) => T.flyingWords({ parent: b, words: ['Make', 'every', 'frame', 'count', 'today', 'again'], at: 0 }));
card('gradientWordSweep', (b) => T.gradientWordSweep({ parent: b, text: 'Ideas become motion', at: 0.1 }));
card('leadWordZoomAssemble', (b) => T.leadWordZoomAssemble({ parent: b, words: ['Faster', 'than', 'a', 'storyboard'], at: 0.1 }));
card('outlineWordFill', (b) => T.outlineWordFill({ parent: b, text: 'OUTLINE', size: 160 * u, at: 0.1 }));
card('pillSlotCycle', (b) => T.pillSlotCycle({ parent: b, size: 90 * u, words: ['faster', 'cleaner', 'smarter', 'ready'], every: 0.5, at: 0.1 }));
card('chipRail', (b) => T.chipRail({ parent: b, chips: [['draft', 'review', 'done'], ['queued', 'sent'], ['red', 'amber', 'green']], every: 0.3, stagger: 0.3, size: 80 * u, at: 0.1 }));
card('splitTextStagger', (b) => T.splitTextStagger({ parent: b, text: 'Split and stagger', at: 0.1 }));
card('driftAssembly', (b) => T.driftAssembly({ parent: b, text: 'Drift assembly', at: 0.1 }));
card('textOnPath', (b) => T.textOnPath({ parent: b, text: 'Text that follows a curve', size: 60 * u, guide: true, at: 0.1 }));
card('textOnPath.reveal', (b) => T.textOnPath({ parent: b, text: 'Revealed along the path', size: 60 * u, mode: 'reveal', at: 0.1 }));
card('letterDrop', (b) => T.letterDrop({ parent: b, text: 'DROP IT', at: 0.1 }));
card('fontWeightPump', (b) => T.fontWeightPump({ parent: b, text: 'PUMP THE BEAT', beats: [0.2, 0.7, 1.2, 1.7] }));
card('karaokeFill', (b) => T.karaokeFill({ parent: b, words: ['sing', 'it', 'word', 'by', 'word'], at: 0.1 }));
card('verticalWordRoll', (b) => T.verticalWordRoll({ parent: b, words: ['Design', 'Build', 'Ship', 'Learn'], every: 0.5, at: 0.1 }));
card('wordRelayFilmstrip', (b) => T.wordRelayFilmstrip({ parent: b, words: ['Idea', 'Script', 'Shoot', 'Cut', 'Ship'], every: 0.5, at: 0.1 }));
` };

// Ink Press: the one file to edit to make this promo yours. Replace the copy and the logo letter, and set `screen` to a path under
// assets/ (a screenshot of YOUR product, 16:10 works best) where a shot shows a mock card instead. The arc below must match
// project.json "arc" (shot, role, bars, energy, hold): `node tools/selfcheck/p10-template.mjs` checks that, and
// `reelwright arc promo-ink-press` validates it. Made-up numbers stay labelled "Illustrative data".
window.CONTENT = {
  brand: 'Ink Press', logo: 'I', tagline: 'Make the page worth reading.',
  open: { kicker: 'A new kind of newsroom tool', line: 'Words deserve a better press.' },
  hero: { kicker: 'Meet Ink Press', title: 'Write once. Print everywhere.', screen: null },
  features: [
    { kicker: 'Draft', title: 'A calm place to write', body: 'No toolbars in your way. Just the page.', screen: null },
    { kicker: 'Edit', title: 'Every change, on the record', body: 'See who changed what, and why.', screen: null },
    { kicker: 'Publish', title: 'One click to every channel', body: 'Web, print and newsletter, in sync.', screen: null },
  ],
  breath: ['Take a breath.', 'Now the good part.'],
  numbers: { value: 3, unit: '×', label: 'faster to publish', note: 'Illustrative data' },
  group: { kicker: 'Join the press room', names: ['Ada', 'Ben', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hana'] },
  end: { line: 'Ink Press', sub: 'inkpress.example' },
};
// shot, role, bars, energy, hold (s): the energy arc
window.ARC = [
  ['open', 'open', 2, 1, 1.0], ['hero', 'hero', 2, 3, 1.0], ['feature1', 'feature', 2, 3, 0.5], ['breath1', 'breath', 1, 1, 1.0],
  ['feature2', 'feature', 2, 4, 0.5], ['breath2', 'breath', 1, 1, 1.0], ['feature3', 'feature', 2, 5, 0.5], ['numbers', 'feature', 2, 6, 0.5],
  ['group', 'peak', 3, 9, 0.5], ['end', 'end', 1, 3, 1.6],
];

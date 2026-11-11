// Ours, not upstream: MathJax 3 reads window.MathJax as its configuration when tex-svg-full.js loads, so this file goes first.
// No page typesetting (KIT.tex converts strings on demand), no menu or assistive/speech parts (they load from a CDN),
// glyphs as inline <path>s (fontCache 'none') so tools/tex.js can draw and morph each one.
window.MathJax = { startup: { typeset: false }, options: { enableMenu: false, enableAssistiveMml: false, enableEnrichment: false },
  svg: { fontCache: 'none' } };

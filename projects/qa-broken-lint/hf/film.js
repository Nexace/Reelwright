// QA fixture, not a real film: the page's mistakes live in hf/index.html (tools/selfcheck/hf-lint.mjs lists them).
'use strict';
const { el, show, seg, V } = KIT;
const title = el('div', 'big');
title.textContent = 'Broken on purpose';
function render(t) { show(title, seg(t, V('one').start, V('one').start + 0.3)); }
KIT.start({ dur: V('two').end + 1, render });

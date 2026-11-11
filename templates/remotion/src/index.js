// Entry for `npx remotion bundle|render`. Built with Remotion, see remotion.pro/license.
// public/kit.css and public/theme.css are copied in by tools/renderers/remotion.mjs before each build (the project's
// "style" and brand.json, fonts inlined), so themes apply here as in the other renderers.
import { registerRoot } from 'remotion';
import '../public/kit.css';
import '../public/theme.css';
import { Root } from './Root.jsx';
import { makeKit } from './kit.js';
import { DUR } from './film.mjs';

// for the QA page host (film/index.html): KIT.u / safe / DUR from the same code the film uses
if (typeof window !== 'undefined') window.REELWRIGHT = { makeKit, DUR };
registerRoot(Root);

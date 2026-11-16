import { createHighlighterCoreSync } from '@shikijs/core';
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript';
import javascript from '@shikijs/langs/javascript';
import typescript from '@shikijs/langs/typescript';
import python from '@shikijs/langs/python';
import json from '@shikijs/langs/json';
import bash from '@shikijs/langs/bash';
import html from '@shikijs/langs/html';
import css from '@shikijs/langs/css';
import githubLight from '@shikijs/themes/github-light';
import githubDark from '@shikijs/themes/github-dark';

export const LANGS = ['javascript', 'typescript', 'python', 'json', 'bash', 'html', 'css'];
export const THEMES = ['github-light', 'github-dark'];
const ALIAS = { js: 'javascript', ts: 'typescript', py: 'python', sh: 'bash', shell: 'bash', zsh: 'bash' };
let hl;
// code -> { bg, fg, lines: [[{ content, color, fontStyle }]] }; throws on a language or theme that is not bundled
export function highlight(code, lang, theme = 'github-dark') {
  hl ||= createHighlighterCoreSync({ themes: [githubLight, githubDark], langs: [...javascript, ...typescript, ...python, ...json, ...bash, ...html, ...css], engine: createJavaScriptRegexEngine() });
  lang = ALIAS[lang] || lang;
  if (!LANGS.includes(lang)) throw new Error(`shiki: language "${lang}" is not bundled (have: ${LANGS.join(', ')})`);
  if (!THEMES.includes(theme)) throw new Error(`shiki: theme "${theme}" is not bundled (have: ${THEMES.join(', ')})`);
  const r = hl.codeToTokens(code, { lang, theme });
  return { bg: r.bg, fg: r.fg, lines: r.tokens.map((l) => l.map((t) => ({ content: t.content, color: t.color, fontStyle: t.fontStyle || 0 }))) };
}

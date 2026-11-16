// variables.js — composition variables for any film (HyperFrames data-composition-variables, docs/playbook/variables.md).
// One file, two homes: a page loads it after the engine (hf: <script src="kit/variables.js">, pvk:
// <script src="../../../tools/variables.js">) and gets KIT.vars(); Node loads it with vm (tools/commands/batch.mjs
// loadVars) and gets the checks as globalThis.RWVars. Types: string number color boolean enum font image, same
// shapes as HyperFrames. Declarations live in project.json "variables" (or <html data-composition-variables>);
// values reach the page through <page dir>/kit-vars.js, which `batch` and `--variables` write.
// KIT.vars() → { id: value }   declared defaults, then overrides (window.__hfVariables); throws on a bad value
// KIT.vars.bind()              data-var-text / data-var-src bindings and a --<id> CSS custom property on #stage
// Binding rules ported from HyperFrames core runtime/applyVariableBindings.ts, getVariables.ts, validateVariables.ts
// v0.9.19 (Apache-2.0, Copyright HeyGen).
'use strict';
(() => {
  const TYPES = ['string', 'number', 'color', 'boolean', 'enum', 'font', 'image'];
  const ID = /^[A-Za-z_][\w-]*$/;
  const rec = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const scalar = (v) => ['string', 'number', 'boolean'].includes(typeof v);
  const jt = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  const issue = (level, code, id, message) => ({ level, code, id, message });
  const optVal = (o) => (rec(o) ? o.value : o);
  const opts = (d) => (Array.isArray(d.options) ? d.options.map(optVal) : []);

  // → null when `value` fits the declaration, else a message
  function checkValue(value, d) {
    switch (d.type) {
      case 'string': case 'color': return typeof value === 'string' ? null : `expected ${d.type}, got ${jt(value)}`;
      case 'number': return typeof value === 'number' && Number.isFinite(value) ? null : `expected number, got ${jt(value)}`;
      case 'boolean': return typeof value === 'boolean' ? null : `expected boolean, got ${jt(value)}`;
      case 'enum': {
        if (typeof value !== 'string') return `expected enum (string), got ${jt(value)}`;
        return opts(d).includes(value) ? null : `must be one of ${opts(d).map((o) => `"${o}"`).join(', ')} (got "${value}")`;
      }
      case 'font':
        if (typeof value === 'string') return null;
        return rec(value) && typeof value.name === 'string' && typeof value.source === 'string' ? null : 'expected font ({name, source} or a family string)';
      case 'image':
        if (typeof value === 'string') return null;
        return rec(value) && typeof value.url === 'string' && (value.alt === undefined || typeof value.alt === 'string') ? null : 'expected image ({url} or a url string)';
      default: return `unknown type "${d.type}"`;
    }
  }

  // the declaration list itself: ids, types, defaults, enum options
  function checkDecls(decls) {
    if (!Array.isArray(decls)) return [issue('error', 'variables_not_array', '', '"variables" must be an array of {id, type, default}')];
    const out = [], seen = new Set();
    decls.forEach((d, i) => {
      if (!rec(d) || typeof d.id !== 'string') return out.push(issue('error', 'invalid_declaration', '#' + i, `variables[${i}] needs a string id`));
      if (!ID.test(d.id)) out.push(issue('error', 'invalid_variable_id', d.id, `"${d.id}" is not a valid id (letters, digits, _ and -, not starting with a digit)`));
      if (seen.has(d.id)) out.push(issue('error', 'duplicate_variable_id', d.id, `"${d.id}" is declared twice`));
      seen.add(d.id);
      if (!TYPES.includes(d.type)) return out.push(issue('error', 'invalid_variable_type', d.id, `"${d.id}": type "${d.type}" is not one of ${TYPES.join(', ')}`));
      if (d.type === 'enum' && !(Array.isArray(d.options) && d.options.length && d.options.every((o) => typeof optVal(o) === 'string')))
        return out.push(issue('error', 'invalid_enum_options', d.id, `"${d.id}": an enum needs a non-empty options list of strings or {value, label}`));
      if (!('default' in d)) return out.push(issue('error', 'missing_default', d.id, `"${d.id}" has no default`));
      const bad = checkValue(d.default, d);
      if (bad) out.push(issue('error', 'default_type_mismatch', d.id, `"${d.id}" default: ${bad}`));
    });
    return out;
  }

  // values map vs declarations: undeclared ids (warning, an error when strict), wrong types, enum values off the list
  function validate(values, decls, { strict = false } = {}) {
    const by = new Map(decls.map((d) => [d.id, d])), out = [];
    for (const [id, v] of Object.entries(values)) {
      const d = by.get(id);
      if (!d) { out.push(issue(strict ? 'error' : 'warn', 'undeclared_variable', id, `"${id}" is not declared in variables`)); continue; }
      const bad = checkValue(v, d);
      if (bad) out.push(issue('error', d.type === 'enum' && typeof v === 'string' ? 'variable_enum_out_of_range' : 'variable_type_mismatch', id, `"${id}" ${bad}`));
    }
    return out;
  }

  // defaults ⊕ overrides (undeclared ids pass through, as in HyperFrames), plus the validate() issues
  function resolve(decls, overrides = {}, o) {
    const values = {};
    for (const d of decls) values[d.id] = d.default;
    Object.assign(values, overrides);
    return { values, issues: validate(overrides, decls, o) };
  }

  const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  // data-composition-variables='[…]' from page html → declarations ([] when absent)
  function parseHtmlDecls(html) {
    const m = /data-composition-variables\s*=\s*(?:"([^"]*)"|'([^']*)')/.exec(html);
    if (!m) return [];
    try { return JSON.parse(unesc(m[1] ?? m[2])); } catch { throw new Error('data-composition-variables is not valid JSON'); }
  }

  const MEDIA = ['img', 'video', 'audio', 'source'];
  // data-var-text / data-var-src in page html against the declarations
  function lintBindings(html, decls) {
    const ids = new Set(decls.map((d) => d.id)), out = [];
    for (const tag of html.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*>/g)) {
      for (const a of tag[0].matchAll(/\bdata-var-(text|src)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        const id = (a[2] ?? a[3]).trim();
        if (!ids.has(id)) out.push(issue('error', 'unknown_variable_binding', id, `data-var-${a[1]}="${id}" on <${tag[1]}>: no such variable`));
        if (a[1] === 'src' && !MEDIA.includes(tag[1].toLowerCase()))
          out.push(issue('error', 'variable_src_not_media', id, `data-var-src on <${tag[1]}>: only ${MEDIA.join('/')} take a variable src`));
      }
    }
    return out;
  }

  // KIT.vars().id and const { id, … } = KIT.vars() in film.js against the declarations
  function lintScript(js, decls) {
    const ids = new Set(decls.map((d) => d.id)), used = new Set();
    for (const m of js.matchAll(/KIT\.vars\(\)\s*\.\s*([A-Za-z_$][\w$]*)/g)) used.add(m[1]);
    for (const m of js.matchAll(/\{([^{}]*)\}\s*=\s*KIT\.vars\(\)/g))
      for (const part of m[1].split(',')) { const n = part.split(/[:=]/)[0].trim(); if (n) used.add(n); }
    return [...used].filter((id) => !ids.has(id)).map((id) => issue('error', 'unknown_variable_usage', id, `film.js reads KIT.vars().${id}: no such variable`));
  }

  // kit-vars.js for a page: the declarations and the full resolved values (the HyperFrames runtime merges its own
  // data-composition-variables defaults under window.__hfVariables, so writing every value is safe)
  const js = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
  const fileText = (decls, values) =>
    `// composition variable values for this build: written by tools/commands/batch.mjs (batch, --variables), see docs/playbook/variables.md\n` +
    `window.__hfDeclared=${js(decls)};\nwindow.__hfVariables=${js(values)};\n`;

  const API = { TYPES, checkValue, checkDecls, validate, resolve, parseHtmlDecls, lintBindings, lintScript, fileText };
  globalThis.RWVars = API;

  // ── browser: KIT.vars ─────────────────────────────────────────────────────
  const K = typeof window !== 'undefined' && window.KIT;
  if (!K) return;
  const declared = () => {
    if (Array.isArray(window.__hfDeclared)) return window.__hfDeclared;
    const a = document.documentElement.getAttribute('data-composition-variables');
    if (!a) return [];
    try { return JSON.parse(a); } catch { throw new Error('KIT.vars: data-composition-variables is not valid JSON'); }
  };
  K.vars = () => {
    const decls = declared(), r = resolve(decls, rec(window.__hfVariables) ? window.__hfVariables : {});
    const bad = checkDecls(decls).concat(r.issues).filter((i) => i.level === 'error');
    if (bad.length) throw new Error('KIT.vars: ' + bad.map((i) => i.message).join('; '));
    return r.values;
  };
  // a value folded into var() must not close the declaration (HyperFrames sanitizeCssValue)
  const cssOf = (v) => (scalar(v) ? String(v) : rec(v) && typeof v.name === 'string' ? v.name : null);
  const urlOf = (v) => (typeof v === 'string' ? v : rec(v) && typeof v.url === 'string' ? v.url : null);
  const safeUrl = (u) => { const s = u.replace(/[\u0000- ]/g, ''), m = /^([a-z][a-z0-9+.-]*):/i.exec(s); return !m || /^(https?|blob)$/i.test(m[1]) || (/^data$/i.test(m[1]) && /^data:image\//i.test(s)); };
  const wrote = new WeakSet();   // text is written once per element: a film may reshape it after
  K.vars.bind = () => {
    const v = K.vars();
    const root = document.getElementById('stage') || document.body;
    for (const [id, val] of Object.entries(v)) { const c = cssOf(val); if (c !== null && c !== '') root.style.setProperty('--' + id, c.replace(/[;{}<>\r\n]/g, '')); }
    for (const el of document.querySelectorAll('[data-var-src]')) {
      const u = urlOf(v[el.getAttribute('data-var-src').trim()]);
      if (u && MEDIA.includes(el.tagName.toLowerCase()) && safeUrl(u) && el.getAttribute('src') !== u) el.setAttribute('src', u);
    }
    for (const el of document.querySelectorAll('[data-var-text]')) {
      const val = v[el.getAttribute('data-var-text').trim()];
      if (!scalar(val) || wrote.has(el)) continue;
      wrote.add(el);
      if (!el.childElementCount) { el.textContent = String(val); continue; }
      let done = false;   // keep element children: write the first own text node, clear the rest
      for (const n of [...el.childNodes]) if (n.nodeType === 3) { n.nodeValue = done ? '' : String(val); done = true; }
      if (!done) el.insertBefore(document.createTextNode(String(val)), el.firstChild);
    }
  };
  const s = K.start;   // bound once film.js has built its DOM, just before the first render
  K.start = (o) => { K.vars.bind(); return s(o); };
})();

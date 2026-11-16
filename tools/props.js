// props.js: KIT.props(), the per-run data of a film (Remotion's getInputProps() / defaultProps). Load after engine.js and variables.js.
//   KIT.props() → { …declared defaults, …overrides }   the composition variables (KIT.vars(): project.json "variables", then `--props` / `--variables`),
//                                                       then window.PROPS (a page may set it itself, e.g. a preview), as a fresh frozen object each call
//   KIT.props(key, fallback) → one value, fallback when it is absent
// A render must not depend on anything but t and these props: read them once at load, never inside render(t) from the network.
'use strict';
(function () {
  const K = window.KIT;
  if (!K) throw new Error('props.js: load tools/engine.js first');
  K.props = (key, fallback) => {
    const all = Object.freeze({ ...(K.vars ? K.vars() : {}), ...(window.PROPS || {}) });
    return key === undefined ? all : key in all ? all[key] : fallback;
  };
})();

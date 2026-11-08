// src/types.ts
var CANVAS_DIMENSIONS = {
  landscape: { width: 1920, height: 1080 },
  portrait: { width: 1080, height: 1920 },
  "landscape-4k": { width: 3840, height: 2160 },
  "portrait-4k": { width: 2160, height: 3840 },
  square: { width: 1080, height: 1080 },
  "square-4k": { width: 2160, height: 2160 },
  "landscape-720p": { width: 1280, height: 720 },
  "portrait-720p": { width: 720, height: 1280 },
  "square-720p": { width: 720, height: 720 },
  // 480 tall at 16:9 is 853.33 wide: 854 keeps both sides even for 4:2:0 encoders.
  "landscape-480p": { width: 854, height: 480 },
  "portrait-480p": { width: 480, height: 854 },
  "square-480p": { width: 480, height: 480 }
};
var VALID_CANVAS_RESOLUTIONS = Object.keys(
  CANVAS_DIMENSIONS
);
var RESOLUTION_ALIASES = {
  "1080p": "landscape",
  hd: "landscape",
  "1080p-portrait": "portrait",
  "portrait-1080p": "portrait",
  "4k": "landscape-4k",
  uhd: "landscape-4k",
  "4k-portrait": "portrait-4k",
  "1080p-square": "square",
  "square-1080p": "square",
  "4k-square": "square-4k",
  "720p": "landscape-720p",
  "720p-portrait": "portrait-720p",
  "720p-square": "square-720p",
  "480p": "landscape-480p",
  "480p-portrait": "portrait-480p",
  "480p-square": "square-480p"
};
var ASPECT_AGNOSTIC_RESOLUTION_ALIASES = /* @__PURE__ */ new Set([
  "1080p",
  "hd",
  "4k",
  "uhd",
  "720p",
  "480p"
]);
function normalizeResolutionFlag(input) {
  if (!input) return void 0;
  const lowered = input.toLowerCase();
  if (VALID_CANVAS_RESOLUTIONS.includes(lowered)) {
    return lowered;
  }
  return RESOLUTION_ALIASES[lowered];
}
function isAspectAgnosticResolutionAlias(input) {
  if (!input) return false;
  return ASPECT_AGNOSTIC_RESOLUTION_ALIASES.has(input.toLowerCase());
}
function resolveResolutionFlagPair(input) {
  return {
    outputResolution: normalizeResolutionFlag(input),
    outputResolutionAspectAgnostic: isAspectAgnosticResolutionAlias(input)
  };
}
var COMPOSITION_VARIABLE_TYPES = [
  "string",
  "number",
  "color",
  "boolean",
  "enum",
  "font",
  "image"
];
function isTextElement(el) {
  return el.type === "text";
}
function isMediaElement(el) {
  return el.type === "video" || el.type === "image" || el.type === "audio";
}
function isCompositionElement(el) {
  return el.type === "composition";
}
var TIMELINE_COLORS = {
  video: "#ec4899",
  image: "#3b82f6",
  text: "#06b6d4",
  audio: "#10b981",
  composition: "#f97316"
};
var DEFAULT_DURATIONS = {
  video: 5,
  image: 5,
  text: 2,
  audio: 5,
  composition: 5
};
function getDefaultStageZoom(resolution) {
  const { width, height } = CANVAS_DIMENSIONS[resolution];
  return {
    scale: 1,
    focusX: width / 2,
    focusY: height / 2
  };
}

// src/fontAliases.ts
var FONT_ALIAS_MAP = {
  // ── Canonical bundled fonts (self-referencing) ────────────────────────
  inter: "inter",
  montserrat: "montserrat",
  outfit: "outfit",
  nunito: "nunito",
  oswald: "oswald",
  "league gothic": "league-gothic",
  "archivo black": "archivo-black",
  "space mono": "space-mono",
  "ibm plex mono": "ibm-plex-mono",
  "jetbrains mono": "jetbrains-mono",
  "eb garamond": "eb-garamond",
  "playfair display": "playfair-display",
  "source code pro": "source-code-pro",
  "noto sans jp": "noto-sans-jp",
  roboto: "roboto",
  "open sans": "open-sans",
  lato: "lato",
  poppins: "poppins",
  // ── Common aliases → nearest canonical ────────────────────────────────
  "helvetica neue": "inter",
  helvetica: "inter",
  arial: "inter",
  "helvetica bold": "inter",
  futura: "montserrat",
  "din alternate": "montserrat",
  "arial black": "montserrat",
  "bebas neue": "league-gothic",
  "courier new": "jetbrains-mono",
  courier: "jetbrains-mono",
  garamond: "eb-garamond",
  "noto sans japanese": "noto-sans-jp",
  "segoe ui": "roboto",
  // ── macOS sans-serif system fonts → inter ─────────────────────────────
  "sf pro": "inter",
  "sf pro display": "inter",
  "sf pro text": "inter",
  "sf pro rounded": "inter",
  avenir: "inter",
  "avenir next": "inter",
  "lucida grande": "inter",
  geneva: "inter",
  optima: "inter",
  // ── Windows sans-serif system fonts → inter ───────────────────────────
  verdana: "inter",
  tahoma: "inter",
  "trebuchet ms": "inter",
  calibri: "inter",
  candara: "inter",
  corbel: "inter",
  "lucida sans": "inter",
  "lucida sans unicode": "inter",
  // ── Linux sans-serif system fonts → inter ─────────────────────────────
  "noto sans": "inter",
  "dejavu sans": "inter",
  "liberation sans": "inter",
  // ── Monospace system fonts → jetbrains-mono ───────────────────────────
  "sf mono": "jetbrains-mono",
  menlo: "jetbrains-mono",
  monaco: "jetbrains-mono",
  consolas: "jetbrains-mono",
  "lucida console": "jetbrains-mono",
  "lucida sans typewriter": "jetbrains-mono",
  "andale mono": "jetbrains-mono",
  "dejavu sans mono": "jetbrains-mono",
  "liberation mono": "jetbrains-mono",
  // ── Serif system fonts → eb-garamond ──────────────────────────────────
  georgia: "eb-garamond",
  palatino: "eb-garamond",
  "palatino linotype": "eb-garamond",
  "book antiqua": "eb-garamond",
  cambria: "eb-garamond",
  times: "eb-garamond",
  "times new roman": "eb-garamond",
  "dejavu serif": "eb-garamond",
  "liberation serif": "eb-garamond"
};
var FONT_ALIAS_KEYS = new Set(Object.keys(FONT_ALIAS_MAP));
var CANONICAL_FONT_DISPLAY_NAMES = {
  inter: "Inter",
  montserrat: "Montserrat",
  outfit: "Outfit",
  nunito: "Nunito",
  oswald: "Oswald",
  "league-gothic": "League Gothic",
  "archivo-black": "Archivo Black",
  "space-mono": "Space Mono",
  "ibm-plex-mono": "IBM Plex Mono",
  "jetbrains-mono": "JetBrains Mono",
  "eb-garamond": "EB Garamond",
  "playfair-display": "Playfair Display",
  "source-code-pro": "Source Code Pro",
  "noto-sans-jp": "Noto Sans JP",
  roboto: "Roboto",
  "open-sans": "Open Sans",
  lato: "Lato",
  poppins: "Poppins"
};
function resolveAliasDisplayName(alias) {
  const slug = FONT_ALIAS_MAP[alias.toLowerCase()];
  if (!slug) return void 0;
  return CANONICAL_FONT_DISPLAY_NAMES[slug];
}

// src/fontShorthand.ts
var FONT_SIZE_KEYWORD = /^(?:xx-small|x-small|small|medium|large|x-large|xx-large|xxx-large|smaller|larger)$/i;
var FONT_SIZE_VALUE = /^(?:\d*\.?\d+(?!(?:deg|grad|rad|turn)$)[a-z%]+|(?:calc|min|max|clamp)\(.*\))$/i;
var PRE_SIZE_KEYWORD = /^(?:normal|italic|oblique|small-caps|bold|bolder|lighter|(?:ultra-|extra-|semi-)?(?:condensed|expanded)|[+-]?\d*\.?\d+(?:deg|grad|rad|turn)?)$/i;
var CUSTOM_PROPERTY = /^var\(.*\)$/i;
var NO_FAMILY = /^(?:caption|icon|menu|message-box|small-caption|status-bar|inherit|initial|unset|revert|revert-layer)$/i;
function maskGroups(value) {
  let depth = 0;
  let quote = null;
  return value.replace(/[\s\S]/g, (char) => {
    if (quote) {
      if (char === quote) quote = null;
      return "_";
    }
    if (char === '"' || char === "'") {
      quote = char;
      return "_";
    }
    if (char === "(") depth += 1;
    const inside = depth > 0;
    if (char === ")") depth -= 1;
    return inside ? "_" : char;
  });
}
function tokens(value) {
  return [...maskGroups(value).matchAll(/\S+/g)].map(({ 0: masked, index }) => ({
    text: value.slice(index, index + masked.length),
    masked,
    start: index
  }));
}
var isSize = (text) => FONT_SIZE_KEYWORD.test(text) || FONT_SIZE_VALUE.test(text);
function familyStart(list, at) {
  const size = list[at];
  const slash = size.masked.indexOf("/");
  if (slash >= 0) return slash === size.masked.length - 1 ? at + 2 : at + 1;
  const next = list[at + 1]?.masked;
  if (next === "/") return at + 3;
  return next?.startsWith("/") ? at + 2 : at + 1;
}
var carriesLineHeight = (list, at) => list[at].masked.includes("/") || (list[at + 1]?.masked.startsWith("/") ?? false);
var headOf = ({ text, masked }) => masked.includes("/") ? text.slice(0, masked.indexOf("/")) : text;
function findSize(list) {
  let unsure = false;
  for (let i = 0; i < list.length; i++) {
    const head = headOf(list[i]);
    const isVar = CUSTOM_PROPERTY.test(head);
    if (isSize(head) || isVar && carriesLineHeight(list, i)) return { at: i, unsure };
    if (!isVar && !PRE_SIZE_KEYWORD.test(head)) unsure = true;
  }
  return { at: -1, unsure };
}
function lastLeadingVar(list) {
  let last = -1;
  for (let i = 0; i < list.length - 1; i++) if (CUSTOM_PROPERTY.test(list[i].text)) last = i;
  return last;
}
function parseFontShorthand(value) {
  const list = tokens(value);
  if (list.length === 1 && NO_FAMILY.test(list[0].text)) return { families: "", certain: true };
  const rest = (from) => list[from] ? value.slice(list[from].start).trim() : "";
  const size = findSize(list);
  if (size.at >= 0) return { families: rest(familyStart(list, size.at)), certain: !size.unsure };
  const lastVar = lastLeadingVar(list);
  if (lastVar < 0) return { families: "", certain: !size.unsure };
  return { families: rest(lastVar + 1), certain: false };
}
function fontShorthandFamilies(value) {
  return parseFontShorthand(value).families;
}

// src/utils/urlPath.ts
function decodeUrlPathVariants(path) {
  const decoded = decodeWellFormedEscapes(path);
  return decoded === path ? [path] : [decoded, path];
}
function decodeWellFormedEscapes(path) {
  return path.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });
}

// src/compositionVariables.ts
var DEFAULT_TYPEOF = {
  string: "string",
  number: "number",
  color: "string",
  boolean: "boolean",
  enum: "string",
  font: "string",
  image: "string"
};
function isScalarVariableValue(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function isRecord(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isFontValue(value) {
  return isRecord(value) && typeof value.name === "string" && typeof value.source === "string";
}
function isImageValue(value) {
  return isRecord(value) && typeof value.url === "string" && (value.alt === void 0 || typeof value.alt === "string") && (value.fit === void 0 || value.fit === "cover" || value.fit === "contain" || value.fit === "fill" || value.fit === "none" || value.fit === "scale-down");
}
function isVariableType(t) {
  return typeof t === "string" && t in DEFAULT_TYPEOF;
}
function isCompositionVariable(v) {
  if (!isRecord(v)) return false;
  if (typeof v.id !== "string" || typeof v.label !== "string") return false;
  if (!isVariableType(v.type)) return false;
  if (v.type === "font") return typeof v.default === "string" || isFontValue(v.default);
  if (v.type === "image") return typeof v.default === "string" || isImageValue(v.default);
  if (typeof v.default !== DEFAULT_TYPEOF[v.type]) return false;
  if (v.type === "enum" && !Array.isArray(v.options)) return false;
  return true;
}
function parseCompositionVariables(htmlEl) {
  const variablesAttr = htmlEl.getAttribute("data-composition-variables");
  if (!variablesAttr) {
    return [];
  }
  try {
    const parsed = JSON.parse(variablesAttr);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isCompositionVariable);
  } catch {
    return [];
  }
}
function isSafeMediaUrl(url) {
  const normalized = url.replace(/[\u0000-\u0020]/g, "");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(normalized);
  if (!scheme) return true;
  const proto = scheme[1]?.toLowerCase();
  if (!proto) return false;
  if (proto === "https" || proto === "http" || proto === "blob") return true;
  if (proto === "data") return /^data:image\//i.test(normalized);
  return false;
}

// src/variableUsage.ts
import * as acorn from "acorn";
import * as acornWalk from "acorn-walk";
function isGetVariablesCallee(callee) {
  if (callee?.type === "Identifier") return callee.name === "getVariables";
  if (callee?.type === "MemberExpression" && !callee.computed) {
    return callee.property?.type === "Identifier" && callee.property.name === "getVariables";
  }
  return false;
}
function collectFromObjectPattern(pattern, out) {
  for (const prop of pattern.properties ?? []) {
    if (prop?.type === "RestElement") {
      out.incomplete();
      continue;
    }
    if (prop?.type !== "Property") continue;
    if (prop.computed === true) {
      out.incomplete();
    } else if (prop.key?.type === "Identifier") {
      out.use(String(prop.key.name));
    } else if (prop.key?.type === "Literal" && typeof prop.key.value === "string") {
      out.use(prop.key.value);
    } else {
      out.incomplete();
    }
  }
}
function collectFromMemberAccess(member, out) {
  if (member.computed !== true && member.property?.type === "Identifier") {
    out.use(String(member.property.name));
  } else if (member.computed === true && member.property?.type === "Literal" && typeof member.property.value === "string") {
    out.use(member.property.value);
  } else {
    out.incomplete();
  }
}
function classifyValueRead(parent, valueNode, out) {
  if (!parent || parent.type === "ExpressionStatement") {
    return null;
  }
  if (parent.type === "MemberExpression" && parent.object === valueNode) {
    collectFromMemberAccess(parent, out);
    return null;
  }
  if (parent.type === "VariableDeclarator" && parent.init === valueNode) {
    if (parent.id?.type === "ObjectPattern") {
      collectFromObjectPattern(parent.id, out);
      return null;
    }
    if (parent.id?.type === "Identifier") return String(parent.id.name);
    out.incomplete();
    return null;
  }
  out.incomplete();
  return null;
}
function scanVariableUsage(scriptText) {
  const usedIds = [];
  const seen = /* @__PURE__ */ new Set();
  let scanIncomplete = false;
  const sink = {
    use(id) {
      if (!seen.has(id)) {
        seen.add(id);
        usedIds.push(id);
      }
    },
    incomplete() {
      scanIncomplete = true;
    }
  };
  let ast;
  try {
    ast = acorn.parse(scriptText, { ecmaVersion: "latest", sourceType: "script" });
  } catch {
    return { usedIds: [], scanIncomplete: true };
  }
  const aliases = /* @__PURE__ */ new Set();
  acornWalk.ancestor(ast, {
    CallExpression(node, _, ancestors) {
      if (!isGetVariablesCallee(node.callee)) return;
      const parent = ancestors[ancestors.length - 2];
      const alias = classifyValueRead(parent, node, sink);
      if (alias) aliases.add(alias);
    }
  });
  if (aliases.size > 0) {
    acornWalk.ancestor(ast, {
      // fallow-ignore-next-line complexity
      Identifier(node, _, ancestors) {
        if (!aliases.has(String(node.name))) return;
        const parent = ancestors[ancestors.length - 2];
        if (!parent) return;
        if (parent.type === "VariableDeclarator" && parent.id === node) return;
        if (parent.type === "MemberExpression" && parent.property === node) return;
        if (parent.type === "Property" && parent.key === node && parent.computed !== true) return;
        if (classifyValueRead(parent, node, sink)) sink.incomplete();
      }
    });
  }
  return { usedIds, scanIncomplete };
}

// src/compositionContract.ts
var COMPOSITION_CONTRACT_VERSION = 1;
var SPLIT_BOUNDARY_EPSILON_S = 0.03;
var COMPOSITION_ATTRIBUTES = Object.freeze({
  start: "data-start",
  duration: "data-duration",
  trackIndex: "data-track-index",
  derivedEnd: "data-end",
  legacyTrack: "data-layer"
});
var CANONICAL_AUTHORED_TIMING_ATTRIBUTES = Object.freeze([
  COMPOSITION_ATTRIBUTES.start,
  COMPOSITION_ATTRIBUTES.duration,
  COMPOSITION_ATTRIBUTES.trackIndex
]);
var DERIVED_TIMING_ATTRIBUTES = Object.freeze([
  COMPOSITION_ATTRIBUTES.derivedEnd
]);
var LEGACY_TIMING_ATTRIBUTES = Object.freeze([
  COMPOSITION_ATTRIBUTES.derivedEnd,
  COMPOSITION_ATTRIBUTES.legacyTrack
]);
var ClipTimingWriteError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "ClipTimingWriteError";
    this.code = code;
  }
};
function parseNumeric(value) {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
var REFERENCE_ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;
function isAsciiDigitAt(value, index) {
  const code = value.charCodeAt(index);
  return code >= 48 && code <= 57;
}
function skipDigitsLeft(value, start) {
  let cursor = start;
  while (cursor >= 0 && isAsciiDigitAt(value, cursor)) cursor--;
  return cursor;
}
function skipWhitespaceLeft(value, start) {
  let cursor = start;
  while (cursor >= 0 && (value[cursor] ?? "").trim() === "") cursor--;
  return cursor;
}
function findMagnitudeStart(value) {
  const last = value.length - 1;
  if (!isAsciiDigitAt(value, last)) return null;
  let cursor = skipDigitsLeft(value, last);
  if (value[cursor] === ".") cursor = skipDigitsLeft(value, cursor - 1);
  return cursor + 1;
}
function parseReferenceOffset(value) {
  const magnitudeStart = findMagnitudeStart(value);
  if (magnitudeStart == null) return null;
  const operatorIndex = skipWhitespaceLeft(value, magnitudeStart - 1);
  const operator = value[operatorIndex];
  if (operator !== "+" && operator !== "-") return null;
  const refId = value.slice(0, operatorIndex).trim();
  if (!REFERENCE_ID_PATTERN.test(refId)) return null;
  const magnitude = Number(value.slice(magnitudeStart));
  if (!Number.isFinite(magnitude)) return null;
  return { refId, operator, magnitude };
}
function parseStartExpression(raw) {
  const normalized = (raw ?? "").trim();
  if (!normalized) return null;
  const absolute = parseNumeric(normalized);
  if (absolute != null) return { kind: "absolute", value: absolute };
  if (REFERENCE_ID_PATTERN.test(normalized)) {
    return { kind: "reference", refId: normalized, offset: 0 };
  }
  const reference = parseReferenceOffset(normalized);
  if (!reference) return null;
  return {
    kind: "reference",
    refId: reference.refId,
    offset: reference.operator === "-" ? -reference.magnitude : reference.magnitude
  };
}
function pushDiagnostic(diagnostics, code, attribute, value) {
  diagnostics.push({ code, attribute, value });
}
function resolveStart(expression, rawStart, options, diagnostics) {
  if (rawStart == null || rawStart.trim() === "") {
    return options.defaultStart === void 0 ? 0 : options.defaultStart;
  }
  if (!expression) {
    pushDiagnostic(diagnostics, "invalid-start", COMPOSITION_ATTRIBUTES.start, rawStart);
    return null;
  }
  if (expression.kind === "absolute") return Math.max(0, expression.value);
  const referencedEnd = options.resolveReferenceEnd?.(expression.refId);
  if (referencedEnd == null || !Number.isFinite(referencedEnd)) {
    pushDiagnostic(
      diagnostics,
      "unresolved-start-reference",
      COMPOSITION_ATTRIBUTES.start,
      rawStart
    );
    return null;
  }
  return Math.max(0, referencedEnd + expression.offset);
}
var DERIVED_END_EQUALITY_EPSILON_SECONDS = 1e-9;
function derivedEndsAreConsistent(parsedEnd, canonicalEnd) {
  return Math.abs(parsedEnd - canonicalEnd) <= DERIVED_END_EQUALITY_EPSILON_SECONDS;
}
function diagnoseDerivedEnd(rawEnd, canonicalEnd, diagnostics) {
  const parsedEnd = parseNumeric(rawEnd);
  if (parsedEnd == null) {
    pushDiagnostic(diagnostics, "deprecated-end", COMPOSITION_ATTRIBUTES.derivedEnd, rawEnd);
    pushDiagnostic(diagnostics, "invalid-end", COMPOSITION_ATTRIBUTES.derivedEnd, rawEnd);
    return;
  }
  if (canonicalEnd == null) {
    pushDiagnostic(diagnostics, "deprecated-end", COMPOSITION_ATTRIBUTES.derivedEnd, rawEnd);
    return;
  }
  if (derivedEndsAreConsistent(parsedEnd, canonicalEnd)) {
    return;
  }
  pushDiagnostic(diagnostics, "deprecated-end", COMPOSITION_ATTRIBUTES.derivedEnd, rawEnd);
  pushDiagnostic(diagnostics, "conflicting-end", COMPOSITION_ATTRIBUTES.derivedEnd, rawEnd);
}
function readCanonicalDuration(rawDuration, start, diagnostics) {
  const duration = parseNumeric(rawDuration);
  if (duration == null || duration < 0) {
    pushDiagnostic(diagnostics, "invalid-duration", COMPOSITION_ATTRIBUTES.duration, rawDuration);
    return { duration: null, end: null, durationSource: "invalid" };
  }
  return {
    duration,
    end: start == null ? null : start + duration,
    durationSource: "duration"
  };
}
function readLegacyEnd(rawEnd, start, diagnostics) {
  pushDiagnostic(diagnostics, "deprecated-end", COMPOSITION_ATTRIBUTES.derivedEnd, rawEnd);
  const end = parseNumeric(rawEnd);
  if (end == null) {
    pushDiagnostic(diagnostics, "invalid-end", COMPOSITION_ATTRIBUTES.derivedEnd, rawEnd);
    return { duration: null, end: null, durationSource: "invalid" };
  }
  if (start == null) return { duration: null, end, durationSource: "legacy-end" };
  if (end < start) {
    pushDiagnostic(diagnostics, "end-before-start", COMPOSITION_ATTRIBUTES.derivedEnd, rawEnd);
    return { duration: null, end: null, durationSource: "invalid" };
  }
  return { duration: end - start, end, durationSource: "legacy-end" };
}
function readDuration(attributes, start, diagnostics) {
  const rawDuration = attributes.getAttribute(COMPOSITION_ATTRIBUTES.duration);
  const rawEnd = attributes.getAttribute(COMPOSITION_ATTRIBUTES.derivedEnd);
  if (rawDuration == null) {
    return rawEnd == null ? { duration: null, end: null, durationSource: "missing" } : readLegacyEnd(rawEnd, start, diagnostics);
  }
  const canonical = readCanonicalDuration(rawDuration, start, diagnostics);
  if (rawEnd != null) diagnoseDerivedEnd(rawEnd, canonical.end, diagnostics);
  return canonical;
}
function readTrackValue(rawValue, attribute, source, diagnostics) {
  const trackIndex = parseNumeric(rawValue);
  if (trackIndex == null || !Number.isInteger(trackIndex)) {
    pushDiagnostic(diagnostics, "invalid-track-index", attribute, rawValue);
    return { trackIndex: 0, trackSource: "invalid" };
  }
  return { trackIndex, trackSource: source };
}
function readTrack(attributes, diagnostics) {
  const rawTrack = attributes.getAttribute(COMPOSITION_ATTRIBUTES.trackIndex);
  const rawLayer = attributes.getAttribute(COMPOSITION_ATTRIBUTES.legacyTrack);
  if (rawTrack == null && rawLayer == null) return { trackIndex: 0, trackSource: "default" };
  if (rawTrack == null && rawLayer != null) {
    pushDiagnostic(diagnostics, "deprecated-layer", COMPOSITION_ATTRIBUTES.legacyTrack, rawLayer);
    return readTrackValue(
      rawLayer,
      COMPOSITION_ATTRIBUTES.legacyTrack,
      "legacy-layer",
      diagnostics
    );
  }
  const canonical = readTrackValue(
    rawTrack ?? "",
    COMPOSITION_ATTRIBUTES.trackIndex,
    "track-index",
    diagnostics
  );
  if (rawLayer == null) return canonical;
  pushDiagnostic(diagnostics, "deprecated-layer", COMPOSITION_ATTRIBUTES.legacyTrack, rawLayer);
  const parsedLayer = parseNumeric(rawLayer);
  if (parsedLayer != null && parsedLayer !== canonical.trackIndex) {
    pushDiagnostic(diagnostics, "conflicting-layer", COMPOSITION_ATTRIBUTES.legacyTrack, rawLayer);
  }
  return canonical;
}
function readClipTiming(attributes, options = {}) {
  const diagnostics = [];
  const rawStart = attributes.getAttribute(COMPOSITION_ATTRIBUTES.start);
  const startExpression = parseStartExpression(rawStart);
  const start = resolveStart(startExpression, rawStart, options, diagnostics);
  const duration = readDuration(attributes, start, diagnostics);
  const track = readTrack(attributes, diagnostics);
  return { startExpression, start, ...duration, ...track, diagnostics };
}
function serializeStartNumber(start) {
  if (!Number.isFinite(start)) {
    throw new ClipTimingWriteError("invalid-start", "start must be finite");
  }
  return String(start);
}
function serializeStartReference(start) {
  if (start.kind === "absolute") return serializeStartNumber(start.value);
  if (!start.refId || !Number.isFinite(start.offset)) {
    throw new ClipTimingWriteError(
      "invalid-start",
      "reference start must have an id and finite offset"
    );
  }
  if (start.offset === 0) return start.refId;
  return `${start.refId} ${start.offset < 0 ? "-" : "+"} ${Math.abs(start.offset)}`;
}
function serializeStart(start) {
  if (typeof start === "number") return serializeStartNumber(start);
  if (typeof start === "object" && start != null) return serializeStartReference(start);
  if (typeof start === "string" && parseStartExpression(start)) return start.trim();
  throw new ClipTimingWriteError("invalid-start", `invalid start expression: ${start ?? ""}`);
}
function writeDuration(attributes, duration, current) {
  if (duration === null) {
    attributes.removeAttribute(COMPOSITION_ATTRIBUTES.duration);
    return;
  }
  if (duration === void 0) {
    if (attributes.getAttribute(COMPOSITION_ATTRIBUTES.duration) == null && current.duration != null) {
      attributes.setAttribute(COMPOSITION_ATTRIBUTES.duration, String(current.duration));
    }
    return;
  }
  if (!Number.isFinite(duration) || duration < 0) {
    throw new ClipTimingWriteError(
      "invalid-duration",
      "duration must be a finite, non-negative number"
    );
  }
  attributes.setAttribute(COMPOSITION_ATTRIBUTES.duration, String(duration));
}
function writeTrack(attributes, trackIndex, current) {
  if (trackIndex === null) {
    attributes.removeAttribute(COMPOSITION_ATTRIBUTES.trackIndex);
    return;
  }
  if (trackIndex === void 0) {
    if (attributes.getAttribute(COMPOSITION_ATTRIBUTES.trackIndex) == null && current.trackSource === "legacy-layer") {
      attributes.setAttribute(COMPOSITION_ATTRIBUTES.trackIndex, String(current.trackIndex));
    }
    return;
  }
  if (!Number.isFinite(trackIndex) || !Number.isInteger(trackIndex)) {
    throw new ClipTimingWriteError("invalid-track-index", "trackIndex must be a finite integer");
  }
  attributes.setAttribute(COMPOSITION_ATTRIBUTES.trackIndex, String(trackIndex));
}
function writeClipTiming(attributes, update) {
  const current = readClipTiming(attributes);
  if (update.start !== void 0) {
    attributes.setAttribute(COMPOSITION_ATTRIBUTES.start, serializeStart(update.start));
  }
  writeDuration(attributes, update.duration, current);
  writeTrack(attributes, update.trackIndex, current);
  const preserveUnresolvedLegacyEnd = update.duration === void 0 && attributes.getAttribute(COMPOSITION_ATTRIBUTES.duration) == null && attributes.getAttribute(COMPOSITION_ATTRIBUTES.derivedEnd) != null && current.duration == null;
  if (!preserveUnresolvedLegacyEnd) {
    attributes.removeAttribute(COMPOSITION_ATTRIBUTES.derivedEnd);
  }
  attributes.removeAttribute(COMPOSITION_ATTRIBUTES.legacyTrack);
  return readClipTiming(attributes);
}

// src/canvasScaffoldPatterns.ts
var HTML_BODY_CSS_WIDTH_FIRST_RE = /(html\s*,\s*body\s*\{[^}]*?width:\s*)(\d+)px([^}]*?height:\s*)(\d+)px/i;
var HTML_BODY_CSS_HEIGHT_FIRST_RE = /(html\s*,\s*body\s*\{[^}]*?height:\s*)(\d+)px([^}]*?width:\s*)(\d+)px/i;
var VIEWPORT_META_SIZE_RE = /(<meta[^>]*name=["']viewport["'][^>]*content=["']width=)(\d+)(,\s*height=)(\d+)/i;

// src/mediaSrcMutation.ts
import * as acorn2 from "acorn";
import * as acornWalk2 from "acorn-walk";
function parseProgram(script) {
  try {
    return acorn2.parse(script, { ecmaVersion: "latest", sourceType: "script" });
  } catch {
    return acorn2.parse(script, { ecmaVersion: "latest", sourceType: "module" });
  }
}
function literalString(node) {
  if (node?.type === "Literal" && typeof node.value === "string") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value.cooked ?? void 0;
  }
  return void 0;
}
function memberName(node) {
  if (node?.type !== "MemberExpression") return void 0;
  if (!node.computed && node.property.type === "Identifier") return node.property.name;
  return literalString(node.property);
}
function isFunctionScope(node) {
  return node.type === "Program" || node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression" || node.type === "StaticBlock";
}
function isScope(node) {
  return isFunctionScope(node) || node.type === "BlockStatement" || node.type === "CatchClause" || node.type === "ForStatement" || node.type === "ForInStatement" || node.type === "ForOfStatement" || node.type === "SwitchStatement" || node.type === "ClassDeclaration" || node.type === "ClassExpression";
}
function declarePattern(pattern, initializer, scope, initializerScope = scope) {
  switch (pattern.type) {
    case "Identifier":
      if (initializer || !scope.bindings.has(pattern.name)) {
        scope.bindings.set(pattern.name, { initializer, scope: initializerScope });
      }
      break;
    case "RestElement":
      declarePattern(pattern.argument, null, scope);
      break;
    case "AssignmentPattern":
      declarePattern(pattern.left, null, scope);
      break;
    case "ArrayPattern":
    case "ObjectPattern":
      declarePatterns(destructuredPatterns(pattern), scope);
      break;
  }
}
function declarePatterns(patterns, scope) {
  for (const pattern of patterns) declarePattern(pattern, null, scope);
}
function destructuredPatterns(pattern) {
  if (pattern.type === "ObjectPattern") {
    return pattern.properties.map(
      (property) => property.type === "RestElement" ? property.argument : property.value
    );
  }
  return pattern.elements.filter((element) => element !== null);
}
function declareOptionalPattern(pattern, scope) {
  if (pattern) declarePattern(pattern, null, scope);
}
function declareScopedName(node, scope) {
  switch (node.type) {
    case "FunctionExpression":
    case "FunctionDeclaration":
      declareOptionalPattern(node.id, scope);
      declarePatterns(node.params, scope);
      break;
    case "ArrowFunctionExpression":
      declarePatterns(node.params, scope);
      break;
    case "ClassDeclaration":
    case "ClassExpression":
      declareOptionalPattern(node.id, scope);
      break;
    case "CatchClause":
      declareOptionalPattern(node.param, scope);
      break;
    case "ImportDeclaration":
      declarePatterns(
        node.specifiers.map((specifier) => specifier.local),
        scope
      );
      break;
  }
}
function lookupBinding(name, scope) {
  for (let current = scope; current; current = current.parent) {
    const binding = current.bindings.get(name);
    if (binding) return binding;
  }
  return void 0;
}
function collectBindings(ast) {
  const root = { bindings: /* @__PURE__ */ new Map() };
  const scopes = new WeakMap([[ast, root]]);
  const scopeAt = (ancestors, functionOnly = false) => {
    let parent = root;
    let selected = root;
    for (const node of ancestors) {
      if (!isScope(node)) continue;
      let scope = scopes.get(node);
      if (!scope) {
        scope = { parent, bindings: /* @__PURE__ */ new Map() };
        scopes.set(node, scope);
      }
      parent = scope;
      if (!functionOnly || isFunctionScope(node)) selected = scope;
    }
    return selected;
  };
  acornWalk2.fullAncestor(ast, (node, _state, ancestors) => {
    const scope = scopeAt(ancestors);
    if (node.type === "VariableDeclarator") {
      const declaration = ancestors.at(-2);
      const bindingScope = scopeAt(
        ancestors,
        declaration?.type === "VariableDeclaration" && declaration.kind === "var"
      );
      declarePattern(node.id, node.init ?? null, bindingScope, scope);
      return;
    }
    if ((node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") && node.id) {
      declarePattern(node.id, null, scopeAt(ancestors.slice(0, -1)));
    }
    declareScopedName(node, scope);
  });
  return scopeAt;
}
function lookupSelector(node, scope, seen = /* @__PURE__ */ new Set()) {
  if (node?.type === "Identifier") {
    const binding = lookupBinding(node.name, scope);
    if (!binding || seen.has(binding)) return void 0;
    seen.add(binding);
    return lookupSelector(binding.initializer, binding.scope, seen);
  }
  return selectorFromDomLookup(node);
}
function selectorFromDomLookup(node) {
  if (node?.type !== "CallExpression" || node.callee.type !== "MemberExpression") {
    return void 0;
  }
  const method = memberName(node.callee);
  if (method !== "getElementById" && method !== "querySelector") return void 0;
  const value = literalString(node.arguments[0]);
  if (!value) return void 0;
  return method === "getElementById" ? `#${value}` : value;
}
function extractMediaSrcMutations(script) {
  try {
    const ast = parseProgram(script);
    const scopeAt = collectBindings(ast);
    const mutations = [];
    acornWalk2.ancestor(ast, {
      AssignmentExpression(node, _state, ancestors) {
        if (node.operator !== "=" || node.left.type !== "MemberExpression" || memberName(node.left) !== "src")
          return;
        const selector = lookupSelector(node.left.object, scopeAt(ancestors));
        if (!selector) return;
        mutations.push({
          selector,
          operation: "src_assignment",
          raw: script.slice(node.start, node.end)
        });
      },
      CallExpression(node, _state, ancestors) {
        if (node.callee.type !== "MemberExpression" || memberName(node.callee) !== "setAttribute")
          return;
        if (literalString(node.arguments[0])?.toLowerCase() !== "src") return;
        const selector = lookupSelector(node.callee.object, scopeAt(ancestors));
        if (!selector) return;
        mutations.push({
          selector,
          operation: "set_attribute",
          raw: script.slice(node.start, node.end)
        });
      }
    });
    return mutations;
  } catch {
    return [];
  }
}
export {
  CANONICAL_AUTHORED_TIMING_ATTRIBUTES,
  CANONICAL_FONT_DISPLAY_NAMES,
  CANVAS_DIMENSIONS,
  COMPOSITION_ATTRIBUTES,
  COMPOSITION_CONTRACT_VERSION,
  COMPOSITION_VARIABLE_TYPES,
  ClipTimingWriteError,
  DEFAULT_DURATIONS,
  DERIVED_TIMING_ATTRIBUTES,
  FONT_ALIAS_KEYS,
  FONT_ALIAS_MAP,
  HTML_BODY_CSS_HEIGHT_FIRST_RE,
  HTML_BODY_CSS_WIDTH_FIRST_RE,
  LEGACY_TIMING_ATTRIBUTES,
  SPLIT_BOUNDARY_EPSILON_S,
  TIMELINE_COLORS,
  VALID_CANVAS_RESOLUTIONS,
  VIEWPORT_META_SIZE_RE,
  decodeUrlPathVariants,
  extractMediaSrcMutations,
  fontShorthandFamilies,
  getDefaultStageZoom,
  isAspectAgnosticResolutionAlias,
  isCompositionElement,
  isCompositionVariable,
  isFontValue,
  isImageValue,
  isMediaElement,
  isSafeMediaUrl,
  isScalarVariableValue,
  isTextElement,
  normalizeResolutionFlag,
  parseCompositionVariables,
  parseFontShorthand,
  parseNumeric,
  parseStartExpression,
  readClipTiming,
  resolveAliasDisplayName,
  resolveResolutionFlagPair,
  scanVariableUsage,
  writeClipTiming
};

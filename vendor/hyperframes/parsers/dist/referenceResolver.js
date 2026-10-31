// src/compositionContract.ts
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

// src/referenceResolver.ts
function compositionScopeOf(el) {
  return (el.getAttribute("data-composition-id") !== null ? el.parentElement : el)?.closest?.(
    "[data-composition-id]"
  ) ?? null;
}
function findReferenceTargetEl(doc, refId, from) {
  const scope = compositionScopeOf(from);
  if (scope) {
    for (const candidate of scope.querySelectorAll?.(`[id="${refId}"]`) ?? []) {
      if (compositionScopeOf(candidate) === scope) return candidate;
    }
  }
  return doc.getElementById(refId) ?? doc.querySelector(`[data-composition-id="${refId}"]`);
}
function resolveReferencedStart(doc, el, startCache, visiting) {
  const cached = startCache.get(el);
  if (cached !== void 0) return cached;
  if (visiting.has(el)) return 0;
  visiting.add(el);
  try {
    const expression = parseStartExpression(el.getAttribute("data-start"));
    if (!expression) {
      startCache.set(el, 0);
      return 0;
    }
    if (expression.kind === "absolute") {
      const value = Math.max(0, expression.value);
      startCache.set(el, value);
      return value;
    }
    const target = findReferenceTargetEl(doc, expression.refId, el);
    if (!target) {
      startCache.set(el, 0);
      return 0;
    }
    const targetStart = resolveReferencedStart(doc, target, startCache, visiting);
    const targetDuration = resolveReferencedDuration(doc, target, startCache, visiting);
    const resolved = targetDuration != null && targetDuration > 0 ? Math.max(0, targetStart + targetDuration + expression.offset) : Math.max(0, targetStart + expression.offset);
    startCache.set(el, resolved);
    return resolved;
  } finally {
    visiting.delete(el);
  }
}
function resolveReferencedDuration(doc, el, startCache, visiting) {
  const durationAttr = parseNumeric(el.getAttribute("data-duration"));
  if (durationAttr != null && durationAttr > 0) return durationAttr;
  const endAttr = parseNumeric(el.getAttribute("data-end"));
  if (endAttr != null) {
    const start = resolveReferencedStart(doc, el, startCache, visiting);
    const delta = endAttr - start;
    if (Number.isFinite(delta) && delta > 0) return delta;
  }
  return null;
}
export {
  resolveReferencedDuration,
  resolveReferencedStart
};

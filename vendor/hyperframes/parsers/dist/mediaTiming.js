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

// src/mediaDuration.ts
var nonNegative = (raw) => {
  const value = parseNumeric(raw);
  return value !== null && value >= 0 ? value : null;
};
function readMediaOffsetSeconds(getAttr) {
  return nonNegative(getAttr("data-playback-start")) ?? nonNegative(getAttr("data-media-start")) ?? 0;
}

// src/mediaTiming.ts
var MEDIA_START_BASIS_ATTR = "data-hf-media-start-basis";
function readMediaStartBasis(value) {
  return value?.trim().toLowerCase() === "global" ? "global" : "local";
}
function resolveAbsoluteMediaStartSeconds(input) {
  return readMediaStartBasis(input.basis) === "global" ? input.authoredStart : input.hostStart + input.authoredStart;
}
function resolveMediaStartSeconds(input) {
  if (!hasLiteralNestedStart(input)) return input.ordinaryStart();
  return resolveAbsoluteMediaStartSeconds({
    authoredStart: input.authoredStart,
    hostStart: input.hostStart,
    basis: input.basis
  });
}
function isRootGlobalMediaStart(input) {
  return hasLiteralNestedStart(input) && readMediaStartBasis(input.basis) === "global";
}
function hasLiteralNestedStart(input) {
  return !input.hasAutoStart && input.authoredStart != null && input.hostStart !== 0;
}
function hostInPointSeconds(host) {
  return readMediaOffsetSeconds((name) => host.getAttribute(name));
}
function compositionOriginSeconds(hostStart, host) {
  return hostStart - hostInPointSeconds(host);
}
function cutToHostSlots(span, hosts) {
  return hosts.reduce((kept, host) => {
    const start = Math.max(kept.start, host.start);
    return { start, end: Math.max(start, Math.min(kept.end, host.end)) };
  }, span);
}
export {
  MEDIA_START_BASIS_ATTR,
  compositionOriginSeconds,
  cutToHostSlots,
  hostInPointSeconds,
  isRootGlobalMediaStart,
  readMediaStartBasis,
  resolveAbsoluteMediaStartSeconds,
  resolveMediaStartSeconds
};

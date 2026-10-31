// src/timeSpans.ts
var instantTolerance = (time) => 4 * Number.EPSILON * Math.max(1, Math.abs(time));
function sameInstant(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
  return Math.abs(a - b) <= instantTolerance(Math.max(Math.abs(a), Math.abs(b)));
}
var isBefore = (a, b) => a < b && !sameInstant(a, b);
function spansOverlap(aStart, aEnd, bStart, bEnd) {
  return isBefore(aStart, bEnd) && isBefore(bStart, aEnd);
}
function spansShareTime(aStart, aEnd, bStart, bEnd) {
  return isBefore(Math.max(aStart, bStart), Math.min(aEnd, bEnd));
}
var isInsideSpan = (time, start, end) => isBefore(start, time) && isBefore(time, end);
export {
  instantTolerance,
  isInsideSpan,
  sameInstant,
  spansOverlap,
  spansShareTime
};

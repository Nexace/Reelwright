// src/helpers/mediaRange.ts
var MAX_OPEN_MEDIA_RANGE_BYTES = 4 * 1024 * 1024;
var isMedia = (contentType) => /^(audio|video)\//i.test(contentType);
function openRangeEnd(start, last, contentType) {
  return isMedia(contentType) ? Math.min(last, start + MAX_OPEN_MEDIA_RANGE_BYTES - 1) : last;
}

export {
  MAX_OPEN_MEDIA_RANGE_BYTES,
  openRangeEnd
};

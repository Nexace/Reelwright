// src/mediaAlpha.ts
var ALPHA_PIX_FMT_RE = /^(?:yuva|rgba|argb|bgra|abgr|gbrap|ya|ayuv)/i;
function pixelFormatHasAlpha(pixFmt) {
  return pixFmt !== void 0 && ALPHA_PIX_FMT_RE.test(pixFmt);
}
function videoStreamHasAlpha(stream) {
  if (pixelFormatHasAlpha(stream.pix_fmt)) return true;
  return Object.entries(stream.tags ?? {}).some(
    ([key, value]) => key.toLowerCase() === "alpha_mode" && value === "1"
  );
}
function alphaDecoderFor(codecName) {
  const codec = codecName?.toLowerCase();
  if (codec === "vp9") return "libvpx-vp9";
  if (codec === "vp8") return "libvpx";
  return null;
}
export {
  alphaDecoderFor,
  pixelFormatHasAlpha,
  videoStreamHasAlpha
};

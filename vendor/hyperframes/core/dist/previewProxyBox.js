/** Query parameter carrying the largest box, in device pixels, a preview shows a proxied video at. */
export const PREVIEW_PROXY_BOX_PARAM = "hf-proxy-box";
export const PREVIEW_PROXY_LIGHT_PARAM = "hf-proxy-light";
export const PREVIEW_PROXY_RETRY_PARAM = "hf-proxy-retry";
export const PREVIEW_PROXY_PROGRESS_HEADER = "X-HF-Proxy-Progress";
export const PREVIEW_PROXY_PRIORITY_HEADER = "X-HF-Proxy-Priority";
// 256 * 2^(k/4), even: nearby boxes share one cached copy, and a rung overshoots by at most ~19%.
const RUNGS = [
    256, 304, 362, 430, 512, 608, 724, 862, 1024, 1218, 1448, 1722, 2048, 2436, 2896, 3444, 4096,
    4870, 5792, 6888, 8192,
];
function rungAtLeast(pixels) {
    if (!(pixels > 0))
        return null;
    return RUNGS.find((rung) => rung >= pixels) ?? null;
}
/** Rounds a shown box up to the size ladder; null when it is empty or larger than any rung. */
export function quantizePreviewProxyBox(width, height) {
    const w = rungAtLeast(width);
    const h = rungAtLeast(height);
    return w && h ? { width: w, height: h } : null;
}
export function formatPreviewProxyBox(box) {
    return `${box.width}x${box.height}`;
}
/** Accepts only ladder rungs, so a client cannot make one cached copy per pixel. */
export function parsePreviewProxyBox(raw) {
    const match = /^(\d{3,4})x(\d{3,4})$/.exec(raw);
    if (!match)
        return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    return RUNGS.includes(width) && RUNGS.includes(height) ? { width, height } : null;
}
export const PREVIEW_QUALITY_LEVELS = [1, 0.5, 0.25, 0.125];
export function isPreviewQuality(value) {
    return PREVIEW_QUALITY_LEVELS.some((level) => level === value);
}
export const HEAVY_PIXEL_SHARE = 0.5;
export const HEAVY_BITRATE = 40_000_000;
export function scalePreviewProxyBox(box, level) {
    return quantizePreviewProxyBox(box.width * level, box.height * level) ?? box;
}
export function isHeavyForPreview(facts, copyBox) {
    return (copyBox.width * copyBox.height <= HEAVY_PIXEL_SHARE * facts.width * facts.height ||
        facts.bitDepth > 8 ||
        facts.bitrate >= HEAVY_BITRATE);
}

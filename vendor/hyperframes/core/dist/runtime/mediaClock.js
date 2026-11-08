export const MEDIA_ELEMENT_LEAD_SECONDS = 1e-5;
export function mediaElementTime(sourceSeconds) {
    return sourceSeconds + MEDIA_ELEMENT_LEAD_SECONDS;
}
export function startsSoundOnlyInsideATap() {
    const { userAgent, maxTouchPoints } = navigator;
    return /iP(hone|ad|od)/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}
export function isWebKit() {
    const { userAgent } = navigator;
    return /AppleWebKit/.test(userAgent) && !/Chrom(e|ium)\/|Edg\/|Android/.test(userAgent);
}

export const AUDIBLE_VIDEO_QUALIFIER = ':not([muted]):is(:not([data-has-audio]),[data-has-audio="true"])';
export const AUDIBLE_MEDIA_SELECTOR = `audio[data-start], video[data-start]${AUDIBLE_VIDEO_QUALIFIER}`;
export function isAudibleVideoElement(el) {
    if (el.tagName.toLowerCase() !== "video" || el.hasAttribute("muted"))
        return false;
    const declared = el.getAttribute("data-has-audio");
    return declared === null || declared === "true";
}
export function audibleVideoNeedsWebAudio(fields) {
    return ((fields.volume ?? 1) > 1 ||
        Boolean(fields.fxChain || fields.automation || fields.audioGroup || fields.masterChain));
}

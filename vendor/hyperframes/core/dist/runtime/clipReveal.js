import { CLIP_HIDDEN_ATTR } from "../studioPreviewMark.js";
export { CLIP_HIDDEN_ATTR };
/** Shows a clip the visibility pass hid, contents included; returns a function that puts the mark back. */
export function revealClip(el, priority = "") {
    el.style.setProperty("visibility", "visible", priority);
    if (!el.hasAttribute(CLIP_HIDDEN_ATTR))
        return () => { };
    el.removeAttribute(CLIP_HIDDEN_ATTR);
    return function putClipHiddenMarkBack() {
        el.setAttribute(CLIP_HIDDEN_ATTR, "");
    };
}
/** Called by shader-transitions builds on load: their revealers go through revealClip. */
export function declareClipRevealAware() {
    if (typeof window !== "undefined")
        window.__hfClipRevealAware = true;
}
/** A shader-transitions build is on the page whose revealers predate revealClip. */
export function olderShaderBuildOnPage() {
    const win = window;
    const shaderOnPage = win.HyperShader !== undefined || win.__hf?.transitions !== undefined;
    return shaderOnPage && win.__hfClipRevealAware !== true;
}

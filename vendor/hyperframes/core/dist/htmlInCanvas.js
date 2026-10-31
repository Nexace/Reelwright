export const CAPTURE_CANVAS_SELECTOR = 'canvas[layoutsubtree], canvas[content="drawable"]';
/** The form this browser's html-in-canvas takes, or null when it has no usable one. */
export function htmlInCanvasForm(win = window) {
    const ctx = win
        .CanvasRenderingContext2D?.prototype;
    if (!ctx || !("drawElementImage" in ctx))
        return null;
    const canvas = win.document.createElement("canvas");
    if (!("requestPaint" in canvas))
        return null;
    // 155 already has updateElementGeometry but still wants layoutsubtree, so this order matters.
    if ("layoutSubtree" in canvas)
        return "layoutsubtree";
    return "updateElementGeometry" in canvas ? "drawable" : null;
}
export function markCaptureCanvas(canvas, form) {
    if (form === "layoutsubtree")
        canvas.setAttribute("layoutsubtree", "");
    else
        canvas.setAttribute("content", "drawable");
}
export function markCaptured(el, form) {
    if (form === "drawable")
        el.setAttribute("drawable", "");
}
export function unmarkCaptured(el, form) {
    if (form === "drawable")
        el.removeAttribute("drawable");
}

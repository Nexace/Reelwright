import { htmlInCanvasForm } from "./htmlInCanvas.js";
// Engine-set: the off switch (its sub-frame blur runs, or the preview could not blur); the render scale (dpr falls back to 1).
export const PAGE_MOTION_BLUR_OFF_GLOBAL = "__HF_PAGE_MOTION_BLUR_OFF__";
export const PAGE_DEVICE_SCALE_GLOBAL = "__HF_DEVICE_SCALE_FACTOR__";
export function supportsCaptureMotionBlur(win = window) {
    return htmlInCanvasForm(win) !== null;
}
const ACCELERATED_CANVASES_GLOBAL = "__hfAcceleratedCanvases";
/**
 * Remember canvases html-in-canvas cannot capture: WebGL, WebGPU, or handed to an OffscreenCanvas.
 * Self-contained: the engine and the preview run its source ahead of every author script.
 */
export function installAcceleratedCanvasTracker() {
    const key = "__hfAcceleratedCanvases";
    const known = Reflect.get(window, key);
    const seen = known instanceof WeakSet ? known : new WeakSet();
    if (seen !== known)
        Object.defineProperty(window, key, { value: seen });
    const accelerated = ["webgl", "webgl2", "experimental-webgl", "webgpu"];
    const wrap = (name, onCall) => {
        const proto = HTMLCanvasElement.prototype;
        const original = Reflect.get(proto, name);
        if (typeof original !== "function" || "__hfAccelTracked" in original)
            return;
        const tracked = function (...args) {
            const result = Reflect.apply(original, this, args);
            onCall(this, args, result);
            return result;
        };
        Object.defineProperty(tracked, "__hfAccelTracked", { value: true });
        Object.defineProperty(proto, name, { value: tracked, writable: true, configurable: true });
    };
    const ownWindowSet = (canvas) => {
        const view = canvas.ownerDocument?.defaultView;
        const own = view ? Reflect.get(view, key) : undefined;
        return own && typeof own.add === "function"
            ? own
            : seen;
    };
    wrap("getContext", (canvas, args, ctx) => {
        if (ctx && accelerated.includes(String(args[0])))
            ownWindowSet(canvas).add(canvas);
    });
    wrap("transferControlToOffscreen", (canvas) => {
        ownWindowSet(canvas).add(canvas);
    });
}
export function isAcceleratedCanvas(canvas) {
    const seen = Reflect.get(window, ACCELERATED_CANVASES_GLOBAL);
    return seen instanceof WeakSet && seen.has(canvas);
}
/** The tracker as a script body, for `evaluateOnNewDocument` and inline `<script>` injection. */
export function acceleratedCanvasTrackerSource() {
    return `(${installAcceleratedCanvasTracker.toString()})();`;
}

/** Records each WebGL context a page creates. Register with page.evaluateOnNewDocument before navigation. */
export function recordWebglContexts() {
    const w = window;
    w.__hf_gl_contexts = [];
    const canvasProto = HTMLCanvasElement.prototype;
    const orig = canvasProto.getContext;
    canvasProto.getContext = function (type, attrs) {
        const ctx = orig.call(this, type, attrs);
        if (ctx && (type === "webgl" || type === "webgl2" || type === "experimental-webgl")) {
            const list = w.__hf_gl_contexts ?? [];
            if (!list.some((r) => r.ctx === ctx))
                list.push({ canvas: this, ctx });
            w.__hf_gl_contexts = list;
        }
        return ctx;
    };
}
/** Releases the WebGL context of each canvas in a hidden clip whose runtime-resolved window ended by `time`. */
export async function releaseEndedWebglContexts(page, time) {
    return page.evaluate((t) => {
        const clipWindow = window.__hf?.clipWindow;
        if (!clipWindow)
            return 0;
        const hasEnded = (el) => {
            for (let up = el; up; up = up.parentElement) {
                const span = up.hasAttribute("data-hf-clip-hidden") ? clipWindow(up) : null;
                if (span && Number.isFinite(span.end) && span.end <= t)
                    return true;
            }
            return false;
        };
        const live = (window.__hf_gl_contexts ?? []).filter((r) => !r.lost && hasEnded(r.canvas));
        for (const rec of live) {
            rec.lost = true;
            rec.ctx.getExtension("WEBGL_lose_context")?.loseContext();
        }
        return live.length;
    }, time);
}

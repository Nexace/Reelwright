/**
 * Tells the page's capture motion blur (`data-motion-blur="on"`) to stand down, before any of
 * its scripts run: when the engine blurs (it would average frames that are already blurred) or
 * when the render must match a Studio preview that could not blur (`pageMotionBlur: "off"`).
 */
import { PAGE_DEVICE_SCALE_GLOBAL, PAGE_MOTION_BLUR_OFF_GLOBAL, acceleratedCanvasTrackerSource, } from "@hyperframes/core";
function pageOffReason(options) {
    if (options.motionBlur)
        return "engine-motion-blur";
    if (options.pageMotionBlur === "off")
        return "preview-unsupported";
    return options.pageMotionBlur ?? null;
}
export async function installPageMotionBlur(page, options) {
    await page.evaluateOnNewDocument(acceleratedCanvasTrackerSource());
    const scale = options.deviceScaleFactor ?? 1;
    if (scale > 1) {
        await page.evaluateOnNewDocument((key, v) => {
            window[key] = v;
        }, PAGE_DEVICE_SCALE_GLOBAL, scale);
    }
    const off = pageOffReason(options);
    if (!off)
        return;
    await page.evaluateOnNewDocument((key, v) => {
        window[key] = v;
    }, PAGE_MOTION_BLUR_OFF_GLOBAL, off);
}
async function readPageMotionBlur(page) {
    return page.evaluate(() => {
        const api = Reflect.get(window, "__hfMotionBlur");
        const report = api && typeof api === "object" ? Reflect.get(api, "report") : null;
        const got = typeof report === "function" ? report() : null;
        if (!got || typeof got !== "object")
            return null;
        const tier = Reflect.get(got, "tier");
        return {
            state: String(Reflect.get(got, "state")),
            code: String(Reflect.get(got, "reasonCode")),
            movers: Number(Reflect.get(got, "movers")),
            failedFrames: Number(Reflect.get(got, "failedFrames")) || 0,
            tier: typeof tier === "string" ? tier : null,
        };
    });
}
const formatPageMotionBlur = (r) => `[motion-blur] ${r.state} reasonCode=${r.code} movers=${r.movers} failedFrames=${r.failedFrames}${r.tier ? ` tier=${r.tier}` : ""}`;
/** One line saying what the page's blur did for this session; null when the page never asked for blur. */
export async function describePageMotionBlur(page) {
    const r = await readPageMotionBlur(page);
    return r && formatPageMotionBlur(r);
}
/** The session's closing line, only when frames fell back to plain DOM: the first-frame line cannot know. */
export async function describePageMotionBlurAtEnd(page, timeoutMs = 1500) {
    let timer;
    const stuck = new Promise((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
    });
    try {
        const r = await Promise.race([readPageMotionBlur(page), stuck]);
        return r && r.failedFrames > 0 ? `${formatPageMotionBlur(r)} (session end)` : null;
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
}

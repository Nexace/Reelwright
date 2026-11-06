import { createRuntimeStartTimeResolver } from "./runtime/startResolver.js";
import { isRuntimeElementVisibleAt } from "./runtime/timeline.js";
import { defersMediaIn } from "./studioPreviewMark.js";
export const FIRST_FRAME_READINESS_SCOPE = "first-frame";
// HTMLMediaElement.HAVE_FUTURE_DATA per spec, used as a literal because not
// every DOM implementation defines the named static (e.g. happy-dom leaves
// it undefined).
const HAVE_FUTURE_DATA = 3;
// `doc` is a foreign (same-origin) iframe document, so its elements belong to
// that iframe's own realm — instanceof checks against this window's globals
// would silently reject every one of them. Resolve the class from the node's
// own defaultView first.
export function isRealmElement(node) {
    const view = node.ownerDocument?.defaultView;
    if (view && node instanceof view.Element)
        return true;
    return node instanceof Element;
}
export function isRealmHtmlMediaElement(node) {
    if (!isRealmElement(node))
        return false;
    if (node.tagName !== "AUDIO" && node.tagName !== "VIDEO")
        return false;
    const view = node.ownerDocument?.defaultView;
    if (view && node instanceof view.HTMLMediaElement)
        return true;
    return node instanceof HTMLMediaElement;
}
function isTimedElement(element) {
    return element.hasAttribute("data-start") || element.hasAttribute("data-track-index");
}
function isActiveAtFirstFrame(element, resolver, timelineRegistry) {
    let current = element;
    while (current) {
        if (isTimedElement(current)) {
            if (!isRuntimeElementVisibleAt(current, {
                currentTime: 0,
                compositionDuration: Number.POSITIVE_INFINITY,
                canonicalFps: 30,
                timelineRegistry,
                resolver,
            }))
                return false;
        }
        current = current.parentElement;
    }
    return true;
}
function shouldIncludeAsset(element, scope, resolver, timelineRegistry) {
    if (scope === "all")
        return true;
    return isActiveAtFirstFrame(element, resolver, timelineRegistry);
}
/** One DOM pass for every declared-media asset not yet ready. */
export function scanPendingCompositionAssets(doc, { scope = "all" } = {}) {
    const runtimeWindow = doc.defaultView;
    const resolver = createRuntimeStartTimeResolver({
        documentRef: doc,
        timelineRegistry: runtimeWindow?.__timelines,
        includeAuthoredTimingAttrs: true,
    });
    // Studio's preview and the player buffer a clip off the first frame only once it comes due, as with a lazy image.
    const defersMedia = defersMediaIn(doc);
    const pendingMedia = Array.from(doc.querySelectorAll("video, audio"))
        .filter(isRealmHtmlMediaElement)
        .filter((el) => shouldIncludeAsset(el, defersMedia && el.preload !== "auto" ? FIRST_FRAME_READINESS_SCOPE : scope, resolver, runtimeWindow?.__timelines ?? {}))
        .filter((el) => el.readyState < HAVE_FUTURE_DATA);
    // A lazy image off the first frame loads only once shown, so no scope can wait on it.
    const pendingImages = Array.from(doc.querySelectorAll("img"))
        .filter((img) => shouldIncludeAsset(img, img.getAttribute("loading")?.toLowerCase() === "lazy" ? FIRST_FRAME_READINESS_SCOPE : scope, resolver, runtimeWindow?.__timelines ?? {}))
        .filter((img) => !img.complete);
    const fontsLoading = doc.fonts?.status === "loading";
    return { pendingMedia, pendingImages, fontsLoading };
}
function collectPendingCompositionAssets(doc, { pendingMedia, pendingImages, fontsLoading }, signal) {
    const mediaReady = pendingMedia.map((el) => new Promise((resolve) => {
        // init.ts's eager preload pass may have already errored this element
        // before this input ran; a DOM error event doesn't refire, so a
        // listener attached now would wait for the shared 8s timeout instead.
        if (el.error) {
            resolve();
            return;
        }
        const onSettled = () => {
            el.removeEventListener("canplay", onSettled);
            el.removeEventListener("error", onSettled);
            signal.removeEventListener("abort", onSettled);
            resolve();
        };
        el.addEventListener("canplay", onSettled);
        el.addEventListener("error", onSettled);
        signal.addEventListener("abort", onSettled, { once: true });
    }));
    const imagesReady = pendingImages.map((img) => img.decode ? img.decode().catch(() => { }) : Promise.resolve());
    const fontsReady = fontsLoading && doc.fonts ? doc.fonts.ready.then(() => { }) : Promise.resolve();
    return Promise.all([...mediaReady, ...imagesReady, fontsReady]).then(() => { });
}
/** Declared-media readiness input: waits on the composition's own video,
 * audio, image and font-face loads. */
export function mediaReadinessInput(doc, signal, { scope = "all" } = {}) {
    const scan = scanPendingCompositionAssets(doc, { scope });
    if (scan.pendingMedia.length === 0 && scan.pendingImages.length === 0 && !scan.fontsLoading) {
        return null;
    }
    return collectPendingCompositionAssets(doc, scan, signal);
}
const RENDER_READY_POLL_MS = 50;
/** Declared-compute readiness input: waits on `window.__renderReady`. A
 * probe-only composition (no HyperFrames runtime injected) never sets
 * it — __hf absent means nothing to wait on, not an 8s poll for a flag
 * that was never going to flip. */
export function computeReadinessInput(doc, signal) {
    const win = doc.defaultView;
    if (!win)
        return null;
    if (win.__renderReady)
        return null;
    if (!win.__hf)
        return null;
    return new Promise((resolve) => {
        let timeoutId;
        const finish = () => {
            if (timeoutId !== undefined)
                clearTimeout(timeoutId);
            signal.removeEventListener("abort", finish);
            resolve();
        };
        if (signal.aborted) {
            finish();
            return;
        }
        signal.addEventListener("abort", finish, { once: true });
        const poll = () => {
            if (win.__renderReady) {
                finish();
                return;
            }
            timeoutId = setTimeout(poll, RENDER_READY_POLL_MS);
        };
        poll();
    });
}
// Gaps under this bound count as quiet on any document.
const IDLE_FRAME_GAP_MS = 50;
// Ordinary frame jitter can span 1.5x the document's shortest observed gap.
const IDLE_FRAME_GAP_RATIO = 1.5;
// Two consecutive quiet frames, not one: a single fast gap can follow
// directly after the busy work finishes mid-frame and says nothing about
// whether the next frame is also free.
const IDLE_FRAMES_REQUIRED = 2;
// Bounds continuing stalls. A backgrounded document with no frames still
// rides the shared timeout; this budget only bounds frames that arrive.
// ponytail: 1500ms is unmeasured; retune with frame traces.
const MAX_PAINT_WAIT_MS = 1_500;
// Resolves with -1 on abort instead of rejecting: every caller already
// re-checks `signal.aborted` right after awaiting this, so a sentinel value
// is enough and keeps the abort path a plain early-return, not a try/catch.
function nextAnimationFrame(win, signal) {
    return new Promise((resolve) => {
        if (signal.aborted) {
            resolve(-1);
            return;
        }
        let id = 0;
        const onAbort = () => {
            win.cancelAnimationFrame?.(id);
            resolve(-1);
        };
        signal.addEventListener("abort", onAbort, { once: true });
        // A host whose rAF calls back synchronously reaches onAbort in the
        // callback, so it must already be declared above.
        id = win.requestAnimationFrame((ts) => {
            signal.removeEventListener("abort", onAbort);
            resolve(ts);
        });
    });
}
/** Composition-agnostic readiness input: waits for a frame to paint, then
 * two consecutive quiet frame gaps — an early-out once the main thread is
 * free relative to its own frame cadence. See MAX_PAINT_WAIT_MS for
 * what this bound does and does not cover. Compute and media inputs own completion. */
export function paintAndIdleReadinessInput(doc, signal) {
    const win = doc.defaultView;
    if (!win)
        return null;
    return (async () => {
        const firstTs = await nextAnimationFrame(win, signal);
        if (signal.aborted)
            return;
        let lastTs = await nextAnimationFrame(win, signal);
        let shortestGap = lastTs - firstTs;
        let quietStreak = 0;
        while (!signal.aborted && quietStreak < IDLE_FRAMES_REQUIRED) {
            if (lastTs - firstTs >= MAX_PAINT_WAIT_MS)
                return;
            const ts = await nextAnimationFrame(win, signal);
            if (signal.aborted)
                return;
            const gap = ts - lastTs;
            shortestGap = Math.min(shortestGap, gap);
            const quiet = gap < IDLE_FRAME_GAP_MS || gap <= shortestGap * IDLE_FRAME_GAP_RATIO;
            quietStreak = quiet ? quietStreak + 1 : 0;
            lastTs = ts;
        }
    })();
}
const DEFAULT_TIMEOUT_MS = 8_000;
/** Invokes `onSettled` once every input settles, or the timeout elapses.
 * Calls back synchronously, before returning, when nothing is pending — a
 * caller that plays right after this call sees the decision already
 * applied, same as before this gate existed. With the default inputs this
 * only happens for a document with no `defaultView`, since
 * paintAndIdleReadinessInput always has a frame to wait on otherwise. */
export function settleCompositionReadiness(doc, onSettled, opts = {}) {
    const inputs = opts.inputs ?? [
        (inputDoc, signal) => mediaReadinessInput(inputDoc, signal, { scope: opts.scope }),
        computeReadinessInput,
        paintAndIdleReadinessInput,
    ];
    const controller = new AbortController();
    const pending = inputs
        .map((input) => input(doc, controller.signal))
        .filter((p) => p !== null);
    if (pending.length === 0) {
        onSettled({ timedOut: false });
        return;
    }
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    let timeoutId;
    const timeout = new Promise((resolve) => {
        timeoutId = setTimeout(() => resolve("timed-out"), timeoutMs);
    });
    // A timeout win leaves the losing inputs' promises pending forever unless
    // told to stop: this abort is what lets computeReadinessInput clear its
    // poll timer and paintAndIdleReadinessInput cancel its rAF chain instead
    // of running for the life of the page.
    Promise.race([Promise.all(pending).then(() => "done"), timeout]).then((result) => {
        clearTimeout(timeoutId);
        controller.abort();
        onSettled({ timedOut: result === "timed-out" });
    });
}
export function settleFirstFrameCompositionReadiness(doc, onSettled, opts = {}) {
    settleCompositionReadiness(doc, onSettled, {
        ...opts,
        scope: FIRST_FRAME_READINESS_SCOPE,
    });
}

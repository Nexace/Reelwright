import { resolveCompositionDuration, } from "@hyperframes/parsers/composition-duration";
import { findRootCompositionElement, parseCompositionDimension } from "./compositionDimension.js";
import { isMediaElement } from "./domRealm.js";
import { parseStrictFiniteTimingNumber, resolveMediaElementDurationSeconds } from "./playbackRate.js";
import { createRuntimeStartTimeResolver } from "./startResolver.js";
import { createRuntimeState } from "./state.js";
export { findRootCompositionElement };
export const LOOP_INFLATED_TIMELINE_SECONDS = 7200;
/** One frame at 60 fps: a timeline, floor or fallback this short or shorter is no length at all. */
export const MIN_VALID_TIMELINE_DURATION_SECONDS = 1 / 60;
const aboveOneFrame = (seconds) => seconds !== null && seconds > MIN_VALID_TIMELINE_DURATION_SECONDS ? seconds : null;
/** The size the runtime reports to its host. */
export function readCompositionSize(root) {
    return {
        width: parseCompositionDimension(root.getAttribute("data-width")),
        height: parseCompositionDimension(root.getAttribute("data-height")),
    };
}
/** The timed `<video>`/`<audio>` whose window ends last, and where it ends. */
export function longestMediaWindow(doc, media) {
    let longest = null;
    for (const node of doc.querySelectorAll("video[data-start], audio[data-start]")) {
        const start = media.mediaStart(node);
        if (!Number.isFinite(start))
            continue;
        const duration = media.mediaDuration(node);
        if (duration == null || duration <= MIN_VALID_TIMELINE_DURATION_SECONDS)
            continue;
        const end = Math.max(0, start) + duration;
        if (!longest || end > longest.seconds)
            longest = { seconds: end, element: node };
    }
    return longest && aboveOneFrame(longest.seconds) !== null ? longest : null;
}
export function resolveMediaWindowDurationSeconds(doc, media) {
    return longestMediaWindow(doc, media)?.seconds ?? null;
}
/** The latest of the root's declared length and its direct sub-compositions' ends. */
export function resolveAuthoredCompositionFloorSeconds(root, startResolver) {
    const subCompositionEnds = [];
    for (const node of root.querySelectorAll("[data-composition-id][data-start]")) {
        if (node.parentElement?.closest("[data-composition-id]") !== root)
            continue;
        const start = startResolver.resolveStartForElement(node, 0);
        const duration = startResolver.resolveDurationForElement(node);
        if (!Number.isFinite(start) || duration == null || duration <= 0)
            continue;
        subCompositionEnds.push(Math.max(0, start) + duration);
    }
    const declared = parseStrictFiniteTimingNumber(root.getAttribute("data-duration"));
    return aboveOneFrame(resolveCompositionDuration({
        authoredDurationSeconds: null,
        clipEndsSeconds: [declared, ...subCompositionEnds],
    }).seconds);
}
const isCompositionHost = (node) => node.hasAttribute("data-composition-id") || node.hasAttribute("data-composition-src");
/** The last-resort length: the latest end among the root's timed clips. Until every clip's length
 *  is known it is unresolved, so a renderer that reads it once cannot lock in a short one.
 *  `unregisteredLottie`: a Lottie library is loaded, so animations may still register. */
export function resolveContentDerivedDuration(root, startResolver, { unregisteredLottie }) {
    const clipEnds = [];
    for (const node of root.querySelectorAll("[data-start]")) {
        const start = startResolver.resolveStartForElement(node, 0);
        if (!Number.isFinite(start))
            continue;
        const duration = startResolver.resolveDurationForElement(node);
        if (duration != null)
            clipEnds.push(Math.max(0, start) + duration);
        else if (isMediaElement(node) || isCompositionHost(node))
            clipEnds.push(null);
    }
    if (unregisteredLottie || root.querySelector("[data-lottie-src]"))
        clipEnds.push(null);
    const result = resolveCompositionDuration({
        authoredDurationSeconds: null,
        clipEndsSeconds: clipEnds,
    });
    return result.pendingClips > 0
        ? { ...result, seconds: null, source: "unresolved", reason: "a clip's length is pending" }
        : result;
}
export function resolveCompositionLengthSeconds(input) {
    return resolveCompositionLength(input).seconds;
}
/** A declared root length is the length; else the longest of timeline, floors and fallback (a
 *  loop-inflated timeline yields to a floor or fallback); else the length derived from the clips.
 *  `from` names the input that set it, and `floorIndex` which floor when a floor did. */
export function resolveCompositionLength(input) {
    if (input.declared !== null && Number.isFinite(input.declared) && input.declared > 0) {
        return { seconds: input.declared, from: "declared", floorIndex: null };
    }
    const rawTimeline = aboveOneFrame(input.timeline());
    const floors = input.floors().map((seconds) => seconds ?? 0);
    const floor = Math.max(0, ...floors);
    const fallback = Number.isFinite(input.fallback) && input.fallback > MIN_VALID_TIMELINE_DURATION_SECONDS
        ? input.fallback
        : 0;
    const floorOrFallback = Math.max(floor, fallback);
    const loopInflated = rawTimeline !== null &&
        rawTimeline >= LOOP_INFLATED_TIMELINE_SECONDS &&
        aboveOneFrame(floorOrFallback) !== null;
    const timeline = loopInflated ? null : rawTimeline;
    const floorWins = floor >= fallback;
    const fromFloorOrFallback = (seconds) => ({
        seconds,
        from: floorWins ? "floor" : "fallback",
        floorIndex: floorWins ? floors.indexOf(floor) : null,
    });
    if (timeline !== null) {
        return timeline >= floorOrFallback
            ? { seconds: timeline, from: "timeline", floorIndex: null }
            : fromFloorOrFallback(floorOrFallback);
    }
    if (aboveOneFrame(floor) !== null)
        return fromFloorOrFallback(floorOrFallback);
    if (fallback > 0)
        return { seconds: fallback, from: "fallback", floorIndex: null };
    const derived = input.derived();
    return { seconds: derived > 0 ? derived : 0, from: "derived", floorIndex: null };
}
/** Size, frame rate and length of a composition nothing is running (a server-parsed or detached
 *  document): no timelines, no adapters, and media without a known source length is pending. */
export function readStaticCompositionMeta(doc) {
    const root = findRootCompositionElement(doc);
    if (!root)
        return null;
    const resolver = createRuntimeStartTimeResolver({
        timelineRegistry: {},
        includeAuthoredTimingAttrs: true,
        documentRef: doc,
    });
    const durationSeconds = resolveCompositionLengthSeconds({
        declared: parseStrictFiniteTimingNumber(root.getAttribute("data-duration")),
        timeline: () => null,
        floors: () => [
            resolveMediaWindowDurationSeconds(doc, {
                mediaStart: resolver.resolveMediaStartForElement,
                mediaDuration: resolveMediaElementDurationSeconds,
            }),
            resolveAuthoredCompositionFloorSeconds(root, resolver),
        ],
        fallback: 0,
        derived: () => resolveContentDerivedDuration(root, resolver, { unregisteredLottie: false }).seconds ?? 0,
    });
    return { ...readCompositionSize(root), fps: createRuntimeState().canonicalFps, durationSeconds };
}

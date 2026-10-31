import { readTimelineDurationSeconds } from "./timelineDuration.js";
import { resolveAuthoredTimingWindow } from "./authoredTiming.js";
// Straight from playbackRate, not through media.ts's re-export: media.ts
// imports mediaVolumeEnvelope, which needs this resolver, and the round trip
// would be an import cycle.
import { parseStrictFiniteTimingNumber, resolveNaturalMediaTimelineDuration, resolveTimedImageDurationSeconds, } from "./playbackRate.js";
import { isMediaElement } from "./domRealm.js";
import { parseStartExpression } from "./startExpression.js";
import { compositionOriginSeconds, hostInPointSeconds, isRootGlobalMediaStart, MEDIA_START_BASIS_ATTR, resolveMediaStartSeconds, } from "../mediaTiming.js";
export function createRuntimeStartTimeResolver(params) {
    const timelineRegistry = params.timelineRegistry ?? {};
    const includeAuthoredTimingAttrs = params.includeAuthoredTimingAttrs ?? false;
    const doc = params.documentRef ?? document;
    const startCache = new WeakMap();
    const durationCache = new WeakMap();
    const visiting = new Set();
    const compositionScopeOf = (element) => (element.hasAttribute("data-composition-id") ? element.parentElement : element)?.closest("[data-composition-id]") ?? null;
    const findReferenceTarget = (refId, from) => {
        const scope = compositionScopeOf(from);
        if (scope) {
            for (const candidate of scope.querySelectorAll(`[id="${refId}"]`)) {
                if (compositionScopeOf(candidate) === scope)
                    return candidate;
            }
        }
        const byId = doc.getElementById(refId);
        if (byId)
            return byId;
        return (Array.from(doc.querySelectorAll("[data-composition-id]")).find((element) => element.getAttribute("data-composition-id") === refId) ?? null);
    };
    const authoredAttr = (element, name) => includeAuthoredTimingAttrs ? element.getAttribute(name) : null;
    const resolveAuthoredDuration = (element) => resolveAuthoredTimingWindow({
        start: 0,
        duration: element.getAttribute("data-duration"),
        authoredDuration: authoredAttr(element, "data-hf-authored-duration"),
    })?.duration ??
        resolveAuthoredTimingWindow({
            start: resolveStartForElementInternal(element, 0),
            end: element.getAttribute("data-end"),
            authoredEnd: authoredAttr(element, "data-hf-authored-end"),
        })?.duration ??
        null;
    const positive = (value) => value != null && Number.isFinite(value) && value > 0 ? value : null;
    const resolveRegisteredTimelineDuration = (element) => {
        const compositionId = element.getAttribute("data-composition-id");
        return compositionId
            ? positive(readTimelineDurationSeconds(timelineRegistry[compositionId]))
            : null;
    };
    const resolveDurationForElement = (element) => {
        const cached = durationCache.get(element);
        if (cached !== undefined)
            return cached;
        const resolved = resolveAuthoredDuration(element) ??
            positive(isMediaElement(element)
                ? resolveNaturalMediaTimelineDuration(element, element.duration)
                : null) ??
            positive(resolveTimedImageDurationSeconds(element)) ??
            resolveRegisteredTimelineDuration(element);
        durationCache.set(element, resolved);
        return resolved;
    };
    const COMPOSITION_HOST_SELECTOR = "[data-composition-src], [data-composition-id], [data-composition-file]";
    const isCompositionHost = (element) => element.matches(COMPOSITION_HOST_SELECTOR);
    // A mounted composition root without its own `data-start` takes its timing from the nearest host
    // or timed wrapper above it, the clip that shows it; the host may use another id than the file.
    const inheritedTimingHost = (element) => {
        if (!element.hasAttribute("data-composition-id"))
            return null;
        if (parseStartExpression(element.getAttribute("data-start")))
            return null;
        return element.parentElement?.closest(`[data-start], ${COMPOSITION_HOST_SELECTOR}`) ?? null;
    };
    const resolveCompositionOrigin = (compositionRoot, fallback) => compositionOriginSeconds(resolveStartForElementInternal(compositionRoot, fallback), inheritedTimingHost(compositionRoot) ?? compositionRoot);
    const resolveHostOffsetForElement = (element, fallback) => {
        const compositionRoot = element.hasAttribute("data-composition-id")
            ? element.parentElement?.closest("[data-composition-id]")
            : element.closest("[data-composition-id]");
        return compositionRoot ? resolveCompositionOrigin(compositionRoot, fallback) : 0;
    };
    const computeStart = (element, fallback) => {
        const expression = parseStartExpression(element.getAttribute("data-start"));
        if (!expression) {
            const host = inheritedTimingHost(element);
            return host ? resolveStartForElementInternal(host, fallback) : fallback;
        }
        if (expression.kind === "absolute") {
            // Negative when a host's in-point is past its start; the host's slot cuts that part.
            return resolveHostOffsetForElement(element, fallback) + Math.max(0, expression.value);
        }
        const target = findReferenceTarget(expression.refId, element);
        if (!target)
            return fallback;
        const targetStart = resolveStartForElementInternal(target, 0);
        const targetDuration = resolveDurationForElement(target) ?? 0;
        // Clamped at local 0, as a numeric start is, once an in-point puts local 0 before 0.
        const floor = Math.min(0, resolveHostOffsetForElement(element, 0));
        return Math.max(floor, targetStart + targetDuration + expression.offset);
    };
    const resolveStartForElementInternal = (element, fallback) => {
        const cached = startCache.get(element);
        if (cached !== undefined) {
            return cached == null ? fallback : cached;
        }
        if (visiting.has(element)) {
            return fallback;
        }
        visiting.add(element);
        try {
            const resolved = computeStart(element, fallback);
            startCache.set(element, resolved);
            return resolved;
        }
        finally {
            visiting.delete(element);
        }
    };
    /**
     * The ONE owner of "when does this media element start on the root timeline".
     *
     * A media element is not a plain timed clip: `data-hf-media-start-basis`
     * decides whether its `data-start` is composition-local (the default, so the
     * host offset is added) or a legacy root-global timestamp (already absolute,
     * so adding the host offset double-counts it). Anything that derives a media
     * start from attributes — the clip manifest, the visibility pass, the media
     * cache, WebAudio scheduling — must come through here, or the timeline the
     * editor draws stops matching the timeline that plays.
     */
    const mediaStartInput = (element) => {
        const compositionRoot = element.closest("[data-composition-id]");
        return {
            authoredStart: parseStrictFiniteTimingNumber(element.getAttribute("data-start")),
            hostStart: compositionRoot ? resolveCompositionOrigin(compositionRoot, 0) : 0,
            hasAutoStart: element.hasAttribute("data-hf-auto-start"),
            basis: element.getAttribute(MEDIA_START_BASIS_ATTR),
        };
    };
    const resolveMediaStartForElement = (element) => {
        const input = mediaStartInput(element);
        return resolveMediaStartSeconds({
            ...input,
            ordinaryStart: () => resolveStartForElementInternal(element, input.hostStart),
        });
    };
    // Hosts with an in-point, found by their composition attributes so an anonymous one counts too.
    const resolveHostSlotsForElement = (element) => {
        const slots = [];
        for (let node = element.parentElement; node; node = node.parentElement) {
            if (!isCompositionHost(node) || inheritedTimingHost(node))
                continue;
            if (hostInPointSeconds(node) <= 0)
                continue;
            const start = resolveStartForElementInternal(node, 0);
            const duration = resolveAuthoredDuration(node);
            slots.push({ start, end: duration ? start + duration : Infinity });
        }
        return slots;
    };
    const isRootGlobalMediaStartForElement = (element) => isMediaElement(element) && isRootGlobalMediaStart(mediaStartInput(element));
    return {
        resolveStartForElement: (element, fallback = 0) => resolveStartForElementInternal(element, Math.max(0, fallback)),
        resolveDurationForElement: (element) => resolveDurationForElement(element),
        resolveMediaStartForElement,
        resolveHostStartForElement: (element) => resolveHostOffsetForElement(element, 0),
        resolveHostSlotsForElement,
        isRootGlobalMediaStartForElement,
    };
}

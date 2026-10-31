import { swallow } from "./diagnostics.js";
const pausedChildEnd = (child) => child.paused?.() === true
    ? (child.startTime?.() ?? 0) +
        (child.totalDuration?.() ?? 0) / Math.abs(child.timeScale?.() || 1)
    : 0;
/** A timeline's finite length, counting paused child timelines; a partial or throwing entry reads as null. */
export function readTimelineDurationSeconds(timeline) {
    try {
        if (typeof timeline?.duration !== "function")
            return null;
        const held = timeline.getChildren?.(false, false, true);
        const children = Array.isArray(held) ? held : [];
        const seconds = Math.max(Number(timeline.duration()), ...children.map(pausedChildEnd));
        return Number.isFinite(seconds) ? seconds : null;
    }
    catch (err) {
        swallow("runtime.timelineDuration", err);
        return null;
    }
}

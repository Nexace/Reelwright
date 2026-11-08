import { sameInstant } from "../clipFacts.js";
import { exportClipWindow } from "../inline-scripts/parityContract.js";
export const hasClipStarted = (time, start) => time >= start || sameInstant(time, start);
/** Half-open: two back-to-back clips never both hold the shared boundary instant, float sums included. */
export const isInClipWindow = (time, start, end) => hasClipStarted(time, start) && time < end && !sameInstant(time, end);
const TERMINAL_EPSILON_SECONDS = 1e-6;
/**
 * Visibility window: half-open, except a clip that runs to the composition's end also owns
 * the terminal instant, so a finished film rests on its last frame instead of going blank.
 */
export const isClipVisibleAt = (time, start, end, compositionDuration) => isInClipWindow(time, start, end) ||
    (hasClipStarted(time, start) &&
        compositionDuration > 0 &&
        end >= compositionDuration - TERMINAL_EPSILON_SECONDS);
/** The one on-screen rule render, snapshot and preview share: edges a hair off a frame count as on it. */
export const isClipOnScreenAt = (time, start, end, fps, compositionDuration) => {
    const snapped = exportClipWindow(start, end, fps);
    return isClipVisibleAt(time, snapped.start, snapped.end, compositionDuration);
};

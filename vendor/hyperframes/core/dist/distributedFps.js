/** Integer rates the distributed renderer (Lambda, Cloud Run) accepts; fractional fps renders in-process only. */
export const DISTRIBUTED_FPS = [24, 25, 30, 60];
export function isDistributedFps(value) {
    return DISTRIBUTED_FPS.includes(value);
}

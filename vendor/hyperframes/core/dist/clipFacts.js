/** Plain-field clip facts shared by the Ask-agent prompt, `studio_look` and `hyperframes timeline`. */
export const byStart = (a, b) => a.start - b.start || a.trackIndex - b.trackIndex;
const roundTo3 = (n) => Math.round(n * 1000) / 1000;
const num = (n) => String(roundTo3(n));
export { instantTolerance, isInsideSpan, sameInstant, spansOverlap, spansShareTime, } from "@hyperframes/parsers/time-spans";
export function formatClipLine(clip) {
    const parts = [
        `${clip.kind} "${clip.id}"`,
        clip.src && `src=${clip.src}`,
        `start=${num(clip.start)}`,
        `duration=${num(clip.duration)}`,
        `end=${num(clip.end)}`,
        `track=${clip.trackIndex}`,
        clip.volume !== null && `volume=${num(clip.volume)}`,
        clip.playbackRate !== null && `rate=${num(clip.playbackRate)}`,
        clip.audioGroup && `group=${clip.audioGroup}`,
        clip.role && `role=${clip.role}`,
        clip.sourceFile && `file=${clip.sourceFile}`,
        ...clip.lanes.map((lane) => `${lane.target}-lane=[${lane.points.map((p) => `${num(p.t)}:${num(p.v)}`).join(", ")}]`),
    ];
    return `- ${parts.filter(Boolean).join(" ")}`;
}

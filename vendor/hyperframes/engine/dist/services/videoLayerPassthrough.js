const EDGE_EPSILON_SECONDS = 1e-3;
/** One video that alone fills the whole timeline at normal speed, ungraded; layout is checked in the page. */
export function qualifyVideoLayer(videos, compositionDuration) {
    if (videos.length !== 1)
        return { qualifies: false, reason: "video_count" };
    const video = videos[0];
    if (!video)
        return { qualifies: false, reason: "video_count" };
    if (video.hidden)
        return { qualifies: false, reason: "hidden" };
    if (video.graded)
        return { qualifies: false, reason: "color_grading" };
    if (video.loop)
        return { qualifies: false, reason: "loop" };
    if (video.playbackRate !== undefined && video.playbackRate !== 1) {
        return { qualifies: false, reason: "playback_rate" };
    }
    if (video.start > EDGE_EPSILON_SECONDS)
        return { qualifies: false, reason: "late_start" };
    if (video.end < compositionDuration - EDGE_EPSILON_SECONDS) {
        return { qualifies: false, reason: "ends_early" };
    }
    return { qualifies: true, video };
}

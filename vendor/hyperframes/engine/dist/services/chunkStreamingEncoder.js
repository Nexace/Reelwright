import { fpsToFfmpegArg } from "@hyperframes/core";
import { appendRenderProvenanceArgs } from "../utils/renderProvenance.js";
import { spawnFfmpegStream } from "./streamingEncoder.js";
export const BT709_LIMITED = {
    primaries: 1,
    transfer: 1,
    matrix: 1,
    fullRange: false,
};
export function buildChunkStreamingArgs(options, outputPath) {
    const { primaries, transfer, matrix, fullRange } = options.colour ?? BT709_LIMITED;
    const vui = [
        `colour_primaries=${primaries}`,
        `transfer_characteristics=${transfer}`,
        `matrix_coefficients=${matrix}`,
        `video_full_range_flag=${fullRange ? 1 : 0}`,
    ].join(":");
    const args = ["-f", "h264", "-framerate", fpsToFfmpegArg(options.fps), "-i", "-"];
    args.push("-c:v", "copy", "-bsf:v", `h264_metadata=${vui}`);
    args.push(...["-colorspace:v", "bt709", "-color_primaries:v", "bt709", "-color_trc:v", "bt709"], ...["-color_range", fullRange ? "pc" : "tv"], ...["-video_track_timescale", "90000", "-avoid_negative_ts", "make_zero"]);
    appendRenderProvenanceArgs(args, outputPath);
    args.push("-y", outputPath);
    return args;
}
export function spawnChunkStreamingEncoder(outputPath, options, signal, config) {
    return spawnFfmpegStream(outputPath, buildChunkStreamingArgs(options, outputPath), {
        signal,
        config,
    });
}

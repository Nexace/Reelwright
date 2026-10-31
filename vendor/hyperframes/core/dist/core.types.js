// ── Shared cross-package types ──────────────────────────────────────────────
export { toFps, fpsToNumber, fpsToFfmpegArg, parseFps, parseFpsWithDefault } from "./fps.js";
export { CANVAS_DIMENSIONS, VALID_CANVAS_RESOLUTIONS, normalizeResolutionFlag, isAspectAgnosticResolutionAlias, resolveResolutionFlagPair, checkOutputResolutionCompatibility, outputResolutionForSize, suggestMatchingPreset, COMPOSITION_VARIABLE_TYPES, TIMELINE_COLORS, DEFAULT_DURATIONS, getDefaultStageZoom, isTextElement, isMediaElement, isCompositionElement, } from "@hyperframes/parsers";

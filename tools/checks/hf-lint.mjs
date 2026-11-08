// tools/checks/hf-lint.mjs — shared helper for the hf-lint (gate) and hf-lint-warn (warn) QA plug-ins; not a check itself
// (tools/qa_page.mjs only loads *.page.mjs). Runs the vendored @hyperframes/lint over a hyperframes film's hf/ folder once
// per process (both checks share the result): static, no browser, no network. Rules that contradict how Reelwright films
// work are skipped (SKIP); a few errors are kept as warnings (DOWNGRADE). Rationale per rule: docs/playbook/qa-lint.md.
import fs from "node:fs";
import path from "node:path";
import { lintProject } from "../../vendor/hyperframes/lint/dist/index.js";   // relative: a bare import would resolve elsewhere

// Rules whose premise is HyperFrames' own model, not Reelwright's: the film page is built by film.js at runtime and
// render(t) is the only clock (KIT.start registers window.__timelines.main, KIT.gsap registers its timeline, the mp4's
// audio is mixed by ffmpeg, never taken from the page). Every other rule runs.
export const SKIP = {
  // the timeline is registered, and its duration set, at runtime by KIT.start — static lint can't see that
  missing_timeline_registry: "KIT.start registers window.__timelines.main at runtime",
  root_composition_missing_duration_source: "the duration comes from KIT.start({ dur }), not data-duration",
  root_composition_duration_derived: "no data-duration on purpose: the duration is KIT.start's dur",
  missing_data_no_timeline: "the root timeline is registered by KIT.start, so no data-no-timeline is needed",
  gsap_timeline_not_registered: "KIT.gsap registers the timeline it builds",
  gsap_timeline_registered_before_async_build: "KIT.gsap builds after fonts load and registers once, itself",
  // HyperFrames' declarative clip model: elements timed by data-start / data-duration / data-track-index / class="clip"
  timed_element_missing_clip_class: "Reelwright elements are shown by render(t), not by clip classes",
  timeline_element_missing_timing: "no data-duration clips: render(t) decides what is visible",
  clip_ends_past_root_duration: "no data-start / data-duration clips",
  nested_clip_never_visible: "no data-start / data-duration clips",
  nested_structure_needs_subcomposition: "the timeline-row model is not used",
  timeline_track_too_dense: "no timeline tracks",
  caption_track_kind_missing: "captions are rendered by the engine (KIT.subs), not as timeline tracks",
  multiple_caption_tracks: "captions are rendered by the engine (KIT.subs), not as timeline tracks",
  gsap_animates_clip_element: "no clip elements; render(t) and GSAP legitimately move the same elements",
  media_missing_data_start: "KIT.video seeks a plain <video> from render(t); it has no data-start",
  media_missing_id: "only about data-start media, which Reelwright does not use",
  nested_media_start_basis_ambiguous: "only about data-start media",
  video_nested_in_timed_element: "only about data-start media",
  video_missing_muted: "only about data-start media; the page's sound is never recorded",
  video_muted_with_declared_audio: "data-has-audio is HyperFrames' audio model; Reelwright mixes audio with ffmpeg",
  linked_clip_orphan: "data-link clips are a HyperFrames editing feature",
  linked_clips_out_of_sync: "data-link clips are a HyperFrames editing feature",
  // media the film drives by hand — render(t) is the only thing that plays, seeks or swaps a source
  imperative_media_control: "KIT.video sets currentTime from render(t) on purpose",
  media_runtime_src_mutation: "KIT.img swaps img.src from render(t) on purpose",
  // audio: the mp4's sound is the ffmpeg mix of the voiceover and music, not elements in the page
  audio_file_without_element: "vo/ and music/ files are mixed by ffmpeg, not played by the page",
  duplicate_audio_track: "page audio is not part of the mix",
  audio_volume_tween_overrides_gain: "HyperFrames audio lanes are not used",
  audio_volume_double_automation: "HyperFrames audio lanes are not used",
  speed_ramp_on_non_media: "HyperFrames speed-ramp lanes are not used",
  audio_carve_ungrouped_sources: "HyperFrames audio groups are not used",
  audio_group_no_members: "HyperFrames audio groups are not used",
  audio_group_timing_attrs: "HyperFrames audio groups are not used",
  audio_group_holds_elements: "HyperFrames audio groups are not used",
  audio_group_carve_attr: "HyperFrames audio groups are not used",
  audio_reactive_single_tween_per_group: "HyperFrames audio-reactive captions are not used",
  // Studio (HyperFrames' editor) and its CLI inspection tools — Reelwright has its own preview
  studio_missing_editable_id: "HyperFrames Studio editing; Reelwright's preview is `video.sh preview`",
  root_path_missing_in_preview: "HyperFrames Studio's preview server; Reelwright serves its own",
  composition_exceeds_inspection_viewport_cap: "limits of HyperFrames' own check/snapshot tools",
  caption_transcript_not_inline: "HyperFrames Studio's caption editor needs it; Reelwright reads vo/ and timeline.json",
  // sizes and counts as editing advice, not defects
  composition_file_too_large: "advice to split into sub-compositions; hf/index.html is a stage and film.js holds the film",
  composition_heavy_overlay_count_high: "performance advice for HyperFrames' parallel render workers",
  // can't fire locally
  system_font_will_alias: "only reports for distributed (Lambda) renders, which Reelwright does not do",
  hevc_preview_codec: "informational: HyperFrames Studio preview codec support",
};

// Errors upstream that are kept as warnings: unsure they apply to a Reelwright film, so they inform but never fail qa.
export const DOWNGRADE = {
  gsap_non_transform_motion: "animating left/top/width is a smoothness tip; it renders fine and some themes position that way",
  media_crossorigin_breaks_preview: "the page itself renders; only an off-origin preview shows it blank",
  deprecated_data_layer: "a deprecated HyperFrames attribute Reelwright never reads, so it does nothing here",
  deprecated_data_end: "a deprecated HyperFrames attribute Reelwright never reads, so it does nothing here",
};

const cache = new Map();   // hf dir → findings (both plug-ins call in the same process)
const oneLine = (s) => String(s || "").replace(/\s+/g, " ").trim();
const clip = (s, n = 200) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// → { gate: string[], warn: string[], ms }. Lines are `<code>: <message> (fix: <hint>)`, ≤ 200 chars. Honours
// project.json "qa": {"hf-lint": false} (both plug-ins) and {"hf-lint-skip": ["code", …]} (single rules).
export async function hfLint(DIR, P) {
  const none = { gate: [], warn: [], ms: 0 };
  if (!P || P.renderer !== "hyperframes" || (P.qa && P.qa["hf-lint"] === false)) return none;
  const hf = path.join(DIR, "hf");
  if (!fs.existsSync(path.join(hf, "index.html"))) return none;
  if (!cache.has(hf)) {
    const t0 = performance.now();
    const r = await lintProject(hf);
    cache.set(hf, { f: r.results.flatMap((x) => x.result.findings), ms: performance.now() - t0 });
  }
  const { f, ms } = cache.get(hf);
  const mine = new Set([...Object.keys(SKIP), ...((P.qa && P.qa["hf-lint-skip"]) || [])]);
  const out = { gate: [], warn: [], ms };
  const seen = new Set();
  for (const x of f) {
    if (mine.has(x.code)) continue;
    const line = clip(oneLine(`${x.code}: ${x.message}`) + (x.fixHint ? ` (fix: ${oneLine(x.fixHint)})` : ""));
    if (seen.has(line)) continue;
    seen.add(line);
    (x.severity === "error" && !DOWNGRADE[x.code] ? out.gate : out.warn).push(line);
  }
  return out;
}

export function hfLintFailed(e) { return [`hf-lint failed: ${oneLine(e && e.message || e).slice(0, 180)}`]; }

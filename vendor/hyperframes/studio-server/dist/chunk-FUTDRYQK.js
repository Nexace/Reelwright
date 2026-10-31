import {
  probeMediaMetadata
} from "./chunk-X73QTST2.js";
import {
  realpath
} from "./chunk-QF7MFJJU.js";

// src/helpers/mediaCodecMap.ts
import { scanHtmlOpeningTags, decodeAuthoredAttribute } from "@hyperframes/parsers";
import { statSync } from "fs";
import { sep } from "path";
import { findFfBinary } from "@hyperframes/parsers/ff-binaries";

// src/helpers/hdrFilters.ts
import { spawn } from "child_process";
var checks = /* @__PURE__ */ new Map();
function ffmpegHasHdrFilters(ffmpegPath) {
  const known = checks.get(ffmpegPath);
  if (known) return known;
  const check = new Promise((resolveCheck) => {
    const proc = spawn(ffmpegPath, ["-hide_banner", "-filters"], {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });
    let stdout = "";
    proc.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    proc.on("error", () => resolveCheck(false));
    proc.on(
      "close",
      (code) => resolveCheck(code === 0 && /\bzscale\b/.test(stdout) && /\btonemap\b/.test(stdout))
    );
  });
  checks.set(ffmpegPath, check);
  return check;
}

// src/helpers/mediaCodecMap.ts
import { rewriteAssetPath } from "@hyperframes/parsers/asset-paths";
import {
  cleanAssetUrl,
  isRemoteOrInlineUrl,
  isUnresolvedAssetPlaceholder,
  resolveExistingLocalAsset as resolveAsset
} from "@hyperframes/parsers/asset-resolution";
import {
  isHeavyForPreview
} from "@hyperframes/core";
var BROWSER_HOSTILE_CODECS = {
  // HEVC decode is platform-bound, not absent: macOS Chrome answers
  // canPlayType with "probably" and keeps the source, while Chrome on
  // Windows/Linux and Firefox everywhere need the substitute.
  hevc: { representativeMime: 'video/mp4; codecs="hvc1.1.6.L120.B0"', prewarm: true },
  prores: { representativeMime: null, prewarm: true },
  theora: { representativeMime: 'video/ogg; codecs="theora"', prewarm: true },
  // Every mainstream engine decodes AV1 and VP9, so canPlayType keeps the
  // original and only the rare browser that cannot pays for a transcode.
  av1: { representativeMime: 'video/mp4; codecs="av01.0.08M.08"', prewarm: false },
  vp9: { representativeMime: 'video/webm; codecs="vp09.00.10.08"', prewarm: false }
};
function hostileCodecEntry(codecName) {
  return Object.hasOwn(BROWSER_HOSTILE_CODECS, codecName) ? BROWSER_HOSTILE_CODECS[codecName] : void 0;
}
function shouldPrewarmProxy(facts) {
  return hostileCodecEntry(facts.codecName)?.prewarm === true;
}
var proxyDemand = { prewarmsRequested: 0, proxyRequests: 0 };
function mediaProxyDemand() {
  return { ...proxyDemand };
}
function writeDemandLine(event) {
  try {
    process.stderr.write(
      `[hyperframes:media-proxy] ${JSON.stringify({ event, ...proxyDemand })}
`
    );
  } catch {
  }
}
function isMediaProxyDebugEnabled() {
  const value = process.env.HYPERFRAMES_DEBUG_MEDIA_PROXY;
  return value === "1" || value === "true";
}
var summaryHookInstalled = false;
function recordProxyPrewarm() {
  proxyDemand.prewarmsRequested++;
  if (!summaryHookInstalled) {
    summaryHookInstalled = true;
    process.once("exit", () => writeDemandLine("summary"));
  }
  if (isMediaProxyDebugEnabled()) writeDemandLine("prewarm_requested");
}
function recordProxyRequest() {
  proxyDemand.proxyRequests++;
}
var PROXY_VARIANT_CONFIG = {
  h264: { extension: ".mp4", contentType: "video/mp4" },
  vp8: { extension: ".webm", contentType: "video/webm" }
};
function isProxyVariant(value) {
  return Object.hasOwn(PROXY_VARIANT_CONFIG, value);
}
function isProxyVariantRequest(value) {
  return value === "auto" || isProxyVariant(value);
}
function proxyVariantFor(facts) {
  return facts.hasAlpha ? "vp8" : "h264";
}
function resolveProxyVariantRequest(request, facts) {
  const expected = proxyVariantFor(facts);
  return request === "auto" || request === expected ? expected : null;
}
function decideMediaProxyEligibility(facts, lightBox) {
  if (!facts) return { eligible: false, reason: "unknown_codec" };
  if (facts.browserHostile) return { eligible: true };
  if (lightBox && facts.source && isHeavyForPreview(facts.source, lightBox)) {
    return { eligible: true };
  }
  return { eligible: false, reason: "browser_safe_codec" };
}
function codecFactsFor(codecName, hasAlpha, source, toneMapsToSdr = false) {
  const hostile = hostileCodecEntry(codecName);
  return {
    codecName,
    browserHostile: hostile !== void 0 || toneMapsToSdr,
    // An HDR clip is never 'playable' for preview, whatever its codec: it takes the SDR copy the export uses.
    representativeMime: toneMapsToSdr ? null : hostile?.representativeMime ?? null,
    hasAlpha,
    ...source && { source }
  };
}
async function probeCodecFacts(filePath, runner) {
  const metadata = runner ? await probeMediaMetadata(filePath, runner) : await probeMediaMetadata(filePath);
  if (metadata.probeError) return void 0;
  if (metadata.kind !== "video") return null;
  const codecName = metadata.color.codecName;
  if (!codecName) return null;
  const hasAlpha = metadata.hasAlpha === true;
  const toneMaps = !hasAlpha && await toneMapsHdr(metadata.color.hdrTransfer);
  return codecFactsFor(codecName, hasAlpha, metadata.source, toneMaps);
}
var warnedNoHdrFilters = false;
async function toneMapsHdr(hdrTransfer) {
  if (hdrTransfer !== "pq" && hdrTransfer !== "hlg") return false;
  const ffmpegPath = findFfBinary("ffmpeg");
  if (ffmpegPath && await ffmpegHasHdrFilters(ffmpegPath)) return true;
  if (!warnedNoHdrFilters) {
    warnedNoHdrFilters = true;
    console.warn(
      `[hyperframes] A video in this project is HDR, but this ffmpeg has no zscale/tonemap (libzimg), so the preview plays it as the browser shows it and will not match an SDR export. Install an ffmpeg with libzimg.`
    );
  }
  return false;
}
function createMediaCodecProbeCache() {
  return /* @__PURE__ */ new Map();
}
var defaultProbeCache = /* @__PURE__ */ new Map();
var MAX_PROBE_CACHE_ENTRIES = 512;
function rememberProbeResult(cache, filePath, result) {
  if (!cache.has(filePath) && cache.size >= MAX_PROBE_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.delete(filePath);
  cache.set(filePath, result);
}
async function probeAssetCodec(filePath, runner, cache = defaultProbeCache) {
  let stat;
  let target;
  try {
    stat = statSync(filePath);
    target = realpath(filePath);
  } catch {
    return null;
  }
  const cached = cache.get(filePath);
  if (cached && cached.target === target && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    rememberProbeResult(cache, filePath, cached);
    return cached.facts;
  }
  const facts = await probeCodecFacts(filePath, runner);
  if (facts === void 0) return null;
  rememberProbeResult(cache, filePath, { target, mtimeMs: stat.mtimeMs, size: stat.size, facts });
  return facts;
}
function resolveExistingLocalAsset(projectDir, url) {
  const asset = resolveAsset(projectDir, url);
  if (!asset) return null;
  return {
    resolvedPath: asset.resolved,
    rootRelativePathname: `/${asset.rootRelativePath.split(sep).join("/")}`
  };
}
function collectLocalVideoAssets(projectDir, htmlSources) {
  const candidates = /* @__PURE__ */ new Map();
  for (const { html, compSrcPath } of htmlSources) {
    for (const tag of scanHtmlOpeningTags(html)) {
      if (tag.name !== "video" || !tag.closed) continue;
      const attribute = tag.attributes.find((attr) => attr.name === "src");
      if (attribute?.kind !== "value") continue;
      const rawSrc = decodeAuthoredAttribute(attribute.value);
      if (isUnresolvedAssetPlaceholder(rawSrc)) continue;
      const src = cleanAssetUrl(rawSrc);
      if (!src || isRemoteOrInlineUrl(src)) continue;
      const rootRelativeSrc = compSrcPath ? rewriteAssetPath(compSrcPath, src) : src;
      const resolved = resolveExistingLocalAsset(projectDir, rootRelativeSrc);
      if (!resolved) continue;
      candidates.set(resolved.resolvedPath, resolved.rootRelativePathname);
    }
  }
  return candidates;
}
var PROBE_CONCURRENCY = 8;
async function probeProjectAssets(projectDir, htmlSources, options) {
  const candidates = collectLocalVideoAssets(projectDir, htmlSources);
  const cache = options.cache ?? defaultProbeCache;
  const entries = [...candidates.entries()];
  const facts = new Array(entries.length).fill(null);
  let nextIndex = 0;
  const workerCount = Math.min(PROBE_CONCURRENCY, entries.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < entries.length) {
        const index = nextIndex++;
        const entry = entries[index];
        if (!entry) break;
        facts[index] = await probeAssetCodec(entry[0], options.runner, cache);
      }
    })
  );
  return entries.map(([, pathname], index) => [pathname, facts[index] ?? null]);
}
async function scanProjectMedia(projectDir, htmlSources, options = {}) {
  const scan = { codecMap: {}, sourceFacts: {} };
  for (const [pathname, facts] of await probeProjectAssets(projectDir, htmlSources, options)) {
    if (facts?.browserHostile) scan.codecMap[pathname] = facts;
    if (facts?.source) scan.sourceFacts[pathname] = { ...facts.source, codec: facts.codecName };
  }
  return scan;
}
async function scanProjectMediaCodecMap(projectDir, htmlSources, options = {}) {
  return (await scanProjectMedia(projectDir, htmlSources, options)).codecMap;
}

export {
  ffmpegHasHdrFilters,
  BROWSER_HOSTILE_CODECS,
  shouldPrewarmProxy,
  mediaProxyDemand,
  recordProxyPrewarm,
  recordProxyRequest,
  PROXY_VARIANT_CONFIG,
  isProxyVariant,
  isProxyVariantRequest,
  proxyVariantFor,
  resolveProxyVariantRequest,
  decideMediaProxyEligibility,
  createMediaCodecProbeCache,
  probeAssetCodec,
  scanProjectMedia,
  scanProjectMediaCodecMap
};

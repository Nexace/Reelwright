// src/services/distributed/plan.ts
import { audioFailureDiagnostics as audioFailureDiagnostics3 } from "@hyperframes/engine";
import {
  copyFileSync as copyFileSync6,
  cpSync as cpSync2,
  existsSync as existsSync15,
  linkSync,
  mkdirSync as mkdirSync10,
  rmSync as rmSync7,
  writeFileSync as writeFileSync7
} from "node:fs";
import { extname as extname4, isAbsolute as isAbsolute3, join as join22, relative as relative5, sep as sep2 } from "node:path";
import {
  fpsToNumber as fpsToNumber9,
  HF_COLOR_GRADING_ATTR as HF_COLOR_GRADING_ATTR2
} from "@hyperframes/core";
import {
  getEncoderPreset as getEncoderPreset4,
  keyframeIntervalToGopSize as keyframeIntervalToGopSize3,
  normalizeVp9CpuUsed,
  resolveConfig as resolveConfig3,
  declareContentAddressedUrl,
  renameWithRetry as renameWithRetry7,
  declareProbeFactsUrl
} from "@hyperframes/engine";

// src/logger.ts
var LOG_LEVEL_PRIORITY = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};
function createConsoleLogger(level = "info") {
  const threshold = LOG_LEVEL_PRIORITY[level];
  const shouldLog = (msgLevel) => LOG_LEVEL_PRIORITY[msgLevel] <= threshold;
  const formatMeta = (meta) => meta ? ` ${JSON.stringify(meta)}` : "";
  return {
    error(message, meta) {
      if (shouldLog("error")) {
        console.error(`[ERROR] ${message}${formatMeta(meta)}`);
      }
    },
    warn(message, meta) {
      if (shouldLog("warn")) {
        console.warn(`[WARN] ${message}${formatMeta(meta)}`);
      }
    },
    info(message, meta) {
      if (shouldLog("info")) {
        console.error(`[INFO] ${message}${formatMeta(meta)}`);
      }
    },
    debug(message, meta) {
      if (shouldLog("debug")) {
        console.error(`[DEBUG] ${message}${formatMeta(meta)}`);
      }
    },
    isLevelEnabled(msgLevel) {
      return shouldLog(msgLevel);
    }
  };
}
var defaultLogger = createConsoleLogger("info");

// src/services/renderOrchestrator.ts
import { audioFailureDiagnostics as audioFailureDiagnostics2 } from "@hyperframes/engine";
import {
  existsSync as existsSync10,
  mkdirSync as mkdirSync6,
  readFileSync as readFileSync6,
  readdirSync as readdirSync3,
  rmSync as rmSync5,
  statSync as statSync5,
  writeFileSync as writeFileSync4,
  copyFileSync as copyFileSync5,
  appendFileSync
} from "fs";
import {
  chainCapture,
  fpsToNumber as fpsToNumber8,
  HF_COLOR_GRADING_ATTR,
  HF_VFX_ATTR,
  parseVfxChain,
  redactTelemetryString as redactTelemetryString4,
  toFps as toFps2
} from "@hyperframes/core";
import { HF_AUDIO_GROUP_TAG } from "@hyperframes/core/audio-groups";
import { extractStandaloneEntryFromIndex, isTemplateEntry } from "@hyperframes/core/compiler";
import { HTML_BODY_CSS_HEIGHT_FIRST_RE, HTML_BODY_CSS_WIDTH_FIRST_RE } from "@hyperframes/parsers";
import {
  extractMediaMetadata as extractMediaMetadata4,
  resolveConfig as resolveConfig2,
  closeCaptureSession as closeCaptureSession8,
  createCaptureSession as createCaptureSession8,
  initializeSession as initializeSession8,
  createVideoFrameInjector,
  getEncoderPreset as getEncoderPreset3,
  distributeFrames as distributeFrames2,
  distributeFramesInterleaved as distributeFramesInterleaved2,
  executeParallelCapture as executeParallelCapture2,
  mergeWorkerFrames,
  getSystemTotalMb,
  LOW_MEMORY_TOTAL_MB_THRESHOLD,
  assertConfiguredFfmpegBinariesExist,
  resolveBrowserGpuMode,
  resolveHeadlessShellPath,
  compositionRequiresWebGpu as compositionRequiresWebGpu2,
  applyConcreteGpuScreenshotClamp,
  explainDrawElementDisabled,
  chromeMajorCeiling,
  scaleProtocolTimeoutForComposition,
  classifyCaptureFailure as classifyCaptureFailure3,
  cloneCaptureWarning,
  isMemoryExhaustionError,
  isTransientBrowserError as isTransientBrowserError2,
  isDrawElementVerificationError,
  isDrawElementCaptureError,
  getDrawElementVerificationDetails,
  augmentProtocolTimeoutError,
  augmentPageNavigationTimeoutError
} from "@hyperframes/engine";
import { join as join14, dirname as dirname8, resolve as resolve7 } from "path";
import { randomUUID } from "crypto";

// src/services/fileServer.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { settleOnBrowserSafePort } from "@hyperframes/engine";
import {
  existsSync as existsSync2,
  realpathSync,
  statSync,
  createReadStream,
  openSync,
  fstatSync,
  closeSync,
  constants,
  readFile
} from "node:fs";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import { join, extname, resolve as resolve2, sep } from "node:path";
import { injectScriptsAtHeadStart, injectScriptsIntoHtml } from "@hyperframes/core/compiler";
import { fpsToNumber } from "@hyperframes/core";
import { stripSdrPngColourTags } from "@hyperframes/core/compiler/png-colour-tags";

// src/services/hyperframeRuntimeLoader.ts
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
var PRODUCER_DIR = dirname(fileURLToPath(import.meta.url));
var SIBLING_MANIFEST_PATH = resolve(PRODUCER_DIR, "hyperframe.manifest.json");
var MODULE_RELATIVE_MANIFEST_PATH = resolve(
  PRODUCER_DIR,
  "../../../core/dist/hyperframe.manifest.json"
);
var MANIFEST_CANDIDATES = [
  SIBLING_MANIFEST_PATH,
  resolve(process.cwd(), "packages/core/dist/hyperframe.manifest.json"),
  resolve(process.cwd(), "../core/dist/hyperframe.manifest.json"),
  resolve(process.cwd(), "core/dist/hyperframe.manifest.json"),
  MODULE_RELATIVE_MANIFEST_PATH
];
function resolveHyperframeManifestPath() {
  const envOverride = process.env.PRODUCER_HYPERFRAME_MANIFEST_PATH;
  if (envOverride) {
    return envOverride;
  }
  const found = MANIFEST_CANDIDATES.find((candidate) => existsSync(candidate));
  return found ?? MODULE_RELATIVE_MANIFEST_PATH;
}
function triedManifestPaths() {
  return process.env.PRODUCER_HYPERFRAME_MANIFEST_PATH ? [process.env.PRODUCER_HYPERFRAME_MANIFEST_PATH] : MANIFEST_CANDIDATES;
}
function getVerifiedHyperframeRuntimeSource() {
  return resolveVerifiedHyperframeRuntime().runtimeSource;
}
function resolveVerifiedHyperframeRuntime() {
  const manifestPath = resolveHyperframeManifestPath();
  if (!existsSync(manifestPath)) {
    const tried = triedManifestPaths().join(", ");
    throw new Error(
      `[HyperframeRuntimeLoader] Missing manifest. Tried: ${tried}. Searched from cwd=${process.cwd()}. Build core runtime artifacts before rendering.`
    );
  }
  const manifestRaw = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  const runtimeFileName = manifest.artifacts?.iife;
  if (!runtimeFileName || !manifest.sha256) {
    throw new Error(
      `[HyperframeRuntimeLoader] Invalid manifest at ${manifestPath}; missing iife artifact or sha256.`
    );
  }
  const runtimePath = resolve(dirname(manifestPath), runtimeFileName);
  if (!existsSync(runtimePath)) {
    throw new Error(`[HyperframeRuntimeLoader] Missing runtime artifact at ${runtimePath}.`);
  }
  const runtimeSource = readFileSync(runtimePath, "utf8");
  const runtimeSha = createHash("sha256").update(runtimeSource, "utf8").digest("hex");
  if (runtimeSha !== manifest.sha256) {
    throw new Error(
      `[HyperframeRuntimeLoader] Runtime checksum mismatch. expected=${manifest.sha256} actual=${runtimeSha}`
    );
  }
  return {
    manifestPath,
    runtimePath,
    expectedSha256: manifest.sha256,
    actualSha256: runtimeSha,
    runtimeSource
  };
}

// src/generated/hf-early-stub-inline.ts
var HF_EARLY_STUB_IIFE = '"use strict";(()=>{var x=100,b=[],s=[],c=!1,w=!1,h=new Set;function _(n){let o=window.__HF_VIRTUAL_TIME__?.originalRequestAnimationFrame;return typeof o=="function"?o(n):requestAnimationFrame(n)}function O(n){let o=window.__HF_VIRTUAL_TIME__?.originalSetTimeout;if(typeof o=="function"){o(n,0);return}setTimeout(n,0)}function v(n){return n!==null&&typeof n=="object"&&"__hfIsProxy"in n?n.__hfReal:n}function m(n,o){n!=="add"&&A(o)}function p(n){if(n===null||typeof n!="object"||Array.isArray(n))return!1;let o=n;return"rotationX"in o||"rotationY"in o||"transformPerspective"in o}var d=new Set;function A(n){let o=n[0];if(o==null)return;let e=window;d.has(o)||(d.add(o),e.__hfAllTweenTargets=Array.from(d)),(p(n[1])||p(n[2]))&&(h.add(o),e.__hf3dTweenTargets=Array.from(h))}function y(n){let o=n.proxy.__hfReal,e=o[n.method];if(typeof e=="function"){let i=n.method==="add"?n.args.map(v):n.args;e.call(o,...i)}}function l(n,o,e){m(o,e);let i={proxy:n,method:o,args:e};return n.__hfQueue.push(i),s.push(i),R(),n}function g(n){let o=n.proxy.__hfQueue.indexOf(n);o>=0&&n.proxy.__hfQueue.splice(o,1)}function t(){for(;s.length>0;){let n=s.shift();n&&(g(n),y(n))}S()}function k(){w=!1,window.__hfTimelinesBuilding=!1;try{window.dispatchEvent(new CustomEvent("hf-timelines-built"))}catch{}}function S(){w||(w=!0,O(()=>{s.length===0?k():w=!1}))}function P(){c=!1;let n=s.splice(0,x);for(let o of n)g(o),y(o);s.length>0?(c=!0,_(P)):k()}function R(){c||(c=!0,window.__hfTimelinesBuilding=!0,_(P))}var I=new Set(["to","from","fromTo","set","add"]);function G(n,o){let e=o;for(;e!==null&&e!==Object.prototype;){for(let i of Object.getOwnPropertyNames(e)){if(i==="constructor"||i==="then"||i in n||I.has(i)||i.charAt(0)==="_")continue;let a=Object.getOwnPropertyDescriptor(e,i);if(!a||typeof a.value!="function")continue;let u=a.value;n[i]=function(...r){t();let f=u.call(o,...r);return f===o?n:f}}e=Object.getPrototypeOf(e)}}function B(n){let o={__hfReal:n,__hfQueue:[],__hfIsProxy:!0,to(...e){return l(o,"to",e)},from(...e){return l(o,"from",e)},fromTo(...e){return l(o,"fromTo",e)},set(...e){return l(o,"set",e)},add(...e){return l(o,"add",e)},pause(...e){return t(),n.pause(...e),o},play(...e){return t(),n.play(...e),o},seek(...e){return t(),n.seek(...e),o},totalTime(...e){return t(),e.length>0?(n.totalTime(...e),o):n.totalTime()},time(...e){return t(),e.length>0?(n.time(...e),o):n.time()},duration(...e){return t(),e.length>0?(n.duration(...e),o):n.duration()},getChildren(...e){t();let i=n.getChildren(...e);return Array.isArray(i)?i:[]},paused(...e){return t(),e.length>0?(n.paused(...e),o):n.paused()},timeScale(...e){return t(),e.length>0?(n.timeScale(...e),o):n.timeScale()},kill(){t(),n.kill()}};return G(o,n),b.push(o),o}if(typeof window<"u"){window.__hf||(window.__hf={}),window.__hfTimelinesBuilding=!1,window.__hfFlushSync=()=>{t(),s.length===0&&window.__hfTimelinesBuilding&&k()};let n=null,o=new WeakSet;try{Object.defineProperty(window,"gsap",{configurable:!0,enumerable:!0,get(){return n},set(e){if(n=e,!e||typeof e.timeline!="function"||o.has(e))return;o.add(e);let i=e.timeline.bind(e);e.timeline=u=>B(i(u));for(let u of["to","from","set"]){let r=e[u];if(typeof r!="function")continue;let f=r.bind(e);e[u]=(...T)=>(m(u,T),f(...T))}let a=e.fromTo;if(typeof a=="function"){let u=a.bind(e);e.fromTo=(...r)=>(m("fromTo",r),u(...r))}}})}catch{}}})();\n';
function getHfEarlyStub() {
  return HF_EARLY_STUB_IIFE;
}

// src/services/fileServer.ts
var readFileAsync = promisify(readFile);
function isPathInside(child3, parent, options = {}) {
  const { resolveSymlinks = false, pathModule } = options;
  const resolveFn = pathModule?.resolve ?? resolve2;
  const separator = pathModule?.sep ?? sep;
  const resolvedChild = resolveFn(child3);
  const resolvedParent = resolveFn(parent);
  const normalizedChild = resolveSymlinks && existsSync2(resolvedChild) ? realpathSync.native(resolvedChild) : resolvedChild;
  const normalizedParent = resolveSymlinks && existsSync2(resolvedParent) ? realpathSync.native(resolvedParent) : resolvedParent;
  if (normalizedChild === normalizedParent) return true;
  const parentWithSep = normalizedParent.endsWith(separator) ? normalizedParent : normalizedParent + separator;
  return normalizedChild.startsWith(parentWithSep);
}
var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".cube": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/vnd.microsoft.icon",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf"
};
function parseRangeHeader(header, size) {
  if (!header) return { kind: "absent" };
  const match = /^\s*bytes\s*=\s*(.*?)\s*$/i.exec(header);
  if (!match) return { kind: "absent" };
  const specList = match[1];
  if (!specList || specList.includes(",")) {
    return { kind: "absent" };
  }
  const dashIdx = specList.indexOf("-");
  if (dashIdx < 0) return { kind: "absent" };
  const rawStart = specList.slice(0, dashIdx).trim();
  const rawEnd = specList.slice(dashIdx + 1).trim();
  if (rawStart === "" && rawEnd !== "") {
    if (!/^\d+$/.test(rawEnd)) return { kind: "absent" };
    const suffixLen = Number(rawEnd);
    if (!Number.isFinite(suffixLen)) return { kind: "absent" };
    if (size === 0 || suffixLen === 0) return { kind: "unsatisfiable" };
    const start2 = Math.max(0, size - suffixLen);
    return { kind: "satisfiable", start: start2, end: size - 1 };
  }
  if (!/^\d+$/.test(rawStart)) return { kind: "absent" };
  const start = Number(rawStart);
  if (!Number.isFinite(start)) return { kind: "absent" };
  if (rawEnd === "") {
    if (start >= size) return { kind: "unsatisfiable" };
    return { kind: "satisfiable", start, end: size - 1 };
  }
  if (!/^\d+$/.test(rawEnd)) return { kind: "absent" };
  const requestedEnd = Number(rawEnd);
  if (!Number.isFinite(requestedEnd)) return { kind: "absent" };
  if (requestedEnd < start) return { kind: "unsatisfiable" };
  if (start >= size) return { kind: "unsatisfiable" };
  const end = Math.min(requestedEnd, size - 1);
  return { kind: "satisfiable", start, end };
}
function buildVirtualTimeShim(options) {
  const seedRandomFromFrame = options.seedRandomFromFrame === true;
  const seededRandomBlock = seedRandomFromFrame ? String.raw`
  // Seeded Math.random / crypto.getRandomValues, keyed by virtual time.
  // Mulberry32: single uint32 state, deterministic, fast.
  var rngState = 0;
  function mulberry32() {
    rngState |= 0; rngState = (rngState + 0x6D2B79F5) | 0;
    var t = rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function reseedRngFromTime(ms) {
    var ms32 = Math.max(0, Math.floor(Number(ms) || 0)) | 0;
    // Knuth's multiplicative hash + golden-ratio offset gives a well-
    // distributed seed even for frame 0 (otherwise rngState=0 degenerates
    // the PRNG's first few outputs).
    rngState = (Math.imul(ms32, -1640531527) + 0x9E3779B9) | 0;
  }
  reseedRngFromTime(0);
  try {
    Math.random = function() { return mulberry32(); };
  } catch (e) {}
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    try {
      var __seededGetRandomValues = function(arr) {
        if (!arr || typeof arr.byteLength !== "number" || !arr.buffer) return arr;
        var byteLen = arr.byteLength;
        if (byteLen <= 0) return arr;
        var view = new DataView(arr.buffer, arr.byteOffset, byteLen);
        var i = 0;
        for (; i + 4 <= byteLen; i += 4) {
          var word = ((mulberry32() * 4294967296) >>> 0);
          view.setUint32(i, word, true);
        }
        for (; i < byteLen; i++) {
          view.setUint8(i, (mulberry32() * 256) | 0);
        }
        return arr;
      };
      window.crypto.getRandomValues = __seededGetRandomValues;
    } catch (e) {}
  }
` : "";
  const seekToTimeReseedCall = seedRandomFromFrame ? "reseedRngFromTime(safeTimeMs);\n      " : "";
  return String.raw`(function() {
  if (window.__HF_VIRTUAL_TIME__) return;

  var virtualNowMs = 0;
  var rafId = 1;
  var rafQueue = [];
  var OriginalDate = Date;
  var originalSetTimeout = window.setTimeout.bind(window);
  var originalClearTimeout = window.clearTimeout.bind(window);
  var originalSetInterval = window.setInterval.bind(window);
  var originalClearInterval = window.clearInterval.bind(window);
  var originalRequestAnimationFrame = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : null;
  var originalCancelAnimationFrame = window.cancelAnimationFrame
    ? window.cancelAnimationFrame.bind(window)
    : null;
${seededRandomBlock}
  function flushAnimationFrame() {
    if (!rafQueue.length) return;
    var current = rafQueue.slice();
    rafQueue.length = 0;
    for (var i = 0; i < current.length; i++) {
      var entry = current[i];
      if (entry.cancelled) continue;
      try {
        entry.callback(virtualNowMs);
      } catch {}
    }
  }

  function VirtualDate() {
    var args = Array.prototype.slice.call(arguments);
    if (!(this instanceof VirtualDate)) {
      return OriginalDate.apply(null, args.length ? args : [virtualNowMs]);
    }
    var instance = args.length ? new (Function.prototype.bind.apply(OriginalDate, [null].concat(args)))() : new OriginalDate(virtualNowMs);
    Object.setPrototypeOf(instance, VirtualDate.prototype);
    return instance;
  }

  VirtualDate.prototype = OriginalDate.prototype;
  Object.setPrototypeOf(VirtualDate, OriginalDate);
  VirtualDate.now = function() { return virtualNowMs; };
  VirtualDate.parse = OriginalDate.parse.bind(OriginalDate);
  VirtualDate.UTC = OriginalDate.UTC.bind(OriginalDate);

  try {
    Object.defineProperty(window, "Date", {
      configurable: true,
      writable: true,
      value: VirtualDate,
    });
  } catch {}

  if (window.performance && typeof window.performance.now === "function") {
    try {
      Object.defineProperty(window.performance, "now", {
        configurable: true,
        value: function() { return virtualNowMs; },
      });
    } catch {}
  }

  window.requestAnimationFrame = function(callback) {
    if (typeof callback !== "function") return 0;
    var entry = { id: rafId++, callback: callback, cancelled: false };
    rafQueue.push(entry);
    return entry.id;
  };
  window.cancelAnimationFrame = function(id) {
    for (var i = 0; i < rafQueue.length; i++) {
      if (rafQueue[i].id === id) {
        rafQueue[i].cancelled = true;
      }
    }
  };

  window.__HF_VIRTUAL_TIME__ = {
    originalSetTimeout: originalSetTimeout,
    originalClearTimeout: originalClearTimeout,
    originalSetInterval: originalSetInterval,
    originalClearInterval: originalClearInterval,
    originalRequestAnimationFrame: originalRequestAnimationFrame,
    originalCancelAnimationFrame: originalCancelAnimationFrame,
    seekToTime: function(nextTimeMs) {
      var safeTimeMs = Math.max(0, Number(nextTimeMs) || 0);
      virtualNowMs = safeTimeMs;
      ${seekToTimeReseedCall}flushAnimationFrame();
      return virtualNowMs;
    },
    getTime: function() {
      return virtualNowMs;
    },
  };
})();`;
}
var VIRTUAL_TIME_SHIM = buildVirtualTimeShim({ seedRandomFromFrame: false });
var RENDER_SEEK_MODE = process.env.PRODUCER_RUNTIME_RENDER_SEEK_MODE === "strict-boundary" ? "strict-boundary" : "preview-phase";
var RENDER_SEEK_DIAGNOSTICS = process.env.PRODUCER_DEBUG_SEEK_DIAGNOSTICS === "true";
var RENDER_SEEK_STEP = Math.max(
  1 / 600,
  Number(process.env.PRODUCER_RENDER_SEEK_STEP || 1 / 120)
);
var RENDER_SEEK_OFFSET_FRACTION = Math.max(
  0,
  Math.min(0.95, Number(process.env.PRODUCER_RUNTIME_RENDER_SEEK_OFFSET_FRACTION || 0.5))
);
function resolveRenderFpsConfig(fps) {
  if (!fps) return { value: 30, source: "default", fallbackReason: "missing" };
  const value = fpsToNumber(fps);
  if (!Number.isFinite(value) || value <= 0) {
    return { value: 30, source: "default", fallbackReason: "invalid" };
  }
  return { value, source: "render-options" };
}
function buildRenderModeScript(fps) {
  const renderFps = resolveRenderFpsConfig(fps);
  return `(function() {
  var __realSetTimeout =
    window.__HF_VIRTUAL_TIME__ && typeof window.__HF_VIRTUAL_TIME__.originalSetTimeout === "function"
      ? window.__HF_VIRTUAL_TIME__.originalSetTimeout
      : window.setTimeout.bind(window);
  var __seekMode = ${JSON.stringify(RENDER_SEEK_MODE)};
  var __seekDiagnostics = ${RENDER_SEEK_DIAGNOSTICS ? "true" : "false"};
  var __seekStep = ${RENDER_SEEK_STEP};
  var __seekOffsetFraction = ${RENDER_SEEK_OFFSET_FRACTION};
  var __renderFps = ${renderFps.value};
  var __renderFpsSource = ${JSON.stringify(renderFps.source)};
  var __renderFpsFallbackReason = ${JSON.stringify(renderFps.fallbackReason ?? null)};
  window.__HF_EXPORT_RENDER_SEEK_CONFIG = {
    mode: __seekMode,
    diagnostics: __seekDiagnostics,
    step: __seekStep,
    offsetFraction: __seekOffsetFraction,
    fps: __renderFps,
    fpsSource: __renderFpsSource,
    fpsFallbackReason: __renderFpsFallbackReason || undefined,
    owner: "runtime",
  };
  function installMediaFallbackPlayer() {
    if (document.querySelector('[data-composition-id]')) return false;
    var mediaEls = Array.from(document.querySelectorAll('video, audio'));
    if (!mediaEls.length) return false;

    var isPlaying = false;
    var currentTime = 0;
    function fallbackDuration() {
      var maxDuration = 0;
      for (var i = 0; i < mediaEls.length; i++) {
        var d = Number(mediaEls[i].duration);
        if (isFinite(d) && d > maxDuration) maxDuration = d;
      }
      return Math.max(0, maxDuration);
    }
    function syncFallbackMedia(time, playing) {
      for (var i = 0; i < mediaEls.length; i++) {
        var media = mediaEls[i];
        var existing = Number(media.currentTime) || 0;
        if (Math.abs(existing - time) > 0.3) {
          try { media.currentTime = time; } catch (e) {}
        }
        if (playing) {
          if (media.paused) {
            media.play().catch(function() {});
          }
        } else if (!media.paused) {
          media.pause();
        }
      }
    }

    var basePlayer = window.__player && typeof window.__player === 'object' ? window.__player : {};
    window.__player = {
      ...basePlayer,
      _timeline: null,
      play: function() {
        isPlaying = true;
        syncFallbackMedia(currentTime, true);
      },
      pause: function() {
        isPlaying = false;
        syncFallbackMedia(currentTime, false);
      },
      seek: function(time) {
        var safeTime = Math.max(0, Number(time) || 0);
        currentTime = safeTime;
        isPlaying = false;
        syncFallbackMedia(safeTime, false);
      },
      renderSeek: function(time) {
        var safeTime = Math.max(0, Number(time) || 0);
        currentTime = safeTime;
        isPlaying = false;
        syncFallbackMedia(safeTime, false);
      },
      getTime: function() {
        var primary = mediaEls[0];
        if (!primary) return currentTime;
        var t = Number(primary.currentTime);
        return isFinite(t) ? t : currentTime;
      },
      getDuration: function() {
        return fallbackDuration();
      },
      isPlaying: function() {
        return isPlaying;
      },
    };
    window.__playerReady = true;
    // Media-fallback player has no timeline to bind, so render-ready is immediate.
    // init.ts defers __renderReady until the timeline is bound (a different runtime).
    window.__renderReady = true;
    return true;
  }

  function waitForPlayer() {
    var hasComposition = Boolean(document.querySelector('[data-composition-id]'));
    if (hasComposition) {
      if (window.__player && typeof window.__player.renderSeek === "function") {
        window.__playerReady = true;
        return;
      }
      __realSetTimeout(waitForPlayer, 50);
      return;
    }
    if (installMediaFallbackPlayer()) {
      return;
    }
    __realSetTimeout(waitForPlayer, 50);
  }
  waitForPlayer();
})();`;
}
var HF_EARLY_STUB = getHfEarlyStub();
var HF_BRIDGE_SCRIPT = `(function() {
  var __realSetInterval =
    window.__HF_VIRTUAL_TIME__ && typeof window.__HF_VIRTUAL_TIME__.originalSetInterval === "function"
      ? window.__HF_VIRTUAL_TIME__.originalSetInterval
      : window.setInterval.bind(window);
  var __realClearInterval =
    window.__HF_VIRTUAL_TIME__ && typeof window.__HF_VIRTUAL_TIME__.originalClearInterval === "function"
      ? window.__HF_VIRTUAL_TIME__.originalClearInterval
      : window.clearInterval.bind(window);
  function getDeclaredDuration() {
    var root = document.querySelector('[data-composition-id]');
    if (!root) return 0;
    var d = Number(root.getAttribute('data-duration'));
    if (Number.isFinite(d) && d > 0) return d;
    var comps = document.querySelectorAll('[data-composition-src]');
    var maxEnd = 0;
    for (var i = 0; i < comps.length; i++) {
      var start = Number(comps[i].getAttribute('data-start')) || 0;
      var dur = Number(comps[i].getAttribute('data-duration')) || 0;
      if (dur > 0) maxEnd = Math.max(maxEnd, start + dur);
    }
    if (maxEnd > 0) console.warn('[HF Bridge] No root data-duration; derived ' + maxEnd + 's from sub-compositions');
    return maxEnd;
  }
  function seekSameOriginChildFrames(frameWindow, nextTimeMs) {
    var frames;
    try {
      frames = frameWindow.frames;
    } catch (_error) {
      return;
    }
    if (!frames || typeof frames.length !== "number") return;
    for (var i = 0; i < frames.length; i++) {
      var childWindow = null;
      try {
        childWindow = frames[i];
        if (!childWindow || childWindow === frameWindow) continue;
        if (
          childWindow.__HF_VIRTUAL_TIME__ &&
          typeof childWindow.__HF_VIRTUAL_TIME__.seekToTime === "function"
        ) {
          childWindow.__HF_VIRTUAL_TIME__.seekToTime(nextTimeMs);
        }
      } catch (_error) {
        continue;
      }
      seekSameOriginChildFrames(childWindow, nextTimeMs);
    }
  }
  function bridge() {
    var p = window.__player;
    if (!p || typeof p.renderSeek !== "function" || typeof p.getDuration !== "function") {
      return false;
    }
    var hf = window.__hf || {};
    Object.defineProperty(hf, "duration", {
      configurable: true,
      enumerable: true,
      get: function() {
        // While the GSAP tween-batching interceptor (HF_EARLY_STUB) is draining
        // queued tweens via rAF, the real timelines are still empty. Return 0
        // here so pollHfReady in the engine keeps waiting (its condition is
        // __hf.duration > 0), preventing the capture pipeline from seeking
        // empty timelines and producing blank/incorrect frames.
        if (window.__hfTimelinesBuilding) return 0;
        if (!window.__renderReady) return 0;
        var d = p.getDuration();
        return d > 0 ? d : getDeclaredDuration();
      },
    });
    hf.seek = function(t, options) {
      p.renderSeek(t, options);
      var nextTimeMs = (Math.max(0, Number(t) || 0)) * 1000;
      if (window.__HF_VIRTUAL_TIME__ && typeof window.__HF_VIRTUAL_TIME__.seekToTime === "function") {
        window.__HF_VIRTUAL_TIME__.seekToTime(nextTimeMs);
      }
      seekSameOriginChildFrames(window, nextTimeMs);
    };
    window.__hf = hf;
    return true;
  }
  if (bridge()) return;
  var iv = __realSetInterval(function() {
    if (bridge()) __realClearInterval(iv);
  }, 50);
})();`;
var RENDER_CAPTURE_MODE_SHIM = "globalThis.__HF_RENDER_CAPTURE_MODE = true;";
function closeFileServerSafely(fileServer, label, log = defaultLogger) {
  try {
    fileServer.close();
  } catch (err) {
    log.warn(`[${label}] file server close failed`, {
      error: err instanceof Error ? err.message : String(err)
    });
  }
}
function openRegularFile(filePath) {
  let fd;
  try {
    fd = openSync(filePath, constants.O_RDONLY | constants.O_NONBLOCK);
  } catch (error) {
    if (error instanceof Error && "code" in error && (error.code === "ENOENT" || error.code === "ENOTDIR"))
      return null;
    if (!statSync(filePath, { throwIfNoEntry: false })?.isFile()) return null;
    throw error;
  }
  let accepted = false;
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) return null;
    accepted = true;
    return { fd, stat, filePath };
  } finally {
    if (!accepted) closeSync(fd);
  }
}
function createFileServer(options) {
  const { projectDir, compiledDir, port = 0, stripEmbeddedRuntime = true } = options;
  const preHeadScripts = [
    HF_EARLY_STUB,
    RENDER_CAPTURE_MODE_SHIM,
    ...options.preHeadScripts ?? []
  ];
  const headScripts = options.headScripts ?? [getVerifiedHyperframeRuntimeSource()];
  const bodyScripts = options.bodyScripts ?? [buildRenderModeScript(options.fps), HF_BRIDGE_SCRIPT];
  const app = new Hono();
  app.get("/*", async (c) => {
    let requestPath = c.req.path;
    if (requestPath === "/") requestPath = "/index.html";
    const relativePath = requestPath.replace(/^\//, "").split("/").map((seg) => {
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    }).join("/");
    let file = null;
    for (const root of compiledDir ? [compiledDir, projectDir] : [projectDir]) {
      const candidate = join(root, relativePath);
      if (isPathInside(candidate, root)) file = openRegularFile(candidate);
      if (file) break;
    }
    if (!file) {
      if (!/favicon\.ico$/i.test(requestPath)) {
        console.warn(`[FileServer] 404 Not Found: ${requestPath}`);
      }
      return c.text("Not found", 404);
    }
    const { fd, stat, filePath } = file;
    let streamOwnsFd = false;
    try {
      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      if (ext === ".html") {
        const rawHtml = await readFileAsync(fd, "utf-8");
        const isIndex = relativePath === "index.html";
        let html = rawHtml;
        if (preHeadScripts.length > 0) {
          html = injectScriptsAtHeadStart(html, preHeadScripts);
        }
        html = isIndex ? injectScriptsIntoHtml(html, headScripts, bodyScripts, stripEmbeddedRuntime) : html;
        return c.text(html, 200, { "Content-Type": contentType });
      }
      if (ext === ".png") {
        const untagged = stripSdrPngColourTags(await readFileAsync(fd));
        if (untagged) {
          const headers = {
            "Content-Type": contentType,
            "Content-Length": String(untagged.length)
          };
          return new Response(c.req.method === "HEAD" ? null : new Uint8Array(untagged), {
            headers
          });
        }
      }
      const totalSize = stat.size;
      const rangeHeader = c.req.header("range");
      const rangeRequest = parseRangeHeader(rangeHeader, totalSize);
      if (rangeRequest.kind === "unsatisfiable") {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Type": contentType,
            "Content-Range": `bytes */${totalSize}`,
            "Accept-Ranges": "bytes"
          }
        });
      }
      const range = rangeRequest.kind === "satisfiable" ? rangeRequest : null;
      const responseOptions = {
        status: range ? 206 : 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(range ? range.end - range.start + 1 : totalSize),
          "Accept-Ranges": "bytes",
          ...range ? { "Content-Range": `bytes ${range.start}-${range.end}/${totalSize}` } : {}
        }
      };
      if (c.req.method === "HEAD") return new Response(null, responseOptions);
      const stream = createReadStream(filePath, {
        fd,
        autoClose: true,
        start: range?.start ?? 0,
        ...range ? { end: range.end } : {}
      });
      streamOwnsFd = true;
      try {
        const webStream = Readable.toWeb(stream);
        return new Response(webStream, responseOptions);
      } catch (error) {
        stream.destroy();
        throw error;
      }
    } finally {
      if (!streamOwnsFd) closeSync(fd);
    }
  });
  return new Promise((resolve10, reject) => {
    const connections = /* @__PURE__ */ new Set();
    const server = serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
      const bound = port === 0 ? settleOnBrowserSafePort(server, "127.0.0.1") : Promise.resolve(info.port);
      bound.then((boundPort) => {
        resolve10({
          url: `http://localhost:${boundPort}`,
          port: boundPort,
          addPreHeadScript: (script) => {
            preHeadScripts.push(script);
          },
          close: () => {
            for (const socket of connections) socket.destroy();
            connections.clear();
            server.close();
          }
        });
      }, reject);
    });
    server.on("connection", (socket) => {
      connections.add(socket);
      socket.on("close", () => connections.delete(socket));
    });
    server.on("error", reject);
  });
}

// src/services/render/renderFormat.ts
function outputNeedsAlpha(format) {
  return format !== "mp4" && format !== "hls";
}

// src/services/render/hlsConfig.ts
import { keyframeIntervalToGopSize } from "@hyperframes/engine";

// src/services/render/deliveryEncoder.ts
import {
  PRORES_PROFILE_NAMES,
  appendRateCapArgs,
  isProresProfile,
  keyframeIntervalToGopSize as keyframeIntervalToGopSize2
} from "@hyperframes/engine";
function validateProresProfile(format, proresProfile) {
  if (proresProfile === void 0) return;
  if (!isProresProfile(proresProfile)) {
    throw new Error(
      `proresProfile must be one of ${PRORES_PROFILE_NAMES.join(", ")}; got ${JSON.stringify(proresProfile)}`
    );
  }
  if (format !== void 0 && format !== "mov") {
    throw new Error(`proresProfile applies to mov renders, not ${format}`);
  }
}
function validateDeliveryEncoderConfig(config) {
  const { keyframeIntervalSeconds, maxBitrate, bufferSize, format, proresProfile } = config;
  validateProresProfile(format, proresProfile);
  if (keyframeIntervalSeconds === void 0 && maxBitrate === void 0 && bufferSize === void 0)
    return;
  if (keyframeIntervalSeconds !== void 0) {
    if (!Number.isFinite(keyframeIntervalSeconds) || keyframeIntervalSeconds <= 0) {
      throw new Error(
        `keyframeIntervalSeconds must be a positive number of seconds; got ${keyframeIntervalSeconds}`
      );
    }
    if (format === "hls") {
      throw new Error(
        "keyframeIntervalSeconds does not apply to hls; hlsSegmentSeconds sets its keyframes"
      );
    }
  }
  if (format !== void 0 && format !== "mp4") {
    throw new Error(`keyframeIntervalSeconds and maxBitrate apply to mp4 renders, not ${format}`);
  }
  appendRateCapArgs([], { maxBitrate, bufferSize });
}
function chunkGopFrames(framesInChunk, intervalFrames) {
  return Math.min(framesInChunk, intervalFrames ?? framesInChunk);
}

// src/services/render/shared.ts
import {
  copyFileSync,
  cpSync,
  existsSync as existsSync3,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { basename as basename2, dirname as dirname2, isAbsolute, join as join3, relative, resolve as resolve3 } from "node:path";
import {
  CANVAS_DIMENSIONS,
  checkOutputResolutionCompatibility
} from "@hyperframes/core";

// src/utils/paths.ts
import {
  basename,
  join as join2,
  resolve as nodeResolve,
  relative as nodeRelative,
  isAbsolute as nodeIsAbsolute
} from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var DEFAULT_RENDERS_DIR = process.env.PRODUCER_RENDERS_DIR ?? // fileURLToPath (not URL.pathname): on Windows .pathname is "/D:/..." which
// resolves to a bogus renders dir.
nodeResolve(fileURLToPath2(import.meta.url), "../../..", "renders");
var LEADING_PARENT_SEGMENT_RE = /^\.\.(?:[\\/]|$)/;
function isPathInside2(childPath, parentPath, options = {}) {
  const resolvePath = options.pathModule?.resolve ?? nodeResolve;
  const relativePath = options.pathModule?.relative ?? nodeRelative;
  const isPathAbsolute = options.pathModule?.isAbsolute ?? nodeIsAbsolute;
  const absChild = resolvePath(childPath);
  const absParent = resolvePath(parentPath);
  if (absChild === absParent) return true;
  const rel = relativePath(absParent, absChild);
  return rel !== "" && !LEADING_PARENT_SEGMENT_RE.test(rel) && !isPathAbsolute(rel);
}
function toExternalAssetKey(absPath) {
  if (absPath.startsWith("hf-ext/")) return absPath;
  let normalised = absPath.replace(/\\/g, "/");
  normalised = normalised.replace(/^\/\/\?\/UNC\//i, "//");
  normalised = normalised.replace(/^\/\/\?\//, "");
  normalised = normalised.replace(/^\/\/([^/]+)\//, "unc/$1/");
  normalised = normalised.replace(/^\/+/, "");
  normalised = normalised.replace(/^([A-Za-z]):\/?/, "$1/");
  return "hf-ext/" + normalised;
}
function formatCaptureFrameName(index, ext) {
  return `frame_${String(index).padStart(6, "0")}.${ext}`;
}
function formatExportFrameName(index, ext) {
  return `frame_${String(index + 1).padStart(6, "0")}.${ext}`;
}

// src/services/render/shared.ts
var BROWSER_MEDIA_EPSILON = 1e-4;
function resolveBrowserMediaEnd(start, end, duration) {
  return Number.isFinite(duration) && duration > 0 ? start + duration : end;
}
function projectBrowserEndToCompositionTimeline(existingStart, browserStart, browserEnd) {
  return browserEnd + (existingStart - browserStart);
}
function resolveDeviceScaleFactor(input) {
  if (!input.outputResolution) return 1;
  const compat = checkOutputResolutionCompatibility({
    compositionWidth: input.compositionWidth,
    compositionHeight: input.compositionHeight,
    outputResolution: input.outputResolution,
    alphaRequested: input.alphaRequested,
    hdrRequested: input.hdrRequested
  });
  if (!compat.ok) throw new Error(compat.message);
  const target = CANVAS_DIMENSIONS[input.outputResolution];
  return Math.max(target.width / input.compositionWidth, target.height / input.compositionHeight);
}
function writeCompiledArtifacts(compiled, workDir, includeSummary) {
  const compileDir = join3(workDir, "compiled");
  mkdirSync(compileDir, { recursive: true });
  writeFileSync(join3(compileDir, "index.html"), compiled.html, "utf-8");
  for (const [srcPath, html] of compiled.subCompositions) {
    const outPath = join3(compileDir, srcPath);
    mkdirSync(dirname2(outPath), { recursive: true });
    writeFileSync(outPath, html, "utf-8");
  }
  for (const [relativePath, absolutePath] of compiled.externalAssets) {
    const outPath = resolve3(join3(compileDir, relativePath));
    if (!isPathInside2(outPath, compileDir)) {
      console.warn(`[Render] Skipping external asset with unsafe path: ${relativePath}`);
      continue;
    }
    mkdirSync(dirname2(outPath), { recursive: true });
    copyFileSync(absolutePath, outPath);
  }
  if (includeSummary) {
    const summary = {
      width: compiled.width,
      height: compiled.height,
      staticDuration: compiled.staticDuration,
      videos: compiled.videos.map((v) => ({
        id: v.id,
        src: v.src,
        start: v.start,
        end: v.end,
        mediaStart: v.mediaStart
      })),
      audios: compiled.audios.map((a) => ({
        id: a.id,
        src: a.src,
        start: a.start,
        end: a.end,
        mediaStart: a.mediaStart
      })),
      subCompositions: Array.from(compiled.subCompositions.keys()),
      renderModeHints: compiled.renderModeHints,
      hasShaderTransitions: compiled.hasShaderTransitions
    };
    writeFileSync(join3(compileDir, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  }
}
function applyRenderModeHints(alreadyForced, compiled, log = defaultLogger) {
  if (alreadyForced || !compiled.renderModeHints.recommendScreenshot) {
    return { forceScreenshot: alreadyForced, autoSelected: false };
  }
  log.warn("Auto-selected screenshot capture mode for render compatibility", {
    reasonCodes: compiled.renderModeHints.reasons.map((reason) => reason.code),
    reasons: compiled.renderModeHints.reasons.map((reason) => reason.message)
  });
  return { forceScreenshot: true, autoSelected: true };
}
function updateJobStatus(job, status, stage, progress, onProgress, stageProgress) {
  job.warnings ??= [];
  job.status = status;
  job.currentStage = stage;
  job.stageProgress = stageProgress;
  const boundedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  job.progress = Math.max(job.progress, boundedProgress);
  if (status === "failed" || status === "complete" || status === "cancelled") {
    job.completedAt = /* @__PURE__ */ new Date();
    job.outcome = status === "failed" ? "failed" : status === "cancelled" ? "cancelled" : job.warnings.length > 0 ? "completed_with_warnings" : "completed";
  }
  if (onProgress) void onProgress(job, stage);
}
var PROGRESS_REPORT_INTERVAL_MS = 250;
var lastFrameReportAt = /* @__PURE__ */ new WeakMap();
var lastStartupReportAt = /* @__PURE__ */ new WeakMap();
var lastReportSent = /* @__PURE__ */ new WeakMap();
function reportThrottled(lastReportAt, job, stage, progress, onProgress, force, stageProgress, status = "rendering") {
  const now = Date.now();
  const last = lastReportAt.get(job);
  const sent = `${stage}|${progress}`;
  const due = lastReportSent.get(job) !== sent && (force || last === void 0 || now - last >= PROGRESS_REPORT_INTERVAL_MS);
  if (due) {
    lastReportAt.set(job, now);
    lastReportSent.set(job, sent);
  }
  updateJobStatus(job, status, stage, progress, due ? onProgress : void 0, stageProgress);
}
function reportFrameProgress(job, stage, progress, onProgress, done, total) {
  reportThrottled(lastFrameReportAt, job, stage, progress, onProgress, done === total, {
    code: "capture",
    done,
    total
  });
}
var lastEncodeReportAt = /* @__PURE__ */ new WeakMap();
function reportEncodeProgress(job, done, total, onProgress, from) {
  if (total <= 0) return;
  const frames = Math.min(done, total);
  reportThrottled(
    lastEncodeReportAt,
    job,
    `Encoding frame ${frames}/${total}`,
    from + (90 - from) * frames / total,
    onProgress,
    frames === total,
    { code: "encode", done: frames, total },
    "encoding"
  );
}
var workerPhasesByJob = /* @__PURE__ */ new WeakMap();
function reportWorkerStartup(job, progress, onProgress) {
  const phase = progress.latestWorkerPhase;
  if (!phase) return;
  const phases = workerPhasesByJob.get(job) ?? /* @__PURE__ */ new Map();
  workerPhasesByJob.set(job, phases);
  phases.set(phase.workerId, phase.phase);
  const ready = [...phases].filter(
    ([id, p]) => id < progress.activeWorkers && (p === "frame_capture" || p === "frame_encode")
  ).length;
  reportThrottled(
    lastStartupReportAt,
    job,
    `Starting browsers (${ready}/${progress.activeWorkers} ready)`,
    job.progress,
    onProgress,
    false,
    { code: "start_browsers", done: ready, total: progress.activeWorkers }
  );
}
var materializePathModule = {
  resolve: resolve3,
  join: join3,
  dirname: dirname2,
  basename: basename2,
  relative,
  isAbsolute
};
var materializeFileSystem = {
  existsSync: existsSync3,
  mkdirSync,
  symlinkSync,
  cpSync,
  rmSync
};
var warnedSymlinkFallback = false;
function tryWindowsFrameJunction(fileSystem, src, dest) {
  if (process.platform !== "win32") return false;
  try {
    fileSystem.symlinkSync(src, dest, "junction");
    return true;
  } catch (error) {
    const code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : void 0;
    if (["EPERM", "EACCES", "UNKNOWN", "EINVAL", "ENOSYS", "EOPNOTSUPP", "ENOTSUP"].includes(
      code ?? ""
    )) {
      return false;
    }
    throw error;
  }
}
function linkOrCopyFrameDir(fileSystem, src, dest) {
  try {
    fileSystem.symlinkSync(src, dest, "dir");
  } catch (err) {
    const code = err?.code;
    if (code !== "EPERM" && code !== "EACCES" && code !== "UNKNOWN") throw err;
    if (tryWindowsFrameJunction(fileSystem, src, dest)) return;
    if (!warnedSymlinkFallback) {
      warnedSymlinkFallback = true;
      defaultLogger.info(
        `[Render] Linking extracted frames was rejected (${code}); copying them into the compiled dir instead.`
      );
    }
    fileSystem.cpSync(src, dest, { recursive: true });
  }
}
function stageExtractedFrameDir(fileSystem, src, dest, materializeSymlinks) {
  try {
    stageExtractedFrameDirOnce(fileSystem, src, dest, materializeSymlinks);
  } catch (err) {
    if (err?.code !== "EEXIST") throw err;
    fileSystem.rmSync?.(dest, { recursive: true, force: true });
    stageExtractedFrameDirOnce(fileSystem, src, dest, materializeSymlinks);
  }
}
function stageExtractedFrameDirOnce(fileSystem, src, dest, materializeSymlinks) {
  if (materializeSymlinks) {
    fileSystem.cpSync(src, dest, { recursive: true });
    return;
  }
  linkOrCopyFrameDir(fileSystem, src, dest);
}
function materializeExtractedFramesForCompiledDir(extracted, compiledDir, options = {}) {
  const pathModule = options.pathModule ?? materializePathModule;
  const fileSystem = options.fileSystem ?? materializeFileSystem;
  const resolvedCompiledDir = pathModule.resolve(compiledDir);
  const compiledFrameRoot = pathModule.join(resolvedCompiledDir, "__hyperframes_video_frames");
  for (const ext of extracted) {
    const resolvedOut = pathModule.resolve(ext.outputDir);
    if (isPathInside2(resolvedOut, resolvedCompiledDir, { pathModule })) continue;
    const linkPath = pathModule.join(compiledFrameRoot, ext.videoId);
    if (!fileSystem.existsSync(linkPath)) {
      fileSystem.mkdirSync(pathModule.dirname(linkPath), { recursive: true });
      stageExtractedFrameDir(
        fileSystem,
        resolvedOut,
        linkPath,
        options.materializeSymlinks === true
      );
    }
    const remapped = /* @__PURE__ */ new Map();
    for (const [idx, framePath] of ext.framePaths) {
      remapped.set(idx, pathModule.join(linkPath, pathModule.basename(framePath)));
    }
    ext.framePaths = remapped;
    ext.outputDir = linkPath;
  }
}

// src/services/render/frameCacheBudget.ts
function frameCacheOptions(cfg, workers) {
  return {
    frameDataUriCacheLimit: cfg.frameDataUriCacheLimit,
    frameDataUriCacheBytesLimitMb: Math.floor(cfg.frameDataUriCacheBytesLimitMb / (workers || 1))
  };
}

// src/utils/errorMessage.ts
function normalizeErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const msg = error.message;
    if (typeof msg === "string") return msg;
    try {
      return JSON.stringify(error);
    } catch {
      try {
        return `{${Object.keys(error).join(", ")}}`;
      } catch {
      }
    }
  }
  return String(error ?? "unknown error");
}

// src/services/render/renderEventPublisher.ts
import { cloneCaptureWarnings } from "@hyperframes/engine";

// src/services/render/encoderInterruption.ts
var ENCODER_INTERRUPTED = "ENCODER_INTERRUPTED";
var EncoderInterruptedError = class extends Error {
  code = ENCODER_INTERRUPTED;
  owner = "system";
  retryable = true;
  /** Retained inside the producer for diagnostics; never copied to the wire envelope. */
  diagnosticMessage;
  audioFailures;
  constructor(prefix, diagnosticMessage, audioFailures = []) {
    super(`${prefix}: encoder process was interrupted by the host lifecycle`);
    this.name = "EncoderInterruptedError";
    this.diagnosticMessage = diagnosticMessage;
    this.audioFailures = audioFailures;
  }
};
function encoderFailureError(prefix, result) {
  const message = `${prefix}: ${result.error ?? "unknown encoder failure"}`;
  return result.failureReason === "external_interruption" ? new EncoderInterruptedError(prefix, message, result.audioFailures) : new Error(message);
}

// src/services/render/artifactTransaction.ts
import { HLS_MASTER_PLAYLIST, HLS_VIDEO_PLAYLIST, renameWithRetry } from "@hyperframes/engine";

// src/utils/ffprobe.ts
import {
  extractMediaMetadata,
  extractVideoMetadata,
  extractAudioMetadata
} from "@hyperframes/engine";

// src/services/render/renderDirOwner.ts
import { RENDER_TEMP_DIR } from "@hyperframes/core/project-folders";

// src/services/render/capturePlan.ts
function assertWorkerCount(workerCount) {
  if (!Number.isInteger(workerCount) || workerCount < 1) {
    throw new Error(`CapturePlan workerCount must be a positive integer; got ${workerCount}`);
  }
}
function freezeTarget(target) {
  assertWorkerCount(target.workerCount);
  if (target.kind === "sdr_disk" && target.forceParallelStream) {
    throw new Error("CapturePlan disk fallback cannot force parallel streaming");
  }
  return Object.freeze({ ...target });
}
function freezeRouting(routing) {
  if (!routing || routing.kind === "default") return Object.freeze({ kind: "default" });
  return Object.freeze({
    ...routing,
    fallback: freezeTarget(routing.fallback),
    memoryExhaustionFallback: freezeTarget(routing.memoryExhaustionFallback)
  });
}
function createCapturePlan(input) {
  assertWorkerCount(input.workerCount);
  const base = {
    workerCount: input.workerCount,
    forceScreenshot: input.forceScreenshot || input.usePageSideCompositing,
    forceParallelStream: input.useStreamingEncode ? input.forceParallelStream ?? false : false,
    usePageSideCompositing: input.usePageSideCompositing,
    hasHdrContent: input.hasHdrContent,
    needsAlpha: input.needsAlpha,
    routing: freezeRouting(input.routing)
  };
  if (input.useLayeredComposite) {
    return Object.freeze({
      ...base,
      kind: "hdr_layered",
      forceScreenshot: true,
      forceParallelStream: false
    });
  }
  if (input.useSegmentedCapture === true) {
    return Object.freeze({ ...base, kind: "sdr_segmented", forceParallelStream: false });
  }
  if (input.useStreamingEncode) {
    return Object.freeze({ ...base, kind: "sdr_streaming" });
  }
  return Object.freeze({ ...base, kind: "sdr_disk", forceParallelStream: false });
}

// src/services/render/stages/captureSegmentedStage.ts
import {
  captureFrameToBuffer as captureFrameToBuffer2,
  closeCaptureSession as closeCaptureSession2,
  completeDeferredDrawElementInit as completeDeferredDrawElementInit2,
  concatVideoFiles,
  createCaptureSession as createCaptureSession2,
  getCapturePerfSummary as getCapturePerfSummary2,
  initializeSession as initializeSession2,
  prepareCaptureSessionForReuse as prepareCaptureSessionForReuse2,
  shouldDisableBrowserPoolForParallelWorker,
  spawnStreamingEncoder as spawnStreamingEncoder2
} from "@hyperframes/engine";

// src/services/render/captureStageError.ts
import { CaptureFailure, classifyCaptureFailure } from "@hyperframes/engine";

// src/services/render/perfSummary.ts
import { fpsToNumber as fpsToNumber2 } from "@hyperframes/core";
function pushWorkerDedupPerfs(results, sink) {
  for (const r of results) {
    if (r.perf) sink.push(r.perf);
  }
}
function pushWorkerPageErrors(results, sink) {
  for (const result of results) {
    for (const line of result.pageErrorLines ?? []) if (!sink.includes(line)) sink.push(line);
  }
}
function withWorkerPageErrors(consoleLines, workerLines) {
  return [...consoleLines, ...workerLines.filter((line) => !consoleLines.includes(line))];
}

// src/services/render/captureStageError.ts
var CaptureStageError = class extends CaptureFailure {
  browserConsole;
  constructor(input) {
    const classified = classifyCaptureFailure(input.cause);
    super({
      kind: classified.kind,
      message: normalizeErrorMessage(input.cause),
      cause: input.cause,
      workerDiagnostics: classified.workerDiagnostics,
      pageErrorLines: classified.pageErrorLines
    });
    this.name = "CaptureStageError";
    this.browserConsole = withWorkerPageErrors(input.browserConsole, [
      ...classified.pageErrorLines
    ]);
    if (input.cause instanceof Error && input.cause.stack) {
      this.stack = input.cause.stack;
    }
  }
};
function wrapCaptureStageError(error, browserConsole) {
  if (error instanceof CaptureStageError || error instanceof EncoderInterruptedError) return error;
  return new CaptureStageError({ cause: error, browserConsole });
}

// src/services/render/stages/captureHdrFrameShared.ts
import {
  applyDomLayerMask as applyDomLayerMask2,
  blitRgba8OverRgb48le as blitRgba8OverRgb48le2,
  captureAlphaPng as captureAlphaPng2,
  decodePng as decodePng2,
  queryElementStacking as queryElementStacking2,
  removeDomLayerMask as removeDomLayerMask2
} from "@hyperframes/engine";

// src/services/hdrCompositor.ts
import {
  captureAlphaPng,
  applyDomLayerMask,
  removeDomLayerMask,
  decodePng,
  blitRgba8OverRgb48le,
  blitRgb48leRegion,
  groupIntoLayers,
  blitRgb48leAffine,
  parseTransformMatrix,
  convertTransfer,
  isVideoHiddenBeforeStreamStart
} from "@hyperframes/engine";

// src/services/render/stages/captureHdrResources.ts
import {
  decodePngToRgb48le,
  extractMediaMetadata as extractMediaMetadata2,
  ffmpegSeekSeconds,
  getCgroupMemoryLimitMb,
  normalizeObjectFit,
  queryElementStacking,
  resampleRgb48leObjectFit,
  resolveFinalFrameExtractionWindow,
  resolveProjectRelativeSrc,
  resolveVideoExtractionWindow,
  runFfmpeg,
  videoStartOnMediaTimeline
} from "@hyperframes/engine";
import { fpsToFfmpegArg, fpsToNumber as fpsToNumber3 } from "@hyperframes/core";
var BYTES_PER_MIB = 1024 * 1024;
var DEFAULT_HDR_WINDOW_BYTES = 512 * BYTES_PER_MIB;

// src/services/render/stages/captureStreamingStage.ts
import {
  DrawElementVerificationError,
  captureFrameToBuffer,
  captureFrameToBufferPipelined,
  captureFramesBatchPipelined,
  closeCaptureSession,
  createCaptureSession,
  createFrameReorderBuffer,
  distributeFrames,
  distributeFramesInterleaved,
  executeParallelCapture,
  getCapturePerfSummary,
  psnrDb,
  resolveDeVerifyMinDb,
  recaptureDrawElementFrameForVerify,
  completeDeferredDrawElementInit,
  initializeSession,
  prepareCaptureSessionForReuse,
  spawnStreamingEncoder
} from "@hyperframes/engine";
var DEFAULT_CAPTURE_STALL_MS = 6e4;
function resolveCaptureStallTimeoutMs() {
  const raw = process.env.HF_DE_STALL_MS ?? process.env.HF_DE_PARALLEL_STALL_MS;
  const parsed = raw ? Number(raw) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CAPTURE_STALL_MS;
}

// src/services/render/segmentManifest.ts
import { renameWithRetry as renameWithRetry2 } from "@hyperframes/engine";

// src/services/render/hdrMode.ts
import {
  analyzeCompositionHdr,
  formatHdrAutoPromotionWarning,
  HDR_AUTO_PROMOTION_PIPELINE,
  isHdrColorSpace,
  sanitizeHdrAutoPromotionAsset
} from "@hyperframes/engine";
function formatCarriesHdr(format) {
  return format === "mp4";
}
function rendersSdrOnly(config) {
  return config.hdrMode === "force-sdr" || !formatCarriesHdr(config.format ?? "mp4");
}

// src/services/render/captureBeyondViewport.ts
function resolveVideoCaptureBeyondViewport(videoCount) {
  if (videoCount <= 0) return void 0;
  return true;
}

// src/services/render/captureCost.ts
import { fpsToNumber as fpsToNumber4 } from "@hyperframes/core";
import {
  calculateOptimalWorkers,
  captureFrameToBuffer as captureFrameToBuffer3,
  closeCaptureSession as closeCaptureSession3,
  computeWorkerSizing,
  createCaptureSession as createCaptureSession3,
  initializeSession as initializeSession3
} from "@hyperframes/engine";
var CAPTURE_CALIBRATION_TARGET_MS = 600;
var MAX_MEASURED_CAPTURE_COST_MULTIPLIER = 8;
var CAPTURE_CALIBRATION_PROTOCOL_TIMEOUT_MS = 3e4;
function createCaptureCalibrationConfig(cfg) {
  return {
    ...cfg,
    protocolTimeout: Math.min(cfg.protocolTimeout, CAPTURE_CALIBRATION_PROTOCOL_TIMEOUT_MS)
  };
}
function estimateMeasuredCaptureCostMultiplier(samples) {
  if (samples.length === 0) {
    return { multiplier: 1, reasons: [] };
  }
  const sorted = [...samples].sort((a, b) => a.captureTimeMs - b.captureTimeMs);
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  const p95Sample = sorted[p95Index] ?? sorted[sorted.length - 1];
  if (!p95Sample) {
    return { multiplier: 1, reasons: [] };
  }
  const p95Ms = Math.round(p95Sample.captureTimeMs);
  const multiplier = Math.min(
    MAX_MEASURED_CAPTURE_COST_MULTIPLIER,
    Math.max(1, Math.round(p95Ms / CAPTURE_CALIBRATION_TARGET_MS * 100) / 100)
  );
  return {
    multiplier,
    reasons: multiplier > 1 ? [`calibration-p95=${p95Ms}ms`] : [],
    p95Ms
  };
}
function selectCaptureCalibrationFrames(totalFrames) {
  if (totalFrames <= 0) return [];
  const lastFrame = totalFrames - 1;
  const candidates = [
    0,
    Math.floor(totalFrames * 0.25),
    Math.floor(totalFrames * 0.5),
    Math.floor(totalFrames * 0.75),
    lastFrame
  ];
  return Array.from(
    new Set(candidates.map((frame) => Math.max(0, Math.min(lastFrame, frame))))
  ).sort((a, b) => a - b);
}
async function measureCaptureCostFromSession(session, totalFrames, fps, log) {
  const sampledFrames = selectCaptureCalibrationFrames(totalFrames);
  const samples = [];
  const totalSamples = sampledFrames.length;
  const savedStaticFrames = session.staticFrames;
  session.staticFrames = void 0;
  try {
    for (let i = 0; i < sampledFrames.length; i++) {
      const frameIndex = sampledFrames[i];
      log?.info(`Calibration: capturing test frame ${i + 1}/${totalSamples}...`);
      const time = frameIndex / fps;
      const startedAt = Date.now();
      const result = await captureFrameToBuffer3(session, frameIndex, time);
      samples.push({
        frameIndex,
        captureTimeMs: result.captureTimeMs || Date.now() - startedAt
      });
    }
  } finally {
    session.staticFrames = savedStaticFrames;
    session.lastFrameBuffer = void 0;
  }
  const estimate = estimateMeasuredCaptureCostMultiplier(samples);
  if (estimate.p95Ms !== void 0) {
    log?.info(`Calibration complete, estimated cost: ${estimate.p95Ms}ms/frame (p95)`);
  }
  return {
    estimate,
    samples
  };
}

// src/services/render/observability.ts
import { redactTelemetryString } from "@hyperframes/core";
import { CaptureFailure as CaptureFailure2 } from "@hyperframes/engine";
var MAX_EVENTS = 160;
var ALLOWED_STRING_DATA_KEYS = /* @__PURE__ */ new Set([
  "browserGpuMode",
  "captureMode",
  "captureOperation",
  "compositionHash",
  "effectiveHdr",
  "format",
  "quality",
  "renderJobId",
  "requestedHdrMode",
  "requestedWorkers",
  // "calibrating" during pre-capture browser warm-up / calibration stages;
  // "capturing" during capture_disk / capture_streaming / capture_hdr_*
  // stages. Distinguishes healthy 0-frame heartbeats (browser starting up)
  // from actual zero-frame stalls once capture is meant to be underway.
  // Field signal ts=1784019503.
  "stagePhase",
  // Full-fidelity fast-capture fallback trigger — the specific reason
  // drawElement gated off ("filter:blur", "filter:drop-shadow",
  // "backdrop-filter", "clip-path", "at_risk_timeline", "swiftshader", …).
  // Populated on the `capture_fallback_profile` checkpoint emitted by
  // `fallbackCaptureProfile.ts` when the operator opts into
  // `HF_PROFILE_FALLBACK_CAPTURE=true` so downstream metric consumers can
  // characterize per-frame perf by the exact trigger. Complementary to
  // `deGateReason`, which is the low-cardinality bucket for aggregation —
  // this string preserves the fine-grained "which CSS property" for
  // diagnostic reads. Sanitized like any observation message; low-cardinality
  // by construction (bounded by the fallback-trigger enumeration).
  "triggerReason"
]);
var RESERVED_LOG_KEYS = /* @__PURE__ */ new Set([
  "data",
  "durationMs",
  "elapsedMs",
  "message",
  "phase",
  "renderJobId",
  "status"
]);
function sanitizeObservationMessage(value) {
  return redactTelemetryString(value);
}
function sanitizeObservationData(data) {
  if (!data) return void 0;
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (RESERVED_LOG_KEYS.has(key)) continue;
    if (typeof value === "string") {
      if (!ALLOWED_STRING_DATA_KEYS.has(key)) continue;
      sanitized[key] = sanitizeObservationMessage(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
function isHttpErrorDiagnostic(line) {
  return /\[Browser:HTTP\d{3}\]/.test(line);
}
function readUnsignedIntAfter(line, prefix) {
  const start = line.indexOf(prefix);
  if (start < 0) return void 0;
  let value = 0;
  let digits = 0;
  for (let i = start + prefix.length; i < line.length; i++) {
    const code = line.charCodeAt(i);
    if (code < 48 || code > 57) break;
    value = value * 10 + code - 48;
    digits += 1;
    if (value > Number.MAX_SAFE_INTEGER) return void 0;
  }
  return digits > 0 ? value : void 0;
}
function maxReading(current, next) {
  if (next === void 0) return current;
  return current === void 0 ? next : Math.max(current, next);
}
function summarizeInitObservability(lines, fallback) {
  let initDurationMs = fallback?.initDurationMs;
  let tweenCount = fallback?.tweenCount;
  let elementCount = fallback?.elementCount;
  for (const line of lines) {
    if (!line.includes("[FrameCapture:INIT]")) continue;
    initDurationMs = maxReading(initDurationMs, readUnsignedIntAfter(line, "initDurationMs="));
    tweenCount = maxReading(tweenCount, readUnsignedIntAfter(line, "tweenCount="));
    elementCount = maxReading(elementCount, readUnsignedIntAfter(line, "elementCount="));
  }
  if (initDurationMs === void 0 && tweenCount === void 0 && elementCount === void 0) {
    return void 0;
  }
  return { initDurationMs, tweenCount, elementCount };
}
function summarizeBrowserDiagnostics(lines) {
  let errors = 0;
  let pageErrors = 0;
  let requestFailed = 0;
  let httpErrors = 0;
  let navigationStarts = 0;
  let navigationFailures = 0;
  let consoleErrors = 0;
  let consoleWarnings = 0;
  for (const line of lines) {
    const isPageError = line.includes("PAGEERROR");
    const isRequestFailed = line.includes("REQUESTFAILED");
    const isHttpError = isHttpErrorDiagnostic(line);
    const isNavigationFailure = line.includes("[FrameCapture:ERROR] page.goto failed");
    const isConsoleError = line.includes("[error]");
    if (isPageError) pageErrors++;
    if (isRequestFailed) requestFailed++;
    if (isHttpError) httpErrors++;
    if (line.includes("[FrameCapture:NAV] page.goto start")) navigationStarts++;
    if (isNavigationFailure) navigationFailures++;
    if (isConsoleError) consoleErrors++;
    if (line.includes("[warn]")) consoleWarnings++;
    if (line.includes("ERROR") && !isPageError && !isRequestFailed && !isHttpError && !isNavigationFailure && !isConsoleError) {
      errors++;
    }
  }
  return {
    total: lines.length,
    errors,
    pageErrors,
    requestFailed,
    httpErrors,
    navigationStarts,
    navigationFailures,
    consoleErrors,
    consoleWarnings
  };
}
var RenderObservabilityRecorder = class {
  constructor(input) {
    this.input = input;
  }
  input;
  events = [];
  eventCount = 0;
  failedPhase;
  checkpoint(phase, message, data) {
    return this.record({
      phase,
      status: "checkpoint",
      elapsedMs: Date.now() - this.input.pipelineStartMs,
      message: sanitizeObservationMessage(message),
      data: sanitizeObservationData(data)
    });
  }
  stageStart(phase, data) {
    this.record({
      phase,
      status: "start",
      elapsedMs: Date.now() - this.input.pipelineStartMs,
      data: sanitizeObservationData(data)
    });
    return Date.now();
  }
  stageEnd(phase, startedAtMs, data) {
    this.record({
      phase,
      status: "end",
      elapsedMs: Date.now() - this.input.pipelineStartMs,
      durationMs: Date.now() - startedAtMs,
      data: sanitizeObservationData(data)
    });
  }
  stageError(phase, startedAtMs, error, data) {
    this.failedPhase = phase;
    this.record({
      phase,
      status: "error",
      elapsedMs: Date.now() - this.input.pipelineStartMs,
      durationMs: Date.now() - startedAtMs,
      message: sanitizeObservationMessage(normalizeErrorMessage(error)),
      data: sanitizeObservationData(data)
    });
  }
  summary(input) {
    const lastEvent = this.events[this.events.length - 1];
    return {
      renderJobId: this.input.renderJobId,
      compositionHash: input.compositionHash,
      events: this.events.slice(),
      eventCount: this.eventCount,
      lastEvent,
      failedPhase: this.failedPhase,
      browserDiagnostics: summarizeBrowserDiagnostics(input.lastBrowserConsole),
      capture: { ...input.capture },
      extraction: input.extraction ? { ...input.extraction } : void 0,
      init: summarizeInitObservability(input.lastBrowserConsole, input.initFallback)
    };
  }
  hasFailure() {
    return this.failedPhase !== void 0;
  }
  /** A phase failure that was subsequently recovered (e.g. the drawElement
   * self-verify fallback re-rendering via screenshot) should not brand the
   * whole render as failed in the summary. */
  clearFailure(phase) {
    if (this.failedPhase === phase) this.failedPhase = void 0;
  }
  record(event) {
    this.eventCount++;
    const eventWithJob = { ...event, renderJobId: this.input.renderJobId };
    this.events.push(eventWithJob);
    if (this.events.length > MAX_EVENTS) {
      this.events.shift();
    }
    this.input.log.info("[Render:trace]", {
      renderJobId: eventWithJob.renderJobId,
      phase: eventWithJob.phase,
      status: eventWithJob.status,
      elapsedMs: eventWithJob.elapsedMs,
      durationMs: eventWithJob.durationMs,
      message: eventWithJob.message,
      ...eventWithJob.data
    });
    return eventWithJob;
  }
};
var HEARTBEAT_RAMP_MS = [3e4, 6e4, 12e4];
var HEARTBEAT_REPEAT_MS = 12e4;
var HEARTBEAT_RAMP_END_MS = HEARTBEAT_RAMP_MS[HEARTBEAT_RAMP_MS.length - 1] ?? HEARTBEAT_REPEAT_MS;
function heartbeatTargetMs(index) {
  const rampTarget = HEARTBEAT_RAMP_MS[index];
  if (rampTarget !== void 0) return rampTarget;
  const overflow = index - HEARTBEAT_RAMP_MS.length + 1;
  return HEARTBEAT_RAMP_END_MS + overflow * HEARTBEAT_REPEAT_MS;
}
var RenderStageStalledError = class extends CaptureFailure2 {
  code = "RENDER_STAGE_STALLED";
  owner = "system";
  retryable = false;
  constructor(phase, silentMs, progress) {
    super({
      kind: "protocol_timeout",
      message: `[Render] ${phase} stalled: no progress for ${silentMs}ms (stuck at ${progress}).`
    });
    this.name = "RenderStageStalledError";
  }
};
var STALL_POLL_MS = 5e3;
function watchStall(phase, rule) {
  let last = rule.progress();
  let budgetMs = rule.firstProgressMs;
  let lastChangeAt = Date.now();
  let attempt;
  let timer;
  let inTail = false;
  const restartWindow = (ms) => {
    last = rule.progress();
    budgetMs = ms;
    lastChangeAt = Date.now();
  };
  const tripped = new Promise((_, reject) => {
    timer = setInterval(
      () => {
        const current = rule.progress();
        if (rule.complete?.() && !inTail) {
          inTail = true;
          return restartWindow(rule.tailMs ?? rule.noProgressMs);
        }
        if (current !== last) return restartWindow(rule.noProgressMs);
        if (Date.now() - lastChangeAt < budgetMs) return;
        const error = new RenderStageStalledError(phase, budgetMs, current);
        if (attempt && !attempt.signal.aborted) {
          attempt.abort(error);
          return restartWindow(rule.noProgressMs);
        }
        clearInterval(timer);
        reject(error);
      },
      Math.min(STALL_POLL_MS, rule.noProgressMs, rule.firstProgressMs)
    );
  });
  const openAttempt = (parent) => {
    attempt = new AbortController();
    inTail = false;
    restartWindow(rule.firstProgressMs);
    return parent ? AbortSignal.any([parent, attempt.signal]) : attempt.signal;
  };
  const stalledBy = () => attempt?.signal.aborted ? attempt.signal.reason : void 0;
  return { tripped, openAttempt, stalledBy, stop: () => clearInterval(timer) };
}
var openUnwatchedAttempt = (parent) => parent ?? new AbortController().signal;
async function observeRenderStage(recorder, phase, data, fn, options = {}) {
  const heartbeatMessage = options.heartbeatMessage ?? "stage still running";
  const startedAt = recorder.stageStart(phase, data);
  let heartbeatCount = 0;
  let lastFiredAtMs = 0;
  let heartbeatTimer;
  const scheduleNextHeartbeat = () => {
    const targetMs = heartbeatTargetMs(heartbeatCount);
    heartbeatTimer = setTimeout(() => {
      lastFiredAtMs = targetMs;
      heartbeatCount += 1;
      recorder.checkpoint(phase, heartbeatMessage, {
        ...data,
        heartbeatIndex: heartbeatCount,
        stageElapsedMs: Date.now() - startedAt
      });
      scheduleNextHeartbeat();
    }, targetMs - lastFiredAtMs);
    heartbeatTimer.unref?.();
  };
  scheduleNextHeartbeat();
  const stall = options.stall ? watchStall(phase, options.stall) : void 0;
  const clearHeartbeats = () => {
    clearTimeout(heartbeatTimer);
    stall?.stop();
  };
  try {
    const run = fn(stall?.openAttempt ?? openUnwatchedAttempt);
    const result = await (stall ? Promise.race([run, stall.tripped]) : run);
    clearHeartbeats();
    recorder.stageEnd(phase, startedAt, data);
    return result;
  } catch (caught) {
    const error = stall?.stalledBy() ?? caught;
    clearHeartbeats();
    recorder.stageError(phase, startedAt, error, data);
    throw error;
  }
}

// src/services/render/videoFrameCoverage.ts
import { parseHTML } from "linkedom";
import {
  fpsToNumber as fpsToNumber5,
  normalizeRateSpec,
  sourceTimeAt,
  toFps
} from "@hyperframes/core";
import {
  extractionFrameCountForDuration,
  resolvePlayableVideoDuration
} from "@hyperframes/engine";

// src/services/render/stages/compileStage.ts
import { join as join7 } from "node:path";
import { suggestMatchingPreset } from "@hyperframes/core";

// src/services/htmlCompiler.ts
import { decodedUrlPath } from "@hyperframes/parsers/asset-paths";
import { createHash as createHash4 } from "node:crypto";
import { createReadStream as createReadStream2, existsSync as existsSync6, mkdirSync as mkdirSync4, readFileSync as readFileSync4 } from "fs";
import { join as join6, dirname as dirname5, resolve as resolve6, basename as basename3, relative as relative2 } from "path";
import { parseHTML as parseHTML5 } from "linkedom";
import {
  COMPOSITION_SOURCE_URL,
  compileTimingAttrs,
  injectDurations,
  extractResolvedMedia,
  clampDurations,
  shouldClampResolvedMediaDuration,
  CSS_URL_RE,
  isNonRelativeUrl,
  parseStrictFiniteTimingNumber,
  readMediaStart,
  redactTelemetryString as redactTelemetryString2,
  resolveNaturalMediaTimelineDurationFromValues,
  rewriteAssetPath,
  rewriteAssetPaths,
  rewriteCssAssetUrls,
  rewriteInlineStyleAssetUrls
} from "@hyperframes/core";
import { MAX_AUDIO_GAIN } from "@hyperframes/core/audio-gain";
import { readPlaybackRate } from "@hyperframes/parsers/media-duration";
import { resolveRateSpec } from "@hyperframes/core/speed-ramp";
import { gsapCdnDist, normalizeGsapBaseUrl } from "@hyperframes/core/gsap-cdn";
import {
  assignBundledRuntimeCompositionIds,
  assignMediaRenderIds,
  emitVariablesByCompScript,
  inlineSubCompositions as inlineSubCompositionsShared,
  ensureExternalLinkTag,
  ensureExternalScriptTag,
  deferScriptsUntilFonts,
  emitMountedModuleScripts,
  isJavaScriptType,
  prepareFlattenedInnerRoot,
  emitRootCompositionVariableStyles,
  readDeclaredDefaults,
  parseHostVariableValues,
  headStyleRuns,
  isAlwaysAppliedStyle,
  dedupeFontFaceRules,
  inlineScriptRuns,
  parsesAsScript,
  styleElementsFor,
  insertBeforeCloseTag,
  isRuntimeFileUrl
} from "@hyperframes/core/compiler";
import {
  checkSubCompositionUsability
} from "@hyperframes/parsers/sub-composition-validity";
import {
  isUnresolvedAssetPlaceholder,
  readProjectFile
} from "@hyperframes/parsers/asset-resolution";

// src/services/renderMediaCollector.ts
import { parseHTML as parseHTML2 } from "linkedom";
import {
  MEDIA_RENDER_ID_ATTR,
  normalizeRateSpec as normalizeRateSpec2,
  resolveAuthoredTimingWindow,
  shiftRateLane,
  sourceTimeAt as sourceTimeAt2
} from "@hyperframes/core";
import {
  MEDIA_START_BASIS_ATTR,
  compositionOriginSeconds,
  cutToHostSlots,
  hostInPointSeconds,
  readMediaStartBasis,
  resolveAbsoluteMediaStartSeconds
} from "@hyperframes/core/media-timing";
import {
  parseVideoElements,
  parseImageElements,
  parseAudioElements,
  isSelfOrAncestorHidden,
  resolveReferencedStart
} from "@hyperframes/engine";
function resolveHostEnd(host, hostStart) {
  return resolveAuthoredTimingWindow({
    start: hostStart,
    duration: host.getAttribute("data-duration"),
    end: host.getAttribute("data-end")
  })?.end ?? null;
}
var ROOT_WINDOW = { offset: 0, limit: Infinity, basis: "local", slots: [] };
var COMPOSITION_HOST_SELECTOR = "[data-composition-id], [data-composition-src], [data-composition-file]";
function enclosingHosts(element) {
  const hosts = [];
  for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor.matches(COMPOSITION_HOST_SELECTOR)) {
      hosts.unshift(ancestor);
    }
  }
  return hosts;
}
function resolveHostWindow(element, document2, startCache, visiting) {
  const hosts = enclosingHosts(element);
  if (hosts.length === 0) return ROOT_WINDOW;
  let offset = 0;
  let limit = Infinity;
  const slots = [];
  for (const [index, host] of hosts.entries()) {
    const hostStart = resolveReferencedStart(document2, host, startCache, visiting);
    const hostEnd = resolveHostEnd(host, hostStart);
    if (hostEnd != null && !isRootComposition(host, index)) {
      limit = Math.min(limit, offset + hostEnd);
    }
    if (hostInPointSeconds(host) > 0) {
      slots.push({ start: offset + hostStart, end: offset + (hostEnd ?? Infinity) });
    }
    offset += compositionOriginSeconds(hostStart, host);
  }
  return { offset, limit, basis: mediaStartBasis(element), slots };
}
var isRootComposition = (host, depth) => depth === 0 && !host.matches("[data-composition-src], [data-composition-file]");
function mediaStartBasis(element) {
  const tag = element.tagName.toLowerCase();
  return tag === "video" || tag === "audio" ? readMediaStartBasis(element.getAttribute(MEDIA_START_BASIS_ATTR)) : "local";
}
function collectHostWindows(html) {
  const { document: document2 } = parseHTML2(html);
  const windows = /* @__PURE__ */ new Map();
  const startCache = /* @__PURE__ */ new Map();
  const visiting = /* @__PURE__ */ new Set();
  for (const element of document2.querySelectorAll("video, audio, img[src]")) {
    const renderId = element.getAttribute(MEDIA_RENDER_ID_ATTR);
    const id = renderId || element.getAttribute("id");
    if (!id || !renderId && windows.has(id)) continue;
    windows.set(
      id,
      resolveHostWindow(element, document2, startCache, visiting)
    );
  }
  return windows;
}
function collectHiddenVideoIds(html) {
  const { document: document2 } = parseHTML2(html);
  const hidden = /* @__PURE__ */ new Set();
  for (const element of document2.querySelectorAll("video")) {
    const id = element.getAttribute(MEDIA_RENDER_ID_ATTR) || element.getAttribute("id");
    if (id && isSelfOrAncestorHidden(element)) hidden.add(id);
  }
  return hidden;
}
function toAbsoluteWindow(start, end, window2) {
  const absoluteStart = resolveAbsoluteMediaStartSeconds({
    authoredStart: start,
    hostStart: window2.offset,
    basis: window2.basis
  });
  if (absoluteStart >= window2.limit) return null;
  const absoluteEnd = resolveAbsoluteMediaStartSeconds({
    authoredStart: end,
    hostStart: window2.offset,
    basis: window2.basis
  });
  const absolute = { start: absoluteStart, end: Math.min(absoluteEnd, window2.limit) };
  const played = cutToHostSlots(absolute, window2.slots);
  if (played.end === played.start && absolute.end > absolute.start) return null;
  return { start: absolute.start, end: played.end, played };
}
function startAtPlayed(clip, played) {
  const head = played.start - clip.start;
  if (head <= 0) return clip;
  if ("loop" in clip && clip.loop) return { ...clip, start: played.start };
  const rate = normalizeRateSpec2(clip.playbackRate);
  return {
    ...clip,
    start: played.start,
    mediaStart: clip.mediaStart + sourceTimeAt2(rate, head),
    playbackRate: shiftRateLane(rate, head)
  };
}
function collectRenderMedia(html) {
  const windows = collectHostWindows(html);
  const windowFor = (id) => windows.get(id) ?? ROOT_WINDOW;
  const droppedMediaIds = /* @__PURE__ */ new Set();
  const hiddenIds = collectHiddenVideoIds(html);
  const videos = [];
  for (const video of parseVideoElements(html)) {
    if (hiddenIds.has(video.id)) {
      droppedMediaIds.add(video.id);
      continue;
    }
    const absolute = toAbsoluteWindow(video.start, video.end, windowFor(video.id));
    if (!absolute) {
      droppedMediaIds.add(video.id);
      continue;
    }
    videos.push(
      startAtPlayed({ ...video, start: absolute.start, end: absolute.end }, absolute.played)
    );
  }
  const images = [];
  for (const image of parseImageElements(html)) {
    const absolute = toAbsoluteWindow(image.start, image.end, windowFor(image.id));
    if (absolute) images.push({ ...image, start: absolute.start, end: absolute.end });
    else droppedMediaIds.add(image.id);
  }
  const audios = [];
  for (const audio of parseAudioElements(html)) {
    const elementId = audio.type === "video" ? audio.id.replace(/-audio$/, "") : audio.id;
    const placed = placeAudio(audio, windowFor(elementId));
    if (placed) audios.push(placed);
    else droppedMediaIds.add(elementId);
  }
  return { videos, audios, images, droppedMediaIds };
}
function placeAudio(audio, window2) {
  const authoredEnd = audio.end > 0 ? audio.end : Infinity;
  const absolute = toAbsoluteWindow(audio.start, authoredEnd, window2);
  if (!absolute) return null;
  const end = Number.isFinite(absolute.end) ? absolute.end : 0;
  return startAtPlayed({ ...audio, start: absolute.start, end }, absolute.played);
}

// src/services/htmlCompiler.ts
import {
  analyzeKeyframeIntervals,
  assertMediaPayload,
  NotMediaPayloadError as NotMediaPayloadError2,
  parseMasterFxChain,
  probeMediaProfile as probeMediaProfile2
} from "@hyperframes/engine";

// src/utils/urlDownloader.ts
import {
  downloadToTemp,
  fetchPublicHttpsText,
  isHttpUrl,
  safeDownloadUrlIdentity,
  writeUrlDownloadTelemetry
} from "@hyperframes/engine";

// src/services/htmlCompiler.ts
import {
  injectDeterministicFontFaces,
  normalizeSystemFontPrimaryFamilies
} from "@hyperframes/core/fonts/embed";

// src/services/animatedGifPrep.ts
import { createHash as createHash2 } from "node:crypto";
import { copyFileSync as copyFileSync2, existsSync as existsSync4, mkdirSync as mkdirSync2, readFileSync as readFileSync2, rmSync as rmSync2, statSync as statSync2 } from "node:fs";
import { dirname as dirname3, isAbsolute as isAbsolute2, join as join4, resolve as resolve4 } from "node:path";
import { parseHTML as parseHTML3 } from "linkedom";
import { parseAnimatedGifMetadata } from "@hyperframes/core";
import { DEFAULT_VP9_CPU_USED, runFfmpeg as runFfmpeg2, renameWithRetry as renameWithRetry3 } from "@hyperframes/engine";
var PREPARED_GIF_SUBDIR = "_animated_gif";
var CACHE_SCHEMA = "hfgif-v1";
function splitUrlSuffix(src) {
  const queryIdx = src.indexOf("?");
  const hashIdx = src.indexOf("#");
  if (queryIdx < 0 && hashIdx < 0) return { basePath: src, suffix: "" };
  const cutIdx = queryIdx < 0 ? hashIdx : hashIdx < 0 ? queryIdx : Math.min(queryIdx, hashIdx);
  return { basePath: src.slice(0, cutIdx), suffix: src.slice(cutIdx) };
}
function normalizeRelPath(path) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}
function hasGifExtension(src) {
  const { basePath } = splitUrlSuffix(src.trim().toLowerCase());
  return basePath.endsWith(".gif");
}
function readLoopOverride(el) {
  const raw = el.getAttribute("data-loop");
  if (raw == null) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "" || normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return null;
}
function resolveLocalImageSourcePath(src, options) {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith("data:")) return null;
  const { basePath } = splitUrlSuffix(trimmed);
  const normalizedBase = normalizeRelPath(basePath);
  const mapped = options.sourceAssets?.get(trimmed) ?? options.sourceAssets?.get(basePath) ?? options.sourceAssets?.get(normalizedBase);
  if (mapped && existsSync4(mapped)) return mapped;
  if (isHttpUrl(trimmed)) return null;
  const projectRelative = basePath.startsWith("/") ? basePath.slice(1) : basePath;
  const candidates = [
    isAbsolute2(basePath) ? basePath : resolve4(options.projectDir, projectRelative),
    resolve4(options.downloadDir, normalizedBase)
  ];
  return candidates.find((candidate) => existsSync4(candidate)) ?? null;
}
function isUsableFile(path) {
  try {
    const stat = statSync2(path);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}
function computePreparedGifHash(bytes, loopIterations, padSeconds) {
  return createHash2("sha256").update(CACHE_SCHEMA).update("\0").update(String(loopIterations)).update("\0").update(String(padSeconds)).update("\0").update(bytes).digest("hex");
}
function resolveLoop(metadata, override) {
  if (override != null) return override;
  return metadata.loopCount === 0;
}
var MAX_LOOP_ITERATIONS = 1e3;
var MAX_PAD_SECONDS = 3600;
function resolveCompositionDurationSeconds(document2) {
  let max = null;
  for (const el of Array.from(document2.querySelectorAll("[data-composition-id][data-duration]"))) {
    const value = Number.parseFloat(el.getAttribute("data-duration") || "");
    if (Number.isFinite(value) && value > 0) {
      max = max == null ? value : Math.max(max, value);
    }
  }
  return max;
}
function resolveClipWindowSeconds(img, compositionDuration) {
  const durationRaw = img.getAttribute("data-duration");
  if (durationRaw != null) {
    const duration = Number.parseFloat(durationRaw);
    if (Number.isFinite(duration) && duration > 0) return duration;
  }
  if (compositionDuration != null) {
    const startRaw = Number.parseFloat(img.getAttribute("data-start") || "0");
    const start = Number.isFinite(startRaw) && startRaw > 0 ? startRaw : 0;
    const window2 = compositionDuration - start;
    return window2 > 0 ? window2 : null;
  }
  return null;
}
function resolvePreparedPlayback(metadata, loopOverride, windowSeconds) {
  const gifDuration = metadata.durationSeconds > 0 ? metadata.durationSeconds : null;
  let loopIterations = 1;
  if (resolveLoop(metadata, loopOverride)) {
    loopIterations = windowSeconds != null && gifDuration != null ? Math.min(MAX_LOOP_ITERATIONS, Math.max(1, Math.ceil(windowSeconds / gifDuration))) : 1;
  } else if (loopOverride == null && metadata.loopCount != null && metadata.loopCount > 1) {
    loopIterations = Math.min(MAX_LOOP_ITERATIONS, metadata.loopCount);
  }
  let padSeconds = 0;
  if (windowSeconds != null && gifDuration != null) {
    const covered = gifDuration * loopIterations;
    if (windowSeconds > covered) {
      padSeconds = Math.min(windowSeconds - covered, MAX_PAD_SECONDS);
    }
  }
  return { loopIterations, padSeconds: Math.round(padSeconds * 1e3) / 1e3 };
}
function buildAnimatedGifTranscodeArgs(input) {
  const args = ["-hide_banner", "-loglevel", "error"];
  if (input.loopIterations > 1) {
    args.push("-stream_loop", String(input.loopIterations - 1));
  }
  args.push(
    "-ignore_loop",
    "1",
    "-i",
    input.inputPath,
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-pix_fmt",
    "yuva420p",
    "-auto-alt-ref",
    "0",
    "-deadline",
    "good",
    "-cpu-used",
    String(DEFAULT_VP9_CPU_USED),
    "-crf",
    "18",
    "-b:v",
    "0",
    ...input.padSeconds && input.padSeconds > 0 ? ["-vf", `tpad=stop_mode=clone:stop_duration=${input.padSeconds}`] : [],
    // Explicit muxer: the transcode writes to a `.tmp-<pid>-<ts>` path whose
    // extension ffmpeg cannot infer the container from.
    "-f",
    "webm",
    "-y",
    input.outputPath
  );
  return args;
}
async function runAnimatedGifTranscode(request) {
  const timeout = request.timeoutMs ?? 3e5;
  const result = await runFfmpeg2(request.args, { timeout });
  if (result.success) return;
  if (result.failureReason === "external_interruption") {
    throw encoderFailureError("Animated GIF transcode failed", {
      error: `exit ${result.exitCode}: ${result.stderr.slice(-500)}`,
      failureReason: result.failureReason
    });
  }
  if (result.terminationReason === "inactivity") {
    throw new Error(`Animated GIF transcode timed out after ${timeout}ms`);
  }
  throw result.error ?? new Error(`Animated GIF transcode failed (${result.exitCode}): ${result.stderr.slice(-500)}`);
}
async function ensurePreparedWebm(input) {
  if (!existsSync4(dirname3(input.cachePath))) {
    mkdirSync2(dirname3(input.cachePath), { recursive: true });
  }
  if (!existsSync4(dirname3(input.outputPath))) {
    mkdirSync2(dirname3(input.outputPath), { recursive: true });
  }
  if (!isUsableFile(input.cachePath)) {
    const tmpPath = `${input.cachePath}.tmp-${process.pid}-${Date.now()}`;
    const args = buildAnimatedGifTranscodeArgs({
      inputPath: input.sourcePath,
      outputPath: tmpPath,
      loopIterations: input.loopIterations,
      padSeconds: input.padSeconds
    });
    const transcode = input.transcode ?? runAnimatedGifTranscode;
    try {
      await transcode({
        inputPath: input.sourcePath,
        outputPath: tmpPath,
        args,
        timeoutMs: input.timeoutMs
      });
      if (!isUsableFile(tmpPath)) {
        throw new Error("Animated GIF transcode produced an empty output");
      }
      if (!isUsableFile(input.cachePath)) {
        renameWithRetry3(tmpPath, input.cachePath);
      } else {
        rmSync2(tmpPath, { force: true });
      }
    } catch (error) {
      rmSync2(tmpPath, { force: true });
      throw error;
    }
  }
  if (resolve4(input.outputPath) !== resolve4(input.cachePath) && !isUsableFile(input.outputPath)) {
    copyFileSync2(input.cachePath, input.outputPath);
  }
}
function ensureElementId(el, document2, fallbackIndex) {
  const existing = (el.getAttribute("id") || "").trim();
  if (existing) return existing;
  let next = fallbackIndex;
  while (document2.getElementById(`hf-gif-${next}`)) next += 1;
  const id = `hf-gif-${next}`;
  el.setAttribute("id", id);
  return id;
}
function ensureTimingAttributes(video) {
  if (!video.hasAttribute("data-start")) {
    video.setAttribute("data-start", "0");
  }
  if (!video.hasAttribute("data-end")) {
    const durationRaw = video.getAttribute("data-duration");
    if (durationRaw != null) {
      const start = Number.parseFloat(video.getAttribute("data-start") || "0");
      const duration = Number.parseFloat(durationRaw);
      if (Number.isFinite(start) && Number.isFinite(duration) && duration > 0) {
        video.setAttribute("data-end", String(start + duration));
      }
    }
  }
}
function replaceImageWithVideo(input) {
  const document2 = input.img.ownerDocument;
  const video = document2.createElement("video");
  for (const attr of Array.from(input.img.attributes)) {
    if (attr.name === "src") continue;
    video.setAttribute(attr.name, attr.value);
  }
  video.setAttribute("id", input.id);
  video.setAttribute("src", input.outputSrc);
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("preload", "auto");
  video.setAttribute("data-has-audio", "false");
  video.setAttribute("data-hf-prepared-gif", "true");
  if (input.loop) {
    video.setAttribute("loop", "");
  } else {
    video.removeAttribute("loop");
  }
  ensureTimingAttributes(video);
  input.img.replaceWith(video);
  return video;
}
async function prepareAnimatedGifInputs(html, options) {
  const outputDir = options.outputDir ?? join4(options.downloadDir, PREPARED_GIF_SUBDIR);
  const outputSrcPrefix = normalizeRelPath(options.outputSrcPrefix ?? PREPARED_GIF_SUBDIR);
  const cacheDir = options.cacheDir ?? outputDir;
  const { document: document2 } = parseHTML3(html);
  const preparedAssets = /* @__PURE__ */ new Map();
  const preparedGifs = [];
  const images = Array.from(document2.querySelectorAll("img[src]"));
  const compositionDuration = resolveCompositionDurationSeconds(document2);
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const src = (img.getAttribute("src") || "").trim();
    if (!hasGifExtension(src)) continue;
    const sourcePath = resolveLocalImageSourcePath(src, options);
    if (!sourcePath) continue;
    const bytes = readFileSync2(sourcePath);
    const metadata = parseAnimatedGifMetadata(bytes);
    if (!metadata?.animated) continue;
    const loopOverride = readLoopOverride(img);
    const loop = resolveLoop(metadata, loopOverride);
    const windowSeconds = resolveClipWindowSeconds(img, compositionDuration);
    const { loopIterations, padSeconds } = resolvePreparedPlayback(
      metadata,
      loopOverride,
      windowSeconds
    );
    const hash = computePreparedGifHash(bytes, loopIterations, padSeconds);
    const filename = `${CACHE_SCHEMA}-${hash.slice(0, 24)}.webm`;
    const cachePath = join4(cacheDir, filename);
    const outputPath = join4(outputDir, filename);
    const outputSrc = `${outputSrcPrefix}/${filename}`;
    await ensurePreparedWebm({
      sourcePath,
      cachePath,
      outputPath,
      loopIterations,
      padSeconds,
      timeoutMs: options.timeoutMs,
      transcode: options.transcode
    });
    const id = ensureElementId(img, document2, i);
    replaceImageWithVideo({ img, id, outputSrc, loop });
    preparedAssets.set(outputSrc, outputPath);
    preparedGifs.push({
      id,
      sourceSrc: src,
      outputSrc,
      outputPath,
      metadata,
      loop,
      loopIterations,
      padSeconds
    });
  }
  return {
    html: preparedGifs.length > 0 ? document2.toString() : html,
    preparedAssets,
    preparedGifs
  };
}

// src/services/heifImagePrep.ts
import { createHash as createHash3 } from "node:crypto";
import {
  closeSync as closeSync2,
  copyFileSync as copyFileSync3,
  mkdirSync as mkdirSync3,
  openSync as openSync2,
  readFileSync as readFileSync3,
  readSync,
  rmSync as rmSync3,
  statSync as statSync3,
  writeFileSync as writeFileSync2
} from "node:fs";
import { dirname as dirname4, join as join5, resolve as resolve5 } from "node:path";
import { parseHTML as parseHTML4 } from "linkedom";
import { renameWithRetry as renameWithRetry4, runFfmpeg as runFfmpeg3, runFfprobe } from "@hyperframes/engine";

// src/services/heifRotation.ts
function* boxes(buf, start, end) {
  let at = start;
  while (at + 8 <= end) {
    let size = buf.readUInt32BE(at);
    let header = 8;
    if (size === 1 && at + 16 <= end) {
      size = Number(buf.readBigUInt64BE(at + 8));
      header = 16;
    } else if (size === 0) {
      size = end - at;
    }
    if (size < header || at + size > end) return;
    yield { type: buf.toString("latin1", at + 4, at + 8), start: at + header, end: at + size };
    at += size;
  }
}
function child(buf, parent, type, skip = 0) {
  return [...boxes(buf, parent.start + skip, parent.end)].filter((box2) => box2.type === type);
}
function readHeifPrimaryRotation(buf) {
  try {
    const root = { type: "", start: 0, end: buf.length };
    const meta = child(buf, root, "meta")[0];
    const pitm = meta && child(buf, meta, "pitm", 4)[0];
    const iprp = meta && child(buf, meta, "iprp", 4)[0];
    const ipco = iprp && child(buf, iprp, "ipco")[0];
    if (!pitm || !ipco || !iprp) return 0;
    const primaryId = buf[pitm.start] === 0 ? buf.readUInt16BE(pitm.start + 4) : buf.readUInt32BE(pitm.start + 4);
    const props = [...boxes(buf, ipco.start, ipco.end)];
    for (const ipma of child(buf, iprp, "ipma")) {
      const version = buf[ipma.start];
      const wide = (buf[ipma.start + 3] & 1) === 1;
      let at = ipma.start + 8;
      for (let n = buf.readUInt32BE(ipma.start + 4); n > 0 && at < ipma.end; n--) {
        const id = version < 1 ? buf.readUInt16BE(at) : buf.readUInt32BE(at);
        at += version < 1 ? 2 : 4;
        const count = buf[at++];
        for (let i = 0; i < count; i++) {
          const index = wide ? buf.readUInt16BE(at) & 32767 : buf[at] & 127;
          at += wide ? 2 : 1;
          const prop = props[index - 1];
          if (id === primaryId && prop?.type === "irot")
            return (buf[prop.start] & 3) * 90;
        }
      }
    }
  } catch {
  }
  return 0;
}

// src/utils/semaphore.ts
var Semaphore = class {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
  }
  maxConcurrent;
  queue = [];
  active = 0;
  async acquire() {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return () => this.release();
    }
    return new Promise((resolve10) => {
      this.queue.push(() => {
        this.active++;
        resolve10(() => this.release());
      });
    });
  }
  release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
  /** Current number of active slots. */
  get activeCount() {
    return this.active;
  }
  /** Number of waiters in the queue. */
  get waitingCount() {
    return this.queue.length;
  }
};

// src/utils/mediaProbeConcurrency.ts
var MEDIA_PROBE_CONCURRENCY = 4;
var sharedMediaProbeSemaphore = new Semaphore(MEDIA_PROBE_CONCURRENCY);
async function withMediaProbeSlot(operation) {
  const release = await sharedMediaProbeSemaphore.acquire();
  try {
    return await operation();
  } finally {
    release();
  }
}

// src/services/heifImagePrep.ts
var PREPARED_HEIF_SUBDIR = "_heif_images";
var CACHE_SCHEMA2 = "hfheif-v1";
var DEFAULT_TIMEOUT_MS = 12e4;
var HEIF_IMAGE_CONVERSION_FAILED = "HEIF_IMAGE_CONVERSION_FAILED";
var HEIF_TOOL_UNAVAILABLE = "HEIF_TOOL_UNAVAILABLE";
var HEIF_BRANDS = /* @__PURE__ */ new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"]);
var AVIF_BRANDS = /* @__PURE__ */ new Set(["avif", "avis"]);
var DATA_URL_RE = /^data:image\/(?:heic|heif)(?:-sequence)?;base64,(.*)$/is;
var HeifImageConversionError = class extends Error {
  code = HEIF_IMAGE_CONVERSION_FAILED;
  owner = "user";
  retryable = false;
  constructor(label, reason) {
    super(
      `Could not convert HEIC/HEIF image ${label} to JPEG: ${reason}. Re-export the photo as JPEG or PNG and update its src.`
    );
    this.name = "HeifImageConversionError";
  }
};
var HeifToolUnavailableError = class extends Error {
  code = HEIF_TOOL_UNAVAILABLE;
  owner = "system";
  retryable = false;
  constructor(label, reason) {
    super(
      `Could not convert HEIC/HEIF image ${label}: ${reason}. Converting HEIC needs ffmpeg and ffprobe 7.0 or newer with the hevc decoder.`
    );
    this.name = "HeifToolUnavailableError";
  }
};
var TOOL_FAILURE_RE = /(?:ffmpeg|ffprobe) not found|ENOENT|Option not found|Unrecognized option|Unknown decoder|Decoder \S+ not found/i;
function isHeifBytes(head) {
  const bytes = Buffer.from(head.buffer, head.byteOffset, head.byteLength);
  if (bytes.length < 16 || bytes.toString("ascii", 4, 8) !== "ftyp") return false;
  const boxEnd = Math.min(bytes.readUInt32BE(0), bytes.length);
  if (boxEnd < 16) return false;
  const brands = [bytes.toString("ascii", 8, 12)];
  for (let offset = 16; offset + 4 <= boxEnd; offset += 4) {
    brands.push(bytes.toString("ascii", offset, offset + 4));
  }
  return !brands.some((b) => AVIF_BRANDS.has(b)) && brands.some((b) => HEIF_BRANDS.has(b));
}
function readHead(path) {
  let fd;
  try {
    fd = openSync2(path, "r");
    const buf = Buffer.alloc(4096);
    return buf.subarray(0, readSync(fd, buf, 0, buf.length, 0));
  } catch {
    return null;
  } finally {
    if (fd !== void 0) closeSync2(fd);
  }
}
async function probeJson(path, withGroups) {
  const stdout = await runFfprobe(
    path,
    withGroups ? ["-show_stream_groups", "-show_streams", "-of", "json"] : ["-show_streams", "-of", "json"]
  );
  return JSON.parse(stdout);
}
var ROTATION_FILTER = {
  0: "",
  90: "transpose=2",
  180: "hflip,vflip",
  270: "transpose=1"
};
function primaryGrid(probed) {
  const groups = probed.stream_groups ?? [];
  return (groups.find((g) => g.disposition?.default === 1) ?? groups[0])?.components?.[0];
}
async function convertHeifToJpeg(request) {
  const probed = await probeJson(request.inputPath, true);
  const grid = primaryGrid(probed);
  const rotation = readHeifPrimaryRotation(readFileSync3(request.inputPath));
  const filters = [];
  let inputs = [];
  let size = probed.streams?.[0];
  if (grid?.subcomponents?.length) {
    size = grid;
    const layout = grid.subcomponents.map(
      (t) => `${t.tile_horizontal_offset}_${t.tile_vertical_offset}`
    );
    inputs = grid.subcomponents.map((t) => `[0:${t.stream_index}]`);
    filters.push(
      `${inputs.join("")}xstack=inputs=${inputs.length}:layout=${layout.join("|")}`,
      `crop=${grid.width}:${grid.height}:${grid.horizontal_offset ?? 0}:${grid.vertical_offset ?? 0}`
    );
  }
  if (!size?.width || !size.height) throw new Error("no declared image size");
  if (rotation && grid) filters.push(ROTATION_FILTER[rotation]);
  const mapArgs = filters.length > 0 ? ["-filter_complex", `${filters.join(",")}[v]`, "-map", "[v]"] : [];
  const result = await runFfmpeg3(
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      request.inputPath,
      ...mapArgs,
      "-frames:v",
      "1",
      "-q:v",
      "2",
      "-f",
      "mjpeg",
      "-y",
      request.outputPath
    ],
    { timeout: request.timeoutMs ?? DEFAULT_TIMEOUT_MS }
  );
  if (!result.success) {
    throw result.error ?? new Error(`ffmpeg exited ${result.exitCode}: ${result.stderr.slice(-300)}`);
  }
  const out = (await probeJson(request.outputPath, false)).streams?.[0];
  const same = out?.width === size.width && out.height === size.height;
  const swapped = out?.width === size.height && out.height === size.width;
  if (!same && !swapped) {
    throw new Error(
      `wrong size: decoded ${out?.width}x${out?.height}, file declares ${size.width}x${size.height}`
    );
  }
}
function resolveImageSource(src, options) {
  const data = DATA_URL_RE.exec(src);
  if (data) {
    const bytes = Buffer.from(data[1], "base64");
    return isHeifBytes(bytes.subarray(0, 4096)) ? { path: null, bytes, label: '"inline image"' } : null;
  }
  const path = resolveLocalImageSourcePath(src, options);
  const head = path ? readHead(path) : null;
  if (!path || !head || !isHeifBytes(head)) return null;
  return { path, bytes: readFileSync3(path), label: `"${splitUrlSuffix(src).basePath}"` };
}
function isUsableFile2(path) {
  try {
    return statSync3(path).size > 0;
  } catch {
    return false;
  }
}
async function ensurePreparedJpeg(source, cachePath, outputPath, options) {
  mkdirSync3(dirname4(cachePath), { recursive: true });
  mkdirSync3(dirname4(outputPath), { recursive: true });
  if (!isUsableFile2(cachePath)) {
    const tmpPath = `${cachePath}.tmp-${process.pid}-${Date.now()}`;
    const inlinePath = `${tmpPath}.heic`;
    const inputPath = source.path ?? inlinePath;
    try {
      if (!source.path) writeFileSync2(inlinePath, source.bytes);
      await (options.transcode ?? convertHeifToJpeg)({
        inputPath,
        outputPath: tmpPath,
        timeoutMs: options.timeoutMs
      });
      if (!isUsableFile2(tmpPath)) throw new Error("conversion produced an empty file");
      renameWithRetry4(tmpPath, cachePath);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw TOOL_FAILURE_RE.test(reason) ? new HeifToolUnavailableError(source.label, reason) : new HeifImageConversionError(source.label, reason);
    } finally {
      rmSync3(tmpPath, { force: true });
      rmSync3(inlinePath, { force: true });
    }
  }
  if (resolve5(outputPath) !== resolve5(cachePath) && !isUsableFile2(outputPath)) {
    copyFileSync3(cachePath, outputPath);
  }
}
async function prepareHeifImageInputs(html, options) {
  const outputDir = options.outputDir ?? join5(options.downloadDir, PREPARED_HEIF_SUBDIR);
  const outputSrcPrefix = normalizeRelPath(options.outputSrcPrefix ?? PREPARED_HEIF_SUBDIR);
  const cacheDir = options.cacheDir ?? outputDir;
  const preparedAssets = /* @__PURE__ */ new Map();
  const preparedImages = [];
  if (!/<img\b/i.test(html)) return { html, preparedAssets, preparedImages };
  const { document: document2 } = parseHTML4(html);
  const found = [];
  for (const img of Array.from(document2.querySelectorAll("img[src]"))) {
    const src = (img.getAttribute("src") || "").trim();
    const source = src ? resolveImageSource(src, options) : null;
    if (!source) continue;
    const hash = createHash3("sha256").update(CACHE_SCHEMA2).update("\0").update(source.bytes).digest("hex");
    found.push({ img, src, source, filename: `${CACHE_SCHEMA2}-${hash.slice(0, 24)}.jpg` });
  }
  if (found.length === 0) return { html, preparedAssets, preparedImages };
  const unique = new Map(found.map((item) => [item.filename, item.source]));
  const failed = /* @__PURE__ */ new Set();
  await Promise.all(
    [...unique].map(
      ([filename, source]) => withMediaProbeSlot(
        () => ensurePreparedJpeg(source, join5(cacheDir, filename), join5(outputDir, filename), options)
      ).catch((error) => {
        if (!options.onFailure) throw error;
        failed.add(filename);
        options.onFailure(error);
      })
    )
  );
  for (const { img, src, filename } of found) {
    if (failed.has(filename)) continue;
    const outputSrc = `${outputSrcPrefix}/${filename}`;
    img.setAttribute("src", outputSrc);
    preparedAssets.set(outputSrc, join5(outputDir, filename));
    preparedImages.push({ sourceSrc: src, outputSrc, outputPath: join5(outputDir, filename) });
  }
  return { html: document2.toString(), preparedAssets, preparedImages };
}

// src/services/htmlCompiler.ts
import { createStudioPositionSeekReapplyScript } from "@hyperframes/studio-server/manual-edits-render-script";
import { getPositionEditsRenderScript } from "@hyperframes/core/runtime/position-edits-render";

// src/services/assetMediaType.ts
import { existsSync as existsSync5 } from "node:fs";
import {
  fingerprintElementId,
  isNotMediaPayload,
  NotMediaPayloadError,
  probeMediaProfile,
  resolveProjectRelativeSrc as resolveProjectRelativeSrc2
} from "@hyperframes/engine";
var ASSET_MEDIA_TYPE_MISMATCH = "ASSET_MEDIA_TYPE_MISMATCH";
var AssetMediaTypeMismatchError = class extends Error {
  code = ASSET_MEDIA_TYPE_MISMATCH;
  owner = "user";
  retryable = false;
  mismatches;
  constructor(mismatches) {
    const expectedKinds = [...new Set(mismatches.map((item) => item.expected))].sort().join(",");
    super(
      `${mismatches.length} composition asset(s) do not match their authored media element type` + (expectedKinds ? ` (expected: ${expectedKinds})` : "")
    );
    this.name = "AssetMediaTypeMismatchError";
    this.mismatches = mismatches;
  }
};
function detectedAssetMediaType(profile) {
  if (profile.visualKind === "moving") return "video";
  if (profile.visualKind === "still") return "image";
  if (profile.hasAudioStream) return "audio";
  return "unknown";
}
function mediaProfileMatchesElementType(expected, profile) {
  if (expected === "audio") return profile.hasAudioStream;
  if (expected === "image") return profile.visualKind === "still";
  return profile.visualKind === "moving";
}
function assertAssetMediaTypeProfile(expected, profile, elementIdentity) {
  if (mediaProfileMatchesElementType(expected, profile)) return;
  throw new AssetMediaTypeMismatchError([
    {
      expected,
      detected: detectedAssetMediaType(profile),
      elementFingerprint: fingerprintElementId(elementIdentity)
    }
  ]);
}
function isRemoteOrInlineSource(src) {
  return /^(?:https?:|data:|blob:|about:)/i.test(src.trim());
}
async function preflightCompositionAssetMediaTypes(input) {
  const references = [
    ...input.composition.videos.map((asset) => ({
      id: asset.id,
      src: asset.src,
      expected: "video"
    })),
    ...input.composition.audios.map((asset) => ({
      id: asset.id,
      src: asset.src,
      expected: "audio"
    })),
    ...input.composition.images.map((asset) => ({
      id: asset.id,
      src: asset.src,
      expected: "image"
    }))
  ];
  const byPath = /* @__PURE__ */ new Map();
  for (const reference of references) {
    if (!reference.src || isRemoteOrInlineSource(reference.src)) continue;
    const resolvedPath = resolveProjectRelativeSrc2(
      reference.src,
      input.projectDir,
      input.compiledDir
    );
    if (!existsSync5(resolvedPath)) continue;
    byPath.set(resolvedPath, [...byPath.get(resolvedPath) ?? [], reference]);
  }
  const mismatches = [];
  const notMediaFingerprints = [];
  const entries = [...byPath];
  await Promise.all(
    entries.map(
      ([resolvedPath, pathReferences]) => withMediaProbeSlot(async () => {
        const sniffableReferences = pathReferences.filter((ref) => ref.expected === "video");
        if (sniffableReferences.length > 0 && await isNotMediaPayload(resolvedPath)) {
          notMediaFingerprints.push(
            ...sniffableReferences.map((ref) => fingerprintElementId(ref.id))
          );
          return;
        }
        let profile;
        try {
          profile = await probeMediaProfile(resolvedPath, { signal: input.signal });
        } catch (error) {
          if (input.signal?.aborted) throw input.signal.reason ?? error;
          return;
        }
        for (const reference of pathReferences) {
          if (mediaProfileMatchesElementType(reference.expected, profile)) continue;
          mismatches.push({
            expected: reference.expected,
            detected: detectedAssetMediaType(profile),
            elementFingerprint: fingerprintElementId(reference.id)
          });
        }
      })
    )
  );
  if (notMediaFingerprints.length > 0) throw new NotMediaPayloadError(notMediaFingerprints);
  if (mismatches.length > 0) throw new AssetMediaTypeMismatchError(mismatches);
}

// src/services/htmlCompiler.ts
function logRemoteDownloadTelemetry(event) {
  defaultLogger.info("[Compiler] Remote asset download integrity", { ...event });
}
var INFERRED_MEDIA_DURATION_ATTR = "data-hf-inferred-duration";
function parseSubCompHtmlForValidity(html) {
  return parseHTML5(html).document;
}
function endsWithSourceUrl(code) {
  const trimmed = code.trimEnd();
  const lastLine = trimmed.slice(trimmed.lastIndexOf("\n") + 1).trimStart();
  return lastLine.startsWith("//# sourceURL=") || lastLine.startsWith("//@ sourceURL=");
}
function prepareCompositionScripts(html) {
  const { document: document2 } = parseHTML5(html);
  for (const el of document2.querySelectorAll("script:not([src])")) {
    const isModule = (el.getAttribute("type") || "").trim().toLowerCase() === "module";
    const runsAsScript = isModule || isJavaScriptType(el);
    const code = el.textContent ?? "";
    if (!runsAsScript || endsWithSourceUrl(code)) continue;
    el.textContent = `${code}
//# sourceURL=${COMPOSITION_SOURCE_URL}`;
  }
  deferScriptsUntilFonts(document2);
  return document2.toString();
}
function injectSdkPositionEditsRenderScript(html) {
  if (!html.includes("data-hf-edit-base-x") && !html.includes("data-hf-edit-base-y")) {
    return html;
  }
  const scriptBody = getPositionEditsRenderScript().replace(/<\/script/gi, "<\\/script");
  const script = `<script>${scriptBody}
//# sourceURL=hyperframes://position-edits</script>`;
  return insertBeforeCloseTag(html, "body", script) ?? `${html}${script}`;
}
var EmptyCompositionError = class extends Error {
  code = "EMPTY_COMPOSITION";
  problems;
  constructor(problems) {
    const lines = problems.map((p) => `  - ${p.srcPath}: ${p.detail}`);
    super(
      `${problems.length} composition file${problems.length === 1 ? "" : "s"} referenced by data-composition-src cannot be rendered:
${lines.join("\n")}

Check that each file referenced by data-composition-src contains valid HTML with a [data-composition-id] element in a <template>, <body>, or bare fragment. If a scene-authoring step is still running, wait for it to finish before referencing the file.`
    );
    this.name = "EmptyCompositionError";
    this.problems = problems;
  }
};
function assertSubCompositionsUsable(html, projectDir, visited = /* @__PURE__ */ new Set()) {
  const { document: document2 } = parseHTML5(html);
  const hosts = [...document2.querySelectorAll("[data-composition-src]")];
  const problems = [];
  for (const el of hosts) {
    const srcPath = el.getAttribute("data-composition-src");
    if (!srcPath) continue;
    if (isUnresolvedAssetPlaceholder(srcPath)) continue;
    const filePath = resolve6(projectDir, srcPath);
    if (visited.has(filePath)) continue;
    const read = readProjectFile(filePath);
    if (read.kind === "missing") {
      problems.push({ srcPath, detail: "the file does not exist" });
      continue;
    }
    if (read.kind === "folder") {
      problems.push({ srcPath, detail: "it is a folder, not an HTML file" });
      continue;
    }
    const fileHtml = read.text;
    const validity = checkSubCompositionUsability(fileHtml, parseSubCompHtmlForValidity);
    if (!validity.ok) {
      problems.push({
        srcPath,
        detail: validity.detail ?? "the file is empty or could not be parsed"
      });
      continue;
    }
    const nestedVisited = new Set(visited);
    nestedVisited.add(filePath);
    try {
      assertSubCompositionsUsable(fileHtml, projectDir, nestedVisited);
    } catch (err) {
      if (err instanceof EmptyCompositionError) {
        problems.push(...err.problems);
      } else {
        throw err;
      }
    }
  }
  if (problems.length > 0) {
    throw new EmptyCompositionError(problems);
  }
}
var INLINE_SCRIPT_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
var COMPILER_MOUNT_BLOCK_START = "/* __HF_COMPILER_MOUNT_START__ */";
var COMPILER_MOUNT_BLOCK_END = "/* __HF_COMPILER_MOUNT_END__ */";
function stripJsComments(source) {
  return source.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}
function stripCompilerMountBootstrap(source) {
  return source.replace(
    new RegExp(
      `${COMPILER_MOUNT_BLOCK_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${COMPILER_MOUNT_BLOCK_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      "g"
    ),
    ""
  );
}
function runtimeRoot(document2) {
  return document2.querySelector('[data-composition-id][data-root="true"]') ?? document2.querySelector("[data-composition-id]");
}
function detectRenderModeHints(html, pageMotionBlur) {
  const reasons = [];
  const { document: document2 } = parseHTML5(html);
  if (document2.querySelector("canvas[layoutsubtree]")) {
    reasons.push({
      code: "htmlInCanvas",
      message: "Detected html-in-canvas API (layoutsubtree canvas). Chrome does not support concurrent drawElementImage across multiple workers; render is pinned to a single worker."
    });
  } else if (pageMotionBlur !== "off" && runtimeRoot(document2)?.getAttribute("data-motion-blur") === "on") {
    reasons.push({
      code: "captureMotionBlur",
      message: 'Detected capture motion blur (data-motion-blur="on"), which draws each frame with html-in-canvas; routed through screenshot capture mode.'
    });
  }
  if (document2.querySelector("iframe")) {
    reasons.push({
      code: "iframe",
      message: "Detected <iframe> in the composition DOM. Nested iframe animation is routed through screenshot capture mode for compatibility."
    });
  }
  let scriptMatch;
  const scriptPattern = new RegExp(INLINE_SCRIPT_PATTERN.source, INLINE_SCRIPT_PATTERN.flags);
  while ((scriptMatch = scriptPattern.exec(html)) !== null) {
    const attrs = scriptMatch[1] || "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const content = stripJsComments(stripCompilerMountBootstrap(scriptMatch[2] || ""));
    if (!/requestAnimationFrame\s*\(/.test(content)) continue;
    reasons.push({
      code: "requestAnimationFrame",
      message: "Detected raw requestAnimationFrame() in an inline script. This render is routed through screenshot capture mode with virtual time enabled."
    });
    break;
  }
  return {
    recommendScreenshot: reasons.length > 0,
    reasons
  };
}
var THREE_D_CONTEXT_PATTERN = /transform-style\s*:\s*preserve-3d|backface-visibility\s*:|perspective\s*:\s*[0-9]|perspective\s*\(|matrix3d\s*\(|rotate3d\s*\(|\btransformPerspective\b/i;
function detectThreeDTransformUsage(html) {
  return THREE_D_CONTEXT_PATTERN.test(html);
}
var BACKGROUND_IMAGE_DECL_PATTERN = /(?:^|;|\{)\s*background(?:-image)?\s*:[^;}]*(?:\bgradient\s*\(|url\s*\()/i;
function detectAncestorBackgroundImage(html) {
  const { document: document2 } = parseHTML5(html);
  const root = document2.querySelector("[data-composition-id]");
  if (!root) return false;
  const ancestors = [];
  for (let el = root.parentElement; el; el = el.parentElement) ancestors.push(el);
  if (document2.documentElement && !ancestors.includes(document2.documentElement)) {
    ancestors.push(document2.documentElement);
  }
  for (const el of ancestors) {
    const style = el.getAttribute("style");
    if (style && BACKGROUND_IMAGE_DECL_PATTERN.test(`{${style}}`)) return true;
  }
  for (const styleEl of document2.querySelectorAll("style")) {
    const css = styleEl.textContent ?? "";
    for (const rule of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const [, selectorList = "", declarations = ""] = rule;
      if (!BACKGROUND_IMAGE_DECL_PATTERN.test(`{${declarations}}`)) continue;
      for (const selector of selectorList.split(",")) {
        const sel = selector.trim();
        if (!sel || sel.startsWith("@")) continue;
        if (/^(?:html|:root)$/i.test(sel)) return true;
        try {
          for (const matched of document2.querySelectorAll(sel)) {
            if (ancestors.includes(matched)) return true;
          }
        } catch {
        }
      }
    }
  }
  return false;
}
var SHADER_TRANSITION_USAGE_PATTERN = /\b(?:(?:window|globalThis)\s*\.\s*)?HyperShader\s*\.\s*init\s*\(|\b__hf\s*\.\s*transitions\s*=/;
function detectShaderTransitionUsage(html) {
  let scriptMatch;
  const scriptPattern = new RegExp(INLINE_SCRIPT_PATTERN.source, INLINE_SCRIPT_PATTERN.flags);
  while ((scriptMatch = scriptPattern.exec(html)) !== null) {
    const attrs = scriptMatch[1] || "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    const content = stripJsComments(stripCompilerMountBootstrap(scriptMatch[2] || ""));
    if (SHADER_TRANSITION_USAGE_PATTERN.test(content)) return true;
  }
  return false;
}
async function resolveMediaDuration(src, mediaStart, playbackRate, baseDir, downloadDir, tagName, elementIdentity, log, urlByAbsentLocalPath, probes) {
  let filePath = src;
  if (isHttpUrl(src)) {
    const remoteDir = join6(downloadDir, REMOTE_MEDIA_SUBDIR);
    if (!existsSync6(remoteDir)) mkdirSync4(remoteDir, { recursive: true });
    try {
      filePath = await downloadToTemp(src, remoteDir, void 0, void 0, void 0, {
        onTelemetry: logRemoteDownloadTelemetry
      });
    } catch {
      return { duration: null, resolvedPath: src };
    }
  } else {
    filePath = decodedUrlPath(src);
    if (!filePath.startsWith("/")) filePath = join6(baseDir, filePath);
    filePath = urlByAbsentLocalPath?.get(filePath) ?? filePath;
  }
  if (!isHttpUrl(filePath) && !existsSync6(filePath)) {
    return { duration: null, resolvedPath: filePath };
  }
  const withSrcContext = (error) => {
    if (error instanceof NotMediaPayloadError2) return error;
    const originalMessage = error instanceof Error ? error.message : String(error);
    const safeSrc = redactTelemetryString2(src);
    const wrapped = new Error(`${originalMessage} [src=${safeSrc}]`);
    if (error instanceof Error && error.stack) wrapped.stack = error.stack;
    return wrapped;
  };
  const probe = () => withMediaProbeSlot(async () => {
    try {
      await assertMediaPayload(filePath, elementIdentity);
      const profile = await probeMediaProfile2(filePath);
      if (tagName === "video") {
        return { profile, fileDuration: (await extractMediaMetadata(filePath)).durationSeconds };
      }
      try {
        return { profile, fileDuration: (await extractAudioMetadata(filePath)).durationSeconds };
      } catch {
        return { profile, fileDuration: null };
      }
    } catch (error) {
      return { error };
    }
  });
  const key = `${tagName}\0${filePath}`;
  let probed = probes?.get(key);
  if (!probed) {
    probed = probe();
    probes?.set(key, probed);
  }
  const outcome = await probed;
  if ("error" in outcome) {
    if (tagName !== "video") {
      if (outcome.error instanceof NotMediaPayloadError2) {
        log?.warn(
          `[compile] Audio "${elementIdentity}" (${src}) is a text document, not a media file, so the element is dropped from the render. Point it at a rendered media file.`
        );
      }
      return { duration: null, resolvedPath: filePath };
    }
    throw withSrcContext(outcome.error);
  }
  assertAssetMediaTypeProfile(
    tagName === "video" ? "video" : "audio",
    outcome.profile,
    elementIdentity
  );
  if (outcome.fileDuration === null) return { duration: null, resolvedPath: filePath };
  const duration = resolveNaturalMediaTimelineDurationFromValues(
    outcome.fileDuration,
    mediaStart,
    playbackRate
  );
  return { duration, resolvedPath: filePath };
}
function markInferredVariableMediaDurations(html, unresolvedMedia) {
  const unresolvedIds = new Set(unresolvedMedia.map((element) => element.id));
  if (unresolvedIds.size === 0) return html;
  const { document: document2 } = parseHTML5(html);
  let changed = false;
  for (const element of document2.querySelectorAll("video[data-var-src], audio[data-var-src]")) {
    if (!unresolvedIds.has(element.id)) continue;
    element.setAttribute(INFERRED_MEDIA_DURATION_ATTR, "");
    changed = true;
  }
  return changed ? document2.toString() : html;
}
async function compileHtmlFile(html, baseDir, downloadDir, log, urlByAbsentLocalPath, probes) {
  const { html: staticCompiled, unresolved } = compileTimingAttrs(html);
  const mediaUnresolved = unresolved.filter(
    (el) => (el.tagName === "video" || el.tagName === "audio") && el.src
  );
  const unresolvedCompositions = unresolved.filter((el) => el.tagName === "div");
  const resolvedResults = await Promise.all(
    mediaUnresolved.map(
      (el) => resolveMediaDuration(
        el.src,
        el.mediaStart,
        el.playbackRate,
        baseDir,
        downloadDir,
        el.tagName,
        el.id,
        log,
        urlByAbsentLocalPath,
        probes
      ).then(({ duration }) => ({ id: el.id, duration }))
    )
  );
  const resolutions = resolvedResults.filter(
    (r) => r.duration != null && Number.isFinite(r.duration)
  );
  const markedStaticHtml = markInferredVariableMediaDurations(staticCompiled, mediaUnresolved);
  let compiledHtml = resolutions.length > 0 ? injectDurations(markedStaticHtml, resolutions) : markedStaticHtml;
  const preResolved = extractResolvedMedia(compiledHtml);
  const hiddenVideoIds = collectHiddenVideoIds(compiledHtml);
  const clampResults = await Promise.all(
    preResolved.filter((el) => !!el.src && !el.loop && !hiddenVideoIds.has(el.id)).map(async (el) => {
      const { duration: maxDuration } = await resolveMediaDuration(
        el.src,
        el.mediaStart,
        el.playbackRate,
        baseDir,
        downloadDir,
        el.tagName,
        el.id,
        log,
        void 0,
        probes
      );
      return { id: el.id, tagName: el.tagName, duration: el.duration, maxDuration, src: el.src };
    })
  );
  const clampList = [];
  for (const r of clampResults) {
    if (r.maxDuration != null && shouldClampResolvedMediaDuration(r.tagName, r.duration, r.maxDuration)) {
      clampList.push({ id: r.id, duration: r.maxDuration });
      log?.warn(
        `[compile] Audio "${r.id}" (${r.src}) is ${r.maxDuration.toFixed(2)}s but its data-duration is ${r.duration.toFixed(2)}s, so the slot is shortened to the media length. Set data-duration to ~${r.maxDuration.toFixed(2)}s, trim data-media-start, or use a longer/looping source if that isn't intended.`
      );
    }
  }
  if (clampList.length > 0) {
    compiledHtml = clampDurations(compiledHtml, clampList);
  }
  compiledHtml = compiledHtml.replace(/(<video\b[^>]*)\s+crossorigin(?:=["'][^"']*["'])?/gi, "$1");
  compiledHtml = compiledHtml.replace(/(<img\b[^>]*)\s+crossorigin(?:=["'][^"']*["'])?/gi, "$1");
  compiledHtml = compiledHtml.replace(/(<audio\b[^>]*)\s+crossorigin(?:=["'][^"']*["'])?/gi, "$1");
  return { html: compiledHtml, unresolvedCompositions };
}
async function parseSubCompositions(html, projectDir, downloadDir, visited = /* @__PURE__ */ new Set(), urlByAbsentLocalPath, probes) {
  const subCompositions = /* @__PURE__ */ new Map();
  const { document: document2 } = parseHTML5(html);
  const compEls = document2.querySelectorAll("[data-composition-src]");
  const workItems = [];
  for (const el of compEls) {
    const srcPath = el.getAttribute("data-composition-src");
    if (!srcPath) continue;
    const filePath = resolve6(projectDir, srcPath);
    if (visited.has(filePath)) {
      continue;
    }
    const read = readProjectFile(filePath);
    if (read.kind !== "file") {
      continue;
    }
    const rawSubHtml = read.text;
    const nestedVisited = new Set(visited);
    nestedVisited.add(filePath);
    workItems.push({ srcPath, filePath, rawSubHtml, nestedVisited });
  }
  const results = await Promise.all(
    workItems.map(async (item) => {
      const { html: compiledSub } = await compileHtmlFile(
        rewriteUnresolvableGsapToCdn(item.rawSubHtml, projectDir, item.srcPath),
        dirname5(item.filePath),
        downloadDir,
        void 0,
        urlByAbsentLocalPath,
        probes
      );
      const nested = await parseSubCompositions(
        compiledSub,
        projectDir,
        downloadDir,
        item.nestedVisited,
        urlByAbsentLocalPath,
        probes
      );
      return {
        srcPath: item.srcPath,
        compiledSub,
        nested
      };
    })
  );
  for (const r of results) {
    subCompositions.set(r.srcPath, r.compiledSub);
    for (const [key, value] of r.nested.subCompositions) {
      subCompositions.set(key, value);
    }
  }
  return { subCompositions };
}
function promoteCssImportsToLinkTags(html) {
  const { document: document2 } = parseHTML5(html);
  const head = document2.querySelector("head");
  if (!head) return html;
  const importRe = /@import\s+url\(\s*['"]?([^'")\s]+)['"]?\s*\)\s*;?/gi;
  const seenUrls = /* @__PURE__ */ new Set();
  const styleEls = document2.querySelectorAll("style");
  for (const styleEl of styleEls) {
    const original = styleEl.textContent || "";
    let modified = original;
    let match;
    importRe.lastIndex = 0;
    while ((match = importRe.exec(original)) !== null) {
      const url = match[1] ?? "";
      if (!url.startsWith("http://") && !url.startsWith("https://")) continue;
      if (seenUrls.has(url)) {
        modified = modified.replace(match[0], "");
        continue;
      }
      seenUrls.add(url);
      modified = modified.replace(match[0], "");
      const preload = document2.createElement("link");
      preload.setAttribute("rel", "preload");
      preload.setAttribute("href", url);
      preload.setAttribute("as", "style");
      head.appendChild(preload);
      const link = document2.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", url);
      head.appendChild(link);
    }
    if (modified !== original) {
      styleEl.textContent = modified;
    }
  }
  return document2.toString();
}
var ProducerHostIdentityMap = class extends Map {
  #document;
  #lateInstanceByCompositionId = /* @__PURE__ */ new Map();
  constructor(document2, initialHosts) {
    super(assignBundledRuntimeCompositionIds(initialHosts));
    this.#document = document2;
  }
  get(host) {
    const existing = super.get(host);
    if (existing) return existing;
    const authoredCompositionId = (host.getAttribute("data-hf-original-composition-id") || host.getAttribute("data-composition-id") || "").trim() || null;
    if (!authoredCompositionId) {
      const identity2 = { authoredCompositionId: null, runtimeCompositionId: null };
      this.set(host, identity2);
      return identity2;
    }
    let instanceIndex = this.#lateInstanceByCompositionId.get(authoredCompositionId) || 0;
    let runtimeCompositionId;
    do {
      instanceIndex += 1;
      runtimeCompositionId = `${authoredCompositionId}__hf${instanceIndex}`;
    } while (Array.from(this.#document.querySelectorAll("[data-composition-id]")).some(
      (element) => element !== host && element.getAttribute("data-composition-id") === runtimeCompositionId
    ));
    this.#lateInstanceByCompositionId.set(authoredCompositionId, instanceIndex);
    host.setAttribute("data-hf-original-composition-id", authoredCompositionId);
    host.setAttribute("data-composition-id", runtimeCompositionId);
    const identity = { authoredCompositionId, runtimeCompositionId };
    this.set(host, identity);
    return identity;
  }
};
function coalesceHeadStylesAndBodyScripts(html) {
  const { document: document2 } = parseHTML5(html);
  const head = document2.querySelector("head");
  const body = document2.querySelector("body");
  if (!head && !body) return html;
  const liveStyles = [...document2.querySelectorAll("style")].filter(isAlwaysAppliedStyle);
  const dedupedStyles = dedupeFontFaceRules(liveStyles.map((el) => el.textContent || ""));
  liveStyles.forEach((el, i) => {
    el.textContent = dedupedStyles[i] ?? "";
  });
  const styleEls = head ? Array.from(head.querySelectorAll("style")) : [];
  const importRe = /@import\s+url\([^)]*\)\s*;|@import\s+["'][^"']+["']\s*;/gi;
  for (const run of styleEls.length > 1 ? headStyleRuns(styleEls) : []) {
    const imports = [];
    const cssParts = [];
    const seenImports = /* @__PURE__ */ new Set();
    for (const el of run) {
      const raw = (el.textContent || "").trim();
      if (!raw) continue;
      const nonImportCss = raw.replace(importRe, (match) => {
        const cleaned = match.trim();
        if (!seenImports.has(cleaned)) {
          seenImports.add(cleaned);
          imports.push(cleaned);
        }
        return "";
      });
      const trimmedCss = nonImportCss.trim();
      if (trimmedCss) cssParts.push(trimmedCss);
    }
    const mergedCss = [...imports, ...cssParts].join("\n\n").trim();
    if (!mergedCss) continue;
    run[0].textContent = mergedCss;
    for (const el of run.slice(1)) el.remove();
  }
  if (body) {
    for (const { members, anchor } of inlineScriptRuns(
      Array.from(body.querySelectorAll("script"))
    )) {
      const mergedJs = members.map((el) => (el.textContent || "").trim()).filter(Boolean).join("\n;\n").trim();
      if (mergedJs && !parsesAsScript(mergedJs)) continue;
      for (const el of members) el.remove();
      if (!mergedJs) continue;
      const script = document2.createElement("script");
      script.textContent = mergedJs;
      if (anchor) anchor.before(script);
      else body.appendChild(script);
    }
  }
  return document2.toString();
}
function inlineSubCompositions(html, subCompositions, projectDir, variableOverrides = {}) {
  const { document: document2 } = parseHTML5(html);
  const head = document2.querySelector("head");
  const body = document2.querySelector("body");
  const hosts = Array.from(document2.querySelectorAll("[data-composition-src]"));
  if (!hosts.length) {
    const emitted = emitRootCompositionVariableStyles(
      document2,
      {},
      variableOverrides
    );
    return emitted ? document2.toString() : html;
  }
  const hostIdentityByElement = new ProducerHostIdentityMap(
    document2,
    hosts
  );
  const result = inlineSubCompositionsShared(
    document2,
    hosts,
    {
      // hostIdentityMap gives each repeated mount a unique runtime id; the
      // shared inliner's default buildScopeSelector already scopes by
      // `[data-composition-id="<runtime id>"]`, matching the preview bundler.
      hostIdentityMap: hostIdentityByElement,
      readVariableDefaults: readDeclaredDefaults,
      parseHostVariables: parseHostVariableValues,
      resolveHtml: (srcPath) => {
        let compHtml = subCompositions.get(srcPath) || null;
        if (!compHtml) {
          const read = readProjectFile(resolve6(projectDir, srcPath));
          if (read.kind === "file") {
            compHtml = rewriteUnresolvableGsapToCdn(read.text, projectDir, srcPath);
          }
        }
        return compHtml;
      },
      parseHtml: (htmlStr) => parseHTML5(htmlStr).document,
      // Mirrors the preview bundler: a sub-composition's SIBLING assets resolve
      // against its own directory, project-root refs stay as authored.
      assetExists: (path) => existsSync6(resolve6(projectDir, path)),
      // Preserve the authored root wrapper as a child of the host, matching
      // the preview bundler's shape (htmlBundler.ts's prepareFlattenedInnerRoot,
      // which the runtime compositionLoader mirrors with its own copy for the
      // live-loaded case). Without this, the wrapper element (and its
      // class/id) is discarded and any CSS anchored on it —
      // `.wrapper-class .title`, `#wrapper-id` — is dead at render time even
      // though it works in preview.
      flattenInnerRoot: prepareFlattenedInnerRoot,
      onMissingComposition: (srcPath, reason) => {
        console.warn(
          `[Compiler] Skipping sub-composition "${srcPath}": ${reason ?? "the file is missing or empty"}.`
        );
      }
    }
  );
  for (const host of hosts) {
    const hostW = host.getAttribute("data-width");
    const hostH = host.getAttribute("data-height");
    if (hostW && hostH) {
      const existing = host.getAttribute("style") || "";
      const needsWidth = !existing.includes("width");
      const needsHeight = !existing.includes("height");
      const additions = [
        needsWidth ? `width:${hostW}px` : "",
        needsHeight ? `height:${hostH}px` : ""
      ].filter(Boolean).join(";");
      if (additions) {
        host.setAttribute("style", existing ? `${existing};${additions}` : additions);
      }
    }
  }
  if (head) for (const link of result.externalLinks) ensureExternalLinkTag(document2, link);
  if (head) {
    for (const style of styleElementsFor(document2, result.styles, (css) => css.join("\n\n"))) {
      head.appendChild(style);
    }
  }
  const isHoisted = (item) => Boolean(item.integrity?.trim()) || isNonRelativeUrl(item.src);
  if (body) {
    for (const item of result.scriptItems) {
      if (item.kind === "external" && isHoisted(item)) {
        ensureExternalScriptTag(document2, item.src, item);
      }
    }
  }
  emitVariablesByCompScript(document2, result.variablesByComp);
  if (body) {
    let pending = [];
    const flushInline = () => {
      if (!pending.length) return;
      const joined = pending.join("\n;\n");
      for (const text of parsesAsScript(joined) ? [joined] : pending) {
        const scriptEl = document2.createElement("script");
        scriptEl.textContent = text;
        body.appendChild(scriptEl);
      }
      pending = [];
    };
    for (const item of result.scriptItems) {
      if (item.kind === "inline") {
        pending.push(item.content);
      } else if (!isHoisted(item)) {
        flushInline();
        ensureExternalScriptTag(document2, item.src, item);
      }
    }
    flushInline();
  }
  if (body) {
    emitMountedModuleScripts(
      document2,
      result.importMaps,
      result.moduleScripts
    );
  }
  emitRootCompositionVariableStyles(
    document2,
    result.variablesByComp,
    variableOverrides
  );
  assignMediaRenderIds(document2);
  return document2.toString();
}
function ensureFullDocument(html) {
  const trimmed = html.trim();
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return html;
  }
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>*{margin:0;padding:0;box-sizing:border-box;text-rendering:geometricPrecision}body{overflow:hidden;background:#000;font-family:"Inter",sans-serif}</style>
</head>
<body style="margin:0;overflow:hidden">
${html}
</body>
</html>`;
}
function injectTextRenderingRule(html) {
  const { document: document2 } = parseHTML5(html);
  const head = document2.querySelector("head");
  if (!head) return html;
  if (document2.querySelector("style[data-hyperframes-text-rendering]")) {
    return html;
  }
  const styleEl = document2.createElement("style");
  styleEl.setAttribute("data-hyperframes-text-rendering", "true");
  styleEl.textContent = "html,body,*{text-rendering:geometricPrecision}";
  head.insertBefore(styleEl, head.firstChild);
  return document2.toString();
}
var ScriptIntegrityError = class extends Error {
};
function matchesScriptIntegrity(bytes, metadata) {
  const hashes = [
    ...metadata.matchAll(
      /(?:^|[\t\n\f\r ])(sha256|sha384|sha512)-([A-Za-z0-9+/_-]+={0,2})(?:\?[\x21-\x7e]*)?(?=$|[\t\n\f\r ])/gi
    )
  ];
  const strongest = ["sha512", "sha384", "sha256"].find(
    (alg) => hashes.some((hash) => hash[1]?.toLowerCase() === alg)
  );
  if (!strongest) return true;
  const actual = createHash4(strongest).update(bytes).digest();
  return hashes.some(
    (hash) => hash[1]?.toLowerCase() === strongest && actual.equals(Buffer.from(hash[2], "base64"))
  );
}
async function inlineExternalScripts(html) {
  const fullHtml = ensureFullDocument(html);
  const wrappedFragment = fullHtml !== html;
  const { document: document2 } = parseHTML5(fullHtml);
  const scripts = document2.querySelectorAll("script[src]");
  const externalScripts = [];
  for (const el of scripts) {
    const src = (el.getAttribute("src") || "").trim();
    if (src && isHttpUrl(src) && !isRuntimeFileUrl(src)) {
      externalScripts.push({ el, src });
    }
  }
  if (externalScripts.length === 0) return html;
  const downloads = await Promise.allSettled(
    externalScripts.map(async ({ el, src }) => {
      const response = await fetch(src, {
        signal: AbortSignal.timeout(15e3)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${src}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!matchesScriptIntegrity(bytes, el.getAttribute("integrity") || "")) {
        throw new ScriptIntegrityError(`Subresource integrity mismatch for ${src}`);
      }
      return { src, text: new TextDecoder().decode(bytes) };
    })
  );
  for (let i = 0; i < downloads.length; i++) {
    const download = downloads[i];
    const { el, src } = externalScripts[i];
    if (download.status === "fulfilled") {
      const safeText = download.value.text.replace(/<\/script/gi, "<\\/script");
      const inlineScript = document2.createElement("script");
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.toLowerCase() === "src") continue;
        inlineScript.setAttribute(attr.name, attr.value);
      }
      inlineScript.textContent = `/* inlined: ${src} */
${safeText}
//# sourceURL=${new URL(src).href}
`;
      el.replaceWith(inlineScript);
      defaultLogger.info(`[Compiler] Inlined CDN script: ${src}`);
    } else {
      if (download.reason instanceof ScriptIntegrityError) throw download.reason;
      defaultLogger.warn(
        `[Compiler] WARNING: Failed to download CDN script: ${src} (${download.reason}). The render may fail if this script is required (e.g. GSAP). Consider bundling it locally in your project.`
      );
    }
  }
  return wrappedFragment ? document2.body.innerHTML || "" : document2.toString();
}
function collectExternalAssets(html, projectDir) {
  const absProjectDir = resolve6(projectDir);
  const externalAssets = /* @__PURE__ */ new Map();
  function processPath(rawPath) {
    const trimmed = rawPath.trim();
    if (isNonRelativeUrl(trimmed)) return null;
    const absPath = resolve6(absProjectDir, trimmed);
    if (isPathInside2(absPath, absProjectDir)) {
      return null;
    }
    if (!existsSync6(absPath)) return null;
    const safeKey = toExternalAssetKey(absPath);
    externalAssets.set(safeKey, absPath);
    return safeKey;
  }
  const { document: document2 } = parseHTML5(html);
  for (const el of document2.querySelectorAll("[src], [href]")) {
    for (const attr of ["src", "href"]) {
      const val = (el.getAttribute(attr) || "").trim();
      if (!val) continue;
      const rewritten = processPath(val);
      if (rewritten) el.setAttribute(attr, rewritten);
    }
  }
  for (const styleEl of document2.querySelectorAll("style")) {
    const css = styleEl.textContent || "";
    if (!css.includes("url(")) continue;
    const rewritten = css.replace(CSS_URL_RE, (full, quote, rawUrl) => {
      const result = processPath((rawUrl || "").trim());
      if (!result) return full;
      return `url(${quote || ""}${result}${quote || ""})`;
    });
    if (rewritten !== css) styleEl.textContent = rewritten;
  }
  for (const el of document2.querySelectorAll("[style]")) {
    const style = el.getAttribute("style") || "";
    if (!style.includes("url(")) continue;
    const rewritten = style.replace(CSS_URL_RE, (full, quote, rawUrl) => {
      const result = processPath((rawUrl || "").trim());
      if (!result) return full;
      return `url(${quote || ""}${result}${quote || ""})`;
    });
    if (rewritten !== style) el.setAttribute("style", rewritten);
  }
  if (externalAssets.size > 0) {
    defaultLogger.info(
      `[Compiler] Found ${externalAssets.size} asset(s) outside project directory, will copy to render output`
    );
  }
  return {
    html: externalAssets.size > 0 ? document2.toString() : html,
    externalAssets
  };
}
var REMOTE_MEDIA_SUBDIR = "_remote_media";
var REMOTE_MEDIA_TAG_RE = /<(?:video|audio)\b[^>]*?\bsrc\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;
var REMOTE_SOURCE_TAG_RE = /<source\b[^>]*?\bsrc\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;
var REMOTE_IMG_TAG_RE = /<img\b[^>]*?(?<![\w-])src\s*=\s*["'](https?:\/\/[^"']+)["'][^>]*>/gi;
async function downloadAndRewriteUrls(urlSet, html, remoteDir, warnLabel, logLabel, extraRewrite) {
  if (urlSet.size === 0) return { html, remoteMediaAssets: /* @__PURE__ */ new Map() };
  if (!existsSync6(remoteDir)) mkdirSync4(remoteDir, { recursive: true });
  const urlToLocal = /* @__PURE__ */ new Map();
  await Promise.all(
    [...urlSet].map(async (url) => {
      try {
        const localPath = await downloadToTemp(url, remoteDir, void 0, void 0, void 0, {
          onTelemetry: logRemoteDownloadTelemetry
        });
        urlToLocal.set(url, localPath);
      } catch (err) {
        const identity = safeDownloadUrlIdentity(url);
        defaultLogger.warn(`[Compiler] ${warnLabel}, using original URL as fallback.`, {
          urlFingerprint: identity.urlFingerprint,
          host: identity.host,
          error: err instanceof Error ? err.message : String(err)
        });
      }
    })
  );
  if (urlToLocal.size === 0) return { html, remoteMediaAssets: /* @__PURE__ */ new Map() };
  const remoteMediaAssets = /* @__PURE__ */ new Map();
  const urlToRelPath = /* @__PURE__ */ new Map();
  for (const [url, absPath] of urlToLocal) {
    const relPath = `${REMOTE_MEDIA_SUBDIR}/${basename3(absPath)}`;
    remoteMediaAssets.set(relPath, absPath);
    urlToRelPath.set(url, relPath);
  }
  let result = html;
  for (const [url, relPath] of urlToRelPath) {
    result = result.replaceAll(`"${url}"`, `"${relPath}"`).replaceAll(`'${url}'`, `'${relPath}'`);
    if (extraRewrite) result = extraRewrite(result, url, relPath);
  }
  defaultLogger.info(`[Compiler] ${logLabel} ${urlToLocal.size} to ${REMOTE_MEDIA_SUBDIR}/`);
  return { html: result, remoteMediaAssets };
}
async function localizeRemoteMediaSources(html, downloadDir) {
  const urlSet = /* @__PURE__ */ new Set();
  for (const tagRe of [REMOTE_MEDIA_TAG_RE, REMOTE_SOURCE_TAG_RE]) {
    const re = new RegExp(tagRe.source, tagRe.flags);
    let m;
    while ((m = re.exec(html)) !== null) {
      if (m[1]) urlSet.add(m[1]);
    }
  }
  return downloadAndRewriteUrls(
    urlSet,
    html,
    join6(downloadDir, REMOTE_MEDIA_SUBDIR),
    "Remote media download failed",
    "Localized remote media source(s)"
  );
}
async function localizeRemoteImageSources(html, downloadDir) {
  const urlSet = /* @__PURE__ */ new Set();
  const re = new RegExp(REMOTE_IMG_TAG_RE.source, REMOTE_IMG_TAG_RE.flags);
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1]) urlSet.add(m[1]);
  }
  return downloadAndRewriteUrls(
    urlSet,
    html,
    join6(downloadDir, REMOTE_MEDIA_SUBDIR),
    "Remote image download failed",
    "Localized remote image source(s)"
  );
}
var REMOTE_BG_URL_RE = /background(?:-image)?\s*:\s*[^;}"']*?url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi;
async function localizeRemoteBackgroundImages(html, downloadDir) {
  const urlSet = /* @__PURE__ */ new Set();
  const re = new RegExp(REMOTE_BG_URL_RE.source, REMOTE_BG_URL_RE.flags);
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[1] && !isGoogleFontsUrl(m[1])) urlSet.add(m[1]);
  }
  return downloadAndRewriteUrls(
    urlSet,
    html,
    join6(downloadDir, REMOTE_MEDIA_SUBDIR),
    "Remote background-image download failed",
    "Localized remote background-image(s)",
    // Quoted url('..')/url("..") are rewritten by downloadAndRewriteUrls' default
    // replaceAll; this handles the unquoted url(https://..) form.
    (h, url, rel) => h.replaceAll(`url(${url})`, `url(${rel})`)
  );
}
var REMOTE_FONTFACE_URL_RE = /url\(["']?(https?:\/\/[^"')]+)["']?\)/gi;
function isGoogleFontsUrl(href) {
  try {
    const host = new URL(href).hostname.toLowerCase();
    return host === "fonts.googleapis.com" || host === "fonts.gstatic.com";
  } catch {
    return /fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(href);
  }
}
var MAX_STYLESHEET_BYTES = 2 * 1024 * 1024;
async function fetchExternalStylesheetCss(href) {
  const identity = safeDownloadUrlIdentity(href);
  try {
    return await fetchPublicHttpsText(href, {
      maxBytes: MAX_STYLESHEET_BYTES,
      timeoutMs: 15e3
    });
  } catch (err) {
    defaultLogger.warn("[Compiler] External stylesheet fetch failed, preserving link tag.", {
      urlFingerprint: identity.urlFingerprint,
      host: identity.host,
      error: err instanceof Error ? err.message : String(err)
    });
    return null;
  }
}
function extractFontFaceBlocks(css) {
  const blocks = [];
  const atRule = /@font-face\s*/gi;
  let m;
  while ((m = atRule.exec(css)) !== null) {
    const openIdx = css.indexOf("{", m.index + m[0].length);
    if (openIdx === -1) break;
    let depth = 1;
    let i = openIdx + 1;
    for (; i < css.length && depth > 0; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
    }
    if (depth === 0) {
      blocks.push(css.slice(m.index, i));
      atRule.lastIndex = i;
    }
  }
  return blocks;
}
async function inlineExternalFontStylesheets(html) {
  const linkRe = /<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi;
  const hrefRe = /\bhref=["']([^"']+)["']/i;
  const linkMatches = [];
  let linkMatch;
  while ((linkMatch = linkRe.exec(html)) !== null) {
    const tag = linkMatch[0];
    const hrefMatch = hrefRe.exec(tag);
    if (!hrefMatch?.[1]) continue;
    const href = hrefMatch[1];
    if (!/^https?:\/\//i.test(href)) continue;
    if (isGoogleFontsUrl(href)) continue;
    linkMatches.push({ fullMatch: tag, href });
  }
  if (linkMatches.length === 0) return html;
  const MAX_CONCURRENT_STYLESHEET_FETCHES = 4;
  const fetches = [];
  for (let i = 0; i < linkMatches.length; i += MAX_CONCURRENT_STYLESHEET_FETCHES) {
    const batch = linkMatches.slice(i, i + MAX_CONCURRENT_STYLESHEET_FETCHES);
    const results = await Promise.all(
      batch.map(async ({ fullMatch, href }) => {
        const css = await fetchExternalStylesheetCss(href);
        return { fullMatch, href, css };
      })
    );
    fetches.push(...results);
  }
  let result = html;
  for (const { fullMatch, href, css } of fetches) {
    if (css === null) continue;
    const fontFaceBlocks = extractFontFaceBlocks(css);
    if (fontFaceBlocks.length === 0) continue;
    const identity = safeDownloadUrlIdentity(href);
    const inlineStyle = `<style>/* Inlined external font stylesheet */
${fontFaceBlocks.join("\n")}
</style>`;
    result = result.replace(fullMatch, inlineStyle);
    defaultLogger.info("[Compiler] Inlined external @font-face rule(s)", {
      count: fontFaceBlocks.length,
      urlFingerprint: identity.urlFingerprint,
      host: identity.host
    });
  }
  return result;
}
function collectFontFaceUrls(html) {
  const styleBlockRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const urlSet = /* @__PURE__ */ new Set();
  let styleMatch;
  while ((styleMatch = styleBlockRe.exec(html)) !== null) {
    const cssText = styleMatch[1] ?? "";
    let i = 0;
    while (i < cssText.length) {
      const atIdx = cssText.indexOf("@font-face", i);
      if (atIdx === -1) break;
      const braceStart = cssText.indexOf("{", atIdx);
      if (braceStart === -1) break;
      let depth = 1;
      let j = braceStart + 1;
      while (j < cssText.length && depth > 0) {
        if (cssText[j] === "{") depth++;
        else if (cssText[j] === "}") depth--;
        j++;
      }
      const block = cssText.slice(braceStart + 1, j - 1);
      const urlRe = new RegExp(REMOTE_FONTFACE_URL_RE.source, REMOTE_FONTFACE_URL_RE.flags);
      let urlMatch;
      while ((urlMatch = urlRe.exec(block)) !== null) {
        if (urlMatch[1]) urlSet.add(urlMatch[1]);
      }
      i = j;
    }
  }
  return urlSet;
}
async function localizeRemoteFontFaces(html, downloadDir) {
  const processed = await inlineExternalFontStylesheets(html);
  const urlSet = collectFontFaceUrls(processed);
  return downloadAndRewriteUrls(
    urlSet,
    processed,
    join6(downloadDir, REMOTE_MEDIA_SUBDIR),
    "Remote font download failed",
    "Localized remote font face(s)",
    (h, url, relPath) => h.replaceAll(`url(${url})`, `url("${relPath}")`)
  );
}
var LOCAL_FONTFACE_URL_RE = /url\(["']?(?!data:|file:|https?:\/\/)([^"')]+)["']?\)/gi;
function urlOccurrenceRe(localPath) {
  const escaped = localPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`url\\((["']?)${escaped}\\1\\)`, "g");
}
var MAX_LOCAL_FONT_DATA_URI_BYTES = 5 * 1024 * 1024;
async function readLocalFont(absPath) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of createReadStream2(absPath)) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_LOCAL_FONT_DATA_URI_BYTES) {
      return { kind: "file-backed" };
    }
    chunks.push(buffer);
  }
  return { kind: "inline", buffer: Buffer.concat(chunks, totalBytes) };
}
async function embedLocalFontFaces(html, projectDir) {
  const { fontToDataUri: toDataUri } = await import("@hyperframes/core/fonts/embed");
  const styleBlockRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  const fontFaceRe = /@font-face\s*\{([^}]*)\}/gi;
  let result = html;
  const embeddedPaths = /* @__PURE__ */ new Set();
  const dataUriByAbsolutePath = /* @__PURE__ */ new Map();
  const fileBackedAbsolutePaths = /* @__PURE__ */ new Set();
  let styleMatch;
  while ((styleMatch = styleBlockRe.exec(html)) !== null) {
    const cssText = styleMatch[1] ?? "";
    const ffRe = new RegExp(fontFaceRe.source, fontFaceRe.flags);
    let ffMatch;
    while ((ffMatch = ffRe.exec(cssText)) !== null) {
      const block = ffMatch[1] ?? "";
      const urlRe = new RegExp(LOCAL_FONTFACE_URL_RE.source, LOCAL_FONTFACE_URL_RE.flags);
      let urlMatch;
      while ((urlMatch = urlRe.exec(block)) !== null) {
        const localPath = urlMatch[1];
        if (!localPath || embeddedPaths.has(localPath)) continue;
        const absPath = localPath.startsWith("/") ? localPath : resolve6(projectDir, localPath);
        if (!isPathInside2(absPath, projectDir)) continue;
        const ext = absPath.match(/\.(woff2?|ttf|otf|ttc)$/i)?.[1]?.toLowerCase() ?? "ttf";
        try {
          if (fileBackedAbsolutePaths.has(absPath)) {
            embeddedPaths.add(localPath);
            continue;
          }
          let dataUri = dataUriByAbsolutePath.get(absPath);
          if (!dataUri) {
            const font = await readLocalFont(absPath);
            if (font.kind === "file-backed") {
              fileBackedAbsolutePaths.add(absPath);
              defaultLogger.info(
                `[Compiler] Kept large local font file-backed: ${localPath} (> ${(MAX_LOCAL_FONT_DATA_URI_BYTES / 1024 / 1024).toFixed(1)} MB)`
              );
              embeddedPaths.add(localPath);
              continue;
            }
            dataUri = await toDataUri(font.buffer, ext, { compressToWoff2: false });
            dataUriByAbsolutePath.set(absPath, dataUri);
            defaultLogger.info(
              `[Compiler] Embedded local font file: ${localPath} (${(font.buffer.length / 1024).toFixed(0)} KB \u2192 data URI)`
            );
          }
          result = result.replace(urlOccurrenceRe(localPath), `url("${dataUri}")`);
          embeddedPaths.add(localPath);
        } catch (error) {
          defaultLogger.warn(
            `[Compiler] Could not embed local font ${localPath}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  }
  return result;
}
function renderGsapDist() {
  try {
    return gsapCdnDist(void 0, normalizeGsapBaseUrl(process.env.HYPERFRAMES_GSAP_BASE_URL));
  } catch (cause) {
    throw new Error(
      "Invalid HYPERFRAMES_GSAP_BASE_URL: use an absolute HTTPS npm mirror root (plain HTTP only for localhost) without credentials, query, or fragment",
      { cause }
    );
  }
}
function rewriteUnresolvableGsapToCdn(html, projectDir, compSrcPath) {
  let gsapDist;
  const exists = (path) => existsSync6(resolve6(projectDir, path));
  return html.replace(
    /(<script\b[^>]*\bsrc=["'])([^"']*gsap[^"']*\/dist\/([^"']+))(["'][^>]*>)/gi,
    (full, prefix, src, file, suffix) => {
      if (/^https?:\/\//i.test(src)) return full;
      if (exists(compSrcPath ? rewriteAssetPath(compSrcPath, src, exists) : src)) return full;
      gsapDist ??= renderGsapDist();
      defaultLogger.info(`[Compiler] Rewriting missing gsap script: ${src} \u2192 ${gsapDist}${file}`);
      return `${prefix}${gsapDist}${file}${suffix}`;
    }
  );
}
function rebaseDirectEntryAssetPaths(html, projectDir, htmlPath) {
  if (!isPathInside2(htmlPath, projectDir)) return html;
  const entryPath = relative2(projectDir, htmlPath).replace(/\\/g, "/");
  if (!entryPath.includes("/")) return html;
  const { document: document2 } = parseHTML5(html);
  const assetExists = (path) => existsSync6(resolve6(projectDir, path));
  rewriteAssetPaths(
    document2.querySelectorAll("[src], [href]"),
    entryPath,
    (el, attr) => el.getAttribute(attr),
    (el, attr, value) => el.setAttribute(attr, value),
    assetExists
  );
  rewriteInlineStyleAssetUrls(
    document2.querySelectorAll("[style]"),
    entryPath,
    (el) => el.getAttribute("style"),
    (el, value) => el.setAttribute("style", value),
    assetExists
  );
  for (const style of document2.querySelectorAll("style")) {
    style.textContent = rewriteCssAssetUrls(style.textContent || "", entryPath, assetExists);
  }
  return document2.toString();
}
async function compileForRender(projectDir, htmlPath, downloadDir, options = {}) {
  const entryHtml = rebaseDirectEntryAssetPaths(
    readFileSync4(htmlPath, "utf-8"),
    projectDir,
    htmlPath
  );
  const rawHtml = rewriteUnresolvableGsapToCdn(entryHtml, projectDir);
  assertSubCompositionsUsable(rawHtml, projectDir);
  const probes = /* @__PURE__ */ new Map();
  const { html: compiledHtml, unresolvedCompositions } = await compileHtmlFile(
    rawHtml,
    projectDir,
    downloadDir,
    options.log,
    options.urlByAbsentLocalPath,
    probes
  );
  const { subCompositions } = await parseSubCompositions(
    compiledHtml,
    projectDir,
    downloadDir,
    void 0,
    options.urlByAbsentLocalPath,
    probes
  );
  const fullHtml = ensureFullDocument(compiledHtml);
  const inlinedHtml = inlineSubCompositions(
    fullHtml,
    subCompositions,
    projectDir,
    options.variables ?? {}
  );
  const sanitizedHtml = inlinedHtml.replace(
    /(<(?:video|audio)\b[^>]*?)\s+preload\s*=\s*["']none["']/gi,
    "$1"
  );
  const renderModeHints = detectRenderModeHints(sanitizedHtml, options.pageMotionBlur);
  const hasShaderTransitions = detectShaderTransitionUsage(sanitizedHtml);
  const usesThreeDTransforms = detectThreeDTransformUsage(sanitizedHtml);
  const hasAncestorBackgroundImage = detectAncestorBackgroundImage(sanitizedHtml);
  const normalizedFontHtml = normalizeSystemFontPrimaryFamilies(
    injectTextRenderingRule(
      coalesceHeadStylesAndBodyScripts(promoteCssImportsToLinkTags(sanitizedHtml))
    )
  );
  const coalescedHtml = await injectDeterministicFontFaces(normalizedFontHtml, {
    logger: defaultLogger,
    failClosedFontFetch: options.failClosedFontFetch === true,
    allowSystemFontCapture: options.allowSystemFontCapture,
    abortSignal: options.abortSignal
  });
  const assembledHtml = await inlineExternalScripts(coalescedHtml);
  const HF_POSITION_ATTRS = [
    'data-hf-studio-path-offset="true"',
    'data-hf-studio-box-size="true"',
    'data-hf-studio-rotation="true"',
    'data-hf-studio-motion="'
  ];
  const hasPositionEdits = HF_POSITION_ATTRS.some((attr) => assembledHtml.includes(attr));
  const htmlWithPositionScript = hasPositionEdits ? insertBeforeCloseTag(
    assembledHtml,
    "body",
    `<script>${createStudioPositionSeekReapplyScript()}
//# sourceURL=hyperframes://position-seek-reapply</script>`
  ) ?? assembledHtml : assembledHtml;
  const htmlWithDeferredScripts = prepareCompositionScripts(
    injectSdkPositionEditsRenderScript(htmlWithPositionScript)
  );
  const { html: htmlWithLocalMedia, remoteMediaAssets } = await localizeRemoteMediaSources(
    htmlWithDeferredScripts,
    downloadDir
  );
  const { html: htmlWithLocalImages, remoteMediaAssets: remoteImageAssets } = await localizeRemoteImageSources(htmlWithLocalMedia, downloadDir);
  const { html: htmlWithLocalBg, remoteMediaAssets: remoteBgAssets } = await localizeRemoteBackgroundImages(htmlWithLocalImages, downloadDir);
  const { html: htmlWithLocalizedFonts, remoteMediaAssets: remoteFontAssets } = await localizeRemoteFontFaces(htmlWithLocalBg, downloadDir);
  const {
    html: htmlWithJpegs,
    preparedAssets: preparedHeifAssets,
    preparedImages: preparedHeifImages
  } = await prepareHeifImageInputs(htmlWithLocalizedFonts, {
    projectDir,
    downloadDir,
    cacheDir: options.animatedGifCacheDir,
    sourceAssets: remoteImageAssets,
    timeoutMs: options.ffmpegProcessTimeout
  });
  if (preparedHeifImages.length > 0) {
    defaultLogger.info(`[Compiler] Converted ${preparedHeifImages.length} HEIC image(s) to JPEG`);
  }
  const gifSourceAssets = new Map(remoteImageAssets);
  const {
    html: htmlWithPreparedGifs,
    preparedAssets: preparedGifAssets,
    preparedGifs
  } = await prepareAnimatedGifInputs(htmlWithJpegs, {
    projectDir,
    downloadDir,
    cacheDir: options.animatedGifCacheDir,
    sourceAssets: gifSourceAssets,
    timeoutMs: options.ffmpegProcessTimeout
  });
  if (preparedGifs.length > 0) {
    defaultLogger.info(`[Compiler] Prepared ${preparedGifs.length} animated GIF input(s) as WebM`);
  }
  const embeddedHtml = await embedLocalFontFaces(htmlWithPreparedGifs, projectDir);
  const { html, externalAssets } = collectExternalAssets(embeddedHtml, projectDir);
  for (const [relPath, absPath] of remoteMediaAssets) {
    externalAssets.set(relPath, absPath);
  }
  for (const [relPath, absPath] of remoteImageAssets) {
    externalAssets.set(relPath, absPath);
  }
  for (const [relPath, absPath] of remoteBgAssets) {
    externalAssets.set(relPath, absPath);
  }
  for (const [relPath, absPath] of remoteFontAssets) {
    externalAssets.set(relPath, absPath);
  }
  for (const [relPath, absPath] of preparedGifAssets) {
    externalAssets.set(relPath, absPath);
  }
  for (const [relPath, absPath] of preparedHeifAssets) {
    externalAssets.set(relPath, absPath);
  }
  const { videos, audios, images, droppedMediaIds } = collectRenderMedia(html);
  const masterFxChain = parseMasterFxChain(html);
  const advised = /* @__PURE__ */ new Set();
  for (const video of videos) {
    if (isHttpUrl(video.src)) continue;
    const videoPath = resolve6(projectDir, video.src);
    if (advised.has(videoPath)) continue;
    advised.add(videoPath);
    const reencode = `ffmpeg -i "${video.src}" -c:v libx264 -r 30 -g 30 -keyint_min 30 -movflags +faststart -c:a copy output.mp4`;
    (async () => {
      const metadata = await withMediaProbeSlot(() => extractMediaMetadata(videoPath));
      const analysis = await withMediaProbeSlot(
        () => analyzeKeyframeIntervals(videoPath, metadata)
      );
      if (analysis.isProblematic) {
        defaultLogger.warn(
          `[Compiler] WARNING: Video "${video.id}" has sparse keyframes (max interval: ${analysis.maxIntervalSeconds}s). Long GOPs can make preview seeking slower; rendering is unaffected. If preview seeking is slow, re-encode with: ${reencode}`
        );
      }
      if (metadata.isVFR) {
        defaultLogger.warn(
          `[Compiler] Video "${video.id}" is variable frame rate (VFR); the engine will normalize it to CFR before frame extraction. If rendering feels slow on this video, pre-encode once with: ${reencode}`
        );
      }
    })().catch(() => {
    });
  }
  const { document: document2 } = parseHTML5(html);
  const rootEl = document2.querySelector("[data-composition-id]");
  const width = rootEl ? parseInt(rootEl.getAttribute("data-width") || "1080", 10) : 1080;
  const height = rootEl ? parseInt(rootEl.getAttribute("data-height") || "1920", 10) : 1920;
  const staticDuration = rootEl ? parseStrictFiniteTimingNumber(rootEl.getAttribute("data-duration")) ?? parseStrictFiniteTimingNumber(rootEl.getAttribute("data-composition-duration")) ?? 0 : 0;
  return {
    html,
    subCompositions,
    videos,
    audios,
    images,
    droppedMediaIds,
    ...masterFxChain ? { masterFxChain } : {},
    unresolvedCompositions,
    externalAssets,
    width,
    height,
    staticDuration,
    renderModeHints,
    hasShaderTransitions,
    usesThreeDTransforms,
    hasAncestorBackgroundImage
  };
}
async function discoverMediaFromBrowser(page) {
  const elements = await page.evaluate(() => {
    const results = [];
    const autoImageIds = /* @__PURE__ */ new Map();
    let autoImageId = 0;
    document.querySelectorAll("img[src]").forEach((image) => {
      if (!image.id) autoImageIds.set(image, `hf-img-${autoImageId++}`);
    });
    const mediaEls = new Set(
      document.querySelectorAll("video[data-start], audio[data-start], img[data-var-src]")
    );
    document.querySelectorAll("picture source[data-var-src]").forEach((source) => {
      const image = source.closest("picture")?.querySelector("img");
      if (image) mediaEls.add(image);
    });
    mediaEls.forEach((el) => {
      const htmlEl = el;
      const isImage = htmlEl.tagName.toLowerCase() === "img";
      const tagName = isImage ? "image" : htmlEl.tagName.toLowerCase() === "video" ? "video" : "audio";
      const id = htmlEl.getAttribute("data-hf-render-id") || htmlEl.id || (isImage ? autoImageIds.get(htmlEl) : void 0);
      if (!id) return;
      const resolvedSrc = htmlEl.currentSrc || htmlEl.src || htmlEl.getAttribute("src") || "";
      const withoutQueryAndHash = (url) => url.replace(/[?#][\s\S]*$/, "");
      const isPageItself = withoutQueryAndHash(resolvedSrc) === withoutQueryAndHash(location.href);
      const src = isPageItself ? "" : resolvedSrc;
      const start = parseFloat(htmlEl.getAttribute("data-start") || "0");
      const endRaw = htmlEl.getAttribute("data-end");
      const durationRaw = htmlEl.getAttribute("data-duration");
      const durationInferred = htmlEl.hasAttribute("data-hf-inferred-duration");
      const intrinsicDuration = isImage ? 0 : htmlEl.duration;
      const playbackStartRaw = htmlEl.getAttribute("data-playback-start");
      const mediaStartRaw = htmlEl.getAttribute("data-media-start");
      const playbackRateRaw = htmlEl.getAttribute("data-playback-rate");
      const automationRaw = htmlEl.getAttribute("data-automation");
      const defaultPlaybackRate = isImage ? 1 : htmlEl.defaultPlaybackRate;
      const loop = htmlEl.hasAttribute("loop");
      const hasAudio = htmlEl.getAttribute("data-has-audio") === "true";
      const volume = parseFloat(htmlEl.getAttribute("data-volume") || "1");
      const muted = !isImage && (htmlEl.hasAttribute("muted") || htmlEl.muted);
      results.push({
        id,
        tagName,
        src,
        start,
        endRaw,
        durationRaw,
        intrinsicDuration,
        durationInferred,
        playbackStartRaw,
        mediaStartRaw,
        playbackRateRaw,
        automationRaw,
        defaultPlaybackRate,
        loop,
        hasAudio,
        volume,
        muted
      });
    });
    return results;
  });
  return elements.map(
    ({
      endRaw,
      durationRaw,
      intrinsicDuration,
      playbackStartRaw,
      mediaStartRaw,
      playbackRateRaw,
      automationRaw,
      defaultPlaybackRate,
      ...element
    }) => ({
      ...element,
      end: parseStrictFiniteTimingNumber(endRaw) ?? 0,
      duration: element.durationInferred && Number.isFinite(intrinsicDuration) && intrinsicDuration > 0 ? intrinsicDuration : parseStrictFiniteTimingNumber(durationRaw) ?? 0,
      mediaStart: readMediaStart({
        getAttribute(name) {
          if (name === "data-playback-start") return playbackStartRaw;
          if (name === "data-media-start") return mediaStartRaw;
          return null;
        }
      }),
      playbackRate: resolveRateSpec(
        automationRaw,
        readPlaybackRate(
          (name) => name === "data-playback-rate" ? playbackRateRaw : null,
          defaultPlaybackRate
        )
      )
    })
  );
}
async function discoverAudioVolumeAutomationFromTimeline(page, audioIds, compositionDuration, sampleFps) {
  if (audioIds.length === 0 || compositionDuration <= 0) return [];
  const sampleStep = 1 / Math.min(60, Math.max(1, sampleFps));
  const rawWindows = await page.evaluate((ids) => {
    return ids.flatMap((id) => {
      const el = window.__hfMediaEl?.(id) ?? document.getElementById(id) ?? document.getElementById(id.replace(/-audio$/, ""));
      if (!(el instanceof HTMLAudioElement) && !(el instanceof HTMLVideoElement)) return [];
      return [
        {
          id,
          startRaw: el.dataset.start ?? null,
          endRaw: el.dataset.end ?? null,
          durationRaw: el.dataset.duration ?? null
        }
      ];
    });
  }, audioIds);
  const clips = rawWindows.map(({ id, startRaw, endRaw, durationRaw }) => {
    const start = parseStrictFiniteTimingNumber(startRaw) ?? 0;
    const authoredDuration = parseStrictFiniteTimingNumber(durationRaw);
    const authoredEnd = parseStrictFiniteTimingNumber(endRaw);
    const end = authoredDuration != null && authoredDuration > 0 ? start + authoredDuration : authoredEnd != null && authoredEnd > start ? authoredEnd : compositionDuration;
    return { id, start, end };
  });
  return page.evaluate(
    ({ clips: clips2, duration, step, maxGain }) => {
      const results = [];
      const clampGain = (value) => Number.isFinite(value) ? Math.max(0, Math.min(maxGain, value)) : 1;
      const volumeDescriptor = typeof HTMLMediaElement === "undefined" ? void 0 : Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
      const nativeVolumeGet = volumeDescriptor?.get;
      const nativeVolumeSet = volumeDescriptor?.set;
      const withUnclampedVolume = (el, probe) => {
        if (!nativeVolumeGet || !nativeVolumeSet) return probe();
        let authored = Number(nativeVolumeGet.call(el));
        Object.defineProperty(el, "volume", {
          configurable: true,
          get: () => authored,
          set: (value) => {
            authored = Number(value);
            nativeVolumeSet.call(el, Math.max(0, Math.min(1, authored)));
          }
        });
        try {
          return probe();
        } finally {
          delete el.volume;
          nativeVolumeSet.call(el, Math.max(0, Math.min(1, authored)));
        }
      };
      const timelines = window.__timelines;
      if (!timelines) return results;
      const rootEl = document.querySelector("[data-composition-id]");
      const compId = rootEl?.getAttribute("data-composition-id");
      if (!compId) return results;
      const tl = timelines[compId];
      if (!tl) return results;
      const seekTl = (t) => {
        if (typeof tl.totalTime === "function") {
          tl.totalTime(t, true);
        } else if (typeof tl.seek === "function") {
          tl.seek(t, true);
        }
      };
      for (const { id, start, end } of clips2) {
        const el = window.__hfMediaEl?.(id) ?? document.getElementById(id) ?? document.getElementById(id.replace(/-audio$/, ""));
        if (!(el instanceof HTMLAudioElement) && !(el instanceof HTMLVideoElement)) continue;
        const sampleStart = Math.max(0, start);
        const sampleEnd = Math.min(duration, end);
        const initialVolumeAttr = Number.parseFloat(el.dataset.volume ?? "");
        const keyframes = withUnclampedVolume(el, () => {
          if (Number.isFinite(initialVolumeAttr)) {
            el.volume = clampGain(initialVolumeAttr);
          }
          const keyframes2 = [];
          let previousSample;
          for (let t = sampleStart; t <= sampleEnd + 1e-6; t = Math.min(sampleEnd, t + step)) {
            seekTl(t);
            const rawVolume = Number(el.volume);
            if (!Number.isFinite(rawVolume)) {
              if (t === sampleEnd) break;
              continue;
            }
            const volume = clampGain(rawVolume);
            const sample = {
              time: Number(t.toFixed(6)),
              volume: Number(volume.toFixed(6))
            };
            const last = keyframes2.at(-1);
            if (!last || Math.abs(last.volume - volume) > 1e-4) {
              if (last && previousSample && previousSample.time > last.time) {
                keyframes2.push(previousSample);
              }
              keyframes2.push(sample);
            } else if (t === sampleEnd && sample.time > last.time) {
              keyframes2.push(sample);
            }
            previousSample = sample;
            if (t === sampleEnd) break;
          }
          return keyframes2;
        });
        const staticAttr = Number.parseFloat(el.dataset.volume ?? "");
        const staticVolume = Number.isFinite(staticAttr) ? clampGain(staticAttr) : 1;
        const hasAutomation = keyframes.some(
          (keyframe) => Math.abs(keyframe.volume - staticVolume) > 1e-4
        );
        if (hasAutomation) {
          results.push({ id, keyframes });
        }
      }
      seekTl(0);
      return results;
    },
    { clips, duration: compositionDuration, step: sampleStep, maxGain: MAX_AUDIO_GAIN }
  );
}
async function discoverVideoVisibilityFromTimeline(page, compositionDuration) {
  if (compositionDuration <= 0) return [];
  return page.evaluate((duration) => {
    const results = [];
    const videos = document.querySelectorAll("video[data-hf-auto-start]");
    if (videos.length === 0) return results;
    const timelines = window.__timelines;
    if (!timelines) return results;
    const rootEl = document.querySelector("[data-composition-id]");
    const compId = rootEl?.getAttribute("data-composition-id");
    if (!compId) return results;
    const tl = timelines[compId];
    if (!tl) return results;
    const seekTl = (t) => {
      if (typeof tl.totalTime === "function") {
        tl.totalTime(t, true);
      } else if (typeof tl.seek === "function") {
        tl.seek(t, true);
      }
    };
    const SAMPLE_STEP = 0.1;
    const BINARY_PRECISION = 1 / 60;
    const entries = [];
    for (const videoEl of videos) {
      const id = videoEl.getAttribute?.("data-hf-render-id") || videoEl.id;
      if (!id) continue;
      entries.push({
        id,
        sceneEl: videoEl.closest(".scene") || videoEl,
        firstVisible: null,
        lastVisible: null
      });
    }
    if (entries.length === 0) return results;
    for (let t = 0; t <= duration; t += SAMPLE_STEP) {
      seekTl(t);
      for (const entry of entries) {
        const opacity = parseFloat(window.getComputedStyle(entry.sceneEl).opacity);
        if (opacity > 0) {
          if (entry.firstVisible === null) entry.firstVisible = t;
          entry.lastVisible = t;
        }
      }
    }
    for (const entry of entries) {
      const { id, sceneEl, firstVisible, lastVisible } = entry;
      if (firstVisible === null || lastVisible === null) continue;
      let lo = Math.max(0, firstVisible - SAMPLE_STEP);
      let hi = firstVisible;
      while (hi - lo > BINARY_PRECISION) {
        const mid = (lo + hi) / 2;
        seekTl(mid);
        const opacity = parseFloat(window.getComputedStyle(sceneEl).opacity);
        if (opacity > 0) hi = mid;
        else lo = mid;
      }
      const exactStart = hi;
      lo = lastVisible;
      hi = Math.min(duration, lastVisible + SAMPLE_STEP);
      while (hi - lo > BINARY_PRECISION) {
        const mid = (lo + hi) / 2;
        seekTl(mid);
        const opacity = parseFloat(window.getComputedStyle(sceneEl).opacity);
        if (opacity > 0) lo = mid;
        else hi = mid;
      }
      const exactEnd = lo;
      results.push({
        videoId: id,
        visibleStart: Math.max(0, exactStart),
        visibleEnd: Math.min(duration, exactEnd)
      });
    }
    seekTl(0);
    return results;
  }, compositionDuration);
}
async function resolveCompositionDurations(page, unresolved) {
  if (unresolved.length === 0) return [];
  const ids = unresolved.map((el) => el.id);
  const results = await page.evaluate((compIds) => {
    const win = window;
    const timelines = win.__timelines || {};
    const resolved = [];
    for (const id of compIds) {
      const tl = timelines[id];
      let dur = 0;
      try {
        dur = typeof tl?.duration === "function" ? Number(tl.duration()) : 0;
      } catch {
        dur = 0;
      }
      if (dur > 0) {
        resolved.push({ id, duration: dur, source: "__timelines" });
        continue;
      }
      const el = document.getElementById(id);
      if (el) {
        const durationRaw = el.getAttribute("data-duration");
        const compositionDurationRaw = el.getAttribute("data-composition-duration");
        if (durationRaw != null || compositionDurationRaw != null) {
          resolved.push({
            id,
            duration: 0,
            source: "data-duration",
            ...durationRaw != null ? { durationRaw } : {},
            ...compositionDurationRaw != null ? { compositionDurationRaw } : {}
          });
          continue;
        }
      }
      resolved.push({ id, duration: 0, source: "unresolved" });
    }
    return resolved;
  }, ids);
  const resolutions = [];
  for (const r of results) {
    const duration = parseStrictFiniteTimingNumber(r.durationRaw) ?? parseStrictFiniteTimingNumber(r.compositionDurationRaw) ?? r.duration;
    if (duration != null && duration > 0) {
      resolutions.push({ id: r.id, duration });
    }
  }
  return resolutions;
}
async function recompileWithResolutions(compiled, resolutions, projectDir, downloadDir) {
  if (resolutions.length === 0) return compiled;
  const html = injectDurations(compiled.html, resolutions);
  const { subCompositions } = await parseSubCompositions(html, projectDir, downloadDir);
  const { videos, audios, images } = compiled;
  const remaining = compiled.unresolvedCompositions.filter(
    (c) => !resolutions.some((r) => r.id === c.id)
  );
  return {
    ...compiled,
    html,
    subCompositions,
    videos,
    audios,
    images,
    unresolvedCompositions: remaining,
    renderModeHints: compiled.renderModeHints,
    hasShaderTransitions: compiled.hasShaderTransitions
  };
}

// src/services/render/stages/compileStage.ts
function adaptAspectAgnosticResolution(requested, aspectAgnostic, width, height, log) {
  if (!requested || !aspectAgnostic) return requested;
  const flipped = suggestMatchingPreset(width, height, requested);
  if (!flipped || flipped === requested) return requested;
  log.info("Adapted aspect-agnostic --resolution to composition orientation", {
    compositionWidth: width,
    compositionHeight: height,
    requestedResolution: requested,
    effectiveResolution: flipped
  });
  return flipped;
}
async function runCompileStage(input) {
  const {
    projectDir,
    workDir,
    htmlPath,
    entryFile,
    job,
    cfg,
    needsAlpha,
    log,
    assertNotAborted,
    failClosedFontFetch,
    allowSystemFontCapture,
    abortSignal
  } = input;
  const compileStart = Date.now();
  const compiled = await compileForRender(projectDir, htmlPath, join7(workDir, "downloads"), {
    log,
    failClosedFontFetch: failClosedFontFetch === true,
    allowSystemFontCapture,
    abortSignal,
    variables: input.variables,
    urlByAbsentLocalPath: input.urlByAbsentLocalPath,
    pageMotionBlur: input.pageMotionBlur,
    animatedGifCacheDir: cfg.extractCacheDir ? join7(cfg.extractCacheDir, "animated-gif") : void 0,
    ffmpegProcessTimeout: cfg.ffmpegProcessTimeout
  });
  assertNotAborted();
  const compileOnlyMs = Date.now() - compileStart;
  let deCompileGate;
  if (cfg.useDrawElement && process.env.HF_FAST_CAPTURE_3D !== "true" && compiled.usesThreeDTransforms) {
    cfg.useDrawElement = false;
    deCompileGate = "3d";
    log.info(
      "[Render] Fast capture: composition uses a CSS 3D rendering context (perspective / preserve-3d / backface-visibility), so disabling drawElementImage for this render. Capture uses the platform's baseline route."
    );
  }
  if (cfg.useDrawElement && process.env.HF_FAST_CAPTURE_ANCESTOR_BG !== "true" && compiled.hasAncestorBackgroundImage) {
    cfg.useDrawElement = false;
    deCompileGate = "ancestor_background_image";
    log.info(
      "[Render] Fast capture: composition root's ancestors (body/html/wrapper) carry a background-image, so disabling drawElementImage for this render. Capture uses the platform's baseline route."
    );
  }
  if (cfg.useDrawElement && process.env.PRODUCER_EXPERIMENTAL_FAST_CAPTURE !== "true" && compiled.hasShaderTransitions) {
    cfg.useDrawElement = false;
    deCompileGate = "shader_transitions";
    log.info(
      "[Render] Fast capture: composition uses shader transitions, so disabling drawElementImage so page-side compositing stays available."
    );
  }
  if (!cfg.useDrawElement && cfg.pageSideCompositingAutoDisabled) {
    cfg.enablePageSideCompositing = true;
    cfg.pageSideCompositingAutoDisabled = false;
  }
  const callerForced = cfg.forceScreenshot || needsAlpha && !cfg.useDrawElement;
  const { forceScreenshot: hintForced } = applyRenderModeHints(callerForced, compiled, log);
  let forceScreenshot = hintForced;
  cfg.forceScreenshot = forceScreenshot;
  writeCompiledArtifacts(compiled, workDir, Boolean(job.config.debug));
  log.info("Compiled composition metadata", {
    entryFile,
    staticDuration: compiled.staticDuration,
    width: compiled.width,
    height: compiled.height,
    videoCount: compiled.videos.length,
    audioCount: compiled.audios.length,
    renderModeHints: compiled.renderModeHints
  });
  const composition = {
    duration: compiled.staticDuration,
    videos: compiled.videos,
    audios: compiled.audios,
    images: compiled.images,
    masterFxChain: compiled.masterFxChain,
    width: compiled.width,
    height: compiled.height
  };
  await preflightCompositionAssetMediaTypes({
    projectDir,
    compiledDir: join7(workDir, "compiled"),
    composition,
    signal: abortSignal
  });
  assertNotAborted();
  const { width, height } = composition;
  const effectiveResolution = adaptAspectAgnosticResolution(
    job.config.outputResolution,
    job.config.outputResolutionAspectAgnostic,
    width,
    height,
    log
  );
  const deviceScaleFactor = resolveDeviceScaleFactor({
    compositionWidth: width,
    compositionHeight: height,
    outputResolution: effectiveResolution,
    hdrRequested: job.config.hdrMode === "force-hdr",
    alphaRequested: needsAlpha
  });
  const outputWidth = Math.round(width * deviceScaleFactor);
  const outputHeight = Math.round(height * deviceScaleFactor);
  if (deviceScaleFactor !== 1) {
    log.info("Scaling composition via deviceScaleFactor", {
      compositionWidth: width,
      compositionHeight: height,
      outputResolution: effectiveResolution,
      outputWidth,
      outputHeight,
      deviceScaleFactor
    });
  }
  return {
    compiled,
    composition,
    deviceScaleFactor,
    outputWidth,
    outputHeight,
    compileOnlyMs,
    forceScreenshot,
    deCompileGate
  };
}

// src/services/render/stages/probeStage.ts
import { createHash as createHash5 } from "node:crypto";
import { basename as basename4, join as join8 } from "node:path";
import { parseHTML as parseHTML6 } from "linkedom";
import {
  closeCaptureSession as closeCaptureSession4,
  compositionRequiresWebGpu,
  createCaptureSession as createCaptureSession4,
  deriveBeginFrameProbeTimeTicks,
  getCompositionDuration,
  getCompositionLengthSource,
  initializeSession as initializeSession4,
  isTransientBrowserError,
  probeBeginFrameLiveness,
  videoAudioId
} from "@hyperframes/engine";
import {
  MEDIA_RENDER_ID_ATTR as MEDIA_RENDER_ID_ATTR2,
  fpsToNumber as fpsToNumber6,
  normalizeRateSpec as normalizeRateSpec3,
  readMediaStart as readMediaStart2,
  shiftRateLane as shiftRateLane2,
  sourceTimeAt as sourceTimeAt3,
  timeAtSourceTime
} from "@hyperframes/core";
import { parseHostVariableValues as parseHostVariableValues2, readDeclaredDefaults as readDeclaredDefaults2 } from "@hyperframes/core/compiler";
import { extractMediaSrcMutations } from "@hyperframes/parsers";

// src/services/render/stages/probeFailures.ts
var NETWORK_FAILURE_PATTERN = /404|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION_REFUSED|net::ERR_/i;
var FAVICON_PATTERN = /(?:^|[/?])favicon(?:\.[a-z0-9]+)?(?:[?#\s]|$)/i;
function isActionableProbeFailure(line) {
  return NETWORK_FAILURE_PATTERN.test(line) && !FAVICON_PATTERN.test(line);
}

// src/services/render/captureImageFormat.ts
function resolveCaptureImageFormat(input) {
  return input.needsAlpha || input.motionBlur ? "png" : "jpeg";
}
function resolveCaptureJpegQuality(quality) {
  return quality === "draft" ? 80 : 100;
}

// src/services/render/stages/probeStage.ts
var FRAME_BOUNDARY_EPSILON = 1e-3;
function durationToFrameCount(duration, fps) {
  const rawFrameCount = duration * fps;
  const nearestFrame = Math.round(rawFrameCount);
  return Math.abs(rawFrameCount - nearestFrame) <= FRAME_BOUNDARY_EPSILON ? nearestFrame : Math.ceil(rawFrameCount);
}
function hasScriptedAudioVolumeAutomation(html, audioCount) {
  if (audioCount <= 0) return false;
  const { document: document2 } = parseHTML6(html);
  const scriptBodies = [...document2.querySelectorAll("script")].map((script) => script.textContent ?? "").join("\n");
  if (!scriptBodies) return false;
  return /\.\s*volume\s*=/i.test(scriptBodies) || /\b(?:gsap|tl|timeline|tween)\s*\.\s*(?:to|fromTo|set)\s*\([\s\S]{0,2000}\bvolume\s*:/i.test(
    scriptBodies
  );
}
function hasAutoStartVideos(html) {
  const { document: document2 } = parseHTML6(html);
  return document2.querySelector("video[data-hf-auto-start]") !== null;
}
function variableHasValue(element, variableId, variables) {
  if (variables && Object.hasOwn(variables, variableId)) return true;
  for (let scope = element.parentElement; scope; scope = scope.parentElement) {
    if (Object.hasOwn(parseHostVariableValues2(scope), variableId)) return true;
    if (Object.hasOwn(readDeclaredDefaults2(scope), variableId)) return true;
  }
  return Object.hasOwn(readDeclaredDefaults2(element.ownerDocument.documentElement), variableId);
}
function hasVariableBoundMedia(html, variables) {
  const { document: document2 } = parseHTML6(html);
  return Array.from(
    document2.querySelectorAll(
      "img[data-var-src], audio[data-var-src], video[data-var-src], source[data-var-src]"
    )
  ).some((element) => {
    const variableId = element.getAttribute("data-var-src")?.trim();
    return Boolean(variableId && variableHasValue(element, variableId, variables));
  });
}
function authoredMediaStarts(html) {
  const { document: document2 } = parseHTML6(html);
  const starts = /* @__PURE__ */ new Map();
  for (const media of document2.querySelectorAll("video, audio")) {
    const id = media.getAttribute(MEDIA_RENDER_ID_ATTR2) || media.getAttribute("id");
    if (id && !starts.has(id)) starts.set(id, readMediaStart2(media));
  }
  return starts;
}
function isVideoAudio(audio, videoId) {
  return audio.type === "video" && audio.id === videoAudioId(videoId);
}
function adoptRuntimeMediaTiming(composition, el, authored) {
  const shift = el.mediaStart - authored;
  const entries = el.tagName === "video" ? [
    ...composition.videos.filter((video) => video.id === el.id),
    ...composition.audios.filter((audio) => isVideoAudio(audio, el.id))
  ] : composition.audios.filter((audio) => audio.type !== "video" && audio.id === el.id);
  for (const entry of entries) {
    if (typeof entry.playbackRate !== "object") {
      if (typeof el.playbackRate === "object") {
        const consumed = Math.max(0, entry.mediaStart - authored);
        const head = timeAtSourceTime(normalizeRateSpec3(entry.playbackRate), consumed);
        entry.mediaStart += sourceTimeAt3(el.playbackRate, head) - consumed;
        entry.playbackRate = shiftRateLane2(el.playbackRate, head);
      } else {
        entry.playbackRate = el.playbackRate;
      }
    }
    if (el.mediaStart > 0 && Math.abs(shift) > BROWSER_MEDIA_EPSILON) entry.mediaStart += shift;
  }
}
function reconcileBrowserMediaEnd(existingEnd, projectedEnd, sourceChanged, durationInferred) {
  if (projectedEnd <= 0) return existingEnd;
  if (sourceChanged && durationInferred) return projectedEnd;
  return existingEnd <= 0 ? projectedEnd : Math.min(existingEnd, projectedEnd);
}
function hasRuntimeMediaChanges(html) {
  const { document: document2 } = parseHTML6(html);
  const scriptBodies = [...document2.querySelectorAll("script")].map(
    (script) => script.textContent ?? ""
  );
  const insertedMedia = scriptBodies.some(
    (script) => /\bcreateElement\s*\(\s*["'`](?:video|audio)["'`]\s*\)/i.test(script) || /\bnew\s+(?:Audio|Video)\s*\(/i.test(script) || /<(?:video|audio)\b[^>]*>/i.test(script)
  );
  if (insertedMedia) return true;
  const isManagedMedia = (element) => {
    const name = element.tagName.toLowerCase();
    if (name === "video" || name === "audio") return true;
    return name === "source" && element.closest("video, audio") !== null;
  };
  for (const script of scriptBodies) {
    for (const mutation of extractMediaSrcMutations(script)) {
      try {
        const id = /^#[A-Za-z_][\w-]*$/.test(mutation.selector) ? mutation.selector.slice(1) : null;
        const idTarget = id ? document2.getElementById(id) : null;
        const targets = id ? idTarget ? [idTarget] : [] : [...document2.querySelectorAll(mutation.selector)];
        if (targets.some(isManagedMedia)) return true;
      } catch {
      }
    }
  }
  return false;
}
function probeRequiresBrowser(args) {
  return args.durationSeconds <= 0 || args.unresolvedCompositionCount > 0 || args.hasAutoStart || args.hasScriptedAudio || args.hasVariableMedia || args.hasInsertedMedia;
}
function reportedLengthSource(source) {
  if (!source) return null;
  if (source.from !== "media") return { from: source.from };
  const name = basename4(source.src.split(/[?#]/, 1)[0] ?? "");
  const srcHash = createHash5("sha256").update(name).digest("hex").slice(0, 12);
  return { from: "media", tag: source.tag, trimmed: source.trimmed, srcHash };
}
async function runProbeStage(input) {
  const {
    projectDir,
    workDir,
    job,
    cfg,
    forceScreenshot,
    log,
    assertNotAborted,
    abortSignal,
    composition,
    width,
    height,
    needsAlpha,
    deviceScaleFactor,
    subTimelineWaitMemo
  } = input;
  let { compiled } = input;
  const probeCfg = cfg.forceScreenshot === forceScreenshot ? cfg : { ...cfg, forceScreenshot };
  let fileServer = null;
  let probeSession = null;
  let lengthSource = input.composition.duration > 0 ? { from: "declared" } : null;
  let beginFrameStalled = false;
  let lastBrowserConsole = [];
  const probeStart = Date.now();
  const hasAutoStart = hasAutoStartVideos(compiled.html);
  const hasScriptedAudio = hasScriptedAudioVolumeAutomation(
    compiled.html,
    composition.audios.length
  );
  const hasVariableMedia = hasVariableBoundMedia(compiled.html, job.config.variables);
  const hasInsertedMedia = hasRuntimeMediaChanges(compiled.html);
  const needsBrowser = probeRequiresBrowser({
    durationSeconds: composition.duration,
    unresolvedCompositionCount: compiled.unresolvedCompositions.length,
    hasAutoStart,
    hasScriptedAudio,
    hasVariableMedia,
    hasInsertedMedia
  });
  try {
    if (needsBrowser) {
      const reasons = [];
      if (composition.duration <= 0) reasons.push("root duration unknown");
      if (compiled.unresolvedCompositions.length > 0)
        reasons.push(`${compiled.unresolvedCompositions.length} unresolved composition(s)`);
      if (hasAutoStart) reasons.push("auto-start video(s)");
      if (hasScriptedAudio) reasons.push("scripted audio volume");
      if (hasInsertedMedia) reasons.push("runtime-created or source-mutated media");
      if (hasVariableMedia) reasons.push("variable-bound media source(s)");
      log.info("Launching browser for composition probe...", {
        reasons
      });
      fileServer = await createFileServer({
        projectDir,
        compiledDir: join8(workDir, "compiled"),
        port: 0,
        preHeadScripts: [VIRTUAL_TIME_SHIM],
        fps: job.config.fps
      });
      assertNotAborted();
      const motionBlur = job.config.motionBlur;
      const captureFormat = resolveCaptureImageFormat({ needsAlpha, motionBlur });
      const captureOpts = {
        width,
        height,
        fps: job.config.fps,
        format: captureFormat,
        transparent: needsAlpha,
        quality: captureFormat === "png" ? void 0 : resolveCaptureJpegQuality(job.config.quality),
        variables: job.config.variables,
        deviceScaleFactor,
        motionBlur,
        pageMotionBlur: job.config.pageMotionBlur,
        requiresWebGpu: compositionRequiresWebGpu(compiled.html),
        subTimelineWaitMemo
      };
      const PROBE_MAX_ATTEMPTS = 2;
      for (let attempt = 1; attempt <= PROBE_MAX_ATTEMPTS; attempt++) {
        const attemptStart = Date.now();
        try {
          log.info("Creating capture session...", { attempt, maxAttempts: PROBE_MAX_ATTEMPTS });
          probeSession = await createCaptureSession4(
            fileServer.url,
            join8(workDir, "probe"),
            captureOpts,
            null,
            probeCfg
          );
          log.info("Waiting for composition to initialize...", { attempt });
          const heartbeat = setInterval(() => {
            const elapsed = ((Date.now() - attemptStart) / 1e3).toFixed(1);
            log.info(`Still waiting for browser initialization... (${elapsed}s elapsed)`);
          }, 3e4);
          try {
            await initializeSession4(probeSession);
          } finally {
            clearInterval(heartbeat);
          }
        } catch (err) {
          const isTransient = isTransientBrowserError(err);
          const errMsg = err instanceof Error ? err.message : String(err);
          log.warn("Browser probe attempt failed", {
            attempt,
            maxAttempts: PROBE_MAX_ATTEMPTS,
            isTransient,
            error: errMsg,
            elapsedMs: Date.now() - attemptStart
          });
          if (probeSession) {
            try {
              await closeCaptureSession4(probeSession);
            } catch (closeErr) {
              log.warn("Failed to close crashed probe session", {
                error: closeErr instanceof Error ? closeErr.message : String(closeErr)
              });
            }
            probeSession = null;
          }
          if (isTransient && attempt < PROBE_MAX_ATTEMPTS) {
            log.info("Retrying with a fresh browser session...", {
              attempt: attempt + 1,
              maxAttempts: PROBE_MAX_ATTEMPTS
            });
            assertNotAborted();
            continue;
          }
          throw err;
        }
        log.info("Composition ready", {
          attempt,
          initMs: Date.now() - attemptStart
        });
        break;
      }
      assertNotAborted();
      if (!probeSession) {
        throw new Error("Browser probe completed without a capture session");
      }
      lastBrowserConsole = probeSession.browserConsoleBuffer;
      if (probeSession.launchCaptureMode === "beginframe") {
        const probeTimeoutMs = Number(process.env.PRODUCER_BEGINFRAME_PROBE_TIMEOUT_MS) > 0 ? Number(process.env.PRODUCER_BEGINFRAME_PROBE_TIMEOUT_MS) : 3e4;
        const livenessStart = Date.now();
        const probeTick = deriveBeginFrameProbeTimeTicks(
          probeSession.beginFrameTimeTicks,
          probeSession.beginFrameIntervalMs
        );
        const alive = await probeBeginFrameLiveness(
          probeSession.page,
          probeTimeoutMs,
          probeTick,
          probeSession.beginFrameIntervalMs
        );
        assertNotAborted();
        if (alive) {
          log.info("BeginFrame liveness probe passed", {
            probeMs: Date.now() - livenessStart
          });
        } else {
          beginFrameStalled = true;
          log.warn(
            "[Render] BeginFrame liveness probe timed out: this composition stalls BeginFrame on this host (SwiftShader heavy-layer pattern). Relaunching the probe browser in screenshot capture mode; the render will use screenshot capture throughout.",
            { probeTimeoutMs }
          );
          lastBrowserConsole = probeSession.browserConsoleBuffer;
          await closeCaptureSession4(probeSession).catch(() => {
          });
          probeSession = await createCaptureSession4(
            fileServer.url,
            join8(workDir, "probe-screenshot"),
            captureOpts,
            null,
            { ...probeCfg, forceScreenshot: true }
          );
          await initializeSession4(probeSession);
          assertNotAborted();
          lastBrowserConsole = probeSession.browserConsoleBuffer;
        }
      }
      const session = probeSession;
      if (composition.duration <= 0) {
        log.info("Discovering composition duration...");
        const discoveredDuration = await getCompositionDuration(session);
        lengthSource = reportedLengthSource(await getCompositionLengthSource(session));
        assertNotAborted();
        log.info("Probed composition duration from browser", {
          discoveredDuration,
          staticDuration: compiled.staticDuration,
          lengthSource
        });
        composition.duration = discoveredDuration;
      } else {
        log.info("Using static duration from data-duration attribute", {
          duration: composition.duration
        });
      }
      if (compiled.unresolvedCompositions.length > 0) {
        const resolutions = await resolveCompositionDurations(
          session.page,
          compiled.unresolvedCompositions
        );
        assertNotAborted();
        if (resolutions.length > 0) {
          compiled = await recompileWithResolutions(
            compiled,
            resolutions,
            projectDir,
            join8(workDir, "downloads")
          );
          assertNotAborted();
          composition.videos = compiled.videos;
          composition.audios = compiled.audios;
          composition.images = compiled.images;
          writeCompiledArtifacts(compiled, workDir, Boolean(job.config.debug));
        }
      }
      log.info("Discovering media assets from browser DOM...");
      const browserMedia = await discoverMediaFromBrowser(session.page);
      assertNotAborted();
      if (browserMedia.length > 0) {
        const existingVideoIds = new Set(composition.videos.map((v) => v.id));
        const existingAudioIds = new Set(composition.audios.map((a) => a.id));
        const existingImageIds = new Set(composition.images.map((image) => image.id));
        const authoredStarts = authoredMediaStarts(compiled.html);
        pruneMutedBrowserMedia(composition, browserMedia, existingAudioIds);
        for (const el of browserMedia) {
          if (!el.src || el.src === "about:blank") continue;
          if (el.muted && el.tagName === "audio") continue;
          let src = el.src;
          if (fileServer && src.startsWith(fileServer.url)) {
            src = src.slice(fileServer.url.length).replace(/^\//, "");
          }
          if (el.tagName === "video") {
            if (existingVideoIds.has(el.id)) {
              const existing = composition.videos.find((v) => v.id === el.id);
              if (existing) {
                const sourceChanged = existing.src !== src;
                if (sourceChanged) {
                  existing.src = src;
                }
                const projectedEnd = projectBrowserEndToCompositionTimeline(
                  existing.start,
                  el.start,
                  resolveBrowserMediaEnd(el.start, el.end, el.duration)
                );
                existing.end = reconcileBrowserMediaEnd(
                  existing.end,
                  projectedEnd,
                  sourceChanged,
                  el.durationInferred
                );
                adoptRuntimeMediaTiming(
                  composition,
                  el,
                  authoredStarts.get(el.id) ?? existing.mediaStart
                );
                if (el.hasAudio && !el.muted && !existing.hasAudio) {
                  existing.hasAudio = true;
                }
                if (el.loop && !existing.loop) {
                  existing.loop = true;
                }
                const audio = composition.audios.find(
                  (audio2) => audio2.type === "video" && audio2.id === `${el.id}-audio`
                );
                if (audio) audio.loop = existing.loop;
              }
            } else if (!compiled.droppedMediaIds.has(el.id)) {
              composition.videos.push({
                id: el.id,
                src,
                start: el.start,
                end: resolveBrowserMediaEnd(el.start, el.end, el.duration),
                mediaStart: el.mediaStart,
                playbackRate: el.playbackRate,
                loop: el.loop,
                hasAudio: el.hasAudio && !el.muted
              });
              existingVideoIds.add(el.id);
            }
          } else if (el.tagName === "audio") {
            if (existingAudioIds.has(el.id)) {
              const existing = composition.audios.find((a) => a.id === el.id);
              if (existing) {
                const sourceChanged = existing.src !== src;
                if (sourceChanged) {
                  existing.src = src;
                }
                const projectedEnd = projectBrowserEndToCompositionTimeline(
                  existing.start,
                  el.start,
                  resolveBrowserMediaEnd(el.start, el.end, el.duration)
                );
                existing.end = reconcileBrowserMediaEnd(
                  existing.end,
                  projectedEnd,
                  sourceChanged,
                  el.durationInferred
                );
                adoptRuntimeMediaTiming(
                  composition,
                  el,
                  authoredStarts.get(el.id) ?? existing.mediaStart
                );
                existing.loop = el.loop;
                if (el.volume > 0 && Math.abs((existing.volume ?? 1) - el.volume) > BROWSER_MEDIA_EPSILON) {
                  existing.volume = el.volume;
                }
              }
            } else if (!compiled.droppedMediaIds.has(el.id)) {
              composition.audios.push({
                id: el.id,
                src,
                start: el.start,
                end: resolveBrowserMediaEnd(el.start, el.end, el.duration),
                mediaStart: el.mediaStart,
                loop: el.loop,
                playbackRate: el.playbackRate,
                layer: 0,
                volume: el.volume,
                type: "audio"
              });
              existingAudioIds.add(el.id);
            }
          } else if (el.tagName === "image") {
            if (existingImageIds.has(el.id)) {
              const existing = composition.images.find((image) => image.id === el.id);
              if (existing) {
                existing.src = src;
                const runtimeEnd = resolveBrowserMediaEnd(el.start, el.end, el.duration);
                const projectedEnd = projectBrowserEndToCompositionTimeline(
                  existing.start,
                  el.start,
                  runtimeEnd
                );
                if (projectedEnd > existing.start && Math.abs(existing.end - projectedEnd) > BROWSER_MEDIA_EPSILON) {
                  existing.end = projectedEnd;
                }
              }
            } else if (!compiled.droppedMediaIds.has(el.id)) {
              composition.images.push({
                id: el.id,
                src,
                start: el.start,
                end: resolveBrowserMediaEnd(el.start, el.end, el.duration)
              });
              existingImageIds.add(el.id);
            }
          }
        }
      }
      if (composition.audios.length > 0) {
        log.info("Discovering audio volume automation...", {
          audioCount: composition.audios.length
        });
        const automation = await discoverAudioVolumeAutomationFromTimeline(
          session.page,
          composition.audios.map((audio) => audio.id),
          composition.duration,
          fpsToNumber6(job.config.fps)
        );
        assertNotAborted();
        if (automation.length > 0) {
          const byId = new Map(automation.map((entry) => [entry.id, entry.keyframes]));
          for (const audio of composition.audios) {
            const keyframes = byId.get(audio.id);
            if (!keyframes || keyframes.length === 0) continue;
            audio.volumeKeyframes = keyframes;
            log.info(`[Probe] Runtime audio volume automation: ${audio.id}`, {
              keyframeCount: keyframes.length
            });
          }
        }
      }
      if (composition.videos.length > 0) {
        log.info("Discovering video visibility windows...", {
          videoCount: composition.videos.length
        });
        const visibilityWindows = await discoverVideoVisibilityFromTimeline(
          session.page,
          composition.duration
        );
        assertNotAborted();
        for (const win of visibilityWindows) {
          const video = composition.videos.find((v) => v.id === win.videoId);
          if (!video) continue;
          if (win.visibleStart >= 0 && win.visibleEnd > win.visibleStart) {
            video.start = win.visibleStart;
            video.end = win.visibleEnd;
            log.info(
              `[Probe] Runtime video discovery: ${video.id} visible ${win.visibleStart.toFixed(2)}s to ${win.visibleEnd.toFixed(2)}s`
            );
          }
        }
      }
    }
    await preflightCompositionAssetMediaTypes({
      projectDir,
      compiledDir: join8(workDir, "compiled"),
      composition,
      signal: abortSignal
    });
    assertNotAborted();
  } catch (error) {
    if (probeSession) {
      try {
        await closeCaptureSession4(probeSession);
      } catch (closeError) {
        log.warn("Failed to close probe session after media preflight failure", {
          error: closeError instanceof Error ? closeError.message : String(closeError)
        });
      }
      probeSession = null;
    }
    if (fileServer) {
      closeFileServerSafely(fileServer, "probe media preflight", log);
      fileServer = null;
    }
    throw error;
  }
  const browserProbeMs = Date.now() - probeStart;
  const duration = composition.duration;
  const totalFrames = durationToFrameCount(duration, fpsToNumber6(job.config.fps));
  if (duration <= 0) {
    const diagnostics = [];
    try {
      if (probeSession) {
        const timelinesInfo = await probeSession.page.evaluate(() => {
          const tl = window.__timelines;
          const hf = window.__hf;
          return {
            timelineKeys: tl ? Object.keys(tl) : [],
            hfDuration: hf?.duration ?? null,
            gsapLoaded: typeof window.gsap !== "undefined"
          };
        });
        if (!timelinesInfo.gsapLoaded) {
          diagnostics.push(
            "GSAP is not loaded. The CDN script may have failed to download. Bundle GSAP locally in your project instead of using a CDN <script src>."
          );
        } else if (timelinesInfo.timelineKeys.length === 0) {
          diagnostics.push(
            'GSAP is loaded but no timelines were registered on window.__timelines. Ensure your script creates a timeline and assigns it: window.__timelines["main"] = gsap.timeline({ paused: true });'
          );
        }
        for (const line of probeSession.browserConsoleBuffer) {
          if (/\[Browser:ERROR\]|\[Browser:PAGEERROR\]|404|net::ERR_/i.test(line)) {
            diagnostics.push(`Browser: ${line}`);
          }
        }
      }
    } catch (err) {
      log.warn("Failed to gather browser diagnostics for zero-duration composition", {
        error: err instanceof Error ? err.message : String(err)
      });
      diagnostics.push("(Could not gather browser diagnostics. The page may have crashed.)");
    }
    const hint = diagnostics.length > 0 ? "\n\nDiagnostics:\n  - " + diagnostics.join("\n  - ") : "\n\nCheck that GSAP timelines are registered on window.__timelines.";
    throw new Error("Composition duration is 0, so this would produce a black video." + hint);
  }
  if (probeSession) {
    const failedRequests = probeSession.browserConsoleBuffer.filter(isActionableProbeFailure);
    if (failedRequests.length > 0) {
      log.warn("Browser encountered network failures during page load:", {
        failures: failedRequests.slice(0, 10)
      });
      for (const line of failedRequests.slice(0, 5)) {
        console.warn(`[Render] Asset load failure: ${line}`);
      }
    }
  }
  return {
    compiled,
    fileServer,
    probeSession,
    lastBrowserConsole,
    duration,
    lengthSource,
    totalFrames,
    browserProbeMs,
    beginFrameStalled
  };
}
function pruneMutedBrowserMedia(composition, browserMedia, existingAudioIds) {
  for (const el of browserMedia) {
    if (!el.muted) continue;
    if (el.tagName === "video") {
      const existing = composition.videos.find((v) => v.id === el.id);
      if (existing) existing.hasAudio = false;
    } else {
      const idx = composition.audios.findIndex((a) => a.id === el.id);
      if (idx >= 0) composition.audios.splice(idx, 1);
      existingAudioIds?.delete(el.id);
    }
  }
}

// src/services/render/planValidation.ts
import { BROWSER_GPU_NOT_SOFTWARE } from "@hyperframes/engine";
import {
  collectFontFamilyCustomProperties,
  GENERIC_FAMILIES,
  iterateFontFamilyDeclarations,
  resolveFontFamilyDeclarationFamilies
} from "@hyperframes/core/fonts/embed";
import { BROWSER_GPU_NOT_SOFTWARE as BROWSER_GPU_NOT_SOFTWARE2 } from "@hyperframes/engine";
import { parseFontFamilyValue } from "@hyperframes/core/fonts/embed";
var PlanValidationError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "PlanValidationError";
    this.code = code;
  }
};
var SYSTEM_FONT_USED = "SYSTEM_FONT_USED";
var DISTRIBUTED_DURATION_OUT_OF_RANGE = "DISTRIBUTED_DURATION_OUT_OF_RANGE";
var RENDER_DURATION_OUT_OF_RANGE = DISTRIBUTED_DURATION_OUT_OF_RANGE;
var MAX_DISTRIBUTED_DURATION_SECONDS = 24 * 60 * 60;
var MAX_RENDER_DURATION_SECONDS = MAX_DISTRIBUTED_DURATION_SECONDS;
function validateNoGpuEncode(config) {
  if (config.useGpu === true) {
    throw new PlanValidationError(
      BROWSER_GPU_NOT_SOFTWARE,
      "[planValidation] GPU encode is banned in distributed mode: config.useGpu === true. Distributed retries must be byte-identical, but NVENC/QSV/VAAPI produce different output across machines. Set useGpu=false (the default): software libx264/libx265 is the only supported encoder in distributed mode."
    );
  }
  if (config.browserGpuMode !== void 0 && config.browserGpuMode !== "software") {
    throw new PlanValidationError(
      BROWSER_GPU_NOT_SOFTWARE,
      `[planValidation] Hardware browser GPU is banned in distributed mode: config.browserGpuMode === ${JSON.stringify(config.browserGpuMode)}. Hardware GL is bitwise unstable across drivers. Set browserGpuMode="software" so Chrome launches with --use-gl=swiftshader.`
    );
  }
}
function validateNoSystemFonts(compiledHtml) {
  const customProperties = collectFontFamilyCustomProperties(compiledHtml);
  for (const { surface, declaration } of iterateFontFamilyDeclarations(compiledHtml)) {
    if (surface === "font") continue;
    const families = resolveFontFamilyDeclarationFamilies(declaration, customProperties);
    if (families.length === 0) continue;
    const primaryRaw = families[0];
    if (!GENERIC_FAMILIES.has(primaryRaw.toLowerCase())) continue;
    throw new PlanValidationError(
      SYSTEM_FONT_USED,
      `[planValidation] Composition declares a host-OS / generic primary ${surface}: ${JSON.stringify(primaryRaw)} (full declaration: ${JSON.stringify(declaration.trim())}). Distributed chunk workers render in a Linux container and cannot produce byte-identical output for fonts that resolve to host system installations. Use a deterministic web font (e.g. Inter, Montserrat, or another @fontsource family) as the primary family; generic names like "sans-serif" / "-apple-system" / "system-ui" are only allowed as fallbacks.`
    );
  }
}
function validateRenderDuration(input) {
  const { duration, totalFrames, fps } = input;
  const maxFrames = Math.ceil(MAX_RENDER_DURATION_SECONDS * fps);
  if (Number.isFinite(duration) && duration > 0 && Number.isFinite(fps) && fps > 0 && Number.isSafeInteger(totalFrames) && totalFrames > 0 && totalFrames <= maxFrames) {
    return;
  }
  throw new PlanValidationError(
    RENDER_DURATION_OUT_OF_RANGE,
    `[planValidation] Render duration is out of range: duration=${String(duration)}s totalFrames=${String(totalFrames)} fps=${String(fps)} (maxDuration=${String(MAX_RENDER_DURATION_SECONDS)}s, maxFrames=${String(maxFrames)}). This usually means an unbounded timeline escaped into render planning, such as GSAP repeat:-1 / yoyo loops without an explicit finite root duration. Add a finite data-duration or replace infinite repeats with a finite repeat count before rendering.`
  );
}
function validateDistributedDuration(input) {
  validateRenderDuration(input);
}

// src/services/render/stages/extractVideosStage.ts
import { existsSync as existsSync7 } from "node:fs";
import { join as join9 } from "node:path";
import {
  classifyVideoExtractionError,
  createFrameLookupTable,
  detectTransfer,
  extractAllVideoFrames,
  extractMediaMetadata as extractMediaMetadata3,
  isVideoPastTimelineEnd,
  isHdrColorSpace as isHdrColorSpace2,
  rebaseVideoToWindow,
  resolveFinalFrameExtractionWindow as resolveFinalFrameExtractionWindow2,
  resolveVideoExtractionWindow as resolveVideoExtractionWindow2,
  isHttpUrl as isHttpUrl2,
  resolveProjectRelativeSrc as resolveProjectRelativeSrc3,
  runVideoExtractionWithRetry,
  safeVideoExtractionSourceIdentity,
  videoAudioId as videoAudioId2
} from "@hyperframes/engine";

// src/services/render/extractionFailureMetadata.ts
function stringOrEmpty(value) {
  return value === void 0 ? "" : value;
}
function retrySortTuple(retry) {
  return retry === void 0 ? ["", -1, -1] : [retry.phase, retry.used, retry.budget];
}
function extractionFailureGroupSortTuple(group) {
  const retry = retrySortTuple(group.retry);
  return [
    group.kind,
    stringOrEmpty(group.sourceFingerprint),
    stringOrEmpty(group.host),
    stringOrEmpty(group.statusClass),
    retry[0],
    retry[1],
    retry[2]
  ];
}
function compareExtractionFailureGroups(left, right) {
  const leftTuple = extractionFailureGroupSortTuple(left);
  const rightTuple = extractionFailureGroupSortTuple(right);
  for (let index = 0; index < leftTuple.length; index += 1) {
    const leftValue = leftTuple[index];
    const rightValue = rightTuple[index];
    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
  }
  return 0;
}
function extractionFailureGroupIdentityKey(group) {
  return JSON.stringify(extractionFailureGroupSortTuple(group));
}

// src/services/render/stages/extractVideosStage.ts
var MAX_EXTRACTION_FAILURE_GROUPS = 8;
function buildExtractionFailureMetadata(inputs) {
  const kindCounts = /* @__PURE__ */ new Map();
  const grouped = /* @__PURE__ */ new Map();
  for (const input of inputs) {
    kindCounts.set(input.kind, (kindCounts.get(input.kind) ?? 0) + input.affectedElementCount);
    const key = extractionFailureGroupIdentityKey(input);
    const existing = grouped.get(key);
    if (existing) {
      existing.affectedElementCount += input.affectedElementCount;
    } else {
      grouped.set(key, { ...input });
    }
  }
  const allGroups = [...grouped.values()].sort(compareExtractionFailureGroups);
  return {
    schemaVersion: 1,
    kindCounts: [...kindCounts].map(([kind, affectedElementCount]) => ({
      kind,
      affectedElementCount
    })).sort((a, b) => a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0),
    groups: allGroups.slice(0, MAX_EXTRACTION_FAILURE_GROUPS),
    omittedGroupCount: Math.max(0, allGroups.length - MAX_EXTRACTION_FAILURE_GROUPS)
  };
}
function extractionFailureMetadataFromResult(result) {
  return buildExtractionFailureMetadata(
    result.errors.map((failure) => ({
      kind: failure.kind ?? "internal",
      affectedElementCount: 1,
      ...failure.group
    }))
  );
}
function safeVideoExtractionSourceLogMetadata(source) {
  const identity = safeVideoExtractionSourceIdentity(source);
  return identity ? { sourceType: "remote", ...identity } : { sourceType: "local" };
}
function resolveVideoExtractionPolicy(env = process.env) {
  const rawMode = env.HF_VIDEO_EXTRACTION_FAILURE_MODE?.trim().toLowerCase();
  const failureMode = rawMode === "observe" || rawMode === "off" ? rawMode : "enforce";
  const maxTransientRetries = failureMode !== "off" && env.HF_VIDEO_EXTRACTION_MAX_RETRIES?.trim() === "1" ? 1 : 0;
  return { failureMode, maxTransientRetries };
}
var VideoExtractionStageError = class extends Error {
  constructor(code, retryable, failures, extractionFailure = buildExtractionFailureMetadata(
    failures.map((failure) => ({
      kind: failure.kind,
      affectedElementCount: failure.count
    }))
  ), ffmpegReason) {
    const total = failures.reduce((sum2, failure) => sum2 + failure.count, 0);
    const breakdown = failures.map((failure) => `${failure.kind}=${failure.count}`).join(",");
    const reason = ffmpegReason ? `: ffmpeg said: ${ffmpegReason}` : "";
    super(`Video extraction failed for ${total} source(s) [${code}; ${breakdown}]${reason}`);
    this.code = code;
    this.retryable = retryable;
    this.failures = failures;
    this.extractionFailure = extractionFailure;
    this.name = "VideoExtractionStageError";
    this.publicMetadata = { extractionFailure };
  }
  code;
  retryable;
  failures;
  extractionFailure;
  /**
   * Producer servers may expose this explicitly public, JSON-compatible data
   * without knowing its schema. Boundary adapters remain responsible for
   * validating and applying policy to it.
   */
  publicMetadata;
};
function assertVideoExtractionSucceeded(result) {
  throwIfEncoderInterrupted(result);
  const error = buildVideoExtractionStageError(result);
  if (error) throw error;
}
function throwIfEncoderInterrupted(result) {
  const interrupted = result.errors.find((failure) => failure.kind === "external_interruption");
  if (!interrupted) return;
  throw encoderFailureError("Video frame extraction failed", {
    error: String(interrupted.error),
    failureReason: "external_interruption"
  });
}
function buildVideoExtractionStageError(result) {
  if (result.success && result.errors.length === 0) return null;
  const counts = /* @__PURE__ */ new Map();
  for (const failure of result.errors) {
    const kind = failure.kind ?? "internal";
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  const failures = Array.from(counts, ([kind, count]) => ({ kind, count })).sort(
    (a, b) => a.kind.localeCompare(b.kind)
  );
  const retryable = result.errors.length > 0 && result.errors.every((failure) => failure.retryable === true);
  return new VideoExtractionStageError(
    retryable ? "VIDEO_EXTRACTION_FAILED" : "VIDEO_SOURCE_UNRENDERABLE",
    retryable,
    failures,
    extractionFailureMetadataFromResult(result),
    result.errors.find((failure) => failure.ffmpegReason)?.ffmpegReason
  );
}
function buildHdrProbeStageError(failures) {
  const counts = /* @__PURE__ */ new Map();
  for (const failure of failures) {
    counts.set(failure.kind, (counts.get(failure.kind) ?? 0) + 1);
  }
  const summary = Array.from(counts, ([kind, count]) => ({ kind, count })).sort(
    (a, b) => a.kind.localeCompare(b.kind)
  );
  const retryable = failures.length > 0 && failures.every((failure) => failure.retryable);
  return new VideoExtractionStageError(
    retryable ? "VIDEO_EXTRACTION_FAILED" : "VIDEO_SOURCE_UNRENDERABLE",
    retryable,
    summary,
    buildExtractionFailureMetadata(
      failures.map((failure) => ({
        kind: failure.kind,
        affectedElementCount: 1
      }))
    )
  );
}
function isHdrProbeFailure(failure) {
  return failure !== null;
}
function throwHdrProbeFailures(failures, mode) {
  if (failures.length === 0) return;
  const interrupted = failures.find(
    (failure) => failure.classified.kind === "external_interruption"
  );
  if (interrupted) {
    throw encoderFailureError("Video HDR probe failed", {
      error: interrupted.error instanceof Error ? interrupted.error.message : String(interrupted.error),
      failureReason: "external_interruption"
    });
  }
  if (mode === "enforce") {
    throw buildHdrProbeStageError(failures.map((failure) => failure.classified));
  }
  const firstFailure = failures[0];
  if (firstFailure) throw firstFailure.error;
}
function applyVideoExtractionFailurePolicy(result, policy, log) {
  const error = buildVideoExtractionStageError(result);
  if (!error || policy.failureMode === "off") return null;
  log?.warn("Video extraction produced typed source failures", {
    mode: policy.failureMode,
    code: error.code,
    retryable: error.retryable,
    failures: error.failures
  });
  return policy.failureMode === "enforce" ? error : null;
}
async function probeColorSpaceSafely(path, log) {
  try {
    const meta = await extractMediaMetadata3(path);
    return meta.colorSpace;
  } catch (error) {
    log?.warn("HDR color-space probe failed; treating source as SDR", {
      path,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
async function runExtractVideosStage(input) {
  const {
    projectDir,
    compiledDir,
    job,
    cfg,
    log,
    composition,
    abortSignal,
    assertNotAborted,
    materializeSymlinks,
    deferRangeExtraction,
    urlByAbsentLocalPath
  } = input;
  const stage2Start = Date.now();
  const extractionPolicy = resolveVideoExtractionPolicy();
  composition.videos = composition.videos.filter(
    (video) => !isVideoPastTimelineEnd(video, composition.duration)
  );
  let frameLookup = null;
  let extractionResult = null;
  let failureToEnforce = null;
  let videoReadinessSkipIds = [];
  let videoMetadataHints = [];
  const nativeHdrVideoIds = /* @__PURE__ */ new Set();
  const videoTransfers = /* @__PURE__ */ new Map();
  let hdrProbeTransientRetries = 0;
  if (job.config.hdrMode !== "force-sdr" && composition.videos.length > 0) {
    log?.info("Probing video color spaces...", { videoCount: composition.videos.length });
    const probeFailures = await Promise.all(
      composition.videos.map(async (v) => {
        const videoPath = resolveProjectRelativeSrc3(v.src, projectDir, compiledDir);
        if (!existsSync7(videoPath)) return null;
        try {
          const attempted = extractionPolicy.maxTransientRetries === 0 ? { result: await extractMediaMetadata3(videoPath), retries: 0 } : await runVideoExtractionWithRetry(() => extractMediaMetadata3(videoPath), {
            signal: abortSignal,
            maxTransientRetries: extractionPolicy.maxTransientRetries,
            onRetry: () => {
              hdrProbeTransientRetries += 1;
            }
          });
          const meta = attempted.result;
          if (isHdrColorSpace2(meta.colorSpace)) {
            nativeHdrVideoIds.add(v.id);
            videoTransfers.set(v.id, detectTransfer(meta.colorSpace));
          }
          return null;
        } catch (error) {
          if (extractionPolicy.failureMode === "off") throw error;
          const classified = classifyVideoExtractionError(error);
          log?.warn("Video HDR metadata probe failed", {
            mode: extractionPolicy.failureMode,
            kind: classified.kind,
            retryable: classified.retryable,
            transientRetries: hdrProbeTransientRetries
          });
          return { error, classified };
        }
      })
    );
    throwHdrProbeFailures(probeFailures.filter(isHdrProbeFailure), extractionPolicy.failureMode);
  }
  const nativeHdrImageIds = /* @__PURE__ */ new Set();
  const imageTransfers = /* @__PURE__ */ new Map();
  const hdrImageSrcPaths = /* @__PURE__ */ new Map();
  const imageColorSpaces = [];
  if (job.config.hdrMode !== "force-sdr" && composition.images.length > 0) {
    const probed = await Promise.all(
      composition.images.map(async (img) => {
        const imgPath = resolveProjectRelativeSrc3(img.src, projectDir, compiledDir);
        if (!existsSync7(imgPath)) return null;
        const colorSpace = await probeColorSpaceSafely(imgPath, log);
        if (isHdrColorSpace2(colorSpace)) {
          nativeHdrImageIds.add(img.id);
          imageTransfers.set(img.id, detectTransfer(colorSpace));
          hdrImageSrcPaths.set(img.id, imgPath);
        }
        return colorSpace;
      })
    );
    imageColorSpaces.push(...probed);
  }
  if (composition.videos.length > 0) {
    const totalVideos = composition.videos.length;
    for (let i = 0; i < totalVideos; i++) {
      const v = composition.videos[i];
      log?.info(
        `Extracting frames from video ${i + 1}/${totalVideos}`,
        safeVideoExtractionSourceLogMetadata(v.src)
      );
    }
    extractionResult = await extractAllVideoFrames(
      composition.videos,
      projectDir,
      // Preserve the configured rational through FFmpeg extraction. NTSC
      // rates must remain `30000/1001`, not a rounded JavaScript decimal,
      // because short boundary counts can differ by one frame.
      {
        fps: job.config.fps,
        outputDir: join9(compiledDir, "__hyperframes_video_frames"),
        format: job.config.videoFrameFormat ?? "auto",
        toneMapHdrToSdr: rendersSdrOnly(job.config),
        timelineEnd: composition.duration,
        maxTransientRetries: extractionPolicy.maxTransientRetries,
        collectProbeFailures: extractionPolicy.failureMode === "enforce",
        deferRangeExtraction,
        contentKeyedDirs: [join9(compiledDir, REMOTE_MEDIA_SUBDIR)],
        urlByAbsentLocalPath
      },
      abortSignal,
      cfg,
      compiledDir
    );
    extractionResult.phaseBreakdown.transientRetries = (extractionResult.phaseBreakdown.transientRetries ?? 0) + hdrProbeTransientRetries;
    assertNotAborted();
    throwIfEncoderInterrupted(extractionResult);
    failureToEnforce = applyVideoExtractionFailurePolicy(extractionResult, extractionPolicy, log);
    materializeExtractedFramesForCompiledDir(extractionResult.extracted, compiledDir, {
      materializeSymlinks
    });
    if (extractionResult.extracted.length > 0) {
      frameLookup = createFrameLookupTable(
        composition.videos,
        extractionResult.extracted,
        resolveRenderFpsConfig(job.config.fps).value
      );
    }
    videoReadinessSkipIds = collectVideoReadinessSkipIds(
      nativeHdrVideoIds,
      extractionResult.extracted
    );
    videoMetadataHints = collectVideoMetadataHints(extractionResult.extracted);
    appendAutoDetectedVideoAudio(composition, extractionResult.extracted);
  }
  const videoExtractMs = Date.now() - stage2Start;
  return {
    extractionResult,
    frameLookup,
    videoReadinessSkipIds,
    videoMetadataHints,
    nativeHdrVideoIds,
    videoTransfers,
    nativeHdrImageIds,
    imageTransfers,
    hdrImageSrcPaths,
    imageColorSpaces,
    videoExtractMs,
    failureToEnforce
  };
}
function appendAutoDetectedVideoAudio(composition, extracted) {
  const existingAudioSrcs = new Set(composition.audios.map((a) => a.src));
  for (const ext of extracted) {
    if (!ext.metadata.hasAudio) continue;
    const video = composition.videos.find((v) => v.id === ext.videoId);
    if (!video || !video.hasAudio || video.hidden || existingAudioSrcs.has(video.src)) continue;
    composition.audios.push({
      id: videoAudioId2(video.id),
      src: video.src,
      start: video.start,
      end: video.end,
      mediaStart: video.mediaStart,
      playbackRate: video.playbackRate,
      loop: video.loop,
      layer: 0,
      volume: 1,
      type: "video"
    });
    existingAudioSrcs.add(video.src);
  }
}
async function appendVideoAudioFromProbe(input) {
  const { projectDir, compiledDir, composition, urlByAbsentLocalPath } = input;
  const videos = composition.videos.filter(
    (video) => !isVideoPastTimelineEnd(video, composition.duration)
  );
  const probed = await Promise.all(
    videos.map(async (video) => {
      const path = isHttpUrl2(video.src) ? video.src : resolveProjectRelativeSrc3(video.src, projectDir, compiledDir);
      const readFrom = urlByAbsentLocalPath?.get(path) ?? path;
      if (!isHttpUrl2(readFrom) && !existsSync7(readFrom)) return null;
      const metadata = await extractMediaMetadata3(readFrom);
      const window2 = await resolveFinalFrameExtractionWindow2(
        readFrom,
        video,
        metadata,
        resolveVideoExtractionWindow2(video, metadata, composition.duration)
      );
      if (window2.durationSeconds <= 0) return null;
      rebaseVideoToWindow(video, window2);
      return { videoId: video.id, metadata };
    })
  );
  appendAutoDetectedVideoAudio(
    composition,
    probed.filter((entry) => entry !== null)
  );
}

// src/services/render/stages/audioStage.ts
import { join as join11 } from "node:path";
import {
  MIXED_AUDIO_FILENAME,
  audioFailureDiagnostics,
  processCompositionAudio,
  removeScratch as removeScratch2,
  collectScratchLeftovers
} from "@hyperframes/engine";

// src/services/render/audioPadTrim.ts
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { dirname as dirname6, join as join10 } from "node:path";
import {
  DEFAULT_CONFIG,
  describeFfmpegFailure as describeFfmpegFailure2,
  encodeAac,
  extractAudioMetadata as extractAudioMetadata3,
  getFfprobeBinary,
  ManagedChildProcess,
  removeScratch,
  renameWithRetry as renameWithRetry5,
  runFfmpeg as runFfmpeg5,
  trackChildProcess
} from "@hyperframes/engine";
import { redactKnownPaths, redactTelemetryString as redactTelemetryString3 } from "@hyperframes/core";

// src/services/render/audioTruePeak.ts
import {
  aacSegmentCount,
  describeFfmpegFailure,
  extractAudioMetadata as extractAudioMetadata2,
  runFfmpeg as runFfmpeg4
} from "@hyperframes/engine";
var toDbfs = (token) => token.toLowerCase() === "-inf" ? Number.NEGATIVE_INFINITY : Number(token);
function checkedDbfs(value) {
  if (Number.isNaN(value) || value === Number.POSITIVE_INFINITY) {
    throw new Error("[audioTruePeak] FFmpeg did not report AAC true peak");
  }
  return value;
}
async function scanTruePeak(audioPath, trim, timeoutMs, signal, seekSeconds = 0) {
  let firstBlock;
  let laterBlocks = Number.NEGATIVE_INFINITY;
  let partialLine = "";
  const readLines = (chunk) => {
    const lines = (partialLine + chunk).split(/\r|\n/);
    partialLine = lines.pop() ?? "";
    for (const line of lines) {
      const ftpk = /FTPK:([^d]*)dBFS/.exec(line)?.[1];
      if (!ftpk) continue;
      const block = Math.max(...ftpk.trim().split(/\s+/).map(toDbfs));
      if (firstBlock === void 0) firstBlock = block;
      else laterBlocks = Math.max(laterBlocks, block);
    }
  };
  const result = await runFfmpeg4(
    [
      ...seekSeconds > 0 ? ["-ss", String(seekSeconds)] : [],
      ...[
        "-i",
        audioPath,
        "-map",
        "0:a:0",
        "-vn",
        "-af",
        `${trim}ebur128=peak=true`,
        "-f",
        "null",
        "-"
      ]
    ],
    { signal, timeout: timeoutMs, onStderr: readLines }
  );
  if (!result.success) {
    throw new Error(`[audioTruePeak] ${describeFfmpegFailure(result, timeoutMs)}`);
  }
  const summary = [...result.stderr.matchAll(/^\s*Peak:\s*([+-]?(?:[\d.]+|inf)) dBFS$/gim)];
  return {
    peak: checkedDbfs(toDbfs(summary.at(-1)?.[1] ?? "nan")),
    firstBlock: checkedDbfs(firstBlock ?? Number.NEGATIVE_INFINITY),
    laterBlocks: checkedDbfs(laterBlocks)
  };
}
async function measureTruePeakDbfs(audioPath, options) {
  const { timeoutMs, signal } = options;
  const wholeFile = async () => (await scanTruePeak(audioPath, "", timeoutMs, signal)).peak;
  const { durationSeconds, sampleRate } = await extractAudioMetadata2(audioPath, { signal });
  const block = 4800;
  const count = sampleRate === 48e3 && Number.isFinite(durationSeconds) ? aacSegmentCount(durationSeconds) : 1;
  if (count === 1) return wholeFile();
  const cut = (k) => k * Math.floor(durationSeconds * 10 / count) * block;
  const peers = new AbortController();
  const segmentSignal = signal ? AbortSignal.any([signal, peers.signal]) : peers.signal;
  const scans = await Promise.all(
    Array.from({ length: count }, (_, k) => {
      const start = k === 0 ? 0 : cut(k) - block;
      const seekSeconds = Math.max(0, Math.floor(start / sampleRate) - 1);
      const skipped = seekSeconds * sampleRate;
      const end = k === count - 1 ? "" : `:end_sample=${cut(k + 1) - skipped}`;
      return scanTruePeak(
        audioPath,
        `atrim=start_sample=${start - skipped}${end},`,
        timeoutMs,
        segmentSignal,
        seekSeconds
      );
    })
  ).catch((error) => {
    peers.abort();
    throw error;
  });
  const last = scans[count - 1];
  const counted = Math.max(scans[0].peak, ...scans.slice(1).map((scan) => scan.laterBlocks));
  if (last.peak > last.firstBlock || last.peak <= counted) return Math.max(counted, last.peak);
  return wholeFile();
}

// src/services/render/audioPadTrim.ts
var AUDIO_DURATION_TOLERANCE_SECONDS = 1e-3;
var AAC_DELIVERY_TRUE_PEAK_DBFS = -1;
var AAC_TRUE_PEAK_CORRECTION_HEADROOM_DB = 0.5;
var MAX_TRUE_PEAK_CORRECTION_PASSES = 3;
function aacTruePeakCorrectionFilter(targetDurationSeconds, attenuationDb) {
  return `volume=${attenuationDb.toFixed(3)}dB,apad,atrim=0:${formatSeconds(targetDurationSeconds)}`;
}
function buildPadTrimAudioPlan(audioPath, outputPath, sourceDurationSeconds, targetDurationSeconds) {
  const delta = targetDurationSeconds - sourceDurationSeconds;
  const targetSec = formatSeconds(targetDurationSeconds);
  if (Math.abs(delta) < AUDIO_DURATION_TOLERANCE_SECONDS) {
    return {
      operation: "copy",
      steps: [{ kind: "copy", args: ["-i", audioPath, "-c:a", "copy", "-y", outputPath] }],
      cleanupPaths: []
    };
  }
  if (delta > 0) {
    return {
      operation: "pad",
      steps: [{ kind: "normalize", filter: `apad,atrim=0:${targetSec}` }],
      cleanupPaths: []
    };
  }
  return {
    operation: "trim",
    steps: [{ kind: "trim", filter: `atrim=duration=${targetSec},asetpts=PTS-STARTPTS` }],
    cleanupPaths: []
  };
}
function formatSeconds(sec) {
  return sec.toFixed(6);
}
function sanitizeProbeFailure(reason, paths) {
  const message = reason instanceof Error ? reason.message : String(reason);
  const keepFfmpegsLastLineUncapped = Number.POSITIVE_INFINITY;
  return redactTelemetryString3(redactKnownPaths(message, paths), keepFfmpegsLastLineUncapped);
}
async function padOrTrimAudioToVideoFrameCount(input) {
  const probeVideo = input.probeVideoFrameInfo ?? ((videoPath) => defaultProbeVideoFrameInfo(videoPath, input.signal));
  const probeAudio = input.probeAudioInfo ?? defaultProbeAudioInfo;
  const timeoutMs = input.timeoutMs ?? DEFAULT_CONFIG.ffmpegProcessTimeout;
  const runner = input.runFfmpeg ?? ((args) => defaultRunFfmpeg(args, timeoutMs, input.signal));
  const encode = input.encodeAac ?? defaultAacEncoder(timeoutMs, input.signal);
  const probeTruePeak = input.probeAudioTruePeakDbfs ?? (input.runFfmpeg || input.encodeAac ? void 0 : (audioPath, signal) => measureTruePeakDbfs(audioPath, { timeoutMs, signal }));
  const [videoResult, audioResult] = await Promise.allSettled([
    probeVideo(input.videoPath),
    probeAudio(input.audioPath, input.signal)
  ]);
  const probePaths = [input.videoPath, input.audioPath, input.outputPath];
  if (videoResult.status === "rejected") {
    return failResult(
      input.outputPath,
      0,
      audioResult.status === "fulfilled" ? audioResult.value.durationSeconds : 0,
      `audioPadTrim: failed to probe video: ${sanitizeProbeFailure(
        videoResult.reason,
        probePaths
      )}`
    );
  }
  if (audioResult.status === "rejected") {
    return failResult(
      input.outputPath,
      0,
      0,
      `audioPadTrim: failed to probe audio: ${sanitizeProbeFailure(
        audioResult.reason,
        probePaths
      )}`
    );
  }
  const videoInfo = videoResult.value;
  const audioInfo = audioResult.value;
  if (!Number.isFinite(videoInfo.frameCount) || videoInfo.frameCount <= 0 || !Number.isFinite(videoInfo.fpsNum) || videoInfo.fpsNum <= 0 || !Number.isFinite(videoInfo.fpsDen) || videoInfo.fpsDen <= 0) {
    return failResult(
      input.outputPath,
      0,
      audioInfo.durationSeconds,
      `audioPadTrim: invalid video frame info: ${JSON.stringify(videoInfo)}`
    );
  }
  const targetDurationSeconds = videoInfo.frameCount * videoInfo.fpsDen / videoInfo.fpsNum;
  const plan2 = buildPadTrimAudioPlan(
    input.audioPath,
    input.outputPath,
    audioInfo.durationSeconds,
    targetDurationSeconds
  );
  try {
    for (const step of plan2.steps) {
      const ffmpegResult = step.kind === "copy" ? await runner(step.args) : await encode(input.audioPath, input.outputPath, targetDurationSeconds, step.filter);
      if (!ffmpegResult.success) {
        return {
          success: false,
          outputPath: input.outputPath,
          targetDurationSeconds,
          sourceDurationSeconds: audioInfo.durationSeconds,
          operation: plan2.operation,
          error: ffmpegResult.error,
          failureReason: ffmpegResult.failureReason
        };
      }
    }
  } catch (err) {
    return {
      success: false,
      outputPath: input.outputPath,
      targetDurationSeconds,
      sourceDurationSeconds: audioInfo.durationSeconds,
      operation: plan2.operation,
      error: `audioPadTrim: failed to materialize ${plan2.operation}: ${err instanceof Error ? err.message : String(err)}`
    };
  } finally {
    for (const path of plan2.cleanupPaths) removeScratch(path);
  }
  let loweredDb = 0;
  if (probeTruePeak) {
    const correction = await enforceAacTruePeak({
      audioPath: input.outputPath,
      targetDurationSeconds,
      signal: input.signal,
      probeTruePeak,
      encode
    });
    if (!correction.success) {
      return {
        success: false,
        outputPath: input.outputPath,
        targetDurationSeconds,
        sourceDurationSeconds: audioInfo.durationSeconds,
        operation: plan2.operation,
        error: correction.error,
        failureReason: correction.failureReason
      };
    }
    loweredDb = correction.loweredDb ?? 0;
  }
  return {
    success: true,
    outputPath: input.outputPath,
    targetDurationSeconds,
    sourceDurationSeconds: audioInfo.durationSeconds,
    operation: plan2.operation,
    ...loweredDb > 0 ? { audioLoweredDb: loweredDb } : {}
  };
}
async function constrainAacTruePeak(input) {
  const timeoutMs = input.timeoutMs ?? DEFAULT_CONFIG.ffmpegProcessTimeout;
  return enforceAacTruePeak({
    audioPath: input.audioPath,
    sourcePath: input.sourcePath,
    targetDurationSeconds: input.targetDurationSeconds,
    signal: input.signal,
    probeTruePeak: input.probeTruePeakDbfs ?? ((audioPath, signal) => measureTruePeakDbfs(audioPath, { timeoutMs, signal })),
    encode: input.encodeAac ?? defaultAacEncoder(timeoutMs, input.signal, input.sourcePath)
  });
}
async function enforceAacTruePeak(input) {
  let scratchDir;
  try {
    scratchDir = mkdtempSync(join10(dirname6(input.audioPath), ".true-peak-"));
    const correctedPath = join10(scratchDir, "audio.m4a");
    const measurements = [];
    let attenuationDb = 0;
    let sourcePeakDbfs;
    let measuredPath = input.audioPath;
    for (let pass = 0; pass <= MAX_TRUE_PEAK_CORRECTION_PASSES; pass += 1) {
      const truePeakDbfs = await input.probeTruePeak(measuredPath, input.signal);
      measurements.push(
        `pass ${pass}: ${truePeakDbfs.toFixed(3)} dBFS at ${attenuationDb.toFixed(3)} dB attenuation`
      );
      if (Number.isNaN(truePeakDbfs) || truePeakDbfs === Number.POSITIVE_INFINITY) {
        return { success: false, error: "audioPadTrim: FFmpeg reported an invalid true peak" };
      }
      if (truePeakDbfs <= AAC_DELIVERY_TRUE_PEAK_DBFS) {
        if (measuredPath !== correctedPath) return { success: true };
        renameWithRetry5(correctedPath, input.audioPath, { copyFallback: true });
        return { success: true, loweredDb: Number((-attenuationDb).toFixed(2)) };
      }
      if (pass === MAX_TRUE_PEAK_CORRECTION_PASSES) break;
      const headroomDb = AAC_TRUE_PEAK_CORRECTION_HEADROOM_DB * 2 ** pass;
      if (input.sourcePath && sourcePeakDbfs === void 0) {
        sourcePeakDbfs = await input.probeTruePeak(input.sourcePath, input.signal);
      }
      const referenceDbfs = Math.max(truePeakDbfs, (sourcePeakDbfs ?? -Infinity) + attenuationDb);
      attenuationDb += AAC_DELIVERY_TRUE_PEAK_DBFS - headroomDb - referenceDbfs;
      const result = await input.encode(
        input.audioPath,
        correctedPath,
        input.targetDurationSeconds,
        aacTruePeakCorrectionFilter(input.targetDurationSeconds, attenuationDb)
      );
      if (!result.success) {
        return {
          success: false,
          error: sanitizeProbeFailure(
            result.error ?? "audioPadTrim: failed to constrain AAC true peak",
            [input.audioPath, correctedPath]
          ),
          failureReason: result.failureReason
        };
      }
      measuredPath = correctedPath;
    }
    return {
      success: false,
      error: `audioPadTrim: AAC true peak remained above ${AAC_DELIVERY_TRUE_PEAK_DBFS} dBFS after ${MAX_TRUE_PEAK_CORRECTION_PASSES} correction passes; ${measurements.join("; ")}`
    };
  } catch (err) {
    return {
      success: false,
      error: `audioPadTrim: failed to validate AAC true peak: ${sanitizeProbeFailure(
        err,
        scratchDir ? [input.audioPath, scratchDir] : [input.audioPath]
      )}`
    };
  } finally {
    if (scratchDir) removeScratch(scratchDir);
  }
}
function failResult(outputPath, target, source, error) {
  return {
    success: false,
    outputPath,
    targetDurationSeconds: target,
    sourceDurationSeconds: source,
    operation: "copy",
    error
  };
}
async function defaultProbeVideoFrameInfo(videoPath, signal) {
  const fastInfo = await runFfprobeJson(
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=nb_frames,r_frame_rate",
      "-of",
      "json",
      "--",
      videoPath
    ],
    signal
  );
  let stream = fastInfo.streams?.[0];
  const fastCount = Number(stream?.nb_frames);
  if (stream && Number.isFinite(fastCount) && fastCount > 0) {
    return { frameCount: fastCount, ...parseFrameRate(stream.r_frame_rate ?? "") };
  }
  const slowInfo = await runFfprobeJson(
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-count_packets",
      "-show_entries",
      "stream=nb_read_packets,r_frame_rate",
      "-of",
      "json",
      "--",
      videoPath
    ],
    signal
  );
  stream = slowInfo.streams?.[0];
  if (!stream) throw new Error(`ffprobe found no video stream in ${videoPath}`);
  const slowCount = Number(stream.nb_read_packets);
  if (!Number.isFinite(slowCount) || slowCount <= 0) {
    throw new Error(`ffprobe returned no frame count: ${JSON.stringify(stream)}`);
  }
  return { frameCount: slowCount, ...parseFrameRate(stream.r_frame_rate ?? "") };
}
function parseFrameRate(rate) {
  const [n, d] = rate.split("/");
  const fpsNum = Number(n);
  const fpsDen = d === void 0 ? 1 : Number(d);
  if (!Number.isFinite(fpsNum) || !Number.isFinite(fpsDen) || fpsNum <= 0 || fpsDen <= 0) {
    throw new Error(`Invalid r_frame_rate: ${JSON.stringify(rate)}`);
  }
  return { fpsNum, fpsDen };
}
async function defaultProbeAudioInfo(audioPath, signal) {
  const metadata = await extractAudioMetadata3(audioPath, { signal });
  return {
    durationSeconds: metadata.durationSeconds,
    sampleRate: metadata.sampleRate,
    channels: metadata.channels,
    audioCodec: metadata.audioCodec
  };
}
async function defaultRunFfmpeg(args, timeoutMs, signal) {
  return toStepResult(await runFfmpeg5(args, { signal, timeout: timeoutMs }), timeoutMs);
}
function defaultAacEncoder(timeoutMs, signal, pcmSourcePath) {
  return async (inputPath, outputPath, durationSeconds, filter) => {
    const options = pcmSourcePath ? { signal, timeout: timeoutMs, filter } : { signal, timeout: timeoutMs, filter, segments: 1 };
    return toStepResult(
      await encodeAac(pcmSourcePath ?? inputPath, outputPath, durationSeconds, options),
      timeoutMs
    );
  };
}
function toStepResult(result, timeoutMs) {
  if (result.success) return { success: true };
  return {
    success: false,
    error: `[audioPadTrim] ${describeFfmpegFailure2(result, timeoutMs)}`,
    failureReason: result.failureReason
  };
}
async function runFfprobeJson(args, signal) {
  if (!args.includes("--")) {
    throw new Error('[audioPadTrim] ffprobe args must terminate options with "--".');
  }
  const proc = spawn(getFfprobeBinary(), args, {
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
  trackChildProcess(proc);
  let stdout = "";
  proc.stdout.on("data", (data) => {
    stdout += data.toString();
  });
  const managed = new ManagedChildProcess(proc, {
    signal,
    deadlineAtMs: Date.now() + 3e4
  });
  const outcome = await managed.wait();
  if (outcome.reason === "spawn_error") {
    if (outcome.error?.code === "ENOENT") {
      throw new Error("[audioPadTrim] ffprobe not found. Please install FFmpeg.");
    }
    throw outcome.error ?? new Error(outcome.stderr);
  }
  if (outcome.reason !== "exit" || outcome.exitCode !== 0) {
    const probed = args[args.length - 1];
    const scrubbed = redactKnownPaths(outcome.stderr, probed === void 0 ? [] : [probed]);
    throw new Error(`ffprobe ${outcome.reason}: ${redactTelemetryString3(scrubbed, 2e3)}`);
  }
  try {
    return JSON.parse(stdout);
  } catch (err) {
    throw new Error(`Failed to parse ffprobe output: ${err.message}`);
  }
}

// src/services/render/stages/audioStage.ts
function assertAudioNotInterrupted(failures) {
  const interrupted = failures?.find((failure) => failure.reason === "external_interruption");
  if (!interrupted) return;
  throw encoderFailureError("Audio processing failed", {
    error: interrupted.detail,
    failureReason: "external_interruption",
    audioFailures: audioFailureDiagnostics([
      interrupted,
      ...(failures ?? []).filter((failure) => failure !== interrupted)
    ])
  });
}
function runAudioStage(input) {
  return collectScratchLeftovers(
    () => runAudioStageScoped(input),
    (left) => {
      if (left.length > 0) input.log?.warn("[audio] scratch left behind", { count: left.length });
    }
  );
}
async function runAudioStageScoped(input) {
  const stageStart = Date.now();
  const pcmSourcePath = join11(input.workDir, "audio-source.wav");
  const duration = input.totalFrames * input.fps.den / input.fps.num;
  try {
    const result = await mixAudioForDelivery(input, duration, pcmSourcePath);
    let audioLoweredDb;
    if (result.hasAudio) {
      const guardStart = Date.now();
      const peak = await constrainAacTruePeak({
        audioPath: result.audioOutputPath,
        sourcePath: pcmSourcePath,
        targetDurationSeconds: duration,
        signal: input.abortSignal,
        timeoutMs: input.ffmpegProcessTimeout
      });
      if (!peak.success) throw encoderFailureError("Audio true-peak check failed", peak);
      audioLoweredDb = peak.loweredDb;
      input.log?.info("[audio] phases", { ...result.audioPhaseMs, guard: Date.now() - guardStart });
    }
    return { ...result, audioLoweredDb, audioProcessMs: Date.now() - stageStart };
  } finally {
    removeScratch2(pcmSourcePath);
  }
}
async function mixAudioForDelivery(input, duration, pcmSourcePath) {
  const {
    projectDir,
    workDir,
    compiledDir,
    ffmpegProcessTimeout,
    audioGain,
    audios,
    masterFxChain,
    urlByAbsentLocalPath,
    audioSidecarUrlByLocalPath,
    abortSignal,
    assertNotAborted,
    log
  } = input;
  const audioOutputPath = join11(workDir, MIXED_AUDIO_FILENAME);
  let hasAudio = false;
  let audioError;
  let audioFailures;
  let audioPhaseMs;
  if (audios.length > 0) {
    let audioResult;
    try {
      audioResult = await processCompositionAudio(
        audios,
        projectDir,
        join11(workDir, "audio-work"),
        audioOutputPath,
        duration,
        abortSignal,
        {
          ffmpegProcessTimeout,
          audioGain,
          masterFxChain,
          urlByAbsentLocalPath,
          audioSidecarUrlByLocalPath,
          keepEncoderInputAt: pcmSourcePath
        },
        compiledDir
      );
    } catch (err) {
      assertNotAborted();
      const detail = err instanceof Error ? err.message : String(err);
      return {
        audioOutputPath,
        hasAudio: false,
        audioError: detail,
        // Synthesised rather than left undefined. The warning policy reads
        // owner, retryability, reason and stage off this list, so reporting the
        // FATAL failure — the one that took the whole mix down — with an empty
        // one gave it strictly less classification than a single dropped track
        // gets, which is the opposite of what this stage exists to do.
        // "internal" is the honest bucket: the stages enumerate ffmpeg steps
        // and this is the FX render, which is none of them.
        audioFailures: [
          {
            stage: "internal",
            reason: "internal",
            owner: "system",
            retryable: false,
            detail: detail.slice(0, 2e3)
          }
        ]
      };
    }
    assertNotAborted();
    assertAudioNotInterrupted(audioResult.failures);
    hasAudio = audioResult.success;
    audioFailures = audioResult.failures;
    audioPhaseMs = audioResult.phaseMs;
    if (!hasAudio) {
      audioError = audioResult.error ?? "audio mix failed for an unknown reason";
      for (const failure of audioResult.failures ?? []) {
        log?.warn("Audio track failed", {
          elementId: failure.elementId,
          stage: failure.stage,
          reason: failure.reason,
          owner: failure.owner,
          retryable: failure.retryable,
          detail: failure.detail
        });
      }
    }
  }
  return {
    audioOutputPath,
    hasAudio,
    audioError,
    audioFailures,
    audioPhaseMs
  };
}

// src/services/render/stages/captureStage.ts
import { existsSync as existsSync8, readdirSync, statfsSync } from "node:fs";
import { join as join12 } from "node:path";
import {
  classifyCaptureFailure as classifyCaptureFailure2,
  frameFileExtension,
  captureFrame,
  captureFrameToBufferPipelined as captureFrameToBufferPipelined2,
  verifyDiskDrawElementSamples,
  writeCapturedFrame,
  closeCaptureSession as closeCaptureSession5,
  completeDeferredDrawElementInit as completeDeferredDrawElementInit3,
  createCaptureSession as createCaptureSession5,
  getCapturePerfSummary as getCapturePerfSummary3,
  initializeSession as initializeSession5,
  prepareCaptureSessionForReuse as prepareCaptureSessionForReuse3
} from "@hyperframes/engine";
function shouldAllowAdaptiveCaptureRetry(workerCount, _explicitlyConfigured) {
  return workerCount > 1;
}
var DISK_PROJECTION_SAMPLE_FRAMES = 10;
function freeDiskBytesAt(path) {
  try {
    const stat = statfsSync(path);
    return stat.bavail * stat.bsize;
  } catch {
    return null;
  }
}
function diskCaptureRemedy(cfg, outputFormat, durationSeconds, workerCount) {
  const oneWorker = explainStreamingEncodeGate(cfg, outputFormat, 1, durationSeconds);
  if (workerCount > 1 && oneWorker.enabled) {
    return `This render stores frames because it captures with ${workerCount} workers. Free up disk space, or re-run this render with --workers 1 to stream frames into the encoder instead. One worker is slower, so keep the default worker count for renders that fit on disk.`;
  }
  switch (oneWorker.reason) {
    case "format_excluded":
      return `${outputFormat} output stores every frame at any worker count. Free up disk space or render to mp4.`;
    case "disabled_by_config":
      return "PRODUCER_ENABLE_STREAMING_ENCODE=false sends every render to disk. Free up disk space or unset it.";
    case "duration_cap":
      return "The streaming duration cap (PRODUCER_STREAMING_ENCODE_DURATION_CAP_ENABLED=true) sends renders longer than PRODUCER_STREAMING_ENCODE_MAX_DURATION_SECONDS to disk at any worker count. Free up disk space, unset the cap, or use --low-memory-mode, which streams past it on one worker.";
    default:
      return "Free up disk space.";
  }
}
function diskCaptureShortfallError(needBytes, freeBytes, framesDir, basis, remedy) {
  const basisNote = basis === "measured" ? ` (measured from the first ${DISK_PROJECTION_SAMPLE_FRAMES} frames)` : "";
  return new Error(
    `Disk capture may need ~${(needBytes / 1e6).toFixed(1)} MB of temporary frame storage${basisNote}, but only ${(freeBytes / 1e6).toFixed(1)} MB is free at ${framesDir}. Disk capture stores every frame as an image file (JPEG, or PNG for alpha). ${remedy}`
  );
}
function measureCaptureFrameBytes(workDir, framesDir) {
  let total = sampleDirectoryBytes(framesDir);
  if (!existsSync8(workDir)) return total;
  for (const attempt of readdirSync(workDir)) {
    if (/^retry-\d+-batch-\d+-worker-\d+$/.test(attempt)) {
      total += sampleDirectoryBytes(join12(workDir, attempt));
      continue;
    }
    if (!/^capture-attempt-\d+$/.test(attempt)) continue;
    const attemptDir = join12(workDir, attempt);
    for (const name of readdirSync(attemptDir)) {
      if (/^worker-\d+$/.test(name)) total += sampleDirectoryBytes(join12(attemptDir, name));
    }
  }
  return total;
}
function createDiskCaptureProjection(input) {
  const { framesDir, totalFrames, measureBytes, remedy, freeDiskBytes = freeDiskBytesAt } = input;
  let checked = false;
  return (capturedFrames) => {
    if (checked || capturedFrames < DISK_PROJECTION_SAMPLE_FRAMES) return;
    const measured = measureBytes();
    if (measured <= 0) return;
    checked = true;
    const remaining = totalFrames - capturedFrames;
    const freeBytes = freeDiskBytes(framesDir);
    if (remaining <= 0 || freeBytes === null) return;
    const needBytes = Math.ceil(measured / capturedFrames * remaining);
    if (needBytes > freeBytes * 0.9) {
      throw diskCaptureShortfallError(needBytes, freeBytes, framesDir, "measured", remedy);
    }
  };
}
async function runCaptureStage(input) {
  const {
    fileServer,
    workDir,
    framesDir,
    job,
    totalFrames,
    cfg,
    plan: plan2,
    log,
    captureAttempts,
    buildCaptureOptions,
    createRenderVideoFrameInjector,
    abortSignal,
    onProgress,
    frameRange,
    dedupPerfs
  } = input;
  let { probeSession } = input;
  let { workerCount } = plan2;
  const { forceScreenshot } = plan2;
  let lastBrowserConsole = [];
  const workerPageErrors = [];
  let captureBeyondViewport = probeSession?.options.captureBeyondViewport;
  const captureCfg = cfg.forceScreenshot === forceScreenshot ? cfg : { ...cfg, forceScreenshot };
  if (frameRange !== void 0) {
    if (!Number.isFinite(frameRange.startFrame) || !Number.isFinite(frameRange.endFrame) || frameRange.startFrame < 0 || frameRange.endFrame <= frameRange.startFrame) {
      throw new Error(
        `[captureStage] invalid frameRange: ${JSON.stringify(frameRange)}. Expected non-negative startFrame strictly less than endFrame.`
      );
    }
    const rangeFrames = frameRange.endFrame - frameRange.startFrame;
    if (rangeFrames !== totalFrames) {
      throw new Error(
        `[captureStage] frameRange size (${rangeFrames}) must equal totalFrames (${totalFrames}). Received frameRange=${JSON.stringify(frameRange)}.`
      );
    }
  }
  const captureOptions = { ...buildCaptureOptions(), deFrameFallback: false };
  const remedy = diskCaptureRemedy(cfg, job.config.format ?? "mp4", job.duration ?? 0, workerCount);
  const checkDiskProjection = createDiskCaptureProjection({
    framesDir,
    totalFrames,
    measureBytes: () => measureCaptureFrameBytes(workDir, framesDir),
    remedy
  });
  if (workerCount > 1) {
    const attempts = await executeDiskCaptureWithAdaptiveRetry({
      serverUrl: fileServer.url,
      workDir,
      framesDir,
      totalFrames,
      initialWorkerCount: workerCount,
      allowRetry: shouldAllowAdaptiveCaptureRetry(workerCount, job.config.workers !== void 0),
      frameExt: frameFileExtension(captureOptions.format),
      captureOptions,
      createBeforeCaptureHook: createRenderVideoFrameInjector,
      abortSignal,
      frameRangeStart: frameRange?.startFrame,
      interleaveFrames: input.interleaveFrames,
      dedupPerfs,
      pageErrorLines: workerPageErrors,
      openAttempt: input.openAttempt,
      verifyFirstSession: input.verifyFirstSession,
      onProgress: (progress) => {
        if (progress.latestWorkerPhase) {
          if (progress.capturedFrames === 0) reportWorkerStartup(job, progress, onProgress);
          return;
        }
        if (progress.landedFrame) input.onFrameLanded?.(progress.landedFrame);
        job.framesRendered = progress.capturedFrames;
        checkDiskProjection(progress.capturedFrames);
        const frameProgress = progress.capturedFrames / progress.totalFrames;
        reportFrameProgress(
          job,
          `Capturing frame ${progress.capturedFrames}/${progress.totalFrames} (${progress.activeWorkers} workers)`,
          Math.round(25 + frameProgress * 45),
          onProgress,
          progress.capturedFrames,
          progress.totalFrames
        );
      },
      cfg: captureCfg,
      log
    }).catch((error) => {
      throw wrapCaptureStageError(
        error,
        withWorkerPageErrors(probeSession?.browserConsoleBuffer ?? [], workerPageErrors)
      );
    });
    captureAttempts.push(...attempts);
    const lastAttempt = attempts[attempts.length - 1];
    if (lastAttempt) {
      workerCount = lastAttempt.workers;
    }
    if (probeSession) {
      captureBeyondViewport = probeSession.options.captureBeyondViewport;
      lastBrowserConsole = probeSession.browserConsoleBuffer;
      await closeCaptureSession5(probeSession);
      probeSession = null;
    }
    lastBrowserConsole = withWorkerPageErrors(lastBrowserConsole, workerPageErrors);
  } else {
    const sequential = await runSequentialDiskCapture(
      input,
      captureOptions,
      captureCfg,
      checkDiskProjection
    );
    probeSession = null;
    lastBrowserConsole = sequential.lastBrowserConsole;
    captureBeyondViewport = sequential.captureBeyondViewport;
  }
  return { workerCount, probeSession, lastBrowserConsole, captureBeyondViewport };
}
async function runSequentialDiskCapture(input, captureOptions, captureCfg, checkDiskProjection) {
  const {
    fileServer,
    framesDir,
    totalFrames,
    log,
    createRenderVideoFrameInjector,
    abortSignal,
    assertNotAborted,
    frameRange
  } = input;
  let { probeSession } = input;
  let lastBrowserConsole = [];
  let captureBeyondViewport;
  const { rangeStart, rangeEnd } = resolveCaptureRange(frameRange, totalFrames);
  const rangeFrames = rangeEnd - rangeStart;
  const frameExt = frameFileExtension(captureOptions.format);
  let transientRetriesUsed = 0;
  let resumeFrom = 0;
  while (true) {
    const attempt = input.openAttempt?.();
    const assertAttemptActive = () => {
      assertNotAborted();
      attempt?.throwIfAborted();
    };
    const videoInjector = createRenderVideoFrameInjector();
    const session = probeSession ?? await createCaptureSession5(
      fileServer.url,
      framesDir,
      captureOptions,
      videoInjector,
      captureCfg
    );
    captureBeyondViewport = session.options.captureBeyondViewport;
    try {
      if (probeSession) {
        prepareCaptureSessionForReuse3(session, framesDir, videoInjector);
        probeSession = null;
      }
      await ensureSessionReady(session);
      assertAttemptActive();
      lastBrowserConsole = session.browserConsoleBuffer;
      await captureSessionFrames(session, {
        input: { ...input, assertNotAborted: assertAttemptActive },
        rangeStart,
        rangeEnd,
        resumeFrom,
        checkDiskProjection
      });
      break;
    } catch (error) {
      lastBrowserConsole = session.browserConsoleBuffer;
      const resume = planTransientResume(error, {
        abortSignal,
        rangeFrames,
        framesDir,
        frameExt,
        retriesUsed: transientRetriesUsed
      });
      if (resume !== null) {
        transientRetriesUsed++;
        resumeFrom = resume;
        log.warn(
          "[Render] Transient browser failure during sequential capture; retrying once with a fresh session.",
          {
            resumeFrom,
            rangeFrames,
            transientRetriesUsed,
            error: error instanceof Error ? error.message : String(error)
          }
        );
        continue;
      }
      throw wrapCaptureStageError(error, lastBrowserConsole);
    } finally {
      lastBrowserConsole = session.browserConsoleBuffer;
      await closeCaptureSession5(session);
    }
  }
  return { lastBrowserConsole, captureBeyondViewport };
}
function resolveCaptureRange(frameRange, totalFrames) {
  return { rangeStart: frameRange?.startFrame ?? 0, rangeEnd: frameRange?.endFrame ?? totalFrames };
}
function planTransientResume(error, ctx) {
  const failure = classifyCaptureFailure2(error, { signal: ctx.abortSignal });
  const missing = findMissingFrameRanges(ctx.rangeFrames, ctx.framesDir, ctx.frameExt);
  const [firstMissing] = missing;
  if (!firstMissing) return null;
  return isTransientCaptureRetryEligible(failure.kind, missing, ctx.retriesUsed) ? firstMissing.startFrame : null;
}
async function ensureSessionReady(session) {
  if (!session.isInitialized) {
    await initializeSession5(session);
    return;
  }
  if (process.env.PRODUCER_EXPERIMENTAL_FAST_CAPTURE === "true") {
    await completeDeferredDrawElementInit3(session);
  }
}
async function captureSessionFrames(session, { input, rangeStart, rangeEnd, resumeFrom, checkDiskProjection }) {
  const { job, framesDir, dedupPerfs, assertNotAborted, onProgress } = input;
  const rangeFrames = rangeEnd - rangeStart;
  const reportFrame = (fileIndex) => {
    job.framesRendered = fileIndex + 1;
    checkDiskProjection(fileIndex + 1);
    reportFrameProgress(
      job,
      `Capturing frame ${fileIndex + 1}/${rangeFrames}`,
      Math.round(25 + (fileIndex + 1) / rangeFrames * 45),
      onProgress,
      fileIndex + 1,
      rangeFrames
    );
  };
  if (session.workerEncodeEnabled) {
    let prev = null;
    const drainPrev = async () => {
      if (!prev) return;
      assertNotAborted();
      const buf = await prev.encodeResult;
      writeCapturedFrame(session, prev.fileIndex, buf);
      reportFrame(prev.fileIndex);
    };
    for (let i = resumeFrom; i < rangeFrames; i++) {
      assertNotAborted();
      const absoluteIdx = rangeStart + i;
      const time = absoluteIdx * job.config.fps.den / job.config.fps.num;
      const { encodeResult } = await captureFrameToBufferPipelined2(session, i, time);
      await drainPrev();
      prev = { fileIndex: i, encodeResult };
    }
    await drainPrev();
  } else {
    for (let i = resumeFrom; i < rangeFrames; i++) {
      assertNotAborted();
      const absoluteIdx = rangeStart + i;
      const time = absoluteIdx * job.config.fps.den / job.config.fps.num;
      await captureFrame(session, i, time);
      reportFrame(i);
    }
  }
  await verifyDiskDrawElementSamples(
    session,
    {
      workerId: 0,
      startFrame: rangeStart + resumeFrom,
      endFrame: rangeEnd,
      outputDir: framesDir,
      outputFrameOffset: rangeStart
    },
    false
  );
  dedupPerfs.push(getCapturePerfSummary3(session));
}

// src/services/render/stages/captureHdrStage.ts
import {
  closeCaptureSession as closeCaptureSession7,
  cloneCaptureWarnings as cloneCaptureWarnings2,
  createCaptureSession as createCaptureSession7,
  initTransparentBackground as initTransparentBackground2,
  initializeSession as initializeSession7,
  spawnStreamingEncoder as spawnStreamingEncoder3
} from "@hyperframes/engine";
import { fpsToNumber as fpsToNumber7 } from "@hyperframes/core";

// src/services/hdrImageTransferCache.ts
import { convertTransfer as convertTransfer2 } from "@hyperframes/engine";
var DEFAULT_MAX_BYTES = 200 * 1024 * 1024;

// src/services/render/stages/captureHdrSequentialLoop.ts
import {
  TRANSITIONS,
  crossfade
} from "@hyperframes/engine";

// src/services/render/stages/captureHdrHybridLoop.ts
import {
  TRANSITIONS as TRANSITIONS2,
  closeCaptureSession as closeCaptureSession6,
  createCaptureSession as createCaptureSession6,
  createFrameReorderBuffer as createFrameReorderBuffer2,
  crossfade as crossfade2,
  initTransparentBackground,
  initializeSession as initializeSession6
} from "@hyperframes/engine";

// src/services/render/stages/encodeStage.ts
import {
  copyFileSync as copyFileSync4,
  existsSync as existsSync9,
  mkdirSync as mkdirSync5,
  readdirSync as readdirSync2,
  readFileSync as readFileSync5,
  rmSync as rmSync4,
  statSync as statSync4,
  writeFileSync as writeFileSync3
} from "node:fs";
import { readFile as readFile2 } from "node:fs/promises";
import { dirname as dirname7, join as join13 } from "node:path";
import {
  encodeFramesChunkedConcat,
  encodeFramesFromDir,
  formatFfmpegError,
  MIXED_AUDIO_FILENAME as MIXED_AUDIO_FILENAME2,
  resolveConfig,
  runFfmpeg as runFfmpeg6,
  spawnStreamingEncoder as spawnStreamingEncoder4
} from "@hyperframes/engine";
import {
  clearGifFramesBeforeNext,
  gifClearsAfterLeavingFrameInPlace
} from "@hyperframes/core";

// src/services/render/stages/gifEncodeArgs.ts
import { frameSequencePath } from "@hyperframes/engine";
function fpsToFfmpegArg2(fps) {
  return fps.den === 1 ? String(fps.num) : `${fps.num}/${fps.den}`;
}
var KEEP_FILTER_GRAPH_WHEN_FRAMES_DROP_ALPHA = ["-reinit_filter", "0"];
var WRITE_EVERY_FRAME_WHOLE = ["-gifflags", "0"];
var FAIL_ON_UNREADABLE_FRAME_INSTEAD_OF_ENDING_THERE = ["-xerror"];
function framesInput(input, fpsArg) {
  return [
    ...FAIL_ON_UNREADABLE_FRAME_INSTEAD_OF_ENDING_THERE,
    "-framerate",
    fpsArg,
    ...KEEP_FILTER_GRAPH_WHEN_FRAMES_DROP_ALPHA,
    "-i",
    frameSequencePath(input.framesDir, input.framePattern)
  ];
}
function buildGifPalettegenArgs(input) {
  const fpsArg = fpsToFfmpegArg2(input.fps);
  const transparency = input.preserveAlpha ? ":reserve_transparent=1" : "";
  return [
    "-y",
    ...framesInput(input, fpsArg),
    "-vf",
    `fps=${fpsArg},palettegen=stats_mode=diff${transparency}`,
    input.palettePath
  ];
}
function buildGifPaletteuseArgs(input) {
  const fpsArg = fpsToFfmpegArg2(input.fps);
  const transparency = input.preserveAlpha ? ":alpha_threshold=128" : "";
  return [
    "-y",
    ...framesInput(input, fpsArg),
    "-i",
    input.palettePath,
    "-lavfi",
    `fps=${fpsArg} [x]; [x][1:v] paletteuse=dither=sierra2_4a${transparency}`,
    "-loop",
    String(input.loop),
    ...input.wholeFrames ? WRITE_EVERY_FRAME_WHOLE : [],
    input.outputPath
  ];
}

// src/services/render/stages/encodeStage.ts
import { frameFileExtension as frameFileExtension2 } from "@hyperframes/engine";
function resolveGifLoop(loop) {
  const resolved = loop ?? 0;
  if (!Number.isInteger(resolved) || resolved < 0 || resolved > 65535) {
    throw new Error(`[Render] gifLoop must be an integer between 0 and 65535 (got ${resolved})`);
  }
  return resolved;
}
function gifEncodeFailure(startTime, outputPath, error, failureReason) {
  return {
    success: false,
    outputPath,
    durationMs: Date.now() - startTime,
    framesEncoded: 0,
    fileSize: 0,
    error,
    failureReason
  };
}
async function reencodeWithClearedWholeFrames(argsInput, run, startTime) {
  const { outputPath } = argsInput;
  const result = await runFfmpeg6(buildGifPaletteuseArgs({ ...argsInput, wholeFrames: true }), run);
  if (!result.success) {
    const error = formatFfmpegError(result.exitCode, result.stderr);
    return gifEncodeFailure(startTime, outputPath, error, result.failureReason);
  }
  const gif = readFileSync5(outputPath);
  if (!clearGifFramesBeforeNext(gif)) {
    const error = "[FFmpeg] GIF output could not be parsed to clear its frames";
    return gifEncodeFailure(startTime, outputPath, error);
  }
  writeFileSync3(outputPath, gif);
  return null;
}
async function encodeGifFromDir(framesDir, framePattern, outputPath, input) {
  const startTime = Date.now();
  const files = readdirSync2(framesDir).filter((file) => file.match(/\.(jpg|jpeg|png)$/i));
  const frameCount = files.length;
  if (frameCount === 0) {
    return gifEncodeFailure(startTime, outputPath, "[FFmpeg] No frame files found in directory");
  }
  const argsInput = {
    framesDir,
    framePattern,
    palettePath: input.palettePath,
    outputPath,
    fps: input.fps,
    loop: input.loop,
    preserveAlpha: input.preserveAlpha
  };
  try {
    const run = { signal: input.signal, timeout: input.timeout };
    for (const args of [buildGifPalettegenArgs(argsInput), buildGifPaletteuseArgs(argsInput)]) {
      const result = await runFfmpeg6(args, run);
      if (!result.success) {
        const error = formatFfmpegError(result.exitCode, result.stderr);
        return gifEncodeFailure(startTime, outputPath, error, result.failureReason);
      }
    }
    if (input.preserveAlpha && gifClearsAfterLeavingFrameInPlace(readFileSync5(outputPath)) !== false) {
      const failure = await reencodeWithClearedWholeFrames(argsInput, run, startTime);
      if (failure) return failure;
    }
    const fileSize = existsSync9(outputPath) ? statSync4(outputPath).size : 0;
    return {
      success: true,
      outputPath,
      durationMs: Date.now() - startTime,
      framesEncoded: frameCount,
      fileSize
    };
  } finally {
    rmSync4(input.palettePath, { force: true });
  }
}
function startEncodeProgress(job, stage, onProgress) {
  const total = job.totalFrames ?? 0;
  updateJobStatus(job, "encoding", stage, 75, onProgress, {
    code: "encode",
    ...total > 0 && { done: 0, total }
  });
  return (frames = total) => reportEncodeProgress(job, frames, total, onProgress, 75);
}
function resolveEngineConfig(input) {
  return input.engineConfig ?? input.job.config.producerConfig ?? resolveConfig();
}
function videoEncoderOptions(input, engineCfg) {
  const { job, preset } = input;
  return {
    fps: job.config.fps,
    width: input.width,
    height: input.height,
    codec: preset.codec,
    preset: preset.preset,
    quality: input.effectiveQuality,
    bitrate: input.effectiveBitrate,
    maxBitrate: input.maxBitrate,
    bufferSize: input.bufferSize,
    pixelFormat: preset.pixelFormat,
    vp9CpuUsed: engineCfg.vp9CpuUsed,
    useGpu: job.config.useGpu,
    hdr: preset.hdr,
    // Distributed chunk renders pass these so the encoder writes closed-GOP
    // keyframes that survive `-f concat -c copy` at assemble time. In-process
    // renders leave both undefined → preserves the existing open-GOP output.
    lockGopForChunkConcat: input.lockGopForChunkConcat === true,
    gopSize: input.gopSize
  };
}
function canEncodeWhileCapturing(input, workerCount, cpuCount) {
  return workerCount > 1 && workerCount < cpuCount && !input.isPngSequence && !input.isGif && !input.enableChunkedEncode && input.preset.codec === "h264" && !input.preset.hdr && input.captureImageFormat === "jpeg";
}
async function readLandedFrame(workerPath, mergedPath) {
  if (workerPath !== void 0) {
    try {
      return await readFile2(workerPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return readFile2(mergedPath);
}
function encodeWhileCapturing(input, totalFrames) {
  const engineCfg = resolveEngineConfig(input);
  const stop = new AbortController();
  const signal = input.abortSignal ? AbortSignal.any([input.abortSignal, stop.signal]) : stop.signal;
  const landed = /* @__PURE__ */ new Map();
  let captureDone = false;
  let framesFed = 0;
  let wake = null;
  const nudge = () => {
    wake?.();
    wake = null;
  };
  signal.addEventListener("abort", nudge, { once: true });
  let reportFed = null;
  const encoder = spawnStreamingEncoder4(
    input.videoOnlyPath,
    { ...videoEncoderOptions(input, engineCfg), imageFormat: "jpeg" },
    signal,
    engineCfg
  );
  const fed = (async () => {
    const stream = await encoder;
    for (let next = 0; next < totalFrames; next++) {
      while (!landed.has(next) && !captureDone && !signal.aborted) {
        await new Promise((resolve10) => wake = resolve10);
      }
      if (signal.aborted) return;
      const mergedPath = join13(input.framesDir, formatCaptureFrameName(next, "jpg"));
      const frame = await readLandedFrame(landed.get(next), mergedPath);
      landed.delete(next);
      if (!await stream.writeFrame(frame)) {
        throw new Error(stream.getExitError() ?? "encoder exited before the last frame");
      }
      framesFed++;
      reportFed?.(framesFed);
    }
  })().then(
    () => void 0,
    (error) => error ?? new Error("encode failed")
  );
  const closeEncoder = async () => (await encoder.catch(() => null))?.close();
  return {
    onFrameLanded: (frame) => {
      landed.set(frame.index, frame.path);
      nudge();
    },
    finish: async () => {
      const start = Date.now();
      captureDone = true;
      input.log.info("[Render] Encoded frames while capturing", {
        framesFed,
        totalFrames
      });
      const encoded = startEncodeProgress(input.job, "Encoding video", input.onProgress);
      reportFed = encoded;
      nudge();
      const failure = await fed;
      const result = await closeEncoder();
      input.assertNotAborted();
      if (failure === void 0 && result?.success) {
        encoded();
        return { encodeMs: Date.now() - start };
      }
      input.log.warn(
        "[Render] Encoding while capturing failed; encoding the frames after capture",
        {
          error: String(failure ?? result?.error)
        }
      );
      return runEncodeStage(input);
    },
    abort: async () => {
      stop.abort();
      await fed;
      await closeEncoder();
    },
    get framesFed() {
      return framesFed;
    }
  };
}
async function runEncodeStage(input) {
  const {
    job,
    log,
    outputPath,
    framesDir,
    videoOnlyPath,
    needsAlpha,
    hasAudio,
    audioOutputPath,
    isPngSequence,
    isGif,
    enableChunkedEncode,
    chunkedEncodeSize,
    abortSignal,
    assertNotAborted,
    onProgress
  } = input;
  const stage5Start = Date.now();
  if (isPngSequence) {
    const encoded = startEncodeProgress(job, "Writing PNG sequence", onProgress);
    if (!existsSync9(outputPath)) mkdirSync5(outputPath, { recursive: true });
    const captured = readdirSync2(framesDir).filter((name) => name.endsWith(".png")).sort();
    if (captured.length === 0) {
      throw new Error(
        `[Render] png-sequence output requested but no PNGs were captured to ${framesDir}`
      );
    }
    captured.forEach((name, i) => {
      const dst = join13(outputPath, formatExportFrameName(i, "png"));
      copyFileSync4(join13(framesDir, name), dst);
    });
    if (hasAudio && audioOutputPath && existsSync9(audioOutputPath)) {
      copyFileSync4(audioOutputPath, join13(outputPath, MIXED_AUDIO_FILENAME2));
      log.info(
        `[Render] png-sequence: ${MIXED_AUDIO_FILENAME2} sidecar written to ${outputPath}/${MIXED_AUDIO_FILENAME2}`
      );
    }
    encoded();
    return { encodeMs: Date.now() - stage5Start };
  }
  const engineCfg = resolveEngineConfig(input);
  if (isGif) {
    const encoded = startEncodeProgress(job, "Encoding GIF", onProgress);
    if (hasAudio) {
      log.warn("[Render] GIF output does not support audio; audio tracks will be ignored.");
    }
    const frameExt2 = frameFileExtension2(input.captureImageFormat);
    const framePattern2 = `frame_%06d.${frameExt2}`;
    const loop = resolveGifLoop(job.config.gifLoop);
    const encodeResult2 = await encodeGifFromDir(framesDir, framePattern2, outputPath, {
      fps: job.config.fps,
      loop,
      palettePath: join13(dirname7(videoOnlyPath), "gif-palette.png"),
      preserveAlpha: needsAlpha,
      signal: abortSignal,
      timeout: engineCfg.ffmpegEncodeTimeout
    });
    assertNotAborted();
    if (!encodeResult2.success) {
      throw encoderFailureError("Encoding failed", encodeResult2);
    }
    encoded();
    return { encodeMs: Date.now() - stage5Start };
  }
  const onFramesEncoded = startEncodeProgress(job, "Encoding video", onProgress);
  const frameExt = frameFileExtension2(input.captureImageFormat);
  const framePattern = `frame_%06d.${frameExt}`;
  const encoderOpts = videoEncoderOptions(input, engineCfg);
  const encodeResult = enableChunkedEncode ? await encodeFramesChunkedConcat(
    framesDir,
    framePattern,
    videoOnlyPath,
    encoderOpts,
    chunkedEncodeSize,
    abortSignal,
    engineCfg,
    onFramesEncoded
  ) : await encodeFramesFromDir(
    framesDir,
    framePattern,
    videoOnlyPath,
    encoderOpts,
    abortSignal,
    engineCfg,
    onFramesEncoded
  );
  assertNotAborted();
  if (!encodeResult.success) {
    throw encoderFailureError("Encoding failed", encodeResult);
  }
  onFramesEncoded();
  return { encodeMs: Date.now() - stage5Start };
}

// src/services/render/stages/assembleStage.ts
import { applyFaststart, muxVideoWithAudio, packageHls } from "@hyperframes/engine";

// src/services/renderOrchestrator.ts
function sampleDirectoryBytes(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    let entries = [];
    try {
      entries = readdirSync3(current);
    } catch {
      continue;
    }
    for (const name of entries) {
      const full = join14(current, name);
      try {
        const st = statSync5(full);
        if (st.isDirectory()) {
          stack.push(full);
        } else if (st.isFile()) {
          total += st.size;
        }
      } catch {
      }
    }
  }
  return total;
}
var RenderQualityError = class extends Error {
  constructor(warnings) {
    super(
      `Render blocked by ${warnings.length} correctness warning${warnings.length === 1 ? "" : "s"}:
` + warnings.map((warning) => `- ${warning.code}: ${redactTelemetryString4(warning.message)}`).join("\n")
    );
    this.warnings = warnings;
    this.name = "RenderQualityError";
  }
  warnings;
};
function applyRenderWarningPolicy(job, captureWarnings, log = defaultLogger) {
  job.warnings ??= [];
  const existing = new Set(
    job.warnings.map((warning) => `${warning.code}:${JSON.stringify(warning.details ?? {})}`)
  );
  for (const warning of captureWarnings) {
    const key = `${warning.code}:${JSON.stringify(warning.details ?? {})}`;
    if (existing.has(key)) continue;
    existing.add(key);
    job.warnings.push({
      ...cloneCaptureWarning(warning),
      stage: "capture-readiness"
    });
  }
  if (job.warnings.length === 0) return;
  const strictness = job.config.strictness ?? "best-effort";
  const typedRetryability = job.warnings.flatMap(
    (warning) => warning.details?.retryable === void 0 ? [] : [warning.details.retryable]
  );
  log.warn("Render completed capture with correctness warnings", {
    strictness,
    warningCodes: job.warnings.map((warning) => warning.code),
    warningReasons: job.warnings.flatMap((warning) => warning.details?.failureReasons ?? []),
    warningStages: job.warnings.flatMap((warning) => warning.details?.failureStages ?? []),
    warningOwners: job.warnings.flatMap(
      (warning) => warning.details?.failureOwner ? [warning.details.failureOwner] : []
    ),
    warningRetryable: typedRetryability.length === 0 ? void 0 : typedRetryability.every((retryable) => retryable)
  });
  const hasAudioProcessingFailure = job.warnings.some(
    (warning) => warning.code === "audio_processing_failed"
  );
  const hasScriptOrVfxFailure = job.warnings.some(
    (warning) => warning.code === "sub_timeline_script_failure" || warning.code === "vfx_failure"
  );
  if (strictness === "strict" || hasAudioProcessingFailure || hasScriptOrVfxFailure) {
    throw new RenderQualityError(job.warnings);
  }
}
function collectVideoReadinessSkipIds(nativeHdrVideoIds, extractedVideos) {
  return Array.from(
    /* @__PURE__ */ new Set([
      ...nativeHdrVideoIds,
      ...extractedVideos.filter((video) => hasUsableVideoDimensions(video.metadata)).map((video) => video.videoId)
    ])
  ).sort();
}
function hasUsableVideoDimensions(metadata) {
  return Number.isFinite(metadata.width) && Number.isFinite(metadata.height) && metadata.width > 0 && metadata.height > 0;
}
function collectVideoMetadataHints(extractedVideos) {
  return extractedVideos.filter((video) => hasUsableVideoDimensions(video.metadata)).map((video) => ({
    id: video.videoId,
    width: video.metadata.width,
    height: video.metadata.height
  })).sort((a, b) => a.id.localeCompare(b.id));
}
function findMissingFrameRanges(totalFrames, framesDir, frameExt) {
  const ranges = [];
  let rangeStart = null;
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const framePath = join14(framesDir, formatCaptureFrameName(frameIndex, frameExt));
    const missing = !existsSync10(framePath) || statSync5(framePath).size <= 8;
    if (missing && rangeStart === null) {
      rangeStart = frameIndex;
    } else if (!missing && rangeStart !== null) {
      ranges.push({ startFrame: rangeStart, endFrame: frameIndex });
      rangeStart = null;
    }
  }
  if (rangeStart !== null) {
    ranges.push({ startFrame: rangeStart, endFrame: totalFrames });
  }
  return ranges;
}
function buildMissingFrameRetryBatches(ranges, maxWorkers, workDir, attempt, rangeStart = 0, stride = 1) {
  const workersPerBatch = Math.max(1, Math.floor(maxWorkers));
  const batches = [];
  const outputDirFor = (batchIndex, workerId) => join14(workDir, `retry-${attempt}-batch-${batchIndex}-worker-${workerId}`);
  if (stride > 1) {
    const spans = /* @__PURE__ */ new Map();
    for (const range of ranges) {
      for (let frame = range.startFrame; frame < range.endFrame; frame++) {
        const span = spans.get(frame % stride);
        if (span) span.last = frame;
        else spans.set(frame % stride, { first: frame, last: frame });
      }
    }
    const strided = [...spans.values()];
    for (let i = 0; i < strided.length; i += workersPerBatch) {
      const batchIndex = batches.length;
      batches.push(
        strided.slice(i, i + workersPerBatch).map(({ first, last }, workerId) => ({
          workerId,
          startFrame: rangeStart + first,
          endFrame: rangeStart + last + 1,
          frameStride: stride,
          outputDir: outputDirFor(batchIndex, workerId),
          outputFrameOffset: rangeStart
        }))
      );
    }
    return batches;
  }
  for (let i = 0; i < ranges.length; i += workersPerBatch) {
    const batchIndex = batches.length;
    const batch = ranges.slice(i, i + workersPerBatch).map((range, workerId) => ({
      workerId,
      startFrame: rangeStart + range.startFrame,
      endFrame: rangeStart + range.endFrame,
      outputDir: outputDirFor(batchIndex, workerId),
      outputFrameOffset: rangeStart
    }));
    batches.push(batch);
  }
  return batches;
}
function getNextRetryWorkerCount(currentWorkers) {
  return Math.max(1, Math.floor(currentWorkers / 2));
}
var MAX_TRANSIENT_CAPTURE_RETRIES = 1;
function isTransientCaptureRetryEligible(failureKind, missing, retriesUsed) {
  return missing.length > 0 && failureKind === "transient_browser" && retriesUsed < MAX_TRANSIENT_CAPTURE_RETRIES;
}
function captureAttemptMadeProgress(attemptTargetFrameCount, remainingFrameCount) {
  return remainingFrameCount < attemptTargetFrameCount;
}
var FIRST_FRAME_STALL_MS = 3e5;
var TAIL_STALL_MS = FIRST_FRAME_STALL_MS;
function frameStallRule(job, totalFrames) {
  const noProgressMs = resolveCaptureStallTimeoutMs();
  return {
    progress: () => job.framesRendered ?? 0,
    noProgressMs,
    firstProgressMs: Math.max(FIRST_FRAME_STALL_MS, noProgressMs),
    complete: () => (job.framesRendered ?? 0) >= totalFrames,
    tailMs: Math.max(TAIL_STALL_MS, noProgressMs)
  };
}
function isRecoverableParallelCaptureError(error) {
  if (error instanceof RenderStageStalledError) return true;
  const message = normalizeErrorMessage(error);
  if (!message.includes("[Parallel] Capture failed")) return false;
  const kind = classifyCaptureFailure3(error).kind;
  return kind === "transient_browser" || kind === "protocol_timeout";
}
function countCapturedFrames(totalFrames, framesDir, frameExt) {
  let captured = 0;
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
    const framePath = join14(framesDir, formatCaptureFrameName(frameIndex, frameExt));
    if (existsSync10(framePath)) captured++;
  }
  return captured;
}
function countFrameRanges(ranges) {
  return ranges.reduce((sum2, range) => sum2 + (range.endFrame - range.startFrame), 0);
}
async function executeDiskCaptureWithAdaptiveRetry(options) {
  const attempts = [];
  let currentWorkers = options.initialWorkerCount;
  let missingRanges = null;
  let attempt = 0;
  let transientRetriesUsed = 0;
  let initializationRetriesUsed = 0;
  let pendingTransientRetry = false;
  const rangeStart = options.frameRangeStart ?? 0;
  while (true) {
    const frameCount = missingRanges ? countFrameRanges(missingRanges) : options.totalFrames;
    attempts.push({
      attempt,
      workers: currentWorkers,
      frameCount,
      reason: attempt === 0 ? "initial" : pendingTransientRetry ? "transient-retry" : "retry"
    });
    pendingTransientRetry = false;
    const attemptWorkDir = join14(options.workDir, `capture-attempt-${attempt}`);
    const batches = missingRanges ? buildMissingFrameRetryBatches(
      missingRanges,
      currentWorkers,
      attemptWorkDir,
      attempt,
      rangeStart,
      options.interleaveFrames ? options.initialWorkerCount : 1
    ) : [
      (options.interleaveFrames ? distributeFramesInterleaved2 : distributeFrames2)(
        options.totalFrames,
        currentWorkers,
        attemptWorkDir,
        rangeStart
      )
    ];
    options.dedupPerfs.length = 0;
    let attemptSignal = options.abortSignal;
    try {
      for (const tasks of batches) {
        attemptSignal = options.openAttempt?.(options.abortSignal) ?? options.abortSignal;
        const capturedBeforeBatch = countCapturedFrames(
          options.totalFrames,
          options.framesDir,
          options.frameExt
        );
        try {
          const workerResults = await executeParallelCapture2(
            options.serverUrl,
            attemptWorkDir,
            tasks,
            options.captureOptions,
            options.createBeforeCaptureHook,
            attemptSignal,
            options.onProgress ? (progress) => {
              options.onProgress?.({
                ...progress,
                totalFrames: options.totalFrames,
                capturedFrames: Math.min(
                  options.totalFrames,
                  capturedBeforeBatch + progress.capturedFrames
                )
              });
            } : void 0,
            void 0,
            options.cfg,
            { verifyFirstSession: options.verifyFirstSession }
          );
          pushWorkerDedupPerfs(workerResults, options.dedupPerfs);
          if (options.pageErrorLines) pushWorkerPageErrors(workerResults, options.pageErrorLines);
        } finally {
          await mergeWorkerFrames(attemptWorkDir, tasks, options.framesDir);
        }
      }
      const remaining = findMissingFrameRanges(
        options.totalFrames,
        options.framesDir,
        options.frameExt
      );
      if (remaining.length === 0) {
        return attempts;
      }
      const remainingCount = countFrameRanges(remaining);
      const madeProgress = captureAttemptMadeProgress(frameCount, remainingCount);
      if (!madeProgress) {
        options.log.warn(
          "[Render] Capture attempt made no forward progress; composition is likely structurally broken, not retrying.",
          { attempt, frameCount, remainingCount, workers: currentWorkers }
        );
      }
      if (!options.allowRetry || currentWorkers <= 1 || !madeProgress) {
        throw new Error(`[Render] Capture completed but ${remainingCount} frame(s) are missing`);
      }
      const nextWorkers = getNextRetryWorkerCount(currentWorkers);
      options.log.warn("[Render] Retrying missing captured frames with fewer workers.", {
        fromWorkers: currentWorkers,
        toWorkers: nextWorkers,
        missingFrames: countFrameRanges(remaining)
      });
      currentWorkers = nextWorkers;
      missingRanges = remaining;
      attempt++;
    } catch (caught) {
      const error = attemptSignal?.aborted && !options.abortSignal?.aborted ? attemptSignal.reason : caught;
      const failure = classifyCaptureFailure3(error, { signal: options.abortSignal });
      if (failure.kind === "cancelled") {
        throw error;
      }
      if (isDrawElementVerificationError(error) || isDrawElementCaptureError(error)) {
        throw error;
      }
      const remaining = findMissingFrameRanges(
        options.totalFrames,
        options.framesDir,
        options.frameExt
      );
      if (remaining.length === 0) {
        return attempts;
      }
      const remainingCount = countFrameRanges(remaining);
      const madeProgress = captureAttemptMadeProgress(frameCount, remainingCount);
      if (options.allowRetry && isTransientCaptureRetryEligible(failure.kind, remaining, transientRetriesUsed)) {
        transientRetriesUsed++;
        options.log.warn(
          "[Render] Transient browser failure during capture; retrying once with a fresh session.",
          {
            attempt,
            workers: currentWorkers,
            missingFrames: remainingCount,
            transientRetriesUsed,
            error: error instanceof Error ? error.message : String(error)
          }
        );
        missingRanges = remaining;
        attempt++;
        pendingTransientRetry = true;
        continue;
      }
      if (options.allowRetry && !madeProgress && initializationRetriesUsed === 0 && failure.kind === "protocol_timeout" && /\bNetwork\.enable timed out/i.test(failure.message)) {
        initializationRetriesUsed++;
        const nextWorkers2 = getNextRetryWorkerCount(currentWorkers);
        options.log.warn(
          "[Render] Browser initialization timed out; retrying once with fresh sessions.",
          {
            fromWorkers: currentWorkers,
            toWorkers: nextWorkers2,
            error: failure.message
          }
        );
        currentWorkers = nextWorkers2;
        missingRanges = remaining;
        attempt++;
        continue;
      }
      if (!madeProgress) {
        options.log.warn(
          "[Render] Capture attempt made no forward progress; composition is likely structurally broken, not retrying.",
          { attempt, frameCount, remainingCount, workers: currentWorkers }
        );
      }
      if (!options.allowRetry || currentWorkers <= 1 || !isRecoverableParallelCaptureError(error) || !madeProgress) {
        throw error;
      }
      const nextWorkers = getNextRetryWorkerCount(currentWorkers);
      options.log.warn("[Render] Parallel capture timed out; retrying missing frames.", {
        fromWorkers: currentWorkers,
        toWorkers: nextWorkers,
        missingFrames: countFrameRanges(remaining),
        error: error instanceof Error ? error.message : String(error)
      });
      currentWorkers = nextWorkers;
      missingRanges = remaining;
      attempt++;
    }
  }
}
function createRenderJob(config) {
  return {
    id: randomUUID(),
    config: {
      ...config,
      fps: toFps2(config.fps),
      strictness: config.strictness ?? "best-effort"
    },
    status: "queued",
    progress: 0,
    currentStage: "Queued",
    createdAt: /* @__PURE__ */ new Date(),
    warnings: []
  };
}
function explainStreamingEncodeGate(cfg, outputFormat, workerCount, durationSeconds, forceParallelStream = false) {
  if (!cfg.enableStreamingEncode) return { enabled: false, reason: "disabled_by_config" };
  if (outputFormat === "png-sequence" || outputFormat === "gif") {
    return { enabled: false, reason: "format_excluded" };
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { enabled: false, reason: "invalid_duration" };
  }
  const overCap = cfg.streamingEncodeDurationCapEnabled === true && durationSeconds > cfg.streamingEncodeMaxDurationSeconds;
  if (overCap && !cfg.lowMemoryMode) return { enabled: false, reason: "duration_cap" };
  if (forceParallelStream || process.env.HF_DE_PARALLEL_STREAM === "true") {
    return { enabled: true, reason: "parallel_forced" };
  }
  if (workerCount === 1) {
    return { enabled: true, reason: overCap ? "low_memory_mode" : "single_worker" };
  }
  return { enabled: false, reason: "multi_worker" };
}
var DEFAULT_SEGMENTED_MIN_SECONDS = Number.POSITIVE_INFINITY;

// src/services/distributed/planFrameCost.ts
import { join as join17 } from "node:path";
import {
  closeCaptureSession as closeCaptureSession9,
  createCaptureSession as createCaptureSession9,
  createFrameLookupTable as createFrameLookupTable3,
  initializeSession as initializeSession9
} from "@hyperframes/engine";

// src/services/distributed/chunkFrames.ts
import { existsSync as existsSync12, readdirSync as readdirSync4 } from "node:fs";
import { extname as extname2, join as join16 } from "node:path";
import {
  compositionRequiresWebGpu as compositionRequiresWebGpu3,
  createFrameLookupTable as createFrameLookupTable2,
  createVideoFrameInjector as createVideoFrameInjector2,
  extractVideoFramesRange
} from "@hyperframes/engine";

// src/services/distributed/shared.ts
import { execFile as execFileCallback } from "node:child_process";
import { dirname as dirname9, join as join15 } from "node:path";
import { existsSync as existsSync11, readFileSync as readFileSync7 } from "node:fs";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { promisify as promisify2 } from "node:util";
import {
  getFfmpegBinary,
  MIXED_AUDIO_FILENAME as MIXED_AUDIO_FILENAME3
} from "@hyperframes/engine";
var PLAN_VIDEOS_META_RELATIVE_PATH = "meta/videos.json";
var PLAN_AUDIO_RELATIVE_PATH = MIXED_AUDIO_FILENAME3;
var PLAN_AUDIO_LEGACY_RELATIVE_PATH = "audio.aac";
function isPlanAudioArtifactPath(path) {
  return path === PLAN_AUDIO_RELATIVE_PATH || path === PLAN_AUDIO_LEGACY_RELATIVE_PATH;
}
function resolvePlanAudioPath(planDir) {
  for (const name of [PLAN_AUDIO_RELATIVE_PATH, PLAN_AUDIO_LEGACY_RELATIVE_PATH]) {
    const candidate = join15(planDir, name);
    if (existsSync11(candidate)) return candidate;
  }
  return null;
}
var INVALID_VIDEO_METADATA = "INVALID_VIDEO_METADATA";
var PlanVideosMetadataError = class extends Error {
  // Read by cloud adapters across the package boundary to classify retries.
  // fallow-ignore-next-line unused-class-member
  code = INVALID_VIDEO_METADATA;
  constructor(message) {
    super(message);
    this.name = "PlanVideosMetadataError";
  }
};
function metadataError(field, expectation) {
  throw new PlanVideosMetadataError(`${field} ${expectation}`);
}
function readRecord(value, field) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    metadataError(field, "must be an object");
  }
  return value;
}
function readNonEmptyString(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    metadataError(field, "must be a non-empty string");
  }
  return value;
}
function readString(value, field) {
  if (typeof value !== "string") {
    metadataError(field, "must be a string");
  }
  return value;
}
function readFiniteNumber(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    metadataError(field, "must be a finite number");
  }
  return value;
}
function readBoolean(value, field) {
  if (typeof value !== "boolean") {
    metadataError(field, "must be boolean");
  }
  return value;
}
function readPositiveInteger(value, field) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    metadataError(field, "must be a positive integer");
  }
  return value;
}
function readNonNegativeInteger(value, field) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    metadataError(field, "must be a non-negative integer");
  }
  return value;
}
function readDeferredFrameRange(value, field) {
  const range = readRecord(value, field);
  const sourcePath = readNonEmptyString(range.sourcePath, `${field}.sourcePath`);
  if (sourcePath.startsWith("/") || sourcePath.split(/[\\/]/).some((part) => part === "..")) {
    metadataError(`${field}.sourcePath`, "must stay inside the plan directory");
  }
  const durationSeconds = readFiniteNumber(range.durationSeconds, `${field}.durationSeconds`);
  if (durationSeconds <= 0) metadataError(`${field}.durationSeconds`, "must be positive");
  if (range.format !== "jpg" && range.format !== "png") {
    metadataError(`${field}.format`, 'must be "jpg" or "png"');
  }
  return {
    sourcePath,
    startTime: readFiniteNumber(range.startTime, `${field}.startTime`),
    durationSeconds,
    format: range.format
  };
}
function readRateSpec(value, field) {
  if (value === void 0) return void 0;
  if (typeof value === "number") return readFiniteNumber(value, field);
  const lane = readRecord(value, field);
  if (!Array.isArray(lane.points)) {
    metadataError(`${field}.points`, "must be an array");
  }
  return lane;
}
function readVideoMetadata(value, field) {
  const record = readRecord(value, field);
  let colorSpace = null;
  if (record.colorSpace !== null) {
    const color = readRecord(record.colorSpace, `${field}.colorSpace`);
    colorSpace = {
      colorTransfer: readString(color.colorTransfer, `${field}.colorSpace.colorTransfer`),
      colorPrimaries: readString(color.colorPrimaries, `${field}.colorSpace.colorPrimaries`),
      colorSpace: readString(color.colorSpace, `${field}.colorSpace.colorSpace`)
    };
  }
  return {
    durationSeconds: readFiniteNumber(record.durationSeconds, `${field}.durationSeconds`),
    videoStreamDurationSeconds: readFiniteNumber(
      record.videoStreamDurationSeconds,
      `${field}.videoStreamDurationSeconds`
    ),
    // Plans written before stream-start metadata existed implicitly used the
    // overwhelmingly common start-at-zero domain. Preserve that compatibility
    // while carrying non-zero edit-list/transport timestamps in new plans.
    videoStreamStartSeconds: record.videoStreamStartSeconds === void 0 ? 0 : readFiniteNumber(record.videoStreamStartSeconds, `${field}.videoStreamStartSeconds`),
    videoStreamLeadSeconds: record.videoStreamLeadSeconds === void 0 ? 0 : readFiniteNumber(record.videoStreamLeadSeconds, `${field}.videoStreamLeadSeconds`),
    mediaTimeOffsetSeconds: record.mediaTimeOffsetSeconds === void 0 ? 0 : readFiniteNumber(record.mediaTimeOffsetSeconds, `${field}.mediaTimeOffsetSeconds`),
    width: readPositiveInteger(record.width, `${field}.width`),
    height: readPositiveInteger(record.height, `${field}.height`),
    fps: readFiniteNumber(record.fps, `${field}.fps`),
    videoCodec: readNonEmptyString(record.videoCodec, `${field}.videoCodec`),
    hasAudio: readBoolean(record.hasAudio, `${field}.hasAudio`),
    isVFR: readBoolean(record.isVFR, `${field}.isVFR`),
    hasAlpha: readBoolean(record.hasAlpha, `${field}.hasAlpha`),
    // Optional: plans from producers without the decode probe keep today's png for vp8/vp9.
    ...record.alphaPlaneDecoded === void 0 ? {} : {
      alphaPlaneDecoded: readBoolean(record.alphaPlaneDecoded, `${field}.alphaPlaneDecoded`)
    },
    colorSpace
  };
}
function parsePlanVideosJson(value) {
  const record = readRecord(value, "meta/videos.json");
  if (!Array.isArray(record.videos) || !Array.isArray(record.extracted)) {
    metadataError("meta/videos.json", "must contain videos and extracted arrays");
  }
  const videos = record.videos.map((value2, index) => {
    const field = `meta/videos.json.videos[${index}]`;
    const video = readRecord(value2, field);
    return {
      id: readNonEmptyString(video.id, `${field}.id`),
      src: readNonEmptyString(video.src, `${field}.src`),
      start: readFiniteNumber(video.start, `${field}.start`),
      end: readFiniteNumber(video.end, `${field}.end`),
      mediaStart: readFiniteNumber(video.mediaStart, `${field}.mediaStart`),
      playbackRate: readRateSpec(video.playbackRate, `${field}.playbackRate`),
      loop: readBoolean(video.loop, `${field}.loop`),
      hasAudio: readBoolean(video.hasAudio, `${field}.hasAudio`)
    };
  });
  const extracted = record.extracted.map((value2, index) => {
    const field = `meta/videos.json.extracted[${index}]`;
    const entry = readRecord(value2, field);
    return {
      videoId: readNonEmptyString(entry.videoId, `${field}.videoId`),
      srcPath: readNonEmptyString(entry.srcPath, `${field}.srcPath`),
      framePattern: readNonEmptyString(entry.framePattern, `${field}.framePattern`),
      fps: readFiniteNumber(entry.fps, `${field}.fps`),
      totalFrames: readNonNegativeInteger(entry.totalFrames, `${field}.totalFrames`),
      metadata: readVideoMetadata(entry.metadata, `${field}.metadata`),
      ...entry.deferredRange === void 0 ? {} : { deferredRange: readDeferredFrameRange(entry.deferredRange, `${field}.deferredRange`) }
    };
  });
  const videoIds = /* @__PURE__ */ new Set();
  for (const video of videos) {
    if (videoIds.has(video.id)) {
      metadataError("meta/videos.json.videos", `contains duplicate id ${JSON.stringify(video.id)}`);
    }
    videoIds.add(video.id);
  }
  const extractedIds = /* @__PURE__ */ new Set();
  for (const entry of extracted) {
    if (extractedIds.has(entry.videoId)) {
      metadataError(
        "meta/videos.json.extracted",
        `contains duplicate videoId ${JSON.stringify(entry.videoId)}`
      );
    }
    extractedIds.add(entry.videoId);
    if (!videoIds.has(entry.videoId)) {
      metadataError(
        "meta/videos.json.extracted",
        `references undeclared video ${JSON.stringify(entry.videoId)}`
      );
    }
  }
  for (const video of videos) {
    if (!extractedIds.has(video.id)) {
      metadataError(
        "meta/videos.json.extracted",
        `is missing declared video ${JSON.stringify(video.id)}`
      );
    }
  }
  return { videos, extracted };
}
function buildPlanVideosJson(input) {
  const videos = input.videos.map((video, index) => {
    if (Number.isFinite(video.end)) return { ...video };
    if (!Number.isFinite(input.compositionEnd) || input.compositionEnd <= 0 || input.compositionEnd <= video.start) {
      metadataError(
        `meta/videos.json.videos[${index}].end`,
        "cannot be resolved without a finite composition end after its start"
      );
    }
    return { ...video, end: input.compositionEnd };
  });
  return parsePlanVideosJson({ videos, extracted: input.extracted });
}
var execFile = promisify2(execFileCallback);
var cachedFfmpegVersions = /* @__PURE__ */ new Map();
async function readFfmpegVersion() {
  const binary = getFfmpegBinary();
  const cached = cachedFfmpegVersions.get(binary);
  if (cached !== void 0) return cached;
  let stdout;
  try {
    ({ stdout } = await execFile(binary, ["-version"], {
      maxBuffer: 1024 * 1024,
      // See runFfmpeg.ts: keeps a console window off the user's desktop on Windows.
      windowsHide: true
    }));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    throw Object.assign(
      new Error(`ffmpeg not found at "${binary}": install FFmpeg or set HYPERFRAMES_FFMPEG_PATH.`, {
        cause: error
      }),
      { code: "ENOENT" }
    );
  }
  const firstLine = stdout.split(/\r?\n/)[0]?.trim() ?? "";
  if (!firstLine) {
    throw new Error("ffmpeg -version returned empty output");
  }
  cachedFfmpegVersions.set(binary, firstLine);
  return firstLine;
}
function buildSyntheticRenderJob(input) {
  const renderConfig = {
    fps: input.fps,
    quality: input.quality,
    format: input.format,
    crf: input.crf,
    videoBitrate: input.bitrate,
    videoFrameFormat: input.videoFrameFormat,
    outputResolution: input.outputResolution,
    outputResolutionAspectAgnostic: input.outputResolutionAspectAgnostic,
    // Distributed mode hard-pins to software GPU. The plan-time validator
    // refuses to fan out otherwise.
    useGpu: false,
    debug: false,
    entryFile: input.entryFile,
    logger: input.logger ?? defaultLogger,
    hdrMode: input.hdrMode,
    strictness: input.strictness,
    producerConfig: input.producerConfig,
    variables: input.variables,
    pageMotionBlur: "off"
  };
  return createRenderJob(renderConfig);
}
var cachedProducerVersion = null;
function readProducerVersion() {
  if (cachedProducerVersion !== null) return cachedProducerVersion;
  const startDir = dirname9(fileURLToPath3(import.meta.url));
  let current = startDir;
  for (let i = 0; i < 10; i++) {
    const candidate = join15(current, "package.json");
    if (existsSync11(candidate)) {
      try {
        const pkg = JSON.parse(readFileSync7(candidate, "utf-8"));
        if (pkg.name === "@hyperframes/producer" && typeof pkg.version === "string") {
          cachedProducerVersion = pkg.version;
          return pkg.version;
        }
      } catch {
      }
    }
    const parent = dirname9(current);
    if (parent === current) break;
    current = parent;
  }
  cachedProducerVersion = "0.0.0-unknown";
  return cachedProducerVersion;
}

// src/services/distributed/chunkFrames.ts
var FFMPEG_VERSION_MISMATCH = "FFMPEG_VERSION_MISMATCH";
var PLAN_HASH_MISMATCH = "PLAN_HASH_MISMATCH";
var MISSING_PLAN_ARTIFACT = "MISSING_PLAN_ARTIFACT";
var CHUNK_INDEX_OUT_OF_RANGE = "CHUNK_INDEX_OUT_OF_RANGE";
var CHUNK_FRAME_RANGE_INVALID = "CHUNK_FRAME_RANGE_INVALID";
var MISSING_RUNTIME_ENV_SNAPSHOT = "MISSING_RUNTIME_ENV_SNAPSHOT";
var RenderChunkValidationError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "RenderChunkValidationError";
    this.code = code;
  }
};
function createChunkVideoFrameInjectorFactory(frameLookup, options) {
  if (!(frameLookup instanceof Promise))
    return () => createVideoFrameInjector2(frameLookup, options);
  return () => {
    let hook;
    return async (page, time, heldVideoTime) => {
      hook ??= createVideoFrameInjector2(await frameLookup, options);
      await hook?.(page, time, heldVideoTime);
    };
  };
}
function frameNumberFromFileName(name) {
  const match = /(\d+)(?=\.[^.]+$)/.exec(name);
  if (!match) return null;
  const frameNumber = Number(match[1]);
  return Number.isSafeInteger(frameNumber) ? frameNumber : null;
}
function rebuildExtractedFramesFromPlanDir(planDir, videos, indexMode = "dense-v1") {
  const result = [];
  for (const v of videos) {
    const outputDir = join16(planDir, "video-frames", v.videoId);
    if (!existsSync12(outputDir)) {
      throw new Error(
        `[renderChunk] planDir missing extracted video frames for ${JSON.stringify(v.videoId)}: ${outputDir} not present. plan() should have written frames here; the planDir is malformed.`
      );
    }
    const ext = (extname2(v.framePattern) || ".jpg").toLowerCase();
    const frames = readdirSync4(outputDir).filter((name) => name.toLowerCase().endsWith(ext)).sort((left, right) => {
      const leftNumber = frameNumberFromFileName(left);
      const rightNumber = frameNumberFromFileName(right);
      if (leftNumber === null || rightNumber === null) return left.localeCompare(right);
      return leftNumber - rightNumber || left.localeCompare(right);
    });
    const framePaths = /* @__PURE__ */ new Map();
    for (let i = 0; i < frames.length; i++) {
      const frameName = frames[i];
      if (!frameName) continue;
      const frameNumber = indexMode === "sparse-v2" ? frameNumberFromFileName(frameName) : null;
      const frameIndex = frameNumber === null ? i : frameNumber - 1;
      framePaths.set(frameIndex, join16(outputDir, frameName));
    }
    result.push({
      videoId: v.videoId,
      srcPath: v.srcPath,
      outputDir,
      framePattern: v.framePattern,
      fps: v.fps,
      totalFrames: v.totalFrames,
      metadata: v.metadata,
      framePaths,
      // The planDir is shared read-only across workers; cleanup must not delete its frames.
      ownedByLookup: false
    });
  }
  return result;
}
function contiguousRuns(sortedIndexes) {
  const runs2 = [];
  for (const index of sortedIndexes) {
    const last = runs2[runs2.length - 1];
    if (last && last.firstFrame + last.frames === index) last.frames++;
    else runs2.push({ firstFrame: index, frames: 1 });
  }
  return runs2;
}
function buildChunkCaptureOptions(input) {
  const { dimensions, encoder } = input;
  const videoCaptureBeyondViewport = resolveVideoCaptureBeyondViewport(input.videoCount);
  return {
    width: dimensions.width,
    height: dimensions.height,
    fps: { num: dimensions.fpsNum, den: dimensions.fpsDen },
    format: dimensions.format === "mp4" ? "jpeg" : "png",
    quality: dimensions.format === "mp4" ? resolveCaptureJpegQuality(encoder.quality) : void 0,
    deviceScaleFactor: encoder.deviceScaleFactor,
    // The controller's snapshot, so the first capture sees the in-process renderer's `__hfVariables`.
    variables: encoder.variables,
    subTimelineWaitMemo: {},
    skipReadinessVideoIds: input.skipReadinessVideoIds,
    videoMetadataHints: input.videoMetadataHints,
    ...videoCaptureBeyondViewport !== void 0 ? { captureBeyondViewport: videoCaptureBeyondViewport } : {},
    pageMotionBlur: encoder.pageMotionBlur ?? "distributed-render",
    // A fixed warmup count keeps `beginFrameTimeTicks` host-independent.
    lockWarmupTicks: true,
    requiresWebGpu: compositionRequiresWebGpu3(input.html)
  };
}
function shownDeferredFrameIndexes(planVideos, frames, fps) {
  const shown = /* @__PURE__ */ new Map();
  const deferred = planVideos.extracted.filter((video) => video.deferredRange);
  if (deferred.length === 0) return shown;
  const table = createFrameLookupTable2(
    planVideos.videos,
    deferred.map((video) => ({
      ...video,
      outputDir: "",
      framePaths: new Map(Array.from({ length: video.totalFrames }, (_, i) => [i, String(i)]))
    })),
    resolveRenderFpsConfig(fps).value
  );
  for (const frame of frames) {
    const globalTime = frame * fps.den / fps.num;
    for (const [videoId, payload] of table.getActiveFramePayloads(globalTime)) {
      const indexes = shown.get(videoId) ?? /* @__PURE__ */ new Set();
      indexes.add(payload.frameIndex);
      shown.set(videoId, indexes);
    }
  }
  return shown;
}
async function extractDeferredVideoFramesForChunk(input) {
  const deferred = input.planVideos.extracted.filter((video) => video.deferredRange);
  const remoteSources = input.remoteSources ?? {};
  for (const path of Object.keys(remoteSources)) {
    if (!deferred.some((video) => video.deferredRange.sourcePath === path)) {
      throw new RenderChunkValidationError(
        MISSING_PLAN_ARTIFACT,
        `[renderChunk] ${path} is read by URL but no deferred video uses it`
      );
    }
    defaultLogger.info("[renderChunk] reading video by URL", {
      path,
      url: remoteSources[path].split("?")[0]
    });
  }
  if (deferred.length === 0) return [];
  const shown = shownDeferredFrameIndexes(input.planVideos, input.frames, input.fps);
  return Promise.all(
    deferred.map(async (video) => {
      const outputDir = join16(input.outputRoot, video.videoId);
      const indexes = [...shown.get(video.videoId) ?? []].sort((a, b) => a - b);
      if (indexes.length === 0) {
        return { ...video, outputDir, framePaths: /* @__PURE__ */ new Map(), ownedByLookup: false };
      }
      const range = video.deferredRange;
      const remoteUrl = remoteSources[range.sourcePath];
      const sourcePath = remoteUrl ?? join16(input.planDir, ...range.sourcePath.split("/"));
      if (remoteUrl === void 0 && !existsSync12(sourcePath)) {
        throw new RenderChunkValidationError(
          MISSING_PLAN_ARTIFACT,
          `[renderChunk] planDir is missing the source for video ${JSON.stringify(video.videoId)}: ${range.sourcePath}`
        );
      }
      const extracted = await extractVideoFramesRange(
        sourcePath,
        video.videoId,
        range.startTime,
        range.durationSeconds,
        {
          fps: input.fps,
          outputDir: input.outputRoot,
          format: range.format,
          frameRanges: contiguousRuns(indexes),
          shownBox: input.shownBoxes?.get(video.videoId)
        },
        void 0,
        input.cfg
      );
      const missing = indexes.find((index) => !extracted.framePaths.has(index));
      if (missing !== void 0) {
        throw new RenderChunkValidationError(
          INVALID_VIDEO_METADATA,
          `[renderChunk] video ${JSON.stringify(video.videoId)} has no frame ${missing}; the plan expected ${video.totalFrames} frames from ${range.sourcePath}.`
        );
      }
      return { ...video, outputDir, framePaths: extracted.framePaths, ownedByLookup: false };
    })
  );
}

// src/services/distributed/planFrameCost.ts
async function measurePlanSecondsPerFrame(input) {
  const { planDir, workDir, planVideos, fps, log } = input;
  const fpsRatio = { num: fps, den: 1 };
  const sampled = selectCaptureCalibrationFrames(input.totalFrames);
  const extracted = [
    ...rebuildExtractedFramesFromPlanDir(
      planDir,
      planVideos.extracted.filter((video) => !video.deferredRange)
    ),
    ...await extractDeferredVideoFramesForChunk({
      planDir,
      planVideos,
      frames: sampled,
      fps: fpsRatio,
      outputRoot: join17(workDir, "frame-cost-video-frames"),
      cfg: input.cfg
    })
  ];
  const lookup = extracted.length > 0 ? createFrameLookupTable3(planVideos.videos, extracted, resolveRenderFpsConfig(fpsRatio).value) : null;
  const compiledDir = join17(planDir, "compiled");
  const fileServer = await createFileServer({
    projectDir: compiledDir,
    compiledDir,
    port: 0,
    preHeadScripts: [buildVirtualTimeShim({ seedRandomFromFrame: true })],
    fps: fpsRatio
  });
  let session = null;
  try {
    session = await createCaptureSession9(
      fileServer.url,
      join17(workDir, "frame-cost"),
      buildChunkCaptureOptions({
        dimensions: { ...input, fpsNum: fps, fpsDen: 1 },
        encoder: input,
        videoCount: planVideos.videos.length,
        html: input.html
      }),
      createChunkVideoFrameInjectorFactory(lookup)(),
      createCaptureCalibrationConfig(input.cfg)
    );
    await initializeSession9(session);
    const { estimate } = await measureCaptureCostFromSession(session, input.totalFrames, fps, log);
    return (estimate.p95Ms ?? 0) / 1e3;
  } finally {
    if (session) await closeCaptureSession9(session).catch(() => {
    });
    closeFileServerSafely(fileServer, "plan frame cost", log);
  }
}

// src/services/distributed/chunkWeights.ts
import { resolveFrameFormat } from "@hyperframes/engine";
var PAGE_BASE_WEIGHT = 0.7;
var PNG_WEIGHT_FACTOR = 1.5;
function isUniformFrameCost(weights) {
  let lightest = Infinity;
  let heaviest = 0;
  for (const weight of weights) {
    lightest = Math.min(lightest, weight);
    heaviest = Math.max(heaviest, weight);
  }
  return heaviest <= lightest * 1.05;
}
function planFrameWeights(input) {
  const { totalFrames, fps } = input;
  const delta = new Float64Array(totalFrames + 1);
  const outputPixels = input.width * input.height;
  const extractedById = new Map(input.extracted.map((entry) => [entry.videoId, entry]));
  for (const video of input.videos) {
    const entry = extractedById.get(video.id);
    if (!entry || video.hidden) continue;
    const start = Math.max(0, Math.round(video.start * fps));
    const end = Math.min(totalFrames, Math.round(video.end * fps));
    if (!(end > start)) continue;
    const { width, height } = entry.metadata;
    const factor = resolveFrameFormat(entry.metadata) === "png" ? PNG_WEIGHT_FACTOR : 1;
    const weight = Math.min(width * height, outputPixels) / 1e6 * factor;
    delta[start] = delta[start] + weight;
    delta[end] = delta[end] - weight;
  }
  const weights = new Float64Array(totalFrames);
  let active = 0;
  for (let frame = 0; frame < totalFrames; frame++) {
    active += delta[frame];
    weights[frame] = PAGE_BASE_WEIGHT + active;
  }
  return weights;
}
function withChunkCaptureCost(slices, weights) {
  const lightest = weights.reduce((least, weight) => Math.min(least, weight), Infinity);
  return slices.map((slice) => {
    let sum2 = 0;
    for (let frame = slice.startFrame; frame < slice.endFrame; frame++) sum2 += weights[frame];
    const cost = Math.round(sum2 / (slice.endFrame - slice.startFrame) / lightest * 100) / 100;
    return cost > 1 ? { ...slice, captureCost: cost } : slice;
  });
}
function effectiveChunkFrames(frames, captureCost = 1) {
  return Math.round(frames * captureCost);
}
function buildWeightedChunkSlices(weights, chunkCount, minFrames, maxFrames) {
  if (isUniformFrameCost(weights)) return null;
  const totalFrames = weights.length;
  const total = weights.reduce((sum2, weight) => sum2 + weight, 0);
  const minSize = Math.max(1, Math.min(minFrames, Math.floor(totalFrames / chunkCount)));
  const maxSize = Math.max(maxFrames, Math.ceil(totalFrames / chunkCount));
  const slices = [];
  let startFrame = 0;
  let frame = 0;
  let costBefore = 0;
  for (let index = 0; index < chunkCount - 1; index++) {
    const target = (index + 1) * total / chunkCount;
    while (frame < totalFrames && costBefore + weights[frame] / 2 < target) {
      costBefore += weights[frame++];
    }
    const remaining = chunkCount - index - 1;
    const low = Math.max(startFrame + minSize, totalFrames - remaining * maxSize);
    const high = Math.min(startFrame + maxSize, totalFrames - remaining * minSize);
    const endFrame = Math.min(high, Math.max(low, frame));
    slices.push({ index, startFrame, endFrame });
    startFrame = endFrame;
  }
  slices.push({ index: chunkCount - 1, startFrame, endFrame: totalFrames });
  return slices;
}

// src/services/render/stages/freezePlan.ts
import { existsSync as existsSync13, mkdirSync as mkdirSync7, readFileSync as readFileSync8, readdirSync as readdirSync5, writeFileSync as writeFileSync5 } from "node:fs";
import { join as join18, relative as relative3, resolve as resolve8 } from "node:path";

// src/services/distributed/planProtocol.ts
var PLAN_SCHEMA_VERSION = 1;
var PLAN_ARTIFACT_LAYOUT = "plan-dir-v1";
var PLAN_HASH_SCHEMA = "hyperframes-plan-hash-v1";
var PLAN_V2_SCHEMA_VERSION = 2;
var PLAN_V2_ARTIFACT_LAYOUT = "content-addressed-plan-v2";
var PLAN_V2_HASH_SCHEMA = "hyperframes-plan-manifest-hash-v2";
var PLAN_PROTOCOL_UNSUPPORTED = "PLAN_PROTOCOL_UNSUPPORTED";
var PLAN_PROTOCOL_V1 = Object.freeze({
  schemaVersion: PLAN_SCHEMA_VERSION,
  artifactLayout: PLAN_ARTIFACT_LAYOUT,
  hashSchema: PLAN_HASH_SCHEMA
});
var CURRENT_PLAN_PROTOCOL = PLAN_PROTOCOL_V1;
var PLAN_PROTOCOL_V2 = Object.freeze({
  schemaVersion: PLAN_V2_SCHEMA_VERSION,
  artifactLayout: PLAN_V2_ARTIFACT_LAYOUT,
  hashSchema: PLAN_V2_HASH_SCHEMA
});
var DISTRIBUTED_RENDER_CAPABILITIES = Object.freeze({
  roles: Object.freeze({
    planner: Object.freeze({
      produces: Object.freeze([PLAN_PROTOCOL_V1, PLAN_PROTOCOL_V2])
    }),
    chunk: Object.freeze({
      accepts: Object.freeze([PLAN_PROTOCOL_V1, PLAN_PROTOCOL_V2]),
      acceptsLegacyV1WithoutDescriptor: true
    }),
    assembler: Object.freeze({
      accepts: Object.freeze([PLAN_PROTOCOL_V1, PLAN_PROTOCOL_V2]),
      acceptsLegacyV1WithoutDescriptor: true
    })
  }),
  chunkFrameRange: true
});
function getDistributedRenderCapabilities() {
  return DISTRIBUTED_RENDER_CAPABILITIES;
}
var PlanProtocolUnsupportedError = class extends Error {
  // Public adapters inspect this typed code even though OSS producer does not.
  // fallow-ignore-next-line unused-class-member
  code = PLAN_PROTOCOL_UNSUPPORTED;
  constructor(reason) {
    super(`[planProtocol] ${reason} (${PLAN_PROTOCOL_UNSUPPORTED})`);
    this.name = "PlanProtocolUnsupportedError";
  }
};
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function protocolMatches(descriptor, expected) {
  return descriptor.schemaVersion === expected.schemaVersion && descriptor.artifactLayout === expected.artifactLayout && descriptor.hashSchema === expected.hashSchema;
}
function capabilitiesAccept(capabilities, protocol) {
  return capabilities.accepts.some(
    (accepted) => accepted.schemaVersion === protocol.schemaVersion && accepted.artifactLayout === protocol.artifactLayout && accepted.hashSchema === protocol.hashSchema
  );
}
function readPlanProtocol(planJson, capabilities = DISTRIBUTED_RENDER_CAPABILITIES.roles.chunk) {
  if (!isRecord(planJson)) {
    throw new PlanProtocolUnsupportedError("plan.json must contain a JSON object");
  }
  if (!Object.prototype.hasOwnProperty.call(planJson, "protocol")) {
    if (!capabilities.acceptsLegacyV1WithoutDescriptor || !capabilitiesAccept(capabilities, PLAN_PROTOCOL_V1)) {
      throw new PlanProtocolUnsupportedError(
        "legacy v1 plan without a protocol descriptor is not accepted by this worker"
      );
    }
    return PLAN_PROTOCOL_V1;
  }
  const descriptor = planJson.protocol;
  if (!isRecord(descriptor)) {
    throw new PlanProtocolUnsupportedError("plan.json protocol descriptor must be an object");
  }
  for (const field of ["schemaVersion", "artifactLayout", "hashSchema"]) {
    if (!Object.prototype.hasOwnProperty.call(descriptor, field)) {
      throw new PlanProtocolUnsupportedError(`plan.json protocol descriptor is missing ${field}`);
    }
  }
  const protocol = protocolMatches(descriptor, PLAN_PROTOCOL_V1) ? PLAN_PROTOCOL_V1 : protocolMatches(descriptor, PLAN_PROTOCOL_V2) ? PLAN_PROTOCOL_V2 : null;
  if (protocol === null || !capabilitiesAccept(capabilities, protocol)) {
    throw new PlanProtocolUnsupportedError("unsupported plan.json protocol descriptor");
  }
  return protocol;
}
function readPlanProtocolV1(planJson, capabilities = DISTRIBUTED_RENDER_CAPABILITIES.roles.chunk) {
  const protocol = readPlanProtocol(planJson, capabilities);
  if (protocol !== PLAN_PROTOCOL_V1) {
    throw new PlanProtocolUnsupportedError(
      "content-addressed v2 plan must be materialized before v1 layout access"
    );
  }
  return PLAN_PROTOCOL_V1;
}

// src/services/render/stages/planHash.ts
import { createHash as createHash6 } from "node:crypto";
import { closeSync as closeSync3, createReadStream as createReadStream3, openSync as openSync3, readSync as readSync2 } from "node:fs";
var PLAN_HASH_SCHEMA_PREFIX = "hyperframes-plan-hash-v1\0";
var FIELD_DELIMITER = Buffer.from([0]);
function computePlanHash(input) {
  const hash = createHash6("sha256");
  hash.update(PLAN_HASH_SCHEMA_PREFIX, "utf8");
  hash.update(input.compositionHtml);
  hash.update(FIELD_DELIMITER);
  const sortedAssets = [...input.assets].sort(
    (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0
  );
  for (const asset of sortedAssets) {
    hash.update(asset.path, "utf8");
    hash.update(FIELD_DELIMITER);
    hash.update(asset.sha256, "utf8");
    hash.update(FIELD_DELIMITER);
  }
  hash.update(input.fontSnapshotSha, "utf8");
  hash.update(FIELD_DELIMITER);
  hash.update(input.encoderConfigCanonicalJson, "utf8");
  hash.update(FIELD_DELIMITER);
  hash.update(input.producerVersion, "utf8");
  hash.update(FIELD_DELIMITER);
  hash.update(input.ffmpegVersion, "utf8");
  hash.update(FIELD_DELIMITER);
  const d = input.dimensions;
  hash.update(`${d.fpsNum}/${d.fpsDen}x${d.width}x${d.height}x${d.format}`, "utf8");
  return hash.digest("hex");
}
function canonicalJsonStringify(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`canonicalJsonStringify: non-finite number ${value}`);
    }
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJsonStringify).join(",")}]`;
  }
  if (typeof value === "object") {
    const obj = value;
    const keys = Object.keys(obj).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJsonStringify(obj[k])}`);
    return `{${parts.join(",")}}`;
  }
  throw new TypeError(`canonicalJsonStringify: unsupported value type ${typeof value}`);
}
function sha256Hex(bytes) {
  const h = createHash6("sha256");
  h.update(bytes);
  return h.digest("hex");
}
function sha256File(path) {
  const hash = createHash6("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const fd = openSync3(path, "r");
  try {
    let bytesRead = 0;
    do {
      bytesRead = readSync2(fd, buffer, 0, buffer.byteLength, null);
      if (bytesRead > 0) hash.update(buffer.subarray(0, bytesRead));
    } while (bytesRead > 0);
  } finally {
    closeSync3(fd);
  }
  return hash.digest("hex");
}
async function sha256FileAsync(path) {
  const hash = createHash6("sha256");
  for await (const chunk of createReadStream3(path, { highWaterMark: 1024 * 1024 })) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}

// src/services/render/stages/freezePlan.ts
var COMPILED_INDEX_RELATIVE_PATH = "compiled/index.html";
var HASH_EXCLUDED_PLAN_FILES = /* @__PURE__ */ new Set([
  "plan.json",
  "meta/encoder.json",
  COMPILED_INDEX_RELATIVE_PATH
]);
function planFileSha256(absolutePath, digests) {
  let sha256 = digests?.get(absolutePath);
  if (sha256 === void 0) {
    sha256 = sha256File(absolutePath);
    digests?.set(absolutePath, sha256);
  }
  return sha256;
}
async function prehashPlanFiles(dir, digests) {
  if (!existsSync13(dir)) return;
  for (const { absolutePath } of listPlanFiles(dir)) {
    if (!digests.has(absolutePath)) digests.set(absolutePath, await sha256FileAsync(absolutePath));
  }
}
function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value !== null && typeof value === "object") {
    const obj = value;
    const out = {};
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (v === void 0) continue;
      out[key] = stripUndefined(v);
    }
    return out;
  }
  return value;
}
function listPlanFiles(planDir) {
  const results = [];
  const rootResolved = resolve8(planDir);
  function walk(dir) {
    const entries = readdirSync5(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join18(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        results.push({
          planRelativePath: relative3(rootResolved, full).split(/[\\/]+/).join("/"),
          absolutePath: full
        });
      }
    }
  }
  walk(rootResolved);
  results.sort((a, b) => a.planRelativePath < b.planRelativePath ? -1 : 1);
  return results;
}
function collectPlanAssetShas(planDir, digests) {
  const files = listPlanFiles(planDir);
  let compositionHtml = null;
  const assets = [];
  for (const file of files) {
    if (file.planRelativePath === COMPILED_INDEX_RELATIVE_PATH) {
      compositionHtml = readFileSync8(file.absolutePath);
      continue;
    }
    if (HASH_EXCLUDED_PLAN_FILES.has(file.planRelativePath)) continue;
    assets.push({
      path: file.planRelativePath,
      sha256: planFileSha256(file.absolutePath, digests)
    });
  }
  if (compositionHtml === null) {
    throw new Error(
      `[freezePlan] compiled HTML missing at ${COMPILED_INDEX_RELATIVE_PATH} (upstream compile stage did not materialize the expected file).`
    );
  }
  return { compositionHtml, assets };
}
var PLAN_REMOTE_FILES_RELATIVE_PATH = "meta/remote-files.json";
function writePlanRemoteFiles(planDir, files) {
  if (files.length === 0) return;
  const sorted = [...files].sort((a, b) => a.path < b.path ? -1 : 1);
  writeFileSync5(join18(planDir, PLAN_REMOTE_FILES_RELATIVE_PATH), JSON.stringify(sorted), "utf-8");
}
function readPlanRemoteFiles(planDir) {
  const path = join18(planDir, PLAN_REMOTE_FILES_RELATIVE_PATH);
  return existsSync13(path) ? JSON.parse(readFileSync8(path, "utf-8")) : [];
}
function recomputePlanHashFromPlanDir(planDir, digests) {
  const planJsonPath = join18(planDir, "plan.json");
  const encoderJsonPath = join18(planDir, "meta", "encoder.json");
  if (!existsSync13(planJsonPath)) {
    throw new Error(`[freezePlan] plan.json missing: ${planJsonPath}`);
  }
  if (!existsSync13(encoderJsonPath)) {
    throw new Error(`[freezePlan] meta/encoder.json missing: ${encoderJsonPath}`);
  }
  const planJson = JSON.parse(readFileSync8(planJsonPath, "utf-8"));
  const encoderConfigCanonicalJson = readFileSync8(encoderJsonPath, "utf-8");
  const { compositionHtml, assets } = collectPlanAssetShas(planDir, digests);
  return computePlanHash({
    compositionHtml,
    assets,
    fontSnapshotSha: planJson.fontSnapshotSha,
    encoderConfigCanonicalJson,
    producerVersion: planJson.producerVersion,
    ffmpegVersion: planJson.ffmpegVersion,
    dimensions: planJson.dimensions
  });
}
async function freezePlan(input) {
  const {
    planDir,
    composition,
    encoder,
    chunks,
    dimensions,
    producerVersion,
    fontSnapshotSha,
    durationSeconds,
    totalFrames,
    hasAudio,
    digests
  } = input;
  if (!existsSync13(planDir)) {
    throw new Error(`[freezePlan] planDir does not exist: ${planDir}`);
  }
  const metaDir = join18(planDir, "meta");
  if (!existsSync13(metaDir)) mkdirSync7(metaDir, { recursive: true });
  writeFileSync5(
    join18(metaDir, "composition.json"),
    `${JSON.stringify(composition, null, 2)}
`,
    "utf-8"
  );
  const encoderForCanonical = stripUndefined(encoder);
  const encoderConfigCanonicalJson = canonicalJsonStringify(encoderForCanonical);
  writeFileSync5(join18(metaDir, "encoder.json"), encoderConfigCanonicalJson, "utf-8");
  writeFileSync5(join18(metaDir, "chunks.json"), `${JSON.stringify(chunks, null, 2)}
`, "utf-8");
  const { compositionHtml, assets } = collectPlanAssetShas(planDir, digests);
  const planHash = computePlanHash({
    compositionHtml,
    assets,
    fontSnapshotSha,
    encoderConfigCanonicalJson,
    producerVersion,
    ffmpegVersion: encoder.ffmpegVersion,
    dimensions
  });
  const planJson = {
    protocol: PLAN_PROTOCOL_V1,
    planHash,
    producerVersion,
    ffmpegVersion: encoder.ffmpegVersion,
    fontSnapshotSha,
    dimensions,
    chunkCount: chunks.length,
    totalFrames,
    duration: durationSeconds,
    hasAudio
  };
  const planJsonPath = join18(planDir, "plan.json");
  writeFileSync5(planJsonPath, `${JSON.stringify(planJson, null, 2)}
`, "utf-8");
  return { planJsonPath, planHash };
}

// src/services/render/runtimeEnvSnapshot.ts
var RUNTIME_ENV_PREFIXES = [
  "PRODUCER_RUNTIME_",
  "PRODUCER_RENDER_"
];
function snapshotRuntimeEnv(env = process.env) {
  const snapshot = {};
  for (const key of Object.keys(env)) {
    const matches = RUNTIME_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (!matches) continue;
    const value = env[key];
    if (typeof value !== "string") continue;
    snapshot[key] = value;
  }
  return snapshot;
}
function applyRuntimeEnvSnapshot(snapshot, env = process.env) {
  const previous = {};
  for (const [key, value] of Object.entries(snapshot)) {
    if (typeof value !== "string") continue;
    const matches = RUNTIME_ENV_PREFIXES.some((prefix) => key.startsWith(prefix));
    if (!matches) continue;
    previous[key] = env[key];
    env[key] = value;
  }
  return {
    restore: () => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === void 0) delete env[key];
        else env[key] = value;
      }
    }
  };
}

// src/services/distributed/chunkAudio.ts
import { closeSync as closeSync4, existsSync as existsSync14, ftruncateSync, mkdirSync as mkdirSync9, openSync as openSync4, readFileSync as readFileSync9 } from "node:fs";
import { writeFileSync as writeFileSync6, writeSync } from "node:fs";
import { join as join20 } from "node:path";
import { appendRenderProvenanceArgs, describeFfmpegFailure as describeFfmpegFailure3, runFfmpeg as runFfmpeg7 } from "@hyperframes/engine";

// src/services/distributed/mp4Stitch.ts
import { createReadStream as createReadStream4, createWriteStream, mkdirSync as mkdirSync8, mkdtempSync as mkdtempSync2, rmSync as rmSync6 } from "node:fs";
import { open } from "node:fs/promises";
import { renameWithRetry as renameWithRetry6 } from "@hyperframes/engine";
import { dirname as dirname10, join as join19 } from "node:path";
import { finished, pipeline } from "node:stream/promises";
function boxAt(src, off, at, limit) {
  let size = src.readUInt32BE(off);
  let bodyStart = at + 8;
  if (size === 1) {
    size = Number(src.readBigUInt64BE(off + 8));
    bodyStart = at + 16;
  }
  if (size < 8 || at + size > limit) throw new Error(`[mp4Stitch] malformed box at ${at}`);
  return { type: src.toString("latin1", off + 4, off + 8), start: at, bodyStart, end: at + size };
}
function childBoxes(buf, parent) {
  const boxes2 = [];
  for (let at = parent.bodyStart; at < parent.end; at = boxes2.at(-1).end) {
    boxes2.push(boxAt(buf, at, at, parent.end));
  }
  return boxes2;
}
function findChild(buf, parent, type) {
  return childBoxes(buf, parent).find((box2) => box2.type === type);
}
function child2(buf, parent, type) {
  const found = findChild(buf, parent, type);
  if (!found) throw new Error(`[mp4Stitch] ${parent.type} has no ${type}`);
  return found;
}
var SCAN_BYTES = 64 * 1024;
async function readMp4Layout(read) {
  const found = /* @__PURE__ */ new Map();
  let payload;
  let buf = Buffer.alloc(0);
  let bufAt = 0;
  const load = async (start, end) => {
    if (start >= bufAt && end <= bufAt + buf.length) return;
    buf = await read(start, Math.max(end, start + SCAN_BYTES));
    bufAt = start;
  };
  for (let at = 0; !(found.has("ftyp") && found.has("moov") && payload); ) {
    await load(at, at + 16);
    if (at + 8 > bufAt + buf.length) {
      throw new Error(`[mp4Stitch] chunk needs ftyp, moov and mdat; found ${[...found.keys()]}`);
    }
    const box2 = boxAt(buf, at - bufAt, at, Number.MAX_SAFE_INTEGER);
    if (box2.type === "mdat") payload ??= box2;
    if (box2.type === "ftyp" || box2.type === "moov") {
      await load(at, box2.end);
      found.set(box2.type, buf.subarray(at - bufAt, box2.end - bufAt));
    }
    at = box2.end;
  }
  const [ftyp, moov] = [found.get("ftyp"), found.get("moov")];
  if (moov.length !== moovSize(moov)) throw new Error("[mp4Stitch] moov is cut off");
  return { ftyp, moov, payloadStart: payload.bodyStart, payloadEnd: payload.end };
}
var moovSize = (moov) => boxAt(moov, 0, 0, Number.MAX_SAFE_INTEGER).end;
function readTracks(moov) {
  const root = boxAt(moov, 0, 0, moov.length);
  return childBoxes(moov, root).filter((box2) => box2.type === "trak").map((trak) => readTrack(moov, trak));
}
function rows(buf, table, columns, countAt = 4) {
  const count = buf.readUInt32BE(table.bodyStart + countAt);
  const first = table.bodyStart + countAt + 4;
  return Array.from(
    { length: count },
    (_, row) => Array.from(
      { length: columns },
      (_2, col) => buf.readUInt32BE(first + (row * columns + col) * 4)
    )
  );
}
function readMediaTime(moov, trak) {
  const edts = findChild(moov, trak, "edts");
  if (!edts) return 0;
  const elst = child2(moov, edts, "elst");
  const wide = moov[elst.bodyStart] === 1;
  const entries = moov.readUInt32BE(elst.bodyStart + 4);
  for (let i = 0, at = elst.bodyStart + 8; i < entries; i++, at += wide ? 20 : 12) {
    const offset = at + (wide ? 8 : 4);
    const mediaTime = wide ? Number(moov.readBigInt64BE(offset)) : moov.readInt32BE(offset);
    if (mediaTime !== -1) return mediaTime;
  }
  return 0;
}
function readSizes(moov, stsz) {
  const fixedSize = moov.readUInt32BE(stsz.bodyStart + 4);
  if (!fixedSize) return rows(moov, stsz, 1, 8).map(([size]) => size);
  return Array(moov.readUInt32BE(stsz.bodyStart + 8)).fill(fixedSize);
}
function readSync3(moov, stbl, sampleCount) {
  const stss = findChild(moov, stbl, "stss");
  if (!stss) return null;
  const sync = Array(sampleCount).fill(false);
  for (const [n] of rows(moov, stss, 1)) sync[n - 1] = true;
  return sync;
}
function readChunkOffsets(moov, stbl) {
  const stco = findChild(moov, stbl, "stco");
  if (stco) return rows(moov, stco, 1).map(([offset]) => offset);
  return rows(moov, child2(moov, stbl, "co64"), 2).map(([hi, lo]) => hi * 2 ** 32 + lo);
}
function readSamplesPerChunk(moov, stbl, chunkCount) {
  const stsc = rows(moov, child2(moov, stbl, "stsc"), 3);
  return stsc.flatMap(([firstChunk, perChunk, description], i) => {
    if (description !== 1) throw new Error("[mp4Stitch] chunk uses more than one sample entry");
    const nextFirst = stsc[i + 1]?.[0] ?? chunkCount + 1;
    return Array(nextFirst - firstChunk).fill(perChunk);
  });
}
function readTrack(moov, trak) {
  const mdia = child2(moov, trak, "mdia");
  const hdlr = child2(moov, mdia, "hdlr");
  const stbl = child2(moov, child2(moov, mdia, "minf"), "stbl");
  if (findChild(moov, stbl, "ctts")) throw new Error("[mp4Stitch] chunk has ctts (B-frames)");
  const stts = rows(moov, child2(moov, stbl, "stts"), 2);
  const durations = stts.flatMap(([n, delta]) => Array(n).fill(delta));
  const sizes = readSizes(moov, child2(moov, stbl, "stsz"));
  const chunkOffsets = readChunkOffsets(moov, stbl);
  const samplesPerChunk = readSamplesPerChunk(moov, stbl, chunkOffsets.length);
  if (durations.length !== sizes.length || sum(samplesPerChunk) !== sizes.length) {
    throw new Error("[mp4Stitch] sample tables disagree on the sample count");
  }
  const stsd = child2(moov, stbl, "stsd");
  return {
    trak,
    handler: moov.toString("latin1", hdlr.bodyStart + 8, hdlr.bodyStart + 12),
    timescale: timescaleOf(moov, child2(moov, mdia, "mdhd")),
    mediaTime: readMediaTime(moov, trak),
    stsd: moov.subarray(stsd.start, stsd.end),
    durations,
    sizes,
    sync: readSync3(moov, stbl, sizes.length),
    samplesPerChunk,
    chunkOffsets
  };
}
function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}
function box(type, ...body) {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + sum(body.map((part) => part.length)));
  header.write(type, 4, "latin1");
  return Buffer.concat([header, ...body]);
}
function fullBox(type, version, body) {
  return box(type, Buffer.from([version, 0, 0, 0]), body);
}
function u32s(values) {
  const buf = Buffer.alloc(values.length * 4);
  values.forEach((value, i) => buf.writeUInt32BE(value, i * 4));
  return buf;
}
function runs(values) {
  const out = [];
  for (const value of values) {
    const last = out.at(-1);
    if (last && last[1] === value) last[0]++;
    else out.push([1, value]);
  }
  return out;
}
function rebuild(buf, parent, replace) {
  const parts = childBoxes(buf, parent).map(
    (box2) => replace[box2.type]?.(box2) ?? buf.subarray(box2.start, box2.end)
  );
  return box(parent.type, ...parts);
}
var DURATION_AT = {
  mvhd: [16, 24],
  mdhd: [16, 24],
  tkhd: [20, 28]
};
function withDuration(buf, target, duration) {
  const copy = Buffer.from(buf.subarray(target.start, target.end));
  const body = target.bodyStart - target.start;
  const wide = copy[body] === 1;
  const at = body + DURATION_AT[target.type][wide ? 1 : 0];
  if (wide) copy.writeBigUInt64BE(BigInt(duration), at);
  else if (duration <= 4294967295) copy.writeUInt32BE(duration, at);
  else throw new Error(`[mp4Stitch] ${target.type} duration ${duration} needs a version 1 box`);
  return copy;
}
function timescaleOf(buf, header) {
  return buf.readUInt32BE(header.bodyStart + (buf[header.bodyStart] === 1 ? 20 : 12));
}
var TRACK_ID_AT = { tkhd: [12, 20], mvhd: [96, 108] };
function idOf(buf, target) {
  return buf.readUInt32BE(
    target.bodyStart + TRACK_ID_AT[target.type][buf[target.bodyStart] === 1 ? 1 : 0]
  );
}
function withId(boxBytes, type, id) {
  const header = boxAt(boxBytes, 0, 0, boxBytes.length);
  boxBytes.writeUInt32BE(
    id,
    header.bodyStart + TRACK_ID_AT[type][boxBytes[header.bodyStart] === 1 ? 1 : 0]
  );
  return boxBytes;
}
function buildStbl(stsd, track) {
  const stts = runs(track.durations);
  const stsc = [];
  let firstChunk = 1;
  for (const [count, perChunk] of runs(track.samplesPerChunk)) {
    stsc.push([firstChunk, perChunk, 1]);
    firstChunk += count;
  }
  const co64 = Buffer.alloc(4 + track.chunkOffsets.length * 8);
  co64.writeUInt32BE(track.chunkOffsets.length);
  track.chunkOffsets.forEach((offset, i) => co64.writeBigUInt64BE(BigInt(offset), 4 + i * 8));
  const syncSamples = track.sync?.flatMap((isSync, i) => isSync ? [i + 1] : []) ?? null;
  return box(
    "stbl",
    stsd,
    fullBox("stts", 0, u32s([stts.length, ...stts.flat()])),
    ...syncSamples ? [fullBox("stss", 0, u32s([syncSamples.length, ...syncSamples]))] : [],
    fullBox("stsc", 0, u32s([stsc.length, ...stsc.flat()])),
    fullBox("stsz", 0, u32s([0, track.sizes.length, ...track.sizes])),
    fullBox("co64", 0, co64)
  );
}
var codecOf = (track) => track.stsd.toString("latin1", 20, 24);
var sameTrack = (track, plan2) => track.handler === plan2.handler && track.timescale === plan2.timescale && codecOf(track) === codecOf(plan2);
function planTracksOf(tracks, plan2, index) {
  let next = 0;
  const matched = plan2.map((planTrack) => {
    const track = tracks[next];
    if (track && sameTrack(track, planTrack)) return tracks[next++];
    if (planTrack.handler === "soun") return null;
    throw new Error(`[mp4Stitch] chunk ${index} tracks differ from chunk 0`);
  });
  if (next !== tracks.length)
    throw new Error(`[mp4Stitch] chunk ${index} tracks differ from chunk 0`);
  for (const track of tracks) {
    if (track.handler === "vide" && track.mediaTime !== 0) {
      throw new Error(`[mp4Stitch] chunk ${index} video starts at media time ${track.mediaTime}`);
    }
  }
  return matched;
}
function sourceTracks(layouts, audio) {
  const chunkPlan = readTracks(layouts[0].moov);
  const audioTracks = audio ? readTracks(audio.moov) : [];
  if (audio && (audioTracks.length !== 1 || audioTracks[0].handler !== "soun")) {
    throw new Error("[mp4Stitch] the separate audio file must hold one audio track");
  }
  const plan2 = [...chunkPlan, ...audioTracks];
  const chunks = layouts.map((layout, i) => {
    const tracks = readTracks(layout.moov);
    if (audio && tracks.some((track) => track.handler === "soun")) {
      throw new Error(`[mp4Stitch] chunk ${i} carries its own audio`);
    }
    return planTracksOf(tracks, plan2, i);
  });
  return {
    plan: plan2,
    chunkTrackCount: chunkPlan.length,
    sources: audio ? [[...chunkPlan.map(() => null), audioTracks[0]], ...chunks] : chunks
  };
}
function buildStitchedHeader(layouts, audio) {
  const { plan: plan2, chunkTrackCount, sources } = sourceTracks(layouts, audio);
  const sourceLayouts = audio ? [audio, ...layouts] : layouts;
  const payloadBases = [];
  let payloadBytes = 0;
  for (const layout of sourceLayouts) {
    payloadBases.push(payloadBytes);
    payloadBytes += layout.payloadEnd - layout.payloadStart;
  }
  const template = layouts[0].moov;
  const root = boxAt(template, 0, 0, template.length);
  const mvhd = child2(template, root, "mvhd");
  const movieTimescale = timescaleOf(template, mvhd);
  const chunkTrackIds = plan2.slice(0, chunkTrackCount).map((track) => idOf(template, child2(template, track.trak, "tkhd")));
  const audioTrackId = Math.max(...chunkTrackIds) + 1;
  const buildMoov = (dataStart2) => {
    const traks = plan2.map((track, t) => {
      const parts = sources.flatMap((tracks, chunk) => {
        const part = tracks[t];
        return part ? [{ ...part, chunk }] : [];
      });
      const moov = t < chunkTrackCount ? template : audio.moov;
      const merged = {
        durations: parts.flatMap((part) => part.durations),
        sizes: parts.flatMap((part) => part.sizes),
        sync: parts.every((part) => !part.sync) ? null : parts.flatMap((part) => part.sync ?? part.sizes.map(() => true)),
        samplesPerChunk: parts.flatMap((part) => part.samplesPerChunk),
        chunkOffsets: parts.flatMap(
          (part) => part.chunkOffsets.map((offset) => {
            const i = part.chunk;
            const { payloadStart, payloadEnd } = sourceLayouts[i];
            if (offset < payloadStart || offset >= payloadEnd) {
              throw new Error(`[mp4Stitch] source ${i} has samples outside its mdat`);
            }
            return offset - payloadStart + payloadBases[i] + dataStart2;
          })
        )
      };
      const mediaDuration = sum(merged.durations);
      const shown = Math.round(
        (mediaDuration - track.mediaTime) * movieTimescale / track.timescale
      );
      const elst = Buffer.alloc(24);
      elst.writeUInt32BE(1);
      elst.writeBigUInt64BE(BigInt(shown), 4);
      elst.writeBigInt64BE(BigInt(track.mediaTime), 12);
      elst.writeUInt32BE(65536, 20);
      const edts = track.mediaTime ? box("edts", fullBox("elst", 1, elst)) : Buffer.alloc(0);
      const tkhdOf = (tkhd) => {
        const timed = withDuration(moov, tkhd, shown);
        return t < chunkTrackCount ? timed : withId(timed, "tkhd", audioTrackId);
      };
      const trak = rebuild(moov, track.trak, {
        tkhd: (tkhd) => Buffer.concat([tkhdOf(tkhd), edts]),
        edts: () => Buffer.alloc(0),
        mdia: (mdia) => rebuild(moov, mdia, {
          mdhd: (mdhd) => withDuration(moov, mdhd, mediaDuration),
          minf: (minf) => rebuild(moov, minf, { stbl: () => buildStbl(track.stsd, merged) })
        })
      });
      return { trak, shown };
    });
    let next = 0;
    const movieHeader = withDuration(template, mvhd, Math.max(...traks.map((t) => t.shown)));
    return rebuild(template, root, {
      mvhd: () => audio ? withId(movieHeader, "mvhd", audioTrackId + 1) : movieHeader,
      trak: () => ++next < chunkTrackCount ? traks[next - 1].trak : Buffer.concat(traks.slice(next - 1).map((t) => t.trak))
    });
  };
  const ftyp = layouts[0].ftyp;
  const dataStart = ftyp.length + buildMoov(0).length + 16;
  const mdat = Buffer.alloc(16);
  mdat.writeUInt32BE(1);
  mdat.write("mdat", 4, "latin1");
  mdat.writeBigUInt64BE(BigInt(16 + payloadBytes), 8);
  return Buffer.concat([ftyp, buildMoov(dataStart), mdat]);
}
function fileRange(path) {
  return async (start, end) => {
    const file = await open(path, "r", 384);
    try {
      const buf = Buffer.alloc(end - start);
      const { bytesRead } = await file.read(buf, 0, buf.length, start);
      return buf.subarray(0, bytesRead);
    } finally {
      await file.close();
    }
  };
}
async function copyPayload(path, layout, index, out) {
  const { payloadStart, payloadEnd } = layout;
  const payload = createReadStream4(path, { start: payloadStart, end: payloadEnd - 1 });
  await pipeline(payload, out, { end: false });
  if (payload.bytesRead !== payloadEnd - payloadStart) {
    throw new Error(
      `[mp4Stitch] chunk ${index} mdat holds ${payload.bytesRead} of ${payloadEnd - payloadStart} payload bytes`
    );
  }
}
async function writeStitchedMp4(chunkPaths, outputPath, audioPath) {
  const sourcePaths = audioPath ? [audioPath, ...chunkPaths] : chunkPaths;
  const layouts = await Promise.all(sourcePaths.map((path) => readMp4Layout(fileRange(path))));
  const header = audioPath ? buildStitchedHeader(layouts.slice(1), layouts[0]) : buildStitchedHeader(layouts);
  mkdirSync8(dirname10(outputPath), { recursive: true });
  const workDir = mkdtempSync2(`${outputPath}.stitch-`);
  const out = createWriteStream(join19(workDir, "out.mp4"));
  try {
    out.write(header);
    for (const [i, path] of sourcePaths.entries()) await copyPayload(path, layouts[i], i, out);
    out.end();
    await finished(out);
    renameWithRetry6(join19(workDir, "out.mp4"), outputPath);
  } finally {
    out.destroy();
    rmSync6(workDir, { recursive: true, force: true });
  }
}

// src/services/distributed/chunkAudio.ts
function audioCutForChunk(grid, chunks, index, fps) {
  const firstPacketAt = (frame) => Math.min(
    grid.packetCount,
    Math.max(
      0,
      Math.ceil(
        (frame * fps.den * grid.sampleRate - grid.firstStart * fps.num) / (grid.packetSamples * fps.num)
      )
    )
  );
  const first = index === 0 ? 0 : firstPacketAt(chunks[index].startFrame);
  const end = index === chunks.length - 1 ? grid.packetCount : firstPacketAt(chunks[index + 1].startFrame);
  if (end <= first) return null;
  const cutSeconds = (packet) => (grid.firstStart + packet * grid.packetSamples - grid.packetSamples / 2) / grid.sampleRate;
  const seekSeconds = index === 0 ? null : cutSeconds(first);
  const durationSeconds = end === grid.packetCount ? null : cutSeconds(end) - (seekSeconds ?? 0);
  return { seekSeconds, durationSeconds, firstPacket: first, packetCount: end - first };
}
function chunksWithSubRange(chunks, index, range) {
  const slice = chunks[index];
  const parts = [
    { startFrame: slice.startFrame, endFrame: range.startFrame },
    range,
    { startFrame: range.endFrame, endFrame: slice.endFrame }
  ].filter((part) => part.endFrame > part.startFrame);
  const split = [...chunks.slice(0, index), ...parts, ...chunks.slice(index + 1)].map(
    (chunk, i) => ({ index: i, startFrame: chunk.startFrame, endFrame: chunk.endFrame })
  );
  return { chunks: split, index: range.startFrame > slice.startFrame ? index + 1 : index };
}
async function probeAacPacketGrid(audioPath) {
  const probe = await runFfprobeJson([
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=sample_rate,time_base,nb_frames:packet=pts,duration",
    "-read_intervals",
    "%+#1",
    "-of",
    "json",
    "--",
    audioPath
  ]);
  const stream = probe.streams?.[0] ?? {};
  const packet = probe.packets?.[0] ?? {};
  const sampleRate = Number(stream.sample_rate);
  const [tbNum = NaN, tbDen = NaN] = String(stream.time_base).split("/").map(Number);
  const toSamples = (ticks) => Number(ticks) * sampleRate * tbNum / tbDen;
  const grid = {
    sampleRate,
    firstStart: toSamples(packet.pts),
    packetSamples: toSamples(packet.duration),
    packetCount: Number(stream.nb_frames)
  };
  const counts = [grid.sampleRate, grid.packetSamples, grid.packetCount];
  if (!Number.isFinite(grid.firstStart) || !counts.every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error(`[chunkAudio] could not read the AAC packet grid: ${JSON.stringify(probe)}`);
  }
  return grid;
}
var SLICE_DIR = "audio-chunks";
var SLICE_FRAME = `${SLICE_DIR}/frame.m4a`;
var SLICE_LAYOUT = `${SLICE_DIR}/layout.json`;
function chunkAudioSlicePath(index) {
  return `${SLICE_DIR}/${String(index).padStart(4, "0")}.bin`;
}
function chunkAudioSliceTarget(path) {
  if (path === SLICE_FRAME || path === SLICE_LAYOUT) return "all";
  const match = /^audio-chunks\/(\d{4,})\.bin$/.exec(path);
  return match ? Number(match[1]) : null;
}
async function writeChunkAudioSlices(input) {
  const grid = await probeAacPacketGrid(input.audioPath);
  const { payloadStart, payloadEnd, moov } = await readMp4Layout(fileRange(input.audioPath));
  const [track] = readTracks(moov);
  const offsets = [];
  track.chunkOffsets.forEach((offset, chunk) => {
    for (let i = 0; i < track.samplesPerChunk[chunk]; i++) {
      offsets.push(offset);
      offset += track.sizes[offsets.length - 1];
    }
  });
  const bytes = readFileSync9(input.audioPath);
  const layout = { sizeBytes: bytes.length, payloadStart, payloadEnd, partStarts: {} };
  mkdirSync9(join20(input.planDir, SLICE_DIR), { recursive: true });
  input.chunks.forEach((_, index) => {
    const cut = audioCutForChunk(grid, input.chunks, index, input.fps);
    if (!cut) return;
    const last = cut.firstPacket + cut.packetCount - 1;
    const start = offsets[cut.firstPacket];
    layout.partStarts[index] = start;
    const end = offsets[last] + track.sizes[last];
    writeFileSync6(join20(input.planDir, chunkAudioSlicePath(index)), bytes.subarray(start, end));
  });
  const frame = [bytes.subarray(0, payloadStart), bytes.subarray(payloadEnd)];
  writeFileSync6(join20(input.planDir, SLICE_FRAME), Buffer.concat(frame));
  writeFileSync6(join20(input.planDir, SLICE_LAYOUT), JSON.stringify(layout));
}
function chunkAudioSource(planDir, chunkIndex, scratchPath) {
  const layoutPath = join20(planDir, SLICE_LAYOUT);
  if (!existsSync14(layoutPath)) return resolvePlanAudioPath(planDir);
  const layout = JSON.parse(readFileSync9(layoutPath, "utf-8"));
  const frame = readFileSync9(join20(planDir, SLICE_FRAME));
  const fd = openSync4(scratchPath, "w");
  try {
    writeSync(fd, frame, 0, layout.payloadStart, 0);
    writeSync(
      fd,
      frame,
      layout.payloadStart,
      frame.length - layout.payloadStart,
      layout.payloadEnd
    );
    const start = layout.partStarts[chunkIndex];
    if (start !== void 0) {
      const part = readFileSync9(join20(planDir, chunkAudioSlicePath(chunkIndex)));
      writeSync(fd, part, 0, part.length, start);
    }
    ftruncateSync(fd, layout.sizeBytes);
  } finally {
    closeSync4(fd);
  }
  return scratchPath;
}
function chunkMuxArgs(input, cut) {
  if (!cut) return ["-i", input.videoPath, "-map", "0:v:0"];
  const seek = cut.seekSeconds === null ? [] : ["-ss", cut.seekSeconds.toFixed(6)];
  const length = cut.durationSeconds === null ? [] : ["-t", cut.durationSeconds.toFixed(6)];
  const exact = seek.length ? ["-copypriorss", "0"] : [];
  return [
    ...["-i", input.videoPath, ...seek, ...length, "-i", input.audioPath],
    ...["-map", "0:v:0", "-map", "1:a:0", ...exact]
  ];
}
async function muxChunkWithAudio(input) {
  const grid = input.audioPath ? await probeAacPacketGrid(input.audioPath) : null;
  const cut = grid ? audioCutForChunk(grid, input.chunks, input.chunkIndex, input.fps) : null;
  const args = [...chunkMuxArgs(input, cut), "-c", "copy"];
  appendRenderProvenanceArgs(args, input.outputPath);
  args.push("-y", input.outputPath);
  const result = await runFfmpeg7(args, { signal: input.signal, timeout: input.timeoutMs });
  if (!result.success) {
    throw new Error(
      `[chunkAudio] chunk mux failed: ${describeFfmpegFailure3(result, input.timeoutMs)}`
    );
  }
  const slice = input.chunks[input.chunkIndex];
  const expected = { video: slice.endFrame - slice.startFrame };
  if (cut) expected.audio = cut.packetCount;
  const probe = await runFfprobeJson([
    "-v",
    "error",
    "-count_packets",
    "-show_entries",
    "stream=codec_type,nb_read_packets",
    "-of",
    "json",
    "--",
    input.outputPath
  ]);
  for (const [type, count] of Object.entries(expected)) {
    const packets = Number(probe.streams?.find((s) => s.codec_type === type)?.nb_read_packets ?? 0);
    if (packets !== count) {
      throw new Error(`[chunkAudio] ${type} packets in chunk ${packets}, expected ${count}`);
    }
  }
}

// src/services/distributed/planSize.ts
import { createHash as createHash7 } from "node:crypto";
import { lstatSync, readdirSync as readdirSync6 } from "node:fs";
import { extname as extname3, join as join21, relative as relative4 } from "node:path";
var MAX_TOP_COMPONENTS = 10;
var SOURCE_MEDIA_EXTENSIONS = /* @__PURE__ */ new Set([
  ".aac",
  ".aiff",
  ".avi",
  ".flac",
  ".m4a",
  ".m4v",
  ".mkv",
  ".mov",
  ".mp3",
  ".mp4",
  ".mpeg",
  ".mpg",
  ".ogg",
  ".ogv",
  ".ts",
  ".wav",
  ".webm"
]);
var PLAN_ROOT_CATEGORY = {
  compiled: "compiled",
  [PLAN_AUDIO_RELATIVE_PATH]: "audio",
  meta: "metadata",
  "plan.json": "metadata"
};
function hashComponent(value) {
  return createHash7("sha256").update(value).digest("hex").slice(0, 12);
}
function classifyFile(segments, rootKind) {
  const rootName = segments[0] ?? "";
  const extractedRootName = rootKind === "compiled" ? "__hyperframes_video_frames" : "video-frames";
  if (rootName === extractedRootName) {
    const videoKey = segments[1] ?? "unknown";
    return {
      category: "video-frames",
      componentLabel: `video-frames:${hashComponent(videoKey)}`
    };
  }
  const category = rootKind === "compiled" ? "compiled" : PLAN_ROOT_CATEGORY[rootName] ?? "other";
  return { category, componentLabel: category };
}
function emptyBreakdown() {
  return {
    totalBytes: 0,
    fileCount: 0,
    compiledBytes: 0,
    sourceMediaBytes: 0,
    videoFramesBytes: 0,
    videoFrameFileCount: 0,
    audioBytes: 0,
    metadataBytes: 0,
    otherBytes: 0,
    topComponents: []
  };
}
function addCategoryBytes(result, category, filePath, sizeBytes) {
  if (category === "compiled") {
    result.compiledBytes += sizeBytes;
    if (SOURCE_MEDIA_EXTENSIONS.has(extname3(filePath).toLowerCase())) {
      result.sourceMediaBytes += sizeBytes;
    }
    return;
  }
  if (category === "video-frames") {
    result.videoFramesBytes += sizeBytes;
    result.videoFrameFileCount += 1;
    return;
  }
  if (category === "audio") {
    result.audioBytes += sizeBytes;
    return;
  }
  if (category === "metadata") {
    result.metadataBytes += sizeBytes;
    return;
  }
  result.otherBytes += sizeBytes;
}
function recordFile(result, components, rootDir, rootKind, filePath) {
  let sizeBytes;
  try {
    const stat = lstatSync(filePath);
    if (!stat.isFile()) return;
    sizeBytes = stat.size;
  } catch {
    return;
  }
  const rel = relative4(rootDir, filePath);
  const segments = rel.split(/[\\/]+/).filter(Boolean);
  const classified = classifyFile(segments, rootKind);
  result.totalBytes += sizeBytes;
  result.fileCount += 1;
  addCategoryBytes(result, classified.category, filePath, sizeBytes);
  const component = components.get(classified.componentLabel) ?? {
    label: classified.componentLabel,
    sizeBytes: 0,
    fileCount: 0
  };
  component.sizeBytes += sizeBytes;
  component.fileCount += 1;
  components.set(classified.componentLabel, component);
}
function walkRegularFiles(dir, visit) {
  let entries;
  try {
    entries = readdirSync6(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join21(dir, entry.name);
    if (entry.isDirectory()) {
      walkRegularFiles(full, visit);
    } else if (entry.isFile()) {
      visit(full);
    }
  }
}
function measurePlanSizeBreakdown(rootDir, rootKind = "plan") {
  const result = emptyBreakdown();
  const components = /* @__PURE__ */ new Map();
  walkRegularFiles(
    rootDir,
    (filePath) => recordFile(result, components, rootDir, rootKind, filePath)
  );
  result.topComponents = [...components.values()].sort((a, b) => b.sizeBytes - a.sizeBytes || a.label.localeCompare(b.label)).slice(0, MAX_TOP_COMPONENTS);
  return result;
}

// src/services/distributed/plan.ts
function logPlanStage(log, stage, startedAt) {
  log.info("[plan] stage", { stage, ms: Date.now() - startedAt });
}
function applyDistributedAudioWarningPolicy(job, audioError, audioFailures = [], log = defaultLogger) {
  const failureOwner = audioFailures.length === 0 ? void 0 : audioFailures.some((failure) => failure.owner === "system") ? "system" : "user";
  const retryable = audioFailures.length === 0 ? void 0 : audioFailures.every((failure) => failure.retryable);
  applyRenderWarningPolicy(
    job,
    [
      {
        code: "audio_processing_failed",
        message: `Audio mix failed; output would be video-only: ${audioError}`,
        details: {
          mediaType: "audio",
          audioFailures: audioFailureDiagnostics3(audioFailures),
          failureReasons: [...new Set(audioFailures.map((failure) => failure.reason))],
          failureStages: [...new Set(audioFailures.map((failure) => failure.stage))],
          failureOwner,
          retryable
        }
      }
    ],
    log
  );
}
var PLAN_PROJECT_DIR_SKIP_SEGMENTS = /* @__PURE__ */ new Set([
  "node_modules",
  ".git",
  ".cache",
  "output",
  "failures",
  "dist",
  ".next",
  ".turbo"
]);
var DEFAULT_CHUNK_SIZE = 240;
var DEFAULT_MAX_PARALLEL_CHUNKS = 16;
var MIN_CHUNK_SIZE = 10;
var MAX_CHUNK_SIZE = 3600;
var MAX_PARALLEL_CHUNKS_CEILING = 256;
var ESTIMATED_SECONDS_PER_MEGAPIXEL_FRAME = 0.11;
var ESTIMATED_CHUNK_OVERHEAD_SECONDS = 60;
var WORKER_TIMEOUT_MARGIN = 0.75;
function estimateFrameSeconds(megapixels, measuredSecondsPerFrame = 0) {
  return Math.max(ESTIMATED_SECONDS_PER_MEGAPIXEL_FRAME * megapixels, measuredSecondsPerFrame);
}
function estimateChunkSeconds(frames, megapixels, measuredSecondsPerFrame) {
  return ESTIMATED_CHUNK_OVERHEAD_SECONDS + frames * estimateFrameSeconds(megapixels, measuredSecondsPerFrame);
}
function planNeedsFrameCostMeasurement(html) {
  return new RegExp(`\\b${HF_COLOR_GRADING_ATTR2}=`, "i").test(html);
}
function chunkSizingUsesFrameCost(config) {
  return config.maxParallelChunks === void 0 && config.chunkSize === void 0 && config.targetChunkFrames === void 0 && (config.workerTimeoutSeconds !== void 0 || config.workerConcurrency !== void 0);
}
var CHUNK_EXCEEDS_WORKER_TIMEOUT = "CHUNK_EXCEEDS_WORKER_TIMEOUT";
var ChunkExceedsWorkerTimeoutError = class extends Error {
  code = CHUNK_EXCEEDS_WORKER_TIMEOUT;
  constructor(predictedChunkSeconds, workerTimeoutSeconds) {
    super(
      `[plan] each chunk is predicted to take about ${predictedChunkSeconds} s even split ${MAX_PARALLEL_CHUNKS_CEILING} ways, over the ${workerTimeoutSeconds * WORKER_TIMEOUT_MARGIN} s budget (${WORKER_TIMEOUT_MARGIN * 100}% of the ${workerTimeoutSeconds} s worker time limit) (${CHUNK_EXCEEDS_WORKER_TIMEOUT}). Shorten the video or lower its resolution, raise the worker time limit, or pass an explicit chunkSize or maxParallelChunks to override the estimate.`
    );
    this.name = "ChunkExceedsWorkerTimeoutError";
  }
};
function framesWithinWorkerTimeout(workerTimeoutSeconds, secondsPerFrame) {
  return Math.floor(
    (workerTimeoutSeconds * WORKER_TIMEOUT_MARGIN - ESTIMATED_CHUNK_OVERHEAD_SECONDS) / secondsPerFrame
  );
}
function resolveMaxParallelChunks(config, totalFrames, megapixels, log = defaultLogger, measuredSecondsPerFrame) {
  if (config.maxParallelChunks !== void 0) return config.maxParallelChunks;
  const { workerTimeoutSeconds, workerConcurrency } = config;
  const wave = Math.min(
    workerConcurrency ?? DEFAULT_MAX_PARALLEL_CHUNKS,
    MAX_PARALLEL_CHUNKS_CEILING
  );
  if (!chunkSizingUsesFrameCost(config)) return wave;
  const secondsPerFrame = estimateFrameSeconds(megapixels, measuredSecondsPerFrame);
  const minFramesPerChunk = Math.ceil(ESTIMATED_CHUNK_OVERHEAD_SECONDS / secondsPerFrame);
  const wide = Math.max(1, Math.min(wave, Math.floor(totalFrames / minFramesPerChunk)));
  if (workerTimeoutSeconds === void 0) return wide;
  const maxFramesPerChunk = framesWithinWorkerTimeout(workerTimeoutSeconds, secondsPerFrame);
  const needed = maxFramesPerChunk < 1 ? Infinity : Math.ceil(totalFrames / maxFramesPerChunk);
  if (needed > MAX_PARALLEL_CHUNKS_CEILING) {
    const framesAtCeiling = Math.ceil(totalFrames / MAX_PARALLEL_CHUNKS_CEILING);
    throw new ChunkExceedsWorkerTimeoutError(
      Math.ceil(estimateChunkSeconds(framesAtCeiling, megapixels, measuredSecondsPerFrame)),
      workerTimeoutSeconds
    );
  }
  if (needed > wave) {
    log.warn(
      `[plan] ${needed} chunks are needed to keep each under the ${workerTimeoutSeconds} s worker time limit, but the plan assumes ${wave} workers at once, so the render runs in ${Math.ceil(needed / wave)} waves. Raise --concurrency to ${needed} to render in one wave (Lambda: hyperframes lambda deploy --concurrency ${needed}, or a higher account concurrency quota).`,
      { needed, workerConcurrency: wave, workerTimeoutSeconds }
    );
  }
  return Math.max(wide, needed);
}
var PLAN_DIR_SIZE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;
var PLAN_TOO_LARGE = "PLAN_TOO_LARGE";
var PlanTooLargeError = class extends Error {
  code = PLAN_TOO_LARGE;
  sizeBytes;
  limitBytes;
  breakdown;
  observedAt;
  constructor(sizeBytes, limitBytes, breakdown, observedAt) {
    const breakdownSuffix = breakdown ? ` Breakdown: video-frames=${formatBytes(breakdown.videoFramesBytes)}, compiled=${formatBytes(breakdown.compiledBytes)} (source-media=${formatBytes(breakdown.sourceMediaBytes)}), audio=${formatBytes(breakdown.audioBytes)}, metadata=${formatBytes(breakdown.metadataBytes)}, other=${formatBytes(breakdown.otherBytes)}, files=${breakdown.fileCount}.` : "";
    const observationSuffix = observedAt ? ` Observed at ${observedAt}.` : "";
    super(
      `[plan] planDir size ${formatBytes(sizeBytes)} exceeds the configured ceiling ${formatBytes(limitBytes)} (PLAN_TOO_LARGE). The default 2 GB cap fits inside AWS Lambda's 10 GB /tmp budget alongside the chunk worker's frame buffer and ffmpeg's working set. To unblock: use the content-addressed \`planV2()\` transport, shorten the composition, lower the framerate, or use the in-process renderer (\`executeRenderJob\`), which has no planDir size cap.` + observationSuffix + breakdownSuffix
    );
    this.name = "PlanTooLargeError";
    this.sizeBytes = sizeBytes;
    this.limitBytes = limitBytes;
    this.breakdown = breakdown;
    this.observedAt = observedAt;
  }
};
var FORMAT_NOT_SUPPORTED_IN_DISTRIBUTED = "FORMAT_NOT_SUPPORTED_IN_DISTRIBUTED";
var FormatNotSupportedInDistributedError = class extends Error {
  code = FORMAT_NOT_SUPPORTED_IN_DISTRIBUTED;
  format;
  reason;
  constructor(format, reason) {
    super(
      `[plan] format ${JSON.stringify(format)} is not supported in distributed mode: ${reason}. Render with the in-process renderer (\`executeRenderJob\`), which has full format support, or pick a distributed-supported format: mp4 SDR, mov ProRes 4444, png-sequence, or webm VP9.`
    );
    this.name = "FormatNotSupportedInDistributedError";
    this.format = format;
    this.reason = reason;
  }
};
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
}
function rejectUnsupportedDistributedFormat(config) {
  if (config.hdrMode === "force-hdr") {
    throw new FormatNotSupportedInDistributedError(
      "mp4-hdr",
      "HDR (PQ / HLG) requires per-source HDR pre-extract + HDR signaling re-apply on the assembled file; neither is implemented for the distributed pipeline"
    );
  }
}
function measurePlanDirBytes(planDir) {
  return measurePlanSizeBreakdown(planDir).totalBytes;
}
function assertPlanSizeWithinLimit(input) {
  const breakdown = measurePlanSizeBreakdown(input.rootDir, input.rootKind);
  if (breakdown.totalBytes <= input.limitBytes) return breakdown;
  input.log.warn("[plan] size budget exceeded", {
    observedAt: input.observedAt,
    sizeBytes: breakdown.totalBytes,
    limitBytes: input.limitBytes,
    fileCount: breakdown.fileCount,
    compiledBytes: breakdown.compiledBytes,
    sourceMediaBytes: breakdown.sourceMediaBytes,
    videoFramesBytes: breakdown.videoFramesBytes,
    videoFrameFileCount: breakdown.videoFrameFileCount,
    audioBytes: breakdown.audioBytes,
    metadataBytes: breakdown.metadataBytes,
    otherBytes: breakdown.otherBytes,
    topComponents: breakdown.topComponents
  });
  throw new PlanTooLargeError(breakdown.totalBytes, input.limitBytes, breakdown, input.observedAt);
}
function resolveChunkPlan(totalFrames, configChunkSize, maxParallelChunks, targetChunkFrames) {
  assertPositiveInteger("totalFrames", totalFrames);
  assertPositiveInteger("maxParallelChunks", maxParallelChunks);
  if (configChunkSize !== void 0) {
    assertPositiveInteger("configChunkSize", configChunkSize);
  }
  if (targetChunkFrames !== void 0) {
    assertPositiveInteger("targetChunkFrames", targetChunkFrames);
  }
  const autoSizeParallel = targetChunkFrames === void 0 ? maxParallelChunks : Math.min(maxParallelChunks, Math.max(1, Math.ceil(totalFrames / targetChunkFrames)));
  const resolvedChunkSize = configChunkSize ?? Math.max(MIN_CHUNK_SIZE, Math.ceil(totalFrames / autoSizeParallel));
  const naiveCount = Math.ceil(totalFrames / resolvedChunkSize);
  const chunkCount = Math.min(maxParallelChunks, Math.max(1, naiveCount));
  const effectiveChunkSize = Math.max(resolvedChunkSize, Math.ceil(totalFrames / chunkCount));
  const tightChunkCount = Math.min(chunkCount, Math.ceil(totalFrames / effectiveChunkSize));
  return { chunkCount: tightChunkCount, effectiveChunkSize };
}
function assertPositiveInteger(name, value) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `[plan] resolveChunkPlan: ${name} must be a positive integer (received ${String(value)})`
    );
  }
}
var FREEZE_OWNED_PLAN_FILES = [
  "plan.json",
  join22("meta", "composition.json"),
  join22("meta", "encoder.json"),
  join22("meta", "chunks.json")
];
function removeFreezeOwnedPlanFiles(planDir) {
  for (const relativePath of FREEZE_OWNED_PLAN_FILES) {
    rmSync7(join22(planDir, relativePath), { force: true });
  }
}
function buildChunkSlices(totalFrames, chunkCount, effectiveChunkSize) {
  const slices = [];
  for (let i = 0; i < chunkCount; i++) {
    const startFrame = i * effectiveChunkSize;
    const endFrame = i === chunkCount - 1 ? totalFrames : Math.min(totalFrames, startFrame + effectiveChunkSize);
    slices.push({ index: i, startFrame, endFrame });
  }
  return slices;
}
function buildPlanChunkSlices(frameWeights, config, chunkCount, effectiveChunkSize, maxFramesPerChunk = Infinity) {
  const weighted = config.chunkSize === void 0 ? buildWeightedChunkSlices(
    frameWeights,
    chunkCount,
    MIN_CHUNK_SIZE,
    Math.min(config.targetChunkFrames ?? MAX_CHUNK_SIZE, MAX_CHUNK_SIZE, maxFramesPerChunk)
  ) : null;
  return withChunkCaptureCost(
    weighted ?? buildChunkSlices(frameWeights.length, chunkCount, effectiveChunkSize),
    frameWeights
  );
}
async function readFontSnapshotSha() {
  const module = await import("@hyperframes/core/fonts/embedded-data");
  const data = module.EMBEDDED_FONT_DATA;
  if (!data || typeof data !== "object") {
    throw new Error(
      "[plan] EMBEDDED_FONT_DATA missing from @hyperframes/core/fonts/embedded-data. Was `bun run build:fonts` run?"
    );
  }
  const dataObj = data;
  const fingerprint = {};
  for (const key of Object.keys(dataObj).sort()) {
    const value = dataObj[key];
    fingerprint[key] = typeof value === "string" ? value.length : JSON.stringify(value ?? null).length;
  }
  return sha256Hex(canonicalJsonStringify(fingerprint));
}
function buildLockedRenderConfig(input) {
  const { config, forceScreenshot, deviceScaleFactor, ffmpegVersion } = input;
  const { encoder, pixelFormat, preset } = resolveEncoderTriple(config);
  const locksVp9CpuUsed = encoder === "libvpx-vp9-software" ? { vp9CpuUsed: normalizeVp9CpuUsed(input.engineConfig.vp9CpuUsed) } : {};
  return {
    captureMode: forceScreenshot ? "screenshot" : "beginframe",
    forceScreenshot,
    deviceScaleFactor,
    useLayeredHdrComposite: false,
    browserGpuMode: "software",
    // Match `LOCKED_WARMUP_TICKS` in `frameCapture.ts` — kept as a literal so
    // a worker that ships a different value will trip `PLAN_HASH_MISMATCH`
    // (the locked config flows into planHash via the canonical JSON).
    warmupTicks: 60,
    encoder,
    quality: config.quality ?? "standard",
    ffmpegVersion,
    preset,
    crf: config.crf,
    bitrate: config.bitrate,
    maxBitrate: config.maxBitrate,
    bufferSize: config.bufferSize,
    keyframeIntervalFrames: config.keyframeIntervalSeconds === void 0 ? void 0 : keyframeIntervalToGopSize3({ num: config.fps, den: 1 }, config.keyframeIntervalSeconds),
    ...locksVp9CpuUsed,
    // GOP === chunkSize so every chunk's first frame is an IDR keyframe and
    // ffmpeg concat-copy round-trips losslessly.
    gopSize: input.effectiveChunkSize,
    closedGop: true,
    forceKeyframes: "n=0",
    pixelFormat,
    // Omitted for the default so existing 4444 plans keep their planHash.
    ...config.proresProfile && config.proresProfile !== "4444" ? { proresProfile: config.proresProfile } : {},
    chunkSize: input.effectiveChunkSize,
    chunkCount: input.chunkCount,
    runtimeEnv: input.runtimeEnv,
    variables: config.variables,
    pageMotionBlur: config.pageMotionBlur,
    ...input.chunksCarryAudio ? { chunksCarryAudio: true } : {},
    ...input.separateAudio ? { separateAudio: true } : {}
  };
}
function carriesChunkAudio(config, options) {
  return options.chunksCarryAudio === true && config.format === "mp4" && config.cfr !== true;
}
function resolveEncoderTriple(config) {
  if (config.format === "mp4") {
    return resolveMp4EncoderTriple(config.codec);
  }
  if (config.codec !== void 0) {
    throw new Error(
      `[plan] DistributedRenderConfig.codec is only valid for format="mp4"; received codec=${JSON.stringify(config.codec)} with format=${JSON.stringify(config.format)}. Omit codec for non-mp4 formats: mov is always ProRes 4444, webm is always libvpx-vp9, and png-sequence has no encoder.`
    );
  }
  return resolveNonMp4EncoderTriple(
    config.format,
    config.quality ?? "standard",
    config.proresProfile
  );
}
function resolveMp4EncoderTriple(codec) {
  const c = codec ?? "h264";
  if (c !== "h264" && c !== "h265") {
    throw new Error(
      `[plan] DistributedRenderConfig.codec must be "h264" or "h265" for format="mp4"; received ${JSON.stringify(c)}. Omit codec to default to h264.`
    );
  }
  if (c === "h265") {
    return { encoder: "libx265-software", pixelFormat: "yuv420p", preset: "medium" };
  }
  return { encoder: "libx264-software", pixelFormat: "yuv420p", preset: "medium" };
}
function resolveNonMp4EncoderTriple(format, quality, proresProfile) {
  if (format === "mov") {
    const { pixelFormat, preset } = getEncoderPreset4(quality, "mov", void 0, proresProfile);
    return { encoder: "prores-software", pixelFormat, preset };
  }
  if (format === "webm") {
    const enginePreset = getEncoderPreset4(quality, "webm");
    return {
      encoder: "libvpx-vp9-software",
      pixelFormat: enginePreset.pixelFormat,
      preset: enginePreset.preset
    };
  }
  return { encoder: "png-sequence", pixelFormat: "rgba", preset: "lossless" };
}
function resolveDistributedEngineConfig(config) {
  return {
    ...config.producerConfig ?? config.engineConfig ?? resolveConfig3(),
    browserGpuMode: "software",
    forceScreenshot: false,
    // Distributed rendering deliberately opts into deterministic BeginFrame
    // on Linux SwiftShader. Preserve the provenance bit consumed by the
    // engine's software-GPU screenshot clamp; assigning the boolean alone
    // loses the distinction between a default false and this explicit opt-out.
    forceScreenshotExplicitlyOptedOut: true
  };
}
function pathInside(root, path) {
  const rel = relative5(root, path);
  return rel === "" || rel.startsWith("..") || isAbsolute3(rel) ? null : rel;
}
function stableSourcePath(roots, srcPath) {
  for (const [root, prefix] of roots) {
    const rel = pathInside(root, srcPath);
    if (rel !== null) return [prefix, ...rel.split(sep2)].filter(Boolean).join("/");
  }
  return srcPath;
}
function createVideoSourceShipper(input) {
  const shipped = /* @__PURE__ */ new Map();
  return (srcPath) => {
    const known = shipped.get(srcPath);
    if (known) return known;
    const stagedRel = pathInside(input.workVideoFramesDir, srcPath);
    const current = stagedRel === null ? srcPath : join22(input.planDir, "video-frames", stagedRel);
    let result = null;
    for (const root of stagedRel === null ? [input.workCompiledDir, input.projectDir] : []) {
      const rel = pathInside(root, srcPath);
      if (rel !== null && (existsSync15(join22(input.planDir, "compiled", rel)) || input.isRemote(srcPath))) {
        result = ["compiled", ...rel.split(sep2)].join("/");
        break;
      }
    }
    if (result === null) {
      result = `video-sources/${shipped.size}${extname4(current)}`;
      const destination = join22(input.planDir, ...result.split("/"));
      mkdirSync10(join22(input.planDir, "video-sources"), { recursive: true });
      try {
        linkSync(current, destination);
      } catch {
        copyFileSync6(current, destination);
      }
    }
    shipped.set(srcPath, result);
    return result;
  };
}
function plansSeparateAudio(config, options) {
  return options.deferAudio === true && config.format !== "png-sequence" && config.cfr !== true;
}
async function compilePlanComposition(projectDir, config, planDir, options) {
  rejectUnsupportedDistributedFormat(config);
  validateNoGpuEncode({
    useGpu: false,
    browserGpuMode: "software"
  });
  if (!existsSync15(planDir)) mkdirSync10(planDir, { recursive: true });
  const log = config.logger ?? defaultLogger;
  const sizeLimitBytes = options.executionPlanSizeLimitBytes ?? config.planDirSizeLimitBytes ?? PLAN_DIR_SIZE_LIMIT_BYTES;
  const abortSignal = config.abortSignal;
  const assertNotAborted = () => {
    if (abortSignal?.aborted) {
      throw new Error("[plan] render_cancelled");
    }
  };
  const cfg = resolveDistributedEngineConfig(config);
  const job = buildSyntheticRenderJob({
    fps: { num: config.fps, den: 1 },
    quality: config.quality ?? "standard",
    format: config.format,
    crf: config.crf,
    bitrate: config.bitrate,
    videoFrameFormat: config.videoFrameFormat,
    outputResolution: config.outputResolution,
    outputResolutionAspectAgnostic: config.outputResolutionAspectAgnostic,
    // HDR is banned in distributed mode. force-sdr keeps the
    // extract / encoder paths off the HDR branches entirely.
    hdrMode: config.hdrMode ?? "force-sdr",
    strictness: config.strictness,
    entryFile: config.entryFile ?? "index.html",
    logger: config.logger,
    producerConfig: cfg,
    variables: config.variables
  });
  const entryFile = config.entryFile ?? "index.html";
  const htmlPath = join22(projectDir, entryFile);
  if (!existsSync15(htmlPath)) {
    throw new Error(`[plan] entry file not found: ${htmlPath}`);
  }
  const workDir = join22(planDir, ".plan-work");
  rmSync7(workDir, { recursive: true, force: true });
  mkdirSync10(workDir, { recursive: true });
  const compiledDir = join22(workDir, "compiled");
  mkdirSync10(compiledDir, { recursive: true });
  let stageStarted = Date.now();
  cpSync2(projectDir, compiledDir, {
    recursive: true,
    dereference: true,
    filter: (src) => {
      const rel = relative5(projectDir, src);
      if (rel === "" || rel.startsWith("..")) return true;
      const firstSegment = rel.split(sep2, 1)[0];
      return firstSegment === void 0 || !PLAN_PROJECT_DIR_SKIP_SEGMENTS.has(firstSegment);
    }
  });
  logPlanStage(log, "copy", stageStarted);
  const finalCompiledDir = join22(planDir, "compiled");
  const needsAlpha = outputNeedsAlpha(config.format);
  const remoteFiles = Object.entries(options.remoteFiles ?? {});
  const remoteLocalPath = (rel) => join22(projectDir, ...rel.split("/"));
  for (const [, file] of remoteFiles) {
    declareContentAddressedUrl(file.url, file.sha256);
    if (file.probeFactsUrl) declareProbeFactsUrl(file.url, file.probeFactsUrl);
  }
  const urlByAbsentLocalPath = new Map(
    remoteFiles.map(([rel, file]) => [remoteLocalPath(rel), file.url])
  );
  const localPathByUrl = new Map(
    remoteFiles.map(([rel, file]) => [file.url, remoteLocalPath(rel)])
  );
  const audioSidecarUrlByLocalPath = new Map(
    remoteFiles.flatMap(
      ([rel, file]) => file.audioSidecarUrl ? [[remoteLocalPath(rel), file.audioSidecarUrl]] : []
    )
  );
  stageStarted = Date.now();
  const compileResult = await runCompileStage({
    urlByAbsentLocalPath,
    projectDir,
    workDir,
    htmlPath,
    entryFile,
    job,
    cfg,
    needsAlpha,
    log,
    assertNotAborted,
    abortSignal,
    // Distributed renders fail closed on font-fetch errors so the planDir
    // is content-addressed against deterministic fonts only.
    failClosedFontFetch: config.failClosedFontFetch !== false,
    // Distributed renders must not capture host-specific system fonts —
    // the Lambda/worker filesystem won't have the same fonts installed.
    allowSystemFontCapture: false,
    variables: config.variables,
    pageMotionBlur: job.config.pageMotionBlur
  });
  logPlanStage(log, "compile", stageStarted);
  let compiled = compileResult.compiled;
  const composition = compileResult.composition;
  const { deviceScaleFactor } = compileResult;
  let forceScreenshot = compileResult.forceScreenshot;
  if (cfg.lowMemoryMode) forceScreenshot = true;
  const { width, height } = composition;
  if (config.rejectOnSystemFonts !== false) {
    validateNoSystemFonts(compiled.html);
  }
  stageStarted = Date.now();
  const probeResult = await runProbeStage({
    projectDir,
    workDir,
    job,
    cfg,
    forceScreenshot,
    log,
    assertNotAborted,
    abortSignal,
    compiled,
    composition,
    width,
    height,
    needsAlpha,
    deviceScaleFactor,
    subTimelineWaitMemo: {}
  });
  logPlanStage(log, "probe", stageStarted);
  compiled = probeResult.compiled;
  job.duration = probeResult.duration;
  job.totalFrames = probeResult.totalFrames;
  const totalFrames = probeResult.totalFrames;
  validateDistributedDuration({
    duration: probeResult.duration,
    totalFrames,
    fps: fpsToNumber9(job.config.fps)
  });
  if (probeResult.fileServer) closeFileServerSafely(probeResult.fileServer, "plan", log);
  if (probeResult.probeSession) {
    try {
      const { closeCaptureSession: closeCaptureSession11 } = await import("@hyperframes/engine");
      await closeCaptureSession11(probeResult.probeSession);
    } catch (err) {
      log.warn("[plan] probe session close failed", {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  return {
    projectDir,
    log,
    sizeLimitBytes,
    abortSignal,
    assertNotAborted,
    cfg,
    job,
    workDir,
    compiledDir,
    finalCompiledDir,
    remoteFiles,
    urlByAbsentLocalPath,
    audioSidecarUrlByLocalPath,
    localPathByUrl,
    compileResult,
    compiled,
    composition,
    deviceScaleFactor,
    forceScreenshot,
    width,
    height,
    totalFrames
  };
}
function mixPlanAudio(c, compiledDir) {
  return runAudioStage({
    projectDir: c.projectDir,
    workDir: c.workDir,
    compiledDir,
    urlByAbsentLocalPath: c.urlByAbsentLocalPath,
    audioSidecarUrlByLocalPath: c.audioSidecarUrlByLocalPath,
    totalFrames: c.totalFrames,
    fps: c.job.config.fps,
    ffmpegProcessTimeout: c.cfg.ffmpegProcessTimeout,
    audioGain: c.cfg.audioGain,
    audios: c.composition.audios,
    masterFxChain: c.composition.masterFxChain,
    abortSignal: c.abortSignal,
    assertNotAborted: c.assertNotAborted,
    log: c.log
  });
}
async function extractPlanVideos(c, deferRangeExtraction) {
  const extractResult = await runExtractVideosStage({
    projectDir: c.projectDir,
    compiledDir: c.compiledDir,
    job: c.job,
    cfg: c.cfg,
    composition: c.composition,
    abortSignal: c.abortSignal,
    assertNotAborted: c.assertNotAborted,
    materializeSymlinks: true,
    deferRangeExtraction,
    urlByAbsentLocalPath: c.urlByAbsentLocalPath
  });
  if (extractResult.failureToEnforce) throw extractResult.failureToEnforce;
  if (extractResult.extractionResult) {
    assertVideoExtractionSucceeded(extractResult.extractionResult);
    c.log.info("[plan] extract phases", { ...extractResult.extractionResult.phaseBreakdown });
  }
  return extractResult;
}
async function buildLocalExecutionPlan(projectDir, config, executionPlanDir, options = {}) {
  const planDir = executionPlanDir;
  const c = await compilePlanComposition(projectDir, config, planDir, options);
  const {
    log,
    sizeLimitBytes,
    cfg,
    job,
    workDir,
    compiledDir,
    finalCompiledDir,
    remoteFiles,
    urlByAbsentLocalPath,
    localPathByUrl,
    compileResult,
    compiled,
    composition,
    deviceScaleFactor,
    forceScreenshot,
    width,
    height,
    totalFrames
  } = c;
  const megapixels = compileResult.outputWidth * compileResult.outputHeight / 1e6;
  let maxParallel = resolveMaxParallelChunks(config, totalFrames, megapixels, log);
  const measureFrameCost = chunkSizingUsesFrameCost(config) && planNeedsFrameCostMeasurement(compiled.html);
  assertPlanSizeWithinLimit({
    rootDir: compiledDir,
    rootKind: "compiled",
    limitBytes: sizeLimitBytes,
    observedAt: "pre-extract",
    log
  });
  let stageStarted = Date.now();
  const extractResult = await extractPlanVideos(c, options.deferVideoExtraction);
  logPlanStage(log, "extract", stageStarted);
  const stagedVideoFrames = join22(compiledDir, "__hyperframes_video_frames");
  const videoFramesDst = join22(planDir, "video-frames");
  if (existsSync15(videoFramesDst)) rmSync7(videoFramesDst, { recursive: true, force: true });
  const videoSourcesDir = join22(planDir, "video-sources");
  rmSync7(videoSourcesDir, { recursive: true, force: true });
  if (existsSync15(stagedVideoFrames)) {
    renameWithRetry7(stagedVideoFrames, videoFramesDst);
  } else {
    mkdirSync10(videoFramesDst, { recursive: true });
  }
  if (existsSync15(finalCompiledDir)) rmSync7(finalCompiledDir, { recursive: true, force: true });
  renameWithRetry7(compiledDir, finalCompiledDir);
  const shipVideoSource = createVideoSourceShipper({
    planDir,
    projectDir,
    workCompiledDir: compiledDir,
    workVideoFramesDir: stagedVideoFrames,
    isRemote: (srcPath) => urlByAbsentLocalPath.has(srcPath)
  });
  const sourceRoots = [
    [stagedVideoFrames, "video-frames"],
    [compiledDir, "compiled"],
    [projectDir, ""]
  ];
  const planVideosJson = buildPlanVideosJson({
    videos: composition.videos,
    compositionEnd: job.duration ?? Number.NaN,
    extracted: (extractResult.extractionResult?.extracted ?? []).map((ext) => {
      const sourcePath = localPathByUrl.get(ext.srcPath) ?? ext.srcPath;
      return {
        videoId: ext.videoId,
        srcPath: stableSourcePath(sourceRoots, sourcePath),
        framePattern: ext.framePattern,
        fps: ext.fps,
        totalFrames: ext.totalFrames,
        metadata: ext.metadata,
        ...ext.deferredRange ? { deferredRange: { ...ext.deferredRange, sourcePath: shipVideoSource(sourcePath) } } : {}
      };
    })
  });
  mkdirSync10(join22(planDir, "meta"), { recursive: true });
  writePlanRemoteFiles(
    planDir,
    remoteFiles.map(([rel, { sha256, sizeBytes }]) => ({
      path: `compiled/${rel}`,
      sha256,
      sizeBytes
    }))
  );
  writeFileSync7(
    join22(planDir, PLAN_VIDEOS_META_RELATIVE_PATH),
    JSON.stringify(planVideosJson, null, 2),
    "utf-8"
  );
  const digests = options.digests ?? /* @__PURE__ */ new Map();
  const separateAudio = plansSeparateAudio(config, options);
  const chunksCarryAudio = !separateAudio && carriesChunkAudio(config, options);
  const frameWeights = planFrameWeights({
    videos: planVideosJson.videos,
    extracted: planVideosJson.extracted,
    totalFrames,
    fps: config.fps,
    width,
    height
  });
  stageStarted = Date.now();
  const [audioOutcome, overlapOutcome, frameCostOutcome] = await Promise.allSettled([
    separateAudio ? null : mixPlanAudio(c, finalCompiledDir).finally(() => logPlanStage(log, "audio", stageStarted)),
    (async () => {
      for (const dir of [finalCompiledDir, videoFramesDst, videoSourcesDir]) {
        await prehashPlanFiles(dir, digests);
      }
      logPlanStage(log, "prehash", stageStarted);
      if (options.whileAudioMixes) {
        const prepublishStarted = Date.now();
        await options.whileAudioMixes();
        logPlanStage(log, "prepublish", prepublishStarted);
      }
    })(),
    measureFrameCost ? measurePlanSecondsPerFrame({
      planDir,
      workDir,
      html: compiled.html,
      planVideos: planVideosJson,
      totalFrames,
      fps: config.fps,
      width,
      height,
      format: config.format,
      quality: config.quality ?? "standard",
      deviceScaleFactor,
      variables: config.variables,
      cfg: { ...cfg, forceScreenshot, forceScreenshotExplicitlyOptedOut: !forceScreenshot },
      log
    }).finally(() => logPlanStage(log, "frame-cost", stageStarted)) : void 0
  ]);
  if (audioOutcome.status === "rejected") throw audioOutcome.reason;
  if (overlapOutcome.status === "rejected") throw overlapOutcome.reason;
  if (frameCostOutcome.status === "rejected") throw frameCostOutcome.reason;
  if (frameCostOutcome.value !== void 0) {
    log.info("[plan] measured frame cost", { secondsPerFrame: frameCostOutcome.value });
    maxParallel = resolveMaxParallelChunks(
      config,
      totalFrames,
      megapixels,
      log,
      frameCostOutcome.value
    );
  }
  const { chunkCount, effectiveChunkSize } = resolveChunkPlan(
    totalFrames,
    config.chunkSize,
    maxParallel,
    config.targetChunkFrames
  );
  const chunks = buildPlanChunkSlices(
    frameWeights,
    config,
    chunkCount,
    effectiveChunkSize,
    chunkSizingUsesFrameCost(config) && config.workerTimeoutSeconds !== void 0 ? framesWithinWorkerTimeout(
      config.workerTimeoutSeconds,
      estimateFrameSeconds(megapixels, frameCostOutcome.value)
    ) : void 0
  );
  const audioResult = audioOutcome.value;
  if (audioResult?.audioError) {
    applyDistributedAudioWarningPolicy(job, audioResult.audioError, audioResult.audioFailures, log);
  }
  const planAudioPath = join22(planDir, PLAN_AUDIO_RELATIVE_PATH);
  if (audioResult?.hasAudio && existsSync15(audioResult.audioOutputPath)) {
    renameWithRetry7(audioResult.audioOutputPath, planAudioPath);
  }
  if (chunksCarryAudio && existsSync15(planAudioPath)) {
    if (options.sliceChunkAudio) {
      stageStarted = Date.now();
      await writeChunkAudioSlices({
        audioPath: planAudioPath,
        planDir,
        chunks,
        fps: { num: config.fps, den: 1 }
      });
      logPlanStage(log, "audio-slices", stageStarted);
    }
  }
  const ffmpegVersion = await readFfmpegVersion();
  const producerVersion = readProducerVersion();
  const fontSnapshotSha = await readFontSnapshotSha();
  const runtimeEnv = snapshotRuntimeEnv();
  const lockedConfig = buildLockedRenderConfig({
    config,
    forceScreenshot,
    deviceScaleFactor,
    ffmpegVersion,
    engineConfig: cfg,
    effectiveChunkSize,
    chunkCount,
    runtimeEnv,
    chunksCarryAudio,
    separateAudio
  });
  const compositionJson = {
    durationSeconds: job.duration ?? 0,
    width,
    height,
    fps: job.config.fps,
    videoCount: composition.videos.length,
    audioCount: composition.audios.length,
    imageCount: composition.images.length
  };
  const dimensions = {
    fpsNum: config.fps,
    fpsDen: 1,
    width,
    height,
    format: config.format
  };
  try {
    rmSync7(workDir, { recursive: true, force: true });
  } catch (err) {
    log.warn("[plan] failed to remove temp work dir", {
      workDir,
      error: err instanceof Error ? err.message : String(err)
    });
  }
  removeFreezeOwnedPlanFiles(planDir);
  assertPlanSizeWithinLimit({
    rootDir: planDir,
    rootKind: "plan",
    limitBytes: sizeLimitBytes,
    observedAt: "pre-freeze",
    log
  });
  stageStarted = Date.now();
  const freezeResult = await freezePlan({
    planDir,
    composition: compositionJson,
    encoder: lockedConfig,
    chunks,
    dimensions,
    producerVersion,
    fontSnapshotSha,
    durationSeconds: job.duration ?? 0,
    totalFrames,
    hasAudio: audioResult?.hasAudio ?? false,
    digests
  });
  logPlanStage(log, "freeze", stageStarted);
  const planHash = freezeResult.planHash;
  assertPlanSizeWithinLimit({
    rootDir: planDir,
    rootKind: "plan",
    limitBytes: sizeLimitBytes,
    observedAt: "post-freeze",
    log
  });
  return {
    executionPlanDir: planDir,
    executionPlanHash: planHash,
    chunkCount,
    totalFrames,
    fps: config.fps,
    width,
    height,
    format: config.format,
    ffmpegVersion,
    producerVersion
  };
}
async function buildPlanAudio(projectDir, config, workRoot, outputPath, options = {}) {
  const c = await compilePlanComposition(projectDir, config, workRoot, {
    ...options,
    executionPlanSizeLimitBytes: Number.MAX_SAFE_INTEGER
  });
  try {
    let stageStarted = Date.now();
    await appendVideoAudioFromProbe(c);
    logPlanStage(c.log, "extract", stageStarted);
    stageStarted = Date.now();
    const mixed = await mixPlanAudio(c, c.compiledDir);
    logPlanStage(c.log, "audio", stageStarted);
    if (mixed.audioError) {
      applyDistributedAudioWarningPolicy(c.job, mixed.audioError, mixed.audioFailures, c.log);
    }
    if (!mixed.hasAudio || !existsSync15(mixed.audioOutputPath)) return { hasAudio: false };
    renameWithRetry7(mixed.audioOutputPath, outputPath);
    return { hasAudio: true };
  } finally {
    rmSync7(c.workDir, { recursive: true, force: true });
  }
}
async function plan(projectDir, config, planDir, options = {}) {
  const executionPlan = await buildLocalExecutionPlan(projectDir, config, planDir, options);
  return {
    planDir: executionPlan.executionPlanDir,
    planProtocol: PLAN_PROTOCOL_V1,
    planHash: executionPlan.executionPlanHash,
    chunkCount: executionPlan.chunkCount,
    totalFrames: executionPlan.totalFrames,
    fps: executionPlan.fps,
    width: executionPlan.width,
    height: executionPlan.height,
    format: executionPlan.format,
    ffmpegVersion: executionPlan.ffmpegVersion,
    producerVersion: executionPlan.producerVersion
  };
}

// src/services/distributed/planV2.ts
import {
  copyFileSync as copyFileSync8,
  existsSync as existsSync17,
  lstatSync as lstatSync2,
  mkdirSync as mkdirSync12,
  mkdtempSync as mkdtempSync4,
  readFileSync as readFileSync10,
  readdirSync as readdirSync7,
  rmSync as rmSync9,
  statSync as statSync7,
  writeFileSync as writeFileSync9
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname as dirname12, isAbsolute as isAbsolute4, join as join25, relative as relative6, resolve as resolve9, sep as sep3 } from "node:path";
import { DISTRIBUTED_FPS, isDistributedFps } from "@hyperframes/core";
import { createFrameLookupTable as createFrameLookupTable4, renameWithRetry as renameWithRetry9 } from "@hyperframes/engine";

// src/services/distributed/planV2Publisher.ts
import {
  copyFileSync as copyFileSync7,
  existsSync as existsSync16,
  linkSync as linkSync2,
  mkdirSync as mkdirSync11,
  mkdtempSync as mkdtempSync3,
  rmSync as rmSync8,
  statSync as statSync6,
  writeFileSync as writeFileSync8
} from "node:fs";
import { renameWithRetry as renameWithRetry8 } from "@hyperframes/engine";
import { dirname as dirname11, join as join24 } from "node:path";

// src/services/distributed/planV2Errors.ts
var PLAN_V2_INTEGRITY_UNRECOVERABLE = "PLAN_V2_INTEGRITY_UNRECOVERABLE";
var PlanV2IntegrityError = class extends Error {
  // Public adapters inspect this typed code even though OSS producer does not.
  // fallow-ignore-next-line unused-class-member
  code = PLAN_V2_INTEGRITY_UNRECOVERABLE;
  constructor(message) {
    super(`[planV2] ${message}`);
    this.name = "PlanV2IntegrityError";
  }
};

// src/services/distributed/planV2Layout.ts
import { join as join23 } from "node:path";
var SHA256_PATTERN = /^[0-9a-f]{64}$/;
function assertPlanV2Sha256(value, field) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new PlanV2IntegrityError(`${field} must be a lowercase sha256 digest`);
  }
  return value;
}
function planV2BlobPath(root, sha256) {
  const digest = assertPlanV2Sha256(sha256, "artifact sha256");
  return join23(root, "artifacts", "sha256", digest.slice(0, 2), digest);
}

// src/services/distributed/planV2Publisher.ts
function canFallbackToCopy(error) {
  if (!(error instanceof Error) || !("code" in error)) return false;
  const code = error.code;
  return code === "EXDEV" || code === "EPERM" || code === "EACCES" || code === "ENOTSUP";
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function manifestDigests(manifestBytes) {
  let value;
  try {
    value = JSON.parse(manifestBytes);
  } catch {
    throw new PlanV2IntegrityError("manifest publisher received invalid JSON");
  }
  if (!isRecord2(value) || !Array.isArray(value.artifacts)) {
    throw new PlanV2IntegrityError("manifest publisher requires an artifacts array");
  }
  return value.artifacts.map((artifact, index) => {
    if (!isRecord2(artifact)) {
      throw new PlanV2IntegrityError(`manifest artifacts[${index}] must be an object`);
    }
    return assertPlanV2Sha256(artifact.sha256, `manifest artifacts[${index}].sha256`);
  });
}
var LocalPlanV2ArtifactPublisher = class {
  destinationDir;
  temporaryDir;
  #linkFile;
  #committed = false;
  constructor(destinationDir, options = {}) {
    if (existsSync16(destinationDir)) {
      throw new PlanV2IntegrityError(`output directory already exists: ${destinationDir}`);
    }
    this.destinationDir = destinationDir;
    this.#linkFile = options.linkFile ?? linkSync2;
    mkdirSync11(dirname11(destinationDir), { recursive: true });
    this.temporaryDir = mkdtempSync3(join24(dirname11(destinationDir), ".plan-v2-publish-"));
  }
  async putBlob(blob) {
    const digest = assertPlanV2Sha256(blob.sha256, "published blob sha256");
    const sourceSize = statSync6(blob.sourcePath).size;
    if (sourceSize !== blob.sizeBytes) {
      throw new PlanV2IntegrityError(
        `published blob size changed for ${digest}: expected ${blob.sizeBytes}, got ${sourceSize}`
      );
    }
    const destinationPath = planV2BlobPath(this.temporaryDir, digest);
    if (existsSync16(destinationPath)) return;
    mkdirSync11(dirname11(destinationPath), { recursive: true });
    const stagingDir = mkdtempSync3(join24(dirname11(destinationPath), ".plan-v2-blob-"));
    const temporaryPath = join24(stagingDir, "blob");
    try {
      try {
        this.#linkFile(blob.sourcePath, temporaryPath);
      } catch (error) {
        if (!canFallbackToCopy(error)) throw error;
        copyFileSync7(blob.sourcePath, temporaryPath);
      }
      renameWithRetry8(temporaryPath, destinationPath);
    } finally {
      rmSync8(stagingDir, { recursive: true, force: true });
    }
  }
  async commitManifest(manifestBytes) {
    for (const digest of new Set(manifestDigests(manifestBytes))) {
      if (!existsSync16(planV2BlobPath(this.temporaryDir, digest))) {
        throw new PlanV2IntegrityError(
          `cannot commit manifest before referenced blob is durable: ${digest}`
        );
      }
    }
    writeFileSync8(join24(this.temporaryDir, "plan.json"), manifestBytes, "utf-8");
    renameWithRetry8(this.temporaryDir, this.destinationDir);
    this.#committed = true;
  }
  async abort() {
    if (!this.#committed) {
      rmSync8(this.temporaryDir, { recursive: true, force: true });
    }
  }
};

// src/services/distributed/planV2.ts
var PLAN_V2_HASH_PREFIX = "hyperframes-plan-manifest-hash-v2\0";
var EXTRACTION_CACHE_COMPLETE_SENTINEL = ".hf-complete";
var PLAN_V2_MATERIALIZATION_MARKER = ".hyperframes-plan-v2.json";
function isRecord3(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
function isNonNegativeIntegerArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "number" && Number.isInteger(item) && item >= 0);
}
function readJsonFile(path, label) {
  const contents = readFileSync10(path, "utf-8");
  try {
    const parsed = JSON.parse(contents);
    return parsed;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new PlanV2IntegrityError(`${label} is not readable JSON: ${detail}`);
  }
}
function assertSafeRelativePath(path) {
  const normalized = path.split(/[\\/]+/);
  if (path.length === 0 || isAbsolute4(path) || normalized.some((part) => part === "" || part === "." || part === "..")) {
    throw new PlanV2IntegrityError(`unsafe artifact path: ${JSON.stringify(path)}`);
  }
}
function listFiles(root) {
  const files = [];
  const rootResolved = resolve9(root);
  function walk(dir) {
    for (const entry of readdirSync7(dir, { withFileTypes: true })) {
      const absolutePath = join25(dir, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        files.push({
          path: relative6(rootResolved, absolutePath).split(sep3).join("/"),
          absolutePath
        });
      } else {
        throw new PlanV2IntegrityError(
          `unsupported filesystem entry (symlinks and special files are not allowed): ${absolutePath}`
        );
      }
    }
  }
  walk(rootResolved);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
function assertValidExtractionCacheCompleteSentinel(path) {
  const sentinel = lstatSync2(path);
  if (!sentinel.isFile() || sentinel.size !== 0) {
    throw new PlanV2IntegrityError(
      `${EXTRACTION_CACHE_COMPLETE_SENTINEL} must be a zero-byte regular file`
    );
  }
}
function validateExtractionCacheCompleteSentinels(executionPlanDir) {
  const videoRoot = join25(executionPlanDir, "video-frames");
  if (!existsSync17(videoRoot)) return;
  for (const videoEntry of readdirSync7(videoRoot, { withFileTypes: true })) {
    if (!videoEntry.isDirectory()) continue;
    const videoDir = join25(videoRoot, videoEntry.name);
    if (readdirSync7(videoDir).includes(EXTRACTION_CACHE_COMPLETE_SENTINEL)) {
      const sentinelPath = join25(videoDir, EXTRACTION_CACHE_COMPLETE_SENTINEL);
      assertValidExtractionCacheCompleteSentinel(sentinelPath);
    }
  }
}
function isExtractionCacheCompleteSentinelPath(path) {
  const segments = path.split("/");
  return segments.length === 3 && segments[0] === "video-frames" && segments[1] !== "" && segments[2] === EXTRACTION_CACHE_COMPLETE_SENTINEL;
}
function resolveExtractedVideoOutputDir(planDir, videoId) {
  const videoRoot = resolve9(planDir, "video-frames");
  const outputDir = resolve9(videoRoot, videoId);
  if (outputDir === videoRoot || !outputDir.startsWith(`${videoRoot}${sep3}`)) {
    throw new PlanV2IntegrityError(`unsafe extracted video id: ${JSON.stringify(videoId)}`);
  }
  return outputDir;
}
function artifactTargets(path, videoDependencies, chunkAudio) {
  if (isPlanAudioArtifactPath(path)) {
    if (chunkAudio === "none") return { chunks: [], assembler: true };
    return { chunks: chunkAudio === "whole" ? "all" : [], assembler: false };
  }
  const slice = chunkAudioSliceTarget(path);
  if (slice !== null) return { chunks: slice === "all" ? "all" : [slice], assembler: false };
  if (path === "plan.json" || path === "meta/chunks.json" || path === "meta/encoder.json") {
    return { chunks: "all", assembler: true };
  }
  if (path.startsWith("video-frames/") || path.startsWith("video-sources/") || path.startsWith("compiled/") && videoDependencies?.has(path)) {
    return {
      chunks: videoDependencies === null ? "all" : videoDependencies.get(path) ?? [],
      assembler: false
    };
  }
  if (path === "meta/composition.json" || path === "meta/videos.json" || path.startsWith("compiled/")) {
    return { chunks: "all", assembler: false };
  }
  return { chunks: "all", assembler: true };
}
function isPlanV2DeferredSourceArtifact(artifact) {
  return artifact.path.startsWith("compiled/") && artifact.chunks !== "all";
}
function listVideoFramePaths(executionPlanDir, videos) {
  return videos.extracted.map((video) => {
    const outputDir = resolveExtractedVideoOutputDir(executionPlanDir, video.videoId);
    if (video.deferredRange) {
      const framePaths2 = /* @__PURE__ */ new Map();
      for (let index = 0; index < video.totalFrames; index++) {
        framePaths2.set(index, join25(outputDir, String(index)));
      }
      return { ...video, outputDir, framePaths: framePaths2, ownedByLookup: false };
    }
    const frameNames = readdirSync7(outputDir).sort();
    const framePaths = /* @__PURE__ */ new Map();
    for (const frameName of frameNames) {
      if (frameName === EXTRACTION_CACHE_COMPLETE_SENTINEL) {
        assertValidExtractionCacheCompleteSentinel(join25(outputDir, frameName));
        continue;
      }
      const match = /(\d+)(?=\.[^.]+$)/.exec(frameName);
      if (!match) {
        throw new PlanV2IntegrityError(`cannot derive extracted frame index from ${frameName}`);
      }
      const oneBasedFrameNumber = Number(match[1]);
      if (!Number.isSafeInteger(oneBasedFrameNumber) || oneBasedFrameNumber < 1) {
        throw new PlanV2IntegrityError(
          `extracted frame filename must use a 1-based safe integer: ${frameName}`
        );
      }
      const frameIndex = oneBasedFrameNumber - 1;
      if (framePaths.has(frameIndex)) {
        throw new PlanV2IntegrityError(
          `duplicate extracted frame index ${frameIndex} in ${outputDir}`
        );
      }
      framePaths.set(frameIndex, join25(outputDir, frameName));
    }
    return {
      ...video,
      outputDir,
      framePaths,
      ownedByLookup: false
    };
  });
}
function parsePlanVideosJson2(value) {
  try {
    return parsePlanVideosJson(value);
  } catch (err) {
    if (err instanceof PlanVideosMetadataError) {
      throw new PlanV2IntegrityError(err.message);
    }
    throw err;
  }
}
function materializeExtractedVideoDirectories(planDir) {
  const videosPath = join25(planDir, PLAN_VIDEOS_META_RELATIVE_PATH);
  if (!existsSync17(videosPath)) return;
  const videos = parsePlanVideosJson2(readJsonFile(videosPath, PLAN_VIDEOS_META_RELATIVE_PATH));
  for (const video of videos.extracted) {
    mkdirSync12(resolveExtractedVideoOutputDir(planDir, video.videoId), { recursive: true });
  }
}
function parseChunkSlices(value) {
  if (!Array.isArray(value)) {
    throw new PlanV2IntegrityError("meta/chunks.json must be an array");
  }
  const indexes = /* @__PURE__ */ new Set();
  return value.map((chunk, position) => {
    const field = `meta/chunks.json[${position}]`;
    if (!isRecord3(chunk)) throw new PlanV2IntegrityError(`${field} must be an object`);
    const index = readNonNegativeInteger2(chunk.index, `${field}.index`);
    const startFrame = readNonNegativeInteger2(chunk.startFrame, `${field}.startFrame`);
    const endFrame = readPositiveInteger2(chunk.endFrame, `${field}.endFrame`);
    if (endFrame <= startFrame) {
      throw new PlanV2IntegrityError(`${field}.endFrame must be greater than startFrame`);
    }
    if (indexes.has(index)) {
      throw new PlanV2IntegrityError(`meta/chunks.json contains duplicate chunk index ${index}`);
    }
    indexes.add(index);
    if (chunk.captureCost === void 0) return { index, startFrame, endFrame };
    const captureCost = chunk.captureCost;
    if (typeof captureCost !== "number" || !Number.isFinite(captureCost) || captureCost <= 1) {
      throw new PlanV2IntegrityError(`${field}.captureCost must be a number above 1`);
    }
    return { index, startFrame, endFrame, captureCost };
  });
}
function buildVideoChunkDependencies(executionPlanDir, dimensions) {
  const videoRoot = join25(executionPlanDir, "video-frames");
  const hasExtractedFrames = existsSync17(videoRoot) && listFiles(videoRoot).length > 0;
  const videosPath = join25(executionPlanDir, PLAN_VIDEOS_META_RELATIVE_PATH);
  if (!existsSync17(videosPath)) {
    return hasExtractedFrames ? { mode: "full-source-pack", dependencies: null } : { mode: "exact-rendered-frames", dependencies: /* @__PURE__ */ new Map() };
  }
  const chunksPath = join25(executionPlanDir, "meta", "chunks.json");
  const videos = readJsonFile(videosPath, PLAN_VIDEOS_META_RELATIVE_PATH);
  const chunks = readJsonFile(chunksPath, "meta/chunks.json");
  const parsedVideos = parsePlanVideosJson2(videos);
  const parsedChunks = parseChunkSlices(chunks);
  const extracted = listVideoFramePaths(executionPlanDir, parsedVideos);
  const fpsNum = readPositiveInteger2(dimensions.fpsNum, "dimensions.fpsNum");
  const fpsDen = readPositiveInteger2(dimensions.fpsDen, "dimensions.fpsDen");
  const table = createFrameLookupTable4(
    parsedVideos.videos,
    extracted,
    resolveRenderFpsConfig({ num: fpsNum, den: fpsDen }).value
  );
  const deferredSources = new Map(
    parsedVideos.extracted.flatMap(
      (video) => video.deferredRange ? [[video.videoId, video.deferredRange.sourcePath]] : []
    )
  );
  const dependencies = collectChunkVideoDependencies({
    executionPlanDir,
    table,
    chunks: parsedChunks,
    fpsNum,
    fpsDen,
    deferredSources
  });
  return {
    mode: deferredSources.size > 0 ? "source-extract" : "exact-rendered-frames",
    dependencies
  };
}
function collectChunkVideoDependencies(input) {
  const mutable = /* @__PURE__ */ new Map();
  for (const chunk of input.chunks) {
    for (let frame = chunk.startFrame; frame < chunk.endFrame; frame++) {
      const globalTime = frame * input.fpsDen / input.fpsNum;
      for (const [videoId, payload] of input.table.getActiveFramePayloads(globalTime)) {
        const path = input.deferredSources.get(videoId) ?? relative6(resolve9(input.executionPlanDir), payload.framePath).split(sep3).join("/");
        assertSafeRelativePath(path);
        const indexes = mutable.get(path) ?? /* @__PURE__ */ new Set();
        indexes.add(chunk.index);
        mutable.set(path, indexes);
      }
    }
  }
  return new Map([...mutable].map(([path, indexes]) => [path, [...indexes].sort((a, b) => a - b)]));
}
function manifestPayload(manifest) {
  return manifest;
}
function computeManifestHash(manifest) {
  return sha256Hex(`${PLAN_V2_HASH_PREFIX}${canonicalJsonStringify(manifestPayload(manifest))}`);
}
function writeBlob(sourcePath, destinationPath) {
  if (existsSync17(destinationPath)) return;
  mkdirSync12(dirname12(destinationPath), { recursive: true });
  const temporaryDir = mkdtempSync4(join25(dirname12(destinationPath), ".plan-v2-blob-"));
  const temporaryPath = join25(temporaryDir, "blob");
  try {
    copyFileSync8(sourcePath, temporaryPath);
    renameWithRetry9(temporaryPath, destinationPath);
  } finally {
    rmSync9(temporaryDir, { recursive: true, force: true });
  }
}
function publishBlobFor(absolutePath, digests) {
  return {
    sourcePath: absolutePath,
    sha256: planFileSha256(absolutePath, digests),
    sizeBytes: statSync7(absolutePath).size
  };
}
async function putBlobs(publisher, blobs) {
  await putTasks(blobs.map((blob) => () => publisher.putBlob(blob)));
}
async function putTasks(tasks) {
  const uploadSlots = 32;
  let next = 0;
  let failure;
  const upload = async () => {
    while (!failure && next < tasks.length) {
      const task = tasks[next++];
      try {
        await task();
      } catch (reason) {
        failure ??= { reason };
      }
    }
  };
  await Promise.all(Array.from({ length: uploadSlots }, upload));
  if (failure) throw failure.reason;
}
function buildPlanV2Publication(executionPlanDir, digests) {
  const executionPlanPath = join25(executionPlanDir, "plan.json");
  if (!existsSync17(executionPlanPath)) {
    throw new PlanV2IntegrityError(`execution plan is missing plan.json: ${executionPlanPath}`);
  }
  const executionPlanValue = readJsonFile(executionPlanPath, "execution plan.json");
  if (!isRecord3(executionPlanValue)) {
    throw new PlanV2IntegrityError("execution plan.json must be an object");
  }
  const executionPlan = executionPlanValue;
  readPlanProtocolV1(executionPlan);
  const executionPlanHash = executionPlan.planHash;
  if (!isSha256(executionPlanHash)) {
    throw new PlanV2IntegrityError("execution plan.json.planHash must be a sha256 digest");
  }
  const recomputedExecutionPlanHash = recomputePlanHashFromPlanDir(executionPlanDir, digests);
  if (recomputedExecutionPlanHash !== executionPlanHash) {
    throw new PlanV2IntegrityError(
      `execution plan content fingerprint does not match plan.json.planHash: expected ${executionPlanHash}, recomputed ${recomputedExecutionPlanHash}`
    );
  }
  const artifacts = [];
  const blobs = /* @__PURE__ */ new Map();
  const dimensions = executionPlan.dimensions;
  if (!isRecord3(dimensions)) {
    throw new PlanV2IntegrityError("execution plan.json.dimensions must be an object");
  }
  validateExtractionCacheCompleteSentinels(executionPlanDir);
  const videoDependencyPlan = buildVideoChunkDependencies(executionPlanDir, dimensions);
  const encoder = readJsonFile(join25(executionPlanDir, "meta", "encoder.json"), "meta/encoder.json");
  const files = listFiles(executionPlanDir);
  const chunkAudio = !isRecord3(encoder) || encoder.chunksCarryAudio !== true ? "none" : files.some((file) => chunkAudioSliceTarget(file.path) !== null) ? "sliced" : "whole";
  for (const file of files) {
    if (isExtractionCacheCompleteSentinelPath(file.path)) continue;
    const targets = artifactTargets(file.path, videoDependencyPlan.dependencies, chunkAudio);
    if ((file.path.startsWith("video-frames/") || file.path.startsWith("video-sources/")) && targets.chunks !== "all" && targets.chunks.length === 0 && !targets.assembler) {
      continue;
    }
    const blob = publishBlobFor(file.absolutePath, digests);
    if (!blobs.has(blob.sha256)) blobs.set(blob.sha256, blob);
    artifacts.push({
      path: file.path,
      sha256: blob.sha256,
      sizeBytes: blob.sizeBytes,
      ...targets
    });
  }
  const storedBlobs = /* @__PURE__ */ new Map();
  for (const remote of readPlanRemoteFiles(executionPlanDir)) {
    const { sha256, sizeBytes } = remote;
    if (!blobs.has(sha256)) storedBlobs.set(sha256, { sha256, sizeBytes });
    artifacts.push({
      ...remote,
      ...artifactTargets(remote.path, videoDependencyPlan.dependencies, chunkAudio)
    });
  }
  const base = {
    protocol: PLAN_PROTOCOL_V2,
    // Retain the established manifest key byte-for-byte. It now acts as the
    // wire alias for the neutral local execution-plan hash.
    sourcePlanV1Hash: executionPlanHash,
    chunkCount: readPositiveInteger2(executionPlan.chunkCount, "chunkCount"),
    totalFrames: readPositiveInteger2(executionPlan.totalFrames, "totalFrames"),
    fps: readExecutionPlanFps(dimensions),
    width: readPositiveInteger2(dimensions.width, "dimensions.width"),
    height: readPositiveInteger2(dimensions.height, "dimensions.height"),
    format: readDistributedFormat(dimensions.format),
    ffmpegVersion: readString2(executionPlan.ffmpegVersion, "ffmpegVersion"),
    producerVersion: readString2(executionPlan.producerVersion, "producerVersion"),
    limitations: { videoDependencyMode: videoDependencyPlan.mode },
    artifacts
  };
  return {
    manifest: {
      ...base,
      planHash: computeManifestHash(base)
    },
    blobs: [...blobs.values()],
    storedBlobs: [...storedBlobs.values()]
  };
}
function createPlanV2FromExecutionPlan(executionPlanDir, planV2Dir) {
  if (existsSync17(planV2Dir)) {
    throw new PlanV2IntegrityError(`output directory already exists: ${planV2Dir}`);
  }
  const publication = buildPlanV2Publication(executionPlanDir);
  if (publication.storedBlobs.length > 0) {
    throw new PlanV2IntegrityError("a local plan v2 directory cannot reference remote files");
  }
  mkdirSync12(dirname12(planV2Dir), { recursive: true });
  const tempDir = mkdtempSync4(join25(dirname12(planV2Dir), ".plan-v2-build-"));
  try {
    for (const blob of publication.blobs) {
      writeBlob(blob.sourcePath, planV2BlobPath(tempDir, blob.sha256));
    }
    writeFileSync9(
      join25(tempDir, "plan.json"),
      canonicalJsonStringify(publication.manifest),
      "utf-8"
    );
    renameWithRetry9(tempDir, planV2Dir);
    return resultFromManifest(planV2Dir, publication.manifest);
  } catch (error) {
    rmSync9(tempDir, { recursive: true, force: true });
    throw error;
  }
}
function createPlanV2FromV1(executionPlanDir, planV2Dir) {
  return createPlanV2FromExecutionPlan(executionPlanDir, planV2Dir);
}
async function publishPlanV2FromExecutionPlan(executionPlanDir, publisher) {
  return publishExecutionPlan(executionPlanDir, publisher, {});
}
async function publishExecutionPlan(executionPlanDir, publisher, { digests, log = defaultLogger }) {
  try {
    let stageStarted = Date.now();
    const publication = buildPlanV2Publication(executionPlanDir, digests);
    logPlanStage(log, "publication", stageStarted);
    if (publication.storedBlobs.length > 0 && !publisher.referenceStoredBlob) {
      throw new PlanV2IntegrityError("this publisher cannot reference remote files");
    }
    stageStarted = Date.now();
    await putTasks([
      ...publication.blobs.map((blob) => () => publisher.putBlob(blob)),
      ...publication.storedBlobs.map((blob) => () => publisher.referenceStoredBlob(blob))
    ]);
    logPlanStage(log, "upload", stageStarted);
    stageStarted = Date.now();
    await publisher.commitManifest(canonicalJsonStringify(publication.manifest));
    logPlanStage(log, "manifest", stageStarted);
    return publication.manifest;
  } catch (error) {
    try {
      await publisher.abort();
    } catch {
    }
    throw error;
  }
}
async function publishPlanV2FromV1(executionPlanDir, publisher) {
  return publishPlanV2FromExecutionPlan(executionPlanDir, publisher);
}
async function planV2WithPublisher(projectDir, config, publisher, options = {}) {
  const stagingRoot = mkdtempSync4(join25(options.stagingParentDir ?? tmpdir(), ".execution-plan-"));
  const digests = /* @__PURE__ */ new Map();
  try {
    await buildLocalExecutionPlan(projectDir, config, stagingRoot, {
      executionPlanSizeLimitBytes: Number.MAX_SAFE_INTEGER,
      deferVideoExtraction: true,
      remoteFiles: options.remoteFiles,
      digests,
      // artifactTargets ships every compiled/ file to all chunks, so each is in the manifest.
      whileAudioMixes: () => putBlobs(
        publisher,
        listFiles(join25(stagingRoot, "compiled")).map(
          (file) => publishBlobFor(file.absolutePath, digests)
        )
      ),
      chunksCarryAudio: options.chunksCarryAudio,
      sliceChunkAudio: true,
      deferAudio: options.deferAudio
    });
    return await publishExecutionPlan(stagingRoot, publisher, { digests, log: config.logger });
  } catch (error) {
    try {
      await publisher.abort();
    } catch {
    }
    throw error;
  } finally {
    rmSync9(stagingRoot, { recursive: true, force: true });
  }
}
async function planV2(projectDir, config, planV2Dir) {
  if (existsSync17(planV2Dir)) {
    throw new PlanV2IntegrityError(`output directory already exists: ${planV2Dir}`);
  }
  const publisher = new LocalPlanV2ArtifactPublisher(planV2Dir);
  const manifest = await planV2WithPublisher(projectDir, config, publisher, {
    stagingParentDir: dirname12(planV2Dir)
  });
  return resultFromManifest(planV2Dir, manifest);
}
function resultFromManifest(planV2Dir, manifest) {
  return {
    planDir: planV2Dir,
    manifestPath: join25(planV2Dir, "plan.json"),
    planProtocol: PLAN_PROTOCOL_V2,
    planHash: manifest.planHash,
    sourcePlanV1Hash: getPlanV2ExecutionPlanHash(manifest),
    chunkCount: manifest.chunkCount,
    totalFrames: manifest.totalFrames,
    fps: manifest.fps,
    width: manifest.width,
    height: manifest.height,
    format: manifest.format,
    ffmpegVersion: manifest.ffmpegVersion,
    producerVersion: manifest.producerVersion,
    limitations: manifest.limitations
  };
}
function getPlanV2ExecutionPlanHash(plan2) {
  return plan2.sourcePlanV1Hash;
}
function readString2(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new PlanV2IntegrityError(`${field} must be a non-empty string`);
  }
  return value;
}
function readPositiveInteger2(value, field) {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new PlanV2IntegrityError(`${field} must be a positive integer`);
  }
  return value;
}
function readNonNegativeInteger2(value, field) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new PlanV2IntegrityError(`${field} must be a non-negative integer`);
  }
  return value;
}
function readSupportedFps(value) {
  if (!isDistributedFps(value)) {
    throw new PlanV2IntegrityError(
      `dimensions.fpsNum must be one of ${DISTRIBUTED_FPS.join(", ")}`
    );
  }
  return value;
}
function readExecutionPlanFps(dimensions) {
  const fpsDen = readPositiveInteger2(dimensions.fpsDen, "dimensions.fpsDen");
  if (fpsDen !== 1) {
    throw new PlanV2IntegrityError("dimensions.fpsDen must be 1 for plan v2");
  }
  return readSupportedFps(dimensions.fpsNum);
}
function readDistributedFormat(value) {
  if (value !== "mp4" && value !== "mov" && value !== "webm" && value !== "png-sequence") {
    throw new PlanV2IntegrityError("dimensions.format is unsupported");
  }
  return value;
}
function parseArtifact(value, index) {
  if (!isRecord3(value)) throw new PlanV2IntegrityError(`artifacts[${index}] must be an object`);
  const path = readString2(value.path, `artifacts[${index}].path`);
  assertSafeRelativePath(path);
  if (!isSha256(value.sha256)) {
    throw new PlanV2IntegrityError(`artifacts[${index}].sha256 must be a lowercase sha256`);
  }
  const sizeBytes = value.sizeBytes;
  if (typeof sizeBytes !== "number" || !Number.isInteger(sizeBytes) || sizeBytes < 0) {
    throw new PlanV2IntegrityError(`artifacts[${index}].sizeBytes must be a non-negative integer`);
  }
  let chunks;
  if (value.chunks === "all") {
    chunks = "all";
  } else if (isNonNegativeIntegerArray(value.chunks)) {
    chunks = value.chunks;
  } else {
    throw new PlanV2IntegrityError(`artifacts[${index}].chunks is invalid`);
  }
  if (typeof value.assembler !== "boolean") {
    throw new PlanV2IntegrityError(`artifacts[${index}].assembler must be boolean`);
  }
  return {
    path,
    sha256: value.sha256,
    sizeBytes,
    chunks,
    assembler: value.assembler
  };
}
function parsePlanV2Manifest(value) {
  if (!isRecord3(value)) throw new PlanV2IntegrityError("manifest must be an object");
  if (!isRecord3(value.protocol) || value.protocol.schemaVersion !== PLAN_PROTOCOL_V2.schemaVersion || value.protocol.artifactLayout !== PLAN_PROTOCOL_V2.artifactLayout || value.protocol.hashSchema !== PLAN_PROTOCOL_V2.hashSchema) {
    throw new PlanV2IntegrityError("manifest protocol is not the supported v2 descriptor");
  }
  if (!isSha256(value.planHash) || !isSha256(value.sourcePlanV1Hash)) {
    throw new PlanV2IntegrityError("manifest hashes must be lowercase sha256 digests");
  }
  if (!Array.isArray(value.artifacts)) throw new PlanV2IntegrityError("artifacts must be an array");
  const artifacts = value.artifacts.map(parseArtifact);
  const paths = /* @__PURE__ */ new Set();
  for (const artifact of artifacts) {
    if (paths.has(artifact.path))
      throw new PlanV2IntegrityError(`duplicate artifact path: ${artifact.path}`);
    paths.add(artifact.path);
  }
  if (!paths.has("plan.json"))
    throw new PlanV2IntegrityError("manifest must include the local execution plan.json artifact");
  if (!isRecord3(value.limitations) || value.limitations.videoDependencyMode !== "exact-rendered-frames" && value.limitations.videoDependencyMode !== "full-source-pack" && value.limitations.videoDependencyMode !== "source-extract") {
    throw new PlanV2IntegrityError("unsupported video dependency mode");
  }
  const parsed = {
    protocol: PLAN_PROTOCOL_V2,
    planHash: value.planHash,
    sourcePlanV1Hash: value.sourcePlanV1Hash,
    chunkCount: readPositiveInteger2(value.chunkCount, "chunkCount"),
    totalFrames: readPositiveInteger2(value.totalFrames, "totalFrames"),
    fps: readSupportedFps(value.fps),
    width: readPositiveInteger2(value.width, "width"),
    height: readPositiveInteger2(value.height, "height"),
    format: readDistributedFormat(value.format),
    ffmpegVersion: readString2(value.ffmpegVersion, "ffmpegVersion"),
    producerVersion: readString2(value.producerVersion, "producerVersion"),
    limitations: { videoDependencyMode: value.limitations.videoDependencyMode },
    artifacts
  };
  const { planHash: _planHash, ...payload } = parsed;
  const expectedHash = computeManifestHash(payload);
  if (expectedHash !== parsed.planHash) {
    throw new PlanV2IntegrityError("manifest integrity hash mismatch");
  }
  for (const [index, artifact] of parsed.artifacts.entries()) {
    if (artifact.chunks !== "all" && artifact.chunks.some((chunkIndex) => chunkIndex >= parsed.chunkCount)) {
      throw new PlanV2IntegrityError(`artifacts[${index}].chunks contains an out-of-range index`);
    }
  }
  return parsed;
}
function readPlanV2Manifest(planV2Dir) {
  const manifestPath = join25(planV2Dir, "plan.json");
  if (!existsSync17(manifestPath)) {
    throw new PlanV2IntegrityError(`missing v2 manifest: ${manifestPath}`);
  }
  const value = readJsonFile(manifestPath, "v2 manifest");
  return parsePlanV2Manifest(value);
}
function listPlanV2ArtifactsForTarget(manifest, target) {
  if (target.role === "chunk") {
    if (!Number.isInteger(target.chunkIndex) || target.chunkIndex < 0 || target.chunkIndex >= manifest.chunkCount) {
      throw new PlanV2IntegrityError(`chunkIndex ${String(target.chunkIndex)} is out of range`);
    }
    return manifest.artifacts.filter(
      (artifact) => artifact.chunks === "all" || artifact.chunks.some((chunkIndex) => chunkIndex === target.chunkIndex)
    );
  }
  return manifest.artifacts.filter((artifact) => artifact.assembler);
}
function verifyBlob(planV2Dir, artifact) {
  const sourcePath = planV2BlobPath(planV2Dir, artifact.sha256);
  if (!existsSync17(sourcePath)) {
    throw new PlanV2IntegrityError(`missing content-addressed artifact ${artifact.sha256}`);
  }
  const stats = statSync7(sourcePath);
  if (!stats.isFile() || stats.size !== artifact.sizeBytes) {
    throw new PlanV2IntegrityError(`artifact size mismatch for ${artifact.path}`);
  }
  if (sha256File(sourcePath) !== artifact.sha256) {
    throw new PlanV2IntegrityError(`artifact hash mismatch for ${artifact.path}`);
  }
  return sourcePath;
}
function materializePlanV2Target(planV2Dir, target, destinationDir, options = {}) {
  if (existsSync17(destinationDir)) {
    throw new PlanV2IntegrityError(`materialization destination already exists: ${destinationDir}`);
  }
  const manifest = readPlanV2Manifest(planV2Dir);
  const artifacts = listPlanV2ArtifactsForTarget(manifest, target);
  const remoteSources = options.remoteSources ?? {};
  assertRemoteSources(remoteSources, artifacts);
  const audioArtifact = artifacts.find((artifact) => isPlanAudioArtifactPath(artifact.path));
  const verified = artifacts.filter((artifact) => !Object.hasOwn(remoteSources, artifact.path)).map((artifact) => ({
    artifact,
    sourcePath: verifyBlob(planV2Dir, artifact)
  }));
  mkdirSync12(dirname12(destinationDir), { recursive: true });
  const tempDir = mkdtempSync4(join25(dirname12(destinationDir), ".plan-v2-materialize-"));
  try {
    for (const { artifact, sourcePath } of verified) {
      const destinationPath = join25(tempDir, ...artifact.path.split("/"));
      mkdirSync12(dirname12(destinationPath), { recursive: true });
      copyFileSync8(sourcePath, destinationPath);
    }
    if (target.role === "chunk") materializeExtractedVideoDirectories(tempDir);
    writeFileSync9(
      join25(tempDir, PLAN_V2_MATERIALIZATION_MARKER),
      canonicalJsonStringify({
        manifest,
        target,
        ...Object.keys(remoteSources).length > 0 ? { remoteSources } : {}
      }),
      "utf-8"
    );
    renameWithRetry9(tempDir, destinationDir);
  } catch (error) {
    rmSync9(tempDir, { recursive: true, force: true });
    throw error;
  }
  return {
    planDir: destinationDir,
    target,
    planHash: manifest.planHash,
    sourcePlanV1Hash: getPlanV2ExecutionPlanHash(manifest),
    artifactCount: artifacts.length,
    sizeBytes: artifacts.reduce((sum2, artifact) => sum2 + artifact.sizeBytes, 0),
    // Join the artifact's OWN name, not the current constant: a plan written
    // before the container change carries the legacy name, and materializing it
    // under the new one would point at a file that was never written.
    audioPath: target.role === "assembler" ? audioArtifact ? join25(destinationDir, audioArtifact.path) : null : null
  };
}
function assertRemoteSources(remoteSources, artifacts) {
  if (!isRecord3(remoteSources)) throw new PlanV2IntegrityError("remoteSources must be an object");
  for (const [path, url] of Object.entries(remoteSources)) {
    const artifact = artifacts.find((candidate) => candidate.path === path);
    if (!artifact || !isPlanV2DeferredSourceArtifact(artifact)) {
      throw new PlanV2IntegrityError(`remote source is not a selected deferred video: ${path}`);
    }
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
      throw new PlanV2IntegrityError(`remote source for ${path} must be an http(s) URL`);
    }
  }
}
function validatePlanV2MaterializedTarget(planDir, expectedTarget) {
  return readValidatedPlanV2Materialization(planDir, expectedTarget)?.manifest ?? null;
}
function readValidatedPlanV2Materialization(planDir, expectedTarget) {
  const markerPath = join25(planDir, PLAN_V2_MATERIALIZATION_MARKER);
  if (!existsSync17(markerPath)) return null;
  const marker = readJsonFile(markerPath, "materialization marker");
  if (!isRecord3(marker) || !isRecord3(marker.manifest) || !isRecord3(marker.target)) {
    throw new PlanV2IntegrityError("malformed materialization marker");
  }
  const target = marker.target;
  if (target.role !== expectedTarget.role || expectedTarget.role === "chunk" && target.chunkIndex !== expectedTarget.chunkIndex) {
    throw new PlanV2IntegrityError(
      "materialization target does not match requested execution role"
    );
  }
  const manifest = parsePlanV2Manifest(marker.manifest);
  const required = listPlanV2ArtifactsForTarget(manifest, expectedTarget);
  const remoteSources = marker.remoteSources ?? {};
  assertRemoteSources(remoteSources, required);
  for (const artifact of required) {
    if (Object.hasOwn(remoteSources, artifact.path)) continue;
    const path = join25(planDir, ...artifact.path.split("/"));
    if (!existsSync17(path) || statSync7(path).size !== artifact.sizeBytes) {
      throw new PlanV2IntegrityError(
        `materialized artifact missing or truncated: ${artifact.path}`
      );
    }
    if (sha256File(path) !== artifact.sha256) {
      throw new PlanV2IntegrityError(`materialized artifact hash mismatch: ${artifact.path}`);
    }
  }
  return { manifest, remoteSources };
}

// src/services/distributed/planV2Execution.ts
import { mkdtempSync as mkdtempSync6, rmSync as rmSync12 } from "node:fs";
import { tmpdir as tmpdir2 } from "node:os";
import { join as join28 } from "node:path";

// src/services/distributed/assemble.ts
import {
  cpSync as cpSync3,
  existsSync as existsSync18,
  mkdirSync as mkdirSync13,
  mkdtempSync as mkdtempSync5,
  readFileSync as readFileSync11,
  readdirSync as readdirSync8,
  rmSync as rmSync10,
  statSync as statSync8,
  writeFileSync as writeFileSync10
} from "node:fs";
import { dirname as dirname13, join as join26 } from "node:path";
import {
  appendRateCapArgs as appendRateCapArgs2,
  appendRenderProvenanceArgs as appendRenderProvenanceArgs2,
  describeFfmpegFailure as describeFfmpegFailure4,
  getEncoderPreset as getEncoderPreset5,
  MIXED_AUDIO_FILENAME as MIXED_AUDIO_FILENAME4,
  muxVideoWithAudio as muxVideoWithAudio2,
  resolveConfig as resolveConfig4,
  runFfmpeg as runFfmpeg8,
  appendSoftwareEncoderThreadsArg,
  renameWithRetry as renameWithRetry10
} from "@hyperframes/engine";
import { fpsToFfmpegArg as fpsToFfmpegArg3 } from "@hyperframes/core";
function cfrRateControlArgs(locked) {
  const preset = getEncoderPreset5(locked.quality ?? "standard", "mp4");
  if (locked.crf == null && locked.bitrate) {
    return ["-preset", preset.preset, "-b:v", locked.bitrate];
  }
  return ["-preset", preset.preset, "-crf", String(locked.crf ?? preset.quality)];
}
async function assemble(planDir, chunkOutputs, audioPath, outputPath, options) {
  const start = Date.now();
  const log = options?.logger ?? defaultLogger;
  const cfr = options?.cfr === true;
  const plan2 = readAssemblePlan(planDir, chunkOutputs);
  const chunkPaths = chunkOutputs.flat();
  if (plan2.dimensions.format === "png-sequence") {
    return mergePngFrameDirs(chunkPaths, outputPath, plan2.totalFrames, audioPath, start);
  }
  if (chunksAreStitchedMp4(planDir, cfr)) {
    const separateAudio = stitchesSeparateAudio(planDir) && audioPath !== null;
    await writeStitchedMp4(chunkPaths, outputPath, separateAudio ? audioPath : void 0);
    return {
      outputPath,
      durationMs: Date.now() - start,
      framesEncoded: plan2.totalFrames,
      fileSize: statSync8(outputPath).size
    };
  }
  const format = plan2.dimensions.format;
  const cfrEncoder = cfr ? readCfrEncoder(planDir, format) : null;
  if (!existsSync18(dirname13(outputPath))) {
    mkdirSync13(dirname13(outputPath), { recursive: true });
  }
  const workDir = mkdtempSync5(`${outputPath}.assemble-work-`);
  const fps = { num: plan2.dimensions.fpsNum, den: plan2.dimensions.fpsDen };
  const stageMs = {};
  const ctx = {
    workDir,
    format,
    fps,
    fpsArg: fpsToFfmpegArg3(fps),
    signal: options?.abortSignal,
    timeout: resolveConfig4().ffmpegProcessTimeout,
    log,
    timed: async (stage, run) => {
      const stageStart = Date.now();
      const result = await run();
      stageMs[stage] = Date.now() - stageStart;
      return result;
    }
  };
  try {
    const videoSources = cfrEncoder ? [await reencodeCfr(ctx, chunkPaths, cfrEncoder)] : chunkPaths;
    const finalPath = join26(workDir, `output.${format}`);
    const audio = audioPath !== null && existsSync18(audioPath) ? audioPath : null;
    await writeJoined(ctx, videoSources, audio, finalPath);
    renameWithRetry10(finalPath, outputPath);
    log.info("[assemble] stage timings", {
      ...stageMs,
      chunks: chunkPaths.length,
      totalMs: Date.now() - start
    });
  } finally {
    try {
      rmSync10(workDir, { recursive: true, force: true });
    } catch (err) {
      log.warn("[assemble] failed to remove work dir", {
        workDir,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  const fileSize = existsSync18(outputPath) ? statSync8(outputPath).size : 0;
  return {
    outputPath,
    durationMs: Date.now() - start,
    framesEncoded: plan2.totalFrames,
    fileSize
  };
}
function readAssemblePlan(planDir, chunkPaths) {
  const planJsonPath = join26(planDir, "plan.json");
  const chunksJsonPath = join26(planDir, "meta", "chunks.json");
  if (!existsSync18(planJsonPath)) {
    throw new Error(`[assemble] planDir missing plan.json: ${planJsonPath}`);
  }
  const plan2 = JSON.parse(readFileSync11(planJsonPath, "utf-8"));
  readPlanProtocolV1(plan2, DISTRIBUTED_RENDER_CAPABILITIES.roles.assembler);
  validatePlanV2MaterializedTarget(planDir, { role: "assembler" });
  if (!existsSync18(chunksJsonPath)) {
    throw new Error(`[assemble] planDir missing meta/chunks.json: ${chunksJsonPath}`);
  }
  const chunks = JSON.parse(readFileSync11(chunksJsonPath, "utf-8"));
  if (chunkPaths.length !== chunks.length) {
    throw new Error(
      `[assemble] chunkPaths length (${chunkPaths.length}) does not match chunks.json length (${chunks.length}). Adapters must pass one path per chunk, ordered by index.`
    );
  }
  for (const [index, entry] of chunkPaths.entries()) {
    if (typeof entry !== "string" && entry.length === 0) {
      throw new Error(`[assemble] chunk ${index} has an empty list of parts`);
    }
  }
  for (const path of chunkPaths.flat()) {
    if (!existsSync18(path)) {
      throw new Error(`[assemble] chunk path does not exist: ${path}`);
    }
  }
  return plan2;
}
function videoInputArgs(ctx, videoSources) {
  return videoSources.length === 1 ? ["-i", videoSources[0]] : concatDemuxerInput(videoSources, ctx.workDir, ctx.fpsArg);
}
function cfrEncodeArgs(inputArgs, encoder, fpsArg) {
  const args = [
    ...inputArgs,
    "-c:v",
    "libx264",
    ...cfrRateControlArgs(encoder),
    "-pix_fmt",
    "yuv420p",
    "-fps_mode",
    "cfr",
    "-r",
    fpsArg
  ];
  if (encoder.keyframeIntervalFrames !== void 0)
    args.push("-g", String(encoder.keyframeIntervalFrames));
  appendRateCapArgs2(args, encoder);
  appendSoftwareEncoderThreadsArg(args, "libx264");
  return args;
}
async function reencodeCfr(ctx, chunkPaths, encoder) {
  const cfrOutputPath = join26(ctx.workDir, `cfr.${ctx.format}`);
  const cfrArgs = cfrEncodeArgs(videoInputArgs(ctx, chunkPaths), encoder, ctx.fpsArg);
  appendRenderProvenanceArgs2(cfrArgs, cfrOutputPath);
  cfrArgs.push("-y", cfrOutputPath);
  await ctx.timed(
    "cfrMs",
    () => runAssembleFfmpeg(cfrArgs, "cfr re-encode", ctx.signal, ctx.timeout)
  );
  ctx.log.info("[assemble] cfr re-encode applied", {
    format: ctx.format,
    fpsNum: ctx.fps.num,
    fpsDen: ctx.fps.den
  });
  return cfrOutputPath;
}
async function writeJoined(ctx, videoSources, audioPath, finalPath) {
  if (audioPath === null) {
    const joinArgs = [...videoInputArgs(ctx, videoSources), "-c", "copy"];
    if (ctx.format === "mp4") joinArgs.push("-movflags", "+faststart");
    appendRenderProvenanceArgs2(joinArgs, finalPath);
    joinArgs.push("-r", ctx.fpsArg, "-y", finalPath);
    await ctx.timed(
      "joinMs",
      () => runAssembleFfmpeg(joinArgs, "concat-copy", ctx.signal, ctx.timeout)
    );
    return;
  }
  const paddedAudioPath = join26(ctx.workDir, "audio-padded.m4a");
  const padTrimResult = await ctx.timed(
    "audioMs",
    () => padOrTrimAudioToVideoFrameCount({
      videoPath: videoSources[0],
      probeVideoFrameInfo: () => probeJoinedFrameInfo(videoSources, ctx.fps, ctx.signal),
      audioPath,
      outputPath: paddedAudioPath,
      signal: ctx.signal,
      timeoutMs: ctx.timeout
    })
  );
  if (!padTrimResult.success) {
    throw encoderFailureError("[assemble] audio pad/trim failed", padTrimResult);
  }
  ctx.log.info("[assemble] audio normalized for mux", {
    operation: padTrimResult.operation,
    targetDurationSeconds: padTrimResult.targetDurationSeconds,
    sourceDurationSeconds: padTrimResult.sourceDurationSeconds
  });
  const muxResult = await ctx.timed(
    "joinMs",
    () => muxVideoWithAudio2(
      videoSources[0],
      paddedAudioPath,
      finalPath,
      ctx.signal,
      {
        audioCodec: "aac",
        ffmpegProcessTimeout: ctx.timeout,
        videoInputArgs: videoInputArgs(ctx, videoSources)
      },
      ctx.fps
    )
  );
  if (!muxResult.success) {
    throw encoderFailureError("[assemble] audio mux failed", muxResult);
  }
}
function concatDemuxerInput(chunkPaths, workDir, fpsArg) {
  const listPath = join26(workDir, "concat-list.txt");
  const body = chunkPaths.map((path) => `file '${path.replace(/'/g, "'\\''")}'`).join("\n");
  writeFileSync10(listPath, `${body}
`, "utf-8");
  return ["-r", fpsArg, "-f", "concat", "-safe", "0", "-i", listPath];
}
async function probeJoinedFrameInfo(videoPaths, fps, signal) {
  const infos = await Promise.all(
    videoPaths.map((path) => defaultProbeVideoFrameInfo(path, signal))
  );
  return {
    frameCount: infos.reduce((sum2, info) => sum2 + info.frameCount, 0),
    fpsNum: fps.num,
    fpsDen: fps.den
  };
}
async function runAssembleFfmpeg(args, step, signal, timeout) {
  const result = await runFfmpeg8(args, { signal, timeout });
  if (!result.success) {
    throw encoderFailureError(`[assemble] ffmpeg ${step} failed`, {
      error: describeFfmpegFailure4(result, timeout),
      failureReason: result.failureReason
    });
  }
}
function chunksAreStitchedMp4(planDir, cfr) {
  const { chunksCarryAudio, separateAudio } = lockedAudio(planDir);
  if (!chunksCarryAudio && !separateAudio) return false;
  if (planFormat(planDir) !== "mp4") return false;
  if (cfr) {
    throw new Error("[assemble] cfr=true cannot re-encode a plan whose mp4 chunks are stitched");
  }
  return true;
}
function stitchesSeparateAudio(planDir) {
  return lockedAudio(planDir).separateAudio === true;
}
function planFormat(planDir) {
  const plan2 = JSON.parse(readFileSync11(join26(planDir, "plan.json"), "utf-8"));
  return plan2.dimensions.format;
}
function lockedAudio(planDir) {
  const encoderJsonPath = join26(planDir, "meta", "encoder.json");
  if (!existsSync18(encoderJsonPath)) return {};
  return JSON.parse(readFileSync11(encoderJsonPath, "utf-8"));
}
function readCfrEncoder(planDir, format) {
  if (format !== "mp4") {
    throw new Error(
      `[assemble] cfr=true is only supported for format="mp4" (got "${format}"). Stream-copy paths for webm and mov already produce exact avg_frame_rate; cfr re-encode is not needed.`
    );
  }
  const encoderJsonPath = join26(planDir, "meta", "encoder.json");
  if (!existsSync18(encoderJsonPath)) {
    throw new Error(`[assemble] planDir missing meta/encoder.json: ${encoderJsonPath}`);
  }
  const encoderJson = JSON.parse(readFileSync11(encoderJsonPath, "utf-8"));
  if (encoderJson.encoder === "libx265-software") {
    throw new Error(
      `[assemble] cfr=true is not yet supported with codec: "h265". The cfr re-encode pass uses libx264 and would silently transcode the h265 chunks. Either disable cfr or render with codec: "h264".`
    );
  }
  return encoderJson;
}
function mergePngFrameDirs(chunkPaths, outputPath, totalFrames, audioPath, startTimeMs) {
  if (existsSync18(outputPath)) rmSync10(outputPath, { recursive: true, force: true });
  mkdirSync13(outputPath, { recursive: true });
  let globalIdx = 0;
  for (const chunkDir of chunkPaths) {
    if (!statSync8(chunkDir).isDirectory()) {
      throw new Error(
        `[assemble] png-sequence chunk must be a directory: ${chunkDir} (got a file)`
      );
    }
    const frames = readdirSync8(chunkDir).filter((name) => name.endsWith(".png")).sort();
    if (frames.length === 0) {
      throw new Error(`[assemble] png-sequence chunk has no frames: ${chunkDir}`);
    }
    for (const frame of frames) {
      const dst = join26(outputPath, formatExportFrameName(globalIdx, "png"));
      cpSync3(join26(chunkDir, frame), dst);
      globalIdx += 1;
    }
  }
  if (globalIdx !== totalFrames) {
    console.warn(
      `[assemble] png-sequence frame count mismatch: merged ${globalIdx} frames vs plan.totalFrames=${totalFrames}. Using on-disk count.`
    );
  }
  if (audioPath !== null && existsSync18(audioPath)) {
    const sidecar = join26(outputPath, MIXED_AUDIO_FILENAME4);
    cpSync3(audioPath, sidecar);
  }
  let fileSize = 0;
  for (const name of readdirSync8(outputPath)) {
    try {
      fileSize += statSync8(join26(outputPath, name)).size;
    } catch {
    }
  }
  return {
    outputPath,
    durationMs: Date.now() - startTimeMs,
    framesEncoded: globalIdx,
    fileSize
  };
}

// src/services/distributed/renderChunk.ts
import { randomBytes } from "node:crypto";
import { existsSync as existsSync19, mkdirSync as mkdirSync14, readFileSync as readFileSync12, readdirSync as readdirSync9, rmSync as rmSync11, writeFileSync as writeFileSync11 } from "node:fs";
import { cpus } from "node:os";
import { join as join27 } from "node:path";
import {
  assertSwiftShader,
  BROWSER_GPU_NOT_SOFTWARE as BROWSER_GPU_NOT_SOFTWARE4,
  calculateOptimalWorkers as calculateOptimalWorkers2,
  classifyCaptureFailure as classifyCaptureFailure4,
  closeCaptureSession as closeCaptureSession10,
  createCaptureSession as createCaptureSession10,
  createFrameLookupTable as createFrameLookupTable5,
  deriveBeginFrameProbeTimeTicks as deriveBeginFrameProbeTimeTicks2,
  getEncoderPreset as getEncoderPreset6,
  initializeSession as initializeSession10,
  measureVideoShownBoxes,
  probeBeginFrameLiveness as probeBeginFrameLiveness2,
  readWebGlVendorInfoFromCanvas,
  resolveConfig as resolveConfig5
} from "@hyperframes/engine";
import { readWebGlVendorInfoFromCanvas as readWebGlVendorInfoFromCanvas2 } from "@hyperframes/engine";
var LEGACY_DISTRIBUTED_VP9_CPU_USED = 2;
function validatePlanVideosForChunk(value) {
  try {
    return parsePlanVideosJson(value);
  } catch (err) {
    throw new RenderChunkValidationError(
      INVALID_VIDEO_METADATA,
      `[renderChunk] invalid meta/videos.json: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
function interleavesCapture(overlapping, options) {
  return overlapping && options?.interleaveCapture === true;
}
var MIN_FRAMES_PER_CHUNK_BROWSER = 20;
function resolveChunkCaptureWorkers(framesInChunk, machineSized, maxCaptureWorkers) {
  if (maxCaptureWorkers === void 0) return machineSized;
  const byFrames = Math.floor(framesInChunk / MIN_FRAMES_PER_CHUNK_BROWSER);
  return Math.max(machineSized, Math.floor(Math.min(maxCaptureWorkers, byFrames)));
}
function resolveChunkFrameRange(slice, chunkIndex, frameRange) {
  if (frameRange === void 0) return { startFrame: slice.startFrame, endFrame: slice.endFrame };
  const { startFrame, endFrame } = frameRange;
  if (!Number.isSafeInteger(startFrame) || !Number.isSafeInteger(endFrame) || startFrame < slice.startFrame || endFrame > slice.endFrame || endFrame <= startFrame) {
    throw new RenderChunkValidationError(
      CHUNK_FRAME_RANGE_INVALID,
      `[renderChunk] frameRange ${JSON.stringify(frameRange)} must be a non-empty integer range inside chunk ${chunkIndex}'s slice [${slice.startFrame}, ${slice.endFrame})`
    );
  }
  return { startFrame, endFrame };
}
var distributedCaptureSessionDependencies = {
  createCaptureSession: createCaptureSession10,
  assertSwiftShader,
  initializeSession: initializeSession10,
  closeCaptureSession: closeCaptureSession10,
  readWebGlVendorInfo: readWebGlVendorInfoFromCanvas
};
async function createVerifiedDistributedCaptureSession(serverUrl, framesDir, captureOptions, cfg, dependencies = distributedCaptureSessionDependencies) {
  const session = await dependencies.createCaptureSession(
    serverUrl,
    framesDir,
    captureOptions,
    null,
    cfg
  );
  try {
    await dependencies.assertSwiftShader(session.page, dependencies.readWebGlVendorInfo);
    await dependencies.initializeSession(session);
    return session;
  } catch (error) {
    await dependencies.closeCaptureSession(session).catch(() => {
    });
    throw error;
  }
}
function isCaptureMode(value) {
  return value === "beginframe" || value === "screenshot" || value === "drawelement";
}
var MixedCaptureModesError = class extends Error {
  constructor(modes) {
    super(`[renderChunk] capture workers reported inconsistent modes: ${modes.join(",")}`);
    this.modes = modes;
    this.name = "MixedCaptureModesError";
  }
  modes;
};
function observedChunkCaptureMode(perfs) {
  const modes = [...new Set(perfs.map((perf) => perf.captureMode))];
  if (modes.length > 1) throw new MixedCaptureModesError(modes);
  const [mode] = modes;
  if (!mode || !isCaptureMode(mode)) {
    throw new Error(`[renderChunk] capture workers reported an invalid mode: ${mode ?? "<none>"}`);
  }
  return mode;
}
var PROBE_SELECTED_SCREENSHOT = "[renderChunk] probe selected screenshot capture";
function shouldRetryChunkCaptureWithScreenshot(error) {
  const failure = classifyCaptureFailure4(error);
  if (failure.kind === "cancelled" || failure.kind === "memory_exhaustion") return false;
  return /HeadlessExperimental\.beginFrame/i.test(failure.message) || /beginFrame probe timeout/i.test(failure.message) || failure.message.includes(PROBE_SELECTED_SCREENSHOT) || /Another frame is pending|Frame still pending/i.test(failure.message);
}
async function runCaptureWithScreenshotFallback(input) {
  try {
    return await input.run(input.forceScreenshot);
  } catch (error) {
    if (input.forceScreenshot || await input.canRetry?.() === false) throw error;
    if (!shouldRetryChunkCaptureWithScreenshot(error)) throw error;
    input.onFallback?.(error);
    await input.resetForScreenshotRetry();
    return await input.run(true);
  }
}
async function beginFrameSessionNeedsScreenshotFallback(session, probe = probeBeginFrameLiveness2) {
  if (session.launchCaptureMode !== "beginframe") return false;
  const timeoutMs = Number(process.env.PRODUCER_BEGINFRAME_PROBE_TIMEOUT_MS) > 0 ? Number(process.env.PRODUCER_BEGINFRAME_PROBE_TIMEOUT_MS) : 3e4;
  const probeTick = deriveBeginFrameProbeTimeTicks2(
    session.beginFrameTimeTicks,
    session.beginFrameIntervalMs
  );
  return !await probe(session.page, timeoutMs, probeTick, session.beginFrameIntervalMs);
}
function hashChunkOutput(outputPath, kind) {
  if (kind === "file") return sha256Hex(readFileSync12(outputPath));
  const entries = readdirSync9(outputPath).filter((name) => /\.(png|jpg|jpeg)$/i.test(name)).sort();
  const lines = entries.map(
    (name) => `${name}\0${sha256Hex(readFileSync12(join27(outputPath, name)))}`
  );
  return sha256Hex(lines.join("\0"));
}
function resolvePresetForLockedEncoder(basePreset, lockedEncoder) {
  if (lockedEncoder === "libx265-software") {
    return { ...basePreset, codec: "h265" };
  }
  return basePreset;
}
function resolveLockedVp9CpuUsed(lockedEncoder) {
  if (lockedEncoder.encoder !== "libvpx-vp9-software") return void 0;
  return lockedEncoder.vp9CpuUsed ?? LEGACY_DISTRIBUTED_VP9_CPU_USED;
}
async function renderChunk(planDir, chunkIndex, outputChunkPath, options) {
  const start = Date.now();
  const log = defaultLogger;
  const planJsonPath = join27(planDir, "plan.json");
  const encoderJsonPath = join27(planDir, "meta", "encoder.json");
  const chunksJsonPath = join27(planDir, "meta", "chunks.json");
  if (!existsSync19(planJsonPath)) {
    throw new RenderChunkValidationError(
      MISSING_PLAN_ARTIFACT,
      `[renderChunk] planDir is missing required artifact: ${planJsonPath}`
    );
  }
  const plan2 = JSON.parse(readFileSync12(planJsonPath, "utf-8"));
  readPlanProtocolV1(plan2, DISTRIBUTED_RENDER_CAPABILITIES.roles.chunk);
  const planHashStarted = Date.now();
  const v2Materialization = readValidatedPlanV2Materialization(planDir, {
    role: "chunk",
    chunkIndex
  });
  const v2Manifest = v2Materialization?.manifest ?? null;
  const remoteSources = v2Materialization?.remoteSources ?? {};
  for (const required of [encoderJsonPath, chunksJsonPath]) {
    if (!existsSync19(required)) {
      throw new RenderChunkValidationError(
        MISSING_PLAN_ARTIFACT,
        `[renderChunk] planDir is missing required artifact: ${required}`
      );
    }
  }
  const encoder = JSON.parse(readFileSync12(encoderJsonPath, "utf-8"));
  const chunks = JSON.parse(readFileSync12(chunksJsonPath, "utf-8"));
  const videosJsonPath = join27(planDir, PLAN_VIDEOS_META_RELATIVE_PATH);
  let planVideos = null;
  if (existsSync19(videosJsonPath)) {
    try {
      planVideos = validatePlanVideosForChunk(JSON.parse(readFileSync12(videosJsonPath, "utf-8")));
    } catch (err) {
      if (err instanceof RenderChunkValidationError) throw err;
      throw new RenderChunkValidationError(
        INVALID_VIDEO_METADATA,
        `[renderChunk] failed to parse ${videosJsonPath}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  if (chunkIndex < 0 || chunkIndex >= chunks.length) {
    throw new RenderChunkValidationError(
      CHUNK_INDEX_OUT_OF_RANGE,
      `[renderChunk] chunkIndex ${chunkIndex} is out of range [0, ${chunks.length})`
    );
  }
  const slice = chunks[chunkIndex];
  if (slice === void 0) {
    throw new RenderChunkValidationError(CHUNK_INDEX_OUT_OF_RANGE, "[renderChunk] missing slice");
  }
  const sliceFrames = slice.endFrame - slice.startFrame;
  if (sliceFrames <= 0) {
    throw new RenderChunkValidationError(
      CHUNK_INDEX_OUT_OF_RANGE,
      `[renderChunk] chunk ${chunkIndex} has non-positive frame count: ${sliceFrames}`
    );
  }
  const range = resolveChunkFrameRange(slice, chunkIndex, options?.frameRange);
  const framesInChunk = range.endFrame - range.startFrame;
  const compiledDir = join27(planDir, "compiled");
  if (!existsSync19(compiledDir)) {
    throw new RenderChunkValidationError(
      MISSING_PLAN_ARTIFACT,
      `[renderChunk] planDir missing compiled/ directory: ${compiledDir}`
    );
  }
  const ffmpegVersion = await readFfmpegVersion();
  if (ffmpegVersion !== plan2.ffmpegVersion) {
    throw new RenderChunkValidationError(
      FFMPEG_VERSION_MISMATCH,
      `[renderChunk] ffmpeg version on this worker does not match planDir. planDir: ${JSON.stringify(plan2.ffmpegVersion)}; worker: ${JSON.stringify(ffmpegVersion)}. Distributed retries require byte-identical ffmpeg builds across workers. Re-plan from a worker matching this version, or run all renders on an image with the planDir's ffmpeg.`
    );
  }
  if (encoder.browserGpuMode !== "software") {
    throw new RenderChunkValidationError(
      BROWSER_GPU_NOT_SOFTWARE4,
      `[renderChunk] planDir requires browserGpuMode=software, got ${JSON.stringify(encoder.browserGpuMode)}.`
    );
  }
  const recomputedPlanHash = v2Manifest === null ? recomputePlanHashFromPlanDir(planDir) : plan2.planHash;
  const planHashMs = Date.now() - planHashStarted;
  if (recomputedPlanHash !== plan2.planHash) {
    throw new RenderChunkValidationError(
      PLAN_HASH_MISMATCH,
      `[renderChunk] planDir content fingerprint does not match plan.json.planHash. plan.json: ${plan2.planHash}; recomputed: ${recomputedPlanHash}. Likely a corrupted artifact (partial S3 download, manual tampering) or a planDir produced by an incompatible producer version. Re-plan and re-fan-out.`
    );
  }
  if (!encoder.runtimeEnv || typeof encoder.runtimeEnv !== "object") {
    throw new RenderChunkValidationError(
      MISSING_RUNTIME_ENV_SNAPSHOT,
      "[renderChunk] planDir is missing meta/encoder.json.runtimeEnv snapshot. Re-plan with the current producer."
    );
  }
  const envRestore = applyRuntimeEnvSnapshot(encoder.runtimeEnv);
  try {
    const job = buildSyntheticRenderJob({
      fps: { num: plan2.dimensions.fpsNum, den: plan2.dimensions.fpsDen },
      quality: encoder.quality,
      format: plan2.dimensions.format,
      crf: encoder.crf,
      bitrate: encoder.bitrate,
      hdrMode: "force-sdr",
      entryFile: "index.html"
    });
    job.totalFrames = framesInChunk;
    job.duration = framesInChunk * plan2.dimensions.fpsDen / plan2.dimensions.fpsNum;
    const cfg = {
      ...resolveConfig5(),
      browserGpuMode: "software",
      forceScreenshot: encoder.forceScreenshot,
      // `encoder.forceScreenshot=false` is a locked distributed-render
      // decision, not the engine default. Carry that explicit opt-out through
      // the software-GPU clamp so buildChromeArgs includes BeginFrameControl.
      forceScreenshotExplicitlyOptedOut: !encoder.forceScreenshot
    };
    const workDir = `${outputChunkPath}.work.${process.pid}.${randomBytes(4).toString("hex")}`;
    mkdirSync14(workDir, { recursive: true });
    const framesDir = join27(workDir, "captured-frames");
    mkdirSync14(framesDir, { recursive: true });
    const videoFramesDir = `${workDir}.video-frames`;
    const chunkFrameNumbers = Array.from({ length: framesInChunk }, (_, i) => range.startFrame + i);
    const chunkFps = { num: plan2.dimensions.fpsNum, den: plan2.dimensions.fpsDen };
    const deferredVideos = planVideos?.extracted.filter((video) => video.deferredRange) ?? [];
    const shownFrames = planVideos ? shownDeferredFrameIndexes(planVideos, chunkFrameNumbers, chunkFps) : /* @__PURE__ */ new Map();
    const remoteVideoIds = new Set(
      planVideos?.extracted.filter(
        (video) => video.deferredRange && Object.hasOwn(remoteSources, video.deferredRange.sourcePath)
      ).map((video) => video.videoId)
    );
    const fileServer = await createFileServer({
      projectDir: compiledDir,
      compiledDir,
      port: 0,
      preHeadScripts: [buildVirtualTimeShim({ seedRandomFromFrame: true })],
      // These dimensions are frozen by the controller from the render job, so
      // chunk runtime seek quantization stays on the same fps grid as capture.
      fps: { num: plan2.dimensions.fpsNum, den: plan2.dimensions.fpsDen }
    });
    const captureOptions = buildChunkCaptureOptions({
      dimensions: plan2.dimensions,
      encoder,
      videoCount: planVideos?.videos.length ?? 0,
      html: readFileSync12(join27(compiledDir, "index.html"), "utf-8"),
      // The plan ships a deferred source only to chunks that show it; don't wait on the rest.
      skipReadinessVideoIds: deferredVideos.filter(
        (video) => !shownFrames.get(video.videoId)?.size || remoteVideoIds.has(video.videoId)
      ).map((video) => video.videoId),
      videoMetadataHints: collectVideoMetadataHints(
        deferredVideos.filter((video) => remoteVideoIds.has(video.videoId))
      )
    });
    const captureFrames = effectiveChunkFrames(framesInChunk, slice.captureCost);
    const chunkWorkerCount = resolveChunkCaptureWorkers(
      captureFrames,
      calculateOptimalWorkers2(captureFrames, void 0, cfg),
      options?.maxCaptureWorkers
    );
    let session = null;
    let outputKind;
    let framesEncoded = 0;
    let sessionBootMs = 0;
    let videoExtractMs = 0;
    let captureStageMs = 0;
    let encodeStageMs = 0;
    let captureMode;
    const capturePerfs = [];
    const captureAttempts = [];
    let forceScreenshotForChunk = encoder.forceScreenshot;
    let shownBoxes;
    let extraction;
    const overlap = { current: null };
    try {
      const verifyInWorker = chunkWorkerCount > 1 && !forceScreenshotForChunk;
      let boxesMeasured;
      let boxesFailed;
      const boxesReady = new Promise((resolve10, reject) => {
        boxesMeasured = resolve10;
        boxesFailed = reject;
      });
      boxesReady.catch(() => {
      });
      const measureBoxes = async (page) => {
        shownBoxes = await measureVideoShownBoxes(
          page,
          [...shownFrames.keys()],
          chunkFrameNumbers.map((frame) => frame * chunkFps.den / chunkFps.num)
        );
        boxesMeasured();
      };
      if (chunkWorkerCount === 1) {
        const bootStarted = Date.now();
        session = await createVerifiedDistributedCaptureSession(
          fileServer.url,
          framesDir,
          captureOptions,
          cfg
        );
        sessionBootMs = Date.now() - bootStarted;
        await measureBoxes(session.page);
        const browserSelectedScreenshot = session.launchCaptureMode === "screenshot";
        const beginFrameStalled = !browserSelectedScreenshot && await beginFrameSessionNeedsScreenshotFallback(session);
        if (browserSelectedScreenshot) {
          forceScreenshotForChunk = true;
          log.warn(
            "[renderChunk] Browser capability probe selected screenshot capture for the entire chunk",
            { chunkIndex }
          );
        } else if (beginFrameStalled) {
          forceScreenshotForChunk = true;
          log.warn(
            "[renderChunk] BeginFrame liveness probe failed; using screenshot capture for the entire chunk",
            { chunkIndex }
          );
          await closeCaptureSession10(session).catch(() => {
          });
          session = null;
          const screenshotBootStarted = Date.now();
          const screenshotCfg = {
            ...cfg,
            forceScreenshot: true,
            forceScreenshotExplicitlyOptedOut: false
          };
          session = await createVerifiedDistributedCaptureSession(
            fileServer.url,
            framesDir,
            captureOptions,
            screenshotCfg
          );
          sessionBootMs += Date.now() - screenshotBootStarted;
        }
      } else if (!verifyInWorker) {
        boxesMeasured();
      }
      let verification;
      const verifyFirstWorker = (first) => verification ??= (async () => {
        sessionBootMs = Date.now() - verifyStarted;
        try {
          await measureBoxes(first.page);
          const selectedScreenshot = first.launchCaptureMode === "screenshot";
          if (selectedScreenshot || await beginFrameSessionNeedsScreenshotFallback(first)) {
            forceScreenshotForChunk = true;
            log.warn(
              selectedScreenshot ? "[renderChunk] Browser capability probe selected screenshot capture for the entire chunk" : "[renderChunk] BeginFrame liveness probe failed; using screenshot capture for the entire chunk",
              { chunkIndex }
            );
            throw new Error(PROBE_SELECTED_SCREENSHOT);
          }
        } catch (error) {
          if (!forceScreenshotForChunk) {
            verifyFailure = error;
            boxesFailed(error);
          }
          throw error;
        }
      })();
      let verifyStarted = 0;
      let verifyFailure;
      const deferredVideoFrames = planVideos ? boxesReady.then(() => {
        const extractStarted = Date.now();
        return extractDeferredVideoFramesForChunk({
          planDir,
          planVideos,
          frames: chunkFrameNumbers,
          fps: chunkFps,
          outputRoot: videoFramesDir,
          cfg,
          remoteSources,
          shownBoxes
        }).then((frames) => {
          videoExtractMs = Date.now() - extractStarted;
          return frames;
        });
      }) : boxesReady.then(() => []);
      extraction = deferredVideoFrames;
      deferredVideoFrames.catch(() => {
      });
      const videoFrameLookup = planVideos && planVideos.extracted.length > 0 ? deferredVideoFrames.then(
        (deferred) => createFrameLookupTable5(
          planVideos.videos,
          [
            ...rebuildExtractedFramesFromPlanDir(
              planDir,
              planVideos.extracted.filter((video) => !video.deferredRange),
              v2Manifest === null ? "dense-v1" : "sparse-v2"
            ),
            ...deferred
          ],
          resolveRenderFpsConfig(job.config.fps).value
        )
      ) : null;
      videoFrameLookup?.catch(() => {
      });
      const createChunkVideoFrameInjector = createChunkVideoFrameInjectorFactory(
        videoFrameLookup,
        frameCacheOptions(cfg, chunkWorkerCount)
      );
      const isPngSequence = plan2.dimensions.format === "png-sequence";
      outputKind = isPngSequence ? "frame-dir" : "file";
      const presetFormat = isPngSequence ? "mp4" : plan2.dimensions.format;
      const basePreset = getEncoderPreset6(
        job.config.quality,
        presetFormat,
        void 0,
        encoder.proresProfile
      );
      const preset = resolvePresetForLockedEncoder(basePreset, encoder.encoder);
      const effectiveQuality = encoder.crf ?? preset.quality;
      const effectiveBitrate = encoder.crf != null ? void 0 : encoder.bitrate;
      const videoOnlyPath = encoder.chunksCarryAudio ? `${outputChunkPath}.video.mp4` : outputChunkPath;
      if (isPngSequence) {
        if (!existsSync19(outputChunkPath)) mkdirSync14(outputChunkPath, { recursive: true });
      } else {
        const outDir = join27(outputChunkPath, "..");
        if (!existsSync19(outDir)) mkdirSync14(outDir, { recursive: true });
      }
      const encodeInput = {
        job,
        log,
        outputPath: videoOnlyPath,
        framesDir,
        videoOnlyPath,
        width: Math.round(plan2.dimensions.width * encoder.deviceScaleFactor),
        height: Math.round(plan2.dimensions.height * encoder.deviceScaleFactor),
        needsAlpha: plan2.dimensions.format !== "mp4",
        captureImageFormat: captureOptions.format ?? "jpeg",
        // The encoder writes video only; audio joins at assemble time or in the
        // chunk that carries audio. Suppressing `hasAudio` skips the png-sequence audio
        // sidecar AND the mp4 audio mux.
        hasAudio: false,
        isPngSequence,
        // `DistributedFormat` has no "gif" member — distributed chunks are
        // always video segments (gif renders in-process only).
        isGif: false,
        preset,
        effectiveQuality,
        effectiveBitrate,
        engineConfig: {
          ffmpegEncodeTimeout: cfg.ffmpegEncodeTimeout,
          vp9CpuUsed: resolveLockedVp9CpuUsed(encoder) ?? cfg.vp9CpuUsed
        },
        // Distributed chunks emit a single ffmpeg call per chunk; the
        // in-process per-chunk-within-chunk path would re-split our
        // already-chunked work.
        enableChunkedEncode: false,
        chunkedEncodeSize: framesInChunk,
        abortSignal: void 0,
        assertNotAborted: () => {
        },
        // GOP === framesInChunk + force-keyframe at frame 0 → the chunk's
        // first frame is an IDR keyframe and concat-copy at assemble time
        // round-trips losslessly.
        lockGopForChunkConcat: !isPngSequence,
        gopSize: chunkGopFrames(framesInChunk, encoder.keyframeIntervalFrames),
        maxBitrate: encoder.maxBitrate,
        bufferSize: encoder.bufferSize
      };
      const captureStarted = Date.now();
      captureMode = await runCaptureWithScreenshotFallback({
        forceScreenshot: forceScreenshotForChunk,
        canRetry: () => verifyFailure === void 0,
        // fallow-ignore-next-line complexity
        run: async (forceScreenshot) => {
          const captureCfg = cfg.forceScreenshot === forceScreenshot ? cfg : {
            ...cfg,
            forceScreenshot,
            forceScreenshotExplicitlyOptedOut: !forceScreenshot
          };
          if (chunkWorkerCount === 1 && session === null) {
            session = await createVerifiedDistributedCaptureSession(
              fileServer.url,
              framesDir,
              captureOptions,
              captureCfg
            );
          }
          const capturePlan = createCapturePlan({
            workerCount: chunkWorkerCount,
            forceScreenshot,
            useStreamingEncode: false,
            useLayeredComposite: false,
            usePageSideCompositing: false,
            hasHdrContent: false,
            needsAlpha: plan2.dimensions.format !== "mp4"
          });
          if (capturePlan.kind !== "sdr_disk") {
            throw new Error(`Distributed chunk requires sdr_disk plan; got ${capturePlan.kind}`);
          }
          const captureSession = session;
          session = null;
          verifyStarted = Date.now();
          overlap.current = canEncodeWhileCapturing(encodeInput, chunkWorkerCount, cpus().length) ? encodeWhileCapturing(encodeInput, framesInChunk) : null;
          await observeRenderStage(
            new RenderObservabilityRecorder({ pipelineStartMs: start, log }),
            "capture_chunk",
            { chunkIndex },
            (openAttempt) => runCaptureStage({
              fileServer,
              workDir,
              framesDir,
              job,
              totalFrames: framesInChunk,
              cfg: captureCfg,
              plan: capturePlan,
              log,
              probeSession: captureSession,
              captureAttempts,
              // This sink records each worker's effective capture mode so a
              // fallback remains observable to adapters and smoke tests.
              dedupPerfs: capturePerfs,
              buildCaptureOptions: () => captureOptions,
              createRenderVideoFrameInjector: createChunkVideoFrameInjector,
              abortSignal: void 0,
              assertNotAborted: () => {
              },
              frameRange: range,
              onFrameLanded: (frame) => overlap.current?.onFrameLanded(frame),
              interleaveFrames: interleavesCapture(overlap.current !== null, options),
              openAttempt,
              verifyFirstSession: forceScreenshot || !verifyInWorker ? void 0 : verifyFirstWorker
            }),
            { stall: frameStallRule(job, framesInChunk) }
          ).catch(async (captureError) => {
            await overlap.current?.abort();
            overlap.current = null;
            throw captureError;
          });
          return observedChunkCaptureMode(capturePerfs);
        },
        resetForScreenshotRetry: () => {
          rmSync11(workDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
          boxesMeasured();
          mkdirSync14(framesDir, { recursive: true });
          capturePerfs.length = 0;
          captureAttempts.length = 0;
          job.framesRendered = 0;
        },
        onFallback: (error) => {
          log.warn(
            "[renderChunk] BeginFrame capture failed; retrying the entire chunk once in screenshot mode",
            {
              chunkIndex,
              error: error instanceof Error ? error.message : String(error)
            }
          );
        }
      }).catch(async (captureError) => {
        if (verifyFailure !== void 0) throw verifyFailure;
        boxesFailed(captureError);
        await deferredVideoFrames;
        throw captureError;
      });
      await deferredVideoFrames;
      captureStageMs = Date.now() - captureStarted;
      applyRenderWarningPolicy(
        job,
        capturePerfs.flatMap((perf) => perf.warnings ?? []),
        log
      );
      framesEncoded = framesInChunk;
      const encodeStarted = Date.now();
      const overlapped = overlap.current;
      overlap.current = null;
      await (overlapped ? overlapped.finish() : runEncodeStage(encodeInput));
      if (encoder.chunksCarryAudio) {
        const audioScratchPath = `${outputChunkPath}.audio.m4a`;
        const audioChunks = options?.frameRange ? chunksWithSubRange(chunks, chunkIndex, range) : { chunks, index: chunkIndex };
        await muxChunkWithAudio({
          videoPath: videoOnlyPath,
          audioPath: chunkAudioSource(planDir, chunkIndex, audioScratchPath),
          outputPath: outputChunkPath,
          chunks: audioChunks.chunks,
          chunkIndex: audioChunks.index,
          fps: { num: plan2.dimensions.fpsNum, den: plan2.dimensions.fpsDen },
          timeoutMs: cfg.ffmpegProcessTimeout
        });
        rmSync11(videoOnlyPath, { force: true });
        rmSync11(audioScratchPath, { force: true });
      }
      encodeStageMs = Date.now() - encodeStarted;
    } finally {
      await overlap.current?.abort().catch(() => {
      });
      await extraction?.catch(() => {
      });
      if (session) {
        try {
          await closeCaptureSession10(session);
        } catch (err) {
          log.warn("[renderChunk] error closing capture session in finally", {
            error: err instanceof Error ? err.message : String(err)
          });
        }
      }
      closeFileServerSafely(fileServer, "renderChunk", log);
    }
    if (!captureMode) {
      throw new Error("[renderChunk] capture stage completed without reporting a capture mode");
    }
    const sha256 = hashChunkOutput(outputChunkPath, outputKind);
    const durationMs = Date.now() - start;
    const perfPath = `${outputChunkPath}.perf.json`;
    const perfPayload = {
      planHash: plan2.planHash,
      chunkIndex,
      startFrame: range.startFrame,
      endFrame: range.endFrame,
      framesEncoded,
      durationMs,
      planHashMs,
      sessionBootMs,
      captureStageMs,
      encodeStageMs,
      // Wall time of the chunk's own video frame extraction; it overlaps captureStageMs, so do not add them.
      videoExtractMs,
      workers: chunkWorkerCount,
      captureMode,
      // Device-pixel box each video's frames were extracted to cover; a video not listed kept full size.
      videoShownBoxes: Object.fromEntries(shownBoxes ?? []),
      sha256,
      outputKind,
      producerVersion: plan2.producerVersion,
      ffmpegVersion
    };
    writeFileSync11(perfPath, `${JSON.stringify(perfPayload, null, 2)}
`, "utf-8");
    try {
      rmSync11(workDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      rmSync11(videoFramesDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (err) {
      log.warn("[renderChunk] failed to remove work dir", {
        workDir,
        error: err instanceof Error ? err.message : String(err)
      });
    }
    return {
      outputPath: outputChunkPath,
      outputKind,
      framesEncoded,
      frameRange: range,
      sha256,
      durationMs,
      planHashMs,
      sessionBootMs,
      captureStageMs,
      encodeStageMs,
      workers: chunkWorkerCount,
      captureMode,
      perfPath
    };
  } finally {
    envRestore.restore();
  }
}

// src/services/distributed/planV2Execution.ts
async function renderChunkV2(planV2Dir, chunkIndex, outputChunkPath, options) {
  const workRoot = mkdtempSync6(join28(tmpdir2(), "hf-plan-v2-chunk-"));
  const materializedPlanDir = join28(workRoot, "plan");
  try {
    materializePlanV2Target(planV2Dir, { role: "chunk", chunkIndex }, materializedPlanDir);
    return await renderChunk(materializedPlanDir, chunkIndex, outputChunkPath, options);
  } finally {
    rmSync12(workRoot, { recursive: true, force: true });
  }
}
async function assembleV2(planV2Dir, chunkPaths, outputPath, options) {
  const workRoot = mkdtempSync6(join28(tmpdir2(), "hf-plan-v2-assembler-"));
  const materializedPlanDir = join28(workRoot, "plan");
  try {
    const materialized = materializePlanV2Target(
      planV2Dir,
      { role: "assembler" },
      materializedPlanDir
    );
    return await assemble(
      materializedPlanDir,
      chunkPaths,
      materialized.audioPath,
      outputPath,
      options
    );
  } finally {
    rmSync12(workRoot, { recursive: true, force: true });
  }
}

// src/services/distributed/renderConfigValidation.ts
import {
  VIDEO_FRAME_FORMATS,
  isVideoFrameFormat,
  validateEngineConfigSnapshot
} from "@hyperframes/engine";
import { DISTRIBUTED_FPS as DISTRIBUTED_FPS2, isDistributedFps as isDistributedFps2 } from "@hyperframes/core";
var InvalidConfigError = class extends Error {
  // Read via Error.prototype.toString; fallow can't see it.
  // fallow-ignore-next-line unused-class-member
  name = "InvalidConfigError";
  /** Dotted JSON-pointer-ish path to the offending field, e.g. `config.fps`. */
  field;
  constructor(field, message) {
    super(`[validateConfig] ${field}: ${message}`);
    this.field = field;
  }
};
var ALLOWED_FORMATS = [
  "mp4",
  "mov",
  "png-sequence",
  "webm"
];
var ALLOWED_CODECS = ["h264", "h265"];
var ALLOWED_QUALITIES = ["draft", "standard", "high"];
var ALLOWED_RUNTIME_CAPS = ["lambda", "temporal", "cloud-run-job", "k8s-job", "none"];
var ALLOWED_HDR_MODES = ["auto", "force-sdr"];
var MAX_DIMENSION = 7680;
var MIN_DIMENSION = 16;
function validateDistributedRenderConfig(config) {
  if (config === null || typeof config !== "object") {
    throw new InvalidConfigError("config", "must be an object");
  }
  if (!isDistributedFps2(config.fps)) {
    throw new InvalidConfigError(
      "config.fps",
      `must be one of ${DISTRIBUTED_FPS2.join(", ")}; got ${String(config.fps)}`
    );
  }
  validateIntDimension("config.width", config.width);
  validateIntDimension("config.height", config.height);
  if (config.pageMotionBlur !== void 0 && config.pageMotionBlur !== "off") {
    throw new InvalidConfigError("config.pageMotionBlur", 'must be "off" when provided');
  }
  if (!ALLOWED_FORMATS.includes(config.format)) {
    throw new InvalidConfigError(
      "config.format",
      `must be one of ${ALLOWED_FORMATS.join(", ")}; got ${String(config.format)}`
    );
  }
  if (config.codec !== void 0) {
    if (config.format !== "mp4") {
      throw new InvalidConfigError(
        "config.codec",
        `is only valid with format="mp4"; got format=${String(config.format)}`
      );
    }
    if (!ALLOWED_CODECS.includes(config.codec)) {
      throw new InvalidConfigError(
        "config.codec",
        `must be one of ${ALLOWED_CODECS.join(", ")}; got ${String(config.codec)}`
      );
    }
  }
  if (config.quality !== void 0 && !ALLOWED_QUALITIES.includes(config.quality)) {
    throw new InvalidConfigError(
      "config.quality",
      `must be one of ${ALLOWED_QUALITIES.join(", ")}; got ${String(config.quality)}`
    );
  }
  if (config.videoFrameFormat !== void 0 && !isVideoFrameFormat(config.videoFrameFormat)) {
    throw new InvalidConfigError(
      "config.videoFrameFormat",
      `must be one of ${VIDEO_FRAME_FORMATS.join(", ")}; got ${String(config.videoFrameFormat)}`
    );
  }
  if (config.crf !== void 0 && config.bitrate !== void 0) {
    throw new InvalidConfigError("config.crf", "is mutually exclusive with config.bitrate");
  }
  if (config.crf !== void 0 && (!Number.isInteger(config.crf) || config.crf < 0 || config.crf > 51)) {
    throw new InvalidConfigError("config.crf", `must be an integer in [0, 51]; got ${config.crf}`);
  }
  if (config.bitrate !== void 0 && !/^\d+(\.\d+)?[kKmM]?$/.test(config.bitrate)) {
    throw new InvalidConfigError(
      "config.bitrate",
      `must look like "10M" or "5000k"; got ${JSON.stringify(config.bitrate)}`
    );
  }
  try {
    validateDeliveryEncoderConfig({
      format: config.format,
      fps: { num: config.fps, den: 1 },
      keyframeIntervalSeconds: config.keyframeIntervalSeconds,
      maxBitrate: config.maxBitrate,
      bufferSize: config.bufferSize
    });
  } catch (error) {
    throw new InvalidConfigError(
      "config.maxBitrate",
      error instanceof Error ? error.message : String(error)
    );
  }
  try {
    validateDeliveryEncoderConfig({
      format: config.format,
      fps: { num: config.fps, den: 1 },
      proresProfile: config.proresProfile
    });
  } catch (error) {
    throw new InvalidConfigError(
      "config.proresProfile",
      error instanceof Error ? error.message : String(error)
    );
  }
  if (config.chunkSize !== void 0) {
    if (!Number.isInteger(config.chunkSize) || config.chunkSize < 1) {
      throw new InvalidConfigError(
        "config.chunkSize",
        `must be a positive integer; got ${config.chunkSize}`
      );
    }
    if (config.chunkSize > MAX_CHUNK_SIZE) {
      throw new InvalidConfigError(
        "config.chunkSize",
        `must be <= ${MAX_CHUNK_SIZE}; got ${config.chunkSize}`
      );
    }
  }
  if (config.maxParallelChunks !== void 0) {
    if (!Number.isInteger(config.maxParallelChunks) || config.maxParallelChunks < 1) {
      throw new InvalidConfigError(
        "config.maxParallelChunks",
        `must be a positive integer; got ${config.maxParallelChunks}`
      );
    }
    if (config.maxParallelChunks > MAX_PARALLEL_CHUNKS_CEILING) {
      throw new InvalidConfigError(
        "config.maxParallelChunks",
        `must be <= ${MAX_PARALLEL_CHUNKS_CEILING}; got ${config.maxParallelChunks}`
      );
    }
  }
  if (config.targetChunkFrames !== void 0) {
    if (!Number.isInteger(config.targetChunkFrames) || config.targetChunkFrames < 1) {
      throw new InvalidConfigError(
        "config.targetChunkFrames",
        `must be a positive integer; got ${config.targetChunkFrames}`
      );
    }
    if (config.targetChunkFrames > MAX_CHUNK_SIZE) {
      throw new InvalidConfigError(
        "config.targetChunkFrames",
        `must be <= ${MAX_CHUNK_SIZE}; got ${config.targetChunkFrames}`
      );
    }
  }
  for (const field of ["workerTimeoutSeconds", "workerConcurrency"]) {
    const value = config[field];
    if (value !== void 0 && (!Number.isInteger(value) || value < 1)) {
      throw new InvalidConfigError(`config.${field}`, `must be a positive integer; got ${value}`);
    }
  }
  if (config.runtimeCap !== void 0 && !ALLOWED_RUNTIME_CAPS.includes(config.runtimeCap)) {
    throw new InvalidConfigError(
      "config.runtimeCap",
      `must be one of ${ALLOWED_RUNTIME_CAPS.join(", ")}; got ${String(config.runtimeCap)}`
    );
  }
  if (config.hdrMode !== void 0 && !ALLOWED_HDR_MODES.includes(config.hdrMode)) {
    throw new InvalidConfigError(
      "config.hdrMode",
      `distributed mode supports only ${ALLOWED_HDR_MODES.join(", ")}; got ${String(config.hdrMode)}`
    );
  }
  if (config.variables !== void 0) {
    validateVariablesPayload(config.variables);
  }
  if (config.engineConfig !== void 0) {
    try {
      validateEngineConfigSnapshot(config.engineConfig);
    } catch (error) {
      throw new InvalidConfigError(
        "config.engineConfig",
        error instanceof Error ? error.message : "must be a valid engine config snapshot"
      );
    }
  }
  return config;
}
function validateVariablesPayload(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new InvalidConfigError(
      "config.variables",
      `must be a plain JSON object (got ${describeValue(value)})`
    );
  }
  validateJsonSafeValue(value, "config.variables");
}
function validateJsonSafeValue(value, field) {
  walkVariables(value, field, /* @__PURE__ */ new WeakSet());
}
var LEAF_REJECTIONS = {
  undefined: "undefined leaves are silently dropped by JSON.stringify. Use null if you mean an absent value",
  function: "functions are not JSON-serializable",
  symbol: "Symbols are not JSON-serializable",
  bigint: "BigInt values throw at JSON.stringify. Encode as a string if you need 64-bit integers"
};
function walkVariables(value, path, seen) {
  const t = typeof value;
  if (value === null || t === "string" || t === "boolean") return;
  if (t === "number") {
    if (!Number.isFinite(value)) {
      throw new InvalidConfigError(
        path,
        `non-finite numbers (NaN / Infinity) are not JSON-serializable; got ${String(value)}`
      );
    }
    return;
  }
  const leafReject = LEAF_REJECTIONS[t];
  if (leafReject !== void 0) {
    throw new InvalidConfigError(path, leafReject);
  }
  if (seen.has(value)) {
    throw new InvalidConfigError(
      path,
      "circular reference detected: JSON.stringify cannot serialize cycles"
    );
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkVariables(value[i], `${path}[${i}]`, seen);
    }
    return;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new InvalidConfigError(
      path,
      `non-plain objects are not supported (got ${describeValue(value)}); use a plain {\u2026} object`
    );
  }
  for (const key of Object.keys(value)) {
    walkVariables(value[key], `${path}.${key}`, seen);
  }
}
function describeValue(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value !== "object") return typeof value;
  const ctorName = value.constructor?.name ?? "Object";
  return ctorName === "Object" ? "object" : ctorName;
}
function validateIntDimension(field, value) {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new InvalidConfigError(field, `must be an integer; got ${String(value)}`);
  }
  if (value < MIN_DIMENSION || value > MAX_DIMENSION) {
    throw new InvalidConfigError(
      field,
      `must be in [${MIN_DIMENSION}, ${MAX_DIMENSION}]; got ${value}`
    );
  }
  if (value % 2 !== 0) {
    throw new InvalidConfigError(field, `must be even (yuv420p constraint); got ${value}`);
  }
}

// src/services/distributed/projectHash.ts
import { closeSync as closeSync5, openSync as openSync5, readdirSync as readdirSync10, readSync as readSync4, realpathSync as realpathSync2, statSync as statSync9 } from "node:fs";
import { createHash as createHash8 } from "node:crypto";
import { join as join29 } from "node:path";
var SITE_ID_SCHEME = "site-v2\0";
var READ_CHUNK_BYTES = 256 * 1024;
function listSiteFiles(projectDir) {
  const files = [];
  const ancestors = /* @__PURE__ */ new Set([realpathSync2(projectDir)]);
  function walk(dir, rel) {
    for (const name of readdirSync10(dir).sort()) {
      if (rel === "" && PLAN_PROJECT_DIR_SKIP_SEGMENTS.has(name)) continue;
      const full = join29(dir, name);
      const relPath = rel === "" ? name : `${rel}/${name}`;
      let stat;
      try {
        stat = statSync9(full);
      } catch (err) {
        throw new Error(`[listSiteFiles] cannot read ${relPath} (dangling symlink?)`, {
          cause: err
        });
      }
      if (stat.isFile()) {
        files.push(relPath);
      } else if (stat.isDirectory()) {
        const real = realpathSync2(full);
        if (ancestors.has(real)) continue;
        ancestors.add(real);
        walk(full, relPath);
        ancestors.delete(real);
      }
    }
  }
  walk(projectDir, "");
  return files;
}
function hashProjectDir(projectDir, files = listSiteFiles(projectDir)) {
  const hash = createHash8("sha256").update(SITE_ID_SCHEME);
  const chunk = Buffer.allocUnsafe(READ_CHUNK_BYTES);
  for (const rel of files) {
    hash.update(rel);
    hash.update("\0");
    const fd = openSync5(join29(projectDir, rel), "r");
    try {
      let read;
      while ((read = readSync4(fd, chunk, 0, chunk.length, null)) > 0) {
        hash.update(chunk.subarray(0, read));
      }
    } finally {
      closeSync5(fd);
    }
  }
  return hash.digest("hex").slice(0, 16);
}

// src/services/distributed/audioSidecar.ts
import { extractAudioMetadata as extractAudioMetadata4, runFfmpeg as runFfmpeg9 } from "@hyperframes/engine";
import { extname as extname5 } from "node:path";
var AUDIO_SIDECAR_MIN_BYTES = 32 * 1024 * 1024;
var AUDIO_SIDECAR_SOURCE_EXTENSIONS = /* @__PURE__ */ new Set([".mp4", ".mov", ".m4v"]);
function wantsAudioSidecar(path, sizeBytes) {
  return sizeBytes >= AUDIO_SIDECAR_MIN_BYTES && AUDIO_SIDECAR_SOURCE_EXTENSIONS.has(extname5(path).toLowerCase());
}
async function buildAudioSidecar(inputPath, outputPath, signal) {
  const audio = await extractAudioMetadata4(inputPath, { signal }).catch(() => null);
  if (!audio) return await ffmpegIsMissing(signal) ? "unavailable" : "none";
  if (audio.audioStreamCount !== 1 || (audio.audioStreamLeadSeconds ?? 0) > 0) return "none";
  const result = await runFfmpeg9(
    ["-v", "error", "-y", "-i", inputPath, "-map", "0:a:0", "-vn", "-c:a", "copy"].concat([
      "-movflags",
      "+faststart",
      "-f",
      "mp4",
      outputPath
    ]),
    { signal }
  );
  if (result.success) return "built";
  return isMissing(result) ? "unavailable" : "none";
}
var isMissing = (result) => result.error?.code === "ENOENT";
var ffmpegIsMissing = async (signal) => isMissing(await runFfmpeg9(["-version"], { signal }));

// src/services/distributed/probeFacts.ts
import { writeFileSync as writeFileSync12 } from "node:fs";
import { extname as extname6 } from "node:path";
import { buildProbeFactsText } from "@hyperframes/engine";
var PROBE_FACTS_EXTENSIONS = /* @__PURE__ */ new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv"]);
function wantsProbeFacts(path) {
  return PROBE_FACTS_EXTENSIONS.has(extname6(path).toLowerCase());
}
async function buildProbeFacts(inputPath, outputPath, signal) {
  try {
    writeFileSync12(outputPath, await buildProbeFactsText(inputPath, signal));
    return "built";
  } catch (error) {
    if (signal?.aborted) throw error;
    return /ffprobe not found/i.test(String(error.message)) ? "unavailable" : "none";
  }
}
export {
  AUDIO_SIDECAR_MIN_BYTES,
  CHUNK_EXCEEDS_WORKER_TIMEOUT,
  CHUNK_FRAME_RANGE_INVALID,
  CURRENT_PLAN_PROTOCOL,
  ChunkExceedsWorkerTimeoutError,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_MAX_PARALLEL_CHUNKS,
  DISTRIBUTED_DURATION_OUT_OF_RANGE,
  DISTRIBUTED_RENDER_CAPABILITIES,
  FFMPEG_VERSION_MISMATCH,
  FORMAT_NOT_SUPPORTED_IN_DISTRIBUTED,
  FormatNotSupportedInDistributedError,
  INVALID_VIDEO_METADATA,
  InvalidConfigError,
  LocalPlanV2ArtifactPublisher,
  MAX_DISTRIBUTED_DURATION_SECONDS,
  MIN_CHUNK_SIZE,
  PLAN_ARTIFACT_LAYOUT,
  PLAN_AUDIO_LEGACY_RELATIVE_PATH,
  PLAN_AUDIO_RELATIVE_PATH,
  PLAN_DIR_SIZE_LIMIT_BYTES,
  PLAN_HASH_MISMATCH,
  PLAN_HASH_SCHEMA,
  PLAN_PROJECT_DIR_SKIP_SEGMENTS,
  PLAN_PROTOCOL_UNSUPPORTED,
  PLAN_PROTOCOL_V1,
  PLAN_PROTOCOL_V2,
  PLAN_SCHEMA_VERSION,
  PLAN_TOO_LARGE,
  PLAN_V2_ARTIFACT_LAYOUT,
  PLAN_V2_HASH_SCHEMA,
  PLAN_V2_INTEGRITY_UNRECOVERABLE,
  PLAN_V2_MATERIALIZATION_MARKER,
  PLAN_V2_SCHEMA_VERSION,
  PlanProtocolUnsupportedError,
  PlanTooLargeError,
  PlanV2IntegrityError,
  PlanValidationError,
  PlanVideosMetadataError,
  RenderChunkValidationError,
  applyRuntimeEnvSnapshot,
  assemble,
  assembleV2,
  buildAudioSidecar,
  buildChunkSlices,
  buildPlanAudio,
  buildProbeFacts,
  buildStitchedHeader,
  chunksAreStitchedMp4,
  createPlanV2FromExecutionPlan,
  createPlanV2FromV1,
  getDistributedRenderCapabilities,
  getPlanV2ExecutionPlanHash,
  hashProjectDir,
  isPlanAudioArtifactPath,
  isPlanV2DeferredSourceArtifact,
  listPlanV2ArtifactsForTarget,
  listSiteFiles,
  materializePlanV2Target,
  measurePlanDirBytes,
  muxChunkWithAudio,
  plan,
  planV2,
  planV2WithPublisher,
  plansSeparateAudio,
  publishPlanV2FromExecutionPlan,
  publishPlanV2FromV1,
  readMp4Layout,
  readPlanProtocol,
  readPlanProtocolV1,
  readPlanV2Manifest,
  readWebGlVendorInfoFromCanvas2 as readWebGlVendorInfoFromCanvas,
  rejectUnsupportedDistributedFormat,
  renderChunk,
  renderChunkV2,
  resolveChunkPlan,
  resolvePlanAudioPath,
  stitchesSeparateAudio,
  validateDistributedRenderConfig,
  validatePlanV2MaterializedTarget,
  validateVariablesPayload,
  wantsAudioSidecar,
  wantsProbeFacts
};

import {
  PROXY_VARIANT_CONFIG,
  ffmpegHasHdrFilters
} from "./chunk-FUTDRYQK.js";
import {
  probeFirstFrameColour,
  probeMediaMetadata
} from "./chunk-X73QTST2.js";
import {
  mkdirWithinProject,
  realProjectRoot,
  realpath
} from "./chunk-QF7MFJJU.js";

// src/helpers/proxyTranscoder.ts
import { spawn } from "child_process";
import { randomUUID } from "crypto";
import {
  existsSync as existsSync4,
  mkdtempSync,
  renameSync,
  rmSync as rmSync2,
  unlinkSync as unlinkSync2,
  utimesSync,
  writeFileSync as writeFileSync2
} from "fs";
import { availableParallelism, tmpdir, totalmem } from "os";
import { basename as basename3, dirname as dirname3, extname as extname3, isAbsolute, join as join4, relative, resolve, sep } from "path";
import { hdrToSdrToneMapFilter } from "@hyperframes/core";
import { findFfBinary } from "@hyperframes/parsers/ff-binaries";
import { alphaDecoderFor } from "@hyperframes/parsers/media-alpha";

// src/helpers/proxyCache.ts
import { existsSync, readdirSync, statSync, unlinkSync } from "fs";
import { extname, join } from "path";
var DEFAULT_MAX_BYTES = 10 * 1024 * 1024 * 1024;
var DEFAULT_STALE_TEMP_MS = 60 * 60 * 1e3;
var DEFAULT_MIN_SWEEP_INTERVAL_MS = 5 * 60 * 1e3;
var PROXY_EXTENSIONS = new Set(
  Object.values(PROXY_VARIANT_CONFIG).map(({ extension }) => extension)
);
var TRANSCODER_PROXY_NAME = /^[0-9a-f]{64}\.\w+$/;
var TRANSCODER_TEMP_NAME = /^\.tmp-[0-9a-f-]{36}-(?:\.part-[0-9a-f]{64}-\d+|[0-9a-f]{64})\.\w+$/;
var TRANSCODER_PIECE_NAME = /^\.part-([0-9a-f]{64})-\d+(\.\w+)$/;
var STALE_PIECE_MS = 60 * 60 * 1e3;
var lastSweepAt = /* @__PURE__ */ new Map();
function positiveEnvNumber(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function proxyCacheCleanupDefaults() {
  return {
    maxBytes: positiveEnvNumber("HYPERFRAMES_PROXY_CACHE_MAX_BYTES", DEFAULT_MAX_BYTES),
    maxIdleMs: positiveEnvNumber("HYPERFRAMES_PROXY_CACHE_MAX_IDLE_DAYS", 30) * 24 * 60 * 60 * 1e3,
    staleTempMs: positiveEnvNumber("HYPERFRAMES_PROXY_CACHE_STALE_TEMP_MS", DEFAULT_STALE_TEMP_MS),
    minSweepIntervalMs: positiveEnvNumber(
      "HYPERFRAMES_PROXY_CACHE_SWEEP_INTERVAL_MS",
      DEFAULT_MIN_SWEEP_INTERVAL_MS
    )
  };
}
function shouldSkipSweep(cacheDir, now, minSweepIntervalMs) {
  const previousSweep = lastSweepAt.get(cacheDir);
  if (previousSweep !== void 0 && now - previousSweep < minSweepIntervalMs) return true;
  lastSweepAt.set(cacheDir, now);
  return false;
}
function isLeftoverName(name) {
  return TRANSCODER_TEMP_NAME.test(name) || TRANSCODER_PIECE_NAME.test(name);
}
function leftoverIsDead(cacheDir, name, modifiedAt, protectedPaths, now, staleTempMs) {
  const piece = TRANSCODER_PIECE_NAME.exec(name);
  if (!piece) return now - modifiedAt >= staleTempMs;
  const copyIsRunning = protectedPaths.has(join(cacheDir, `${piece[1]}${piece[2]}`));
  return !copyIsRunning && now - modifiedAt >= STALE_PIECE_MS;
}
function readCacheInventory(cacheDir, protectedPaths, now, staleTempMs) {
  const entries = [];
  const staleTemps = [];
  for (const dirent of readdirSync(cacheDir, { withFileTypes: true })) {
    if (!dirent.isFile()) continue;
    const path = join(cacheDir, dirent.name);
    const stat = statSync(path);
    const entry = {
      path,
      size: stat.size,
      modifiedAt: stat.mtimeMs,
      protected: protectedPaths.has(path)
    };
    if (isLeftoverName(dirent.name)) {
      if (leftoverIsDead(cacheDir, dirent.name, stat.mtimeMs, protectedPaths, now, staleTempMs)) {
        staleTemps.push(entry);
      }
    } else if (TRANSCODER_PROXY_NAME.test(dirent.name) && PROXY_EXTENSIONS.has(extname(dirent.name))) {
      entries.push(entry);
    }
  }
  const oldestFirst = (a, b) => a.modifiedAt - b.modifiedAt || a.path.localeCompare(b.path);
  entries.sort(oldestFirst);
  staleTemps.sort(oldestFirst);
  return { entries, staleTemps };
}
function evictCacheEntries(entries, staleTemps, now, maxIdleMs, maxBytes, dryRun) {
  const bytesBefore = entries.reduce((total, entry) => total + entry.size, 0);
  let bytesAfter = bytesBefore;
  const removed = [];
  const remove = (entry, countsTowardBudget) => {
    if (!dryRun) unlinkSync(entry.path);
    removed.push(entry.path);
    if (countsTowardBudget) bytesAfter -= entry.size;
  };
  for (const entry of staleTemps) remove(entry, false);
  const kept = [];
  for (const entry of entries) {
    if (!entry.protected && now - entry.modifiedAt >= maxIdleMs) remove(entry, true);
    else kept.push(entry);
  }
  for (const entry of kept) {
    if (bytesAfter <= maxBytes) break;
    if (!entry.protected && existsSync(entry.path)) remove(entry, true);
  }
  return { removed, bytesBefore, bytesAfter };
}
function cleanupProxyCache(cacheDir, options = {}) {
  const defaults = proxyCacheCleanupDefaults();
  const now = options.now ?? Date.now();
  const minSweepIntervalMs = options.minSweepIntervalMs ?? defaults.minSweepIntervalMs;
  if (shouldSkipSweep(cacheDir, now, minSweepIntervalMs)) {
    return { removed: [], bytesBefore: 0, bytesAfter: 0, skipped: true };
  }
  if (!existsSync(cacheDir)) {
    return { removed: [], bytesBefore: 0, bytesAfter: 0, skipped: false };
  }
  const maxBytes = options.maxBytes ?? defaults.maxBytes;
  const maxIdleMs = options.maxIdleMs ?? defaults.maxIdleMs;
  const staleTempMs = options.staleTempMs ?? defaults.staleTempMs;
  const protectedPaths = options.protectedPaths ?? /* @__PURE__ */ new Set();
  const { entries, staleTemps } = readCacheInventory(cacheDir, protectedPaths, now, staleTempMs);
  return {
    ...evictCacheEntries(entries, staleTemps, now, maxIdleMs, maxBytes, options.dryRun ?? false),
    skipped: false
  };
}

// src/helpers/proxyCacheKey.ts
import { createHash } from "crypto";
import {
  closeSync,
  createReadStream,
  existsSync as existsSync2,
  fstatSync,
  openSync,
  readFileSync,
  statSync as statSync2,
  writeFileSync
} from "fs";
import { basename, dirname, extname as extname2, join as join2 } from "path";
import { formatPreviewProxyBox } from "@hyperframes/core";
var SMALL_FILE_BYTES = 16 * 1024 * 1024;
var COPY_NAME = /^[0-9a-f]{64}\.(?:mp4|webm)$/;
function digest(...parts) {
  return createHash("sha256").update(parts.join("\0")).digest("hex");
}
function boxPart(box) {
  return box ? formatPreviewProxyBox(box) : "";
}
function fastCopyKey(sourcePath, version, variant, box) {
  const stat = statSync2(sourcePath);
  return digest(
    sourcePath,
    String(stat.mtimeMs),
    String(stat.size),
    version,
    variant,
    boxPart(box)
  );
}
async function contentCopyKey(sourcePath, version, variant, box, signal) {
  const hash = createHash("sha256");
  const fd = openSync(sourcePath, "r");
  try {
    if (fstatSync(fd).size <= SMALL_FILE_BYTES) hash.update(readFileSync(fd));
    else
      for await (const chunk of createReadStream(sourcePath, { fd, autoClose: false, signal }))
        hash.update(chunk);
  } finally {
    closeSync(fd);
  }
  return digest(hash.digest("hex"), version, variant, boxPart(box));
}
function sourceSizeBytes(sourcePath) {
  try {
    const fd = openSync(sourcePath, "r");
    try {
      return fstatSync(fd).size;
    } finally {
      closeSync(fd);
    }
  } catch {
    return void 0;
  }
}
function fastIndexPath(cachePath) {
  return join2(dirname(cachePath), `.fast-${basename(cachePath, extname2(cachePath))}`);
}
function contentIndexPath(cacheDir, contentKey) {
  return join2(cacheDir, `.content-${contentKey}`);
}
function readCopyIndex(indexPath) {
  try {
    const name = readFileSync(indexPath, "utf8").trim();
    const target = join2(dirname(indexPath), name);
    return COPY_NAME.test(name) && existsSync2(target) ? target : null;
  } catch {
    return null;
  }
}
function writeCopyIndex(indexPath, copyPath) {
  writeFileSync(indexPath, basename(copyPath));
}

// src/helpers/proxyLock.ts
import {
  closeSync as closeSync2,
  existsSync as existsSync3,
  openSync as openSync2,
  readFileSync as readFileSync2,
  rmSync,
  statSync as statSync3,
  writeSync
} from "fs";
import { basename as basename2, dirname as dirname2, join as join3 } from "path";
var POLL_MS = 500;
var UNREADABLE_LOCK_MS = 1e4;
function lockPathFor(cachePath) {
  return join3(dirname2(cachePath), `.lock-${basename2(cachePath)}`);
}
function ownerIsAlive(lockPath) {
  try {
    const pid = Number(readFileSync2(lockPath, "utf8"));
    if (!Number.isInteger(pid) || pid <= 0) {
      return Date.now() - statSync3(lockPath).mtimeMs < UNREADABLE_LOCK_MS;
    }
    try {
      process.kill(pid, 0);
      return true;
    } catch (err) {
      return err.code === "EPERM";
    }
  } catch {
    return false;
  }
}
function pause(ms, signal) {
  return new Promise((resolve2, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve2();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
async function acquireCopyLock(cachePath, signal) {
  const lockPath = lockPathFor(cachePath);
  for (; ; ) {
    signal.throwIfAborted();
    if (existsSync3(cachePath)) return null;
    try {
      const fd = openSync2(lockPath, "wx");
      writeSync(fd, String(process.pid));
      closeSync2(fd);
      if (!existsSync3(cachePath)) return () => rmSync(lockPath, { force: true });
      rmSync(lockPath, { force: true });
      return null;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
    if (ownerIsAlive(lockPath)) await pause(POLL_MS, signal);
    else rmSync(lockPath, { force: true });
  }
}

// src/helpers/proxyTranscoder.ts
var PROXY_PARAMS_VERSION = "v7";
var CACHE_DIR_NAME = ".transcode-cache";
function boundedEnvInteger(name, fallback, min, max) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}
var MAX_CONCURRENT_TRANSCODES = boundedEnvInteger("HYPERFRAMES_PROXY_MAX_CONCURRENCY", 2, 1, 16);
var MAX_QUEUED_TRANSCODES = boundedEnvInteger("HYPERFRAMES_PROXY_MAX_QUEUE", 8, 0, 256);
var STDERR_TAIL_MAX_CHARS = 4e3;
var TRANSCODE_STALL_MS = boundedEnvInteger(
  "HYPERFRAMES_PROXY_STALL_MS",
  3 * 60 * 1e3,
  1e4,
  60 * 60 * 1e3
);
var PROXY_CHUNK_SECONDS = 15;
var CHUNK_PREFIX = ".part-";
var CONCAT_TIMEOUT_MS = 2 * 60 * 1e3;
var FAILURE_CACHE_TTL_MS = 60 * 1e3;
var PROXY_PENDING_RETRY_AFTER_SECONDS = 2;
var ENVIRONMENT_FAILURE_TTL_MS = 5 * PROXY_PENDING_RETRY_AFTER_SECONDS * 1e3;
var MAX_FAILURE_CACHE_ENTRIES = 128;
var DEFAULT_PROXY_WAIT_TIMEOUT_MS = 2 * 60 * 1e3;
var UNTOUCHED_TEMP_IS_DEAD_MS = 10 * 60 * 1e3;
var ProxyTranscodeError = class extends Error {
  exitCode;
  stderrTail;
  constructor(message, exitCode, stderrTail) {
    super(message);
    this.name = "ProxyTranscodeError";
    this.exitCode = exitCode;
    this.stderrTail = stderrTail;
  }
};
var FfmpegUnavailableError = class extends ProxyTranscodeError {
  constructor(message = "ffmpeg binary not found", stderrTail = "") {
    super(message, null, stderrTail);
    this.name = "FfmpegUnavailableError";
  }
};
var FfmpegMissingFilterError = class extends ProxyTranscodeError {
  constructor() {
    super(
      "HDR proxying requires ffmpeg zscale/tonemap filters (libzimg); install an ffmpeg build with libzimg support",
      null,
      ""
    );
    this.name = "FfmpegMissingFilterError";
  }
};
var ProxyCapacityError = class extends ProxyTranscodeError {
  constructor() {
    super("media proxy queue is full; retry shortly", null, "");
    this.name = "ProxyCapacityError";
  }
};
var ProxySourceOutsideProjectError = class extends ProxyTranscodeError {
  constructor() {
    super("media proxy source must be addressed through the project", null, "");
    this.name = "ProxySourceOutsideProjectError";
  }
};
var ProxyWaitTimeoutError = class extends ProxyTranscodeError {
  constructor(timeoutMs) {
    super(`media proxy did not become ready within ${timeoutMs}ms`, null, "");
    this.name = "ProxyWaitTimeoutError";
  }
};
async function waitForProxy(promise, timeoutMs = DEFAULT_PROXY_WAIT_TIMEOUT_MS) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new ProxyWaitTimeoutError(timeoutMs)), timeoutMs);
        timer.unref();
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function canonicalizeProxySource(projectDir, absoluteSourcePath) {
  const requestedProjectDir = resolve(projectDir);
  const requestedSourcePath = resolve(absoluteSourcePath);
  const requestedRelativePath = relative(requestedProjectDir, requestedSourcePath);
  if (requestedRelativePath === ".." || requestedRelativePath.startsWith(`..${sep}`) || isAbsolute(requestedRelativePath)) {
    throw new ProxySourceOutsideProjectError();
  }
  return { projectDir: realProjectRoot(projectDir), sourcePath: realpath(absoluteSourcePath) };
}
function getCanonicalProxyCachePath(source, variant, box) {
  const key = fastCopyKey(source.sourcePath, PROXY_PARAMS_VERSION, variant, box);
  const made = join4(
    source.projectDir,
    CACHE_DIR_NAME,
    `${key}${PROXY_VARIANT_CONFIG[variant].extension}`
  );
  return existsSync4(made) ? made : readCopyIndex(fastIndexPath(made)) ?? made;
}
function getProxyCachePath(projectDir, absoluteSourcePath, variant = "h264", box) {
  return getCanonicalProxyCachePath(
    canonicalizeProxySource(projectDir, absoluteSourcePath),
    variant,
    box
  );
}
function reportProgress(job, progress) {
  job.lastProgress = progress;
  for (const listener of job.progress) listener(progress);
}
var ProxyDroppedError = class extends ProxyTranscodeError {
  constructor() {
    super("media proxy copy dropped: every caller left", null, "");
    this.name = "ProxyDroppedError";
  }
};
var activeTranscodes = 0;
var waitQueue = [];
function enqueue(job) {
  if (job.priority) waitQueue.unshift(job);
  else waitQueue.push(job);
}
function dequeue(job) {
  const index = waitQueue.indexOf(job);
  if (index !== -1) waitQueue.splice(index, 1);
}
function acquireSlot(job) {
  if (activeTranscodes < MAX_CONCURRENT_TRANSCODES) {
    activeTranscodes++;
    return Promise.resolve();
  }
  return new Promise((resolveSlot, reject) => {
    job.queued = {
      start: () => {
        job.queued = void 0;
        activeTranscodes++;
        resolveSlot();
      },
      drop: () => {
        job.queued = void 0;
        dequeue(job);
        forget(job);
        reject(new ProxyDroppedError());
      }
    };
    enqueue(job);
  });
}
function queueIsFull() {
  return activeTranscodes >= MAX_CONCURRENT_TRANSCODES && waitQueue.length >= MAX_QUEUED_TRANSCODES;
}
function releaseSlot() {
  activeTranscodes--;
  waitQueue.shift()?.queued?.start();
}
function prioritize(job) {
  job.priority = true;
  if (!job.queued) return;
  dequeue(job);
  enqueue(job);
}
function leave(job) {
  job.callers--;
  if (job.callers > 0) return;
  if (job.queued) {
    job.queued.drop();
    return;
  }
  forget(job);
  job.abandoned.abort();
}
var inFlight = /* @__PURE__ */ new Map();
function forget(job) {
  if (inFlight.get(job.cachePath)?.job === job) inFlight.delete(job.cachePath);
}
function maintainProxyCache(cacheDir, staleTempMs) {
  try {
    cleanupProxyCache(cacheDir, { protectedPaths: new Set(inFlight.keys()), staleTempMs });
  } catch (error) {
    console.warn(
      `[media-proxy] cache cleanup failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function markCacheEntryUsed(cachePath) {
  try {
    const now = /* @__PURE__ */ new Date();
    utimesSync(cachePath, now, now);
  } catch {
  }
}
var failedTranscodes = /* @__PURE__ */ new Map();
async function ensureHdrFilters(ffmpegPath) {
  if (!await ffmpegHasHdrFilters(ffmpegPath)) throw new FfmpegMissingFilterError();
}
function rememberFailure(cachePath, error) {
  const ttlMs = error instanceof FfmpegUnavailableError || error instanceof FfmpegMissingFilterError ? ENVIRONMENT_FAILURE_TTL_MS : FAILURE_CACHE_TTL_MS;
  failedTranscodes.delete(cachePath);
  failedTranscodes.set(cachePath, { error, expiresAt: Date.now() + ttlMs });
  while (failedTranscodes.size > MAX_FAILURE_CACHE_ENTRIES) {
    const oldest = failedTranscodes.keys().next().value;
    if (oldest === void 0) break;
    failedTranscodes.delete(oldest);
  }
}
function clearFailedTranscodesForTest() {
  failedTranscodes.clear();
}
function proxyScaleSize(box) {
  if (!box) return { width: "trunc(iw/2)*2", height: "trunc(ih/2)*2" };
  const factor = `min(1\\,max(${box.width}/iw\\,${box.height}/ih))`;
  const side = (d) => `min(trunc(${d}/2)*2\\,ceil(${d}*${factor}/2)*2)`;
  return { width: side("iw"), height: side("ih") };
}
function proxyScaleFilter(box) {
  const { width, height } = proxyScaleSize(box);
  return `scale=${width}:${height}`;
}
var STDERR_ERROR_LINE = /error|invalid|denied|no space|not found|unknown/i;
var OPEN_OUTPUT_LINE = /^Error opening output file /;
var ABSOLUTE_PATH = /(?:[A-Za-z]:)?(?:[\\/][^\\/\s'"]+){2,}/g;
var REASON_LINES = 3;
function stderrReason(stderrTail, knownPaths) {
  const lines = stderrTail.split("\n").map((line) => line.trim()).filter(Boolean);
  const openedAt = lines.map((candidate) => OPEN_OUTPUT_LINE.test(candidate)).lastIndexOf(true);
  const causes = lines.filter(
    (line, index) => !OPEN_OUTPUT_LINE.test(line) && (STDERR_ERROR_LINE.test(line) || index === openedAt - 1)
  );
  const shown = (causes.length ? causes : lines.slice(-1)).slice(-REASON_LINES);
  const byLength = knownPaths.filter(isAbsolute).sort((a, b) => b.length - a.length);
  const reason = shown.map(
    (line) => byLength.reduce((text, path) => text.split(path).join("<path>"), line).replace(ABSOLUTE_PATH, "<path>").replace(/[.!]+$/, "")
  );
  return reason.length ? `: ${reason.join("; ")}` : "";
}
var CLOUD_FOLDER = /\/(?:Library\/CloudStorage|Dropbox|OneDrive|Google Drive)(?:[ \-/]|$)/i;
function sourceFolderKind(sourcePath) {
  const path = sourcePath.replace(/\\/g, "/");
  if (path.includes("/Library/Mobile Documents/")) return "icloud";
  if (CLOUD_FOLDER.test(path)) return "cloud-storage";
  return path.startsWith("/Volumes/") ? "external-volume" : "local";
}
function describeSource(sourcePath, metadata) {
  const { codecName, pixelFormat, colorTransfer } = metadata.color;
  const megabytes = sourceSizeBytes(sourcePath);
  return [
    metadata.kind,
    codecName,
    pixelFormat,
    colorTransfer,
    metadata.hasAudio ? "with audio" : "no audio",
    metadata.streams?.length ? `streams ${metadata.streams.join(" ")}` : void 0,
    metadata.durationSeconds ? `${Math.round(metadata.durationSeconds)}s` : void 0,
    megabytes === void 0 ? "missing" : `${Math.round(megabytes / 1e6)} MB`,
    sourceFolderKind(sourcePath)
  ].filter(Boolean).join(", ");
}
function withSource(err, describe) {
  if (err instanceof ProxyTranscodeError && err.name === "ProxyTranscodeError") {
    return new ProxyTranscodeError(
      `${err.message} (source: ${describe()})`,
      err.exitCode,
      err.stderrTail
    );
  }
  return err;
}
function chunkRanges(durationSeconds) {
  if (!durationSeconds || durationSeconds <= PROXY_CHUNK_SECONDS * 1.5) return null;
  const count = Math.floor(durationSeconds / PROXY_CHUNK_SECONDS);
  return Array.from({ length: count }, (_, index) => ({
    startSeconds: index * PROXY_CHUNK_SECONDS,
    lengthSeconds: index === count - 1 ? durationSeconds - index * PROXY_CHUNK_SECONDS : PROXY_CHUNK_SECONDS
  }));
}
var UNGATED = { size: 1, acquire: async () => {
}, release: () => {
} };
function createPieceGate(size) {
  let free = size;
  const waiters = [];
  return {
    size,
    acquire: (signal) => {
      signal.throwIfAborted();
      if (free > 0) {
        free--;
        return Promise.resolve();
      }
      return new Promise((resolve2, reject) => {
        const grant = () => {
          signal.removeEventListener("abort", onAbort);
          resolve2();
        };
        const onAbort = () => {
          waiters.splice(waiters.indexOf(grant), 1);
          reject(signal.reason);
        };
        signal.addEventListener("abort", onAbort, { once: true });
        waiters.push(grant);
      });
    },
    release: () => {
      const next = waiters.shift();
      if (next) next();
      else free++;
    }
  };
}
async function encodeInChunks(ranges, chunkPrefix, tempPath, encode, concat, signal, gate, onDone = () => {
}) {
  const extension = extname3(tempPath);
  const pieces = ranges.map((_, index) => `${chunkPrefix}${index}${extension}`);
  const pending = ranges.flatMap((_, index) => existsSync4(pieces[index]) ? [] : [index]);
  let doneSeconds = 0;
  for (const [index, range] of ranges.entries()) {
    if (!pending.includes(index)) doneSeconds += range.lengthSeconds;
  }
  if (doneSeconds) onDone(doneSeconds);
  const inFlight2 = /* @__PURE__ */ new Map();
  const stop = new AbortController();
  const pieceSignal = AbortSignal.any([signal, stop.signal]);
  let failure;
  let cursor = 0;
  const work = async () => {
    for (; ; ) {
      await gate.acquire(pieceSignal);
      try {
        if (cursor >= pending.length) return;
        const index = pending[cursor++];
        const range = ranges[index];
        const piece = pieces[index];
        const pieceTemp = join4(dirname3(piece), `.tmp-${randomUUID()}-${basename3(piece)}`);
        try {
          await encode(pieceTemp, range, pieceSignal, (encodedSeconds) => {
            inFlight2.set(index, encodedSeconds);
            onDone(doneSeconds + [...inFlight2.values()].reduce((sum, seconds) => sum + seconds, 0));
          });
          renameSync(pieceTemp, piece);
          inFlight2.delete(index);
          doneSeconds += range.lengthSeconds;
          onDone(doneSeconds);
        } finally {
          if (existsSync4(pieceTemp)) unlinkSync2(pieceTemp);
        }
      } finally {
        gate.release();
      }
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(gate.size, pending.length) },
      () => work().catch((error) => {
        failure ??= error;
        stop.abort();
      })
    )
  );
  if (failure !== void 0) throw failure;
  const listDir = mkdtempSync(join4(tmpdir(), "hf-proxy-join-"));
  try {
    const listPath = join4(listDir, "pieces.txt");
    writeFileSync2(
      listPath,
      pieces.map((piece) => `file '${piece.replace(/\\/g, "/").replace(/'/g, "'\\''")}'
`).join("")
    );
    await concat(listPath, tempPath);
  } finally {
    rmSync2(listDir, { recursive: true, force: true });
  }
  for (const piece of pieces) if (existsSync4(piece)) unlinkSync2(piece);
}
var KEYFRAME_EVERY_SECOND_ARGS = ["-force_key_frames", "expr:gte(t,n_forced*1)"];
var H264_ARGS = [
  "-c:v",
  "libx264",
  "-profile:v",
  "high",
  "-pix_fmt",
  "yuv420p",
  "-colorspace",
  "bt709",
  "-color_primaries",
  "bt709",
  "-color_trc",
  "bt709",
  "-crf",
  "18",
  "-preset",
  "veryfast",
  "-c:a",
  "aac",
  "-movflags",
  "+faststart"
];
var CORES = availableParallelism();
var PIECE_MEMORY_BYTES = 3 * 1024 ** 3;
var ALPHA_PIECE_GATE = createPieceGate(
  Math.max(1, Math.min(4, CORES - 1, Math.floor(totalmem() / PIECE_MEMORY_BYTES)))
);
var VP8_ARGS = [
  "-c:v",
  "libvpx",
  "-b:v",
  "0",
  "-crf",
  "23",
  "-deadline",
  "good",
  "-pix_fmt",
  "yuva420p",
  "-colorspace",
  "bt709",
  "-color_primaries",
  "bt709",
  "-color_trc",
  "bt709",
  "-cpu-used",
  "4",
  "-auto-alt-ref",
  "0",
  "-metadata:s:v:0",
  "alpha_mode=1",
  "-ac",
  "2",
  "-c:a",
  "libopus"
];
async function buildVideoFilter(ffmpegPath, sourcePath, metadata, keepsAlpha, box) {
  const { hdrTransfer } = metadata.color;
  const toneMap = (hdrTransfer === "pq" || hdrTransfer === "hlg") && !keepsAlpha;
  if (toneMap) await ensureHdrFilters(ffmpegPath);
  const firstFrame = toneMap ? await probeFirstFrameColour(sourcePath) : {};
  const evenScale = proxyScaleFilter(box);
  const pixelFormat = keepsAlpha ? "yuva420p" : "yuv420p";
  return toneMap ? [
    hdrToSdrToneMapFilter(metadata.color, firstFrame, box && proxyScaleSize(box)),
    `${evenScale}:out_color_matrix=bt709:out_range=tv`,
    `format=${pixelFormat}`
  ].join(",") : [evenScale, `format=${pixelFormat}`].join(",");
}
async function runFfmpeg(sourcePath, outputPath, chunkPrefix, variant, box, signal, onProgress) {
  const metadata = await probeMediaMetadata(sourcePath);
  const ffmpegPath = findFfBinary("ffmpeg", { configuredMustExist: true });
  if (!ffmpegPath) {
    throw new FfmpegUnavailableError();
  }
  const keepsAlpha = variant === "vp8";
  const videoFilter = await buildVideoFilter(ffmpegPath, sourcePath, metadata, keepsAlpha, box);
  const alphaDecoder = keepsAlpha ? alphaDecoderFor(metadata.color.codecName) : null;
  const decoderArgs = alphaDecoder ? ["-c:v", alphaDecoder] : [];
  const streamArgs = [
    ...["-map", "0:V:0"],
    ...metadata.audioStream === void 0 ? [] : ["-map", `0:a:${metadata.audioStream}`]
  ];
  const totalSeconds = metadata.durationSeconds;
  const gate = keepsAlpha ? ALPHA_PIECE_GATE : UNGATED;
  const vp8Threads = (pieces) => [
    "-threads",
    String(Math.min(4, Math.floor(CORES / pieces)))
  ];
  const encode = (target, range, pieceSignal, onEncoded) => spawnFfmpeg(
    ffmpegPath,
    [
      "-y",
      "-progress",
      "pipe:1",
      "-nostats",
      ...range ? ["-ss", String(range.startSeconds)] : [],
      ...decoderArgs,
      "-i",
      sourcePath,
      ...streamArgs,
      ...range ? ["-t", String(range.lengthSeconds)] : [],
      "-vf",
      videoFilter,
      ...KEYFRAME_EVERY_SECOND_ARGS,
      ...keepsAlpha ? [...VP8_ARGS, ...vp8Threads(range ? gate.size : 1)] : H264_ARGS,
      target
    ],
    TRANSCODE_STALL_MS,
    pieceSignal,
    onEncoded
  );
  const ranges = chunkRanges(totalSeconds);
  try {
    if (!ranges) {
      return await encode(
        outputPath,
        void 0,
        signal,
        (encodedSeconds) => onProgress({ doneSeconds: encodedSeconds, totalSeconds })
      );
    }
    await encodeInChunks(
      ranges,
      chunkPrefix,
      outputPath,
      encode,
      (listPath, target) => spawnFfmpeg(ffmpegPath, concatArgs(listPath, target, variant), CONCAT_TIMEOUT_MS, signal),
      signal,
      gate,
      (doneSeconds) => onProgress({ doneSeconds, totalSeconds })
    );
  } catch (err) {
    throw withSource(err, () => describeSource(sourcePath, metadata));
  }
}
function concatArgs(listPath, target, variant) {
  return [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    ...variant === "h264" ? ["-movflags", "+faststart"] : [],
    target
  ];
}
var OUT_TIME = /^out_time_(?:us|ms)=(\d+)$/;
function spawnFfmpeg(ffmpegPath, args, stallMs, signal, onProgress) {
  return new Promise((resolvePromise, reject) => {
    signal.throwIfAborted();
    const proc = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      killSignal: "SIGKILL",
      signal,
      windowsHide: true
    });
    let stalled = false;
    let timer;
    const armStall = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        stalled = true;
        proc.kill("SIGKILL");
      }, stallMs);
      timer.unref();
    };
    armStall();
    let furthest = 0;
    let lineTail = "";
    proc.stdout?.on("data", (chunk) => {
      const lines = (lineTail + chunk.toString()).split("\n");
      lineTail = lines.pop() ?? "";
      for (const line of lines) {
        const reached = OUT_TIME.exec(line.trim());
        if (!reached) continue;
        const seconds = Number(reached[1]) / 1e6;
        if (seconds <= furthest) continue;
        furthest = seconds;
        armStall();
        onProgress?.(seconds);
      }
    });
    let stderrTail = "";
    proc.stderr?.on("data", (chunk) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_MAX_CHARS);
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      if (signal.aborted) return;
      reject(new FfmpegUnavailableError(`failed to spawn ffmpeg: ${err.message}`, stderrTail));
    });
    proc.on("close", (code, killedBy) => {
      clearTimeout(timer);
      if (code === 0) {
        resolvePromise();
      } else if (stalled) {
        reject(
          new ProxyTranscodeError(
            `ffmpeg made no progress for ${Math.round(stallMs / 1e3)}s and was ended; finished pieces are kept for the next attempt`,
            null,
            stderrTail
          )
        );
      } else if (killedBy) {
        reject(
          new ProxyTranscodeError(`ffmpeg killed by ${killedBy} (external kill)`, null, stderrTail)
        );
      } else {
        reject(
          new ProxyTranscodeError(
            `ffmpeg exited with code ${code}${stderrReason(stderrTail, args)}`,
            code,
            stderrTail
          )
        );
      }
    });
  });
}
async function transcodeToCache(job, projectDir, absoluteSourcePath, cachePath, variant, box) {
  await acquireSlot(job);
  try {
    if (existsSync4(cachePath)) return cachePath;
    const cacheDir = dirname3(cachePath);
    mkdirWithinProject(projectDir, cacheDir);
    const contentIndex = contentIndexPath(
      cacheDir,
      await contentCopyKey(
        absoluteSourcePath,
        PROXY_PARAMS_VERSION,
        variant,
        box,
        job.abandoned.signal
      )
    );
    const sameContent = readCopyIndex(contentIndex);
    if (sameContent) {
      writeCopyIndex(fastIndexPath(cachePath), sameContent);
      return sameContent;
    }
    const release = await acquireCopyLock(cachePath, job.abandoned.signal);
    if (!release) return cachePath;
    const tempPath = join4(cacheDir, `.tmp-${randomUUID()}-${basename3(cachePath)}`);
    try {
      const chunkPrefix = join4(
        cacheDir,
        `${CHUNK_PREFIX}${basename3(cachePath, extname3(cachePath))}-`
      );
      await runFfmpeg(
        absoluteSourcePath,
        tempPath,
        chunkPrefix,
        variant,
        box,
        job.abandoned.signal,
        (progress) => reportProgress(job, progress)
      );
      renameSync(tempPath, cachePath);
      writeCopyIndex(contentIndex, cachePath);
      maintainProxyCache(cacheDir);
      return cachePath;
    } finally {
      if (existsSync4(tempPath)) unlinkSync2(tempPath);
      release();
    }
  } finally {
    releaseSlot();
  }
}
function proxyCopyProgress(projectDir, absoluteSourcePath, variant, box) {
  const source = canonicalizeProxySource(projectDir, absoluteSourcePath);
  const progress = inFlight.get(getCanonicalProxyCachePath(source, variant, box))?.job.lastProgress;
  return progress?.totalSeconds ? Math.min(1, progress.doneSeconds / progress.totalSeconds) : void 0;
}
function retryProxyCopy(projectDir, absoluteSourcePath, variant, box) {
  const source = canonicalizeProxySource(projectDir, absoluteSourcePath);
  failedTranscodes.delete(getCanonicalProxyCachePath(source, variant, box));
}
var proxyActivity = 0;
function proxyActivityMark(projectDir) {
  if (!existsSync4(projectDir)) return String(proxyActivity);
  const cacheDir = join4(realpath(projectDir), CACHE_DIR_NAME) + sep;
  for (const cachePath of inFlight.keys()) if (cachePath.startsWith(cacheDir)) return null;
  return String(proxyActivity);
}
async function resolveProxy(projectDir, absoluteSourcePath, variant = "h264", box, options = {}) {
  options.signal?.throwIfAborted();
  const source = canonicalizeProxySource(projectDir, absoluteSourcePath);
  const cachePath = getCanonicalProxyCachePath(source, variant, box);
  if (existsSync4(cachePath)) {
    markCacheEntryUsed(cachePath);
    maintainProxyCache(dirname3(cachePath));
    return cachePath;
  }
  const rememberedFailure = failedTranscodes.get(cachePath);
  if (rememberedFailure) {
    if (rememberedFailure.expiresAt > Date.now()) throw rememberedFailure.error;
    failedTranscodes.delete(cachePath);
  }
  let entry = inFlight.get(cachePath);
  if (!entry) {
    if (!options.priority && queueIsFull()) {
      proxyActivity += 1;
      throw new ProxyCapacityError();
    }
    const job = {
      cachePath,
      priority: options.priority === true,
      callers: 0,
      abandoned: new AbortController(),
      progress: /* @__PURE__ */ new Set()
    };
    const promise = transcodeToCache(
      job,
      source.projectDir,
      source.sourcePath,
      cachePath,
      variant,
      box
    ).catch((err) => {
      if (!(err instanceof ProxyDroppedError) && !job.abandoned.signal.aborted) {
        rememberFailure(cachePath, err);
      }
      throw err;
    }).finally(() => {
      forget(job);
      proxyActivity += 1;
    });
    entry = { promise, job };
    inFlight.set(cachePath, entry);
  }
  if (options.priority) prioritize(entry.job);
  const listener = options.onProgress;
  const joined = joinJob(entry.promise, entry.job, options.signal);
  if (listener) {
    entry.job.progress.add(listener);
    if (entry.job.lastProgress) listener(entry.job.lastProgress);
    const stop = () => void entry.job.progress.delete(listener);
    joined.then(stop, stop);
  }
  return joined;
}
async function resolveProxies(projectDir, sources, onSettled = () => {
}, onProgress = () => {
}, signal) {
  const first = sources[0];
  if (first) {
    maintainProxyCache(
      dirname3(getProxyCachePath(projectDir, first.sourcePath, first.variant)),
      Math.min(
        Number(process.env.HYPERFRAMES_PROXY_CACHE_STALE_TEMP_MS) || UNTOUCHED_TEMP_IS_DEAD_MS,
        UNTOUCHED_TEMP_IS_DEAD_MS
      )
    );
  }
  const results = [];
  let next = 0;
  const worker = async () => {
    for (let index = next++; index < sources.length; index = next++) {
      const { sourcePath, variant, box } = sources[index];
      results[index] = await resolveProxy(projectDir, sourcePath, variant, box, {
        onProgress: (progress) => onProgress(index, progress),
        signal
      }).then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason })
      );
      onSettled(index);
    }
  };
  const workers = Math.min(MAX_CONCURRENT_TRANSCODES, sources.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}
function joinJob(promise, job, signal) {
  job.callers++;
  if (!signal) return promise;
  return new Promise((resolveJoin, rejectJoin) => {
    const onAbort = () => {
      leave(job);
      rejectJoin(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.finally(() => signal.removeEventListener("abort", onAbort)).then(resolveJoin, rejectJoin);
  });
}

export {
  cleanupProxyCache,
  PROXY_PARAMS_VERSION,
  CACHE_DIR_NAME,
  TRANSCODE_STALL_MS,
  PROXY_CHUNK_SECONDS,
  PROXY_PENDING_RETRY_AFTER_SECONDS,
  DEFAULT_PROXY_WAIT_TIMEOUT_MS,
  ProxyTranscodeError,
  FfmpegUnavailableError,
  FfmpegMissingFilterError,
  ProxyCapacityError,
  ProxySourceOutsideProjectError,
  ProxyWaitTimeoutError,
  waitForProxy,
  getProxyCachePath,
  clearFailedTranscodesForTest,
  sourceFolderKind,
  proxyCopyProgress,
  retryProxyCopy,
  proxyActivityMark,
  resolveProxy,
  resolveProxies
};

import {
  findUnsafeDomPatchValues,
  findUnsafeMutationValues
} from "./chunk-UEEXAVOA.js";
import {
  dedupeClonedCompositionId,
  findTargetElement,
  isHTMLElement,
  nextUniqueId,
  parseSourceDocument,
  patchElementInHtml,
  probeElementInSource,
  probeElementsInSource,
  relinkSplitHalvesInHtml,
  removeElementFromHtml,
  removeElementsFromHtml,
  splitElementInHtml,
  unwrapElementsFromHtml,
  wrapElementsInHtml
} from "./chunk-REQUL5L4.js";
import {
  isCompositionSource,
  stampProjectHfIds,
  stampProjectHfIdsAsync
} from "./chunk-7ROCGO5U.js";
import {
  parseEncoderOptions
} from "./chunk-H5AB5322.js";
import {
  MAX_OPEN_MEDIA_RANGE_BYTES,
  openRangeEnd
} from "./chunk-6HAB346W.js";
import {
  DEFAULT_HISTORY_ROOT,
  DELETED_VERSION,
  HistoryBusyError,
  HistoryClosedError,
  HistoryIdError,
  HistoryRefusedError,
  MAX_WINDOW_IDLE_MS,
  START,
  STUDIO_SIGNATURE_MANIFEST_PATHS,
  UNDO_MODES,
  affectsProjectSignature,
  artifactDirectory,
  beginArtifactCapture,
  clearFileWriteReceipt,
  consumeFileWriteReceipt,
  createProjectSignature,
  createProjectSignatureAsync,
  createWriteToken,
  fileContentVersion,
  finishSnapshotRun,
  forgetRecordedArtifacts,
  historyCache,
  identifyFileWrite,
  isUncopiedMedia,
  listProjectHistories,
  onRestoredInPlace,
  openProjectHistory,
  pruneGoneProjectHistories,
  readProjectHistory,
  reclaimUncopiedBlobs,
  recordArtifact,
  recordArtifacts,
  recordFileWriteReceipt,
  recordRenderSuccess,
  registerRenderOutput,
  resolveProjectAndSignature,
  resolveProjectSignature,
  retainSnapshotOutput,
  serveWhileOpen,
  settledFileTag
} from "./chunk-Z6G2NBCQ.js";
import {
  clearElementScreenshotIsolation,
  getElementScreenshotClip
} from "./chunk-RGC6DKVM.js";
import {
  DEFAULT_TARGET_LUFS,
  absoluteLoudnessPlan,
  decodeWellFormedEscapes,
  measureAudio,
  requestSubPath,
  requestedProjectPath,
  requiredFfmpeg,
  resolveLocalAudioPath
} from "./chunk-NEGQQZNI.js";
import {
  injectMediaCodecMap,
  isAutoProxyEnabled,
  proxyEtagSalt,
  resolvePreviewMediaCodecProbeCache
} from "./chunk-IJMPYPJG.js";
import {
  CACHE_DIR_NAME,
  PROXY_PENDING_RETRY_AFTER_SECONDS,
  ProxyCapacityError,
  ProxyTranscodeError,
  ProxyWaitTimeoutError,
  cleanupProxyCache,
  proxyActivityMark,
  proxyCopyProgress,
  resolveProxy,
  resolveStill,
  retryProxyCopy,
  waitForProxy
} from "./chunk-F4AQECCT.js";
import {
  PROXY_VARIANT_CONFIG,
  decideMediaProxyEligibility,
  isProxyVariantRequest,
  probeAssetCodec,
  recordProxyRequest,
  resolveProxyVariantRequest
} from "./chunk-66YZA32N.js";
import {
  probeAudioTrack,
  probeMediaMetadata
} from "./chunk-Y6EZUBYR.js";
import {
  folderGone,
  isInHiddenOrVendorDir,
  isPrivateProjectFile,
  isPrivateProjectPath,
  isProjectRootMissing,
  isSafePath,
  mkdirWithinProject,
  pinWithinProject,
  realFilePath,
  realpath,
  resolveWithinProject,
  walkDir
} from "./chunk-QF7MFJJU.js";
import {
  STUDIO_MANUAL_EDITS_PATH,
  createStudioManualEditsRenderBodyScript,
  createStudioPositionSeekReapplyScript
} from "./chunk-SVQFE44C.js";
import {
  STUDIO_MOTION_PATH,
  createStudioMotionRenderBodyScript
} from "./chunk-L3HJVTQE.js";

// src/createStudioApi.ts
import { Hono } from "hono";

// src/routes/projects.ts
import { readFile } from "fs/promises";
import { join } from "path";
async function filterCompositionFiles(projectDir, files) {
  const htmlFiles = files.filter((f) => f.endsWith(".html") && !isInHiddenOrVendorDir(f));
  const checks = await Promise.all(
    htmlFiles.map(async (f) => {
      try {
        const content = await readFile(join(projectDir, f), "utf-8");
        return isCompositionSource(content);
      } catch {
        return false;
      }
    })
  );
  return htmlFiles.filter((_, i) => checks[i]);
}
function registerProjectRoutes(api, adapter) {
  api.get("/projects", async (c) => {
    const projects = await adapter.listProjects();
    return c.json({ projects });
  });
  api.get("/resolve-session/:sessionId", async (c) => {
    if (!adapter.resolveSession) {
      return c.json({ error: "not available" }, 404);
    }
    const { sessionId } = c.req.param();
    const result = await adapter.resolveSession(sessionId);
    if (!result) return c.json({ error: "Session not found" }, 404);
    return c.json(result);
  });
  api.get("/projects/:id/signature", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    return c.json({ signature: await resolveProjectSignature(adapter, project.dir) });
  });
  api.get("/projects/:id", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const files = walkDir(project.dir).filter((file) => !isPrivateProjectPath(file));
    const compositions = await filterCompositionFiles(project.dir, files);
    return c.json({ id: project.id, dir: project.dir, title: project.title, files, compositions });
  });
}

// src/routes/files.ts
import { encodeUrlPath, decodedUrlPath, decodeCssEscapes } from "@hyperframes/parsers/asset-paths";
import {
  scanHtmlOpeningTags,
  decodeAuthoredAttribute,
  HTML_ATTRIBUTE_ENTITIES
} from "@hyperframes/parsers";
import { bodyLimit } from "hono/body-limit";
import {
  closeSync,
  existsSync as existsSync4,
  lstatSync as lstatSync2,
  openSync,
  readFileSync as readFileSync5,
  readlinkSync,
  unlinkSync as unlinkSync2,
  rmSync as rmSync3,
  statSync as statSync3,
  fstatSync,
  renameSync as renameSync2,
  readdirSync as readdirSync2,
  realpathSync
} from "fs";
import { resolve as resolve2, dirname as dirname3, join as join6, sep as sep2 } from "path";

// src/helpers/mime.ts
var MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".mxf": "video/mxf",
  ".mts": "video/mp2t",
  ".m2ts": "video/mp2t",
  ".ts": "video/mp2t",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".opus": "audio/ogg",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".cube": "text/plain; charset=utf-8"
};
function getMimeType(path) {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}
function isAudioFile(name) {
  return (getMimeType(name) ?? "").startsWith("audio/");
}

// src/helpers/compositionInputs.ts
import { readFileSync as readFileSync2 } from "fs";
import { createHash } from "crypto";
import { parseHTML as parseHTML3 } from "linkedom";

// src/helpers/subComposition.ts
import { existsSync, readFileSync } from "fs";
import { join as join2 } from "path";
import { parseHTML } from "linkedom";
import {
  rewriteAssetPaths,
  rewriteCssAssetUrls,
  rewriteInlineStyleAssetUrls
} from "@hyperframes/core";
import {
  deferScriptsUntilFonts,
  RUNTIME_BOOTSTRAP_ATTR,
  stripEmbeddedRuntimeScripts
} from "@hyperframes/core/compiler";
import { findStartTags as findStartTags2, isFullHtmlDocument } from "@hyperframes/core/compiler/html-document";
import { gsapCdnDist } from "@hyperframes/core/gsap-cdn";

// src/helpers/gsapCoreScript.ts
import { findStartTags, insertBeforeCloseTag } from "@hyperframes/core/compiler/html-document";
var URL_BASE = "http://localhost/";
function urlPath(src) {
  return URL.canParse(src, URL_BASE) ? new URL(src, URL_BASE).pathname : null;
}
function isGsapCoreUrl(src) {
  return /\/gsap(-\d+(\.\d+)*)?(\.min)?\.js$/i.test(urlPath(src) ?? "");
}
var GSAP_PLUGIN_FILE = /\/(\w+Plugin|CustomBounce|CustomEase|CustomWiggle|Draggable|EasePack|Flip|GSDevTools|MotionPathHelper|Observer|ScrollSmoother|ScrollTrigger|SplitText)(\.min)?\.js$/i;
function isGsapPluginUrl(src) {
  const path = urlPath(src);
  if (!path || isGsapCoreUrl(src)) return false;
  return GSAP_PLUGIN_FILE.test(path) || /\/gsap(@[^/]*)?\/(.+\/)?[^/]+\.js$/i.test(path);
}
var TEMPLATE_ELEMENT = /<template\b[^>]*>[\s\S]*?<\/template>/gi;
var SCRIPT_SRC = /<script\b[^>]*?\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
var INLINED_MARKER = /\/\*\s*inlined:\s*(\S+)\s*\*\//gi;
var CORE_LICENSE_BANNER = /\/\*!\s*\*\s*GSAP\s+\d/;
var PLUGIN_LICENSE_BANNER = /\/\*!\s*\*\s*(?!GSAP\s)\w+\s+\d[^*]*\*\s*https:\/\/gsap\.com/;
var CORE_BODY = /Missing plugin\? gsap\.registerPlugin\(\)/;
function scriptUrls(html) {
  const srcs = [...html.matchAll(SCRIPT_SRC)].map(
    (m) => (m[1] ?? m[2] ?? m[3] ?? "").replace(/&amp;/gi, "&")
  );
  return [...srcs, ...[...html.matchAll(INLINED_MARKER)].map((m) => m[1] ?? "")];
}
function htmlHasGsapCore(html) {
  const live = html.replace(TEMPLATE_ELEMENT, "");
  return scriptUrls(live).some(isGsapCoreUrl) || CORE_LICENSE_BANNER.test(live) || CORE_BODY.test(live);
}
function isGsapPluginScript(script) {
  return scriptUrls(script).some(isGsapPluginUrl) || PLUGIN_LICENSE_BANNER.test(script);
}
function insertGsapCoreBeforeHeadPlugin(html, coreTag) {
  const lowered = html.toLowerCase();
  const at = findStartTags(html, "script").find((start) => {
    const close = lowered.indexOf("</script", start);
    return isGsapPluginScript(html.slice(start, close === -1 ? void 0 : close));
  });
  if (at === void 0 || insertBeforeCloseTag(html.slice(0, at), "head", "") !== null) return null;
  return `${html.slice(0, at)}${coreTag}
${html.slice(at)}`;
}

// src/helpers/rootPaths.ts
import { mapStartTagsAndStyles } from "@hyperframes/core/compiler/html-document";
var ROOT_PATH = /^\/(?!\/)/;
var PATH_ATTR = /(\s(?:src|href|poster|xlink:href)\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
var CSS_ROOT_URL = /(\burl\(\s*)(["']?)(\/(?!\/)[^"')\s]*)\2/gi;
var projectRelative = (path, base) => ROOT_PATH.test(path) && path !== "/" && !path.startsWith(base) ? path.slice(1) : path;
var underBase = (path, base) => {
  const relative5 = projectRelative(path, base);
  return relative5 === path ? path : base + relative5;
};
function withRootPathsRelative(html, base) {
  const css = (text2) => text2.replace(
    CSS_ROOT_URL,
    (_m, open2, quote, path) => `${open2}${quote}${projectRelative(path, base)}${quote}`
  );
  const attrs = (tag) => tag.replace(PATH_ATTR, (whole, name, dq, sq, bare) => {
    const path = (dq ?? sq ?? bare ?? "").trim();
    const moved = projectRelative(path, base);
    if (moved === path) return whole;
    return dq !== void 0 ? `${name}"${moved}"` : sq !== void 0 ? `${name}'${moved}'` : `${name}${moved}`;
  });
  return mapStartTagsAndStyles(html, {
    tag: (tag) => /^<(?:a|base)[\s/>]/i.test(tag) ? tag : css(attrs(tag)),
    style: css
  });
}

// src/helpers/subComposition.ts
function rewriteRelativePaths(root, compPath, projectDir) {
  const assetExists = (path) => existsSync(join2(projectDir, path));
  rewriteAssetPaths(
    root.querySelectorAll("[src], [href], [srcset]"),
    compPath,
    (el, attr) => el.getAttribute(attr),
    (el, attr, value) => el.setAttribute(attr, value),
    assetExists
  );
  rewriteInlineStyleAssetUrls(
    root.querySelectorAll("[style]"),
    compPath,
    (el) => el.getAttribute("style"),
    (el, value) => el.setAttribute("style", value),
    assetExists
  );
  for (const styleEl of root.querySelectorAll("style")) {
    styleEl.textContent = rewriteCssAssetUrls(styleEl.textContent || "", compPath, assetExists);
  }
}
function escapeLeadingDigitIdent(id) {
  return `\\${id.charCodeAt(0).toString(16)} ${id.slice(1)}`;
}
var REGEXP_SPECIALS = /[.*+?^${}()|[\]\\]/g;
function fixDigitLeadingIdSelectors(root) {
  const digitIds = /* @__PURE__ */ new Set();
  for (const el of root.querySelectorAll("[id]")) {
    const id = el.getAttribute("id");
    if (id && /^\d/.test(id)) digitIds.add(id);
  }
  if (digitIds.size === 0) return;
  for (const styleEl of root.querySelectorAll("style")) {
    let css = styleEl.textContent || "";
    for (const id of digitIds) {
      const pattern = new RegExp(`#${id.replace(REGEXP_SPECIALS, "\\$&")}(?![\\w-])`, "g");
      css = css.replace(pattern, `#${escapeLeadingDigitIdent(id)}`);
    }
    styleEl.textContent = css;
  }
}
function extractFullDocumentParts(rawHtml, compPath, projectDir) {
  const { document: doc } = parseHTML(rawHtml);
  const rewriteTargets = [doc.head, doc.body].filter(Boolean);
  for (const target of rewriteTargets) {
    rewriteRelativePaths(target, compPath, projectDir);
  }
  fixDigitLeadingIdSelectors(doc);
  const headContent = doc.head?.innerHTML ?? "";
  const bodyContent = doc.body?.innerHTML ?? "";
  const htmlEl = doc.documentElement;
  const htmlAttrs = extractElementAttrs(htmlEl);
  const bodyAttrs = doc.body ? extractElementAttrs(doc.body) : "";
  return { headContent, bodyContent, htmlAttrs, bodyAttrs };
}
function extractTemplateInnerHtml(rawComp) {
  const { document: doc } = parseHTML(rawComp);
  const template = doc.querySelector("template");
  return template ? template.innerHTML : null;
}
function escapeAttrValue(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function extractElementAttrs(el) {
  const parts = [];
  for (let i = 0; i < el.attributes.length; i++) {
    const attr = el.attributes[i];
    if (attr.value === "") {
      parts.push(attr.name);
    } else {
      parts.push(`${attr.name}="${escapeAttrValue(attr.value)}"`);
    }
  }
  return parts.join(" ");
}
var NON_RENDERED_TAGS = /* @__PURE__ */ new Set(["SCRIPT", "STYLE", "LINK", "META", "TEMPLATE", "NOSCRIPT"]);
function promoteTemplateCompositionId(rawComp, body) {
  let templateCompositionId;
  for (const tag of rawComp.matchAll(/<template\b[^>]*/gi)) {
    const id = /\bdata-composition-id\s*=\s*["']([^"']+)["']/i.exec(tag[0] ?? "")?.[1];
    if (id) {
      templateCompositionId = id;
      break;
    }
  }
  if (!templateCompositionId) return;
  if (body.querySelector("[data-composition-id]")) return;
  const root = Array.from(body.children).find((el) => !NON_RENDERED_TAGS.has(el.tagName));
  root?.setAttribute("data-composition-id", templateCompositionId);
}
function tagRootCompositionFile(bodyHtml, compPath) {
  const match = bodyHtml.match(/<[a-zA-Z][^>]*\bdata-composition-id=/);
  if (match?.index == null) return bodyHtml;
  const tagEnd = bodyHtml.indexOf(">", match.index);
  if (tagEnd === -1) return bodyHtml;
  if (bodyHtml.slice(match.index, tagEnd).includes("data-composition-file")) return bodyHtml;
  return bodyHtml.slice(0, tagEnd) + ` data-composition-file="${compPath}"` + bodyHtml.slice(tagEnd);
}
function rootHeadContent(rootHtml) {
  return rootHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
}
function buildSubCompositionHtml(projectDir, compPath, runtimeUrl, baseHref, rawOverride, gsapBaseUrl) {
  const compFile = join2(projectDir, compPath);
  if (!existsSync(compFile)) return null;
  const rawComp = rawOverride ?? readFileSync(compFile, "utf-8");
  let compHeadContent = "";
  let rewrittenContent;
  let htmlAttrs = "";
  let bodyAttrs = "";
  const templateInner = extractTemplateInnerHtml(rawComp);
  if (templateInner != null) {
    const { document: contentDoc } = parseHTML(
      `<!DOCTYPE html><html><head></head><body>${templateInner}</body></html>`
    );
    rewriteRelativePaths(contentDoc, compPath, projectDir);
    fixDigitLeadingIdSelectors(contentDoc);
    promoteTemplateCompositionId(rawComp, contentDoc.body);
    rewrittenContent = contentDoc.body.innerHTML || templateInner;
  } else if (isFullHtmlDocument(rawComp)) {
    const parts = extractFullDocumentParts(rawComp, compPath, projectDir);
    compHeadContent = parts.headContent;
    rewrittenContent = parts.bodyContent;
    htmlAttrs = parts.htmlAttrs;
    bodyAttrs = parts.bodyAttrs;
  } else {
    const { document: contentDoc } = parseHTML(
      `<!DOCTYPE html><html><head></head><body>${rawComp}</body></html>`
    );
    rewriteRelativePaths(contentDoc, compPath, projectDir);
    fixDigitLeadingIdSelectors(contentDoc);
    rewrittenContent = contentDoc.body.innerHTML || rawComp;
  }
  rewrittenContent = stripEmbeddedRuntimeScripts(rewrittenContent);
  const { document: scriptsDoc } = parseHTML(
    `<!DOCTYPE html><html><head></head><body>${rewrittenContent}</body></html>`
  );
  deferScriptsUntilFonts(scriptsDoc);
  rewrittenContent = scriptsDoc.body.innerHTML;
  rewrittenContent = tagRootCompositionFile(rewrittenContent, compPath);
  const indexPath = join2(projectDir, "index.html");
  let headContent = "";
  if (existsSync(indexPath)) headContent = rootHeadContent(readFileSync(indexPath, "utf-8"));
  if (baseHref && !hasBaseElement(headContent)) {
    headContent = `<base href="${baseHref}">
${headContent}`;
  }
  if (compHeadContent) headContent += `
${compHeadContent}`;
  if (baseHref) {
    headContent = withRootPathsRelative(headContent, baseHref);
    rewrittenContent = withRootPathsRelative(rewrittenContent, baseHref);
  }
  headContent = stripEmbeddedRuntimeScripts(headContent);
  headContent += `
<script ${RUNTIME_BOOTSTRAP_ATTR}="1" src="${runtimeUrl}"></script>`;
  if (!htmlHasGsapCore(headContent)) {
    const core = `<script src="${gsapCdnDist(void 0, gsapBaseUrl).replace(/&/g, "&amp;")}gsap.min.js"></script>`;
    headContent = insertGsapCoreBeforeHeadPlugin(headContent, core) ?? `${headContent}
${core}`;
  }
  const htmlOpen = htmlAttrs ? `<html ${htmlAttrs}>` : "<html>";
  const bodyOpen = bodyAttrs ? `<body ${bodyAttrs}>` : "<body>";
  return `<!DOCTYPE html>
${htmlOpen}
<head>
${headContent}
</head>
${bodyOpen}
<script>window.__timelines=window.__timelines||{};</script>
${rewrittenContent}
</body>
</html>`;
}
function hasBaseElement(html) {
  return findStartTags2(html, "base").length > 0;
}

// src/helpers/compositionInsertion.ts
import { existsSync as existsSync2 } from "fs";
import { readProjectFile } from "@hyperframes/parsers/asset-resolution";
import { randomUUID } from "crypto";
import { dirname, relative, resolve, sep } from "path";
import { parseHTML as parseHTML2 } from "linkedom";
import { ProjectRootMissingError } from "@hyperframes/core";
var CompositionInsertionError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
  status;
};
function descendants(root, selector) {
  const found = Array.from(root.querySelectorAll(selector));
  for (const template of root.querySelectorAll("template")) {
    found.push(...descendants(template, selector));
  }
  return [...new Set(found)];
}
function compositionRoot(source) {
  const document = parseHTML2(source).document;
  const root = descendants(document, "[data-composition-id]")[0];
  if (!root) throw new CompositionInsertionError("Composition source has no root", 400);
  return { document, root };
}
function positiveAttribute(root, ...names) {
  for (const name of names) {
    const value = Number.parseFloat(root.getAttribute(name) ?? "");
    if (Number.isFinite(value) && value > 0) return value;
  }
  throw new CompositionInsertionError(`Composition source has no valid ${names[0]}`, 400);
}
function canonicalProjectPath(projectDir, candidate) {
  if (!candidate) {
    if (folderGone(projectDir)) throw new ProjectRootMissingError(projectDir);
    throw new CompositionInsertionError("Composition source escapes the project", 400);
  }
  if (!existsSync2(candidate)) {
    throw new CompositionInsertionError("Composition source was not found", 404);
  }
  const canonical = realpath(candidate);
  if (!isSafePath(realpath(projectDir), canonical)) {
    throw new CompositionInsertionError("Composition source escapes the project", 400);
  }
  return canonical;
}
function readCompositionSource(file) {
  const read = readProjectFile(file);
  if (read.kind === "folder") {
    throw new CompositionInsertionError("Composition source is a folder, not an HTML file", 400);
  }
  if (read.kind === "missing") {
    throw new CompositionInsertionError("Composition source was not found", 404);
  }
  return read.text;
}
function validateSourcePath(sourcePath) {
  if (!sourcePath.trim() || sourcePath.includes("\0") || /^[a-z]+:/i.test(sourcePath)) {
    throw new CompositionInsertionError("Invalid composition source path", 400);
  }
}
function canonicalProjectFile(projectDir, sourcePath) {
  validateSourcePath(sourcePath);
  return canonicalProjectPath(projectDir, resolveWithinProject(projectDir, sourcePath));
}
function canonicalDependency(projectDir, ownerAbs, sourcePath) {
  validateSourcePath(sourcePath);
  return canonicalProjectPath(
    projectDir,
    resolveWithinProject(projectDir, relative(projectDir, resolve(dirname(ownerAbs), sourcePath)))
  );
}
function validateDependencyGraph(projectDir, targetAbs, sourceAbs) {
  const visited = /* @__PURE__ */ new Set();
  const visiting = /* @__PURE__ */ new Set();
  const visit = (file) => {
    if (file === targetAbs) {
      throw new CompositionInsertionError("Composition insertion would create a cycle", 400);
    }
    if (visiting.has(file)) {
      throw new CompositionInsertionError("Composition dependency cycle detected", 400);
    }
    if (visited.has(file)) return;
    visiting.add(file);
    const source = readCompositionSource(file);
    const { document } = compositionRoot(source);
    for (const host of descendants(document, "[data-composition-src]")) {
      const dependency = host.getAttribute("data-composition-src");
      if (dependency) {
        visit(canonicalDependency(projectDir, file, dependency));
      }
    }
    visiting.delete(file);
    visited.add(file);
  };
  visit(sourceAbs);
}
function numberAttribute(element, name, fallback = 0) {
  const value = Number.parseFloat(element.getAttribute(name) ?? "");
  return Number.isFinite(value) ? value : fallback;
}
function rangesOverlap(start, duration, other) {
  const otherStart = numberAttribute(other, "data-start");
  const otherDuration = numberAttribute(other, "data-duration");
  return start < otherStart + otherDuration && otherStart < start + duration;
}
function resolveTrack(root, desiredTrack, start, duration) {
  const clips = descendants(root, "[data-start][data-duration]").filter(
    (element) => element !== root && element.parentElement?.closest("[data-composition-id]") === root
  );
  const tracks = [...new Set(clips.map((clip) => numberAttribute(clip, "data-track-index")))].sort(
    (a, b) => a - b
  );
  const isFree = (track) => !clips.some(
    (clip) => numberAttribute(clip, "data-track-index") === track && rangesOverlap(start, duration, clip)
  );
  if (isFree(desiredTrack)) return desiredTrack;
  const row = tracks.indexOf(desiredTrack);
  for (let index = row - 1; index >= 0; index--) {
    const track = tracks[index];
    if (track !== void 0 && isFree(track)) return track;
  }
  for (let index = Math.max(0, row + 1); index < tracks.length; index++) {
    const track = tracks[index];
    if (track !== void 0 && isFree(track)) return track;
  }
  return Math.max(desiredTrack, ...tracks, -1) + 1;
}
function uniqueHostId(root, base) {
  const ids = /* @__PURE__ */ new Set([
    ...[root, ...descendants(root, "[id]")].map((element) => element.id),
    ...[root, ...descendants(root, "[data-composition-id]")].flatMap((element) => {
      const id = element.getAttribute("data-composition-id");
      return id ? [id] : [];
    })
  ]);
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}
function relativeSourcePath(targetAbs, sourceAbs) {
  return relative(dirname(targetAbs), sourceAbs).split(sep).join("/");
}
function insertCompositionIntoSource(input) {
  const targetAbs = canonicalProjectFile(input.projectDir, input.targetPath);
  const sourceAbs = canonicalProjectFile(input.projectDir, input.sourcePath);
  validateDependencyGraph(input.projectDir, targetAbs, sourceAbs);
  const source = readCompositionSource(sourceAbs);
  const sourceComposition = compositionRoot(source).root;
  const duration = positiveAttribute(
    sourceComposition,
    "data-composition-duration",
    "data-duration"
  );
  const width = positiveAttribute(sourceComposition, "data-width");
  const height = positiveAttribute(sourceComposition, "data-height");
  const { document, root } = compositionRoot(input.parentSource);
  const parentDuration = positiveAttribute(root, "data-duration", "data-composition-duration");
  const sourceCompositionId = sourceComposition.getAttribute("data-composition-id") ?? "";
  const base = (sourceCompositionId || "composition").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "composition";
  const hostId = uniqueHostId(root, base);
  const track = resolveTrack(
    root,
    Math.max(0, Math.round(input.desiredTrack)),
    input.start,
    duration
  );
  const zIndex = Math.max(
    0,
    ...descendants(root, "[style]").map((element) => {
      const match = /(?:^|;)\s*z-index\s*:\s*(-?\d+)/i.exec(element.getAttribute("style") ?? "");
      return match?.[1] ? Number.parseInt(match[1], 10) : 0;
    })
  ) + 1;
  const host = document.createElement("div");
  host.id = hostId;
  host.className = "clip";
  host.setAttribute("data-hf-id", `hf-${randomUUID()}`);
  const mountedRootId = sourceCompositionId || hostId;
  host.setAttribute("data-composition-id", mountedRootId);
  host.setAttribute("data-composition-src", relativeSourcePath(targetAbs, sourceAbs));
  host.setAttribute("data-start", String(Math.round(input.start * 100) / 100));
  host.setAttribute("data-duration", String(duration));
  host.setAttribute("data-playback-start", "0");
  host.setAttribute("data-track-index", String(track));
  host.setAttribute("data-width", String(width));
  host.setAttribute("data-height", String(height));
  host.setAttribute(
    "style",
    `position: absolute; left: 0px; top: 0px; width: ${width}px; height: ${height}px; z-index: ${zIndex}`
  );
  root.appendChild(host);
  if (input.start + duration > parentDuration) {
    const name = root.hasAttribute("data-duration") ? "data-duration" : "data-composition-duration";
    root.setAttribute(name, String(Math.round((input.start + duration) * 100) / 100));
  }
  return { html: document.toString(), hostId, track, duration };
}

// src/helpers/compositionInputs.ts
var ROOT_COMPOSITION = "index.html";
var COMPOSITION_SRC = /\bdata-composition-src\s*=\s*(["'])(.*?)\1/g;
function projectReader(projectDir) {
  const sources = /* @__PURE__ */ new Map();
  return (compPath) => {
    if (!sources.has(compPath)) {
      const file = resolveWithinProject(projectDir, compPath);
      let source = null;
      try {
        source = file ? readFileSync2(file, "utf-8") : null;
      } catch {
      }
      sources.set(compPath, source);
    }
    return sources.get(compPath) ?? null;
  };
}
function normalizeSource(src) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("//")) return null;
  const path = src.split(/[?#]/)[0]?.replace(/^\.?\//, "") ?? "";
  return path || null;
}
function closureOf(read, compPath) {
  const closure = /* @__PURE__ */ new Set();
  const visit = (path) => {
    if (closure.has(path)) return;
    closure.add(path);
    for (const match of (read(path) ?? "").matchAll(COMPOSITION_SRC)) {
      const mounted = normalizeSource(match[2] ?? "");
      if (mounted) visit(mounted);
    }
  };
  visit(compPath);
  return closure;
}
function lengthIsTimeline(projectDir, compPath) {
  const read = projectReader(projectDir);
  const documents = /* @__PURE__ */ new Map();
  const elements = (path, selector) => {
    let document = documents.get(path);
    if (!document) documents.set(path, document = parseHTML3(read(path) ?? "").document);
    return descendants(document, selector);
  };
  const comp = normalizeSource(compPath) ?? compPath;
  const unsized = (path) => {
    const [root] = elements(path, "[data-composition-id]");
    return Boolean(root && !root.hasAttribute("data-duration"));
  };
  if (unsized(ROOT_COMPOSITION)) return true;
  const hosts = [...closureOf(read, ROOT_COMPOSITION)].flatMap(
    (path) => elements(path, "[data-composition-src]").filter(
      (host) => normalizeSource(host.getAttribute("data-composition-src") ?? "") === comp
    )
  );
  if (comp === ROOT_COMPOSITION || hosts.length === 0) return unsized(comp);
  return hosts.some(
    (host) => !host.hasAttribute("data-duration") && !host.hasAttribute("data-end")
  );
}
var inputSignatures = /* @__PURE__ */ new Map();
var rootMemos = /* @__PURE__ */ new Map();
var sha1 = (text2) => createHash("sha1").update(text2).digest("hex");
function rootHashes(read) {
  const source = read(ROOT_COMPOSITION) ?? "";
  return { root: sha1(source), head: sha1(rootHeadContent(source)) };
}
async function compositionInputSignature(projectDir, compPath, projectSignature) {
  const key = `${projectDir}\0${compPath}`;
  const known = inputSignatures.get(key);
  if (known?.projectSignature === projectSignature) return known.inputSignature;
  const read = projectReader(projectDir);
  const comp = normalizeSource(compPath) ?? compPath;
  const inputs = closureOf(read, comp).add(ROOT_COMPOSITION);
  const excluded = new Set(
    [...closureOf(read, ROOT_COMPOSITION)].filter((path) => !inputs.has(path))
  );
  let inputSignature;
  if (comp === ROOT_COMPOSITION) {
    inputSignature = await createProjectSignatureAsync(projectDir, excluded);
  } else {
    const hashes = rootHashes(read);
    if (!rootMemos.has(projectDir)) rootMemos.set(projectDir, { ...hashes, affected: null });
    const rest = await createProjectSignatureAsync(projectDir, excluded.add(ROOT_COMPOSITION));
    inputSignature = `${rest}:${hashes.head}`;
  }
  inputSignatures.set(key, { projectSignature, inputSignature });
  return inputSignature;
}
function compositionsAffectedBy(projectDir, changedPath) {
  const changed = changedPath.replace(/\\/g, "/");
  const read = projectReader(projectDir);
  if (changed === ROOT_COMPOSITION) {
    const now = rootHashes(read);
    const memo = rootMemos.get(projectDir);
    if (memo?.root === now.root) return memo.affected;
    const affected = memo?.head === now.head ? [ROOT_COMPOSITION] : null;
    rootMemos.set(projectDir, { ...now, affected });
    return affected;
  }
  const mounted = closureOf(read, ROOT_COMPOSITION);
  if (!mounted.has(changed)) return null;
  return [...mounted].filter((path) => closureOf(read, path).has(changed));
}

// src/routes/files.ts
import { createFileAtomically, replaceFileAtomically as replaceFileAtomically2 } from "@hyperframes/core/atomic-file";

// src/helpers/waveform.ts
import { spawn } from "child_process";
import {
  existsSync as existsSync3,
  writeFileSync,
  mkdirSync,
  lstatSync,
  mkdtempSync,
  renameSync,
  rmSync,
  statSync
} from "fs";
import { dirname as dirname2, join as join3 } from "path";
import { findFfBinary } from "@hyperframes/parsers/ff-binaries";
var SAMPLE_RATE = 4e3;
var PEAK_COUNT = 4e3;
var WAVEFORM_CACHE_VERSION = "v2";
function buildWaveformCacheKey(assetPath, fingerprint) {
  const name = assetPath.replace(/[/\\]/g, "_");
  if (!fingerprint) return `${WAVEFORM_CACHE_VERSION}_${name}.json`;
  const stamp = `${fingerprint.size}-${Math.round(fingerprint.mtimeMs)}`;
  return `${WAVEFORM_CACHE_VERSION}_${name}_${stamp}.json`;
}
function computePeaks(floats, count) {
  const step = floats.length / count;
  const peaks = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * step);
    const end = Math.min(Math.floor((i + 1) * step), floats.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(floats[j] ?? 0);
      if (abs > max) max = abs;
    }
    peaks.push(max);
  }
  const maxPeak = Math.max(...peaks, 1e-3);
  return peaks.map((p) => p / maxPeak);
}
async function decodeAudioPeaks(audioPath) {
  const track = await probeAudioTrack(audioPath);
  if (!track) throw new Error("no audio stream");
  return new Promise((resolvePromise, reject) => {
    const proc = spawn(
      findFfBinary("ffmpeg") ?? "ffmpeg",
      [
        "-i",
        audioPath,
        "-map",
        `0:a:${track.stream}`,
        "-af",
        "atrim=start_sample=1152",
        "-f",
        "f32le",
        "-ac",
        "1",
        "-ar",
        String(SAMPLE_RATE),
        "-vn",
        "pipe:1"
      ],
      { stdio: ["ignore", "pipe", "ignore"], windowsHide: true }
    );
    const chunks = [];
    proc.stdout?.on("data", (chunk) => chunks.push(chunk));
    proc.on("close", (code) => {
      if (code !== 0 && chunks.length === 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      const buf = Buffer.concat(chunks);
      const numSamples = Math.floor(buf.length / 4);
      if (numSamples === 0) {
        reject(new Error("ffmpeg produced no audio samples"));
        return;
      }
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + numSamples * 4);
      resolvePromise(computePeaks(new Float32Array(ab), PEAK_COUNT));
    });
    proc.on("error", reject);
  });
}
async function generateWaveformCache(projectDir, assetPath) {
  const audioPath = join3(projectDir, assetPath);
  if (!existsSync3(audioPath)) return;
  const stats = statSync(audioPath);
  const cacheDir = join3(projectDir, ".waveform-cache");
  const cachePath = join3(cacheDir, buildWaveformCacheKey(assetPath, stats));
  if (isWaveformCacheDirectory(cacheDir) && existsSync3(cachePath)) return;
  const peaks = await decodeAudioPeaks(audioPath);
  writeWaveformCache(cachePath, peaks);
}
function isWaveformCacheDirectory(cacheDir) {
  return lstatSync(cacheDir, { throwIfNoEntry: false })?.isDirectory() ?? false;
}
function writeWaveformCache(cachePath, peaks) {
  const cacheDir = dirname2(cachePath);
  try {
    mkdirSync(cacheDir, { mode: 448 });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  }
  if (!isWaveformCacheDirectory(cacheDir)) {
    throw new Error("Waveform cache must be a directory, not a symlink");
  }
  const stagingDir = mkdtempSync(join3(cacheDir, ".waveform-"));
  try {
    const stagingPath = join3(stagingDir, "peaks.json");
    writeFileSync(stagingPath, JSON.stringify(peaks), { flag: "wx" });
    renameSync(stagingPath, cachePath);
  } finally {
    try {
      rmSync(stagingDir, { recursive: true, force: true });
    } catch {
    }
  }
}

// src/helpers/mediaValidation.ts
import { spawnSync } from "child_process";
import { mkdtempSync as mkdtempSync2, rmSync as rmSync2, writeFileSync as writeFileSync2 } from "fs";
import { tmpdir } from "os";
import { basename, join as join4 } from "path";
import { FFPROBE_PATH_ENV, findFfBinary as findFfBinary2 } from "@hyperframes/parsers/ff-binaries";
import { decodableAudioStream } from "@hyperframes/parsers/media-streams";
var VIDEO_EXT = /\.(mp4|webm|mov|mkv|avi|m4v|mxf|mts|m2ts|ts)$/i;
var AUDIO_EXT = /\.(mp3|wav|ogg|m4a|aac|flac)$/i;
var defaultRunner = spawnSync;
var FFPROBE_MISSING = "not checked: ffprobe was not found. Install FFmpeg or set HYPERFRAMES_FFPROBE_PATH.";
function validateUploadedMedia(filePath, runner = defaultRunner) {
  const isVideo = VIDEO_EXT.test(filePath);
  const isAudio = AUDIO_EXT.test(filePath);
  if (!isVideo && !isAudio) {
    return { ok: true };
  }
  const ffprobe = findFfBinary2("ffprobe") ?? (runner === defaultRunner ? void 0 : "ffprobe");
  if (!ffprobe) return { ok: true, unchecked: FFPROBE_MISSING };
  const result = runner(
    ffprobe,
    ["-v", "error", "-show_entries", "stream=codec_type,codec_name", "-of", "json", "--", filePath],
    { windowsHide: true }
  );
  if (result.error && process.env[FFPROBE_PATH_ENV]?.trim()) {
    return {
      ok: false,
      reason: `${FFPROBE_PATH_ENV} names "${ffprobe}", which cannot run: fix it or unset it`
    };
  }
  if (result.error?.code === "ENOENT") {
    return { ok: true, unchecked: FFPROBE_MISSING };
  }
  if (result.status !== 0) {
    return { ok: false, reason: "ffprobe failed to read the media file" };
  }
  return checkStreams(String(result.stdout || "{}"), isVideo, isAudio);
}
function checkStreams(stdout, isVideo, isAudio) {
  try {
    const parsed = JSON.parse(stdout);
    const streams = parsed.streams ?? [];
    const hasVideo = streams.some((stream) => stream.codec_type === "video");
    const hasAudio = decodableAudioStream(streams) !== null;
    if (isVideo && !hasVideo) {
      return { ok: false, reason: "no supported video stream found" };
    }
    if (isAudio && !hasAudio) {
      return { ok: false, reason: "no supported audio stream found" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "ffprobe returned unreadable media metadata" };
  }
}
function validateUploadedMediaBuffer(fileName, buffer, runner = defaultRunner) {
  const tempDir = mkdtempSync2(join4(tmpdir(), "hyperframes-upload-"));
  const tempPath = join4(tempDir, basename(fileName));
  try {
    writeFileSync2(tempPath, buffer);
    return validateUploadedMedia(tempPath, runner);
  } finally {
    rmSync2(tempDir, { recursive: true, force: true });
  }
}

// src/helpers/backupJournal.ts
import { readdirSync, readFileSync as readFileSync3, unlinkSync, writeFileSync as writeFileSync3 } from "fs";
import { Buffer as Buffer2 } from "buffer";
import { createHash as createHash2 } from "crypto";
import { join as join5, relative as relative2 } from "path";
var DEFAULT_KEEP_PER_FILE = 10;
function timestampPrefix() {
  return (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
}
function backupPathForResponse(projectDir, backupPath) {
  if (!backupPath) return null;
  const rel = relative2(projectDir, backupPath);
  if (!rel || rel.startsWith("..")) return null;
  return rel.split("\\").join("/");
}
function snapshotBeforeWrite(projectDir, absPath, options = {}) {
  if (!isSafePath(projectDir, absPath)) return { backupPath: null };
  try {
    const content = readFileSync3(absPath);
    const relativePath = relative2(projectDir, absPath);
    const backupDir = join5(projectDir, ".hyperframes", "backup");
    mkdirWithinProject(projectDir, backupDir);
    const pathKey2 = Buffer2.from(relativePath, "utf-8").toString("base64url");
    const backupKey = pathKey2.length <= 200 ? pathKey2 : `sha256~${createHash2("sha256").update(relativePath).digest("hex")}`;
    const backupPath = nextBackupPath(backupDir, backupKey);
    writeFileSync3(backupPath, content);
    pruneBackups(backupDir, [pathKey2, backupKey], options.keepPerFile ?? DEFAULT_KEEP_PER_FILE);
    return { backupPath };
  } catch (error) {
    if (isProjectRootMissing(error)) throw error;
    if (error && typeof error === "object" && "code" in error && (error.code === "ENOENT" || error.code === "EISDIR")) {
      return { backupPath: null };
    }
    return { backupPath: null, error: error instanceof Error ? error.message : String(error) };
  }
}
function nextBackupPath(backupDir, backupKey) {
  const base = `${timestampPrefix()}-${backupKey}`;
  let candidate = join5(backupDir, base);
  let counter = 2;
  while (true) {
    try {
      readFileSync3(candidate);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        return candidate;
      }
      throw error;
    }
    candidate = join5(backupDir, `${base}-${counter}`);
    counter += 1;
  }
}
function pruneBackups(backupDir, backupKeys, keepPerFile) {
  const keep = Math.max(1, Math.floor(keepPerFile));
  const suffix = new RegExp(`-(?:${backupKeys.join("|")})(?:-\\d+)?$`);
  const matches = readdirSync(backupDir).filter((name) => suffix.test(name)).map((name) => join5(backupDir, name)).sort((a, b) => {
    return b.localeCompare(a);
  });
  for (const file of matches.slice(keep)) {
    try {
      unlinkSync(file);
    } catch {
    }
  }
}

// src/helpers/projectDirMissing.ts
var PROJECT_DIR_MISSING = { error: "not found", why: "project_dir_missing" };
var projectDirMissing = (c) => c.json(PROJECT_DIR_MISSING, 404);
function replaceWithProjectDirMissing(c, hostHeaders) {
  hostHeaders.delete("content-type");
  c.res = void 0;
  c.res = Response.json(PROJECT_DIR_MISSING, { status: 404, headers: hostHeaders });
}

// src/helpers/applyFileMutations.ts
import { readFileSync as readFileSync4, statSync as statSync2 } from "fs";
import { replaceFileAtomically } from "@hyperframes/core/atomic-file";
function applyFileMutations(projectDir, mutations, requestToken, writeFile = (path, content) => replaceFileAtomically(path, content, statSync2(path).mode)) {
  const prepared = mutations.map((mutation) => ({
    ...mutation,
    before: mutation.before ?? readFileSync4(mutation.absPath, "utf-8")
  }));
  const results = [];
  const attempted = [];
  for (const mutation of prepared)
    assertExpectedVersion(mutation, readFileSync4(mutation.absPath, "utf-8"));
  try {
    for (const mutation of prepared) {
      results.push(applyOneMutation(projectDir, mutation, requestToken, writeFile, attempted));
    }
    return results;
  } catch (error) {
    const rollbackErrors = rollBack(attempted, writeFile);
    if (rollbackErrors.length > 0) {
      throw new AggregateError(
        [error, ...rollbackErrors],
        "File mutation failed and rollback did not complete"
      );
    }
    throw error;
  }
}
function rollBack(attempted, writeFile) {
  const errors = [];
  for (const mutation of attempted.reverse()) {
    try {
      const current = readFileSync4(mutation.absPath, "utf-8");
      if (mutation.written ? current === mutation.after : current !== mutation.before)
        writeFile(mutation.absPath, mutation.before, "utf-8");
      clearFileWriteReceipt(mutation.absPath, mutation.version, mutation.writeToken);
    } catch (rollbackError) {
      errors.push(rollbackError);
    }
  }
  return errors;
}
function applyOneMutation(projectDir, mutation, requestToken, writeFile, attempted) {
  const current = readFileSync4(mutation.absPath, "utf-8");
  assertExpectedVersion(mutation, current);
  if (mutation.after === mutation.before) {
    return {
      ...mutation,
      before: current,
      changed: false,
      backupPath: null,
      version: fileContentVersion(mutation.before),
      writeToken: null
    };
  }
  const backup = snapshotBeforeWrite(projectDir, mutation.absPath);
  if (backup.error) throw new Error(`backup failed: ${backup.error}`);
  assertExpectedVersion(mutation, readFileSync4(mutation.absPath, "utf-8"));
  const before = current;
  const version = fileContentVersion(mutation.after);
  const writeToken = createWriteToken(requestToken);
  const attempt = { ...mutation, before, version, writeToken, written: false };
  attempted.push(attempt);
  writeFile(mutation.absPath, mutation.after, "utf-8");
  attempt.written = true;
  recordFileWriteReceipt(mutation.absPath, {
    path: mutation.sourceFile,
    version,
    writeToken,
    overwrote: before
  });
  return {
    ...mutation,
    before,
    changed: true,
    backupPath: backupPathForResponse(projectDir, backup.backupPath),
    version,
    writeToken
  };
}
var FileChangedError = class extends Error {
  constructor(sourceFile) {
    super("file changed since the timeline was read");
    this.sourceFile = sourceFile;
  }
  sourceFile;
};
function assertExpectedVersion(mutation, current) {
  const stale = mutation.expectedVersion === void 0 ? current !== mutation.before : fileContentVersion(current) !== mutation.expectedVersion;
  if (stale) throw new FileChangedError(mutation.sourceFile);
}

// src/routes/files.ts
import { classifyPropertyGroup } from "@hyperframes/parsers/gsap-constants";
import { findTimelineScript, parseGsapScriptAcorn } from "@hyperframes/parsers/gsap-parser-acorn";
import { unrollComputedTimeline } from "@hyperframes/parsers";
import {
  updateAnimationInScript,
  addAnimationToScript,
  removeAnimationFromScript,
  addKeyframeToScript,
  removeKeyframeFromScript,
  moveKeyframeInScript,
  resizeKeyframedTweenInScript,
  updateKeyframeInScript,
  convertToKeyframesFromScript,
  removeAllKeyframesFromScript,
  materializeKeyframesFromScript,
  unrollDynamicAnimations,
  setArcPathInScript,
  updateArcSegmentInScript,
  updateMotionPathPointInScript,
  addMotionPathPointInScript,
  removeMotionPathPointInScript,
  addMotionPathToScript,
  removeArcPathFromScript,
  addAnimationWithKeyframesToScript,
  replaceTweenWithKeyframesInScript,
  splitAnimationsInScript,
  splitIntoPropertyGroupsFromScript,
  retimeClipTweensInScript,
  dedupePositionWritesInScript,
  syncPositionHoldsBeforeKeyframes,
  trimTrailingKeyframeSpans,
  clipQueryRoot
} from "@hyperframes/parsers/gsap-writer-acorn";

// src/helpers/studioFontFace.ts
var FONT_STYLE_RE = /<style\b[^>]*data-hf-studio-fonts=(["'])true\1[^>]*>([\s\S]*?)<\/style>/i;
var ONE_FONT_FACE_RULE = /^@font-face \{(?:[^{}<"'\\]|"(?:[^"\\<\n\r\f]|\\[^<\n\r\f])*"|'(?:[^'\\<\n\r\f]|\\[^<\n\r\f])*')*\}$/;
function isStudioFontFaceCss(css) {
  return typeof css === "string" && ONE_FONT_FACE_RULE.test(css);
}
function ensureStudioFontFaceCss(html, css) {
  if (html.includes(css)) return html;
  const block = FONT_STYLE_RE.exec(html);
  if (block) {
    const next = `${(block[2] ?? "").trim()}
${css}`.trim();
    return html.replace(block[0], () => `<style data-hf-studio-fonts="true">
${next}
</style>`);
  }
  const styleTag = `<style data-hf-studio-fonts="true">
${css}
</style>`;
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, () => `  ${styleTag}
  </head>`);
  return `${styleTag}
${html}`;
}

// src/routes/files.ts
import { parseHTML as parseHTML4 } from "linkedom";
import { ensureHfIds } from "@hyperframes/parsers/hf-ids";

// src/routes/gsapMutationCapabilities.ts
var differential = (family) => ({
  family,
  acorn: "supported",
  recast: "supported",
  parity: "differential"
});
var behavioral = (family) => ({
  family,
  acorn: "supported",
  recast: "supported",
  parity: "behavioral"
});
var GSAP_MUTATION_CAPABILITIES = {
  "update-property": differential("animation"),
  "update-properties": differential("animation"),
  "update-from-property": differential("animation"),
  "update-meta": differential("animation"),
  add: differential("animation"),
  delete: differential("animation"),
  "add-property": differential("animation"),
  "add-from-property": differential("animation"),
  "remove-property": differential("animation"),
  "remove-from-property": differential("animation"),
  "add-keyframe": differential("keyframe"),
  "remove-keyframe": differential("keyframe"),
  "move-keyframe": behavioral("keyframe"),
  "resize-keyframed-tween": behavioral("keyframe"),
  "update-keyframe": differential("keyframe"),
  "convert-to-keyframes": behavioral("keyframe"),
  "remove-all-keyframes": behavioral("keyframe"),
  "materialize-keyframes": behavioral("keyframe"),
  "set-arc-path": behavioral("motion_path"),
  "update-arc-segment": behavioral("motion_path"),
  "update-motion-path-point": differential("motion_path"),
  "add-motion-path-point": differential("motion_path"),
  "remove-motion-path-point": differential("motion_path"),
  "add-motion-path": differential("motion_path"),
  "remove-arc-path": behavioral("motion_path"),
  "add-with-keyframes": behavioral("keyframe"),
  "replace-with-keyframes": behavioral("keyframe"),
  "split-animations": behavioral("structure"),
  "split-into-property-groups": behavioral("structure"),
  "delete-all-for-selector": behavioral("structure"),
  "consolidate-position-writes": behavioral("structure"),
  "unroll-timeline": behavioral("structure"),
  "shift-positions": behavioral("timing"),
  "shift-positions-batch": behavioral("timing"),
  "scale-positions": behavioral("timing")
};
var GSAP_WRITER_MIGRATION = Object.freeze({
  flag: "HYPERFRAMES_GSAP_WRITER",
  owner: "studio-foundations",
  deadline: "2026-09-30",
  graduationCriteria: "Acorn is the default writer. Recast is retained one watch window as HYPERFRAMES_GSAP_WRITER=recast, then deleted (spec 2026-09-17 \xA75)."
});
function resolveGsapWriter(env) {
  const configured = env.HYPERFRAMES_GSAP_WRITER ?? "acorn";
  if (configured === "recast" || configured === "acorn") return configured;
  throw new Error(`Invalid ${GSAP_WRITER_MIGRATION.flag}=${configured}; expected recast or acorn`);
}

// src/routes/files.ts
import {
  hasCompositionOutsideTemplates,
  insertBeforeCloseTag as insertBeforeCloseTag2
} from "@hyperframes/core/compiler/html-document";
async function loadGsapParser() {
  return import("@hyperframes/parsers/gsap-parser-recast");
}
function isDanglingSymlinkInProject(projectDir, lexicalPath) {
  if (!isSafePath(projectDir, dirname3(lexicalPath))) return false;
  let stats;
  try {
    stats = lstatSync2(lexicalPath);
  } catch {
    return false;
  }
  if (!stats.isSymbolicLink()) return false;
  const target = resolve2(dirname3(lexicalPath), readlinkSync(lexicalPath));
  if (!isSafePath(projectDir, target)) return false;
  try {
    statSync3(lexicalPath);
    return false;
  } catch {
    return true;
  }
}
async function resolveProjectPath(c, adapter, route, opts) {
  const id = c.req.param("id");
  const project = await adapter.resolveProject(id);
  if (!project) {
    return { error: c.json({ error: "not found" }, 404) };
  }
  if (folderGone(project.dir)) {
    return { error: projectDirMissing(c) };
  }
  const filePath = requestSubPath(c.req.url, `projects/:id/${route}`);
  if (filePath.includes("\0")) {
    return { error: c.json({ error: "forbidden", why: "nul" }, 403) };
  }
  const absPath = (opts?.pin ? pinWithinProject : resolveWithinProject)(project.dir, filePath);
  if (!absPath) {
    if (isDanglingSymlinkInProject(project.dir, resolve2(project.dir, filePath))) {
      return { error: c.json({ error: "not found", why: "dangling_symlink" }, 404) };
    }
    return { error: c.json({ error: "forbidden", why: "outside_project" }, 403) };
  }
  if (opts?.mustExist && !existsSync4(absPath)) {
    return { error: c.json({ error: "not found" }, 404) };
  }
  return { project, filePath, absPath };
}
function resolveProjectFile(c, adapter, opts) {
  return resolveProjectPath(c, adapter, "files", opts);
}
function resolveFileMutationContext(c, adapter, operation) {
  return resolveProjectPath(c, adapter, `file-mutations/${operation}`, { pin: true });
}
function isOptionalInteger(value) {
  return value === void 0 || Number.isInteger(value);
}
function isAtomicCutTarget(value) {
  if (!value || typeof value !== "object") return false;
  const target = value;
  return !!target.target && typeof target.target === "object" && Number.isFinite(target.splitTime) && Number.isFinite(target.elementStart) && Number.isFinite(target.elementDuration) && Number(target.elementDuration) > 0 && isOptionalInteger(target.track);
}
function isAtomicCutFileRequest(value) {
  if (!value || typeof value !== "object") return false;
  const file = value;
  return typeof file.path === "string" && file.path.length > 0 && typeof file.expectedVersion === "string" && Array.isArray(file.targets) && file.targets.length > 0 && file.targets.every(isAtomicCutTarget);
}
var atomicCutTail = Promise.resolve();
function serializeAtomicCut(task) {
  const next = atomicCutTail.then(task, task);
  atomicCutTail = next.then(
    () => void 0,
    () => void 0
  );
  return next;
}
function isElementPatchRequest(value) {
  if (typeof value !== "object" || value === null) return false;
  if (!("target" in value) || typeof value.target !== "object" || value.target === null) {
    return false;
  }
  return "operations" in value && Array.isArray(value.operations) && value.operations.length > 0;
}
function isElementPatchBatchRequest(value) {
  return typeof value === "object" && value !== null && "sourceFile" in value && typeof value.sourceFile === "string" && value.sourceFile.length > 0 && "patches" in value && Array.isArray(value.patches) && value.patches.length > 0 && value.patches.every(isElementPatchRequest);
}
function findUnsafeElementPatchBatchValues(batches) {
  return batches.flatMap(
    (batch) => batch.patches.flatMap((patch) => findUnsafeDomPatchValues(patch))
  );
}
function foldElementPatches(originalContent, patches) {
  let content = originalContent;
  const matched = [];
  for (const patch of patches) {
    const result = patchElementInHtml(content, patch.target, patch.operations);
    content = result.html;
    matched.push(result.matched);
  }
  return { content, matched };
}
var PATCH_CONFLICT_ATTEMPTS = 3;
var ID_ATTRIBUTE = /[\s"'/]id\s*=\s*(?=(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))/gi;
function projectHtmlIds(projectDir) {
  const ids = /* @__PURE__ */ new Set();
  for (const rel of walkDir(projectDir)) {
    if (!rel.endsWith(".html") || isInHiddenOrVendorDir(rel)) continue;
    let html;
    try {
      html = readFileSync5(join6(projectDir, rel), "utf-8");
    } catch {
      continue;
    }
    for (const m of html.matchAll(ID_ATTRIBUTE)) ids.add(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return ids;
}
function commitElementPatchBatches(projectDir, batches, writeFile = (path, content) => replaceFileAtomically2(path, content, statSync3(path).mode), requestToken) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return foldAndCommitElementPatchBatches(projectDir, batches, writeFile, requestToken);
    } catch (error) {
      if (!(error instanceof FileChangedError)) throw error;
      if (attempt === PATCH_CONFLICT_ATTEMPTS)
        return { error: "conflict", sourceFile: error.sourceFile };
    }
  }
}
function foldAndCommitElementPatchBatches(projectDir, batches, writeFile, requestToken) {
  const resolvedPaths = /* @__PURE__ */ new Set();
  const prepared = [];
  for (const batch of batches) {
    const absPath = pinWithinProject(projectDir, batch.sourceFile);
    if (!absPath) return { error: "forbidden", sourceFile: batch.sourceFile };
    if (resolvedPaths.has(absPath)) return { error: "duplicate", sourceFile: batch.sourceFile };
    resolvedPaths.add(absPath);
    let before;
    try {
      before = readFileSync5(absPath, "utf-8");
    } catch {
      return { error: "not-found", sourceFile: batch.sourceFile };
    }
    const folded = foldElementPatches(before, batch.patches);
    prepared.push({
      sourceFile: batch.sourceFile,
      absPath,
      before,
      matched: folded.matched,
      after: folded.content
    });
  }
  const durable = prepared.every((file) => file.matched.every(Boolean));
  if (!durable) {
    return {
      durable: false,
      files: prepared.map((file) => ({
        sourceFile: file.sourceFile,
        changed: false,
        matched: file.matched,
        before: file.before,
        after: file.before
      }))
    };
  }
  const applied = applyFileMutations(
    projectDir,
    prepared.map(({ sourceFile, absPath, before, after }) => ({
      sourceFile,
      absPath,
      before,
      after
    })),
    requestToken,
    writeFile
  );
  const files = applied.map((file, index) => ({
    sourceFile: file.sourceFile,
    changed: file.changed,
    matched: prepared[index]?.matched ?? [],
    before: file.before,
    after: file.after,
    backupPath: file.backupPath ?? void 0
  }));
  return { durable: true, files };
}
function commitElementPatchBatchesWithReceipts(c, projectDir, batches) {
  return commitElementPatchBatches(
    projectDir,
    batches,
    void 0,
    c.req.header("X-Hyperframes-Write-Token")
  );
}
function writeFileWithReceipt(c, filePath, absPath, html) {
  const overwrote = readFileSync5(absPath);
  replaceFileAtomically2(absPath, html, statSync3(absPath).mode);
  const version = fileContentVersion(html);
  const writeToken = createWriteToken(c.req.header("X-Hyperframes-Write-Token"));
  recordFileWriteReceipt(absPath, { path: filePath, version, writeToken, overwrote });
  return { version, writeToken };
}
function writeMutationResult(c, projectDir, filePath, absPath, html, original) {
  const backup = snapshotBeforeWrite(projectDir, absPath);
  if (backup.error) return c.json({ error: `backup failed: ${backup.error}` }, 500);
  if (readFileSync5(absPath, "utf-8") !== original) {
    return c.json({ error: "file changed", conflict: true, path: filePath }, 409);
  }
  const { version } = writeFileWithReceipt(c, filePath, absPath, html);
  return { backupPath: backupPathForResponse(projectDir, backup.backupPath), version };
}
function writeIfChanged(c, projectDir, filePath, absPath, original, next) {
  if (next === original) {
    return c.json({ ok: true, changed: false, content: original, path: filePath });
  }
  const mutationResult = writeMutationResult(c, projectDir, filePath, absPath, next, original);
  if (mutationResult instanceof Response) return mutationResult;
  const { backupPath } = mutationResult;
  return c.json({
    ok: true,
    changed: true,
    content: next,
    path: filePath,
    backupPath
  });
}
function rejectUnsafeMutationValues(c, unsafeFields) {
  return c.json(
    {
      error: "mutation contains unsafe values",
      fields: unsafeFields.map((field) => field.path),
      unsafeValues: unsafeFields
    },
    400
  );
}
function elementPatchBatchCommitErrorResponse(c, error, sourceFile) {
  if (error === "conflict")
    return c.json({ error: "file changed", conflict: true, sourceFile }, 409);
  if (error === "not-found") return c.json({ error, sourceFile }, 404);
  if (error === "forbidden") return c.json({ error, sourceFile }, 403);
  return c.json({ error: "duplicate source file", sourceFile }, 400);
}
async function parseMutationBody(c) {
  const body = await c.req.json().catch(() => null);
  if (!body?.target) {
    return { error: c.json({ error: "target required" }, 400) };
  }
  return { target: body.target, body };
}
function ensureDir(projectDir, filePath) {
  mkdirWithinProject(projectDir, dirname3(filePath));
}
function generateCopyPath(projectDir, originalPath) {
  const ext = originalPath.includes(".") ? "." + originalPath.split(".").pop() : "";
  const base = ext ? originalPath.slice(0, -ext.length) : originalPath;
  const copyMatch = base.match(/ \(copy(?: (\d+))?\)$/);
  const cleanBase = copyMatch ? base.slice(0, -copyMatch[0].length) : base;
  let num = copyMatch ? copyMatch[1] ? parseInt(copyMatch[1]) + 1 : 2 : 1;
  let candidate = num === 1 ? `${cleanBase} (copy)${ext}` : `${cleanBase} (copy ${num})${ext}`;
  while (existsSync4(resolve2(projectDir, candidate))) {
    num++;
    candidate = `${cleanBase} (copy ${num})${ext}`;
  }
  return candidate;
}
function walkFiles(dir, filter) {
  const results = [];
  for (const entry of readableEntries(dir)) {
    const full = join6(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".thumbnails" || entry.name === "renders" || entry.name === ".transcode-cache")
        continue;
      results.push(...walkFiles(full, filter));
    } else if (filter(entry.name)) {
      results.push(full);
    }
  }
  return results;
}
var SKIPPED_ENTRY = /* @__PURE__ */ new Set(["EACCES", "EPERM", "ENOENT"]);
function skippable(error) {
  return error instanceof Error && SKIPPED_ENTRY.has(error.code ?? "");
}
function readableEntries(dir) {
  try {
    return readdirSync2(dir, { withFileTypes: true });
  } catch (error) {
    if (skippable(error)) return [];
    throw error;
  }
}
function readableText(file) {
  try {
    return readFileSync5(file, "utf-8");
  } catch (error) {
    if (skippable(error)) return null;
    throw error;
  }
}
var escapeRegExp = (text2) => text2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
var SEPARATOR = String.raw`\\{0,2}[\\/]`;
var REFERENCE_START = String.raw`(?<![\w./\\+-])`;
var FILE_END = String.raw`(?![\w-]|\.\w)`;
var ENTITY_SPELLINGS = HTML_ATTRIBUTE_ENTITIES;
function referenceSpellings(char) {
  const spellings = [escapeRegExp(char)];
  const encoded = encodeUrlPath(char);
  if (encoded !== char)
    spellings.push(encoded.replace(/[A-F]/g, (hex) => `[${hex}${hex.toLowerCase()}]`));
  if (ENTITY_SPELLINGS[char]) spellings.push(...ENTITY_SPELLINGS[char]);
  if (["'", '"', "`", "$", " ", "(", ")"].includes(char)) {
    spellings.push(escapeRegExp(`&#92;${char}`), escapeRegExp(`&#92;${escapeHtmlReference(char)}`));
  }
  const scriptSpelling = escapeQuotedReference(char, '"');
  if (scriptSpelling !== char) spellings.push(escapeRegExp(scriptSpelling));
  if (["'", "`", "$", " ", "(", ")"].includes(char)) spellings.push(escapeRegExp(`\\${char}`));
  if (/[\t\n\f\r =<>`]/.test(char)) spellings.push(`&#${char.codePointAt(0)};`);
  if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) {
    spellings.push(escapeRegExp(`\\${char.charCodeAt(0).toString(16)} `));
  }
  return spellings.length === 1 ? spellings[0] : `(?:${spellings.join("|")})`;
}
function escapeHtmlReference(path) {
  return path.replace(/[&"']/g, (char) => ENTITY_SPELLINGS[char][0]);
}
function escapeQuotedReference(path, quote) {
  const escaped = JSON.stringify(path).slice(1, -1);
  return quote === '"' ? escaped : escaped.replace(new RegExp(escapeRegExp(quote), "g"), `\\${quote}`);
}
function escapeRawUrlPath(path) {
  const encodeSpaces = path.startsWith(" ") || path.endsWith(" ");
  return path.replace(/[\s\S]/g, (char) => {
    if (char.charCodeAt(0) < 32 || ":?%#\\".includes(char) || encodeSpaces && char === " ") {
      return encodeUrlPath(char);
    }
    return char;
  });
}
function spellLike(reference, path, oldPath, context) {
  const { syntax, quote, url, encodeAll } = context;
  if (url && (encodeAll || reference !== oldPath && /%[0-9A-Fa-f]{2}/.test(reference)))
    return encodeUrlPath(path);
  switch (syntax) {
    case "html": {
      const escaped = escapeHtmlReference(url ? escapeRawUrlPath(path) : path);
      return ["'", '"'].includes(quote) ? escaped : escaped.replace(/[\t\n\f\r =<>`]/g, (char) => `&#${char.codePointAt(0)};`);
    }
    case "script": {
      if (!["'", '"', "`"].includes(quote)) return path;
      const escaped = escapeQuotedReference(path, quote);
      return quote === "`" ? escaped.replace(/\$\{/g, "\\${") : escaped;
    }
    case "css":
      return url ? encodeUrlPath(path) : path;
    case "plain":
      return path;
  }
}
function referenceSyntax(file) {
  if (/\.html$/i.test(file)) return "html";
  if (/\.css$/i.test(file)) return "css";
  if (/\.(?:[cm]?js|jsx|tsx?|json)$/i.test(file)) return "script";
  return "plain";
}
function decodeQuotedReference(text2, syntax) {
  if (syntax === "css") return decodeCssEscapes(text2);
  if (syntax === "script") {
    const controls = { b: "\b", f: "\f", n: "\n", r: "\r", t: "	" };
    return text2.replace(
      /\\(?:u([0-9a-fA-F]{4})|([bfnrt"'`$\\/]))/g,
      (_escaped, hex, char) => {
        if (hex !== void 0) return String.fromCharCode(Number.parseInt(hex, 16));
        return controls[char] ?? char;
      }
    );
  }
  return text2;
}
function referencePattern(oldPath, isDirectory) {
  const name = oldPath.split("/").map((segment) => Array.from(segment, referenceSpellings).join("")).join(SEPARATOR);
  const end = isDirectory ? `(?=${SEPARATOR})` : FILE_END;
  return new RegExp(
    String.raw`${REFERENCE_START}(?<lead>(?:\.{1,2}${SEPARATOR}|${SEPARATOR}){0,4})${name}${end}`,
    "g"
  );
}
function rewriteEntityAttributes(text2, rewrite) {
  const parts = [];
  let cursor = 0;
  for (const tag of scanHtmlOpeningTags(text2)) {
    for (const attr of tag.attributes) {
      if (attr.kind !== "value") continue;
      const decoded = decodeAuthoredAttribute(attr.value);
      if (decoded === attr.value) continue;
      let value = escapeHtmlReference(decoded);
      if (!attr.quote)
        value = value.replace(/[\t\n\f\r =<>`]/g, (char) => `&#${char.codePointAt(0)};`);
      const source = `<x ${attr.name}=${attr.quote}${value}${attr.quote}>`;
      const updated = rewrite(source);
      if (updated === source) continue;
      const replacement = scanHtmlOpeningTags(updated)[0].attributes[0];
      if (replacement.kind !== "value") throw new Error("Reference rewrite removed its attribute");
      parts.push(text2.slice(cursor, attr.valueStart), replacement.value);
      cursor = attr.valueEnd;
    }
  }
  parts.push(text2.slice(cursor));
  return parts.join("");
}
function referenceRewriter(oldPath, newPath, isDirectory, existing = []) {
  const oldIdentity = sep2 === "\\" ? oldPath.replace(/\\/g, "/") : oldPath;
  const pattern = referencePattern(oldPath, isDirectory);
  const around = /* @__PURE__ */ new Map();
  const afterLengths = /* @__PURE__ */ new Set();
  let window = 0;
  for (const path of existing) {
    if (path.length <= oldPath.length) continue;
    for (const start of occurrences(path, oldPath)) {
      const [before, after] = [path.slice(0, start), path.slice(start + oldPath.length)];
      const befores = around.get(after) ?? around.set(after, /* @__PURE__ */ new Map()).get(after);
      (befores.get(before.length) ?? befores.set(before.length, /* @__PURE__ */ new Set()).get(before.length)).add(
        before
      );
      afterLengths.add(after.length);
      window = Math.max(window, path.length * 9);
    }
  }
  const normalized = (text2, context, full = false) => {
    let value = text2;
    if (context.syntax === "html" || context.htmlAttribute) {
      value = decodeAuthoredAttribute(value);
    }
    value = decodeQuotedReference(value, context.syntax);
    if (context.url) {
      value = value.replace(/\\/g, "/");
      value = full ? decodedUrlPath(value) : decodeWellFormedEscapes(value);
    }
    return sep2 === "\\" ? value.replace(/\\/g, "/") : value;
  };
  return function rewriteText(text2, syntax = "html", normalizeEntities = true) {
    if (syntax === "html" && normalizeEntities) {
      text2 = rewriteEntityAttributes(text2, (source) => rewriteText(source, "html", false));
    }
    pattern.lastIndex = 0;
    if (!pattern.test(text2)) return text2;
    pattern.lastIndex = 0;
    const tags = syntax === "html" ? scanHtmlOpeningTags(text2) : [];
    const inlineRegions = tags.filter(
      (tag) => tag.closed && ["script", "style"].includes(tag.name) && tag.rawTextEnd !== null
    ).map((tag) => ({
      start: tag.end,
      end: tag.rawTextEnd,
      syntax: tag.name === "style" ? "css" : "script"
    }));
    const attributes = tags.flatMap(
      (tag) => tag.attributes.flatMap((attr) => attr.kind === "value" ? [attr] : [])
    );
    const cssContexts = syntax === "css" ? [{ start: 0, end: text2.length, htmlAttribute: false }] : [
      ...inlineRegions.filter((region) => region.syntax === "css").map((region) => ({ ...region, htmlAttribute: false })),
      ...attributes.filter((attr) => attr.name === "style").map((attr) => ({ ...attr, htmlAttribute: true }))
    ];
    const cssFields = (pattern2) => cssContexts.flatMap(
      (context) => [...text2.slice(context.start, context.end).matchAll(pattern2)].map((match) => {
        const prefix = /^(?:url\(\s*|@import\s+)/i.exec(match[0])[0];
        const rest = match[0].slice(prefix.length);
        const delimiter = context.htmlAttribute ? /^(?:["']|&quot;|&#39;|&apos;)/.exec(rest)?.[0] : /^["']/.exec(rest)?.[0];
        const start = context.start + match.index + prefix.length + (delimiter?.length ?? 0);
        return {
          start,
          end: context.start + match.index + match[0].length,
          syntax: "css",
          htmlAttribute: context.htmlAttribute,
          encodeAll: true
        };
      })
    );
    const urlRegions = [
      ...attributes.filter((attr) => ["src", "href", "poster", "xlink:href"].includes(attr.name)).map((attr) => ({
        start: attr.valueStart + (/^[\t\n\f\r ]*/.exec(attr.value)?.[0].length ?? 0),
        end: attr.valueEnd,
        syntax: "html",
        htmlAttribute: true,
        encodeAll: false
      })),
      ...attributes.filter((attr) => attr.name === "srcset").flatMap(
        (attr) => [...attr.value.matchAll(/(^|,)[\t\n\f\r ]*([^,\t\n\f\r ]+)/g)].map((match) => ({
          start: attr.valueStart + match.index + match[0].length - match[2].length,
          end: attr.valueStart + match.index + match[0].length,
          syntax: "html",
          htmlAttribute: true,
          encodeAll: true
        }))
      ),
      ...cssFields(
        /\burl\((?:\s*"(?:\\.|[^"\\])*"\s*|\s*'(?:\\.|[^'\\])*'\s*|(?:\\.|[^)\\])*)\)/gi
      ),
      ...cssFields(/@import\s+(?:"[^"]*"|'[^']*')/gi)
    ].sort((a, b) => a.start - b.start);
    let urlIndex = 0;
    let regionIndex = 0;
    return text2.replace(pattern, (...args) => {
      const [match, offset] = [args[0], args.at(-3)];
      const { lead } = args.at(-1);
      while (inlineRegions[regionIndex] && inlineRegions[regionIndex].end <= offset) regionIndex++;
      const region = inlineRegions[regionIndex];
      const matchSyntax = region && offset >= region.start ? region.syntax : syntax;
      while (urlRegions[urlIndex] && urlRegions[urlIndex].end <= offset) urlIndex++;
      const urlRegion = urlRegions[urlIndex];
      const url = matchSyntax !== "script" && !!urlRegion && offset >= urlRegion.start;
      const context = {
        syntax: url ? urlRegion.syntax : matchSyntax,
        url,
        htmlAttribute: url && urlRegion.htmlAttribute,
        encodeAll: url && urlRegion.encodeAll,
        quote: text2[offset - 1] ?? ""
      };
      if (url && offset !== urlRegion.start) return match;
      const reference = match.slice(lead.length);
      if (normalized(reference, context, true) !== oldIdentity) return match;
      if (isDirectory && !normalized(
        text2.slice(offset + match.length, offset + match.length + 4),
        context
      ).startsWith("/"))
        return match;
      const at = offset + lead.length;
      const head = normalized(text2.slice(Math.max(0, at - window), at), context);
      const tail = normalized(
        text2.slice(offset + match.length, offset + match.length + window),
        context,
        context.url
      );
      const inLonger = [...afterLengths].some((after) => {
        const befores = tail.length >= after && around.get(tail.slice(0, after));
        return befores && [...befores].some(
          ([length, set]) => head.length >= length && set.has(head.slice(head.length - length))
        );
      });
      if (inLonger) return match;
      return `${lead}${spellLike(reference, newPath, oldPath, context)}`;
    });
  };
}
function occurrences(text2, part) {
  const at = [];
  for (let i = text2.indexOf(part); i >= 0; i = text2.indexOf(part, i + 1)) at.push(i);
  return at;
}
function projectPaths(root, dir = root, prefix = "", ancestors = /* @__PURE__ */ new Set()) {
  return readableEntries(dir).flatMap((entry) => {
    const [path, full] = [`${prefix}${entry.name}`, join6(dir, entry.name)];
    const real = entry.name === "node_modules" ? null : directoryReal(entry, full);
    if (real === null || ancestors.has(real) || !isSafePath(root, full)) return [path];
    return [path, ...projectPaths(root, full, `${path}/`, /* @__PURE__ */ new Set([...ancestors, real]))];
  });
}
function directoryReal(entry, full) {
  try {
    return entry.isDirectory() || entry.isSymbolicLink() && statSync3(full).isDirectory() ? realpathSync(full) : null;
  } catch {
    return null;
  }
}
function updateReferences(projectDir, oldPath, newPath, isDirectory) {
  const textFiles = walkFiles(
    projectDir,
    (name) => /\.(html|css|js|jsx|ts|tsx|json|mjs|cjs|md|mdx)$/i.test(name)
  );
  const rewrite = referenceRewriter(oldPath, newPath, isDirectory, projectPaths(projectDir));
  let updatedCount = 0;
  for (const file of textFiles) {
    if (!isSafePath(projectDir, file) || isPrivateProjectFile(projectDir, file)) continue;
    const content = readableText(file);
    if (content === null) continue;
    const updated = rewrite(content, referenceSyntax(file));
    if (updated !== content) {
      replaceFileAtomically2(file, updated, statSync3(file).mode);
      updatedCount++;
    }
  }
  return updatedCount;
}
function extractGsapScriptBlock(html) {
  const { document } = parseHTML4(ensureHfIds(html));
  const scripts = [
    ...document.querySelectorAll("script:not([src])"),
    ...Array.from(document.querySelectorAll("template")).flatMap(
      (tmpl) => Array.from(tmpl.querySelectorAll("script:not([src])"))
    )
  ];
  const script = findTimelineScript(scripts);
  if (!script) return null;
  return {
    scriptText: script.textContent || "",
    document,
    root: clipQueryRoot(script),
    replaceScript(newText) {
      script.textContent = newText;
      return document.toString();
    }
  };
}
function stripGsapAnimationsForSelector(html, selector) {
  const block = extractGsapScriptBlock(html);
  if (!block) return html;
  const parsed = parseGsapScriptAcorn(block.scriptText);
  const matching = parsed.animations.filter((a) => a.targetSelector === selector);
  if (matching.length === 0) return html;
  let script = block.scriptText;
  for (const anim of [...matching].reverse()) {
    script = removeAnimationFromScript(script, anim.id);
  }
  return block.replaceScript(script);
}
function bakeGroupTransformIntoMembers(html, groupId, members, groupCenter) {
  const block = extractGsapScriptBlock(html);
  if (!block) return html;
  const parsed = parseGsapScriptAcorn(block.scriptText);
  const groupSel = `#${groupId}`;
  const groupSets = parsed.animations.filter(
    (a) => a.targetSelector === groupSel && a.method === "set"
  );
  if (groupSets.length === 0) return html;
  const gt = {};
  for (const s of groupSets) {
    for (const [k, v] of Object.entries(s.properties)) if (typeof v === "number") gt[k] = v;
  }
  const gx = gt.x ?? 0;
  const gy = gt.y ?? 0;
  const gz = gt.z ?? 0;
  const grot = gt.rotation ?? 0;
  const gscale = gt.scale ?? 1;
  const isScaleAxis = (k) => k === "scale" || k === "scaleX" || k === "scaleY";
  const groupIsIdentity = Object.entries(gt).every(
    ([k, v]) => isScaleAxis(k) ? v === 1 : v === 0
  );
  if (groupIsIdentity) return html;
  const rad = grot * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const round32 = (n) => Math.round(n * 1e3) / 1e3;
  let script = block.scriptText;
  for (const m of members) {
    const memberSel = `#${m.id}`;
    const sets = parsed.animations.filter(
      (a) => a.targetSelector === memberSel && a.method === "set"
    );
    const mProps = {};
    for (const s of sets) Object.assign(mProps, s.properties);
    const mx = typeof mProps.x === "number" ? mProps.x : 0;
    const my = typeof mProps.y === "number" ? mProps.y : 0;
    const dx = m.cx + mx - groupCenter.cx;
    const dy = m.cy + my - groupCenter.cy;
    const visX = groupCenter.cx + gscale * (cos * dx - sin * dy) + gx;
    const visY = groupCenter.cy + gscale * (sin * dx + cos * dy) + gy;
    const newProps = {
      ...mProps,
      x: round32(visX - m.cx),
      y: round32(visY - m.cy)
    };
    if (gz !== 0) newProps.z = (typeof mProps.z === "number" ? mProps.z : 0) + gz;
    if (grot !== 0) {
      newProps.rotation = round32(
        (typeof mProps.rotation === "number" ? mProps.rotation : 0) + grot
      );
    }
    if (gscale !== 1) {
      newProps.scale = round32((typeof mProps.scale === "number" ? mProps.scale : 1) * gscale);
    }
    const pivoted = /* @__PURE__ */ new Set(["x", "y", "z", "rotation", "scale"]);
    for (const [k, v] of Object.entries(gt)) {
      if (pivoted.has(k) || typeof v !== "number") continue;
      if (k === "scaleX" || k === "scaleY") {
        if (v !== 1) newProps[k] = round32((typeof mProps[k] === "number" ? mProps[k] : 1) * v);
      } else if (k === "transformPerspective") {
        if (typeof mProps[k] !== "number") newProps[k] = v;
      } else if (v !== 0) {
        newProps[k] = round32((typeof mProps[k] === "number" ? mProps[k] : 0) + v);
      }
    }
    for (const s of [...sets].reverse()) {
      script = removeAnimationFromScript(script, s.id);
    }
    script = addAnimationToScript(script, {
      targetSelector: memberSel,
      method: "set",
      position: 0,
      properties: newProps,
      global: true
    }).script;
  }
  return block.replaceScript(script);
}
function stripStudioEditsFromTarget(document, selector) {
  if (!selector) return 0;
  let stripped = 0;
  try {
    for (const el of document.querySelectorAll(selector)) {
      if (!isHTMLElement(el)) continue;
      const htmlEl = el;
      let touched = false;
      if (el.getAttribute("data-hf-studio-path-offset")) {
        const originalTranslate = el.getAttribute("data-hf-studio-original-inline-translate");
        htmlEl.style.removeProperty("--hf-studio-offset-x");
        htmlEl.style.removeProperty("--hf-studio-offset-y");
        if (originalTranslate) {
          htmlEl.style.setProperty("translate", originalTranslate);
        } else {
          htmlEl.style.removeProperty("translate");
        }
        el.removeAttribute("data-hf-studio-path-offset");
        el.removeAttribute("data-hf-studio-original-translate");
        el.removeAttribute("data-hf-studio-original-inline-translate");
        touched = true;
      }
      if (el.getAttribute("data-hf-studio-rotation")) {
        const originalRotate = el.getAttribute("data-hf-studio-original-inline-rotate");
        const originalOrigin = el.getAttribute("data-hf-studio-original-rotation-transform-origin");
        htmlEl.style.removeProperty("--hf-studio-rotation");
        if (originalRotate) {
          htmlEl.style.setProperty("rotate", originalRotate);
        } else {
          htmlEl.style.removeProperty("rotate");
        }
        if (originalOrigin) {
          htmlEl.style.setProperty("transform-origin", originalOrigin);
        } else {
          htmlEl.style.removeProperty("transform-origin");
        }
        el.removeAttribute("data-hf-studio-rotation");
        el.removeAttribute("data-hf-studio-rotation-draft");
        el.removeAttribute("data-hf-studio-original-rotate");
        el.removeAttribute("data-hf-studio-original-inline-rotate");
        el.removeAttribute("data-hf-studio-original-rotation-transform-origin");
        touched = true;
      }
      if (touched) stripped++;
    }
  } catch {
  }
  return stripped;
}
function keyframesWritePosition(keyframes) {
  return keyframes.some(
    (kf) => Object.keys(kf.properties).some((k) => classifyPropertyGroup(k) === "position")
  );
}
function keyframesWriteRotation(keyframes) {
  return keyframes.some(
    (kf) => Object.keys(kf.properties).some((k) => classifyPropertyGroup(k) === "rotation")
  );
}
function lastKeyframeOpacity(kfs) {
  if (!kfs) return void 0;
  for (let i = kfs.keyframes.length - 1; i >= 0; i--) {
    if ("opacity" in kfs.keyframes[i].properties) return kfs.keyframes[i].properties.opacity;
  }
  return void 0;
}
function resolveFinalOpacity(anim) {
  if (anim.method === "from") return null;
  const raw = anim.keyframes ? lastKeyframeOpacity(anim.keyframes) : anim.properties.opacity;
  if (raw == null) return null;
  if (typeof raw === "string" && /^[+\-*]=/.test(raw)) return null;
  const num = Number(raw);
  return Number.isFinite(num) && num !== 0 ? num : null;
}
function bakeVisibilityOnDelete(document, anim) {
  const opacity = resolveFinalOpacity(anim);
  if (opacity === null) return;
  try {
    for (const el of document.querySelectorAll(anim.targetSelector)) {
      if (isHTMLElement(el)) el.style.setProperty("opacity", String(opacity));
    }
  } catch {
  }
}
function replaceInPlaceUnlessSetOrUnknown(scriptText, body) {
  const edit = { ...body, easeEach: resolveReplacementEaseEach(scriptText, body) };
  const inPlace = replaceTweenWithKeyframesInScript(scriptText, body.animationId, edit);
  if (inPlace !== null) return inPlace;
  const script = removeAnimationFromScript(scriptText, body.animationId);
  return addAnimationWithKeyframesToScript(
    script,
    body.targetSelector,
    body.position,
    body.duration,
    body.keyframes,
    body.ease,
    edit.easeEach
  ).script;
}
function resolveReplacementEaseEach(scriptText, request) {
  if (request.easeEach !== void 0) return request.easeEach;
  const original = parseGsapScriptAcorn(scriptText).animations.find(
    (animation) => animation.id === request.animationId
  );
  if (!original?.arcPath?.enabled) return void 0;
  return original?.keyframes?.easeEach ?? original?.ease;
}
var HOLD_SYNC_MUTATION_TYPES = /* @__PURE__ */ new Set([
  "add-keyframe",
  "update-keyframe",
  "remove-keyframe",
  "move-keyframe",
  "resize-keyframed-tween",
  "remove-all-keyframes",
  "add-with-keyframes",
  "replace-with-keyframes",
  "convert-to-keyframes",
  "materialize-keyframes",
  "update-motion-path-point",
  "add-motion-path-point",
  "remove-motion-path-point",
  // Authors a fresh motionPath tween whose parsed first keyframe is (0,0); if it lands
  // at position > 0 the element snaps home at t=0 without a pre-tween hold-`set`.
  "add-motion-path",
  // Can move a tween's `position` (start) across the t=0 boundary, which flips whether a
  // keyframed position tween needs a hold (started at 0 → moved later, or vice versa).
  "update-meta",
  // Time-shift / time-scale tweens, which can move a keyframed position tween's start
  // across t=0, flipping hold need; stale holds are not repositioned by these ops.
  "shift-positions",
  "shift-positions-batch",
  "scale-positions",
  // Retargets keyframed position tweens to a cloned element's selector; the old hold is
  // keyed to the prior selector, so holds must be rebuilt for the new target.
  "split-animations",
  "delete",
  "delete-all-for-selector"
]);
async function executeGsapMutation(body, block, respond, writer) {
  if (writer === "recast") {
    return executeGsapMutationRecast(body, block, respond);
  }
  return executeGsapMutationAcorn(body, block, respond);
}
function validateGsapMutationRequest(c, body) {
  if (!body || typeof body !== "object" || !("type" in body) || !body.type) {
    return c.json({ error: "mutation type required" }, 400);
  }
  if (containsRawGsapExpression(body)) {
    return c.json({ error: "raw JavaScript expressions are not accepted" }, 400);
  }
  const unsafeFields = findUnsafeMutationValues(body);
  if (unsafeFields.length > 0) return rejectUnsafeMutationValues(c, unsafeFields);
  if (body.type === "shift-positions-batch" && (!("shifts" in body) || !Array.isArray(body.shifts))) {
    return c.json({ error: "shift-positions-batch requires a `shifts` array" }, 400);
  }
  return null;
}
function containsRawGsapExpression(value) {
  if (typeof value === "string") return value.startsWith("__raw:");
  if (Array.isArray(value)) return value.some(containsRawGsapExpression);
  if (!value || typeof value !== "object") return false;
  return Object.values(value).some(containsRawGsapExpression);
}
async function prepareGsapMutationScript(c, res, firstMutation) {
  const beforeHtml = readFileSync5(res.absPath, "utf-8");
  let html = beforeHtml;
  let block = extractGsapScriptBlock(html);
  if (!block && (firstMutation.type === "add" || firstMutation.type === "add-with-keyframes")) {
    const compId = html.match(/data-composition-id="([^"]+)"/)?.[1] ?? "main";
    const { GSAP_CDN } = await import("@hyperframes/core");
    const bootstrap = [
      `<script src="${GSAP_CDN}"></script>`,
      "<script>",
      "window.__timelines = window.__timelines || {};",
      "const tl = gsap.timeline({ paused: true });",
      `window.__timelines["${compId}"] = tl;`,
      "</script>"
    ].join("\n");
    const [first, second] = hasCompositionOutsideTemplates(html) ? ["body", "template"] : ["template", "body"];
    html = insertBeforeCloseTag2(html, first, `${bootstrap}
`) ?? insertBeforeCloseTag2(html, second, `${bootstrap}
`) ?? `${html}
${bootstrap}`;
    block = extractGsapScriptBlock(html);
  }
  if (!block && (firstMutation.type === "shift-positions" || firstMutation.type === "scale-positions" || firstMutation.type === "shift-positions-batch")) {
    return c.json({
      ok: true,
      changed: false,
      mutated: false,
      parsed: { animations: [], timelineVar: "tl", preamble: "", postamble: "" },
      before: html,
      after: html,
      scriptText: "",
      path: res.filePath,
      backupPath: null
    });
  }
  if (!block) return c.json({ error: "no GSAP script found in file" }, 400);
  return { html, beforeHtml, block };
}
function retimeRuns(mutations) {
  const runs = /* @__PURE__ */ new Map();
  let start = -1;
  mutations.forEach((mutation, index) => {
    const retime = clipRetimeOf(mutation);
    if (!retime) return void (start = -1);
    if (start < 0) runs.set(start = index, []);
    runs.get(start).push(retime);
  });
  return runs;
}
function clipRetimeOf(mutation) {
  if (mutation.type === "shift-positions") {
    const { targetSelector: targetSelector2, delta } = mutation;
    return targetSelector2 && Number.isFinite(delta) && delta !== 0 ? { kind: "shift", targetSelector: targetSelector2, delta } : "no-op";
  }
  if (mutation.type !== "scale-positions") return null;
  const { targetSelector, oldStart, oldDuration, newStart, newDuration } = mutation;
  const finite = [oldStart, oldDuration, newStart, newDuration].every(Number.isFinite);
  if (!targetSelector || !finite || oldDuration <= 0 || newDuration <= 0) return "no-op";
  if (oldStart === newStart && oldDuration === newDuration) return "no-op";
  return { kind: "scale", targetSelector, oldStart, oldDuration, newStart, newDuration };
}
function retimeRun(script, run, root) {
  const live = run.filter((slot) => slot !== "no-op");
  const retimed = retimeClipTweensInScript(script, live, root);
  const synced = syncPositionHoldsBeforeKeyframes(retimed.script, script);
  let next = 0;
  const changed = run.map((slot) => slot !== "no-op" && retimed.changed[next++]);
  if (synced !== retimed.script) changed[changed.length - 1] = true;
  return { script: synced, changed: synced === script ? changed.map(() => false) : changed };
}
async function applyGsapMutations(c, res, mutations) {
  const firstMutation = mutations[0];
  if (!firstMutation) return c.json({ error: "mutations array required" }, 400);
  const prepared = await prepareGsapMutationScript(c, res, firstMutation);
  if (prepared instanceof Response) return prepared;
  const { html, beforeHtml, block } = prepared;
  let lengthIsAuthored;
  const initialScript = block.scriptText;
  const skippedSelectors = /* @__PURE__ */ new Set();
  const respond = (data, status) => status ? c.json(data, status) : c.json(data);
  let writer;
  try {
    writer = resolveGsapWriter({
      HYPERFRAMES_GSAP_WRITER: process.env["HYPERFRAMES_GSAP_WRITER"]
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
  const mutationChanges = [];
  const retimes = writer === "acorn" ? retimeRuns(mutations) : /* @__PURE__ */ new Map();
  for (let index = 0; index < mutations.length; index++) {
    const run = retimes.get(index);
    if (run) {
      const retimed = retimeRun(block.scriptText, run, block.root);
      mutationChanges.push(...retimed.changed);
      block.scriptText = retimed.script;
      index += run.length - 1;
      continue;
    }
    const mutation = mutations[index];
    const previousScript = block.scriptText;
    const result = await executeGsapMutation(mutation, block, respond, writer);
    if (result instanceof Response) return result;
    let newScript = typeof result === "string" ? result : result.script;
    if (typeof result !== "string") {
      for (const selector of result.skippedSelectors) skippedSelectors.add(selector);
    }
    if (HOLD_SYNC_MUTATION_TYPES.has(mutation.type)) {
      lengthIsAuthored ??= !lengthIsTimeline(res.project.dir, res.filePath);
      if (lengthIsAuthored) newScript = trimTrailingKeyframeSpans(previousScript, newScript);
      newScript = writer === "acorn" ? syncPositionHoldsBeforeKeyframes(newScript, previousScript) : (await loadGsapParser()).syncPositionHoldsBeforeKeyframes(newScript, previousScript);
    }
    mutationChanges.push(newScript !== previousScript);
    block.scriptText = newScript;
  }
  const changed = block.scriptText !== initialScript;
  const newHtml = changed ? block.replaceScript(block.scriptText) : html;
  let backupPath = null;
  if (readFileSync5(res.absPath, "utf-8") !== beforeHtml) {
    return c.json({ error: "file changed during GSAP mutation", conflict: true }, 409);
  }
  if (changed) {
    const mutationResult = writeMutationResult(
      c,
      res.project.dir,
      res.filePath,
      res.absPath,
      newHtml,
      beforeHtml
    );
    if (mutationResult instanceof Response) return mutationResult;
    backupPath = mutationResult.backupPath;
  }
  const responsePayload = {
    ok: true,
    changed,
    mutated: changed,
    mutationChanges,
    parsed: parseGsapScriptAcorn(block.scriptText),
    before: beforeHtml,
    after: newHtml,
    scriptText: block.scriptText,
    path: res.filePath,
    version: fileContentVersion(newHtml),
    backupPath
  };
  if (skippedSelectors.size > 0) responsePayload.skippedSelectors = [...skippedSelectors];
  c.header("ETag", responsePayload.version);
  return c.json(responsePayload);
}
function executeGsapMutationAcorn(body, block, respond) {
  function requireAnimation(scriptText, animationId) {
    const parsed = parseGsapScriptAcorn(scriptText);
    const anim = parsed.animations.find((a) => a.id === animationId);
    if (!anim) return { err: respond({ error: "animation not found" }, 404) };
    return { anim };
  }
  function requireFromToAnimation(scriptText, animationId) {
    const result = requireAnimation(scriptText, animationId);
    if ("err" in result) return result;
    if (result.anim.method !== "fromTo")
      return { err: respond({ error: "animation is not a fromTo" }, 400) };
    return result;
  }
  switch (body.type) {
    case "update-property":
    case "add-property": {
      const r = requireAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      const val = body.type === "update-property" ? body.value : body.defaultValue;
      return updateAnimationInScript(block.scriptText, body.animationId, {
        properties: { ...r.anim.properties, [body.property]: val }
      });
    }
    case "update-properties": {
      const r = requireAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      return updateAnimationInScript(block.scriptText, body.animationId, {
        properties: { ...r.anim.properties, ...body.properties }
      });
    }
    case "update-from-property":
    case "add-from-property": {
      const r = requireFromToAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      const val = body.type === "update-from-property" ? body.value : body.defaultValue;
      return updateAnimationInScript(block.scriptText, body.animationId, {
        fromProperties: { ...r.anim.fromProperties ?? {}, [body.property]: val }
      });
    }
    case "update-meta": {
      return updateAnimationInScript(block.scriptText, body.animationId, body.updates);
    }
    case "add": {
      if (body.fromProperties && body.method !== "fromTo") {
        return respond({ error: "fromProperties is only valid for method=fromTo" }, 400);
      }
      if (Object.keys(body.properties).some((key) => {
        const group = classifyPropertyGroup(key);
        return group === "position" || group === "rotation";
      })) {
        stripStudioEditsFromTarget(block.document, body.targetSelector);
      }
      const result = addAnimationToScript(block.scriptText, {
        targetSelector: body.targetSelector,
        method: body.method,
        position: body.position,
        duration: body.duration,
        ease: body.ease,
        properties: body.properties,
        fromProperties: body.fromProperties,
        ...body.global ? { global: true } : {}
      });
      return result.script;
    }
    case "delete": {
      const delTarget = requireAnimation(block.scriptText, body.animationId);
      if (!("err" in delTarget) && body.stripStudioEdits) {
        stripStudioEditsFromTarget(block.document, delTarget.anim.targetSelector);
        bakeVisibilityOnDelete(block.document, delTarget.anim);
      }
      return removeAnimationFromScript(block.scriptText, body.animationId);
    }
    case "delete-all-for-selector": {
      const parsed = parseGsapScriptAcorn(block.scriptText);
      const matching = parsed.animations.filter((a) => a.targetSelector === body.targetSelector);
      if (matching.length === 0) return block.scriptText;
      stripStudioEditsFromTarget(block.document, body.targetSelector);
      let script = block.scriptText;
      for (const anim of matching.reverse()) {
        script = removeAnimationFromScript(script, anim.id);
      }
      return script;
    }
    case "consolidate-position-writes": {
      if (!body.targetSelector) return block.scriptText;
      return dedupePositionWritesInScript(
        block.scriptText,
        body.targetSelector,
        body.keepAnimationId
      );
    }
    case "remove-property": {
      const r = requireAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      const filtered = { ...r.anim.properties };
      delete filtered[body.property];
      return updateAnimationInScript(block.scriptText, body.animationId, {
        properties: filtered
      });
    }
    case "remove-from-property": {
      const r = requireFromToAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      const filtered = { ...r.anim.fromProperties ?? {} };
      delete filtered[body.property];
      return updateAnimationInScript(block.scriptText, body.animationId, {
        fromProperties: filtered
      });
    }
    case "add-keyframe": {
      return addKeyframeToScript(
        block.scriptText,
        body.animationId,
        body.percentage,
        body.properties,
        body.ease,
        body.backfillDefaults
      );
    }
    case "remove-keyframe": {
      return removeKeyframeFromScript(block.scriptText, body.animationId, body.percentage);
    }
    case "move-keyframe": {
      return moveKeyframeInScript(
        block.scriptText,
        body.animationId,
        body.fromPercentage,
        body.toPercentage
      );
    }
    case "resize-keyframed-tween": {
      return resizeKeyframedTweenInScript(
        block.scriptText,
        body.animationId,
        body.position,
        body.duration,
        body.pctRemap
      );
    }
    case "update-keyframe": {
      return updateKeyframeInScript(
        block.scriptText,
        body.animationId,
        body.percentage,
        body.properties,
        body.ease
      );
    }
    case "convert-to-keyframes": {
      return convertToKeyframesFromScript(
        block.scriptText,
        body.animationId,
        body.resolvedFromValues,
        body.duration
      );
    }
    case "remove-all-keyframes": {
      const preCollapse = requireAnimation(block.scriptText, body.animationId);
      if (!("err" in preCollapse)) {
        bakeVisibilityOnDelete(block.document, preCollapse.anim);
      }
      return removeAllKeyframesFromScript(block.scriptText, body.animationId);
    }
    case "materialize-keyframes": {
      if (body.allElements && body.allElements.length > 0) {
        return unrollDynamicAnimations(block.scriptText, body.animationId, body.allElements);
      }
      return materializeKeyframesFromScript(
        block.scriptText,
        body.animationId,
        body.keyframes,
        body.easeEach,
        body.resolvedSelector
      );
    }
    case "set-arc-path": {
      return setArcPathInScript(block.scriptText, body.animationId, {
        enabled: body.enabled,
        autoRotate: body.autoRotate ?? false,
        segments: body.segments ?? []
      });
    }
    case "update-arc-segment": {
      return updateArcSegmentInScript(block.scriptText, body.animationId, body.segmentIndex, {
        ...body.curviness !== void 0 ? { curviness: body.curviness } : {},
        ...body.cp1 ? { cp1: body.cp1 } : {},
        ...body.cp2 ? { cp2: body.cp2 } : {}
      });
    }
    case "update-motion-path-point": {
      return updateMotionPathPointInScript(block.scriptText, body.animationId, body.pointIndex, {
        x: body.x,
        y: body.y
      });
    }
    case "add-motion-path-point": {
      return addMotionPathPointInScript(block.scriptText, body.animationId, body.index, {
        x: body.x,
        y: body.y
      });
    }
    case "remove-motion-path-point": {
      return removeMotionPathPointInScript(block.scriptText, body.animationId, body.index);
    }
    case "add-motion-path": {
      return addMotionPathToScript(
        block.scriptText,
        body.targetSelector,
        body.position,
        body.duration,
        { x: body.x, y: body.y },
        body.ease
      ).script;
    }
    case "remove-arc-path": {
      return removeArcPathFromScript(block.scriptText, body.animationId);
    }
    case "add-with-keyframes": {
      if (keyframesWritePosition(body.keyframes) || keyframesWriteRotation(body.keyframes)) {
        stripStudioEditsFromTarget(block.document, body.targetSelector);
      }
      const result = addAnimationWithKeyframesToScript(
        block.scriptText,
        body.targetSelector,
        body.position,
        body.duration,
        body.keyframes,
        body.ease,
        body.easeEach
      );
      return result.script;
    }
    case "replace-with-keyframes": {
      if (keyframesWritePosition(body.keyframes) || keyframesWriteRotation(body.keyframes)) {
        stripStudioEditsFromTarget(block.document, body.targetSelector);
      }
      return replaceInPlaceUnlessSetOrUnknown(block.scriptText, body);
    }
    case "split-animations": {
      if (typeof body.originalId !== "string" || !body.originalId || typeof body.newId !== "string" || !body.newId || typeof body.splitTime !== "number" || !Number.isFinite(body.splitTime) || typeof body.elementStart !== "number" || !Number.isFinite(body.elementStart) || typeof body.elementDuration !== "number" || !Number.isFinite(body.elementDuration) || body.elementDuration <= 0) {
        return respond(
          {
            error: "split-animations requires originalId, newId (non-empty strings), splitTime, elementStart (finite numbers), and elementDuration (positive number)"
          },
          400
        );
      }
      return splitAnimationsInScript(block.scriptText, {
        originalId: body.originalId,
        newId: body.newId,
        splitTime: body.splitTime,
        elementStart: body.elementStart,
        elementDuration: body.elementDuration
      });
    }
    case "split-into-property-groups": {
      const result = splitIntoPropertyGroupsFromScript(block.scriptText, body.animationId);
      return result.script;
    }
    case "unroll-timeline": {
      return unrollComputedTimeline(block.scriptText);
    }
    case "shift-positions-batch": {
      const shifts = body.shifts.filter((s) => s.targetSelector && Number.isFinite(s.delta) && s.delta !== 0).map((s) => ({ kind: "shift", targetSelector: s.targetSelector, delta: s.delta }));
      return retimeClipTweensInScript(block.scriptText, shifts, block.root).script;
    }
    case "shift-positions":
    case "scale-positions": {
      const retime = clipRetimeOf(body);
      return retime && retime !== "no-op" ? retimeClipTweensInScript(block.scriptText, [retime], block.root).script : block.scriptText;
    }
    default:
      return respond({ error: `unknown mutation type: ${body.type}` }, 400);
  }
}
async function executeGsapMutationRecast(body, block, respond) {
  const parser = await loadGsapParser();
  const {
    updateAnimationInScript: updateAnimationInScript2,
    addAnimationToScript: addAnimationToScript2,
    removeAnimationFromScript: removeAnimationFromScript2,
    addKeyframeToScript: addKeyframeToScript2,
    removeKeyframeFromScript: removeKeyframeFromScript2,
    moveKeyframeInScript: moveKeyframeInScript2,
    resizeKeyframedTweenInScript: resizeKeyframedTweenInScript2,
    updateKeyframeInScript: updateKeyframeInScript2,
    convertToKeyframesInScript,
    removeAllKeyframesFromScript: removeAllKeyframesFromScript2,
    materializeKeyframesInScript,
    unrollDynamicAnimations: unrollDynamicAnimations2,
    setArcPathInScript: setArcPathInScript2,
    updateArcSegmentInScript: updateArcSegmentInScript2,
    updateMotionPathPointInScript: updateMotionPathPointInScript2,
    addMotionPathPointInScript: addMotionPathPointInScript2,
    removeMotionPathPointInScript: removeMotionPathPointInScript2,
    addMotionPathToScript: addMotionPathToScript2,
    removeArcPathFromScript: removeArcPathFromScript2,
    addAnimationWithKeyframesToScript: addAnimationWithKeyframesToScript2,
    splitAnimationsInScript: splitAnimationsInScript2,
    splitIntoPropertyGroups,
    dedupePositionWritesInScript: dedupePositionWritesInScript2
  } = parser;
  function requireAnimation(scriptText, animationId) {
    const parsed = parseGsapScriptAcorn(scriptText);
    const anim = parsed.animations.find((a) => a.id === animationId);
    if (!anim) return { err: respond({ error: "animation not found" }, 404) };
    return { anim };
  }
  function requireFromToAnimation(scriptText, animationId) {
    const result = requireAnimation(scriptText, animationId);
    if ("err" in result) return result;
    if (result.anim.method !== "fromTo")
      return { err: respond({ error: "animation is not a fromTo" }, 400) };
    return result;
  }
  switch (body.type) {
    case "update-property":
    case "add-property": {
      const r = requireAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      const val = body.type === "update-property" ? body.value : body.defaultValue;
      return updateAnimationInScript2(block.scriptText, body.animationId, {
        properties: { ...r.anim.properties, [body.property]: val }
      });
    }
    case "update-properties": {
      const r = requireAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      return updateAnimationInScript2(block.scriptText, body.animationId, {
        properties: { ...r.anim.properties, ...body.properties }
      });
    }
    case "update-from-property":
    case "add-from-property": {
      const r = requireFromToAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      const val = body.type === "update-from-property" ? body.value : body.defaultValue;
      return updateAnimationInScript2(block.scriptText, body.animationId, {
        fromProperties: { ...r.anim.fromProperties ?? {}, [body.property]: val }
      });
    }
    case "update-meta": {
      return updateAnimationInScript2(block.scriptText, body.animationId, body.updates);
    }
    case "add": {
      if (body.fromProperties && body.method !== "fromTo") {
        return respond({ error: "fromProperties is only valid for method=fromTo" }, 400);
      }
      if (Object.keys(body.properties).some((k) => {
        const group = classifyPropertyGroup(k);
        return group === "position" || group === "rotation";
      })) {
        stripStudioEditsFromTarget(block.document, body.targetSelector);
      }
      const result = addAnimationToScript2(block.scriptText, {
        targetSelector: body.targetSelector,
        method: body.method,
        position: body.position,
        duration: body.duration,
        ease: body.ease,
        properties: body.properties,
        fromProperties: body.fromProperties,
        ...body.global ? { global: true } : {}
      });
      return result.script;
    }
    case "delete": {
      const delTarget = requireAnimation(block.scriptText, body.animationId);
      if (!("err" in delTarget) && body.stripStudioEdits) {
        stripStudioEditsFromTarget(block.document, delTarget.anim.targetSelector);
        bakeVisibilityOnDelete(block.document, delTarget.anim);
      }
      return removeAnimationFromScript2(block.scriptText, body.animationId);
    }
    case "delete-all-for-selector": {
      const parsed = parseGsapScriptAcorn(block.scriptText);
      const matching = parsed.animations.filter((a) => a.targetSelector === body.targetSelector);
      if (matching.length === 0) return block.scriptText;
      stripStudioEditsFromTarget(block.document, body.targetSelector);
      let script = block.scriptText;
      for (const anim of matching.reverse()) {
        script = removeAnimationFromScript2(script, anim.id);
      }
      return script;
    }
    case "consolidate-position-writes": {
      if (!body.targetSelector) return block.scriptText;
      return dedupePositionWritesInScript2(
        block.scriptText,
        body.targetSelector,
        body.keepAnimationId
      );
    }
    case "remove-property": {
      const r = requireAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      const filtered = { ...r.anim.properties };
      delete filtered[body.property];
      return updateAnimationInScript2(block.scriptText, body.animationId, {
        properties: filtered
      });
    }
    case "remove-from-property": {
      const r = requireFromToAnimation(block.scriptText, body.animationId);
      if ("err" in r) return r.err;
      const filtered = { ...r.anim.fromProperties ?? {} };
      delete filtered[body.property];
      return updateAnimationInScript2(block.scriptText, body.animationId, {
        fromProperties: filtered
      });
    }
    case "add-keyframe": {
      return addKeyframeToScript2(
        block.scriptText,
        body.animationId,
        body.percentage,
        body.properties,
        body.ease,
        body.backfillDefaults
      );
    }
    case "remove-keyframe": {
      return removeKeyframeFromScript2(block.scriptText, body.animationId, body.percentage);
    }
    case "move-keyframe": {
      return moveKeyframeInScript2(
        block.scriptText,
        body.animationId,
        body.fromPercentage,
        body.toPercentage
      );
    }
    case "resize-keyframed-tween": {
      return resizeKeyframedTweenInScript2(
        block.scriptText,
        body.animationId,
        body.position,
        body.duration,
        body.pctRemap
      );
    }
    case "update-keyframe": {
      return updateKeyframeInScript2(
        block.scriptText,
        body.animationId,
        body.percentage,
        body.properties,
        body.ease
      );
    }
    case "convert-to-keyframes": {
      return convertToKeyframesInScript(
        block.scriptText,
        body.animationId,
        body.resolvedFromValues,
        body.duration
      );
    }
    case "remove-all-keyframes": {
      const preCollapse = requireAnimation(block.scriptText, body.animationId);
      if (!("err" in preCollapse)) {
        bakeVisibilityOnDelete(block.document, preCollapse.anim);
      }
      return removeAllKeyframesFromScript2(block.scriptText, body.animationId);
    }
    case "materialize-keyframes": {
      if (body.allElements && body.allElements.length > 0) {
        return unrollDynamicAnimations2(block.scriptText, body.animationId, body.allElements);
      }
      return materializeKeyframesInScript(
        block.scriptText,
        body.animationId,
        body.keyframes,
        body.easeEach,
        body.resolvedSelector
      );
    }
    case "set-arc-path": {
      return setArcPathInScript2(block.scriptText, body.animationId, {
        enabled: body.enabled,
        autoRotate: body.autoRotate ?? false,
        segments: body.segments ?? []
      });
    }
    case "update-arc-segment": {
      return updateArcSegmentInScript2(block.scriptText, body.animationId, body.segmentIndex, {
        ...body.curviness !== void 0 ? { curviness: body.curviness } : {},
        ...body.cp1 ? { cp1: body.cp1 } : {},
        ...body.cp2 ? { cp2: body.cp2 } : {}
      });
    }
    case "update-motion-path-point": {
      return updateMotionPathPointInScript2(block.scriptText, body.animationId, body.pointIndex, {
        x: body.x,
        y: body.y
      });
    }
    case "add-motion-path-point": {
      return addMotionPathPointInScript2(block.scriptText, body.animationId, body.index, {
        x: body.x,
        y: body.y
      });
    }
    case "remove-motion-path-point": {
      return removeMotionPathPointInScript2(block.scriptText, body.animationId, body.index);
    }
    case "add-motion-path": {
      const result = addMotionPathToScript2(
        block.scriptText,
        body.targetSelector,
        body.position,
        body.duration,
        { x: body.x, y: body.y },
        body.ease
      );
      return result.script;
    }
    case "remove-arc-path": {
      return removeArcPathFromScript2(block.scriptText, body.animationId);
    }
    case "add-with-keyframes": {
      if (keyframesWritePosition(body.keyframes) || keyframesWriteRotation(body.keyframes)) {
        stripStudioEditsFromTarget(block.document, body.targetSelector);
      }
      const result = addAnimationWithKeyframesToScript2(
        block.scriptText,
        body.targetSelector,
        body.position,
        body.duration,
        body.keyframes,
        body.ease,
        body.easeEach
      );
      return result.script;
    }
    case "replace-with-keyframes": {
      if (keyframesWritePosition(body.keyframes) || keyframesWriteRotation(body.keyframes)) {
        stripStudioEditsFromTarget(block.document, body.targetSelector);
      }
      return replaceInPlaceUnlessSetOrUnknown(block.scriptText, body);
    }
    case "split-animations": {
      if (typeof body.originalId !== "string" || !body.originalId || typeof body.newId !== "string" || !body.newId || typeof body.splitTime !== "number" || !Number.isFinite(body.splitTime) || typeof body.elementStart !== "number" || !Number.isFinite(body.elementStart) || typeof body.elementDuration !== "number" || !Number.isFinite(body.elementDuration) || body.elementDuration <= 0) {
        return respond(
          {
            error: "split-animations requires originalId, newId (non-empty strings), splitTime, elementStart (finite numbers), and elementDuration (positive number)"
          },
          400
        );
      }
      return splitAnimationsInScript2(block.scriptText, {
        originalId: body.originalId,
        newId: body.newId,
        splitTime: body.splitTime,
        elementStart: body.elementStart,
        elementDuration: body.elementDuration
      });
    }
    case "split-into-property-groups": {
      const result = splitIntoPropertyGroups(block.scriptText, body.animationId);
      return result.script;
    }
    case "unroll-timeline": {
      return unrollComputedTimeline(block.scriptText);
    }
    case "shift-positions": {
      const { targetSelector, delta } = body;
      if (!targetSelector || !Number.isFinite(delta) || delta === 0) return block.scriptText;
      const { shiftPositionsInScript } = parser;
      return shiftPositionsInScript(block.scriptText, targetSelector, delta, block.root);
    }
    case "shift-positions-batch": {
      const { shiftPositionsInScript } = parser;
      let script = block.scriptText;
      for (const s of body.shifts) {
        if (!s.targetSelector || !Number.isFinite(s.delta) || s.delta === 0) continue;
        script = shiftPositionsInScript(script, s.targetSelector, s.delta, block.root);
      }
      return script;
    }
    case "scale-positions": {
      const { targetSelector, oldStart, oldDuration, newStart, newDuration } = body;
      if (!targetSelector || !Number.isFinite(oldStart) || !Number.isFinite(oldDuration) || !Number.isFinite(newStart) || !Number.isFinite(newDuration) || oldDuration <= 0 || newDuration <= 0)
        return block.scriptText;
      if (oldStart === newStart && oldDuration === newDuration) return block.scriptText;
      const { scalePositionsInScript } = parser;
      return scalePositionsInScript(
        block.scriptText,
        targetSelector,
        oldStart,
        oldDuration,
        newStart,
        newDuration,
        block.root
      );
    }
    default:
      return respond({ error: `unknown mutation type: ${body.type}` }, 400);
  }
}
var CUT_REFUSALS = {
  "target-not-found": "Cut target was not found",
  "reference-without-range": "Cut target starts after another clip and the cut sent no range for it",
  "no-duration": "Cut target has no duration",
  "outside-clip": "Cut point was outside the clip's start and end"
};
async function foldAtomicCutFile(c, file, absPath, before, writer) {
  let after = before;
  let splitCount = 0;
  const skippedSelectors = /* @__PURE__ */ new Set();
  const rightHalfIds = [];
  const respond = (data, status) => status ? c.json(data, status) : c.json(data);
  const orderedTargets = file.targets.map((cut, index) => ({ cut, index })).sort((left, right) => {
    const locatorKey = (entry) => !entry.target.id && !entry.target.hfId && entry.target.selector ? entry.target.selector : null;
    const leftKey = locatorKey(left.cut);
    const rightKey = locatorKey(right.cut);
    if (leftKey && rightKey) {
      return leftKey.localeCompare(rightKey) || (right.cut.target.selectorIndex ?? 0) - (left.cut.target.selectorIndex ?? 0);
    }
    if (leftKey) return -1;
    if (rightKey) return 1;
    return left.index - right.index;
  }).map(({ cut }) => cut);
  for (const cut of orderedTargets) {
    const baseId = cut.originalId || cut.target.id || "clip";
    const split = splitElementInHtml(after, cut.target, cut.splitTime, `${baseId}-split`, {
      start: cut.elementStart,
      duration: cut.elementDuration,
      playbackStart: cut.playbackStart,
      playbackRate: cut.playbackRate,
      track: cut.track
    });
    if (!split.matched || !split.newId) {
      return c.json(
        { error: `${CUT_REFUSALS[split.refusal ?? "target-not-found"]} in ${file.path}` },
        400
      );
    }
    after = split.html;
    splitCount++;
    rightHalfIds.push(split.newId);
    if (!cut.originalId) continue;
    const block = extractGsapScriptBlock(after);
    if (!block) continue;
    const result = await executeGsapMutation(
      {
        type: "split-animations",
        originalId: cut.originalId,
        newId: split.newId,
        splitTime: cut.splitTime,
        elementStart: cut.elementStart,
        elementDuration: cut.elementDuration
      },
      block,
      respond,
      writer
    );
    if (result instanceof Response) return result;
    let script = typeof result === "string" ? result : result.script;
    if (typeof result !== "string") {
      for (const selector of result.skippedSelectors) skippedSelectors.add(selector);
    }
    if (script !== block.scriptText) {
      script = writer === "acorn" ? syncPositionHoldsBeforeKeyframes(script, block.scriptText) : (await loadGsapParser()).syncPositionHoldsBeforeKeyframes(script, block.scriptText);
      after = block.replaceScript(script);
    }
  }
  after = relinkSplitHalvesInHtml(after, rightHalfIds);
  return {
    path: file.path,
    absPath,
    before,
    after,
    splitCount,
    skippedSelectors: [...skippedSelectors]
  };
}
var MAX_UPLOAD_BYTES = 500 * 1024 * 1024;
async function processUploadedFiles(formData, targetDir, projectDir) {
  const uploaded = [];
  const skipped = [];
  const invalid = [];
  const unchecked = [];
  const entries = formData.entries();
  const subDir = targetDir === projectDir ? "" : targetDir.slice(projectDir.length + 1);
  for (const [, value] of entries) {
    if (typeof value === "string") continue;
    const name = value.name.split("/").pop()?.split("\\").pop() ?? "";
    if (!name || name.includes("\0") || name.includes("..")) continue;
    if (value.size > MAX_UPLOAD_BYTES) {
      skipped.push(name);
      continue;
    }
    const destPath = resolve2(targetDir, name);
    if (!isSafePath(projectDir, destPath)) continue;
    let finalPath = destPath;
    let finalName = name;
    const dotIdx = name.indexOf(".", name.startsWith(".") ? 1 : 0);
    const ext = dotIdx > 0 ? name.slice(dotIdx) : "";
    const base = dotIdx > 0 ? name.slice(0, dotIdx) : name;
    const MAX_COPY_INDEX = 1e4;
    let n = 1;
    if (existsSync4(finalPath)) {
      n = 2;
      while (n < MAX_COPY_INDEX && existsSync4(resolve2(targetDir, `${base} (${n})${ext}`))) n++;
      if (n >= MAX_COPY_INDEX) {
        skipped.push(name);
        continue;
      }
      finalName = `${base} (${n})${ext}`;
      finalPath = resolve2(targetDir, finalName);
    }
    if (!isSafePath(projectDir, finalPath) || isPrivateProjectFile(projectDir, finalPath)) continue;
    const buffer = Buffer.from(await value.arrayBuffer());
    const validation = validateUploadedMediaBuffer(finalName, buffer);
    if (!validation.ok) {
      invalid.push({ name: finalName, reason: validation.reason });
      continue;
    }
    let written = false;
    while (n < MAX_COPY_INDEX && isSafePath(projectDir, finalPath)) {
      try {
        createFileAtomically(finalPath, buffer);
        written = true;
        break;
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") {
          throw error;
        }
        n++;
        finalName = `${base} (${n})${ext}`;
        finalPath = resolve2(targetDir, finalName);
      }
    }
    if (!written) {
      if (n >= MAX_COPY_INDEX) skipped.push(name);
      continue;
    }
    const relativePath = subDir ? join6(subDir, finalName) : finalName;
    uploaded.push(relativePath);
    if (validation.unchecked) unchecked.push({ name: finalName, reason: validation.unchecked });
    if (isAudioFile(finalName)) {
      generateWaveformCache(projectDir, relativePath).catch(() => {
      });
    }
  }
  return { uploaded, skipped, invalid, unchecked };
}
var MAX_TEXT_READ_BYTES = 32 * 1024 * 1024;
var GIT_BINARY_SNIFF_BYTES = 8e3;
function registerFileRoutes(api, adapter) {
  api.get("/projects/:id/files/*", async (c) => {
    const res = await resolveProjectFile(c, adapter);
    if ("error" in res) return res.error;
    let fd;
    try {
      fd = openSync(res.absPath, "r");
    } catch {
      if (c.req.query("optional") === "1") {
        return c.json({ filename: res.filePath, content: "", missing: true });
      }
      return c.json({ error: "not found" }, 404);
    }
    try {
      const stat2 = fstatSync(fd);
      if (!stat2.isFile()) {
        return c.json({ error: "not found", why: "not_a_file" }, 404);
      }
      if (stat2.size > MAX_TEXT_READ_BYTES) {
        return c.json({ error: "too large to read as text", why: "too_large" }, 413);
      }
      const content = readFileSync5(fd);
      const version = fileContentVersion(content);
      c.header("ETag", version);
      if (content.subarray(0, GIT_BINARY_SNIFF_BYTES).includes(0)) {
        return c.json({ error: "not a text file", why: "binary", version }, 415);
      }
      return c.json({
        filename: res.filePath,
        content: content.toString("utf-8"),
        version,
        missing: false
      });
    } finally {
      closeSync(fd);
    }
  });
  api.put("/projects/:id/files/*", async (c) => {
    const res = await resolveProjectFile(c, adapter, { pin: true });
    if ("error" in res) return res.error;
    const body = Buffer.from(await c.req.arrayBuffer());
    const expectedVersion = c.req.header("If-Match")?.trim() ?? null;
    const createOnly = c.req.header("If-None-Match")?.trim() === "*";
    if (expectedVersion === null && !createOnly) {
      let currentContent = null;
      try {
        currentContent = readFileSync5(res.absPath);
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
          throw error;
        }
      }
      return c.json(
        {
          error: "precondition required",
          path: res.filePath,
          currentVersion: currentContent === null ? null : fileContentVersion(currentContent),
          currentContent: currentContent?.toString("utf-8") ?? null
        },
        428
      );
    }
    let backup = { backupPath: null };
    let overwrote;
    if (createOnly) {
      ensureDir(res.project.dir, res.absPath);
      try {
        createFileAtomically(res.absPath, body);
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "EEXIST") {
          throw error;
        }
        const currentContent = readFileSync5(res.absPath);
        return c.json(
          {
            error: "file conflict",
            path: res.filePath,
            currentVersion: fileContentVersion(currentContent),
            currentContent: currentContent.toString("utf-8")
          },
          409
        );
      }
    } else {
      let fd;
      try {
        fd = openSync(res.absPath, "r+");
      } catch (error) {
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
          throw error;
        }
        return c.json(
          {
            error: "file conflict",
            path: res.filePath,
            currentVersion: null,
            currentContent: null
          },
          409
        );
      }
      try {
        const currentContent = readFileSync5(fd);
        overwrote = currentContent;
        const currentVersion = fileContentVersion(currentContent);
        if (expectedVersion !== currentVersion) {
          return c.json(
            {
              error: "file conflict",
              path: res.filePath,
              currentVersion,
              currentContent: currentContent.toString("utf-8")
            },
            409
          );
        }
        backup = snapshotBeforeWrite(res.project.dir, res.absPath);
        if (backup.error) return c.json({ error: `backup failed: ${backup.error}` }, 500);
        const mode = fstatSync(fd).mode;
        closeSync(fd);
        fd = null;
        replaceFileAtomically2(res.absPath, body, mode);
      } finally {
        if (fd !== null) closeSync(fd);
      }
    }
    const version = fileContentVersion(body);
    const writeToken = createWriteToken(c.req.header("X-Hyperframes-Write-Token"));
    recordFileWriteReceipt(res.absPath, { path: res.filePath, version, writeToken, overwrote });
    c.header("ETag", version);
    return c.json({
      ok: true,
      path: res.filePath,
      version,
      writeToken,
      backupPath: backupPathForResponse(res.project.dir, backup.backupPath)
    });
  });
  api.post("/projects/:id/files/*", async (c) => {
    const res = await resolveProjectFile(c, adapter);
    if ("error" in res) return res.error;
    ensureDir(res.project.dir, res.absPath);
    const body = Buffer.from(await c.req.arrayBuffer());
    try {
      createFileAtomically(res.absPath, body);
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "EEXIST") {
        throw error;
      }
      return c.json({ error: "already exists" }, 409);
    }
    return c.json({ ok: true, path: res.filePath }, 201);
  });
  api.delete("/projects/:id/files/*", async (c) => {
    const res = await resolveProjectFile(c, adapter, { mustExist: true });
    if ("error" in res) return res.error;
    const stat2 = statSync3(res.absPath);
    const backup = snapshotBeforeWrite(res.project.dir, res.absPath);
    if (backup.error) return c.json({ error: `backup failed: ${backup.error}` }, 500);
    if (stat2.isDirectory()) {
      rmSync3(res.absPath, { recursive: true });
    } else {
      unlinkSync2(res.absPath);
    }
    return c.json({
      ok: true,
      backupPath: backupPathForResponse(res.project.dir, backup.backupPath)
    });
  });
  api.post("/projects/:id/file-mutations/insert-composition/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "insert-composition");
    if ("error" in ctx) return ctx.error;
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.sourcePath !== "string" || typeof body.start !== "number" || !Number.isFinite(body.start) || body.start < 0 || typeof body.track !== "number" || !Number.isFinite(body.track) || typeof body.expectedVersion !== "string") {
      return c.json({ error: "sourcePath, finite placement, and expectedVersion required" }, 400);
    }
    let before;
    try {
      before = readFileSync5(ctx.absPath, "utf-8");
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }
      return c.json({ error: "not found" }, 404);
    }
    const currentVersion = fileContentVersion(before);
    if (body.expectedVersion !== currentVersion) {
      return c.json({ error: "file conflict", currentVersion, currentContent: before }, 409);
    }
    let insertion;
    try {
      insertion = insertCompositionIntoSource({
        projectDir: ctx.project.dir,
        targetPath: ctx.filePath,
        sourcePath: body.sourcePath,
        parentSource: before,
        start: body.start,
        desiredTrack: body.track
      });
    } catch (error) {
      if (error instanceof CompositionInsertionError) {
        return c.json({ error: error.message }, error.status);
      }
      throw error;
    }
    const backup = snapshotBeforeWrite(ctx.project.dir, ctx.absPath);
    if (backup.error) return c.json({ error: `backup failed: ${backup.error}` }, 500);
    const current = readFileSync5(ctx.absPath, "utf-8");
    if (current !== before) {
      const currentVersion2 = fileContentVersion(current);
      return c.json({ error: "file conflict", currentVersion: currentVersion2, currentContent: current }, 409);
    }
    const { version, writeToken } = writeFileWithReceipt(
      c,
      ctx.filePath,
      ctx.absPath,
      insertion.html
    );
    c.header("ETag", version);
    return c.json({
      ok: true,
      path: ctx.filePath,
      hostId: insertion.hostId,
      track: insertion.track,
      duration: insertion.duration,
      before,
      after: insertion.html,
      version,
      writeToken,
      backupPath: backupPathForResponse(ctx.project.dir, backup.backupPath)
    });
  });
  api.post("/projects/:id/file-mutations/remove-element/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "remove-element");
    if ("error" in ctx) return ctx.error;
    if (!existsSync4(ctx.absPath)) {
      return c.json({ error: "not found" }, 404);
    }
    const parsed = await parseMutationBody(c);
    if ("error" in parsed) return parsed.error;
    const originalContent = readFileSync5(ctx.absPath, "utf-8");
    return writeIfChanged(
      c,
      ctx.project.dir,
      ctx.filePath,
      ctx.absPath,
      originalContent,
      removeElementFromHtml(originalContent, parsed.target)
    );
  });
  api.post("/projects/:id/file-mutations/remove-elements/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "remove-elements");
    if ("error" in ctx) return ctx.error;
    if (!existsSync4(ctx.absPath)) {
      return c.json({ error: "not found" }, 404);
    }
    const body = await c.req.json().catch(() => null);
    const targets = body?.targets;
    if (!Array.isArray(targets) || targets.length === 0) {
      return c.json({ error: "targets required" }, 400);
    }
    const originalContent = readFileSync5(ctx.absPath, "utf-8");
    return writeIfChanged(
      c,
      ctx.project.dir,
      ctx.filePath,
      ctx.absPath,
      originalContent,
      removeElementsFromHtml(originalContent, targets)
    );
  });
  api.post("/projects/:id/file-mutations/split-batch", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!Array.isArray(body?.files) || body.files.length === 0 || !body.files.every(isAtomicCutFileRequest)) {
      return c.json({ error: "files with path, expectedVersion, and cut targets required" }, 400);
    }
    const files = body.files;
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    let writer;
    try {
      writer = resolveGsapWriter({
        HYPERFRAMES_GSAP_WRITER: process.env["HYPERFRAMES_GSAP_WRITER"]
      });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
    return serializeAtomicCut(async () => {
      const seen = /* @__PURE__ */ new Set();
      const prepared = [];
      for (const file of files) {
        const absPath = pinWithinProject(project.dir, file.path);
        if (!absPath) return c.json({ error: `forbidden path: ${file.path}` }, 403);
        if (seen.has(absPath)) return c.json({ error: `duplicate path: ${file.path}` }, 400);
        seen.add(absPath);
        let before;
        try {
          before = readFileSync5(absPath, "utf-8");
        } catch {
          return c.json({ error: `not found: ${file.path}` }, 404);
        }
        const currentVersion = fileContentVersion(before);
        if (currentVersion !== file.expectedVersion) {
          return c.json(
            {
              error: `file conflict: ${file.path}`,
              path: file.path,
              currentVersion,
              currentContent: before
            },
            409
          );
        }
        let folded;
        try {
          folded = await foldAtomicCutFile(c, file, absPath, before, writer);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Cut transform failed";
          return c.json({ error: message }, 400);
        }
        if (folded instanceof Response) return folded;
        prepared.push(folded);
      }
      for (const file of prepared) {
        const current = readFileSync5(file.absPath, "utf-8");
        if (current !== file.before) {
          return c.json(
            {
              error: `file conflict: ${file.path}`,
              path: file.path,
              currentVersion: fileContentVersion(current),
              currentContent: current
            },
            409
          );
        }
      }
      const backups = /* @__PURE__ */ new Map();
      for (const file of prepared) {
        const backup = snapshotBeforeWrite(project.dir, file.absPath);
        if (backup.error) {
          return c.json(
            { error: `Failed to create backup for ${file.path}: ${backup.error}` },
            500
          );
        }
        backups.set(file.path, backupPathForResponse(project.dir, backup.backupPath));
      }
      const writeToken = createWriteToken(
        typeof body.transactionToken === "string" ? body.transactionToken : c.req.header("X-Hyperframes-Write-Token")
      );
      const written = [];
      try {
        for (const file of prepared) {
          replaceFileAtomically2(file.absPath, file.after, statSync3(file.absPath).mode);
          written.push(file);
          recordFileWriteReceipt(file.absPath, {
            path: file.path,
            version: fileContentVersion(file.after),
            writeToken,
            overwrote: file.before
          });
        }
      } catch (error) {
        const conflicts = [];
        for (const file of written.reverse()) {
          try {
            const current = readFileSync5(file.absPath, "utf-8");
            if (current !== file.after) {
              conflicts.push(file.path);
              continue;
            }
            replaceFileAtomically2(file.absPath, file.before, statSync3(file.absPath).mode);
            recordFileWriteReceipt(file.absPath, {
              path: file.path,
              version: fileContentVersion(file.before),
              writeToken
            });
          } catch {
            conflicts.push(file.path);
          }
        }
        return c.json(
          {
            error: error instanceof Error ? error.message : "Cut write failed",
            outcome: conflicts.length ? "aborted-with-conflicts" : "aborted-restored",
            conflicts
          },
          conflicts.length ? 409 : 500
        );
      }
      const result = prepared.map((file) => ({
        path: file.path,
        before: file.before,
        after: file.after,
        version: fileContentVersion(file.after),
        writeToken,
        backupPath: backups.get(file.path) ?? null,
        splitCount: file.splitCount,
        skippedSelectors: file.skippedSelectors
      }));
      return c.json({ ok: true, outcome: "committed", files: result });
    });
  });
  api.post("/projects/:id/file-mutations/split-element/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "split-element");
    if ("error" in ctx) return ctx.error;
    const parsed = await parseMutationBody(c);
    if ("error" in parsed) return parsed.error;
    if (typeof parsed.body.splitTime !== "number" || !parsed.body.newId) {
      return c.json({ error: "target, splitTime, and newId required" }, 400);
    }
    const fallbackTiming = typeof parsed.body.elementStart === "number" && typeof parsed.body.elementDuration === "number" ? { start: parsed.body.elementStart, duration: parsed.body.elementDuration } : void 0;
    let originalContent;
    try {
      originalContent = readFileSync5(ctx.absPath, "utf-8");
    } catch {
      return c.json({ error: "not found" }, 404);
    }
    const result = splitElementInHtml(
      originalContent,
      parsed.target,
      parsed.body.splitTime,
      parsed.body.newId,
      fallbackTiming
    );
    if (!result.matched) {
      const version2 = fileContentVersion(originalContent);
      c.header("ETag", version2);
      return c.json({
        ok: false,
        changed: false,
        content: originalContent,
        path: ctx.filePath,
        version: version2
      });
    }
    const mutationResult = writeMutationResult(
      c,
      ctx.project.dir,
      ctx.filePath,
      ctx.absPath,
      result.html,
      originalContent
    );
    if (mutationResult instanceof Response) return mutationResult;
    const { version, backupPath } = mutationResult;
    c.header("ETag", version);
    return c.json({
      ok: true,
      changed: true,
      content: result.html,
      newId: result.newId,
      path: ctx.filePath,
      version,
      backupPath
    });
  });
  api.post("/projects/:id/file-mutations/patch-element/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "patch-element");
    if ("error" in ctx) return ctx.error;
    const parsed = await parseMutationBody(c);
    if ("error" in parsed) return parsed.error;
    if (!Array.isArray(parsed.body.operations) || parsed.body.operations.length === 0) {
      return c.json({ error: "target and operations required" }, 400);
    }
    const { fontFaceCss } = parsed.body;
    if (fontFaceCss !== void 0 && !isStudioFontFaceCss(fontFaceCss)) {
      return c.json({ error: "fontFaceCss must be one @font-face rule" }, 400);
    }
    const unsafeFields = findUnsafeDomPatchValues(parsed.body);
    if (unsafeFields.length > 0) {
      return rejectUnsafeMutationValues(c, unsafeFields);
    }
    for (let attempt = 1; ; attempt += 1) {
      let originalContent;
      try {
        originalContent = readFileSync5(ctx.absPath, "utf-8");
      } catch {
        return c.json({ error: "not found" }, 404);
      }
      const takenIds = parsed.body.operations.some((op) => op.type === "ensure-id") ? projectHtmlIds(ctx.project.dir) : void 0;
      const element = patchElementInHtml(
        originalContent,
        parsed.target,
        parsed.body.operations,
        takenIds
      );
      const { matched } = element;
      const patched = matched && isStudioFontFaceCss(fontFaceCss) ? ensureStudioFontFaceCss(element.html, fontFaceCss) : element.html;
      if (patched === originalContent) {
        const version2 = fileContentVersion(originalContent);
        c.header("ETag", version2);
        return c.json({
          ok: true,
          changed: false,
          matched,
          elementId: element.elementId,
          content: originalContent,
          path: ctx.filePath,
          version: version2
        });
      }
      const mutationResult = writeMutationResult(
        c,
        ctx.project.dir,
        ctx.filePath,
        ctx.absPath,
        patched,
        originalContent
      );
      if (mutationResult instanceof Response) {
        if (mutationResult.status === 409 && attempt < PATCH_CONFLICT_ATTEMPTS) continue;
        return mutationResult;
      }
      const { backupPath, version } = mutationResult;
      c.header("ETag", version);
      return c.json({
        ok: true,
        changed: true,
        matched,
        elementId: element.elementId,
        content: patched,
        path: ctx.filePath,
        version,
        backupPath
      });
    }
  });
  api.post("/projects/:id/file-mutations/patch-element-batches", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const body = await c.req.json().catch(() => null);
    if (typeof body !== "object" || body === null || !("batches" in body) || !Array.isArray(body.batches) || body.batches.length === 0 || !body.batches.every(isElementPatchBatchRequest)) {
      return c.json({ error: "batches with sourceFile and patches required" }, 400);
    }
    const unsafeFields = findUnsafeElementPatchBatchValues(body.batches);
    if (unsafeFields.length > 0) return rejectUnsafeMutationValues(c, unsafeFields);
    const result = commitElementPatchBatchesWithReceipts(c, project.dir, body.batches);
    if ("error" in result) {
      return elementPatchBatchCommitErrorResponse(c, result.error, result.sourceFile);
    }
    return c.json(result);
  });
  api.post("/projects/:id/file-mutations/patch-elements-batch/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "patch-elements-batch");
    if ("error" in ctx) return ctx.error;
    const body = await c.req.json().catch(() => null);
    if (!body || !Array.isArray(body.patches) || body.patches.length === 0 || !body.patches.every(isElementPatchRequest)) {
      return c.json({ error: "patches with target and operations required" }, 400);
    }
    const batch = { sourceFile: ctx.filePath, patches: body.patches };
    const unsafeFields = findUnsafeElementPatchBatchValues([batch]);
    if (unsafeFields.length > 0) {
      return rejectUnsafeMutationValues(c, unsafeFields);
    }
    const result = commitElementPatchBatchesWithReceipts(c, ctx.project.dir, [batch]);
    if ("error" in result) {
      return elementPatchBatchCommitErrorResponse(c, result.error, result.sourceFile);
    }
    const file = result.files[0];
    if (!file) return c.json({ error: "empty element patch result" }, 500);
    return c.json({
      ok: true,
      changed: file.changed,
      matched: file.matched,
      content: file.after,
      path: file.sourceFile,
      backupPath: file.backupPath
    });
  });
  api.post("/projects/:id/file-mutations/wrap-elements/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "wrap-elements");
    if ("error" in ctx) return ctx.error;
    const body = await c.req.json().catch(() => null);
    if (!Array.isArray(body?.targets) || body.targets.length === 0 || !body.groupId) {
      return c.json({ error: "targets and groupId required" }, 400);
    }
    const bbox = body.bbox ?? {};
    const bboxNums = [bbox.left, bbox.top, bbox.width, bbox.height];
    const rebases = body.rebases ?? [];
    const allNumeric = bboxNums.every((n) => typeof n === "number" && Number.isFinite(n)) && rebases.every(
      (r) => typeof r?.left === "number" && Number.isFinite(r.left) && typeof r?.top === "number" && Number.isFinite(r.top) && isOptionalInteger(r?.track)
    );
    if (!allNumeric) {
      return c.json({ error: "bbox and rebase coordinates must be finite numbers" }, 400);
    }
    let originalContent;
    try {
      originalContent = readFileSync5(ctx.absPath, "utf-8");
    } catch {
      return c.json({ error: "not found" }, 404);
    }
    const result = wrapElementsInHtml(
      originalContent,
      body.targets,
      body.groupId,
      { left: bbox.left, top: bbox.top, width: bbox.width, height: bbox.height },
      rebases
    );
    if (!result.matched) {
      return c.json(
        {
          ok: false,
          changed: false,
          content: originalContent,
          path: ctx.filePath,
          error: result.error
        },
        result.error === "grouped elements must share a single parent" ? 422 : 400
      );
    }
    const mutationResult = writeMutationResult(
      c,
      ctx.project.dir,
      ctx.filePath,
      ctx.absPath,
      result.html,
      originalContent
    );
    if (mutationResult instanceof Response) return mutationResult;
    const { backupPath } = mutationResult;
    return c.json({
      ok: true,
      changed: true,
      groupId: result.groupId,
      content: result.html,
      path: ctx.filePath,
      backupPath
    });
  });
  api.post("/projects/:id/file-mutations/unwrap-elements/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "unwrap-elements");
    if ("error" in ctx) return ctx.error;
    const parsed = await parseMutationBody(c);
    if ("error" in parsed) return parsed.error;
    const rawChildTracks = parsed.body.childTracks ?? [];
    if (!rawChildTracks.every((entry) => isOptionalInteger(entry?.track))) {
      return c.json({ error: "childTracks track must be a finite integer" }, 400);
    }
    const childTracks = rawChildTracks.filter(
      (entry) => Boolean(entry?.target)
    ).map((entry) => ({ target: entry.target, track: entry.track }));
    let originalContent;
    try {
      originalContent = readFileSync5(ctx.absPath, "utf-8");
    } catch {
      return c.json({ error: "not found" }, 404);
    }
    const result = unwrapElementsFromHtml(originalContent, parsed.target, childTracks);
    if (!result.unwrapped) {
      return c.json({ ok: false, changed: false, content: originalContent, path: ctx.filePath });
    }
    let cleaned = result.html;
    if (result.unwrappedGroupId && result.members && result.groupCenter) {
      cleaned = bakeGroupTransformIntoMembers(
        cleaned,
        result.unwrappedGroupId,
        result.members,
        result.groupCenter
      );
    }
    if (result.unwrappedGroupId) {
      cleaned = stripGsapAnimationsForSelector(cleaned, `#${result.unwrappedGroupId}`);
    }
    return writeIfChanged(c, ctx.project.dir, ctx.filePath, ctx.absPath, originalContent, cleaned);
  });
  api.post("/projects/:id/file-mutations/probe-element/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "probe-element");
    if ("error" in ctx) return ctx.error;
    const parsed = await parseMutationBody(c);
    if ("error" in parsed) return parsed.error;
    let content;
    try {
      content = readFileSync5(ctx.absPath, "utf-8");
    } catch {
      return c.json({ exists: false });
    }
    const exists = probeElementInSource(content, parsed.target);
    return c.json({ exists });
  });
  api.post("/projects/:id/file-mutations/probe-elements/*", async (c) => {
    const ctx = await resolveFileMutationContext(c, adapter, "probe-elements");
    if ("error" in ctx) return ctx.error;
    const body = await c.req.json().catch(() => null);
    if (!Array.isArray(body?.targets)) return c.json({ error: "targets required" }, 400);
    let content;
    try {
      content = readFileSync5(ctx.absPath, "utf-8");
    } catch {
      return c.json({ exists: body.targets.map(() => false) });
    }
    return c.json({ exists: probeElementsInSource(content, body.targets) });
  });
  api.patch("/projects/:id/files/*", async (c) => {
    const res = await resolveProjectFile(c, adapter, { mustExist: true });
    if ("error" in res) return res.error;
    const body = await c.req.json();
    const newPath = body !== null && typeof body === "object" && "newPath" in body ? body.newPath : void 0;
    if (typeof newPath !== "string" || !newPath || newPath.includes("\0") || /[\uD800-\uDFFF]/u.test(newPath)) {
      return c.json({ error: "newPath required" }, 400);
    }
    const newAbs = resolveWithinProject(res.project.dir, newPath);
    if (!newAbs) {
      return c.json({ error: "forbidden" }, 403);
    }
    if (existsSync4(newAbs)) {
      return c.json({ error: "already exists" }, 409);
    }
    const isDirectory = statSync3(res.absPath, { throwIfNoEntry: false })?.isDirectory() ?? false;
    ensureDir(res.project.dir, newAbs);
    renameSync2(res.absPath, newAbs);
    const updatedFiles = updateReferences(res.project.dir, res.filePath, newPath, isDirectory);
    return c.json({ ok: true, path: newPath, updatedReferences: updatedFiles });
  });
  api.post("/projects/:id/duplicate-file", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const body = await c.req.json();
    if (!body.path || body.path.includes("\0")) {
      return c.json({ error: "path required" }, 400);
    }
    const srcAbs = resolveWithinProject(project.dir, body.path);
    if (!srcAbs || !existsSync4(srcAbs)) {
      return c.json({ error: "not found" }, 404);
    }
    const copyPath = generateCopyPath(project.dir, body.path);
    const destAbs = resolveWithinProject(project.dir, copyPath);
    if (!destAbs) {
      return c.json({ error: "forbidden" }, 403);
    }
    ensureDir(project.dir, destAbs);
    try {
      createFileAtomically(destAbs, readFileSync5(srcAbs));
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "EEXIST") {
        throw error;
      }
      return c.json({ error: "already exists" }, 409);
    }
    return c.json({ ok: true, path: copyPath }, 201);
  });
  api.post(
    "/projects/:id/upload",
    bodyLimit({
      maxSize: MAX_UPLOAD_BYTES,
      onError: (c) => c.json({ error: "payload too large" }, 413)
    }),
    async (c) => {
      const project = await adapter.resolveProject(c.req.param("id"));
      if (!project) return c.json({ error: "not found" }, 404);
      if (folderGone(project.dir)) return projectDirMissing(c);
      const subDir = c.req.query("dir") ?? "";
      const targetDir = subDir ? resolveWithinProject(project.dir, subDir) : project.dir;
      if (!targetDir) return c.json({ error: "forbidden" }, 403);
      const formData = await c.req.formData();
      mkdirWithinProject(project.dir, targetDir);
      const result = await processUploadedFiles(formData, targetDir, project.dir);
      if (folderGone(project.dir)) return projectDirMissing(c);
      return c.json(
        {
          ok: true,
          files: result.uploaded,
          skipped: result.skipped,
          invalid: result.invalid,
          unchecked: result.unchecked
        },
        201
      );
    }
  );
  api.get("/projects/:id/gsap-animations/*", async (c) => {
    const res = await resolveProjectPath(c, adapter, "gsap-animations", {
      mustExist: true
    });
    if ("error" in res) return res.error;
    const html = readFileSync5(res.absPath, "utf-8");
    const etag = `${fileContentVersion(html).slice(0, -1)}:gsap-animations:v1"`;
    const headers = { ETag: etag, "Cache-Control": "no-cache" };
    if (c.req.header("If-None-Match") === etag) return new Response(null, { status: 304, headers });
    const block = extractGsapScriptBlock(html);
    if (!block) {
      return c.json(
        { animations: [], timelineVar: "tl", preamble: "", postamble: "" },
        200,
        headers
      );
    }
    return c.json(parseGsapScriptAcorn(block.scriptText), 200, headers);
  });
  api.get("/projects/:id/gsap-mutation-capabilities", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    return c.json({ atomicOwnershipPairs: true });
  });
  api.post("/projects/:id/gsap-mutations/*", async (c) => {
    const res = await resolveProjectPath(c, adapter, "gsap-mutations", {
      mustExist: true,
      pin: true
    });
    if ("error" in res) return res.error;
    const body = await c.req.json().catch(() => null);
    if (!body) return c.json({ error: "mutation type required" }, 400);
    const error = validateGsapMutationRequest(c, body);
    if (error) return error;
    return applyGsapMutations(c, res, [body]);
  });
  api.post("/projects/:id/gsap-mutations-batch/*", async (c) => {
    const res = await resolveProjectPath(c, adapter, "gsap-mutations-batch", {
      mustExist: true,
      pin: true
    });
    if ("error" in res) return res.error;
    const body = await c.req.json().catch(() => null);
    if (!body || !Array.isArray(body.mutations) || body.mutations.length === 0) {
      return c.json({ error: "mutations array required" }, 400);
    }
    for (const mutation of body.mutations) {
      const error = validateGsapMutationRequest(c, mutation);
      if (error) return error;
    }
    return applyGsapMutations(c, res, body.mutations);
  });
  api.post("/projects/:id/gsap-mutation-rollback/*", async (c) => {
    const res = await resolveProjectPath(c, adapter, "gsap-mutation-rollback", {
      mustExist: true,
      pin: true
    });
    if ("error" in res) return res.error;
    const body = await c.req.json().catch(() => null);
    if (!body || typeof body.expected !== "string" || typeof body.restore !== "string") {
      return c.json({ error: "expected and restore contents required" }, 400);
    }
    const current = readFileSync5(res.absPath, "utf-8");
    if (current !== body.expected) {
      return c.json({ ok: true, restored: false, conflict: true });
    }
    replaceFileAtomically2(res.absPath, body.restore, statSync3(res.absPath).mode);
    return c.json({ ok: true, restored: true, conflict: false });
  });
}

// src/routes/preview.ts
import { parseHTML as parseHTML7 } from "linkedom";
import { createReadStream, existsSync as existsSync5, readFileSync as readFileSync6, statSync as statSync4 } from "fs";
import { stripSdrPngColourTags } from "@hyperframes/core/compiler/png-colour-tags";
import { Readable } from "stream";
import { join as join8, resolve as resolve4 } from "path";
import { createHash as createHash3 } from "crypto";
import {
  AFTER_FONTS_SCRIPT_TYPE,
  addScenePartsManifest,
  RUNTIME_BOOTSTRAP_ATTR as RUNTIME_BOOTSTRAP_ATTR2,
  insertBeforeCloseTag as insertBeforeCloseTag3,
  insertRuntimeTag,
  stripEmbeddedRuntimeScripts as stripEmbeddedRuntimeScripts2
} from "@hyperframes/core/compiler";
import {
  STUDIO_PREVIEW_CAPTURE_MODE,
  STUDIO_PREVIEW_MARK_META,
  STUDIO_PREVIEW_ERROR_KINDS,
  STUDIO_PREVIEW_ERRORS
} from "@hyperframes/core/studio-preview-mark";
import {
  PREVIEW_PROXY_BOX_PARAM,
  PREVIEW_PROXY_LIGHT_PARAM,
  PREVIEW_PROXY_PRIORITY_HEADER,
  PREVIEW_PROXY_PROGRESS_HEADER,
  PREVIEW_PROXY_RETRY_PARAM,
  PREVIEW_PROXY_STILL_PARAM,
  parsePreviewProxyBox
} from "@hyperframes/core";
import {
  GSAP_BASE_URL_META,
  gsapCdnDist as gsapCdnDist2,
  motionPathPluginUrl,
  normalizeGsapBaseUrl,
  normalizeGsapLocalRoot
} from "@hyperframes/core/gsap-cdn";
import { findStartTags as findStartTags5, injectTagsAtHeadStart as injectTagsAtHeadStart2 } from "@hyperframes/core/compiler/html-document";
import { isWithinProjectRoot } from "@hyperframes/parsers/asset-resolution";

// src/helpers/rootImportMap.ts
import { findStartTags as findStartTags3, injectTagsAtHeadStart } from "@hyperframes/core/compiler/html-document";
var IMPORT_MAP_TYPE = /\btype\s*=\s*["']?importmap["']?(?=[\s/>])/i;
function findImportMap(html) {
  for (const at of findStartTags3(html, "script")) {
    const open2 = /^<script\b[^>]*>/i.exec(html.slice(at));
    if (!open2 || !IMPORT_MAP_TYPE.test(open2[0])) continue;
    const start = at + open2[0].length;
    const end = html.toLowerCase().indexOf("</script", start);
    if (end !== -1) return { start, end, json: html.slice(start, end) };
  }
  return null;
}
function withRootImportMap(html, base) {
  const ours = { "/": base, [base]: base };
  const own = findImportMap(html);
  if (!own)
    return injectTagsAtHeadStart(
      html,
      `<script type="importmap">${JSON.stringify({ imports: ours })}</script>`
    );
  let map;
  try {
    map = JSON.parse(own.json);
  } catch {
    return html;
  }
  if (!map || typeof map !== "object") return html;
  const under = (path) => underBase(path, base);
  const moved = (entries = {}) => Object.fromEntries(
    Object.entries(entries).map(([key, target]) => [key, under(String(target))])
  );
  const merged = { ...map, imports: { ...ours, ...moved(map.imports) } };
  if (map.scopes)
    merged.scopes = Object.fromEntries(
      Object.entries(map.scopes).map(([scope, entries]) => [under(scope), moved(entries)])
    );
  return html.slice(0, own.start) + JSON.stringify(merged) + html.slice(own.end);
}

// src/routes/preview.ts
import { ensureHfIds as ensureHfIds2 } from "@hyperframes/parsers/hf-ids";

// src/helpers/previewReads.ts
import { readlinkSync as readlinkSync2 } from "fs";
import { dirname as dirname4, join as join7, parse, relative as relative3, resolve as resolve3 } from "path";
import { parseHTML as parseHTML5 } from "linkedom";
var ALWAYS_AFFECTS = ["hyperframes.json", ...STUDIO_SIGNATURE_MANIFEST_PATHS];
var MAX_PREVIEW_PATH_LENGTH = 4096;
var SHOW_ELEMENT = 1;
var REFERENCE = /\b(?:src|href|poster|data-composition-src)\s*=\s*(?:"([^"\n]*)"|'([^'\n]*)')|url\(\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^"'\s)]+))/gi;
var REFERENCE_ATTRIBUTE = /\b(?:src|href|poster|data-composition-src)$/i;
var isElement = (node) => node.nodeType === 1;
var pathKey = process.platform === "darwin" || process.platform === "win32" ? (path) => resolve3(path).toLowerCase() : (path) => resolve3(path);
var readsByProject = /* @__PURE__ */ new Map();
var builtProjects = /* @__PURE__ */ new Set();
var projectKey = (projectDir) => pathKey(realFilePath(resolve3(projectDir)));
var inRealProject = (projectDir, path) => join7(realFilePath(resolve3(projectDir)), relative3(resolve3(projectDir), resolve3(projectDir, path)));
var readLink = (path) => {
  try {
    return readlinkSync2(path);
  } catch {
    return null;
  }
};
function linksOnTheWay(path) {
  const passed = [];
  let at = parse(path).root;
  let rest = path.slice(at.length).split(/[\\/]+/);
  for (let hops = 0; rest.length > 0; ) {
    const part = rest.shift();
    if (!part || part === ".") continue;
    if (part === "..") {
      at = dirname4(at);
      continue;
    }
    const next = join7(at, part);
    if (next.length > MAX_PREVIEW_PATH_LENGTH) return passed;
    const target = hops < 40 ? readLink(next) : null;
    if (target === null) {
      at = next;
      continue;
    }
    hops++;
    passed.push(next);
    const root = parse(target).root;
    if (root) at = root;
    rest = [...target.slice(root.length).split(/[\\/]+/), ...rest];
  }
  passed.push(at);
  return passed;
}
function recordPreviewRead(projectDir, filePath) {
  if (filePath.length > MAX_PREVIEW_PATH_LENGTH) return;
  const key = projectKey(projectDir);
  let reads = readsByProject.get(key);
  if (!reads) readsByProject.set(key, reads = /* @__PURE__ */ new Set());
  const read = inRealProject(projectDir, filePath);
  if (read.length > MAX_PREVIEW_PATH_LENGTH) return;
  for (const found of [read, ...linksOnTheWay(read)]) {
    for (let path = pathKey(found); !reads.has(path); path = dirname4(path)) reads.add(path);
  }
}
function recordPreviewReferences(projectDir, html) {
  const named = /* @__PURE__ */ new Set();
  const add = (reference) => {
    const url = reference.trim();
    if (!url || /^(?:[a-z][a-z0-9+.-]*:|[/#])/i.test(url)) return;
    const path = url.split(/[?#]/)[0] ?? "";
    let decoded = path;
    try {
      decoded = decodeURIComponent(path);
    } catch {
    }
    if (decoded && decoded.length <= MAX_PREVIEW_PATH_LENGTH) named.add(decoded);
  };
  const scan = (text2) => {
    for (const match of text2.matchAll(REFERENCE)) {
      add(match[1] ?? match[2] ?? match[3] ?? match[4] ?? match[5] ?? "");
    }
  };
  const scanElement = (element) => {
    for (const attribute of element.attributes) {
      if (REFERENCE_ATTRIBUTE.test(attribute.name)) add(attribute.value);
    }
    const style = element.getAttribute("style");
    if (style) scan(style);
    if (element.localName === "style" || element.localName === "script") {
      scan(element.textContent ?? "");
    }
  };
  const { document } = parseHTML5(html);
  for (const root of document.children) {
    scanElement(root);
    const elements = document.createTreeWalker(root, SHOW_ELEMENT);
    for (let node = elements.nextNode(); node; node = elements.nextNode()) {
      if (isElement(node)) scanElement(node);
    }
  }
  for (const path of named) recordPreviewRead(projectDir, path);
}
function recordPreviewBuilt(projectDir) {
  for (const path of ALWAYS_AFFECTS) recordPreviewRead(projectDir, path);
  builtProjects.add(projectKey(projectDir));
}
function affectsPreview(projectDir, changedPath) {
  const key = projectKey(projectDir);
  if (!builtProjects.has(key)) return true;
  return readsByProject.get(key)?.has(pathKey(inRealProject(projectDir, changedPath))) ?? false;
}

// src/helpers/variablesPayload.ts
var VARIABLES_PAYLOAD_ERROR = "variables must be a JSON object of {variableId: value}";
function isVariablesPayload(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// src/helpers/previewVariables.ts
function injectPreviewVariables(html, values) {
  const json = JSON.stringify(values).replace(/</g, "\\u003c");
  const tag = `<script data-hf-preview-variables>window.__hfVariables=${json};</script>`;
  for (const pattern of [/<head/i, /<html/i, /^\s*<!doctype/i]) {
    const match = pattern.exec(html);
    if (match) {
      const end = html.indexOf(">", match.index + match[0].length);
      if (end < 0) continue;
      const at = end + 1;
      return html.slice(0, at) + tag + html.slice(at);
    }
  }
  return tag + html;
}

// src/helpers/lazyPreviewImages.ts
import { findStartTags as findStartTags4 } from "@hyperframes/core/compiler/html-document";
import { parseHTML as parseHTML6 } from "linkedom";
import { STUDIO_PREVIEW_LAZY_ATTR } from "@hyperframes/core/studio-preview-mark";
function startsAfterZero(el) {
  for (let node = el; node; node = node.parentElement) {
    if (Number(node.getAttribute("data-start")) > 0) return true;
  }
  return false;
}
var hasLoading = (img) => Array.from(img.attributes).some((attr) => attr.name.toLowerCase() === "loading");
function lazyPreviewImages(html) {
  if (!/<!doctype|<html[\s>]/i.test(html)) return html;
  const tags = findStartTags4(html, "img");
  if (tags.length === 0) return html;
  const images = [...parseHTML6(html).document.querySelectorAll("img")];
  if (tags.length !== images.length) return html;
  const parts = [];
  let from = 0;
  images.forEach((img, i) => {
    if (hasLoading(img) || !startsAfterZero(img)) return;
    const at = (tags[i] ?? 0) + 4;
    parts.push(html.slice(from, at), ` loading="lazy" ${STUDIO_PREVIEW_LAZY_ATTR}`);
    from = at;
  });
  parts.push(html.slice(from));
  return parts.join("");
}

// src/routes/preview.ts
var PROJECT_SIGNATURE_META = "hyperframes-project-signature";
function escapeGsapUrl(url) {
  return url.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function gsapScriptTag(file, baseUrl) {
  return `<script src="${escapeGsapUrl(gsapCdnDist2(void 0, baseUrl) + file)}"></script>`;
}
function injectProjectSignature(html, signature) {
  const tag = `<meta name="${PROJECT_SIGNATURE_META}" content="${signature}">`;
  if (html.includes(`name="${PROJECT_SIGNATURE_META}"`)) {
    return html.replace(
      new RegExp(`<meta\\s+name=["']${PROJECT_SIGNATURE_META}["'][^>]*>`, "i"),
      tag
    );
  }
  return insertBeforeCloseTag3(html, "head", `${tag}
`) ?? `${tag}
${html}`;
}
function readStudioMotionManifestContent(projectDir) {
  const manifestPath = join8(projectDir, STUDIO_MOTION_PATH);
  if (!existsSync5(manifestPath)) return "";
  try {
    return readFileSync6(manifestPath, "utf-8");
  } catch {
    return "";
  }
}
function parseStudioMotionManifestContent(content) {
  try {
    const parsed = JSON.parse(content);
    const motions = Array.isArray(parsed.motions) ? parsed.motions : [];
    return {
      hasMotion: motions.length > 0,
      hasCustomEase: motions.some((motion) => Boolean(motion?.customEase))
    };
  } catch {
    return { hasMotion: false, hasCustomEase: false };
  }
}
function withPreviewRuntime(html, runtimeUrl) {
  const tag = `<script ${RUNTIME_BOOTSTRAP_ATTR2}="1" src="${runtimeUrl}"></script>`;
  return insertRuntimeTag(stripEmbeddedRuntimeScripts2(html), tag);
}
function injectScriptTagIntoHead(html, scriptTag) {
  return insertBeforeCloseTag3(html, "head", `${scriptTag}
`) ?? `${scriptTag}
${html}`;
}
function htmlHasCustomEase(html) {
  return /<script\b[^>]*src=["'][^"']*CustomEase/i.test(html) || /\bwindow\.CustomEase\b/.test(html) || /\bCustomEase\s*=\s*/.test(html);
}
function htmlUsesMotionPath(html) {
  return /motionPath\s*[:{]/.test(html);
}
function htmlHasMotionPathPlugin(html) {
  return /<script\b[^>]*src=["'][^"']*MotionPathPlugin/i.test(html) || /\bwindow\.MotionPathPlugin\b/.test(html) || /\bMotionPathPlugin\s*=\s*/.test(html);
}
function injectMotionPathPluginIfNeeded(html, baseUrl) {
  if (!htmlUsesMotionPath(html) || htmlHasMotionPathPlugin(html)) return html;
  const gsap = findGsapCoreScript(html);
  if (gsap) {
    const version = gsap.src.match(/gsap@([\d.]+)/)?.[1];
    const ordering = `${gsap.type ? ` type="${gsap.type}"` : ""}${gsap.defer ? " defer" : ""}`;
    const pluginTag = `<script${ordering} src="${escapeGsapUrl(motionPathPluginUrl(version, baseUrl))}"></script>`;
    return html.slice(0, gsap.end) + "\n" + pluginTag + html.slice(gsap.end);
  }
  return injectScriptTagIntoHead(html, gsapScriptTag("MotionPathPlugin.min.js", baseUrl));
}
function findGsapCoreScript(html) {
  const scripts = [...parseHTML7(html).document.querySelectorAll("script")];
  const starts = findStartTags5(html, "script");
  if (starts.length !== scripts.length) return null;
  const at = scripts.findIndex(
    (script) => isGsapCoreUrl(lowerCaseAttributes(script).get("src") ?? "")
  );
  if (at === -1) return null;
  const attributes = lowerCaseAttributes(scripts[at]);
  const end = scriptCloseEnd(html, starts[at]);
  if (end === 0) return null;
  return {
    src: attributes.get("src"),
    type: attributes.get("type") ?? null,
    defer: attributes.has("defer"),
    end
  };
}
function lowerCaseAttributes(el) {
  return new Map([...el.attributes].map((a) => [a.name.toLowerCase(), a.value]));
}
function scriptCloseEnd(html, start) {
  const close = /<\/script/gi;
  close.lastIndex = start;
  const closeAt = close.exec(html)?.index;
  return closeAt === void 0 ? 0 : html.indexOf(">", closeAt) + 1;
}
function injectStudioMotionDependencies(html, manifestContent, baseUrl) {
  const manifest = parseStudioMotionManifestContent(manifestContent);
  if (!manifest.hasMotion) return html;
  let next = html;
  if (!htmlHasGsapCore(next)) {
    const core = gsapScriptTag("gsap.min.js", baseUrl);
    next = insertGsapCoreBeforeHeadPlugin(next, core) ?? injectScriptTagIntoHead(next, core);
  }
  if (manifest.hasCustomEase && !htmlHasCustomEase(next)) {
    next = injectScriptTagIntoHead(next, gsapScriptTag("CustomEase.min.js", baseUrl));
  }
  return next;
}
function readStudioMotion(projectDir, activeCompositionPath) {
  const manifestContent = readStudioMotionManifestContent(projectDir);
  const script = createStudioMotionRenderBodyScript(manifestContent, {
    activeCompositionPath
  });
  return script ? { manifestContent, script } : null;
}
function injectStudioMotionScript(html, script) {
  const tag = `<script type="${AFTER_FONTS_SCRIPT_TYPE}">${script.replace(/<\/script/gi, "<\\/script")}</script>`;
  return insertBeforeCloseTag3(html, "body", tag) ?? `${html}${tag}`;
}
var GSAP_FALLBACK_ATTR = "data-hf-gsap-fallback";
function gsapCdnFallbackScript(baseUrl) {
  return `<script ${GSAP_FALLBACK_ATTR}>
(function(){
  var cdnBase=${scriptJson(gsapCdnDist2(void 0, baseUrl))};
  var loaded={};
  function loadFallback(file){
    if(loaded[file])return loaded[file];
    return loaded[file]=new Promise(function(ok,fail){
      var s=document.createElement("script");
      s.src=cdnBase+file;s.hfGsapFallback=true;s.onload=ok;s.onerror=fail;
      document.head.appendChild(s);
    });
  }
  document.addEventListener("error",function(e){
    var t=e.target;
    if(!t||t.tagName!=="SCRIPT"||!t.src||t.hfGsapFallback)return;
    var m=t.src.match(/gsap[^/]*\\/dist\\/(.+\\.js)/);
    if(m)loadFallback(m[1]).catch(function(){
      reportError(new Error("GSAP could not load from "+t.src+" or "+cdnBase+m[1]+", so this preview's animations will not play."));
    });
  },true);
})();
</script>`;
}
function injectGsapCdnFallback(html, baseUrl) {
  if (html.includes(GSAP_FALLBACK_ATTR)) return html;
  if (html.includes("<head>"))
    return html.replace("<head>", "<head>" + gsapCdnFallbackScript(baseUrl));
  return gsapCdnFallbackScript(baseUrl) + html;
}
function parsePreviewVariablesParam(raw) {
  if (raw === void 0 || raw === "") return { ok: true, values: null };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "variables must be valid JSON" };
  }
  if (!isVariablesPayload(parsed)) {
    return { ok: false, error: VARIABLES_PAYLOAD_ERROR };
  }
  return { ok: true, values: parsed };
}
function variablesEtagSalt(raw) {
  if (!raw) return "";
  return `:vars:${createHash3("sha1").update(raw).digest("hex").slice(0, 12)}`;
}
function previewVariablesFromRequest(rawVariables) {
  const parse2 = parsePreviewVariablesParam(rawVariables);
  if (!parse2.ok) return { error: parse2.error };
  return { raw: rawVariables, values: parse2.values };
}
var PREVIEW_CAPTURE_PARAM = "hf-capture";
function scriptJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
var earlyErrorsScript = (runtimeUrl) => `<script>(function(){var seen=window.${STUDIO_PREVIEW_ERRORS}=[],kinds=window.${STUDIO_PREVIEW_ERROR_KINDS}=[],known={SyntaxError:1,TypeError:1,ReferenceError:1,RangeError:1},runtime=${scriptJson(new URL(runtimeUrl, "http://x").pathname)};
addEventListener("error",function(e){seen.push(e.message||String(e));
var name=e.error&&e.error.constructor&&e.error.constructor.name,path="";
try{var url=e.filename&&new URL(e.filename,window.location.href);if(url&&url.origin===window.location.origin)path=url.pathname}catch(_){}
kinds.push({name:known[name]===1?name:"other",origin:!path?"unknown":path===runtime?"runtime":path.indexOf("/api/projects/")===0?"project":"studio"})});})();</script>`;
function injectStudioPreviewAugmentations(html, adapter, signature, projectDir, activeCompositionPath, options) {
  const marked = options.capture ? injectTagsAtHeadStart2(
    html,
    `<meta name="${STUDIO_PREVIEW_MARK_META}" content="${STUDIO_PREVIEW_CAPTURE_MODE}">`
  ) : injectTagsAtHeadStart2(
    lazyPreviewImages(html),
    `<meta name="${STUDIO_PREVIEW_MARK_META}">${earlyErrorsScript(adapter.runtimeUrl)}`
  );
  const withFallback = injectGsapCdnFallback(
    injectProjectSignature(
      injectTagsAtHeadStart2(
        marked,
        `<meta name="${GSAP_BASE_URL_META}" content="${escapeGsapUrl(options.gsapBaseUrl)}">`
      ),
      signature
    ),
    options.gsapBaseUrl
  );
  const studioMotion = readStudioMotion(projectDir, activeCompositionPath);
  const withMotionDependencies = studioMotion ? injectStudioMotionDependencies(
    withFallback,
    studioMotion.manifestContent,
    options.gsapBaseUrl
  ) : withFallback;
  const withPlugin = injectMotionPathPluginIfNeeded(withMotionDependencies, options.gsapBaseUrl);
  return studioMotion ? injectStudioMotionScript(withPlugin, studioMotion.script) : withPlugin;
}
async function transformPreviewHtml(html, adapter, project, activeCompositionPath) {
  if (!adapter.transformPreviewHtml) return html;
  try {
    return await adapter.transformPreviewHtml({
      html,
      project,
      activeCompositionPath
    });
  } catch (err) {
    console.warn("[Studio] preview transform failed, using original HTML:", err);
    return html;
  }
}
function resolveProjectMainHtml(projectDir, projectId) {
  const indexPath = join8(projectDir, "index.html");
  const blockHtmlPath = join8(projectDir, `${projectId}.html`);
  recordPreviewRead(projectDir, indexPath);
  recordPreviewRead(projectDir, blockHtmlPath);
  if (existsSync5(indexPath)) {
    return {
      html: readFileSync6(indexPath, "utf-8"),
      compositionPath: "index.html"
    };
  }
  if (existsSync5(blockHtmlPath)) {
    return {
      html: readFileSync6(blockHtmlPath, "utf-8"),
      compositionPath: `${projectId}.html`
    };
  }
  return null;
}
var PREVIEW_BUNDLE_OPTIONS = {
  runtime: "placeholder",
  inlineAssets: false,
  staticGuard: false,
  sceneParts: true
};
var previewBaseHref = (projectId) => `/api/projects/${encodeURIComponent(projectId)}/preview/`;
var withPreviewBase = (html, projectId) => {
  const base = previewBaseHref(projectId);
  const mapped = withRootImportMap(withRootPathsRelative(html, base), base);
  return hasBaseElement(mapped) ? mapped : injectTagsAtHeadStart2(mapped, `<base href="${base}">`);
};
function resolvePreviewGsapBaseUrl(adapter) {
  const configured = process.env.HYPERFRAMES_GSAP_BASE_URL;
  if (configured?.trim() || !adapter.gsapLocalRoot) {
    try {
      return normalizeGsapBaseUrl(configured);
    } catch (cause) {
      throw new Error(
        "Invalid HYPERFRAMES_GSAP_BASE_URL: use an absolute HTTPS npm mirror root (plain HTTP only for localhost) without credentials, query, or fragment",
        { cause }
      );
    }
  }
  return normalizeGsapLocalRoot(adapter.gsapLocalRoot);
}
function registerPreviewRoutes(api, adapter) {
  const gsapBaseUrl = resolvePreviewGsapBaseUrl(adapter);
  const gsapEtagSalt = `:gsap:${createHash3("sha1").update(gsapBaseUrl).digest("hex").slice(0, 12)}`;
  const previewCacheHeaders = (etag) => ({
    "Cache-Control": "private, no-cache",
    ETag: etag
  });
  const mediaCodecProbeCache = resolvePreviewMediaCodecProbeCache(adapter);
  const builtPreviews = /* @__PURE__ */ new Map();
  const rememberPreview = (key, html) => {
    builtPreviews.delete(key);
    builtPreviews.set(key, html);
    if (builtPreviews.size > 4) builtPreviews.delete(builtPreviews.keys().next().value);
  };
  const previewBuilds = /* @__PURE__ */ new Map();
  async function buildPreview(project, previewVariables, builtKey, capture, signature) {
    const diskMain = resolveProjectMainHtml(project.dir, project.id);
    try {
      let bundled = await adapter.bundle(project.dir, {
        stampHfIds: true,
        onRead: (filePath) => recordPreviewRead(project.dir, filePath)
      });
      let mainCompositionPath = "index.html";
      if (!bundled) {
        if (!diskMain) return null;
        bundled = ensureHfIds2(diskMain.html);
        mainCompositionPath = diskMain.compositionPath;
      }
      bundled = withPreviewRuntime(withPreviewBase(bundled, project.id), adapter.runtimeUrl);
      recordPreviewReferences(project.dir, bundled);
      recordPreviewBuilt(project.dir);
      bundled = injectStudioPreviewAugmentations(
        ensureHfIds2(await transformPreviewHtml(bundled, adapter, project, mainCompositionPath)),
        adapter,
        signature,
        project.dir,
        mainCompositionPath,
        { capture, gsapBaseUrl }
      );
      if (previewVariables) bundled = injectPreviewVariables(bundled, previewVariables);
      bundled = await injectMediaCodecMap(
        bundled,
        adapter,
        project.dir,
        mainCompositionPath,
        mediaCodecProbeCache
      );
      bundled = addScenePartsManifest(bundled, [`meta[name="${PROJECT_SIGNATURE_META}"]`]);
      if (await createProjectSignatureAsync(project.dir) === signature) {
        rememberPreview(builtKey, bundled);
        if (!capture) adapter.previewDocuments?.write(builtKey, bundled);
      }
      return bundled;
    } catch {
      const fallback = resolveProjectMainHtml(project.dir, project.id);
      if (fallback) {
        const fallbackHtml = withPreviewRuntime(
          withPreviewBase(ensureHfIds2(fallback.html), project.id),
          adapter.runtimeUrl
        );
        let fallbackAugmented = injectStudioPreviewAugmentations(
          await transformPreviewHtml(fallbackHtml, adapter, project, fallback.compositionPath),
          adapter,
          signature,
          project.dir,
          fallback.compositionPath,
          { capture, gsapBaseUrl }
        );
        if (previewVariables) {
          fallbackAugmented = injectPreviewVariables(fallbackAugmented, previewVariables);
        }
        fallbackAugmented = await injectMediaCodecMap(
          fallbackAugmented,
          adapter,
          project.dir,
          fallback.compositionPath,
          mediaCodecProbeCache
        );
        return fallbackAugmented;
      }
      return null;
    }
  }
  api.get("/projects/:id/preview", async (c) => {
    const resolved = await resolveProjectAndSignature(adapter, c.req.param("id"));
    if (!resolved) return c.json({ error: "not found" }, 404);
    const { project, signature } = resolved;
    const vars = previewVariablesFromRequest(c.req.query("variables"));
    if (vars.error !== void 0) return c.json({ error: vars.error }, 400);
    const previewVariables = vars.values;
    const capture = c.req.query(PREVIEW_CAPTURE_PARAM) !== void 0;
    const etag = `"preview:${signature}${gsapEtagSalt}${variablesEtagSalt(vars.raw)}${capture ? ":capture" : ""}"`;
    const ifNoneMatch = c.req.header("If-None-Match");
    if (ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: previewCacheHeaders(etag)
      });
    }
    const builtKey = `${project.id}
${etag}`;
    const cached = builtPreviews.get(builtKey) ?? adapter.previewDocuments?.read(builtKey);
    if (cached) {
      rememberPreview(builtKey, cached);
      return c.html(cached, 200, previewCacheHeaders(etag));
    }
    let pending = previewBuilds.get(builtKey);
    if (!pending) {
      pending = buildPreview(project, previewVariables, builtKey, capture, signature).finally(
        () => previewBuilds.delete(builtKey)
      );
      previewBuilds.set(builtKey, pending);
    }
    const html = await pending;
    if (!html) return c.text("not found", 404);
    return c.html(html, 200, previewCacheHeaders(etag));
  });
  function pinSubCompHfIds(compFile, compPath) {
    if (!/\.html?$/i.test(compPath)) return void 0;
    try {
      return ensureHfIds2(readFileSync6(compFile, "utf-8"));
    } catch {
      return null;
    }
  }
  api.get("/projects/:id/preview/comp/*", async (c) => {
    const resolved = await resolveProjectAndSignature(adapter, c.req.param("id"));
    if (!resolved) return c.json({ error: "not found" }, 404);
    const { project, signature } = resolved;
    const vars = previewVariablesFromRequest(c.req.query("variables"));
    if (vars.error !== void 0) return c.json({ error: vars.error }, 400);
    const previewVariables = vars.values;
    const compPath = requestSubPath(c.req.url, "projects/:id/preview/comp");
    const compFile = resolveWithinProject(project.dir, compPath);
    if (compFile) recordPreviewRead(project.dir, compFile);
    recordPreviewRead(project.dir, "index.html");
    if (!compFile || !existsSync5(compFile) || !statSync4(compFile).isFile()) {
      return c.text("not found", 404);
    }
    const compPathHash = createHash3("sha1").update(compPath).digest("hex");
    const capture = c.req.query(PREVIEW_CAPTURE_PARAM) !== void 0;
    const etag = `"comp:v2:${compPathHash}:${signature}${gsapEtagSalt}${variablesEtagSalt(vars.raw)}${capture ? ":capture" : ""}"`;
    const ifNoneMatch = c.req.header("If-None-Match");
    if (ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: previewCacheHeaders(etag)
      });
    }
    const stamped = pinSubCompHfIds(compFile, compPath);
    if (stamped === null) return c.text("not found", 404);
    const baseHref = previewBaseHref(project.id);
    let html = buildSubCompositionHtml(
      project.dir,
      compPath,
      adapter.runtimeUrl,
      baseHref,
      stamped,
      gsapBaseUrl
    );
    if (!html) return c.text("not found", 404);
    html = withRootImportMap(html, baseHref);
    recordPreviewReferences(project.dir, html);
    html = ensureHfIds2(await transformPreviewHtml(html, adapter, project, compPath));
    html = injectStudioPreviewAugmentations(html, adapter, signature, project.dir, compPath, {
      capture,
      gsapBaseUrl
    });
    if (previewVariables) html = injectPreviewVariables(html, previewVariables);
    html = await injectMediaCodecMap(html, adapter, project.dir, compPath, mediaCodecProbeCache);
    return c.html(html, 200, previewCacheHeaders(etag));
  });
  api.get("/projects/:id/preview/*", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const subPath = requestSubPath(c.req.url, "projects/:id/preview");
    const candidate = resolve4(project.dir, subPath);
    const file = isWithinProjectRoot(project.dir, candidate) ? candidate : null;
    if (!file || isPrivateProjectFile(project.dir, file)) {
      return c.text("not found", 404);
    }
    recordPreviewRead(project.dir, file);
    const stat2 = existsSync5(file) ? statSync4(file) : null;
    if (!stat2?.isFile()) {
      return c.text("not found", 404);
    }
    const contentType = getMimeType(subPath);
    const isText = /\.(html|css|js|json|svg|txt|md|cube)$/i.test(subPath);
    const proxyParam = c.req.query("hf-proxy");
    const boxParam = c.req.query(PREVIEW_PROXY_BOX_PARAM);
    const proxyBox = boxParam === void 0 ? void 0 : parsePreviewProxyBox(boxParam);
    const lightRequested = c.req.query(PREVIEW_PROXY_LIGHT_PARAM) !== void 0;
    if (proxyBox === null || proxyBox && proxyParam === void 0 || lightRequested && !proxyBox) {
      return c.text("not found", 404);
    }
    let proxyVariant;
    if (proxyParam !== void 0) {
      if (!isProxyVariantRequest(proxyParam) || !contentType.startsWith("video/") || !isAutoProxyEnabled(adapter)) {
        return c.text("not found", 404);
      }
      const facts = await probeAssetCodec(file, void 0, mediaCodecProbeCache);
      const eligibility = decideMediaProxyEligibility(facts, lightRequested ? proxyBox : void 0);
      if (!eligibility.eligible) {
        return c.text(`media proxy unavailable: ${eligibility.reason}`, 422);
      }
      if (!facts) return c.text("media proxy unavailable: unknown_codec", 422);
      proxyVariant = resolveProxyVariantRequest(proxyParam, facts) ?? void 0;
      if (!proxyVariant) {
        return c.text("media proxy variant does not match asset", 422);
      }
    }
    const stillParam = c.req.query(PREVIEW_PROXY_STILL_PARAM);
    if (stillParam !== void 0) {
      const at = Number(stillParam);
      if (stillParam === "" || !Number.isFinite(at) || at < 0 || !proxyVariant) {
        return c.text("not found", 404);
      }
      try {
        const still = await resolveStill(project.dir, file, at, proxyBox);
        return new Response(readFileSync6(still), {
          headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" }
        });
      } catch (err) {
        if (isProjectRootMissing(err)) throw err;
        return c.text("media still failed", 502);
      }
    }
    const tag = settledFileTag(stat2);
    const etag = tag && `"${tag}${proxyEtagSalt(proxyVariant, proxyBox)}"`;
    const cacheHeaders = isText ? { "Cache-Control": "no-store" } : { "Cache-Control": "private, no-cache", ...etag && { ETag: etag } };
    if (!isText && etag) {
      const ifNoneMatch = c.req.header("If-None-Match");
      if (ifNoneMatch === etag) {
        return new Response(null, { status: 304, headers: cacheHeaders });
      }
    }
    let servedPath = file;
    let servedContentType = contentType;
    if (proxyVariant !== void 0) {
      try {
        if (c.req.query(PREVIEW_PROXY_RETRY_PARAM) !== void 0) {
          retryProxyCopy(project.dir, file, proxyVariant, proxyBox);
        }
        const asked = c.req.header(PREVIEW_PROXY_PRIORITY_HEADER);
        const urgency = asked === "0" ? { background: true } : { priority: asked === "1" };
        servedPath = await waitForProxy(
          resolveProxy(project.dir, file, proxyVariant, proxyBox, urgency),
          0
        );
      } catch (err) {
        if (err instanceof ProxyWaitTimeoutError) {
          const progress = proxyCopyProgress(project.dir, file, proxyVariant, proxyBox);
          return c.text("media proxy is being made", 202, {
            "Retry-After": progress === void 0 ? String(PROXY_PENDING_RETRY_AFTER_SECONDS) : "1",
            "Cache-Control": "no-store",
            ...progress !== void 0 && { [PREVIEW_PROXY_PROGRESS_HEADER]: progress.toFixed(3) }
          });
        }
        if (err instanceof ProxyCapacityError) {
          return c.text(err.message, 503, { "Retry-After": "5" });
        }
        if (isProjectRootMissing(err)) throw err;
        const message = err instanceof ProxyTranscodeError ? err.message : "proxy transcode failed";
        return c.text(message, 502);
      }
      recordProxyRequest();
      servedContentType = PROXY_VARIANT_CONFIG[proxyVariant].contentType;
    }
    const textBuffer = isText ? Buffer.from(readFileSync6(file, "utf-8"), "utf-8") : null;
    const heldBuffer = textBuffer ?? (contentType === "image/png" ? stripSdrPngColourTags(readFileSync6(file)) : null);
    const totalSize = heldBuffer ? heldBuffer.length : statSync4(servedPath).size;
    const bodyFor = (start, end) => heldBuffer ? new Uint8Array(heldBuffer.subarray(start, end + 1)) : (
      // Node's web stream type and the DOM one do not overlap for tsc on
      // every platform's lib set; the double cast is the documented bridge.
      Readable.toWeb(
        serveWhileOpen(servedPath, createReadStream(servedPath, { start, end }))
      )
    );
    const rangeHeader = c.req.header("Range");
    const match = rangeHeader ? /bytes=(\d+)-(\d*)/.exec(rangeHeader) : null;
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : openRangeEnd(start, totalSize - 1, servedContentType);
      const safeEnd = Math.min(end, totalSize - 1);
      if (start > safeEnd) {
        return new Response(null, {
          status: 416,
          headers: { ...cacheHeaders, "Content-Range": `bytes */${totalSize}` }
        });
      }
      return new Response(bodyFor(start, safeEnd), {
        status: 206,
        headers: {
          ...cacheHeaders,
          "Content-Type": servedContentType,
          "Content-Range": `bytes ${start}-${safeEnd}/${totalSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(safeEnd - start + 1)
        }
      });
    }
    return new Response(totalSize > 0 ? bodyFor(0, totalSize - 1) : null, {
      headers: {
        ...cacheHeaders,
        "Content-Type": servedContentType,
        "Accept-Ranges": "bytes",
        "Content-Length": String(totalSize)
      }
    });
  });
}

// src/routes/lint.ts
import { readFileSync as readFileSync7 } from "fs";
import { join as join9 } from "path";
async function collectProjectFindings(adapter, projectDir) {
  const findings = [];
  const coveredFiles = /* @__PURE__ */ new Set();
  if (!adapter.lintProject) return { findings, coveredFiles };
  const result = await adapter.lintProject(projectDir);
  for (const entry of result.results) {
    coveredFiles.add(entry.file);
    for (const finding of entry.result.findings) {
      findings.push({ ...finding, file: entry.file });
    }
  }
  return { findings, coveredFiles };
}
async function lintUncoveredHtml(adapter, projectDir, htmlFiles, coveredFiles) {
  const findings = [];
  for (const file of htmlFiles) {
    if (coveredFiles.has(file)) continue;
    const content = readFileSync7(join9(projectDir, file), "utf-8");
    const result = await adapter.lint(content, {
      filePath: file,
      isSubComposition: true,
      compSrcPath: file
    });
    for (const finding of result?.findings ?? []) {
      findings.push({ ...finding, file });
    }
  }
  return findings;
}
function registerLintRoutes(api, adapter) {
  api.get("/projects/:id/lint", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    try {
      const htmlFiles = walkDir(project.dir).filter(
        (f) => f.endsWith(".html") && !isInHiddenOrVendorDir(f)
      );
      const projectLint = await collectProjectFindings(adapter, project.dir);
      const extraFindings = await lintUncoveredHtml(
        adapter,
        project.dir,
        htmlFiles,
        projectLint.coveredFiles
      );
      return c.json({ findings: [...projectLint.findings, ...extraFindings] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `Lint failed: ${msg}` }, 500);
    }
  });
}

// src/routes/render.ts
import { streamSSE } from "hono/streaming";
import {
  createReadStream as createReadStream2,
  existsSync as existsSync6,
  lstatSync as lstatSync3,
  readFileSync as readFileSync8,
  unlinkSync as unlinkSync3,
  readdirSync as readdirSync3,
  statSync as statSync5
} from "fs";
import { dirname as dirname5, join as join10 } from "path";
import { Readable as Readable2 } from "stream";
import { VALID_CANVAS_RESOLUTIONS } from "@hyperframes/parsers";
import { formatRenderOutputTimestamp, parseFps, fpsToNumber } from "@hyperframes/core";

// src/helpers/finishedJobs.ts
var firstSeenFinishedAt = /* @__PURE__ */ new WeakMap();
function forgetJobsFinishedLongerThan(ttlMs, jobs, isFinished, now = Date.now()) {
  for (const [id, job] of jobs) {
    if (!isFinished(job)) continue;
    const finishedAt = firstSeenFinishedAt.get(job) ?? now;
    firstSeenFinishedAt.set(job, finishedAt);
    if (now - finishedAt > ttlMs) jobs.delete(id);
  }
}

// src/routes/render.ts
var VALID_RESOLUTIONS = new Set(VALID_CANVAS_RESOLUTIONS);
var RENDER_MIME = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".gif": "image/gif"
};
var RENDER_EXTENSIONS = Object.keys(RENDER_MIME);
var RENDER_ARTIFACT_EXTENSIONS = [...RENDER_EXTENSIONS, ".meta.json"];
function resolveRenderArtifacts(directories, jobId) {
  const artifacts = [...new Set(directories)].filter(existsSync6).flatMap(
    (directory) => RENDER_ARTIFACT_EXTENSIONS.map(
      (extension) => resolveWithinProject(directory, `${jobId}${extension}`)
    )
  );
  return artifacts.every((path) => path !== null) ? artifacts : null;
}
function contentDispositionHeader(disposition, filename) {
  const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  const encoded = encodeURIComponent(filename).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
function registerRenderRoutes(api, adapter) {
  const renderJobs = /* @__PURE__ */ new Map();
  const CANCEL_SETTLE_MS = 45e3;
  const nextFreeRenderJobId = (baseId, ext, rendersDir) => {
    let jobId = baseId;
    for (let n = 2; renderJobs.has(jobId) || existsSync6(join10(rendersDir, `${jobId}${ext}`)); n++) {
      jobId = `${baseId}-${n}`;
    }
    return jobId;
  };
  const TTL_MS = 3e5;
  const CLEANUP_INTERVAL_MS = 6e4;
  let cleanupTimer = null;
  const cleanupEnabled = () => typeof process !== "undefined" && process.env.NODE_ENV !== "production" && !process.argv.includes("build");
  const cleanupFinishedJobs = () => {
    forgetJobsFinishedLongerThan(TTL_MS, renderJobs, (job) => job.status !== "rendering");
    if (renderJobs.size === 0 && cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  };
  const ensureCleanupTimer = () => {
    if (cleanupTimer || !cleanupEnabled()) return;
    cleanupTimer = setInterval(cleanupFinishedJobs, CLEANUP_INTERVAL_MS);
    if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
      cleanupTimer.unref();
    }
  };
  ensureCleanupTimer();
  api.post("/projects/:id/render", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const body = await c.req.json().catch(() => ({}));
    const VALID_FORMATS = ["mp4", "webm", "mov", "gif"];
    const FORMAT_EXT = {
      mp4: ".mp4",
      webm: ".webm",
      mov: ".mov",
      gif: ".gif"
    };
    const format = VALID_FORMATS.find((value) => value === body.format) ?? "mp4";
    const fpsParse = body.fps === void 0 ? null : parseFps(body.fps);
    const requestedFps = fpsParse && fpsParse.ok ? fpsParse.value : { num: 30, den: 1 };
    const fps = format === "gif" && fpsToNumber(requestedFps) > 30 ? { num: 30, den: 1 } : requestedFps;
    const quality = ["draft", "standard", "high"].includes(body.quality ?? "") ? body.quality : "standard";
    const outputResolution = VALID_RESOLUTIONS.has(body.resolution ?? "") ? body.resolution : void 0;
    let composition;
    if (typeof body.composition === "string" && body.composition.length > 0) {
      if (!resolveWithinProject(project.dir, body.composition)) {
        if (folderGone(project.dir)) return projectDirMissing(c);
        return c.json({ error: "composition path must be within the project directory" }, 400);
      }
      composition = body.composition;
    }
    let variables;
    if (body.variables !== void 0) {
      if (!isVariablesPayload(body.variables)) {
        return c.json({ error: VARIABLES_PAYLOAD_ERROR }, 400);
      }
      variables = body.variables;
    }
    const encoder = parseEncoderOptions(body, format);
    if (!encoder.ok) return c.json({ error: encoder.error }, 400);
    const requestedPageMotionBlur = body.pageMotionBlur;
    if (requestedPageMotionBlur !== void 0 && requestedPageMotionBlur !== "off") {
      return c.json({ error: "pageMotionBlur must be off when supplied" }, 400);
    }
    const pageMotionBlur = requestedPageMotionBlur === void 0 && body.previewMotionBlur === false ? "off" : requestedPageMotionBlur;
    const rendersDir = adapter.rendersDir(project);
    mkdirWithinProject(project.dir, rendersDir);
    const ext = FORMAT_EXT[format] ?? ".mp4";
    const jobId = nextFreeRenderJobId(
      `${project.id}_${formatRenderOutputTimestamp(/* @__PURE__ */ new Date())}`,
      ext,
      rendersDir
    );
    const outputPath = join10(rendersDir, `${jobId}${ext}`);
    const jobState = adapter.startRender({
      project,
      outputPath,
      format,
      fps,
      quality,
      jobId,
      outputResolution,
      composition,
      variables,
      ...encoder.options,
      useGpu: body.gpu === true && format === "mp4",
      distinctId: typeof body.telemetryDistinctId === "string" ? body.telemetryDistinctId : void 0,
      telemetryOptOut: body.telemetryOptOut === true,
      ...pageMotionBlur === void 0 ? {} : { pageMotionBlur }
    });
    renderJobs.set(jobId, jobState);
    ensureCleanupTimer();
    return c.json({ jobId, status: "rendering" });
  });
  api.get("/render/:jobId/progress", (c) => {
    const { jobId } = c.req.param();
    const job = renderJobs.get(jobId);
    if (!job) return c.json({ error: "not found" }, 404);
    return streamSSE(c, async (stream) => {
      while (true) {
        const current = renderJobs.get(jobId);
        if (!current) break;
        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify({
            progress: current.progress,
            status: current.status,
            stage: current.stage,
            error: current.error,
            ...current.status === "complete" && current.audioLoweredDb !== void 0 ? { audioLoweredDb: current.audioLoweredDb } : {}
          })
        });
        if (current.status !== "rendering") break;
        await stream.sleep(500);
      }
    });
  });
  api.post("/render/:jobId/cancel", async (c) => {
    const { jobId } = c.req.param();
    const job = renderJobs.get(jobId);
    if (!job) return c.json({ error: "not found" }, 404);
    if (job.status === "rendering") {
      job.status = "cancelled";
      let giveUp;
      const late = new Promise((done) => giveUp = setTimeout(done, CANCEL_SETTLE_MS));
      try {
        await Promise.race([job.cancel?.(), late]);
      } finally {
        clearTimeout(giveUp);
      }
    }
    return c.json({ status: job.status });
  });
  const isPlainFile = (path) => {
    try {
      return lstatSync3(path).isFile();
    } catch {
      return false;
    }
  };
  function renderContentType(filePath) {
    const ext = RENDER_EXTENSIONS.find((e) => filePath.endsWith(e));
    return (ext && RENDER_MIME[ext]) ?? "video/mp4";
  }
  function renderFileResponse(filePath, disposition, filename, method) {
    const headers = {
      "Content-Type": renderContentType(filePath),
      "Content-Disposition": contentDispositionHeader(disposition, filename),
      ...disposition === "inline" ? { "Accept-Ranges": "bytes" } : {},
      "Content-Length": String(statSync5(filePath).size)
    };
    if (method === "HEAD") return new Response(null, { headers });
    const body = Readable2.toWeb(createReadStream2(filePath));
    return new Response(body, { headers });
  }
  api.get("/render/:jobId/view", (c) => {
    const { jobId } = c.req.param();
    const job = renderJobs.get(jobId);
    if (!job?.outputPath || !isPlainFile(job.outputPath)) {
      return c.json({ error: "not found" }, 404);
    }
    const filename = job.outputPath.split("/").pop() ?? `render.mp4`;
    return renderFileResponse(job.outputPath, "inline", filename, c.req.method);
  });
  api.get("/render/:jobId/download", (c) => {
    const { jobId } = c.req.param();
    const job = renderJobs.get(jobId);
    if (!job?.outputPath || !isPlainFile(job.outputPath)) {
      return c.json({ error: "not found" }, 404);
    }
    const filename = job.outputPath.split("/").pop() ?? `render.mp4`;
    return renderFileResponse(job.outputPath, "attachment", filename, c.req.method);
  });
  async function renderDirectories(jobId) {
    const outputPath = renderJobs.get(jobId)?.outputPath;
    if (outputPath) return [dirname5(outputPath)];
    const projects = await adapter.listProjects();
    return projects.map((project) => adapter.rendersDir(project));
  }
  api.delete("/render/:jobId", async (c) => {
    const { jobId } = c.req.param();
    if (jobId.includes("/") || jobId.includes("\\") || jobId.includes("\0")) {
      return c.json({ error: "forbidden" }, 403);
    }
    const directories = await renderDirectories(jobId);
    const artifacts = resolveRenderArtifacts(directories, jobId);
    if (!artifacts) return c.json({ error: "forbidden" }, 403);
    for (const path of artifacts) {
      if (existsSync6(path)) unlinkSync3(path);
    }
    renderJobs.delete(jobId);
    return c.json({ deleted: true });
  });
  api.get("/projects/:id/renders/file/*", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const filename = c.req.path.split("/renders/file/")[1];
    if (!filename) return c.json({ error: "missing filename" }, 400);
    const rendersDir = adapter.rendersDir(project);
    const fp = resolveWithinProject(rendersDir, filename);
    if (!fp || isPrivateProjectFile(project.dir, fp)) return c.json({ error: "forbidden" }, 403);
    if (!existsSync6(fp)) return c.json({ error: "not found" }, 404);
    return renderFileResponse(fp, "inline", filename, c.req.method);
  });
  api.get("/projects/:id/renders", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const rendersDir = adapter.rendersDir(project);
    if (!existsSync6(rendersDir)) return c.json({ renders: [] });
    const files = readdirSync3(rendersDir).filter((f) => RENDER_EXTENSIONS.some((extension) => f.endsWith(extension))).flatMap((f) => {
      const fp = resolveWithinProject(rendersDir, f);
      return fp && !isPrivateProjectFile(project.dir, fp) ? [{ f, fp }] : [];
    }).map(({ f, fp }) => {
      const stat2 = statSync5(fp);
      const rid = f.replace(/\.(mp4|webm|mov|gif)$/, "");
      const metaPath = join10(rendersDir, `${rid}.meta.json`);
      let status = "complete";
      let durationMs;
      let audioLoweredDb;
      if (existsSync6(metaPath)) {
        try {
          const meta = JSON.parse(readFileSync8(metaPath, "utf-8"));
          if (meta.status === "failed" && !existsSync6(fp)) status = "failed";
          if (meta.durationMs) durationMs = meta.durationMs;
          if (typeof meta.audioLoweredDb === "number") audioLoweredDb = meta.audioLoweredDb;
        } catch {
        }
      }
      return {
        id: rid,
        filename: f,
        path: fp,
        size: stat2.size,
        createdAt: stat2.mtimeMs,
        status,
        durationMs,
        ...audioLoweredDb !== void 0 ? { audioLoweredDb } : {}
      };
    }).sort((a, b) => b.createdAt - a.createdAt);
    for (const file of files) {
      if (!renderJobs.has(file.id)) {
        renderJobs.set(file.id, {
          id: file.id,
          status: file.status,
          progress: 100,
          outputPath: file.path
        });
      }
    }
    return c.json({ renders: files.map(({ path: _path, ...render }) => render) });
  });
}

// src/routes/imageThumbnail.ts
import { HTTPException } from "hono/http-exception";
import { open, stat } from "fs/promises";
import { createHash as createHash4 } from "crypto";

// src/routes/thumbnailGenerationCoordinator.ts
var ThumbnailGenerationCoordinator = class {
  constructor(concurrency = 1) {
    this.concurrency = concurrency;
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new RangeError("Thumbnail concurrency must be a positive integer");
    }
  }
  concurrency;
  entries = /* @__PURE__ */ new Map();
  queue = [];
  activeEntries = /* @__PURE__ */ new Set();
  active = 0;
  acquire(key, signal, work) {
    if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
    let entry = this.entries.get(key);
    if (!entry) {
      let resolve7;
      let reject;
      const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve7 = resolvePromise;
        reject = rejectPromise;
      });
      entry = {
        key,
        controller: new AbortController(),
        leases: 0,
        state: "queued",
        work,
        promise,
        resolve: resolve7,
        reject
      };
      this.entries.set(key, entry);
      this.queue.push(entry);
    }
    entry.leases++;
    this.pump();
    return this.lease(entry, signal);
  }
  protectedKeys() {
    return /* @__PURE__ */ new Set([...this.entries.keys(), ...[...this.activeEntries].map((entry) => entry.key)]);
  }
  lease(entry, signal) {
    return new Promise((resolve7, reject) => {
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        signal.removeEventListener("abort", onAbort);
        entry.leases--;
        if (entry.leases > 0 || !this.entries.has(entry.key)) return;
        entry.controller.abort();
        if (this.entries.get(entry.key) === entry) this.entries.delete(entry.key);
        if (entry.state === "queued") {
          const index = this.queue.indexOf(entry);
          if (index >= 0) this.queue.splice(index, 1);
          entry.reject(new DOMException("Aborted", "AbortError"));
        }
      };
      const onAbort = () => {
        release();
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      entry.promise.then(
        (value) => {
          release();
          resolve7(value);
        },
        (reason) => {
          release();
          reject(reason);
        }
      );
    });
  }
  pump() {
    while (this.active < this.concurrency) {
      const entry = this.queue.shift();
      if (!entry) return;
      if (entry.leases === 0) continue;
      entry.state = "active";
      this.activeEntries.add(entry);
      this.active++;
      void this.run(entry);
    }
  }
  async run(entry) {
    try {
      entry.resolve(await entry.work(entry.controller.signal));
    } catch (error) {
      entry.reject(error);
    } finally {
      this.active--;
      this.activeEntries.delete(entry);
      if (this.entries.get(entry.key) === entry) this.entries.delete(entry.key);
      this.pump();
    }
  }
};
var thumbnailGenerationCoordinator = new ThumbnailGenerationCoordinator(1);

// src/routes/imageThumbnail.ts
var MAX_SOURCE_BYTES = 64 * 1024 * 1024;
var MAX_CACHE_BYTES = 8 * 1024 * 1024;
function retryingSharpLoader(adapter) {
  let loaded;
  let warned = false;
  const load = () => adapter.loadSharp?.() ?? import("sharp").then((module) => module.default);
  return () => loaded ??= load().catch((error) => {
    loaded = void 0;
    if (!warned) console.warn("[Studio] JPEG thumbnails are off: sharp could not load:", error);
    warned = true;
    throw error;
  });
}
async function generateThumbnail(loadSharp, path, signal) {
  const sharp = await loadSharp();
  const file = await open(path, "r");
  try {
    const info = await file.stat();
    if (!info.isFile() || info.size > MAX_SOURCE_BYTES) throw new Error("Unsupported image");
    const source = Buffer.alloc(info.size);
    let offset = 0;
    while (offset < source.length) {
      signal.throwIfAborted();
      const { bytesRead } = await file.read(source, offset, source.length - offset, offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (source[0] !== 255 || source[1] !== 216) throw new Error("Unsupported image");
    const image = sharp(source.subarray(0, offset), { limitInputPixels: 4e7 });
    if ((await image.metadata()).format !== "jpeg") throw new Error("Unsupported image");
    signal.throwIfAborted();
    const result = await image.rotate().resize(240, 135, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    signal.throwIfAborted();
    return result;
  } finally {
    await file.close();
  }
}
async function resolveSource(adapter, id, url) {
  const project = await adapter.resolveProject(id);
  if (!project) throw new HTTPException(404);
  const relative5 = requestSubPath(url, "projects/:id/image-thumbnail");
  if (!/\.jpe?g$/i.test(relative5)) throw new HTTPException(415);
  const path = pinWithinProject(project.dir, relative5);
  if (!path) throw new HTTPException(404);
  const info = await stat(path).catch(() => {
    throw new HTTPException(404);
  });
  if (!info.isFile()) throw new HTTPException(404);
  if (info.size > MAX_SOURCE_BYTES) throw new HTTPException(413);
  return { path, info };
}
function registerImageThumbnailRoutes(api, adapter) {
  const coordinator = new ThumbnailGenerationCoordinator(2);
  const loadSharp = retryingSharpLoader(adapter);
  const cache = /* @__PURE__ */ new Map();
  let cacheBytes = 0;
  const remember = (key, image) => {
    cacheBytes -= cache.get(key)?.byteLength ?? 0;
    cache.delete(key);
    cache.set(key, image);
    cacheBytes += image.byteLength;
    while (cacheBytes > MAX_CACHE_BYTES || cache.size > 128) {
      const oldest = cache.keys().next().value;
      if (oldest === void 0) break;
      cacheBytes -= cache.get(oldest)?.byteLength ?? 0;
      cache.delete(oldest);
    }
  };
  api.get("/projects/:id/image-thumbnail/*", async (c) => {
    try {
      const { path, info } = await resolveSource(adapter, c.req.param("id"), c.req.url);
      const key = createHash4("sha256").update(JSON.stringify([path, info.dev, info.ino, info.size, info.mtimeMs, info.ctimeMs])).digest("hex");
      const etag = `"${key}"`;
      c.header("ETag", etag);
      c.header("Cache-Control", "private, no-cache");
      c.header("X-Content-Type-Options", "nosniff");
      if (c.req.header("If-None-Match") === etag) return c.body(null, 304);
      let result = cache.get(key);
      if (result) remember(key, result);
      else {
        if (coordinator.protectedKeys().size >= 32) return c.text("thumbnail queue full", 429);
        result = await coordinator.acquire(key, c.req.raw.signal, async (signal) => {
          const image = await generateThumbnail(loadSharp, path, signal);
          remember(key, image);
          return image;
        }) ?? void 0;
      }
      if (!result) return c.text("image unavailable", 422);
      c.header("Content-Type", "image/jpeg");
      return c.body(new Uint8Array(result));
    } catch (error) {
      if (error instanceof HTTPException) return error.getResponse();
      return c.text("image unavailable", 422);
    }
  });
}

// src/routes/thumbnail.ts
import {
  closeSync as closeSync2,
  fstatSync as fstatSync2,
  openSync as openSync2,
  readFileSync as readFileSync9,
  readdirSync as readdirSync4,
  renameSync as renameSync3,
  rmSync as rmSync4,
  statSync as statSync6,
  unlinkSync as unlinkSync4,
  writeFileSync as writeFileSync4
} from "fs";
import { join as join11 } from "path";
import { createHash as createHash5, randomUUID as randomUUID2 } from "crypto";
var THUMBNAIL_CACHE_VERSION = "v5";
var THUMBNAIL_MAX_OUTPUT_WIDTH = 240;
var THUMBNAIL_MAX_OUTPUT_HEIGHT = 135;
var THUMBNAIL_CACHE_MAX_BYTES = 512 * 1024 * 1024;
var THUMBNAIL_CACHE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1e3;
var prunedCacheDirs = /* @__PURE__ */ new Set();
function pruneThumbnailCache(cacheDir, protectedPaths, now = Date.now()) {
  let entries;
  try {
    entries = readdirSync4(cacheDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return;
    throw err;
  }
  const files = entries.flatMap((entry) => {
    if (!entry.isFile()) return [];
    const path = join11(cacheDir, entry.name);
    try {
      const stats = statSync6(path);
      return [{ path, bytes: stats.size, mtimeMs: stats.mtimeMs }];
    } catch {
      return [];
    }
  });
  const retained = [];
  for (const file of files) {
    if (!protectedPaths.has(file.path) && now - file.mtimeMs > THUMBNAIL_CACHE_MAX_AGE_MS) {
      rmSync4(file.path, { force: true });
    } else {
      retained.push(file);
    }
  }
  let bytes = retained.reduce((total, file) => total + file.bytes, 0);
  for (const file of retained.sort((left, right) => left.mtimeMs - right.mtimeMs)) {
    if (bytes <= THUMBNAIL_CACHE_MAX_BYTES) break;
    if (protectedPaths.has(file.path)) continue;
    try {
      unlinkSync4(file.path);
      bytes -= file.bytes;
    } catch {
    }
  }
}
function writeThumbnailAtomically(path, buffer) {
  const temporaryPath = `${path}.${process.pid}.${randomUUID2()}.tmp`;
  try {
    writeFileSync4(temporaryPath, buffer, { flag: "wx" });
    renameSync3(temporaryPath, path);
  } finally {
    rmSync4(temporaryPath, { force: true });
  }
}
function readFileOnce(file) {
  let fd;
  try {
    fd = openSync2(file, "r");
  } catch (err) {
    const code = err.code;
    if (code === "ENOENT") return "missing";
    if (code === "ENOTDIR") return "not-a-file";
    throw err;
  }
  try {
    const stat2 = fstatSync2(fd);
    if (!stat2.isFile()) return "not-a-file";
    return { data: readFileSync9(fd), mtimeMs: stat2.mtimeMs };
  } finally {
    closeSync2(fd);
  }
}
function manifestKey(file) {
  const manifest = readFileOnce(file);
  if (typeof manifest === "string") return { key: "", mtimeMs: -Infinity };
  const hash = createHash5("sha1").update(manifest.data).digest("hex").slice(0, 16);
  return { key: `_${hash}`, mtimeMs: Math.round(manifest.mtimeMs) };
}
function registerThumbnailRoutes(api, adapter) {
  api.get("/projects/:id/thumbnail/*", async (c) => {
    if (!adapter.generateThumbnail) {
      return c.json({ error: "Thumbnails not available" }, 501);
    }
    const resolved = await resolveProjectAndSignature(adapter, c.req.param("id"));
    if (!resolved) return c.json({ error: "not found" }, 404);
    const { project, signature: projectSignature } = resolved;
    let compPath = requestSubPath(c.req.url, "projects/:id/thumbnail");
    if (compPath && !compPath.includes(".")) compPath += ".html";
    const htmlFile = resolveWithinProject(project.dir, compPath);
    const source = htmlFile ? readFileOnce(htmlFile) : "not-a-file";
    if (source === "not-a-file") return c.json({ error: "not found" }, 404);
    const inputSignature = await compositionInputSignature(project.dir, compPath, projectSignature);
    const url = new URL(c.req.url, `http://${c.req.header("host") || "localhost"}`);
    const rawSeekTime = url.searchParams.get("t");
    const parsedSeekTime = rawSeekTime == null ? Number.NaN : parseFloat(rawSeekTime);
    const seekTime = Number.isFinite(parsedSeekTime) ? parsedSeekTime : 0.5;
    const vpWidth = parseInt(url.searchParams.get("w") || "0") || 0;
    const vpHeight = parseInt(url.searchParams.get("h") || "0") || 0;
    const selector = url.searchParams.get("selector") || void 0;
    const format = url.searchParams.get("format") === "png" ? "png" : "jpeg";
    const contentType = format === "png" ? "image/png" : "image/jpeg";
    const requestedOutput = url.searchParams.get("output");
    const outputMode = requestedOutput === "source" || requestedOutput !== "preview" && format === "png" ? "source" : "preview";
    const rawSelectorIndex = Number.parseInt(url.searchParams.get("selectorIndex") || "0", 10);
    const selectorIndex = Number.isFinite(rawSelectorIndex) && rawSelectorIndex > 0 ? rawSelectorIndex : void 0;
    const urlVersion = url.searchParams.get("v") || "";
    let compW = vpWidth || 1920;
    let compH = vpHeight || 1080;
    let sourceMtime = 0;
    let sourceKey = "";
    if (source !== "missing") {
      const html = source.data.toString("utf-8");
      sourceKey = `_${createHash5("sha1").update(html).digest("hex").slice(0, 16)}`;
      sourceMtime = Math.round(source.mtimeMs);
      if (!vpWidth) {
        const wMatch = html.match(/data-width=["'](\d+)["']/);
        const hMatch = html.match(/data-height=["'](\d+)["']/);
        if (wMatch?.[1]) compW = parseInt(wMatch[1]);
        if (hMatch?.[1]) compH = parseInt(hMatch[1]);
      }
    }
    const manualEdits = manifestKey(join11(project.dir, STUDIO_MANUAL_EDITS_PATH));
    const motion = manifestKey(join11(project.dir, STUDIO_MOTION_PATH));
    sourceMtime = Math.max(sourceMtime, manualEdits.mtimeMs, motion.mtimeMs);
    const projectUrl = `http://${c.req.header("host")}/api/projects/${encodeURIComponent(project.id)}`;
    const previewPath = compPath === "index.html" ? `${projectUrl}/preview` : `${projectUrl}/preview/comp/${compPath.split("/").map(encodeURIComponent).join("/")}`;
    const previewUrl = `${previewPath}?${PREVIEW_CAPTURE_PARAM}=1`;
    const cacheDir = join11(project.dir, ".thumbnails");
    const selectorKey = selector ? `_${createHash5("sha1").update(selector).digest("hex").slice(0, 16)}_${selectorIndex ?? 0}` : "";
    const urlVersionKey = urlVersion ? `_${urlVersion.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 32)}` : "";
    const inputSignatureKey = `_${createHash5("sha1").update(inputSignature).digest("hex").slice(0, 16)}`;
    const outputScale = outputMode === "source" ? 1 : Math.min(1, THUMBNAIL_MAX_OUTPUT_WIDTH / compW, THUMBNAIL_MAX_OUTPUT_HEIGHT / compH);
    const outputWidth = Math.max(1, Math.round(compW * outputScale));
    const outputHeight = Math.max(1, Math.round(compH * outputScale));
    const cacheKey = `${THUMBNAIL_CACHE_VERSION}${urlVersionKey}${inputSignatureKey}${manualEdits.key}${motion.key}${sourceKey}_${format}_${outputMode}_${compPath.replace(/\//g, "_")}_${compW}x${compH}_${outputWidth}x${outputHeight}_${sourceMtime}_${seekTime.toFixed(2)}${selectorKey}.${format === "png" ? "png" : "jpg"}`;
    const cachePath = join11(cacheDir, cacheKey);
    if (!prunedCacheDirs.has(cacheDir)) {
      prunedCacheDirs.add(cacheDir);
      pruneThumbnailCache(
        cacheDir,
        /* @__PURE__ */ new Set([...thumbnailGenerationCoordinator.protectedKeys(), cachePath])
      );
    }
    const cached = readFileOnce(cachePath);
    if (typeof cached === "object") {
      return new Response(new Uint8Array(cached.data), {
        headers: { "Content-Type": contentType, "Cache-Control": "no-cache" }
      });
    }
    if (url.searchParams.get("cached") === "1")
      return c.body(null, 204, { "Cache-Control": "no-cache" });
    try {
      const buffer = await thumbnailGenerationCoordinator.acquire(
        cachePath,
        c.req.raw.signal,
        async (signal) => {
          const previewCopiesAtStart = proxyActivityMark(project.dir);
          const generated = await adapter.generateThumbnail({
            project,
            compPath,
            seekTime,
            width: compW,
            height: compH,
            outputWidth,
            outputHeight,
            previewUrl,
            selector,
            format,
            selectorIndex,
            signal
          });
          if (!generated) return null;
          const previewCopiesAtEnd = proxyActivityMark(project.dir);
          const afterGeneration = await resolveProjectAndSignature(adapter, project.id);
          const inputsUnchanged = async (signature) => await compositionInputSignature(project.dir, compPath, signature) === inputSignature;
          if (previewCopiesAtStart === null || previewCopiesAtEnd !== previewCopiesAtStart || afterGeneration?.project.dir !== project.dir || !await inputsUnchanged(afterGeneration.signature) || !await inputsUnchanged(await createProjectSignatureAsync(project.dir))) {
            return generated;
          }
          mkdirWithinProject(project.dir, cacheDir);
          writeThumbnailAtomically(cachePath, generated);
          return generated;
        }
      );
      if (!buffer) {
        return c.json(
          { error: "Thumbnail generation failed. Chrome browser may not be available" },
          500
        );
      }
      pruneThumbnailCache(cacheDir, thumbnailGenerationCoordinator.protectedKeys());
      return new Response(new Uint8Array(buffer), {
        headers: { "Content-Type": contentType, "Cache-Control": "no-cache" }
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return new Response(null, { status: 499 });
      }
      if (isProjectRootMissing(err)) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `Thumbnail generation failed: ${msg}` }, 500);
    }
  });
}

// src/routes/waveform.ts
import { existsSync as existsSync7, readFileSync as readFileSync10, statSync as statSync7 } from "fs";
import { join as join12, resolve as resolve5 } from "path";
import { isWithinProjectRoot as isWithinProjectRoot2 } from "@hyperframes/parsers/asset-resolution";
function registerWaveformRoutes(api, adapter) {
  api.get("/projects/:id/waveform/*", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const assetPath = requestSubPath(c.req.url, "projects/:id/waveform");
    const audioPath = resolve5(project.dir, assetPath);
    if (!isWithinProjectRoot2(project.dir, audioPath)) {
      return c.json({ error: "file not found" }, 404);
    }
    const stats = statSync7(audioPath, { throwIfNoEntry: false });
    if (!stats) return c.json({ error: "file not found" }, 404);
    const cacheDir = join12(project.dir, ".waveform-cache");
    const cachePath = join12(cacheDir, buildWaveformCacheKey(assetPath, stats));
    try {
      if (isWaveformCacheDirectory(cacheDir) && existsSync7(cachePath)) {
        const peaks2 = JSON.parse(readFileSync10(cachePath, "utf-8"));
        return c.json({ peaks: peaks2 });
      }
    } catch {
    }
    let peaks;
    try {
      peaks = await decodeAudioPeaks(audioPath);
    } catch {
      return c.json({ error: "failed to decode audio" }, 500);
    }
    try {
      writeWaveformCache(cachePath, peaks);
    } catch {
    }
    return c.json({ peaks });
  });
}

// src/routes/freezeFrame.ts
import { execFile } from "child_process";
import { readFileSync as readFileSync11, rmSync as rmSync5, statSync as statSync8 } from "fs";
import { basename as basename2, dirname as dirname6, join as join13, relative as relative4, sep as sep3 } from "path";
import { findFfBinary as findFfBinary3 } from "@hyperframes/parsers/ff-binaries";
import {
  atomicTempPath,
  createFileAtomically as createFileAtomically2,
  replaceFileAtomically as replaceFileAtomically3
} from "@hyperframes/core/atomic-file";

// src/helpers/freezeFrame.ts
import { createHash as createHash6, randomBytes } from "crypto";
import { ensureHfIds as ensureHfIds3 } from "@hyperframes/parsers/hf-ids";
import { readMediaOffsetSeconds } from "@hyperframes/parsers/media-duration";
import { resolveRateSpec, sourceTimeAt } from "@hyperframes/core/speed-ramp";
import { MEDIA_LINK_ATTR as LINK_ATTR, relinkSplitHalves } from "@hyperframes/core/media-link";
var FREEZE_HOLD_SECONDS = 2;
var EPSILON = 1e-3;
var round3 = (value) => Math.round(value * 1e3) / 1e3;
function numberAttr(el, name) {
  const raw = el.getAttribute(name);
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
function trackOf(el) {
  return numberAttr(el, "data-track-index") ?? numberAttr(el, "data-layer") ?? 0;
}
function freezeFrameMediaTime(input) {
  const rate = resolveRateSpec(input.automation, input.playbackRate);
  return input.mediaStart + sourceTimeAt(rate, Math.max(0, input.playhead - input.clipStart));
}
function freezeExtractArgs(src, mediaTime, output) {
  return [
    "-y",
    "-ss",
    String(round3(mediaTime)),
    "-i",
    src,
    "-frames:v",
    "1",
    "-c:v",
    "png",
    "-f",
    "image2",
    "-update",
    "1",
    output
  ];
}
var randomStillToken = () => randomBytes(4).toString("hex");
function freezeStillFileName(clipId, playhead, token = randomStillToken()) {
  const stem = clipId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 48) || "clip";
  const idHash = createHash6("sha256").update(clipId).digest("hex").slice(0, 10);
  return `${stem}-${idHash}-${Math.round(playhead * 1e3)}-${token}.png`;
}
function readFreezeSource(html, target, playhead) {
  const { document } = parseSourceDocument(html);
  const el = findTargetElement(document, target);
  if (!el || el.tagName.toLowerCase() !== "video") return null;
  const src = el.getAttribute("src");
  const start = numberAttr(el, "data-start");
  const duration = numberAttr(el, "data-duration");
  if (!src || start === null || duration === null) return null;
  if (playhead <= start + EPSILON || playhead >= start + duration - EPSILON) return null;
  return {
    id: el.getAttribute("id") || "clip",
    src,
    mediaTime: freezeFrameMediaTime({
      clipStart: start,
      playhead,
      mediaStart: readMediaOffsetSeconds((name) => el.getAttribute(name)),
      playbackRate: numberAttr(el, "data-playback-rate") ?? 1,
      automation: el.getAttribute("data-automation")
    })
  };
}
function targetOf(el) {
  const hfId = el.getAttribute("data-hf-id");
  return { ...hfId ? { hfId } : {}, id: el.getAttribute("id") };
}
function spans(el, time) {
  const start = numberAttr(el, "data-start");
  const duration = numberAttr(el, "data-duration");
  if (start === null || duration === null) return false;
  return time > start + EPSILON && time < start + duration - EPSILON;
}
function shiftTracks(document, tracks, from, by) {
  for (const el of document.querySelectorAll("[data-start]")) {
    if (el.hasAttribute("data-composition-id") || !tracks.has(trackOf(el))) continue;
    const start = numberAttr(el, "data-start");
    if (start === null || start < from - EPSILON) continue;
    el.setAttribute("data-start", String(round3(start + by)));
  }
}
function growRootToFit(document) {
  const root = document.querySelector("[data-composition-id]");
  const rootDuration = root ? numberAttr(root, "data-duration") : null;
  if (!root || rootDuration === null) return;
  let end = rootDuration;
  for (const el of root.querySelectorAll("[data-start][data-duration]")) {
    const start = numberAttr(el, "data-start");
    const duration = numberAttr(el, "data-duration");
    if (start !== null && duration !== null) end = Math.max(end, start + duration);
  }
  if (end > rootDuration + EPSILON) root.setAttribute("data-duration", String(round3(end)));
}
var COPIED_PICTURE_ATTRS = ["class", "style", "data-color-grading", "data-color-group"];
function buildStill(document, video, input) {
  const img = document.createElement("img");
  img.setAttribute("id", input.id);
  for (const name of COPIED_PICTURE_ATTRS) {
    const value = video.getAttribute(name);
    if (value !== null) img.setAttribute(name, value);
  }
  if (!img.classList.contains("clip")) img.classList.add("clip");
  img.setAttribute("src", input.imageSrc);
  img.setAttribute("alt", "");
  img.setAttribute("data-start", String(round3(input.playhead)));
  img.setAttribute("data-duration", String(input.holdSeconds));
  img.setAttribute("data-track-index", String(trackOf(video)));
  img.setAttribute("data-timeline-label", "Freeze");
  return img;
}
function linkedPartners(document, video) {
  const link = video.getAttribute(LINK_ATTR);
  if (!link) return [];
  return Array.from(document.querySelectorAll(`[${LINK_ATTR}]`)).filter(
    (el) => el !== video && el.getAttribute(LINK_ATTR) === link
  );
}
function splitAll(html, elements, time) {
  const rightHalfIds = [];
  let next = html;
  for (const el of elements) {
    const split = splitElementInHtml(
      next,
      targetOf(el),
      time,
      `${el.getAttribute("id") || "clip"}-split`,
      {
        start: numberAttr(el, "data-start") ?? 0,
        duration: numberAttr(el, "data-duration") ?? 0,
        track: trackOf(el)
      }
    );
    if (!split.matched || !split.newId) return null;
    next = split.html;
    rightHalfIds.push(split.newId);
  }
  return { html: next, rightHalfIds };
}
function applyFreezeFrameToHtml(html, input) {
  const hold = input.holdSeconds ?? FREEZE_HOLD_SECONDS;
  const { document: before } = parseSourceDocument(html);
  const video = findTargetElement(before, input.target);
  if (!video || !isHTMLElement(video) || !spans(video, input.playhead)) return null;
  const partners = linkedPartners(before, video);
  const tracks = /* @__PURE__ */ new Set([trackOf(video), ...partners.map(trackOf)]);
  const cut = splitAll(
    html,
    [video, ...partners.filter((el) => spans(el, input.playhead))],
    input.playhead
  );
  if (!cut) return null;
  const { document, wrappedFragment } = parseSourceDocument(cut.html);
  relinkSplitHalves(document, cut.rightHalfIds);
  shiftTracks(document, tracks, input.playhead, hold);
  const leftHalf = findTargetElement(document, input.target);
  if (!leftHalf?.parentElement) return null;
  const freezeId = nextUniqueId(document, `${video.getAttribute("id") || "clip"}-freeze`);
  const still = buildStill(document, leftHalf, {
    id: freezeId,
    imageSrc: input.imageSrc,
    playhead: input.playhead,
    holdSeconds: hold
  });
  leftHalf.parentElement.insertBefore(still, leftHalf.nextSibling);
  growRootToFit(document);
  return {
    html: ensureHfIds3(wrappedFragment ? document.body.innerHTML || "" : document.toString()),
    freezeId
  };
}

// src/routes/freezeFrame.ts
var EXTRACT_TIMEOUT_MS = 3e4;
var ffmpegExtractor = (args) => {
  const ffmpeg = findFfBinary3("ffmpeg", { configuredMustExist: true });
  if (!ffmpeg) return Promise.resolve({ ok: false, error: "ffmpeg not found" });
  return new Promise((resolvePromise) => {
    execFile(
      ffmpeg,
      args,
      { timeout: EXTRACT_TIMEOUT_MS, windowsHide: true },
      (error, _o, stderr) => resolvePromise(
        error ? { ok: false, error: String(stderr || error.message) } : { ok: true }
      )
    );
  });
};
function isFreezeFrameRequest(value) {
  if (typeof value !== "object" || value === null) return false;
  const body = value;
  return typeof body.path === "string" && body.path.length > 0 && typeof body.expectedVersion === "string" && typeof body.target === "object" && body.target !== null && typeof body.playhead === "number" && Number.isFinite(body.playhead);
}
var FREEZE_DIR = ["assets", "freeze"];
function readExpected(absPath, expectedVersion) {
  let content;
  try {
    content = readFileSync11(absPath, "utf-8");
  } catch {
    return { error: "not found", status: 404 };
  }
  return fileContentVersion(content) === expectedVersion ? { content } : { error: "file conflict", status: 409 };
}
function readFrame(path) {
  try {
    return readFileSync11(path);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
function publishStill(path, frame) {
  try {
    createFileAtomically2(path, frame);
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}
async function extractThenPublishWhole(extract, mediaPath, mediaTime, imagePath) {
  const unseenByHistory = atomicTempPath(imagePath);
  try {
    const extracted = await extract(freezeExtractArgs(mediaPath, mediaTime, unseenByHistory));
    const frame = extracted.ok ? readFrame(unseenByHistory) : null;
    if (!frame?.length) {
      const reason = extracted.ok ? "no frame at this time" : extracted.error ?? "ffmpeg failed";
      return { error: `Could not extract the frame: ${reason}`, status: 500 };
    }
    if (publishStill(imagePath, frame)) return null;
    return { error: `freeze still already exists: ${basename2(imagePath)}`, status: 409 };
  } finally {
    rmSync5(unseenByHistory, { force: true });
  }
}
async function extractStill(projectDir, absPath, source, playhead, tools) {
  const fileDir = dirname6(absPath);
  const mediaPath = pinWithinProject(projectDir, relative4(projectDir, join13(fileDir, source.src)));
  if (!mediaPath) return { error: `forbidden media path: ${source.src}`, status: 403 };
  const freezeDir = join13(projectDir, ...FREEZE_DIR);
  const fileName = freezeStillFileName(source.id, playhead, tools.stillToken());
  mkdirWithinProject(projectDir, freezeDir);
  const imagePath = pinWithinProject(projectDir, join13(...FREEZE_DIR, fileName));
  if (!imagePath || dirname6(imagePath) !== freezeDir) {
    return { error: `forbidden freeze path: ${fileName}`, status: 403 };
  }
  const failed = await extractThenPublishWhole(
    tools.extract,
    mediaPath,
    source.mediaTime,
    imagePath
  );
  if (failed) return failed;
  const depth = relative4(projectDir, fileDir).split(sep3).filter(Boolean).length;
  const stillPath = `${FREEZE_DIR.join("/")}/${fileName}`;
  return { imageSrc: `${"../".repeat(depth)}${stillPath}`, stillPath, imagePath };
}
function writeFolded(projectDir, absPath, path, before, after, options) {
  if (readFileSync11(absPath, "utf-8") !== before) {
    return { error: `file conflict: ${path}`, status: 409 };
  }
  const backup = snapshotBeforeWrite(projectDir, absPath);
  if (backup.error) return { error: `Failed to create backup: ${backup.error}`, status: 500 };
  const writeToken = createWriteToken(options.token);
  replaceFileAtomically3(absPath, after, statSync8(absPath).mode);
  const version = fileContentVersion(after);
  recordFileWriteReceipt(absPath, { path, version, writeToken, overwrote: before });
  return { version, writeToken, backupPath: backupPathForResponse(projectDir, backup.backupPath) };
}
function registerFreezeFrameRoutes(api, adapter, extract = ffmpegExtractor, stillToken = randomStillToken) {
  api.post("/projects/:id/file-mutations/freeze-frame", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!isFreezeFrameRequest(body)) {
      return c.json({ error: "path, expectedVersion, target and playhead required" }, 400);
    }
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const absPath = pinWithinProject(project.dir, body.path);
    if (!absPath) return c.json({ error: `forbidden path: ${body.path}` }, 403);
    const read = readExpected(absPath, body.expectedVersion);
    if ("error" in read) return c.json({ error: `${read.error}: ${body.path}` }, read.status);
    const before = read.content;
    const source = readFreezeSource(before, body.target, body.playhead);
    if (!source) return c.json({ error: "Move the playhead inside a video clip to freeze" }, 400);
    const still = await extractStill(project.dir, absPath, source, body.playhead, {
      extract,
      stillToken
    });
    if ("error" in still) return c.json({ error: still.error }, still.status);
    const { imageSrc, stillPath, imagePath } = still;
    const folded = applyFreezeFrameToHtml(before, {
      target: body.target,
      playhead: body.playhead,
      imageSrc
    });
    const failAndRemoveStill = (error, status) => {
      rmSync5(imagePath, { force: true });
      return c.json({ error }, status);
    };
    if (!folded) return failAndRemoveStill("Freeze target was not found in the file", 400);
    const written = writeFolded(project.dir, absPath, body.path, before, folded.html, {
      token: body.transactionToken ?? c.req.header("X-Hyperframes-Write-Token")
    });
    if ("error" in written) return failAndRemoveStill(written.error, written.status);
    const { version, writeToken, backupPath } = written;
    return c.json({
      ok: true,
      path: body.path,
      before,
      after: folded.html,
      version,
      writeToken,
      backupPath,
      freezeId: folded.freezeId,
      imageSrc,
      stillPath
    });
  });
}

// src/routes/loudness.ts
import { existsSync as existsSync8 } from "fs";
var defaultMeasure = (file, window) => measureAudio(requiredFfmpeg(), file, window);
var InvalidField = class extends Error {
};
function numberField(body, name, fallback, valid) {
  const raw = body[name];
  if (raw === void 0 || raw === null) return fallback;
  if (typeof raw === "number" && Number.isFinite(raw) && valid(raw)) return raw;
  throw new InvalidField(`${name} is out of range`);
}
function readNormalizeRequest(body) {
  const src = typeof body.src === "string" ? body.src.trim() : "";
  if (!src) throw new InvalidField("src is required");
  const duration = numberField(body, "duration", 0, (v) => v > 0);
  return {
    id: typeof body.id === "string" && body.id ? body.id : src,
    src,
    window: {
      mediaStart: numberField(body, "mediaStart", 0, (v) => v >= 0),
      duration: duration > 0 ? duration : null,
      playbackRate: numberField(body, "playbackRate", 1, (v) => v > 0)
    },
    volume: numberField(body, "volume", 1, (v) => v >= 0),
    targetLufs: numberField(body, "targetLufs", DEFAULT_TARGET_LUFS, (v) => v < 0)
  };
}
function parseNormalizeRequest(body) {
  try {
    return readNormalizeRequest(body);
  } catch (error) {
    if (error instanceof InvalidField) return error.message;
    throw error;
  }
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function registerLoudnessRoutes(api, adapter, measure = defaultMeasure) {
  api.post("/projects/:id/loudness/normalize", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const body = await c.req.json().catch(() => null);
    if (!isRecord(body)) return c.json({ error: "invalid body" }, 400);
    const request = parseNormalizeRequest(body);
    if (typeof request === "string") return c.json({ error: request }, 400);
    let file;
    try {
      file = resolveLocalAudioPath(project.dir, request.src);
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 400);
    }
    if (!existsSync8(file)) return c.json({ error: "file not found" }, 404);
    try {
      const measurement = await measure(file, request.window);
      const plan = absoluteLoudnessPlan(
        { id: request.id, volume: request.volume, ...measurement },
        request.targetLufs
      );
      return c.json({ plan });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : String(error) }, 422);
    }
  });
}

// src/routes/peaks.ts
import { existsSync as existsSync9, readFileSync as readFileSync12, statSync as statSync9 } from "fs";
import { join as join14, resolve as resolve6 } from "path";
import { isWithinProjectRoot as isWithinProjectRoot3 } from "@hyperframes/parsers/asset-resolution";

// src/helpers/peakMap.ts
import { spawn as spawn2 } from "child_process";
import { findFfBinary as findFfBinary4 } from "@hyperframes/parsers/ff-binaries";
var PEAK_BIN_SECONDS = 0.05;
var PEAK_SAMPLE_RATE = 48e3;
var PEAK_MAP_CACHE_VERSION = "peaks-v2";
function createPeakAccumulator(sampleRate = PEAK_SAMPLE_RATE, binSeconds = PEAK_BIN_SECONDS, channels = 2) {
  return {
    bins: [],
    frame: 0,
    carry: Buffer.alloc(0),
    framesPerBin: Math.max(1, Math.round(sampleRate * binSeconds)),
    channels: Math.max(1, channels)
  };
}
function framePeak(data, offset, channels) {
  let peak = 0;
  for (let ch = 0; ch < channels; ch++) {
    peak = Math.max(peak, Math.abs(data.readFloatLE(offset + ch * 4)));
  }
  return peak;
}
function accumulatePeaks(acc, chunk) {
  const data = acc.carry.length > 0 ? Buffer.concat([acc.carry, chunk]) : chunk;
  const frameBytes = 4 * acc.channels;
  const whole = data.length - data.length % frameBytes;
  for (let offset = 0; offset < whole; offset += frameBytes) {
    const peak = framePeak(data, offset, acc.channels);
    const bin = Math.floor(acc.frame / acc.framesPerBin);
    if (acc.bins.length <= bin) acc.bins.push(0);
    if (peak > (acc.bins[bin] ?? 0)) acc.bins[bin] = peak;
    acc.frame += 1;
  }
  acc.carry = Buffer.from(data.subarray(whole));
}
function finishPeaks(acc) {
  return acc.bins.map((peak) => Number(peak.toFixed(4)));
}
async function decodePeakMap(mediaPath) {
  const track = await probeAudioTrack(mediaPath);
  if (!track || track.channels < 1) throw new Error("no audio stream");
  const { stream, channels } = track;
  return new Promise((resolvePromise, reject) => {
    const proc = spawn2(
      findFfBinary4("ffmpeg") ?? "ffmpeg",
      [
        "-v",
        "error",
        "-i",
        mediaPath,
        "-map",
        `0:a:${stream}`,
        "-vn",
        "-ar",
        String(PEAK_SAMPLE_RATE),
        "-f",
        "f32le",
        "pipe:1"
      ],
      { stdio: ["ignore", "pipe", "ignore"], windowsHide: true }
    );
    const acc = createPeakAccumulator(PEAK_SAMPLE_RATE, PEAK_BIN_SECONDS, channels);
    proc.stdout?.on("data", (chunk) => accumulatePeaks(acc, chunk));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg failed decoding audio (exit ${code})`));
        return;
      }
      if (acc.frame === 0) {
        reject(new Error("ffmpeg produced no audio samples"));
        return;
      }
      resolvePromise(finishPeaks(acc));
    });
    proc.on("error", reject);
  });
}
function buildPeakMapCacheKey(assetPath, fingerprint) {
  const name = assetPath.replace(/[/\\]/g, "_");
  return `${PEAK_MAP_CACHE_VERSION}_${name}_${fingerprint.size}-${Math.round(fingerprint.mtimeMs)}.json`;
}

// src/routes/peaks.ts
var decodesInFlight = /* @__PURE__ */ new Map();
function decodeOnce(cachePath, mediaPath, decode) {
  const pending = decodesInFlight.get(cachePath);
  if (pending) return pending;
  const started = decode(mediaPath).finally(() => decodesInFlight.delete(cachePath));
  decodesInFlight.set(cachePath, started);
  return started;
}
function readCachedBins(cacheDir, cachePath) {
  try {
    if (!isWaveformCacheDirectory(cacheDir) || !existsSync9(cachePath)) return null;
    const parsed = JSON.parse(readFileSync12(cachePath, "utf-8"));
    return Array.isArray(parsed) && parsed.every((n) => typeof n === "number") ? parsed : null;
  } catch {
    return null;
  }
}
function registerPeakRoutes(api, adapter, decode = decodePeakMap) {
  api.get("/projects/:id/peaks/*", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const assetPath = requestSubPath(c.req.url, "projects/:id/peaks");
    const mediaPath = resolve6(project.dir, assetPath);
    if (!isWithinProjectRoot3(project.dir, mediaPath))
      return c.json({ error: "file not found" }, 404);
    const stats = statSync9(mediaPath, { throwIfNoEntry: false });
    if (!stats?.isFile()) return c.json({ error: "file not found" }, 404);
    const cacheDir = join14(project.dir, ".waveform-cache");
    const cachePath = join14(cacheDir, buildPeakMapCacheKey(assetPath, stats));
    const cached = readCachedBins(cacheDir, cachePath);
    if (cached) return c.json({ binSeconds: PEAK_BIN_SECONDS, bins: cached });
    let bins;
    try {
      bins = await decodeOnce(cachePath, mediaPath, decode);
    } catch {
      return c.json({ error: "failed to decode audio" }, 500);
    }
    try {
      writeWaveformCache(cachePath, bins);
    } catch {
    }
    return c.json({ binSeconds: PEAK_BIN_SECONDS, bins });
  });
}

// src/routes/fonts.ts
import { closeSync as closeSync3, constants, fstatSync as fstatSync3, openSync as openSync3, readSync } from "fs";
import {
  collectFontFileEntries,
  fontDirectories,
  locateSystemFont,
  SYSTEM_FONT_SIZE_LIMIT
} from "@hyperframes/core/fonts/system-locator";
var MAX_FONT_RESULTS = 2e3;
var GOOGLE_FONTS_METADATA_URL = "https://fonts.google.com/metadata/fonts";
var GOOGLE_FONTS_FETCH_TIMEOUT_MS = 3e3;
var cachedFonts = null;
var cachedGoogleFonts = null;
var GOOGLE_FONT_FALLBACKS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Poppins",
  "Lato",
  "Oswald",
  "Raleway",
  "Nunito",
  "Playfair Display",
  "Merriweather",
  "Source Sans 3",
  "Source Serif 4",
  "Source Code Pro",
  "DM Sans",
  "Space Grotesk",
  "Space Mono",
  "Bebas Neue",
  "Outfit",
  "JetBrains Mono"
];
function isRecord2(value) {
  return typeof value === "object" && value !== null;
}
function collectFontsFromDir(dir) {
  return collectFontFileEntries(dir).map((e) => e.family);
}
function listInstalledFontFamilies() {
  if (cachedFonts) return cachedFonts;
  const families = /* @__PURE__ */ new Set();
  for (const dir of fontDirectories()) {
    for (const family of collectFontsFromDir(dir)) {
      families.add(family);
      if (families.size >= MAX_FONT_RESULTS) break;
    }
    if (families.size >= MAX_FONT_RESULTS) break;
  }
  cachedFonts = Array.from(families).sort((a, b) => a.localeCompare(b));
  return cachedFonts;
}
function parseGoogleFontMetadata(value) {
  if (!isRecord2(value) || !Array.isArray(value.familyMetadataList)) return [];
  const families = [];
  for (const entry of value.familyMetadataList) {
    if (!isRecord2(entry) || typeof entry.family !== "string") continue;
    families.push(entry.family);
  }
  return families;
}
function stripGoogleJsonGuard(raw) {
  const prefix = ")]}'";
  if (!raw.startsWith(prefix)) return raw;
  let index = prefix.length;
  while (index < raw.length && (raw[index] === " " || raw[index] === "\n" || raw[index] === "\r" || raw[index] === "	" || raw[index] === "\f")) {
    index += 1;
  }
  return raw.slice(index);
}
async function listGoogleFontFamilies() {
  if (cachedGoogleFonts) return cachedGoogleFonts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GOOGLE_FONTS_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(GOOGLE_FONTS_METADATA_URL, { signal: controller.signal });
    if (!response.ok) {
      cachedGoogleFonts = GOOGLE_FONT_FALLBACKS;
      return cachedGoogleFonts;
    }
    const raw = await response.text();
    const jsonText = stripGoogleJsonGuard(raw);
    const families = parseGoogleFontMetadata(JSON.parse(jsonText));
    cachedGoogleFonts = families.length > 0 ? families : GOOGLE_FONT_FALLBACKS;
  } catch {
    cachedGoogleFonts = GOOGLE_FONT_FALLBACKS;
  } finally {
    clearTimeout(timer);
  }
  return cachedGoogleFonts;
}
function registerFontRoutes(api) {
  api.get("/fonts", (c) => c.json({ fonts: listInstalledFontFamilies() }));
  api.get("/fonts/google", async (c) => c.json({ fonts: await listGoogleFontFamilies() }));
  api.get("/fonts/file", (c) => {
    const family = c.req.query("family");
    if (!family) return c.json({ error: "family parameter required" }, 400);
    const located = locateSystemFont(family);
    if (!located) return c.json({ error: "font not found" }, 404);
    let fd;
    try {
      fd = openSync3(located.path, constants.O_RDONLY | constants.O_NOFOLLOW);
    } catch {
      return c.json({ error: "font file not accessible" }, 404);
    }
    try {
      const stat2 = fstatSync3(fd);
      if (stat2.size > SYSTEM_FONT_SIZE_LIMIT) {
        return c.json({ error: "font file too large" }, 413);
      }
      const buffer = Buffer.alloc(stat2.size);
      readSync(fd, buffer, 0, stat2.size, 0);
      const mimeType = located.format === "otf" ? "font/otf" : located.format === "woff2" ? "font/woff2" : located.format === "woff" ? "font/woff" : located.format === "ttc" ? "font/collection" : "font/ttf";
      const fileName = `${family.replace(/[^a-zA-Z0-9 -]/g, "")}.${located.format}`;
      return new Response(buffer, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${fileName}"`
        }
      });
    } catch {
      return c.json({ error: "failed to read font file" }, 500);
    } finally {
      closeSync3(fd);
    }
  });
}

// src/routes/registry.ts
function registerRegistryRoutes(api, adapter) {
  api.get("/registry/blocks", async (c) => {
    if (!adapter.listRegistryCatalog) {
      return c.json({ error: "Registry not available" }, 501);
    }
    const items = await adapter.listRegistryCatalog();
    return c.json(items);
  });
  api.post("/projects/:id/registry/install", async (c) => {
    if (!adapter.installRegistryBlock) {
      return c.json({ error: "Installing catalog items needs hyperframes preview" }, 501);
    }
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "Project not found" }, 404);
    if (folderGone(project.dir)) return projectDirMissing(c);
    const body = await c.req.json().catch(() => null);
    if (!body?.blockName) {
      return c.json({ error: "blockName is required" }, 400);
    }
    try {
      const result = await adapter.installRegistryBlock({ project, blockName: body.blockName });
      return c.json(result);
    } catch (err) {
      if (isProjectRootMissing(err)) return projectDirMissing(c);
      const message = err instanceof Error ? err.message : "Install failed";
      return c.json({ error: message }, 500);
    }
  });
}

// src/routes/selection.ts
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}
function isStringRecord(value) {
  return isRecord3(value) && Object.values(value).every((v) => typeof v === "string");
}
function hasString(value, key) {
  return typeof value[key] === "string";
}
function hasRequiredStrings(value, keys) {
  return keys.every((key) => hasString(value, key));
}
function hasOptionalString(value, key) {
  return value[key] === void 0 || typeof value[key] === "string";
}
function hasOptionalNullableString(value, key) {
  return value[key] == null || typeof value[key] === "string";
}
function hasOptionalNumber(value, key) {
  return value[key] === void 0 || isFiniteNumber(value[key]);
}
function isBoundingBox(value) {
  return isRecord3(value) && ["x", "y", "width", "height"].every((key) => isFiniteNumber(value[key]));
}
function isTarget(value) {
  if (!isRecord3(value)) return false;
  return hasOptionalNullableString(value, "id") && hasOptionalString(value, "hfId") && hasOptionalString(value, "selector") && hasOptionalNumber(value, "selectorIndex");
}
function isTextField(value) {
  return isRecord3(value) && hasRequiredStrings(value, ["key", "label", "value", "tagName"]) && ["self", "child", "text-node"].includes(value.source);
}
function isTextFields(value) {
  return Array.isArray(value) && value.every(isTextField);
}
function isSelectionSnapshot(value) {
  if (!isRecord3(value)) return false;
  const checks = [
    value.schemaVersion === 1 && hasRequiredStrings(value, [
      "projectId",
      "compositionPath",
      "sourceFile",
      "label",
      "tagName",
      "thumbnailUrl"
    ]),
    isFiniteNumber(value.currentTime),
    isTarget(value.target),
    isBoundingBox(value.boundingBox),
    value.textContent === null || typeof value.textContent === "string",
    isStringRecord(value.dataAttributes),
    isStringRecord(value.inlineStyles),
    isStringRecord(value.computedStyles),
    isTextFields(value.textFields),
    isRecord3(value.capabilities)
  ];
  return checks.every(Boolean);
}
function registerSelectionRoutes(api, adapter) {
  const selections = /* @__PURE__ */ new Map();
  api.get("/projects/:id/selection", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const stored = selections.get(project.id);
    return c.json({
      selection: stored?.selection ?? null,
      updatedAt: stored?.updatedAt ?? null
    });
  });
  api.put("/projects/:id/selection", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    let body;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid json" }, 400);
    }
    if (!isRecord3(body) || !("selection" in body)) {
      return c.json({ error: "missing selection" }, 400);
    }
    if (body.selection === null) {
      selections.delete(project.id);
      return c.json({ ok: true, selection: null, updatedAt: null });
    }
    if (!isSelectionSnapshot(body.selection)) {
      return c.json({ error: "invalid selection" }, 400);
    }
    const selection = { ...body.selection, projectId: project.id };
    const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    selections.set(project.id, { selection, updatedAt });
    return c.json({ ok: true, selection, updatedAt });
  });
}

// src/routes/media.ts
import { streamSSE as streamSSE2 } from "hono/streaming";
import { existsSync as existsSync10 } from "fs";
import { basename as basename3, dirname as dirname7, extname, join as join15, posix } from "path";
var VIDEO_EXTENSIONS = /* @__PURE__ */ new Set([
  ".mp4",
  ".mov",
  ".webm",
  ".mkv",
  ".avi",
  ".m4v",
  ".mxf",
  ".mts",
  ".m2ts",
  ".ts"
]);
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".webp"]);
var VIDEO_OUTPUT_EXTENSIONS = /* @__PURE__ */ new Set([".webm", ".mov"]);
var QUALITIES = /* @__PURE__ */ new Set(["fast", "balanced", "best"]);
var DEVICES = /* @__PURE__ */ new Set(["auto", "cpu", "coreml", "cuda"]);
function isVideoPath(path) {
  return VIDEO_EXTENSIONS.has(extname(path).toLowerCase());
}
function isImagePath(path) {
  return IMAGE_EXTENSIONS.has(extname(path).toLowerCase());
}
function containsNullByte(path) {
  return path.includes("\0");
}
function slugFileBase(path) {
  const name = basename3(path, extname(path)).replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return name || "media";
}
function uniqueAssetPath(projectDir, assetPath, taken) {
  const ext = extname(assetPath);
  const withoutExt = assetPath.slice(0, -ext.length);
  let candidate = assetPath;
  for (let index = 2; taken.has(candidate) || existsSync10(join15(projectDir, candidate)); index++) {
    candidate = `${withoutExt}-${index}${ext}`;
  }
  return candidate;
}
function defaultOutputPath(projectDir, inputPath, taken) {
  const ext = isImagePath(inputPath) ? ".png" : ".webm";
  return uniqueAssetPath(
    projectDir,
    `assets/cutouts/${slugFileBase(inputPath)}-cutout${ext}`,
    taken
  );
}
function defaultPlatePath(projectDir, inputPath, taken) {
  return uniqueAssetPath(projectDir, `assets/cutouts/${slugFileBase(inputPath)}-plate.webm`, taken);
}
function outputsInFlight(mediaJobs) {
  const running = [...mediaJobs.values()].filter((job) => job.status === "processing");
  return new Set(
    running.flatMap((job) => [job.outputAssetPath, job.backgroundOutputAssetPath ?? ""])
  );
}
function makeJobId(projectId, mediaJobs) {
  const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  const base = `${safeProject || "project"}_remove-bg_${stamp}`;
  if (!mediaJobs.has(base)) return base;
  for (let index = 2; ; index++) {
    const candidate = `${base}-${index}`;
    if (!mediaJobs.has(candidate)) return candidate;
  }
}
function normalizeQuality(value) {
  return QUALITIES.has(value ?? "") ? value : "balanced";
}
function normalizeDevice(value) {
  return DEVICES.has(value ?? "") ? value : "auto";
}
function registerMediaRoutes(api, adapter, options = {}) {
  const mediaJobs = /* @__PURE__ */ new Map();
  const TTL_MS = 3e5;
  const readMediaMetadata = options.probeMediaMetadata ?? probeMediaMetadata;
  function cleanupFinishedJobs() {
    forgetJobsFinishedLongerThan(
      TTL_MS,
      mediaJobs,
      (job) => job.status === "complete" || job.status === "failed"
    );
  }
  api.get("/projects/:id/media/metadata", async (c) => {
    const project = await adapter.resolveProject(c.req.param("id"));
    if (!project) return c.json({ error: "not found" }, 404);
    const assetPath = requestedProjectPath(project.dir, c.req.query("path") ?? "");
    if (!assetPath) return c.json({ error: "path required" }, 400);
    if (containsNullByte(assetPath)) return c.json({ error: "forbidden" }, 403);
    if (/^(?:https?:|data:|blob:)/i.test(assetPath)) {
      return c.json({ error: "media metadata requires a project-local asset" }, 400);
    }
    const filePath = resolveWithinProject(project.dir, assetPath);
    if (!filePath) return c.json({ error: "forbidden" }, 403);
    if (!existsSync10(filePath)) return c.json({ error: "media not found" }, 404);
    return c.json({ path: assetPath, metadata: await readMediaMetadata(filePath) });
  });
  api.post(
    "/projects/:id/media/remove-background",
    // fallow-ignore-next-line complexity
    async (c) => {
      cleanupFinishedJobs();
      if (!adapter.startBackgroundRemoval) {
        return c.json({ error: "background removal is not available in this Studio server" }, 501);
      }
      const project = await adapter.resolveProject(c.req.param("id"));
      if (!project) return c.json({ error: "not found" }, 404);
      const body = await c.req.json().catch(() => ({}));
      const inputAssetPath = body.inputPath ? requestedProjectPath(project.dir, body.inputPath) : "";
      if (!inputAssetPath) return c.json({ error: "inputPath required" }, 400);
      if (containsNullByte(inputAssetPath)) return c.json({ error: "forbidden" }, 403);
      if (/^(?:https?:|data:|blob:)/i.test(inputAssetPath)) {
        return c.json({ error: "background removal requires a project-local media asset" }, 400);
      }
      const inputPath = resolveWithinProject(project.dir, inputAssetPath);
      if (!inputPath) return c.json({ error: "forbidden" }, 403);
      if (!existsSync10(inputPath)) return c.json({ error: "input media not found" }, 404);
      const inputIsVideo = isVideoPath(inputAssetPath);
      const inputIsImage = isImagePath(inputAssetPath);
      if (!inputIsVideo && !inputIsImage) {
        return c.json({ error: "background removal supports video or image assets only" }, 400);
      }
      const requestedOutput = body.outputPath ? posix.normalize(requestedProjectPath(project.dir, body.outputPath)) : "";
      if (requestedOutput && containsNullByte(requestedOutput)) {
        return c.json({ error: "forbidden" }, 403);
      }
      if (requestedOutput && !resolveWithinProject(project.dir, requestedOutput)) {
        return c.json({ error: "forbidden" }, 403);
      }
      const taken = outputsInFlight(mediaJobs);
      const outputAssetPath = requestedOutput ? uniqueAssetPath(project.dir, requestedOutput, taken) : defaultOutputPath(project.dir, inputAssetPath, taken);
      const outputPath = pinWithinProject(project.dir, outputAssetPath);
      if (!outputPath) return c.json({ error: "forbidden" }, 403);
      if (inputIsVideo && !VIDEO_OUTPUT_EXTENSIONS.has(extname(outputAssetPath).toLowerCase())) {
        return c.json({ error: "video background removal output must be .webm or .mov" }, 400);
      }
      if (inputIsImage && extname(outputAssetPath).toLowerCase() !== ".png") {
        return c.json({ error: "image background removal output must be .png" }, 400);
      }
      let backgroundOutputAssetPath;
      let backgroundOutputPath;
      if (body.createBackgroundPlate) {
        if (!inputIsVideo) {
          return c.json({ error: "background plates are only supported for video inputs" }, 400);
        }
        taken.add(outputAssetPath);
        backgroundOutputAssetPath = defaultPlatePath(project.dir, inputAssetPath, taken);
        backgroundOutputPath = pinWithinProject(project.dir, backgroundOutputAssetPath) ?? void 0;
        if (!backgroundOutputPath) {
          return c.json({ error: "forbidden" }, 403);
        }
      }
      mkdirWithinProject(project.dir, dirname7(outputPath));
      if (backgroundOutputPath) mkdirWithinProject(project.dir, dirname7(backgroundOutputPath));
      const jobId = makeJobId(project.id, mediaJobs);
      const state = adapter.startBackgroundRemoval({
        project,
        inputPath,
        inputAssetPath,
        outputPath,
        outputAssetPath,
        backgroundOutputPath,
        backgroundOutputAssetPath,
        quality: normalizeQuality(body.quality),
        device: normalizeDevice(body.device),
        jobId
      });
      mediaJobs.set(jobId, state);
      return c.json({
        jobId,
        status: state.status,
        outputPath: outputAssetPath,
        backgroundOutputPath: backgroundOutputAssetPath
      });
    }
  );
  api.get("/media-jobs/:jobId/progress", (c) => {
    cleanupFinishedJobs();
    const { jobId } = c.req.param();
    const job = mediaJobs.get(jobId);
    if (!job) return c.json({ error: "not found" }, 404);
    return streamSSE2(c, async (stream) => {
      while (true) {
        const current = mediaJobs.get(jobId);
        if (!current) break;
        await stream.writeSSE({
          event: "progress",
          data: JSON.stringify({
            id: current.id,
            status: current.status,
            progress: current.progress,
            stage: current.stage,
            outputPath: current.outputAssetPath,
            backgroundOutputPath: current.backgroundOutputAssetPath,
            error: current.error,
            provider: current.provider,
            framesProcessed: current.framesProcessed,
            durationSeconds: current.durationSeconds,
            avgMsPerFrame: current.avgMsPerFrame
          })
        });
        if (current.status === "complete" || current.status === "failed") break;
        await stream.sleep(500);
      }
    });
  });
}

// src/routes/globalAssets.ts
import { existsSync as existsSync11, readFileSync as readFileSync13 } from "fs";
import { homedir } from "os";
import { join as join16 } from "path";
function readGlobalAssets(home = homedir()) {
  const manifestPath = join16(home, ".media", "manifest.jsonl");
  if (!existsSync11(manifestPath)) return [];
  const out = [];
  for (const line of readFileSync13(manifestPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const rec = JSON.parse(line);
      if (rec && rec.reusable) out.push(rec);
    } catch {
    }
  }
  return out;
}
function toPublicAsset(r) {
  return { id: r.id, type: r.type, description: r.description, sha: r.sha, entity: r.entity };
}
function registerGlobalAssetRoutes(api) {
  api.get("/assets/global", (c) => c.json({ assets: readGlobalAssets().map(toPublicAsset) }));
}

// src/routes/history.ts
var YOU = { kind: "person", name: "You" };
async function historyOf(adapter, c) {
  const project = await adapter.resolveProject(c.req.param("id") ?? "");
  return project ? await adapter.history?.(project) ?? null : null;
}
async function bodyOf(c) {
  const body = await c.req.json().catch(() => null);
  return body && typeof body === "object" ? body : {};
}
var text = (value) => typeof value === "string" && value ? value : null;
function writing(c) {
  const header = c.req.header("X-Hyperframes-Write-Token");
  return header ? { writeToken: createWriteToken(header) } : {};
}
function whoOf(body) {
  const who = body.who;
  const name = text(who?.name);
  return who?.kind === "agent" && name ? { kind: "agent", name } : YOU;
}
function idleOf(body) {
  const idleMs = body.idleMs;
  return typeof idleMs === "number" && idleMs > 0 ? Math.min(idleMs, MAX_WINDOW_IDLE_MS) : void 0;
}
function versionsOf(value) {
  if (!value || typeof value !== "object") return void 0;
  const pairs = Object.entries(value).filter(
    (pair) => typeof pair[1] === "string"
  );
  return pairs.length ? Object.fromEntries(pairs) : void 0;
}
function targetsOf(value) {
  if (!Array.isArray(value)) return void 0;
  const targets = value.flatMap((item) => targetOf2(item) ?? []);
  return targets.length ? targets : void 0;
}
function targetOf2(item) {
  if (!item || typeof item !== "object") return null;
  const fields = item;
  if (typeof fields.file !== "string") return null;
  const target = { file: fields.file, ...identityOf(fields) };
  if (!target.id && !target.hfId && !target.selector) return null;
  if (isSelectorIndex(fields.selectorIndex)) target.selectorIndex = fields.selectorIndex;
  return target;
}
function identityOf(fields) {
  const identity = {};
  for (const key of ["id", "hfId", "selector"]) {
    const field = fields[key];
    if (typeof field === "string" && field) identity[key] = field;
  }
  return identity;
}
var isSelectorIndex = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
function nextStep(history, direction) {
  const target = history.next(direction, YOU);
  if (!target) return null;
  const paths = target.files.map((file) => file.path);
  return { id: target.id, label: target.label, endedAt: target.endedAt, paths };
}
var LOOPBACK = /* @__PURE__ */ new Set(["127.0.0.1", "localhost", "[::1]"]);
var FORWARD_DEADLINE_MS = 5e3;
function ownerRoute(c, error) {
  if (!(error instanceof HistoryBusyError) || !error.url || !URL.canParse(error.url)) return null;
  const owner = new URL(error.url);
  if (owner.protocol !== "http:" || !LOOPBACK.has(owner.hostname)) return null;
  const rest = c.req.path.replace(/^.*?\/projects\/[^/]+\/history/, "");
  return `${owner.href.replace(/\/$/, "")}${rest}${new URL(c.req.url).search}`;
}
async function forward(c, target) {
  const token = c.req.header("X-Hyperframes-Write-Token");
  const reads = c.req.method === "GET" || c.req.method === "HEAD";
  const reply = await fetch(target, {
    method: c.req.method,
    headers: {
      "content-type": c.req.header("content-type") ?? "application/json",
      ...token && { "X-Hyperframes-Write-Token": token }
    },
    ...!reads && { body: await c.req.arrayBuffer() },
    signal: AbortSignal.timeout(FORWARD_DEADLINE_MS)
  });
  const type = reply.headers.get("content-type") ?? "application/json";
  return new Response(await reply.arrayBuffer(), {
    status: reply.status,
    headers: { "content-type": type }
  });
}
async function withHistory(adapter, c, task) {
  try {
    const history = await historyOf(adapter, c);
    if (!history) return c.json({ error: "This project has no history here." }, 404);
    const result = await task(history, await bodyOf(c));
    return result instanceof Response ? result : c.json(result ?? null);
  } catch (error) {
    const target = ownerRoute(c, error);
    const forwarded = target && await forward(c, target).catch(() => null);
    return forwarded || c.json({ error: error instanceof Error ? error.message : String(error) }, 409);
  }
}
function registerHistoryRoutes(api, adapter) {
  const windows = /* @__PURE__ */ new Map();
  const base = "/projects/:id/history";
  api.get(
    base,
    (c) => withHistory(adapter, c, (history) => {
      const entries = history.list();
      return { entries, back: nextStep(history, "back"), forward: nextStep(history, "forward") };
    })
  );
  api.post(
    `${base}/checkpoint`,
    (c) => withHistory(adapter, c, async (history) => {
      await history.checkpoint();
      return { ok: true };
    })
  );
  api.post(
    `${base}/step`,
    (c) => withHistory(
      adapter,
      c,
      (history, body) => history.step(body.direction === "forward" ? "forward" : "back", YOU, writing(c))
    )
  );
  api.post(
    `${base}/undo`,
    (c) => withHistory(adapter, c, (history, body) => {
      const mode = UNDO_MODES.find((known) => known === body.mode);
      return history.undo(text(body.entryId) ?? "", { who: whoOf(body), mode, ...writing(c) });
    })
  );
  api.post(
    `${base}/restore`,
    (c) => withHistory(
      adapter,
      c,
      (history, body) => history.restore(text(body.point) ?? "", whoOf(body), writing(c))
    )
  );
  api.get(
    `${base}/peek/:point`,
    (c) => withHistory(adapter, c, (history) => ({ files: history.peek(c.req.param("point")) }))
  );
  api.post(
    `${base}/pin`,
    (c) => withHistory(adapter, c, (history, body) => {
      history.pin(text(body.entryId) ?? "", body.pinned === true);
      return { ok: true };
    })
  );
  api.get(
    `${base}/blob/:hash`,
    (c) => withHistory(adapter, c, async (history) => {
      const hash = c.req.param("hash") ?? "";
      const bytes = /^[0-9a-f]{64}$/.test(hash) ? await history.readBlob(hash).catch(() => null) : null;
      return bytes ? c.body(new Uint8Array(bytes)) : c.json({ error: "That file is not kept in this project's history." }, 404);
    })
  );
  api.post(
    `${base}/claim`,
    (c) => withHistory(adapter, c, async (history, body) => {
      const paths = Array.isArray(body.paths) ? body.paths.filter((path) => text(path)) : [];
      const coalesceKey = text(body.coalesceKey) ?? void 0;
      const overwrote = versionsOf(body.overwrote);
      const targets = targetsOf(body.targets);
      const claimed = await history.claim(YOU, text(body.label) ?? "Edited in Studio", paths, {
        ...coalesceKey && { coalesceKey, idleMs: idleOf(body) ?? Infinity },
        ...overwrote && { overwrote },
        ...targets && { targets }
      });
      return { claimed };
    })
  );
  api.post(
    `${base}/window`,
    (c) => withHistory(adapter, c, async (history, body) => {
      const idleMs = idleOf(body);
      const window = await history.beginWindow(
        whoOf(body),
        text(body.label) ?? "Edited in Studio",
        {
          ...idleMs ? { idleMs } : {},
          ...body.exclusive === true && { exclusive: true }
        }
      );
      windows.set(window.id, { history, window });
      return { windowId: window.id, startedAt: window.startedAt };
    })
  );
  api.post(
    `${base}/window/:windowId/close`,
    (c) => withHistory(adapter, c, async (history) => {
      const id = c.req.param("windowId") ?? "";
      const held = windows.get(id);
      if (held?.history !== history) throw new Error("That window is not open in this project.");
      windows.delete(id);
      return { entry: await held.window.close() };
    })
  );
}

// src/helpers/previewErrorPage.ts
import {
  refusedPreviewMessage,
  STUDIO_PREVIEW_ERRORS as STUDIO_PREVIEW_ERRORS2
} from "@hyperframes/core/studio-preview-mark";
function previewErrorPage(status) {
  const message = refusedPreviewMessage(status);
  return `<!doctype html><meta charset="utf-8"><script>window.${STUDIO_PREVIEW_ERRORS2}=[${JSON.stringify(message)}]</script><p>${message}</p>`;
}

// src/createStudioApi.ts
async function answerRefusedFrameWithPage(c, next) {
  await next();
  if (c.req.header("sec-fetch-dest") !== "iframe" || c.res.status < 400) return;
  const headers = new Headers(c.res.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.delete("content-length");
  c.res = new Response(previewErrorPage(c.res.status), {
    status: c.res.status,
    headers
  });
}
function createStudioApi(adapter) {
  const api = new Hono();
  api.use("/projects/:id/preview/*", answerRefusedFrameWithPage);
  api.use("/projects/:id/preview", answerRefusedFrameWithPage);
  api.use(async function answerProjectDirMissingAfterErrorHandlers(c, next) {
    const hostHeaders = new Headers(c.res.headers);
    await next();
    if (isProjectRootMissing(c.error)) replaceWithProjectDirMissing(c, hostHeaders);
  });
  api.use("/projects/:id/*", async function answerProjectDirMissingForVanishedFolder(c, next) {
    const hostHeaders = new Headers(c.res.headers);
    const dirBeforeRoute = await Promise.resolve().then(() => adapter.resolveProject(c.req.param("id"))).then(
      (project) => project?.dir,
      () => void 0
    );
    await next();
    if (c.res.status >= 403 && dirBeforeRoute && folderGone(dirBeforeRoute))
      replaceWithProjectDirMissing(c, hostHeaders);
  });
  api.use("/projects/:id/*", async function forgetSignatureAfterWrite(c, next) {
    await next();
    if (c.req.method === "GET" || c.req.method === "HEAD") return;
    const project = await Promise.resolve().then(() => adapter.resolveProject(c.req.param("id"))).catch(() => null);
    if (project) adapter.invalidateProjectSignature?.(project.dir);
  });
  api.use("/projects/:id/*", async function openHistorySoNoWriteBecomesItsBaseline(c, next) {
    if (c.req.method !== "GET" && c.req.method !== "HEAD" && adapter.history) {
      await Promise.resolve().then(() => adapter.resolveProject(c.req.param("id"))).then((project) => project && adapter.history?.(project)).catch(() => null);
    }
    await next();
  });
  registerProjectRoutes(api, adapter);
  registerFileRoutes(api, adapter);
  registerPreviewRoutes(api, adapter);
  registerLintRoutes(api, adapter);
  registerRenderRoutes(api, adapter);
  registerThumbnailRoutes(api, adapter);
  registerImageThumbnailRoutes(api, adapter);
  registerSelectionRoutes(api, adapter);
  registerMediaRoutes(api, adapter);
  registerWaveformRoutes(api, adapter);
  registerFreezeFrameRoutes(api, adapter);
  registerLoudnessRoutes(api, adapter);
  registerPeakRoutes(api, adapter);
  registerFontRoutes(api);
  registerRegistryRoutes(api, adapter);
  registerGlobalAssetRoutes(api);
  registerHistoryRoutes(api, adapter);
  return api;
}

// src/helpers/duplicateElement.ts
import { sameInstant } from "@hyperframes/core/clip-facts";
import { ensureHfIds as ensureHfIds4 } from "@hyperframes/parsers/hf-ids";
function duplicateElementInHtml(source, target, newId, at, fallbackDuration = 0) {
  const { document, wrappedFragment } = parseSourceDocument(source);
  const element = findTargetElement(document, target);
  if (!element || !element.parentElement) return { html: source, matched: false, newId: null };
  const duration = element.hasAttribute("data-duration") ? numericAttribute(element, "data-duration") : fallbackDuration;
  const start = numericAttribute(element, "data-start");
  const track = numericAttribute(element, "data-track-index") ?? 0;
  if (duration === null || start === null) {
    return { html: source, matched: false, newId: null };
  }
  const uniqueId = nextUniqueId(document, newId);
  rippleElements(document, element, at, duration, track);
  const clone = element.cloneNode(true);
  if (!isHTMLElement(clone)) return { html: source, matched: false, newId: null };
  clone.setAttribute("id", uniqueId);
  dedupeClonedCompositionId(document, clone);
  stripStableIds(clone);
  moveElementStart(clone, start, at);
  element.parentElement.insertBefore(clone, element.nextSibling);
  const html = wrappedFragment ? document.body.innerHTML || "" : document.toString();
  return { html: ensureHfIds4(html), matched: true, newId: uniqueId };
}
function rippleElements(document, element, at, duration, track) {
  for (const candidate of Array.from(document.querySelectorAll("[data-start]"))) {
    if (candidate === element || candidate.getAttribute("data-track-index") !== String(track)) {
      continue;
    }
    const start = numericAttribute(candidate, "data-start");
    if (start === null) continue;
    const metInsertionPoint = sameInstant(start, at);
    if (start < at && !metInsertionPoint) continue;
    moveElementStart(candidate, start, (metInsertionPoint ? at : start) + duration);
  }
}
function moveElementStart(element, start, nextStart) {
  element.setAttribute("data-start", String(nextStart));
  if (!element.hasAttribute("data-end")) return;
  const end = numericAttribute(element, "data-end");
  if (end !== null) element.setAttribute("data-end", String(end + (nextStart - start)));
}
function stripStableIds(element) {
  element.removeAttribute("data-hf-id");
  for (const child of Array.from(element.querySelectorAll("[data-hf-id]"))) {
    child.removeAttribute("data-hf-id");
  }
}
function numericAttribute(element, name) {
  const value = Number(element.getAttribute(name));
  return Number.isFinite(value) ? value : null;
}

// src/helpers/previewDocumentStore.ts
import { createHash as createHash7 } from "crypto";
import { readFileSync as readFileSync14, readdirSync as readdirSync5, rmSync as rmSync6 } from "fs";
import { join as join17 } from "path";
import { replaceFileAtomically as replaceFileAtomically4 } from "@hyperframes/core/atomic-file";
function createPreviewDocumentStore(projectDir, salt) {
  const dir = join17(projectDir, ".hyperframes", "preview");
  const fileFor = (key) => join17(dir, `${createHash7("sha256").update(`${salt}
${key}`).digest("hex").slice(0, 32)}.html`);
  return {
    read(key) {
      try {
        return readFileSync14(fileFor(key), "utf-8");
      } catch {
        return null;
      }
    },
    write(key, html) {
      try {
        mkdirWithinProject(projectDir, dir);
        const file = fileFor(key);
        replaceFileAtomically4(file, html, 420);
        for (const name of readdirSync5(dir)) {
          if (join17(dir, name) !== file) rmSync6(join17(dir, name), { force: true });
        }
      } catch {
      }
    }
  };
}

// src/helpers/thumbnailOutput.ts
function thumbnailDeviceScaleFactor({
  width,
  height,
  outputWidth,
  outputHeight
}) {
  const dimensions = [width, height, outputWidth, outputHeight];
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError("Thumbnail dimensions must be positive finite numbers");
  }
  return Math.min(1, outputWidth / width, outputHeight / height);
}

// src/helpers/backgroundRemovalJob.ts
function createBackgroundRemovalJob(opts, render) {
  const state = {
    id: opts.jobId,
    status: "processing",
    progress: 0,
    stage: "Preparing background removal",
    inputAssetPath: opts.inputAssetPath,
    outputAssetPath: opts.outputAssetPath,
    outputPath: opts.outputPath,
    ...opts.backgroundOutputPath ? { backgroundOutputPath: opts.backgroundOutputPath } : {},
    ...opts.backgroundOutputAssetPath ? { backgroundOutputAssetPath: opts.backgroundOutputAssetPath } : {}
  };
  void (async () => {
    try {
      const result = await render({
        inputPath: opts.inputPath,
        outputPath: opts.outputPath,
        backgroundOutputPath: opts.backgroundOutputPath,
        device: opts.device,
        quality: opts.quality,
        onProgress: (event) => updateBackgroundRemovalProgress(state, event)
      });
      state.status = "complete";
      state.progress = 100;
      state.stage = "Complete";
      state.provider = result.provider;
      state.framesProcessed = result.framesProcessed;
      state.durationSeconds = result.durationSeconds;
      state.avgMsPerFrame = result.avgMsPerFrame;
    } catch (err) {
      state.status = "failed";
      state.error = err instanceof Error ? err.message : String(err);
      state.stage = "Failed";
    }
  })();
  return state;
}
function updateBackgroundRemovalProgress(state, event) {
  if (event.kind === "info") {
    state.stage = event.message;
    return;
  }
  if (event.kind === "metadata") {
    state.stage = `Source ${event.width}\xD7${event.height}`;
    state.progress = 2;
    return;
  }
  state.progress = event.total ? Math.min(99, Math.floor(event.index / event.total * 100)) : 0;
  state.stage = event.total ? `Removing background ${event.index}/${event.total}` : `Removing background frame ${event.index}`;
  state.framesProcessed = event.index;
  state.avgMsPerFrame = event.avgMsPerFrame;
}
export {
  DEFAULT_HISTORY_ROOT,
  DELETED_VERSION,
  START as HISTORY_START,
  HistoryBusyError,
  HistoryClosedError,
  HistoryIdError,
  HistoryRefusedError,
  MAX_OPEN_MEDIA_RANGE_BYTES,
  MAX_UPLOAD_BYTES,
  MAX_WINDOW_IDLE_MS,
  MIME_TYPES,
  PREVIEW_BUNDLE_OPTIONS,
  CACHE_DIR_NAME as PROXY_CACHE_DIR_NAME,
  STUDIO_MANUAL_EDITS_PATH,
  STUDIO_MOTION_PATH,
  STUDIO_SIGNATURE_MANIFEST_PATHS,
  UNDO_MODES,
  affectsPreview,
  affectsProjectSignature,
  applyFileMutations,
  artifactDirectory,
  beginArtifactCapture,
  buildSubCompositionHtml,
  cleanupProxyCache,
  clearElementScreenshotIsolation,
  compositionsAffectedBy,
  consumeFileWriteReceipt,
  createBackgroundRemovalJob,
  createPreviewDocumentStore,
  createProjectSignature,
  createProjectSignatureAsync,
  createStudioApi,
  createStudioManualEditsRenderBodyScript,
  createStudioMotionRenderBodyScript,
  createStudioPositionSeekReapplyScript,
  decodeWellFormedEscapes,
  dedupeClonedCompositionId,
  duplicateElementInHtml,
  fileContentVersion,
  findTargetElement,
  finishSnapshotRun,
  forgetRecordedArtifacts,
  getElementScreenshotClip,
  getMimeType,
  historyCache,
  identifyFileWrite,
  isSafePath,
  isUncopiedMedia,
  listProjectHistories,
  onRestoredInPlace,
  openProjectHistory,
  openRangeEnd,
  parseSourceDocument,
  patchElementInHtml,
  pruneGoneProjectHistories,
  readProjectHistory,
  reclaimUncopiedBlobs,
  recordArtifact,
  recordArtifacts,
  recordRenderSuccess,
  registerRenderOutput,
  removeElementFromHtml,
  requestSubPath,
  retainSnapshotOutput,
  settledFileTag,
  splitElementInHtml,
  stampProjectHfIds,
  stampProjectHfIdsAsync,
  thumbnailDeviceScaleFactor,
  walkDir
};

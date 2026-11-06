// src/assetPaths.ts
import { isAbsolute, relative, resolve } from "path";

// src/utils/urlPath.ts
function decodeWellFormedEscapes(path) {
  return path.replace(/(?:%[0-9A-Fa-f]{2})+/g, (run) => {
    try {
      return decodeURIComponent(run);
    } catch {
      return run;
    }
  });
}
function splitUrlSuffix(urlValue) {
  const queryIdx = urlValue.indexOf("?");
  const hashIdx = urlValue.indexOf("#");
  if (queryIdx < 0 && hashIdx < 0) return { basePath: urlValue, suffix: "" };
  let cutIdx = urlValue.length;
  if (queryIdx >= 0) cutIdx = Math.min(cutIdx, queryIdx);
  if (hashIdx >= 0) cutIdx = Math.min(cutIdx, hashIdx);
  return { basePath: urlValue.slice(0, cutIdx), suffix: urlValue.slice(cutIdx) };
}
function decodedUrlPath(url) {
  return decodeWellFormedEscapes(splitUrlSuffix(url).basePath);
}
function encodeUrlPath(path) {
  return encodeURIComponent(path).replace(/%2F/g, "/").replace(/['()]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
function decodeCssEscapes(text) {
  return text.replaceAll("\0", "\uFFFD").replace(
    /\\(?:([0-9a-f]{1,6})(?:\r\n|[ \t\r\n\f])?|(\r\n|[\n\r\f])|([\s\S]))/gi,
    (_escaped, hex, lineBreak, char) => {
      if (hex === void 0) return lineBreak === void 0 ? char : "";
      const code = Number.parseInt(hex, 16);
      if (code === 0 || code > 1114111 || code >= 55296 && code <= 57343) return "\uFFFD";
      return String.fromCodePoint(code);
    }
  );
}

// src/assetPaths.ts
var CSS_URL_RE = /\burl\(\s*(["']?)([^)"'\s](?:[^)"']*[^)"'\s])?)\1\s*\)/g;
var PATH_ATTRS = ["src", "href"];
var URL_SCHEME_OF_TWO_OR_MORE_CHARS_RE = /^[a-z][a-z0-9+.-]+:/i;
function isNonRelativeUrl(val) {
  return !val || val.startsWith("http://") || val.startsWith("https://") || val.startsWith("//") || val.startsWith("data:") || val.startsWith("#") || val.startsWith("/") || URL_SCHEME_OF_TWO_OR_MORE_CHARS_RE.test(val);
}
var LEADING_PARENT_SEGMENT_RE = /^\.\.(?:[\\/]|$)/;
function isPathInside(childPath, parentPath) {
  const absChild = resolve(childPath);
  const absParent = resolve(parentPath);
  if (absChild === absParent) return true;
  const rel = relative(absParent, absChild);
  return rel !== "" && !LEADING_PARENT_SEGMENT_RE.test(rel) && !isAbsolute(rel);
}

// src/rewriteSubCompPaths.ts
import { posix } from "path";

// src/srcset.ts
function skipSrcsetDescriptors(srcset, position) {
  let inParens = false;
  while (position < srcset.length) {
    const char = srcset.charAt(position++);
    if (char === "(") inParens = true;
    else if (char === ")") inParens = false;
    else if (char === "," && !inParens) break;
  }
  return position;
}
function readSrcsetUrl(srcset, position) {
  while (position < srcset.length && /[ \t\n\r\f,]/.test(srcset.charAt(position))) position++;
  const start = position;
  while (position < srcset.length && !/[ \t\n\r\f]/.test(srcset.charAt(position))) position++;
  let end = position;
  while (end > start && srcset.charAt(end - 1) === ",") end--;
  return { start, end, next: position };
}
function rewriteSrcsetUrls(srcset, rewriteUrl) {
  const parts = [];
  let position = 0;
  let written = 0;
  while (position < srcset.length) {
    const { start, end, next } = readSrcsetUrl(srcset, position);
    position = next;
    if (end > start) {
      const url = srcset.slice(start, end);
      const rewritten = rewriteUrl(url);
      if (rewritten !== url) {
        parts.push(srcset.slice(written, start), rewritten);
        written = end;
      }
    }
    if (end < position) continue;
    position = skipSrcsetDescriptors(srcset, position);
  }
  return parts.length > 0 ? parts.join("") + srcset.slice(written) : srcset;
}

// src/rewriteSubCompPaths.ts
var { join, resolve: resolve2, dirname } = posix;
var isAbsoluteOrSpecial = isNonRelativeUrl;
function needsRewrite(val) {
  return val.startsWith("../") || val === "..";
}
function rewriteAssetPath(compSrcPath, relativePath, assetExists) {
  if (isAbsoluteOrSpecial(relativePath)) return relativePath;
  const compDir = dirname(compSrcPath);
  if (!compDir || compDir === ".") return relativePath;
  const { basePath, suffix } = splitUrlSuffix(relativePath);
  const slashed = basePath.replace(/\\/g, "/");
  if (!slashed || slashed.startsWith("/")) return relativePath;
  const filePath = decodeWellFormedEscapes(slashed);
  const sibling = resolve2("/", join(compDir, filePath)).slice(1);
  if (!needsRewrite(filePath) && (!assetExists || !assetExists(sibling))) return relativePath;
  return encodeUrlPath(sibling) + suffix;
}
function rewriteAssetPaths(elements, compSrcPath, getAttr, setAttr, assetExists) {
  for (const el of elements) {
    for (const attr of PATH_ATTRS) {
      const val = (getAttr(el, attr) || "").trim();
      const rewritten2 = rewriteAssetPath(compSrcPath, val, assetExists);
      if (rewritten2 !== val) {
        setAttr(el, attr, rewritten2);
      }
    }
    const srcset = getAttr(el, "srcset");
    if (!srcset) continue;
    const rewritten = rewriteSrcsetUrls(
      srcset,
      (url) => rewriteAssetPath(compSrcPath, url, assetExists)
    );
    if (rewritten !== srcset) setAttr(el, "srcset", rewritten);
  }
}
function rewriteInlineStyleAssetUrls(elements, compSrcPath, getStyle, setStyle, assetExists) {
  const compDir = dirname(compSrcPath);
  if (!compDir || compDir === ".") return;
  for (const el of elements) {
    const style = getStyle(el);
    if (!style) continue;
    const rewritten = rewriteCssAssetUrls(style, compSrcPath, assetExists);
    if (rewritten !== style) {
      setStyle(el, rewritten);
    }
  }
}
function rewriteCssAssetUrls(cssText, compSrcPath, assetExists) {
  if (!cssText) return cssText;
  return cssText.replace(CSS_URL_RE, (full, quote, rawUrl) => {
    const urlValue = (rawUrl || "").trim();
    const rewritten = rewriteAssetPath(compSrcPath, urlValue, assetExists);
    if (rewritten === urlValue) return full;
    return `url(${quote || ""}${rewritten}${quote || ""})`;
  });
}
export {
  CSS_URL_RE,
  PATH_ATTRS,
  decodeCssEscapes,
  decodeWellFormedEscapes,
  decodedUrlPath,
  encodeUrlPath,
  isNonRelativeUrl,
  isPathInside,
  rewriteAssetPath,
  rewriteAssetPaths,
  rewriteCssAssetUrls,
  rewriteInlineStyleAssetUrls,
  rewriteSrcsetUrls,
  splitUrlSuffix
};

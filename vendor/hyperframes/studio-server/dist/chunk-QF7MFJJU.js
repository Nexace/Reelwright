import {
  STUDIO_MANUAL_EDITS_PATH
} from "./chunk-SVQFE44C.js";
import {
  STUDIO_MOTION_PATH
} from "./chunk-L3HJVTQE.js";

// src/helpers/safePath.ts
import { basename, dirname, isAbsolute, join, relative, sep } from "path";
import { readdirSync } from "fs";
import { realpath, resolveWithinProject as resolveInProject } from "@hyperframes/core/safe-path";
import { RENDER_TEMP_DIR } from "@hyperframes/core/project-folders";
import {
  folderGone,
  isProjectRootMissing,
  isSafePath,
  mkdirWithinProject,
  realpath as realpath2,
  realProjectRoot
} from "@hyperframes/core/safe-path";
function resolveWithinProject(base, relativePath) {
  const resolved = resolveInProject(base, relativePath);
  return resolved && !isPrivateProjectFile(base, resolved) ? resolved : null;
}
function realFilePath(filePath) {
  try {
    return realpath(filePath);
  } catch {
    const dir = dirname(filePath);
    return dir === filePath ? filePath : join(realFilePath(dir), basename(filePath));
  }
}
var STUDIO_FILES = /* @__PURE__ */ new Set([STUDIO_MOTION_PATH, STUDIO_MANUAL_EDITS_PATH]);
var STUDIO_FOLDERS = [".hyperframes/prepared-assets", ".hyperframes/requests"];
function isPrivateProjectPath(relPath) {
  const path = relPath.toLowerCase();
  return (path === ".hyperframes" || path.startsWith(".hyperframes/")) && !STUDIO_FILES.has(path) && !STUDIO_FOLDERS.some((folder) => path === folder || path.startsWith(`${folder}/`));
}
function isPrivateProjectFile(projectDir, filePath) {
  const rel = (from, to) => relative(from, to).split(sep).join("/");
  return [rel(projectDir, filePath), rel(realFilePath(projectDir), realFilePath(filePath))].some(
    isPrivateProjectPath
  );
}
function pinWithinProject(base, relativePath) {
  return pinResolved(base, resolveWithinProject(base, relativePath));
}
function pinProjectRecord(base, relativePath) {
  return pinResolved(base, resolveInProject(base, relativePath));
}
function pinResolved(base, checked) {
  if (!checked) return null;
  const inside = relative(realFilePath(base), realFilePath(checked));
  const escapes = inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside);
  return escapes ? null : join(base, inside);
}
var IGNORE_DIRS = /* @__PURE__ */ new Set([
  ".thumbnails",
  ".transcode-cache",
  ".waveform-cache",
  "node_modules",
  ".git"
]);
function shouldIgnoreDir(rel) {
  return rel === ".hyperframes/backup";
}
function isInHiddenOrVendorDir(relPath) {
  const segments = relPath.split("/");
  return segments.slice(0, -1).some((seg) => seg.startsWith(".") || seg === "node_modules");
}
var UNREADABLE_DIR_CODES = /* @__PURE__ */ new Set(["EACCES", "EPERM", "ENOENT", "ENOTDIR"]);
function walkDir(dir, prefix = "") {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    const code = err.code;
    if (!prefix || !code || !UNREADABLE_DIR_CODES.has(code)) throw err;
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (IGNORE_DIRS.has(entry.name) || RENDER_TEMP_DIR.test(entry.name) || shouldIgnoreDir(rel))
      continue;
    if (entry.isDirectory()) {
      files.push(...walkDir(join(dir, entry.name), rel));
    } else {
      files.push(rel);
    }
  }
  return files;
}

export {
  resolveWithinProject,
  realFilePath,
  isPrivateProjectPath,
  isPrivateProjectFile,
  pinWithinProject,
  pinProjectRecord,
  isInHiddenOrVendorDir,
  walkDir,
  folderGone,
  isProjectRootMissing,
  isSafePath,
  mkdirWithinProject,
  realpath2 as realpath,
  realProjectRoot
};

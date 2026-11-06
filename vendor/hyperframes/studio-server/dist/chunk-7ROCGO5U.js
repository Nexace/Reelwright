import {
  isInHiddenOrVendorDir,
  mkdirWithinProject,
  walkDir
} from "./chunk-QF7MFJJU.js";

// src/helpers/hfIdPersist.ts
import { stampHfIdsInPlace } from "@hyperframes/parsers/hf-ids";
import { createHash } from "crypto";
import { closeSync, constants, fstatSync, openSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { replaceFileAtomically } from "@hyperframes/core/atomic-file";
var isCompositionSource = (html) => /data-composition-id\s*=/.test(html);
var STAMP_RECORD = join(".hyperframes", "hf-ids-stamped.json");
var contentHash = (text) => createHash("sha1").update(text).digest("base64url");
function stampProjectHfIds(projectDir) {
  const pass = stampPass(projectDir);
  while (!pass.next().done) ;
}
async function stampProjectHfIdsAsync(projectDir) {
  const pass = stampPass(projectDir);
  while (!pass.next().done) await new Promise((resolve) => setImmediate(resolve));
}
function* stampPass(projectDir) {
  const recordPath = join(projectDir, STAMP_RECORD);
  const last = readStampRecord(recordPath);
  const next = {};
  for (const file of walkDir(projectDir)) {
    if (!file.endsWith(".html") || isInHiddenOrVendorDir(file)) continue;
    const hash = hashAfterStamp(join(projectDir, file), last[file]);
    if (hash !== null) next[file] = hash;
    yield;
  }
  writeStampRecord(projectDir, recordPath, next);
}
function readStampRecord(recordPath) {
  try {
    return JSON.parse(readFileSync(recordPath, "utf-8"));
  } catch {
    return {};
  }
}
function writeStampRecord(projectDir, recordPath, next) {
  try {
    mkdirWithinProject(projectDir, dirname(recordPath));
    writeFileSync(recordPath, JSON.stringify(next));
  } catch {
  }
}
function hashAfterStamp(absPath, recorded) {
  let html;
  try {
    html = readFileSync(absPath, "utf-8");
  } catch {
    return null;
  }
  const hash = contentHash(html);
  if (recorded === hash || !isCompositionSource(html)) return hash;
  const stamped = stampFileHfIds(absPath);
  return stamped === null ? null : contentHash(stamped);
}
function openNoFollow(filePath, flags) {
  const noFollow = constants.O_NOFOLLOW ?? 0;
  try {
    return openSync(filePath, flags | noFollow);
  } catch {
    return null;
  }
}
function isUnchanged(filePath, expected) {
  const fd = openNoFollow(filePath, constants.O_RDONLY);
  if (fd === null) return false;
  try {
    return readFileSync(fd, "utf-8") === expected;
  } finally {
    closeSync(fd);
  }
}
function stampFileHfIds(filePath) {
  let fd = openNoFollow(filePath, constants.O_RDWR);
  let writable = true;
  if (fd === null) {
    fd = openNoFollow(filePath, constants.O_RDONLY);
    writable = false;
  }
  if (fd === null) return null;
  try {
    if (!fstatSync(fd).isFile()) return null;
    const html = readFileSync(fd, "utf-8");
    const normalized = stampHfIdsInPlace(html);
    const idsBefore = (html.match(/\bdata-hf-id=/g) ?? []).length;
    const idsAfter = (normalized.match(/\bdata-hf-id=/g) ?? []).length;
    if (writable && idsAfter > idsBefore) {
      const mode = fstatSync(fd).mode;
      closeSync(fd);
      fd = null;
      if (isUnchanged(filePath, html)) replaceFileAtomically(filePath, normalized, mode);
    }
    return normalized;
  } catch (err) {
    console.warn("[hyperframes] stampFileHfIds: failed to stamp ids:", err);
    return null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

export {
  isCompositionSource,
  stampProjectHfIds,
  stampProjectHfIdsAsync,
  stampFileHfIds
};

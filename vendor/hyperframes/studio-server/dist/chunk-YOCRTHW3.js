import {
  PROXY_PARAMS_VERSION,
  resolveProxy
} from "./chunk-KPCW4DQM.js";
import {
  createMediaCodecProbeCache,
  proxyVariantFor,
  recordProxyPrewarm,
  scanProjectMedia,
  shouldPrewarmProxy
} from "./chunk-FUTDRYQK.js";

// src/helpers/mediaProxyPreview.ts
import { resolve } from "path";
import { formatPreviewProxyBox } from "@hyperframes/core";
import { insertBeforeCloseTag } from "@hyperframes/core/compiler/html-document";
function isAutoProxyEnabled(adapter) {
  return adapter.autoProxy !== false;
}
function resolvePreviewMediaCodecProbeCache(adapter) {
  return adapter.mediaCodecProbeCache ?? createMediaCodecProbeCache();
}
function proxyEtagSalt(raw, box) {
  if (raw === void 0) return "";
  return `:proxy:${raw}:${PROXY_PARAMS_VERSION}${box ? `:${formatPreviewProxyBox(box)}` : ""}`;
}
async function injectMediaCodecMapIntoHtml(html, projectDir, htmlSources, probeCache, prewarm = true, signal, box) {
  let scan;
  try {
    scan = await scanProjectMedia(projectDir, htmlSources, probeCache ? { cache: probeCache } : {});
  } catch {
    return html;
  }
  const { codecMap: map, sourceFacts } = scan;
  const hasMap = Object.keys(map).length > 0;
  if (!hasMap && Object.keys(sourceFacts).length === 0) return html;
  for (const [rootRelativePathname, facts] of Object.entries(map)) {
    if (!prewarm || !shouldPrewarmProxy(facts)) continue;
    recordProxyPrewarm();
    resolveProxy(
      projectDir,
      resolve(projectDir, rootRelativePathname.replace(/^\/+/, "")),
      proxyVariantFor(facts),
      box,
      { signal }
    ).catch(() => {
    });
  }
  const safeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  const assignments = [
    ...hasMap ? [`window.__HF_MEDIA_CODEC_MAP__=${safeJson(map)};`] : [],
    `window.__HF_MEDIA_SOURCE_FACTS__=${safeJson(sourceFacts)};`
  ];
  const tag = `<script data-hf-media-codec-map>${assignments.join("")}</script>`;
  return insertBeforeCloseTag(html, "head", `${tag}
`) ?? `${tag}
${html}`;
}
async function injectMediaCodecMap(html, adapter, projectDir, compSrcPath, probeCache) {
  if (!isAutoProxyEnabled(adapter)) return html;
  return injectMediaCodecMapIntoHtml(html, projectDir, [{ html, compSrcPath }], probeCache, false);
}

export {
  isAutoProxyEnabled,
  resolvePreviewMediaCodecProbeCache,
  proxyEtagSalt,
  injectMediaCodecMapIntoHtml,
  injectMediaCodecMap
};

import { parseHTML } from "linkedom";
import { HF_AUDIO_FX_ATTR } from "../audioFx.js";
export { isTemplateEntry } from "./htmlDocument.js";
function normalizeCompositionSrcPath(srcPath) {
    return srcPath.replace(/\\/g, "/").replace(/^\.\//, "");
}
// linkedom has no inert <template> content, so the template's innerHTML is re-parsed.
function readSceneRoot(entryHtml) {
    if (!entryHtml)
        return null;
    const { document } = parseHTML(entryHtml);
    const template = document.querySelector("template");
    const scope = template ? parseHTML(template.innerHTML).document : document;
    return scope.querySelector("[data-composition-id]");
}
// The scene's own chain replaces the index's, which belongs to the whole project.
function setSceneFxChain(el, sceneFxChain) {
    if (sceneFxChain) {
        el.setAttribute(HF_AUDIO_FX_ATTR, sceneFxChain);
    }
    else {
        el.removeAttribute(HF_AUDIO_FX_ATTR);
    }
}
function createStandaloneEntryRenderClone(root, host, sceneDuration, sceneFxChain) {
    const hostClone = host.cloneNode(true);
    hostClone.setAttribute("data-start", "0");
    if (root === host) {
        setSceneFxChain(hostClone, sceneFxChain);
        return hostClone;
    }
    const rootClone = root.cloneNode(false);
    // The wrapper takes the scene's length, not the whole project's; with none declared
    // it derives from its single child.
    if (sceneDuration != null) {
        rootClone.setAttribute("data-duration", sceneDuration);
    }
    else {
        rootClone.removeAttribute("data-duration");
    }
    setSceneFxChain(rootClone, sceneFxChain);
    rootClone.appendChild(hostClone);
    return rootClone;
}
// Library scripts (GSAP and the like) may live in <body>; they stay, ahead of the scene that needs them.
function replaceBodyWithRenderClone(body, renderClone) {
    const libraries = Array.from(body.children).filter((child) => child.tagName === "SCRIPT" && child.hasAttribute("src"));
    while (body.firstChild) {
        body.removeChild(body.firstChild);
    }
    for (const library of libraries)
        body.appendChild(library);
    body.appendChild(renderClone);
}
export function extractStandaloneEntryFromIndex(indexHtml, entryFile, entryHtml) {
    const normalizedEntryFile = normalizeCompositionSrcPath(entryFile);
    const { document } = parseHTML(indexHtml);
    const body = document.querySelector("body");
    if (!body)
        return null;
    // linkedom types these lists as any/NodeList, hence the Element[] casts.
    const hosts = Array.from(document.querySelectorAll("[data-composition-src]"));
    const host = hosts.find((candidate) => normalizeCompositionSrcPath(candidate.getAttribute("data-composition-src") || "") ===
        normalizedEntryFile);
    if (!host)
        return null;
    const root = Array.from(body.children).find((candidate) => candidate.hasAttribute("data-composition-id")) ?? null;
    if (!root)
        return null;
    // The scene file owns its duration; the mount's window is the fallback.
    const sceneRoot = readSceneRoot(entryHtml);
    const sceneDuration = sceneRoot?.getAttribute("data-duration") ?? host.getAttribute("data-duration");
    const sceneFxChain = sceneRoot?.getAttribute(HF_AUDIO_FX_ATTR) || null;
    const renderClone = createStandaloneEntryRenderClone(root, host, sceneDuration, sceneFxChain);
    replaceBodyWithRenderClone(body, renderClone);
    return document.toString();
}

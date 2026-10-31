/**
 * Composition assembly decisions — the questions both assembly paths answer.
 *
 * A composition is assembled twice in this repo: `compiler/inlineSubCompositions.ts`
 * assembles it for rendering (Node, linkedom, synchronous, emits strings) and
 * `runtime/compositionLoader.ts` assembles it for mounting (browser, fetch, live
 * DOM, executes scripts). Their I/O is genuinely different; their *decisions* are
 * not. This module owns the decisions:
 *
 * - which nodes are a composition's asset sources, and in what order
 * - which `<head>` elements hoist into the host document
 * - the composition's scope identity (CSS scope, script scope, authored root id)
 * - which nodes carry the composition's declared variable defaults
 * - how nested `data-composition-src` hosts are enumerated
 *
 * It is deliberately DOM-free, filesystem-free and network-free: the runtime is
 * bundled by esbuild into the IIFE published to a CDN, so anything reachable
 * from `runtime/entry.ts` ships to every viewer. It takes narrow structural
 * types instead of `Document`/`Element` for the same reason `compositionScoping.ts`
 * takes strings — so both a linkedom document and a live browser document
 * satisfy it without an `as T` cast at either call site.
 */
const COMPOSITION_ID_ATTR = "data-composition-id";
const COMPOSITION_SRC_ATTR = "data-composition-src";
const COMPOSITION_ROOT_SELECTOR = `[${COMPOSITION_ID_ATTR}]`;
const COMPOSITION_HOST_SELECTOR = `[${COMPOSITION_SRC_ATTR}]`;
const STYLE_SELECTOR = "style";
const SCRIPT_SELECTOR = "script";
/**
 * Links both paths hoist into the host document. Stylesheets carry
 * webfonts a composition's CSS depends on; preconnects are their latency hint.
 */
const HOISTED_LINK_SELECTOR = 'link[rel="stylesheet"], link[rel="preconnect"]';
// The HTML spec's JavaScript MIME type essence matches: a script with any of these types runs as classic.
const JAVASCRIPT_TYPES = new Set([
    "",
    "application/ecmascript",
    "application/javascript",
    "application/x-ecmascript",
    "application/x-javascript",
    "text/ecmascript",
    "text/javascript",
    "text/javascript1.0",
    "text/javascript1.1",
    "text/javascript1.2",
    "text/javascript1.3",
    "text/javascript1.4",
    "text/javascript1.5",
    "text/jscript",
    "text/livescript",
    "text/x-ecmascript",
    "text/x-javascript",
]);
const scriptType = (el) => (el.getAttribute("type") || "").trim().toLowerCase();
export function isJavaScriptType(el) {
    return JAVASCRIPT_TYPES.has(scriptType(el));
}
/**
 * A data block (application/json, text/template, ...) or a classic nomodule script never runs,
 * so it is mounted as authored.
 */
function isExecutableScript(el) {
    const type = scriptType(el);
    if (type === "module" || type === "importmap")
        return true;
    return JAVASCRIPT_TYPES.has(type) && el.getAttribute("nomodule") === null;
}
function inertScripts(node) {
    return toArray(node?.querySelectorAll(SCRIPT_SELECTOR)).filter((el) => !isExecutableScript(el));
}
export function executableScripts(node) {
    return toArray(node?.querySelectorAll(SCRIPT_SELECTOR)).filter(isExecutableScript);
}
/** The styles, scripts and links both paths extract, so the mounted copy must drop them. */
export function extractedCompositionAssets(node) {
    return [
        ...toArray(node.querySelectorAll(`${STYLE_SELECTOR}, ${HOISTED_LINK_SELECTOR}`)),
        ...executableScripts(node),
    ];
}
/**
 * The compiler's nesting cap, enforced against the ancestry chain rather than a
 * counter so a wide tree is not penalised for a deep sibling.
 */
export const MAX_SUB_COMPOSITION_DEPTH = 20;
// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------
function toArray(items) {
    return items ? Array.from(items) : [];
}
/**
 * Answer, for one composition, where its assets come from, in what order, and
 * how it is identified. Pure: it reads attributes and runs selectors, and does
 * not mutate, fetch, or touch a filesystem.
 */
export function planCompositionAssembly(input) {
    const { contentNode, head, documentElement, hasTemplate, compositionId } = input;
    const compositionRoots = toArray(contentNode.querySelectorAll(COMPOSITION_ROOT_SELECTOR));
    const innerRoot = compositionId
        ? (compositionRoots.find((root) => root.getAttribute(COMPOSITION_ID_ATTR) === compositionId) ??
            null)
        : (compositionRoots[0] ?? null);
    // The id declared inside the content, even when the host asked for a
    // different one. `innerRoot` is preferred so an exact match always wins.
    const declaredCompositionId = (innerRoot ?? compositionRoots[0])?.getAttribute(COMPOSITION_ID_ATTR)?.trim() || "";
    // A templated composition's <head> belongs to its host page, not to it.
    const assetHead = hasTemplate ? null : (head ?? null);
    const mountedInert = innerRoot ? inertScripts(innerRoot) : [];
    return {
        innerRoot,
        authoredCompositionId: compositionId || declaredCompositionId || null,
        scriptCompositionId: declaredCompositionId || compositionId || null,
        authoredRootId: innerRoot?.getAttribute("id")?.trim() || null,
        styleSources: [
            ...toArray(assetHead?.querySelectorAll(STYLE_SELECTOR)),
            ...toArray(contentNode.querySelectorAll(STYLE_SELECTOR)),
        ],
        scriptSources: [...executableScripts(assetHead), ...executableScripts(contentNode)],
        linkSources: [
            ...toArray(head?.querySelectorAll(HOISTED_LINK_SELECTOR)),
            ...toArray(contentNode.querySelectorAll(HOISTED_LINK_SELECTOR)),
        ],
        inertScriptsOutsideRoot: [
            ...inertScripts(assetHead),
            ...(innerRoot ? inertScripts(contentNode).filter((el) => !mountedInert.includes(el)) : []),
        ],
        variableDefaultCarriers: [documentElement, innerRoot].filter((carrier) => carrier != null),
    };
}
/**
 * Enumerate the sub-composition hosts nested inside a composition that has just
 * been assembled, refusing the two shapes that do not terminate.
 *
 * `ancestry` is the chain down to and including the assembled composition's own
 * `src`, so a top-level host is enumerated with `[itsOwnSrc]`.
 */
export function enumerateNestedCompositionHosts(assembledHost, ancestry) {
    const hosts = [];
    const skipped = [];
    for (const nestedHost of assembledHost.querySelectorAll(COMPOSITION_HOST_SELECTOR)) {
        const src = nestedHost.getAttribute(COMPOSITION_SRC_ATTR);
        if (!src)
            continue;
        if (ancestry.includes(src)) {
            skipped.push({ src, reason: "circular composition reference" });
            continue;
        }
        if (ancestry.length >= MAX_SUB_COMPOSITION_DEPTH) {
            skipped.push({ src, reason: "nesting depth exceeded" });
            continue;
        }
        hosts.push({ host: nestedHost, src });
    }
    return { hosts, skipped };
}
/** A mount sharing the page root's id counts as a repeat, so it is numbered instead of taking the root's timeline. */
export function countPageRoot(counts, hosts) {
    const root = hosts[0]?.ownerDocument.querySelector("[data-composition-id]");
    const rootId = root && !hosts.includes(root) ? root.getAttribute("data-composition-id") : null;
    const mounts = rootId ? counts.get(rootId) : undefined;
    if (rootId && mounts)
        counts.set(rootId, mounts + 1);
}

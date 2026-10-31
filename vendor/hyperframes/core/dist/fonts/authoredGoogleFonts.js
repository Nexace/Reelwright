import { parseHTML } from "linkedom";
import postcss from "postcss";
function screenStylesheet(media) {
    return !media?.trim() || media.split(",").some((query) => /^(all|screen)$/i.test(query.trim()));
}
function googleStylesheetFamilies(urlText) {
    let parsed;
    try {
        parsed = new URL(urlText);
    }
    catch {
        return [];
    }
    if (parsed.protocol !== "https:" || parsed.hostname !== "fonts.googleapis.com")
        return [];
    return parsed.searchParams
        .getAll("family")
        .flatMap((family) => family.split("|"))
        .map((family) => family.split(":")[0]?.trim().toLowerCase() ?? "")
        .filter(Boolean);
}
function importUrls(css) {
    if (!/@import/i.test(css))
        return [];
    let root;
    try {
        root = postcss.parse(css);
    }
    catch {
        return [];
    }
    const urls = [];
    for (const node of root.nodes) {
        if (node.type !== "atrule" || node.name.toLowerCase() !== "import")
            continue;
        const url = unconditionalImportUrl(node.params);
        if (url)
            urls.push(url);
    }
    return urls;
}
function unconditionalImportUrl(params) {
    const match = /^(?:url\(\s*['"]?([^'")\s]+)['"]?\s*\)|['"]([^'"]+)['"])\s*(.*)$/i.exec(params);
    if (!match || !screenStylesheet(match[3] ?? null))
        return undefined;
    return match[1] ?? match[2];
}
function activeStylesheet(element) {
    if (element.hasAttribute("disabled") || !screenStylesheet(element.getAttribute("media")))
        return false;
    const type = element.getAttribute("type")?.trim().toLowerCase();
    return !type || type === "text/css";
}
function stylesheetUrls(element) {
    if (!activeStylesheet(element))
        return [];
    if (element.localName !== "link")
        return importUrls(element.textContent ?? "");
    const rel = (element.getAttribute("rel") ?? "").toLowerCase().split(/\s+/);
    if (!rel.includes("stylesheet") || rel.includes("alternate"))
        return [];
    const href = element.getAttribute("href");
    return href ? [href] : [];
}
export function authoredGoogleFontStylesheets(html) {
    const byFamily = new Map();
    const { document } = parseHTML(html);
    for (const element of document.querySelectorAll("link, style")) {
        for (const url of stylesheetUrls(element)) {
            for (const family of googleStylesheetFamilies(url)) {
                const previous = byFamily.get(family) ?? [];
                byFamily.set(family, [...previous.filter((existing) => existing !== url), url]);
            }
        }
    }
    return byFamily;
}
export function withPageText(url, fontText) {
    const parsed = new URL(url);
    if (!fontText || parsed.searchParams.has("text"))
        return url;
    const withoutFragment = url.split("#")[0] ?? url;
    const joiner = parsed.search ? "&" : "?";
    return `${withoutFragment}${joiner}text=${encodeURIComponent(fontText)}${parsed.hash}`;
}

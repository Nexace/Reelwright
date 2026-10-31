/** In-page, before any script: holds replaced videos at preload none from parse (Chrome ignores a later none). */
export function holdRenderFrameVideos(ids, renderIdAttr) {
    const held = new Set(ids);
    window.__HF_RENDER_FRAME_VIDEO_IDS = ids;
    const hold = (el) => {
        if (el instanceof HTMLVideoElement && held.has(el.getAttribute(renderIdAttr) || el.id))
            el.preload = "none";
    };
    new MutationObserver((records) => {
        for (const record of records)
            for (const node of record.addedNodes) {
                if (node.nodeType !== 1)
                    continue;
                hold(node);
                for (const video of node.querySelectorAll("video"))
                    hold(video);
            }
    }).observe(document, { childList: true, subtree: true });
}

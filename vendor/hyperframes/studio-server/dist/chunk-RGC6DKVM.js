// src/helpers/screenshotClip.ts
function getElementScreenshotClip(selector, selectorIndex) {
  let matches;
  try {
    matches = Array.from(document.querySelectorAll(selector)).filter(
      (el2) => el2 instanceof HTMLElement
    );
  } catch {
    return void 0;
  }
  const safeIndex = Math.max(0, Math.min(matches.length - 1, Math.floor(selectorIndex ?? 0)));
  const el = matches[safeIndex] ?? null;
  if (!(el instanceof HTMLElement)) return void 0;
  const page = window;
  const faded = page.__hfThumbnailFaded ??= [];
  for (let node = el; node.parentElement; node = node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      const style = sibling.style;
      if (sibling === node || !style) continue;
      faded.push([style, style.getPropertyValue("opacity"), style.getPropertyPriority("opacity")]);
      style.setProperty("opacity", "0", "important");
    }
  }
  const rect = el.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return void 0;
  const pad = 8;
  const x = Math.max(0, rect.left - pad);
  const y = Math.max(0, rect.top - pad);
  const maxWidth = window.innerWidth - x;
  const maxHeight = window.innerHeight - y;
  return {
    x,
    y,
    width: Math.max(1, Math.min(rect.width + pad * 2, maxWidth)),
    height: Math.max(1, Math.min(rect.height + pad * 2, maxHeight))
  };
}
function clearElementScreenshotIsolation() {
  const page = window;
  for (const [style, value, priority] of (page.__hfThumbnailFaded ?? []).reverse()) {
    if (value) style.setProperty("opacity", value, priority);
    else style.removeProperty("opacity");
  }
  page.__hfThumbnailFaded = [];
}

export {
  getElementScreenshotClip,
  clearElementScreenshotIsolation
};

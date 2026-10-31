/**
 * Resolve the composition-variable values an element should see: the scoped
 * per-instance table for inlined sub-compositions, then the top-level merged
 * getVariables(), then the raw render-injection global. Shared by every
 * runtime consumer of variables (color grading, declarative bindings) so the
 * scope chain can never diverge between channels.
 */
/** The per-instance values of the inlined sub-composition an element belongs to, if any. */
export function scopedVariablesFor(element) {
    const scope = element.closest("[data-composition-id]");
    const compositionId = scope?.getAttribute("data-composition-id")?.trim() ?? "";
    return compositionId
        ? window.__hfVariablesByComp?.[compositionId]
        : undefined;
}
export function readVariablesForElement(element) {
    const win = window;
    const scoped = scopedVariablesFor(element);
    if (scoped)
        return scoped;
    const fromHelper = win.__hyperframes?.getVariables?.();
    if (fromHelper && typeof fromHelper === "object") {
        return fromHelper;
    }
    return win.__hfVariables ?? {};
}

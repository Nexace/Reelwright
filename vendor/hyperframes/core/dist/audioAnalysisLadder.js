/**
 * The provider ladder for audio analysis. Each capability lists providers best first; a call takes the first one
 * that is available within the requested quality and answers, falling through on failure. The result says which
 * provider answered and why the ones above it did not.
 */
/** The default order per capability: every registered provider that offers it, in registration order. */
export function defaultLadder(capability, providers) {
    return providers.filter((p) => p.capabilities.includes(capability)).map((p) => p.id);
}
/** Why a provider may not be used at this quality, or null when it may. */
export function exclusion(provider, quality) {
    if (quality === "fast" && !provider.signal)
        return "quality fast allows signal processing only";
    if (quality === "local" && !provider.local)
        return "quality local keeps audio on this machine";
    return null;
}
const message = (error) => (error instanceof Error ? error.message : String(error));
async function availabilityOf(provider) {
    try {
        return provider.available ? await provider.available() : { ok: true };
    }
    catch (error) {
        return { ok: false, reason: message(error) };
    }
}
/** Why a provider cannot take this step, or null when it can. */
async function blocked(id, candidate, capability, quality) {
    if (!candidate?.capabilities.includes(capability))
        return { provider: id, outcome: "unavailable", reason: `no provider ${id} for ${capability}` };
    const excluded = exclusion(candidate, quality);
    if (excluded)
        return { provider: id, outcome: "excluded", reason: excluded };
    const availability = await availabilityOf(candidate);
    if (!availability.ok)
        return { provider: id, outcome: "unavailable", reason: availability.reason };
    return null;
}
/** One line naming the providers above `answered` that could not answer, and why; null when none was passed over. */
function passedOver(capability, steps, answered) {
    const skipped = steps.filter((s) => s.outcome === "unavailable" || s.outcome === "failed");
    if (!skipped.length)
        return null;
    const why = skipped
        .map((s) => `${s.provider} ${s.outcome}${s.reason ? ` (${s.reason})` : ""}`)
        .join("; ");
    return answered ? `${capability}: used ${answered}; ${why}` : `${capability}: ${why}`;
}
export async function runLadder(capability, input, providers, { quality = "best", ladder, provider, options = {} } = {}) {
    const byId = new Map(providers.map((p) => [p.id, p]));
    const order = provider ? [provider] : (ladder ?? defaultLadder(capability, providers));
    const steps = [];
    for (const id of order) {
        const candidate = byId.get(id);
        const skip = await blocked(id, candidate, capability, quality);
        if (skip) {
            steps.push(skip);
            continue;
        }
        try {
            const value = (await candidate.analyze(capability, input, options));
            const warning = passedOver(capability, steps, id);
            steps.push({ provider: id, outcome: "answered" });
            return { value, provenance: id, steps, warnings: warning ? [warning] : [] };
        }
        catch (error) {
            steps.push({ provider: id, outcome: "failed", reason: message(error) });
        }
    }
    const none = order.length ? "" : " (none offers it)";
    const why = passedOver(capability, steps, null)?.slice(capability.length + 2);
    return {
        value: null,
        provenance: null,
        steps,
        warnings: [`${capability}: no provider answered${none}${why ? `; ${why}` : ""}`],
    };
}

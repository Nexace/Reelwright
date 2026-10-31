function maxDefined(a, b) {
    if (a === undefined)
        return b;
    if (b === undefined)
        return a;
    return Math.max(a, b);
}
/** Pure merge of one sample into the running stats. Empty `rss` → unchanged. */
export function mergeSample(prev, pids, rss) {
    if (rss.length === 0)
        return prev;
    const byPid = new Map(rss.map((s) => [s.pid, s.rssMb]));
    const browserMb = pids.browser === undefined ? undefined : byPid.get(pids.browser);
    const rendererMbs = pids.renderers
        .map((p) => byPid.get(p))
        .filter((v) => v !== undefined);
    const gpuMbs = pids.gpu.map((p) => byPid.get(p)).filter((v) => v !== undefined);
    const rendererMax = rendererMbs.length > 0 ? Math.max(...rendererMbs) : undefined;
    const total = rss.reduce((sum, s) => sum + s.rssMb, 0);
    return {
        browserRssPeakMb: maxDefined(prev.browserRssPeakMb, browserMb),
        rendererRssPeakMb: maxDefined(prev.rendererRssPeakMb, rendererMax),
        rssLastMb: total,
        gpuProcessSeenLastSample: gpuMbs.length > 0,
        samples: prev.samples + 1,
    };
}
export function createChromeMemorySampler(deps) {
    const setIntervalFn = deps.setIntervalFn ?? setInterval;
    const clearIntervalFn = deps.clearIntervalFn ?? clearInterval;
    let stats = { samples: 0 };
    let timer = null;
    let inFlight = null;
    const runSample = async () => {
        try {
            const pids = await deps.getPids();
            const all = [pids.browser, ...pids.renderers, ...pids.gpu].filter((p) => typeof p === "number");
            const rss = await deps.sampleRss(all);
            const next = mergeSample(stats, pids, rss);
            if (next !== stats) {
                stats = next;
                deps.onSample?.(stats);
            }
        }
        catch {
            // Sampling is observability only; a CDP or ps failure must never reach
            // the capture loop. The next tick retries.
        }
    };
    const sampleOnce = () => {
        // Reentrancy guard: an interval tick that lands while a sample is still
        // running joins it rather than stacking a second CDP/ps round-trip, and a
        // close-time call waits for the running tick instead of skipping it.
        // runSample never rejects, so the .finally reset always runs; it runs on
        // a microtask, after the assignment below.
        if (inFlight !== null)
            return inFlight;
        inFlight = runSample().finally(() => {
            inFlight = null;
        });
        return inFlight;
    };
    return {
        start() {
            if (timer !== null)
                return;
            // Node's Timeout has unref(); the engine already relies on it
            // (utils/processTracker.ts). Keeps the interval from holding the
            // process open if a caller forgets stop().
            timer = setIntervalFn(() => {
                void sampleOnce();
            }, deps.intervalMs);
            timer.unref();
        },
        stop() {
            if (timer === null)
                return;
            clearIntervalFn(timer);
            timer = null;
        },
        stats: () => stats,
        sampleOnce,
    };
}

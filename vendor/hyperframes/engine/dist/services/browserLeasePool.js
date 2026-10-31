function freezeFingerprint(fingerprint) {
    return Object.freeze({
        ...fingerprint,
        args: Object.freeze([...fingerprint.args]),
    });
}
function fingerprintKey(fingerprint) {
    return JSON.stringify([
        fingerprint.args,
        fingerprint.executablePath ?? null,
        fingerprint.withoutWaylandDisplay === true,
        fingerprint.browserTimeoutMs,
        fingerprint.protocolTimeoutMs,
        fingerprint.requestedCaptureMode,
    ]);
}
/** Owns pooled browser generations and hands callers exactly-once leases. */
export class BrowserLeasePool {
    options;
    /** Under the CLI's 3s exit watchdog, alongside the render-wait bound it races. */
    static DRAIN_FORCE_CLOSE_MS = 1_000;
    available = new Map();
    entries = new Set();
    leasesByBrowser = new Map();
    drainPromise = null;
    closed = false;
    constructor(options) {
        this.options = options;
    }
    async acquire(fingerprintInput, pooled) {
        if (this.closed)
            throw new Error("Browser pool is closed; no new browsers can be acquired");
        if (this.drainPromise)
            await this.drainPromise;
        // Re-check: close() can land while this call was awaiting an unrelated,
        // already-resolving drain -- drainPromise resets to null on completion,
        // so only `closed` (permanent) still catches a request that raced it.
        if (this.closed)
            throw new Error("Browser pool is closed; no new browsers can be acquired");
        const fingerprint = freezeFingerprint(fingerprintInput);
        const entry = this.reserveEntry(fingerprint, pooled);
        return this.issueLease(entry);
    }
    async issueLease(entry) {
        try {
            const result = await entry.launchPromise;
            if (entry.state !== "ready") {
                throw new Error("Browser pool drained during acquisition");
            }
            return this.createLease(entry, result);
        }
        catch (error) {
            entry.refCount = Math.max(0, entry.refCount - 1);
            throw error;
        }
    }
    reserveEntry(fingerprint, pooled) {
        const key = fingerprintKey(fingerprint);
        let entry = pooled ? this.available.get(key) : undefined;
        if (entry?.state === "ready" && !entry.result?.browser.connected) {
            this.requestClose(entry, true);
            entry = undefined;
        }
        if (!entry || entry.state === "closing")
            return this.createEntry(key, fingerprint, pooled);
        entry.refCount += 1;
        return entry;
    }
    /** Preserve legacy release-by-handle only when ownership is unambiguous. */
    async releaseByBrowser(browser) {
        const leases = this.leasesByBrowser.get(browser);
        if (leases?.size === 1) {
            const lease = leases.values().next().value;
            await lease.release();
            return;
        }
        if (leases) {
            throw new Error(`Cannot release a pooled browser by handle while ${leases.size} leases are active; release the owning BrowserLease instead`);
        }
        await this.options.close(browser).catch(() => { });
    }
    /** Preserve the legacy ambiguous-handle no-op without closing another owner's browser. */
    forceReleaseByBrowser(browser) {
        const leases = this.leasesByBrowser.get(browser);
        if (leases?.size === 1) {
            const lease = leases.values().next().value;
            lease.forceRelease();
            return;
        }
        if (leases)
            return;
        this.options.forceClose(browser);
    }
    drain() {
        if (this.drainPromise)
            return this.drainPromise;
        const entries = [...this.entries];
        for (const entry of entries)
            this.requestClose(entry, false);
        const settle = Promise.all(entries.map((entry) => entry.closePromise));
        const bound = new Promise((resolve) => setTimeout(resolve, BrowserLeasePool.DRAIN_FORCE_CLOSE_MS).unref());
        this.drainPromise = Promise.race([settle, bound])
            .then(() => {
            // A close() past the bound gets escalated instead of left to block
            // the caller's own shutdown deadline indefinitely.
            for (const entry of entries)
                if (this.entries.has(entry))
                    this.requestClose(entry, true);
            return settle;
        })
            .then(() => {
            this.drainPromise = null;
        });
        return this.drainPromise;
    }
    /** Terminal: drains every entry and refuses every `acquire()` after. */
    close() {
        this.closed = true;
        return this.drain();
    }
    /** Test-only state reset. Call `drain()` first when entries own real browsers. */
    reset() {
        this.available.clear();
        this.entries.clear();
        this.leasesByBrowser.clear();
        this.drainPromise = null;
        this.closed = false;
    }
    createEntry(key, fingerprint, pooled) {
        const entry = {
            key,
            fingerprint,
            pooled,
            state: "launching",
            refCount: 1,
            closeRequested: false,
            forceCloseRequested: false,
            launchPromise: undefined,
        };
        entry.launchPromise = this.options.launch(fingerprint).then((result) => {
            entry.result = result;
            if (entry.closeRequested) {
                entry.state = "closing";
            }
            else {
                entry.state = "ready";
            }
            return result;
        }, (error) => {
            if (this.available.get(key) === entry)
                this.available.delete(key);
            this.entries.delete(entry);
            throw error;
        });
        this.entries.add(entry);
        if (pooled)
            this.available.set(key, entry);
        return entry;
    }
    createLease(entry, result) {
        let active = true;
        let lease;
        const deactivate = (force) => {
            if (!active)
                return false;
            active = false;
            this.removeLease(result.browser, lease);
            entry.refCount = Math.max(0, entry.refCount - 1);
            if (entry.refCount === 0)
                this.requestClose(entry, force);
            return true;
        };
        lease = {
            ...result,
            fingerprint: entry.fingerprint,
            release: async () => {
                if (!deactivate(false))
                    return;
                await entry.closePromise;
            },
            forceRelease: () => {
                if (!deactivate(true) && entry.refCount === 0 && entry.closePromise) {
                    this.requestClose(entry, true);
                }
            },
        };
        const leases = this.leasesByBrowser.get(result.browser) ?? new Set();
        leases.add(lease);
        this.leasesByBrowser.set(result.browser, leases);
        return lease;
    }
    requestClose(entry, force) {
        if (force) {
            entry.forceCloseRequested = true;
            entry.forceClose?.();
        }
        if (entry.closePromise)
            return;
        entry.closeRequested = true;
        if (this.available.get(entry.key) === entry)
            this.available.delete(entry.key);
        entry.closePromise = entry.launchPromise
            .then(async (result) => {
            entry.state = "closing";
            if (entry.forceCloseRequested) {
                this.options.forceClose(result.browser);
            }
            else {
                await Promise.race([
                    this.options.close(result.browser).catch(() => { }),
                    new Promise((resolve) => {
                        entry.forceClose = () => {
                            entry.forceClose = undefined;
                            this.options.forceClose(result.browser);
                            resolve();
                        };
                    }),
                ]);
            }
        })
            .catch(() => { })
            .finally(() => {
            entry.forceClose = undefined;
            this.entries.delete(entry);
            if (entry.result)
                this.leasesByBrowser.delete(entry.result.browser);
        });
    }
    removeLease(browser, lease) {
        const leases = this.leasesByBrowser.get(browser);
        if (!leases)
            return;
        leases.delete(lease);
        if (leases.size === 0)
            this.leasesByBrowser.delete(browser);
    }
}

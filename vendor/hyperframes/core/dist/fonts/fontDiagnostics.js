export class FontDiagCollector {
    families = [];
    current;
    beginFamily(required) {
        this.current = { required, resolved: false, attempts: [] };
        this.families.push(this.current);
    }
    endFamily(resolved) {
        if (this.current)
            this.current.resolved = resolved;
        this.current = undefined;
    }
    startAttempt(path, urlSource, textParam) {
        const attempt = {
            path,
            urlSource,
            textParam,
            cssCache: "fresh",
            cssStatus: null,
            blocksTotal: 0,
            regexMatches: 0,
            assets: { total: 0, diskCacheHit: 0, fetchedOk: 0, nonOk: {} },
        };
        this.current?.attempts.push(attempt);
        return attempt;
    }
    snapshot() {
        return { families: this.families };
    }
}

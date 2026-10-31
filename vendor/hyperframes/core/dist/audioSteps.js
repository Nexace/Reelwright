export function finish(steps) {
    for (;;) {
        const next = steps.next();
        if (next.done)
            return next.value;
    }
}

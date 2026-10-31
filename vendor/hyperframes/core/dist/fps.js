export function toFps(input) {
    if (typeof input === "number") {
        return { num: input, den: 1 };
    }
    return input;
}
export function fpsToNumber(fps) {
    return fps.num / fps.den;
}
export function fpsToFfmpegArg(fps) {
    return fps.den === 1 ? String(fps.num) : `${fps.num}/${fps.den}`;
}
const fail = (reason) => ({ ok: false, reason });
function rangedFps(num, den) {
    if (num <= 0)
        return fail("non-positive");
    const decimal = num / den;
    if (decimal < 1 || decimal > 240)
        return fail("out-of-range");
    return { ok: true, value: { num, den } };
}
function numericFps(input) {
    if (!Number.isFinite(input))
        return fail("not-a-number");
    if (!Number.isInteger(input))
        return fail("ambiguous-decimal");
    return rangedFps(input, 1);
}
function fractionFps(raw) {
    const parts = raw.split("/");
    if (parts.length !== 2)
        return fail("invalid-fraction");
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (!Number.isFinite(num) || !Number.isFinite(den))
        return fail("not-a-number");
    if (!Number.isInteger(num) || !Number.isInteger(den) || den <= 0)
        return fail("invalid-fraction");
    return rangedFps(num, den);
}
// Decimals like "29.97" are rejected: FFmpeg reads them as a different rate than 30000/1001.
export function parseFps(input) {
    if (typeof input === "number")
        return numericFps(input);
    const raw = input.trim();
    if (raw === "")
        return fail("empty");
    if (raw.includes("/"))
        return fractionFps(raw);
    if (/^-?\d+$/.test(raw))
        return rangedFps(Number(raw), 1);
    return fail(/^-?\d*\.\d+$/.test(raw) ? "ambiguous-decimal" : "not-a-number");
}
export function parseFpsWithDefault(input) {
    if (input === undefined || input === "")
        return { ok: true, value: { num: 30, den: 1 } };
    return parseFps(input);
}

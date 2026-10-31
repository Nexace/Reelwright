/** Shared RIFF chunk traversal and WAV format-tag resolution. */
/**
 * Every chunk after the 12-byte RIFF header, in the order they sit.
 *
 * Advances by each chunk's declared size, so ordering is not assumed — `data`
 * may precede `fmt `, and trailing LIST/fact chunks are walked past rather than
 * tripped over. Chunks are word-aligned, so an odd size carries a pad byte.
 */
export function* riffChunks(buffer) {
    let offset = 12;
    while (offset + 8 <= buffer.length) {
        const id = buffer.toString("ascii", offset, offset + 4);
        const size = buffer.readUInt32LE(offset + 4);
        yield { id, body: offset + 8, size };
        offset += 8 + size + (size % 2);
    }
}
const EXTENSIBLE_FORMATS = new Map([
    ["0100000000001000800000aa00389b71", 1],
    ["0300000000001000800000aa00389b71", 3],
]);
/** Resolve WAVE_FORMAT_EXTENSIBLE only for the full PCM and IEEE-float GUIDs. */
function extensibleFormatTag(fmt) {
    const extraSize = fmt.readUInt16LE(16);
    if (extraSize < 22 || 18 + extraSize > fmt.length)
        return null;
    return EXTENSIBLE_FORMATS.get(fmt.toString("hex", 24, 40)) ?? null;
}
/** Canonical codec tag, or null for a truncated or unsupported extensible header. */
export function wavFormatTag(buffer, body, size) {
    const fmt = buffer.subarray(body, body + size);
    if (fmt.length < 16)
        return null;
    const tag = fmt.readUInt16LE(0);
    if (tag !== 0xfffe)
        return tag;
    return fmt.length < 40 ? null : extensibleFormatTag(fmt);
}

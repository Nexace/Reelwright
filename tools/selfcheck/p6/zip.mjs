// A .lottie (dotLottie v2: a/ t/ s/) archive builder for the P6 self-checks: a plain zip (deflate), a/<id>.json + manifest.json
// (+ t/<id>.json themes). Test fixture only; the reader is in tools/commands/add-lottie.mjs.
import zlib from "node:zlib";

export function zip(files) {   // { "path": Buffer|string } → Buffer
  const parts = [], central = []; let off = 0;
  for (const [name, c] of Object.entries(files)) {
    const raw = Buffer.from(c), def = zlib.deflateRawSync(raw), nm = Buffer.from(name), crc = zlib.crc32(raw);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(def.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(nm.length, 26);
    const d = Buffer.alloc(46); d.writeUInt32LE(0x02014b50, 0); d.writeUInt16LE(20, 4); d.writeUInt16LE(20, 6); d.writeUInt16LE(0x0800, 8); d.writeUInt16LE(8, 10);
    d.writeUInt32LE(crc, 16); d.writeUInt32LE(def.length, 20); d.writeUInt32LE(raw.length, 24); d.writeUInt16LE(nm.length, 28); d.writeUInt32LE(off, 42);
    parts.push(h, nm, def); central.push(d, nm); off += 30 + nm.length + def.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 8); end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, end]);
}

export function dotLottie(animations, { themes = {}, states = {} } = {}) {   // { id: lottieJson } → .lottie Buffer
  const files = { "manifest.json": JSON.stringify({ version: "2", generator: "reelwright p6 self-check", animations: Object.keys(animations).map((id) => ({ id, loop: false, ...(Object.keys(themes).length ? { themes: Object.keys(themes) } : {}) })),
    ...(Object.keys(themes).length ? { themes: Object.keys(themes).map((id) => ({ id })) } : {}),
    ...(Object.keys(states).length ? { states: Object.keys(states) } : {}) }) };
  for (const [id, j] of Object.entries(animations)) files[`a/${id}.json`] = JSON.stringify(j);
  for (const [id, j] of Object.entries(themes)) files[`t/${id}.json`] = JSON.stringify(j);
  for (const [id, j] of Object.entries(states)) files[`s/${id}.json`] = JSON.stringify(j);
  return zip(files);
}

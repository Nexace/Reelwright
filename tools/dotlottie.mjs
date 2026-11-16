// dotLottie (.lottie) support, no dependency: a .lottie is a zip of a manifest, animations (a/<id>.json in v2, animations/<id>.json in v1) and
// images (i/ or images/). readDotLottie turns one into plain Lottie JSON with its images inlined as data URIs, which KIT.lottie (tools/runtimes.js)
// plays like any other. `reelwright add-lottie <file.lottie> --inline` writes that JSON next to the film; themes and state machines are ignored.
// The one zip reader of the dotLottie path: `add-lottie` (both modes) and the self-checks use readZip.
//   readDotLottie(buf, { animation }) → { json, manifest, animations: [ids] }     animation = an id (default: the first in the manifest)
//   readZip(buf) → Map name → Buffer      stored and deflated entries; refuses encrypted entries, zip64 and paths that leave the folder
//   writeZip([[name, Buffer], ...], { deflate }) → Buffer      for tests and tools
import zlib from "node:zlib";

const T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

// minimal zip reader: central directory, stored (0) and deflate (8) entries; rejects zip64, encryption and unsafe paths
export function readZip(buf) {
  let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("not a zip file (no end-of-directory record)");
  const n = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  const out = new Map();
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("corrupt zip central directory");
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), size = buf.readUInt32LE(p + 24);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nl);
    p += 46 + nl + xl + cl;
    if (name.endsWith("/")) continue;
    if (flags & 1) throw new Error(`${name}: encrypted entries are not supported`);
    if (csize === 0xffffffff || size === 0xffffffff) throw new Error("zip64 is not supported");
    if (/^([\\/]|[A-Za-z]:)|(^|[\\/])\.\.([\\/]|$)/.test(name)) throw new Error(`unsafe path in archive: ${name}`);
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), raw = buf.subarray(start, start + csize);
    let data;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = zlib.inflateRawSync(raw);
    else throw new Error(`${name}: compression method ${method} is not supported`);
    if (data.length !== size) throw new Error(`${name}: size mismatch`);
    out.set(name, data);
  }
  return out;
}

export function writeZip(entries, { deflate = true } = {}) {
  const locals = [], central = []; let off = 0;
  for (const [name, data] of entries) {
    const nm = Buffer.from(name), comp = deflate ? zlib.deflateRawSync(data) : data, m = deflate ? 8 : 0, crc = crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(m, 8); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nm.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(m, 10); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, nm, comp); central.push(ch, nm); off += 30 + nm.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}

const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", svg: "image/svg+xml" };
export function readDotLottie(buf, { animation } = {}) {
  const z = readZip(buf), mf = z.get("manifest.json");
  if (!mf) throw new Error("manifest.json is missing: not a dotLottie file");
  const manifest = JSON.parse(mf.toString("utf8"));
  const ids = (manifest.animations || []).map((a) => a.id);
  const id = animation ?? ids[0];
  if (!id || !ids.includes(id)) throw new Error(`animation "${animation}" is not in this file (it has: ${ids.join(", ") || "none"})`);
  const f = z.get(`a/${id}.json`) || z.get(`animations/${id}.json`);
  if (!f) throw new Error(`the animation file for "${id}" is missing`);
  const json = JSON.parse(f.toString("utf8"));
  for (const a of json.assets || []) {
    if (!a.p || a.e === 1 || /^data:/.test(a.p)) continue;
    const name = String(a.p).replace(/^.*\//, ""), img = z.get(`i/${name}`) || z.get(`images/${name}`);
    if (!img) throw new Error(`image ${name} is missing from the file`);
    a.p = `data:${MIME[name.split(".").pop().toLowerCase()] || "application/octet-stream"};base64,${img.toString("base64")}`; a.u = ""; a.e = 1;
  }
  return { json, manifest, animations: ids };
}

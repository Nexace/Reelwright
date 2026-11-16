// Shared fixture for the rive self-check (a library: running it does nothing). riv() writes a tiny .riv file by hand, so the repo ships
// a Rive sample it made itself (MIT, like the rest of Reelwright; no third-party artwork). One 400x225 artboard "Main" with a blue
// rounded-less square (a Shape with a Rectangle and a solid Fill), two linear animations ("slide": x 60 -> 300 over 2 s at 30 fps;
// "spin": a 360 degree turn in 1 s, looping) and a state machine "Machine" with a trigger input "go": it rests on "left" (the
// square at x = 60) and moves to "right" (x = 300) when "go" fires. Format: https://rive.app/docs (Rive binary format): header,
// property table of contents (empty: every key here is one the runtime knows), then objects (type key, then key/value pairs, 0).
const vu = (n) => { const b = []; do { let c = n & 0x7f; n >>>= 7; if (n) c |= 0x80; b.push(c); } while (n); return b; };
const f32 = (n) => { const b = Buffer.alloc(4); b.writeFloatLE(n); return [...b]; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0); return [...b]; };
const str = (s) => { const b = Buffer.from(s, "utf8"); return [...vu(b.length), ...b]; };
const KIND = { u: vu, f: f32, c: u32, s: str };   // uint (and bool as 0/1), float, color (ARGB), string
// obj(type, [key, kind, value]...) -> bytes
const obj = (type, ...props) => [...vu(type), ...props.flatMap(([k, kind, v]) => [...vu(k), ...KIND[kind](v)]), 0];

export function riv({ color = 0xff3366cc } = {}) {
  const key = (frame, value) => obj(30, [67, "u", frame], [68, "u", 1], [70, "f", value]);   // KeyFrameDouble, linear
  const anim = (name, fps, dur, loop, ...keyed) => [...obj(31, [55, "s", name], [56, "u", fps], [57, "u", dur], [59, "u", loop]), ...keyed.flat()];
  const prop = (objectId, propertyKey, ...frames) => [...obj(25, [51, "u", objectId]), ...obj(26, [53, "u", propertyKey]), ...frames.flatMap(([f, v]) => key(f, v))];
  const X = 13, ROT = 15;   // Node x and rotation keys; the square is component 1 (the artboard is 0)
  const bytes = [
    ...Buffer.from("RIVE"), ...vu(7), ...vu(0), ...vu(0), 0,   // fingerprint, major 7, minor 0, file id 0, empty ToC
    ...obj(23),                                                                            // Backboard
    ...obj(1, [4, "s", "Main"], [7, "f", 400], [8, "f", 225]),                             // Artboard
    ...obj(3, [4, "s", "Square"], [5, "u", 0], [13, "f", 60], [14, "f", 112.5]),          // Shape #1
    ...obj(7, [4, "s", "Body"], [5, "u", 1], [20, "f", 90], [21, "f", 90]),               // Rectangle path #2 (centred on its origin)
    ...obj(20, [4, "s", "Fill"], [5, "u", 1]),                                             // Fill #3
    ...obj(18, [4, "s", "Colour"], [5, "u", 3], [37, "c", color]),                         // SolidColor #4
    // animation 0 "slide", 1 "spin", 2 "left" (a hold), 3 "right" (a hold)
    ...anim("slide", 30, 60, 0, prop(1, X, [0, 60], [60, 300])),
    ...anim("spin", 30, 30, 1, prop(1, ROT, [0, 0], [30, 6.2831853])),
    ...anim("left", 30, 1, 0, prop(1, X, [0, 60])),
    ...anim("right", 30, 1, 0, prop(1, X, [0, 300])),
    // state machine: input 0 = trigger "go"; layer states 0 any, 1 entry, 2 exit, 3 "left", 4 "right"
    ...obj(53, [55, "s", "Machine"]),
    ...obj(58, [138, "s", "go"]),
    ...obj(57, [138, "s", "Layer"]),
    ...obj(62), ...obj(63), ...obj(65, [151, "u", 3]), ...obj(64),                         // any, entry (-> "left"), exit
    ...obj(61, [149, "u", 2]),                                                             // state 3: animation "left"
    ...obj(65, [151, "u", 4], [158, "u", 400]),                                            //   -> state 4 over 400 ms ...
    ...obj(68, [155, "u", 0]),                                                             //   ... when "go" fires
    ...obj(61, [149, "u", 3]),                                                             // state 4: animation "right"
  ];
  return Buffer.from(bytes);
}

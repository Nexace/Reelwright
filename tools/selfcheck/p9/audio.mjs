// tools/p9-audio.js: KIT.level / spectrum / waveform / smoothPath over real build-time FFT data (a 200 Hz tone, then a 2 kHz tone at half level, then silence).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { audioBands } from "../../p9-media.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "p9-aud-")), wav = path.join(tmp, "s.wav");
const r = spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "sine=f=200:d=2:sample_rate=16000,volume=8", "-f", "lavfi", "-i", "sine=f=2000:d=2:sample_rate=16000,volume=4",
  "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono:d=2", "-filter_complex", "[0][1][2]concat=n=3:v=0:a=1", wav]);
if (r.status) throw new Error("ffmpeg: " + r.stderr);
const data = audioBands(wav, { fps: 30, bins: 128 });
fs.rmSync(tmp, { recursive: true, force: true });

export default { scripts: ["tools/p9-audio.js"], dur: 6, film: `
window.AUDIO_BANDS = ${JSON.stringify(data)};
const el = (cls, parent, css) => { const e = KIT.el('div', cls, parent); KIT.css(e, css); return e; };
const bars = Array.from({ length: 16 }, (_, i) => el('box', S, { left: 20 + i * 36 + 'px', top: '20px', width: '28px', height: '10px', borderRadius: '3px' }));
const lvl = el('dot', S, { left: '20px', top: '60px' });
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('width', '640'); svg.setAttribute('height', '120'); svg.style.cssText = 'position:absolute;left:0;top:230px';
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', '#36c'); path.setAttribute('stroke-width', '3'); svg.appendChild(path); S.appendChild(svg);
KIT.start({ dur: 6, render: (t) => {
  const sp = KIT.spectrum(t, 16);
  bars.forEach((b, i) => { b.style.top = 200 - sp[i] * 170 + 'px'; b.style.height = 8 + sp[i] * 170 + 'px'; });
  lvl.style.left = 20 + KIT.level(t) * 560 + 'px';
  const w = KIT.waveform(t, 48, { window: 0.04 });
  path.setAttribute('d', KIT.smoothPath(w.map((v, i) => [i * 13.6, 60 - v * 50])));
} });`,
  check: async (p) => {
    const errs = await p.evaluate(() => {
      const bad = [], near = (a, b, e) => Math.abs(a - b) <= e, am = (a) => a.indexOf(Math.max(...a));
      const s1 = KIT.spectrum(1, 16), s2 = KIT.spectrum(3, 16), s3 = KIT.spectrum(5, 16);
      if (am(s1) !== 0) bad.push('200 Hz should peak in the first of 16 bands, got ' + am(s1));
      if (am(s2) !== 4) bad.push('2 kHz (band 4 of 16, 500 Hz each) got ' + am(s2));
      if (!(Math.max(...s3) < 0.02)) bad.push('silence should read 0: ' + Math.max(...s3));
      if (!near(Math.max(...s1), 1, 0.25) || !near(Math.max(...s2), 0.5, 0.15)) bad.push('amplitudes ' + Math.max(...s1) + ', ' + Math.max(...s2));
      if (!near(KIT.level(1), 1, 0.15) || !near(KIT.level(3), 0.5, 0.12) || KIT.level(5) > 0.02 || KIT.level(99) !== 0) bad.push('level ' + KIT.level(1) + ' ' + KIT.level(3));
      if (KIT.spectrum(99, 4).some((v) => v !== 0)) bad.push('past the clip must be silent');
      try { KIT.spectrum(1, 12); bad.push('n=12 is not a power of 2: must throw'); } catch (e) {}
      const w = KIT.waveform(1.0123, 32, { window: 0.02 });   // 200 Hz sine, 20 ms = 4 periods: has both signs and reaches near full scale
      if (!(Math.max(...w) > 0.8 && Math.min(...w) < -0.8)) bad.push('waveform of a full-scale 200 Hz tone should swing ±1: ' + Math.max(...w) + ' ' + Math.min(...w));
      if (KIT.smoothPath([[0, 0], [10, 10]]) !== 'M0 0 L10 10') bad.push('smoothPath 2 points: ' + KIT.smoothPath([[0, 0], [10, 10]]));
      if (!/^M0 0 Q10 10 15 5 L20 0 Z$/.test(KIT.smoothPath([[0, 0], [10, 10], [20, 0]], { close: true }))) bad.push('smoothPath 3 points: ' + KIT.smoothPath([[0, 0], [10, 10], [20, 0]], { close: true }));
      return bad;
    });
    if (errs.length) throw new Error("p9-audio: " + errs.join("; "));
  },
};

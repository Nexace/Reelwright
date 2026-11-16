'use strict';

const { V, W, snap, cue, seg, win, el, lerp, clamp, keys, u } = KIT;

const IDS = [
  'intro', 'conv', 'cnc_what', 'cnc_vs', 'cnc_types', 'cnc_parts',
  'cnc_gcode', 'cnc_pros', 'robots_what', 'robots_apps', 'am_what',
  'am_tech', 'am_steps', 'slicer_layer', 'slicer_infill', 'slicer_temp',
  'slicer_support', 'summary'
];

const DUR = window.PROJECT.speechEnd + window.PROJECT.tail;
const FADE = KIT.dur(0.42);
const IN = IDS.map((id, i) => (i ? snap(V(id).start - FADE) : 0));
const OUT = (i) => (i < IDS.length - 1 ? IN[i + 1] + FADE : DUR - KIT.dur(0.25));
const fade = (i, t) => win(t, IN[i], OUT(i), FADE, FADE);
const ent = (t, a, d = 0.55) => KIT.ease(seg(t, a, a + KIT.dur(d)));

// Subtle transition SFX cues
IN.slice(1).forEach((t) => cue(t, 'whoosh', 0.45));
cue(V('summary').start, 'chime', 0.55);

// Persistent Top Chapter & Progress Bar
const topbar = el('div', 'topbar', KIT.stage, `
  <div class="topbar-left">
    <span class="chap-pill">01 / 08</span>
    <span class="chap-title">Automation &amp; Manufacturing</span>
  </div>
  <div class="prog-wrap"><div class="prog-fill"></div></div>
`);
const chapPill = topbar.querySelector('.chap-pill');
const chapTitle = topbar.querySelector('.chap-title');
const progFill = topbar.querySelector('.prog-fill');

const CHAPTERS = [
  ['01 / 08', 'Overview'],
  ['02 / 08', 'Conventional Tools'],
  ['02 / 08', 'CNC Machines'],
  ['02 / 08', 'Manual vs. CNC'],
  ['03 / 08', 'CNC Applications & Types'],
  ['03 / 08', 'CNC Parts & Axes'],
  ['04 / 08', 'G-Code & M-Code'],
  ['04 / 08', 'CNC Pros & Cons'],
  ['05 / 08', 'Industrial Robotics'],
  ['05 / 08', 'Robot Applications'],
  ['06 / 08', 'Additive Manufacturing'],
  ['06 / 08', 'FDM vs. SLA'],
  ['06 / 08', '3D Printing Steps'],
  ['07 / 08', 'Slicer: Layer Height'],
  ['07 / 08', 'Slicer: Infill Patterns'],
  ['07 / 08', 'Slicer: Speed & Heat'],
  ['07 / 08', 'Slicer: Supports & 45° Rule'],
  ['08 / 08', 'Summary & Cheat-Sheet']
];

// Helper to build a balanced Visual + Running Notes scene
function mkScene(idx, title, tag, visHTML, notes) {
  const root = el('div', `ex-sc sc-${idx}`, KIT.stage, `
    <div class="vis-pane">
      <div class="vis-head">
        <h2>${title}</h2>
        <span class="vis-tag">${tag}</span>
      </div>
      <div class="vis-body">${visHTML}</div>
    </div>
    <div class="notes-pane">
      <div class="notes-head">
        <b>Running Notes</b>
        <span>${CHAPTERS[idx][0]}</span>
      </div>
      <div class="notes-list">
        ${notes.map(([h, sub]) => `
          <div class="note-item">
            <strong>${h}</strong>
            <span>${sub}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `);
  const items = [...root.querySelectorAll('.note-item')];
  return { root, items };
}

function setNotes(items, times, t, sceneIn) {
  items.forEach((item, k) => {
    const enterP = ent(t, sceneIn + 0.06 + k * 0.14, 0.38);
    const at = times[k] ?? (sceneIn + 0.3 + k * 0.5);
    const isNow = t >= at - 0.12 && (k === items.length - 1 || t < (times[k + 1] ?? Infinity) - 0.12);
    const done = t >= (times[k + 1] ?? Infinity) - 0.12;
    const baseOp = isNow ? 1 : done ? 0.82 : 0.62;
    item.style.opacity = enterP * baseOp;
    item.style.transform = `translateY(${(1 - enterP) * 14 * u}px)`;
    item.style.borderLeftColor = isNow ? '#1e2bfa' : done ? '#059669' : 'rgba(30,43,250,0.35)';
    item.style.background = isNow ? 'rgba(30,43,250,0.12)' : 'rgba(30,43,250,0.04)';
  });
}

// ── 0. INTRO ────────────────────────────────────────────────────────────────
const s0 = mkScene(0, 'Automation & Advanced Manufacturing', 'Overview', `
  <div class="mini-grid cols-3">
    <div class="mcard accent s0-c">
      <svg viewBox="0 0 120 90" style="height:calc(120 * var(--kit-u))">
        <rect x="14" y="54" width="92" height="24" rx="5" fill="#e6e9ff" stroke="#1e2bfa" stroke-width="3"/>
        <rect x="46" y="14" width="28" height="28" rx="4" fill="#1e2bfa"/>
        <polygon points="56,42 64,42 60,54" fill="#111111"/>
        <path class="s0-spark" d="M32 54 L88 54" stroke="#059669" stroke-width="4" stroke-dasharray="10 6"/>
      </svg>
      <b>CNC Machining</b>
      <p>Computer-guided cutting tools carve exact metal parts.</p>
    </div>
    <div class="mcard s0-c">
      <svg viewBox="0 0 120 90" style="height:calc(120 * var(--kit-u))">
        <rect x="22" y="72" width="44" height="12" rx="4" fill="#111111"/>
        <g class="s0-arm" transform-origin="44 72">
          <line x1="44" y1="72" x2="62" y2="38" stroke="#1e2bfa" stroke-width="8" stroke-linecap="round"/>
          <circle cx="62" cy="38" r="6" fill="#111111"/>
          <line x1="62" y1="38" x2="96" y2="30" stroke="#059669" stroke-width="7" stroke-linecap="round"/>
          <circle cx="96" cy="30" r="5" fill="#1e2bfa"/>
        </g>
      </svg>
      <b>Industrial Robots</b>
      <p>Programmable arms repeat tasks without fatigue.</p>
    </div>
    <div class="mcard s0-c">
      <svg viewBox="0 0 120 90" style="height:calc(120 * var(--kit-u))">
        <rect x="24" y="70" width="72" height="10" rx="3" fill="#111111"/>
        <polygon points="54,14 66,14 60,28" fill="#1e2bfa"/>
        <rect class="s0-l1" x="34" y="60" width="52" height="8" rx="2" fill="#059669"/>
        <rect class="s0-l2" x="38" y="50" width="44" height="8" rx="2" fill="#1e2bfa"/>
        <rect class="s0-l3" x="42" y="40" width="36" height="8" rx="2" fill="#059669"/>
      </svg>
      <b>3D Printing (AM)</b>
      <p>Builds objects layer by layer from 3D CAD.</p>
    </div>
  </div>
`, [
  ['1. Digital Control', 'Computers guide factory tools'],
  ['2. Robotic Arms', 'Repeatable automated motion'],
  ['3. Layer Building', '3D printing from CAD files'],
  ['Goal: Accuracy', 'Consistent quality at scale']
]);
const s0Cards = [...s0.root.querySelectorAll('.s0-c')];
const s0Arm = s0.root.querySelector('.s0-arm');
const s0Layers = [s0.root.querySelector('.s0-l1'), s0.root.querySelector('.s0-l2'), s0.root.querySelector('.s0-l3')];

// ── 1. CONVENTIONAL TOOLS ──────────────────────────────────────────────────
const s1 = mkScene(1, 'Conventional Machine Tools', 'Manual Era', `
  <svg viewBox="0 0 640 380">
    <!-- Turning -->
    <rect x="18" y="18" width="290" height="344" rx="14" fill="#ffffff" stroke="rgba(30,43,250,0.22)" stroke-width="2"/>
    <text x="163" y="52" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="700" fill="#111111">Turning (Lathe)</text>
    <rect x="44" y="128" width="38" height="84" rx="5" fill="#111111"/>
    <rect x="82" y="144" width="128" height="52" rx="4" fill="#dbe2ff" stroke="#1e2bfa" stroke-width="2.5"/>
    <g class="s1-spin">
      <line x1="110" y1="144" x2="110" y2="196" stroke="#1e2bfa" stroke-width="2"/>
      <line x1="146" y1="144" x2="146" y2="196" stroke="#1e2bfa" stroke-width="2"/>
      <line x1="182" y1="144" x2="182" y2="196" stroke="#1e2bfa" stroke-width="2"/>
    </g>
    <g class="s1-tool">
      <polygon points="150,196 174,196 162,238" fill="#059669"/>
      <rect x="148" y="238" width="28" height="38" rx="4" fill="#111111"/>
    </g>
    <text x="163" y="314" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">Workpiece spins • Tool cuts</text>
    <text x="163" y="340" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#1e2bfa">Handwheel feed</text>

    <!-- Drilling -->
    <rect x="332" y="18" width="290" height="344" rx="14" fill="#ffffff" stroke="rgba(30,43,250,0.22)" stroke-width="2"/>
    <text x="477" y="52" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="700" fill="#111111">Drilling</text>
    <rect x="392" y="220" width="170" height="58" rx="6" fill="#e5e7eb" stroke="#111111" stroke-width="2"/>
    <rect x="462" y="220" width="30" height="40" fill="#fdfae7"/>
    <g class="s1-drill">
      <rect x="454" y="84" width="46" height="44" rx="6" fill="#111111"/>
      <rect x="467" y="128" width="20" height="84" fill="#1e2bfa"/>
      <polygon points="467,212 487,212 477,228" fill="#059669"/>
    </g>
    <text x="477" y="314" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">Drill spins • Makes hole</text>
    <text x="477" y="340" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#1e2bfa">Manual measure &amp; adjust</text>
  </svg>
`, [
  ['Turning', 'Workpiece rotates against tool'],
  ['Drilling', 'Rotating drill cuts a hole'],
  ['Manual Control', 'Handwheels set speed & feed'],
  ['Skill Dependent', 'Accuracy varies by operator']
]);
const s1Tool = s1.root.querySelector('.s1-tool');
const s1Drill = s1.root.querySelector('.s1-drill');
const s1Spin = s1.root.querySelector('.s1-spin');

// ── 2. WHAT IS CNC ──────────────────────────────────────────────────────────
const s2 = mkScene(2, 'What is a CNC Machine?', 'Computer Control', `
  <svg viewBox="0 0 640 380">
    <!-- Stored Program -->
    <rect x="20" y="96" width="166" height="184" rx="14" fill="#ffffff" stroke="#1e2bfa" stroke-width="2.5"/>
    <text x="103" y="132" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="700" fill="#1e2bfa">Stored Program</text>
    <text x="40" y="170" font-family="Space Grotesk, monospace" font-size="19" font-weight="700" fill="#111111">G00 X25 Z2</text>
    <text x="40" y="202" font-family="Space Grotesk, monospace" font-size="19" font-weight="700" fill="#111111">M03 S1500</text>
    <text x="40" y="234" font-family="Space Grotesk, monospace" font-size="19" font-weight="700" fill="#059669">G01 X40 Z-20</text>
    <text x="103" y="264" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" fill="#4b5563">Position, speed, feed</text>

    <!-- Arrow 1 -->
    <line x1="186" y1="188" x2="232" y2="188" stroke="#1e2bfa" stroke-width="4"/>
    <polygon points="232,180 248,188 232,196" fill="#1e2bfa"/>
    <circle class="s2-p1" cx="205" cy="188" r="6" fill="#059669"/>

    <!-- Controller -->
    <rect x="248" y="84" width="166" height="208" rx="14" fill="#1e2bfa"/>
    <text x="331" y="142" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="700" fill="#fdfae7">CNC</text>
    <text x="331" y="172" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="700" fill="#fdfae7">Controller</text>
    <rect x="276" y="198" width="110" height="58" rx="8" fill="rgba(253,250,231,0.18)"/>
    <text x="331" y="224" text-anchor="middle" font-family="Inter, sans-serif" font-size="17" font-weight="700" fill="#fdfae7">Reads code</text>
    <text x="331" y="246" text-anchor="middle" font-family="Inter, sans-serif" font-size="17" fill="#fdfae7">Issues pulses</text>

    <!-- Arrow 2 -->
    <line x1="414" y1="188" x2="460" y2="188" stroke="#059669" stroke-width="4"/>
    <polygon points="460,180 476,188 460,196" fill="#059669"/>
    <circle class="s2-p2" cx="435" cy="188" r="6" fill="#1e2bfa"/>

    <!-- Machine Tool -->
    <rect x="476" y="96" width="146" height="184" rx="14" fill="#ffffff" stroke="#059669" stroke-width="2.5"/>
    <text x="549" y="132" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="700" fill="#059669">Machine Tool</text>
    <rect x="500" y="220" width="98" height="24" rx="4" fill="#e5e7eb" stroke="#111111" stroke-width="2"/>
    <g class="s2-head">
      <rect x="531" y="154" width="36" height="36" rx="4" fill="#111111"/>
      <polygon points="541,190 557,190 549,218" fill="#1e2bfa"/>
    </g>
    <text x="549" y="266" text-anchor="middle" font-family="Inter, sans-serif" font-size="17" fill="#4b5563">Exact cut path</text>
  </svg>
`, [
  ['Computer Brain', 'Controller directs all tool moves'],
  ['Coded Rules', 'Sets position, speed, and feed'],
  ['Zero Handwheels', 'Motors execute automatically'],
  ['Stored Program', 'Run identical parts repeatedly']
]);
const s2P1 = s2.root.querySelector('.s2-p1');
const s2P2 = s2.root.querySelector('.s2-p2');
const s2Head = s2.root.querySelector('.s2-head');

// ── 3. CONVENTIONAL VS CNC ──────────────────────────────────────────────────
const s3 = mkScene(3, 'Conventional vs. CNC Machining', 'Comparison', `
  <div class="comp-table">
    <div class="comp-row">
      <div class="comp-cell hdr">Aspect</div>
      <div class="comp-cell hdr">Conventional</div>
      <div class="comp-cell hdr">CNC Machine</div>
    </div>
    <div class="comp-row s3-r">
      <div class="comp-cell">Tool Movement</div>
      <div class="comp-cell">Operator handwheels</div>
      <div class="comp-cell cnc">Program-controlled</div>
    </div>
    <div class="comp-row s3-r">
      <div class="comp-cell">Repeatability</div>
      <div class="comp-cell">Depends on worker</div>
      <div class="comp-cell cnc">Consistently high</div>
    </div>
    <div class="comp-row s3-r">
      <div class="comp-cell">Complex Shapes</div>
      <div class="comp-cell">Very difficult</div>
      <div class="comp-cell cnc">Easy with setup</div>
    </div>
    <div class="comp-row s3-r">
      <div class="comp-cell">Initial Cost</div>
      <div class="comp-cell">Usually lower</div>
      <div class="comp-cell cnc">Higher upfront</div>
    </div>
  </div>
`, [
  ['Control Mode', 'Manual hands vs stored code'],
  ['Upfront Cost', 'CNC machines cost more initially'],
  ['Repeatability', 'Every part matches the first'],
  ['3D Geometry', 'Complex curves made practical']
]);
const s3Rows = [...s3.root.querySelectorAll('.s3-r')];

// ── 4. CNC APPLICATIONS & TYPES ────────────────────────────────────────────
const s4 = mkScene(4, 'CNC Applications & Two Main Types', 'Where & How', `
  <div style="width:100%;height:100%;display:flex;flex-direction:column;gap:calc(18 * var(--kit-u))">
    <div class="pill-row" style="justify-content:center">
      <span class="pill s4-app">Automotive Shafts</span>
      <span class="pill s4-app">Aerospace Parts</span>
      <span class="pill s4-app">Medical Implants</span>
      <span class="pill s4-app">Moulds &amp; Dies</span>
    </div>
    <div class="mini-grid cols-2" style="flex:1">
      <div class="mcard accent s4-type">
        <svg viewBox="0 0 240 130" style="height:calc(160 * var(--kit-u))">
          <rect x="20" y="34" width="30" height="62" rx="4" fill="#111111"/>
          <rect x="50" y="46" width="110" height="38" rx="4" fill="#dbe2ff" stroke="#1e2bfa" stroke-width="2.5"/>
          <path d="M36 22 A18 18 0 0 1 60 22" fill="none" stroke="#1e2bfa" stroke-width="3"/>
          <polygon points="58,16 66,24 54,26" fill="#1e2bfa"/>
          <polygon class="s4-t1" points="120,84 138,84 129,112" fill="#059669"/>
        </svg>
        <b>CNC Turning Centre</b>
        <p>Workpiece rotates; tool follows path for round parts.</p>
      </div>
      <div class="mcard good s4-type">
        <svg viewBox="0 0 240 130" style="height:calc(160 * var(--kit-u))">
          <rect x="44" y="88" width="152" height="24" rx="4" fill="#111111"/>
          <rect x="74" y="64" width="92" height="24" rx="3" fill="#d1fae5" stroke="#059669" stroke-width="2.5"/>
          <g class="s4-t2">
            <rect x="106" y="16" width="28" height="26" rx="4" fill="#1e2bfa"/>
            <rect x="114" y="42" width="12" height="22" fill="#111111"/>
          </g>
        </svg>
        <b>CNC Machining Centre</b>
        <p>Cutting tool rotates; workpiece is held on table.</p>
      </div>
    </div>
  </div>
`, [
  ['Auto & Aerospace', 'Shafts, engines, precision metal'],
  ['Medical & Moulds', 'Implants, dies, surgical tools'],
  ['Turning Centre', 'Spinning part + sliding tool'],
  ['Machining Centre', 'Spinning cutter + X-Y table']
]);
const s4Apps = [...s4.root.querySelectorAll('.s4-app')];
const s4T1 = s4.root.querySelector('.s4-t1');
const s4T2 = s4.root.querySelector('.s4-t2');

// ── 5. CNC PARTS & COORDINATE AXES ─────────────────────────────────────────
const s5 = mkScene(5, 'Major Parts & Coordinate System', 'Architecture', `
  <svg viewBox="0 0 640 380">
    <!-- Closed-loop block diagram -->
    <rect x="18" y="20" width="286" height="340" rx="14" fill="#ffffff" stroke="rgba(30,43,250,0.22)" stroke-width="2"/>
    <text x="161" y="54" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="700" fill="#111111">Closed-Loop System</text>

    <rect class="s5-b" x="52" y="76" width="218" height="44" rx="8" fill="#1e2bfa"/>
    <text x="161" y="104" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="19" font-weight="700" fill="#fdfae7">CNC Controller + Panel</text>

    <line x1="161" y1="120" x2="161" y2="148" stroke="#1e2bfa" stroke-width="3"/>
    <rect class="s5-b" x="52" y="148" width="218" height="44" rx="8" fill="#eef1ff" stroke="#1e2bfa" stroke-width="2"/>
    <text x="161" y="176" text-anchor="middle" font-family="Inter, sans-serif" font-size="19" font-weight="700" fill="#111111">Axis Drive Motors</text>

    <line x1="161" y1="192" x2="161" y2="220" stroke="#1e2bfa" stroke-width="3"/>
    <rect class="s5-b" x="52" y="220" width="218" height="44" rx="8" fill="#eef1ff" stroke="#1e2bfa" stroke-width="2"/>
    <text x="161" y="248" text-anchor="middle" font-family="Inter, sans-serif" font-size="19" font-weight="700" fill="#111111">Spindle, Table &amp; Tool</text>

    <line x1="161" y1="264" x2="161" y2="292" stroke="#059669" stroke-width="3"/>
    <rect class="s5-b" x="52" y="292" width="218" height="44" rx="8" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
    <text x="161" y="320" text-anchor="middle" font-family="Inter, sans-serif" font-size="19" font-weight="700" fill="#047857">Feedback Sensors</text>
    <path d="M52 314 L30 314 L30 98 L52 98" fill="none" stroke="#059669" stroke-width="3"/>
    <circle class="s5-fb" cx="30" cy="200" r="6" fill="#059669"/>

    <!-- Coordinate Axes -->
    <rect x="322" y="20" width="300" height="340" rx="14" fill="#ffffff" stroke="rgba(30,43,250,0.22)" stroke-width="2"/>
    <text x="472" y="54" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="700" fill="#111111">Axes: Linear &amp; Rotary</text>
    <polygon points="410,208 492,174 552,202 470,236" fill="#e5e7eb" stroke="#111111" stroke-width="2"/>
    <!-- Z axis -->
    <line x1="472" y1="205" x2="472" y2="88" stroke="#1e2bfa" stroke-width="4"/>
    <polygon points="465,94 472,76 479,94" fill="#1e2bfa"/>
    <text x="492" y="96" font-family="Space Grotesk, sans-serif" font-size="21" font-weight="700" fill="#1e2bfa">+Z (C)</text>
    <!-- X axis -->
    <line x1="472" y1="205" x2="588" y2="205" stroke="#059669" stroke-width="4"/>
    <polygon points="582,198 600,205 582,212" fill="#059669"/>
    <text x="572" y="232" font-family="Space Grotesk, sans-serif" font-size="21" font-weight="700" fill="#059669">+X (A)</text>
    <!-- Y axis -->
    <line x1="472" y1="205" x2="386" y2="276" stroke="#b45309" stroke-width="4"/>
    <polygon points="392,280 374,286 382,268" fill="#b45309"/>
    <text x="348" y="252" font-family="Space Grotesk, sans-serif" font-size="21" font-weight="700" fill="#b45309">+Y (B)</text>
    <text x="472" y="330" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">Turning uses X, Z • Milling uses X, Y, Z</text>
  </svg>
`, [
  ['Controller & Panel', 'Setup, monitor, and issue commands'],
  ['Axis Drive Motors', 'Move cutting tool or worktable'],
  ['Feedback Loop', 'Sensors monitor and correct position'],
  ['X, Y, Z + A, B, C', 'Linear & rotary coordinate axes']
]);
const s5Fb = s5.root.querySelector('.s5-fb');

// ── 6. G-CODES, M-CODES & STEPPED SHAFT ────────────────────────────────────
const s6 = mkScene(6, 'CNC Part Program: G & M Codes', 'Stepped Shaft', `
  <div class="gcode-box">
    <div class="code-col">
      <div class="code-line s6-cl"><code>G00</code><span>Rapid positioning</span></div>
      <div class="code-line s6-cl"><code>G01</code><span>Straight feed cut</span></div>
      <div class="code-line s6-cl"><code>G02/G03</code><span>Circular arc move</span></div>
      <div class="code-line s6-cl"><code>M03/M05</code><span>Spindle ON / STOP</span></div>
      <div class="code-line s6-cl"><code>M30</code><span>End &amp; reset program</span></div>
    </div>
    <div class="shaft-col">
      <svg viewBox="0 0 320 230">
        <!-- Stepped shaft profile -->
        <line x1="20" y1="120" x2="300" y2="120" stroke="#9ca3af" stroke-width="2" stroke-dasharray="6 4"/>
        <path d="M36,48 L112,48 L112,62 L176,62 L176,78 L236,78 L236,92 L286,92 L286,148 L236,148 L236,162 L176,162 L176,178 L112,178 L112,192 L36,192 Z"
              fill="#dbe2ff" stroke="#1e2bfa" stroke-width="3"/>
        <text x="74" y="38" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="16" font-weight="700" fill="#111111">Ø25</text>
        <text x="144" y="52" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="16" font-weight="700" fill="#111111">Ø24</text>
        <text x="206" y="68" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="16" font-weight="700" fill="#111111">Ø20</text>
        <text x="261" y="82" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="16" font-weight="700" fill="#111111">Ø16</text>
        <!-- Animated tool marker -->
        <g class="s6-tip">
          <polygon points="0,0 10,-22 -10,-22" fill="#059669"/>
        </g>
      </svg>
      <div class="shaft-cap">Example: G01 X40 Z-20 F0.1</div>
    </div>
  </div>
`, [
  ['Part Program', 'Coded sequence of machine steps'],
  ['G-Codes (Motion)', 'G00 rapid, G01 cut, G02/G03 arc'],
  ['M-Codes (Machine)', 'M03 spindle on, M05 stop, M30 end'],
  ['Feed & Coordinates', 'G01 X40 Z-20 F0.1 sets path']
]);
const s6Tip = s6.root.querySelector('.s6-tip');
const s6Lines = [...s6.root.querySelectorAll('.s6-cl')];

// ── 7. CNC PROS & CONS ──────────────────────────────────────────────────────
const s7 = mkScene(7, 'CNC Advantages & Disadvantages', 'Trade-Offs', `
  <div class="mini-grid cols-2">
    <div class="mcard good s7-c">
      <b style="color:#047857">+ Advantages</b>
      <p>• Less idle &amp; lead time</p>
      <p>• Simpler fixtures needed</p>
      <p>• Easy design updates</p>
      <p>• Less waste &amp; inspection</p>
      <p>• Smaller floor space</p>
    </div>
    <div class="mcard warn s7-c">
      <b style="color:#b45309">− Disadvantages</b>
      <p>• Higher initial investment</p>
      <p>• Higher maintenance cost</p>
      <p>• Needs skilled programmers</p>
    </div>
  </div>
`, [
  ['Faster Turnaround', 'Less idle & manufacturing lead time'],
  ['High Flexibility', 'Simpler fixtures & fast updates'],
  ['Consistent Quality', 'Fewer rejections & less floor space'],
  ['Main Drawbacks', 'High upfront cost & skilled coders']
]);
const s7Cards = [...s7.root.querySelectorAll('.s7-c')];

// ── 8. INDUSTRIAL ROBOTICS ──────────────────────────────────────────────────
const s8 = mkScene(8, 'Industrial Robotics', 'Programmable Arms', `
  <svg viewBox="0 0 640 380">
    <rect x="20" y="20" width="600" height="340" rx="14" fill="#ffffff" stroke="rgba(30,43,250,0.22)" stroke-width="2"/>
    <!-- Base & Table -->
    <rect x="110" y="302" width="120" height="28" rx="6" fill="#111111"/>
    <rect x="420" y="276" width="140" height="54" rx="8" fill="#eef1ff" stroke="#1e2bfa" stroke-width="2"/>
    <rect class="s8-box" x="466" y="240" width="48" height="36" rx="4" fill="#059669"/>
    <!-- Robot Arm -->
    <g class="s8-j1" transform="translate(170,302)">
      <line x1="0" y1="0" x2="0" y2="-130" stroke="#1e2bfa" stroke-width="20" stroke-linecap="round"/>
      <circle cx="0" cy="0" r="16" fill="#111111"/>
      <g class="s8-j2" transform="translate(0,-130)">
        <line x1="0" y1="0" x2="170" y2="0" stroke="#1e2bfa" stroke-width="16" stroke-linecap="round"/>
        <circle cx="0" cy="0" r="14" fill="#111111"/>
        <g class="s8-j3" transform="translate(170,0)">
          <line x1="0" y1="0" x2="72" y2="42" stroke="#059669" stroke-width="12" stroke-linecap="round"/>
          <circle cx="0" cy="0" r="11" fill="#111111"/>
          <circle cx="72" cy="42" r="8" fill="#1e2bfa"/>
        </g>
      </g>
    </g>
    <text x="320" y="64" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="700" fill="#111111">Anthropomorphic Jointed Arm</text>
    <text x="320" y="94" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">Repeats exact motion pattern until reprogrammed</text>
  </svg>
`, [
  ['General Purpose', 'Programmable industrial machine'],
  ['Human-Like Joints', 'Anthropomorphic arm reach'],
  ['Exact Repetition', 'Repeats patterns tirelessly'],
  ['Reprogrammable', 'Switch tasks for new jobs']
]);
const s8J1 = s8.root.querySelector('.s8-j1');
const s8J2 = s8.root.querySelector('.s8-j2');
const s8J3 = s8.root.querySelector('.s8-j3');

// ── 9. ROBOT APPLICATIONS ───────────────────────────────────────────────────
const ROBO_APPS = [
  ['Material Handling', 'Move & stack boxes'],
  ['Machine Loading', 'Feed CNC centres'],
  ['Robotic Welding', 'Consistent car seams'],
  ['Spray Painting', 'Even surface coating'],
  ['Machining & Carving', 'Trim & sculpt parts'],
  ['Assembly & Inspection', 'Fast build & 3D scan']
];
const s9 = mkScene(9, 'Applications of Industrial Robots', '7 Key Roles', `
  <div class="mini-grid cols-3">
    ${ROBO_APPS.map(([t, d]) => `
      <div class="mcard s9-a">
        <b>${t}</b>
        <p>${d}</p>
      </div>
    `).join('')}
  </div>
`, [
  ['Transfer & Loading', 'Handle parts & feed machines'],
  ['Welding & Painting', 'Consistent heat & spray coats'],
  ['Carving & Assembly', 'Precision build on moving lines'],
  ['Vision Inspection', 'Nonstop 3D & pipe scanning']
]);
const s9Cards = [...s9.root.querySelectorAll('.s9-a')];

// ── 10. ADDITIVE MANUFACTURING ──────────────────────────────────────────────
const s10 = mkScene(10, 'Additive Manufacturing (3D Printing)', 'Layer by Layer', `
  <svg viewBox="0 0 640 380">
    <!-- Conventional Subtractive -->
    <rect x="20" y="24" width="286" height="332" rx="14" fill="#ffffff" stroke="rgba(30,43,250,0.22)" stroke-width="2"/>
    <text x="163" y="60" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="700" fill="#111111">Conventional (Subtractive)</text>
    <rect x="88" y="102" width="150" height="120" rx="6" fill="#e5e7eb" stroke="#111111" stroke-width="2"/>
    <polygon points="108,222 218,222 163,124" fill="#dbe2ff" stroke="#1e2bfa" stroke-width="2.5"/>
    <text x="163" y="274" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">Cuts away extra material</text>
    <text x="163" y="302" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#b45309">Detailed process planning</text>

    <!-- Additive -->
    <rect x="334" y="24" width="286" height="332" rx="14" fill="#ffffff" stroke="#059669" stroke-width="2.5"/>
    <text x="477" y="60" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="700" fill="#047857">Additive (3D Printing)</text>
    <rect x="382" y="220" width="190" height="14" rx="3" fill="#111111"/>
    ${[0, 1, 2, 3, 4, 5].map((k) => {
      const w = 136 - k * 20, x = 477 - w / 2, y = 204 - k * 16;
      return `<rect class="s10-ly" x="${x}" y="${y}" width="${w}" height="13" rx="2" fill="${k % 2 ? '#1e2bfa' : '#059669'}"/>`;
    }).join('')}
    <text x="477" y="274" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">Adds thin CAD cross-sections</text>
    <text x="477" y="302" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#047857">Minimal process planning</text>
  </svg>
`, [
  ['3D Printing (AM)', 'Formerly rapid prototyping'],
  ['Direct from CAD', '3D model goes straight to print'],
  ['Thin Layers', 'Each layer is a cross-section'],
  ['Minimal Planning', 'No custom fixtures or toolpaths']
]);
const s10Layers = [...s10.root.querySelectorAll('.s10-ly')];

// ── 11. AM TECHNOLOGIES: MEX (FDM) vs VPP (SLA) ─────────────────────────────
const s11 = mkScene(11, 'Key 3D Printing Technologies', 'MEX vs. VPP', `
  <svg viewBox="0 0 640 380">
    <!-- MEX / FDM -->
    <rect x="20" y="20" width="290" height="340" rx="14" fill="#ffffff" stroke="#1e2bfa" stroke-width="2.5"/>
    <text x="165" y="52" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="20" font-weight="700" fill="#1e2bfa">1. Material Extrusion</text>
    <text x="165" y="76" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="16" font-weight="700" fill="#4b5563">(MEX / FDM)</text>
    <circle cx="80" cy="118" r="26" fill="none" stroke="#111111" stroke-width="7"/>
    <path d="M106 118 L165 118 L165 152" fill="none" stroke="#b45309" stroke-width="5"/>
    <g class="s11-noz">
      <rect x="145" y="148" width="40" height="32" rx="4" fill="#111111"/>
      <polygon points="155,180 175,180 165,198" fill="#b45309"/>
    </g>
    <rect x="86" y="254" width="158" height="14" rx="3" fill="#111111"/>
    <rect x="108" y="236" width="114" height="18" rx="3" fill="#dbe2ff" stroke="#1e2bfa" stroke-width="2"/>
    <rect class="s11-fdm" x="114" y="218" width="102" height="16" rx="3" fill="#1e2bfa"/>
    <text x="165" y="308" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">Heated nozzle melts</text>
    <text x="165" y="334" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#111111">thermoplastic filament</text>

    <!-- VPP / SLA -->
    <rect x="330" y="20" width="290" height="340" rx="14" fill="#ffffff" stroke="#059669" stroke-width="2.5"/>
    <text x="475" y="52" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="20" font-weight="700" fill="#047857">2. Vat Photopolymerization</text>
    <text x="475" y="76" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="16" font-weight="700" fill="#4b5563">(VPP / SLA)</text>
    <!-- Resin tank -->
    <rect x="372" y="152" width="206" height="80" rx="6" fill="#fef3c7" stroke="#111111" stroke-width="2.5"/>
    <g class="s11-plat">
      <rect x="466" y="100" width="18" height="40" fill="#111111"/>
      <rect x="425" y="140" width="100" height="10" fill="#111111"/>
      <rect x="442" y="150" width="66" height="34" rx="3" fill="#059669"/>
    </g>
    <!-- UV beam -->
    <polygon class="s11-uv" points="475,264 446,184 504,184" fill="rgba(30,43,250,0.35)"/>
    <rect x="446" y="264" width="58" height="22" rx="4" fill="#1e2bfa"/>
    <text x="475" y="314" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">UV light cures liquid resin</text>
    <text x="475" y="340" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#111111">high detail stereolithography</text>
  </svg>
`, [
  ['MEX / FDM', 'Melts polymer through hot nozzle'],
  ['VPP / SLA', 'UV light cures liquid resin'],
  ['Layer Bonding', 'Heat fusion vs photopolymer cure'],
  ['Material Choice', 'Shapes final strength & finish']
]);
const s11Noz = s11.root.querySelector('.s11-noz');
const s11Fdm = s11.root.querySelector('.s11-fdm');
const s11Uv = s11.root.querySelector('.s11-uv');
const s11Plat = s11.root.querySelector('.s11-plat');

// ── 12. 4-STEP AM WORKFLOW ──────────────────────────────────────────────────
const s12 = mkScene(12, 'Steps Involved in 3D Printing', '4-Step Pipeline', `
  <div class="mini-grid cols-2">
    <div class="mcard accent s12-st">
      <b>1. Create 3D Model (.STL)</b>
      <p>Design part in CAD (SolidWorks, Creo, CATIA, Fusion).</p>
    </div>
    <div class="mcard s12-st">
      <b>2. Slice Model (.GCODE)</b>
      <p>Convert into horizontal layers (Cura, PrusaSlicer, Bambu).</p>
    </div>
    <div class="mcard s12-st">
      <b>3. Print 3D Model</b>
      <p>Printer follows G-code layer by layer until complete.</p>
    </div>
    <div class="mcard good s12-st">
      <b>4. Post-Processing</b>
      <p>Remove part, clip supports, clean &amp; sand surfaces.</p>
    </div>
  </div>
`, [
  ['Step 1: 3D CAD', 'Export geometry as .STL file'],
  ['Step 2: Slicing', 'Generates .GCODE layer paths'],
  ['Step 3: Printing', 'Builds object layer by layer'],
  ['Step 4: Finish', 'Remove supports, clean & sand']
]);
const s12Cards = [...s12.root.querySelectorAll('.s12-st')];

// ── 13. SLICER: LAYER HEIGHT ────────────────────────────────────────────────
const s13 = mkScene(13, 'Slicer Setting 1: Layer Height (mm)', 'Detail vs. Speed', `
  <svg viewBox="0 0 640 380">
    <!-- Thin 0.1 mm -->
    <rect x="20" y="24" width="186" height="332" rx="14" fill="#ffffff" stroke="#1e2bfa" stroke-width="2.5"/>
    <text x="113" y="60" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="700" fill="#1e2bfa">0.1 mm</text>
    <text x="113" y="88" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">200 layers (20 mm)</text>
    ${Array.from({ length: 16 }, (_, k) => `<rect class="s13-a" x="48" y="${262 - k * 10}" width="${130 - k * 3}" height="8" rx="2" fill="#1e2bfa"/>`).join('')}
    <text x="113" y="308" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#111111">Fine smooth finish</text>
    <text x="113" y="334" text-anchor="middle" font-family="Inter, sans-serif" font-size="17" fill="#b45309">Longer print time</text>

    <!-- Balanced 0.2 mm -->
    <rect x="227" y="24" width="186" height="332" rx="14" fill="#ffffff" stroke="#059669" stroke-width="2.5"/>
    <text x="320" y="60" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="700" fill="#047857">0.2 mm</text>
    <text x="320" y="88" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">100 layers (20 mm)</text>
    ${Array.from({ length: 8 }, (_, k) => `<rect class="s13-b" x="255" y="${252 - k * 20}" width="${130 - k * 6}" height="17" rx="2" fill="#059669"/>`).join('')}
    <text x="320" y="308" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#111111">Balanced standard</text>
    <text x="320" y="334" text-anchor="middle" font-family="Inter, sans-serif" font-size="15.5" fill="#047857">0.4 mm nozzle default</text>

    <!-- Thick 0.3 mm -->
    <rect x="434" y="24" width="186" height="332" rx="14" fill="#ffffff" stroke="rgba(30,43,250,0.22)" stroke-width="2"/>
    <text x="527" y="60" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="700" fill="#111111">0.3 mm</text>
    <text x="527" y="88" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#4b5563">Fewer layers</text>
    ${Array.from({ length: 5 }, (_, k) => `<rect class="s13-c" x="462" y="${242 - k * 31}" width="${130 - k * 10}" height="27" rx="3" fill="#4b5563"/>`).join('')}
    <text x="527" y="308" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#111111">Fastest printing</text>
    <text x="527" y="334" text-anchor="middle" font-family="Inter, sans-serif" font-size="17" fill="#4b5563">Visible layer lines</text>
  </svg>
`, [
  ['Layer Thickness', 'Height of each printed slice'],
  ['0.1 mm (200 layers)', 'Fine detail, slower print'],
  ['0.2 mm (100 layers)', 'Balanced daily choice'],
  ['0.3 mm (Thick)', 'Fast draft, visible steps']
]);
const s13A = [...s13.root.querySelectorAll('.s13-a')];
const s13B = [...s13.root.querySelectorAll('.s13-b')];
const s13C = [...s13.root.querySelectorAll('.s13-c')];

// ── 14. SLICER: INFILL DENSITY & PATTERNS ───────────────────────────────────
const s14 = mkScene(14, 'Slicer Setting 2: Infill & Patterns', '10%–40% Interior', `
  <div class="mini-grid cols-2">
    <div class="mcard s14-p">
      <svg viewBox="0 0 120 70" style="height:calc(86 * var(--kit-u))">
        <rect x="10" y="6" width="100" height="58" fill="none" stroke="#111111" stroke-width="3"/>
        <path d="M35 6 V64 M60 6 V64 M85 6 V64 M10 25 H110 M10 45 H110" stroke="#1e2bfa" stroke-width="2.5"/>
      </svg>
      <b>Grid</b>
      <p>Straight lines • Fast &amp; general use</p>
    </div>
    <div class="mcard s14-p">
      <svg viewBox="0 0 120 70" style="height:calc(86 * var(--kit-u))">
        <rect x="10" y="6" width="100" height="58" fill="none" stroke="#111111" stroke-width="3"/>
        <path d="M10 64 L40 6 L70 64 L100 6 M10 35 H110 M25 6 L55 64 L85 6 L110 54" fill="none" stroke="#1e2bfa" stroke-width="2.5"/>
      </svg>
      <b>Triangles</b>
      <p>Rigid cells • Functional strength</p>
    </div>
    <div class="mcard accent s14-p">
      <svg viewBox="0 0 120 70" style="height:calc(86 * var(--kit-u))">
        <rect x="10" y="6" width="100" height="58" fill="none" stroke="#111111" stroke-width="3"/>
        <path d="M12 24 Q35 8 58 24 T108 24 M12 46 Q35 30 58 46 T108 46" fill="none" stroke="#1e2bfa" stroke-width="3"/>
      </svg>
      <b>Gyroid</b>
      <p>3D curves • Equal strength all ways</p>
    </div>
    <div class="mcard good s14-p">
      <svg viewBox="0 0 120 70" style="height:calc(86 * var(--kit-u))">
        <rect x="10" y="6" width="100" height="58" fill="none" stroke="#111111" stroke-width="3"/>
        <polygon points="30,18 46,18 54,34 46,50 30,50 22,34" fill="none" stroke="#059669" stroke-width="2.5"/>
        <polygon points="64,18 80,18 88,34 80,50 64,50 56,34" fill="none" stroke="#059669" stroke-width="2.5"/>
      </svg>
      <b>Honeycomb</b>
      <p>Hexagons • High stiffness, light weight</p>
    </div>
  </div>
`, [
  ['10–20% Infill', 'Light models & quick prototypes'],
  ['20–40% Infill', 'Stronger functional parts'],
  ['Grid & Triangles', 'Simple, fast, rigid cells'],
  ['Gyroid & Honeycomb', 'Isotropic & efficient strength']
]);
const s14Cards = [...s14.root.querySelectorAll('.s14-p')];

// ── 15. SLICER: PRINT SPEED, NOZZLE & BED TEMP ─────────────────────────────
const s15 = mkScene(15, 'Speed, Nozzle & Bed Temperature', 'Thermal Balance', `
  <div class="mini-grid cols-3">
    <div class="mcard s15-c">
      <svg viewBox="0 0 140 90" style="height:calc(115 * var(--kit-u))">
        <path d="M22 70 A48 48 0 0 1 118 70" fill="none" stroke="#e5e7eb" stroke-width="12" stroke-linecap="round"/>
        <path d="M22 70 A48 48 0 0 1 94 30" fill="none" stroke="#059669" stroke-width="12" stroke-linecap="round"/>
        <line class="s15-needle" x1="70" y1="70" x2="70" y2="28" stroke="#111111" stroke-width="4" stroke-linecap="round"/>
        <circle cx="70" cy="70" r="6" fill="#1e2bfa"/>
      </svg>
      <b>Speed: 40–60 mm/s</b>
      <p>Too fast causes vibration &amp; gaps.</p>
    </div>
    <div class="mcard accent s15-c">
      <svg viewBox="0 0 140 90" style="height:calc(115 * var(--kit-u))">
        <rect x="44" y="10" width="52" height="32" rx="6" fill="#111111"/>
        <polygon points="52,42 88,42 70,68" fill="#b45309"/>
        <path class="s15-melt" d="M70 68 L70 84" stroke="#1e2bfa" stroke-width="6" stroke-linecap="round"/>
      </svg>
      <b>Nozzle: 190–220°C</b>
      <p>PLA 190–220°C • ABS 230–260°C.</p>
    </div>
    <div class="mcard good s15-c">
      <svg viewBox="0 0 140 90" style="height:calc(115 * var(--kit-u))">
        <rect x="16" y="64" width="108" height="14" rx="4" fill="#b45309"/>
        <rect class="s15-part" x="34" y="34" width="72" height="30" rx="3" fill="#dbe2ff" stroke="#1e2bfa" stroke-width="2.5"/>
        <path d="M40 58 Q70 48 100 58" fill="none" stroke="#059669" stroke-width="3"/>
      </svg>
      <b>Bed: 50–60°C (PLA)</b>
      <p>Prevents warping &amp; elephant foot.</p>
    </div>
  </div>
`, [
  ['40–60 mm/s Speed', 'Excess speed causes vibration'],
  ['Nozzle Temperature', 'Too cold: poor flow; hot: stringing'],
  ['Heated Bed', 'Improves adhesion, stops warping'],
  ['Watch Base Heat', 'Too hot squashes base ("elephant foot")']
]);
const s15Cards = [...s15.root.querySelectorAll('.s15-c')];
const s15Needle = s15.root.querySelector('.s15-needle');

// ── 16. SLICER: SUPPORTS & 45° RULE ─────────────────────────────────────────
const s16 = mkScene(16, 'Supports & the 45° Overhang Rule', 'Smart Orientation', `
  <svg viewBox="0 0 640 380">
    <!-- 45 degree gauge -->
    <rect x="20" y="24" width="290" height="332" rx="14" fill="#ffffff" stroke="rgba(30,43,250,0.22)" stroke-width="2"/>
    <text x="165" y="58" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="22" font-weight="700" fill="#111111">45° Overhang Rule</text>
    <rect x="64" y="266" width="202" height="14" rx="3" fill="#111111"/>
    <line x1="114" y1="266" x2="114" y2="110" stroke="#9ca3af" stroke-width="2" stroke-dasharray="6 4"/>
    <line x1="114" y1="266" x2="210" y2="170" stroke="#059669" stroke-width="4" stroke-dasharray="6 4"/>
    <polygon class="s16-arm" points="114,266 150,266 232,190 196,190" fill="#dbe2ff" stroke="#1e2bfa" stroke-width="3"/>
    <rect class="s16-sup" x="184" y="210" width="38" height="56" rx="4" fill="none" stroke="#b45309" stroke-width="3" stroke-dasharray="6 4"/>
    <text x="165" y="316" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#b45309">Past ~45° needs support</text>

    <!-- Normal vs Tree & Orientation -->
    <rect x="330" y="24" width="290" height="332" rx="14" fill="#ffffff" stroke="#059669" stroke-width="2.5"/>
    <text x="475" y="58" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="19" font-weight="700" fill="#047857">Flip Orientation = Zero Waste</text>
    <!-- T upside down vs right way -->
    <g transform="translate(362,102)">
      <rect x="0" y="0" width="90" height="22" rx="4" fill="#dbe2ff" stroke="#1e2bfa" stroke-width="2"/>
      <rect x="32" y="22" width="26" height="60" rx="4" fill="#dbe2ff" stroke="#1e2bfa" stroke-width="2"/>
      <line x1="12" y1="24" x2="12" y2="82" stroke="#b45309" stroke-width="4" stroke-dasharray="5 4"/>
      <line x1="78" y1="24" x2="78" y2="82" stroke="#b45309" stroke-width="4" stroke-dasharray="5 4"/>
      <text x="45" y="112" text-anchor="middle" font-family="Inter, sans-serif" font-size="17" font-weight="700" fill="#b45309">Needs supports</text>
    </g>
    <text x="475" y="156" text-anchor="middle" font-family="Space Grotesk, sans-serif" font-size="28" font-weight="700" fill="#059669">→</text>
    <g transform="translate(502,102)">
      <rect x="32" y="0" width="26" height="60" rx="4" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
      <rect x="0" y="60" width="90" height="22" rx="4" fill="#d1fae5" stroke="#059669" stroke-width="2"/>
      <text x="45" y="112" text-anchor="middle" font-family="Inter, sans-serif" font-size="17" font-weight="700" fill="#047857">Self-supporting!</text>
    </g>
    <text x="475" y="274" text-anchor="middle" font-family="Inter, sans-serif" font-size="15.5" fill="#4b5563">Normal (columns) or Tree (branches)</text>
    <text x="475" y="302" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" font-weight="700" fill="#111111">Supports leave surface marks</text>
  </svg>
`, [
  ['~45° Rule', 'Steeper overhangs droop without help'],
  ['Normal vs Tree', 'Column grid vs branching supports'],
  ['Extra Cost', 'Adds material, time & cleanup marks'],
  ['Smart Orientation', 'Rotate part flat to skip supports']
]);
const s16Sup = s16.root.querySelector('.s16-sup');

// ── 17. SUMMARY & PLA CHEAT-SHEET ───────────────────────────────────────────
const s17 = mkScene(17, 'Summary & Practical PLA Recipe', 'Takeaways', `
  <div style="width:100%;height:100%;display:flex;flex-direction:column;gap:calc(16 * var(--kit-u))">
    <div class="mini-grid cols-3" style="flex:1">
      <div class="mcard accent s17-c">
        <b>CNC</b>
        <p>Programmed precision metal removal</p>
      </div>
      <div class="mcard s17-c">
        <b>Robotics</b>
        <p>Tireless, reprogrammable motion</p>
      </div>
      <div class="mcard good s17-c">
        <b>3D Printing</b>
        <p>Layer-by-layer build from CAD</p>
      </div>
    </div>
    <div class="mcard" style="padding:calc(18 * var(--kit-u)) calc(22 * var(--kit-u))">
      <b style="margin-bottom:calc(6 * var(--kit-u));color:#1e2bfa">PLA Reference Settings (0.4 mm Nozzle)</b>
      <div class="pill-row">
        <span class="pill active">Layer: 0.2 mm</span>
        <span class="pill">Infill: 20% Grid</span>
        <span class="pill">Speed: 50 mm/s</span>
        <span class="pill">Nozzle: 200°C</span>
        <span class="pill">Bed: 60°C</span>
      </div>
    </div>
  </div>
`, [
  ['Thinner Layers', 'More layers → smoother & slower'],
  ['Higher Infill', 'More material → stronger & heavier'],
  ['Balanced Speed', 'Too fast → vibration & defects'],
  ['Digital-to-Physical', 'Code + automation = exact parts']
]);
const s17Cards = [...s17.root.querySelectorAll('.s17-c')];
const s17Pills = [...s17.root.querySelectorAll('.pill')];

const SCENES = [s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17];

// Word cue lookup (resolved once at load, validated against project.json)
const CUES = [
  [W('intro', 'computers'), W('intro', 'robots'), W('intro', 'printers'), W('intro', 'accurate')],
  [W('conv', 'turning'), W('conv', 'drilling'), W('conv', 'handwheels'), W('conv', 'skill')],
  [W('cnc_what', 'computer'), W('cnc_what', 'controller'), W('cnc_what', 'automatically'), W('cnc_what', 'program')],
  [W('cnc_vs', 'manual'), W('cnc_vs', 'upfront'), W('cnc_vs', 'repeatability'), W('cnc_vs', 'complex')],
  [W('cnc_types', 'auto'), W('cnc_types', 'medical'), W('cnc_types', 'turning'), W('cnc_types', 'machining')],
  [W('cnc_parts', 'controller'), W('cnc_parts', 'motors'), W('cnc_parts', 'feedback'), W('cnc_parts', 'coordinates')],
  [W('cnc_gcode', 'programs'), W('cnc_gcode', 'straight'), W('cnc_gcode', 'spin'), W('cnc_gcode', 'spindle')],
  [W('cnc_pros', 'idle'), W('cnc_pros', 'fixtures'), W('cnc_pros', 'adapts'), W('cnc_pros', 'maintenance')],
  [W('robots_what', 'programmable'), W('robots_what', 'arms'), W('robots_what', 'repeat'), W('robots_what', 'reprogrammed')],
  [W('robots_apps', 'handle'), W('robots_apps', 'weld'), W('robots_apps', 'carve'), W('robots_apps', 'inspect')],
  [W('am_what', 'Additive'), W('am_what', 'printing'), W('am_what', 'layer'), W('am_what', 'model')],
  [W('am_tech', 'extrusion'), W('am_tech', 'plastic'), W('am_tech', 'photopolymerization'), W('am_tech', 'resin')],
  [W('am_steps', 'create'), W('am_steps', 'slice'), W('am_steps', 'print'), W('am_steps', 'post-process')],
  [W('slicer_layer', 'height'), W('slicer_layer', 'thin'), W('slicer_layer', 'smoother'), W('slicer_layer', 'thick')],
  [W('slicer_infill', 'Infill'), W('slicer_infill', 'strength'), W('slicer_infill', 'Grid'), W('slicer_infill', 'Gyroid')],
  [W('slicer_temp', 'speed'), W('slicer_temp', 'vibration'), W('slicer_temp', 'nozzle'), W('slicer_temp', 'bed')],
  [W('slicer_support', 'Overhangs'), W('slicer_support', 'supports'), W('slicer_support', 'orientation'), W('slicer_support', 'waste')],
  [W('summary', 'CNC'), W('summary', 'robotics'), W('summary', 'printing'), W('summary', 'physical')]
];

const subs = KIT.subtitles(IDS);

function render(t) {
  // Active chapter indicator + smooth continuous progress bar
  let activeIdx = 0;
  for (let i = 0; i < IDS.length; i++) if (t >= IN[i] + FADE * 0.4) activeIdx = i;
  chapPill.textContent = CHAPTERS[activeIdx][0];
  chapTitle.textContent = CHAPTERS[activeIdx][1];
  progFill.style.transform = `scaleX(${clamp(t / DUR, 0, 1)})`;

  SCENES.forEach((sc, i) => {
    const op = fade(i, t);
    KIT.show(sc.root, op);
    if (op > 0.001) setNotes(sc.items, CUES[i], t, IN[i]);
  });

  // Scene-specific continuous & word-synced animations
  if (fade(0, t) > 0.001) {
    s0Cards.forEach((c, k) => {
      const p = ent(t, CUES[0][Math.min(k, 2)] - 0.15, 0.5);
      c.style.opacity = p; c.style.transform = `translateY(${(1 - p) * 24 * u}px)`;
    });
    const swing = Math.sin(t * 2.2) * 10;
    s0Arm.setAttribute('transform', `rotate(${swing.toFixed(2)} 44 72)`);
    s0Layers.forEach((l, k) => { l.style.opacity = ent(t, CUES[0][2] + k * 0.25, 0.35); });
  }
  if (fade(1, t) > 0.001) {
    const latheOsc = Math.sin(t * 1.8) * 14;
    s1Tool.setAttribute('transform', `translate(${latheOsc.toFixed(2)} 0)`);
    const drillOsc = (Math.sin(t * 2.1) * 0.5 + 0.5) * 16;
    s1Drill.setAttribute('transform', `translate(0 ${drillOsc.toFixed(2)})`);
    const spinY = Math.sin(t * 6) * 4;
    s1Spin.setAttribute('transform', `translate(0 ${spinY.toFixed(2)})`);
  }
  if (fade(2, t) > 0.001) {
    const p1 = (t * 0.9) % 1, p2 = ((t * 0.9) + 0.5) % 1;
    s2P1.setAttribute('cx', (192 + p1 * 48).toFixed(1));
    s2P1.style.opacity = Math.sin(p1 * Math.PI).toFixed(2);
    s2P2.setAttribute('cx', (420 + p2 * 48).toFixed(1));
    s2P2.style.opacity = Math.sin(p2 * Math.PI).toFixed(2);
    s2Head.setAttribute('transform', `translate(${(Math.sin(t * 1.7) * 20).toFixed(1)} 0)`);
  }
  if (fade(3, t) > 0.001) {
    s3Rows.forEach((r, k) => {
      const p = ent(t, IN[3] + 0.12 + k * 0.18, 0.45);
      r.style.opacity = p; r.style.transform = `translateX(${(1 - p) * -28 * u}px)`;
    });
  }
  if (fade(4, t) > 0.001) {
    s4Apps.forEach((p, k) => { p.style.opacity = ent(t, V('cnc_types').start + k * 0.35, 0.4); });
    s4T1.setAttribute('transform', `translate(${(Math.sin(t * 2.0) * 18).toFixed(1)} 0)`);
    s4T2.setAttribute('transform', `translate(${(Math.cos(t * 1.8) * 22).toFixed(1)} 0)`);
  }
  if (fade(5, t) > 0.001) {
    const fp = (t * 0.45) % 1;
    const fy = 314 - fp * 216;
    s5Fb.setAttribute('cy', fy.toFixed(1));
    s5Fb.style.opacity = Math.sin(fp * Math.PI).toFixed(2);
  }
  if (fade(6, t) > 0.001) {
    s6Lines.forEach((cl, k) => {
      const p = ent(t, V('cnc_gcode').start + k * 0.45, 0.35);
      cl.style.opacity = p;
    });
    const pathP = clamp(seg(t, V('cnc_gcode').start, V('cnc_gcode').end), 0, 1);
    const tx = lerp(286, 112, pathP);
    const ty = tx > 236 ? 92 : tx > 176 ? 78 : 62;
    s6Tip.setAttribute('transform', `translate(${tx.toFixed(1)}, ${(ty + 24).toFixed(1)})`);
  }
  if (fade(7, t) > 0.001) {
    s7Cards.forEach((c, k) => {
      const p = ent(t, V('cnc_pros').start + k * 0.8, 0.5);
      c.style.opacity = p; c.style.transform = `translateY(${(1 - p) * 20 * u}px)`;
    });
  }
  if (fade(8, t) > 0.001) {
    const ph = Math.sin(t * 1.4);
    s8J1.setAttribute('transform', `translate(170,302) rotate(${(ph * 14).toFixed(2)})`);
    s8J2.setAttribute('transform', `translate(0,-130) rotate(${(ph * -18 + 10).toFixed(2)})`);
    s8J3.setAttribute('transform', `translate(170,0) rotate(${(ph * 22).toFixed(2)})`);
  }
  if (fade(9, t) > 0.001) {
    const appT = [
      W('robots_apps', 'handle'), W('robots_apps', 'load'), W('robots_apps', 'weld'),
      W('robots_apps', 'paint'), W('robots_apps', 'carve'), W('robots_apps', 'assemble')
    ];
    s9Cards.forEach((c, k) => {
      const p = ent(t, IN[9] + 0.06 + k * 0.14, 0.4);
      const active = t >= appT[k] - 0.1 && (k === s9Cards.length - 1 || t < appT[k + 1] - 0.1);
      c.style.opacity = p * (active ? 1 : 0.72);
      c.style.borderColor = active ? '#1e2bfa' : 'rgba(30,43,250,0.22)';
    });
  }
  if (fade(10, t) > 0.001) {
    s10Layers.forEach((ly, k) => {
      const at = V('am_what').start + k * 0.42;
      const p = ent(t, at, 0.35);
      ly.style.opacity = p;
      ly.style.transform = `scaleX(${p})`;
      ly.style.transformOrigin = '477px 0';
    });
  }
  if (fade(11, t) > 0.001) {
    s11Noz.setAttribute('transform', `translate(${(Math.sin(t * 3.2) * 32).toFixed(1)} 0)`);
    s11Fdm.style.opacity = 0.55 + 0.45 * (Math.sin(t * 2.5) * 0.5 + 0.5);
    s11Uv.style.opacity = 0.35 + 0.5 * (Math.sin(t * 4.0) * 0.5 + 0.5);
    s11Plat.setAttribute('transform', `translate(0 ${(Math.sin(t * 1.4) * -7).toFixed(1)})`);
  }
  if (fade(12, t) > 0.001) {
    s12Cards.forEach((c, k) => {
      const p = ent(t, IN[12] + 0.06 + k * 0.16, 0.45);
      const active = t >= CUES[12][k] - 0.12 && (k === 3 || t < CUES[12][k + 1] - 0.12);
      c.style.opacity = p * (active ? 1 : 0.76);
      c.style.transform = `translateY(${(1 - p) * 18 * u}px)`;
    });
  }
  if (fade(13, t) > 0.001) {
    const p1 = seg(t, CUES[13][1] - 0.2, CUES[13][1] + 1.4);
    const p2 = seg(t, CUES[13][0] - 0.2, CUES[13][0] + 1.4);
    const p3 = seg(t, CUES[13][3] - 0.2, CUES[13][3] + 1.2);
    s13A.forEach((r, k) => { r.style.opacity = clamp(p1 * s13A.length - k, 0, 1); });
    s13B.forEach((r, k) => { r.style.opacity = clamp(p2 * s13B.length - k, 0, 1); });
    s13C.forEach((r, k) => { r.style.opacity = clamp(p3 * s13C.length - k, 0, 1); });
  }
  if (fade(14, t) > 0.001) {
    const patT = [
      W('slicer_infill', 'Grid'), W('slicer_infill', 'Triangles'),
      W('slicer_infill', 'Gyroid'), W('slicer_infill', 'Honeycomb')
    ];
    s14Cards.forEach((c, k) => {
      const p = ent(t, IN[14] + 0.08 + k * 0.14, 0.4);
      const active = t >= patT[k] - 0.12 && (k === 3 || t < patT[k + 1] - 0.12);
      c.style.opacity = p * (active ? 1 : 0.78);
    });
  }
  if (fade(15, t) > 0.001) {
    s15Cards.forEach((c, k) => {
      const p = ent(t, IN[15] + 0.08 + k * 0.15, 0.45);
      c.style.opacity = p;
    });
    const ang = -35 + (Math.sin(t * 2.2) * 0.5 + 0.5) * 70;
    s15Needle.setAttribute('transform', `rotate(${ang.toFixed(1)} 70 70)`);
  }
  if (fade(16, t) > 0.001) {
    s16Sup.style.opacity = 0.4 + 0.6 * ent(t, CUES[16][1] - 0.1, 0.5);
  }
  if (fade(17, t) > 0.001) {
    s17Cards.forEach((c, k) => {
      const p = ent(t, IN[17] + 0.08 + k * 0.15, 0.45);
      c.style.opacity = p; c.style.transform = `translateY(${(1 - p) * 16 * u}px)`;
    });
    const pillIdx = Math.floor(Math.max(0, t - IN[17]) / 1.1) % s17Pills.length;
    s17Pills.forEach((p, k) => {
      p.style.transform = `scale(${k === pillIdx ? 1.04 : 1})`;
      p.className = k === pillIdx ? 'pill active' : 'pill';
    });
  }

  subs.set(t);
  const subOn = t >= V('intro').start - 0.15 && t <= V('summary').end + 0.35;
  KIT.show(subs.box, subOn ? 1 : 0);
  KIT.stage.style.opacity = 1 - seg(t, DUR - KIT.dur(0.5), DUR);
}

KIT.start({ dur: DUR, render });

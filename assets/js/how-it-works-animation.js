/* =============================================
   HYDRODOMUS — How it works: system flow animation
   Input-driven canvas: water inlet -> filter -> PEM electrolysis
   (O2 vented) -> filter+dryer -> low-P buffer (cycles fill/dump) ->
   pump -> high-P buffer (cycles slower) -> pump -> final tank
   (fills in steps as the high-P buffer dumps) -> 700 bar release.
   ============================================= */

(function () {
  const stage  = document.getElementById('chem-stage');
  const canvas = document.getElementById('chem-canvas');
  if (!stage || !canvas) return;

  const ctx = canvas.getContext('2d');
  const captionTitle = document.getElementById('chem-caption-title');
  const progressBar  = document.getElementById('chem-progress-bar');

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- colors ---------- */
  const COL_O    = '#E14B3C';
  const COL_H    = '#33B6E8';
  const COL_IMP  = '#8A7355';
  const COL_LINE = '#B7BDC7';
  const COL_TANK = '#0B1220';
  const COL_FILL = 'rgba(51,182,232,0.30)';
  const COL_FILL_HOT = 'rgba(20,78,224,0.34)';

  /* ---------- stage boundaries (0..1 across full progress) ---------- */
  const STAGES = [
    { key: 'how.s1', from: 0.00, to: 0.08 },
    { key: 'how.s2', from: 0.08, to: 0.16 },
    { key: 'how.s3', from: 0.16, to: 0.26 },
    { key: 'how.s4', from: 0.26, to: 0.34 },
    { key: 'how.s5', from: 0.34, to: 0.60 },
    { key: 'how.s6', from: 0.60, to: 0.88 },
    { key: 'how.s7', from: 0.88, to: 0.96 },
    { key: 'how.s8', from: 0.96, to: 1.00 },
  ];
  const [S1, S2, S3, S4, S5, S6, S7, S8] = STAGES;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function smoothstep(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

  let seed = 7;
  function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  function px(f) { return f * W; }
  function py(f) { return f * H; }

  /* ---------- pipeline layout (fractions of viewport) ---------- */
  const Y = 0.54;
  const INLET_X  = 0.03;
  const FILTER_X = 0.09;
  const PEM_X0 = 0.135, PEM_X1 = 0.215;
  const DRYER_X0 = 0.245, DRYER_X1 = 0.31;
  const BUF1_X0 = 0.345, BUF1_X1 = 0.415;
  const PUMP1_X0 = 0.445, PUMP1_X1 = 0.50;
  const BUF2_X0 = 0.53, BUF2_X1 = 0.605;
  const PUMP2_X0 = 0.635, PUMP2_X1 = 0.69;
  const TANK_X0 = 0.73, TANK_X1 = 0.85;
  const NOZZLE_X = 0.92;

  /* ---------- cascading buffer timing ----------
     Buffer 1 fills on its own clock then dumps to buffer 2 through
     pump 1, on repeat. Buffer 2 does NOT run its own independent
     clock — it only rises because buffer 1 keeps dumping into it,
     one step per buffer-1 cycle, until it's full, then it drains
     into the tank through pump 2. The tank works the same way one
     level up: it only rises because buffer 2 keeps dumping into it. */
  const BUF1_START = S4.to;              // 0.34 — once filtration+drying is done
  const BUF1_PERIOD = 0.045;             // fast cycle
  const BUF1_FILL_FRAC = 0.7;            // 70% filling, 30% dumping

  const TANK_END = S7.to;                // 0.96 — tank must be full by here
  const TANK_CYCLES = 4;                 // buffer-2 dumps needed to fill the tank
  const BUF2_PERIOD = (TANK_END - BUF1_START) / TANK_CYCLES; // 0.155
  const BUF1_DUMPS_PER_BUF2 = 3;         // buffer-1 dumps needed to fill buffer 2
  const BUF2_FILL_FRAC = (BUF1_DUMPS_PER_BUF2 * BUF1_PERIOD) / BUF2_PERIOD; // ~0.87

  function cyclic(t, start, period, fillFrac) {
    if (t < start) return { fill: 0, draining: false, drainLocal: 0 };
    const rel = (t - start) / period;
    const cycleIndex = Math.floor(rel);
    const phase = rel - cycleIndex;
    if (phase < fillFrac) return { fill: phase / fillFrac, draining: false, drainLocal: 0, cycleIndex, phase };
    const dp = (phase - fillFrac) / (1 - fillFrac);
    return { fill: 1 - dp, draining: true, drainLocal: dp, cycleIndex, phase };
  }

  /* cumulative number of buffer-1 dumps completed by time t (fractional
     mid-dump), used to drive buffer 2's rise — same shape cyclic() uses
     internally, exposed as a running total instead of a 0..1 fill. */
  function buf1CumAt(tt) {
    if (tt < BUF1_START) return 0;
    const rel = (tt - BUF1_START) / BUF1_PERIOD;
    const idx = Math.floor(rel);
    const phase = rel - idx;
    if (phase < BUF1_FILL_FRAC) return idx;
    return idx + (phase - BUF1_FILL_FRAC) / (1 - BUF1_FILL_FRAC);
  }

  /* buffer 2's state: rises in lockstep with buffer 1's dumps (not its
     own independent clock), then drains into the tank once full. */
  function buffer2State(t) {
    if (t < BUF1_START) return { fill: 0, draining: false, drainLocal: 0 };
    const rel = (t - BUF1_START) / BUF2_PERIOD;
    const cycleIndex = Math.floor(rel);
    const phase = rel - cycleIndex;
    if (phase < BUF2_FILL_FRAC) {
      const cycleStart = BUF1_START + cycleIndex * BUF2_PERIOD;
      const gained = buf1CumAt(t) - buf1CumAt(cycleStart);
      return { fill: clamp(gained / BUF1_DUMPS_PER_BUF2, 0, 1), draining: false, drainLocal: 0 };
    }
    const dp = (phase - BUF2_FILL_FRAC) / (1 - BUF2_FILL_FRAC);
    return { fill: 1 - dp, draining: true, drainLocal: dp };
  }

  /* cumulative number of buffer-2 dumps completed by time t — drives the tank. */
  function buf2CumAt(tt) {
    if (tt < BUF1_START) return 0;
    const rel = (tt - BUF1_START) / BUF2_PERIOD;
    const idx = Math.floor(rel);
    const phase = rel - idx;
    if (phase < BUF2_FILL_FRAC) return idx;
    return idx + (phase - BUF2_FILL_FRAC) / (1 - BUF2_FILL_FRAC);
  }

  function tankFillFn(t) {
    if (t < BUF1_START) return 0;
    if (t >= TANK_END) return 1;
    return clamp(buf2CumAt(t) / TANK_CYCLES, 0, 1);
  }

  /* ---------- flowing particle pools ---------- */
  const N_WATER = 9, N_IMP = 6, N_DRIED_IMP = 5, N_H2_B = 8, N_O2_VENT = 5, N_H2_C = 8, N_H2_D = 8, N_BURST = 26;
  let waterMol = [], imps = [], driedImps = [], h2B = [], o2Vent = [], h2C = [], h2D = [], burst = [];

  function build() {
    seed = 7;
    waterMol   = Array.from({ length: N_WATER },     (_, i) => ({ phase: i / N_WATER, jitter: rand() * Math.PI * 2 }));
    imps       = Array.from({ length: N_IMP },       (_, i) => ({ phase: (i + 0.4) / N_IMP, jitter: rand() * Math.PI * 2 }));
    driedImps  = Array.from({ length: N_DRIED_IMP }, (_, i) => ({ phase: (i + 0.3) / N_DRIED_IMP, jitter: rand() * Math.PI * 2 }));
    h2B        = Array.from({ length: N_H2_B },      (_, i) => ({ phase: i / N_H2_B, jitter: rand() * Math.PI * 2 }));
    o2Vent     = Array.from({ length: N_O2_VENT },   (_, i) => ({ phase: i / N_O2_VENT, sway: rand() * Math.PI * 2 }));
    h2C        = Array.from({ length: N_H2_C },      (_, i) => ({ phase: i / N_H2_C, jitter: rand() * Math.PI * 2 }));
    h2D        = Array.from({ length: N_H2_D },      (_, i) => ({ phase: i / N_H2_D, jitter: rand() * Math.PI * 2 }));
    burst      = Array.from({ length: N_BURST },     (_, i) => ({ phase: i / N_BURST, angle: (rand() - 0.5) * 0.9, speed: 0.6 + rand() * 0.6 }));
  }

  /* ---------- canvas sizing ---------- */
  function resize() {
    const rect = stage.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* ---------- progress driven directly by wheel / touch / keys ---------- */
  let progress = 0;
  const WHEEL_SENS = 1 / 3200;
  const TOUCH_SENS = 1 / 1400;
  const KEY_STEP = 0.07;

  function onWheel(e) { e.preventDefault(); progress = clamp(progress + e.deltaY * WHEEL_SENS, 0, 1); }
  let touchY = null;
  function onTouchStart(e) { touchY = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (touchY === null) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    progress = clamp(progress + (touchY - y) * TOUCH_SENS, 0, 1);
    touchY = y;
  }
  function onTouchEnd() { touchY = null; }
  function onKeyDown(e) {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { progress = clamp(progress + KEY_STEP, 0, 1); e.preventDefault(); }
    else if (['ArrowUp', 'PageUp'].includes(e.key)) { progress = clamp(progress - KEY_STEP, 0, 1); e.preventDefault(); }
    else if (e.key === 'Home') { progress = 0; e.preventDefault(); }
    else if (e.key === 'End') { progress = 1; e.preventDefault(); }
  }

  function bindInput() {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
  }

  function currentStageIndex(t) {
    for (let i = 0; i < STAGES.length; i++) { if (t < STAGES[i].to || i === STAGES.length - 1) return i; }
    return STAGES.length - 1;
  }
  let lastStageKey = '';
  function updateCaption(t) {
    const key = STAGES[currentStageIndex(t)].key;
    if (key !== lastStageKey) {
      lastStageKey = key;
      if (captionTitle) {
        captionTitle.dataset.i18n = key;
        captionTitle.textContent = window.t ? window.t(key) : key;
      }
    }
    if (progressBar) progressBar.style.width = (t * 100).toFixed(1) + '%';
  }

  /* ---------- drawing helpers ---------- */
  function circle(x, y, r, color, alpha) {
    if (alpha <= 0 || r <= 0) return;
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function bob(phase, amp) { return Math.sin(performance.now() / 900 + phase) * amp; }

  function roundRectPath(x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  }

  /* shared glass-panel container chrome: a soft gradient body fill behind
     whatever the box already draws (fill-level, PEM tint, dryer divider),
     plus a refined border + inner highlight instead of a flat stroke.
     Purely decorative — never touches what a box's fill represents. */
  function glassBody(x, y, w, h, r, alpha) {
    ctx.save();
    roundRectPath(x, y, w, h, r);
    ctx.clip();
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(11,18,32,0.05)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function glassBorder(x, y, w, h, r, alpha) {
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    roundRectPath(x + 1.2, y + 1.2, w - 2.4, h - 2.4, Math.max(r - 1.2, 0));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function label(text, x, y, opts) {
    opts = opts || {};
    ctx.font = (opts.weight || 600) + ' ' + (opts.size || 11) + 'px Inter, sans-serif';
    ctx.fillStyle = opts.color || '#63697A';
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = opts.alpha != null ? opts.alpha : 1;
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1;
  }

  /* draws a vessel (buffer/tank): glass body + outline + rising fill + label beneath */
  function vessel(x0, x1, halfH, fillFrac, active, labelText, hot) {
    const bx = px(x0), bw = px(x1) - px(x0);
    const by = py(Y) - py(halfH), bh = py(Y) + py(halfH) - by;
    const r = 12;
    glassBody(bx, by, bw, bh, r, active ? 0.9 : 0.5);
    ctx.save();
    roundRectPath(bx, by, bw, bh, r);
    ctx.clip();
    const fillH = bh * clamp(fillFrac, 0, 1);
    ctx.globalAlpha = active ? 1 : 0.4;
    ctx.fillStyle = hot ? COL_FILL_HOT : COL_FILL;
    ctx.fillRect(bx, by + bh - fillH, bw, fillH);
    ctx.restore();
    ctx.globalAlpha = active ? 0.85 : 0.35;
    ctx.strokeStyle = COL_TANK;
    ctx.lineWidth = 1.5;
    roundRectPath(bx, by, bw, bh, r);
    ctx.stroke();
    glassBorder(bx, by, bw, bh, r, active ? 0.85 : 0.35);
    ctx.globalAlpha = 1;
    label(labelText, bx + bw / 2, by + bh + 20, { alpha: active ? 0.85 : 0.4 });
  }

  function pipeSpan(x0, x1) {
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = COL_LINE;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px(x0), py(Y));
    ctx.lineTo(px(x1), py(Y));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* draws a pump/compressor icon: glass body + outline + piston, brighter while actively pumping */
  function pump(x0, x1, halfH, active, pumping, labelText, phaseSeed) {
    const bx = px(x0), bw = px(x1) - px(x0);
    const by = py(Y) - py(halfH), bh = py(Y) + py(halfH) - by;
    const r = 10;
    glassBody(bx, by, bw, bh, r, active ? 0.9 : 0.5);
    ctx.globalAlpha = active ? 0.85 : 0.35;
    ctx.strokeStyle = COL_TANK; ctx.lineWidth = 1.5;
    roundRectPath(bx, by, bw, bh, r); ctx.stroke();
    glassBorder(bx, by, bw, bh, r, active ? 0.85 : 0.35);
    const wob = pumping ? Math.sin(performance.now() / 90 + phaseSeed) * bw * 0.16 : 0;
    const pistonX = bx + bw * 0.5 + wob;
    ctx.beginPath();
    ctx.moveTo(pistonX, by + bh * 0.16);
    ctx.lineTo(pistonX, by + bh * 0.84);
    ctx.lineWidth = 3;
    ctx.strokeStyle = pumping ? '#144EE0' : (active ? COL_LINE : COL_LINE);
    ctx.globalAlpha = pumping ? 1 : (active ? 0.5 : 0.3);
    ctx.stroke();
    ctx.globalAlpha = 1;
    label(labelText, bx + bw / 2, by + bh + 20, { alpha: active ? 0.85 : 0.4 });
  }

  /* ---------- main draw ---------- */
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const scaleUnit = Math.min(W, H);
    const bond = scaleUnit * 0.016;
    const rO = scaleUnit * 0.0088;
    const rH = scaleUnit * 0.0058;
    const rImp = scaleUnit * 0.006;

    const filterActive = t >= S2.from;
    const pemActive     = t >= S3.from;
    const dryerActive   = t >= S4.from;
    const buf1Active    = t >= BUF1_START;
    const buf2Active    = t >= BUF1_START;
    const tankActive    = t >= BUF1_START;
    const dispenseActive = t >= S8.from;

    const buf1 = cyclic(t, BUF1_START, BUF1_PERIOD, BUF1_FILL_FRAC);
    const buf2 = buffer2State(t);
    const tankFill = tankFillFn(t);

    /* ---- static pipe backbone ---- */
    pipeSpan(INLET_X, PEM_X0);
    pipeSpan(PEM_X1, DRYER_X0);
    pipeSpan(DRYER_X1, BUF1_X0);
    pipeSpan(BUF1_X1, PUMP1_X0);
    pipeSpan(PUMP1_X1, BUF2_X0);
    pipeSpan(BUF2_X1, PUMP2_X0);
    pipeSpan(PUMP2_X1, TANK_X0);
    pipeSpan(TANK_X1, NOZZLE_X);

    /* ---- filter membrane (fixed component) ---- */
    ctx.globalAlpha = filterActive ? 0.6 : 0.3;
    ctx.strokeStyle = '#144EE0';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px(FILTER_X), py(Y) - py(0.09));
    ctx.lineTo(px(FILTER_X), py(Y) + py(0.09));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    label(window.t ? window.t('how.lbl.filter') : 'Filtre', px(FILTER_X), py(Y) + py(0.09) + 20, { alpha: filterActive ? 0.85 : 0.4 });

    /* ---- PEM block ---- */
    (function drawPem() {
      const bx = px(PEM_X0), bw = px(PEM_X1) - px(PEM_X0);
      const by = py(Y) - py(0.09), bh = py(Y) + py(0.09) - by;
      const r = 12;
      glassBody(bx, by, bw, bh, r, pemActive ? 0.9 : 0.5);
      ctx.globalAlpha = pemActive ? 0.12 : 0.05;
      ctx.fillStyle = '#144EE0';
      roundRectPath(bx, by, bw, bh, r); ctx.fill();
      ctx.globalAlpha = pemActive ? 0.85 : 0.35;
      ctx.strokeStyle = COL_TANK; ctx.lineWidth = 1.5;
      roundRectPath(bx, by, bw, bh, r); ctx.stroke();
      glassBorder(bx, by, bw, bh, r, pemActive ? 0.85 : 0.35);
      ctx.globalAlpha = 1;
      label('PEM', bx + bw / 2, by + bh / 2, { color: '#144EE0', weight: 700, size: 12, alpha: pemActive ? 1 : 0.4 });
      label(window.t ? window.t('how.lbl.pem') : 'Électrolyse', bx + bw / 2, by + bh + 20, { alpha: pemActive ? 0.85 : 0.4 });
    })();

    /* ---- filter + dryer block ---- */
    (function drawDryer() {
      const bx = px(DRYER_X0), bw = px(DRYER_X1) - px(DRYER_X0);
      const by = py(Y) - py(0.075), bh = py(Y) + py(0.075) - by;
      const r = 12;
      glassBody(bx, by, bw, bh, r, dryerActive ? 0.9 : 0.5);
      ctx.globalAlpha = dryerActive ? 0.10 : 0.04;
      ctx.fillStyle = COL_TANK;
      roundRectPath(bx, by, bw, bh, r); ctx.fill();
      ctx.globalAlpha = dryerActive ? 0.85 : 0.35;
      ctx.strokeStyle = COL_TANK; ctx.lineWidth = 1.5;
      roundRectPath(bx, by, bw, bh, r); ctx.stroke();
      glassBorder(bx, by, bw, bh, r, dryerActive ? 0.85 : 0.35);
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = COL_LINE; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(bx + bw * 0.5, by + bh * 0.15); ctx.lineTo(bx + bw * 0.5, by + bh * 0.85); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      label(window.t ? window.t('how.lbl.dryer') : 'Filtre + séchage', bx + bw / 2, by + bh + 20, { alpha: dryerActive ? 0.85 : 0.4 });
    })();

    /* ---- pumps ---- */
    pump(PUMP1_X0, PUMP1_X1, 0.06, buf1Active, buf1.draining, window.t ? window.t('how.lbl.compressor') : 'Compresseur', 0);
    pump(PUMP2_X0, PUMP2_X1, 0.06, buf2Active, buf2.draining, window.t ? window.t('how.lbl.pump2') : 'Pompe HP', 3.1);

    /* ---- vessels ---- */
    vessel(BUF1_X0, BUF1_X1, 0.09, buf1.fill, buf1Active, window.t ? window.t('how.lbl.buf1') : 'Tampon BP', false);
    vessel(BUF2_X0, BUF2_X1, 0.10, buf2.fill, buf2Active, window.t ? window.t('how.lbl.buf2') : 'Tampon HP', true);
    vessel(TANK_X0, TANK_X1, 0.16, tankFill, tankActive, window.t ? window.t('how.lbl.tank') : 'Réservoir', true);

    if (t >= S7.to) {
      const bx = px(TANK_X0), bw = px(TANK_X1) - px(TANK_X0);
      const by = py(Y) - py(0.16);
      const a = smoothstep(S7.to, S7.to + 0.02, t);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#144EE0';
      roundRectPath(bx + bw / 2 - 30, by - 26, 60, 20, 5); ctx.fill();
      label('700 bar', bx + bw / 2, by - 16, { color: '#fff', size: 10, weight: 700, alpha: 1 });
      ctx.globalAlpha = 1;
    }

    /* ---- flowing water molecules: inlet -> PEM (continuous) ---- */
    const segA0 = INLET_X, segA1 = PEM_X0;
    const filterFrac = (FILTER_X - segA0) / (segA1 - segA0);
    const FLOW_A = 5;
    for (let i = 0; i < waterMol.length; i++) {
      const p = waterMol[i];
      const f = (t * FLOW_A + p.phase) % 1;
      const x = px(lerp(segA0, segA1, f));
      const y = py(Y) + bob(p.jitter, 3);
      const ang = p.jitter;
      circle(x, y, rO, COL_O, 1);
      circle(x + Math.cos(ang) * bond, y + Math.sin(ang) * bond, rH, COL_H, 1);
      circle(x + Math.cos(ang + 2.1) * bond, y + Math.sin(ang + 2.1) * bond, rH, COL_H, 1);
    }
    for (let i = 0; i < imps.length; i++) {
      const p = imps[i];
      const f = (t * FLOW_A + p.phase) % 1;
      const x = px(lerp(segA0, segA1, f));
      const y = py(Y) + bob(p.jitter, 4);
      const alpha = (filterActive && f >= filterFrac) ? 0 : 1;
      circle(x, y, rImp, COL_IMP, alpha);
    }

    /* ---- O2 vented upward from PEM (continuous once active) ---- */
    if (pemActive) {
      const ventX = px((PEM_X0 + PEM_X1) / 2);
      const localT = clamp((t - S3.from) / Math.max(0.001, 1 - S3.from), 0, 1);
      for (let i = 0; i < o2Vent.length; i++) {
        const p = o2Vent[i];
        const f = (localT * 3 + p.phase) % 1;
        const yTop = py(Y) - py(0.09);
        const y = yTop - f * py(0.30);
        const x = ventX + Math.sin(f * 6 + p.sway) * 8;
        const alpha = (1 - f) * 0.85;
        circle(x, y, rO * 0.85, COL_O, alpha);
        circle(x + 6, y, rO * 0.6, COL_O, alpha * 0.8);
      }
    }

    /* ---- H2 flow: PEM -> dryer -> buffer1 (continuous), impurities fade at dryer ---- */
    if (pemActive) {
      const segB0 = PEM_X1, segB1 = BUF1_X0;
      const dryerFrac = (DRYER_X1 - segB0) / (segB1 - segB0);
      const localT = clamp((t - S3.from) / Math.max(0.001, 1 - S3.from), 0, 1);
      const FLOW_B = 6;
      for (let i = 0; i < h2B.length; i++) {
        const p = h2B[i];
        const f = (localT * FLOW_B + p.phase) % 1;
        const cx = px(lerp(segB0, segB1, f));
        const cy = py(Y) + bob(p.jitter, 2.5);
        circle(cx - bond * 0.55, cy, rH, COL_H, 1);
        circle(cx + bond * 0.55, cy, rH, COL_H, 1);
      }
      for (let i = 0; i < driedImps.length; i++) {
        const p = driedImps[i];
        const f = (localT * FLOW_B + p.phase) % 1;
        const cx = px(lerp(segB0, segB1, f));
        const cy = py(Y) + bob(p.jitter, 4);
        const alpha = (dryerActive && f >= dryerFrac) ? 0 : 1;
        circle(cx, cy, rImp * 0.85, COL_IMP, alpha * 0.8);
      }
    }

    /* ---- H2 burst: buffer1 -> pump1 -> buffer2, only while buffer1 is dumping ---- */
    if (buf1.draining) {
      const segC0 = BUF1_X1, segC1 = BUF2_X0;
      const pumpFrac = (PUMP1_X1 - segC0) / (segC1 - segC0);
      for (let i = 0; i < h2C.length; i++) {
        const p = h2C[i];
        const f = (buf1.drainLocal * 1.4 + p.phase) % 1;
        if (f > buf1.drainLocal + 0.4) continue; // hasn't left the buffer yet this cycle
        const cx = px(lerp(segC0, segC1, f));
        const cy = py(Y) + bob(p.jitter, 2.5);
        const sep = f >= pumpFrac ? bond * 0.34 : bond * 0.55;
        circle(cx - sep, cy, rH, COL_H, 1);
        circle(cx + sep, cy, rH, COL_H, 1);
      }
    }

    /* ---- H2 burst: buffer2 -> pump2 -> tank, only while buffer2 is dumping ---- */
    if (buf2.draining) {
      const segD0 = BUF2_X1, segD1 = TANK_X0;
      const pumpFrac = (PUMP2_X1 - segD0) / (segD1 - segD0);
      for (let i = 0; i < h2D.length; i++) {
        const p = h2D[i];
        const f = (buf2.drainLocal * 1.4 + p.phase) % 1;
        if (f > buf2.drainLocal + 0.4) continue;
        const cx = px(lerp(segD0, segD1, f));
        const cy = py(Y) + bob(p.jitter, 2);
        const sep = f >= pumpFrac ? bond * 0.26 : bond * 0.5;
        circle(cx - sep, cy, rH * 0.9, COL_H, 1);
        circle(cx + sep, cy, rH * 0.9, COL_H, 1);
      }
    }

    /* ---- nozzle dispensing burst: tank is full, 700 bar release ---- */
    if (dispenseActive) {
      const localT = clamp((t - S8.from) / (S8.to - S8.from), 0, 1);
      const originX = px(NOZZLE_X), originY = py(Y);
      for (let i = 0; i < burst.length; i++) {
        const p = burst[i];
        const f = (localT * 2.4 + p.phase) % 1;
        const dist = f * scaleUnit * 0.16 * p.speed;
        const x = originX + Math.cos(p.angle) * dist + dist * 0.9;
        const y = originY + Math.sin(p.angle) * dist * 0.6;
        const alpha = (1 - f) * localT;
        circle(x, y, rH * 0.85, COL_H, alpha);
      }
    }
  }

  /* ---------- loop ---------- */
  function loop() { draw(progress); updateCaption(progress); requestAnimationFrame(loop); }

  function init() {
    build();
    resize();
    bindInput();
    window.addEventListener('resize', () => { resize(); }, { passive: true });
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

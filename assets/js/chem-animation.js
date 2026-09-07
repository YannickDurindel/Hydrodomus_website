/* =============================================
   HYDRODOMUS — Home page chemical process animation
   Input-driven canvas: water -> filtration -> electrolysis
   -> O2 release -> drying -> final filtration -> compression
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
  const COL_O   = '#E14B3C';
  const COL_H   = '#33B6E8';
  const COL_IMP = '#8A7355';
  const COL_TANK = 'rgba(11,18,32,0.35)';

  /* ---------- stage boundaries (0..1 across full progress) ---------- */
  const STAGES = [
    { key: 'chem.s1', from: 0.00, to: 0.12 },
    { key: 'chem.s2', from: 0.12, to: 0.28 },
    { key: 'chem.s3', from: 0.28, to: 0.50 },
    { key: 'chem.s4', from: 0.50, to: 0.62 },
    { key: 'chem.s5', from: 0.62, to: 0.72 },
    { key: 'chem.s6', from: 0.72, to: 0.82 },
    { key: 'chem.s7', from: 0.82, to: 1.00 },
  ];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function localT(t, from, to) { return clamp((t - from) / (to - from), 0, 1); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  /* Deterministic pseudo-random so layout doesn't jump between reloads oddly */
  let seed = 42;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  /* ---------- field mapping: normalized [0,1] -> px ---------- */
  const FIELD = { x0: 0.015, x1: 0.985, y0: 0.02, y1: 0.98 };
  function fx(nx) { return (FIELD.x0 + (FIELD.x1 - FIELD.x0) * nx) * W; }
  function fy(ny) { return (FIELD.y0 + (FIELD.y1 - FIELD.y0) * ny) * H; }

  /* ---------- particle counts (~10x the original set) ---------- */
  const NUM_MOL    = 140; // must be even
  const IMP_COUNT   = 90;
  const GHOST_COUNT = 40;
  const IMP2_COUNT  = 60;

  let molecules = [], impurities = [], ghosts = [], impurities2 = [];

  function buildMolecules() {
    molecules = [];
    const cols = 20, rows = 7;
    const jitterX = (1 / cols) * 0.42, jitterY = (1 / rows) * 0.42;
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const nx = clamp((c + 0.5) / cols + (rand() - 0.5) * jitterX, 0.01, 0.99);
        const ny = clamp((r + 0.5) / rows + (rand() - 0.5) * jitterY, 0.015, 0.985);
        const angle = rand() * Math.PI * 2;
        molecules.push({
          id: i, nx, ny,
          jitterPhase: rand() * Math.PI * 2,
          jitterPhase2: rand() * Math.PI * 2,
          hAngle1: angle,
          hAngle2: angle + 2.05, // bent H2O shape (~104.5deg)
          rOx: 0, rOy: 0, rH1x: 0, rH1y: 0, rH2x: 0, rH2y: 0,
        });
        i++;
      }
    }
  }

  function buildImpurities() {
    impurities = [];
    for (let i = 0; i < IMP_COUNT; i++) {
      impurities.push({
        nx: 0.02 + rand() * 0.96,
        ny: 0.03 + rand() * 0.94,
        jitterPhase: rand() * Math.PI * 2,
        r: 1.8 + rand() * 1.6,
        rx: 0, ry: 0,
      });
    }
  }

  function buildGhosts() {
    ghosts = [];
    for (let i = 0; i < GHOST_COUNT; i++) {
      ghosts.push({
        nx: 0.02 + rand() * 0.96,
        ny: 0.02 + rand() * 0.96,
        angle: rand() * Math.PI * 2,
        rx: 0, ry: 0,
      });
    }
  }

  function buildImpurities2() {
    impurities2 = [];
    for (let i = 0; i < IMP2_COUNT; i++) {
      impurities2.push({
        nx: 0.05 + rand() * 0.9,
        ny: 0.04 + rand() * 0.92,
        jitterPhase: rand() * Math.PI * 2,
        r: 1.5 + rand() * 1.1,
        rx: 0, ry: 0,
      });
    }
  }

  /* sunflower packing for compression targets */
  function sunflower(n, cx, cy, R) {
    const pts = [];
    const golden = 2.399963;
    for (let k = 0; k < n; k++) {
      const r = R * Math.sqrt((k + 0.5) / n);
      const theta = k * golden;
      pts.push({ x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) });
    }
    return pts;
  }

  function rebuild() {
    seed = 42;
    buildMolecules();
    buildImpurities();
    buildGhosts();
    buildImpurities2();
  }

  /* ---------- canvas sizing ---------- */
  function resize() {
    const rect = stage.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    updateCaptionRect();
  }

  /* ---------- progress driven directly by wheel / touch / keys ----------
     The page itself never scrolls — input gestures move the story instead. */
  let progress = 0;
  const WHEEL_SENS = 1 / 3200;
  const TOUCH_SENS = 1 / 1400;
  const KEY_STEP = 0.07;

  function onWheel(e) {
    e.preventDefault();
    progress = clamp(progress + e.deltaY * WHEEL_SENS, 0, 1);
  }

  let touchY = null;
  function onTouchStart(e) { touchY = e.touches[0].clientY; }
  function onTouchMove(e) {
    if (touchY === null) return;
    e.preventDefault();
    const y = e.touches[0].clientY;
    const delta = touchY - y;
    touchY = y;
    progress = clamp(progress + delta * TOUCH_SENS, 0, 1);
  }
  function onTouchEnd() { touchY = null; }

  function onKeyDown(e) {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
      progress = clamp(progress + KEY_STEP, 0, 1); e.preventDefault();
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
      progress = clamp(progress - KEY_STEP, 0, 1); e.preventDefault();
    } else if (e.key === 'Home') {
      progress = 0; e.preventDefault();
    } else if (e.key === 'End') {
      progress = 1; e.preventDefault();
    }
  }

  /* ---------- mouse-reactive particles: instant opposition force, eased ---------- */
  let mouseX = null, mouseY = null;
  function onMouseMove(e) {
    const rect = stage.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }
  function onMouseGone(e) {
    if (!e.relatedTarget && !e.toElement) { mouseX = null; mouseY = null; }
  }

  const REPEL_RADIUS_FRAC = 0.10;
  const REPEL_STRENGTH_FRAC = 0.05;
  const REPEL_EASE = 0.16;

  /* ---------- keep the bottom caption clear: particles flow around it,
     never sit on top — a soft rectangular push-away field, not a hard
     cut. The mid-screen headline is left alone on purpose: it just sits
     above the canvas (z-index) and lets particles pass underneath. ---------- */
  let avoidRects = [];
  const TEXT_ZONES = [
    { el: captionTitle, pad: 6, falloff: 16 },
  ];

  function updateAvoidRects() {
    if (!stage) { avoidRects = []; return; }
    const stageRect = stage.getBoundingClientRect();
    avoidRects = TEXT_ZONES.map((zone) => {
      if (!zone.el) return null;
      const r = zone.el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return null;
      return {
        x0: r.left - stageRect.left - zone.pad,
        y0: r.top - stageRect.top - zone.pad,
        x1: r.right - stageRect.left + zone.pad,
        y1: r.bottom - stageRect.top + zone.pad,
        falloff: zone.falloff,
      };
    }).filter(Boolean);
  }
  // kept for existing call sites (resize, caption-change, lang switch)
  function updateCaptionRect() { updateAvoidRects(); }

  function combinedForce(x, y, radius, strength) {
    let tx = 0, ty = 0;
    if (mouseX !== null) {
      const dx = x - mouseX, dy = y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
      if (dist < radius) {
        const f = 1 - dist / radius;
        tx += (dx / dist) * f * strength;
        ty += (dy / dist) * f * strength;
      }
    }
    for (let i = 0; i < avoidRects.length; i++) {
      const rect = avoidRects[i];
      const cx = clamp(x, rect.x0, rect.x1);
      const cy = clamp(y, rect.y0, rect.y1);
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < rect.falloff) {
        let nx, ny;
        if (dist > 0.0001) { nx = dx / dist; ny = dy / dist; }
        else {
          const toTop = y - rect.y0, toBottom = rect.y1 - y;
          nx = 0; ny = toTop < toBottom ? -1 : 1;
        }
        const push = rect.falloff - dist;
        tx += nx * push;
        ty += ny * push;
      }
    }
    return { tx, ty };
  }

  function repelUpdate(state, xKey, yKey, x, y, radius, strength) {
    const { tx, ty } = combinedForce(x, y, radius, strength);
    state[xKey] = lerp(state[xKey], tx, REPEL_EASE);
    state[yKey] = lerp(state[yKey], ty, REPEL_EASE);
    return { x: x + state[xKey], y: y + state[yKey] };
  }

  function bindInput() {
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseout', onMouseGone, { passive: true });
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.addEventListener('click', () => updateCaptionRect());
    });
  }

  function currentStageIndex(t) {
    for (let i = 0; i < STAGES.length; i++) {
      if (t < STAGES[i].to || i === STAGES.length - 1) return i;
    }
    return STAGES.length - 1;
  }

  let lastStageKey = '';
  function updateCaption(progressT) {
    const idx = currentStageIndex(progressT);
    const key = STAGES[idx].key;
    if (key !== lastStageKey) {
      lastStageKey = key;
      if (captionTitle) {
        captionTitle.dataset.i18n = key;
        captionTitle.textContent = window.t ? window.t(key) : key;
        updateCaptionRect();
      }
    }
    if (progressBar) progressBar.style.width = (progressT * 100).toFixed(1) + '%';
  }

  /* ---------- drawing helpers ---------- */
  function circle(x, y, r, color, alpha) {
    if (alpha <= 0 || r <= 0) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function bob(phase, amp) {
    return Math.sin(performance.now() / 900 + phase) * amp;
  }

  function membraneSweep(lineX) {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#144EE0';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lineX, fy(0));
    ctx.lineTo(lineX, fy(1));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  /* particles don't drift toward the filter — a line sweeps left -> right
     and only "grabs" (removes) a particle the instant it passes over it */
  function sweepCapture(px, lineX, captureWidth) {
    const d = lineX - px;
    const lt = clamp(d / captureWidth + 0.5, 0, 1);
    const popT = 1 - Math.min(1, Math.abs(lt - 0.5) * 2);
    return { alpha: 1 - easeInOut(lt), pop: popT };
  }

  /* ---------- main draw ---------- */
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    const scaleUnit = Math.min(W, H);
    const bond = scaleUnit * 0.016;
    const rO = scaleUnit * 0.0078;
    const rH = scaleUnit * 0.0051;
    const captureWidth = scaleUnit * 0.05;
    const REPEL_RADIUS = scaleUnit * REPEL_RADIUS_FRAC;
    const REPEL_STRENGTH = scaleUnit * REPEL_STRENGTH_FRAC;

    const s1 = STAGES[0], s2 = STAGES[1], s3 = STAGES[2],
          s4 = STAGES[3], s5 = STAGES[4], s6 = STAGES[5], s7 = STAGES[6];

    const t2 = localT(t, s2.from, s2.to);
    const t3 = localT(t, s3.from, s3.to);
    const t4 = localT(t, s4.from, s4.to);
    const t5 = localT(t, s5.from, s5.to);
    const t6 = localT(t, s6.from, s6.to);
    const t7 = localT(t, s7.from, s7.to);

    /* ---- sweeping membranes (first + final filtration) ---- */
    let lineX2 = null, lineX6 = null;
    if (t >= s2.from && t <= s2.to) {
      lineX2 = fx(lerp(-0.06, 1.06, t2));
      membraneSweep(lineX2);
    }
    if (t >= s6.from && t <= s6.to) {
      lineX6 = fx(lerp(-0.06, 1.06, t6));
      membraneSweep(lineX6);
    }

    /* ---- compression targets: the tank spans most of the page.
       Three sequential squeezes, each tighter than the last — the final
       one represents high pressure, well beyond the first two. ---- */
    const R1 = scaleUnit * 0.44; // loose gather
    const R2 = scaleUnit * 0.31; // medium
    const R3 = scaleUnit * 0.19; // high pressure — as tight as it gets
    const compCenter = { x: fx(0.5), y: fy(0.5) };
    const layout1 = sunflower(NUM_MOL, compCenter.x, compCenter.y, R1);
    const layout2 = sunflower(NUM_MOL, compCenter.x, compCenter.y, R2);
    const layout3 = sunflower(NUM_MOL, compCenter.x, compCenter.y, R3);

    // compression phases within stage 7: squeeze -> pulse -> squeeze -> pulse -> squeeze
    const P1 = 0.24, PU1 = 0.32, P2 = 0.56, PU2 = 0.64; // breakpoints, then P3 runs to 1
    const cA = clamp(t7 / P1, 0, 1);                          // spread -> R1
    const cPulse1 = clamp((t7 - P1) / (PU1 - P1), 0, 1);
    const cB = clamp((t7 - PU1) / (P2 - PU1), 0, 1);          // R1 -> R2
    const cPulse2 = clamp((t7 - P2) / (PU2 - P2), 0, 1);
    const cC = clamp((t7 - PU2) / (1 - PU2), 0, 1);           // R2 -> R3 (high pressure)
    let pulse = 1;
    if (t7 > P1 && t7 < PU1) pulse = 1 + Math.sin(cPulse1 * Math.PI) * 0.14;
    else if (t7 > P2 && t7 < PU2) pulse = 1 + Math.sin(cPulse2 * Math.PI) * 0.20;

    /* ---- impurities: present from the start, grabbed by the sweep (stage 2) ---- */
    for (let i = 0; i < impurities.length; i++) {
      const im = impurities[i];
      let x = fx(im.nx) + bob(im.jitterPhase, 3);
      let y = fy(im.ny) + bob(im.jitterPhase + 1, 3);
      let alpha = 1, r = im.r;
      if (t > s2.to) {
        alpha = 0;
      } else if (lineX2 !== null) {
        const cap = sweepCapture(x, lineX2, captureWidth);
        alpha = cap.alpha;
        r = im.r * (1 + cap.pop * 0.7);
      }
      const p = repelUpdate(im, 'rx', 'ry', x, y, REPEL_RADIUS, REPEL_STRENGTH);
      circle(p.x, p.y, r, COL_IMP, alpha);
    }

    /* ---- trace impurities: present from the start, grabbed by the sweep (stage 6) ---- */
    for (let i = 0; i < impurities2.length; i++) {
      const im = impurities2[i];
      let x = fx(im.nx) + bob(im.jitterPhase, 2.5);
      let y = fy(im.ny) + bob(im.jitterPhase + 1, 2.5);
      let alpha = 1, r = im.r;
      if (t > s6.to) {
        alpha = 0;
      } else if (lineX6 !== null) {
        const cap = sweepCapture(x, lineX6, captureWidth);
        alpha = cap.alpha;
        r = im.r * (1 + cap.pop * 0.7);
      }
      const p = repelUpdate(im, 'rx', 'ry', x, y, REPEL_RADIUS, REPEL_STRENGTH);
      circle(p.x, p.y, r, COL_IMP, alpha);
    }

    /* ---- drying ghosts: present from the start, evaporate during stage 5 ---- */
    {
      let ga = 1;
      if (t >= s5.from) ga = 1 - easeInOut(t5);
      if (t > s5.to) ga = 0;
      const gscale = t >= s5.from ? 1 - t5 * 0.5 : 1;
      if (ga > 0) {
        for (let i = 0; i < ghosts.length; i++) {
          const g = ghosts[i];
          const cx0 = fx(g.nx) + bob(g.angle, 2);
          const cy0 = fy(g.ny) + bob(g.angle + 1, 2);
          const p = repelUpdate(g, 'rx', 'ry', cx0, cy0, REPEL_RADIUS, REPEL_STRENGTH);
          const alpha = ga * 0.55;
          circle(p.x, p.y, rO * 0.8 * gscale, COL_O, alpha * 0.7);
          circle(p.x + Math.cos(g.angle) * bond * gscale, p.y + Math.sin(g.angle) * bond * gscale, rH * gscale, COL_H, alpha * 0.7);
          circle(p.x - Math.cos(g.angle) * bond * gscale, p.y + Math.sin(g.angle + 1) * bond * gscale, rH * gscale, COL_H, alpha * 0.7);
        }
      }
    }

    /* ---- water molecules / split atoms ---- */
    for (let i = 0; i < molecules.length; i++) {
      const m = molecules[i];
      const partnerIdx = (i % 2 === 0) ? i + 1 : i - 1;
      const partner = molecules[partnerIdx];

      const baseX = fx(m.nx) + bob(m.jitterPhase, 2.5);
      const baseY = fy(m.ny) + bob(m.jitterPhase2, 2.5);
      const partnerBaseX = fx(partner.nx);
      const partnerBaseY = fy(partner.ny);

      // O2 midpoint between this molecule and its partner
      const midX = (baseX + partnerBaseX) / 2;
      const midY = (baseY + partnerBaseY) / 2;
      const oSide = (i % 2 === 0) ? -1 : 1;

      // H positions: bent water shape -> paired H2 sitting at molecule's own spot
      const wetH1x = baseX + Math.cos(m.hAngle1) * bond;
      const wetH1y = baseY + Math.sin(m.hAngle1) * bond;
      const wetH2x = baseX + Math.cos(m.hAngle2) * bond;
      const wetH2y = baseY + Math.sin(m.hAngle2) * bond;
      const h2H1x = baseX - bond * 0.55, h2H1y = baseY;
      const h2H2x = baseX + bond * 0.55, h2H2y = baseY;

      const eT = easeInOut(t3);
      let Ox = lerp(baseX, midX + oSide * bond * 0.55, eT);
      let Oy = lerp(baseY, midY + (i % 2 === 0 ? -bond * 0.15 : bond * 0.15), eT);
      let H1x = lerp(wetH1x, h2H1x, eT), H1y = lerp(wetH1y, h2H1y, eT);
      let H2x = lerp(wetH2x, h2H2x, eT), H2y = lerp(wetH2y, h2H2y, eT);

      let oAlpha = 1;
      let oR = rO, h1R = rH, h2R = rH;

      // stage 4: release O2 upward and fade
      if (t >= s4.from) {
        const rel = easeOut(t4);
        Oy -= rel * H * 0.55;
        oAlpha = 1 - rel;
      }
      if (t > s4.to) oAlpha = 0;

      // stage 7: compression of H2 pairs — three sequential squeezes
      if (t >= s7.from) {
        const pairIdx = i;
        const p1 = layout1[pairIdx], p2 = layout2[pairIdx], p3 = layout3[pairIdx];
        let cx, cy;
        const sepBase = bond * 0.55;
        let sep;
        if (t7 < P1) {
          cx = lerp(H1x, p1.x, easeInOut(cA));
          cy = lerp(H1y, p1.y, easeInOut(cA));
          sep = sepBase;
        } else if (t7 < PU1) {
          cx = p1.x; cy = p1.y; sep = sepBase;
        } else if (t7 < P2) {
          cx = lerp(p1.x, p2.x, easeInOut(cB));
          cy = lerp(p1.y, p2.y, easeInOut(cB));
          sep = lerp(sepBase, sepBase * 0.62, easeInOut(cB));
        } else if (t7 < PU2) {
          cx = p2.x; cy = p2.y; sep = sepBase * 0.62;
        } else {
          cx = lerp(p2.x, p3.x, easeInOut(cC));
          cy = lerp(p2.y, p3.y, easeInOut(cC));
          sep = lerp(sepBase * 0.62, sepBase * 0.4, easeInOut(cC));
        }
        H1x = cx - sep; H1y = cy;
        H2x = cx + sep; H2y = cy;
        h1R = rH * pulse; h2R = rH * pulse;
      }

      if (oAlpha > 0) {
        const op = repelUpdate(m, 'rOx', 'rOy', Ox, Oy, REPEL_RADIUS, REPEL_STRENGTH);
        circle(op.x, op.y, oR, COL_O, oAlpha);
      }
      const h1p = repelUpdate(m, 'rH1x', 'rH1y', H1x, H1y, REPEL_RADIUS, REPEL_STRENGTH);
      const h2p = repelUpdate(m, 'rH2x', 'rH2y', H2x, H2y, REPEL_RADIUS, REPEL_STRENGTH);
      circle(h1p.x, h1p.y, h1R, COL_H, 1);
      circle(h2p.x, h2p.y, h2R, COL_H, 1);
    }

    /* ---- compression chamber: shrinks through all three squeezes.
       A glass-panel container (soft gradient fill + inner highlight)
       instead of a bare stroke, so it reads as an intentional vessel
       rather than a debug rectangle — sizing/timing untouched. ---- */
    if (t >= s7.from) {
      let rr;
      if (t7 < P1) rr = R1;
      else if (t7 < PU1) rr = R1;
      else if (t7 < P2) rr = lerp(R1, R2, easeInOut(cB));
      else if (t7 < PU2) rr = R2;
      else rr = lerp(R2, R3, easeInOut(cC));
      const boxA = clamp(t7 / 0.15, 0, 1);
      const bx = compCenter.x - rr - 16, by = compCenter.y - rr - 16, bw = (rr + 16) * 2, bh = (rr + 16) * 2;
      const chamberPath = (inset) => {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx + inset, by + inset, bw - inset * 2, bh - inset * 2, 20 - inset);
        else ctx.rect(bx + inset, by + inset, bw - inset * 2, bh - inset * 2);
      };

      ctx.save();
      chamberPath(0);
      ctx.clip();
      const grad = ctx.createLinearGradient(bx, by, bx, by + bh);
      grad.addColorStop(0, 'rgba(255,255,255,0.5)');
      grad.addColorStop(0.55, 'rgba(20,78,224,0.07)');
      grad.addColorStop(1, 'rgba(11,18,32,0.10)');
      ctx.globalAlpha = boxA;
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, bw, bh);
      ctx.restore();

      ctx.globalAlpha = boxA * 0.6;
      ctx.strokeStyle = COL_TANK;
      ctx.lineWidth = 1.5;
      chamberPath(0);
      ctx.stroke();

      ctx.globalAlpha = boxA * 0.5;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      chamberPath(1.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- loop ---------- */
  function loop() {
    draw(progress);
    updateCaption(progress);
    requestAnimationFrame(loop);
  }

  function init() {
    rebuild();
    resize();
    bindInput();
    window.addEventListener('resize', () => { resize(); }, { passive: true });
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* =========================================================================
   FedPCD interactive figure
   The gradient-space panel of Fig. 2: three unit client directions, their
   normalized average g0 (the FedAvg direction), one half-space per client,
   and the FedPCD direction d* = the projection of g0 onto their intersection.
   The program is solved exactly by active-set enumeration and checked against
   the numbers of the paper's worked example on load.
   ========================================================================= */
(function () {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var DEG = Math.PI / 180;
  var PAPER = { ang: [10, 45, 155], tau: 0.25 };   // the example of Fig. 2
  var AGREE = { ang: [35, 60, 85], tau: 0.25 };    // the average already satisfies everyone
  var SPLIT = { ang: [20, 150, 165], tau: 0.25 };  // one client against two
  var ANG_MIN = 10, ANG_MAX = 170;                 // all clients in one open half-plane: always feasible

  /* ---------------- vector helpers ---------------- */
  function V(x, y) { return { x: x, y: y }; }
  function add(a, b) { return V(a.x + b.x, a.y + b.y); }
  function sub(a, b) { return V(a.x - b.x, a.y - b.y); }
  function mul(a, s) { return V(a.x * s, a.y * s); }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function nrm(a) { return Math.hypot(a.x, a.y); }
  function unit(a) { var n = nrm(a); return n < 1e-9 ? V(1, 0) : V(a.x / n, a.y / n); }
  function fromAng(deg) { return V(Math.cos(deg * DEG), Math.sin(deg * DEG)); }
  function angDeg(a) { return Math.atan2(a.y, a.x) / DEG; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------------- the method ---------------- */
  // FedAvg direction: equal-weight average of the client pseudo-gradients, normalized
  function fedavg(A) {
    var s = V(0, 0);
    A.forEach(function (a) { s = add(s, a); });
    var bar = mul(s, 1 / A.length);
    return { bar: bar, g0: unit(bar) };
  }

  // d* = argmin 1/2 ||d - g0||^2  s.t.  a_i.d >= tau ||a_i||^2 for every client i.
  // In the plane at most two constraints are active, so every candidate active set is tried and the
  // closest feasible candidate is the projection.
  function fedpcd(g0, A, tau) {
    var n = A.length, best = null;
    var rhs = A.map(function (a) { return tau * dot(a, a); });
    function feasible(d) {
      for (var i = 0; i < n; i++) if (dot(A[i], d) < rhs[i] - 1e-9) return false;
      return true;
    }
    function consider(d, act, mus) {
      if (!feasible(d)) return;
      var dist = nrm(sub(d, g0));
      if (!best || dist < best.dist - 1e-12) {
        var mu = A.map(function () { return 0; });
        act.forEach(function (k, j) { mu[k] = mus[j]; });
        best = { d: d, active: act, mu: mu, dist: dist };
      }
    }
    consider(g0, [], []);
    if (best) return best;                                   // inactive: the projection is the identity
    var i, j;
    for (i = 0; i < n; i++) {
      var m = (rhs[i] - dot(A[i], g0)) / dot(A[i], A[i]);
      consider(add(g0, mul(A[i], m)), [i], [m]);
    }
    for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
      var gii = dot(A[i], A[i]), gjj = dot(A[j], A[j]), gij = dot(A[i], A[j]);
      var det = gii * gjj - gij * gij;
      if (Math.abs(det) < 1e-10) continue;
      var bi = rhs[i] - dot(A[i], g0), bj = rhs[j] - dot(A[j], g0);
      var mi = (bi * gjj - bj * gij) / det, mj = (bj * gii - bi * gij) / det;
      consider(add(g0, add(mul(A[i], mi), mul(A[j], mj))), [i, j], [mi, mj]);
    }
    return best;                                             // null only if the program is infeasible
  }

  /* ---------------- self-test against the paper's worked example ---------------- */
  (function selfTest() {
    var A = PAPER.ang.map(fromAng), g0 = fedavg(A).g0, fails = 0;
    function near(got, want, tol, what) {
      if (Math.abs(got - want) > tol) { fails++; console.warn("[FedPCD self-test]", what, "got", got.toFixed(4), "want", want); }
    }
    near(angDeg(g0), 58.9, 0.06, "angle of the average");
    [0.66, 0.97, -0.11].forEach(function (w, k) { near(dot(A[k], g0), w, 0.006, "progress along FedAvg, client " + (k + 1)); });
    var r = fedpcd(g0, A, 0.25);
    near(r.active.length, 1, 0, "active constraints at tau = 0.25");
    [0, 0, 0.36].forEach(function (w, k) { near(r.mu[k], w, 0.006, "multiplier, client " + (k + 1)); });
    [0.36, 0.85, 0.25].forEach(function (w, k) { near(dot(A[k], r.d), w, 0.008, "progress along FedPCD, client " + (k + 1)); });
    near(angDeg(fedpcd(g0, A, 0).d), 65.0, 0.06, "angle of d* at tau = 0");
    var one = fedpcd(g0, A, 1);
    near(angDeg(one.d), 82.5, 0.06, "angle of d* at tau = 1");
    near(one.active.length, 2, 0, "active constraints at tau = 1");
    var B = AGREE.ang.map(fromAng), h0 = fedavg(B).g0;
    near(fedpcd(h0, B, 0.25).dist, 0, 1e-12, "identity when every client is satisfied");
    if (!fails) console.log("%c[FedPCD] projection self-test passed (15/15)", "color:#C2185B;font-weight:bold");
  })();

  /* ---------------- colors: the paper's figure palette, read from the stylesheet ---------------- */
  var svg = document.getElementById("vecSvg");
  if (!svg) return;
  var css = getComputedStyle(document.documentElement);
  function cv(name, fallback) { var v = css.getPropertyValue(name).trim(); return v || fallback; }
  var C = {
    client: cv("--ink", "#1D1420"),
    conflict: cv("--conflict", "#D62728"),
    fedavg: cv("--fedavg", "#6CACE4"),
    fedavgInk: cv("--fedavg-ink", "#2F7BBF"),
    constraint: cv("--constraint", "#F59F00"),
    constraintInk: cv("--constraint-ink", "#B86E00"),
    region: cv("--region", "#FDEBCF"),
    fedpcd: cv("--fedpcd", "#6A1B9A"),
    slack: cv("--faint", "#9D93A1"),
    grid: cv("--mist", "#ECE4E9"),
    brand: cv("--brand", "#C2185B")
  };

  /* ---------------- geometry / rendering ---------------- */
  var W = 600, H = 600, O = V(300, 488), S = 198;            // origin + px per unit
  function sx(p) { return O.x + p.x * S; }
  function sy(p) { return O.y - p.y * S; }
  function el(tag, attrs) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function clear(g) { while (g.firstChild) g.removeChild(g.firstChild); }

  // layers: feasible region, static guides, constraint boundaries, arrows, handles
  var gRegion = el("g", {}), gStatic = el("g", {}), gLines = el("g", {}), gDyn = el("g", {}), gHandles = el("g", {});
  [gRegion, gStatic, gLines, gDyn, gHandles].forEach(function (g) { svg.appendChild(g); });

  gStatic.appendChild(el("line", { x1: 0, y1: sy(V(0, 0)), x2: W, y2: sy(V(0, 0)), stroke: C.grid, "stroke-width": 1 }));
  gStatic.appendChild(el("path", {
    d: "M" + sx(V(1, 0)) + "," + sy(V(1, 0)) + " A" + S + "," + S + " 0 0 0 " + sx(V(-1, 0)) + "," + sy(V(-1, 0)),
    fill: "none", stroke: C.grid, "stroke-width": 1, "stroke-dasharray": "2 5"
  }));

  var handles = [0, 1, 2].map(function () {
    var h = el("circle", { r: 8.5, fill: "#fff", "stroke-width": 2.6, cursor: "grab" });
    h.setAttribute("aria-hidden", "true");                   // keyboard control is via the sliders
    gHandles.appendChild(h);
    return h;
  });
  gHandles.appendChild(el("circle", { cx: sx(V(0, 0)), cy: sy(V(0, 0)), r: 4.5, fill: C.client }));

  function arrow(layer, from, to, color, width, opacity) {
    var fx = sx(from), fy = sy(from), tx = sx(to), ty = sy(to);
    var ang = Math.atan2(ty - fy, tx - fx), len = Math.hypot(tx - fx, ty - fy);
    if (len < 2) return;
    var hl = Math.min(15, len * 0.5), hw = Math.max(width * 1.55, 5.5);
    var bx = tx - hl * Math.cos(ang), by = ty - hl * Math.sin(ang);
    var px = -Math.sin(ang), py = Math.cos(ang);
    layer.appendChild(el("line", { x1: fx, y1: fy, x2: bx, y2: by, stroke: color, "stroke-width": width, "stroke-linecap": "round", opacity: opacity }));
    layer.appendChild(el("polygon", {
      points: tx + "," + ty + " " + (bx + px * hw) + "," + (by + py * hw) + " " + (bx - px * hw) + "," + (by - py * hw),
      fill: color, opacity: opacity
    }));
  }
  // the figure is drawn in a 600-unit box; on a narrow screen labels and drag handles are enlarged
  // so that they stay about 12 px and 11 px on screen
  var zoom = 1;
  function measure() { zoom = Math.max(1, 0.8 * W / (svg.getBoundingClientRect().width || W)); }
  function text(layer, x, y, str, color, weight, anchor) {
    var t = el("text", {
      x: x, y: y, fill: color, "text-anchor": anchor || "start",
      stroke: "#fff", "stroke-width": 3.4 * zoom, "paint-order": "stroke", "stroke-linejoin": "round",
      "font-family": "'JetBrains Mono', monospace", "font-size": 15 * zoom, "font-weight": weight || 500
    });
    t.textContent = str;
    layer.appendChild(t);
  }
  // keep the part of a polygon where a.p >= c (Sutherland-Hodgman)
  function clip(poly, a, c) {
    var out = [];
    for (var i = 0; i < poly.length; i++) {
      var p = poly[i], q = poly[(i + 1) % poly.length];
      var fp = dot(a, p) - c, fq = dot(a, q) - c;
      if (fp >= 0) out.push(p);
      if ((fp >= 0) !== (fq >= 0)) out.push(add(p, mul(sub(q, p), fp / (fp - fq))));
    }
    return out;
  }

  /* ---------------- state + DOM refs ---------------- */
  var state = {
    ang: PAPER.ang.slice(), tau: PAPER.tau,
    visible: { region: true, lines: true, fedavg: true, fedpcd: true },
    tour: false
  };
  var tauSlider = document.getElementById("tauSlider"), tauVal = document.getElementById("tauVal");
  var cSliders = [1, 2, 3].map(function (k) { return document.getElementById("c" + k + "Slider"); });
  var cVals = [1, 2, 3].map(function (k) { return document.getElementById("c" + k + "Val"); });
  var readout = document.getElementById("vecReadout");
  var badge = document.getElementById("stateBadge");
  var TAU_MAX = parseFloat(tauSlider.max);
  var SUB = ["₁", "₂", "₃"];

  function fmt(n) { return (Math.abs(n) < 0.005 ? 0 : n).toFixed(2).replace("-", "−"); }
  function setFill(slider, pct) {
    slider.style.background = "linear-gradient(90deg,var(--brand) 0%, var(--brand) " + pct + "%, var(--mist) " + pct + "%)";
  }
  function syncControls() {
    tauSlider.value = state.tau; tauVal.textContent = state.tau.toFixed(2); setFill(tauSlider, state.tau / TAU_MAX * 100);
    state.ang.forEach(function (a, k) {
      var r = Math.round(a);
      cSliders[k].value = r; cVals[k].textContent = r + "°";
      setFill(cSliders[k], (r - ANG_MIN) / (ANG_MAX - ANG_MIN) * 100);
    });
  }

  function render() {
    clear(gRegion); clear(gLines); clear(gDyn);
    measure();
    var A = state.ang.map(fromAng), tau = state.tau;
    var g0 = fedavg(A).g0, res = fedpcd(g0, A, tau);
    var d = res.d, same = res.active.length === 0;
    var along0 = A.map(function (a) { return dot(a, g0); });
    var alongD = A.map(function (a) { return dot(a, d); });
    var short = along0.map(function (v) { return v < tau - 1e-9; });   // clients the average leaves short

    /* feasible region: the intersection of the three half-spaces */
    if (state.visible.region) {
      var poly = [V(-7, -7), V(7, -7), V(7, 7), V(-7, 7)];
      A.forEach(function (a) { poly = clip(poly, a, tau); });
      if (poly.length > 2) {
        gRegion.appendChild(el("polygon", { points: poly.map(function (p) { return sx(p) + "," + sy(p); }).join(" "), fill: C.region, opacity: 0.92 }));
      }
    }

    /* constraint boundaries: orange when active, gray when slack */
    if (state.visible.lines) {
      A.forEach(function (a, k) {
        var P = mul(a, tau), perp = V(-a.y, a.x), on = res.active.indexOf(k) >= 0;
        var p1 = add(P, mul(perp, 8)), p2 = sub(P, mul(perp, 8));
        gLines.appendChild(el("line", {
          x1: sx(p1), y1: sy(p1), x2: sx(p2), y2: sy(p2),
          stroke: on ? C.constraint : C.slack, "stroke-width": on ? 2 : 1.3,
          "stroke-dasharray": on ? "8 5" : "5 5", opacity: on ? 1 : 0.75
        }));
      });
    }

    /* clients */
    A.forEach(function (a, k) {
      var col = short[k] ? C.conflict : C.client;
      var rim = 8.5 * Math.min(zoom, 1.5);
      arrow(gDyn, V(0, 0), mul(a, 1 - rim / S), col, 3.6, 1);  // stops at the rim of its drag handle
      var lp = mul(a, 1.11 + 0.04 * zoom);
      text(gDyn, sx(lp), sy(lp) + 5 * zoom, "g̃" + SUB[k], col, 600, a.x < -0.25 ? "end" : (a.x > 0.25 ? "start" : "middle"));
      handles[k].setAttribute("cx", sx(a));
      handles[k].setAttribute("cy", sy(a));
      handles[k].setAttribute("r", rim);
      handles[k].setAttribute("stroke", col);
    });

    /* the FedAvg direction and the FedPCD direction */
    var showAvg = state.visible.fedavg, showPcd = state.visible.fedpcd;
    if (showAvg) arrow(gDyn, V(0, 0), g0, C.fedavg, same && showPcd ? 8 : 4.4, same && showPcd ? 0.6 : 1);
    if (showAvg && showPcd && !same) {
      // the projection: from the tip of the average to the closest admissible direction
      gDyn.appendChild(el("line", { x1: sx(g0), y1: sy(g0), x2: sx(d), y2: sy(d), stroke: C.constraint, "stroke-width": 1.8, "stroke-dasharray": "4 4" }));
      if (res.active.length === 1) {
        var n = unit(sub(g0, d)), a1 = A[res.active[0]], t = V(-a1.y, a1.x), q = 0.055;
        if (dot(t, g0) > dot(t, d)) t = mul(t, -1);
        var c1 = add(d, mul(n, q)), c2 = add(c1, mul(t, q)), c3 = add(d, mul(t, q));
        gDyn.appendChild(el("polyline", {
          points: [c1, c2, c3].map(function (p) { return sx(p) + "," + sy(p); }).join(" "),
          fill: "none", stroke: C.constraint, "stroke-width": 1.5
        }));
      }
    }
    if (showPcd) arrow(gDyn, V(0, 0), d, C.fedpcd, 4.8, 1);

    /* labels for the two directions, kept on opposite sides of the pair */
    var side = (g0.x * d.y - g0.y * d.x) >= 0 ? 1 : -1;      // +1 when d* lies counter-clockwise of g0
    var off = 0.05 + 0.03 * zoom;
    if (same && showAvg && showPcd) {
      text(gDyn, sx(mul(g0, 1.09)) + 8, sy(mul(g0, 1.09)), "d̃⋆ = g̃₀", C.fedpcd, 700, g0.x < -0.3 ? "end" : "start");
    } else {
      if (showAvg) {
        var p0 = add(mul(g0, 1 + off), mul(V(-g0.y, g0.x), -side * off));
        text(gDyn, sx(p0), sy(p0) + 5 * zoom, "g̃₀", C.fedavgInk, 600, side > 0 ? "start" : "end");
      }
      if (showPcd) {
        var u = unit(d), pd = add(mul(u, nrm(d) + off + 0.02), mul(V(-u.y, u.x), side * off));
        text(gDyn, sx(pd), sy(pd) + 5 * zoom, "d̃⋆", C.fedpcd, 700, side > 0 ? "end" : "start");
      }
    }

    /* readout + status */
    var rows = A.map(function (a, k) {
      var on = res.active.indexOf(k) >= 0;
      return "<tr><td>client " + (k + 1) + "</td>" +
        "<td class='" + (short[k] ? "warn" : "ok") + "'>" + fmt(along0[k]) + (short[k] ? " ✗" : " ✓") + "</td>" +
        "<td class='" + (on ? "act" : "") + "'>" + fmt(alongD[k]) + (on ? " = τ" : "") + "</td>" +
        "<td>" + (on ? fmt(res.mu[k]) : "0") + "</td></tr>";
    }).join("");
    readout.innerHTML =
      "<b>needs ≥ τ = " + tau.toFixed(2) + "</b>" +
      "<table class='ro-table'><tr><th></th><th>along g̃₀</th><th>along d̃⋆</th><th>μ⋆</th></tr>" + rows + "</table>";

    if (same) {
      badge.className = "state-badge same";
      badge.textContent = "No constraint is active. The direction is exactly FedAvg's.";
    } else {
      var names = res.active.map(function (k) { return k + 1; });
      var turn = Math.abs(angDeg(d) - angDeg(g0));
      badge.className = "state-badge bent";
      badge.textContent = (names.length === 1
        ? "Client " + names[0] + "'s constraint is active."
        : "The constraints of clients " + names.join(" and ") + " are active.") +
        " FedPCD turns " + turn.toFixed(1) + "° away from FedAvg.";
    }
  }

  /* ---------------- legend (layer toggles) ---------------- */
  var legendBox = document.getElementById("vecLegend");
  var LEGEND = [
    { key: "fedpcd", name: "FedPCD direction d̃⋆", tag: "the projection of the average", sw: "arrow", color: C.fedpcd },
    { key: "fedavg", name: "FedAvg direction g̃₀", tag: "primary", sw: "arrow", color: C.fedavg },
    { key: "lines", name: "Client constraint", tag: "orange when active", sw: "dash", color: C.constraint },
    { key: "region", name: "Feasible region", tag: "every client satisfied", sw: "block", color: C.region },
    { name: "Client direction", tag: "red when the average leaves it short", sw: "arrow", color: C.client }
  ];
  LEGEND.forEach(function (m) {
    var item = document.createElement(m.key ? "button" : "div");
    item.className = "leg-item" + (m.key ? "" : " fixed");
    item.innerHTML =
      "<span class='leg-swatch " + m.sw + "' style='color:" + m.color + (m.sw === "block" ? "" : ";border-top-color:" + m.color) + "'></span>" +
      "<span class='leg-name'>" + m.name + "</span><span class='leg-tag'>" + m.tag + "</span>";
    if (m.key) {
      item.type = "button";
      item.setAttribute("aria-pressed", "true");
      item.setAttribute("aria-label", "Toggle " + m.name + " in the figure");
      item.addEventListener("click", function () {
        cancelTour();
        state.visible[m.key] = !state.visible[m.key];
        item.classList.toggle("off", !state.visible[m.key]);
        item.setAttribute("aria-pressed", state.visible[m.key] ? "true" : "false");
        render();
      });
    }
    legendBox.appendChild(item);
  });

  /* ---------------- dragging the client arrows ---------------- */
  var dragging = -1;
  function pointMath(evt) {
    var r = svg.getBoundingClientRect();
    var x = (evt.clientX - r.left) / r.width * W, y = (evt.clientY - r.top) / r.height * H;
    return V((x - O.x) / S, -(y - O.y) / S);
  }
  function onDown(evt) {
    var p = pointMath(evt), bestK = -1, bestD = 0.3;
    state.ang.forEach(function (a, k) {
      var dd = nrm(sub(p, fromAng(a)));
      if (dd < bestD) { bestD = dd; bestK = k; }
    });
    if (bestK < 0) return;                                   // only grab near an arrow tip
    cancelTour();
    dragging = bestK; svg.classList.add("grabbing");
    if (svg.setPointerCapture) svg.setPointerCapture(evt.pointerId);
    evt.preventDefault();
  }
  function onMove(evt) {
    if (dragging < 0) return;
    var p = pointMath(evt);
    if (nrm(p) < 1e-6) return;
    var a = angDeg(p);
    if (a < 0) a = p.x >= 0 ? ANG_MIN : ANG_MAX;             // below the axis: stop at the nearer end
    state.ang[dragging] = clamp(a, ANG_MIN, ANG_MAX);
    syncControls(); render();
  }
  function onUp(evt) {
    if (dragging < 0) return;
    dragging = -1; svg.classList.remove("grabbing");
    if (svg.releasePointerCapture && evt.pointerId != null) { try { svg.releasePointerCapture(evt.pointerId); } catch (e) {} }
  }
  svg.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  /* ---------------- sliders + presets ---------------- */
  tauSlider.addEventListener("input", function () {
    cancelTour();
    state.tau = parseFloat(tauSlider.value);
    syncControls(); render();
  });
  cSliders.forEach(function (s, k) {
    s.addEventListener("input", function () {
      cancelTour();
      state.ang[k] = parseFloat(s.value);
      syncControls(); render();
    });
  });
  function apply(cfg) {
    cancelTour();
    state.ang = cfg.ang.slice(); state.tau = cfg.tau;
    syncControls(); render();
  }
  document.getElementById("presetPaper").addEventListener("click", function () { apply(PAPER); });
  document.getElementById("presetAgree").addEventListener("click", function () { apply(AGREE); });
  document.getElementById("presetSplit").addEventListener("click", function () { apply(SPLIT); });

  /* ---------------- auto-tour ---------------- */
  var tourBtn = document.getElementById("tourBtn");
  var tourRAF = null, tourStart = null;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PLAY = "<svg viewBox='0 0 24 24' class='ico ico-fill'><path d='M8 5v14l11-7z'/></svg> Watch it work";
  var STOP = "<svg viewBox='0 0 24 24' class='ico ico-fill'><rect x='6' y='5' width='4' height='14'/><rect x='14' y='5' width='4' height='14'/></svg> Stop";

  function setTour(on) {
    state.tour = on;
    tourBtn.classList.toggle("btn-primary", !on);
    tourBtn.innerHTML = on ? STOP : PLAY;
  }
  function cancelTour() {
    if (!state.tour) return;
    if (tourRAF) cancelAnimationFrame(tourRAF);
    tourRAF = null; tourStart = null; setTour(false);
  }
  function tourFrame(ts) {
    if (!tourStart) tourStart = ts;
    var t = (ts - tourStart) / 1000;
    // client 3 swings between agreeing with the others and opposing them, while tau breathes
    state.ang = [10, 45, 107.5 - 52.5 * Math.cos(t * 0.55)];
    state.tau = 0.2 + 0.15 * Math.sin(t * 0.32);
    syncControls(); render();
    tourRAF = requestAnimationFrame(tourFrame);
  }
  tourBtn.addEventListener("click", function () {
    if (state.tour) { cancelTour(); return; }
    if (reduceMotion) { apply(PAPER); return; }
    setTour(true);
    tourStart = null; tourRAF = requestAnimationFrame(tourFrame);
  });

  /* ---------------- reset ---------------- */
  document.getElementById("resetBtn").addEventListener("click", function () {
    cancelTour();
    Object.keys(state.visible).forEach(function (k) { state.visible[k] = true; });
    Array.prototype.forEach.call(legendBox.children, function (c) {
      c.classList.remove("off");
      if (c.hasAttribute("aria-pressed")) c.setAttribute("aria-pressed", "true");
    });
    apply(PAPER);
  });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (!state.tour) render(); }, 120);
  });

  syncControls();
  render();
})();

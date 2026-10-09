/* =========================================================================
   FedPCD history widget
   Simulates the server's cache alone: N = 100 clients, rho*N sampled uniformly
   without replacement each round, and a client's last direction kept for H
   rounds. A client constrains round t if it was sampled within the last H + 1
   rounds (the current one included), so the expected count once the window has
   filled is N (1 - (1 - rho)^(H+1)).
   ========================================================================= */
(function () {
  "use strict";

  var grid = document.getElementById("cacheGrid");
  if (!grid) return;

  var N = 100, TICK = 700, KEEP = 40;                        // clients, ms per round, rounds in the sparkline
  var SVGNS = "http://www.w3.org/2000/svg";
  var state = { rho: 0.1, H: 10, round: 0, last: [], trace: [], playing: false, timer: null };

  // small seeded generator, so the widget plays the same sequence on every visit
  var seed = 20260924;
  function rand() {
    seed = (seed + 0x6D2B79F5) | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  var dots = [];
  for (var i = 0; i < N; i++) {
    var dot = document.createElement("span");
    dot.className = "cache-dot";
    grid.appendChild(dot);
    dots.push(dot);
  }

  var numEl = document.getElementById("cacheNum"), roundEl = document.getElementById("cacheRound");
  var breakEl = document.getElementById("cacheBreak"), expectEl = document.getElementById("cacheExpect");
  var spark = document.getElementById("cacheSpark");
  var hSlider = document.getElementById("hSlider"), hVal = document.getElementById("hVal");
  var rhoSeg = document.getElementById("rhoSeg"), playBtn = document.getElementById("cachePlay");
  var widget = document.getElementById("cacheWidget");

  function perRound() { return Math.round(state.rho * N); }
  function expected() { return N * (1 - Math.pow(1 - state.rho, state.H + 1)); }
  function age(k) { return state.round - state.last[k]; }    // 0 = sampled this round
  function count() {
    var c = 0;
    for (var k = 0; k < N; k++) if (age(k) <= state.H) c++;
    return c;
  }

  function step() {
    state.round++;
    var idx = [], k, j, tmp, m = perRound();
    for (k = 0; k < N; k++) idx.push(k);
    for (k = 0; k < m; k++) {                                // partial Fisher-Yates: m distinct clients
      j = k + Math.floor(rand() * (N - k));
      tmp = idx[k]; idx[k] = idx[j]; idx[j] = tmp;
      state.last[idx[k]] = state.round;
    }
    state.trace.push(count());
    if (state.trace.length > KEEP) state.trace.shift();
  }

  function reset() {
    state.round = 0; state.trace = [];
    for (var k = 0; k < N; k++) state.last[k] = -Infinity;
    for (var r = 0; r < state.H + 6; r++) step();            // start with the window already full
  }

  function line(x1, y1, x2, y2, stroke, dash, width) {
    var l = document.createElementNS(SVGNS, "line");
    l.setAttribute("x1", x1); l.setAttribute("y1", y1); l.setAttribute("x2", x2); l.setAttribute("y2", y2);
    l.setAttribute("stroke", stroke); l.setAttribute("stroke-width", width || 1.2);
    if (dash) l.setAttribute("stroke-dasharray", dash);
    l.setAttribute("vector-effect", "non-scaling-stroke");
    spark.appendChild(l);
  }
  function drawSpark() {
    while (spark.firstChild) spark.removeChild(spark.firstChild);
    var w = 320, h = 74, top = 6, bottom = h - 4;
    var hi = Math.max(20, Math.ceil((expected() + 12) / 10) * 10);
    function y(v) { return bottom - (v / hi) * (bottom - top); }
    line(0, bottom, w, bottom, "var(--mist)");
    line(0, y(perRound()), w, y(perRound()), "var(--faint)", "5 4");
    line(0, y(expected()), w, y(expected()), "var(--fedpcd)", "2 4");
    var n = state.trace.length;
    var pts = state.trace.map(function (v, k) { return ((KEEP - n + k) / (KEEP - 1) * w).toFixed(1) + "," + y(v).toFixed(1); });
    var area = document.createElementNS(SVGNS, "polygon");
    area.setAttribute("points", ((KEEP - n) / (KEEP - 1) * w).toFixed(1) + "," + bottom + " " + pts.join(" ") + " " + w + "," + bottom);
    area.setAttribute("fill", "var(--fedpcd)"); area.setAttribute("opacity", "0.1");
    spark.appendChild(area);
    var path = document.createElementNS(SVGNS, "polyline");
    path.setAttribute("points", pts.join(" "));
    path.setAttribute("fill", "none"); path.setAttribute("stroke", "var(--fedpcd)");
    path.setAttribute("stroke-width", "2.4"); path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    spark.appendChild(path);
  }

  function render() {
    var c = count(), m = perRound();
    for (var k = 0; k < N; k++) {
      var a = age(k), d = dots[k];
      if (a === 0) { d.className = "cache-dot now"; d.style.opacity = ""; }
      else if (a <= state.H) { d.className = "cache-dot cached"; d.style.opacity = (0.82 - 0.6 * (a - 1) / Math.max(1, state.H - 1)).toFixed(2); }
      else { d.className = "cache-dot"; d.style.opacity = ""; }
    }
    numEl.textContent = c;
    roundEl.textContent = state.round;
    breakEl.innerHTML = "<b>" + m + "</b> sampled this round + <b>" + (c - m) + "</b> still cached";
    expectEl.innerHTML = "<span class='ln'><i></i>expected, <b>N(1 − (1 − ρ)<sup>H+1</sup>) = " + expected().toFixed(1) + "</b></span>" +
      "<span class='ln base'><i></i>without history, <b>" + m + "</b></span>";
    drawSpark();
  }

  function setPlaying(on) {
    state.playing = on;
    playBtn.textContent = on ? "Pause" : "Play";
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    if (on) state.timer = setInterval(function () { step(); render(); }, TICK);
  }

  /* ---------------- controls ---------------- */
  function setFill() {
    var pct = state.H / 10 * 100;
    hSlider.style.background = "linear-gradient(90deg,var(--brand) 0%, var(--brand) " + pct + "%, var(--mist) " + pct + "%)";
    hVal.textContent = state.H;
  }
  hSlider.addEventListener("input", function () {
    state.H = parseInt(hSlider.value, 10);
    setFill(); reset(); render();
  });
  Array.prototype.forEach.call(rhoSeg.querySelectorAll("button"), function (b) {
    b.addEventListener("click", function () {
      state.rho = parseFloat(b.getAttribute("data-rho"));
      Array.prototype.forEach.call(rhoSeg.querySelectorAll("button"), function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      reset(); render();
    });
  });
  var userPaused = false;
  playBtn.addEventListener("click", function () {
    userPaused = state.playing;
    setPlaying(!state.playing);
  });

  setFill(); reset(); render();

  // run only while the widget is on screen, and never on its own under reduced motion
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { userPaused = true; setPlaying(false); }
  else if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { if (!userPaused && !state.playing) setPlaying(true); }
      else if (state.playing) setPlaying(false);
    }, { threshold: 0.25 }).observe(widget);
    setPlaying(false);
  } else setPlaying(true);
})();

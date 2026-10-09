/* =========================================================================
   FedPCD project page — page behaviours (links, reveal, nav, video chapters,
   figure switcher, BibTeX copy)
   ========================================================================= */
(function () {
  "use strict";

  /* -----------------------------------------------------------------------
     Button URLs. A value left as "" shows a "Coming soon" tooltip on hover
     and focus, and a toast on click, instead of leading nowhere.
     ----------------------------------------------------------------------- */
  var LINKS = {
    paper: "",    // "Paper" / "See the appendix", e.g. "https://arxiv.org/pdf/XXXX.XXXXX"
    arxiv: "",    // arXiv abstract page, e.g. "https://arxiv.org/abs/XXXX.XXXXX"
    code: ""      // code release, e.g. "https://github.com/DaraVaram/fedpcd"
  };
  var PENDING = {};                                 // optional per-link text for links left unset
  var SOON = "Coming soon";

  var toast = document.getElementById("toast");
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { toast.classList.remove("show"); }, 1900);
  }

  // wire data-link buttons
  Array.prototype.forEach.call(document.querySelectorAll("[data-link]"), function (a) {
    var key = a.getAttribute("data-link"), url = LINKS[key];
    if (url) {
      a.setAttribute("href", url);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
    } else {
      var tip = PENDING[key] || SOON;
      a.classList.add("is-pending");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("data-tip", tip);
      a.setAttribute("aria-label", a.textContent.trim().replace(/\s*→$/, "") + " (" + tip.toLowerCase() + ")");
      a.addEventListener("click", function (e) {
        e.preventDefault();
        showToast(tip);
      });
    }
  });

  /* ---------------- scroll progress ---------------- */
  var bar = document.getElementById("scrollProgress");
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
    bar.style.width = (p * 100).toFixed(2) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- reveal on scroll ---------------- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    Array.prototype.forEach.call(reveals, function (r) { r.classList.add("in"); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en, i) {
        if (en.isIntersecting) {
          var elt = en.target;
          setTimeout(function () { elt.classList.add("in"); }, Math.min(i * 55, 220));
          ro.unobserve(elt);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    Array.prototype.forEach.call(reveals, function (r) { ro.observe(r); });
  }

  /* ---------------- dot nav (show + active section) ---------------- */
  var dotnav = document.getElementById("dotnav");
  var hero = document.getElementById("hero");

  if (dotnav && hero && "IntersectionObserver" in window) {
    var links = Array.prototype.slice.call(dotnav.querySelectorAll("a"));
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    new IntersectionObserver(function (e) {
      dotnav.classList.toggle("show", !e[0].isIntersecting);
    }, { threshold: 0.25 }).observe(hero);

    // the section crossing a line 40% down the viewport is the active one (sections here are tall)
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var idx = sections.indexOf(en.target);
          links.forEach(function (l, i) { l.classList.toggle("active", i === idx); });
        }
      });
    }, { threshold: 0, rootMargin: "-40% 0px -59% 0px" });
    sections.forEach(function (s) { if (s) spy.observe(s); });
  }

  /* ---------------- hero motif: the FedPCD direction draws itself ---------------- */
  var trace = document.getElementById("heroTrace");
  if (trace) {
    if (reduce) { trace.style.strokeDashoffset = "0"; }
    else { requestAnimationFrame(function () { trace.classList.add("draw"); }); }
  }

  /* ---------------- video chapters ---------------- */
  var video = document.getElementById("fedVideo");
  var chapBox = document.getElementById("chapters");
  if (video && chapBox) {
    var chaps = Array.prototype.slice.call(chapBox.querySelectorAll(".chap"));
    var times = chaps.map(function (c) { return parseFloat(c.getAttribute("data-t")); });
    chaps.forEach(function (c, i) {
      c.addEventListener("click", function () {
        video.currentTime = times[i];
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      });
    });
    video.addEventListener("timeupdate", function () {
      var t = video.currentTime, on = -1;
      for (var i = 0; i < times.length; i++) if (t >= times[i] - 0.25) on = i;
      chaps.forEach(function (c, i) { c.classList.toggle("on", i === on); });
    });
  }

  /* ---------------- results: one heterogeneity level for all three figures ---------------- */
  var alphaSeg = document.getElementById("alphaSeg");
  if (alphaSeg) {
    var aBtns = Array.prototype.slice.call(alphaSeg.querySelectorAll("button"));
    var figs = Array.prototype.slice.call(document.querySelectorAll("img[data-fig]"));
    var labels = Array.prototype.slice.call(document.querySelectorAll("[data-alpha-label]"));
    aBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-alpha");
        aBtns.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        figs.forEach(function (im) {
          var src = "assets/" + im.getAttribute("data-fig") + "-a" + key + ".png";
          im.src = src;
          if (im.parentNode.tagName === "A") im.parentNode.setAttribute("href", src);   // the full-size link
        });
        labels.forEach(function (l) { l.textContent = b.getAttribute("data-label"); });
      });
    });
  }

  /* ---------------- BibTeX copy ---------------- */
  var copyBtn = document.getElementById("copyBib");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var text = document.getElementById("bibtex").innerText;
      var done = function () {
        showToast("BibTeX copied to clipboard");
        var span = copyBtn.querySelector("span");
        if (span) { var old = span.textContent; span.textContent = "Copied"; setTimeout(function () { span.textContent = old; }, 1600); }
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { showToast("Press Ctrl+C to copy"); }
        document.body.removeChild(ta);
      }
    });
  }
})();

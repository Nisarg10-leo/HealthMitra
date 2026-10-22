/* =========================================================================
   TestCase Studio — "Rate us" nudge
   -------------------------------------------------------------------------
   Ported from the Claude Usage Meter v1.2.16 nudge. A small card anchored to
   the Rate us button — NOT a blocking modal. No rating is captured in-tool;
   every "yes" path opens the store review page.

   Flow
   ----
     install                 -> button sits quietly in the toolbar
     +NUDGE_FIRST (5 days)   -> card pops once, button pulses while it's open
     dismissed               -> card returns NUDGE_REPEAT (2 days) later
     rated                   -> button AND card gone permanently

   The shown-at stamp is written the instant the card appears, so a dismissal
   never loses the slot and the repeat clock starts from the show, not the close.
   The card is held back while the window is hidden — a card nobody looks at is
   a wasted ask that still burns the 2-day slot.

   Public API
   ----------
     TCSRate.goToStore()  -> open the store review page + retire the button
     TCSRate.show()       -> force the card open (ignores timing)
     TCSRate.close()      -> dismiss the card
     TCSRate.reset()      -> clear all state (handy while testing)
   ========================================================================= */

(function () {
  "use strict";

  /* ── Config ─────────────────────────────────────────────────────────── */

  /* TEST_MODE = true  -> card pops on every studio open and the button never
                          retires, so the flow stays testable.
     TEST_MODE = false -> normal behaviour. FLIP THIS BEFORE SHIPPING.       */
  var TEST_MODE = false;

  var STATE_KEY = "tcs_rate_state";

  /* Review links per browser */
  var REVIEW_LINKS = {
    chrome:  "https://chromewebstore.google.com/u/1/detail/testcase-studio-selenium/loopjjegnlccnhgfehekecpanpmielcj/reviews",
    edge:    "https://microsoftedge.microsoft.com/addons/detail/testcase-studio-seleniu/jdglgpgchkgiciogpolofelfdfkdgfcg",
    firefox: "https://addons.mozilla.org/en-US/firefox/addon/testcase-studio/reviews/",
    opera:   "https://addons.opera.com/en-gb/extensions/details/testcase-studio/"
  };

  var DAY = 24 * 60 * 60 * 1000;
  var NUDGE_FIRST = 5 * DAY;    // first pop: 5 days after install
  var NUDGE_REPEAT = 2 * DAY;   // then every 2 days until they rate
  var MOUNT_DELAY = 10 * 1000;  // let the studio settle before popping

  var DEFAULT_STATE = {
    installAt: 0,   // ms epoch, stamped on first run
    nudgeAt: 0,     // ms epoch the card last appeared (0 = never)
    rated: false    // went to the store -> retire everything
  };

  var state = null;
  var nudgeEl = null;
  var nudgeOpen = false;
  var nudgeTimer = null;
  var outsideHandler = null;
  var keyHandler = null;
  var followHandler = null;

  /* ── Storage (chrome.storage.local with localStorage fallback) ──────── */

  function hasChromeStorage() {
    try {
      return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
    } catch (e) { return false; }
  }

  function loadState(cb) {
    if (hasChromeStorage()) {
      chrome.storage.local.get([STATE_KEY], function (res) {
        cb(normalize(res && res[STATE_KEY]));
      });
    } else {
      var raw = null;
      try { raw = JSON.parse(localStorage.getItem(STATE_KEY)); } catch (e) { }
      cb(normalize(raw));
    }
  }

  function saveState() {
    if (hasChromeStorage()) {
      var payload = {};
      payload[STATE_KEY] = state;
      chrome.storage.local.set(payload);
    } else {
      try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) { }
    }
  }

  function normalize(raw) {
    var s = {};
    for (var k in DEFAULT_STATE) {
      if (Object.prototype.hasOwnProperty.call(DEFAULT_STATE, k)) {
        s[k] = (raw && typeof raw[k] !== "undefined") ? raw[k] : DEFAULT_STATE[k];
      }
    }
    if (!s.installAt) s.installAt = Date.now();
    return s;
  }

  /* ── Store link ─────────────────────────────────────────────────────── */

  function detectBrowser() {
    var ua = window.navigator.userAgent;
    if (ua.indexOf("Edg/") > -1) return "edge";
    if (ua.indexOf("OPR/") > -1 || ua.indexOf("Opera") > -1) return "opera";
    if (typeof InstallTrigger !== "undefined" || ua.indexOf("Firefox") > -1) return "firefox";
    return "chrome";
  }

  function reviewUrl() {
    return REVIEW_LINKS[detectBrowser()] || REVIEW_LINKS.chrome;
  }

  function openTab(url) {
    try {
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: url });
        return;
      }
    } catch (e) { }
    window.open(url, "_blank");
  }

  /* ── The one action that matters ────────────────────────────────────── */

  function goToStore() {
    if (state) {
      state.rated = true;
      saveState();
    }
    closeNudge();
    hideRateButton();
    openTab(reviewUrl());
  }

  /* Once reviewed the button is gone for good, exactly as the card promises.
     TEST_MODE keeps it alive so the flow stays testable.                     */
  function hideRateButton() {
    if (TEST_MODE) return;
    var btn = document.getElementById("tcs-rate-btn");
    if (btn) btn.style.display = "none";
  }

  function rateButton() {
    return document.getElementById("tcs-rate-btn");
  }

  /* ── Is the card owed right now? ────────────────────────────────────── */

  function nudgeDue() {
    if (!state) return false;              // state hasn't loaded — stay quiet
    if (TEST_MODE) return true;
    if (state.rated) return false;         // reviewers never see it again
    if (Date.now() - state.installAt < NUDGE_FIRST) return false;
    if (!state.nudgeAt) return true;       // never shown -> first pop
    return Date.now() - state.nudgeAt >= NUDGE_REPEAT;
  }

  function scheduleNudge(delay) {
    if (nudgeTimer || nudgeOpen || !nudgeDue()) return;
    nudgeTimer = setTimeout(function () {
      nudgeTimer = null;
      maybeShowNudge();
    }, typeof delay === "number" ? delay : MOUNT_DELAY);
  }

  function maybeShowNudge() {
    if (nudgeOpen || !nudgeDue()) return;
    if (document.hidden) return;           // don't burn the slot on a hidden window
    var btn = rateButton();
    if (!btn || btn.style.display === "none" || !btn.getClientRects().length) return;
    showNudge();
  }

  /* ── The card ───────────────────────────────────────────────────────── */

  function buildNudge() {
    var el = document.createElement("div");
    el.className = "tcs-rate-nudge";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Rate TestCase Studio");
    el.innerHTML =
      '<button class="tcs-nudge-x" type="button" data-tcs="nudge-close" aria-label="Not now">&times;</button>' +
      '<div class="tcs-nudge-title">Enjoying TestCase Studio?</div>' +
      '<div class="tcs-nudge-stars" data-tcs="nudge-stars" role="button" tabindex="0" aria-label="Leave a 5 star review">' +
        '<span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>' +
      '</div>' +
      '<div class="tcs-nudge-body">Pls Rate us &amp; this button disappears forever after you review. 🙏🏻</div>' +
      '<div class="tcs-nudge-actions">' +
        '<button class="tcs-nudge-cta" type="button" data-tcs="nudge-rate">Write a review</button>' +
        '<button class="tcs-nudge-later" type="button" data-tcs="nudge-later">Maybe later</button>' +
      '</div>';
    return el;
  }

  /* Above the button when there's room, below otherwise, clamped to the
     viewport with the arrow kept pointing at the anchor. */
  function positionNudge() {
    var btn = rateButton();
    if (!nudgeEl || !nudgeEl.isConnected || !btn || !nudgeOpen) return;

    var br = btn.getBoundingClientRect();
    var nr = nudgeEl.getBoundingClientRect();
    var margin = 8;
    var vw = window.innerWidth;

    var left = br.left + br.width / 2 - nr.width / 2;
    left = Math.max(margin, Math.min(left, vw - nr.width - margin));

    var top;
    if (br.top >= nr.height + 14) {
      top = br.top - nr.height - 10;
      nudgeEl.classList.remove("tcs-pop-below");
    } else {
      top = br.bottom + 10;
      nudgeEl.classList.add("tcs-pop-below");
    }

    var arrowX = Math.max(14, Math.min(br.left + br.width / 2 - left, nr.width - 14));
    nudgeEl.style.setProperty("--tcs-arrow-x", arrowX + "px");
    nudgeEl.style.left = left + "px";
    nudgeEl.style.top = top + "px";
  }

  function showNudge() {
    if (nudgeOpen) return;
    var btn = rateButton();
    if (!btn) return;

    nudgeOpen = true;

    /* Stamp the shown-at time FIRST, so a dismissal keeps the slot and the
       repeat clock runs from the show rather than the close. */
    state.nudgeAt = Date.now();
    saveState();

    nudgeEl = buildNudge();
    document.body.appendChild(nudgeEl);
    nudgeEl.style.visibility = "hidden";
    positionNudge();
    nudgeEl.style.visibility = "";
    requestAnimationFrame(function () {
      if (nudgeEl) nudgeEl.classList.add("tcs-nudge-in");
    });

    /* Pulse the button so the eye connects card -> button. */
    btn.classList.add("tcs-rate-pulse");

    nudgeEl.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var t = ev.target.closest("[data-tcs]");
      var what = t && t.getAttribute("data-tcs");
      /* The stars are a button in everything but name — people click them
         expecting exactly this. */
      if (what === "nudge-rate" || what === "nudge-stars") goToStore();
      else if (what === "nudge-later" || what === "nudge-close") closeNudge();
    });

    var stars = nudgeEl.querySelector('[data-tcs="nudge-stars"]');
    if (stars) {
      stars.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); goToStore(); }
      });
    }

    /* Every dismissal path leaves the stamp in place, so the card returns in
       NUDGE_REPEAT days rather than being lost. */
    outsideHandler = function (ev) {
      if (nudgeEl && !nudgeEl.contains(ev.target)) closeNudge();
    };
    setTimeout(function () {
      document.addEventListener("click", outsideHandler, true);
    }, 0);

    keyHandler = function (ev) { if (ev.key === "Escape") closeNudge(); };
    document.addEventListener("keydown", keyHandler, true);

    var queued = false;
    followHandler = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; positionNudge(); });
    };
    window.addEventListener("resize", followHandler);
    window.addEventListener("scroll", followHandler, true);
  }

  function closeNudge() {
    if (nudgeTimer) { clearTimeout(nudgeTimer); nudgeTimer = null; }
    if (!nudgeOpen && !nudgeEl) return;
    nudgeOpen = false;

    if (outsideHandler) {
      document.removeEventListener("click", outsideHandler, true);
      outsideHandler = null;
    }
    if (keyHandler) {
      document.removeEventListener("keydown", keyHandler, true);
      keyHandler = null;
    }
    if (followHandler) {
      window.removeEventListener("resize", followHandler);
      window.removeEventListener("scroll", followHandler, true);
      followHandler = null;
    }
    if (nudgeEl) {
      var el = nudgeEl;
      nudgeEl = null;
      el.classList.remove("tcs-nudge-in");
      setTimeout(function () { el.remove(); }, 180);  // let the fade-out finish
    }
    var btn = rateButton();
    if (btn) btn.classList.remove("tcs-rate-pulse");
  }

  /* ── Boot ───────────────────────────────────────────────────────────── */

  function boot() {
    loadState(function (s) {
      state = s;
      saveState();

      /* Toolbar button -> straight to the store, no questions asked. */
      document.addEventListener("click", function (e) {
        if (e.target && e.target.closest && e.target.closest("#tcs-rate-btn")) goToStore();
      }, true);

      if (state.rated) { hideRateButton(); return; }

      scheduleNudge(TEST_MODE ? 400 : MOUNT_DELAY);

      /* A window left open for days still gets the card when it comes due. */
      setInterval(function () { scheduleNudge(); }, 60 * 60 * 1000);

      /* If the studio was hidden when the card came due, try again on return. */
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden) scheduleNudge(3000);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* ── Public API ─────────────────────────────────────────────────────── */

  window.TCSRate = {
    show: function () { closeNudge(); showNudge(); },
    close: closeNudge,
    goToStore: goToStore,
    reviewUrl: reviewUrl,
    getState: function () { return state; },
    reset: function () {
      state = normalize(null);
      state.installAt = Date.now();
      saveState();
      var btn = rateButton();
      if (btn) btn.style.display = "";
    }
  };
})();

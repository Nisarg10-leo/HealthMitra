// ─────────────────────────────────────────────────────────────────────────────
// More tools by SelectorsHub — footer cross-promotion panel
//
// A small grid icon sits beside the dark-theme moon in the footer. Clicking it
// opens a panel listing sister tools from the SelectorsHub ecosystem. The panel
// is rendered into <body> and positioned with `position: fixed` so the footer's
// overflow rules can never clip it.
//
// A small amber dot shows on the icon until the user opens the panel once (and
// again whenever TOOLS_LIST_VERSION is bumped, e.g. after adding a new tool).
// Every link carries UTM tags so clicks from TestCase Studio show up in
// analytics.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  "use strict";

  // Bump this when the list changes to re-show the "new" dot once.
  const TOOLS_LIST_VERSION = 3;
  const SEEN_KEY = "tcs_more_tools_seen_version";

  const UTM = "utm_source=testcase_studio&utm_medium=extension&utm_campaign=footer_more_tools";
  const withUtm = (url) => url + (url.includes("?") ? "&" : "?") + UTM;

  // Order = priority. Keep it to the tools most useful to someone recording
  // test cases; the "See all tools" link covers the rest.
  // `logo` = PNG in icons/tools/ (64×64). `icon` = inline SVG fallback for tools
  // without a logo file yet.
  const LOGO_DIR = "../icons/tools/";
  const TOOLS = [
    {
      // First on purpose: TestCase Studio users record and document tests —
      // exactly who Exploratory Tester is built for.
      name: "Exploratory Tester",
      desc: "Log bugs, notes & screenshots while exploring",
      url: "https://selectorshub.com/exploratory-tester/",
      logo: "exploratory-tester.png"
    },
    {
      name: "SelectorsHub",
      desc: "XPath, CSS & Playwright locators in a click",
      url: "https://selectorshub.com/selectorshub/",
      logo: "selectorshub.png"
    },
    {
      name: "Check My Links",
      desc: "Find broken links on any page",
      url: "https://selectorshub.com/checkmylinks/",
      logo: "check-my-links.png"
    },
    {
      name: "Auto Data Filler",
      desc: "Fill any form with test data in one click",
      url: "https://selectorshub.com/auto-data-filler/",
      logo: "auto-data-filler.png"
    },
    {
      name: "Screenshot with URL",
      desc: "Full-page shots stamped with URL",
      url: "https://selectorshub.com/screenshot-with-url/",
      logo: "screenshot-with-url.png"
    },
    {
      name: "Page Load Timer",
      desc: "See how fast every page really loads",
      url: "https://selectorshub.com/page-load-timer/",
      logo: "page-load-timer.png"
    },
    {
      name: "Modify Header",
      desc: "Add, edit & remove request headers",
      url: "https://selectorshub.com/modify-header/",
      logo: "modify-header.png"
    },
    {
      name: "Clear Cache",
      desc: "Clear cache, cookies & storage in a click",
      url: "https://chromewebstore.google.com/detail/clear-cache/epompmcepniobjioaagepjacapcoofof",
      logo: "clear-cache.png"
    },
    {
      name: "AnyFormat",
      desc: "Format emails, posts & comments in place",
      url: "https://www.selectorshub.com/anyformat/",
      color: "#ca7702",
      icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6M8 16h5"/>'
    },
    {
      name: "Testing Daily",
      desc: "Your daily dose of testing updates",
      url: "https://selectorshub.com/testing-daily/",
      logo: "testing-daily.png"
    }
  ];

  const ALL_TOOLS_URL = "https://selectorshub.com/";

  const toggle = document.querySelector(".sh-tools-toggle");
  if (!toggle) return;
  const dot = toggle.querySelector(".sh-tools-dot");

  // ── Build the panel ────────────────────────────────────────────────────────
  const panel = document.createElement("div");
  panel.id = "sh-tools-panel";
  panel.className = "sh-tools-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "More tools by SelectorsHub");
  panel.hidden = true;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  panel.innerHTML =
    '<div class="sh-tools-head">' +
      '<div>' +
        '<div class="sh-tools-title">More from SelectorsHub</div>' +
        '<div class="sh-tools-sub">Built for testers, by a tester</div>' +
      '</div>' +
      '<button type="button" class="sh-tools-close" aria-label="Close">&times;</button>' +
    '</div>' +
    '<div class="sh-tools-list">' +
      TOOLS.map((t) =>
        '<a class="sh-tool" target="_blank" rel="noopener" href="' + esc(withUtm(t.url)) + '">' +
          (t.logo
            ? '<img class="sh-tool-logo" src="' + esc(LOGO_DIR + t.logo) + '" alt="" width="30" height="30">'
            : '<span class="sh-tool-icon" style="--tool:' + esc(t.color) + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + t.icon + '</svg>' +
              '</span>') +
          '<span class="sh-tool-text">' +
            '<span class="sh-tool-name">' + esc(t.name) + '</span>' +
            '<span class="sh-tool-desc">' + esc(t.desc) + '</span>' +
          '</span>' +
          '<span class="sh-tool-arrow" aria-hidden="true">&rsaquo;</span>' +
        '</a>'
      ).join("") +
    '</div>' +
    '<a class="sh-tools-all" target="_blank" rel="noopener" href="' + esc(withUtm(ALL_TOOLS_URL)) + '">See all 15+ tools &rarr;</a>';

  document.body.appendChild(panel);

  // ── Positioning (opens upward from the footer icon) ───────────────────────
  function position() {
    const r = toggle.getBoundingClientRect();
    const w = panel.offsetWidth;
    const margin = 8;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - w - margin));
    panel.style.left = left + "px";
    panel.style.bottom = (window.innerHeight - r.top + 8) + "px";
    // Keep the little arrow pointing at the icon.
    panel.style.setProperty("--arrow-x", (r.left + r.width / 2 - left) + "px");
  }

  function open() {
    panel.hidden = false;
    position();
    toggle.setAttribute("aria-expanded", "true");
    toggle.classList.add("active");
    markSeen();
  }

  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.classList.remove("active");
  }

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.hidden ? open() : close();
  });
  panel.querySelector(".sh-tools-close").addEventListener("click", () => { close(); toggle.focus(); });
  panel.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  document.addEventListener("click", (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !toggle.contains(e.target)) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("resize", () => { if (!panel.hidden) position(); });

  // ── "New" dot, shown until the panel has been opened once ──────────────────
  const storage = (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) ? chrome.storage.local : null;

  function markSeen() {
    if (dot) dot.classList.add("hideElement");
    if (storage) storage.set({ [SEEN_KEY]: TOOLS_LIST_VERSION });
  }

  if (storage && dot) {
    storage.get(SEEN_KEY, (res) => {
      if ((res && res[SEEN_KEY]) !== TOOLS_LIST_VERSION) dot.classList.remove("hideElement");
    });
  }

  // Let captureEvents.js close the panel when the footer switches to ad-popup mode.
  window.tcsCloseMoreTools = close;
})();

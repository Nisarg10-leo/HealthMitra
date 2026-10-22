/*
 * TestCase Studio (Free) — Panel layout coordinator
 * -------------------------------------------------
 * Three controls in the header each open their own strip, and each used to
 * rewrite the grid's height on its own:
 *
 *   Filter          → .attributeFilter        → height: calc(100% - 285px / 244px)
 *   Set driver cmd  → .inputFeildContainer    → height: calc(100% - 285px / 244px)
 *   Customize       → .settings__container    → (absolutely positioned overlay)
 *
 * Because those numbers are absolute and each handler only knows its own state,
 * whichever control was clicked last won. Opening Filter then switching the
 * driver command on and off left the grid sized as though Filter were closed.
 * Clicking Customize made it worse: its panel is an overlay that covered the
 * Filter strip, so Filter looked like it had stopped working.
 *
 * This file is the single place that decides the layout:
 *   • the grid's height is measured from the real elements, never guessed;
 *   • Customize and Filter are mutually exclusive, so only one strip is ever
 *     open and the state always matches what's on screen;
 *   • the Customize overlay is positioned under whatever the header ends up
 *     being, including when it wraps on a narrow window.
 *
 * It runs after captureEvents.js, so its listeners fire after the original
 * handlers and get the last word on layout without changing them.
 */

(() => {
  const el = (sel) => document.querySelector(sel);

  const settingsPanel = () => el(".settings__container");
  const attributeRow = () => el(".attributeFilter");
  const configBtn = () => el(".uiConfigBtn");
  const filterBtn = () => el(".attrFilterBtn");

  const isVisible = (node) => !!node && window.getComputedStyle(node).display !== "none";

  /* ── 1. Grid height, measured ────────────────────────────────────────── */

  /*
   * Everything below the header (grid chrome + footer) is a constant: the
   * original code used 244px with a 73px header, so the remainder is 171px.
   * Only the header varies, so only the header is measured.
   *
   * Measuring the placeholder's own position instead would feed back on
   * itself — setting its height moves the grid above it, which changes the
   * next measurement, and the value walks away with every click.
   */
  // +9px (171 → 180): footer row (.infoBlock) raised from 33px to 42px to give
  // the "More Free Tools" button room. Keep in sync with .infoBlock min-height.
  const BELOW_HEADER = 180;

  function headerHeight() {
    let total = 0;
    [
      el("#downloadFileName"),      // name field + actions + Upgrade
      el(".rightContainerUpper"),   // run / script controls
      el(".attributeFilter"),       // Filter strip, when open
      el(".inputFeildContainer")    // driver-command strip, when open
    ].forEach((node) => {
      if (isVisible(node)) total += node.offsetHeight;
    });
    return total;
  }

  let pendingFrame = 0;
  let pendingSettle = 0;

  function applyGridHeight() {
    const placeholder = el(".tablePlaceholder");
    if (!placeholder) return;
    placeholder.style.height = `calc(100% - ${headerHeight() + BELOW_HEADER}px)`;
  }

  /*
   * Measured twice: once on the next frame so the grid resizes immediately,
   * and again once the strips' CSS transitions have finished. A single early
   * pass catches a strip mid-transition and lands a pixel or two out, which
   * is what made repeated clicking drift.
   */
  const SETTLE_MS = 250;

  function syncGridHeight() {
    if (pendingFrame) cancelAnimationFrame(pendingFrame);
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      applyGridHeight();
    });

    clearTimeout(pendingSettle);
    pendingSettle = setTimeout(applyGridHeight, SETTLE_MS);
  }

  /* ── 2. Customize overlay placement ──────────────────────────────────── */

  /*
   * The panel used to carry a hardcoded top: 73px, matching the old header
   * exactly. Measure instead, so it sits flush under the header whatever its
   * height — including when the row wraps.
   */
  function positionSettingsPanel() {
    const panel = settingsPanel();
    const toolbar = el(".rightContainerUpper");
    if (!panel || !toolbar) return;

    const top = toolbar.offsetTop + toolbar.offsetHeight;
    panel.style.top = top + "px";
    panel.style.maxHeight = `calc(100vh - ${top}px)`;
  }

  /* ── 3. One strip at a time ──────────────────────────────────────────── */

  // Closes the attribute strip and leaves its button and stored state matching.
  function closeAttributeRow() {
    const row = attributeRow();
    const button = filterBtn();
    if (!row || !isVisible(row)) return;

    row.style.display = "none";
    if (button) {
      button.classList.remove("active");
      button.classList.add("inactive");
    }
    try {
      browserType.storage.local.set({ studioAttributeFilter: "inactive" });
    } catch (e) { /* storage is best effort; the UI is already correct */ }
  }

  function closeSettingsPanel() {
    const panel = settingsPanel();
    if (panel) panel.style.display = "none";
  }

  /* ── 4. Whole action box is the hit area ─────────────────────────────── */

  /*
   * The handlers live on the small icon buttons, so only the icon itself was
   * clickable even though the whole box highlights on hover. Forward clicks
   * that land on the box (its label or padding) to the button inside it.
   *
   * #record is skipped: its handler is already on the box, so forwarding
   * would fire it twice and toggle recording straight back off.
   */
  function makeActionBoxesClickable() {
    document.querySelectorAll(".tcs-action").forEach((box) => {
      if (box.id === "record") return;

      const button = box.querySelector("button");
      if (!button) return;

      box.addEventListener("click", (event) => {
        // A click on the button itself already ran its handler and is just
        // bubbling through — forwarding it here would run it a second time.
        if (event.target === button || button.contains(event.target)) return;
        button.click();
      });
    });
  }

  /* ── 5. Column info tooltips ─────────────────────────────────────────── */

  /*
   * The grid's column headers use overflow:hidden, which clips an absolutely
   * positioned tooltip. The tooltip is therefore position:fixed, and its
   * coordinates are set here on hover — centred under its icon, nudged inwards
   * when it would run past either edge of the window.
   */
  function placeColumnTip(icon) {
    const tip = icon.querySelector(".tcs-col-info__tip");
    if (!tip) return;

    const iconBox = icon.getBoundingClientRect();
    const tipBox = tip.getBoundingClientRect();
    const margin = 8;

    let left = iconBox.left + iconBox.width / 2 - tipBox.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tipBox.width - margin));

    let top = iconBox.bottom + 7;
    if (top + tipBox.height > window.innerHeight - margin) {
      top = Math.max(margin, iconBox.top - tipBox.height - 7);   // flip above
    }

    tip.style.left = Math.round(left) + "px";
    tip.style.top = Math.round(top) + "px";
  }

  function initColumnInfoTips() {
    document.querySelectorAll(".tcs-col-info").forEach((icon) => {
      ["mouseenter", "focus"].forEach((evt) =>
        icon.addEventListener(evt, () => placeColumnTip(icon), true));
    });
  }

  /* ── 6. Keyboard access for the footer action buttons ────────────────── */

  /*
   * The Jira / TestRail / Slack buttons are anchors without an href, so Chrome
   * no longer shows the extension's own file URL in the status bar on hover.
   * An anchor without an href isn't activated by Enter, though, so that is
   * restored here to keep them usable from the keyboard.
   */
  function makeFooterButtonsKeyboardAccessible() {
    document.querySelectorAll('a[role="button"]').forEach((button) => {
      button.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        button.click();
      });
    });
  }

  function init() {
    const config = configBtn();
    const filter = filterBtn();

    makeActionBoxesClickable();
    initColumnInfoTips();
    makeFooterButtonsKeyboardAccessible();

    // Customize opens an overlay that would sit on top of the attribute strip.
    if (config) {
      config.addEventListener("click", () => {
        if (isVisible(settingsPanel())) closeAttributeRow();
        positionSettingsPanel();
        syncGridHeight();
      });
    }

    // Filter opens a strip that the overlay would hide.
    if (filter) {
      filter.addEventListener("click", () => {
        if (isVisible(attributeRow())) closeSettingsPanel();
        syncGridHeight();
      });
    }

    // The driver-command strip changes the height too.
    const driverToggle = document.getElementById("inputToggle");
    if (driverToggle) {
      driverToggle.addEventListener("click", syncGridHeight);

      // The driver-command control is laid out as a header tile (switch +
      // label). Make the whole tile toggle it, keep aria-checked in step with
      // the active/inactive classes captureEvents.js sets, and allow keyboard.
      const tile = driverToggle.closest(".tcs-driver-cmd");
      if (tile) {
        tile.addEventListener("click", (event) => {
          if (driverToggle.contains(event.target)) return; // already handled
          driverToggle.click();
        });
      }
      const syncAria = () =>
        driverToggle.setAttribute("aria-checked", driverToggle.classList.contains("active") ? "true" : "false");
      new MutationObserver(syncAria).observe(driverToggle, { attributes: true, attributeFilter: ["class"] });
      syncAria();
      // A mouse click shouldn't leave the keyboard focus ring on the switch.
      driverToggle.addEventListener("mousedown", (event) => event.preventDefault());
      driverToggle.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          driverToggle.click();
        }
      });
    }

    window.addEventListener("resize", () => {
      positionSettingsPanel();
      syncGridHeight();
    });

    watchAdsPanel();
    positionSettingsPanel();
    syncGridHeight();
  }

  /* ──────────────────────────────────────────────────────────────────────────
   * Ads panel state
   *
   * The toolbar and footer button rows are sized for the full window width.
   * With the ads panel taking a quarter of it there isn't room, so
   * integrations.css has a compact variant scoped to `.tcs-ads-open` on
   * .main__section. This keeps that class in step with the panel, so users who
   * never see the panel — ads-free and logged-in — keep the original spacing.
   *
   * The panel reaches its hidden state three different ways: it starts with
   * .hideElement, that class is dropped once ads load, and giveAccess() in
   * login-script.js removes the element outright. A MutationObserver covers all
   * three (and anything added later) without those call sites knowing about it,
   * and unlike :has() it works on the older Chrome and Edge builds MV3 still
   * supports.
   * ────────────────────────────────────────────────────────────────────────── */

  function adsPanelVisible() {
    const panel = document.querySelector(".right__section");
    if (!panel) return false;                                  // removed outright
    if (panel.classList.contains("hideElement")) return false; // hidden by class
    // Also catches display:none applied directly, and a zero-width panel.
    return panel.offsetParent !== null && panel.getBoundingClientRect().width > 1;
  }

  function syncAdsPanelClass() {
    const main = document.querySelector(".main__section");
    if (!main) return;
    const open = adsPanelVisible();
    if (main.classList.contains("tcs-ads-open") === open) return;
    main.classList.toggle("tcs-ads-open", open);
    // The rows change height between the two variants.
    syncGridHeight();
  }

  function watchAdsPanel() {
    const main = document.querySelector(".main__section");
    if (!main) return;

    syncAdsPanelClass();

    if (typeof MutationObserver === "undefined") return;

    /*
     * Watched narrowly on purpose. A subtree observer over .main__section would
     * fire on every node displayRows() writes — hundreds per redraw — and each
     * callback forces a layout to measure the panel. So: the parent for the
     * panel being added or removed, and the panel itself for its own class and
     * style. Nothing in the grid triggers either.
     */
    let panelObserver = null;
    const panelWatch = { attributes: true, attributeFilter: ["class", "style"] };

    function attachPanelObserver() {
      const panel = document.querySelector(".right__section");
      if (panelObserver) panelObserver.disconnect();
      if (!panel) { panelObserver = null; return; }
      panelObserver = new MutationObserver(syncAdsPanelClass);
      panelObserver.observe(panel, panelWatch);
    }

    // childList only, and not on the subtree: this fires when the panel is
    // removed or re-added as a direct child of .main__section.
    new MutationObserver(() => {
      attachPanelObserver();
      syncAdsPanelClass();
    }).observe(main, { childList: true });

    attachPanelObserver();

    // A resize can change the panel's measured width without touching the DOM.
    window.addEventListener("resize", syncAdsPanelClass);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

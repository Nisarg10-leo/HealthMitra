/*
 * TestCase Studio (Free) — Integration Bridge
 * -------------------------------------------
 * Lets the Pro integration modules (jira.js, testrail.js, slack.js, bugasura.js) run unchanged
 * inside the free extension, and enforces the free-tier daily quota.
 *
 * Two jobs:
 *   1. Adapter  — the Pro modules expect a multi-test-case model (`testCases`)
 *                 and IndexedDB screenshots (`screenshotDb`). The free version
 *                 records a single test case into `steps[]` with inline data-URL
 *                 screenshots. This file exposes the Pro shapes over the free data.
 *   2. Quota    — 3 uploads per tool per calendar day, counted and reset in
 *                 chrome.storage.local. No server, no account, no sign-up.
 *
 * Load order: after captureEvents.js, before jira.js / testrail.js / slack.js / bugasura.js.
 */

/* ──────────────────────────────────────────────────────────────────────────
 * 1. Free-tier quota
 * ────────────────────────────────────────────────────────────────────────── */

const TCS_QUOTA_KEY = "tcsIntegrationQuota";
const TCS_DAILY_LIMIT = 3;
const TCS_UPGRADE_URL = "https://www.selectorshub.com/testcase-studio-pro/plans/";

const TCS_TOOL_LABELS = {
  jira: "Jira",
  testrail: "TestRail",
  slack: "Slack",
  bugasura: "Bugasura"
};

// Local calendar day (not UTC) so the reset lines up with the user's own day.
function tcsToday() {
  const d = new Date();
  const pad = (n) => (n < 10 ? "0" + n : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tcsEmptyQuota() {
  return { date: tcsToday(), jira: 0, testrail: 0, slack: 0, bugasura: 0 };
}

// Reads the counter, rolling it over when the calendar day has changed.
async function tcsGetQuota() {
  let stored = null;
  try {
    const bag = await browserType.storage.local.get([TCS_QUOTA_KEY]);
    stored = bag ? bag[TCS_QUOTA_KEY] : null;
  } catch (e) {
    stored = null;
  }

  if (!stored || typeof stored !== "object" || stored.date !== tcsToday()) {
    const fresh = tcsEmptyQuota();
    try {
      await browserType.storage.local.set({ [TCS_QUOTA_KEY]: fresh });
    } catch (e) { /* storage unavailable: fall through with an in-memory count */ }
    return fresh;
  }

  // Repair a partially written record rather than blocking the user.
  return Object.assign(tcsEmptyQuota(), stored, { date: stored.date });
}

// How many uploads this tool has left today.
async function tcsRemaining(tool) {
  const quota = await tcsGetQuota();
  const used = Number(quota[tool]) || 0;
  return Math.max(0, TCS_DAILY_LIMIT - used);
}

// Records n successful uploads against today's allowance.
async function tcsConsume(tool, n) {
  const count = Number(n) || 1;
  const quota = await tcsGetQuota();
  quota[tool] = (Number(quota[tool]) || 0) + count;
  try {
    await browserType.storage.local.set({ [TCS_QUOTA_KEY]: quota });
  } catch (e) { /* best effort — never fail an upload over the counter */ }
  return Math.max(0, TCS_DAILY_LIMIT - quota[tool]);
}

/*
 * Gate called before an integration does any work.
 * Returns true when the upload may proceed; shows the upgrade popup and
 * returns false when today's allowance for that tool is spent.
 */
async function tcsCheckQuota(tool) {
  const left = await tcsRemaining(tool);
  if (left > 0) return true;
  tcsOpenQuotaModal(tool);
  return false;
}

/* ── Upgrade popup ── */

let tcsQuotaModal = null;
let tcsQuotaModalBody = null;
let tcsQuotaModalTitle = null;

function tcsInitQuotaModal() {
  tcsQuotaModal = document.querySelector("#integration_limit_modal");
  if (!tcsQuotaModal) return;

  tcsQuotaModalTitle = tcsQuotaModal.querySelector(".modal_title");
  tcsQuotaModalBody = tcsQuotaModal.querySelector(".modal_message");

  const close = () => { tcsQuotaModal.style.display = "none"; };
  const upgradeBtn = tcsQuotaModal.querySelector(".upgrade");
  const cancelBtn = tcsQuotaModal.querySelector(".cancel");
  if (upgradeBtn) upgradeBtn.addEventListener("click", close);
  if (cancelBtn) cancelBtn.addEventListener("click", close);
}

function tcsOpenQuotaModal(tool) {
  const label = TCS_TOOL_LABELS[tool] || tool;
  const noun = tool === "slack" ? "sends" : "uploads";
  if (!tcsQuotaModal) tcsInitQuotaModal();
  if (!tcsQuotaModal) {
    showSnackbar(`Daily ${label} limit reached (${TCS_DAILY_LIMIT}/day). Upgrade to Pro for unlimited ${noun}.`);
    return;
  }

  if (tcsQuotaModalTitle) tcsQuotaModalTitle.innerText = `${label} Daily Limit Reached`;
  if (tcsQuotaModalBody) {
    tcsQuotaModalBody.innerText =
      `The free version allows ${TCS_DAILY_LIMIT} ${label} ${noun} per day. ` +
      `Your limit resets tomorrow. Upgrade to TestCase Studio Pro for unlimited ` +
      `${label} ${noun}, plus Azure DevOps and qTest integrations.`;
  }

  tcsQuotaModal.style.display = "grid";
  try {
    browserType.runtime.sendMessage({ name: "focuse_tcs_window" });
  } catch (e) { /* window focus is a nicety, not a requirement */ }
}

/*
 * The "daily limit reached" line inside a picker, with an Upgrade button right
 * there — the tester has hit the wall mid-task, so the way out belongs next to
 * the message rather than only in the popup behind it.
 *
 * The alert renderers set .innerText, which wipes any previous button, so this
 * is called after them and cannot leave a stale one behind.
 */
function tcsShowLimitAlert(alertEl, tool) {
  const label = TCS_TOOL_LABELS[tool] || tool;
  // Slack receives sends, not uploads.
  const noun = tool === "slack" ? "sends" : "uploads";
  const message = `Daily ${label} limit reached — ${TCS_DAILY_LIMIT} ${noun} per day on the free version. ` +
    `Your limit resets tomorrow.`;
  if (!alertEl) return message;

  alertEl.innerText = message;
  alertEl.classList.remove("success", "info", "hideElement");
  alertEl.classList.add("error");

  // The button carries the benefit, not just the action — "Upgrade to Pro"
  // alone says what to do without saying what it buys.
  const upgrade = document.createElement("a");
  upgrade.className = "tcs-upgrade-inline";
  upgrade.href = TCS_UPGRADE_URL;
  upgrade.target = "_blank";
  upgrade.rel = "noopener";
  upgrade.innerText = `Upgrade for unlimited ${noun}`;
  alertEl.appendChild(upgrade);

  return message;
}

// Small "N of 3 left today" hint under each footer button.
async function tcsRefreshQuotaBadges() {
  for (const tool of Object.keys(TCS_TOOL_LABELS)) {
    const badge = document.querySelector(`.tcs-quota-badge[data-tool="${tool}"]`);
    if (!badge) continue;
    const left = await tcsRemaining(tool);
    badge.innerText = `${left}/${TCS_DAILY_LIMIT}`;
    badge.title = left > 0
      ? `${left} of ${TCS_DAILY_LIMIT} free ${TCS_TOOL_LABELS[tool]} ${tool === "slack" ? "sends" : "uploads"} left today`
      : `Daily ${TCS_TOOL_LABELS[tool]} limit reached — upgrade to Pro for unlimited ${tool === "slack" ? "sends" : "uploads"}`;
    badge.classList.toggle("tcs-quota-empty", left === 0);
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * 2. Data adapter — free `steps[]` presented as Pro's `testCases[]`
 * ────────────────────────────────────────────────────────────────────────── */

function tcsCurrentSteps() {
  return (typeof steps !== "undefined" && Array.isArray(steps)) ? steps : [];
}

function tcsTestCaseName() {
  const input = document.querySelector("#downloadFileName input");
  const typed = input && input.value ? input.value.trim() : "";
  if (typed) return typed;

  // Same fallback the Test Case download uses: domain + timestamp.
  const all = tcsCurrentSteps();
  const first = all.length ? String(all[0].dataText || "") : "";
  const domain = first.replace(/.+\/\/|www\.|\..+/g, "") || "TestCase";
  let stamp = "";
  try {
    stamp = typeof getFormattedTime === "function" ? getFormattedTime() : "";
  } catch (e) { stamp = ""; }
  return stamp ? `${domain}-${stamp}` : domain;
}

/*
 * Builds the single-element `testCases` array the Pro modules expect.
 * Step text is read from the grid (not the raw array) so any inline edits the
 * user made to Steps / Data / Exp Result are what actually gets uploaded —
 * matching the behaviour of the Test Case download button.
 */
function tcsBuildTestCases() {
  const all = tcsCurrentSteps();

  const stepEls = document.querySelectorAll(".allSteps");
  const dataEls = document.querySelectorAll(".dataCol");
  const expEls = document.querySelectorAll(".expRes");
  const actEls = document.querySelectorAll(".actRes");

  const text = (list, i, fallback) => {
    const el = list && list[i];
    const value = el && typeof el.innerText === "string" ? el.innerText.trim() : "";
    return value || (fallback == null ? "" : String(fallback));
  };

  const mapped = all.map((step, i) => ({
    // The step's own screenshot key, or undefined when it has no screenshot —
    // the Pro modules treat a missing id as "nothing to attach".
    id: (step && step.id) || undefined,
    step: text(stepEls, i, step && step.step),
    dataText: text(dataEls, i, step && step.dataText),
    expRes: text(expEls, i, step && step.expRes),
    actRes: text(actEls, i, step && step.actRes),
    relXpath: (step && step.relXpath) || "",
    relCss: (step && step.relCss) || ""
  }));

  return [{
    name: tcsTestCaseName(),
    isChecked: true,
    steps: mapped
  }];
}

// The Pro modules read `testCases` as a bare global at click time, so a getter
// keeps them looking at the current recording without any polling or syncing.
Object.defineProperty(window, "testCases", {
  configurable: true,
  get: tcsBuildTestCases
});

/* ── screenshotDb: the name the Pro modules use for the screenshot store ──
 *
 * Free now keeps screenshot bytes in the same IndexedDB store Pro does
 * (screenshotStore.js), so this is a straight delegation rather than the data
 * URL shim it used to be.
 */
var screenshotDb = {
  async list() {
    return tcsCurrentSteps()
      .map((step) => (step && step.id) || null)
      .filter(Boolean);
  },
  async get(id) {
    if (!id || typeof tcsShots === "undefined") return null;
    return tcsShots.blob(id);
  }
};

/* ──────────────────────────────────────────────────────────────────────────
 * 3. Shims for Pro globals the integrations touch
 * ────────────────────────────────────────────────────────────────────────── */

// Clears the red "required field" borders across every integration settings box.
function unsetBorder() {
  document
    .querySelectorAll(".jira__settings input, .testrail__settings input, .slack__settings input, .bugasura__settings input")
    .forEach((input) => { input.style.border = "1px solid #3d3c3c"; });
}

// Pro opens a settings modal; the free version has an inline settings panel.
// Same call sites, same effect.
var customizeModal = {
  classList: {
    remove() {
      const panel = document.querySelector(".settings__container");
      if (panel) panel.style.display = "block";
    },
    add() {
      const panel = document.querySelector(".settings__container");
      if (panel) panel.style.display = "none";
    },
    contains() {
      const panel = document.querySelector(".settings__container");
      return !!panel && panel.style.display === "block";
    }
  }
};

/* ──────────────────────────────────────────────────────────────────────────
 * 4. Footer buttons
 * ────────────────────────────────────────────────────────────────────────── */

/*
 * Jira, TestRail, Bugasura and Slack are all shown together. The footer used to have room
 * for only one of Jira / TestRail, so a radio in the settings panel chose
 * between them. There is space for both, and showing both means a tester sees
 * what is available without opening settings first.
 */
function tcsShowAllIntegrationButtons() {
  document.querySelectorAll(".default-upload-btn").forEach((btn) => {
    btn.style.display = "flex";
  });
}

/* Panel placement and the header strips are coordinated in panelLayout.js. */

document.addEventListener("DOMContentLoaded", () => {
  tcsInitQuotaModal();
  tcsShowAllIntegrationButtons();
  tcsRefreshQuotaBadges();
});

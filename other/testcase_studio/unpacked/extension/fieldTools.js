// ═══════════════════════════════════════════════════════════════════════════
// Credential field tools — v3.0.4
// ─────────────────────────────────────────────────────────────────────────────
// Adds an eye (show / mask) and a copy button inside every integration
// credential field: Jira, TestRail, Slack and Bugasura hostnames, usernames,
// API keys and tokens.
//
// • Masking uses CSS (-webkit-text-security), not type="password", so Chrome's
//   password manager never offers to save these values or autofills a saved
//   password into an API key box.
// • Keys and tokens start masked; hostnames and usernames start visible. The
//   choice is not stored, so secrets are masked again every time the window opens.
// • The inputs themselves are untouched: same ids, values and blur handlers,
//   so jira.js / testrail.js / slack.js / bugasura.js keep working as they are.
// ═══════════════════════════════════════════════════════════════════════════

(() => {
  const FIELDS = [
    { id: "jira-hostname", label: "Jira hostname", secret: false },
    { id: "jira-username", label: "Jira username", secret: false },
    { id: "jira-apikey", label: "Jira API token", secret: true },
    { id: "testrail-hostname", label: "TestRail hostname", secret: false },
    { id: "testrail-username", label: "TestRail username", secret: false },
    { id: "testrail-apikey", label: "TestRail API key", secret: true },
    { id: "slack-token", label: "Slack bot token", secret: true },
    { id: "bugasura-apikey", label: "Bugasura API key", secret: true },
  ];

  const svg = (body) =>
    `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

  const ICON_EYE = svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>');
  const ICON_EYE_OFF = svg(
    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.4 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94"/>' +
    '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/>' +
    '<path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="2" y1="2" x2="22" y2="22"/>');
  const ICON_COPY = svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>');
  const ICON_CHECK = svg('<polyline points="20 6 9 17 4 12"/>');

  const notify = (message) => {
    try { if (typeof showSnackbar === "function") return showSnackbar(message); } catch (e) { /* fall through */ }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Older builds / no clipboard permission: the textarea route still works.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  };

  const enhance = ({ id, label, secret }) => {
    const input = document.getElementById(id);
    if (!input || input.closest(".tcs-field")) return;

    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");

    const wrap = document.createElement("div");
    wrap.className = "tcs-field";
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    const tools = document.createElement("div");
    tools.className = "tcs-field__tools";

    const eye = document.createElement("button");
    eye.type = "button";
    eye.className = "tcs-field__btn tcs-field__eye";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "tcs-field__btn tcs-field__copy";
    copy.innerHTML = ICON_COPY;
    copy.title = `Copy ${label}`;
    copy.setAttribute("aria-label", `Copy ${label}`);

    tools.appendChild(eye);
    tools.appendChild(copy);
    wrap.appendChild(tools);

    const setMasked = (masked) => {
      input.classList.toggle("tcs-masked", masked);
      eye.innerHTML = masked ? ICON_EYE : ICON_EYE_OFF;
      const text = masked ? `Show ${label}` : `Hide ${label}`;
      eye.title = text;
      eye.setAttribute("aria-label", text);
      eye.setAttribute("aria-pressed", masked ? "false" : "true");
    };
    setMasked(secret);

    // Don't steal focus from the input on click (keeps the caret where it was
    // while toggling), but keep the buttons reachable with Tab.
    [eye, copy].forEach((btn) => btn.addEventListener("mousedown", (e) => e.preventDefault()));

    eye.addEventListener("click", () => setMasked(!input.classList.contains("tcs-masked")));

    let resetTimer = null;
    copy.addEventListener("click", async () => {
      const value = input.value.trim();
      if (!value) {
        notify(`${label} is empty — nothing to copy.`);
        return;
      }
      const ok = await copyText(value);
      if (!ok) {
        notify(`Couldn't copy the ${label}.`);
        return;
      }
      copy.innerHTML = ICON_CHECK;
      copy.classList.add("is-copied");
      notify(`${label} copied`);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copy.innerHTML = ICON_COPY;
        copy.classList.remove("is-copied");
      }, 1400);
    });
  };

  const init = () => FIELDS.forEach(enhance);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

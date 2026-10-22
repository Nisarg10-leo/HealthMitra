// ═══════════════════════════════════════════════════════════════════════════
// TestCase Studio Pro — Expected Result generation (v2.6.7)
// ─────────────────────────────────────────────────────────────────────────────
// While recording, each new step gets an Expected Result:
//   1. instantly from smart rules (action + element details from the page)
//   2. then, when Chrome's built-in AI (Prompt API / Gemini Nano) is available,
//      rewritten by the on-device model.
// When the next step shows that the page changed, the previous step's automatic
// Expected Result is updated to mention the new page.
//
// step.expRes      the Expected Result column (existing field, exported everywhere)
// step.expResAuto  "rules" | "ai" while the text is automatic; false once the tester
//                  edits it. Tester text is never overwritten.
// Element details come from content-script/tcsElementContext.js (message.elementContext).
// Existing code is not modified: steps are read from `steps` and the grid.
// ═══════════════════════════════════════════════════════════════════════════

(() => {
  "use strict";

  const grid = document.getElementById("records-grid");
  if (!grid) return;
  const api = (typeof browserType !== "undefined" && browserType) || (typeof chrome !== "undefined" ? chrome : null);

  const SETTINGS_KEY = "tcsExpResultSettings";
  const settings = { auto: true, engine: "ai" };   // engine: "ai" | "rules"

  const currentSteps = () => (Array.isArray(window.steps) ? window.steps : []);

  // ── helpers ────────────────────────────────────────────────────────────────
  // red dot that record-script.js adds to the page title while recording
  const REC_MARK = /\u{1F534}/gu;
  const clean = (s, max) => {
    let out = String(s == null ? "" : s).replace(REC_MARK, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
    if (max && out.length > max) out = out.slice(0, max - 1).trim() + "…";
    return out;
  };
  const q = (s) => `"${clean(s, 60)}"`;
  const sentence = (s) => {
    let out = clean(s, 220);
    if (!out) return "";
    out = out.charAt(0).toUpperCase() + out.slice(1);
    return /[.!?]$/.test(out) ? out : out + ".";
  };
  const isMasked = (v) => /^\*{3,}$/.test(String(v || "").trim());

  const humanize = (s) => clean(String(s || "")
    .replace(/\.(html?|php|aspx?|jsp)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2"), 40)
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const parseUrl = (u) => { try { return new URL(u); } catch (e) { return null; } };
  const routeKey = (u) => {
    const url = parseUrl(u);
    if (!url) return String(u || "");
    const hashRoute = /^#[!/]/.test(url.hash) ? url.hash.split("?")[0] : "";
    return url.origin + url.pathname.replace(/\/+$/, "") + hashRoute;
  };
  const pageName = (u, title) => {
    const t = clean(title, 50);
    if (t) return t.split(/\s+[|\-–—]\s+/)[0] || t;
    const url = parseUrl(u);
    if (!url) return "";
    const route = (/^#[!/]/.test(url.hash) ? url.hash.replace(/^#!?/, "") : url.pathname).split("?")[0];
    const last = route.split("/").filter(Boolean).pop();
    return last ? humanize(decodeURIComponent(last)) : `${url.hostname.replace(/^www\./, "")} home`;
  };

  // Element details for steps recorded before v2.6.7 or imported (no page context).
  const ctxFromStep = (step) => {
    const ctx = {};
    const xp = String(step.relXpath || "");
    const css = String(step.relCss || "");
    const tagMatch = xp.match(/^\/\/(?:\*\[)?([a-zA-Z][\w-]*)/) || css.match(/^([a-zA-Z][\w-]*)/);
    if (tagMatch && tagMatch[1] !== "*") ctx.tag = tagMatch[1].toLowerCase();
    const typeMatch = (xp + " " + css).match(/@?type\s*=\s*['"]([\w-]+)['"]/i);
    if (typeMatch) ctx.type = typeMatch[1].toLowerCase();
    const pw = String(step.playwrightLocator || "");
    const role = pw.match(/getByRole\(\s*['"]([\w-]+)['"](?:\s*,\s*\{[^}]*name\s*:\s*['"]([^'"]*)['"])?/);
    if (role) { ctx.role = role[1].toLowerCase(); if (role[2]) ctx.ariaLabel = role[2]; }
    const ph = pw.match(/getByPlaceholder\(\s*['"]([^'"]*)['"]/);
    if (ph) ctx.placeholder = ph[1];
    const lbl = pw.match(/getByLabel\(\s*['"]([^'"]*)['"]/);
    if (lbl) ctx.label = lbl[1];
    (step.backupLocators || []).forEach((b) => {
      const m = String(b && b.locator || "").match(/placeholder=["']([^"']+)["']/);
      if (m && !ctx.placeholder) ctx.placeholder = m[1];
    });
    if (ctx.role === "link") ctx.tag = ctx.tag || "a";
    if (ctx.type === "password" || /password/i.test([ctx.placeholder, ctx.label, step.planeLabel].join(" "))) ctx.isPassword = true;
    if (/search/i.test([ctx.placeholder, ctx.label, ctx.ariaLabel, step.planeLabel, ctx.role].join(" "))) ctx.isSearch = true;
    return ctx;
  };

  const KEY_NAMES = { sendKeys: "Enter", submit: "Enter", arrowUp: "Up Arrow", arrowDown: "Down Arrow",
    capsLock: "Caps Lock", shift: "Shift", esc: "Esc", backspace: "Backspace", delete: "Delete" };

  const normalizeCommand = (cmd) => {
    if (!cmd) return null;
    if (KEY_NAMES[cmd]) return "pressKey";
    return ({ "scroll down": "scrollDown", "scroll up": "scrollUp", addSelection: "select", back: "goBack" })[cmd] || cmd;
  };

  const inferCommand = (step, ctx, index) => {
    const s = String(step.step || "").toLowerCase();
    if (index === 0 && !step.relXpath && !step.relCss && /^https?:/.test(step.dataText || "")) return "openWebsite";
    if (/^(assert|verify|wait for|store|mouse over)\b/.test(s)) return "contextMenu";
    if (/\bpress(es)?\b/.test(s) && !step.relXpath) return "pressKey";
    if (/\bpress(es)?\b/.test(s) && /enter|arrow|esc|delete|backspace|shift|caps/.test(s)) return "pressKey";
    if (/scroll(s)? down/.test(s)) return "scrollDown";
    if (/scroll(s)? up/.test(s)) return "scrollUp";
    if (/^reload|refresh/.test(s) && !step.relXpath) return "refresh";
    if (/double[ -]?click/.test(s)) return "doubleClickAt";
    if (/right[ -]?click/.test(s)) return "rightClick";
    if (/^drag\b|drags\b/.test(s)) return "drag";
    if (/^drop\b|drops\b/.test(s)) return "drop";
    const field = ["input", "textarea"].includes(ctx.tag) || ["textbox", "searchbox"].includes(ctx.role);
    if (ctx.tag === "select" || /^select\b|selects\b/.test(s)) return "select";
    if (step.value && (field || /^(enter|type)\b|enters\b|types\b/.test(s))) return "type";
    return "clickAt";
  };

  const keyFromSentence = (s) => {
    const m = String(s || "").match(/press(?:es)?\s+(?:the\s+)?(.+?)(?:\s+key)?$/i);
    return m ? clean(m[1], 30) : "";
  };

  const pickLabel = (step, ctx) => {
    let label = clean(step.planeLabel, 200);
    if (!label || label.length > 60 || /^(\/\/|\(|#|\.)/.test(label) || /^https?:/.test(label)) {
      label = ctx.label || ctx.ariaLabel || ctx.buttonText || ctx.linkText || ctx.placeholder || ctx.text || ctx.title || ctx.alt || label;
    }
    return clean(label, 50) || "element";
  };

  // ── step info ──────────────────────────────────────────────────────────────
  const infoByStep = new WeakMap();

  const buildInfo = (step, index, list, msg, isOpen) => {
    const ctx = Object.assign({}, ctxFromStep(step),
      (step && step.elementContext) || {}, (msg && msg.elementContext) || {});
    // Free build keeps the recorder command on the step, so backfilling an old
    // recording (no live message) still knows what the action was.
    let cmd = isOpen ? "openWebsite" : normalizeCommand((msg && msg.command) || (step && step.command));
    if (!cmd) cmd = inferCommand(step, ctx, index);
    const info = {
      cmd,
      rawCommand: (msg && msg.command) || (step && step.command) || "",
      key: (msg && KEY_NAMES[msg.command]) || keyFromSentence(step.step),
      sentence: clean(step.step, 200),
      contextAction: cmd === "contextMenu" ? clean((msg && msg.data) || step.step, 60) : "",
      label: isOpen ? pageName(step.dataText, ctx.pageTitle) : pickLabel(step, ctx),
      // Free build: the typed value lives in step.dataText (Pro uses step.value).
      // On the "open website" step dataText holds the URL, but isOpen blanks it.
      value: cmd === "contextMenu" || isOpen ? "" :
        String(step.value != null ? step.value : (step.dataText != null ? step.dataText : "")),
      url: step.dataText || (msg && msg.URL) || "",
      ctx,
      prevSentences: list.slice(Math.max(0, index - 3), index).map((s) => clean(s && s.step, 80)).filter(Boolean),
      after: null
    };
    infoByStep.set(step, info);
    return info;
  };

  // ── smart rules ────────────────────────────────────────────────────────────
  const INTENTS = [
    [/\b(log ?in|sign ?in)\b/, (i) => `User is logged in successfully${i.afterText ? ` and ${i.afterText}` : ""}`],
    [/\b(log ?out|sign ?out)\b/, () => "User is logged out and the login page is displayed"],
    [/\b(sign ?up|register|create (an )?account)\b/, () => "Registration is submitted and the account is created successfully"],
    [/\badd to (cart|bag|basket)\b/, (i) => `${i.ctx.sectionHeading ? q(i.ctx.sectionHeading) : "The item"} is added to the cart and the cart count increases`],
    [/\b(remove|delete)\b/, (i) => `${i.ctx.sectionHeading ? q(i.ctx.sectionHeading) : "The selected item"} is removed and the list updates`],
    [/\b(check ?out)\b/, () => "Checkout page is displayed"],
    [/\b(place order|confirm order|pay( now)?|purchase|finish|complete order)\b/, () => "Order is placed and a confirmation message is displayed"],
    [/\bsearch\b|^(find|go)\b/, () => "Search results matching the entered text are displayed"],
    [/\b(cart|basket|bag)\b/, () => "Shopping cart is displayed with the added items"],
    [/\b(continue|next|proceed)\b/, (i) => i.afterText ? `The next step is displayed: ${i.afterPage}` : "The next step of the flow is displayed"],
    [/\b(back|previous)\b/, () => "The previous page or step is displayed"],
    [/\b(save|update)\b/, () => "Changes are saved successfully and a confirmation is shown"],
    [/\b(submit|send)\b/, () => "Form is submitted successfully"],
    [/\b(cancel|close|dismiss)\b|^[x×✕]$/, (i) => i.ctx.inDialog ? `${i.ctx.dialogTitle ? q(i.ctx.dialogTitle) : "The"} dialog is closed without saving changes` : `${q(i.label)} closes the current panel without saving changes`],
    [/\b(accept|agree|allow|got it)\b/, () => "Consent is accepted and the banner is closed"],
    [/\b(upload|browse|choose file|attach)\b/, () => "File picker opens to select a file"],
    [/\b(download|export)\b/, () => "File download starts"],
    [/\b(edit)\b/, (i) => `${q(i.label)} opens the item in edit mode`],
    [/\b(reset|clear)\b/, () => "Fields are cleared and reset to their default values"],
    [/\b(filter)\b/, () => "List is filtered according to the selected option"],
    [/\b(sort)\b/, () => "List is sorted according to the selected option"],
    [/\b(menu|hamburger)\b/, () => "Navigation menu opens and shows its options"],
    [/\b(yes|ok|confirm)\b/, (i) => i.ctx.inDialog ? "Action is confirmed and the dialog is closed" : "Action is confirmed successfully"],
    [/\b(view|details|more info|read more)\b/, (i) => `Details for ${q(i.ctx.sectionHeading || i.label)} are displayed`]
  ];

  const clickRule = (i) => {
    const c = i.ctx;
    const text = `${i.label} ${c.buttonText || ""} ${c.ariaLabel || ""}`.toLowerCase();
    const newTab = c.linkTarget === "_blank" || /opens link in new tab/i.test(i.sentence);
    if (newTab) {
      const dest = c.href ? pageName(c.href) : "";
      return `${q(i.label)} opens in a new browser tab${dest ? ` showing the ${q(dest)} page` : ""}`;
    }
    if (c.checkRole === "radio" || c.role === "radio") return `${q(i.label)} option is selected`;
    if (c.checkRole === "switch" || c.role === "switch") return `${q(i.label)} is switched ${c.checked ? "on" : "off"}`;
    if (c.checkRole || c.role === "checkbox") return `${q(i.label)} checkbox is ${c.checked === false ? "unchecked" : "checked"}`;
    if (c.isTab || c.role === "tab") return `${q(i.label)} tab is selected and its content is displayed`;
    if (c.menuItem === "option") return `${q(i.label)} is selected`;
    if (c.hasPopup) return `${q(i.label)} menu opens and shows its options`;
    if (c.expanded === "false") return `${q(i.label)} expands and shows its content`;
    if (c.expanded === "true") return `${q(i.label)} collapses and hides its content`;
    for (const [re, make] of INTENTS) {
      if (re.test(text)) return make(i);
    }
    const isField = ["input", "textarea"].includes(c.tag) && !["submit", "button", "reset", "checkbox", "radio", "image"].includes(c.type);
    if (isField || ["textbox", "searchbox"].includes(c.role)) return `${q(i.label)} field is focused and ready for input`;
    if (c.tag === "select" || c.role === "combobox" || c.role === "listbox") return `${q(i.label)} dropdown opens and shows its options`;
    if (c.href || c.tag === "a" || c.role === "link") {
      const dest = i.afterPage || (c.href ? pageName(c.href) : "");
      return dest ? `${q(dest)} page is displayed` : `${q(i.label)} link opens the linked page`;
    }
    if (c.isSubmit) return "Form is submitted successfully";
    if (c.isButton || c.tag === "button" || c.role === "button") return `${q(i.label)} action is performed and the page updates accordingly`;
    return `${q(i.label)} is selected and the related content is displayed`;
  };

  const typeRule = (i) => {
    const c = i.ctx;
    const field = q(i.label);
    if (c.isPassword) return `Password is entered in the ${field} field and shown masked`;
    if (isMasked(i.value)) return `A masked value is entered in the ${field} field`;
    if (!i.value) return `${field} field is cleared`;
    if (c.isSearch) return `Search box shows ${q(i.value)}${c.hasPopup ? " and matching suggestions are listed" : ""}`;
    if (c.type === "email" || /e-?mail/i.test(i.label)) return `${field} field accepts the email ${q(i.value)}`;
    return `${field} field shows ${q(i.value)}`;
  };

  const contextMenuRule = (i) => {
    const a = i.contextAction.toLowerCase();
    const c = i.ctx;
    const el = q(i.label);
    const shownText = c.text || c.currentValue || i.label;
    if (/mouse over/.test(a)) return `${el} shows its hover state or tooltip`;
    if (/^store/.test(a)) return `${/title/.test(a) ? "Page title" : `Value of ${el}`} is stored for use in later steps`;
    const negative = /\bnot\b/.test(a);
    if (/title/.test(a)) return `Page title is ${q(c.pageTitle || i.label)}`;
    if (/not present/.test(a)) return `${el} is not present on the page`;
    if (/present/.test(a)) return `${el} is present on the page`;
    if (/not checked/.test(a)) return `${el} is not checked`;
    if (/checked/.test(a)) return `${el} is checked`;
    if (/not editable/.test(a)) return `${el} is not editable`;
    if (/editable/.test(a)) return `${el} is editable`;
    if (/selected label/.test(a)) return `${q(c.optionText || i.label)} is selected in ${el}`;
    if (/selected value/.test(a)) return `${el} ${negative ? "does not have" : "has"} the expected selected value${c.optionText && !negative ? ` ${q(c.optionText)}` : ""}`;
    if (/value/.test(a)) return `${el} contains the value ${q(c.currentValue || "")}`;
    if (/text/.test(a)) return negative ? `${el} does not show the unexpected text` : `${q(shownText)} text is displayed`;
    return `${el} is displayed as expected`;
  };

  const ruleExpected = (i) => {
    i.afterPage = i.after ? pageName(i.after.url, i.after.title) : "";
    i.afterText = i.afterPage ? `the ${q(i.afterPage)} page is displayed` : "";
    let text;
    switch (i.cmd) {
      case "openWebsite": text = `${q(i.label)} page loads successfully`; break;
      case "type": text = typeRule(i); break;
      case "select": text = `${q(i.value || i.ctx.optionText)} is selected in the ${q(i.label)} dropdown`; break;
      case "doubleClickAt":
        text = ["input", "textarea"].includes(i.ctx.tag) ? `Text in the ${q(i.label)} field is selected` : `${q(i.label)} is opened or activated`;
        break;
      case "rightClick": text = `Context menu for ${q(i.label)} is displayed`; break;
      case "pressKey": {
        const key = (i.key || "").toLowerCase();
        if (key === "enter") {
          if (i.ctx.isSearch) text = "Search results matching the entered text are displayed";
          else if (i.ctx.inForm) text = "Form is submitted successfully";
          else text = "Enter key is accepted and the related action is performed";
        } else if (/esc/.test(key)) text = "Open dialog or menu is closed";
        else if (/up arrow/.test(key)) text = "Highlight moves to the previous option";
        else if (/down arrow/.test(key)) text = "Highlight moves to the next option";
        else if (/backspace|delete/.test(key)) text = `Character is removed from the ${q(i.label)} field`;
        else if (/caps/.test(key)) text = "Caps Lock is toggled";
        else text = `${i.key || "Key"} key press is accepted`;
        break;
      }
      case "scrollDown": text = "Page scrolls down and further content is visible"; break;
      case "scrollUp": text = "Page scrolls up and earlier content is visible"; break;
      case "refresh": text = "Page reloads and displays its content correctly"; break;
      case "goBack": text = "Previous page is displayed"; break;
      case "goForward": text = "Next page in the browser history is displayed"; break;
      case "drag": text = `${q(i.label)} is picked up for dragging`; break;
      case "drop": text = `Dragged item is dropped onto ${q(i.label)} and the layout updates`; break;
      case "contextMenu": text = contextMenuRule(i); break;
      default: text = clickRule(i);
    }
    // navigation seen after a click / Enter: make sure the new page is mentioned
    if (i.afterText && ["clickAt", "doubleClickAt", "pressKey"].includes(i.cmd) && !/page is displayed|next step is displayed/.test(text)) {
      text = `${text.replace(/ and the page updates accordingly$/, "").replace(/ and the related content is displayed$/, "")} and ${i.afterText}`;
    }
    return sentence(text);
  };

  // ── Chrome built-in AI (Prompt API) ────────────────────────────────────────
  const AI_OPTS = {
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }]
  };
  const AI_SCHEMA = {
    type: "object",
    properties: { expected: { type: "string" } },
    required: ["expected"],
    additionalProperties: false
  };
  const AI_SYSTEM = [
    "You write the Expected Result column of manual test cases recorded by TestCase Studio.",
    "For one recorded user action you get the action, element and page details, and sometimes what happened next.",
    "Reply with one expected result: a single sentence of at most 20 words, present tense,",
    "describing what the application shows or does after the action. Do not restate the action itself.",
    "Use only the facts given; never invent messages, numbers or page names. Keep quoted names exactly as given.",
    "Mention a typed value unless it is masked. A draft is provided; improve it only if the details allow.",
    "Respond as JSON: {\"expected\": \"...\"}"
  ].join(" ");
  const AI_EXAMPLES = [
    { role: "user", content: "Action: type\nElement: input \"Username\" (text field in a form)\nValue: \"standard_user\"\nPage: \"Swag Labs\"\nDraft: \"Username\" field shows \"standard_user\"." },
    { role: "assistant", content: "{\"expected\": \"\\\"Username\\\" field shows \\\"standard_user\\\".\"}" },
    { role: "user", content: "Action: click\nElement: button \"Login\" (submit button in a form)\nPage: \"Swag Labs\"\nAfter the action: the page changed to \"Products\" (/inventory.html)\nDraft: User is logged in successfully and the \"Products\" page is displayed." },
    { role: "assistant", content: "{\"expected\": \"User is logged in and the \\\"Products\\\" page is displayed.\"}" },
    { role: "user", content: "Action: click\nElement: button \"Add to cart\"\nSection: \"Sauce Labs Backpack\"\nDraft: \"Sauce Labs Backpack\" is added to the cart and the cart count increases." },
    { role: "assistant", content: "{\"expected\": \"\\\"Sauce Labs Backpack\\\" is added to the cart and the cart badge count increases.\"}" },
    { role: "user", content: "Action: verify text\nElement: h2 \"Thank you for your order!\"\nDraft: \"Thank you for your order!\" text is displayed." },
    { role: "assistant", content: "{\"expected\": \"\\\"Thank you for your order!\\\" confirmation message is displayed.\"}" }
  ];

  const ai = { state: "checking", progress: 0, base: null, creating: null, error: "" };
  const aiApi = () => (typeof LanguageModel !== "undefined" ? LanguageModel : null);
  const aiReady = () => settings.engine === "ai" && !!ai.base;

  const aiRefresh = async () => {
    const lm = aiApi();
    if (!lm || typeof lm.availability !== "function") { ai.state = "unsupported"; renderPanel(); return; }
    try {
      const availability = await lm.availability(AI_OPTS);
      if (!(ai.state === "downloading" && availability !== "available")) ai.state = availability;
    } catch (e) {
      ai.state = "unsupported";
    }
    renderPanel();
    if (ai.state === "available" && settings.engine === "ai") aiEnsure(false);
  };

  const aiEnsure = (userGesture) => {
    if (ai.base) return Promise.resolve(ai.base);
    if (ai.creating) return ai.creating;
    const lm = aiApi();
    if (!lm) return Promise.resolve(null);
    if (!userGesture && ai.state !== "available") return Promise.resolve(null);
    ai.creating = (async () => {
      const opts = Object.assign({}, AI_OPTS, {
        initialPrompts: [{ role: "system", content: AI_SYSTEM }].concat(AI_EXAMPLES),
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            ai.state = "downloading";
            ai.progress = e.loaded || 0;
            renderPanel();
          });
        }
      });
      try {
        if (typeof lm.params === "function") {
          const p = await lm.params();
          if (p && typeof p.defaultTopK === "number") {
            opts.topK = Math.min(3, p.maxTopK || 3);
            opts.temperature = Math.min(0.3, typeof p.maxTemperature === "number" ? p.maxTemperature : 0.3);
          }
        }
      } catch (e) { /* use model defaults */ }
      try {
        ai.base = await lm.create(opts);
        ai.state = "available";
        ai.error = "";
      } catch (e) {
        ai.error = (e && e.message) || String(e);
        ai.state = /activation|gesture/i.test(ai.error) ? "needs-click" : "error";
      } finally {
        ai.creating = null;
        renderPanel();
      }
      return ai.base;
    })();
    return ai.creating;
  };

  const parseAiText = (raw) => {
    let text = raw;
    try {
      const obj = JSON.parse(raw);
      text = obj && typeof obj.expected === "string" ? obj.expected : "";
    } catch (e) { /* plain text answer */ }
    text = String(text || "").trim().replace(/^`+|`+$/g, "").trim();
    // unwrap only a fully quoted answer ("...") that has no other quotes inside
    if (/^".*"$/.test(text) && (text.match(/"/g) || []).length === 2) text = text.slice(1, -1);
    if (/^'.*'$/.test(text)) text = text.slice(1, -1);
    text = clean(text, 220).replace(/^expected( result)?\s*:\s*/i, "");
    if (text.length < 4 || /^(i |i'm|sorry|as an ai)/i.test(text)) return "";
    return sentence(text);
  };

  const aiGenerate = async (prompt) => {
    const base = await aiEnsure(false);
    if (!base) return "";
    const session = typeof base.clone === "function" ? await base.clone() : base;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const raw = await session.prompt(prompt, { responseConstraint: AI_SCHEMA, signal: controller.signal });
      return parseAiText(raw);
    } finally {
      clearTimeout(timer);
      if (session !== base && typeof session.destroy === "function") session.destroy();
    }
  };

  const describeAction = (i) => {
    switch (i.cmd) {
      case "openWebsite": return "open website";
      case "clickAt": return "click";
      case "doubleClickAt": return "double click";
      case "rightClick": return "right click";
      case "pressKey": return `press ${i.key || "key"}`;
      case "scrollDown": return "scroll down";
      case "scrollUp": return "scroll up";
      case "goBack": return "browser back";
      case "contextMenu": return i.contextAction.toLowerCase();
      default: return i.cmd;
    }
  };

  const buildPrompt = (i, draft) => {
    const c = i.ctx;
    const details = [];
    if (c.type) details.push(`type=${c.type}`);
    if (c.isSubmit) details.push("submit button");
    if (c.inForm) details.push("in a form");
    if (c.isSearch) details.push("search");
    if (c.checkRole) details.push(`${c.checkRole}, now ${c.checked ? "checked" : "unchecked"}`);
    if (c.hasPopup) details.push("opens a menu");
    if (c.expanded) details.push(`aria-expanded=${c.expanded}`);
    if (c.isTab) details.push("tab");
    if (c.required) details.push("required");
    const kind = c.role || (c.checkRole ? c.checkRole : c.isButton ? "button" : c.href ? "link" : c.tag) || "element";
    const lines = [`Action: ${describeAction(i)}`];
    if (i.cmd !== "openWebsite") lines.push(`Element: ${kind} ${q(i.label)}${details.length ? ` (${details.join(", ")})` : ""}`);
    if (c.text && clean(c.text, 60) !== i.label && i.cmd === "contextMenu") lines.push(`Element text: ${q(c.text)}`);
    if (i.value) lines.push(`Value: ${isMasked(i.value) || c.isPassword ? "(masked)" : q(i.value)}`);
    if (c.optionText && i.cmd === "select") lines.push(`Selected option: ${q(c.optionText)}`);
    const url = parseUrl(i.url);
    lines.push(`Page: ${c.pageTitle ? q(c.pageTitle) : "(untitled)"}${url ? ` (${url.pathname})` : ""}`);
    if (c.sectionHeading) lines.push(`Section: ${q(c.sectionHeading)}`);
    if (c.inDialog) lines.push(`Inside dialog: ${q(c.dialogTitle || "dialog")}`);
    if (c.href && i.cmd === "clickAt") {
      const h = parseUrl(c.href);
      if (h) lines.push(`Link goes to: ${h.hostname === (url && url.hostname) ? h.pathname : h.hostname + h.pathname}${c.linkTarget === "_blank" ? " (new tab)" : ""}`);
    }
    if (i.after) {
      const a = parseUrl(i.after.url);
      lines.push(`After the action: the page changed to ${i.after.title ? q(i.after.title) : "a new page"}${a ? ` (${a.pathname})` : ""}`);
    }
    if (i.prevSentences.length) lines.push(`Previous steps: ${i.prevSentences.join(" | ")}`);
    lines.push(`Draft: ${draft}`);
    return lines.join("\n");
  };

  // ── applying results ───────────────────────────────────────────────────────
  const versions = new WeakMap();
  const version = (step) => versions.get(step) || 0;

  const canWrite = (step) => !step.expRes || typeof step.expResAuto === "string";

  // Row for a step: same position, or the same position counted from the end when the
  // grid shows fewer rows than there are steps. Written only if the row shows this step.
  const rowText = (row) => {
    const col = row && row.querySelector(".stepColumn");
    const holder = col && (col.querySelector(".tableData") || col.children[0] || col);
    return holder ? clean(holder.innerText) : "";
  };
  const updateCell = (step) => {
    const list = currentSteps();
    const index = list.indexOf(step);
    if (index < 0) return;
    const rows = grid.querySelectorAll(":scope > tr");
    const candidates = [rows[index], rows[index - (list.length - rows.length)]];
    const row = candidates.find((r) => r && rowText(r) === clean(step.step));
    const cell = row && row.querySelector(".expResColumn .tableData");
    if (cell && document.activeElement !== cell) cell.innerText = step.expRes;
  };

  let saveTimer = null;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { if (typeof syncTestCasesToStorage === "function") syncTestCasesToStorage(); } catch (e) { /* ignore */ }
    }, 2000);   // one save for a burst of recorded steps
  };

  const applyExpected = (step, text, source) => {
    if (!text || !canWrite(step)) return false;
    step.expRes = text;
    step.expResAuto = source;
    versions.set(step, version(step) + 1);
    updateCell(step);
    scheduleSave();
    return true;
  };

  const runAi = async (step, info, expectedVersion) => {
    if (!aiReady() || version(step) !== expectedVersion || !canWrite(step)) return;
    let text = "";
    try {
      text = await aiGenerate(buildPrompt(info, step.expRes));
    } catch (e) {
      text = "";
    }
    if (text && version(step) === expectedVersion && canWrite(step)) applyExpected(step, text, "ai");
  };

  let aiChain = Promise.resolve();
  const queueAi = (step, info) => {
    if (!aiReady()) return;
    const v = version(step);
    aiChain = aiChain.then(() => runAi(step, info, v)).catch(() => {});
  };

  const generateFor = (step, info) => {
    if (!applyExpected(step, ruleExpected(info), "rules")) return false;
    queueAi(step, info);
    return true;
  };

  // ── recording: match new steps with their recorder message ────────────────
  const pending = [];
  const msgKey = (sentenceText, xpath, url) => [sentenceText || "", xpath || "", url || ""].join("\u0001");

  if (api && api.runtime && api.runtime.onMessage) {
    api.runtime.onMessage.addListener((message) => {
      if (message && message.type === "windowEvent" && message.data) {
        const now = Date.now();
        pending.push({ key: msgKey(message.data, message.relXpath, message.URL), msg: message, at: now });
        while (pending.length && (pending.length > 60 || now - pending[0].at > 120000)) pending.shift();
      }
      // no response: the recorder's own handler answers
    });
  }

  const takeMessage = (step, index) => {
    if (index === 0 && !step.relXpath && !step.relCss) {
      for (let k = pending.length - 1; k >= 0; k--) {
        if (pending[k].msg.URL === (step.pageUrl || step.dataText)) return { msg: pending[k].msg, isOpen: true };
      }
    }
    // Free build: the page URL lives in step.pageUrl (Pro keeps it in dataText).
    const key = msgKey(step.step, step.relXpath, step.pageUrl || step.dataText);
    for (let k = pending.length - 1; k >= 0; k--) {
      if (pending[k].key === key) return { msg: pending.splice(k, 1)[0].msg, isOpen: false };
    }
    return null;
  };

  const seen = new WeakSet();

  const onRecordedStep = (step, index, list, match) => {
    const info = buildInfo(step, index, list, match.msg, match.isOpen);
    if (settings.auto && !step.expRes) generateFor(step, info);

    // the previous action led to a different page → mention it in that step
    const prev = index > 0 ? list[index - 1] : null;
    const prevInfo = prev && infoByStep.get(prev);
    if (prevInfo && !prevInfo.after && ["clickAt", "doubleClickAt", "pressKey"].includes(prevInfo.cmd) &&
        routeKey(prevInfo.url) !== routeKey(info.url) && info.url) {
      prevInfo.after = { url: info.url, title: info.ctx.pageTitle || "" };
      if (settings.auto && typeof prev.expResAuto === "string") generateFor(prev, prevInfo);
    }
  };

  const scan = () => {
    const list = currentSteps();
    list.forEach((step, index) => {
      if (!step || typeof step !== "object" || seen.has(step)) return;
      seen.add(step);
      // automatic text saved before the recording dot was filtered out
      if (typeof step.expResAuto === "string" && /\u{1F534}/u.test(String(step.expRes || ""))) {
        step.expRes = sentence(step.expRes);
        updateCell(step);
        scheduleSave();
      }
      const match = takeMessage(step, index);
      if (match) onRecordedStep(step, index, list, match);
    });
  };

  let scanQueued = false;
  new MutationObserver(() => {
    if (scanQueued) return;
    scanQueued = true;
    setTimeout(() => { scanQueued = false; scan(); }, 0);
  }).observe(grid, { childList: true });

  // Tester edits the Expected Result: it becomes theirs.
  grid.addEventListener("input", (e) => {
    const cell = e.target && e.target.closest ? e.target.closest(".expResColumn") : null;
    if (!cell) return;
    const row = cell.closest("tr");
    const step = row ? currentSteps()[row.rowIndex - 1] : null;
    if (step) {
      step.expResAuto = false;
      versions.set(step, version(step) + 1);
    }
  }, true);

  // ── batch: fill empty / regenerate ─────────────────────────────────────────
  let batchRunning = false;
  const runBatch = async (mode) => {
    if (batchRunning) return;
    const list = currentSteps();
    const targets = list.filter((s) => s && (mode === "empty" ? !clean(s.expRes) : typeof s.expResAuto === "string"));
    if (!targets.length) {
      setPanelMessage(mode === "empty" ? "Every step already has an Expected Result." : "No automatic Expected Results to regenerate.");
      return;
    }
    batchRunning = true;
    renderPanel();
    let done = 0;
    for (const step of targets) {
      const index = list.indexOf(step);
      const isOpen = index === 0 && !step.relXpath && !step.relCss && /^https?:/.test(step.dataText || "");
      const info = infoByStep.get(step) || buildInfo(step, index, list, null, isOpen);
      if (mode === "empty") step.expRes = "";
      if (applyExpected(step, ruleExpected(info), "rules") && aiReady()) {
        setPanelMessage(`Generating with AI: ${done + 1} of ${targets.length}...`);
        await runAi(step, info, version(step));
      }
      done++;
      setPanelMessage(`${done} of ${targets.length} Expected Results filled.`);
    }
    batchRunning = false;
    renderPanel();
    setPanelMessage(`${done} Expected Result${done === 1 ? "" : "s"} ${mode === "empty" ? "filled" : "regenerated"}.`);
  };

  // ── UI: toolbar button + panel ─────────────────────────────────────────────
  const toolbar = document.getElementById("tcs-replay-controls");
  const button = document.createElement("button");
  button.id = "tcs-expres-btn";
  button.type = "button";
  button.className = "tcs-toolbar-btn tcs-expres-btn";
  button.title = "Expected Result auto-fill settings";
  button.innerHTML = '<span class="tcs-expres-dot"></span>' +
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.9 2.6 2.6.9-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9L19 13z"/></svg>' +
    " Exp Result";
  if (toolbar) toolbar.appendChild(button);

  const panel = document.createElement("div");
  panel.id = "tcs-expres-panel";
  panel.className = "hideElement";
  panel.innerHTML = `
    <div class="tcs-expres-panel__title">Expected Result</div>
    <label class="tcs-expres-row"><input type="checkbox" class="tcs-expres-auto"> Auto-fill while recording</label>
    <label class="tcs-expres-row">Engine
      <select class="tcs-expres-engine">
        <option value="ai">Chrome built-in AI (on-device)</option>
        <option value="rules">Smart rules (instant)</option>
      </select>
    </label>
    <div class="tcs-expres-status"></div>
    <button type="button" class="tcs-expres-ai-btn hideElement"></button>
    <div class="tcs-expres-actions">
      <button type="button" class="tcs-expres-fill">Fill empty Expected Results</button>
      <button type="button" class="tcs-expres-regen">Regenerate automatic ones</button>
    </div>
    <div class="tcs-expres-msg"></div>
    <div class="tcs-expres-note">Applies to the active test case. Text you type yourself is never overwritten. The AI runs on this computer; nothing is sent to a server.</div>`;
  document.body.appendChild(panel);

  const autoInput = panel.querySelector(".tcs-expres-auto");
  const engineSelect = panel.querySelector(".tcs-expres-engine");
  const statusEl = panel.querySelector(".tcs-expres-status");
  const aiBtn = panel.querySelector(".tcs-expres-ai-btn");
  const fillBtn = panel.querySelector(".tcs-expres-fill");
  const regenBtn = panel.querySelector(".tcs-expres-regen");
  const msgEl = panel.querySelector(".tcs-expres-msg");

  const setPanelMessage = (text) => { msgEl.textContent = text || ""; };

  const statusText = () => {
    switch (ai.state) {
      case "available": return ai.base ? "Chrome built-in AI is ready." : "Starting Chrome built-in AI...";
      case "downloadable": return "The on-device AI model is not downloaded yet. Smart rules are used until it is.";
      case "downloading": return `Downloading the on-device AI model${ai.progress ? ` (${Math.round(ai.progress * 100)}%)` : ""}... Smart rules are used meanwhile.`;
      case "needs-click": return "Click below to start Chrome built-in AI.";
      case "unavailable": return "This computer doesn't meet Chrome's requirements for built-in AI. Smart rules are used.";
      case "unsupported": return "Chrome built-in AI isn't available in this browser (Chrome 138+ on desktop is needed). Smart rules are used.";
      case "error": return `Chrome built-in AI could not start${ai.error ? ` (${ai.error})` : ""}. Smart rules are used.`;
      default: return "Checking Chrome built-in AI...";
    }
  };

  function renderPanel() {
    autoInput.checked = settings.auto;
    engineSelect.value = settings.engine;
    const usingAi = settings.engine === "ai";
    statusEl.textContent = usingAi ? statusText() : "Smart rules are used (instant, no AI).";
    const btnLabel = { downloadable: "Download AI model", "needs-click": "Start AI", error: "Try again" }[ai.state];
    aiBtn.textContent = btnLabel || "";
    aiBtn.classList.toggle("hideElement", !(usingAi && btnLabel));
    fillBtn.disabled = batchRunning;
    regenBtn.disabled = batchRunning;
    const mode = !settings.auto ? "off" : (usingAi && ai.base ? "ai" : "rules");
    button.setAttribute("data-mode", mode);
    button.title = mode === "off" ? "Expected Result auto-fill is off"
      : mode === "ai" ? "Expected Result auto-fill: Chrome built-in AI" : "Expected Result auto-fill: smart rules";
  }

  const saveSettings = () => {
    try { api.storage.local.set({ [SETTINGS_KEY]: { auto: settings.auto, engine: settings.engine } }); } catch (e) { /* ignore */ }
  };

  const positionPanel = () => {
    const r = button.getBoundingClientRect();
    const width = 320;
    panel.style.top = `${Math.round(r.bottom + 6)}px`;
    panel.style.left = `${Math.round(Math.max(8, Math.min(r.left, window.innerWidth - width - 8)))}px`;
  };

  button.addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = panel.classList.contains("hideElement");
    panel.classList.toggle("hideElement");
    if (opening) {
      positionPanel();
      setPanelMessage("");
      aiRefresh();
    }
  });
  document.addEventListener("click", (e) => {
    if (!panel.classList.contains("hideElement") && !panel.contains(e.target) && e.target !== button) panel.classList.add("hideElement");
  });
  window.addEventListener("resize", () => { if (!panel.classList.contains("hideElement")) positionPanel(); });

  autoInput.addEventListener("change", () => { settings.auto = autoInput.checked; saveSettings(); renderPanel(); });
  engineSelect.addEventListener("change", () => {
    settings.engine = engineSelect.value;
    saveSettings();
    renderPanel();
    if (settings.engine === "ai") aiRefresh();
  });
  aiBtn.addEventListener("click", () => { aiEnsure(true); renderPanel(); });   // click = user activation for the download
  fillBtn.addEventListener("click", () => runBatch("empty"));
  regenBtn.addEventListener("click", () => runBatch("regen"));

  // ── start ──────────────────────────────────────────────────────────────────
  try {
    api.storage.local.get([SETTINGS_KEY], (result) => {
      const saved = result && result[SETTINGS_KEY];
      if (saved) {
        if (typeof saved.auto === "boolean") settings.auto = saved.auto;
        if (saved.engine === "ai" || saved.engine === "rules") settings.engine = saved.engine;
      }
      renderPanel();
      if (settings.engine === "ai") aiRefresh();
    });
  } catch (e) {
    renderPanel();
    aiRefresh();
  }
  scan();

  // exposed for diagnostics and tests
  window.TCSExpectedResults = { ruleExpected, buildInfo, buildPrompt, parseAiText, settings, ai, runBatch };
})();

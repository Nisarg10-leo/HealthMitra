// ═══════════════════════════════════════════════════════════════════════════
// Bugasura integration — v3.0.4
// ─────────────────────────────────────────────────────────────────────────────
// Setup (once): the user pastes their Bugasura API key
// (Bugasura → User Settings → API Key, https://my.bugasura.io/account/userprofile).
//
// Footer "Bugasura" button → Select Project (grouped by team) → Sprint + Severity
//   → Upload / Upload with Screenshots
//   • One Bugasura issue per checked test case: summary = test case name,
//     description = steps table (Step / Expected / Actual) + attribution line,
//     browser / OS / resolution filled from the tester's machine.
//   • "Upload with Screenshots" attaches each step's screenshot to that issue.
//
// Bugasura REST API (https://api.bugasura.io, form-encoded, JSON responses).
// Auth header is the raw key: "Authorization: Basic <API_KEY>" (no base64 —
// Bugasura's own convention, same as their official MCP server).
//   GET  /v1/teams/getApps     teams with their projects nested
//   GET  /v1/teams/get         fallback: teams only
//   GET  /v1/projects/list     fallback: projects of one team
//   GET  /v1/sprints/list      sprints of a project (issues must belong to a sprint)
//   POST /v1/issues/add        create the issue
//   POST /v1/issues/attachments/add  attach a screenshot (multipart, attachments[])
//
// Self-contained IIFE, like slack.js: no globals added, nothing in jira.js /
// testrail.js / slack.js touched. Free tier: same daily quota as the others
// (tool key "bugasura" in integrationBridge.js).
// ═══════════════════════════════════════════════════════════════════════════

(() => {
  const bgEl = (sel) => document.querySelector(sel);

  const bgKeyInput = bgEl("#bugasura-apikey");
  const bgUploadBtn = bgEl("#save_btn_bugasura");
  const bgModal = bgEl("#bugasura-modal");
  if (!bgKeyInput || !bgUploadBtn || !bgModal) return;

  const bgTitleEl = bgModal.querySelector(".title");
  const bgAlert = bgModal.querySelector(".bugasura__alert");
  const bgInstructionError = bgModal.querySelector(".bugasura__instructions__error");
  const bgLoading = bgModal.querySelector(".bugasura__loading");
  const bgProjectsList = bgModal.querySelector(".bugasura__projects");
  const bgOptions = bgModal.querySelector(".bugasura-options");
  const bgSprintSelect = bgModal.querySelector("#bugasura-sprint-select");
  const bgSeveritySelect = bgModal.querySelector("#bugasura-severity-select");
  const bgNote = bgModal.querySelector(".bugasura-note");
  const bgNextBtn = bgModal.querySelector(".next");
  const bgCancelBtn = bgModal.querySelector(".cancel");
  const bgScreensBtn = bgModal.querySelector(".upload-with-screen");
  const bgCloseBtn = bgModal.querySelector(".close__icon");

  const BG_HOST = "https://api.bugasura.io";
  const BG_API = `${BG_HOST}/v1`;
  const BG_KEY_PAGE = "https://my.bugasura.io/account/userprofile";
  const BG_SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const BG_CREDIT_URL = "https://selectorshub.com/testcase-studio/";

  let bgTeams = [];                 // [{ id, name, projects: [{ id, name }] }]
  let bgSelected = null;            // { teamId, projectId }
  let bgSprintToken = 0;
  let bgBusy = false;

  // ── Settings: API key ──────────────────────────────────────────────────
  // Stored like jiraInfo / testRailInfo, in chrome.storage.local.

  // People often copy the whole header value from a curl example.
  const bgCleanKey = (value) => String(value || "").trim().replace(/^basic\s+/i, "").trim();

  browserType.storage.local.get(["bugasuraInfo"], ({ bugasuraInfo }) => {
    if (!bugasuraInfo) {
      return browserType.storage.local.set({ bugasuraInfo: { api_key: "" } });
    }
    bgKeyInput.value = bugasuraInfo.api_key || "";
  });

  bgKeyInput.addEventListener("blur", () => {
    unsetBorder();
    const key = bgCleanKey(bgKeyInput.value);
    bgKeyInput.value = key;
    if (!key) bgKeyInput.style.border = "1px solid red";
    browserType.storage.local.get(["bugasuraInfo"], ({ bugasuraInfo }) => {
      const info = Object.assign({}, bugasuraInfo, { api_key: key });
      browserType.storage.local.set({ bugasuraInfo: info });
    });
  });

  const bgGetKey = async () => {
    const { bugasuraInfo } = await browserType.storage.local.get(["bugasuraInfo"]);
    return bgCleanKey(bugasuraInfo && bugasuraInfo.api_key);
  };

  // ── HTTP ───────────────────────────────────────────────────────────────

  const bgErrorMessage = (response, data) => {
    const parts = [];
    if (data && typeof data === "object") {
      [data.message, data.error, data.errorMessage, data.error_message].forEach((msg) => {
        if (typeof msg === "string" && msg.trim() && parts.indexOf(msg.trim()) === -1) parts.push(msg.trim());
      });
      if (data.errors && typeof data.errors === "object") {
        Object.values(data.errors).forEach((msg) => { if (msg) parts.push(String(msg)); });
      }
    }
    const status = response ? response.status : 0;
    if (!parts.length || status === 401) {
      if (status === 401) parts.unshift("Bugasura rejected the API key. Copy it again from Bugasura → User Settings → API Key.");
      else if (status === 403) parts.push("This Bugasura user doesn't have permission for this action.");
      else if (status === 404) parts.push("Not found in Bugasura.");
      else if (status === 429) parts.push("Bugasura is rate-limiting requests. Wait a minute and try again.");
      else parts.push("Something Went Wrong");
    }
    return status ? `${parts.join(" ")} [HTTP ${status}]` : parts.join(" ");
  };

  // method: "GET" | "POST"; params → query string (GET) or form body (POST);
  // form: a ready FormData (multipart upload); bare: path is not under /v1.
  const bgRequest = async (method, path, { params, form, bare } = {}) => {
    const key = await bgGetKey();
    if (!key) throw new Error("Please enter your Bugasura API Key.");

    let url = `${bare ? BG_HOST : BG_API}${path}`;
    const init = {
      method,
      headers: { "Authorization": `Basic ${key}`, "Accept": "application/json" }
    };
    if (method === "GET" && params) {
      url += `?${new URLSearchParams(params).toString()}`;
    } else if (form) {
      init.body = form;               // browser sets the multipart boundary
    } else if (params) {
      // Bugasura wants every value as a string in POST bodies.
      const body = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") body.append(k, String(v));
      });
      init.body = body;
    }

    let response;
    try {
      response = await fetch(url, init);
    } catch (e) {
      throw new Error("Can't reach Bugasura (api.bugasura.io). Check your internet connection or VPN.");
    }
    let data = null;
    try { data = await response.json(); } catch (e) { data = null; }

    // Most endpoints answer status "OK", but not all (attachments/add replies
    // HTTP 200 "Attachment files uploaded successfully" without it). So only an
    // explicit failure status, or an HTTP error, counts as a failure.
    const apiStatus = data && typeof data === "object" && data.status != null ? String(data.status).trim() : "";
    const apiFailed = apiStatus !== "" && (/^(fail|failed|failure|error|false|0)$/i.test(apiStatus) || data.success === false);
    if (!response.ok || !data || apiFailed) {
      const err = new Error(bgErrorMessage(response, data));
      err.httpStatus = response.status;
      err.apiReplied = !!data;          // false: an HTML error page, i.e. no such route
      throw err;
    }
    return data;
  };

  // ── Teams and projects ─────────────────────────────────────────────────

  // Bugasura's own display rule: a team still on its default name reads "… Projects".
  const bgTeamName = (team) => {
    const name = team.name != null ? team.name : team.team_name;
    if (name == null) return `Team ${team.team_id}`;
    const alias = team.alias || team.team_alias_name || "";
    if (name === alias || name === "My Apps") return String(name).replace(" Apps", " Projects");
    return String(name);
  };

  // One call returns every team with its projects nested.
  const bgFetchTeamsWithApps = async () => {
    const data = await bgRequest("GET", "/teams/getApps");
    const rows = Array.isArray(data.userTeamsProjectsDetails) ? data.userTeamsProjectsDetails : [];
    return rows.map((team) => ({
      id: team.team_id,
      name: bgTeamName(team),
      projects: (team.appsDetails || [])
        .filter((p) => p && p.app_id != null)
        .map((p) => ({ id: p.app_id, name: p.app_name || `Project ${p.app_id}` }))
    }));
  };

  // Fallback for accounts where getApps isn't available: teams, then each team's projects.
  const bgFetchTeamsThenProjects = async () => {
    const data = await bgRequest("GET", "/teams/get", {
      params: { isActive: 1, isOnlyVerifiedTeams: 1, isGetSampleTeams: 1 }
    });
    const teams = (data.teamDetails || []).filter((t) => t && t.team_id != null && String(t.is_expired) !== "1");
    const out = [];
    for (const team of teams) {
      let projects = [];
      try {
        const list = await bgRequest("GET", "/projects/list", {
          params: {
            team_id: team.team_id, start_at: 0, max_results: 100,
            platform: "ALL", platform_type: "ALL", status: "ACTIVE", project_type: "all"
          }
        });
        projects = (list.project_list || [])
          .filter((p) => p && p.project_id != null)
          .map((p) => ({ id: p.project_id, name: p.project_name || `Project ${p.project_id}` }));
      } catch (e) { projects = []; }
      out.push({ id: team.team_id, name: bgTeamName(team), projects });
    }
    return out;
  };

  const bgFetchTeams = async () => {
    try {
      const teams = await bgFetchTeamsWithApps();
      if (teams.some((t) => t.projects.length)) return teams;
    } catch (err) {
      // A bad key fails the same way on the fallback — say so once, not twice.
      if (err.httpStatus === 401) throw err;
    }
    return bgFetchTeamsThenProjects();
  };

  // ── Sprints ────────────────────────────────────────────────────────────

  const bgFetchSprints = async (teamId, projectId) => {
    const data = await bgRequest("GET", "/sprints/list", { params: { team_id: teamId, project_id: projectId } });
    const list = data.sprintsList || data.sprint_list || data.sprints || [];
    return (Array.isArray(list) ? list : [])
      .filter((s) => s && s.sprint_id != null)
      .map((s) => ({ id: s.sprint_id, name: s.sprint_name || `Sprint ${s.sprint_id}`, status: String(s.sprint_status || "") }));
  };

  // ── UI helpers ─────────────────────────────────────────────────────────

  const bgShowAlert = (message, type) => {
    bgAlert.innerText = message;
    bgAlert.classList.remove("success", "error", "info");
    bgAlert.classList.add(type === "success" || type === "error" ? type : "info");
    bgAlert.classList.remove("hideElement");
  };

  const bgHideAlert = () => {
    bgAlert.classList.add("hideElement");
    bgAlert.classList.remove("success", "error", "info");
    bgAlert.innerText = "";
  };

  const bgSetLoader = (show) => bgLoading.classList.toggle("hideElement", !show);

  const bgRunning = () => bgBusy;

  const bgSetUploadEnabled = (enabled) => {
    if (bgRunning()) return;
    bgNextBtn.disabled = !enabled;
    bgScreensBtn.disabled = !enabled;
  };

  // progress row, same look as Jira's
  const bgProgressEl = document.createElement("div");
  bgProgressEl.className = "jira-progress hideElement";
  bgProgressEl.innerHTML =
    '<div class="jira-progress__label"></div>' +
    '<div class="jira-progress__track"><div class="jira-progress__bar"></div></div>' +
    '<div class="jira-progress__sub"></div>';
  bgAlert.insertAdjacentElement("afterend", bgProgressEl);

  const bgSetProgress = (label, done, total, sub) => {
    if (label == null) { bgProgressEl.classList.add("hideElement"); return; }
    bgProgressEl.classList.remove("hideElement");
    bgProgressEl.querySelector(".jira-progress__label").innerText = label;
    bgProgressEl.querySelector(".jira-progress__sub").innerText = sub || "";
    bgProgressEl.querySelector(".jira-progress__bar").style.width =
      total > 0 ? `${Math.min(100, Math.round((done * 100) / total))}%` : "0%";
  };

  const bgResetOptions = () => {
    bgSprintToken++;
    bgOptions.classList.add("hideElement");
    bgSprintSelect.innerHTML = "";
    bgNote.innerText = "";
  };

  const bgResetModal = () => {
    bgHideAlert();
    bgSetProgress(null);
    bgResetOptions();
    bgInstructionError.classList.add("hideElement");
    bgProjectsList.innerHTML = "";
    bgScreensBtn.style.display = "none";
    bgNextBtn.disabled = true;
    bgScreensBtn.disabled = false;
    bgNextBtn.innerText = "Upload";
    bgScreensBtn.innerText = "Upload with Screenshots";
  };

  const bgSavedSelection = async () => {
    try {
      const { bugasuraDefaultSelection } = await browserType.storage.local.get(["bugasuraDefaultSelection"]);
      return bugasuraDefaultSelection || {};
    } catch (e) { return {}; }
  };

  // ── Project list (grouped by team when there is more than one) ─────────

  const bgSelectProject = (el, teamId, projectId) => {
    Array.from(bgProjectsList.querySelectorAll(".bugasura__project")).forEach((child) => child.classList.remove("selected"));
    el.classList.add("selected");
    bgSelected = { teamId, projectId };
  };

  const bgRenderProjects = (saved) => {
    bgProjectsList.innerHTML = "";
    const withProjects = bgTeams.filter((t) => t.projects.length);
    const showTeams = withProjects.length > 1;
    let firstEl = null;
    let savedEl = null;
    bgSelected = null;

    withProjects.forEach((team) => {
      if (showTeams) {
        const head = document.createElement("div");
        head.className = "bugasura__team";
        head.innerText = team.name;
        bgProjectsList.appendChild(head);
      }
      team.projects.forEach((project) => {
        const el = document.createElement("div");
        el.className = "bugasura__project";
        el.dataset.team = team.id;
        el.dataset.id = project.id;
        el.innerText = project.name;
        el.addEventListener("click", () => {
          if (bgRunning()) return;
          bgSelectProject(el, team.id, project.id);
          bgLoadSprints();
        });
        bgProjectsList.appendChild(el);
        if (!firstEl) firstEl = { el, teamId: team.id, projectId: project.id };
        if (String(saved.projectId) === String(project.id) && String(saved.teamId) === String(team.id)) {
          savedEl = { el, teamId: team.id, projectId: project.id };
        }
      });
    });

    const pick = savedEl || firstEl;
    if (pick) {
      bgSelectProject(pick.el, pick.teamId, pick.projectId);
      // keep the remembered project in view in a long list
      try { pick.el.scrollIntoView({ block: "nearest" }); } catch (e) { /* cosmetic */ }
    }
    return !!pick;
  };

  // ── Sprint + severity row ──────────────────────────────────────────────

  const bgLoadSprints = async () => {
    const token = ++bgSprintToken;
    const sel = bgSelected;
    bgOptions.classList.remove("hideElement");
    bgSprintSelect.innerHTML = '<option value="">Loading sprints...</option>';
    bgSprintSelect.disabled = true;
    bgNote.innerText = "";
    bgSetUploadEnabled(false);
    if (!sel) return;

    let sprints = [];
    let problem = "";
    try {
      sprints = await bgFetchSprints(sel.teamId, sel.projectId);
    } catch (err) {
      problem = err.message || "unknown error";
    }
    if (token !== bgSprintToken) return;   // another project was clicked meanwhile

    bgSprintSelect.innerHTML = "";
    if (!sprints.length) {
      bgSprintSelect.appendChild(new Option(problem ? "Couldn't load sprints" : "No sprints in this project", ""));
      bgNote.innerText = problem
        ? `Couldn't load sprints (${problem}).`
        : "Bugasura files every issue under a sprint. Create a sprint in this project, then try again.";
      bgSetUploadEnabled(false);
      return;
    }

    const saved = await bgSavedSelection();
    if (token !== bgSprintToken) return;
    const savedSprint = saved.sprints && saved.sprints[sel.projectId];

    sprints.forEach((s) => {
      const label = s.status ? `${s.name} (${s.status.toLowerCase()})` : s.name;
      bgSprintSelect.appendChild(new Option(label, String(s.id)));
    });
    const pick = sprints.find((s) => String(s.id) === String(savedSprint))
      || sprints.find((s) => /in\s*progress/i.test(s.status))
      || sprints[0];
    bgSprintSelect.value = String(pick.id);
    bgSprintSelect.disabled = false;
    bgSetUploadEnabled(true);
  };

  // Severity options are fixed in Bugasura.
  bgSeveritySelect.innerHTML = "";
  BG_SEVERITIES.forEach((s) => bgSeveritySelect.appendChild(new Option(s.charAt(0) + s.slice(1).toLowerCase(), s)));
  bgSeveritySelect.value = "MEDIUM";

  // ── Issue content ──────────────────────────────────────────────────────

  const bgEscape = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const bgCell = (value) => bgEscape(String(value == null ? "" : value).trim()).replace(/\n/g, "<br>");

  // Description supports HTML. Same columns Jira gets, plus the attribution line.
  const bgStepsHtml = (steps) => {
    const rows = steps.map((step, i) =>
      `<tr><td>${i + 1}</td><td>${bgCell(step.step)}</td><td>${bgCell(step.expRes)}</td><td>${bgCell(step.actRes)}</td></tr>`
    ).join("");
    return `<table><thead><tr><th>#</th><th>Step</th><th>Expected Result</th><th>Actual Result</th></tr></thead>` +
      `<tbody>${rows}</tbody></table>` +
      `<p><em>Recorded with <a href="${BG_CREDIT_URL}">TestCase Studio</a> by SelectorsHub</em></p>`;
  };

  // Plain paragraphs, used only if Bugasura refuses the table.
  const bgStepsParagraphs = (steps) => steps.map((step, i) => {
    let line = `${i + 1}. ${bgCell(step.step)}`;
    if (String(step.expRes || "").trim()) line += ` | Expected: ${bgCell(step.expRes)}`;
    if (String(step.actRes || "").trim()) line += ` | Actual: ${bgCell(step.actRes)}`;
    return `<p>${line}</p>`;
  }).join("") + `<p>Recorded with TestCase Studio by SelectorsHub — ${BG_CREDIT_URL}</p>`;

  // Environment of the machine the test was recorded on.
  const bgEnvironment = () => {
    const ua = navigator.userAgent || "";
    let browser = "";
    let version = "";
    const edge = ua.match(/Edg\/([\d.]+)/);
    const chrome = ua.match(/Chrome\/([\d.]+)/);
    if (edge) { browser = "Edge"; version = edge[1]; }
    else if (chrome) { browser = "Chrome"; version = chrome[1]; }
    let os = "";
    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
    else if (/CrOS/i.test(ua)) os = "ChromeOS";
    else if (/Linux/i.test(ua)) os = "Linux";
    const resolution = (window.screen && screen.width) ? `${screen.width}x${screen.height}` : "";
    return { browser_name: browser, browser_version: version, os_name: os, resolution };
  };

  // The create response's shape isn't pinned down in Bugasura's docs: find the
  // numeric issue id (needed for attachments) and the readable key (e.g. "TCS12").
  const bgIssueIds = (data) => {
    const found = {};
    const walk = (obj, depth) => {
      if (!obj || typeof obj !== "object" || depth > 3) return;
      ["issue_key", "issue_id", "testresults_id", "bug_id", "id"].forEach((k) => {
        if (obj[k] != null && found[k] == null && typeof obj[k] !== "object") found[k] = String(obj[k]);
      });
      Object.values(obj).forEach((v) => { if (v && typeof v === "object") walk(v, depth + 1); });
    };
    walk(data, 0);
    const candidates = [found.testresults_id, found.issue_key, found.issue_id, found.bug_id, found.id].filter(Boolean);
    const numeric = candidates.find((v) => /^\d+$/.test(v)) || null;
    const label = [found.issue_id, found.issue_key].find((v) => v && !/^\d+$/.test(v))
      || (numeric ? `#${numeric}` : null);
    return { numeric, label };
  };

  // Resolves { data, params }: params are the values the issue was created with,
  // which an issues/update (screenshot upload) must send back unchanged.
  const bgCreateIssue = async ({ teamId, sprintId, summary, severity, steps }) => {
    const base = { team_id: teamId, sprint_id: sprintId, summary, severity, source: "API" };
    const full = Object.assign({}, base, { description: bgStepsHtml(steps), status: "New" }, bgEnvironment());
    try {
      return { data: await bgRequest("POST", "/issues/add", { params: full }), params: full };
    } catch (err) {
      // Auth / network problems won't be fixed by a smaller payload.
      if (err.httpStatus === 401 || err.httpStatus === 403 || !err.httpStatus || err.httpStatus >= 500) throw err;
      // A project whose workflow has no "New" status, or that refuses the table:
      // retry once with only the essentials and a plain description.
      const minimal = Object.assign({}, base, { description: bgStepsParagraphs(steps) });
      return { data: await bgRequest("POST", "/issues/add", { params: minimal }), params: minimal };
    }
  };

  const bgSniffImage = async (data) => {
    try {
      let bytes = null;
      if (data instanceof Blob) bytes = new Uint8Array(await data.slice(0, 4).arrayBuffer());
      else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data, 0, Math.min(4, data.byteLength));
      else if (ArrayBuffer.isView(data)) bytes = new Uint8Array(data.buffer, data.byteOffset, Math.min(4, data.byteLength));
      if (bytes && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return { ext: "png", type: "image/png" };
    } catch (e) { /* default below */ }
    return { ext: "jpg", type: "image/jpeg" };
  };

  // unique screenshot ids per test case that really exist in storage
  const bgScreenshotIds = async (cases) => {
    let stored = null;
    try { if (screenshotDb && typeof screenshotDb.list === "function") stored = new Set(await screenshotDb.list()); } catch (e) { stored = null; }
    return cases.map((tc) => [...new Set((tc.steps || []).map((step) => step && step.id).filter(Boolean))]
      .filter((id) => !stored || stored.has(id)));
  };

  // ── Screenshots ────────────────────────────────────────────────────────
  //
  // POST /v1/issues/attachments/add (multipart) is the live endpoint: it answers
  // HTTP 200 "Attachment files uploaded successfully". It says that even when it
  // stored nothing (an unrecognised file field), so its answer alone proves
  // nothing. The first upload therefore reads the issue back after each try:
  //   • one candidate file-field name per request, until the screenshot shows
  //     up on the issue (a unique file name makes it easy to spot);
  //   • the winning field is remembered, so later uploads are one request each.
  // Ids go under both naming styles Bugasura uses: the API's (issue_key, team_id,
  // sprint_id) and the web app's (testResultsId, teamId, reportId = sprint).
  // Everything is logged to the console as plain JSON ("[TCS Bugasura]").

  const BG_ATTACH_FIELD_KEY = "bugasuraAttachField";
  const BG_ATTACH_FIELDS = ["attachments[]", "issue_files[]", "files[]", "attachment_files[]", "attachments", "file", "issue_attachments[]"];

  // Remembered "attachment method" from earlier test builds: no longer used.
  try { browserType.storage.local.remove("bugasuraAttachMode"); } catch (e) { /* best effort */ }

  const bgJson = (value, max) => {
    let text = "";
    try { text = JSON.stringify(value); } catch (e) { text = String(value); }
    return max && text.length > max ? `${text.slice(0, max)}… (${text.length} chars)` : text;
  };

  // Per upload run: once every field has failed, don't repeat that for every screenshot.
  const bgAttachRun = { failed: null };

  const bgGetAttachField = async () => {
    try {
      const bag = await browserType.storage.local.get([BG_ATTACH_FIELD_KEY]);
      return (bag && bag[BG_ATTACH_FIELD_KEY]) || null;
    } catch (e) { return null; }
  };

  const bgIssueText = async (ctx) => {
    try {
      const data = await bgRequest("GET", "/issues/get", {
        params: { team_id: ctx.teamId, project_id: ctx.projectId, issue_key: ctx.issueId }
      });
      return JSON.stringify(data);
    } catch (e) {
      console.warn("[TCS Bugasura] couldn't read the issue back:", e.message);
      return null;
    }
  };

  const bgImageCount = (text) => (String(text || "").match(/\.(png|jpe?g)\b/gi) || []).length;

  const bgSendAttachment = async (ctx, file, field) => {
    const form = new FormData();
    form.append("issue_key", String(ctx.issueId));
    form.append("testresults_id", String(ctx.issueId));
    form.append("testResultsId", String(ctx.issueId));
    form.append("team_id", String(ctx.teamId));
    form.append("teamId", String(ctx.teamId));
    form.append("project_id", String(ctx.projectId));
    form.append("sprint_id", String(ctx.sprintId));
    form.append("reportId", String(ctx.sprintId));
    form.append(field, file, file.name);
    const data = await bgRequest("POST", "/issues/attachments/add", { form });
    console.info(`[TCS Bugasura] attachments/add (${field}) replied: ${bgJson(data, 2000)}`);
    return data;
  };

  const bgAttachScreenshot = async ({ teamId, projectId, sprintId, issueId, imageId, stepNo }) => {
    if (bgAttachRun.failed) throw new Error(bgAttachRun.failed);
    let buffer = null;
    try { buffer = await screenshotDb.get(imageId); } catch (e) { buffer = null; }
    if (!buffer) return false;
    const { ext, type } = await bgSniffImage(buffer);
    // Unique name, so the file can be recognised on the issue afterwards.
    const tag = `TCS-step-${stepNo || 1}-${Date.now().toString(36)}`;
    const file = new File([buffer], `${tag}.${ext}`, { type });
    const ctx = { teamId, projectId, sprintId, issueId };

    const known = await bgGetAttachField();
    if (known) {
      await bgSendAttachment(ctx, file, known);
      return true;
    }

    const before = await bgIssueText(ctx);
    console.info(`[TCS Bugasura] issue ${issueId} before upload: ${bgJson(before && JSON.parse(before), 4000)}`);
    const landed = (after) => after && (after.indexOf(tag) > -1 || bgImageCount(after) > bgImageCount(before));

    const tried = [];
    for (const field of BG_ATTACH_FIELDS) {
      try {
        await bgSendAttachment(ctx, file, field);
      } catch (err) {
        if (err.httpStatus === 401 || err.httpStatus === 403) throw err;
        tried.push(`${field}: ${err.message}`);
        continue;
      }
      // Can't check (issue unreadable, or it lists no attachments at all): trust
      // Bugasura's answer and stop, rather than risk storing the file several times.
      if (before == null || !/attach/i.test(before)) {
        console.warn("[TCS Bugasura] the issue data has no attachment info, so the upload can't be verified.");
        return true;
      }
      const after = await bgIssueText(ctx);
      if (landed(after)) {
        console.info(`[TCS Bugasura] "${field}" works — the screenshot is on issue ${issueId}.`);
        try { browserType.storage.local.set({ [BG_ATTACH_FIELD_KEY]: field }); } catch (e) { /* best effort */ }
        return true;
      }
      tried.push(`${field}: accepted, not on the issue`);
    }

    const after = await bgIssueText(ctx);
    console.warn(`[TCS Bugasura] no field put the screenshot on issue ${issueId}.\n${tried.join("\n")}` +
      `\nIssue after upload: ${bgJson(after && JSON.parse(after), 4000)}`);
    bgAttachRun.failed = "Bugasura answered \"uploaded successfully\" but the file isn't on the issue — details in the console ([TCS Bugasura])";
    throw new Error(bgAttachRun.failed);
  };

  // Numeric issue id from a readable key ("CHK12"), when the create response
  // carried only the readable one.
  const bgLookupNumericId = async ({ teamId, projectId, label }) => {
    if (!label || label.charAt(0) === "#") return null;
    try {
      const data = await bgRequest("GET", "/issues/list", {
        params: { team_id: teamId, project_id: projectId, start_at: 0, max_results: 50 }
      });
      const list = data.issue_list || data.issues || [];
      const hit = (Array.isArray(list) ? list : []).find((i) =>
        i && [i.issue_id, i.issue_key].some((v) => String(v) === String(label)));
      if (!hit) return null;
      const id = [hit.testresults_id, hit.issue_key, hit.issue_id].map((v) => String(v == null ? "" : v)).find((v) => /^\d+$/.test(v));
      return id || null;
    } catch (e) { return null; }
  };

  // ── Footer button: open the picker ─────────────────────────────────────

  bgUploadBtn.addEventListener("click", async () => {
    try {
      const checked = testCases.filter((tc) => tc.isChecked);
      if (testCases[0].steps.length < 1 || checked.length < 1) {
        showSnackbar("No Test Cases to Upload or Send");
        return;
      }

      // Free tier: stop before the project picker opens.
      if (!await tcsCheckQuota("bugasura")) return;

      if (!await bgGetKey()) {
        showSnackbar("Please enter your Bugasura API Key.");
        unsetBorder();
        bgKeyInput.style.border = "1px solid red";
        customizeModal.classList.remove("hideElement");
        uiConfigBtn.classList.remove("inactive");
        uiConfigBtn.classList.add("active");
        try { bgKeyInput.scrollIntoView({ block: "center" }); bgKeyInput.focus(); } catch (e) { /* cosmetic */ }
        return;
      }

      bgResetModal();
      bgTitleEl.innerText = "Select Project";
      bgSetLoader(true);
      bgModal.classList.remove("hideElement");

      bgTeams = await bgFetchTeams();
      bgSetLoader(false);

      const saved = await bgSavedSelection();
      if (saved.severity && BG_SEVERITIES.indexOf(saved.severity) > -1) bgSeveritySelect.value = saved.severity;

      if (!bgRenderProjects(saved)) {
        bgProjectsList.innerText = "No Projects are found, create a Project in your Bugasura account.";
        return;
      }
      bgScreensBtn.style.display = "block";
      bgLoadSprints();
    } catch (err) {
      bgSetLoader(false);
      bgResetOptions();
      bgNextBtn.disabled = true;
      bgInstructionError.classList.remove("hideElement");
      if (err && err.message) bgShowAlert(err.message, "error");
    }
  });

  // ── Upload ─────────────────────────────────────────────────────────────

  const bgUpload = async (withShots) => {
    if (bgBusy || !bgSelected || !bgSprintSelect.value) return;
    bgBusy = true;
    (withShots ? bgScreensBtn : bgNextBtn).innerText = "Uploading...";
    bgNextBtn.disabled = true;
    bgScreensBtn.disabled = true;
    bgSprintSelect.disabled = true;
    bgSeveritySelect.disabled = true;
    bgHideAlert();

    const { teamId, projectId } = bgSelected;
    const sprintId = bgSprintSelect.value;
    const severity = bgSeveritySelect.value || "MEDIUM";

    const created = [];
    const failures = [];
    let shotsDone = 0;
    let shotsFailed = 0;
    let lastShotError = "";
    try {
      let cases = testCases.filter((tc) => tc.isChecked);

      // Free tier: never create more issues than today's allowance permits.
      const allowance = await tcsRemaining("bugasura");
      if (allowance < 1) {
        tcsOpenQuotaModal("bugasura");
        tcsShowLimitAlert(bgAlert, "bugasura");
        return;
      }
      if (cases.length > allowance) cases = cases.slice(0, allowance);

      bgAttachRun.failed = null;
      const shotIds = withShots ? await bgScreenshotIds(cases) : cases.map(() => []);
      const totalShots = shotIds.reduce((n, ids) => n + ids.length, 0);
      const total = cases.length + totalShots;
      let done = 0;

      for (let c = 0; c < cases.length; c++) {
        const testCase = cases[c];
        const steps = testCase.steps || [];
        const sub = `Test case ${c + 1} of ${cases.length}: ${testCase.name}`;
        bgSetProgress(`Uploading to Bugasura: ${done} of ${total}`, done, total, sub);

        let issue = null;
        try {
          const createdIssue = await bgCreateIssue({ teamId, sprintId, summary: testCase.name, severity, steps });
          const data = createdIssue.data;
          issue = bgIssueIds(data);
          issue.params = createdIssue.params;
          console.info(`[TCS Bugasura] issue created: ${bgJson(data, 3000)}`);
          created.push(issue.label || testCase.name);
          if (!issue.numeric && shotIds[c].length) {
            issue.numeric = await bgLookupNumericId({ teamId, projectId, label: issue.label });
          }
        } catch (err) {
          failures.push({ name: testCase.name, message: err.message });
        }
        done++;

        for (const imageId of shotIds[c]) {
          if (!issue) { done++; continue; }
          bgSetProgress(`Uploading to Bugasura: ${done} of ${total}`, done, total, `${sub} · screenshots`);
          if (!issue.numeric) {
            shotsFailed++;
            lastShotError = "Bugasura did not return the issue's numeric id";
            done++;
            continue;
          }
          const stepNo = steps.findIndex((step) => step && step.id === imageId) + 1;
          try {
            if (await bgAttachScreenshot({ teamId, projectId, sprintId, issueId: issue.numeric, imageId, stepNo })) shotsDone++;
          } catch (err) {
            shotsFailed++;
            lastShotError = err.message;
          }
          done++;
        }
      }

      // Free tier: only issues Bugasura actually accepted count against the day.
      if (created.length) {
        await tcsConsume("bugasura", created.length);
        tcsRefreshQuotaBadges();

        const previous = await bgSavedSelection();
        const sprints = Object.assign({}, previous.sprints, { [projectId]: sprintId });
        browserType.storage.local.set({ bugasuraDefaultSelection: { teamId, projectId, sprints, severity } });
      }

      let message;
      let type;
      if (!failures.length) {
        message = `Test Cases Uploaded Successfully: ${created.join(", ")}`;
        type = "success";
      } else {
        const first = failures[0];
        const others = failures.length > 1 ? ` (${failures.length - 1} more test case${failures.length > 2 ? "s" : ""} failed)` : "";
        message = (created.length ? `${created.length} of ${cases.length} test cases uploaded (${created.join(", ")}). ` : "")
          + `"${first.name}" failed: ${first.message}${others}`;
        type = "error";
      }
      if (withShots && totalShots) {
        if (!/[.)\]]$/.test(message)) message += ".";
        message += shotsFailed
          ? ` Screenshots: ${shotsDone} attached, ${shotsFailed} failed (${lastShotError}).`
          : ` ${shotsDone} screenshot${shotsDone === 1 ? "" : "s"} attached.`;
        if (shotsFailed && type === "success") type = "info";
      }
      if (created.length) {
        const leftToday = await tcsRemaining("bugasura");
        if (!/[.)\]]$/.test(message)) message += ".";
        message += leftToday
          ? ` ${leftToday} of ${TCS_DAILY_LIMIT} free Bugasura uploads left today.`
          : ` That was your last free Bugasura upload today — the limit resets tomorrow.`;
      }
      bgShowAlert(message, type);
    } catch (err) {
      bgShowAlert(`Upload failed: ${err.message}`, "error");
    } finally {
      bgBusy = false;
      bgSetProgress(null);
      bgNextBtn.innerText = "Upload";
      bgScreensBtn.innerText = "Upload with Screenshots";
      bgNextBtn.disabled = false;
      bgScreensBtn.disabled = false;
      bgSprintSelect.disabled = !bgSprintSelect.value;
      bgSeveritySelect.disabled = false;
    }
  };

  bgNextBtn.addEventListener("click", () => bgUpload(false));
  bgScreensBtn.addEventListener("click", () => { if (!bgNextBtn.disabled) bgUpload(true); });

  // ── Close ──────────────────────────────────────────────────────────────

  const bgClose = () => {
    if (bgBusy) return;   // let a running upload finish and report
    bgResetModal();
    bgModal.classList.add("hideElement");
  };
  bgCancelBtn.addEventListener("click", bgClose);
  bgCloseBtn.addEventListener("click", bgClose);
})();

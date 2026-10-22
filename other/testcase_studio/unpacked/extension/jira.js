let jiraSettingsContainer = document.querySelector(".columns.jira__settings");
let jiraHostnameInput = document.querySelector("#jira-hostname");
let jiraUsernameInput = document.querySelector("#jira-username");
let jiraApiKeyInput = document.querySelector("#jira-apikey");
let jiraNextBtn = document.querySelector("#jira-modal .next-jira");
jiraNextBtn.disabled = true;
let selectedJiraProjectId = null;

let jiraModal = document.querySelector("#jira-modal");
let jiraProjectsList = document.querySelector("#jira-modal .jira__projects");
let jiraUploadScreenShots = document.querySelector("#jira-modal .upload-with-screen-jira");
let uploadWithScreenShotsJira = false;
let jiraCancelBtn = document.querySelector("#jira-modal .cancel-jira");
let jiraCloseBtn = document.querySelector("#jira-modal .close__icon");
// NOTE (free build): the "Integrate with" radio wiring that used to live here is gone.
// Jira, TestRail, Bugasura and Slack all have their own footer button, shown together, so there
// is nothing to switch between. Azure DevOps and qTest remain Pro-only.


browserType.storage.local.get(["jiraInfo"], ({ jiraInfo }) => {
    if(!jiraInfo){
      return browserType.storage.local.set({
        jiraInfo: {
          hostname: "",
          username: "",
          api_key: "",
        }
      })
    }

    jiraHostnameInput.value = jiraInfo.hostname;
    jiraUsernameInput.value = jiraInfo.username;
    jiraApiKeyInput.value = jiraInfo.api_key;
  });


jiraHostnameInput.addEventListener("blur", () => {
  unsetBorder()
if(!jiraHostnameInput.value) jiraHostnameInput.style.border = "1px solid red";

browserType.storage.local.get(["jiraInfo"], ({ jiraInfo }) => {
    let host = jiraHostnameInput.value.trim().replace(/\/+$/, "");
    if(host && !/^https?:\/\//i.test(host)) host = `https://${host}`;
    jiraInfo.hostname = host;
    if(jiraHostnameInput.value) jiraHostnameInput.style.border = "1px solid #3d3c3c";
    browserType.storage.local.set({ jiraInfo });
});
})

jiraUsernameInput.addEventListener("blur", () => {
  unsetBorder()
browserType.storage.local.get(["jiraInfo"], ({ jiraInfo }) => {
    jiraInfo.username = jiraUsernameInput.value.trim();
    if(jiraUsernameInput.value) jiraUsernameInput.style.border = "1px solid #3d3c3c";
    browserType.storage.local.set({ jiraInfo });
});
})

jiraApiKeyInput.addEventListener("blur", () => {
  unsetBorder()
if(!jiraApiKeyInput.value) jiraApiKeyInput.style.border = "1px solid red";
browserType.storage.local.get(["jiraInfo"], ({ jiraInfo }) => {
    jiraInfo.api_key = jiraApiKeyInput.value.trim();
    if(jiraApiKeyInput.value) jiraApiKeyInput.style.border = "1px solid #3d3c3c";
    browserType.storage.local.set({ jiraInfo });
});
});

let remoteUploadBtn = document.querySelector("#remote_save");

remoteUploadBtn.addEventListener("click", async () => {
    try {

      let checkedTestCases = testCases.filter(testCase => testCase.isChecked);
      if(testCases[0].steps.length < 1 || checkedTestCases.length < 1){
        showSnackbar("No Test Cases to Upload or Send");
        return;
      }

      // Free tier: stop before the project picker opens, so the user is never
      // asked to choose a project for an upload that cannot run.
      if(!await tcsCheckQuota("jira")) return;

      let { jiraInfo } = await browserType.storage.local.get(["jiraInfo"]);
      if(!jiraInfo || !jiraInfo.api_key || !jiraInfo.hostname){
        showSnackbar("Please enter Jira Details.");
        if(jiraInfo){
          unsetBorder()
          if(!jiraInfo.api_key) jiraApiKeyInput.style.border = "1px solid red";
          if(!jiraInfo.hostname) jiraHostnameInput.style.border = "1px solid red";
        }
        customizeModal.classList.remove("hideElement");
        uiConfigBtn.classList.remove("inactive");
        uiConfigBtn.classList.add("active");
        return;
      }
  
      hideJiraAlert();
      setJiraProgress(null);
      resetJiraIssueType();
      jiraInstructionError.classList.add("hideElement");
      setJiraLoader(true);
  
      jiraProjectsList.innerHTML = "";
      jiraModal.classList.remove("hideElement");
      
      let jiraObject = await getJiraProjects();
   
      let projects = Array.isArray(jiraObject) ? jiraObject : [];

  
      if(projects.length < 1){
        setJiraLoader(false);
        jiraNextBtn.disabled = true;
        return jiraProjectsList.innerText = "No Projects are found, create a Project in your Jira account.";
      }
      // reverse the projects array to show the latest project on top
      projects.reverse();
  
      setJiraLoader(false);
  
      let defaultJiraProjectId = null;
      let { jiraDefaultSelection } = await browserType.storage.local.get(["jiraDefaultSelection"]);
      if(jiraDefaultSelection){
        let sp = projects.filter(project => project.id === jiraDefaultSelection.projectId);
        if(sp.length > 0) defaultJiraProjectId = jiraDefaultSelection.projectId;
      }
  
      projects.forEach((project, index) => {
        let el = document.createElement("div");
        el.classList.add("jira__project");
        if(!defaultJiraProjectId){
          if(index === 0){
            el.classList.add("selected");
            selectedJiraProjectId = project.id;
          }
        }else{
          if(project.id === defaultJiraProjectId){
            el.classList.add("selected");
            selectedJiraProjectId = project.id;
          }
        }
        el.dataset.id = project.id;
        el.innerText = project.name;

        el.addEventListener("click", () => {
          let testRailProjectsList = document.querySelector("#jira-modal .jira__projects");
          Array.from(testRailProjectsList.children).forEach(child => {
            child.classList.remove("selected");
          })
          el.classList.add("selected");
          selectedJiraProjectId = project.id;
        })
       
        jiraProjectsList.appendChild(el);

        jiraNextBtn.disabled = false;
        jiraUploadScreenShots.style.display = 'block'

      });
      jiraLoadIssueTypes(selectedJiraProjectId);
    } catch (err) {
      setJiraLoader(false);
      resetJiraIssueType();
      jiraNextBtn.disabled = true;
      jiraInstructionError.classList.remove("hideElement");
      if(err && err.message) displayJiraAlert(err.message, "error");
    }
  })


  // ── Issue type (per project, loaded from Jira) ──
  const jiraIssueTypeRow = document.createElement("div");
  jiraIssueTypeRow.className = "jira-issuetype hideElement";
  jiraIssueTypeRow.innerHTML =
    '<label for="jira-issuetype-select">Issue type</label>' +
    '<select id="jira-issuetype-select"></select>' +
    '<div class="jira-issuetype-note"></div>';
  document.querySelector("#jira-modal .modal__action").insertAdjacentElement("beforebegin", jiraIssueTypeRow);
  const jiraIssueTypeSelect = jiraIssueTypeRow.querySelector("select");
  const jiraIssueTypeNote = jiraIssueTypeRow.querySelector(".jira-issuetype-note");
  let jiraIssueTypeToken = 0;

  const jiraUploadRunning = () => jiraNextBtn.innerText === "Uploading..." || jiraUploadScreenShots.innerText === "Uploading...";
  const setJiraUploadEnabled = (enabled) => {
    if (jiraUploadRunning()) return;
    jiraNextBtn.disabled = !enabled;
    jiraUploadScreenShots.disabled = !enabled;
  }

  const jiraFetchIssueTypes = async (info, projectId) => {
    const headers = jiraHeaders(info, { "Accept": "application/json" });
    // types this user can create in the project (Cloud, Data Center 8.4+)
    try {
      const r = await fetch(`${jiraBase(info)}${jiraApiPath()}/issue/createmeta/${projectId}/issuetypes?maxResults=200`, { headers });
      if (r.ok) {
        const d = await r.json();
        const list = Array.isArray(d) ? d : (d && (d.issueTypes || d.values)) || [];
        if (list.length) return list;
      }
    } catch (e) { /* try the project instead */ }
    // older Data Center: issue types of the project's scheme
    const r = await fetch(`${jiraBase(info)}${jiraApiPath()}/project/${projectId}`, { headers });
    if (r.status >= 400) throw new Error(await jiraErrorMessage(r));
    const d = await r.json();
    return (d && d.issueTypes) || [];
  }

  const jiraLoadIssueTypes = async (projectId) => {
    const token = ++jiraIssueTypeToken;
    jiraIssueTypeRow.classList.remove("hideElement");
    jiraIssueTypeSelect.innerHTML = '<option value="">Loading issue types...</option>';
    jiraIssueTypeSelect.disabled = true;
    jiraIssueTypeNote.innerText = "";
    setJiraUploadEnabled(false);
    if (!projectId) return;

    let types = [];
    let problem = "";
    try {
      const info = await getJiraInfo();
      if (!info) throw new Error("Please enter Jira Details.");
      await jiraConnect(info);
      types = (await jiraFetchIssueTypes(info, projectId)).filter(t => t && t.id && !t.subtask);
    } catch (err) {
      problem = err.message || "unknown error";
    }
    if (token !== jiraIssueTypeToken) return;   // another project was selected meanwhile

    jiraIssueTypeSelect.innerHTML = "";
    if (!types.length) {
      // fall back to the previous behaviour
      jiraIssueTypeSelect.appendChild(new Option("Task", ""));
      jiraIssueTypeNote.innerText = problem
        ? `Couldn't load issue types (${problem}). "Task" will be used.`
        : 'This project returned no issue types. "Task" will be used.';
      jiraIssueTypeSelect.disabled = true;
      setJiraUploadEnabled(true);
      return;
    }

    let saved = null;
    try {
      const { jiraDefaultSelection } = await browserType.storage.local.get(["jiraDefaultSelection"]);
      saved = jiraDefaultSelection && jiraDefaultSelection.issueTypes && jiraDefaultSelection.issueTypes[projectId];
    } catch (e) { saved = null; }
    if (token !== jiraIssueTypeToken) return;

    types.forEach(t => jiraIssueTypeSelect.appendChild(new Option(t.name, String(t.id))));
    const pick = types.find(t => String(t.id) === String(saved)) || types.find(t => /^task$/i.test(t.name)) || types[0];
    jiraIssueTypeSelect.value = String(pick.id);
    jiraIssueTypeSelect.disabled = false;
    setJiraUploadEnabled(true);
  }

  const resetJiraIssueType = () => {
    jiraIssueTypeToken++;
    jiraIssueTypeRow.classList.add("hideElement");
    jiraIssueTypeSelect.innerHTML = "";
    jiraIssueTypeNote.innerText = "";
  }

  // a different project was clicked (its own handler has already updated selectedJiraProjectId)
  document.querySelector("#jira-modal .jira__projects").addEventListener("click", (e) => {
    if (e.target && e.target.closest && e.target.closest(".jira__project") && !jiraUploadRunning()) {
      jiraLoadIssueTypes(selectedJiraProjectId);
    }
  });

  const jiraInstructionError = document.querySelector("#jira-modal .jira__instructions__error");

  const setJiraLoader = (show) => {
    document.querySelector(".jira__loading").classList.toggle("hideElement", !show);
  }

  const toggleJiraLoader = () => {
    let loading = document.querySelector(".jira__loading");
    if(loading.classList.contains("hideElement")) loading.classList.remove("hideElement");
    else loading.classList.add("hideElement");
  }
  
  const getJiraInfo = async () => {
    let { jiraInfo } = await browserType.storage.local.get(["jiraInfo"]);
    if(!jiraInfo || !jiraInfo.api_key || !jiraInfo.hostname){
      showSnackbar("Please enter Jira Details.");
      return;
    };
    return jiraInfo;
  }

  // ── Jira Cloud or Data Center / Server: detected automatically ──
  // Cloud:       REST API v3, rich-text (ADF) description, email + API token (Basic)
  // Data Center: REST API v2, wiki-markup description, personal access token (Bearer)
  //              or username + password (Basic)
  const jiraConn = { key: null, type: null, auth: null };

  // API base: repairs "https://http://..." saved by older versions, and tolerates a pasted
  // page address (Cloud sites never have a sub-path; Data Center may have one, e.g. /jira)
  const jiraBase = (info) => {
    const raw = String(info.hostname || "").trim().replace(/^https?:\/\/(https?:\/\/)/i, "$1");
    const m = raw.match(/^(https?:\/\/[^/?#]+)([^?#]*)/i);
    if (!m) return raw.replace(/\/+$/, "");
    const origin = m[1];
    const host = origin.replace(/^https?:\/\//i, "").split(":")[0];
    if (/\.(atlassian\.net|jira\.com)$/i.test(host)) return origin;
    const path = m[2]
      .replace(/\/(secure|browse|projects|issues|plugins|servicedesk|dashboards|rest|login\.jsp)(\/.*)?$/i, "")
      .replace(/\/+$/, "");
    return origin + path;
  }
  const jiraApiPath = () => (jiraConn.type === "cloud" ? "/rest/api/3" : "/rest/api/2");
  const jiraAuthHeader = (info, mode) => (mode === "bearer"
    ? `Bearer ${info.api_key}`
    : `Basic ${window.btoa(`${info.username || ""}:${info.api_key}`)}`);
  const jiraHeaders = (info, extra) => Object.assign(
    { "Authorization": jiraAuthHeader(info, jiraConn.auth) },
    jiraConn.type === "datacenter" ? { "X-Atlassian-Token": "no-check" } : {},
    extra || {});

  const jiraConnect = async (info) => {
    const base = jiraBase(info);
    const key = [base, info.username || "", info.api_key].join("\u0001");
    if (jiraConn.key === key && jiraConn.type && jiraConn.auth) return jiraConn;
    jiraConn.key = null;

    // 1. which Jira? serverInfo works without login on both
    let type = null;
    let reachable = false;
    try {
      const r = await fetch(`${base}/rest/api/2/serverInfo`, { headers: { "Accept": "application/json" } });
      reachable = true;
      if (r.ok) {
        const d = await r.json();
        type = d && d.deploymentType === "Cloud" ? "cloud" : "datacenter";
      }
    } catch (e) { reachable = false; }
    if (!reachable) throw new Error(`Can't reach Jira at ${base}. Check the Hostname (and VPN for company Jira).`);
    if (!type && /\.(atlassian\.net|jira\.com)$/i.test((base.match(/^https?:\/\/([^/:]+)/i) || [])[1] || "")) type = "cloud";

    // 2. which login works?
    const hasUser = !!(info.username && info.username.trim());
    let modes;
    if (type === "cloud") {
      if (!hasUser) throw new Error("This is Jira Cloud: enter your Atlassian account email as Username and an API token.");
      modes = ["basic"];
    } else if (type === "datacenter") {
      modes = hasUser ? ["bearer", "basic"] : ["bearer"];
    } else {
      // unknown (serverInfo not public): token first, so a wrong guess never counts as a failed password login
      modes = hasUser ? ["bearer", "basic"] : ["bearer"];
    }
    let lastError = "";
    for (const mode of modes) {
      const r = await fetch(`${base}/rest/api/2/myself`, {
        headers: { "Accept": "application/json", "Authorization": jiraAuthHeader(info, mode), "X-Atlassian-Token": "no-check" }
      });
      if (r.ok) {
        if (!type) {
          try {
            const si = await fetch(`${base}/rest/api/2/serverInfo`, { headers: { "Accept": "application/json", "Authorization": jiraAuthHeader(info, mode) } });
            const d = si.ok ? await si.json() : null;
            type = d && d.deploymentType === "Cloud" ? "cloud" : "datacenter";
          } catch (e) { type = "datacenter"; }
        }
        jiraConn.type = type;
        jiraConn.auth = mode;
        jiraConn.key = key;
        return jiraConn;
      }
      lastError = await jiraErrorMessage(r);
      if (r.status !== 401 && r.status !== 403) break;
    }
    const hint = type === "cloud"
      ? "For Jira Cloud use your Atlassian email and an API token."
      : "For Jira Data Center use a personal access token (Username can be empty) or your username and password.";
    throw new Error(`${lastError} ${hint}`);
  }

  const getJiraProjects = async (withOffset) => {
    const jiraInfo = await getJiraInfo();
    if(jiraInfo){
      await jiraConnect(jiraInfo);
      const response = await fetch(`${jiraBase(jiraInfo)}${jiraApiPath()}/project`, {
        method: "get",
        headers: jiraHeaders(jiraInfo, { "Content-Type": "application/json" }),
      });
  
      if(response.status >= 400) throw new Error(await jiraErrorMessage(response));
      const data = await response.json();
      return data;
    }
  }

  // Jira's own error text, e.g. "Actual Result is required. (customfield_10050)"
  const jiraErrorMessage = async (response) => {
    let data = null;
    try { data = await response.json(); } catch (e) { data = null; }
    const parts = [];
    if (data) {
      (data.errorMessages || []).forEach(msg => { if (msg) parts.push(msg); });
      Object.entries(data.errors || {}).forEach(([field, msg]) => {
        parts.push(String(msg).indexOf(field) > -1 ? String(msg) : `${msg} (${field})`);
      });
    }
    if (!parts.length) {
      if (response.status === 401) parts.push("Jira rejected the login. Check the Jira email and API token.");
      else if (response.status === 403) parts.push("This Jira user doesn't have permission for this action.");
      else if (response.status === 404) parts.push("Not found. Check the Jira URL and project.");
      else parts.push("Something Went Wrong");
    }
    return `${parts.join(" ")} [HTTP ${response.status}]`;
  }

  // ── progress (same look as TestRail) ──
  const jiraProgressEl = document.createElement("div");
  jiraProgressEl.className = "jira-progress hideElement";
  jiraProgressEl.innerHTML =
    '<div class="jira-progress__label"></div>' +
    '<div class="jira-progress__track"><div class="jira-progress__bar"></div></div>' +
    '<div class="jira-progress__sub"></div>';
  document.querySelector("#jira-modal .jira__alert").insertAdjacentElement("afterend", jiraProgressEl);

  const setJiraProgress = (label, done, total, sub) => {
    if (label == null) { jiraProgressEl.classList.add("hideElement"); return; }
    jiraProgressEl.classList.remove("hideElement");
    jiraProgressEl.querySelector(".jira-progress__label").innerText = label;
    jiraProgressEl.querySelector(".jira-progress__sub").innerText = sub || "";
    jiraProgressEl.querySelector(".jira-progress__bar").style.width =
      total > 0 ? `${Math.min(100, Math.round((done * 100) / total))}%` : "0%";
  }

  // ── description: steps table with Expected / Actual Result (Atlassian Document Format) ──
  const adfParagraph = (text) => {
    const value = String(text == null ? "" : text).trim();
    return { type: "paragraph", content: value ? [{ type: "text", text: value }] : [] };
  }
  const adfRow = (cellType, values) => ({
    type: "tableRow",
    content: values.map(value => ({ type: cellType, content: [adfParagraph(value)] }))
  })
  // Attribution footer on every issue TestCase Studio creates. Reaches the leads and
  // managers who read the ticket but never installed the extension.
  const TCS_CREDIT_TEXT = "Recorded with TestCase Studio by SelectorsHub — https://selectorshub.com/testcase-studio/";
  const adfCredit = () => ({
    type: "paragraph",
    content: [
      { type: "text", text: "Recorded with " },
      { type: "text", text: "TestCase Studio", marks: [{ type: "strong" }] },
      { type: "text", text: " by SelectorsHub · " },
      { type: "text", text: "Get the free extension",
        marks: [{ type: "link", attrs: { href: "https://selectorshub.com/testcase-studio/" } }] }
    ]
  });

  const jiraStepsTable = (steps) => ({
    type: "doc",
    version: 1,
    content: [{
      type: "table",
      content: [adfRow("tableHeader", ["#", "Step", "Expected Result", "Actual Result"])]
        .concat(steps.map((step, i) => adfRow("tableCell", [String(i + 1), step.step, step.expRes, step.actRes])))
    }, adfCredit()]
  })
  // simple paragraphs, used only if a Jira site refuses the table
  const jiraStepsParagraphs = (steps) => ({
    type: "doc",
    version: 1,
    content: steps.map((step, i) => {
      let line = `${i + 1}. ${String(step.step || "").trim()}`;
      if (String(step.expRes || "").trim()) line += ` | Expected: ${String(step.expRes).trim()}`;
      if (String(step.actRes || "").trim()) line += ` | Actual: ${String(step.actRes).trim()}`;
      return adfParagraph(line);
    }).concat([adfCredit()])
  })

  const wikiCell = (text) => {
    const value = String(text == null ? "" : text).replace(/\s+/g, " ").replace(/\|/g, "¦").trim();
    return value || " ";
  }
  const jiraStepsWiki = (steps) => ["||#||Step||Expected Result||Actual Result||"]
    .concat(steps.map((step, i) => `|${i + 1}|${wikiCell(step.step)}|${wikiCell(step.expRes)}|${wikiCell(step.actRes)}|`))
    .concat(["", "_Recorded with [TestCase Studio|https://selectorshub.com/testcase-studio/] by SelectorsHub_"])
    .join("\n");
  const jiraStepsText = (steps) => steps.map((step, i) => {
    let line = `${i + 1}. ${String(step.step || "").trim()}`;
    if (String(step.expRes || "").trim()) line += ` | Expected: ${String(step.expRes).trim()}`;
    if (String(step.actRes || "").trim()) line += ` | Actual: ${String(step.actRes).trim()}`;
    return line;
  }).concat(["", TCS_CREDIT_TEXT]).join("\n");

  const jiraSniffImage = async (data) => {
    try {
      let bytes = null;
      if (data instanceof Blob) bytes = new Uint8Array(await data.slice(0, 4).arrayBuffer());
      else if (data instanceof ArrayBuffer) bytes = new Uint8Array(data, 0, Math.min(4, data.byteLength));
      else if (ArrayBuffer.isView(data)) bytes = new Uint8Array(data.buffer, data.byteOffset, Math.min(4, data.byteLength));
      if (bytes && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return { ext: "png", type: "image/png" };
    } catch (e) { /* default below */ }
    return { ext: "jpg", type: "image/jpeg" };
  }

  // unique screenshot ids per test case that really exist in storage
  const jiraScreenshotIds = async (cases) => {
    let stored = null;
    try { if (screenshotDb && typeof screenshotDb.list === "function") stored = new Set(await screenshotDb.list()); } catch (e) { stored = null; }
    return cases.map(tc => [...new Set((tc.steps || []).map(step => step && step.id).filter(Boolean))]
      .filter(id => !stored || stored.has(id)));
  }

  jiraNextBtn.addEventListener("click", async () => {
    const withShots = uploadWithScreenShotsJira;
    if(withShots){
      jiraUploadScreenShots.innerText = 'Uploading...'
    }else{
      jiraNextBtn.innerText = 'Uploading...'
    }
    jiraUploadScreenShots.disabled = true;
    jiraNextBtn.disabled = true;
    hideJiraAlert();

    const issueTypeId = jiraIssueTypeSelect.value;
    const issueType = issueTypeId ? { id: issueTypeId } : { name: "Task" };
    const projectId = selectedJiraProjectId;
    jiraIssueTypeSelect.disabled = true;

    const created = [];
    const failures = [];
    let shotsDone = 0;
    let shotsFailed = 0;
    let lastShotError = "";
    try {
      let cases = testCases.filter(testCase => testCase.isChecked);

      // Free tier: never create more issues than today's allowance permits.
      // Screenshots attached to an allowed issue are not themselves metered —
      // the limit counts issues created, which is what the user sees in Jira.
      const jiraAllowance = await tcsRemaining("jira");
      if (jiraAllowance < 1) {
        tcsOpenQuotaModal("jira");
        // Rendered directly (not thrown) so the alert keeps its Upgrade button
        // and doesn't pick up the generic "Upload failed:" prefix.
        tcsShowLimitAlert(document.querySelector("#jira-modal .jira__alert"), "jira");
        setJiraProgress(null);
        jiraUploadScreenShots.disabled = false;
        jiraNextBtn.disabled = false;
        jiraUploadScreenShots.innerText = 'Upload with Screenshots';
        jiraNextBtn.innerText = 'Upload';
        uploadWithScreenShotsJira = false;
        return;
      }
      if (cases.length > jiraAllowance) cases = cases.slice(0, jiraAllowance);

      const shotIds = withShots ? await jiraScreenshotIds(cases) : cases.map(() => []);
      const totalShots = shotIds.reduce((n, ids) => n + ids.length, 0);
      const total = cases.length + totalShots;
      let done = 0;

      for (let c = 0; c < cases.length; c++) {
        const testCase = cases[c];
        const sub = `Test case ${c + 1} of ${cases.length}: ${testCase.name}`;
        setJiraProgress(`Uploading to Jira: ${done} of ${total}`, done, total, sub);
        const steps = testCase.steps || [];
        const isCloud = jiraConn.type === "cloud";
        const oneUploadCase = {fields:{summary:testCase.name, description: isCloud ? jiraStepsTable(steps) : jiraStepsWiki(steps), issuetype: issueType, project:{id:projectId}}};
        let issue = null;
        try {
          issue = await uploadTestCasesToJira({ oneUploadCase, fallbackDescription: isCloud ? jiraStepsParagraphs(steps) : jiraStepsText(steps) });
          created.push(issue.key || issue.id);
        } catch (err) {
          failures.push({ name: testCase.name, message: err.message });
        }
        done++;

        for (const imageId of shotIds[c]) {
          if (!issue) { done++; continue; }
          setJiraProgress(`Uploading to Jira: ${done} of ${total}`, done, total, `${sub} · screenshots`);
          const stepNo = steps.findIndex(step => step && step.id === imageId) + 1;
          try {
            if (await uploadScreenShotToJira({ issue_id: issue.id, imageId, stepNo })) shotsDone++;
          } catch (err) {
            shotsFailed++;
            lastShotError = err.message;
          }
          done++;
        }
      }

      // Free tier: only issues Jira actually accepted count against the day.
      if (created.length) {
        await tcsConsume("jira", created.length);
        tcsRefreshQuotaBadges();
      }

      if (created.length) {
        const { jiraDefaultSelection: previous } = await browserType.storage.local.get(["jiraDefaultSelection"]);
        const issueTypes = Object.assign({}, previous && previous.issueTypes);
        if (issueTypeId) issueTypes[projectId] = issueTypeId;
        browserType.storage.local.set({ jiraDefaultSelection: { projectId, issueTypes } });
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
        const leftToday = await tcsRemaining("jira");
        if (!/[.)\]]$/.test(message)) message += ".";
        message += leftToday
          ? ` ${leftToday} of ${TCS_DAILY_LIMIT} free Jira uploads left today.`
          : ` That was your last free Jira upload today — the limit resets tomorrow.`;
      }
      displayJiraAlert(message, type);
    } catch (err) {
      displayJiraAlert(`Upload failed: ${err.message}`, "error");
    } finally {
      setJiraProgress(null);
      jiraUploadScreenShots.disabled = false;
      jiraNextBtn.disabled = false;
      jiraUploadScreenShots.innerText = 'Upload with Screenshots'
      jiraNextBtn.innerText = 'Upload'
      uploadWithScreenShotsJira = false;
      if (jiraIssueTypeSelect.options.length > 1 || (jiraIssueTypeSelect.options[0] && jiraIssueTypeSelect.options[0].value)) jiraIssueTypeSelect.disabled = false;
    }
  });

  let jiraAlert = document.querySelector(".jira__alert");

  const displayJiraAlert = (message, type) => {
    jiraAlert.innerText = message;
    jiraAlert.classList.remove("success");
    jiraAlert.classList.remove("error");
    jiraAlert.classList.remove("info");

    if(type === "success") jiraAlert.classList.add("success");
    else if(type === "error") jiraAlert.classList.add("error");
    else jiraAlert.classList.add("info"); 
    jiraAlert.classList.remove("hideElement");
  }

  const hideJiraAlert = () => {
    jiraAlert.classList.add("hideElement");
    jiraAlert.classList.remove("success", "error", "info");
    jiraAlert.innerText = "";
  }

  const postJiraIssue = async (jiraInfo, body) => fetch(`${jiraBase(jiraInfo)}${jiraApiPath()}/issue`, {
    method: "post",
    headers: jiraHeaders(jiraInfo, { "Content-Type": "application/json" }),
    body: JSON.stringify(body)
  });

  const uploadTestCasesToJira = async ({ oneUploadCase, fallbackDescription }) => {
    const jiraInfo = await getJiraInfo();
    if(!jiraInfo) throw new Error("Please enter Jira Details.");
    await jiraConnect(jiraInfo);

    let response = await postJiraIssue(jiraInfo, oneUploadCase);
    if(response.status === 400 && fallbackDescription){
      // a site that refuses the steps table: retry once with plain paragraphs
      const firstError = await jiraErrorMessage(response.clone());
      if(/description/i.test(firstError)){
        oneUploadCase.fields.description = fallbackDescription;
        response = await postJiraIssue(jiraInfo, oneUploadCase);
      }
    }
    if(response.status >= 400) throw new Error(await jiraErrorMessage(response));
    const data = await response.json();
    if(!data || typeof data.id == 'undefined') throw new Error("Jira did not return the created issue.");
    return data;
  }

  const uploadScreenShotToJira = async ({ issue_id, imageId, stepNo }) => {
    const jiraInfo = await getJiraInfo();
    if(!jiraInfo) throw new Error("Please enter Jira Details.");
    let buffer = null;
    try { buffer = await screenshotDb.get(imageId); } catch (e) { buffer = null; }
    if (!buffer) return false;
    const { ext, type } = await jiraSniffImage(buffer);
    const form = new FormData();
    form.append("file", new File([buffer], `step-${stepNo || 1}.${ext}`, { type }));
    await jiraConnect(jiraInfo);
    const response = await fetch(`${jiraBase(jiraInfo)}${jiraApiPath()}/issue/${issue_id}/attachments`, {
      method: "post",
      headers: jiraHeaders(jiraInfo, { "X-Atlassian-Token": "no-check" }),
      body: form
    });
    if(response.status >= 400) throw new Error(await jiraErrorMessage(response));
    return true;
  }



  jiraUploadScreenShots.addEventListener("click", async () => {
    if (jiraNextBtn.disabled) return;   // the upload would not start; don't leave the flag set
    uploadWithScreenShotsJira = true; 
    jiraNextBtn.click(); 
  });

  jiraCloseBtn.addEventListener("click", async () => {
    jiraCancelBtn.click()
  });

  jiraCancelBtn.addEventListener("click", async () => {
    jiraNextBtn.disabled = true;
    hideJiraAlert();
    setJiraProgress(null);
    resetJiraIssueType();
    jiraUploadScreenShots.style.display = 'none';
    jiraProjectsList.innerHTML = "";
    jiraModal.classList.add("hideElement");
  });



 
  
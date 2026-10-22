// ═══════════════════════════════════════════════════════════════════════════
// Slack integration — v2.7.0
// ─────────────────────────────────────────────────────────────────────────────
// Setup (once): user creates a Slack app from the manifest we copy for them,
// installs it to their workspace and pastes the Bot User OAuth Token (xoxb-…).
//
// Footer "Slack" button → Select Channel → Send / Send with Screenshots
//   • One summary message per checked test case (name, steps, start URL, result)
//   • Steps go in a thread under it; with screenshots, each screenshot is posted
//     in the thread together with its step text.
//
// Slack Web API used (form-encoded POST, token in Authorization header):
//   auth.test, conversations.list, conversations.join, chat.postMessage,
//   files.getUploadURLExternal → POST upload_url → files.completeUploadExternal,
//   chat.getPermalink
//
// Slack is a separate button (not in "Integrate with"), so it works alongside
// Jira / Azure / TestRail / qTest. Additive only: no existing function changed.
// ═══════════════════════════════════════════════════════════════════════════

(() => {
  const skEl = (sel) => document.querySelector(sel);

  const skTokenInput = skEl("#slack-token");
  const skManifestBtn = skEl("#slack-copy-manifest");
  const skSendBtn = skEl("#save_btn_slack");
  const skModal = skEl("#slack-modal");
  if (!skTokenInput || !skSendBtn || !skModal) return;

  const skTitleEl = skModal.querySelector(".title");
  const skAlert = skModal.querySelector(".slack__alert");
  const skInstructionError = skModal.querySelector(".slack__instructions__error");
  const skLoading = skModal.querySelector(".slack__loading");
  const skSearch = skModal.querySelector(".slack__search");
  const skChannelsList = skModal.querySelector(".slack__projects");
  const skNextBtn = skModal.querySelector(".next");
  const skCancelBtn = skModal.querySelector(".cancel");
  const skScreensBtn = skModal.querySelector(".upload-with-screen");
  const skCloseBtn = skModal.querySelector(".close__icon");

  const SK_API = "https://slack.com/api/";
  const SK_APP_NAME = "TestCase Studio";
  const SK_PACE_MS = 1100;          // Slack allows ~1 message per second per channel

  const SK_MANIFEST = {
    display_information: {
      name: SK_APP_NAME,
      description: "Send test cases, steps and screenshots from TestCase Studio to Slack.",
      background_color: "#1d1d1d",
    },
    features: { bot_user: { display_name: SK_APP_NAME, always_online: false } },
    oauth_config: {
      scopes: { bot: ["chat:write", "chat:write.public", "files:write", "channels:read", "groups:read", "channels:join"] },
    },
    settings: { org_deploy_enabled: false, socket_mode_enabled: false, token_rotation_enabled: false },
  };

  let skBusy = false;
  let skChannels = [];              // [{id, name, isPrivate, isMember}]
  let skSelectedChannelId = null;
  let skTeam = null;                // {id, name, url}

  // ── Settings ─────────────────────────────────────────────────────────────
  const skNormalizeToken = (value) => String(value || "").trim().replace(/^bearer\s+/i, "");

  browserType.storage.local.get(["slackInfo"], ({ slackInfo }) => {
    if (!slackInfo) return browserType.storage.local.set({ slackInfo: { bot_token: "" } });
    skTokenInput.value = slackInfo.bot_token || "";
  });

  skTokenInput.addEventListener("blur", () => {
    if (typeof unsetBorder === "function") unsetBorder();
    if (!skTokenInput.value) skTokenInput.style.border = "1px solid red";
    browserType.storage.local.get(["slackInfo"], ({ slackInfo }) => {
      slackInfo = slackInfo || {};
      slackInfo.bot_token = skNormalizeToken(skTokenInput.value);
      if (skTokenInput.value) skTokenInput.style.border = "1px solid #3d3c3c";
      browserType.storage.local.set({ slackInfo });
    });
  });

  if (skManifestBtn) {
    skManifestBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const text = JSON.stringify(SK_MANIFEST, null, 2);
      let copied = false;
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (err) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { copied = document.execCommand("copy"); } catch (e2) { copied = false; }
        ta.remove();
      }
      showSnackbar(copied
        ? "Slack app manifest copied. Paste it at api.slack.com/apps → Create New App → From a manifest."
        : "Could not copy. Please allow clipboard access and try again.");
    });
  }

  const skGetToken = async () => {
    const { slackInfo } = await browserType.storage.local.get(["slackInfo"]);
    const token = skNormalizeToken(slackInfo && slackInfo.bot_token);
    return token || null;
  };

  // ── Slack API ────────────────────────────────────────────────────────────
  const skSleep = (ms) => new Promise(r => setTimeout(r, ms));

  const skError = (code, extra) => {
    const err = new Error(code);
    err.slack = code;
    if (extra) Object.assign(err, extra);
    return err;
  };

  const skCall = async (token, method, params = {}, attempt = 0) => {
    const body = new URLSearchParams();
    Object.keys(params).forEach(key => {
      const value = params[key];
      if (value === undefined || value === null) return;
      body.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    });
    const response = await fetch(SK_API + method, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
      body: body.toString(),
    });
    if (response.status === 429 && attempt < 4) {
      const wait = Number(response.headers.get("Retry-After")) || 2;
      await skSleep(Math.min(wait, 30) * 1000);
      return skCall(token, method, params, attempt + 1);
    }
    let data = null;
    try { data = await response.json(); } catch (e) { data = null; }
    if (!data) throw skError(`http_${response.status}`);
    if (!data.ok) {
      if (data.error === "ratelimited" && attempt < 4) {
        await skSleep(2000);
        return skCall(token, method, params, attempt + 1);
      }
      throw skError(data.error || "unknown_error", { needed: data.needed });
    }
    return data;
  };

  const skFriendlyError = (err) => {
    const code = (err && err.slack) || (err && err.message) || "error";
    switch (code) {
      case "invalid_auth":
      case "not_authed":
      case "account_inactive":
      case "token_revoked":
      case "token_expired":
        return "Slack rejected the token. In your Slack app open OAuth & Permissions, copy the Bot User OAuth Token (starts with xoxb-) and paste it in Settings.";
      case "missing_scope":
        return `Your Slack app is missing a permission${err.needed ? ` (${err.needed})` : ""}. Create the app again from the manifest in Settings, or add the permission and reinstall the app.`;
      case "not_in_channel":
      case "channel_not_found":
        return `The app is not in this channel. In Slack, type /invite @${SK_APP_NAME} in the channel and try again.`;
      case "is_archived":
        return "This channel is archived.";
      case "restricted_action":
        return "Your workspace does not allow the app to post in this channel.";
      default:
        return `Slack error: ${code}`;
    }
  };

  const skLoadChannels = async (token) => {
    const out = [];
    let cursor = "";
    for (let page = 0; page < 10; page++) {
      const data = await skCall(token, "conversations.list", {
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 1000,
        cursor: cursor || undefined,
      });
      (data.channels || []).forEach(ch => {
        if (!ch || !ch.id) return;
        out.push({ id: ch.id, name: ch.name || ch.id, isPrivate: !!ch.is_private, isMember: !!ch.is_member });
      });
      cursor = data.response_metadata && data.response_metadata.next_cursor;
      if (!cursor) break;
    }
    // Channels the app is already in first, then alphabetical.
    out.sort((a, b) => (b.isMember - a.isMember) || a.name.localeCompare(b.name));
    return out;
  };

  // ── Message content ──────────────────────────────────────────────────────
  const skEsc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const skStepResult = (step) => {
    const act = String((step && step.actRes) || "").trim();
    if (!act) return null;
    return /^failed/i.test(act) ? "fail" : "pass";
  };

  const skStepText = (step, index) => {
    let text = `*Step ${index + 1}.* ${skEsc(step.step || "")}`;
    const exp = String(step.expRes || "").trim();
    const act = String(step.actRes || "").trim();
    if (exp) text += `\n>_Expected:_ ${skEsc(exp)}`;
    if (act) text += `\n>_Actual:_ ${skStepResult(step) === "fail" ? ":x: " : ""}${skEsc(act)}`;
    return text;
  };

  const skSummaryBlocks = (testCase, steps, withScreenshots) => {
    const name = String(testCase.name || "Test case").trim() || "Test case";
    const firstUrl = (steps.find(s => s && /^https?:\/\//i.test(String(s.dataText || ""))) || {}).dataText || "";
    const results = steps.map(skStepResult);
    const failedAt = results.indexOf("fail");
    const ran = results.some(Boolean);

    const fields = [{ type: "mrkdwn", text: `*Steps:*\n${steps.length}` }];
    if (ran) {
      fields.push({ type: "mrkdwn", text: `*Replay result:*\n${failedAt === -1 ? ":white_check_mark: Passed" : `:x: Failed at step ${failedAt + 1}`}` });
    }
    if (firstUrl) {
      let host = firstUrl;
      try { host = new URL(firstUrl).host; } catch (e) { /* keep url */ }
      fields.push({ type: "mrkdwn", text: `*Start URL:*\n<${firstUrl.replace(/[<>|]/g, "")}|${skEsc(host)}>` });
    }

    const blocks = [
      { type: "header", text: { type: "plain_text", text: `:test_tube: ${name}`.slice(0, 150), emoji: true } },
      { type: "section", fields },
      { type: "context", elements: [{ type: "mrkdwn",
        text: `${withScreenshots ? "Steps and screenshots" : "Steps"} in the thread :point_down:  ·  Sent from *TestCase Studio* by SelectorsHub  ·  <https://selectorshub.com/testcase-studio/|Get the free extension>` }] },
    ];
    const fallback = `Test case: ${skEsc(name)} (${steps.length} steps)${ran ? (failedAt === -1 ? " — Passed" : ` — Failed at step ${failedAt + 1}`) : ""}`;
    return { blocks, fallback };
  };

  // ── Screenshot upload ────────────────────────────────────────────────────
  const skSniff = async (data) => {
    if (typeof trSniffImage === "function") return trSniffImage(data);
    return { ext: "jpg", type: "image/jpeg" };
  };

  const skUploadToThread = async (token, channelId, threadTs, data, fileName, type, comment) => {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const { upload_url: uploadUrl, file_id: fileId } = await skCall(token, "files.getUploadURLExternal", {
      filename: fileName,
      length: blob.size,
    });
    const form = new FormData();
    form.append("file", new File([blob], fileName, { type }));
    const put = await fetch(uploadUrl, { method: "POST", body: form });
    if (put.status >= 400) throw skError(`upload_http_${put.status}`);
    await skCall(token, "files.completeUploadExternal", {
      files: [{ id: fileId, title: fileName }],
      channel_id: channelId,
      thread_ts: threadTs,
      initial_comment: comment,
    });
  };

  // ── UI helpers ───────────────────────────────────────────────────────────
  const skShowAlert = (message, type) => {
    skAlert.innerText = message;
    skAlert.classList.remove("success", "error", "info");
    skAlert.classList.add(type === "success" || type === "error" ? type : "info");
    skAlert.classList.remove("hideElement");
  };
  const skShowLink = (url) => {
    if (!url || !/^https:\/\//i.test(url)) return;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.innerText = "Open in Slack";
    link.style.marginLeft = "6px";
    link.style.textDecoration = "underline";
    link.style.color = "inherit";
    skAlert.appendChild(document.createTextNode(" "));
    skAlert.appendChild(link);
  };
  const skHideAlert = () => {
    skAlert.classList.add("hideElement");
    skAlert.classList.remove("success", "error", "info");
    skAlert.innerText = "";
  };
  const skSetLoading = (on) => skLoading.classList.toggle("hideElement", !on);

  const skProgressEl = document.createElement("div");
  skProgressEl.className = "tr-shot-progress hideElement";
  skProgressEl.innerHTML =
    '<div class="tr-shot-progress__label"></div>' +
    '<div class="tr-shot-progress__track"><div class="tr-shot-progress__bar"></div></div>' +
    '<div class="tr-shot-progress__sub"></div>';
  skAlert.insertAdjacentElement("afterend", skProgressEl);
  const skProgress = (label, done, total, sub) => {
    const known = total > 0;
    skProgressEl.querySelector(".tr-shot-progress__label").innerText = label;
    skProgressEl.querySelector(".tr-shot-progress__sub").innerText = sub || "";
    skProgressEl.querySelector(".tr-shot-progress__bar").style.width = known ? `${Math.min(100, Math.round(done * 100 / total))}%` : "";
    skProgressEl.classList.toggle("is-indeterminate", !known);
    skProgressEl.classList.remove("hideElement");
  };
  const skHideProgress = () => {
    skProgressEl.classList.add("hideElement");
    skProgressEl.classList.remove("is-indeterminate");
  };

  const skRenderChannels = () => {
    const query = String(skSearch.value || "").trim().toLowerCase().replace(/^#/, "");
    const items = skChannels.filter(ch => !query || ch.name.toLowerCase().includes(query));
    skChannelsList.innerHTML = "";
    if (!items.length) {
      skChannelsList.innerText = skChannels.length ? "No channel matches your search." : "No channels found.";
      return;
    }
    items.forEach(ch => {
      const el = document.createElement("div");
      el.classList.add("slack__project");
      if (ch.id === skSelectedChannelId) el.classList.add("selected");
      el.dataset.id = ch.id;
      el.innerText = `${ch.isPrivate ? "🔒 " : "# "}${ch.name}`;
      if (!ch.isMember) el.title = "The app will join this channel automatically.";
      el.addEventListener("click", () => {
        if (skBusy) return;
        Array.from(skChannelsList.children).forEach(child => child.classList.remove("selected"));
        el.classList.add("selected");
        skSelectedChannelId = ch.id;
        skNextBtn.disabled = false;
        skScreensBtn.disabled = false;
      });
      skChannelsList.appendChild(el);
    });
    const selectedEl = skChannelsList.querySelector(".selected");
    if (selectedEl && typeof selectedEl.scrollIntoView === "function") selectedEl.scrollIntoView({ block: "nearest" });
  };
  skSearch.addEventListener("input", skRenderChannels);

  const skResetModal = () => {
    skBusy = false;
    skHideAlert();
    skHideProgress();
    skSetLoading(false);
    skInstructionError.classList.add("hideElement");
    skTitleEl.innerText = "Select Slack Channel";
    skSearch.value = "";
    skSearch.style.display = "none";
    skChannelsList.innerHTML = "";
    skNextBtn.innerText = "Send";
    skNextBtn.disabled = true;
    skCancelBtn.disabled = false;
    skScreensBtn.innerText = "Send with Screenshots";
    skScreensBtn.disabled = true;
    skScreensBtn.style.display = "none";
  };

  const skCheckedTestCases = () => {
    const all = (typeof testCases !== "undefined" && Array.isArray(testCases)) ? testCases : [];
    return all.filter(tc => tc && tc.isChecked);
  };

  const skOpenSettings = () => {
    if (typeof unsetBorder === "function") unsetBorder();
    skTokenInput.style.border = "1px solid red";
    if (typeof customizeModal !== "undefined" && customizeModal) customizeModal.classList.remove("hideElement");
    if (typeof uiConfigBtn !== "undefined" && uiConfigBtn) {
      uiConfigBtn.classList.remove("inactive");
      uiConfigBtn.classList.add("active");
    }
    const box = skEl(".slack__settings");
    if (box && typeof box.scrollIntoView === "function") box.scrollIntoView({ block: "center" });
  };

  // ── Open: channel picker ─────────────────────────────────────────────────
  skSendBtn.addEventListener("click", async (e) => {
    if (e) e.preventDefault();
    const all = (typeof testCases !== "undefined" && Array.isArray(testCases)) ? testCases : [];
    if (!all.length || !all[0].steps || all[0].steps.length < 1 || skCheckedTestCases().length < 1) {
      showSnackbar("No Test Cases to Upload or Send");
      return;
    }
    const token = await skGetToken();
    if (!token) {
      showSnackbar("Please add your Slack Bot Token in Settings.");
      skOpenSettings();
      return;
    }

    // Free tier: stop before the channel picker opens.
    if (!await tcsCheckQuota("slack")) return;

    skResetModal();
    skModal.classList.remove("hideElement");
    skSetLoading(true);
    try {
      const auth = await skCall(token, "auth.test");
      skTeam = { id: auth.team_id, name: auth.team, url: auth.url };
      skTitleEl.innerText = auth.team ? `Select Channel · ${auth.team}` : "Select Slack Channel";
      skChannels = await skLoadChannels(token);
      skSetLoading(false);
      if (!skChannels.length) {
        skChannelsList.innerText = "No channels found. Create a channel in Slack, or invite the app to a private channel.";
        return;
      }
      const { slackDefaultSelection } = await browserType.storage.local.get(["slackDefaultSelection"]);
      const saved = slackDefaultSelection && slackDefaultSelection.teamId === skTeam.id &&
        skChannels.find(ch => ch.id === slackDefaultSelection.channelId);
      skSelectedChannelId = saved ? saved.id : (skChannels.find(ch => ch.isMember) || skChannels[0]).id;
      skSearch.style.display = skChannels.length > 8 ? "block" : "none";
      skRenderChannels();
      skNextBtn.disabled = false;
      skScreensBtn.disabled = false;
      skScreensBtn.style.display = "block";
    } catch (err) {
      skSetLoading(false);
      skShowAlert(skFriendlyError(err), "error");
      if (!err || !err.slack || /^http_/.test(err.slack)) skInstructionError.classList.remove("hideElement");
    }
  });

  // ── Send ─────────────────────────────────────────────────────────────────
  const skSend = async (withScreenshots) => {
    if (skBusy || !skSelectedChannelId) return;
    const token = await skGetToken();
    if (!token) return;
    const checked = skCheckedTestCases();
    if (!checked.length) {
      skShowAlert("No Test Cases to Upload or Send", "error");
      return;
    }

    // Free tier: cap this run at today's remaining allowance.
    const skAllowance = await tcsRemaining("slack");
    if (skAllowance < 1) {
      tcsOpenQuotaModal("slack");
      tcsShowLimitAlert(skAlert, "slack");
      return;
    }
    if (checked.length > skAllowance) checked.length = skAllowance;

    const channel = skChannels.find(ch => ch.id === skSelectedChannelId) || { id: skSelectedChannelId, name: skSelectedChannelId };
    browserType.storage.local.set({ slackDefaultSelection: { teamId: skTeam && skTeam.id, channelId: channel.id } });

    skBusy = true;
    skHideAlert();
    skNextBtn.disabled = true;
    skScreensBtn.disabled = true;
    skCancelBtn.disabled = true;
    if (withScreenshots) skScreensBtn.innerText = "Sending..."; else skNextBtn.innerText = "Sending...";

    const issues = [];
    let sent = 0;
    let shotsPosted = 0;
    let firstPermalink = "";
    let fatal = null;

    try {
      skProgress("Preparing...", 0, 0, `#${channel.name}`);

      if (!channel.isMember && !channel.isPrivate) {
        try {
          await skCall(token, "conversations.join", { channel: channel.id });
          channel.isMember = true;
        } catch (err) {
          // chat:write.public still lets text through; screenshots may need the app in the channel.
          if (withScreenshots) issues.push(`could not join #${channel.name} (${(err && err.slack) || "error"}) — invite the app if screenshots are missing`);
        }
      }

      let stored = null;
      if (withScreenshots && typeof screenshotDb !== "undefined" && screenshotDb && typeof screenshotDb.list === "function") {
        try { stored = new Set(await screenshotDb.list()); } catch (e) { stored = null; }
      }
      let totalPosts = 0;
      checked.forEach(tc => {
        const steps = (tc.steps || []).filter(Boolean);
        totalPosts += 1 + (withScreenshots && stored ? steps.filter(s => s.id && stored.has(s.id)).length : 0) + 1;
      });
      let donePosts = 0;
      const tick = (label, sub) => { donePosts++; skProgress(label, donePosts, Math.max(totalPosts, donePosts), sub); };

      for (let c = 0; c < checked.length; c++) {
        const testCase = checked[c];
        const steps = (testCase.steps || []).filter(Boolean);
        const sub = `Test case ${c + 1} of ${checked.length} · #${channel.name}`;

        // 1. summary message
        const { blocks, fallback } = skSummaryBlocks(testCase, steps, withScreenshots);
        let parent;
        try {
          parent = await skCall(token, "chat.postMessage", {
            channel: channel.id, text: fallback, blocks, unfurl_links: false, unfurl_media: false,
          });
        } catch (err) {
          fatal = skFriendlyError(err);
          break;
        }
        sent++;
        // Free tier: the summary message is the unit that counts. Threaded step
        // screenshots belong to a message already paid for, so they are not metered.
        await tcsConsume("slack", 1);
        tcsRefreshQuotaBadges();
        tick(withScreenshots ? "Sending steps and screenshots..." : "Sending steps...", sub);
        const threadTs = parent.ts;
        if (!firstPermalink) {
          try {
            const link = await skCall(token, "chat.getPermalink", { channel: channel.id, message_ts: threadTs });
            firstPermalink = link.permalink || "";
          } catch (e) { /* link is optional */ }
        }

        // 2. steps in the thread; text-only steps are grouped, screenshot steps carry their image
        let buffer = [];
        const flush = async () => {
          if (!buffer.length) return;
          const text = buffer.join("\n\n");
          buffer = [];
          await skSleep(SK_PACE_MS);
          await skCall(token, "chat.postMessage", {
            channel: channel.id, thread_ts: threadTs, text, mrkdwn: true, unfurl_links: false, unfurl_media: false,
          });
        };

        let failedShots = 0;
        let lastShotError = "";
        try {
          for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            const text = skStepText(step, i);
            let data = null;
            if (withScreenshots && step.id && (!stored || stored.has(step.id))) {
              try { data = await screenshotDb.get(step.id); } catch (e) { data = null; }
            }
            if (!data) {
              buffer.push(text);
              if (buffer.join("\n\n").length > 3000) await flush();
              continue;
            }
            await flush();
            const { ext, type } = await skSniff(data);
            try {
              await skSleep(SK_PACE_MS);
              await skUploadToThread(token, channel.id, threadTs, data, `step-${i + 1}.${ext}`, type, text);
              shotsPosted++;
            } catch (err) {
              if (err && ["missing_scope", "invalid_auth", "token_revoked", "not_authed"].includes(err.slack)) throw err;
              failedShots++;
              lastShotError = (err && err.slack) || "upload failed";
              buffer.push(`${text}\n_(screenshot could not be uploaded)_`);
            }
            tick("Sending steps and screenshots...", sub);
          }
          await flush();
        } catch (err) {
          fatal = `"${testCase.name || "Test case"}": ${skFriendlyError(err)}`;
          break;
        }
        tick(withScreenshots ? "Sending steps and screenshots..." : "Sending steps...", sub);
        if (failedShots) issues.push(`${testCase.name || "Test case"}: ${failedShots} screenshot${failedShots === 1 ? "" : "s"} not uploaded (${lastShotError})`);
      }
    } catch (err) {
      fatal = skFriendlyError(err);
    }

    skHideProgress();
    skBusy = false;
    skCancelBtn.disabled = false;
    skNextBtn.innerText = "Send";
    skScreensBtn.innerText = "Send with Screenshots";

    const caseWord = `${sent} test case${sent === 1 ? "" : "s"}`;
    if (fatal) {
      skNextBtn.disabled = false;
      skScreensBtn.disabled = false;
      skShowAlert(sent ? `${caseWord} sent to #${channel.name}, then stopped. ${fatal}` : fatal, "error");
      skShowLink(firstPermalink);
      return;
    }
    let message = `${caseWord} sent to #${channel.name}.`;
    if (withScreenshots) message += shotsPosted ? ` ${shotsPosted} screenshot${shotsPosted === 1 ? "" : "s"} in the thread.` : " No screenshots found in the selected test cases.";
    if (issues.length) message += ` Needs attention: ${issues.slice(0, 3).join("; ")}${issues.length > 3 ? ` (+${issues.length - 3} more)` : ""}`;
    if (sent) {
      const skLeft = await tcsRemaining("slack");
      message += skLeft
        ? ` ${skLeft} of ${TCS_DAILY_LIMIT} free Slack sends left today.`
        : ` That was your last free Slack send today — the limit resets tomorrow.`;
    }
    skShowAlert(message, issues.length ? "info" : "success");
    skShowLink(firstPermalink);
    // Prevent an accidental double post; reopen the dialog (or pick another channel) to send again.
    skNextBtn.disabled = true;
    skScreensBtn.disabled = true;
  };

  skNextBtn.addEventListener("click", () => skSend(false));
  skScreensBtn.addEventListener("click", () => skSend(true));

  const skClose = () => {
    if (skBusy) return;
    skModal.classList.add("hideElement");
    skResetModal();
  };
  skCancelBtn.addEventListener("click", skClose);
  skCloseBtn.addEventListener("click", skClose);
})();

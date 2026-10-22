/**
 * TestCase Studio – Replay Engine v3
 *
 * Architecture change: uses chrome.scripting.executeScript instead of
 * chrome.tabs.sendMessage. The action code is injected directly into
 * the page on each step — no message-passing, no timing races, real
 * DOM errors returned verbatim.
 *
 *  1. Recording paused during replay (no infinite loop).
 *  2. Each run opens a fresh browser window.
 *  3. Step results are accurate — element-not-found errors show the
 *     exact XPath/CSS that failed, plus a hint on what to check.
 */

/* global steps, recording, chrome */

const TCSReplay = (() => {
    'use strict';

    // ─── State ────────────────────────────────────────────────────────────────

    let state = {
        running:      false,
        paused:       false,
        aborted:      false,
        currentIdx:   -1,
        replayWinId:  null,
        replayTabId:  null,
        studioWinId:  null,   // captured at run-start so we can re-focus TCS
        stepDelay:    800,
    };

    // ─── DOM refs ─────────────────────────────────────────────────────────────

    let dom = {};
    function initDom() {
        dom.runBtn          = document.getElementById('tcs-run-btn');
        dom.pauseBtn        = document.getElementById('tcs-pause-btn');
        dom.stopBtn         = document.getElementById('tcs-stop-btn');
        dom.statusBar       = document.getElementById('tcs-replay-status');
        dom.statusText      = document.getElementById('tcs-replay-status-text');
        dom.progressBar     = document.getElementById('tcs-replay-progress-fill');
        dom.speedSelect     = document.getElementById('tcs-speed-select');
        dom.exportScriptBtn = document.getElementById('tcs-export-script-btn');
        dom.closeWinSelect  = document.getElementById('tcs-close-win-select');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function setStatus(text, type) {
        if (!dom.statusBar) return;
        dom.statusBar.className     = 'tcs-replay-bar tcs-status-' + (type || 'info');
        dom.statusBar.style.display = 'flex';
        dom.statusText.textContent  = text;
    }

    function setProgress(n, total) {
        if (dom.progressBar)
            dom.progressBar.style.width = (total > 0 ? (n / total) * 100 : 0) + '%';
    }

    function highlightRow(idx) {
        document.querySelectorAll('#records-grid tr').forEach(tr =>
            tr.classList.remove('tcs-replay-active'));
        const row = document.querySelectorAll('#records-grid tr')[idx];
        if (row) { row.classList.add('tcs-replay-active'); row.scrollIntoView({ block: 'nearest' }); }
    }

    function markRowResult(idx, passed, errMsg, locatorNote) {
        const row = document.querySelectorAll('#records-grid tr')[idx];
        if (!row) return;
        row.classList.remove('tcs-replay-active');
        row.classList.add(passed ? 'tcs-replay-pass' : 'tcs-replay-fail');

        // remove previous badge / annotations
        ['tcs-step-badge', 'tcs-step-err-inline', 'tcs-step-fallback-note'].forEach(function(cls) {
            var el = row.querySelector('.' + cls);
            if (el) el.remove();
        });

        // badge on the # cell
        const badge       = document.createElement('span');
        badge.className   = 'tcs-step-badge tcs-badge-' + (passed ? 'pass' : 'fail');
        badge.textContent = passed ? '✓' : '✗';
        badge.title       = passed ? (locatorNote ? 'Passed (fallback locator used)' : 'Passed') : (errMsg || 'Failed');
        const numTd       = row.querySelector('td');
        if (numTd) numTd.insertBefore(badge, numTd.firstChild);

        const stepTd = row.querySelector('td:nth-child(2)');

        // If a fallback locator was used but step still passed — show an amber note
        if (passed && locatorNote && stepTd) {
            const note       = document.createElement('div');
            note.className   = 'tcs-step-fallback-note';
            note.textContent = '🔄 ' + locatorNote;
            note.title       = 'Primary locator failed. ' + locatorNote + '. Consider re-recording this step.';
            stepTd.appendChild(note);
        }

        // inline error under the step sentence
        if (!passed && errMsg && stepTd) {
            const errDiv       = document.createElement('div');
            errDiv.className   = 'tcs-step-err-inline';
            errDiv.textContent = '⚠ ' + errMsg.split('\n')[0];
            errDiv.title       = errMsg;
            stepTd.appendChild(errDiv);
        }
    }

    function clearRowHighlights() {
        document.querySelectorAll('#records-grid tr').forEach(function(tr) {
            tr.classList.remove('tcs-replay-active', 'tcs-replay-pass', 'tcs-replay-fail');
            ['tcs-step-badge', 'tcs-step-err-inline', 'tcs-step-fallback-note'].forEach(function(cls) {
                var el = tr.querySelector('.' + cls);
                if (el) el.remove();
            });
        });
    }

    function updateButtonState(running, paused) {
        if (!dom.runBtn) return;
        dom.runBtn.disabled      = running;
        dom.pauseBtn.disabled    = !running;
        dom.stopBtn.disabled     = !running;
        dom.pauseBtn.textContent = paused ? '▶ Resume' : '⏸ Pause';
    }

    // ─── Recording gate ───────────────────────────────────────────────────────

    function pauseRecording() {
        if (typeof recording !== 'undefined') {
            window._tcs_savedRecording = recording;
            recording = false; // eslint-disable-line no-global-assign
        }
    }
    function resumeRecording() {
        if (typeof recording !== 'undefined' &&
            window._tcs_savedRecording !== undefined) {
            recording = window._tcs_savedRecording; // eslint-disable-line no-global-assign
            delete window._tcs_savedRecording;
        }
    }

    // ─── Window management ────────────────────────────────────────────────────

    function openReplayWindow() {
        return new Promise((resolve, reject) => {
            chrome.windows.create(
                { url: 'about:blank', type: 'normal', state: 'normal', focused: true },
                win => {
                    if (chrome.runtime.lastError || !win)
                        return reject(new Error(chrome.runtime.lastError?.message || 'Cannot open window'));
                    state.replayWinId = win.id;
                    state.replayTabId = win.tabs[0].id;
                    resolve(win.tabs[0].id);
                }
            );
        });
    }

    async function closeReplayWindow() {
        if (state.replayWinId !== null) {
            try { await chrome.windows.remove(state.replayWinId); } catch (_) {}
            state.replayWinId = null;
            state.replayTabId = null;
        }
    }

    // ─── Navigation helpers ───────────────────────────────────────────────────

    function navigateAndWait(tabId, url, timeout) {
        timeout = timeout || 20000;
        return new Promise((resolve, reject) => {
            let done = false;
            const finish = (fn, arg) => { if (!done) { done = true; fn(arg); } };

            const timer = setTimeout(() => {
                chrome.tabs.onUpdated.removeListener(listener);
                finish(resolve); // timed out — carry on
            }, timeout);

            function listener(id, info) {
                if (id !== tabId || info.status !== 'complete') return;
                clearTimeout(timer);
                chrome.tabs.onUpdated.removeListener(listener);
                // 700 ms grace: page JS + any injected scripts settle
                setTimeout(() => finish(resolve), 700);
            }

            chrome.tabs.onUpdated.addListener(listener);
            chrome.tabs.update(tabId, { url }).catch(err => {
                clearTimeout(timer);
                chrome.tabs.onUpdated.removeListener(listener);
                finish(reject, err);
            });
        });
    }

    function reloadAndWait(tabId) {
        return new Promise(resolve => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            const timer  = setTimeout(() => { chrome.tabs.onUpdated.removeListener(l); finish(); }, 12000);

            function l(id, info) {
                if (id !== tabId || info.status !== 'complete') return;
                clearTimeout(timer);
                chrome.tabs.onUpdated.removeListener(l);
                setTimeout(finish, 700);
            }

            chrome.tabs.onUpdated.addListener(l);
            chrome.tabs.reload(tabId).catch(() => { clearTimeout(timer); chrome.tabs.onUpdated.removeListener(l); finish(); });
        });
    }

    // Wait until the tab's status is 'complete' (handles click-triggered navigation)
    async function waitForTabStable(tabId, timeout) {
        timeout = timeout || 8000;
        const deadline = Date.now() + timeout;
        await sleep(300); // small gap so navigation can START before we start polling
        while (Date.now() < deadline) {
            try {
                const tab = await chrome.tabs.get(tabId);
                if (tab.status === 'complete') return;
            } catch (_) { return; }
            await sleep(250);
        }
    }

    // ─── THE ACTION RUNNER ────────────────────────────────────────────────────
    // Self-contained function injected into the page via chrome.scripting.executeScript.
    // Must NOT reference any outer variables.

    function tcsActionRunner(step) {
        // ── element finder (primary + backup locators) ────────────────────────
        function tryXpath(xpath) {
            try {
                const r = document.evaluate(
                    xpath, document, null,
                    XPathResult.FIRST_ORDERED_NODE_TYPE, null
                );
                return r.singleNodeValue || null;
            } catch (_) { return null; }
        }

        // ── Universal element finder supporting shadow DOM + iframes ────────────
        //
        // Selector format (produced by buildShadowCssChain in contentScript.js):
        //   >>>   shadow root boundary
        //   ~~~~  iframe boundary
        //
        // Examples:
        //   "my-app >>> auth-form >>> button.login"
        //   "iframe#login ~~~~ form.auth >>> input[name='email']"
        //   "my-host >>> iframe.inner ~~~~ my-widget >>> button"
        function tryCss(css) {
            if (!css) return null;
            if (css.includes('>>>') || css.includes('~~~~')) {
                return compositeQuery(css);
            }
            try { return document.querySelector(css) || null; }
            catch (_) { return null; }
        }

        /**
         * Walk a composite selector chain through shadow roots and iframes.
         * Splits on ' >>> ' and ' ~~~~ ' alternately.
         */
        function compositeQuery(chain) {
            // Tokenise into [selector, separator, selector, separator, ...]
            var tokens = chain.split(/\s*(>>>|~~~~)\s*/);
            var root = document;    // current search root (Document or ShadowRoot)
            var el   = null;

            for (var ti = 0; ti < tokens.length; ti++) {
                var tok = tokens[ti].trim();
                if (!tok) continue;

                if (tok === '>>>') {
                    // Next selector is inside el's shadow root
                    if (!el || !el.shadowRoot) return null;
                    root = el.shadowRoot;
                    continue;
                }

                if (tok === '~~~~') {
                    // Next selector is inside el's iframe contentDocument
                    if (!el) return null;
                    var iDoc = null;
                    try { iDoc = el.contentDocument || (el.contentWindow && el.contentWindow.document); }
                    catch (_) { return null; }
                    if (!iDoc) return null;
                    root = iDoc;
                    continue;
                }

                // Regular CSS selector — search within current root
                try { el = root.querySelector(tok); }
                catch (_) { return null; }
                if (!el) return null;
            }
            return el;
        }

        // findEl tries: primary XPath → primary CSS (with shadow/iframe piercing) → backups
        function findEl(xpath, css, backups) {
            backups = backups || [];

            // 1. Primary XPath
            if (xpath && xpath.trim() && !xpath.startsWith('This ')) {
                const el = tryXpath(xpath);
                if (el) return { el, locator: 'XPath (primary): ' + xpath, strategyUsed: 'primary' };
            }

            // 2. Primary CSS
            if (css && css.trim() && !css.startsWith('This ')) {
                const el = tryCss(css);
                if (el) return { el, locator: 'CSS (primary): ' + css, strategyUsed: 'primary' };
            }

            // 3. Backup locators (index-based, text-based, partial-id, nth-css …)
            for (let i = 0; i < backups.length; i++) {
                const b  = backups[i];
                const bl = b.locator || '';
                if (!bl) continue;
                let el = null;
                if (bl.startsWith('//') || bl.startsWith('(//')) {
                    el = tryXpath(bl);
                } else {
                    el = tryCss(bl);
                }
                if (el) {
                    console.log('[TCS Replay] Step used backup locator #' + (i + 1) + ': ' + bl);
                    return {
                        el,
                        locator: (b.label || 'Backup ' + (i + 1)) + ': ' + bl,
                        strategyUsed: b.type || ('backup-' + i),
                        backupIndex: i,
                    };
                }
            }

            // 4. Nothing worked — build a detailed failure report
            const tried = [];
            if (xpath && !xpath.startsWith('This ')) tried.push('Primary XPath: ' + xpath);
            if (css   && !css.startsWith('This '))  tried.push('Primary CSS: ' + css);
            backups.forEach((b, i) => {
                if (b.locator) tried.push((b.label || 'Backup ' + (i + 1)) + ': ' + b.locator);
            });
            return { el: null, locator: null, triedAll: tried };
        }

        // ── command normaliser ─────────────────────────────────────────────────
        function norm(cmd) {
            const m = {
                'clickat': 'clickAt', 'doubleclickat': 'doubleClickAt',
                'rightclick': 'rightClick', 'addselection': 'select',
                'contextmenu': 'clickAt', 'openwebsite': 'openWebsite',
                'scrolldown': 'scrollDown', 'scrollup': 'scrollUp',
                'scroll down': 'scrollDown', 'scroll up': 'scrollUp',
                'sendkeys': 'pressKey', 'submit': 'pressKey',
                'arrowup': 'pressKey', 'arrowdown': 'pressKey',
                'capslock': 'pressKey', 'esc': 'pressKey',
                'backspace': 'pressKey', 'delete': 'pressKey',
            };
            const k = (cmd || '').toLowerCase().replace(/\s+/g, '');
            return m[k] || cmd || 'clickAt';
        }

        // ── highlight ─────────────────────────────────────────────────────────
        function highlight(el) {
            const prev = el.style.outline;
            el.style.outline = '3px solid #f29a00';
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            setTimeout(() => { el.style.outline = prev; }, 900);
        }

        // ── fire React/Vue friendly input events ───────────────────────────────
        function fireEvents(el) {
            ['input', 'change'].forEach(t =>
                el.dispatchEvent(new Event(t, { bubbles: true, cancelable: true })));
        }

        // ── build "not found" error ────────────────────────────────────────────
        function notFoundErr(found, action, backups) {
            backups = backups || [];
            const tried = found.triedAll || [];
            const lines  = ['Locator not found for action: ' + action];
            if (tried.length) {
                lines.push('All ' + tried.length + ' locator(s) tried — none matched:');
                tried.forEach(function(t, i) { lines.push('  ' + (i + 1) + '. ' + t); });
            } else {
                lines.push('No locator recorded for this element.');
            }
            const dynamicBackups = backups.filter(function(b) { return b.type === 'partial-id-xpath'; });
            lines.push('');
            lines.push('Possible reasons:');
            if (dynamicBackups.length) {
                lines.push('  • Dynamic ID detected — element ID changes on every page load');
            }
            lines.push('  • Element removed or hidden after recording');
            lines.push('  • Page structure changed since recording');
            lines.push('  • Page may not have fully loaded before this step ran');
            return lines.join('\n');
        }

        // ── main ──────────────────────────────────────────────────────────────
        const cmd  = norm(step.command);
        const { xpath, css, data } = step;

        try {
            // --- navigation / scrolls / reload (no element needed) ---

            if (cmd === 'openWebsite') return { success: true };

            if (cmd === 'scrollDown') {
                window.scrollBy({ top: 400, behavior: 'smooth' });
                return { success: true };
            }
            if (cmd === 'scrollUp') {
                window.scrollBy({ top: -400, behavior: 'smooth' });
                return { success: true };
            }
            if (cmd === 'refresh') {
                window.location.reload();
                return { success: true };
            }

            if (cmd === 'goBack') {
                history.back();
                return { success: true };
            }

            if (cmd === 'goForward') {
                history.forward();
                return { success: true };
            }

            // --- element-based actions ---

            const found = findEl(xpath, css, step.backupLocators);
            if (!found.el) {
                return { success: false, error: notFoundErr(found, cmd, step.backupLocators) };
            }
            const el = found.el;
            highlight(el);
            // If a backup locator was used, return a note so the UI can show it
            const _usedBackup = found.strategyUsed && found.strategyUsed !== 'primary';
            const _locatorNote = _usedBackup ? 'Used fallback: ' + found.locator : null;

            if (cmd === 'clickAt') {
                el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
                el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                el.dispatchEvent(new MouseEvent('mouseup',   { bubbles: true }));
                el.click();
                return { success: true, locatorNote: _locatorNote };
            }

            if (cmd === 'doubleClickAt') {
                el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true, detail: 2 }));
                return { success: true };
            }

            if (cmd === 'rightClick') {
                el.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
                return { success: true };
            }

            if (cmd === 'type') {
                el.focus();
                // Use native setter so React/Vue state updates
                const proto  = Object.getPrototypeOf(el);
                const setter = Object.getOwnPropertyDescriptor(proto, 'value');
                if (setter && setter.set) {
                    setter.set.call(el, data || '');
                } else {
                    el.value = data || '';
                }
                fireEvents(el);
                return { success: true };
            }

            if (cmd === 'select') {
                let matched = false;
                for (const opt of (el.options || [])) {
                    if (opt.value === data || opt.text === data || opt.text.trim() === data) {
                        opt.selected = true;
                        matched = true;
                        break;
                    }
                }
                if (!matched) el.value = data;
                fireEvents(el);
                const available = Array.from(el.options || []).map(o => '"' + o.text.trim() + '"').join(', ');
                if (!matched && el.value !== data) {
                    return {
                        success: false,
                        error: 'Dropdown option "' + data + '" not found.\n' +
                               'Available options: ' + (available || '(none)') + '\n' +
                               'Locator used: ' + found.locator,
                    };
                }
                return { success: true };
            }

            if (cmd === 'pressKey') {
                const keyMap = {
                    'enter': 'Enter', 'esc': 'Escape', 'escape': 'Escape',
                    'backspace': 'Backspace', 'delete': 'Delete', 'tab': 'Tab',
                    'up arrow': 'ArrowUp', 'down arrow': 'ArrowDown',
                    'left arrow': 'ArrowLeft', 'right arrow': 'ArrowRight',
                    'caps lock': 'CapsLock', 'space': ' ',
                    'backspace(delete on mac)': 'Backspace',
                };
                const key = keyMap[(data || '').toLowerCase()] || data || 'Enter';
                ['keydown', 'keypress', 'keyup'].forEach(t =>
                    el.dispatchEvent(new KeyboardEvent(t, { key, code: key, bubbles: true, cancelable: true })));
                if (key === 'Enter' && el.form) {
                    try { el.form.requestSubmit(); } catch (_) { try { el.form.submit(); } catch (__) {} }
                }
                return { success: true };
            }

            if (cmd === 'drag') {
                const rect = el.getBoundingClientRect();
                el.dispatchEvent(new DragEvent('dragstart', {
                    bubbles: true, cancelable: true,
                    clientX: rect.left + rect.width  / 2,
                    clientY: rect.top  + rect.height / 2,
                }));
                return { success: true };
            }

            if (cmd === 'drop') {
                ['dragover', 'drop', 'dragend'].forEach(t =>
                    el.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true })));
                return { success: true };
            }

            return { success: true, skipped: true, reason: 'No handler for: ' + cmd };

        } catch (err) {
            return { success: false, error: 'Unexpected error during "' + cmd + '": ' + err.message };
        }
    }

    // ─── Iframe-aware element execution ─────────────────────────────────────────
    //
    // When a CSS chain contains ~~~~ (iframe boundary), we must execute the action
    // in the correct child frame. The challenge: multiple iframes may share the same
    // URL (common in practice/demo pages), making URL-based identification unreliable.
    //
    // Solution: Walk the chain level by level. At each level, collect ALL child frames
    // of the current parent. At the leaf level, try executing the action in EACH
    // candidate frame. The element's own CSS selector (innerCss) is specific enough
    // to only match in the correct frame — so the first successful execution is correct.
    //
    // This handles:
    //   • Iframes with same URL (brute-force find correct one via element CSS)
    //   • Iframes with different URLs (still tries each, succeeds quickly)
    //   • Arbitrary nesting depth (recursive chain walking)
    //   • Frames still loading (retry with delay)

    /**
     * Collect candidate Chrome frameIds by walking ~~~~-separated iframe chain.
     * Returns array of frameIds at the DEEPEST level of the chain.
     */
    async function collectCandidateFrameIds(tabId, iframeChain) {
        let allFrames;
        try { allFrames = await chrome.webNavigation.getAllFrames({ tabId }); }
        catch (_) { return []; }
        if (!allFrames || !allFrames.length) return [];

        let parentIds = [0];  // start from main frame

        for (let si = 0; si < iframeChain.length; si++) {
            const sel = iframeChain[si].trim();
            const nextIds = [];

            for (const parentId of parentIds) {
                const children = allFrames.filter(f => f.parentFrameId === parentId);
                if (!children.length) continue;

                // [tcs-frame:URL] token — match child frames by URL
                const urlTokenMatch = sel.match(/^\[tcs-frame:(.*)\]$/);
                if (urlTokenMatch) {
                    const base = urlTokenMatch[1].split('?')[0];
                    const matched = children.filter(
                        cf => cf.url && cf.url.split('?')[0] === base
                    );
                    if (matched.length > 0) {
                        nextIds.push(...matched.map(f => f.frameId));
                    } else {
                        // URL not found — add ALL children (frames may still be loading)
                        nextIds.push(...children.map(f => f.frameId));
                    }
                    continue;
                }

                // CSS selector — execute in parent to get matching iframes' srcs,
                // then correlate with getAllFrames. If correlation fails, add all children.
                let matched = false;
                try {
                    const res = await chrome.scripting.executeScript({
                        target: { tabId, frameIds: [parentId] },
                        func: function(css) {
                            try {
                                return Array.from(document.querySelectorAll(css))
                                    .map(function(el) { return el.src || ''; });
                            } catch (_) { return []; }
                        },
                        args: [sel],
                    });
                    const srcs = (res && res[0] && res[0].result) || [];
                    for (const src of srcs) {
                        if (!src) continue;
                        const srcBase = src.split('?')[0];
                        const found = children.filter(
                            cf => cf.url && cf.url.split('?')[0] === srcBase
                        );
                        if (found.length) { nextIds.push(...found.map(f => f.frameId)); matched = true; }
                    }
                } catch (_) {}

                // Fallback: add ALL children and let element CSS disambiguate
                if (!matched) nextIds.push(...children.map(f => f.frameId));
            }

            if (!nextIds.length) return [];  // no frames found at this level
            parentIds = [...new Set(nextIds)];  // deduplicate
        }

        return parentIds;
    }

    // ─── Run a step via executeScript — handles iframes correctly ─────────────
    // For main-frame steps: execute directly in frame 0.
    // For iframe steps (~~~~): collect candidate child frames at each level,
    // then try each one — return on first success.
    // This handles same-URL iframes: the element's CSS distinguishes the right frame.

    async function runInPage(tabId, payload, retries) {
        retries = retries || 3;
        const rawCss = payload.css || '';

        // ── Main frame ────────────────────────────────────────────────────────
        if (!rawCss.includes('~~~~')) {
            return execInFrame(tabId, 0, payload, retries);
        }

        // ── Iframe step ───────────────────────────────────────────────────────
        const parts       = rawCss.split('~~~~').map(function(s) { return s.trim(); });
        const iframeChain = parts.slice(0, -1);
        const innerCss    = parts[parts.length - 1];
        const innerPayload = Object.assign({}, payload, {
            css:   innerCss,
            xpath: (payload.xpath && !payload.xpath.startsWith('This ')) ? payload.xpath : '',
        });

        // Retry: frames may not be loaded on first attempt
        const MAX_WAIT = 4;
        for (let attempt = 0; attempt < MAX_WAIT; attempt++) {
            const candidates = await collectCandidateFrameIds(tabId, iframeChain);
            if (candidates.length > 0) {
                // Try each candidate; first success wins
                for (const frameId of candidates) {
                    const res = await execInFrame(tabId, frameId, innerPayload, 1);
                    if (res && res.success) return res;
                }
                // Tried all frames, nothing worked
                return {
                    success: false,
                    error: 'Element not found in any of ' + candidates.length + ' iframe frame(s).\nCSS: ' + innerCss,
                };
            }
            if (attempt < MAX_WAIT - 1) await sleep(900);
        }
        return { success: false, error: 'Iframe frames not found. Chain: ' + iframeChain.join(' ~~~~ ') };
    }

    /** Execute tcsActionRunner in one specific frame, with retries on script-inject errors. */
    async function execInFrame(tabId, frameId, payload, retries) {
        let lastErr = 'Unknown error';
        for (let attempt = 0; attempt < (retries || 3); attempt++) {
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId, frameIds: [frameId] },
                    func:   tcsActionRunner,
                    args:   [payload],
                });
                const res = results && results[0];
                if (!res) return { success: false, error: 'No result from executeScript' };
                if (res.error) return { success: false, error: 'Script error: ' + res.error.message };
                return res.result || { success: true };
            } catch (err) {
                lastErr = err.message;
                if (attempt < (retries || 3) - 1) await sleep(600);
            }
        }
        return { success: false, error: lastErr };
    }

    // ─── Heuristic command detection ──────────────────────────────────────────

    function detectCommand(sentence) {
        if (!sentence) return 'clickAt';
        const s = sentence.toLowerCase();
        if (s.startsWith('open website'))                    return 'openWebsite';
        if (s.startsWith('double click'))                    return 'doubleClickAt';
        if (s.startsWith('right click'))                     return 'rightClick';
        if (s.startsWith('click'))                           return 'clickAt';
        if (s.startsWith('enter ') || s.startsWith('type')) return 'type';
        if (s.startsWith('select '))                         return 'select';
        if (s.includes('scroll down'))                       return 'scrollDown';
        if (s.includes('scroll up'))                         return 'scrollUp';
        if (s.startsWith('reload'))                          return 'refresh';
        if (s.startsWith('navigate back')  || s === 'back')  return 'goBack';
        if (s.startsWith('navigate forward') || s === 'forward') return 'goForward';
        if (s.startsWith('press '))                          return 'pressKey';
        if (s.startsWith('drag '))                           return 'drag';
        if (s.startsWith('drop '))                           return 'drop';
        return 'clickAt';
    }

    // ─── Execute one step ─────────────────────────────────────────────────────

    async function executeStep(tabId, step) {
        const cmd = step.command || detectCommand(step.step);

        // Navigation — engine drives the tab directly
        if (cmd === 'openWebsite' ||
            (!step.relXpath && !step.relCss && step.dataText && step.dataText.startsWith('http'))) {
            await navigateAndWait(tabId, step.dataText);
            return { success: true };
        }

        // Reload
        if (cmd === 'refresh') {
            await reloadAndWait(tabId);
            return { success: true };
        }

        // Browser back / forward navigation
        if (cmd === 'goBack' || cmd === 'goForward') {
            await runInPage(tabId, { command: cmd, xpath: '', css: '', data: '', backupLocators: [] });
            await waitForTabStable(tabId, 6000);   // wait for the navigated-to page to settle
            return { success: true };
        }

        // Everything else — inject into page
        const payload = {
            command:        cmd,
            xpath:          step.relXpath       || '',
            css:            step.relCss         || '',
            data:           step.dataText       || '',
            backupLocators: step.backupLocators || [],   // ← fallback locators for dynamic elements
        };
        const result = await runInPage(tabId, payload);

        // After a click the page might navigate — wait for it to settle
        if (result.success && (cmd === 'clickAt' || cmd === 'doubleClickAt')) {
            await waitForTabStable(tabId, 4000);
        }

        return result;
    }

    // ─── Main replay loop ─────────────────────────────────────────────────────

    async function run() {
        if (state.running) return;

        if (!window.steps || steps.length === 0) {
            setStatus('⚠  No recorded steps to replay.', 'warn');
            return;
        }

        const firstStep = steps[0];
        const startUrl  = firstStep && firstStep.dataText && firstStep.dataText.startsWith('http')
            ? firstStep.dataText : null;

        if (!startUrl) {
            setStatus('⚠  First step has no URL. Start recording from "Open website".', 'warn');
            return;
        }

        // 1. Pause recording
        pauseRecording();

        // Remember which window TCS is in so we can bring it back into focus later
        const studioWin = await chrome.windows.getCurrent();
        state.studioWinId = studioWin ? studioWin.id : null;

        state.running  = true;
        state.paused   = false;
        state.aborted  = false;
        state.stepDelay = dom.speedSelect ? parseInt(dom.speedSelect.value, 10) : 800;

        clearRowHighlights();
        setProgress(0, steps.length);
        updateButtonState(true, false);
        setStatus('🪟  Opening a fresh browser window …', 'info');

        // 2. Open brand-new window
        let tabId;
        try {
            tabId = await openReplayWindow();
        } catch (err) {
            setStatus('✗  Could not open replay window: ' + err.message, 'error');
            state.running = false;
            updateButtonState(false, false);
            resumeRecording();
            return;
        }

        // 3. Navigate to start URL
        setStatus('▶  Loading ' + startUrl + ' …', 'info');
        await navigateAndWait(tabId, startUrl);

        // 4. Step loop
        const total = steps.length;
        let passed = 0, failed = 0;

        for (let i = 0; i < total; i++) {
            if (state.aborted) break;

            while (state.paused && !state.aborted) {
                setStatus('⏸  Paused at step ' + (i + 1) + ' — click Resume.', 'warn');
                await sleep(300);
            }
            if (state.aborted) break;

            const step = steps[i];

            // Step 0 was the navigation we just did
            if (i === 0 && (step.command === 'openWebsite' ||
                (!step.relXpath && !step.relCss && step.dataText === startUrl))) {
                markRowResult(0, true);
                passed++;
                setProgress(1, total);
                continue;
            }

            state.currentIdx = i;
            highlightRow(i);
            setStatus('▶  Step ' + (i + 1) + ' / ' + total + ': ' + step.step, 'info');
            setProgress(i + 1, total);

            let result;
            try {
                result = await executeStep(tabId, step);
            } catch (err) {
                result = { success: false, error: err.message };
            }

            if (result && result.success) {
                passed++;
                markRowResult(i, true, null, result.locatorNote || null);
            } else {
                failed++;
                const errMsg = (result && result.error) || 'Unknown error';
                markRowResult(i, false, errMsg);
                setStatus('✗  Step ' + (i + 1) + ' failed — ' + errMsg.split('\n')[0], 'error');
            }

            if (i < total - 1 && !state.aborted) await sleep(state.stepDelay);
        }

        // 5. Close replay window (or keep it open) and refocus TCS
        const shouldClose = !dom.closeWinSelect || dom.closeWinSelect.value !== 'keep';
        if (shouldClose) {
            await closeReplayWindow();
        }
        if (state.studioWinId !== null) {
            try { await chrome.windows.update(state.studioWinId, { focused: true }); } catch (_) {}
        }

        // 6. Summary
        state.running = false;
        updateButtonState(false, false);
        setProgress(total, total);

        if (state.aborted) {
            setStatus('⏹  Stopped at step ' + (state.currentIdx + 1) + '. ' +
                      passed + ' passed, ' + failed + ' failed.', 'warn');
            showCompletionBanner(passed, failed, total, true);
        } else {
            const allOk = failed === 0;
            setStatus(
                (allOk ? '✓' : '⚠') + '  Done — ' +
                passed + ' passed, ' + failed + ' failed out of ' + total + ' steps.' +
                (failed > 0 ? '  Hover ✗ for details.' : ''),
                allOk ? 'success' : 'error'
            );
            showCompletionBanner(passed, failed, total, false);
        }

        // 7. Resume recording
        resumeRecording();
    }

    // ─── Completion banner ────────────────────────────────────────────────────

    function showCompletionBanner(passed, failed, total, stopped) {
        // Remove any existing banner
        const existing = document.getElementById('tcs-completion-banner');
        if (existing) existing.remove();

        const allOk  = !stopped && failed === 0;
        const banner = document.createElement('div');
        banner.id    = 'tcs-completion-banner';
        banner.className = 'tcs-completion-banner tcs-banner-' + (allOk ? 'success' : (stopped ? 'warn' : 'fail'));

        const icon = allOk ? '✅' : (stopped ? '⏹' : '❌');
        const headline = stopped
            ? 'Replay Stopped'
            : allOk
                ? 'All Steps Passed!'
                : (passed === 0 ? 'All Steps Failed' : passed + ' of ' + total + ' Steps Passed');

        const detail = stopped
            ? passed + ' passed, ' + failed + ' failed before stop.'
            : failed === 0
                ? 'All ' + total + ' steps completed successfully.'
                : failed + ' step' + (failed > 1 ? 's' : '') + ' failed. Check ✗ rows for details.';

        banner.innerHTML =
            '<div class="tcs-banner-icon">' + icon + '</div>' +
            '<div class="tcs-banner-body">' +
                '<div class="tcs-banner-headline">' + headline + '</div>' +
                '<div class="tcs-banner-detail">' + detail + '</div>' +
            '</div>' +
            '<button class="tcs-banner-close" title="Dismiss">×</button>';

        // Insert above the step table
        const tableWrap = document.querySelector('.rightContainerLower');
        if (tableWrap) {
            tableWrap.insertBefore(banner, tableWrap.firstChild);
        } else {
            document.body.appendChild(banner);
        }

        banner.querySelector('.tcs-banner-close').addEventListener('click', () => banner.remove());

        // Auto-dismiss after 12 s on full success
        if (allOk) setTimeout(() => { if (banner.parentNode) banner.remove(); }, 12000);
    }

    // ─── Pause / Resume / Stop ────────────────────────────────────────────────

    function pause() {
        if (!state.running) return;
        state.paused = !state.paused;
        updateButtonState(true, state.paused);
        if (!state.paused) setStatus('▶  Resuming …', 'info');
    }

    function stop() {
        state.aborted = true;
        state.running = false;
        state.paused  = false;
        updateButtonState(false, false);
        resumeRecording();
        closeReplayWindow().then(() => {
            if (state.studioWinId !== null) {
                chrome.windows.update(state.studioWinId, { focused: true }).catch(() => {});
            }
        });
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    function init() {
        initDom();
        if (!dom.runBtn) return;

        dom.runBtn.addEventListener('click', async () => {
            await closeReplayWindow();
            run();
        });
        dom.pauseBtn.addEventListener('click', pause);
        dom.stopBtn.addEventListener('click',  stop);

        // Persist the close/keep preference across panel reloads
        if (dom.closeWinSelect) {
            // Restore saved preference
            chrome.storage.local.get(['tcs_close_win'], function(r) {
                // Default is 'keep' — only override if user previously saved a choice
                dom.closeWinSelect.value = r.tcs_close_win || 'keep';
            });
            dom.closeWinSelect.addEventListener('change', function() {
                chrome.storage.local.set({ tcs_close_win: dom.closeWinSelect.value });
            });
        }

        if (dom.exportScriptBtn) {
            dom.exportScriptBtn.addEventListener('click', () => {
                if (typeof TCSExporter !== 'undefined') TCSExporter.download();
            });
        }

        chrome.windows.onRemoved.addListener(winId => {
            if (winId === state.replayWinId) {
                state.replayWinId = null;
                state.replayTabId = null;
                if (state.running) {
                    stop();
                    setStatus('⏹  Replay window was closed.', 'warn');
                }
            }
        });
    }

    return { init, run, pause, stop };
})();

document.addEventListener('DOMContentLoaded', () => TCSReplay.init());

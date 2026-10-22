/**
 * TestCase Studio – Script Exporter
 *
 * Reads ALL steps from window.steps[] (the canonical in-memory array).
 * Exports each step's primary XPath, primary CSS, and ALL backup locators.
 * Generated script uses a findElement() helper that tries every locator
 * in order so dynamic-ID elements don't cause failures.
 */

/* global steps */

const TCSExporter = (() => {
    'use strict';

    // ─── String helpers ───────────────────────────────────────────────────────

    /** Escape for single-quoted JS strings */
    function sq(s) {
        return (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }
    /** Escape for backtick template literals in the generated script */
    function bt(s) {
        return (s || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    }

    /**
     * Convert our internal selector chain to a Playwright locator expression.
     * Handles:
     *   >>>  → shadow piercing:  page.locator('a >> b >> c')
     *   ~~~~  → iframe:          page.frameLocator('iframe').locator('...')
     *
     * Mixed example:
     *   "iframe#app ~~~~ my-host >>> button"
     *   → page.frameLocator('iframe#app').locator('my-host >> button')
     */
    function buildPlaywrightLocator(chain) {
        // Normalise [tcs-frame:URL] tokens to the bare URL for frameLocator matching
        // Playwright's frameLocator() can accept a URL filter: page.frameLocator('[src*="url"]')
        chain = chain.replace(/\[tcs-frame:([^\]]+)\]/g, function(_, url) {
            // Use a CSS src attribute selector that matches the frame URL
            var base = url.split('?')[0].split('/').slice(-2).join('/');
            return 'iframe[src*="' + base + '"]';
        });
        // Tokenise on >>> and ~~~~
        var tokens = chain.split(/\s*(>>>|~~~~)\s*/);
        var iframeParts = [];   // iframe selectors
        var shadowChunks = []; // shadow selector segments between iframes
        var currentShadow = [];

        for (var ti = 0; ti < tokens.length; ti++) {
            var tok = tokens[ti].trim();
            if (!tok) continue;

            if (tok === '~~~~') {
                // iframe boundary: flush current shadow chunk, next token is the iframe selector
                if (currentShadow.length) { shadowChunks.push(currentShadow.join(' >> ')); currentShadow = []; }
                shadowChunks.push('~~~~'); // marker
            } else if (tok === '>>>') {
                // shadow boundary — next token is within shadow root of current element
            } else {
                currentShadow.push(sq(tok));
            }
        }
        if (currentShadow.length) shadowChunks.push(currentShadow.join(' >> '));

        // Build Playwright expression
        // Merge: ['outer-css', '~~~~', 'inner-shadow-chain']
        // → page.frameLocator('outer-css').locator('inner-shadow-chain')
        var iframeSelectors = [];
        var finalLocator = '';

        for (var ci = 0; ci < shadowChunks.length; ci++) {
            if (shadowChunks[ci] === '~~~~') {
                iframeSelectors.push(shadowChunks[ci - 1] !== '~~~~' ? shadowChunks[ci - 1] : '');
            }
        }

        if (!iframeSelectors.length) {
            // Pure shadow: page.locator('a >> b >> c')
            var pwShadow = chain.replace(/\s*>>>\s*/g, ' >> ').replace(/\s*~~~~\s*/g, ' >> ');
            return "page.locator('" + sq(pwShadow) + "')";
        }

        // Has iframes: build frameLocator chain
        var expr = 'page';
        var parts2 = chain.split(/\s*(~~~~)\s*/);
        for (var pi2 = 0; pi2 < parts2.length; pi2++) {
            var p2 = parts2[pi2].trim();
            if (!p2) continue;
            if (p2 === '~~~~') {
                // next part is the selector inside the iframe
            } else if (pi2 === 0 || (pi2 > 0 && parts2[pi2 - 1] === '~~~~')) {
                if (pi2 === 0) {
                    expr += ".frameLocator('" + sq(p2) + "')";
                } else {
                    // This is the content inside the iframe
                    var innerShadow = p2.replace(/\s*>>>\s*/g, ' >> ');
                    expr += ".locator('" + sq(innerShadow) + "')";
                }
            }
        }
        return expr;
    }


    // ─── Build a Playwright locator expression from a raw selector ────────────
    // Handles three types:
    //   1. XPath:  //button[@id='x']
    //   2. Shadow-piercing CSS chain:  my-app >>> my-form >>> button.submit
    //      We stored ">>>" at record time; Playwright uses ">>" for shadow piercing.
    //   3. Plain CSS:  button.submit

    function locExpr(raw) {
        if (!raw || !raw.trim()) return null;
        // Skip error strings stored when selector generation fails
        if (raw.startsWith('This ') || raw.startsWith('element is inside')) return null;

        // XPath
        if (raw.startsWith('//') || raw.startsWith('(//') || raw.startsWith('./')) {
            return "page.locator('xpath=" + sq(raw) + "')";
        }

        // Shadow-piercing chain (stored with ">>>", Playwright uses ">>")
        // Iframe boundary (stored with "~~~~") handled as Playwright frameLocator chain
        // [tcs-frame:URL] tokens are used for URL-based iframe identification
        if (raw.includes('~~~~') || raw.includes('>>>')) {
            return buildPlaywrightLocator(raw);
        }

        // Plain CSS
        return "page.locator('" + sq(raw) + "')";
    }

    // ─── Collect ALL locators for a step ──────────────────────────────────────

    function getLocators(step) {
        var list = [];

        // Primary XPath
        var px = step.relXpath || '';
        if (px && !px.startsWith('This ')) {
            var e = locExpr(px);
            if (e) list.push({ label: 'XPath (primary)', expr: e });
        }

        // Primary CSS
        var pc = step.relCss || '';
        if (pc && !pc.startsWith('This ')) {
            var e2 = locExpr(pc);
            if (e2) list.push({ label: 'CSS (primary)', expr: e2 });
        }

        // Backup locators (generated at record time by generateBackupLocators)
        var backups = Array.isArray(step.backupLocators) ? step.backupLocators : [];
        for (var i = 0; i < backups.length; i++) {
            var b = backups[i];
            if (b && b.locator) {
                var be = locExpr(b.locator);
                if (be) list.push({ label: b.label || b.type || ('Backup ' + (i + 1)), expr: be });
            }
        }

        return list;
    }

    // ─── Emit a findElement([...]) code block ─────────────────────────────────

    function findBlock(stepNum, desc, locs, action) {
        if (!locs.length) {
            return '  // ⚠ Step ' + stepNum + ': No locator captured for "' + desc + '" — skipping.\n' +
                   '  //   Re-record this step to capture its XPath/CSS.';
        }
        var lines = [];
        lines.push('  const el_' + stepNum + ' = await findElement([');
        for (var i = 0; i < locs.length; i++) {
            var comma = i < locs.length - 1 ? ',' : '';
            lines.push("    { label: '" + sq(locs[i].label) + "', loc: " + locs[i].expr + " }" + comma);
        }
        lines.push("  ], '" + sq(desc) + "');");
        lines.push('  await ' + action.replace('__EL__', 'el_' + stepNum) + ';');
        return lines.join('\n');
    }

    // ─── Command detection ────────────────────────────────────────────────────

    function getCmd(step) {
        if (step.command && step.command !== '') return step.command;
        var s = (step.step || '').toLowerCase();
        if (s.indexOf('open website') === 0)                    return 'openWebsite';
        if (s.indexOf('double click') === 0)                    return 'doubleClickAt';
        if (s.indexOf('right click') === 0)                     return 'rightClick';
        if (s.indexOf('click') === 0)                           return 'clickAt';
        if (s.indexOf('enter ') === 0 || s.indexOf('type') === 0) return 'type';
        if (s.indexOf('select ') === 0)                         return 'select';
        if (s.indexOf('scroll down') >= 0)                      return 'scrollDown';
        if (s.indexOf('scroll up') >= 0)                        return 'scrollUp';
        if (s.indexOf('reload') === 0)                          return 'refresh';
        if (s.indexOf('navigate back') === 0 || s === 'back')   return 'goBack';
        if (s.indexOf('navigate forward') === 0 || s === 'forward') return 'goForward';
        if (s.indexOf('press ') === 0)                          return 'pressKey';
        if (s.indexOf('drag ') === 0)                           return 'drag';
        if (s.indexOf('drop ') === 0)                           return 'drop';
        return 'clickAt';
    }

    // ─── Convert one step to Playwright code ──────────────────────────────────

    function stepToCode(step, idx) {
        var n       = idx + 1;
        var cmd     = getCmd(step);
        var desc    = step.step || ('Step ' + n);
        var pwNote  = step.playwrightLocator ? '\n  // Playwright: ' + step.playwrightLocator : '';
        var comment = '  // Step ' + n + ': ' + desc + pwNote;
        var locs    = getLocators(step);
        var data    = bt(step.dataText || '');

        if (cmd === 'openWebsite') {
            return comment + "\n  await page.goto('" + sq(step.dataText || '') + "');";
        }
        if (cmd === 'refresh') {
            return comment + '\n  await page.reload();';
        }
        if (cmd === 'goBack') {
            return comment + '\n  await page.goBack();';
        }
        if (cmd === 'goForward') {
            return comment + '\n  await page.goForward();';
        }
        if (cmd === 'scrollDown' || cmd === 'scroll down') {
            return comment + '\n  await page.evaluate(() => window.scrollBy(0, 400));';
        }
        if (cmd === 'scrollUp' || cmd === 'scroll up') {
            return comment + '\n  await page.evaluate(() => window.scrollBy(0, -400));';
        }
        if (cmd === 'pressKey' || cmd === 'sendKeys' || cmd === 'submit') {
            var km = {
                'enter': 'Enter', 'esc': 'Escape', 'escape': 'Escape',
                'backspace': 'Backspace', 'delete': 'Delete', 'tab': 'Tab',
                'up arrow': 'ArrowUp', 'down arrow': 'ArrowDown',
                'caps lock': 'CapsLock', 'backspace(delete on mac)': 'Backspace',
            };
            var key = km[(step.dataText || 'Enter').toLowerCase()] || step.dataText || 'Enter';
            if (locs.length) return comment + '\n' + findBlock(n, desc, locs, "__EL__.press('" + sq(key) + "')");
            return comment + "\n  await page.keyboard.press('" + sq(key) + "');";
        }
        if (cmd === 'clickAt' || cmd === 'contextMenu') {
            return comment + '\n' + findBlock(n, desc, locs, '__EL__.click()');
        }
        if (cmd === 'doubleClickAt') {
            return comment + '\n' + findBlock(n, desc, locs, '__EL__.dblclick()');
        }
        if (cmd === 'rightClick') {
            return comment + '\n' + findBlock(n, desc, locs, "__EL__.click({ button: 'right' })");
        }
        if (cmd === 'type') {
            return comment + '\n' + findBlock(n, desc, locs, '__EL__.fill(`' + data + '`)');
        }
        if (cmd === 'select' || cmd === 'addSelection') {
            return comment + '\n' + findBlock(n, desc, locs, '__EL__.selectOption({ label: `' + data + '` })');
        }
        if (cmd === 'drag') {
            return comment + '\n' + findBlock(n, desc, locs, '__EL__.hover()') +
                   '\n  // ↑ pair with the Drop step below';
        }
        if (cmd === 'drop') {
            return comment + '\n' + findBlock(n, desc, locs, 'el_' + (n - 1) + '.dragTo(__EL__)');
        }
        return comment + '\n  // ⚠ Unrecognised command "' + cmd + '" — implement manually.';
    }

    // ─── The findElement() helper embedded in every exported script ───────────

    var FIND_HELPER = [
        '',
        '// ─── findElement: tries every locator in order, first match wins ────────────',
        '// Generated by TestCase Studio. Handles dynamic IDs automatically.',
        'async function findElement(locators, stepDesc) {',
        '  const errs = [];',
        '  for (const { label, loc } of locators) {',
        '    try {',
        "      await loc.waitFor({ state: 'attached', timeout: 3000 });",
        '      if (await loc.count() > 0) {',
        "        process.stdout.write('  [✓] ' + stepDesc + ' → ' + label + '\\n');",
        '        return loc.first();',
        '      }',
        "      errs.push(label + ': 0 elements matched');",
        '    } catch (e) {',
        "      errs.push(label + ': ' + e.message.split('\\n')[0]);",
        '    }',
        '  }',
        '  throw new Error(',
        "    'Element not found for: \"' + stepDesc + '\"\\n' +",
        "    errs.map((e, i) => '  ' + (i + 1) + '. ' + e).join('\\n') + '\\n' +",
        "    'Tip: Re-record this step if the page structure changed.'",
        '  );',
        '}',
        '// ─────────────────────────────────────────────────────────────────────────────',
        '',
    ].join('\n');

    // ─── Build the full script ────────────────────────────────────────────────

    function buildScript(testName) {
        // Read directly from window.steps — the canonical source
        var allSteps = [];
        if (window.steps && Array.isArray(window.steps)) {
            allSteps = window.steps;
        }

        // Log step details to console for debugging
        console.log('[TCS Export] window.steps count:', allSteps.length);
        for (var d = 0; d < allSteps.length; d++) {
            var s = allSteps[d];
            console.log(
                '  Step', d + 1,
                '| cmd:', (s.command || '?'),
                '| step:', (s.step || '').substring(0, 50),
                '| relXpath:', (s.relXpath || '(none)').substring(0, 60),
                '| relCss:', (s.relCss || '(none)').substring(0, 40),
                '| backups:', (s.backupLocators || []).length
            );
        }

        if (!allSteps.length) {
            console.warn('[TCS Export] No steps found in window.steps!');
            return null;
        }

        var safe   = (testName || 'Recorded_Test').replace(/[^a-z0-9_\- ]/gi, '').trim() || 'Recorded_Test';
        var safeFn = safe.replace(/\s+/g, '_');
        var lines  = [];

        lines.push('// ================================================================');
        lines.push('// TestCase Studio — Playwright Script');
        lines.push('// Name  : ' + safe);
        lines.push('// Date  : ' + new Date().toLocaleString());
        lines.push('// Steps : ' + allSteps.length);
        lines.push('// ================================================================');
        lines.push('// RUN:');
        lines.push('//   npm install && npx playwright install chromium');
        lines.push('//   node ' + safeFn + '.spec.js');
        lines.push('// ================================================================');
        lines.push('// LOCATOR STRATEGY per element step (tried in order):');
        lines.push('//   1. Primary XPath (recorded)');
        lines.push('//   2. Primary CSS   (recorded)');
        lines.push('//   3. Index-based XPath   e.g. (//button)[4]');
        lines.push('//   4. Text-based XPath    e.g. //button[normalize-space()="OK"]');
        lines.push('//   5. Partial-ID XPath    e.g. //input[contains(@id,"field-")]');
        lines.push('// ================================================================');
        lines.push('');
        lines.push("'use strict';");
        lines.push("const { chromium } = require('playwright');");
        lines.push(FIND_HELPER);
        lines.push('(async () => {');
        lines.push("  const browser = await chromium.launch({ headless: false, slowMo: 80 });");
        lines.push("  const context = await browser.newContext();");
        lines.push("  const page    = await context.newPage();");
        lines.push('');
        lines.push('  // ── ' + allSteps.length + ' Recorded Steps ─────────────────────────────────────');
        lines.push('');

        for (var i = 0; i < allSteps.length; i++) {
            var code;
            try {
                code = stepToCode(allSteps[i], i);
            } catch (err) {
                code = '  // ⚠ Step ' + (i + 1) + ' export error: ' + err.message;
                console.error('[TCS Export] Step', i + 1, 'error:', err.message);
            }
            lines.push(code);
            lines.push('');
        }

        lines.push("  console.log('\\n✓ All " + allSteps.length + " steps passed.');");
        lines.push('  await browser.close();');
        lines.push("})().catch(err => {");
        lines.push("  console.error('\\n✗ Test failed:', err.message);");
        lines.push("  process.exit(1);");
        lines.push("});");

        return lines.join('\n');
    }

    // ─── File download helper ─────────────────────────────────────────────────

    function dlFile(name, content, mime) {
        var blob = new Blob([content], { type: mime || 'text/plain' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    }

    function buildPackageJson(name) {
        var s = (name || 'test').replace(/\s+/g, '-').toLowerCase();
        return JSON.stringify({
            name: s, version: '1.0.0',
            scripts: { test: 'npx playwright test', run: 'node ' + s.replace(/-/g, '_') + '.spec.js' },
            dependencies: { playwright: '^1.40.0' }
        }, null, 2);
    }

    function buildReadme(name, count) {
        var s  = (name || 'test').replace(/\s+/g, '-').toLowerCase();
        var fn = s.replace(/-/g, '_');
        return [
            '# ' + name + ' — Playwright Script',
            '',
            'Generated by **TestCase Studio** (SelectorsHub).  **' + count + ' steps** recorded.',
            '',
            '## Quick Start',
            '```bash',
            'npm install',
            'npx playwright install chromium',
            'node ' + fn + '.spec.js',
            '```',
            '',
            '## Locator Resilience',
            'Every element step tries up to 5 locators in order:',
            '1. Primary XPath (recorded)',
            '2. Primary CSS (recorded)',
            '3. Index-based XPath — `(//button)[4]`',
            '4. Text-based XPath — `//button[normalize-space()="Submit"]`',
            '5. Partial-ID XPath — `//input[contains(@id,"email-")]`',
            '',
            '---',
            '*Generated: ' + new Date().toLocaleString() + '*',
        ].join('\n');
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    function download() {
        var allSteps = (window.steps && Array.isArray(window.steps)) ? window.steps : [];

        if (!allSteps.length) {
            alert('No steps to export.\n\nRecord a test case first, then click Export.');
            return;
        }

        var nameEl   = document.querySelector('#downloadFileName input');
        var testName = (nameEl && nameEl.value && nameEl.value.trim()) || 'Recorded_Test';

        // Build filename: domain-name + date-time (e.g. "flipkart_2025-04-07_14-30-00.spec.js")
        // Extract domain from the first openWebsite step
        var domain = '';
        for (var i = 0; i < allSteps.length; i++) {
            if (allSteps[i].dataText && allSteps[i].dataText.indexOf('http') === 0) {
                try {
                    domain = new URL(allSteps[i].dataText).hostname
                        .replace(/^www\./, '')   // strip www.
                        .replace(/\.[^.]+$/, '')  // strip TLD (.com, .in, etc.)
                        .replace(/[^a-z0-9_\-]/gi, '_'); // sanitise
                } catch (e) {}
                break;
            }
        }
        var now = new Date();
        var pad = function(n) { return String(n).padStart(2, '0'); };
        var dateStr = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(now.getDate());
        var timeStr = pad(now.getHours()) + '-' + pad(now.getMinutes()) + '-' + pad(now.getSeconds());
        var safe = (domain || testName.replace(/\s+/g, '_').replace(/[^a-z0-9_\-]/gi, '') || 'Recorded_Test')
                   + '_' + dateStr + '_' + timeStr;

        var script = buildScript(testName);
        if (!script) {
            alert('Export failed. Open DevTools on this TCS panel and check the console for details.');
            return;
        }

        dlFile(safe + '.spec.js', script, 'text/javascript');
        // package.json and README.md are intentionally not included in the export
    }

    return { download, buildScript };
})();

/**
 * TestCase Studio – Script Importer
 * Parses a .spec.js file (exported by TCS) back into window.steps[]
 * so the test can be reviewed, edited, and replayed inside TCS.
 */

/* global steps, displayRows */

const TCSImporter = (() => {
    'use strict';

    // ─── Extract a raw locator from a page.locator('...') expression ──────────

    function extractRaw(locStr) {
        // Robustly extract the raw selector from page.locator('...')
        var idx = locStr.indexOf("page.locator('");
        if (idx < 0) return { xpath: '', css: '' };
        var start = idx + "page.locator('".length;
        var raw = '';
        var k = start;
        while (k < locStr.length) {
            if (locStr[k] === '\\' && k + 1 < locStr.length) {
                raw += locStr[k + 1]; // unescape \'
                k += 2;
            } else if (locStr[k] === "'") {
                break;
            } else {
                raw += locStr[k];
                k++;
            }
        }
        if (!raw) return { xpath: '', css: '' };

        // XPath
        if (raw.startsWith('xpath=')) return { xpath: raw.slice(6), css: '' };

        // Shadow-piercing: Playwright exports ">>" → convert back to ">>>" for TCS replay engine
        if (raw.includes(' >> ')) {
            var shadowCss = raw.split(' >> ').map(function(p) { return p.trim(); }).join(' >>> ');
            return { xpath: '', css: shadowCss, isShadow: true };
        }

        return { xpath: '', css: raw };
    }

    // ─── Parse the findElement([...]) block for a step ────────────────────────
    // Returns { relXpath, relCss, backupLocators }

    function parseLocators(block) {
        var relXpath = '', relCss = '';
        var backupLocators = [];

        // Match every { label: '...', loc: page.locator('...') } entry
        // Match { label: '...', loc: page.locator('...') }
        // The locator string can contain escaped quotes and parentheses
        var entryRe = /\{\s*label:\s*'([^']*)'[\s\S]*?loc:\s*(page\.locator\('[^'\\]*(?:\\.[^'\\]*)*'\))/g;
        var m;
        while ((m = entryRe.exec(block)) !== null) {
            var label   = m[1];
            var locStr  = m[2];
            var parsed  = extractRaw(locStr);
            var isXpath = parsed.xpath !== '';
            var raw     = isXpath ? parsed.xpath : parsed.css;

            if (label.indexOf('primary') >= 0 || label.indexOf('Primary') >= 0) {
                if (isXpath && !relXpath) relXpath = raw;
                else if (!isXpath && !relCss) relCss = raw;
            } else {
                // Backup locator
                var type = label.toLowerCase().indexOf('index')   >= 0 ? 'index-xpath'
                         : label.toLowerCase().indexOf('text')    >= 0 ? 'text-xpath'
                         : label.toLowerCase().indexOf('partial') >= 0 ? 'partial-id-xpath'
                         : label.toLowerCase().indexOf('nth')     >= 0 ? 'nth-css'
                         : 'backup';
                backupLocators.push({ type: type, label: label, locator: raw });
            }
        }

        // If no "primary" label found, use first as primary
        if (!relXpath && !relCss && backupLocators.length) {
            var first = backupLocators.shift();
            if (first.locator.startsWith('//') || first.locator.startsWith('(//')) {
                relXpath = first.locator;
            } else {
                relCss = first.locator;
            }
        }

        return { relXpath: relXpath, relCss: relCss, backupLocators: backupLocators };
    }

    // ─── Parse the full script text into a steps array ────────────────────────

    function parseScript(text) {
        var parsed = [];
        var lines  = text.split('\n');
        var i      = 0;

        while (i < lines.length) {
            var line    = lines[i].trim();
            var commentM = line.match(/^\/\/\s+Step\s+\d+:\s*(.*)/i);

            if (!commentM) { i++; continue; }

            var sentence = commentM[1].trim();
            // Check if next line has playwright locator comment
            var playwrightLocator = '';
            if (i + 1 < lines.length) {
                var pwLineM = lines[i + 1].trim().match(/^\/\/\s+Playwright:\s*(.+)/);
                if (pwLineM) playwrightLocator = pwLineM[1].trim();
            }

            // Collect the code block for this step (next non-empty lines until
            // the next '// Step' or end-of-steps marker)
            var blockLines = [];
            var j = i + 1;
            while (j < lines.length) {
                var nl = lines[j].trim();
                if (nl.match(/^\/\/\s+Step\s+\d+:/i)) break;
                if (nl === '// ── Done ──────────────────────────────────────────────────────────') break;
                if (nl.startsWith("console.log('\\n✓")) break;
                blockLines.push(lines[j]);
                j++;
            }

            var block = blockLines.join('\n');
            var step  = parseBlock(sentence, block);

            if (step) {
                parsed.push(step);
                i = j;
            } else {
                i++;
            }
        }

        return parsed;
    }


    /**
     * Parse a Playwright frameLocator chain back into our internal ~~~~ format.
     * page.frameLocator('iframe#app').locator('my-host >> button')
     * → 'iframe#app ~~~~ my-host >>> button'
     */
    function parseFrameLocatorChain(block) {
        var result = '';
        // Match: page.frameLocator('...').locator('...') or .frameLocator(...).locator(...)
        var flRe = /(?:page|\w+)\.frameLocator\('([^']*)'\)\.locator\('([^']*)'\)/;
        var m = block.match(flRe);
        if (m) {
            var iframeSel = m[1];
            var innerSel  = m[2].replace(/ >> /g, ' >>> ');  // convert back to >>>
            return iframeSel + ' ~~~~ ' + innerSel;
        }
        return '';
    }

    // ─── Convert a code block to a step object ────────────────────────────────

    function parseBlock(sentence, block) {
        var code = block.trim();

        // ── frameLocator (iframe + shadow DOM) ────────────────────────────────
        if (code.includes('frameLocator(')) {
            var iframeCss = parseFrameLocatorChain(code);
            if (iframeCss) {
                var action = detectAction(block);
                return makeStep(sentence, action.cmd, '', iframeCss, iframeCss, [], action.data);
            }
        }

        // ── goto (navigation) ──────────────────────────────────────────────────
        var gotoM = code.match(/await page\.goto\('([^']*)'\)/);
        if (gotoM) {
            return makeStep(sentence, 'openWebsite', '', '', gotoM[1], [], gotoM[1]);
        }

        // ── page.reload() ──────────────────────────────────────────────────────
        if (code.indexOf('await page.reload()') >= 0) {
            return makeStep(sentence, 'refresh', '', '', '', [], '');
        }
        // ── page.goBack() / page.goForward() ───────────────────────────────────
        if (code.indexOf('await page.goBack()') >= 0) {
            return makeStep(sentence, 'goBack', '', '', '', [], '');
        }
        if (code.indexOf('await page.goForward()') >= 0) {
            return makeStep(sentence, 'goForward', '', '', '', [], '');
        }

        // ── scroll ─────────────────────────────────────────────────────────────
        if (code.indexOf('scrollBy(0, 400)') >= 0) {
            return makeStep(sentence, 'scroll down', '', '', '', [], '');
        }
        if (code.indexOf('scrollBy(0, -400)') >= 0) {
            return makeStep(sentence, 'scroll up', '', '', '', [], '');
        }

        // ── keyboard press (page level) ────────────────────────────────────────
        var kbM = code.match(/await page\.keyboard\.press\('([^']*)'\)/);
        if (kbM) {
            return makeStep(sentence, 'pressKey', '', '', '', [], kbM[1]);
        }

        // ── findElement block ──────────────────────────────────────────────────
        if (code.indexOf('findElement(') >= 0) {
            var locs   = parseLocators(block);
            var action = detectAction(block);
            return makeStep(sentence, action.cmd, locs.relXpath, locs.relCss,
                            locs.relXpath || locs.relCss, locs.backupLocators, action.data);
        }

        // ── simple page.locator() (old format) ────────────────────────────────
        var locM = block.match(/page\.locator\(['"](.*?)['"]\)/);
        if (locM) {
            var loc    = extractRaw('page.locator(\'' + locM[1] + '\')');
            var action2 = detectAction(block);
            return makeStep(sentence, action2.cmd, loc.xpath, loc.css,
                            loc.xpath || loc.css, [], action2.data);
        }

        return null;
    }

    // ─── Detect action type and data from the code block ─────────────────────

    function detectAction(block) {
        if (block.indexOf('.click()') >= 0 && block.indexOf("button: 'right'") < 0) {
            return { cmd: 'clickAt', data: '' };
        }
        if (block.indexOf('.dblclick()') >= 0) {
            return { cmd: 'doubleClickAt', data: '' };
        }
        if (block.indexOf("button: 'right'") >= 0) {
            return { cmd: 'rightClick', data: '' };
        }
        var fillM = block.match(/\.fill\(`([^`]*)`\)/);
        if (fillM) return { cmd: 'type', data: fillM[1] };

        var selM = block.match(/\.selectOption\(\{\s*label:\s*`([^`]*)`\s*\}\)/);
        if (selM) return { cmd: 'select', data: selM[1] };

        var pressM = block.match(/\.press\('([^']*)'\)/);
        if (pressM) return { cmd: 'pressKey', data: pressM[1] };

        if (block.indexOf('.hover()') >= 0) return { cmd: 'drag', data: '' };
        if (block.indexOf('.dragTo(') >= 0) return { cmd: 'drop', data: '' };

        return { cmd: 'clickAt', data: '' };
    }

    // ─── Build a step object ──────────────────────────────────────────────────

    function makeStep(sentence, command, relXpath, relCss, planeLabel, backupLocators, dataText) {
        return {
            step:           sentence || command,
            command:        command,
            relXpath:       relXpath || '',
            relCss:         relCss   || '',
            dataText:       dataText || '',
            planeLabel:     planeLabel || sentence || '',
            expRes:         '',
        actRes: '',
            passwordValue:  '',
            backupLocators: backupLocators || [],
        };
    }

    // ─── Load parsed steps into TCS ───────────────────────────────────────────

    function loadSteps(parsed, replace) {
        if (replace) {
            while (window.steps && steps.length) steps.pop();
        }
        parsed.forEach(function (s) { window.steps.push(s); });
        if (typeof displayRows === 'function') {
            displayRows();
        }
    }

    // ─── Confirmation modal ───────────────────────────────────────────────────

    function showModal(filename, parsed) {
        var prev = document.getElementById('tcs-import-modal');
        if (prev) prev.remove();

        var hasExisting = window.steps && steps.length > 0;
        var modal       = document.createElement('div');
        modal.id        = 'tcs-import-modal';
        modal.className = 'tcs-import-modal-overlay';

        modal.innerHTML = '<div class="tcs-import-modal-box">' +
            '<div class="tcs-import-modal-header">' +
                '<span class="tcs-import-modal-icon">📂</span>' +
                '<span class="tcs-import-modal-title">Import Script</span>' +
            '</div>' +
            '<div class="tcs-import-modal-body">' +
                '<p class="tcs-import-filename">' + esc(filename) + '</p>' +
                '<p class="tcs-import-count"><strong>' + parsed.length + '</strong> step' + (parsed.length !== 1 ? 's' : '') + ' found</p>' +
                '<div class="tcs-import-preview">' +
                    parsed.slice(0, 5).map(function (s, i) {
                        return '<div class="tcs-import-preview-row">' +
                            '<span class="tcs-import-preview-num">' + (i + 1) + '</span>' +
                            '<span class="tcs-import-preview-step">' + esc(s.step) + '</span>' +
                        '</div>';
                    }).join('') +
                    (parsed.length > 5 ? '<div class="tcs-import-preview-more">… and ' + (parsed.length - 5) + ' more</div>' : '') +
                '</div>' +
                (hasExisting ? '<div class="tcs-import-replace-option">' +
                    '<label><input type="radio" name="tcs-import-mode" value="replace" checked /> Replace current ' + steps.length + ' step' + (steps.length !== 1 ? 's' : '') + '</label>' +
                    '<label><input type="radio" name="tcs-import-mode" value="append" /> Append to current steps</label>' +
                '</div>' : '') +
            '</div>' +
            '<div class="tcs-import-modal-footer">' +
                '<button class="tcs-import-cancel-btn">Cancel</button>' +
                '<button class="tcs-import-only-btn">Import Only</button>' +
                '<button class="tcs-import-confirm-btn">▶ Import &amp; Run</button>' +
            '</div>' +
        '</div>';

        document.body.appendChild(modal);

        var mode = function () {
            return hasExisting
                ? modal.querySelector('input[name="tcs-import-mode"]:checked').value
                : 'replace';
        };

        modal.querySelector('.tcs-import-cancel-btn').addEventListener('click', function () { modal.remove(); });

        modal.querySelector('.tcs-import-only-btn').addEventListener('click', function () {
            loadSteps(parsed, mode() === 'replace');
            modal.remove();
            showStatus('success', '✓ ' + parsed.length + ' steps imported. Click ▶ Run to execute.');
        });

        modal.querySelector('.tcs-import-confirm-btn').addEventListener('click', function () {
            loadSteps(parsed, mode() === 'replace');
            modal.remove();
            showStatus('success', '✓ ' + parsed.length + ' steps imported — starting replay…');
            setTimeout(function () {
                if (typeof TCSReplay !== 'undefined') TCSReplay.run();
            }, 400);
        });

        modal.addEventListener('click', function (e) { if (e.target === modal) modal.remove(); });
    }

    function showStatus(type, msg) {
        var bar = document.getElementById('tcs-replay-status');
        if (!bar) return;
        bar.className     = 'tcs-replay-bar tcs-status-' + type;
        bar.style.display = 'flex';
        var txt = document.getElementById('tcs-replay-status-text');
        if (txt) txt.textContent = msg;
    }

    function esc(s) {
        return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ─── File picker ──────────────────────────────────────────────────────────

    function openFilePicker() {
        var input    = document.createElement('input');
        input.type   = 'file';
        input.accept = '.js,.spec.js,.mjs,.ts';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', function () {
            var file = input.files && input.files[0];
            if (!file) { input.remove(); return; }

            var reader = new FileReader();
            reader.onload = function (e) {
                input.remove();
                var parsed = parseScript(e.target.result);
                if (!parsed.length) {
                    showStatus('error', '⚠ No steps found. Make sure you upload a script exported by TestCase Studio.');
                    return;
                }
                showModal(file.name, parsed);
            };
            reader.onerror = function () { input.remove(); showStatus('error', '✗ Could not read file.'); };
            reader.readAsText(file);
        });

        input.click();
    }

    // ─── Init ─────────────────────────────────────────────────────────────────

    function init() {
        var btn = document.getElementById('tcs-import-script-btn');
        if (btn) btn.addEventListener('click', openFilePicker);
    }

    return { init, parseScript };
})();

document.addEventListener('DOMContentLoaded', function () { TCSImporter.init(); });

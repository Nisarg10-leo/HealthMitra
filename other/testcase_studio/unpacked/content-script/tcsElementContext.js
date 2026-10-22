// ═══════════════════════════════════════════════════════════════════════════
// TestCase Studio Pro — element context for Expected Result generation (v2.6.7)
// Loaded before record-script.js; record() adds tcsGetElementContext(target)
// to each recorded event. Everything here is read-only and never throws.
// Password field values are never captured.
// ═══════════════════════════════════════════════════════════════════════════

function tcsGetElementContext(el) {
    try {
        if (!el || el.nodeType !== 1) return null;
        var clean = function (s, max) {
            return String(s || "").replace(/\s+/g, " ").trim().slice(0, max || 80);
        };
        var attr = function (node, name) {
            return node && node.getAttribute ? clean(node.getAttribute(name), 120) : "";
        };
        var tag = el.tagName.toLowerCase();
        var type = attr(el, "type").toLowerCase();
        var ctx = {
            tag: tag,
            type: type,
            role: attr(el, "role").toLowerCase(),
            text: clean(el.innerText || el.textContent, 80),
            ariaLabel: attr(el, "aria-label"),
            placeholder: attr(el, "placeholder"),
            title: attr(el, "title"),
            alt: attr(el, "alt"),
            autocomplete: attr(el, "autocomplete").toLowerCase(),
            required: el.required === true || attr(el, "aria-required") === "true",
            // record-script.js prefixes the title with a red dot while recording; drop it
            pageTitle: clean(String(document.title || "").replace(/\uD83D\uDD34/g, ""), 80),
            inFrame: window !== window.top
        };

        // associated label
        try {
            if (el.labels && el.labels.length) ctx.label = clean(el.labels[0].innerText, 60);
            var labelledBy = el.getAttribute("aria-labelledby");
            if (!ctx.label && labelledBy) {
                var lb = document.getElementById(labelledBy.split(/\s+/)[0]);
                if (lb) ctx.label = clean(lb.innerText, 60);
            }
        } catch (e) { /* ignore */ }

        // link
        var link = el.closest ? el.closest("a[href]") : null;
        if (link) {
            ctx.href = link.href;
            ctx.linkTarget = attr(link, "target");
            ctx.linkText = clean(link.innerText, 60);
        }

        // button / submit
        var btn = el.closest ? el.closest("button, input[type=submit], input[type=button], input[type=reset], [role=button]") : null;
        if (btn) {
            var btnType = (btn.getAttribute("type") || (btn.tagName === "BUTTON" ? "submit" : "")).toLowerCase();
            ctx.isButton = true;
            ctx.buttonText = clean(btn.innerText || btn.value || btn.getAttribute("aria-label"), 60);
            ctx.isSubmit = btnType === "submit" && !!(btn.form || (btn.closest && btn.closest("form")));
        }

        // form
        var form = el.form || (el.closest ? el.closest("form") : null);
        if (form) {
            ctx.inForm = true;
            ctx.formName = clean(form.getAttribute("aria-label") || form.getAttribute("name") || form.id, 40);
            ctx.formRole = attr(form, "role");
        }

        // search context
        ctx.isSearch = type === "search" || ctx.role === "searchbox" ||
            !!(form && (attr(form, "role") === "search" || /search/i.test(form.getAttribute("action") || ""))) ||
            /search/i.test([ctx.placeholder, ctx.ariaLabel, attr(el, "name"), attr(el, "id")].join(" "));

        // checkable state (for a click this is already the new state)
        var checkable = el.closest ? el.closest("input[type=checkbox], input[type=radio], [role=checkbox], [role=radio], [role=switch], [role=menuitemcheckbox]") : null;
        if (checkable) {
            ctx.checkRole = checkable.tagName === "INPUT" ? checkable.type : attr(checkable, "role");
            ctx.checked = checkable.tagName === "INPUT" ? checkable.checked : attr(checkable, "aria-checked") === "true";
        } else if (el.tagName === "LABEL" && el.control && /checkbox|radio/.test(el.control.type || "")) {
            ctx.checkRole = el.control.type;
            ctx.checked = el.control.checked;
        }

        // menus, tabs, disclosure
        var expander = el.closest ? el.closest("[aria-expanded]") : null;
        if (expander) ctx.expanded = attr(expander, "aria-expanded");
        var popup = el.closest ? el.closest("[aria-haspopup]") : null;
        if (popup && attr(popup, "aria-haspopup") !== "false") ctx.hasPopup = true;
        var tab = el.closest ? el.closest("[role=tab]") : null;
        if (tab) ctx.isTab = true;
        var menuItem = el.closest ? el.closest("[role=menuitem], [role=option]") : null;
        if (menuItem) ctx.menuItem = attr(menuItem, "role");

        // select / current value (never for passwords)
        if (tag === "select") {
            var opt = el.selectedOptions && el.selectedOptions[0];
            ctx.optionText = opt ? clean(opt.text, 60) : "";
        }
        if ((tag === "input" || tag === "textarea") && !/^(password|checkbox|radio|submit|button|reset|image|file|hidden)$/.test(type) && !/password/.test(ctx.autocomplete)) {
            ctx.currentValue = clean(el.value, 80);
        }
        if (type === "password" || /password/.test(ctx.autocomplete)) ctx.isPassword = true;

        // surrounding context
        var dialog = el.closest ? el.closest("dialog, [role=dialog], [role=alertdialog], [aria-modal=true]") : null;
        if (dialog) {
            ctx.inDialog = true;
            var dh = dialog.querySelector("h1, h2, h3, [role=heading]");
            ctx.dialogTitle = clean(attr(dialog, "aria-label") || (dh && dh.innerText), 60);
        }
        var section = el.closest ? el.closest("form, section, article, [role=region], fieldset") : null;
        if (section) {
            var heading = section.querySelector("legend, h1, h2, h3, h4");
            if (heading) ctx.sectionHeading = clean(heading.innerText, 60);
        }
        return ctx;
    } catch (e) {
        return null;
    }
}

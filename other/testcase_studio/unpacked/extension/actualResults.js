// ═══════════════════════════════════════════════════════════════════════════
// TestCase Studio Pro — Actual Result on replay (v2.6.7)
// When a test case is replayed with "Run", each step's Actual Result is filled:
//   passed → "Step executed successfully."   failed → "Failed: <reason>"
// Replay only confirms that each action ran; it does not check the Expected Result,
// so a passed step is not reported as "As expected".
// Text typed by the tester is never overwritten (step.actResAuto marks our text).
// The replay engine is not modified: results are read from the row classes it
// sets (tcs-replay-pass / tcs-replay-fail) and the inline error it adds.
// ═══════════════════════════════════════════════════════════════════════════

(() => {
  "use strict";

  const grid = document.getElementById("records-grid");
  const runBtn = document.getElementById("tcs-run-btn");
  if (!grid || !runBtn) return;

  const steps = () => (Array.isArray(window.steps) ? window.steps : []);
  const rows = () => Array.from(document.querySelectorAll("#records-grid tr"));   // same lookup as the replay engine

  const setActual = (step, row, text) => {
    if (step.actRes && !step.actResAuto) return;          // tester's own text
    step.actRes = text;
    step.actResAuto = !!text;
    const cell = row && row.querySelector(".actResColumn .tableData");
    if (cell) cell.innerText = text;
  };

  // row marked passed / failed by the replay engine
  new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      const row = m.target;
      const before = m.oldValue || "";
      const passed = row.classList.contains("tcs-replay-pass") && before.indexOf("tcs-replay-pass") === -1;
      const failed = row.classList.contains("tcs-replay-fail") && before.indexOf("tcs-replay-fail") === -1;
      if (!passed && !failed) return;
      const step = steps()[rows().indexOf(row)];
      if (!step) return;
      let text = "Step executed successfully.";
      if (failed) {
        const err = row.querySelector(".tcs-step-err-inline");
        const reason = err ? (err.title || err.textContent).replace(/^\W+/, "").split("\n")[0].trim() : "";
        text = reason ? `Failed: ${reason}` : "Failed.";
      }
      setActual(step, row, text);
    });
  }).observe(grid, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });

  // Run disables the Run button: clear our previous results at start, save at the end
  new MutationObserver(() => {
    if (runBtn.disabled) {
      const list = rows();
      steps().forEach((step, i) => { if (step && step.actResAuto) setActual(step, list[i], ""); });
    } else {
      try { if (typeof syncTestCasesToStorage === "function") syncTestCasesToStorage(); } catch (e) { /* ignore */ }
    }
  }).observe(runBtn, { attributes: true, attributeFilter: ["disabled"] });

  // tester edits the Actual Result: it becomes theirs
  grid.addEventListener("input", (e) => {
    const cell = e.target.closest && e.target.closest(".actResColumn");
    const row = cell && cell.closest("tr");
    const step = row && steps()[row.rowIndex - 1];
    if (step) step.actResAuto = false;
  }, true);
})();

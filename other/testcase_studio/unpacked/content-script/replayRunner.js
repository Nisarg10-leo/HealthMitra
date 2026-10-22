/**
 * TestCase Studio – Replay Runner (stub)
 * Step execution is now handled via chrome.scripting.executeScript
 * in replayEngine.js. This file is kept to avoid manifest errors.
 * It only guards against running inside child iframes.
 */
(function () {
    if (window.self !== window.top) return;
    // No-op: all replay logic lives in replayEngine.js (executeScript approach).
})();

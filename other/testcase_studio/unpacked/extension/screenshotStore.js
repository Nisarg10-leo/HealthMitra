/*
 * screenshotStore.js — off-heap screenshot storage for TestCase Studio free.
 *
 * The previous design kept every screenshot as a base64 data URL inside the
 * in-memory `steps[]` array AND re-serialised all of them into the grid's
 * innerHTML on every redraw. With `innerHTML +=` running once per row that is
 * O(n^2) over multi-megabyte strings, so the window froze at ~15-20 shots.
 *
 * This module keeps the bytes in IndexedDB (via deps/idb-file-storage.js, the
 * same store Pro uses) and hands the grid short-lived object URLs instead.
 * `steps[]` carries only an id, so the array stays tiny and redraws are cheap.
 *
 * Object URLs are cached per id so repeated redraws never re-create a blob,
 * and they are revoked on remove()/clear() — Pro leaks these.
 */
(function (global) {
    "use strict";

    var STORE_NAME = "tcs-screenshots";
    var MIME = "image/jpeg";

    var storagePromise = null;
    var urlCache = new Map();      // id -> object URL
    var memoryFallback = new Map(); // id -> ArrayBuffer, used when IDB is unavailable
    var useFallback = false;
    var counter = 0;

    function newId() {
        counter += 1;
        return "shot_" + Date.now().toString(36) + "_" + counter + "_" +
            Math.random().toString(16).slice(2, 8);
    }

    function storage() {
        if (!storagePromise) {
            if (typeof IDBFiles === "undefined" || !IDBFiles.getFileStorage) {
                useFallback = true;
                storagePromise = Promise.reject(new Error("IDBFiles unavailable"));
                storagePromise.catch(function () {});
            } else {
                storagePromise = IDBFiles.getFileStorage({ name: STORE_NAME })
                    .catch(function (err) {
                        useFallback = true;
                        throw err;
                    });
            }
        }
        return storagePromise;
    }

    /* Wipe anything left behind by an earlier session so the database does not
     * grow without bound — a recording never outlives its window. */
    function purgeStale() {
        storage().then(function (store) {
            return store.clear();
        }).catch(function () {});
    }

    function dataUrlToArrayBuffer(dataUrl) {
        return fetch(dataUrl).then(function (res) {
            return res.arrayBuffer();
        });
    }

    function getBuffer(id) {
        if (!id) return Promise.resolve(null);
        if (useFallback) return Promise.resolve(memoryFallback.get(id) || null);
        return storage().then(function (store) {
            return store.get(id);
        }).catch(function () {
            return memoryFallback.get(id) || null;
        });
    }

    var api = {
        /*
         * Stores one capture and returns its id, or null if it could not be
         * saved. Callers must treat a null id as "this step has no screenshot"
         * so a failed write can never leave a dangling reference.
         */
        put: function (dataUrl) {
            if (!dataUrl || typeof dataUrl !== "string") return Promise.resolve(null);
            var id = newId();
            return dataUrlToArrayBuffer(dataUrl).then(function (buffer) {
                if (useFallback) {
                    memoryFallback.set(id, buffer);
                    return id;
                }
                return storage().then(function (store) {
                    return store.put(id, buffer).then(function () { return id; });
                }).catch(function () {
                    memoryFallback.set(id, buffer);
                    return id;
                });
            }).catch(function () {
                return null;
            });
        },

        has: function (id) {
            return !!id;
        },

        blob: function (id) {
            return getBuffer(id).then(function (buffer) {
                if (!buffer) return null;
                return buffer instanceof Blob ? buffer : new Blob([buffer], { type: MIME });
            });
        },

        /* Cached so a redraw of 200 rows does not allocate 200 new blobs. */
        objectUrl: function (id) {
            if (!id) return Promise.resolve(null);
            if (urlCache.has(id)) return Promise.resolve(urlCache.get(id));
            return api.blob(id).then(function (blob) {
                if (!blob) return null;
                // Another hydration may have won the race while we were awaiting.
                if (urlCache.has(id)) return urlCache.get(id);
                var url = URL.createObjectURL(blob);
                urlCache.set(id, url);
                return url;
            }).catch(function () {
                return null;
            });
        },

        /* Raw base64 payload (no data: prefix) for the download-as-zip path. */
        base64: function (id) {
            return api.blob(id).then(function (blob) {
                if (!blob) return null;
                return new Promise(function (resolve) {
                    var reader = new FileReader();
                    reader.onloadend = function () {
                        var result = String(reader.result || "");
                        var comma = result.indexOf(",");
                        resolve(comma === -1 ? null : result.slice(comma + 1));
                    };
                    reader.onerror = function () { resolve(null); };
                    reader.readAsDataURL(blob);
                });
            }).catch(function () {
                return null;
            });
        },

        remove: function (id) {
            if (!id) return Promise.resolve();
            if (urlCache.has(id)) {
                URL.revokeObjectURL(urlCache.get(id));
                urlCache.delete(id);
            }
            memoryFallback.delete(id);
            if (useFallback) return Promise.resolve();
            return storage().then(function (store) {
                return store.remove(id);
            }).catch(function () {});
        },

        clear: function () {
            urlCache.forEach(function (url) { URL.revokeObjectURL(url); });
            urlCache.clear();
            memoryFallback.clear();
            if (useFallback) return Promise.resolve();
            return storage().then(function (store) {
                return store.clear();
            }).catch(function () {});
        }
    };

    purgeStale();
    global.tcsShots = api;
})(window);

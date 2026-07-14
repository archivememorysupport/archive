importScripts("urls.js", "embeddings.js", "search.js", "storage.js");

const API_BASE = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 4000;

const SUPPORTED_HOSTS = /(linkedin|instagram|tiktok|google)\.com/i;

function isSupportedUrl(url = "") {
  try {
    return SUPPORTED_HOSTS.test(new URL(url).hostname);
  } catch (_error) {
    return false;
  }
}

async function injectContentScripts(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["urls.js", "extractors.js"],
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"],
  });
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ error: chrome.runtime.lastError.message });
        return;
      }
      resolve({ response });
    });
  });
}

async function ensureContentScript(tabId, url) {
  const ping = await sendTabMessage(tabId, { type: "ARCHIVE_DEBUG" });
  if (!ping.error) return { ok: true };

  if (!isSupportedUrl(url)) {
    return { ok: false, error: "unsupported_url" };
  }

  try {
    await injectContentScripts(tabId);
  } catch (error) {
    return { ok: false, error: error.message || "inject_failed" };
  }

  const retry = await sendTabMessage(tabId, { type: "ARCHIVE_DEBUG" });
  if (retry.error) {
    return { ok: false, error: retry.error };
  }
  return { ok: true };
}

async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed: ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function backendAvailable() {
  try {
    await apiFetch("/api/health");
    return true;
  } catch (_error) {
    return false;
  }
}

async function mirrorToBackend(payload) {
  if (!(await backendAvailable())) return;
  try {
    await apiFetch("/api/items", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (_error) {
    // Local mode is primary; backend mirror is best-effort.
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ARCHIVE_OPEN_URL") {
    const url = (message.url || "").trim();
    if (!url.startsWith("http")) {
      sendResponse({ status: "error", detail: "invalid_url" });
      return false;
    }
    chrome.tabs.create({ url, active: true });
    sendResponse({ status: "ok" });
    return false;
  }

  if (message?.type === "ARCHIVE_FORCE_CAPTURE") {
    (async () => {
      let tab = null;
      if (message.tabId) {
        tab = await chrome.tabs.get(message.tabId).catch(() => null);
      }
      if (!tab) {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        tab = tabs[0];
      }
      if (!tab?.id) {
        sendResponse({ status: "error", detail: "no_active_tab" });
        return;
      }

      const ready = await ensureContentScript(tab.id, tab.url || "");
      if (!ready.ok) {
        if (ready.error === "unsupported_url") {
          sendResponse({
            status: "error",
            detail: "Open LinkedIn, Instagram, TikTok, or Google first.",
          });
          return;
        }
        sendResponse({
          status: "error",
          detail: `Could not connect to page: ${ready.error}`,
        });
        return;
      }

      const result = await sendTabMessage(tab.id, { type: "ARCHIVE_FORCE_CAPTURE" });
      if (result.error) {
        sendResponse({ status: "error", detail: result.error });
        return;
      }
      sendResponse(result.response || { status: "error", detail: "no_response" });
    })();
    return true;
  }

  if (message?.type === "ARCHIVE_MIRROR_SAVE") {
    mirrorToBackend(message.payload);
    sendResponse({ status: "ok" });
    return false;
  }

  if (message?.type === "ARCHIVE_SAVE") {
    (async () => {
      const result = await ArchiveStorage.save(message.payload);
      if (result.status === "saved" || result.status === "duplicate") {
        mirrorToBackend(message.payload);
      }
      sendResponse(result);
    })().catch((error) => sendResponse({ status: "error", detail: error.message }));
    return true;
  }

  if (message?.type === "ARCHIVE_SEARCH") {
    (async () => {
      const results = await ArchiveStorage.search(message.query || "", message.limit || 20);
      sendResponse({ status: "ok", results, mode: "local" });
    })().catch((error) => sendResponse({ status: "error", detail: error.message }));
    return true;
  }

  if (message?.type === "ARCHIVE_HEALTH") {
    (async () => {
      const local = await ArchiveStorage.health();
      const backend = await backendAvailable();
      sendResponse({
        ...local,
        backend_connected: backend,
        mode: "local",
      });
    })().catch((error) => sendResponse({ status: "error", detail: error.message }));
    return true;
  }

  return false;
});

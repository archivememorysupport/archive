const searchInput = document.getElementById("searchInput");
const resultsDiv = document.getElementById("results");
const testBtn = document.getElementById("testBtn");
const captureBtn = document.getElementById("captureBtn");
const searchBtn = document.getElementById("searchBtn");
const statusText = document.getElementById("statusText");
const itemCount = document.getElementById("itemCount");

let searchTimer = null;

function setStatus(text, kind = "") {
  statusText.textContent = text;
  statusText.className = `status ${kind}`.trim();
}

function setItemCount(count) {
  itemCount.textContent = typeof count === "number" ? `${count} saved` : "—";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function meaningfulTokens(query) {
  const stop = new Set([
    "the", "a", "an", "and", "about", "from", "that", "this", "on", "in", "for", "post", "video", "with",
  ]);
  const raw =
    (query || "")
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((token) => !stop.has(token)) || [];
  const minLen = raw.join(" ").trim().length <= 4 ? 2 : 3;
  return raw.filter((token) => token.length >= minLen);
}

function highlightText(text, query) {
  const safe = escapeHtml(text || "");
  const tokens = meaningfulTokens(query);
  if (!tokens.length) return safe;

  let output = safe;
  for (const token of tokens) {
    const re = new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    output = output.replace(re, "<mark>$1</mark>");
  }
  return output;
}

function formatWhen(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function resolveItemUrl(item) {
  const normalized = ArchiveUrls.normalize(item.platform, item.url, item.post_id || item.postId || "");
  return ArchiveUrls.isOpenable(normalized) ? normalized : "";
}

function openOriginal(url) {
  if (!ArchiveUrls.isOpenable(url)) return;
  chrome.runtime.sendMessage({ type: "ARCHIVE_OPEN_URL", url });
}

function renderResults(results, query = "") {
  if (!results.length) {
    resultsDiv.innerHTML = query
      ? '<div class="empty">No matches for that search. Try a name, keyword, or platform like <strong>linkedin</strong>.</div>'
      : '<div class="empty">No memories yet. Browse LinkedIn, pause on posts for 2 seconds, or use <strong>Capture visible</strong>.</div>';
    return;
  }

  resultsDiv.innerHTML = results
    .map((item, index) => {
      const url = resolveItemUrl(item);
      const score = item.score ? `<span class="score">${Math.round(item.score * 100)}%</span>` : "";
      const when = formatWhen(item.created_at);
      const author = item.author ? ` · ${escapeHtml(item.author)}` : "";
      const openDisabled = url ? "" : "disabled";
      const urlPreview = url ? escapeHtml(url.replace(/^https?:\/\/(www\.)?/, "")) : "No permalink saved";

      return `
        <article class="card" data-index="${index}">
          <div class="card-top">
            <span class="platform">${escapeHtml(item.platform)}</span>
            <span class="meta">${when}${author}</span>
            ${score}
          </div>
          <h3>${highlightText(item.title || "Untitled", query)}</h3>
          <p>${highlightText(item.content || "", query)}</p>
          <div class="card-actions">
            <button class="open-btn" data-url="${escapeHtml(url)}" ${openDisabled}>Open original</button>
            <span class="url-preview" title="${escapeHtml(url)}">${urlPreview}</span>
          </div>
        </article>
      `;
    })
    .join("");

  resultsDiv.querySelectorAll(".open-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const url = button.getAttribute("data-url");
      if (url) openOriginal(url);
    });
  });
}

function runSearch() {
  const query = searchInput.value.trim();
  setStatus(query ? "Searching…" : "Loading recent…", "");

  chrome.runtime.sendMessage({ type: "ARCHIVE_SEARCH", query, limit: 20 }, (response) => {
    if (chrome.runtime.lastError) {
      setStatus("Extension error. Reload Archive.", "error");
      return;
    }

    if (response?.status === "error") {
      setStatus(`Search failed: ${response.detail}`, "error");
      return;
    }

    const results = response.results || [];
    renderResults(results, query);
    setStatus(query ? `${results.length} match(es)` : `${results.length} recent memory(ies)`, "ok");
  });
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 280);
}

captureBtn.addEventListener("click", () => {
  setStatus("Capturing visible post…", "");

  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) {
      setStatus("No active tab.", "error");
      return;
    }

    chrome.runtime.sendMessage({ type: "ARCHIVE_FORCE_CAPTURE", tabId: tab.id }, (response) => {
      if (chrome.runtime.lastError) {
        setStatus("Extension error. Reload Archive.", "error");
        return;
      }

      if (response?.status === "error") {
        setStatus(response.detail || "Capture failed.", "error");
        return;
      }

      if (!response?.captured) {
        setStatus(`Found ${response?.candidates || 0} posts — center one on screen and retry.`, "error");
        return;
      }

      if (response.saveStatus === "saved") {
        setStatus("Saved new post. Refreshing…", "ok");
      } else if (response.saveStatus === "duplicate") {
        setStatus("Already saved. Refreshing…", "ok");
      } else if (response.saveStatus === "rejected") {
        setStatus(`Could not save: ${response.saveDetail || "missing content"}`, "error");
        return;
      } else {
        setStatus("Capture finished. Refreshing…", "ok");
      }

      chrome.runtime.sendMessage({ type: "ARCHIVE_HEALTH" }, (health) => {
        if (!chrome.runtime.lastError && health?.status === "ok") {
          setItemCount(health.items || 0);
        }
      });
      setTimeout(runSearch, 500);
    });
  });
});

testBtn.addEventListener("click", () => {
  setStatus("Checking status…", "");
  chrome.runtime.sendMessage({ type: "ARCHIVE_HEALTH" }, (response) => {
    if (chrome.runtime.lastError || response?.status === "error") {
      setStatus("Extension storage unavailable. Reload Archive.", "error");
      setItemCount("—");
      return;
    }
    setItemCount(response.items || 0);
    const backendNote = response.backend_connected ? " · backend sync on" : "";
    setStatus(`Local mode active${backendNote}`, "ok");
  });
});

searchBtn.addEventListener("click", runSearch);
searchInput.addEventListener("input", scheduleSearch);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") runSearch();
});

chrome.runtime.sendMessage({ type: "ARCHIVE_HEALTH" }, (response) => {
  if (chrome.runtime.lastError || response?.status === "error") {
    setStatus("Extension storage unavailable. Reload Archive.", "error");
    setItemCount("—");
    return;
  }
  setItemCount(response.items || 0);
  setStatus("Ready · local storage", "ok");
  runSearch();
});

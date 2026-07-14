(function () {
  if (globalThis.__ARCHIVE_CONTENT_ACTIVE__) return;
  globalThis.__ARCHIVE_CONTENT_ACTIVE__ = true;

  const PLATFORM = ArchiveExtractors.detectPlatform(location.hostname);
  if (!PLATFORM) return;

  const DWELL_MS = 2000;
  const MIN_CONTENT_LENGTH = 20;
  const VISIBLE_RATIO = 0.25;
  const observed = new WeakSet();
  const timers = new WeakMap();
  const archived = new WeakSet();
  const badgesByPostKey = new Map();

  const log = (...args) => console.debug("[Archive]", ...args);

  document.querySelectorAll(".archive-saved-badge").forEach((node) => node.remove());

  log("active on", PLATFORM, location.href);

  function canonicalElement(element) {
    if (PLATFORM === "linkedin" && ArchiveExtractors.linkedInCanonicalContainer) {
      return ArchiveExtractors.linkedInCanonicalContainer(element);
    }
    return ArchiveExtractors.resolvePostContainer(element, PLATFORM) || element;
  }

  function badgeHostFor(element) {
    const host = canonicalElement(element);
    if (!host || !(host instanceof HTMLElement)) return null;

    const wrapper =
      host.matches?.('[data-view-name="feed-full-update"]') ?
        host
      : host.closest?.('[data-view-name="feed-full-update"]');

    if (wrapper && wrapper.offsetHeight >= 100) return wrapper;
    return host.offsetHeight >= 100 ? host : null;
  }

  function postKeyFor(element) {
    const host = canonicalElement(element);
    const payload = ArchiveExtractors.extract(host, PLATFORM, location.href);
    return payload?.postId || payload?.url || payload?.content?.slice(0, 80) || "";
  }

  function removeBadge(postKey) {
    const badge = badgesByPostKey.get(postKey);
    if (badge?.parentElement) badge.remove();
    badgesByPostKey.delete(postKey);
  }

  function showSavedBadge(element, kind = "saved") {
    const host = badgeHostFor(element);
    if (!host) return;

    const postKey = postKeyFor(host);
    if (!postKey) return;

    if (kind === "failed") {
      removeBadge(postKey);
      return;
    }

    let badge = badgesByPostKey.get(postKey);
    if (!badge) {
      badge = document.createElement("div");
      badge.className = "archive-saved-badge";
      badge.style.cssText = [
        "position:absolute",
        "top:12px",
        "right:12px",
        "width:12px",
        "height:12px",
        "font-size:12px",
        "line-height:12px",
        "z-index:5",
        "pointer-events:none",
        "text-shadow:0 0 2px rgba(0,0,0,0.5)",
      ].join(";");

      const position = getComputedStyle(host).position;
      if (position === "static") {
        host.style.position = "relative";
      }
      host.appendChild(badge);
      badgesByPostKey.set(postKey, badge);
    }

    if (kind === "saved") {
      badge.textContent = "●";
      badge.title = "Saved to Archive";
      badge.style.color = "#22c55e";
    } else if (kind === "pending") {
      badge.textContent = "○";
      badge.title = "Saving to Archive…";
      badge.style.color = "#fbbf24";
    }
  }

  function saveViaBackground(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "ARCHIVE_SAVE", payload }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response || { status: "error", detail: "no_response" });
      });
    });
  }

  async function saveItem(element) {
    const host = canonicalElement(element);
    if (!host || archived.has(host)) return null;

    const payload = ArchiveExtractors.extract(host, PLATFORM, location.href);
    if (!payload || !payload.content || payload.content.length < MIN_CONTENT_LENGTH) {
      log("skipped: content too short", payload?.content?.length || 0);
      return null;
    }

    archived.add(host);
    showSavedBadge(host, "pending");
    log("saving", {
      platform: payload.platform,
      postId: payload.postId,
      url: payload.url,
      preview: payload.content.slice(0, 80),
    });

    try {
      const result = await saveViaBackground(payload);
      if (result.status === "saved" || result.status === "duplicate") {
        showSavedBadge(host, "saved");
        log(result.status, payload.postId || payload.url);
      } else {
        archived.delete(host);
        showSavedBadge(host, "failed");
        log("not saved", result.status, result.detail || "");
      }
      return result;
    } catch (error) {
      archived.delete(host);
      showSavedBadge(host, "failed");
      log("error", error.message);
      return { status: "error", detail: error.message };
    }
  }

  function handleIntersection(entries) {
    for (const entry of entries) {
      const element = entry.target;
      if (!observed.has(element)) continue;

      const existing = timers.get(element);
      if (existing) {
        clearTimeout(existing);
        timers.delete(element);
      }

      if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
        const timer = setTimeout(() => saveItem(element), DWELL_MS);
        timers.set(element, timer);
      }
    }
  }

  const observer = new IntersectionObserver(handleIntersection, {
    root: null,
    threshold: [0.1, 0.25, 0.4, 0.6],
  });

  function registerCandidate(element) {
    const host = canonicalElement(element);
    if (!host || observed.has(host) || !(host instanceof HTMLElement)) return;
    if (!ArchiveExtractors.isCandidate(host, PLATFORM)) return;

    observed.add(host);
    observer.observe(host);
    log("watching post", host.getAttribute?.("data-urn") || host.className?.slice?.(0, 40));
  }

  function scan() {
    const candidates = ArchiveExtractors.findCandidates(PLATFORM);
    if (candidates.length) {
      log("scan found", candidates.length, "candidate(s)");
    }
    candidates.forEach(registerCandidate);
  }

  let scanScheduled = false;
  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      scan();
    });
  }

  function getCenteredCandidate() {
    const candidates = ArchiveExtractors.findCandidates(PLATFORM);
    const midY = window.innerHeight / 2;
    let best = null;
    let bestDistance = Infinity;

    for (const element of candidates) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 40 || rect.top > window.innerHeight - 40) continue;
      const center = rect.top + rect.height / 2;
      const distance = Math.abs(center - midY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = element;
      }
    }

    return best;
  }

  let scrollTimer = null;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const centered = getCenteredCandidate();
        if (centered) {
          log("scroll-stop capture");
          saveItem(centered);
        }
      }, DWELL_MS);
    },
    { passive: true }
  );

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "ARCHIVE_DEBUG") {
      const candidates = ArchiveExtractors.findCandidates(PLATFORM);
      sendResponse({
        platform: PLATFORM,
        url: location.href,
        candidates: candidates.length,
        watching: candidates.filter((node) => observed.has(node)).length,
      });
      return false;
    }

    if (message?.type === "ARCHIVE_FORCE_CAPTURE") {
      (async () => {
        scan();
        const centered = getCenteredCandidate();
        let saveResult = null;
        if (centered) saveResult = await saveItem(centered);
        const candidates = ArchiveExtractors.findCandidates(PLATFORM);
        sendResponse({
          status: "ok",
          candidates: candidates.length,
          captured: Boolean(centered),
          saveStatus: saveResult?.status || (centered ? "unknown" : "no_post"),
          saveDetail: saveResult?.detail || "",
        });
      })();
      return true;
    }

    return false;
  });

  const mutationObserver = new MutationObserver(scheduleScan);
  mutationObserver.observe(document.body, { childList: true, subtree: true });
  scan();
  window.setInterval(scan, 4000);
})();

const ArchiveUrls = (() => {
  const LINKEDIN_URN_RE = /urn:li:(activity|ugcPost):(\d+)/;
  const LINKEDIN_POST_ID_RE = /^(activity|ugcPost):(\d+)$/;
  const LINKEDIN_LEGACY_RE = /^linkedin:(activity|ugcPost):(\d+)$/;

  function linkedInPermalink(type, id) {
    return `https://www.linkedin.com/feed/update/urn:li:${type}:${id}/`;
  }

  function stripTracking(url) {
    if (!url) return "";
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch (_error) {
      return url.trim();
    }
  }

  function normalize(platform, url = "", postId = "") {
    const rawUrl = (url || "").trim();
    const rawPostId = (postId || "").trim();

    if (platform === "linkedin") {
      for (const candidate of [rawUrl, rawPostId]) {
        if (!candidate) continue;
        const legacy = candidate.match(LINKEDIN_LEGACY_RE);
        if (legacy) return linkedInPermalink(legacy[1], legacy[2]);
        const postMatch = candidate.match(LINKEDIN_POST_ID_RE);
        if (postMatch) return linkedInPermalink(postMatch[1], postMatch[2]);
        const urnMatch = candidate.match(LINKEDIN_URN_RE);
        if (urnMatch) return linkedInPermalink(urnMatch[1], urnMatch[2]);
      }

      const cleaned = stripTracking(rawUrl);
      if (cleaned.includes("linkedin.com") && cleaned.includes("/feed/update/")) {
        const urnMatch = cleaned.match(LINKEDIN_URN_RE);
        if (urnMatch) return linkedInPermalink(urnMatch[1], urnMatch[2]);
        return cleaned;
      }
      return cleaned.startsWith("http") ? cleaned : "";
    }

    const cleaned = stripTracking(rawUrl);
    return cleaned.startsWith("http") ? cleaned : "";
  }

  function isOpenable(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      if (parsed.hostname.includes("linkedin.com")) {
        return parsed.pathname.includes("/feed/update/") && /urn:li:(activity|ugcPost):\d+/i.test(url);
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  return { normalize, isOpenable };
})();

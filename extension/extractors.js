const ArchiveExtractors = (() => {
  const LINKEDIN_CONTAINER_SELECTORS = [
    '[data-view-name="feed-full-update"]',
    'div[componentkey*="FeedType_MAIN_FEED"]',
    '[data-urn*="urn:li:activity"]',
    '[data-urn*="urn:li:ugcPost"]',
    "div.feed-shared-update-v2",
    "article[data-urn]",
    "div.update-components-update-v2",
    "li.profile-creator-shared-feed-update__container",
  ];

  const LINKEDIN_COMPONENT_KEY_PATTERN = /^expanded(.+?)FeedType/;
  const LINKEDIN_COMPONENT_KEY_SIMPLE = /^([A-Za-z0-9_-]+)$/;

  const LINKEDIN_CONTAINER_QUERY = LINKEDIN_CONTAINER_SELECTORS.join(", ");

  function detectPlatform(hostname) {
    if (hostname.includes("linkedin.com")) return "linkedin";
    if (hostname.includes("instagram.com")) return "instagram";
    if (hostname.includes("tiktok.com")) return "tiktok";
    if (hostname.includes("google.com")) return "google";
    return null;
  }

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  function firstText(root, selectors) {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      const text = cleanText(node?.innerText || node?.textContent);
      if (text) return text;
    }
    return "";
  }

  function linkedinSelectors() {
    return LINKEDIN_CONTAINER_SELECTORS;
  }

  function instagramSelectors() {
    return ["article", "div._aagw", "div.x1lliihq"];
  }

  function tiktokSelectors() {
    return [
      "div[data-e2e='recommend-list-item-container']",
      "article",
      "div.css-1as5cen-DivWrapper",
    ];
  }

  function googleSelectors() {
    return ["div.g", "div[data-sokoban-container]", "div.MjjYud"];
  }

  function selectorsFor(platform) {
    switch (platform) {
      case "linkedin":
        return linkedinSelectors();
      case "instagram":
        return instagramSelectors();
      case "tiktok":
        return tiktokSelectors();
      case "google":
        return googleSelectors();
      default:
        return ["article", "div"];
    }
  }

  function resolvePostContainer(element, platform) {
    if (!element || !(element instanceof Element)) return null;

    if (platform === "linkedin") {
      try {
        return element.closest(LINKEDIN_CONTAINER_QUERY) || element;
      } catch (_error) {
        return element;
      }
    }

    const selectors = selectorsFor(platform).join(", ");
    try {
      return element.closest(selectors) || element;
    } catch (_error) {
      return element;
    }
  }

  function matchesContainer(element, platform) {
    const container = resolvePostContainer(element, platform);
    return container === element;
  }

  function linkedInUrnFromValue(value) {
    if (!value) return null;
    const match = String(value).match(/urn:li:(activity|ugcPost):(\d+)/i);
    if (!match) return null;
    return { type: match[1], id: match[2] };
  }

  function linkedInPermalink(type, id) {
    return `https://www.linkedin.com/feed/update/urn:li:${type}:${id}/`;
  }

  function linkedInCollectUrns(element) {
    const urns = [];

    const addUrn = (value) => {
      const parsed = linkedInUrnFromValue(value);
      if (parsed) urns.push(parsed);
    };

    if (element instanceof Element) {
      for (const attr of element.getAttributeNames?.() || []) {
        addUrn(element.getAttribute(attr));
      }
      element.querySelectorAll("[data-urn], [data-activity-urn], [data-entity-urn]").forEach((node) => {
        for (const attr of node.getAttributeNames?.() || []) {
          addUrn(node.getAttribute(attr));
        }
      });
      element.querySelectorAll("a[href]").forEach((link) => {
        addUrn(link.getAttribute("href"));
        addUrn(link.href);
      });
    }

    return urns;
  }

  function linkedInBestUrn(element) {
    const urns = linkedInCollectUrns(element);
    if (!urns.length) return null;
    urns.sort((a, b) => b.id.length - a.id.length || b.type.localeCompare(a.type));
    return urns[0];
  }

  function linkedInComponentKeyId(element) {
    if (!element || !(element instanceof Element)) return "";

    const readKey = (node) => {
      const value = node.getAttribute?.("componentkey") || "";
      if (!value.includes("FeedType_MAIN_FEED")) return "";
      const expanded = value.match(LINKEDIN_COMPONENT_KEY_PATTERN);
      if (expanded) return expanded[1];
      const simple = value.match(LINKEDIN_COMPONENT_KEY_SIMPLE);
      return simple ? simple[1] : "";
    };

    let node = element;
    while (node) {
      const id = readKey(node);
      if (id) return `componentkey:${id}`;
      node = node.parentElement;
    }
    return "";
  }

  function linkedInPostId(element) {
    const best = linkedInBestUrn(element);
    if (best) return `${best.type}:${best.id}`;
    return linkedInComponentKeyId(element);
  }

  function linkedInPostUrl(element, pageUrl) {
    const best = linkedInBestUrn(element);
    if (best) return linkedInPermalink(best.type, best.id);

    const prioritySelectors = [
      ".update-components-actor__sub-description a[href*='/feed/update/']",
      "a[href*='/feed/update/urn:li:activity']",
      "a[href*='/feed/update/urn:li:ugcPost']",
      "a[href*='urn:li:activity']",
      "a[href*='urn:li:ugcPost']",
    ];

    for (const selector of prioritySelectors) {
      const link = element.querySelector(selector);
      const parsed = linkedInUrnFromValue(link?.href || link?.getAttribute("href"));
      if (parsed) return linkedInPermalink(parsed.type, parsed.id);
    }

    if (pageUrl.includes("/feed/update/") || pageUrl.includes("/posts/")) {
      const parsed = linkedInUrnFromValue(pageUrl);
      if (parsed) return linkedInPermalink(parsed.type, parsed.id);
      return pageUrl.split("?")[0];
    }

    return "";
  }

  function linkedInStripNoise(text) {
    let cleaned = cleanText(text);
    cleaned = cleaned.replace(/^Feed post\s*/i, "");
    cleaned = cleaned.replace(/^(?:[\w\s.&'-]+?\s+)?(?:reposted|shared|commented on|liked)\s+this\s*/i, "");
    cleaned = cleaned.replace(/^[\w\s.&'-]+?\s+commented\s+on\s+this\s*/i, "");
    cleaned = cleaned.replace(/\b(Like|Comment|Repost|Send|Follow|Connect|Promoted)\b/gi, " ");
    cleaned = cleaned.replace(/•\s*\d+\s*(?:sec|min|h|d|w|mo|yr)s?\b/gi, " ");
    cleaned = cleaned.replace(/\b\d+[hdwms]\b/gi, " ");
    cleaned = cleaned.replace(/\s+/g, " ").trim();
    return cleaned;
  }

  function linkedInPrimaryAuthor(element) {
    const innerUpdate =
      element.querySelector('[data-view-name="feed-full-update"]') ||
      element.querySelector(".feed-shared-update-v2") ||
      element.querySelector(".update-components-update-v2") ||
      element;

    const actorImage = innerUpdate.querySelector('[data-view-name="feed-actor-image"]');
    if (actorImage) {
      const nextAnchor = actorImage.nextElementSibling;
      if (nextAnchor?.tagName === "A") {
        const namePara = nextAnchor.querySelector("p");
        const actor = cleanText(namePara?.innerText || namePara?.textContent);
        if (actor && !actor.toLowerCase().includes("followers")) {
          return actor.split("\n")[0].trim();
        }
      }
    }

    const author = firstText(innerUpdate, [
      'a[href*="/in/"] span[aria-hidden="true"]',
      'a[href*="/company/"] span[aria-hidden="true"]',
      ".update-components-actor__name span[aria-hidden='true']",
      ".update-components-actor__name",
      ".feed-shared-actor__name span[aria-hidden='true']",
      ".feed-shared-actor__name",
      "span.feed-shared-actor__title",
      ".update-components-actor__title",
    ]);

    if (author) return author.replace(/\s+/g, " ").trim();

    const commentedMatch = cleanText(element.innerText).match(
      /^Feed post\s*(?:[\w\s.&'-]+?\s+)?commented on this\s+(.+?)\s+•/i
    );
    if (commentedMatch) return commentedMatch[1].trim();

    return "";
  }

  function linkedInBodyText(element) {
    const innerUpdate =
      element.querySelector('[data-view-name="feed-full-update"]') ||
      element.querySelector(".feed-shared-update-v2") ||
      element.querySelector(".update-components-update-v2") ||
      element;

    const fromSelectors = firstText(innerUpdate, [
      '[data-testid="expandable-text-box"]',
      '[data-view-name="feed-commentary"]',
      ".feed-shared-update-v2__description",
      ".update-components-update-v2__commentary",
      ".update-components-text",
      ".feed-shared-text",
      ".feed-shared-inline-show-more-text",
      ".break-words",
    ]);

    if (fromSelectors.length >= 20) {
      return linkedInStripNoise(fromSelectors).slice(0, 1200);
    }

    const clone = innerUpdate.cloneNode(true);
    clone
      .querySelectorAll(
        "button, img, video, nav, svg, [aria-hidden='true'], .feed-shared-social-action-bar, .update-v2-social-activity, .feed-shared-social-counts, .social-details-social-counts, .comments-comment-meta__data, .update-components-actor, .feed-shared-actor, .update-components-header"
      )
      .forEach((node) => node.remove());

    return linkedInStripNoise(clone.innerText).slice(0, 1200);
  }

  function isCandidate(element, platform) {
    if (!element || element.offsetHeight < 40) return false;

    if (platform === "linkedin") {
      return isLinkedInFeedPost(element);
    }

    if (!matchesContainer(element, platform)) return false;
    const text = cleanText(element.innerText);
    return text.length >= 20;
  }

  function dedupeOuterContainers(nodes) {
    const list = Array.from(nodes);
    return list.filter(
      (node) => !list.some((other) => other !== node && other.contains(node))
    );
  }

  function linkedInFeedRoot() {
    return (
      document.querySelector('[data-testid="mainFeed"]') ||
      document.querySelector("main.scaffold-finite-scroll__content") ||
      document.querySelector("div.scaffold-finite-scroll__content") ||
      document.querySelector(".scaffold-layout__main .core-rail") ||
      document.querySelector("main.scaffold-layout__main") ||
      document.querySelector("main[role='main']") ||
      null
    );
  }

  function isInsideLinkedInChrome(element) {
    if (!element) return false;
    if (
      element.closest(
        "aside, header, footer, nav, .msg-overlay-list-bubble, .scaffold-layout__aside, .right-rail, .global-footer"
      )
    ) {
      return false;
    }
    if (element.closest(".global-nav, .authentication-outlet, .ad-banner-container")) return false;
    const feedRoot = linkedInFeedRoot();
    if (!feedRoot) return false;
    return feedRoot.contains(element);
  }

  function linkedInMatchesPostContainer(element) {
    if (!element?.matches) return false;
    return (
      element.matches('[data-view-name="feed-full-update"]') ||
      element.matches('div[componentkey*="FeedType_MAIN_FEED"]') ||
      element.matches('[data-urn*="urn:li:activity"]') ||
      element.matches('[data-urn*="urn:li:ugcPost"]') ||
      element.matches("div.feed-shared-update-v2") ||
      element.matches("div.update-components-update-v2") ||
      element.matches("li.profile-creator-shared-feed-update__container")
    );
  }

  function isLinkedInFeedPost(element) {
    if (!element || !(element instanceof HTMLElement)) return false;
    if (!isInsideLinkedInChrome(element)) return false;
    if (element.offsetHeight < 80 || element.offsetWidth < 280) return false;
    if (!linkedInMatchesPostContainer(element)) return false;

    const hasIdentity = Boolean(
      linkedInBestUrn(element) ||
        linkedInPostUrl(element, location.href) ||
        linkedInComponentKeyId(element)
    );
    if (!hasIdentity) return false;

    return linkedInBodyText(element).length >= 20;
  }

  function linkedInCanonicalContainer(element) {
    if (!element) return null;

    const selectors = LINKEDIN_CONTAINER_SELECTORS.join(", ");
    let node = element.closest(selectors);
    if (!node) return null;

    let outermost = node;
    while (node) {
      if (isLinkedInFeedPost(node)) outermost = node;
      const parent = node.parentElement?.closest(selectors);
      node = parent && parent !== node ? parent : null;
    }

    return isLinkedInFeedPost(outermost) ? outermost : null;
  }

  function findLinkedInByPermalinks() {
    const containers = new Set();
    const feedRoot = linkedInFeedRoot();
    if (!feedRoot) return [];

    const links = feedRoot.querySelectorAll(
      "a[href*='/feed/update/'], a[href*='urn:li:activity'], a[href*='urn:li:ugcPost']"
    );

    links.forEach((link) => {
      const container = linkedInCanonicalContainer(link);
      if (container) containers.add(container);
    });

    return Array.from(containers);
  }

  function findCandidates(platform) {
    const nodes = new Set();

    if (platform === "linkedin") {
      const feedRoot = linkedInFeedRoot();
      findLinkedInByPermalinks().forEach((node) => nodes.add(node));

      if (feedRoot) {
        feedRoot
          .querySelectorAll(
            [
              '[data-view-name="feed-full-update"]',
              'div[componentkey*="FeedType_MAIN_FEED"]',
              '[data-urn*="urn:li:activity"]',
              '[data-urn*="urn:li:ugcPost"]',
              "div.feed-shared-update-v2",
              "div.update-components-update-v2",
            ].join(", ")
          )
          .forEach((node) => {
            const container = linkedInCanonicalContainer(node);
            if (container) nodes.add(container);
          });
      }

      return dedupeOuterContainers(nodes);
    }

    const selectors = selectorsFor(platform);
    selectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((node) => {
          const container = resolvePostContainer(node, platform);
          if (container) nodes.add(container);
        });
      } catch (_error) {
        // Ignore invalid selector edge cases.
      }
    });

    return dedupeOuterContainers(nodes);
  }

  function extractLinkedIn(element, pageUrl) {
    const content = linkedInBodyText(element);
    const author = linkedInPrimaryAuthor(element);
    const postId = linkedInPostId(element);
    let url = linkedInPostUrl(element, pageUrl);
    if (typeof ArchiveUrls !== "undefined") {
      url = ArchiveUrls.normalize("linkedin", url, postId);
    }

    return {
      platform: "linkedin",
      title: author ? `LinkedIn · ${author}` : "LinkedIn post",
      content,
      url,
      author,
      postId,
    };
  }

  function extractInstagram(element, pageUrl) {
    const content =
      firstText(element, ["h1", "span._ap3a", "div._a9zs span", "ul li span"]) ||
      cleanText(element.innerText).slice(0, 1200);

    const author = firstText(element, ["header a", "a[role='link']", "span._ap3a"]);
    const link = element.querySelector("a[href*='/p/'], a[href*='/reel/']");
    let url = link?.href ? link.href.split("?")[0] : pageUrl.split("?")[0];
    if (typeof ArchiveUrls !== "undefined") {
      url = ArchiveUrls.normalize("instagram", url);
    }

    return {
      platform: "instagram",
      title: author ? `Instagram post by ${author}` : "Instagram post",
      content,
      url,
      author,
    };
  }

  function extractTikTok(element, pageUrl) {
    const content =
      firstText(element, [
        "[data-e2e='video-desc']",
        "[data-e2e='browse-video-desc']",
        "h1",
        "div[data-e2e='video-meta-caption']",
      ]) || cleanText(element.innerText).slice(0, 1200);

    const author = firstText(element, [
      "[data-e2e='video-author-uniqueid']",
      "[data-e2e='browse-username']",
      "a[href*='/@']",
    ]);
    const link = element.querySelector("a[href*='/@'], a[href*='/video/']");
    let url = link?.href ? link.href.split("?")[0] : pageUrl.split("?")[0];
    if (typeof ArchiveUrls !== "undefined") {
      url = ArchiveUrls.normalize("tiktok", url);
    }

    return {
      platform: "tiktok",
      title: author ? `TikTok by ${author}` : "TikTok video",
      content,
      url,
      author,
    };
  }

  function extractGoogle(element, pageUrl) {
    const title = firstText(element, ["h3", "a h3", "div[role='heading']"]);
    const snippet = firstText(element, [".VwiC3b", ".IsZvec", ".kb0PBd", "div[data-sncf]", "span"]);
    const link = element.querySelector("a[href^='http']");
    let url = link?.href ? link.href.split("?")[0] : pageUrl.split("?")[0];
    if (typeof ArchiveUrls !== "undefined") {
      url = ArchiveUrls.normalize("google", url);
    }
    const content = cleanText(`${title}. ${snippet}`).slice(0, 1200);

    return {
      platform: "google",
      title: title || "Google result",
      content,
      url,
      author: "",
    };
  }

  function extract(element, platform, pageUrl) {
    switch (platform) {
      case "linkedin":
        return extractLinkedIn(element, pageUrl);
      case "instagram":
        return extractInstagram(element, pageUrl);
      case "tiktok":
        return extractTikTok(element, pageUrl);
      case "google":
        return extractGoogle(element, pageUrl);
      default:
        return null;
    }
  }

  return {
    detectPlatform,
    resolvePostContainer,
    linkedInCanonicalContainer,
    isCandidate,
    findCandidates,
    extract,
  };
})();

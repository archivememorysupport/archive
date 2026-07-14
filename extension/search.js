const ArchiveSearch = (() => {
  const STOP_WORDS = new Set([
    "a", "an", "and", "about", "at", "by", "for", "from", "in", "is", "it", "of", "on", "or",
    "post", "that", "the", "this", "to", "video", "with",
  ]);

  const PLATFORM_ALIASES = {
    linkedin: ["linkedin", "linked in"],
    instagram: ["instagram", "insta", "ig"],
    tiktok: ["tiktok", "tik tok"],
    google: ["google", "search", "serp"],
  };

  function meaningfulTokens(query) {
    const raw =
      (query || "")
        .toLowerCase()
        .match(/[a-z0-9]+/g)
        ?.filter((token) => !STOP_WORDS.has(token)) || [];
    const minLen = raw.join(" ").trim().length <= 4 ? 2 : 3;
    return raw.filter((token) => token.length >= minLen);
  }

  function authorTokens(text) {
    return (text || "")
      .match(/[a-z]+/gi)
      ?.map((token) => token.toLowerCase())
      .filter((token) => token.length >= 2) || [];
  }

  function platformHint(query) {
    const lowered = (query || "").toLowerCase();
    for (const [platform, aliases] of Object.entries(PLATFORM_ALIASES)) {
      if (aliases.some((alias) => lowered.includes(alias))) return platform;
    }
    return null;
  }

  function authorMatchScore(query, author, title) {
    const queryLower = (query || "").toLowerCase().trim();
    if (!queryLower) return 0;

    const authorLower = (author || "").toLowerCase();
    const titleLower = (title || "").toLowerCase();
    let score = 0;

    if (authorLower && queryLower.includes(authorLower)) score += 0.45;
    if (authorLower && authorLower.includes(queryLower)) score += 0.25;

    const queryTokens = authorTokens(queryLower);
    const authorParts = authorTokens(authorLower);
    const titleParts = authorTokens(titleLower);
    if (!queryTokens.length) return Math.min(score, 1);

    for (const token of queryTokens) {
      if (authorParts.some((word) => word.startsWith(token) || word.includes(token))) {
        score += 0.22;
      } else if (titleParts.some((word) => word.startsWith(token) || word.includes(token))) {
        score += 0.08;
      }
    }

    if (
      authorParts.length &&
      queryTokens.every((token) =>
        authorParts.some((word) => word.startsWith(token) || word.includes(token))
      )
    ) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  function keywordScore(query, title, content, author, platform) {
    const haystack = `${title} ${content} ${author} ${platform}`.toLowerCase();
    const queryLower = (query || "").toLowerCase().trim();
    if (!queryLower) return 0;

    let score = 0;
    const tokens = meaningfulTokens(queryLower);

    if (haystack.includes(queryLower)) score += 0.35;

    if (tokens.length) {
      const matched = tokens.filter((token) => haystack.includes(token)).length;
      score += 0.28 * (matched / tokens.length);
      if (matched === tokens.length) score += 0.1;
    }

    for (let i = 0; i < tokens.length - 1; i += 1) {
      const phrase = `${tokens[i]} ${tokens[i + 1]}`;
      if (haystack.includes(phrase)) score += 0.08;
    }

    const hinted = platformHint(queryLower);
    if (hinted && platform.toLowerCase() === hinted) score += 0.12;

    score += authorMatchScore(queryLower, author, title);
    return Math.min(score, 1);
  }

  function hybridScore(query, queryEmbedding, item) {
    const vectorScore = ArchiveEmbeddings.cosineSimilarity(queryEmbedding, item.embedding || []);
    const lexicalScore = keywordScore(
      query,
      item.title,
      item.content,
      item.author,
      item.platform
    );
    const tokens = meaningfulTokens(query);
    const lexicalWeight = tokens.length >= 2 ? 0.7 : 0.55;
    const score = lexicalWeight * lexicalScore + (1 - lexicalWeight) * vectorScore;
    return { score, lexicalScore, vectorScore };
  }

  function isRelevantMatch(query, result) {
    const tokens = meaningfulTokens(query);
    if (result.lexicalScore >= 0.12) return true;
    if (tokens.length === 1 && result.lexicalScore >= 0.06) return true;
    if (result.vectorScore >= 0.32 && result.score >= 0.18) return true;
    return result.score >= 0.24;
  }

  async function searchItems(items, query, limit = 20) {
    const trimmed = (query || "").trim();
    if (!trimmed) {
      return items
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)
        .map((item) => ({ ...item, score: 0 }));
    }

    const queryEmbedding = ArchiveEmbeddings.embedText(trimmed);
    const scored = [];

    for (const item of items) {
      const result = hybridScore(trimmed, queryEmbedding, item);
      scored.push({ ...item, ...result });
    }

    scored.sort((a, b) => b.score - a.score || b.lexicalScore - a.lexicalScore);
    return scored.filter((item) => isRelevantMatch(trimmed, item)).slice(0, limit);
  }

  return { searchItems };
})();

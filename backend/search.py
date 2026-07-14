import re
from typing import Iterable, Optional

from embeddings import cosine_similarity

STOP_WORDS = {
    "a",
    "an",
    "and",
    "about",
    "at",
    "by",
    "for",
    "from",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "post",
    "that",
    "the",
    "this",
    "to",
    "video",
    "with",
}

PLATFORM_ALIASES = {
    "linkedin": ("linkedin", "linked in"),
    "instagram": ("instagram", "insta", "ig"),
    "tiktok": ("tiktok", "tik tok"),
    "google": ("google", "search", "serp"),
}

TOKEN_RE = re.compile(r"[a-z0-9]+")
AUTHOR_TOKEN_RE = re.compile(r"[a-z]+", re.IGNORECASE)


def _meaningful_tokens(query: str) -> list[str]:
    tokens = TOKEN_RE.findall((query or "").lower())
    return [token for token in tokens if len(token) > 2 and token not in STOP_WORDS]


def _author_tokens(text: str) -> list[str]:
    return [token.lower() for token in AUTHOR_TOKEN_RE.findall(text or "") if len(token) >= 2]


def _platform_hint(query: str) -> Optional[str]:
    lowered = (query or "").lower()
    for platform, aliases in PLATFORM_ALIASES.items():
        if any(alias in lowered for alias in aliases):
            return platform
    return None


def _author_match_score(query: str, author: str, title: str) -> float:
    query_lower = (query or "").lower().strip()
    if not query_lower:
        return 0.0

    author_lower = (author or "").lower()
    title_lower = (title or "").lower()
    score = 0.0

    if author_lower and query_lower in author_lower:
        score += 0.45

    if author_lower and author_lower in query_lower:
        score += 0.25

    query_tokens = _author_tokens(query_lower)
    author_tokens = _author_tokens(author_lower)
    title_tokens = _author_tokens(title_lower)

    if not query_tokens:
        return score

    for token in query_tokens:
        if any(word.startswith(token) or token in word for word in author_tokens):
            score += 0.22
        elif any(word.startswith(token) or token in word for word in title_tokens):
            score += 0.08

    if author_tokens and all(
        any(word.startswith(token) or token in word for word in author_tokens)
        for token in query_tokens
    ):
        score += 0.2

    return min(score, 1.0)


def keyword_score(query: str, title: str, content: str, author: str, platform: str) -> float:
    haystack = f"{title} {content} {author} {platform}".lower()
    query_lower = (query or "").lower().strip()
    if not query_lower:
        return 0.0

    score = 0.0
    tokens = _meaningful_tokens(query_lower)

    if query_lower in haystack:
        score += 0.35

    if tokens:
        matched = sum(1 for token in tokens if token in haystack)
        coverage = matched / len(tokens)
        score += 0.28 * coverage
        if matched == len(tokens):
            score += 0.1

    for index in range(len(tokens) - 1):
        phrase = f"{tokens[index]} {tokens[index + 1]}"
        if phrase in haystack:
            score += 0.08

    hinted_platform = _platform_hint(query_lower)
    if hinted_platform and platform.lower() == hinted_platform:
        score += 0.12

    score += _author_match_score(query_lower, author, title)

    return min(score, 1.0)


def hybrid_score(
    query: str,
    query_embedding: Iterable[float],
    row_embedding: Iterable[float],
    title: str,
    content: str,
    author: str,
    platform: str,
) -> float:
    vector_score = cosine_similarity(query_embedding, row_embedding)
    lexical_score = keyword_score(query, title, content, author, platform)
    return (0.5 * lexical_score) + (0.5 * vector_score)

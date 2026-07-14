import re
from typing import Optional
from urllib.parse import urlparse, urlunparse

LINKEDIN_URN_RE = re.compile(r"urn:li:(activity|ugcPost):(\d+)")
LINKEDIN_POST_ID_RE = re.compile(r"^(activity|ugcPost):(\d+)$")
LINKEDIN_LEGACY_RE = re.compile(r"^linkedin:(activity|ugcPost):(\d+)$")


def _strip_tracking(url: str) -> str:
    if not url:
        return ""
    try:
        parsed = urlparse(url.strip())
        if not parsed.scheme.startswith("http"):
            return url.strip()
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", "", ""))
    except Exception:
        return url.strip()


def linkedin_permalink(urn_type: str, urn_id: str) -> str:
    return f"https://www.linkedin.com/feed/update/urn:li:{urn_type}:{urn_id}/"


def normalize_memory_url(platform: str, url: str = "", post_id: str = "") -> str:
    platform = (platform or "").lower().strip()
    raw_url = (url or "").strip()
    raw_post_id = (post_id or "").strip()

    if platform == "linkedin":
        for candidate in (raw_url, raw_post_id):
            if not candidate:
                continue
            legacy = LINKEDIN_LEGACY_RE.match(candidate)
            if legacy:
                return linkedin_permalink(legacy.group(1), legacy.group(2))
            post_match = LINKEDIN_POST_ID_RE.match(candidate)
            if post_match:
                return linkedin_permalink(post_match.group(1), post_match.group(2))
            urn_match = LINKEDIN_URN_RE.search(candidate)
            if urn_match:
                return linkedin_permalink(urn_match.group(1), urn_match.group(2))

        cleaned = _strip_tracking(raw_url)
        if cleaned and "linkedin.com" in cleaned and "/feed/update/" in cleaned:
            urn_match = LINKEDIN_URN_RE.search(cleaned)
            if urn_match:
                return linkedin_permalink(urn_match.group(1), urn_match.group(2))
        return cleaned if cleaned.startswith("http") else ""

    if platform == "instagram":
        cleaned = _strip_tracking(raw_url)
        if cleaned and ("instagram.com/p/" in cleaned or "instagram.com/reel/" in cleaned):
            return cleaned
        return cleaned if cleaned.startswith("http") else ""

    if platform == "tiktok":
        cleaned = _strip_tracking(raw_url)
        if cleaned and "tiktok.com" in cleaned:
            return cleaned
        return cleaned if cleaned.startswith("http") else ""

    if platform == "google":
        cleaned = _strip_tracking(raw_url)
        return cleaned if cleaned.startswith("http") else ""

    return raw_url if raw_url.startswith("http") else ""


def is_openable_url(url: Optional[str]) -> bool:
    if not url:
        return False
    try:
        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            return False
        if "linkedin.com" in parsed.netloc:
            return "/feed/update/" in parsed.path and bool(LINKEDIN_URN_RE.search(url))
        return True
    except Exception:
        return False

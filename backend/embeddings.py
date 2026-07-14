import hashlib
import math
import os
import re
from typing import Iterable, List, Optional

DIMENSION = 384
TOKEN_RE = re.compile(r"[a-z0-9]+")


def _tokens(text: str) -> list[str]:
    normalized = (text or "").lower()
    words = TOKEN_RE.findall(normalized)
    bigrams = [
        f"{words[i]}_{words[i + 1]}"
        for i in range(len(words) - 1)
        if len(words[i]) >= 2 and len(words[i + 1]) >= 2
    ]
    trigrams = []
    for word in words:
        if len(word) >= 3:
            trigrams.extend(word[i : i + 3] for i in range(len(word) - 2))
    return words + bigrams + trigrams


def _hash_index(token: str) -> tuple[int, float]:
    digest = hashlib.sha256(token.encode("utf-8")).digest()
    index = int.from_bytes(digest[:4], "little") % DIMENSION
    sign = 1.0 if digest[4] % 2 == 0 else -1.0
    return index, sign


def _norm(vector: List[float]) -> float:
    return math.sqrt(sum(value * value for value in vector))


def embed_text(text: str) -> List[float]:
    vector = [0.0] * DIMENSION
    tokens = _tokens(text)
    if not tokens:
        return vector

    for token in tokens:
        index, sign = _hash_index(token)
        vector[index] += sign

    norm = _norm(vector)
    if norm > 0:
        vector = [value / norm for value in vector]
    return vector


def cosine_similarity(a: Iterable[float], b: Iterable[float]) -> float:
    va = list(a)
    vb = list(b)
    denom = _norm(va) * _norm(vb)
    if denom == 0:
        return 0.0
    dot = sum(x * y for x, y in zip(va, vb))
    return dot / denom


def embed_with_openai(text: str) -> Optional[List[float]]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:8000],
        )
        return response.data[0].embedding
    except Exception:
        return None


def build_embedding(text: str) -> List[float]:
    use_openai = os.getenv("USE_OPENAI", "false").lower() in {"1", "true", "yes"}
    if use_openai:
        openai_embedding = embed_with_openai(text)
        if openai_embedding:
            return openai_embedding
    return embed_text(text)

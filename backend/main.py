import hashlib
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Tuple

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from embeddings import build_embedding
from models import MemoryItem, PLATFORM_CHOICES
from search import hybrid_score
from urls import is_openable_url, normalize_memory_url

load_dotenv(Path(__file__).resolve().parent / ".env")


class PrivateNetworkAccessMiddleware(BaseHTTPMiddleware):
    """Chrome Private Network Access (PNA) — required for public sites → localhost."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response


def init_db() -> None:
    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.execute(
            text(
                "ALTER TABLE IF EXISTS memory_items "
                "ADD COLUMN IF NOT EXISTS post_id VARCHAR(128) DEFAULT ''"
            )
        )
    Base.metadata.create_all(bind=engine)
    _backfill_urls()


def _backfill_urls() -> None:
    with Session(bind=engine) as db:
        rows = db.scalars(select(MemoryItem)).all()
        changed = False
        for row in rows:
            normalized = normalize_memory_url(row.platform, row.url, row.post_id)
            if normalized and normalized != row.url:
                row.url = normalized
                changed = True
        if changed:
            db.commit()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Archive API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
app.add_middleware(PrivateNetworkAccessMiddleware)


class IngestPayload(BaseModel):
    platform: str
    title: str = ""
    content: str
    url: str = ""
    author: str = ""
    postId: str = ""


class SearchResult(BaseModel):
    id: int
    platform: str
    title: str
    content: str
    url: str
    author: str
    post_id: str
    score: float
    created_at: str
    openable: bool


def to_embedding_list(value) -> List[float]:
    if value is None:
        return []
    if hasattr(value, "tolist"):
        return value.tolist()
    return list(value)


def content_hash(platform: str, url: str, content: str, post_id: str = "") -> str:
    identity = post_id.strip() or normalize_memory_url(platform, url, post_id) or url.strip()
    raw = f"{platform}|{identity}|{content.strip()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _upgrade_existing(
    existing: MemoryItem,
    url: str,
    post_id: str,
    author: str,
    title: str,
    content: str,
    db: Session,
) -> MemoryItem:
    changed = False
    normalized = normalize_memory_url(existing.platform, url, post_id)

    if normalized and is_openable_url(normalized) and not is_openable_url(existing.url):
        existing.url = normalized
        changed = True
    elif normalized and is_openable_url(normalized) and existing.url != normalized and post_id:
        existing.url = normalized
        changed = True

    if post_id and not existing.post_id:
        existing.post_id = post_id
        changed = True

    if author and (not existing.author or existing.author.lower() in {"linkedin post", ""}):
        existing.author = author[:256]
        changed = True

    if title and existing.title in {"", "LinkedIn post"}:
        existing.title = title[:512]
        changed = True

    if changed:
        searchable = " ".join(
            part
            for part in [existing.title, existing.author, existing.content, existing.platform, existing.post_id, existing.url]
            if part and part.strip()
        )
        existing.embedding = build_embedding(searchable)
        db.commit()
        db.refresh(existing)

    return existing


def row_to_result(row: MemoryItem, score: float = 0.0) -> SearchResult:
    url = normalize_memory_url(row.platform, row.url, row.post_id)
    return SearchResult(
        id=row.id,
        platform=row.platform,
        title=row.title,
        content=row.content[:320],
        url=url,
        author=row.author,
        post_id=row.post_id or "",
        score=round(score, 4),
        created_at=row.created_at.isoformat(),
        openable=is_openable_url(url),
    )


@app.get("/api/health")
def health(db: Session = Depends(get_db)) -> Dict[str, Any]:
    count = db.scalar(select(func.count()).select_from(MemoryItem)) or 0
    return {
        "status": "ok",
        "items": count,
        "search_mode": "openai" if os.getenv("USE_OPENAI", "").lower() in {"1", "true", "yes"} else "local",
    }


@app.post("/api/items")
def ingest_item(payload: IngestPayload, db: Session = Depends(get_db)) -> Dict[str, Any]:
    platform = payload.platform.lower().strip()
    if platform not in PLATFORM_CHOICES:
        platform = "other"

    content = payload.content.strip()
    if len(content) < 8:
        raise HTTPException(status_code=400, detail="Content too short to archive")

    post_id = payload.postId.strip()
    url = normalize_memory_url(platform, payload.url, post_id)
    author = payload.author.strip()
    title = payload.title.strip()

    if platform == "linkedin" and not is_openable_url(url):
        raise HTTPException(
            status_code=422,
            detail="LinkedIn capture missing permalink. Scroll the post into view and retry.",
        )

    if post_id:
        by_post_id = db.scalar(select(MemoryItem).where(MemoryItem.post_id == post_id))
        if by_post_id:
            upgraded = _upgrade_existing(by_post_id, url, post_id, author, title, content, db)
            return {"status": "duplicate", "id": upgraded.id, "url": upgraded.url}

    digest = content_hash(platform, url, content, post_id)
    existing = db.scalar(select(MemoryItem).where(MemoryItem.content_hash == digest))
    if existing:
        upgraded = _upgrade_existing(existing, url, post_id, author, title, content, db)
        return {"status": "duplicate", "id": upgraded.id, "url": upgraded.url}

    searchable = " ".join(
        part
        for part in [title, author, content, platform, post_id, url]
        if part and part.strip()
    )
    embedding = build_embedding(searchable)

    item = MemoryItem(
        platform=platform,
        title=title[:512] or "LinkedIn post",
        content=content,
        url=url,
        author=author[:256],
        post_id=post_id[:128],
        content_hash=digest,
        embedding=embedding,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"status": "saved", "id": item.id, "url": item.url}


@app.get("/api/search", response_model=List[SearchResult])
def search_items(q: str = "", limit: int = 20, db: Session = Depends(get_db)) -> List[SearchResult]:
    query = q.strip()
    if not query:
        rows = db.scalars(
            select(MemoryItem).order_by(MemoryItem.created_at.desc()).limit(min(limit, 50))
        ).all()
        return [row_to_result(row) for row in rows]

    query_embedding = build_embedding(query)
    rows = db.scalars(select(MemoryItem).order_by(MemoryItem.created_at.desc()).limit(1000)).all()

    scored: List[Tuple[MemoryItem, float]] = []
    for row in rows:
        score = hybrid_score(
            query,
            query_embedding,
            to_embedding_list(row.embedding),
            row.title,
            row.content,
            row.author,
            row.platform,
        )
        scored.append((row, score))

    scored.sort(key=lambda pair: pair[1], reverse=True)
    top = scored[: min(limit, 50)]

    return [
        row_to_result(row, score)
        for row, score in top
        if score >= 0.08 or (len(top) <= 3 and score > 0)
    ]


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)

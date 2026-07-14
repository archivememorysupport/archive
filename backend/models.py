from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from embeddings import DIMENSION

PLATFORM_CHOICES = {"linkedin", "instagram", "tiktok", "google", "other"}


class MemoryItem(Base):
    __tablename__ = "memory_items"
    __table_args__ = (
        UniqueConstraint("content_hash", name="uq_memory_items_content_hash"),
        Index("ix_memory_items_platform_created", "platform", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String(32), index=True)
    title: Mapped[str] = mapped_column(String(512), default="")
    content: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text, default="")
    author: Mapped[str] = mapped_column(String(256), default="")
    post_id: Mapped[str] = mapped_column(String(128), default="", index=True)
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    embedding = mapped_column(Vector(DIMENSION))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, index=True
    )

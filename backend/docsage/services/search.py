"""Hybrid retrieval: vector search + BM25 keyword search merged with Reciprocal Rank Fusion."""
import logging
import re

from rank_bm25 import BM25Plus
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Chunk, Document
from .embeddings import embedder
from .vectorstore import vector_store

log = logging.getLogger(__name__)

RRF_K = 60
CANDIDATES = 4  # each ranker contributes top_k * CANDIDATES candidates


def tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def rrf(rankings: list[list[int]], k: int = RRF_K) -> list[tuple[int, float]]:
    """Fuse ranked id lists. An id scores sum(1 / (k + rank)) over the lists it appears in."""
    scores: dict[int, float] = {}
    for ranking in rankings:
        for rank, item in enumerate(ranking, start=1):
            scores[item] = scores.get(item, 0.0) + 1.0 / (k + rank)
    return sorted(scores.items(), key=lambda kv: kv[1], reverse=True)


class _KeywordIndex:
    """Per-user BM25 index, rebuilt lazily after that user's documents change."""

    def __init__(self) -> None:
        self._cache: dict[int, tuple[tuple[int, int], BM25Plus, list[tuple[int, int]]]] = {}

    def invalidate(self, user_id: int) -> None:
        self._cache.pop(user_id, None)

    async def top(
        self, session: AsyncSession, user_id: int, question: str, document_ids: list[int] | None, limit: int
    ) -> list[int]:
        # A cheap fingerprint of the user's chunks, so a cache built before another worker (or a delete
        # that happened elsewhere) changed the data is rebuilt instead of served stale.
        version = tuple(
            (await session.execute(select(func.count(Chunk.id), func.max(Chunk.id)).where(Chunk.user_id == user_id))).one()
        )
        cached = self._cache.get(user_id)
        if cached is None or cached[0] != version:
            rows = (await session.execute(select(Chunk.id, Chunk.document_id, Chunk.text).where(Chunk.user_id == user_id))).all()
            if not rows:
                self._cache.pop(user_id, None)
                return []
            # BM25Okapi gives a word zero or negative weight when it appears in over half the chunks,
            # so small collections (a single document) matched nothing. BM25Plus keeps IDF positive;
            # delta=0 makes chunks without the query word score exactly 0.
            index = BM25Plus([tokenize(r.text) for r in rows], delta=0)
            self._cache[user_id] = (version, index, [(r.id, r.document_id) for r in rows])
        _, index, ids = self._cache[user_id]
        scores = index.get_scores(tokenize(question))
        ranked = sorted(range(len(ids)), key=lambda i: scores[i], reverse=True)
        allowed = set(document_ids) if document_ids else None
        return [
            ids[i][0] for i in ranked
            if scores[i] > 0 and (allowed is None or ids[i][1] in allowed)
        ][:limit]


keyword_index = _KeywordIndex()


async def hybrid_search(
    session: AsyncSession, user_id: int, question: str, document_ids: list[int] | None, top_k: int
) -> list[dict]:
    """Return the best chunks for a question, each with its document name and page."""
    limit = top_k * CANDIDATES
    rankings: list[list[int]] = []

    try:
        vector = await embedder.embed_query(question)
        hits = await vector_store.search(vector, user_id, document_ids, limit)
        rankings.append([chunk_id for chunk_id, _ in hits])
    except Exception as exc:  # noqa: BLE001 - keyword search can still answer
        log.warning("Vector search unavailable, using keyword search only: %s", exc)

    rankings.append(await keyword_index.top(session, user_id, question, document_ids, limit))

    best = [chunk_id for chunk_id, _ in rrf(rankings)[:top_k]]
    if not best:
        return []

    rows = (
        await session.execute(
            select(Chunk, Document.filename)
            .join(Document, Document.id == Chunk.document_id)
            .where(Chunk.id.in_(best), Chunk.user_id == user_id)
        )
    ).all()
    by_id = {chunk.id: (chunk, filename) for chunk, filename in rows}
    return [
        {
            "chunk_id": cid,
            "document_id": by_id[cid][0].document_id,
            "filename": by_id[cid][1],
            "page": by_id[cid][0].page,
            "text": by_id[cid][0].text,
        }
        for cid in best
        if cid in by_id
    ]

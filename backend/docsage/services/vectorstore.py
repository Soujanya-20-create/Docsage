import asyncio

from qdrant_client import QdrantClient
from qdrant_client import models as qm

from ..config import settings


class VectorStore:
    def __init__(self) -> None:
        self._client: QdrantClient | None = None

    @property
    def client(self) -> QdrantClient:
        if self._client is None:
            if settings.qdrant_mode == "memory":
                self._client = QdrantClient(":memory:")
            else:
                self._client = QdrantClient(url=settings.qdrant_url)
        return self._client

    def _ensure(self, dim: int) -> None:
        if not self.client.collection_exists(settings.qdrant_collection):
            self.client.create_collection(
                settings.qdrant_collection,
                vectors_config=qm.VectorParams(size=dim, distance=qm.Distance.COSINE),
            )

    def _upsert(self, ids: list[int], vectors: list[list[float]], payloads: list[dict]) -> None:
        self._ensure(len(vectors[0]))
        self.client.upsert(
            settings.qdrant_collection,
            points=[qm.PointStruct(id=i, vector=v, payload=p) for i, v, p in zip(ids, vectors, payloads)],
        )

    def _search(
        self, vector: list[float], user_id: int, document_ids: list[int] | None, limit: int
    ) -> list[tuple[int, float]]:
        if not self.client.collection_exists(settings.qdrant_collection):
            return []
        must = [qm.FieldCondition(key="user_id", match=qm.MatchValue(value=user_id))]
        if document_ids:
            must.append(qm.FieldCondition(key="document_id", match=qm.MatchAny(any=document_ids)))
        result = self.client.query_points(
            settings.qdrant_collection,
            query=vector,
            query_filter=qm.Filter(must=must),
            limit=limit,
            score_threshold=settings.min_score,
        )
        return [(int(p.id), p.score) for p in result.points]

    def _delete_document(self, document_id: int) -> None:
        if self.client.collection_exists(settings.qdrant_collection):
            self.client.delete(
                settings.qdrant_collection,
                points_selector=qm.FilterSelector(
                    filter=qm.Filter(
                        must=[qm.FieldCondition(key="document_id", match=qm.MatchValue(value=document_id))]
                    )
                ),
            )

    async def upsert(self, ids: list[int], vectors: list[list[float]], payloads: list[dict]) -> None:
        await asyncio.to_thread(self._upsert, ids, vectors, payloads)

    async def search(
        self, vector: list[float], user_id: int, document_ids: list[int] | None, limit: int
    ) -> list[tuple[int, float]]:
        return await asyncio.to_thread(self._search, vector, user_id, document_ids, limit)

    async def delete_document(self, document_id: int) -> None:
        await asyncio.to_thread(self._delete_document, document_id)


vector_store = VectorStore()

import asyncio
import threading

from ..config import settings

QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


class Embedder:
    """Lazy wrapper around a sentence-transformers model (loaded on first use)."""

    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()

    def _load(self):
        with self._lock:
            if self._model is None:
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(settings.embedding_model)
        return self._model

    def _encode(self, texts: list[str]) -> list[list[float]]:
        vectors = self._load().encode(
            texts, batch_size=32, normalize_embeddings=True, show_progress_bar=False
        )
        return vectors.tolist()

    @property
    def dim(self) -> int:
        return self._load().get_sentence_embedding_dimension()

    async def embed_passages(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.to_thread(self._encode, texts)

    async def embed_query(self, question: str) -> list[float]:
        return (await asyncio.to_thread(self._encode, [QUERY_PREFIX + question]))[0]


embedder = Embedder()

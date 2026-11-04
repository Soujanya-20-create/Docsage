import asyncio
import threading

from ..config import settings

QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


class Embedder:
    """Lazy wrapper around a fastembed (ONNX) model, loaded on first use.

    fastembed runs the same BAAI/bge models as sentence-transformers but without PyTorch, which
    keeps the install small and the memory use low enough for a 512 MB host.
    """

    def __init__(self) -> None:
        self._model = None
        self._lock = threading.Lock()

    def _load(self):
        with self._lock:
            if self._model is None:
                from fastembed import TextEmbedding

                self._model = TextEmbedding(settings.embedding_model)
        return self._model

    def _encode(self, texts: list[str]) -> list[list[float]]:
        # bge models return L2-normalised vectors, which is what cosine distance expects.
        return [vector.tolist() for vector in self._load().embed(texts, batch_size=32)]

    async def embed_passages(self, texts: list[str]) -> list[list[float]]:
        return await asyncio.to_thread(self._encode, texts)

    async def embed_query(self, question: str) -> list[float]:
        return (await asyncio.to_thread(self._encode, [QUERY_PREFIX + question]))[0]


embedder = Embedder()

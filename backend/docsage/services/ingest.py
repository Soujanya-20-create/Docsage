import logging
from pathlib import Path

from sqlalchemy import select

from ..config import settings
from ..db import SessionLocal
from ..models import Chunk, Document
from .chunking import split_text
from .embeddings import embedder
from .extract import extract_pages
from .search import keyword_index
from .vectorstore import vector_store

log = logging.getLogger(__name__)


def _payload(chunk: Chunk) -> dict:
    return {"user_id": chunk.user_id, "document_id": chunk.document_id, "page": chunk.page}


async def process_document(document_id: int) -> None:
    """Extract, chunk and embed an uploaded document, then mark it ready or failed."""
    async with SessionLocal() as session:
        doc = await session.get(Document, document_id)
        if doc is None:
            return
        user_id = doc.user_id
        try:
            pages = await extract_pages(Path(settings.upload_dir) / doc.stored_name, doc.kind)
            chunks = [
                Chunk(document_id=doc.id, user_id=user_id, page=page, position=0, text=piece)
                for page, text in pages
                for piece in split_text(text)
            ]
            if not chunks:
                raise ValueError("No readable text was found in this file.")
            for position, chunk in enumerate(chunks):
                chunk.position = position
            session.add_all(chunks)
            await session.flush()  # assigns chunk ids

            vectors = await embedder.embed_passages([c.text for c in chunks])
            await vector_store.upsert([c.id for c in chunks], vectors, [_payload(c) for c in chunks])

            doc.status, doc.error = "ready", None
            doc.pages, doc.chunk_count = len(pages), len(chunks)
        except Exception as exc:  # noqa: BLE001 - surfaced to the user on the document
            log.exception("Processing document %s failed", document_id)
            await session.rollback()
            doc = await session.get(Document, document_id)
            doc.status, doc.error = "failed", str(exc)[:500]
        await session.commit()
    keyword_index.invalidate(user_id)


async def rebuild_vector_index(batch_size: int = 64) -> None:
    """Re-embed stored chunks into an empty in-memory vector store after a restart."""
    if settings.qdrant_mode != "memory":
        return
    try:
        async with SessionLocal() as session:
            chunks = list((await session.execute(select(Chunk))).scalars())
        if chunks:
            log.info("Rebuilding vector index for %d chunks", len(chunks))
        for start in range(0, len(chunks), batch_size):
            batch = chunks[start:start + batch_size]
            vectors = await embedder.embed_passages([c.text for c in batch])
            await vector_store.upsert([c.id for c in batch], vectors, [_payload(c) for c in batch])
    except Exception:  # noqa: BLE001
        log.exception("Vector index rebuild failed; keyword search still works")

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


async def _mark_failed(document_id: int, message: str) -> None:
    async with SessionLocal() as session:
        doc = await session.get(Document, document_id)
        if doc is not None:
            doc.status, doc.error = "failed", message[:500]
            await session.commit()


async def process_document(document_id: int) -> None:
    """Extract, chunk and embed an uploaded document, then mark it ready or failed.

    The slow work (OCR, embedding) runs with no database transaction open. Holding one would keep
    SQLite's single write lock for the whole time and make every other write fail.
    """
    async with SessionLocal() as session:
        doc = await session.get(Document, document_id)
        if doc is None:
            return
        user_id, stored_name, kind = doc.user_id, doc.stored_name, doc.kind

    try:
        pages = await extract_pages(Path(settings.upload_dir) / stored_name, kind)
        pieces = [(page, piece) for page, text in pages for piece in split_text(text)]
        if not pieces:
            raise ValueError("No readable text was found in this file.")
        vectors = await embedder.embed_passages([piece for _, piece in pieces])

        async with SessionLocal() as session:  # short transaction: insert, index, mark ready
            doc = await session.get(Document, document_id)
            if doc is None:  # deleted while it was processing
                return
            chunks = [
                Chunk(document_id=document_id, user_id=user_id, page=page, position=position, text=piece)
                for position, (page, piece) in enumerate(pieces)
            ]
            session.add_all(chunks)
            await session.flush()  # assigns chunk ids
            await vector_store.upsert([c.id for c in chunks], vectors, [_payload(c) for c in chunks])
            doc.status, doc.error = "ready", None
            doc.pages, doc.chunk_count = len(pages), len(chunks)
            await session.commit()
    except Exception as exc:  # noqa: BLE001 - surfaced to the user on the document
        log.exception("Processing document %s failed", document_id)
        await _mark_failed(document_id, str(exc) or exc.__class__.__name__)
    finally:
        # The searchable text is stored; the original is not kept, which limits what a breach exposes.
        (Path(settings.upload_dir) / stored_name).unlink(missing_ok=True)
        keyword_index.invalidate(user_id)


async def fail_interrupted_documents() -> None:
    """Documents still "processing" at startup lost their worker in a restart; don't leave them spinning."""
    async with SessionLocal() as session:
        stuck = (await session.scalars(select(Document).where(Document.status == "processing"))).all()
        for doc in stuck:
            doc.status = "failed"
            doc.error = "Processing was interrupted by a server restart. Please upload the file again."
        if stuck:
            await session.commit()
            log.warning("Marked %d interrupted document(s) as failed", len(stuck))


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

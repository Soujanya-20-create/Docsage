import asyncio
import io
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from PIL import Image
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..deps import current_user, verified_user
from ..models import Chunk, Document, User
from ..schemas import ChunkOut, DocumentOut
from ..services.ingest import process_document
from ..ratelimit import check
from ..services.search import keyword_index
from ..services.vectorstore import vector_store

router = APIRouter(prefix="/documents", tags=["documents"])

PDF_EXTENSIONS = {".pdf"}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def _kind_for(filename: str, head: bytes) -> str:
    """Classify an upload by extension, then confirm the content matches."""
    ext = Path(filename).suffix.lower()
    if ext in PDF_EXTENSIONS and head.startswith(b"%PDF"):
        return "pdf"
    if ext in IMAGE_EXTENSIONS:
        return "image"
    raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Upload a PDF or a PNG, JPG or WebP image")


async def _owned(session: AsyncSession, user: User, document_id: int) -> Document:
    doc = await session.get(Document, document_id)
    if doc is None or doc.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    return doc


@router.post("", response_model=DocumentOut, status_code=201)
async def upload(
    file: UploadFile,
    background: BackgroundTasks,
    user: User = Depends(verified_user),
    session: AsyncSession = Depends(get_session),
):
    await check(f"upload:{user.id}", 20)
    count, used = (
        await session.execute(select(func.count(Document.id), func.coalesce(func.sum(Document.size), 0)).where(Document.user_id == user.id))
    ).one()
    if count >= settings.max_documents_per_user:
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"You can keep up to {settings.max_documents_per_user} documents. Delete some first.")
    limit = settings.max_upload_mb * 1024 * 1024
    if used + 1 > settings.max_storage_mb_per_user * 1024 * 1024:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your storage allowance is used up. Delete some documents first.")
    data = bytearray()
    while block := await file.read(1024 * 1024):
        data.extend(block)
        if len(data) > limit:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, f"File is larger than {settings.max_upload_mb} MB")

    name = "".join(c for c in (file.filename or "upload") if c.isprintable())[:255] or "upload"
    kind = _kind_for(name, bytes(data[:5]))
    if kind == "image":
        try:
            with Image.open(io.BytesIO(data)) as img:  # raises DecompressionBombError for absurd dimensions
                if img.format not in {"PNG", "JPEG", "WEBP"}:
                    raise ValueError("unsupported image format")
                img.verify()
        except Exception:  # noqa: BLE001
            raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "This file is not a valid image") from None

    stored_name = uuid.uuid4().hex + Path(name).suffix.lower()
    target = Path(settings.upload_dir)
    target.mkdir(parents=True, exist_ok=True)
    await asyncio.to_thread((target / stored_name).write_bytes, bytes(data))

    doc = Document(user_id=user.id, filename=name, stored_name=stored_name, kind=kind, size=len(data))
    session.add(doc)
    await session.commit()
    background.add_task(process_document, doc.id)
    return doc


@router.get("", response_model=list[DocumentOut])
async def list_documents(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    result = await session.scalars(
        select(Document).where(Document.user_id == user.id).order_by(Document.created_at.desc())
    )
    return list(result)


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: int, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)
):
    return await _owned(session, user, document_id)


@router.get("/{document_id}/chunks", response_model=list[ChunkOut])
async def get_chunks(
    document_id: int, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)
):
    await _owned(session, user, document_id)
    result = await session.scalars(
        select(Chunk).where(Chunk.document_id == document_id).order_by(Chunk.position)
    )
    return list(result)


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: int, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)
):
    doc = await _owned(session, user, document_id)
    await vector_store.delete_document(doc.id)
    await session.execute(delete(Chunk).where(Chunk.document_id == doc.id))
    await session.delete(doc)
    await session.commit()
    keyword_index.invalidate(user.id)
    (Path(settings.upload_dir) / doc.stored_name).unlink(missing_ok=True)

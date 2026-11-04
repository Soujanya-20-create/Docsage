"""Numbers for the dashboard: totals, quota use, a two-week activity series and what gets cited most."""
from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..deps import current_user
from ..models import Chat, Document, Message, User

router = APIRouter(prefix="/stats", tags=["stats"])

DAYS = 14


def _day(value: datetime) -> str:
    value = value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).date().isoformat()


@router.get("")
async def dashboard(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    docs = list((await session.scalars(select(Document).where(Document.user_id == user.id).order_by(Document.id.desc()))).all())
    chats = list((await session.scalars(select(Chat).where(Chat.user_id == user.id).order_by(Chat.id.desc()))).all())
    chat_ids = [c.id for c in chats]

    messages: list[Message] = []
    if chat_ids:
        messages = list((await session.scalars(select(Message).where(Message.chat_id.in_(chat_ids)).order_by(Message.id.desc()))).all())
    questions = [m for m in messages if m.role == "user"]
    answers = [m for m in messages if m.role == "assistant"]

    # Two-week activity: questions asked and documents uploaded per day, oldest first.
    today = datetime.now(timezone.utc).date()
    days = [(today - timedelta(days=i)).isoformat() for i in range(DAYS - 1, -1, -1)]
    asked, uploaded = Counter(_day(m.created_at) for m in questions), Counter(_day(d.created_at) for d in docs)
    activity = [{"date": d, "questions": asked.get(d, 0), "uploads": uploaded.get(d, 0)} for d in days]

    # What answers cite most, from the sources saved with each answer.
    cited: Counter[str] = Counter()
    for m in answers:
        for name in {s.get("filename") for s in (m.sources or []) if isinstance(s, dict) and s.get("filename")}:
            cited[name] += 1

    counts = Counter(m.chat_id for m in messages if m.role == "user")
    ready = [d for d in docs if d.status == "ready"]
    return {
        "totals": {
            "documents": len(docs),
            "ready": len(ready),
            "pages": sum(d.pages for d in ready),
            "passages": sum(d.chunk_count for d in ready),
            "chats": len(chats),
            "questions": len(questions),
            "storage_bytes": sum(d.size for d in docs),
        },
        "quota": {"max_documents": settings.max_documents_per_user, "max_storage_mb": settings.max_storage_mb_per_user},
        "by_status": dict(Counter(d.status for d in docs)),
        "by_kind": dict(Counter(d.kind for d in docs)),
        "activity": activity,
        "top_documents": [{"filename": n, "citations": c} for n, c in cited.most_common(5)],
        "recent_documents": [
            {"id": d.id, "filename": d.filename, "kind": d.kind, "status": d.status, "pages": d.pages, "created_at": d.created_at}
            for d in docs[:5]
        ],
        "recent_chats": [
            {"id": c.id, "title": c.title, "questions": counts.get(c.id, 0), "created_at": c.created_at} for c in chats[:5]
        ],
    }


@router.get("/export", tags=["account"])
async def export_my_data(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    """Everything DocSage holds about the user, as JSON (documents list, chats and messages)."""
    docs = (await session.scalars(select(Document).where(Document.user_id == user.id))).all()
    chats = (await session.scalars(select(Chat).where(Chat.user_id == user.id))).all()
    out_chats = []
    for chat in chats:
        rows = (await session.scalars(select(Message).where(Message.chat_id == chat.id).order_by(Message.id))).all()
        out_chats.append(
            {
                "id": chat.id,
                "title": chat.title,
                "created_at": chat.created_at,
                "messages": [{"role": m.role, "content": m.content, "sources": m.sources, "created_at": m.created_at} for m in rows],
            }
        )
    return {
        "account": {"email": user.email, "name": user.name, "created_at": user.created_at, "terms_accepted_at": user.terms_accepted_at},
        "documents": [
            {"id": d.id, "filename": d.filename, "kind": d.kind, "size": d.size, "pages": d.pages, "status": d.status, "created_at": d.created_at}
            for d in docs
        ],
        "chats": out_chats,
    }


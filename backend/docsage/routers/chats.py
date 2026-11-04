import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import SessionLocal, get_session
from ..deps import current_user, verified_user
from ..ratelimit import check_ask
from ..models import Chat, Message, User
from ..schemas import AskIn, ChatCreate, ChatOut, MessageOut
from ..services import llm
from ..services.prompt import build_messages, citations
from ..services.search import hybrid_search

log = logging.getLogger(__name__)
router = APIRouter(prefix="/chats", tags=["chats"])

HISTORY_TURNS = 6
NO_ANSWER = "I couldn't find anything relevant in your documents. Try rephrasing, or upload the document that covers this."


async def _owned(session: AsyncSession, user: User, chat_id: int) -> Chat:
    chat = await session.get(Chat, chat_id)
    if chat is None or chat.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat not found")
    return chat


def _event(name: str, data) -> str:
    return f"event: {name}\ndata: {json.dumps(data)}\n\n"


@router.get("", response_model=list[ChatOut])
async def list_chats(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    result = await session.scalars(select(Chat).where(Chat.user_id == user.id).order_by(Chat.id.desc()))
    return list(result)


@router.delete("", status_code=204)
async def delete_all_chats(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    """Clear the whole history. Documents are untouched."""
    ids = select(Chat.id).where(Chat.user_id == user.id)
    await session.execute(delete(Message).where(Message.chat_id.in_(ids)))
    await session.execute(delete(Chat).where(Chat.user_id == user.id))
    await session.commit()


@router.post("", response_model=ChatOut, status_code=201)
async def create_chat(
    body: ChatCreate, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)
):
    chat = Chat(user_id=user.id, title=body.title)
    session.add(chat)
    await session.commit()
    return chat


@router.delete("/{chat_id}", status_code=204)
async def delete_chat(
    chat_id: int, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)
):
    chat = await _owned(session, user, chat_id)
    await session.execute(delete(Message).where(Message.chat_id == chat.id))
    await session.delete(chat)
    await session.commit()


@router.get("/{chat_id}/messages", response_model=list[MessageOut])
async def list_messages(
    chat_id: int, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)
):
    await _owned(session, user, chat_id)
    result = await session.scalars(select(Message).where(Message.chat_id == chat_id).order_by(Message.id))
    return list(result)


@router.post("/{chat_id}/ask")
async def ask(
    chat_id: int,
    body: AskIn,
    user: User = Depends(verified_user),
    session: AsyncSession = Depends(get_session),
):
    """Answer a question from the user's documents as a Server-Sent Events stream.

    Events: `sources` (citations), `token` (answer text), `done`, or `error`.
    """
    await check_ask(user.id)
    chat = await _owned(session, user, chat_id)

    recent = list(
        await session.scalars(
            select(Message).where(Message.chat_id == chat.id).order_by(Message.id.desc()).limit(HISTORY_TURNS)
        )
    )
    history = [{"role": m.role, "content": m.content} for m in reversed(recent)]

    if not recent:
        chat.title = body.question.strip()[:60]
    session.add(Message(chat_id=chat.id, role="user", content=body.question, sources=[]))
    await session.commit()

    found = await hybrid_search(session, user.id, body.question, body.document_ids, settings.top_k)
    sources = citations(found)

    async def stream() -> AsyncIterator[str]:
        yield _event("sources", sources)
        answer: list[str] = []
        try:
            if not found:
                answer.append(NO_ANSWER)
                yield _event("token", NO_ANSWER)
            else:
                async for token in llm.stream_chat(build_messages(body.question, found, history)):
                    answer.append(token)
                    yield _event("token", token)
        except llm.LLMError as exc:
            log.warning("Answer failed: %s", exc)
            yield _event("error", str(exc))
            return

        async with SessionLocal() as db:
            db.add(Message(chat_id=chat_id, role="assistant", content="".join(answer), sources=sources))
            await db.commit()
        yield _event("done", {})

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

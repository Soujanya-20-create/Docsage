"""Refresh-token sessions: stored server-side, rotated on every use, revocable.

Reusing an already-rotated token means it was copied (or replayed), so every session of that user is
revoked. A short grace window tolerates two browser tabs refreshing at the same moment.
"""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import AuthSession, User
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    new_jti,
)

GRACE = timedelta(seconds=15)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    """SQLite returns naive datetimes; everything we store is UTC."""
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _unauthorised() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired session")


async def issue(db: AsyncSession, user_id: int) -> dict:
    """Start a session and return the token pair."""
    jti = new_jti()
    db.add(AuthSession(id=jti, user_id=user_id, expires_at=_now() + timedelta(days=settings.refresh_token_days)))
    await db.execute(delete(AuthSession).where(AuthSession.expires_at < _now() - timedelta(days=1)).execution_options(synchronize_session=False))  # tidy up
    await db.commit()
    return {
        "access_token": create_access_token(user_id),
        "refresh_token": create_refresh_token(user_id, jti),
        "expires_in": settings.access_token_minutes * 60,
    }


async def revoke_all(db: AsyncSession, user_id: int) -> None:
    await db.execute(
        update(AuthSession).where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None)).values(revoked_at=_now()).execution_options(synchronize_session=False)
    )
    await db.commit()


async def rotate(db: AsyncSession, refresh_token: str) -> dict:
    decoded = decode_refresh_token(refresh_token)
    if decoded is None:
        raise _unauthorised()
    user_id, jti = decoded

    row = await db.get(AuthSession, jti)
    if row is None or row.user_id != user_id or _aware(row.expires_at) < _now():
        raise _unauthorised()

    if row.revoked_at is not None:  # logged out, or invalidated by a password change
        raise _unauthorised()
    if row.rotated_at is not None:
        if _now() - _aware(row.rotated_at) > GRACE:
            await revoke_all(db, user_id)  # a rotated token came back later: treat the sessions as stolen
            raise _unauthorised()
    else:
        row.rotated_at = _now()

    if await db.get(User, user_id) is None:
        raise _unauthorised()
    await db.commit()
    return await issue(db, user_id)


async def revoke(db: AsyncSession, refresh_token: str) -> None:
    decoded = decode_refresh_token(refresh_token)
    if decoded is None:
        return
    row = await db.get(AuthSession, decoded[1])
    if row is not None and row.revoked_at is None:
        row.revoked_at = _now()
        await db.commit()

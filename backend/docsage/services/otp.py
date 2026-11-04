"""Six-digit one-time codes for email confirmation and password reset.

A code is stored only as a keyed hash, expires after `otp_minutes`, can be guessed `otp_max_attempts`
times and is deleted on success. Asking for a new code is rate limited by `otp_resend_seconds`.
"""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import OtpCode


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _hash(user_id: int, purpose: str, code: str) -> str:
    return hmac.new(settings.secret_key.encode(), f"{user_id}:{purpose}:{code}".encode(), hashlib.sha256).hexdigest()


def timings(row: OtpCode | None) -> dict:
    """Seconds until the code expires and until another can be requested (both 0 when there is no code)."""
    if row is None:
        return {"expires_in": 0, "resend_in": 0}
    now = _now()
    expires = max(0, int((_aware(row.expires_at) - now).total_seconds()))
    resend = max(0, int((_aware(row.created_at) + timedelta(seconds=settings.otp_resend_seconds) - now).total_seconds()))
    return {"expires_in": expires, "resend_in": resend}


async def latest(session: AsyncSession, user_id: int, purpose: str) -> OtpCode | None:
    row = await session.scalar(
        select(OtpCode).where(OtpCode.user_id == user_id, OtpCode.purpose == purpose).order_by(OtpCode.id.desc())
    )
    return row if row is not None and _aware(row.expires_at) > _now() else None


async def issue(session: AsyncSession, user_id: int, purpose: str) -> tuple[str, dict]:
    """Create a fresh code, replacing any older one. Raises 429 while the resend cooldown is running."""
    existing = await latest(session, user_id, purpose)
    wait = timings(existing)["resend_in"]
    if wait:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Please wait {wait} seconds before asking for another code.",
            headers={"Retry-After": str(wait)},
        )
    code = f"{secrets.randbelow(1_000_000):06d}"
    await session.execute(delete(OtpCode).where(OtpCode.user_id == user_id, OtpCode.purpose == purpose))
    row = OtpCode(
        user_id=user_id,
        purpose=purpose,
        code_hash=_hash(user_id, purpose, code),
        expires_at=_now() + timedelta(minutes=settings.otp_minutes),
        created_at=_now(),
    )
    session.add(row)
    await session.commit()
    return code, timings(row)


async def check(session: AsyncSession, user_id: int, purpose: str, code: str) -> bool:
    """True once, for the right unexpired code. Wrong guesses are counted and burn the code at the limit."""
    row = await latest(session, user_id, purpose)
    if row is None:
        return False
    if row.attempts >= settings.otp_max_attempts:
        await session.delete(row)
        await session.commit()
        return False
    if hmac.compare_digest(row.code_hash, _hash(user_id, purpose, code)):
        await session.delete(row)
        await session.commit()
        return True
    row.attempts += 1
    await session.commit()
    return False

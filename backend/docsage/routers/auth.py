from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..db import get_session
from ..deps import current_user
from ..models import AuthSession, Chat, Chunk, Document, Message, OtpCode, User
from ..ratelimit import check, check_login_account, limit_auth
from ..schemas import (
    ChangePasswordIn,
    EmailIn,
    LoginIn,
    OtpIn,
    OtpOut,
    PasswordIn,
    ProfileIn,
    RefreshIn,
    RegisterIn,
    ResetIn,
    TokensOut,
    UserOut,
)
from ..security import hash_password, verify_password
from ..services import otp, sessions
from ..services.mailer import reset_email, send_email, verification_email
from ..services.search import keyword_index
from ..services.vectorstore import vector_store

router = APIRouter(prefix="/auth", tags=["auth"])
auth_limit = [Depends(limit_auth)]


async def _send_code(user: User, purpose: str, session: AsyncSession, background: BackgroundTasks) -> dict:
    """Create a code and email it in the background. Returns the countdown values for the screen."""
    code, timing = await otp.issue(session, user.id, purpose)
    subject, text = (verification_email if purpose == "verify" else reset_email)(code)
    background.add_task(send_email, user.email, subject, text)
    return timing


@router.post("/register", dependencies=auth_limit, response_model=TokensOut, status_code=201)
async def register(body: RegisterIn, background: BackgroundTasks, session: AsyncSession = Depends(get_session)):
    email = body.email.lower()
    if await session.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = User(
        email=email,
        name=body.name.strip(),
        password_hash=hash_password(body.password),
        terms_accepted_at=datetime.now(timezone.utc),
    )
    session.add(user)
    try:
        await session.commit()
    except IntegrityError:  # two sign-ups with the same email raced past the check above
        await session.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists") from None
    await _send_code(user, "verify", session, background)
    return await sessions.issue(session, user.id)


@router.post("/login", dependencies=auth_limit, response_model=TokensOut)
async def login(body: LoginIn, session: AsyncSession = Depends(get_session)):
    email = body.email.lower()
    await check_login_account(email)
    user = await session.scalar(select(User).where(User.email == email))
    # Always run a full password check (against a dummy hash for unknown emails) so timing is the same.
    if not verify_password(body.password, user.password_hash if user else None):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return await sessions.issue(session, user.id)


@router.post("/refresh", dependencies=auth_limit, response_model=TokensOut)
async def refresh(body: RefreshIn, session: AsyncSession = Depends(get_session)):
    return await sessions.rotate(session, body.refresh_token)


@router.post("/logout", status_code=204)
async def logout(body: RefreshIn, session: AsyncSession = Depends(get_session)):
    await sessions.revoke(session, body.refresh_token)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_profile(body: ProfileIn, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    user.name = body.name.strip()
    await session.commit()
    return user


@router.post("/logout-all", status_code=204)
async def logout_everywhere(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    """End every session on every device, including this one."""
    await sessions.revoke_all(session, user.id)


# ---- email confirmation (6-digit code) ----------------------------------------------------

@router.get("/otp-status", response_model=OtpOut)
async def otp_status(user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    """Where the confirmation countdown stands, so the timer survives a page reload."""
    return otp.timings(await otp.latest(session, user.id, "verify"))


@router.post("/verify-email", dependencies=auth_limit, status_code=204)
async def verify_email(body: OtpIn, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    await check(f"verify:{user.id}", 10)
    if user.email_verified:
        return
    if not await otp.check(session, user.id, "verify", body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That code is incorrect or has expired")
    user.email_verified = True
    await session.commit()


@router.post("/resend-verification", response_model=OtpOut)
async def resend_verification(
    background: BackgroundTasks, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)
):
    await check(f"resend:{user.id}", 6)
    if user.email_verified:
        return {"expires_in": 0, "resend_in": 0}
    return await _send_code(user, "verify", session, background)


# ---- password reset (6-digit code) and change ---------------------------------------------

@router.post("/forgot-password", dependencies=auth_limit, response_model=OtpOut, status_code=202)
async def forgot_password(body: EmailIn, background: BackgroundTasks, session: AsyncSession = Depends(get_session)):
    email = body.email.lower()
    await check(f"forgot:{email}", 6)  # stops anyone using us to spam a victim's inbox
    user = await session.scalar(select(User).where(User.email == email))
    if user is not None:
        try:
            return await _send_code(user, "reset", session, background)
        except HTTPException as err:
            if err.status_code != status.HTTP_429_TOO_MANY_REQUESTS:
                raise
            return otp.timings(await otp.latest(session, user.id, "reset"))  # a code is already on its way
    # Same shape of answer whether or not the account exists, so this cannot be used to find accounts.
    return {"expires_in": settings.otp_minutes * 60, "resend_in": settings.otp_resend_seconds}


@router.post("/reset-password", dependencies=auth_limit, status_code=204)
async def reset_password(body: ResetIn, session: AsyncSession = Depends(get_session)):
    await check(f"reset:{body.email.lower()}", 10)
    user = await session.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not await otp.check(session, user.id, "reset", body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "That code is incorrect or has expired")
    user.password_hash = hash_password(body.new_password)
    user.email_verified = True  # they just proved they control the inbox
    await session.commit()
    await sessions.revoke_all(session, user.id)


@router.post("/change-password", status_code=204)
async def change_password(
    body: ChangePasswordIn, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)
):
    await check(f"change-password:{user.id}", 5)
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your current password is incorrect")
    user.password_hash = hash_password(body.new_password)
    await session.commit()
    await sessions.revoke_all(session, user.id)  # signs out every device; the client signs in again


# ---- account deletion ---------------------------------------------------------------------

@router.delete("/me", status_code=204)
async def delete_account(body: PasswordIn, user: User = Depends(current_user), session: AsyncSession = Depends(get_session)):
    """Permanently delete the account and everything it owns: documents, chunks, vectors, chats."""
    await check(f"delete-account:{user.id}", 5)
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Your password is incorrect")

    stored = (await session.scalars(select(Document.stored_name).where(Document.user_id == user.id))).all()
    chat_ids = select(Chat.id).where(Chat.user_id == user.id)
    await vector_store.delete_user(user.id)
    await session.execute(delete(Message).where(Message.chat_id.in_(chat_ids)))
    await session.execute(delete(Chat).where(Chat.user_id == user.id))
    await session.execute(delete(Chunk).where(Chunk.user_id == user.id))
    await session.execute(delete(Document).where(Document.user_id == user.id))
    await session.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    await session.execute(delete(OtpCode).where(OtpCode.user_id == user.id))
    await session.execute(delete(User).where(User.id == user.id))
    await session.commit()
    keyword_index.invalidate(user.id)
    for name in stored:
        (Path(settings.upload_dir) / name).unlink(missing_ok=True)

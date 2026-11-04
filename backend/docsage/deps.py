from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import get_session
from .models import User
from .security import decode_access_token

bearer = HTTPBearer(auto_error=False)


async def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    user_id = decode_access_token(creds.credentials) if creds else None
    user = await session.get(User, user_id) if user_id else None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    return user


async def verified_user(user: User = Depends(current_user)) -> User:
    """Like current_user, but when REQUIRE_EMAIL_VERIFICATION is on the email must be confirmed."""
    if settings.require_email_verification and not user.email_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Please confirm your email address first.")
    return user

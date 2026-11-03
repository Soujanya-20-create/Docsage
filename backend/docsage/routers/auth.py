from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import current_user
from ..models import User
from ..schemas import LoginIn, RefreshIn, RegisterIn, TokensOut, UserOut
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens(user_id: int) -> TokensOut:
    return TokensOut(access_token=create_access_token(user_id), refresh_token=create_refresh_token(user_id))


@router.post("/register", response_model=TokensOut, status_code=201)
async def register(body: RegisterIn, session: AsyncSession = Depends(get_session)):
    email = body.email.lower()
    if await session.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password))
    session.add(user)
    await session.commit()
    return _tokens(user.id)


@router.post("/login", response_model=TokensOut)
async def login(body: LoginIn, session: AsyncSession = Depends(get_session)):
    user = await session.scalar(select(User).where(User.email == body.email.lower()))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return _tokens(user.id)


@router.post("/refresh", response_model=TokensOut)
async def refresh(body: RefreshIn, session: AsyncSession = Depends(get_session)):
    user_id = decode_token(body.refresh_token, "refresh")
    if user_id is None or await session.get(User, user_id) is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    return _tokens(user_id)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(current_user)):
    return user

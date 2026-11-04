from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator

from .config import settings
from .security import password_problem


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)
    name: str = Field(default="", max_length=120)
    accept_terms: Literal[True]  # must be explicitly true; the time of acceptance is stored

    @field_validator("password")
    @classmethod
    def _strong(cls, value: str, info) -> str:
        problem = password_problem(value, str(info.data.get("email", "")))
        if problem:
            raise ValueError(problem)
        return value


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str = Field(max_length=2000)


class TokensOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserOut(ORM):
    id: int
    email: str
    name: str
    email_verified: bool

    # Server settings the app shell needs: whether confirming is required, and whether a code can be emailed at all.
    @computed_field
    @property
    def verification_required(self) -> bool:
        return settings.require_email_verification

    @computed_field
    @property
    def email_enabled(self) -> bool:
        return settings.email_configured


class EmailIn(BaseModel):
    email: EmailStr


Code = Field(pattern=r"^\d{6}$")


class OtpIn(BaseModel):
    code: str = Code


class OtpOut(BaseModel):
    """Countdown values for the code screen, in seconds."""
    expires_in: int
    resend_in: int


class ResetIn(OtpIn):
    email: EmailStr
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def _strong(cls, value: str, info) -> str:
        problem = password_problem(value, str(info.data.get("email", "")))
        if problem:
            raise ValueError(problem)
        return value


class ProfileIn(BaseModel):
    name: str = Field(max_length=120)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def _strong(cls, value: str) -> str:
        problem = password_problem(value)
        if problem:
            raise ValueError(problem)
        return value


class PasswordIn(BaseModel):
    password: str = Field(max_length=128)


class DocumentOut(ORM):
    id: int
    filename: str
    kind: str
    size: int
    status: str
    error: str | None
    pages: int
    chunk_count: int
    created_at: datetime


class ChunkOut(ORM):
    id: int
    page: int
    position: int
    text: str


class ChatOut(ORM):
    id: int
    title: str
    created_at: datetime


class ChatCreate(BaseModel):
    title: str = Field(default="New chat", max_length=200)


class MessageOut(ORM):
    id: int
    role: str
    content: str
    sources: list
    created_at: datetime


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    document_ids: list[int] | None = None

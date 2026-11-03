from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="", max_length=120)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class TokensOut(BaseModel):
    access_token: str
    refresh_token: str


class UserOut(ORM):
    id: int
    email: str
    name: str


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

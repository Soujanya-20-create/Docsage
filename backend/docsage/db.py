import asyncio
from pathlib import Path
from typing import AsyncIterator

from alembic import command
from alembic.config import Config

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

if _is_sqlite:
    # Wait up to 30 s for a write lock instead of failing at once with "database is locked".
    engine = create_async_engine(settings.database_url, connect_args={"timeout": 30})

    @event.listens_for(engine.sync_engine, "connect")
    def _sqlite_pragmas(dbapi_connection, _record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")  # readers no longer block the writer
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
else:
    # pre_ping drops connections the host closed while the service was idle.
    engine = create_async_engine(settings.database_url, pool_pre_ping=True, pool_recycle=1800)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session


async def init_db() -> None:
    from . import models  # noqa: F401  (register tables)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def run_migrations() -> None:
    """Bring the database schema up to date (`alembic upgrade head`) without blocking the event loop."""
    config = Config()
    config.set_main_option("script_location", str(Path(__file__).resolve().parent.parent / "migrations"))
    await asyncio.to_thread(command.upgrade, config, "head")

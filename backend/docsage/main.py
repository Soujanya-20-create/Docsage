import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from .config import settings
from .db import SessionLocal, run_migrations
from .middleware import SecurityHeadersMiddleware
from .routers import auth, chats, documents, stats
from .services.ingest import fail_interrupted_documents, rebuild_vector_index
from .services.llm import configured_providers
from .services.ocr import tesseract_available

logging.basicConfig(level=logging.INFO)

if settings.sentry_dsn:
    import sentry_sdk

    # No request bodies or user details are sent: documents and questions are private.
    sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment, send_default_pii=False, traces_sample_rate=0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    if settings.auto_migrate:
        await run_migrations()
    await fail_interrupted_documents()
    reindex = asyncio.create_task(rebuild_vector_index())
    yield
    reindex.cancel()


app = FastAPI(
    title=f"{settings.app_name} API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

api = APIRouter(prefix="/api")
api.include_router(auth.router)
api.include_router(documents.router)
api.include_router(chats.router)
api.include_router(stats.router)
app.include_router(api)


@app.get("/health")
async def health():
    """Liveness probe for the host's health check. Cheap, never touches the database."""
    return {"status": "ok"}


@app.get("/health/ready")
async def ready():
    """Readiness: database reachable, plus which optional capabilities are configured (no secrets)."""
    try:
        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        raise HTTPException(503, "Database unavailable") from None
    return {
        "status": "ok",
        "llm_providers": configured_providers(),
        "ocr": "tesseract" if tesseract_available() else ("vision-model" if settings.openrouter_api_key else "none"),
        "vector_store": settings.qdrant_mode,
    }

"""Settings, SQLite locking, startup recovery, rate limiting, OCR and health checks."""
import asyncio
import io
import sqlite3

import pytest
from conftest import register
from PIL import Image, ImageDraw, ImageFont
from pydantic import ValidationError

from docsage import ratelimit
from docsage.config import DEV_SECRET, Settings, normalize_database_url, settings
from docsage.db import SessionLocal
from docsage.models import Document
from docsage.services import ingest, ocr


# ---- configuration -------------------------------------------------------------------------

@pytest.mark.parametrize(
    "given, expected",
    [
        ("postgres://u:p@host:5432/db", "postgresql+asyncpg://u:p@host:5432/db"),
        ("postgresql://u:p@host/db", "postgresql+asyncpg://u:p@host/db"),
        ("postgresql://u:p@host/db?sslmode=require&channel_binding=require", "postgresql+asyncpg://u:p@host/db?ssl=require"),
        ("postgresql+asyncpg://u:p@host/db", "postgresql+asyncpg://u:p@host/db"),
        ("sqlite+aiosqlite:///./x.db", "sqlite+aiosqlite:///./x.db"),
    ],
)
def test_database_urls_from_hosting_providers_are_normalised(given, expected):
    assert normalize_database_url(given) == expected


def test_production_refuses_a_weak_secret():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, environment="production", secret_key="short")
    with pytest.raises(ValidationError):
        Settings(_env_file=None, environment="production", secret_key=DEV_SECRET)
    Settings(_env_file=None, environment="production", secret_key="x" * 40)


def test_cors_origins_accept_a_comma_separated_list():
    s = Settings(_env_file=None, frontend_url="https://a.vercel.app/, https://b.example.com")
    assert s.cors_origins == ["https://a.vercel.app", "https://b.example.com"]


# ---- SQLite lock regression ----------------------------------------------------------------

def _make_pdf(text="The sacred fruit of Atlantis is the blue mango. " * 3) -> bytes:
    import pymupdf

    doc = pymupdf.open()
    doc.new_page().insert_text((72, 72), text)
    return doc.tobytes()


def test_other_writes_succeed_while_a_document_is_being_embedded(client, monkeypatch):
    """Embedding is slow. It must not run inside a transaction that holds SQLite's write lock."""
    db_path = settings.database_url.split("///", 1)[1]
    seen = {}

    class SlowEmbedder:
        async def embed_passages(self, texts):
            def write_from_another_connection():
                conn = sqlite3.connect(db_path, timeout=0.5)  # fail fast instead of waiting
                try:
                    conn.execute("INSERT INTO chats (user_id, title, created_at) VALUES (1, 'x', '2026-01-01')")
                    conn.commit()
                    return "ok"
                except sqlite3.OperationalError as exc:
                    return str(exc)
                finally:
                    conn.close()

            seen["write"] = await asyncio.to_thread(write_from_another_connection)
            return [[0.0] * 384 for _ in texts]

    monkeypatch.setattr(ingest, "embedder", SlowEmbedder())
    headers = register(client, "lock@example.com")
    r = client.post("/api/documents", headers=headers, files={"file": ("a.pdf", _make_pdf(), "application/pdf")})
    assert r.status_code == 201
    assert seen["write"] == "ok", seen
    assert client.get(f"/api/documents/{r.json()['id']}", headers=headers).json()["status"] == "ready"


def test_a_failed_document_is_marked_failed_not_stuck(client, monkeypatch):
    class BrokenEmbedder:
        async def embed_passages(self, texts):
            raise RuntimeError("model exploded")

    monkeypatch.setattr(ingest, "embedder", BrokenEmbedder())
    headers = register(client, "broken@example.com")
    r = client.post("/api/documents", headers=headers, files={"file": ("a.pdf", _make_pdf(), "application/pdf")})
    doc = client.get(f"/api/documents/{r.json()['id']}", headers=headers).json()
    assert doc["status"] == "failed" and "model exploded" in doc["error"]


def test_documents_left_processing_by_a_restart_are_failed_on_startup(client):
    async def run():
        async with SessionLocal() as s:
            s.add(Document(user_id=1, filename="stuck.pdf", stored_name="x", kind="pdf", size=1, status="processing"))
            await s.commit()
        await ingest.fail_interrupted_documents()
        async with SessionLocal() as s:
            from sqlalchemy import select

            return (await s.scalars(select(Document).where(Document.filename == "stuck.pdf"))).one()

    doc = asyncio.run(run())
    assert doc.status == "failed" and "restart" in doc.error


# ---- OCR -----------------------------------------------------------------------------------

@pytest.mark.skipif(not ocr.tesseract_available(), reason="Tesseract is not installed")
def test_text_in_an_image_is_read_with_tesseract(client, monkeypatch):
    class FakeEmbedder:
        async def embed_passages(self, texts):
            return [[0.0] * 384 for _ in texts]

    monkeypatch.setattr(ingest, "embedder", FakeEmbedder())
    img = Image.new("RGB", (900, 200), "white")
    ImageDraw.Draw(img).text((20, 60), "Invoice total is 4200 dollars", fill="black", font=ImageFont.load_default(size=48))
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    headers = register(client, "ocr@example.com")
    r = client.post("/api/documents", headers=headers, files={"file": ("scan.png", buf.getvalue(), "image/png")})
    assert r.status_code == 201
    doc = client.get(f"/api/documents/{r.json()['id']}", headers=headers).json()
    assert doc["status"] == "ready", doc
    chunks = client.get(f"/api/documents/{doc['id']}/chunks", headers=headers).json()
    assert "4200" in " ".join(c["text"] for c in chunks)


# ---- rate limiting and health --------------------------------------------------------------

def test_login_is_rate_limited(client, monkeypatch):
    monkeypatch.setattr(settings, "auth_rate_per_minute", 3)
    ratelimit.reset()
    codes = [client.post("/api/auth/login", json={"email": "no@example.com", "password": "nope-nope"}).status_code for _ in range(5)]
    assert codes == [401, 401, 401, 429, 429]
    ratelimit.reset()


def test_health_endpoints(client):
    assert client.get("/health").json() == {"status": "ok"}
    ready = client.get("/health/ready").json()
    assert ready["status"] == "ok" and ready["llm_providers"] == []


# ---- full answer path with a fake provider -------------------------------------------------

def test_answer_streams_with_citations_and_falls_back_to_the_next_provider(client, monkeypatch):
    from docsage.services import llm

    class FakeEmbedder:
        async def embed_passages(self, texts):
            return [[0.0] * 384 for _ in texts]

    monkeypatch.setattr(ingest, "embedder", FakeEmbedder())
    headers = register(client, "answer@example.com")
    r = client.post("/api/documents", headers=headers, files={"file": ("atlantis.pdf", _make_pdf(), "application/pdf")})
    assert client.get(f"/api/documents/{r.json()['id']}", headers=headers).json()["status"] == "ready"

    llm._cooldown_until.clear()
    monkeypatch.setattr(llm, "configured_providers", lambda: ["groq", "openrouter"])

    async def fake_stream(name, messages):
        if name == "groq":
            raise llm.LLMError("groq: HTTP 429 rate limited")
        for token in ("The fruit is ", "the blue mango [1]."):
            yield token

    monkeypatch.setattr(llm, "_stream_one", fake_stream)
    chat = client.post("/api/chats", headers=headers, json={}).json()
    resp = client.post(f"/api/chats/{chat['id']}/ask", headers=headers, json={"question": "What is the sacred fruit of Atlantis?"})
    events = [block.split("\n")[0] for block in resp.text.strip().split("\n\n")]
    assert events == ["event: sources", "event: token", "event: token", "event: done"]
    assert "atlantis.pdf" in resp.text

    saved = client.get(f"/api/chats/{chat['id']}/messages", headers=headers).json()
    assert saved[-1]["content"] == "The fruit is the blue mango [1]."
    assert saved[-1]["sources"][0]["filename"] == "atlantis.pdf"
    llm._cooldown_until.clear()

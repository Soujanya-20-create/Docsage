"""Sessions, account flows, rate limiting, headers, upload limits and migrations."""
import asyncio
import io
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from conftest import register
from fastapi import Request
from PIL import Image
from sqlalchemy import select

from docsage import ratelimit
from docsage.config import settings
from docsage.db import SessionLocal
from docsage.models import AuthSession, Chat, Chunk, Document, User
from docsage.services import ingest

PASSWORD = "correct-horse-1"


def signup(client, email):
    r = client.post("/api/auth/register", json={"email": email, "password": PASSWORD, "accept_terms": True})
    assert r.status_code == 201, r.text
    return r.json()


def bearer(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture
def outbox(monkeypatch):
    """Capture emails instead of sending them."""
    sent = []

    async def fake_send(to, subject, text):
        sent.append((to, subject, text))
        return True

    monkeypatch.setattr("docsage.routers.auth.send_email", fake_send)
    return sent


def code_of(message):
    """The 6-digit code in an email (formatted as 'NNN NNN')."""
    return re.search(r"\b(\d{3}) (\d{3})\b", message[2]).expand(r"\1\2")


def wait_out_cooldown():
    """Skip the resend cooldown without sleeping: age the stored code."""
    import asyncio
    from datetime import timedelta

    from sqlalchemy import update

    from docsage.db import SessionLocal
    from docsage.models import OtpCode

    async def go():
        async with SessionLocal() as session:
            rows = (await session.scalars(__import__("sqlalchemy").select(OtpCode))).all()
            for row in rows:
                row.created_at = row.created_at - timedelta(seconds=settings.otp_resend_seconds + 1)
            await session.commit()

    asyncio.run(go())


# ---- passwords ----------------------------------------------------------------------------

@pytest.mark.parametrize("password", ["short1", "password123", "aaaaaaaaaaaa", "1234567890"])
def test_weak_passwords_are_rejected(client, password):
    r = client.post("/api/auth/register", json={"email": "weak@example.com", "password": password, "accept_terms": True})
    assert r.status_code == 422


# ---- refresh-token sessions ---------------------------------------------------------------

def test_refresh_rotates_and_a_replayed_token_revokes_every_session(client):
    first = signup(client, "rotate@example.com")
    second = client.post("/api/auth/refresh", json={"refresh_token": first["refresh_token"]}).json()
    assert second["refresh_token"] != first["refresh_token"]

    # inside the grace window (two tabs refreshing together) the old token still works once more
    assert client.post("/api/auth/refresh", json={"refresh_token": first["refresh_token"]}).status_code == 200

    # outside the window the same token is evidence of theft
    async def age_the_rotation():
        async with SessionLocal() as s:
            for row in (await s.scalars(select(AuthSession))).all():
                if row.rotated_at is not None:
                    row.rotated_at = datetime.now(timezone.utc) - timedelta(minutes=5)
            await s.commit()

    asyncio.run(age_the_rotation())
    assert client.post("/api/auth/refresh", json={"refresh_token": first["refresh_token"]}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": second["refresh_token"]}).status_code == 401


def test_logout_revokes_the_session(client):
    tokens = signup(client, "logout@example.com")
    assert client.post("/api/auth/logout", json={"refresh_token": tokens["refresh_token"]}).status_code == 204
    assert client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401


def test_garbage_and_access_tokens_cannot_refresh(client):
    tokens = signup(client, "garbage@example.com")
    assert client.post("/api/auth/refresh", json={"refresh_token": "nonsense"}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": tokens["access_token"]}).status_code == 401


# ---- password reset, change, verification -------------------------------------------------

def test_password_reset_with_a_code_works_once_and_signs_everyone_out(client, outbox):
    tokens = signup(client, "reset@example.com")
    outbox.clear()
    r = client.post("/api/auth/forgot-password", json={"email": "reset@example.com"})
    assert r.status_code == 202
    assert 0 < r.json()["expires_in"] <= settings.otp_minutes * 60 and r.json()["resend_in"] > 0
    code = code_of(outbox[0])

    unknown = client.post("/api/auth/forgot-password", json={"email": "nobody@example.com"})
    assert unknown.status_code == 202 and set(unknown.json()) == set(r.json())  # same shape: no account probing
    assert len(outbox) == 1

    new_password = "a-brand-new-passphrase"
    body = {"email": "reset@example.com", "code": code, "new_password": new_password}
    assert client.post("/api/auth/reset-password", json=body).status_code == 204
    assert client.post("/api/auth/reset-password", json={**body, "new_password": "another-one-12345"}).status_code == 400  # single use
    assert client.post("/api/auth/login", json={"email": "reset@example.com", "password": PASSWORD}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "reset@example.com", "password": new_password}).status_code == 200
    assert client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401


def test_reset_rejects_weak_passwords_wrong_codes_and_burns_the_code_after_too_many_guesses(client, outbox):
    signup(client, "weakreset@example.com")
    outbox.clear()
    client.post("/api/auth/forgot-password", json={"email": "weakreset@example.com"})
    code = code_of(outbox[0])
    wrong = "000000" if code != "000000" else "111111"
    base = {"email": "weakreset@example.com", "new_password": "a-brand-new-passphrase"}
    assert client.post("/api/auth/reset-password", json={**base, "code": code, "new_password": "short"}).status_code == 422
    assert client.post("/api/auth/reset-password", json={**base, "code": "12ab56"}).status_code == 422  # digits only
    for _ in range(settings.otp_max_attempts):
        assert client.post("/api/auth/reset-password", json={**base, "code": wrong}).status_code == 400
    # The right code no longer works: it was burned by the wrong guesses.
    assert client.post("/api/auth/reset-password", json={**base, "code": code}).status_code == 400


def test_codes_expire_and_resending_has_a_cooldown(client, outbox, monkeypatch):
    signup(client, "expire@example.com")
    outbox.clear()
    first = client.post("/api/auth/forgot-password", json={"email": "expire@example.com"})
    assert first.status_code == 202 and len(outbox) == 1
    again = client.post("/api/auth/forgot-password", json={"email": "expire@example.com"})
    assert again.status_code == 202 and len(outbox) == 1  # still cooling down: no second email

    wait_out_cooldown()
    assert client.post("/api/auth/forgot-password", json={"email": "expire@example.com"}).status_code == 202
    assert len(outbox) == 2
    old, new = code_of(outbox[0]), code_of(outbox[1])
    body = {"email": "expire@example.com", "new_password": "a-brand-new-passphrase"}
    if old != new:
        assert client.post("/api/auth/reset-password", json={**body, "code": old}).status_code == 400  # replaced

    monkeypatch.setattr(settings, "otp_minutes", 0)  # nothing issued from now on lives long enough
    import asyncio
    from datetime import timedelta

    from docsage.db import SessionLocal
    from docsage.models import OtpCode
    from sqlalchemy import select

    async def expire_all():
        async with SessionLocal() as session:
            for row in (await session.scalars(select(OtpCode))).all():
                row.expires_at = row.expires_at - timedelta(hours=1)
            await session.commit()

    asyncio.run(expire_all())
    assert client.post("/api/auth/reset-password", json={**body, "code": new}).status_code == 400


def test_change_password_needs_the_current_one_and_revokes_sessions(client):
    tokens = signup(client, "change@example.com")
    headers = bearer(tokens)
    wrong = client.post("/api/auth/change-password", headers=headers, json={"current_password": "nope-nope-nope", "new_password": "a-brand-new-passphrase"})
    assert wrong.status_code == 403
    ok = client.post("/api/auth/change-password", headers=headers, json={"current_password": PASSWORD, "new_password": "a-brand-new-passphrase"})
    assert ok.status_code == 204
    assert client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401


def test_email_verification_by_code_and_the_requirement_gate(client, outbox, monkeypatch):
    tokens = signup(client, "verify@example.com")
    headers = bearer(tokens)
    assert client.get("/api/auth/me", headers=headers).json()["email_verified"] is False
    assert any("confirmation code" in m[1] for m in outbox)
    status_now = client.get("/api/auth/otp-status", headers=headers).json()
    assert status_now["expires_in"] > 0 and status_now["resend_in"] > 0

    monkeypatch.setattr(settings, "require_email_verification", True)
    assert client.post("/api/chats/1/ask", headers=headers, json={"question": "hi"}).status_code == 403

    assert client.post("/api/auth/resend-verification", headers=headers).status_code == 429  # cooldown running
    assert client.post("/api/auth/verify-email", headers=headers, json={"code": "abcdef"}).status_code == 422
    message = next(m for m in outbox if m[0] == "verify@example.com")
    code = code_of(message)
    wrong = "000000" if code != "000000" else "111111"
    assert client.post("/api/auth/verify-email", headers=headers, json={"code": wrong}).status_code == 400
    assert client.post("/api/auth/verify-email", json={"code": code}).status_code == 401  # needs a signed-in user
    assert client.post("/api/auth/verify-email", headers=headers, json={"code": code}).status_code == 204
    assert client.get("/api/auth/me", headers=headers).json()["email_verified"] is True


def test_profile_update_and_sign_out_everywhere(client):
    tokens = signup(client, "profile@example.com")
    headers = bearer(tokens)
    assert client.patch("/api/auth/me", headers=headers, json={"name": "  Grace Hopper "}).json()["name"] == "Grace Hopper"
    assert client.post("/api/auth/logout-all", headers=headers).status_code == 204
    assert client.post("/api/auth/refresh", json={"refresh_token": tokens["refresh_token"]}).status_code == 401


def test_dashboard_stats_and_export_only_cover_the_caller(client):
    a, b = signup(client, "stats-a@example.com"), signup(client, "stats-b@example.com")
    chat = client.post("/api/chats", headers=bearer(a), json={}).json()
    client.post("/api/chats", headers=bearer(b), json={})
    stats = client.get("/api/stats", headers=bearer(a)).json()
    assert stats["totals"]["chats"] == 1 and stats["totals"]["documents"] == 0
    assert len(stats["activity"]) == 14 and stats["quota"]["max_documents"] > 0
    assert stats["recent_chats"][0]["id"] == chat["id"]
    export = client.get("/api/stats/export", headers=bearer(a)).json()
    assert export["account"]["email"] == "stats-a@example.com" and len(export["chats"]) == 1
    assert client.delete("/api/chats", headers=bearer(a)).status_code == 204
    assert client.get("/api/stats", headers=bearer(a)).json()["totals"]["chats"] == 0
    assert client.get("/api/stats", headers=bearer(b)).json()["totals"]["chats"] == 1  # untouched


# ---- account deletion ---------------------------------------------------------------------

def test_deleting_an_account_removes_everything_it_owned(client, monkeypatch):
    class FakeEmbedder:
        async def embed_passages(self, texts):
            return [[0.0] * 384 for _ in texts]

    monkeypatch.setattr(ingest, "embedder", FakeEmbedder())
    import pymupdf

    pdf = pymupdf.open()
    pdf.new_page().insert_text((72, 72), "Delete me. The quarterly report is confidential content.")
    tokens = signup(client, "delete@example.com")
    headers = bearer(tokens)
    assert client.post("/api/documents", headers=headers, files={"file": ("a.pdf", pdf.tobytes(), "application/pdf")}).status_code == 201
    client.post("/api/chats", headers=headers, json={})

    wrong = client.request("DELETE", "/api/auth/me", headers=headers, json={"password": "wrong-password-1"})
    assert wrong.status_code == 403
    assert client.request("DELETE", "/api/auth/me", headers=headers, json={"password": PASSWORD}).status_code == 204

    async def leftovers():
        async with SessionLocal() as s:
            user = await s.scalar(select(User).where(User.email == "delete@example.com"))
            docs = (await s.scalars(select(Document).where(Document.filename == "a.pdf", Document.user_id == (user.id if user else -1)))).all()
            return user, docs

    user, docs = asyncio.run(leftovers())
    assert user is None and docs == []
    assert client.get("/api/auth/me", headers=headers).status_code == 401
    assert client.post("/api/auth/login", json={"email": "delete@example.com", "password": PASSWORD}).status_code == 401


# ---- uploads ------------------------------------------------------------------------------

def test_the_original_upload_is_not_kept_after_processing(client, monkeypatch):
    class FakeEmbedder:
        async def embed_passages(self, texts):
            return [[0.0] * 384 for _ in texts]

    monkeypatch.setattr(ingest, "embedder", FakeEmbedder())
    import pymupdf

    pdf = pymupdf.open()
    pdf.new_page().insert_text((72, 72), "Some ordinary text for the retention check to read.")
    headers = bearer(signup(client, "retention@example.com"))
    r = client.post("/api/documents", headers=headers, files={"file": ("r.pdf", pdf.tobytes(), "application/pdf")})
    assert client.get(f"/api/documents/{r.json()['id']}", headers=headers).json()["status"] == "ready"
    assert list(Path(settings.upload_dir).glob("*.pdf")) == []


def test_document_and_page_limits(client, monkeypatch):
    import pymupdf

    headers = bearer(signup(client, "limits@example.com"))
    monkeypatch.setattr(settings, "max_pdf_pages", 1)
    pdf = pymupdf.open()
    for _ in range(3):
        pdf.new_page().insert_text((72, 72), "Page with enough readable text to count.")
    r = client.post("/api/documents", headers=headers, files={"file": ("big.pdf", pdf.tobytes(), "application/pdf")})
    doc = client.get(f"/api/documents/{r.json()['id']}", headers=headers).json()
    assert doc["status"] == "failed" and "limit" in doc["error"]

    monkeypatch.setattr(settings, "max_documents_per_user", 1)
    again = client.post("/api/documents", headers=headers, files={"file": ("x.pdf", pdf.tobytes(), "application/pdf")})
    assert again.status_code == 403


def test_encrypted_pdfs_fail_with_a_clear_message(client):
    import pymupdf

    pdf = pymupdf.open()
    pdf.new_page().insert_text((72, 72), "Secret contents that are locked behind a password.")
    locked = pdf.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, owner_pw="owner", user_pw="user")
    headers = bearer(signup(client, "locked@example.com"))
    r = client.post("/api/documents", headers=headers, files={"file": ("locked.pdf", locked, "application/pdf")})
    doc = client.get(f"/api/documents/{r.json()['id']}", headers=headers).json()
    assert doc["status"] == "failed" and "password" in doc["error"]


def test_images_with_a_mismatched_format_or_absurd_size_are_rejected(client, monkeypatch):
    headers = bearer(signup(client, "images@example.com"))
    gif = io.BytesIO()
    Image.new("RGB", (10, 10)).save(gif, format="GIF")
    r = client.post("/api/documents", headers=headers, files={"file": ("a.png", gif.getvalue(), "image/png")})
    assert r.status_code == 415

    monkeypatch.setattr(Image, "MAX_IMAGE_PIXELS", 100)
    big = io.BytesIO()
    Image.new("RGB", (400, 400)).save(big, format="PNG")
    r = client.post("/api/documents", headers=headers, files={"file": ("big.png", big.getvalue(), "image/png")})
    assert r.status_code == 415


# ---- rate limiting ------------------------------------------------------------------------

def make_request(headers=None, host="10.0.0.9"):
    raw = [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()]
    return Request({"type": "http", "headers": raw, "client": (host, 1234), "path": "/x", "method": "GET", "query_string": b""})


def test_client_ip_ignores_forged_headers(monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxy_hops", 1)
    monkeypatch.setattr(settings, "bff_secret", "")
    # a client that prepends its own fake entry cannot choose what the trusted proxy appended
    assert ratelimit.client_ip(make_request({"x-forwarded-for": "1.1.1.1, 203.0.113.7"})) == "203.0.113.7"
    assert ratelimit.client_ip(make_request()) == "10.0.0.9"

    monkeypatch.setattr(settings, "bff_secret", "shared-secret-value-123")
    good = {"x-client-ip": "198.51.100.4", "x-bff-secret": "shared-secret-value-123", "x-forwarded-for": "9.9.9.9"}
    assert ratelimit.client_ip(make_request(good)) == "198.51.100.4"
    forged = {"x-client-ip": "198.51.100.4", "x-bff-secret": "wrong", "x-forwarded-for": "9.9.9.9"}
    assert ratelimit.client_ip(make_request(forged)) == "9.9.9.9"


def test_password_guessing_is_limited_per_account_across_ips(client, monkeypatch):
    monkeypatch.setattr(settings, "login_attempts_per_minute", 3)
    ratelimit.reset()
    codes = []
    for i in range(5):
        r = client.post("/api/auth/login", json={"email": "victim@example.com", "password": "guess-number-%d" % i}, headers={"x-forwarded-for": f"8.8.8.{i}"})
        codes.append(r.status_code)
    assert codes == [401, 401, 401, 429, 429]
    ratelimit.reset()


def test_redis_backed_limits(monkeypatch):
    import fakeredis

    monkeypatch.setattr(ratelimit, "_redis", fakeredis.FakeAsyncRedis())

    async def run():
        outcomes = []
        for _ in range(4):
            try:
                await ratelimit.check("redis-test", 3)
                outcomes.append("ok")
            except Exception as exc:  # noqa: BLE001
                outcomes.append(getattr(exc, "status_code", "err"))
        return outcomes

    assert asyncio.run(run()) == ["ok", "ok", "ok", 429]
    monkeypatch.setattr(ratelimit, "_redis", None)


def test_unreachable_redis_fails_open(monkeypatch):
    class Broken:
        def pipeline(self):
            raise ConnectionError("redis is down")

    monkeypatch.setattr(ratelimit, "_redis", Broken())
    ratelimit.reset()
    asyncio.run(ratelimit.check("fallback-test", 5))  # falls back to memory instead of erroring
    monkeypatch.setattr(ratelimit, "_redis", None)


# ---- headers, health ----------------------------------------------------------------------

def test_security_headers_and_no_store_on_api_responses(client):
    r = client.get("/api/auth/me")
    h = r.headers
    assert h["x-content-type-options"] == "nosniff" and h["x-frame-options"] == "DENY"
    assert h["cache-control"] == "no-store"
    assert "default-src 'none'" in h["content-security-policy"]


def test_cors_allows_only_the_configured_origin(client):
    ok = client.options("/api/auth/login", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:3000"
    bad = client.options("/api/auth/login", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in bad.headers


# ---- migrations ---------------------------------------------------------------------------

def test_migrations_build_exactly_the_schema_the_models_describe(tmp_path):
    """`alembic upgrade head` on an empty database must match the models, so they cannot drift apart."""
    import subprocess
    import sys

    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext
    from sqlalchemy import create_engine

    db = tmp_path / "migrated.db"
    env = {**__import__("os").environ, "DATABASE_URL": f"sqlite+aiosqlite:///{db.as_posix()}"}
    backend = Path(__file__).resolve().parent.parent
    done = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend, env=env, capture_output=True, text=True)
    assert done.returncode == 0, done.stderr

    from docsage.db import Base

    engine = create_engine(f"sqlite:///{db.as_posix()}")
    with engine.connect() as conn:
        diff = compare_metadata(MigrationContext.configure(conn), Base.metadata)
    assert diff == [], diff


def test_registration_requires_accepting_the_terms_and_records_when(client):
    refused = client.post("/api/auth/register", json={"email": "noterms@example.com", "password": PASSWORD})
    assert refused.status_code == 422
    unchecked = client.post("/api/auth/register", json={"email": "noterms@example.com", "password": PASSWORD, "accept_terms": False})
    assert unchecked.status_code == 422
    signup(client, "terms@example.com")

    async def accepted_at():
        async with SessionLocal() as s:
            return (await s.scalar(select(User).where(User.email == "terms@example.com"))).terms_accepted_at

    assert asyncio.run(accepted_at()) is not None

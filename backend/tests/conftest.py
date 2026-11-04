import asyncio
import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="docsage-test-")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_tmp}/test.db"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["AUTO_MIGRATE"] = "false"
os.environ["DEMO_EMAIL"] = ""  # the dev .env may define a demo account; tests start clean
os.environ["DEMO_PASSWORD"] = ""
os.environ["AUTH_RATE_PER_MINUTE"] = "1000"
os.environ["LOGIN_ATTEMPTS_PER_MINUTE"] = "1000"
os.environ["ASK_RATE_PER_MINUTE"] = "1000"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256"
for key in ("GROQ_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY"):
    os.environ[key] = ""

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from docsage.db import init_db  # noqa: E402
from docsage.main import app  # noqa: E402
from docsage.services import search  # noqa: E402


class _NoEmbedder:
    async def embed_query(self, question):
        raise RuntimeError("embeddings disabled in tests")


@pytest.fixture(scope="session")
def client():
    asyncio.run(init_db())
    search.embedder = _NoEmbedder()  # force keyword-only retrieval; no model download
    with TestClient(app) as c:  # runs lifespan too
        yield c


def register(client, email):
    r = client.post("/api/auth/register", json={"email": email, "password": "correct-horse-1", "accept_terms": True})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

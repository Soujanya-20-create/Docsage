import json

from conftest import register


def sse_events(text):
    events = []
    for block in text.strip().split("\n\n"):
        name, data = block.split("\n", 1)
        events.append((name.removeprefix("event: "), json.loads(data.removeprefix("data: "))))
    return events


def test_register_login_and_me(client):
    register(client, "ada@example.com")
    r = client.post("/api/auth/login", json={"email": "ADA@example.com", "password": "correct-horse-1"})
    assert r.status_code == 200
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["email"] == "ada@example.com"


def test_duplicate_email_and_bad_password_are_rejected(client):
    register(client, "dup@example.com")
    again = client.post("/api/auth/register", json={"email": "dup@example.com", "password": "correct-horse-1", "accept_terms": True})
    assert again.status_code == 409
    bad = client.post("/api/auth/login", json={"email": "dup@example.com", "password": "wrong-password"})
    assert bad.status_code == 401


def test_refresh_token_cannot_be_used_as_access_token(client):
    r = client.post("/api/auth/register", json={"email": "tok@example.com", "password": "correct-horse-1", "accept_terms": True})
    refresh = r.json()["refresh_token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {refresh}"}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": refresh}).status_code == 200


def test_protected_routes_need_a_token(client):
    assert client.get("/api/documents").status_code == 401
    assert client.get("/api/chats").status_code == 401


def test_unsupported_upload_is_rejected(client):
    headers = register(client, "up@example.com")
    r = client.post("/api/documents", headers=headers, files={"file": ("notes.txt", b"hello", "text/plain")})
    assert r.status_code == 415
    fake_pdf = client.post("/api/documents", headers=headers, files={"file": ("x.pdf", b"not a pdf", "application/pdf")})
    assert fake_pdf.status_code == 415


def test_users_cannot_see_each_others_chats(client):
    alice = register(client, "alice@example.com")
    bob = register(client, "bob@example.com")
    chat = client.post("/api/chats", headers=alice, json={}).json()
    assert client.get(f"/api/chats/{chat['id']}/messages", headers=bob).status_code == 404
    assert client.delete(f"/api/chats/{chat['id']}", headers=bob).status_code == 404
    assert client.get("/api/chats", headers=bob).json() == []


def test_asking_with_no_documents_says_so_and_is_saved(client):
    headers = register(client, "ask@example.com")
    chat = client.post("/api/chats", headers=headers, json={}).json()
    r = client.post(f"/api/chats/{chat['id']}/ask", headers=headers, json={"question": "What is the refund policy?"})
    names = [n for n, _ in sse_events(r.text)]
    assert names == ["sources", "token", "done"]
    messages = client.get(f"/api/chats/{chat['id']}/messages", headers=headers).json()
    assert [m["role"] for m in messages] == ["user", "assistant"]
    assert client.get("/api/chats", headers=headers).json()[0]["title"].startswith("What is the refund")

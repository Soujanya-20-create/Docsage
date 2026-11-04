import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from .config import settings

ALGORITHM = "HS256"
# Lets us spend the same time checking a password for an unknown email as for a real one,
# so response time does not reveal which emails have accounts.
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password", bcrypt.gensalt()).decode()

COMMON_PASSWORDS = {
    "password", "password1", "password12", "password123", "passw0rd123", "1234567890", "12345678901",
    "qwertyuiop", "qwerty12345", "iloveyou123", "letmein1234", "welcome1234", "admin12345", "abc1234567",
    "1q2w3e4r5t", "0123456789", "changeme123", "docsage123",
}


def password_problem(password: str, email: str = "") -> str | None:
    """Return why a password is unacceptable, or None. Length matters more than character mix."""
    if len(password) < 10:
        return "Use at least 10 characters."
    if password.lower() in COMMON_PASSWORDS or len(set(password)) < 4:
        return "That password is too easy to guess."
    if email and password.lower() == email.lower():
        return "The password must not be your email address."
    return None


def hash_password(password: str) -> str:
    # bcrypt only reads the first 72 bytes
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str | None) -> bool:
    """Check a password. Pass None for an unknown user: it still costs a full bcrypt check, then fails."""
    try:
        matches = bcrypt.checkpw(password.encode()[:72], (hashed or _DUMMY_HASH).encode())
    except ValueError:
        return False
    return matches and hashed is not None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _encode(payload: dict, lifetime: timedelta) -> str:
    return jwt.encode({**payload, "exp": _now() + lifetime, "iat": _now()}, settings.secret_key, algorithm=ALGORITHM)


def _decode(token: str, kind: str) -> dict | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
    return payload if payload.get("type") == kind else None


def create_access_token(user_id: int) -> str:
    return _encode({"sub": str(user_id), "type": "access"}, timedelta(minutes=settings.access_token_minutes))


def new_jti() -> str:
    return secrets.token_hex(16)


def create_refresh_token(user_id: int, jti: str) -> str:
    return _encode({"sub": str(user_id), "type": "refresh", "jti": jti}, timedelta(days=settings.refresh_token_days))


def decode_access_token(token: str) -> int | None:
    payload = _decode(token, "access")
    try:
        return int(payload["sub"]) if payload else None
    except (KeyError, ValueError):
        return None


def decode_refresh_token(token: str) -> tuple[int, str] | None:
    payload = _decode(token, "refresh")
    try:
        return (int(payload["sub"]), str(payload["jti"])) if payload else None
    except (KeyError, ValueError):
        return None

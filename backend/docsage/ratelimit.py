"""Rate limiting: in memory by default, Redis when REDIS_URL is set (needed for several API instances).

Redis errors fail open (with a warning) so a cache outage does not take sign-in down.
"""
import hmac
import logging
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

from .config import settings

log = logging.getLogger(__name__)
WINDOW = 60

_hits: dict[str, deque[float]] = defaultdict(deque)
_redis = None


def _redis_client():
    global _redis
    if _redis is None and settings.redis_url:
        import redis.asyncio as aioredis

        _redis = aioredis.from_url(settings.redis_url, socket_timeout=2, socket_connect_timeout=2)
    return _redis


def _too_many(retry: int) -> HTTPException:
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        f"Too many requests. Try again in {retry} seconds.",
        headers={"Retry-After": str(retry)},
    )


async def check(key: str, limit: int) -> None:
    """Count one request against `key`; raise 429 once it has been used `limit` times in the window."""
    client = _redis_client()
    if client is not None:
        try:
            bucket = f"docsage:rl:{key}:{int(time.time() // WINDOW)}"
            pipe = client.pipeline()
            pipe.incr(bucket)
            pipe.expire(bucket, WINDOW * 2)
            count = (await pipe.execute())[0]
            if count > limit:
                raise _too_many(WINDOW - int(time.time() % WINDOW) or 1)
            return
        except HTTPException:
            raise
        except Exception:  # noqa: BLE001
            log.warning("Redis rate limiter unavailable; using in-memory limits", exc_info=True)

    now = time.monotonic()
    hits = _hits[key]
    while hits and now - hits[0] > WINDOW:
        hits.popleft()
    if len(hits) >= limit:
        raise _too_many(max(1, int(WINDOW - (now - hits[0]))))
    hits.append(now)


def client_ip(request: Request) -> str:
    """The caller's IP, without trusting headers a client can forge.

    1. Our own Next.js server vouches for the browser IP with the shared BFF secret.
    2. Otherwise take the entry the nearest trusted proxy appended to X-Forwarded-For.
    """
    secret = settings.bff_secret
    forwarded_by_bff = request.headers.get("x-client-ip")
    if secret and forwarded_by_bff and hmac.compare_digest(request.headers.get("x-bff-secret", ""), secret):
        return forwarded_by_bff.strip()[:64]

    peer = request.client.host if request.client else "unknown"
    hops = settings.trusted_proxy_hops
    chain = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
    if hops > 0 and len(chain) >= hops:
        return chain[-hops][:64]
    return peer


async def limit_auth(request: Request) -> None:
    await check(f"auth:{client_ip(request)}:{request.url.path}", settings.auth_rate_per_minute)


async def check_ask(user_id: int) -> None:
    await check(f"ask:{user_id}", settings.ask_rate_per_minute)


async def check_login_account(email: str) -> None:
    """Per-account brake on password guessing, whatever IPs the guesses come from."""
    await check(f"login-account:{email.lower()}", settings.login_attempts_per_minute)


def reset() -> None:
    _hits.clear()

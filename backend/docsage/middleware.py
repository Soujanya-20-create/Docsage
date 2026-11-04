"""Security headers on every response, added as plain ASGI so streamed (SSE) answers are untouched."""
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from .config import settings

HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"permissions-policy", b"camera=(), microphone=(), geolocation=()"),
    (b"cross-origin-resource-policy", b"same-site"),
    # This service only returns JSON and event streams, so nothing should ever load or run from it.
    (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'"),
]
HSTS = (b"strict-transport-security", b"max-age=63072000; includeSubDomains")


class SecurityHeadersMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        docs = path.startswith(("/docs", "/redoc", "/openapi.json"))

        async def send_with_headers(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = [(k, v) for k, v in message.get("headers", []) if k.lower() != b"content-security-policy" or not docs]
                present = {k.lower() for k, _ in headers}
                extra = [h for h in HEADERS if h[0] not in present and not (docs and h[0] == b"content-security-policy")]
                if settings.is_production:
                    extra.append(HSTS)
                if path.startswith("/api"):
                    extra.append((b"cache-control", b"no-store"))  # tokens and private data must not be cached
                message = {**message, "headers": headers + extra}
            await send(message)

        await self.app(scope, receive, send_with_headers)

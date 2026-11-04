from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_SECRET = "dev-only-secret-change-me-before-deploying"


def normalize_database_url(url: str) -> str:
    """Accept the URLs hosting providers hand out and return one SQLAlchemy's async driver understands.

    Render, Railway, Neon and Supabase give `postgres://` or `postgresql://` URLs, sometimes with
    libpq-only query options such as `sslmode`. asyncpg wants `postgresql+asyncpg://` and `ssl=`.
    """
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            url = "postgresql+asyncpg://" + url[len(prefix):]
    if not url.startswith("postgresql+asyncpg://"):
        return url

    parts = urlsplit(url)
    query = []
    for key, value in parse_qsl(parts.query, keep_blank_values=True):
        if key == "sslmode":
            query.append(("ssl", value))
        elif key not in ("channel_binding", "gssencmode"):
            query.append((key, value))
    return urlunsplit(parts._replace(query=urlencode(query)))


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "DocSage"
    environment: str = "development"  # "production" turns on strict startup checks
    database_url: str = "sqlite+aiosqlite:///./docsage.db"
    secret_key: str = DEV_SECRET
    access_token_minutes: int = 15  # short: a rotating, server-side refresh token keeps users signed in
    refresh_token_days: int = 7
    otp_minutes: int = 10  # how long an emailed code works
    otp_resend_seconds: int = 60  # wait before another code can be sent
    otp_max_attempts: int = 5  # wrong guesses before the code is burned

    # Browser origins allowed to call the API. Comma separated, e.g. your Vercel domain.
    frontend_url: str = "http://localhost:3000"
    # Optional regex for extra origins such as Vercel preview deployments:
    # https://docsage-.*\.vercel\.app
    cors_origin_regex: str = ""

    upload_dir: str = "./uploads"
    max_upload_mb: int = 20
    max_documents_per_user: int = 50
    max_storage_mb_per_user: int = 200
    max_pdf_pages: int = 300
    max_image_pixels: int = 50_000_000  # guards against decompression bombs

    # Run `alembic upgrade head` when the API starts. Turn off if you run migrations yourself.
    auto_migrate: bool = True

    # The Next.js server forwards the real browser IP in X-Client-IP and proves it with this shared
    # secret, so IP rate limits see users and not the Vercel server. Set the same value on both sides.
    bff_secret: str = ""
    # Proxies in front of the API that append to X-Forwarded-For (Render and Railway: 1).
    trusted_proxy_hops: int = 1
    # Optional shared rate-limit store, needed only when running more than one API instance.
    redis_url: str = ""

    # Email for password resets and verification: set RESEND_API_KEY, or the SMTP_* values.
    resend_api_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = "DocSage <onboarding@resend.dev>"
    require_email_verification: bool = False

    # Optional demo account created on startup (development only). Set both to enable; leave empty to disable.
    demo_email: str = ""
    demo_password: str = ""
    demo_name: str = "Demo User"

    sentry_dsn: str = ""

    # LLM providers are tried in this order; any one key is enough.
    llm_provider_order: str = "groq,cerebras,openrouter"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    cerebras_api_key: str = ""
    cerebras_model: str = "gpt-oss-120b"
    openrouter_api_key: str = ""
    openrouter_model: str = "nvidia/nemotron-3.5-lightning:free"
    # Tried in order to read images when Tesseract is not installed.
    openrouter_vision_models: str = (
        "google/gemma-4-31b-it:free,nvidia/nemotron-3.5-super-vl:free,google/gemma-4-26b-a4b-it:free"
    )

    qdrant_mode: str = "memory"  # "memory" or "http"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""  # needed for Qdrant Cloud
    qdrant_collection: str = "docsage_chunks"
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    top_k: int = 5
    min_score: float = 0.25
    max_context_chars: int = 12000
    ocr_enabled: bool = True
    ocr_max_pages: int = 25
    ocr_languages: str = "eng"  # Tesseract language codes, e.g. "eng+deu"
    tesseract_cmd: str = ""  # path to the binary if it is not on PATH

    # Requests allowed per minute (per client IP for auth, per user for questions).
    auth_rate_per_minute: int = 30  # per client IP and endpoint
    login_attempts_per_minute: int = 8  # per account, whatever the IP
    ask_rate_per_minute: int = 30

    @model_validator(mode="after")
    def _check(self) -> "Settings":
        self.database_url = normalize_database_url(self.database_url)
        if self.require_email_verification and not self.email_configured:
            raise ValueError("REQUIRE_EMAIL_VERIFICATION needs RESEND_API_KEY or SMTP_HOST to be set.")
        if self.is_production:
            if self.secret_key == DEV_SECRET or len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be set to a random value of at least 32 characters in production.")
        return self

    @property
    def email_configured(self) -> bool:
        return bool(self.resend_api_key or self.smtp_host)

    @property
    def app_url(self) -> str:
        """Where links in emails point: the first allowed frontend origin."""
        return self.cors_origins[0] if self.cors_origins else "http://localhost:3000"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.frontend_url.split(",") if o.strip()]

    @property
    def vision_models(self) -> list[str]:
        return [m.strip() for m in self.openrouter_vision_models.split(",") if m.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

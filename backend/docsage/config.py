from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "DocSage"
    database_url: str = "sqlite+aiosqlite:///./docsage.db"
    secret_key: str = "dev-only-secret-change-me-before-deploying"
    access_token_minutes: int = 30
    refresh_token_days: int = 7
    frontend_url: str = "http://localhost:3000"

    upload_dir: str = "./uploads"
    max_upload_mb: int = 20

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
    qdrant_collection: str = "docsage_chunks"
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    top_k: int = 5
    min_score: float = 0.25
    max_context_chars: int = 12000
    ocr_enabled: bool = True
    ocr_max_pages: int = 25

    @property
    def vision_models(self) -> list[str]:
        return [m.strip() for m in self.openrouter_vision_models.split(",") if m.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

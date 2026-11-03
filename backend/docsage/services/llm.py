"""Streaming chat completions across several OpenAI-compatible providers.

Providers are tried in LLM_PROVIDER_ORDER. A provider that fails is skipped for a
cooldown period. Failover only happens before the first token has been sent: if a
stream dies midway, the error is raised instead of splicing in another model's text.
"""
import json
import logging
import time
from typing import AsyncIterator

import httpx

from ..config import settings

log = logging.getLogger(__name__)

COOLDOWN_SECONDS = 60
ENDPOINTS = {
    "groq": "https://api.groq.com/openai/v1",
    "cerebras": "https://api.cerebras.ai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
}

_cooldown_until: dict[str, float] = {}


class LLMError(Exception):
    pass


def _credentials(name: str) -> tuple[str, str]:
    return getattr(settings, f"{name}_api_key"), getattr(settings, f"{name}_model")


def configured_providers() -> list[str]:
    names = [n.strip() for n in settings.llm_provider_order.split(",") if n.strip()]
    return [n for n in names if n in ENDPOINTS and _credentials(n)[0]]


async def _stream_one(name: str, messages: list[dict]) -> AsyncIterator[str]:
    key, model = _credentials(name)
    headers = {"Authorization": f"Bearer {key}"}
    body = {"model": model, "messages": messages, "stream": True, "temperature": 0.2}
    async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
        async with client.stream("POST", f"{ENDPOINTS[name]}/chat/completions", headers=headers, json=body) as resp:
            if resp.status_code >= 400:
                detail = (await resp.aread()).decode(errors="replace")[:300]
                raise LLMError(f"{name}: HTTP {resp.status_code} {detail}")
            async for line in resp.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    return
                try:
                    delta = (json.loads(data).get("choices") or [{}])[0].get("delta") or {}
                except json.JSONDecodeError:
                    continue
                if delta.get("content"):
                    yield delta["content"]


async def stream_chat(messages: list[dict]) -> AsyncIterator[str]:
    providers = configured_providers()
    if not providers:
        raise LLMError("No LLM provider configured. Set GROQ_API_KEY, CEREBRAS_API_KEY or OPENROUTER_API_KEY.")

    now = time.monotonic()
    ready = [p for p in providers if _cooldown_until.get(p, 0) <= now]
    failures: list[str] = []

    for name in ready or providers:  # if everything is cooling down, try anyway
        started = False
        try:
            async for token in _stream_one(name, messages):
                started = True
                yield token
            return
        except Exception as exc:  # noqa: BLE001 - any provider failure triggers failover
            if started:
                raise LLMError(f"{name} stopped mid-answer: {exc}") from exc
            _cooldown_until[name] = time.monotonic() + COOLDOWN_SECONDS
            failures.append(f"{name}: {exc}")
            log.warning("LLM provider %s failed, trying next: %s", name, exc)

    raise LLMError("All LLM providers failed. " + " | ".join(failures))

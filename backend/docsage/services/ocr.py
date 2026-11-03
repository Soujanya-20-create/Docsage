"""Read text from images: Tesseract when installed, else an OpenRouter vision model."""
import asyncio
import base64
import io
import logging
from functools import lru_cache

import httpx
from PIL import Image

from ..config import settings

log = logging.getLogger(__name__)

MAX_SIDE = 1600
PROMPT = "Transcribe all text in this image exactly as written. Output only the text, no commentary."


class OCRError(Exception):
    pass


@lru_cache
def tesseract_available() -> bool:
    try:
        import pytesseract

        pytesseract.get_tesseract_version()
        return True
    except Exception:  # noqa: BLE001 - missing package or missing binary
        return False


def _normalise(data: bytes) -> bytes:
    """Re-encode as PNG, downscaled so uploads to vision models stay small."""
    img = Image.open(io.BytesIO(data))
    img = img.convert("RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE))
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def _tesseract(data: bytes) -> str:
    import pytesseract

    return pytesseract.image_to_string(Image.open(io.BytesIO(data)))


async def _vision(data: bytes) -> str:
    if not settings.openrouter_api_key:
        raise OCRError("OCR needs Tesseract installed or OPENROUTER_API_KEY set for a vision model.")
    url = "data:image/png;base64," + base64.b64encode(data).decode()
    content = [{"type": "text", "text": PROMPT}, {"type": "image_url", "image_url": {"url": url}}]
    errors: list[str] = []
    async with httpx.AsyncClient(timeout=httpx.Timeout(90.0)) as client:
        for model in settings.vision_models:
            try:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.openrouter_api_key}"},
                    json={"model": model, "messages": [{"role": "user", "content": content}]},
                )
                resp.raise_for_status()
                text = (resp.json()["choices"][0]["message"].get("content") or "").strip()
                if text:
                    return text
                errors.append(f"{model}: empty answer")
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{model}: {exc}")
    raise OCRError("All vision models failed. " + " | ".join(errors))


async def image_to_text(data: bytes) -> str:
    png = await asyncio.to_thread(_normalise, data)
    if tesseract_available():
        return await asyncio.to_thread(_tesseract, png)
    return await _vision(png)

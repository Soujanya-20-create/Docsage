"""Turn an uploaded file into (page_number, text) pairs."""
import asyncio
from pathlib import Path

import pymupdf

from ..config import settings
from .ocr import image_to_text

MIN_TEXT_CHARS = 20  # fewer characters than this on a page means it is probably a scan


def _read_pdf(path: Path) -> tuple[list[tuple[int, str]], dict[int, bytes]]:
    pages: list[tuple[int, str]] = []
    scans: dict[int, bytes] = {}
    with pymupdf.open(path) as pdf:
        for number, page in enumerate(pdf, start=1):
            text = page.get_text().strip()
            pages.append((number, text))
            if len(text) < MIN_TEXT_CHARS and settings.ocr_enabled and len(scans) < settings.ocr_max_pages:
                scans[number] = page.get_pixmap(dpi=150).tobytes("png")
    return pages, scans


async def extract_pages(path: Path, kind: str) -> list[tuple[int, str]]:
    if kind == "image":
        if not settings.ocr_enabled:
            raise ValueError("OCR is disabled, so images cannot be read.")
        return [(1, await image_to_text(path.read_bytes()))]

    pages, scans = await asyncio.to_thread(_read_pdf, path)
    if scans:
        ocr_text = {n: await image_to_text(png) for n, png in scans.items()}
        pages = [(n, ocr_text.get(n) or text) for n, text in pages]
    return pages

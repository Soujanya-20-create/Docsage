import re

CHUNK_SIZE = 900
CHUNK_OVERLAP = 150


def _tail(text: str, overlap: int) -> str:
    """Last `overlap` characters of text, trimmed to start on a word boundary."""
    if overlap <= 0 or len(text) <= overlap:
        return text if overlap > 0 else ""
    piece = text[-overlap:]
    space = piece.find(" ")
    return piece[space + 1:] if space != -1 else piece


def split_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into paragraph-aware chunks of at most `size` characters.

    Consecutive chunks share roughly `overlap` characters so a sentence cut at a
    boundary still appears whole in one of them.
    """
    chunks: list[str] = []
    current = ""

    def flush() -> None:
        nonlocal current
        if current.strip():
            chunks.append(current.strip())
        current = ""

    for raw in re.split(r"\n\s*\n", text):
        para = " ".join(raw.split())
        if not para:
            continue

        if len(para) > size:  # one huge paragraph: slide a window over it
            flush()
            step = max(size - overlap, 1)
            for start in range(0, len(para), step):
                chunks.append(para[start:start + size])
                if start + size >= len(para):
                    break
            continue

        if current and len(current) + 1 + len(para) > size:
            carry = _tail(current, overlap)
            flush()
            current = carry if len(carry) + 1 + len(para) <= size else ""
        current = f"{current} {para}".strip()

    flush()
    return chunks

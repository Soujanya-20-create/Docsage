from ..config import settings

SYSTEM = (
    "You are DocSage, an assistant that answers questions using only the numbered excerpts "
    "from the user's documents. Cite the excerpts you rely on as [1], [2] and so on. "
    "If the excerpts do not contain the answer, say so plainly instead of guessing."
)

EXCERPT_CHARS = 240


def build_messages(question: str, sources: list[dict], history: list[dict]) -> list[dict]:
    parts: list[str] = []
    used = 0
    for number, src in enumerate(sources, start=1):
        block = f"[{number}] {src['filename']}, page {src['page']}\n{src['text']}"
        if used + len(block) > settings.max_context_chars:
            break
        parts.append(block)
        used += len(block)

    context = "\n\n".join(parts)
    return [
        {"role": "system", "content": SYSTEM},
        *history,
        {"role": "user", "content": f"Excerpts:\n\n{context}\n\nQuestion: {question}"},
    ]


def citations(sources: list[dict]) -> list[dict]:
    """The compact source records stored with an answer and shown in the UI."""
    return [
        {
            "n": number,
            "document_id": s["document_id"],
            "filename": s["filename"],
            "page": s["page"],
            "excerpt": s["text"][:EXCERPT_CHARS],
        }
        for number, s in enumerate(sources, start=1)
    ]

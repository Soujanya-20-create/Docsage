"""Verify the API keys in .env: `python -m docsage.check_llm`.

Sends one tiny prompt to every provider that has a key and prints whether it answered.
"""
import asyncio
import time

from .config import settings
from .services import llm


async def main() -> int:
    order = [n.strip() for n in settings.llm_provider_order.split(",") if n.strip()]
    print(f"Provider order: {' -> '.join(order)}\n")
    messages = [{"role": "user", "content": "Reply with the single word: OK"}]
    working = 0
    for name in order:
        if name not in llm.ENDPOINTS:
            print(f"  {name:<11} unknown provider name")
            continue
        key, model = llm._credentials(name)
        if not key:
            print(f"  {name:<11} no key set (skipped)")
            continue
        started = time.monotonic()
        try:
            reply = "".join([t async for t in llm._stream_one(name, messages)]).strip()
            print(f"  {name:<11} OK   {model}  {time.monotonic() - started:.1f}s  reply={reply[:30]!r}")
            working += 1
        except Exception as exc:  # noqa: BLE001
            print(f"  {name:<11} FAIL {model}  {str(exc)[:200]}")
    print(f"\n{working} provider(s) working.")
    return 0 if working else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))

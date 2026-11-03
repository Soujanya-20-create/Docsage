import asyncio

import pytest

from docsage.services import llm


@pytest.fixture(autouse=True)
def reset(monkeypatch):
    llm._cooldown_until.clear()
    monkeypatch.setattr(llm, "configured_providers", lambda: ["groq", "cerebras"])


def collect(messages=None):
    async def run():
        return [t async for t in llm.stream_chat(messages or [])]

    return asyncio.run(run())


def fake(behaviour):
    async def _stream_one(name, messages):
        for item in behaviour[name]:
            if isinstance(item, Exception):
                raise item
            yield item

    return _stream_one


def test_failing_provider_falls_through_to_next(monkeypatch):
    monkeypatch.setattr(llm, "_stream_one", fake({"groq": [llm.LLMError("rate limited")], "cerebras": ["hi", "!"]}))
    assert collect() == ["hi", "!"]


def test_failed_provider_is_skipped_during_cooldown(monkeypatch):
    calls = []
    behaviour = {"groq": [llm.LLMError("boom")], "cerebras": ["ok"]}
    inner = fake(behaviour)

    async def spy(name, messages):
        calls.append(name)
        async for t in inner(name, messages):
            yield t

    monkeypatch.setattr(llm, "_stream_one", spy)
    collect()
    collect()
    assert calls == ["groq", "cerebras", "cerebras"]


def test_stream_dying_midway_does_not_switch_provider(monkeypatch):
    monkeypatch.setattr(llm, "_stream_one", fake({"groq": ["partial", RuntimeError("cut")], "cerebras": ["other"]}))
    with pytest.raises(llm.LLMError, match="mid-answer"):
        collect()


def test_all_providers_failing_lists_each_reason(monkeypatch):
    monkeypatch.setattr(llm, "_stream_one", fake({"groq": [llm.LLMError("a")], "cerebras": [llm.LLMError("b")]}))
    with pytest.raises(llm.LLMError) as err:
        collect()
    assert "groq" in str(err.value) and "cerebras" in str(err.value)


def test_no_provider_configured_names_the_env_vars(monkeypatch):
    monkeypatch.setattr(llm, "configured_providers", lambda: [])
    with pytest.raises(llm.LLMError, match="GROQ_API_KEY"):
        collect()

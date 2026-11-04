from docsage.services.chunking import split_text
from docsage.services.search import rrf, tokenize


def test_short_text_is_one_chunk():
    assert split_text("Hello world.") == ["Hello world."]


def test_empty_text_has_no_chunks():
    assert split_text("  \n\n  ") == []


def test_chunks_respect_size_and_keep_all_words():
    text = "\n\n".join(f"Paragraph {i} " + "word " * 60 for i in range(12))
    chunks = split_text(text, size=300, overlap=50)
    assert len(chunks) > 1
    assert all(len(c) <= 300 for c in chunks)
    joined = " ".join(chunks)
    assert all(f"Paragraph {i} " in joined for i in range(12))


def test_consecutive_chunks_overlap():
    text = "\n\n".join(f"sentence number {i} is here." for i in range(40))
    a, b, *_ = split_text(text, size=200, overlap=60)
    assert set(a.split()[-3:]) & set(b.split()[:8])


def test_one_huge_paragraph_is_windowed():
    chunks = split_text("x" * 2500, size=1000, overlap=100)
    assert all(len(c) <= 1000 for c in chunks)
    assert sum(len(c) for c in chunks) >= 2500


def test_rrf_rewards_agreement_between_rankers():
    fused = [i for i, _ in rrf([[1, 2, 3], [3, 1, 4]])]
    assert fused[:2] == [1, 3]  # both appear in both lists
    assert set(fused) == {1, 2, 3, 4}


def test_tokenize_lowercases_and_drops_punctuation():
    assert tokenize("Hello, World-42!") == ["hello", "world", "42"]


def test_keyword_search_works_on_a_single_chunk(client):
    """Regression: BM25Okapi scored every word in a one-chunk collection as <= 0 and found nothing."""
    import asyncio

    from docsage.db import SessionLocal
    from docsage.models import Chunk
    from docsage.services.search import _KeywordIndex

    async def run():
        async with SessionLocal() as s:
            doc_user = 987
            s.add(Chunk(document_id=1, user_id=doc_user, page=1, position=0, text="The sacred fruit of Atlantis is the blue mango."))
            await s.commit()
            index = _KeywordIndex()
            hit = await index.top(s, doc_user, "sacred fruit of Atlantis", None, 5)
            miss = await index.top(s, doc_user, "quarterly revenue", None, 5)
            return hit, miss

    hit, miss = asyncio.run(run())
    assert len(hit) == 1 and miss == []

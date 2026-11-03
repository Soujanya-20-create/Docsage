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

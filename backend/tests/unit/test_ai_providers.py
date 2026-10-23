import pytest
from backend.app.ai.providers.bge_embeddings import BGEEmbeddingProvider
from backend.app.ai.providers.cross_encoder_reranker import CrossEncoderReranker


@pytest.mark.asyncio
async def test_bge_embeddings():
    provider = BGEEmbeddingProvider()
    assert provider.dimension() == 384

    # Single text embedding
    vec = await provider.embed_text("DeepSeek reasoning model test time compute")
    assert len(vec) == 384
    assert isinstance(vec[0], float)

    # Batch embedding
    batch_vecs = await provider.embed_documents(
        ["Attention is all you need", "Retrieval augmented generation"]
    )
    assert len(batch_vecs) == 2
    assert len(batch_vecs[0]) == 384

    # Health check
    healthy = await provider.health_check()
    assert healthy is True


@pytest.mark.asyncio
async def test_cross_encoder_reranker():
    reranker = CrossEncoderReranker()
    query = "transformer architecture"
    docs = [
        "A recipe for chocolate chip cookies with sugar and butter.",
        "Attention mechanisms in transformer neural networks for sequence modeling.",
        "Modern deep learning uses multi-head self-attention transformers.",
    ]

    scores = await reranker.score_pairs(query, docs)
    assert len(scores) == 3
    # Both transformer docs should score higher than the cookie recipe
    assert scores[1] > scores[0]
    assert scores[2] > scores[0]

    # Reranking order permutation
    indices = await reranker.rerank(query, docs)
    assert len(indices) == 3
    # Cookie recipe (index 0) should be ranked last
    assert indices[-1] == 0

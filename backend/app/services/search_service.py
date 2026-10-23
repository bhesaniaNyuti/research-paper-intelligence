import logging
from typing import Dict, List, Optional
from rank_bm25 import BM25Okapi

from backend.app.ai.providers.bge_embeddings import BGEEmbeddingProvider
from backend.app.ai.providers.cross_encoder_reranker import CrossEncoderReranker
from backend.app.schemas.paper import PaperCreate, PaperOut, SearchQuery, SearchResponse
from backend.app.services.academic_client import academic_client
from backend.app.services.vector_store import vector_store

logger = logging.getLogger(__name__)


class SearchService:
    """
    Hybrid Search Engine for ResearchMind AI 2.0.
    Combines dense BGE embeddings, BM25 lexical matching, live arXiv retrieval,
    and neural Cross-Encoder reranking.
    """

    def __init__(self) -> None:
        self.embedding_provider = BGEEmbeddingProvider()
        self.reranker = CrossEncoderReranker()

    async def search(self, query_params: SearchQuery) -> SearchResponse:
        query_text = query_params.query.strip()
        limit = query_params.limit
        hybrid_weight = query_params.hybrid_weight

        # 1. Generate query embedding
        query_vector = await self.embedding_provider.embed_text(query_text)

        # 2. Search local vector database
        local_candidates = await vector_store.search_vectors(
            query_vector=query_vector,
            limit=max(limit * 2, 20),
        )

        candidates: List[PaperOut] = []
        candidates_by_id: Dict[str, PaperOut] = {}

        # 2. Dynamic Live Ingestion: Search global academic sources (OpenAlex + arXiv) for the user's specific query
        if query_params.fetch_live:
            try:
                live_papers: List[PaperCreate] = await academic_client.search_academic(
                    query=query_text,
                    limit=15,
                    year_filter=query_params.year_filter,
                    journal_filter=query_params.journal_filter,
                )

                if live_papers:
                    paper_texts = [f"{p.title}\n{p.abstract}" for p in live_papers]
                    embeddings = await self.embedding_provider.embed_documents(paper_texts)
                    await vector_store.upsert_papers(live_papers, embeddings)

                    for paper, emb in zip(live_papers, embeddings):
                        if paper.id not in candidates_by_id:
                            dot_prod = sum(a * b for a, b in zip(query_vector, emb))
                            out_paper = PaperOut(
                                **paper.model_dump(),
                                semantic_score=round(max(0.0, min(1.0, float(dot_prod))), 4),
                            )
                            candidates_by_id[paper.id] = out_paper
                            candidates.append(out_paper)
            except Exception as e:
                logger.error(f"Error fetching live academic papers: {e}")

        # 3. Add relevant local candidates from Qdrant (filtered by query relevance)
        q_tokens = [t.lower() for t in query_text.split() if len(t) > 2]
        for p in local_candidates:
            if p.id not in candidates_by_id:
                # Discard local papers that have zero topical relevance to this query
                has_keyword_match = any(
                    tok in p.title.lower() or tok in p.abstract.lower() for tok in q_tokens
                )
                if has_keyword_match or len(candidates) < 3:
                    candidates_by_id[p.id] = p
                    candidates.append(p)

        # Apply Year Filter if specified
        if query_params.year_filter:
            yf = query_params.year_filter.lower().strip()
            if yf == "last_2_years":
                candidates = [p for p in candidates if p.year and p.year >= 2024]
            elif yf == "last_5_years":
                candidates = [p for p in candidates if p.year and p.year >= 2021]
            elif yf.isdigit():
                target_year = int(yf)
                candidates = [p for p in candidates if p.year == target_year]

        # Apply Journal / Source Filter if specified
        if query_params.journal_filter:
            jf = query_params.journal_filter.lower().strip()
            if jf not in ["all", "any"]:
                candidates = [
                    p
                    for p in candidates
                    if jf in p.source.lower()
                    or any(jf in c.lower() for c in p.categories)
                ]

        if not candidates:
            return SearchResponse(query=query_text, total=0, results=[], source_distribution={})

        # 4. BM25 Lexical Scoring for Hybrid Precision
        tokenized_corpus = [
            f"{p.title} {p.abstract} {' '.join(p.authors)}".lower().split()
            for p in candidates
        ]
        bm25 = BM25Okapi(tokenized_corpus)
        query_tokens = query_text.lower().split()
        bm25_raw_scores = bm25.get_scores(query_tokens)

        # Normalize BM25 scores between 0.0 and 1.0
        max_bm25 = max(bm25_raw_scores) if len(bm25_raw_scores) > 0 else 0.0
        bm25_normalized = [
            (score / max_bm25) if max_bm25 > 0 else 0.0 for score in bm25_raw_scores
        ]

        # Combine Hybrid Score
        scored_candidates = []
        for i, paper in enumerate(candidates):
            dense_score = paper.semantic_score or 0.5
            lexical_score = bm25_normalized[i]
            hybrid_score = (hybrid_weight * dense_score) + ((1.0 - hybrid_weight) * lexical_score)
            scored_candidates.append((hybrid_score, paper))

        # Sort by hybrid score descending
        scored_candidates.sort(key=lambda x: x[0], reverse=True)
        top_candidates = [item[1] for item in scored_candidates[: max(limit * 2, 15)]]

        # 5. Cross-Encoder Reranking
        final_results: List[PaperOut] = []
        if query_params.use_reranker and len(top_candidates) >= 1:
            doc_texts = [f"{p.title}. {p.abstract}" for p in top_candidates]
            rerank_scores = await self.reranker.score_pairs(query_text, doc_texts)

            for paper, r_score in zip(top_candidates, rerank_scores):
                paper.rerank_score = round(float(r_score), 4)

            # Sort by rerank score descending
            top_candidates.sort(key=lambda p: (p.rerank_score or 0.0), reverse=True)
            final_results = top_candidates[:limit]
        else:
            final_results = top_candidates[:limit]

        # Source distribution statistics
        source_dist: Dict[str, int] = {}
        for p in final_results:
            source_dist[p.source] = source_dist.get(p.source, 0) + 1

        return SearchResponse(
            query=query_text,
            total=len(final_results),
            results=final_results,
            source_distribution=source_dist,
        )

    async def get_paper(self, paper_id: str) -> Optional[PaperOut]:
        return await vector_store.get_paper_by_id(paper_id)


search_service = SearchService()

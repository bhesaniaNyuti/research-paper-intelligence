import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.paper import PaperCreate, PaperOut, SearchQuery, SearchResponse
from backend.app.services.search_service import search_service
from backend.app.services.vector_store import vector_store

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Search & Retrieval"])


@router.post(
    "/search",
    response_model=SearchResponse,
    summary="Hybrid Academic Search",
    description="Search academic papers using dense vector similarity, BM25 lexical ranking, live arXiv retrieval, and cross-encoder reranking.",
)
async def hybrid_search(search_query: SearchQuery) -> SearchResponse:
    try:
        return await search_service.search(search_query)
    except Exception as e:
        logger.error(f"Search endpoint error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while executing search: {str(e)}",
        )


@router.get(
    "/papers/{paper_id}",
    response_model=PaperOut,
    summary="Get Paper Details",
    description="Retrieve a single paper by its unique identifier.",
)
async def get_paper(paper_id: str) -> PaperOut:
    paper = await search_service.get_paper(paper_id)
    if not paper:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper with ID '{paper_id}' not found in index.",
        )
    return paper


@router.post(
    "/papers/ingest",
    status_code=status.HTTP_201_CREATED,
    summary="Ingest Custom Paper",
    description="Manually ingest a paper into the vector database.",
)
async def ingest_paper(paper: PaperCreate) -> dict:
    try:
        text = f"{paper.title}\n{paper.abstract}"
        embedding = await search_service.embedding_provider.embed_text(text)
        await vector_store.upsert_papers([paper], [embedding])
        return {"status": "success", "id": paper.id, "message": "Paper successfully indexed."}
    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest paper: {str(e)}",
        )

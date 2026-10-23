import logging
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.schemas.paper import (
    EvidenceResponse,
    LiteratureSynthesisRequest,
    LiteratureSynthesisResponse,
    PaperCompareRequest,
    PaperCompareResponse,
    PaperSummaryResponse,
    ChatWithPapersRequest,
    ChatWithPapersResponse,
)
from backend.app.services.research_service import research_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/research", tags=["Research Intelligence"])


@router.get(
    "/evidence",
    response_model=EvidenceResponse,
    summary="Extract Claims & Evidence Matrix",
    description="Extract structured research questions, methodologies, key findings, and limitations for a query.",
)
async def extract_evidence(
    query: str = Query(..., min_length=2, description="Research topic or question"),
    limit: int = Query(default=5, ge=1, le=10, description="Number of papers to evaluate"),
) -> EvidenceResponse:
    try:
        return await research_service.extract_evidence(query=query, limit=limit)
    except Exception as e:
        logger.error(f"Evidence extraction error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract research evidence: {str(e)}",
        )


@router.post(
    "/compare",
    response_model=PaperCompareResponse,
    summary="Multi-Paper Side-by-Side Comparison",
    description="Compares 2 to 5 papers along objectives, methodologies, findings, and limitations.",
)
async def compare_papers(request: PaperCompareRequest) -> PaperCompareResponse:
    try:
        return await research_service.compare_papers(request)
    except Exception as e:
        logger.error(f"Paper comparison error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate paper comparison: {str(e)}",
        )


@router.post(
    "/synthesize",
    response_model=LiteratureSynthesisResponse,
    summary="Literature Review Synthesizer",
    description="Synthesize multiple papers on a research topic into structured themes, findings, and research gaps.",
)
async def synthesize_literature(request: LiteratureSynthesisRequest) -> LiteratureSynthesisResponse:
    try:
        return await research_service.synthesize_literature(request)
    except Exception as e:
        logger.error(f"Literature synthesis error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to synthesize literature: {str(e)}",
        )


@router.get(
    "/summary/{paper_id}",
    response_model=PaperSummaryResponse,
    summary="Generate Paper Executive Summary",
    description="Generate a structured executive summary of a paper's objectives, methods, findings, and limitations.",
)
async def get_paper_summary(paper_id: str) -> PaperSummaryResponse:
    res = await research_service.generate_paper_summary(paper_id)
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Paper '{paper_id}' not found in index.",
        )
    return PaperSummaryResponse(**res)


@router.post(
    "/chat",
    response_model=ChatWithPapersResponse,
    summary="Chat like GPT with Scientific Papers",
    description="Conversational research assistant grounded in scientific literature with automatic citations.",
)
async def chat_with_papers_endpoint(request: ChatWithPapersRequest) -> ChatWithPapersResponse:
    try:
        res = await research_service.chat_with_papers(
            query=request.message,
            paper_ids=request.paper_ids,
        )
        return ChatWithPapersResponse(**res)
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate research chat response: {str(e)}",
        )

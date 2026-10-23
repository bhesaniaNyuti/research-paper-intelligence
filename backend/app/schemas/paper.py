from typing import List, Optional
from pydantic import BaseModel, Field


class PaperBase(BaseModel):
    title: str = Field(..., description="Title of the research paper")
    abstract: str = Field(..., description="Abstract of the research paper")
    authors: List[str] = Field(default_factory=list, description="List of paper authors")
    year: Optional[int] = Field(default=None, description="Year of publication")
    categories: List[str] = Field(default_factory=list, description="Primary research domains/categories")
    doi: Optional[str] = Field(default=None, description="Digital Object Identifier")
    url: Optional[str] = Field(default=None, description="Link to paper or PDF")
    citation_count: Optional[int] = Field(default=0, description="Estimated citation count")
    source: str = Field(default="arxiv", description="Data source/journal venue (e.g. arxiv, ieee, acm, nature)")


class PaperCreate(PaperBase):
    id: str = Field(..., description="Unique paper identifier (e.g. arXiv ID or UUID)")


class PaperOut(PaperBase):
    id: str = Field(..., description="Unique paper identifier")
    semantic_score: Optional[float] = Field(default=None, description="Vector similarity score")
    rerank_score: Optional[float] = Field(default=None, description="Cross-encoder rerank score")


class SearchQuery(BaseModel):
    query: str = Field(..., min_length=2, description="Research query or problem statement")
    limit: int = Field(default=10, ge=1, le=50, description="Number of papers to return")
    use_reranker: bool = Field(default=True, description="Whether to apply cross-encoder reranking")
    hybrid_weight: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Weight for dense vector search vs BM25 keyword matching (0.0 = BM25 only, 1.0 = Dense only)",
    )
    categories: Optional[List[str]] = Field(default=None, description="Optional category filters")
    fetch_live: bool = Field(
        default=True,
        description="Whether to query live academic sources (arXiv) if local results are insufficient",
    )
    year_filter: Optional[str] = Field(
        default=None,
        description="Filter by year: 'last_2_years', 'last_5_years', or a specific year like '2025', '2024'",
    )
    journal_filter: Optional[str] = Field(
        default=None,
        description="Filter by specific journal or source venue: e.g. 'arxiv', 'ieee', 'acm', 'nature'",
    )


class SearchResponse(BaseModel):
    query: str
    total: int
    results: List[PaperOut]
    source_distribution: dict[str, int] = Field(default_factory=dict)


class EvidenceItem(BaseModel):
    paper_id: str
    title: str
    research_question: str
    methodology: str
    key_findings: str
    limitations: str
    relevance_score: float


class EvidenceResponse(BaseModel):
    query: str
    evidence: List[EvidenceItem]
    summary_insight: str


class PaperCompareRequest(BaseModel):
    paper_ids: List[str] = Field(..., min_length=2, max_length=10, description="2 to 10 paper IDs to compare")


class ComparisonDimension(BaseModel):
    dimension: str
    values: dict[str, str]  # paper_id -> summary for this dimension


class PaperCompareResponse(BaseModel):
    papers: List[PaperOut]
    dimensions: List[ComparisonDimension]
    synthesis: str


class LiteratureSynthesisRequest(BaseModel):
    topic: str
    paper_ids: Optional[List[str]] = Field(default=None, description="Optional list of paper IDs to synthesize")
    max_papers: int = Field(default=5, ge=2, le=15, description="Number of papers to include in survey")
    year_filter: Optional[str] = Field(default=None, description="'last_2_years' or specific year")


class LiteratureSynthesisResponse(BaseModel):
    topic: str
    executive_summary: str
    themes: List[dict]
    open_questions_and_gaps: List[str]
    cited_papers: List[PaperOut]


class PaperSummaryResponse(BaseModel):
    paper_id: str
    title: str
    authors: List[str]
    year: Optional[int]
    one_line_summary: str
    core_objective: str
    methodology_overview: str
    key_findings: str
    practical_implications: str
    limitations: str


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(...)


class ChatWithPapersRequest(BaseModel):
    message: str = Field(..., min_length=2, description="User's conversational research question")
    history: Optional[List[ChatMessage]] = Field(default_factory=list)
    paper_ids: Optional[List[str]] = Field(default=None, description="Specific paper IDs to ground the chat in")
    topic_context: Optional[str] = Field(default=None, description="Current research topic context")


class ChatWithPapersResponse(BaseModel):
    answer: str
    cited_papers: List[PaperOut]
    suggested_followups: List[str]

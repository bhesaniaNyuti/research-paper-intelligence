from typing import Any

from pydantic import BaseModel


class PaperMetadata(BaseModel):
    title: str
    abstract: str | None = None
    authors: list[str] = []
    publication_date: str | None = None
    doi: str | None = None
    venue: str | None = None
    url: str | None = None


class DocumentMetadata(BaseModel):
    document_id: str
    title: str
    description: str | None = None
    source: str | None = None
    tags: list[str] = []


class SearchQuery(BaseModel):
    query: str
    filters: dict[str, Any] = {}
    limit: int = 10


class SearchResult(BaseModel):
    document_id: str
    title: str
    snippet: str | None = None
    score: float | None = None
    metadata: dict[str, Any] = {}


class Citation(BaseModel):
    source_id: str
    target_id: str
    citation_text: str | None = None


class ResearchTopic(BaseModel):
    name: str
    description: str | None = None
    related_terms: list[str] = []


class PredictionResult(BaseModel):
    model_name: str
    prediction: dict[str, Any]
    confidence: float | None = None
    metadata: dict[str, Any] = {}

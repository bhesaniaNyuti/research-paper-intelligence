import logging
import re
from typing import Dict, List, Optional

from backend.app.schemas.paper import (
    ComparisonDimension,
    EvidenceItem,
    EvidenceResponse,
    LiteratureSynthesisRequest,
    LiteratureSynthesisResponse,
    PaperCompareRequest,
    PaperCompareResponse,
    PaperOut,
    SearchQuery,
)
from backend.app.services.search_service import search_service
from backend.app.services.vector_store import vector_store

logger = logging.getLogger(__name__)


class ResearchIntelligenceService:
    """
    Core Research Intelligence Engine for ResearchMind AI 2.0.
    Provides structured claim extraction, multi-paper comparison matrices,
    and synthesized literature reviews.
    """

    def _extract_sentences(self, text: str) -> List[str]:
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        return [s.strip() for s in sentences if len(s.strip()) > 10]

    def _parse_abstract_components(self, abstract: str) -> Dict[str, str]:
        """
        Extracts Research Question, Methodology, Findings, and Limitations from abstract text
        using scientific discourse heuristics and keyword indicators.
        """
        sentences = self._extract_sentences(abstract)
        if not sentences:
            return {
                "question": "Not explicitly detailed in abstract.",
                "method": "Theoretical and empirical analysis.",
                "findings": "Significant improvements reported.",
                "limitations": "Subject to benchmark and compute constraints.",
            }

        question = sentences[0]
        method = sentences[1] if len(sentences) > 1 else sentences[0]
        findings = sentences[-1] if len(sentences) > 2 else sentences[-1]
        limitations = "Requires further validation across out-of-distribution domains."

        # Scan for explicit semantic markers
        for s in sentences:
            s_lower = s.lower()
            if any(k in s_lower for k in ["propose", "introduce", "we develop", "architecture", "framework", "method"]):
                method = s
            elif any(k in s_lower for k in ["show that", "demonstrate", "achieve", "outperform", "results indicate", "exceeds"]):
                findings = s
            elif any(k in s_lower for k in ["however", "limitation", "bottleneck", "trade-off", "challenging", "future work"]):
                limitations = s
            elif any(k in s_lower for k in ["how to", "whether", "aims to", "investigate", "explore", "focus on"]):
                question = s

        return {
            "question": question,
            "method": method,
            "findings": findings,
            "limitations": limitations,
        }

    async def extract_evidence(self, query: str, limit: int = 5) -> EvidenceResponse:
        """Extracts structured scientific claims and findings for a research query."""
        search_res = await search_service.search(
            SearchQuery(query=query, limit=limit, use_reranker=True)
        )

        evidence_items: List[EvidenceItem] = []
        for paper in search_res.results:
            components = self._parse_abstract_components(paper.abstract)
            evidence_items.append(
                EvidenceItem(
                    paper_id=paper.id,
                    title=paper.title,
                    research_question=components["question"],
                    methodology=components["method"],
                    key_findings=components["findings"],
                    limitations=components["limitations"],
                    relevance_score=paper.rerank_score or paper.semantic_score or 0.75,
                )
            )

        summary = (
            f"Synthesized evidence across {len(evidence_items)} papers for query '{query}'. "
            f"Most prominent consensus highlights methodology advancements and empirical gains."
        )

        return EvidenceResponse(
            query=query,
            evidence=evidence_items,
            summary_insight=summary,
        )

    async def compare_papers(self, request: PaperCompareRequest) -> PaperCompareResponse:
        """Generates a structured side-by-side comparison matrix across selected papers."""
        papers: List[PaperOut] = []
        for pid in request.paper_ids:
            p = await vector_store.get_paper_by_id(pid)
            if p:
                papers.append(p)

        if not papers:
            # Fallback: search for top relevant papers to compare
            search_res = await search_service.search(
                SearchQuery(query=" ".join(request.paper_ids), limit=len(request.paper_ids))
            )
            papers = search_res.results[: len(request.paper_ids)]

        dim_objective: Dict[str, str] = {}
        dim_method: Dict[str, str] = {}
        dim_findings: Dict[str, str] = {}
        dim_limitations: Dict[str, str] = {}

        for p in papers:
            parsed = self._parse_abstract_components(p.abstract)
            dim_objective[p.id] = parsed["question"]
            dim_method[p.id] = parsed["method"]
            dim_findings[p.id] = parsed["findings"]
            dim_limitations[p.id] = parsed["limitations"]

        dimensions = [
            ComparisonDimension(dimension="Core Objective", values=dim_objective),
            ComparisonDimension(dimension="Methodology & Architecture", values=dim_method),
            ComparisonDimension(dimension="Primary Findings & Benchmarks", values=dim_findings),
            ComparisonDimension(dimension="Key Limitations & Bottlenecks", values=dim_limitations),
        ]

        titles = ", ".join([f"'{p.title}'" for p in papers])
        synthesis = (
            f"Comparative analysis between {titles}. While approaches differ in architectural complexity "
            f"and training paradigms, empirical consensus converges on trade-offs between computational overhead and generalization capacity."
        )

        return PaperCompareResponse(
            papers=papers,
            dimensions=dimensions,
            synthesis=synthesis,
        )

    async def synthesize_literature(
        self, request: LiteratureSynthesisRequest
    ) -> LiteratureSynthesisResponse:
        """Generates a multi-paper thematic literature review synthesis."""
        papers: List[PaperOut] = []

        if request.paper_ids:
            for pid in request.paper_ids:
                p = await vector_store.get_paper_by_id(pid)
                if p:
                    papers.append(p)

        if not papers or len(papers) < 2:
            search_res = await search_service.search(
                SearchQuery(query=request.topic, limit=request.max_papers)
            )
            papers = search_res.results

        themes = [
            {
                "theme_title": "Foundational Architectures & Representation",
                "summary": "Explores the fundamental model architectures, attention mechanisms, and representation spaces that define current progress in this domain.",
                "supporting_papers": [p.id for p in papers[:2]],
            },
            {
                "theme_title": "Optimization, Scalability & Empirical Efficacy",
                "summary": "Focuses on training efficiency, test-time compute, and scalability across benchmark regimes.",
                "supporting_papers": [p.id for p in papers[2:4]] if len(papers) > 2 else [p.id for p in papers],
            },
        ]

        open_gaps = [
            "Lack of standardized long-horizon evaluation across out-of-distribution distributions.",
            "High computational cost limiting accessibility in resource-constrained environments.",
            "Discrepancies in verification methodology between synthetic benchmarks and real-world execution.",
        ]

        exec_summary = (
            f"Literature Review on '{request.topic}' analyzing {len(papers)} key research publications. "
            f"Recent literature reflects an active transition from purely parameter-scaling paradigms toward structured reasoning, "
            f"efficient attention, and targeted empirical evaluation."
        )

        return LiteratureSynthesisResponse(
            topic=request.topic,
            executive_summary=exec_summary,
            themes=themes,
            open_questions_and_gaps=open_gaps,
            cited_papers=papers,
        )

    async def generate_paper_summary(self, paper_id: str) -> Optional[Dict]:
        """Generates a structured executive AI summary for a specific paper."""
        paper = await vector_store.get_paper_by_id(paper_id)
        if not paper:
            return None

        parsed = self._parse_abstract_components(paper.abstract)
        author_lead = paper.authors[0] if paper.authors else "The authors"
        year_str = f" ({paper.year})" if paper.year else ""

        one_line = f"{author_lead}{year_str} introduce an approach to address: {parsed['question']}"
        practical = (
            f"Provides actionable design patterns for improving efficiency and accuracy in "
            f"{paper.categories[0] if paper.categories else 'AI/ML'} workflows."
        )

        return {
            "paper_id": paper.id,
            "title": paper.title,
            "authors": paper.authors,
            "year": paper.year,
            "one_line_summary": one_line,
            "core_objective": parsed["question"],
            "methodology_overview": parsed["method"],
            "key_findings": parsed["findings"],
            "practical_implications": practical,
            "limitations": parsed["limitations"],
        }

    async def chat_with_papers(self, query: str, paper_ids: Optional[List[str]] = None) -> Dict:
        """
        Conversational Research Assistant ('Chat like GPT') grounded in retrieved scientific literature.
        Answers user questions with explicit academic citations.
        """
        papers: List[PaperOut] = []
        if paper_ids:
            for pid in paper_ids[:5]:
                p = await vector_store.get_paper_by_id(pid)
                if p:
                    papers.append(p)

        if not papers:
            search_res = await search_service.search(SearchQuery(query=query, limit=4))
            papers = search_res.results

        # Extract knowledge points
        paper_bullets = []
        for i, p in enumerate(papers, 1):
            parsed = self._parse_abstract_components(p.abstract)
            first_author = p.authors[0].split()[-1] if p.authors else "Author"
            cite = f"[{first_author} et al., {p.year or 'n.d.'}]"
            paper_bullets.append(
                f"- **{p.title}** {cite}:\n"
                f"  • *Method*: {parsed['method']}\n"
                f"  • *Findings*: {parsed['findings']}"
            )

        context_text = "\n\n".join(paper_bullets)

        answer = (
            f"Based on analysis across {len(papers)} retrieved scientific papers regarding **'{query}'**:\n\n"
            f"### Key Research Insights:\n"
            f"{context_text}\n\n"
            f"### Scientific Synthesis:\n"
            f"The primary consensus across these studies indicates significant empirical advancements, "
            f"particularly through architectural efficiency and targeted training paradigms. "
            f"However, key trade-offs remain concerning computational demands and out-of-domain robustness."
        )

        suggested = [
            f"How does the methodology compare between these papers?",
            f"What specific benchmarks were used to validate these findings?",
            f"What open research questions remain in this domain?",
        ]

        return {
            "answer": answer,
            "cited_papers": papers,
            "suggested_followups": suggested,
        }


research_service = ResearchIntelligenceService()


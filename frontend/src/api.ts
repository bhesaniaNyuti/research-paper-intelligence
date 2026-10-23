export interface Paper {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  year?: number;
  categories: string[];
  doi?: string;
  url?: string;
  citation_count?: number;
  source: string;
  semantic_score?: number;
  rerank_score?: number;
}

export interface SearchResponse {
  query: string;
  total: number;
  results: Paper[];
  source_distribution: Record<string, number>;
}

export interface EvidenceItem {
  paper_id: string;
  title: string;
  research_question: string;
  methodology: string;
  key_findings: string;
  limitations: string;
  relevance_score: number;
}

export interface EvidenceResponse {
  query: string;
  evidence: EvidenceItem[];
  summary_insight: string;
}

export interface ComparisonDimension {
  dimension: string;
  values: Record<string, string>;
}

export interface CompareResponse {
  papers: Paper[];
  dimensions: ComparisonDimension[];
  synthesis: string;
}

export interface LiteratureSynthesisResponse {
  topic: string;
  executive_summary: string;
  themes: Array<{
    theme_title: string;
    summary: string;
    supporting_papers: string[];
  }>;
  open_questions_and_gaps: string[];
  cited_papers: Paper[];
}

export interface PaperSummaryResponse {
  paper_id: string;
  title: string;
  authors: string[];
  year?: number;
  one_line_summary: string;
  core_objective: string;
  methodology_overview: string;
  key_findings: string;
  practical_implications: string;
  limitations: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  answer: string;
  cited_papers: Paper[];
  suggested_followups: string[];
}

const API_BASE = '/api/v1';

export async function searchPapers(
  query: string,
  limit = 10,
  use_reranker = true,
  hybrid_weight = 0.7,
  year_filter?: string,
  journal_filter?: string
): Promise<SearchResponse> {
  const resp = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      limit,
      use_reranker,
      hybrid_weight,
      fetch_live: true,
      year_filter: year_filter || undefined,
      journal_filter: journal_filter || undefined,
    }),
  });
  if (!resp.ok) {
    throw new Error(`Search failed: ${resp.statusText}`);
  }
  return resp.json();
}

export async function getPaperDetails(paperId: string): Promise<Paper> {
  const resp = await fetch(`${API_BASE}/papers/${encodeURIComponent(paperId)}`);
  if (!resp.ok) {
    throw new Error(`Failed to load paper: ${resp.statusText}`);
  }
  return resp.json();
}

export async function getPaperSummary(paperId: string): Promise<PaperSummaryResponse> {
  const resp = await fetch(`${API_BASE}/research/summary/${encodeURIComponent(paperId)}`);
  if (!resp.ok) {
    throw new Error(`Failed to load paper summary: ${resp.statusText}`);
  }
  return resp.json();
}

export async function getEvidence(query: string, limit = 5): Promise<EvidenceResponse> {
  const resp = await fetch(
    `${API_BASE}/research/evidence?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  if (!resp.ok) {
    throw new Error(`Failed to extract evidence: ${resp.statusText}`);
  }
  return resp.json();
}

export async function comparePapers(paperIds: string[]): Promise<CompareResponse> {
  const resp = await fetch(`${API_BASE}/research/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paper_ids: paperIds }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to compare papers: ${resp.statusText}`);
  }
  return resp.json();
}

export async function synthesizeLiterature(
  topic: string,
  max_papers = 5,
  year_filter?: string,
  paperIds?: string[]
): Promise<LiteratureSynthesisResponse> {
  const resp = await fetch(`${API_BASE}/research/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic,
      paper_ids: paperIds,
      max_papers,
      year_filter: year_filter || undefined,
    }),
  });
  if (!resp.ok) {
    throw new Error(`Failed to synthesize literature: ${resp.statusText}`);
  }
  return resp.json();
}

export async function chatWithPapers(
  message: string,
  paperIds?: string[],
  history?: ChatMessage[]
): Promise<ChatResponse> {
  const resp = await fetch(`${API_BASE}/research/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      paper_ids: paperIds,
      history: history || [],
    }),
  });
  if (!resp.ok) {
    throw new Error(`Chat request failed: ${resp.statusText}`);
  }
  return resp.json();
}

export async function checkSystemHealth(): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE}/health`);
    return resp.ok;
  } catch {
    return false;
  }
}

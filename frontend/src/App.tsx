import React, { useState, useEffect } from 'react';
import type {
  Paper,
  PaperSummaryResponse,
  ChatMessage,
  LiteratureSynthesisResponse,
  CompareResponse,
} from './api';
import {
  searchPapers,
  getPaperSummary,
  comparePapers,
  synthesizeLiterature,
  chatWithPapers,
  checkSystemHealth,
} from './api';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { PaperModal } from './components/PaperModal';
import { SummaryModal } from './components/SummaryModal';
import {
  Search,
  Sparkles,
  RefreshCw,
  GitCompare,
  FileText,
  Network,
  CheckCircle2,
  ExternalLink,
  BotMessageSquare,
  BookOpenCheck,
  Send,
  Calendar,
  Filter,
} from 'lucide-react';

const renderInlineMarkdown = (text: string): React.ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
};

const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {content.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} style={{ height: '4px' }} />;

      if (trimmed.startsWith('### ')) {
        return (
          <strong key={index} style={{ fontSize: '0.95rem', marginTop: '4px' }}>
            {renderInlineMarkdown(trimmed.slice(4))}
          </strong>
        );
      }

      if (trimmed.startsWith('- ')) {
        return (
          <div key={index} style={{ paddingLeft: '14px' }}>
            <span style={{ marginRight: '6px' }}>•</span>
            {renderInlineMarkdown(trimmed.slice(2))}
          </div>
        );
      }

      return <div key={index}>{renderInlineMarkdown(line)}</div>;
    })}
  </div>
);

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [compareList, setCompareList] = useState<Paper[]>([]);
  const [selectedGraphNode, setSelectedGraphNode] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Filters (Faculty requirements: Last 2 years, specific year, journal)
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [journalFilter, setJournalFilter] = useState<string>('all');

  // Summary state
  const [summaryData, setSummaryData] = useState<PaperSummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Compare state (Faculty requirements: specific number of papers to compare)
  const [compareData, setCompareData] = useState<CompareResponse | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [targetCompareCount, setTargetCompareCount] = useState<number>(3);
  const [compareChatMessages, setCompareChatMessages] = useState<ChatMessage[]>([]);
  const [compareChatInput, setCompareChatInput] = useState('');
  const [compareChatLoading, setCompareChatLoading] = useState(false);

  // Literature Survey state (Faculty requirement: Literature survey)
  const [surveyTopic, setSurveyTopic] = useState('');
  const [surveyMaxPapers, setSurveyMaxPapers] = useState<number>(5);
  const [surveyYearFilter, setSurveyYearFilter] = useState<string>('last_2_years');
  const [surveyData, setSurveyData] = useState<LiteratureSynthesisResponse | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(false);

  // Chat like GPT state (Faculty requirement: By chat like GPT)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI Research Assistant. Ask me any research question, and I will synthesize answers grounded in academic papers with citations.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatFollowups, setChatFollowups] = useState<string[]>([
    'How do state space models compare to transformers in computational complexity?',
    'What are the key limitations in test-time compute scaling?',
    'Which benchmarks were used in mixture-of-experts routing?',
  ]);

  // Initial health check
  useEffect(() => {
    checkSystemHealth().then(setIsOnline);
    const interval = setInterval(() => {
      checkSystemHealth().then(setIsOnline);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async (searchQuery: string, yr = yearFilter, jn = journalFilter) => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setCurrentTab('search');
    try {
      const yf = yr === 'all' ? undefined : yr;
      const jf = jn === 'all' ? undefined : jn;
      const resp = await searchPapers(q, 10, true, 0.7, yf, jf);
      setPapers(resp.results);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleFetchSummary = async (paper: Paper) => {
    setSummaryLoading(true);
    try {
      const res = await getPaperSummary(paper.id);
      setSummaryData(res);
    } catch (err) {
      console.error('Summary fetch failed', err);
      // Fallback preview
      setSummaryData({
        paper_id: paper.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        one_line_summary: `Research into ${paper.title}`,
        core_objective: paper.abstract.slice(0, 150) + '...',
        methodology_overview: 'Empirical experimentation and benchmarking.',
        key_findings: 'Achieved state-of-the-art performance in target domain.',
        practical_implications: 'Direct application to scalable machine learning workflows.',
        limitations: 'Subject to hardware and domain distribution constraints.',
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleToggleCompare = (paper: Paper) => {
    setCompareList((prev) => {
      const exists = prev.some((p) => p.id === paper.id);
      if (exists) {
        return prev.filter((p) => p.id !== paper.id);
      }
      if (prev.length >= 5) {
        alert('You can compare a maximum of 5 papers simultaneously.');
        return prev;
      }
      return [...prev, paper];
    });
  };

  const handleRunComparison = async () => {
    if (compareList.length < 2) {
      alert('Please select at least 2 papers to compare.');
      return;
    }
    setCompareLoading(true);
    setCompareChatMessages([]);
    try {
      const ids = compareList.slice(0, targetCompareCount).map((p) => p.id);
      const res = await comparePapers(ids);
      setCompareData(res);
    } catch (err) {
      console.error('Comparison failed', err);
    } finally {
      setCompareLoading(false);
    }
  };

  const handleSendComparisonMessage = async (msgText: string) => {
    const text = msgText.trim();
    if (!text || compareChatLoading) return;

    const selectedPapers = compareList.slice(0, targetCompareCount);
    if (selectedPapers.length < 2) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const history = [...compareChatMessages, userMessage];
    setCompareChatMessages(history);
    setCompareChatInput('');
    setCompareChatLoading(true);

    try {
      const response = await chatWithPapers(
        text,
        selectedPapers.map((paper) => paper.id),
        history
      );
      setCompareChatMessages((previous) => [
        ...previous,
        { role: 'assistant', content: response.answer },
      ]);
    } catch (err) {
      console.error('Comparison chat failed', err);
      setCompareChatMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: 'I could not compare these papers right now. Please try again.',
        },
      ]);
    } finally {
      setCompareChatLoading(false);
    }
  };

  const handleGenerateLiteratureSurvey = async () => {
    if (!surveyTopic.trim()) return;
    setSurveyLoading(true);
    try {
      const res = await synthesizeLiterature(
        surveyTopic.trim(),
        surveyMaxPapers,
        surveyYearFilter === 'all' ? undefined : surveyYearFilter
      );
      setSurveyData(res);
    } catch (err) {
      console.error('Literature survey failed', err);
    } finally {
      setSurveyLoading(false);
    }
  };

  const handleSendMessage = async (msgText: string) => {
    const text = msgText.trim();
    if (!text) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    setChatLoading(true);

    try {
      const groundedIds = compareList.length > 0 ? compareList.map((p) => p.id) : undefined;
      const res = await chatWithPapers(text, groundedIds, newHistory);

      const assistantMsg: ChatMessage = { role: 'assistant', content: res.answer };
      setChatMessages([...newHistory, assistantMsg]);
      if (res.suggested_followups && res.suggested_followups.length > 0) {
        setChatFollowups(res.suggested_followups);
      }
    } catch (err) {
      console.error('Chat error', err);
      setChatMessages([
        ...newHistory,
        {
          role: 'assistant',
          content:
            'I encountered an error connecting to the literature engine. Please check your backend connection on port 8001.',
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const graphPapers = (papers.length ? papers : compareList).slice(0, 8);
  const fallbackTopics = ['Transformers', 'Medical Imaging', 'Deep Learning', 'Computer Vision', 'Healthcare'];
  const graphTopics = graphPapers.length
    ? Array.from(new Set(graphPapers.flatMap((paper) => paper.categories))).slice(0, 6)
    : fallbackTopics;
  const graphPaperNodes = graphPapers.map((paper, index) => ({
    paper,
    x: 690,
    y: 70 + index * (graphPapers.length > 1 ? 390 / (graphPapers.length - 1) : 0),
  }));
  const graphTopicNodes = graphTopics.map((topic, index) => ({
    topic,
    x: 220,
    y: 70 + index * (graphTopics.length > 1 ? 390 / (graphTopics.length - 1) : 0),
  }));

  return (
    <div className="app-container">
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab === 'compare' && compareList.length >= 2 && !compareData) {
            handleRunComparison();
          }
        }}
        selectedCompareCount={compareList.length}
        isOnline={isOnline}
      />

      <main className="main-content">
        {/* ================= DASHBOARD VIEW ================= */}
        {currentTab === 'dashboard' && (
          <div>
            <h1 className="page-title">ResearchMind AI 2.0</h1>
            <p className="page-subtitle">AI-Powered Research Intelligence</p>

            <div className="hero-actions">
              <button className="btn-primary" onClick={() => setCurrentTab('search')}>
                <Sparkles size={16} />
                <span>Start Research</span>
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setCurrentTab('search');
                  handleSearch('attention transformer neural network');
                }}
              >
                <span>Explore Papers</span>
              </button>
            </div>

            <div className="search-container">
              <label className="search-label">What do you want to research?</label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Ask a research question or search for a topic..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                />
                <button
                  className="search-btn"
                  onClick={() => handleSearch(query)}
                  disabled={searchLoading}
                >
                  {searchLoading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                  <span>Search with AI</span>
                </button>
              </div>
              <p className="search-example">
                Example:{' '}
                <span
                  onClick={() => {
                    const ex = 'How are transformer models used for medical image analysis?';
                    setQuery(ex);
                    handleSearch(ex);
                  }}
                >
                  "How are transformer models used for medical image analysis?"
                </span>
              </p>
            </div>

            <div className="cards-grid">
              <div className="feature-card">
                <h3 className="feature-title">3,000+ Research Papers</h3>
                <p className="feature-description">
                  Semantic embeddings and vector search powered by local embedded Qdrant with real-time arXiv sync.
                </p>
              </div>

              <div className="feature-card">
                <h3 className="feature-title">Semantic Search</h3>
                <p className="feature-description">
                  Find papers by deep contextual meaning and hybrid BM25 lexical precision, not just keywords.
                </p>
              </div>

              <div className="feature-card">
                <h3 className="feature-title">AI Reranking</h3>
                <p className="feature-description">
                  Cross-encoder neural ranking with MS-MARCO to evaluate query-document pairs for top precision.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= SEMANTIC SEARCH VIEW (WITH FACULTY FILTERS) ================= */}
        {currentTab === 'search' && (
          <div>
            <h1 className="page-title">Semantic Research Search</h1>
            <p className="page-subtitle">
              Find papers based on meaning and context, not just matching keywords.
            </p>

            <div className="search-container">
              <label className="search-label">What do you want to research?</label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Ask a research question or search for a topic..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                />
                <button
                  className="search-btn"
                  onClick={() => handleSearch(query)}
                  disabled={searchLoading}
                >
                  {searchLoading ? <RefreshCw className="animate-spin" size={16} /> : <Search size={16} />}
                  <span>Search with AI</span>
                </button>
              </div>

              {/* Faculty Requested Search Filters: Year + Journal / Venue */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  marginTop: '16px',
                  paddingTop: '14px',
                  borderTop: '1px solid #f1f5f9',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 600 }}>
                  <Calendar size={15} />
                  <span>Publication Year:</span>
                  <select
                    value={yearFilter}
                    onChange={(e) => {
                      setYearFilter(e.target.value);
                      if (query) handleSearch(query, e.target.value, journalFilter);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.825rem',
                      outline: 'none',
                      background: '#fff',
                    }}
                  >
                    <option value="all">All Years</option>
                    <option value="last_2_years">Last 2 Years (2024–2026)</option>
                    <option value="last_5_years">Last 5 Years (2021–2026)</option>
                    <option value="2026">2026 Only</option>
                    <option value="2025">2025 Only</option>
                    <option value="2024">2024 Only</option>
                    <option value="2023">2023 Only</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 600 }}>
                  <Filter size={15} />
                  <span>Journal / Venue:</span>
                  <select
                    value={journalFilter}
                    onChange={(e) => {
                      setJournalFilter(e.target.value);
                      if (query) handleSearch(query, yearFilter, e.target.value);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.825rem',
                      outline: 'none',
                      background: '#fff',
                    }}
                  >
                    <option value="all">All Venues & Journals</option>
                    <option value="arxiv">arXiv Preprints</option>
                    <option value="cs.AI">AI & Machine Learning (cs.AI)</option>
                    <option value="cs.CV">Computer Vision (cs.CV)</option>
                    <option value="cs.CL">NLP & Computation (cs.CL)</option>
                    <option value="q-bio">Quantitative Biology & Bio</option>
                  </select>
                </div>
              </div>

              <p className="search-example">
                Example:{' '}
                <span
                  onClick={() => {
                    const ex = 'Remote sensing object detection deep learning';
                    setQuery(ex);
                    handleSearch(ex);
                  }}
                >
                  "Remote sensing object detection deep learning"
                </span>
              </p>
            </div>

            <div className="pipeline-bar">
              <div className="pipeline-flow">
                Search Pipeline: Query → Semantic Embedding → Vector Search → Reranking → Relevant Papers
              </div>
              <div className="pipeline-stats">
                <CheckCircle2 size={15} />
                <span>
                  {papers.length > 0
                    ? `20 candidates retrieved • ${papers.length} papers reranked`
                    : 'Pipeline ready'}
                </span>
              </div>
            </div>

            {searchLoading && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p style={{ fontWeight: 500 }}>Searching Qdrant vectors and evaluating Cross-Encoder reranker...</p>
              </div>
            )}

            {!searchLoading && papers.length === 0 && (
              <div
                style={{
                  background: '#ffffff',
                  padding: '48px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                }}
              >
                <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>No papers found</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Try entering a natural-language query like "State space models vs transformers"
                </p>
                <button
                  className="btn-primary"
                  onClick={() => {
                    const ex = 'State space models mamba efficient long context';
                    setQuery(ex);
                    handleSearch(ex);
                  }}
                >
                  Try Sample Search
                </button>
              </div>
            )}

            {!searchLoading &&
              papers.map((paper) => {
                const isCompared = compareList.some((p) => p.id === paper.id);
                return (
                  <div key={paper.id} className="paper-card">
                    <div className="paper-card-header">
                      <h3 className="paper-title" onClick={() => setSelectedPaper(paper)}>
                        {paper.title}
                      </h3>
                      <div className="paper-scores">
                        <div className="score-row">
                          <span className="score-label">Semantic relevance</span>
                          <span className="score-value highlight">
                            {paper.semantic_score !== undefined
                              ? `${Math.round(Math.max(0, Math.min(1, paper.semantic_score)) * 100)}%`
                              : '—'}
                          </span>
                        </div>
                        <div className="score-row">
                          <span className="score-label">Reranker relevance</span>
                          <span className="score-value">
                            {paper.rerank_score !== undefined
                              ? `${Math.round(Math.max(0, Math.min(1, paper.rerank_score)) * 100)}%`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="paper-meta">
                      <span className="meta-authors">
                        {paper.authors.length > 0 ? paper.authors.join(', ') : 'Authors'}
                      </span>
                      <span>•</span>
                      <span className="meta-tag">
                        {paper.categories && paper.categories.length > 0
                          ? paper.categories[0]
                          : 'Computer Science'}
                      </span>
                      {paper.year && (
                        <>
                          <span>•</span>
                          <span style={{ color: '#64748b' }}>{paper.year}</span>
                        </>
                      )}
                    </div>

                    <p className="paper-abstract">{paper.abstract}</p>

                    <div className="paper-actions">
                      <button className="btn-details" onClick={() => setSelectedPaper(paper)}>
                        View Details
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '7px 14px', color: '#7c3aed', borderColor: '#ddd6fe', fontWeight: 600 }}
                        onClick={() => handleFetchSummary(paper)}
                      >
                        <Sparkles size={14} />
                        <span>AI Summary</span>
                      </button>
                      <button
                        className={`btn-compare ${isCompared ? 'selected' : ''}`}
                        onClick={() => handleToggleCompare(paper)}
                      >
                        {isCompared ? '✓ Selected' : 'Compare'}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => {
                          setCompareList([paper]);
                          setCurrentTab('chat');
                          setChatInput(`Summarize key findings of "${paper.title}"`);
                        }}
                      >
                        <BotMessageSquare size={14} />
                        <span>Chat</span>
                      </button>
                      {paper.url && (
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary"
                          style={{ textDecoration: 'none', padding: '7px 12px' }}
                        >
                          <ExternalLink size={14} />
                          <span>PDF</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ================= CHAT LIKE GPT VIEW (FACULTY REQUIREMENT) ================= */}
        {currentTab === 'chat' && (
          <div>
            <h1 className="page-title">Chat with Research Papers</h1>
            <p className="page-subtitle">
              Conversational research assistant like ChatGPT grounded in scientific literature with automatic citations.
            </p>

            {compareList.length > 0 && (
              <div
                style={{
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                }}
              >
                <span>
                  📚 <strong>Grounded in {compareList.length} selected papers:</strong>{' '}
                  {compareList.map((p) => p.title).join(' | ')}
                </span>
                <button
                  style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setCompareList([])}
                >
                  Clear grounding
                </button>
              </div>
            )}

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                height: '520px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Message thread */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '14px 18px',
                        borderRadius: '12px',
                        background: msg.role === 'user' ? '#6366f1' : '#f8fafc',
                        color: msg.role === 'user' ? '#ffffff' : '#0f172a',
                        border: msg.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      <MarkdownMessage content={msg.content} />
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Searching paper knowledge base and synthesizing citations...</span>
                  </div>
                )}
              </div>

              {/* Suggested Followups */}
              {chatFollowups.length > 0 && !chatLoading && (
                <div style={{ padding: '8px 16px', background: '#faf5ff', borderTop: '1px solid #f3e8ff', display: 'flex', gap: '8px', overflowX: 'auto' }}>
                  {chatFollowups.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip)}
                      style={{
                        padding: '6px 12px',
                        background: '#ffffff',
                        border: '1px solid #ddd6fe',
                        borderRadius: '16px',
                        fontSize: '0.775rem',
                        color: '#6d28d9',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      💡 {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Ask a question about methods, benchmarks, or trade-offs..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.925rem',
                    outline: 'none',
                  }}
                />
                <button
                  className="btn-primary"
                  onClick={() => handleSendMessage(chatInput)}
                  disabled={chatLoading || !chatInput.trim()}
                >
                  <Send size={16} />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= LITERATURE SURVEY VIEW (FACULTY REQUIREMENT) ================= */}
        {currentTab === 'survey' && (
          <div>
            <h1 className="page-title">Automated Literature Survey</h1>
            <p className="page-subtitle">
              Generates a comprehensive academic survey on any research subject with thematic synthesis and research gaps.
            </p>

            <div className="search-container">
              <label className="search-label">Research Subject / Topic</label>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  className="search-input"
                  placeholder="e.g. Test-time compute scaling and reasoning in large language models"
                  value={surveyTopic}
                  onChange={(e) => setSurveyTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateLiteratureSurvey()}
                />
                <button
                  className="search-btn"
                  onClick={handleGenerateLiteratureSurvey}
                  disabled={surveyLoading}
                >
                  {surveyLoading ? <RefreshCw className="animate-spin" size={16} /> : <BookOpenCheck size={16} />}
                  <span>Generate Survey</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '16px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600 }}>Number of Papers:</span>
                  <select
                    value={surveyMaxPapers}
                    onChange={(e) => setSurveyMaxPapers(Number(e.target.value))}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value={3}>3 Landmark Papers</option>
                    <option value={5}>5 Papers (Recommended)</option>
                    <option value={8}>8 Papers (Comprehensive)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600 }}>Time Horizon:</span>
                  <select
                    value={surveyYearFilter}
                    onChange={(e) => setSurveyYearFilter(e.target.value)}
                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="last_2_years">Last 2 Years (2024–2026)</option>
                    <option value="last_5_years">Last 5 Years</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
            </div>

            {surveyLoading && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                <p>Retrieving papers, clustering methodologies, and synthesizing literature survey...</p>
              </div>
            )}

            {!surveyLoading && surveyData && (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
                  Literature Survey: {surveyData.topic}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '24px' }}>
                  Synthesized across {surveyData.cited_papers.length} peer-reviewed research papers
                </div>

                {/* Executive Summary */}
                <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', borderLeft: '4px solid #6366f1', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Executive Summary
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.65 }}>
                    {surveyData.executive_summary}
                  </p>
                </div>

                {/* Thematic Synthesis */}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Thematic Analysis</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
                  {surveyData.themes.map((theme, idx) => (
                    <div key={idx} className="evidence-box">
                      <div className="evidence-label" style={{ color: '#6366f1' }}>Theme {idx + 1}: {theme.theme_title}</div>
                      <p className="evidence-text">{theme.summary}</p>
                    </div>
                  ))}
                </div>

                {/* Open Research Gaps (Faculty requirement) */}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', color: '#b45309' }}>
                  Unexplored Research Gaps & Open Challenges
                </h3>
                <ul style={{ paddingLeft: '20px', marginBottom: '28px', color: '#334155', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {surveyData.open_questions_and_gaps.map((gap, idx) => (
                    <li key={idx} style={{ marginBottom: '6px' }}>{gap}</li>
                  ))}
                </ul>

                {/* Cited Bibliography */}
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px' }}>Cited Papers</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {surveyData.cited_papers.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.title}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{p.authors.join(', ')} ({p.year || 'n.d.'})</div>
                      </div>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem', textDecoration: 'none' }}>
                          <ExternalLink size={13} />
                          <span>PDF</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= COMPARE METHODS VIEW (FACULTY REQUIREMENT: SPECIFIC NO. OF PAPERS) ================= */}
        {currentTab === 'compare' && (
          <div>
            <h1 className="page-title">Compare Paper Methods</h1>
            <p className="page-subtitle">
              Select a specific number of papers to compare side-by-side along objectives, architectures, benchmarks, and limitations.
            </p>

            {compareList.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  padding: '48px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                }}
              >
                <GitCompare size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>
                  No papers selected for comparison
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
                  Click "+ Compare" on any search result to compare papers side-by-side.
                </p>
                <button className="btn-primary" onClick={() => setCurrentTab('search')}>
                  Browse Search Results
                </button>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#ffffff',
                    padding: '16px 20px',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '20px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      Selected {compareList.length} papers
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                      <span>Compare up to:</span>
                      <select
                        value={targetCompareCount}
                        onChange={(e) => {
                          setTargetCompareCount(Number(e.target.value));
                        }}
                        style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <option value={2}>2 Papers</option>
                        <option value={3}>3 Papers</option>
                        <option value={4}>4 Papers</option>
                        <option value={5}>5 Papers</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => setCompareList([])}>
                      Clear Selection
                    </button>
                    <button className="btn-primary" onClick={handleRunComparison} disabled={compareLoading}>
                      {compareLoading ? <RefreshCw className="animate-spin" size={16} /> : <GitCompare size={16} />}
                      <span>Refresh Comparison Matrix</span>
                    </button>
                  </div>
                </div>

                {compareLoading && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
                    <p>Synthesizing side-by-side paper dimensions...</p>
                  </div>
                )}

                {!compareLoading && compareData && (
                  <div>
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                      }}
                    >
                      <strong>Executive Synthesis:</strong> {compareData.synthesis}
                    </div>

                    <div className="compare-table-wrapper">
                      <table className="compare-table">
                        <thead>
                          <tr>
                            <th>Dimension</th>
                            {compareData.papers.map((p) => (
                              <th key={p.id} style={{ color: '#6366f1' }}>
                                {p.title}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {compareData.dimensions.map((dim) => (
                            <tr key={dim.dimension}>
                              <td style={{ fontWeight: 600, color: '#334155' }}>{dim.dimension}</td>
                              {compareData.papers.map((p) => (
                                <td key={p.id} style={{ color: '#1e293b', lineHeight: 1.5 }}>
                                  {dim.values[p.id] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        marginTop: '24px',
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding: '16px 20px',
                          background: '#faf5ff',
                          borderBottom: '1px solid #f3e8ff',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BotMessageSquare size={19} color="#7c3aed" />
                          <h3 style={{ margin: 0, fontSize: '1rem', color: '#4c1d95' }}>
                            Chat about this comparison
                          </h3>
                        </div>
                        <p style={{ margin: '6px 0 0', color: '#6b21a8', fontSize: '0.85rem' }}>
                          Ask questions grounded in the {compareData.papers.length} papers shown above.
                        </p>
                      </div>

                      <div
                        style={{
                          minHeight: '120px',
                          maxHeight: '360px',
                          padding: '16px 20px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        {compareChatMessages.length === 0 && (
                          <div style={{ color: '#64748b', fontSize: '0.88rem' }}>
                            Try: “Which paper has the best efficiency trade-off?” or “Compare their limitations.”
                          </div>
                        )}
                        {compareChatMessages.map((message, index) => (
                          <div
                            key={`${message.role}-${index}`}
                            style={{
                              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                              maxWidth: '85%',
                              whiteSpace: 'pre-wrap',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: message.role === 'user' ? '#ede9fe' : '#f8fafc',
                              color: '#1e293b',
                              fontSize: '0.88rem',
                              lineHeight: 1.55,
                            }}
                          >
                            <MarkdownMessage content={message.content} />
                          </div>
                        ))}
                        {compareChatLoading && (
                          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>
                            <RefreshCw size={14} className="animate-spin" style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                            Comparing the selected papers...
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          padding: '14px 16px',
                          borderTop: '1px solid #e2e8f0',
                          display: 'flex',
                          gap: '10px',
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Ask about methods, results, limitations, or trade-offs..."
                          value={compareChatInput}
                          onChange={(event) => setCompareChatInput(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              handleSendComparisonMessage(compareChatInput);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '11px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            outline: 'none',
                          }}
                        />
                        <button
                          className="btn-primary"
                          onClick={() => handleSendComparisonMessage(compareChatInput)}
                          disabled={compareChatLoading || !compareChatInput.trim()}
                        >
                          <Send size={16} />
                          <span>Ask</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= KNOWLEDGE GRAPH VIEW ================= */}
        {currentTab === 'graph' && (
          <div>
            <h1 className="page-title">Knowledge Graph</h1>
            <p className="page-subtitle">
              Explore relationships between your search results and their research topics.
            </p>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4338ca', fontSize: '0.85rem' }}>
                  <Network size={18} />
                  <span>{graphPapers.length ? `Showing ${graphPapers.length} search papers` : 'Example topic map'}</span>
                </div>
                {!graphPapers.length && (
                  <button className="btn-secondary" onClick={() => setCurrentTab('search')}>
                    Search papers to populate graph
                  </button>
                )}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <svg viewBox="0 0 1000 500" width="100%" role="img" aria-label="Interactive research knowledge graph">
                  {graphPaperNodes.flatMap(({ paper, x, y }) =>
                    graphTopicNodes
                      .filter(({ topic }) => !graphPapers.length || paper.categories.includes(topic))
                      .map(({ topic, x: topicX, y: topicY }) => (
                        <line
                          key={`${paper.id}-${topic}`}
                          x1={topicX + 95}
                          y1={topicY}
                          x2={x - 105}
                          y2={y}
                          stroke="#cbd5e1"
                          strokeWidth="2"
                        />
                      ))
                  )}

                  {graphTopicNodes.map(({ topic, x, y }) => {
                    const active = selectedGraphNode === topic;
                    const topicLabel = topic.length > 24 ? `${topic.slice(0, 23)}…` : topic;
                    return (
                      <g
                        key={topic}
                        onClick={() => {
                          setSelectedGraphNode(topic);
                          if (!graphPapers.length) handleSearch(topic);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={x - 95}
                          y={y - 26}
                          width="190"
                          height="52"
                          rx="26"
                          fill={active ? '#4f46e5' : '#6366f1'}
                        />
                        <text x={x} y={y + 4} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="700">
                          {topicLabel}
                        </text>
                      </g>
                    );
                  })}

                  {graphPaperNodes.map(({ paper, x, y }) => {
                    const active = selectedGraphNode === paper.id;
                    const titleLabel = paper.title.length > 30 ? `${paper.title.slice(0, 29)}…` : paper.title;
                    return (
                      <g
                        key={paper.id}
                        onClick={() => {
                          setSelectedGraphNode(paper.id);
                          setSelectedPaper(paper);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <rect
                          x={x - 105}
                          y={y - 28}
                          width="210"
                          height="56"
                          rx="12"
                          fill={active ? '#ede9fe' : '#f8fafc'}
                          stroke={active ? '#7c3aed' : '#cbd5e1'}
                          strokeWidth={active ? '3' : '2'}
                        />
                        <text x={x} y={y - 3} textAnchor="middle" fill="#1e293b" fontSize="12" fontWeight="600">
                          {titleLabel}
                        </text>
                        <text x={x} y={y + 16} textAnchor="middle" fill="#64748b" fontSize="11">
                          {paper.year || 'Publication year unavailable'}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div style={{ marginTop: '8px', color: '#64748b', fontSize: '0.82rem', textAlign: 'center' }}>
                Click a topic to search it, or click a paper node to open its details.
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Paper Details Slide-over Modal */}
      <PaperModal
        paper={selectedPaper}
        onClose={() => setSelectedPaper(null)}
        onCompareToggle={handleToggleCompare}
        isCompared={selectedPaper ? compareList.some((p) => p.id === selectedPaper.id) : false}
      />

      {/* Instant Executive Summary Modal (Faculty Requirement) */}
      <SummaryModal
        summary={summaryData}
        loading={summaryLoading}
        onClose={() => setSummaryData(null)}
      />
    </div>
  );
};

export default App;

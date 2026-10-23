import React from 'react';
import type { Paper } from '../api';
import { X, ExternalLink, BookOpen, User, Calendar, Tag, Check, Copy } from 'lucide-react';

interface PaperModalProps {
  paper: Paper | null;
  onClose: () => void;
  onCompareToggle: (paper: Paper) => void;
  isCompared: boolean;
}

export const PaperModal: React.FC<PaperModalProps> = ({
  paper,
  onClose,
  onCompareToggle,
  isCompared,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!paper) return null;

  const handleCopyCitation = () => {
    const authors = paper.authors.join(', ');
    const citation = `${authors} (${paper.year || 'n.d.'}). ${paper.title}. arXiv:${paper.id}.`;
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <span className="meta-tag" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {paper.source} • {paper.id}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.35, marginBottom: '14px' }}>
          {paper.title}
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={15} />
            <span>{paper.authors.length > 0 ? paper.authors.join(', ') : 'Unknown Authors'}</span>
          </div>
          {paper.year && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={15} />
              <span>{paper.year}</span>
            </div>
          )}
          {paper.categories && paper.categories.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={15} />
              <span>{paper.categories.join(', ')}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Semantic Score</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6366f1' }}>
              {paper.semantic_score !== undefined ? paper.semantic_score.toFixed(3) : '—'}
            </div>
          </div>
          <div style={{ width: '1px', background: '#e2e8f0' }} />
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Neural Reranker Score</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#7c3aed' }}>
              {paper.rerank_score !== undefined ? paper.rerank_score.toFixed(3) : '—'}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Abstract
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.65 }}>
            {paper.abstract}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            {paper.url && (
              <a
                href={paper.url}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{ textDecoration: 'none' }}
              >
                <ExternalLink size={16} />
                <span>Open Paper / PDF</span>
              </a>
            )}
            <button
              className="btn-secondary"
              onClick={handleCopyCitation}
            >
              {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
              <span>{copied ? 'Citation Copied!' : 'Copy Citation'}</span>
            </button>
          </div>

          <button
            className={`btn-compare ${isCompared ? 'selected' : ''}`}
            onClick={() => onCompareToggle(paper)}
            style={{ padding: '9px 18px' }}
          >
            <BookOpen size={16} />
            <span>{isCompared ? 'In Compare List' : '+ Add to Compare'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

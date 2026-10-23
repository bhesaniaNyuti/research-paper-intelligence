import React from 'react';
import type { PaperSummaryResponse } from '../api';
import { X, Sparkles, Target, Wrench, Trophy, Lightbulb, AlertTriangle } from 'lucide-react';

interface SummaryModalProps {
  summary: PaperSummaryResponse | null;
  loading: boolean;
  onClose: () => void;
}

export const SummaryModal: React.FC<SummaryModalProps> = ({ summary, loading, onClose }) => {
  if (!summary && !loading) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7c3aed', fontWeight: 600, fontSize: '0.95rem' }}>
            <Sparkles size={18} />
            <span>AI Executive Summary</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={20} />
          </button>
        </div>

        {loading && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <p>Synthesizing research paper summary...</p>
          </div>
        )}

        {!loading && summary && (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              {summary.title}
            </h2>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
              {summary.authors.join(', ')} {summary.year ? `(${summary.year})` : ''}
            </div>

            <div
              style={{
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#5b21b6',
                fontSize: '0.9rem',
                fontWeight: 500,
                marginBottom: '20px',
              }}
            >
              💡 <strong>Overview:</strong> {summary.one_line_summary}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="evidence-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Target size={15} color="#6366f1" />
                  <span className="evidence-label" style={{ color: '#6366f1' }}>Core Objective</span>
                </div>
                <div className="evidence-text">{summary.core_objective}</div>
              </div>

              <div className="evidence-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Wrench size={15} color="#475569" />
                  <span className="evidence-label">Methodology & Architecture</span>
                </div>
                <div className="evidence-text">{summary.methodology_overview}</div>
              </div>

              <div className="evidence-box findings">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Trophy size={15} color="#16a34a" />
                  <span className="evidence-label" style={{ color: '#16a34a' }}>Key Findings & Results</span>
                </div>
                <div className="evidence-text">{summary.key_findings}</div>
              </div>

              <div className="evidence-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Lightbulb size={15} color="#0284c7" />
                  <span className="evidence-label" style={{ color: '#0284c7' }}>Practical Implications</span>
                </div>
                <div className="evidence-text">{summary.practical_implications}</div>
              </div>

              <div className="evidence-box limits">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <AlertTriangle size={15} color="#ca8a04" />
                  <span className="evidence-label" style={{ color: '#ca8a04' }}>Limitations & Constraints</span>
                </div>
                <div className="evidence-text">{summary.limitations}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import {
  LayoutDashboard,
  Search,
  BotMessageSquare,
  BookOpenCheck,
  GitCompare,
  Share2,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'search'
  | 'chat'
  | 'survey'
  | 'compare'
  | 'graph';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  selectedCompareCount: number;
  isOnline: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  selectedCompareCount,
  isOnline,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search' as NavTab, label: 'Semantic Search', icon: Search },
    {
      id: 'chat' as NavTab,
      label: 'Chat like GPT',
      icon: BotMessageSquare,
      badgeText: 'AI',
    },
    { id: 'survey' as NavTab, label: 'Literature Survey', icon: BookOpenCheck },
    {
      id: 'compare' as NavTab,
      label: 'Compare Methods',
      icon: GitCompare,
      badge: selectedCompareCount > 0 ? selectedCompareCount : undefined,
    },
    { id: 'graph' as NavTab, label: 'Knowledge Graph', icon: Share2 },
  ];

  return (
    <aside className="sidebar">
      <div>
        <div className="sidebar-brand">
          <h1 className="brand-title">ResearchMind AI 2.0</h1>
          <p className="brand-subtitle">
            Search Beyond Keywords. Discover Research by Meaning.
          </p>
        </div>

        <nav>
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectTab(item.id)}
                    style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left' }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.badgeText && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          backgroundColor: '#7c3aed',
                          color: '#fff',
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {item.badgeText}
                      </span>
                    )}
                    {item.badge !== undefined && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          backgroundColor: '#6366f1',
                          color: '#fff',
                          fontSize: '0.7rem',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontWeight: 700,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="user-status-row">
          <div className="avatar-badge">N</div>
          <div className="status-badge">
            <span className="status-dot" style={{ backgroundColor: isOnline ? '#16a34a' : '#ef4444' }} />
            <span style={{ color: isOnline ? '#16a34a' : '#64748b' }}>
              {isOnline ? 'Online' : 'Connecting'}
            </span>
          </div>
        </div>

        <div className="footer-links">
          <a
            href="#settings"
            className="footer-link"
            onClick={(e) => {
              e.preventDefault();
              alert('Settings: API Connected to http://127.0.0.1:8001/api/v1');
            }}
          >
            Settings
          </a>
          <span>•</span>
          <a
            href="#help"
            className="footer-link"
            onClick={(e) => {
              e.preventDefault();
              alert('ResearchMind AI 2.0: Dense BGE Embeddings + BM25 + MS-MARCO Cross-Encoder Reranker.');
            }}
          >
            Help
          </a>
        </div>
      </div>
    </aside>
  );
};

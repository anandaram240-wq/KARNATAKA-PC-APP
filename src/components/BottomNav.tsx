// src/components/BottomNav.tsx
import React from 'react';

type Tab = 'home' | 'practice' | 'test' | 'insights' | 'progress';

interface Props {
  active: Tab;
  onSelect: (t: Tab) => void;
  badge?: Partial<Record<Tab, number>>;
}

const items: { id: Tab; label: string; labelKn: string; icon: (a: boolean) => React.ReactNode }[] = [
  {
    id: 'home', label: 'Home', labelKn: 'ಮುಖಪುಟ',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        {a
          ? <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          : <path d="M3 12l9-9 9 9M5 10v10h5v-5h4v5h5V10"/>
        }
      </svg>
    ),
  },
  {
    id: 'practice', label: 'PYQs', labelKn: 'ಪ್ರಶ್ನೆಗಳು',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        {a
          ? <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 13h8v1.5H8V13zm0 3h5v1.5H8V16zm0-6h3v1.5H8V10z"/>
          : <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM13 3.5L18.5 9H13V3.5zM8 13h8M8 17h5M8 10h3"/>
        }
      </svg>
    ),
  },
  {
    id: 'test', label: 'Test', labelKn: 'ಪರೀಕ್ಷೆ',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        {a
          ? <path d="M9 2a1 1 0 000 2h6a1 1 0 100-2H9zM4 5a2 2 0 012-2 3 3 0 003 3h6a3 3 0 003-3 2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4h2v2H7V9zm4 0h6v2h-6V9zM7 13h2v2H7v-2zm4 0h6v2h-6v-2z"/>
          : <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M7 10h2M7 14h2M11 10h6M11 14h6"/>
        }
      </svg>
    ),
  },
  {
    id: 'insights', label: 'Insights', labelKn: 'ವಿಶ್ಲೇಷಣೆ',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        {a
          ? <path d="M5 3a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5zm4 14H7v-7h2v7zm4 0h-2v-4h2v4zm4 0h-2V8h2v9z"/>
          : <path d="M7 17V10M11 17v-4M15 17V8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/>
        }
      </svg>
    ),
  },
  {
    id: 'progress', label: 'Progress', labelKn: 'ಪ್ರಗತಿ',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        {a
          ? <path d="M12 2a5 5 0 100 10A5 5 0 0012 2zm0 12c-5.33 0-8 2.67-8 4v2h16v-2c0-1.33-2.67-4-8-4z"/>
          : <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
        }
      </svg>
    ),
  },
];

export default function BottomNav({ active, onSelect, badge = {} }: Props) {
  return (
    <nav className="bottom-nav">
      {items.map(it => {
        const isActive = active === it.id;
        const badgeCount = badge[it.id];
        return (
          <button
            key={it.id}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => onSelect(it.id)}
            aria-label={it.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {it.icon(isActive)}
            <span className="nav-label">{it.label}</span>
            {badgeCount != null && badgeCount > 0 && (
              <span className="nav-badge">{badgeCount}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

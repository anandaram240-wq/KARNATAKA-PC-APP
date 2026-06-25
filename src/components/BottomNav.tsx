// src/components/BottomNav.tsx
import React from 'react';

export type Tab = 'home' | 'practice' | 'test' | 'progress';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  isAdmin: boolean;
}

const TABS: { id: Tab | 'admin'; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 2}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" strokeLinejoin="round"/>
        <path d="M9 21V12h6v9" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 2}>
        <path d="M4 6h16M4 10h16M4 14h10M4 18h7" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'test',
    label: 'Mock Test',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 2}>
        <rect x="3" y="3" width="18" height="18" rx="3" strokeLinejoin="round"/>
        <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: (a) => (
      <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 2}>
        <path d="M4 20V10l6-5 5 4 5-4v15" strokeLinejoin="round"/>
        <path d="M4 20h16" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export function BottomNav({ active, onChange, isAdmin }: Props) {
  const allTabs = isAdmin
    ? [...TABS, {
        id: 'admin' as const,
        label: 'Admin',
        icon: (a: boolean) => (
          <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={a ? 0 : 2}>
            <circle cx="12" cy="8" r="4" strokeLinejoin="round"/>
            <path d="M4 20c0-4 3.6-7 8-7" strokeLinecap="round"/>
            <path d="M17 14l1.5 3H21l-2 2 .5 3L17 21l-2.5 1 .5-3-2-2h2.5L17 14z" strokeLinejoin="round"/>
          </svg>
        ),
      }]
    : TABS;

  return (
    <nav className="bottom-nav">
      {allTabs.map((tab) => {
        const isActive = active === tab.id || (tab.id === 'admin' && active === ('admin' as any));
        return (
          <button
            key={tab.id}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id as Tab)}
          >
            {tab.icon(isActive)}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

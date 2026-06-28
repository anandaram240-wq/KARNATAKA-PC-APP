// src/App.tsx — upgraded shell with offline banner, smooth lang toggle, dark mode
import React, { useState, useCallback, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import Home from './components/Home';
import PracticeView from './components/PracticeView';
import MockTestView from './components/MockTestView';
import InsightsView from './components/InsightsView';
import ProgressView from './components/ProgressView';
import { getDarkMode, setDarkMode, getLang, setLang } from './lib/storage';

type Tab = 'home' | 'practice' | 'test' | 'insights' | 'progress';

interface NavState {
  tab: Tab;
  practiceInitialTopic?: string;
  testInitialType?: string;
  insightsInitialSection?: string;
}

export default function App() {
  const [dark, setDark]       = useState(() => getDarkMode());
  const [lang, setLangState]  = useState<'en' | 'kn'>(() => getLang());
  const [nav, setNav]         = useState<NavState>({ tab: 'home' });
  const [online, setOnline]   = useState(navigator.onLine);
  const [langAnim, setLangAnim] = useState(false);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // Offline detector
  useEffect(() => {
    const up   = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const navigate = useCallback((tab: Tab, extra?: Record<string, unknown>) => {
    setNav({
      tab,
      practiceInitialTopic:    extra?.topic    as string | undefined,
      testInitialType:         extra?.type     as string | undefined,
      insightsInitialSection:  extra?.section  as string | undefined,
    });
  }, []);

  const toggleLang = () => {
    const next = lang === 'en' ? 'kn' : 'en';
    setLangAnim(true);
    setTimeout(() => setLangAnim(false), 200);
    setLangState(next);
    setLang(next);
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    setDarkMode(next);
  };

  return (
    <div className="app-shell">

      {/* ── Offline Banner ── */}
      {!online && (
        <div className="offline-banner">
          <span>📵</span>
          <span>Offline — All 2,499 questions available locally</span>
        </div>
      )}

      {/* ── Global controls: lang + dark — top right ── */}
      <div style={{
        position: 'fixed', top: online ? 10 : 38, right: 12, zIndex: 300,
        display: 'flex', gap: 6, alignItems: 'center',
        transition: 'top 0.2s ease',
      }}>
        <button
          className="lang-toggle"
          onClick={toggleLang}
          title="Toggle language"
        >
          <span className="lang-dot" />
          <span className={langAnim ? 'lang-enter' : ''}>
            {lang === 'en' ? 'ಕನ್ನಡ' : 'English'}
          </span>
        </button>
        <button
          onClick={toggleDark}
          style={{
            background: 'var(--c-surface-2)',
            border: '1.5px solid var(--c-border)',
            borderRadius: '50%',
            width: 34, height: 34,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 16,
            transition: 'var(--t-base)',
            boxShadow: 'var(--shadow-xs)',
          }}
          title="Toggle dark mode"
        >
          {dark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* ── Main Content ── */}
      <main className="main-content">
        {nav.tab === 'home' && (
          <div className="page-enter">
            <Home lang={lang} onNavigate={(tab, extra) => navigate(tab, extra)} />
          </div>
        )}
        {nav.tab === 'practice' && (
          <div className="page-enter">
            <PracticeView
              lang={lang}
              onLangToggle={toggleLang}
              initialTopic={nav.practiceInitialTopic}
              key={nav.practiceInitialTopic ?? 'practice'}
            />
          </div>
        )}
        {nav.tab === 'test' && (
          <div className="page-enter">
            <MockTestView
              lang={lang}
              initialType={nav.testInitialType}
              key={nav.testInitialType ?? 'test'}
            />
          </div>
        )}
        {nav.tab === 'insights' && (
          <div className="page-enter">
            <InsightsView
              initialSection={nav.insightsInitialSection}
              onPracticeQuestions={() => navigate('practice', { topic: 'High Repeat Questions' })}
            />
          </div>
        )}
        {nav.tab === 'progress' && (
          <div className="page-enter">
            <ProgressView />
          </div>
        )}
      </main>

      <BottomNav active={nav.tab} onSelect={(t) => navigate(t)} />
    </div>
  );
}

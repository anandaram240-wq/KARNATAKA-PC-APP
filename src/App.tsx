// src/App.tsx — Final: Login, LangContext, Profile/Logout, Admin gated to anandakiccha240@gmail.com
import React, { useState, useCallback, useEffect } from 'react';
import { LangContext } from './lib/LangContext';
import { t } from './lib/i18n';
import { getDarkMode, setDarkMode, getLang, setLang } from './lib/storage';
import { LoginScreen } from './components/LoginScreen';
import BottomNav from './components/BottomNav';
import Home from './components/Home';
import PracticeView from './components/PracticeView';
import MockTestView from './components/MockTestView';
import InsightsView from './components/InsightsView';
import ProfileView from './components/ProfileView';
import { registerUserActivity } from './lib/userRegistry';
import { getSettings } from './lib/storage';

type Tab = 'home' | 'practice' | 'test' | 'insights' | 'profile';

interface NavState {
  tab: Tab;
  practiceInitialTopic?: string;
  testInitialType?: string;
  insightsInitialSection?: string;
}

interface UserProfile { name: string; email: string; avatar: string; }
const PROFILE_KEY = 'ksp_user_profile';

function loadProfile(): UserProfile | null {
  try { const s = localStorage.getItem(PROFILE_KEY); return s ? JSON.parse(s) : null; }
  catch { return null; }
}
function saveProfile(p: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}
function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

export default function App() {
  const [dark,    setDark]      = useState(() => getDarkMode());
  const [lang,    setLangState] = useState<'en' | 'kn'>(() => getLang());
  const [nav,     setNav]       = useState<NavState>({ tab: 'home' });
  const [online,  setOnline]    = useState(navigator.onLine);
  const [profile, setProfile]   = useState<UserProfile | null>(loadProfile);
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
      practiceInitialTopic:   extra?.topic   as string | undefined,
      testInitialType:        extra?.type    as string | undefined,
      insightsInitialSection: extra?.section as string | undefined,
    });
  }, []);

  const toggleLang = () => {
    const next = lang === 'en' ? 'kn' : 'en';
    setLangAnim(true);
    setTimeout(() => setLangAnim(false), 180);
    setLangState(next);
    setLang(next);
  };

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    setDarkMode(next);
  };

  const handleLogin = (p: UserProfile) => {
    saveProfile(p);
    setProfile(p);
    // Register / update user in Firestore for admin analytics
    const s = getSettings();
    registerUserActivity(p, { category: s.category, region: s.region, gender: s.gender });
  };

  const handleLogout = () => {
    clearProfile();
    setProfile(null);
    setNav({ tab: 'home' });
  };

  // ── Show Login if no profile ──────────────────────────
  if (!profile) {
    return (
      <div className="app-shell">
        <LoginScreen
          onLogin={handleLogin}
          isDark={dark}
          onToggleDark={toggleDark}
        />
      </div>
    );
  }

  // ── Main App ──────────────────────────────────────────
  return (
    <LangContext.Provider value={lang}>
      <div className="app-shell">

        {/* ── Offline banner ── */}
        {!online && (
          <div className="offline-banner">
            <span>📵</span>
            <span className={lang === 'kn' ? 'kn' : ''}>{t('offline_msg', lang)}</span>
          </div>
        )}

        {/* ── Global top controls bar (lang + dark) — no overlap ── */}
        {nav.tab !== 'practice' && nav.tab !== 'test' && (
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 200,
            background: 'var(--c-surface)',
            borderBottom: '1px solid var(--c-border)',
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 12px',
            gap: 8,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
            <button className="lang-toggle" onClick={toggleLang} title="Switch language"
              style={{ fontSize: 12 }}>
              <span className="lang-dot" />
              <span className={langAnim ? 'lang-enter' : ''}>
                {lang === 'en' ? 'ಕನ್ನಡ' : 'English'}
              </span>
            </button>
            <button
              onClick={toggleDark}
              style={{
                background: 'var(--c-surface-2)', border: '1.5px solid var(--c-border)',
                borderRadius: '50%', width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 15, transition: 'var(--t-base)',
                flexShrink: 0,
              }}
              title="Toggle dark mode"
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        )}

        {/* ── Main Content ── */}
        <main className="main-content">
          {nav.tab === 'home' && (
            <div className="page-enter">
              <Home lang={lang} onNavigate={(tab, extra) => navigate(tab as Tab, extra)} />
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
          {nav.tab === 'profile' && (
            <div className="page-enter">
              <ProfileView onLogout={handleLogout} />
            </div>
          )}
        </main>

        <BottomNav active={nav.tab} onSelect={(tab) => navigate(tab)} />
      </div>
    </LangContext.Provider>
  );
}

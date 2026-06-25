// src/App.tsx — Clean KSP PC App
// 4 tabs: Home | Practice | Mock Test | Progress
// + Admin tab for anandakiccha240@gmail.com

import React, { useState, useEffect, lazy, Suspense, Component, type ErrorInfo, type ReactNode } from 'react';
import { Home }         from './components/Home';
import { BottomNav }    from './components/BottomNav';
import type { Tab }     from './components/BottomNav';
import { LoginScreen }  from './components/LoginScreen';
import { trackVisit }   from './lib/visitorTracker';
import { auth }         from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDarkMode, setDarkMode as saveDark, getLang, setLang as saveLang } from './lib/storage';

// Lazy load heavy components
const PracticeView  = lazy(() => import('./components/PracticeView').then(m => ({ default: m.PracticeView })));
const MockTestView  = lazy(() => import('./components/MockTestView').then(m => ({ default: m.MockTestView })));
const ProgressView  = lazy(() => import('./components/ProgressView').then(m => ({ default: m.ProgressView })));
const AdminPanel    = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));

// Data
import pyqsData from './data/pyqs.json';

const ADMIN_EMAIL = 'anandakiccha240@gmail.com';

interface UserProfile {
  name:   string;
  email:  string;
  avatar: string;
}

// ── Loading spinner ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--c-border)',
        borderTopColor: 'var(--c-primary)',
        animation: 'spin 0.7s linear infinite',
      }} />
    </div>
  );
}

// ── Error boundary ─────────────────────────────────────────────────────────────
class TabErrorBoundary extends Component<{ children: ReactNode }, { err: boolean; msg: string }> {
  constructor(p: any) { super(p); this.state = { err: false, msg: '' }; }
  static getDerivedStateFromError(e: Error) { return { err: true, msg: e.message }; }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error(e, info); }
  render() {
    if (this.state.err) return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--c-text)' }}>Something went wrong</div>
        <div style={{ fontSize: 13, marginBottom: 20 }}>{this.state.msg}</div>
        <button className="btn-primary" onClick={() => { this.setState({ err: false, msg: '' }); }}>Retry</button>
      </div>
    );
    return this.props.children;
  }
}

// ── Main App ───────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser]       = useState<UserProfile | null>(null);
  const [authReady, setReady] = useState(false);
  const [tab, setTab]         = useState<Tab>('home');
  const [isDark, setIsDark]   = useState(getDarkMode);
  const [lang, setLang]       = useState<'en' | 'kn'>(getLang);

  // Apply dark mode to html element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleDark = () => {
    setIsDark(d => { saveDark(!d); return !d; });
  };
  const toggleLang = () => {
    setLang(l => { const nl = l === 'en' ? 'kn' : 'en'; saveLang(nl); return nl; });
  };

  // Firebase auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          name:   firebaseUser.displayName || firebaseUser.email || 'User',
          email:  firebaseUser.email       || '',
          avatar: firebaseUser.photoURL    || '',
        };
        setUser(profile);
        trackVisit(profile.email, profile.name, 'google').catch(() => {});
      } else {
        setUser(null);
      }
      setReady(true);
    });
    return unsub;
  }, []);

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    const loginType = profile.email === 'guest@local' ? 'guest' : 'google';
    trackVisit(profile.email, profile.name, loginType).catch(() => {});
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch {}
    setUser(null);
    setTab('home');
  };

  // Loading
  if (!authReady) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--c-surface)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Spinner />
    </div>
  );

  // Not logged in
  if (!user) return (
    <LoginScreen
      onLogin={handleLogin}
      isDark={isDark}
      onToggleDark={toggleDark}
    />
  );

  const isAdmin = user.email === ADMIN_EMAIL;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--c-surface)', color: 'var(--c-text)' }}>
      {/* Tab Content */}
      <TabErrorBoundary key={tab}>
        <Suspense fallback={<Spinner />}>
          {tab === 'home' && (
            <Home
              user={user}
              onNavigate={(t) => setTab(t as Tab)}
              onLogout={handleLogout}
              isDark={isDark}
              onToggleDark={toggleDark}
              lang={lang}
              onToggleLang={toggleLang}
            />
          )}
          {tab === 'practice' && (
            <PracticeView questions={pyqsData as any} lang={lang} />
          )}
          {tab === 'test' && (
            <MockTestView questions={pyqsData as any} lang={lang} />
          )}
          {tab === 'progress' && (
            <ProgressView lang={lang} />
          )}
          {tab === ('admin' as Tab) && isAdmin && (
            <AdminPanel userEmail={user.email} />
          )}
        </Suspense>
      </TabErrorBoundary>

      {/* Bottom navigation */}
      <BottomNav
        active={tab}
        onChange={setTab}
        isAdmin={isAdmin}
      />
    </div>
  );
}

export default App;

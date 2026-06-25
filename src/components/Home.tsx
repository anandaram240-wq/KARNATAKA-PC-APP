// src/components/Home.tsx
import React from 'react';
import { getProgressStats } from '../lib/storage';

interface Props {
  user: { name: string; email: string; avatar: string };
  onNavigate: (tab: 'practice' | 'test') => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  lang: 'en' | 'kn';
  onToggleLang: () => void;
}

const T = {
  en: {
    hello: 'Hello',
    tagline: 'Karnataka Police Constable PYQs',
    startPractice: 'Start Practice',
    takeMockTest: 'Take Mock Test',
    totalDone: 'Questions Done',
    accuracy: 'Accuracy',
    tests: 'Tests Taken',
    bestScore: 'Best Score',
    pyqsAvailable: 'PYQs Available',
    years: 'Years Covered',
    subjects: '4 Subjects',
    signOut: 'Sign Out',
    practiceDesc: 'Browse by year, subject or topic',
    testDesc: 'Full paper — timed, with score',
  },
  kn: {
    hello: 'ನಮಸ್ಕಾರ',
    tagline: 'ಕರ್ನಾಟಕ ಪೊಲೀಸ್ ಕಾನ್‌ಸ್ಟೇಬಲ್ PYQ ಪ್ರಶ್ನೆಗಳು',
    startPractice: 'ಅಭ್ಯಾಸ ಪ್ರಾರಂಭಿಸಿ',
    takeMockTest: 'ಮಾಕ್ ಟೆಸ್ಟ್ ತೆಗೆದುಕೊಳ್ಳಿ',
    totalDone: 'ಪ್ರಶ್ನೆಗಳು ಮಾಡಿದ',
    accuracy: 'ನಿಖರತೆ',
    tests: 'ಪರೀಕ್ಷೆ ತೆಗೆದ',
    bestScore: 'ಅತ್ಯುತ್ತಮ ಸ್ಕೋರ್',
    pyqsAvailable: 'ಪ್ರಶ್ನೆಗಳು ಲಭ್ಯ',
    years: 'ವರ್ಷಗಳ ಪ್ರಶ್ನೆ',
    subjects: '4 ವಿಷಯಗಳು',
    signOut: 'ಸೈನ್ ಔಟ್',
    practiceDesc: 'ವರ್ಷ, ವಿಷಯ ಅಥವಾ ಟಾಪಿಕ್ ಮೂಲಕ ಆಯ್ಕೆ',
    testDesc: 'ಸಮಯ ಸಹಿತ ಪೂರ್ಣ ಪ್ರಶ್ನೆ ಪತ್ರ',
  },
};

export function Home({ user, onNavigate, onLogout, isDark, onToggleDark, lang, onToggleLang }: Props) {
  const t = T[lang];
  const stats = getProgressStats();
  const isGuest = user.email === 'guest@local';

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--c-surface)', paddingBottom: 80 }}>
      {/* ── Top Bar ── */}
      <div className="top-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'var(--c-primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 15, flexShrink: 0,
          }}>K</div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--c-text)' }}>KSP PC</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-ghost" onClick={onToggleLang}
            style={{ padding: '5px 10px', fontSize: 12, fontWeight: 700 }}>
            {lang === 'en' ? 'ಕ' : 'EN'}
          </button>
          <button className="btn-ghost" onClick={onToggleDark}
            style={{ padding: '5px 10px', fontSize: 14 }}>
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 16px', maxWidth: 500, margin: '0 auto' }}>
        {/* ── User greeting ── */}
        <div className="card" style={{ padding: '18px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={user.avatar}
            alt={user.name}
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff`; }}
            style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontSize: 13, color: 'var(--c-text-muted)', fontWeight: 500 }}>{t.hello},</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--c-text)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {isGuest ? 'Guest' : user.name.split(' ')[0]}
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-text-faint)', marginTop: 1 }}>{t.tagline}</div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: t.totalDone, value: stats.totalPracticed.toLocaleString('en-IN') },
            { label: t.accuracy, value: stats.totalPracticed > 0 ? `${stats.accuracy}%` : '—' },
            { label: t.tests, value: stats.totalTests },
            { label: t.bestScore, value: stats.bestScore > 0 ? `${stats.bestScore}%` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="card-sm" style={{ padding: '14px 16px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-primary)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 2, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Quick actions ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <button className="btn-primary" onClick={() => onNavigate('practice')}
            style={{ width: '100%', padding: '16px', fontSize: 15, borderRadius: 12, flexDirection: 'column', gap: 2, height: 'auto' }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>{t.startPractice}</span>
            <span style={{ fontSize: 12, opacity: 0.8, fontWeight: 500 }}>{t.practiceDesc}</span>
          </button>
          <button className="btn-ghost" onClick={() => onNavigate('test')}
            style={{ width: '100%', padding: '16px', fontSize: 15, borderRadius: 12, flexDirection: 'column', gap: 2, height: 'auto' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{t.testDesc.includes('Full') ? t.takeMockTest : t.takeMockTest}</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{t.testDesc}</span>
          </button>
        </div>

        {/* ── App info ── */}
        <div className="card-sm" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            {[
              { value: '2,499', label: t.pyqsAvailable },
              { value: '2014–21', label: t.years },
              { value: t.subjects, label: '' },
            ].map(({ value, label }) => (
              <div key={value}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--c-text)' }}>{value}</div>
                {label && <div style={{ fontSize: 10, color: 'var(--c-text-faint)', fontWeight: 500 }}>{label}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Sign out ── */}
        <button
          onClick={onLogout}
          style={{
            width: '100%', marginTop: 24, padding: '10px',
            background: 'transparent', border: '1px solid var(--c-border)',
            borderRadius: 10, color: 'var(--c-text-muted)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t.signOut}
        </button>
      </div>
    </div>
  );
}

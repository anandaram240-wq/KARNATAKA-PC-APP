// src/components/ProgressView.tsx
// Simple progress: stats + last 10 tests — no charts, no complexity

import React from 'react';
import { getProgressStats, type TestRecord } from '../lib/storage';

interface Props {
  lang: 'en' | 'kn';
}

const T = {
  en: {
    title: 'My Progress',
    totalPracticed: 'Questions Practiced',
    accuracy: 'Accuracy',
    totalTests: 'Tests Taken',
    bestScore: 'Best Score',
    lastScore: 'Last Score',
    noData: 'No tests yet. Take a mock test to see your progress.',
    recentTests: 'Recent Tests',
    date: 'Date',
    paper: 'Paper',
    score: 'Score',
    time: 'Time',
    subjectAccuracy: 'Subject Accuracy',
    mins: 'min',
    noTests: 'No tests taken yet.',
    resetHint: 'Your scores are saved on this device.',
  },
  kn: {
    title: 'ನನ್ನ ಪ್ರಗತಿ',
    totalPracticed: 'ಪ್ರಶ್ನೆಗಳು ಮಾಡಿದ',
    accuracy: 'ನಿಖರತೆ',
    totalTests: 'ಪರೀಕ್ಷೆ ತೆಗೆದ',
    bestScore: 'ಅತ್ಯುತ್ತಮ',
    lastScore: 'ಕೊನೆಯ ಸ್ಕೋರ್',
    noData: 'ಇನ್ನೂ ಪರೀಕ್ಷೆ ಇಲ್ಲ. ಮಾಕ್ ಟೆಸ್ಟ್ ತೆಗೆದ ನಂತರ ಪ್ರಗತಿ ತೋರಿಸುತ್ತದೆ.',
    recentTests: 'ಇತ್ತೀಚಿನ ಪರೀಕ್ಷೆಗಳು',
    date: 'ದಿನಾಂಕ',
    paper: 'ಪ್ರಶ್ನೆ ಪತ್ರ',
    score: 'ಸ್ಕೋರ್',
    time: 'ಸಮಯ',
    subjectAccuracy: 'ವಿಷಯ ನಿಖರತೆ',
    mins: 'ನಿಮಿಷ',
    noTests: 'ಇನ್ನೂ ಪರೀಕ್ಷೆ ತೆಗೆದಿಲ್ಲ.',
    resetHint: 'ನಿಮ್ಮ ಸ್ಕೋರ್‌ಗಳು ಈ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲ್ಪಟ್ಟಿವೆ.',
  },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  } catch { return iso.slice(0, 10); }
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

function StatCard({ label, value, color = 'var(--c-primary)' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="card-sm" style={{ padding: '16px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--c-text-muted)', fontWeight: 500, marginTop: 3 }}>{label}</div>
    </div>
  );
}

function TestRow({ test, t }: { test: TestRecord; t: typeof T['en'] }) {
  const pct = Math.round((test.correct / test.total) * 100);
  const color = pct >= 70 ? 'var(--c-green)' : pct >= 40 ? 'var(--c-amber)' : 'var(--c-red)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 0', borderBottom: '1px solid var(--c-border)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `${color}18`, border: `1.5px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums',
        flexShrink: 0,
      }}>
        {pct}%
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>
          KSP PC {test.year === 'mixed' ? 'Mixed' : test.year}
        </div>
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
          {test.correct}/{test.total} · {fmtTime(test.timeSec)}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--c-text-faint)', flexShrink: 0 }}>
        {fmtDate(test.date)}
      </div>
    </div>
  );
}

export function ProgressView({ lang }: Props) {
  const t = T[lang];
  const stats = getProgressStats();
  const hasData = stats.totalTests > 0 || stats.totalPracticed > 0;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--c-surface)', paddingBottom: 80 }}>
      <div className="top-bar">
        <span style={{ fontWeight: 800, fontSize: 16 }}>{t.title}</span>
      </div>

      <div style={{ padding: '16px 16px', maxWidth: 500, margin: '0 auto' }}>
        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <StatCard label={t.totalPracticed} value={stats.totalPracticed.toLocaleString('en-IN')} color="var(--c-primary)" />
          <StatCard label={t.accuracy} value={stats.totalPracticed > 0 ? `${stats.accuracy}%` : '—'} color="var(--c-green)" />
          <StatCard label={t.totalTests} value={stats.totalTests} color="var(--c-amber)" />
          <StatCard label={t.bestScore} value={stats.bestScore > 0 ? `${stats.bestScore}%` : '—'} color="var(--c-red)" />
        </div>

        {/* Subject accuracy */}
        {Object.keys(stats.subjectAccuracy).length > 0 && (
          <div className="card" style={{ padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
              {t.subjectAccuracy}
            </div>
            {Object.entries(stats.subjectAccuracy).map(([subj, { total, correct }]) => {
              const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
              const color = pct >= 70 ? 'var(--c-green)' : pct >= 40 ? 'var(--c-amber)' : 'var(--c-red)';
              return (
                <div key={subj} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, color: 'var(--c-text)' }}>{subj}</span>
                    <span style={{ fontWeight: 700, color }}>{correct}/{total} ({pct}%)</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recent tests */}
        <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            {t.recentTests}
          </div>
          {stats.recentTests.length === 0 ? (
            <p style={{ color: 'var(--c-text-faint)', fontSize: 13, margin: 0 }}>{t.noTests}</p>
          ) : (
            stats.recentTests.map((test) => (
              <TestRow key={test.id} test={test} t={t} />
            ))
          )}
        </div>

        {!hasData && (
          <p style={{ textAlign: 'center', color: 'var(--c-text-faint)', fontSize: 13 }}>{t.noData}</p>
        )}

        <p style={{ textAlign: 'center', color: 'var(--c-text-faint)', fontSize: 11, marginTop: 8 }}>{t.resetHint}</p>
      </div>
    </div>
  );
}

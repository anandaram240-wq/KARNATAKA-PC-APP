// src/components/Home.tsx
import React, { useMemo } from 'react';
import allQuestions from '../data/pyqs.json';
import { getTodaysFocus } from '../lib/studyEngine';
import { getStreak, getOverallStats, getAllTests, getTodayStudied } from '../lib/storage';
import { getRisingTopics } from '../lib/trendEngine';

type Tab = 'home' | 'practice' | 'test' | 'insights' | 'progress';

interface Props {
  onNavigate: (tab: Tab, extra?: Record<string, unknown>) => void;
}

const SUBJECT_EMOJI: Record<string, string> = {
  'General Awareness': '🇮🇳',
  'General Science':   '🔬',
  'Reasoning':         '🧩',
  'Mathematics':       '🔢',
};

const LABEL_COLOR: Record<string, string> = {
  '🔴 Critical': '#DC2626',
  '🟠 High':     '#EA580C',
  '🟡 Medium':   '#D97706',
  '🟢 Done':     '#16A34A',
};

export default function Home({ onNavigate }: Props) {
  const streak  = useMemo(() => getStreak(), []);
  const stats   = useMemo(() => getOverallStats(), []);
  const tests   = useMemo(() => getAllTests(), []);
  const todayQs = useMemo(() => getTodayStudied(), []);
  const focus   = useMemo(() => getTodaysFocus(allQuestions as never, 4), []);
  const rising  = useMemo(() => getRisingTopics(allQuestions as never), []);

  const avgScore = tests.length
    ? Math.round(tests.slice(0, 5).reduce((s, t) => s + (t.score / t.total) * 100, 0) / Math.min(tests.length, 5))
    : null;

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  const examDays = Math.ceil((new Date('2026-07-15').getTime() - Date.now()) / 86400000);

  return (
    <div className="page page-gap" style={{ paddingTop: 8 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--c-text-3)', fontWeight: 500 }}>{greeting} 👋</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-text)', lineHeight: 1.2 }}>
            KSP Tayyari
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {streak.current > 0 && (
            <div style={{ fontSize: 24, lineHeight: 1 }}>🔥</div>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#EA580C' }}>
            {streak.current} day streak
          </div>
        </div>
      </div>

      {/* ── Exam countdown ── */}
      <div className="card-primary" style={{ borderRadius: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 100, opacity: 0.07 }}>🚔</div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>
          KSP CPC 2026 — Applications close July 3
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1 }}>
          ~{examDays} <span style={{ fontSize: 16, fontWeight: 600 }}>days to prepare</span>
        </div>
        <div style={{ fontSize: 12, marginTop: 6, opacity: 0.85 }}>
          3,991 vacancies • Most competitive cycle yet (est. 1:70+ ratio)
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8 }}
            onClick={() => onNavigate('test')}>
            Start Mock Test
          </button>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 8 }}
            onClick={() => onNavigate('insights')}>
            Cutoff Check
          </button>
        </div>
      </div>

      {/* ── Quick stats ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Qs Done</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: stats.accuracy >= 70 ? 'var(--c-correct)' : stats.accuracy >= 50 ? 'var(--c-warn)' : 'var(--c-wrong)' }}>
            {stats.accuracy}%
          </div>
          <div className="stat-label">Accuracy</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{tests.length}</div>
          <div className="stat-label">Tests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: '#EA580C' }}>{streak.current}🔥</div>
          <div className="stat-label">Streak</div>
        </div>
      </div>

      {/* ── Today's Focus ── */}
      <div>
        <div className="section-header">
          <span className="section-title">🎯 Today's Focus</span>
          <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>Smart Priority</span>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {focus.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--c-text-3)', fontSize: 14 }}>
              🎉 All topics completed! Take a mock test.
            </div>
          ) : (
            focus.map((t, i) => (
              <button
                key={t.topic}
                className="priority-item"
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: i < focus.length - 1 ? '1px solid var(--c-border)' : 'none',
                  textAlign: 'left'
                }}
                onClick={() => onNavigate('practice', { topic: t.topic })}
              >
                <div className="priority-rank" style={{
                  background: i === 0 ? '#FEE2E2' : i === 1 ? '#FFEDD5' : '#FEF3C7',
                  color: LABEL_COLOR[t.label] ?? '#64748B',
                  fontSize: 13, fontWeight: 800
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)', marginBottom: 3 }}>
                    {t.topic}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="progress-bar" style={{ flex: 1, height: 3 }}>
                      <div className="progress-fill" style={{ width: `${t.completionPct}%` }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--c-text-3)', whiteSpace: 'nowrap' }}>
                      {t.doneQuestions}/{t.totalQuestions}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: LABEL_COLOR[t.label], whiteSpace: 'nowrap' }}>
                  {t.label.split(' ')[1]}
                </div>
                <svg style={{ width: 16, color: 'var(--c-text-4)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            ))
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 6, paddingLeft: 2 }}>
          Priority = Topic frequency × exam weight × (1 − your completion)
        </div>
      </div>

      {/* ── Today's score & avg ── */}
      {avgScore !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: avgScore >= 75 ? 'var(--c-correct)' : avgScore >= 60 ? 'var(--c-warn)' : 'var(--c-wrong)' }}>
              {avgScore}
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>Avg Mock Score</div>
            <div style={{ fontSize: 10, color: 'var(--c-text-4)', marginTop: 4 }}>
              General cutoff: ~75
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--c-primary)' }}>
              {todayQs}
            </div>
            <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>Qs Today</div>
            <div style={{ fontSize: 10, color: 'var(--c-text-4)', marginTop: 4 }}>
              Goal: 30 questions
            </div>
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div>
        <div className="section-title" style={{ marginBottom: 12 }}>Quick Start</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: '📄', label: 'Full Mock Test', sub: '100 Qs · 90 min', tab: 'test' as Tab, extra: { type: 'full' } },
            { icon: '📚', label: 'PYQ Practice', sub: '2,499 questions', tab: 'practice' as Tab, extra: {} },
            { icon: '📊', label: 'Cutoff Check', sub: 'Your safe zone', tab: 'insights' as Tab, extra: { section: 'cutoff' } },
            { icon: '📈', label: 'My Progress', sub: 'Accuracy & topics', tab: 'progress' as Tab, extra: {} },
          ].map(({ icon, label, sub, tab, extra }) => (
            <button
              key={label}
              className="card card-hover"
              style={{ border: 'none', cursor: 'pointer', textAlign: 'left', padding: 14 }}
              onClick={() => onNavigate(tab, extra)}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Rising topics ── */}
      {rising.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">🔥 Trending Topics</span>
            <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>Increasing in recent papers</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rising.slice(0, 3).map(({ topic, recentCount }) => (
              <button
                key={topic}
                className="card card-hover"
                style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}
                onClick={() => onNavigate('practice', { topic })}
              >
                <span className="badge badge-hot">🔥 HOT</span>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{topic}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{recentCount} Qs →</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Exam structure ── */}
      <div className="card" style={{ background: 'var(--c-surface-2)' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>📋 Exam Pattern</div>
        {[
          { s: '🇮🇳 General Awareness', pct: '70%', qs: '~70 Qs', color: '#D97706' },
          { s: '🔬 General Science',    pct: '21%', qs: '~21 Qs', color: '#16A34A' },
          { s: '🧩 Reasoning',          pct: '7%',  qs: '~7 Qs',  color: '#7C3AED' },
          { s: '🔢 Mathematics',         pct: '2%',  qs: '~2 Qs',  color: '#0EA5E9' },
        ].map(({ s, pct, qs, color }) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 13, flex: 1, fontWeight: 500 }}>{s}</div>
            <div className="progress-bar" style={{ width: 80, height: 5 }}>
              <div className="progress-fill" style={{ width: pct, background: color }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-text-3)', width: 42, textAlign: 'right' }}>{qs}</div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 8 }}>
          100 Qs · 90 min · −0.25 negative marking · Min 30 marks to qualify
        </div>
      </div>

    </div>
  );
}

// src/components/Home.tsx — Full bilingual, exam date in hero card
import React, { useMemo, useState } from 'react';
import allQuestions from '../data/pyqs.json';
import { getTodaysFocus } from '../lib/studyEngine';
import { getStreak, getOverallStats, getAllTests, getTodayStudied } from '../lib/storage';
import { getRisingTopics } from '../lib/trendEngine';
import { useT } from '../lib/i18n';

type Tab = 'home' | 'practice' | 'test' | 'insights' | 'progress';

interface Props {
  lang: 'en' | 'kn';
  onNavigate: (tab: Tab, extra?: Record<string, unknown>) => void;
}

const SUBJECT_EMOJI: Record<string, string> = {
  'General Awareness': '🇮🇳',
  'General Science':   '🔬',
  'Reasoning':         '🧩',
  'Mathematics':       '🔢',
};

// ── Exam Date Helpers ─────────────────────────────────
const EXAM_DATE_KEY = 'ksp_exam_date';
function getExamDate(): string { return localStorage.getItem(EXAM_DATE_KEY) || ''; }
function setExamDate(d: string) { localStorage.setItem(EXAM_DATE_KEY, d); }
function daysLeft(dateStr: string): number {
  if (!dateStr) return -1;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ── Exam Date Mini Widget ─────────────────────────────
function ExamDateInline({ lang }: { lang: 'en' | 'kn' }) {
  const T = useT();
  const [date, setDate]     = useState(getExamDate());
  const [editing, setEditing] = useState(false);
  const days = daysLeft(date);

  const save = (val: string) => {
    setExamDate(val);
    setDate(val);
    setEditing(false);
  };

  const fmtDate = date
    ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div style={{ fontSize: 13, marginTop: 4 }}>
      {date && !editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ opacity: 0.85 }}>📅 {fmtDate}</span>
          <span style={{
            fontWeight: 800, fontSize: 15,
            color: days <= 7 ? '#FEF3C7' : days <= 30 ? '#FDE68A' : '#BBF7D0',
          }}>
            {days === 0 ? T('home_exam_today') : days < 0 ? '—' : `${days} ${T('home_days_left')}`}
          </span>
          <button
            onClick={() => setEditing(true)}
            style={{ fontSize: 11, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: '2px 8px', color: '#fff', cursor: 'pointer' }}
          >
            {T('date_change')}
          </button>
        </div>
      ) : editing ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <input
            type="date"
            defaultValue={date}
            min={new Date().toISOString().split('T')[0]}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none', fontSize: 13, outline: 'none' }}
            onChange={e => e.target.value && save(e.target.value)}
          />
          <button
            onClick={() => setEditing(false)}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            {T('cancel')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditing(true)}
          style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, padding: '6px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          📅 {T('home_set_date')}
        </button>
      )}
      {days >= 0 && days <= 30 && !editing && (
        <div style={{ marginTop: 6, fontSize: 12, background: 'rgba(254,243,199,0.18)', borderRadius: 6, padding: '4px 8px', fontWeight: 600 }}>
          {T('date_30day')}
        </div>
      )}
    </div>
  );
}

export default function Home({ lang, onNavigate }: Props) {
  const T        = useT();
  const streak   = useMemo(() => getStreak(), []);
  const stats    = useMemo(() => getOverallStats(), []);
  const tests    = useMemo(() => getAllTests(), []);
  const todayQs  = useMemo(() => getTodayStudied(), []);
  const focus    = useMemo(() => getTodaysFocus(allQuestions as never, 4), []);
  const rising   = useMemo(() => getRisingTopics(allQuestions as never), []);

  const avgScore = tests.length
    ? Math.round(tests.slice(0, 5).reduce((s, t) => s + (t.score / t.total) * 100, 0) / Math.min(tests.length, 5))
    : null;

  const hrs = new Date().getHours();
  const greeting = hrs < 12 ? T('home_greeting_morning') : hrs < 17 ? T('home_greeting_afternoon') : T('home_greeting_evening');

  return (
    <div className="page page-gap" style={{ paddingTop: 8 }}>

      {/* ── Header: greeting + streak ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--c-text-3)', fontWeight: 500 }}>{greeting} 👋</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--c-text)', lineHeight: 1.2 }}
            className={lang === 'kn' ? 'kn' : ''}>
            {lang === 'kn' ? 'ಕೆಎಸ್ಪಿ ತಯಾರಿ' : 'KSP Tayyari'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {streak.current > 0 && <div style={{ fontSize: 26, lineHeight: 1 }}>🔥</div>}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#EA580C' }}>
            {streak.current} {T('home_streak')}
          </div>
        </div>
      </div>

      {/* ── Exam countdown hero card ── */}
      <div className="card-primary" style={{ borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 100, opacity: 0.07 }}>🚔</div>
        <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 4 }}>
          {T('home_exam_label')}
        </div>
        <ExamDateInline lang={lang} />
        <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>
          {T('home_vacancies')}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button
            className="btn btn-sm"
            style={{ flex: 1, background: 'rgba(255,255,255,0.18)', color: '#fff', borderRadius: 10, border: 'none', fontWeight: 700 }}
            onClick={() => onNavigate('test')}
          >
            {T('home_start_mock')}
          </button>
          <button
            className="btn btn-sm"
            style={{ flex: 1, background: 'rgba(255,255,255,0.12)', color: '#fff', borderRadius: 10, border: '1px solid rgba(255,255,255,0.3)', fontWeight: 700 }}
            onClick={() => onNavigate('insights')}
          >
            {T('home_view_cutoff')}
          </button>
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div className="stats-grid">
        {[
          { val: todayQs,                        label: T('home_qs_done_today') },
          { val: `${stats.accuracy}%`,            label: T('home_accuracy') },
          { val: avgScore !== null ? `${avgScore}%` : '—', label: T('home_avg_score') },
          { val: tests.length,                   label: T('home_tests_done') },
        ].map(({ val, label }) => (
          <div key={label} className="stat-card">
            <div className="stat-value">{val}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Today's Focus ── */}
      {focus.length > 0 && (
        <div className="card">
          <div className="section-header" style={{ marginBottom: 10 }}>
            <span className="section-title">{T('home_today_focus')}</span>
          </div>
          {focus.map((f, i) => {
            const labelColor: Record<string, string> = {
              '🔴 Critical': '#DC2626', '🟠 High': '#EA580C', '🟡 Medium': '#D97706', '🟢 Done': '#16A34A',
            };
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: i < focus.length - 1 ? '1px solid var(--c-border)' : 'none',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `${labelColor[f.urgencyLabel] ?? '#64748B'}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>
                  {SUBJECT_EMOJI[f.subject] ?? '📌'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.topic}
                  </div>
                  <div style={{ fontSize: 11, color: labelColor[f.urgencyLabel] ?? 'var(--c-text-3)', marginTop: 1, fontWeight: 700 }}>
                    {f.urgencyLabel} · {f.questionCount} Qs
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ flexShrink: 0, fontSize: 12, padding: '5px 10px' }}
                  onClick={() => onNavigate('practice', { topic: f.topic })}
                >
                  {T('home_practice_now')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '📚', label: T('home_quick_practice'), color: '#1565C0', tab: 'practice' as Tab },
          { icon: '📝', label: T('home_full_mock'),      color: '#7C3AED', tab: 'test'     as Tab },
          { icon: '📊', label: T('home_insights'),       color: '#EA580C', tab: 'insights' as Tab },
          { icon: '📈', label: T('home_progress'),       color: '#16A34A', tab: 'progress' as Tab },
        ].map(({ icon, label, color, tab }) => (
          <button
            key={tab}
            className="card card-hover"
            style={{ border: '1px solid var(--c-border)', cursor: 'pointer', padding: 14, textAlign: 'left', background: 'none', width: '100%' }}
            onClick={() => onNavigate(tab)}
          >
            <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 13, color }}>{label}</div>
          </button>
        ))}
      </div>

      {/* ── Rising Topics ── */}
      {rising.length > 0 && (
        <div className="card">
          <div className="section-title" style={{ marginBottom: 10 }}>
            🔥 {T('home_rising_topics')}
          </div>
          {rising.slice(0, 3).map((r, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0', borderBottom: i < 2 ? '1px solid var(--c-border)' : 'none',
            }}>
              <span style={{ fontSize: 20 }}>{SUBJECT_EMOJI[r.subject] ?? '📌'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.topic}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{r.subject}</div>
              </div>
              <span className="badge badge-rising">↑</span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

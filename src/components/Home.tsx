// src/components/Home.tsx — with personalized target cutoff + exam date
import React, { useMemo, useState, useEffect } from 'react';
import allQuestions from '../data/pyqs.json';
import { getTodaysFocus } from '../lib/studyEngine';
import { getStreak, getOverallStats, getAllTests, getTodayStudied, getSettings } from '../lib/storage';
import { getRisingTopics } from '../lib/trendEngine';
import { getLatestCutoff, getCutoffTrend } from '../lib/cutoffEngine';
import { useT } from '../lib/i18n';

type Tab = 'home' | 'practice' | 'test' | 'insights' | 'profile';

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

// ── Exam Date helpers ─────────────────────────────────
const EXAM_DATE_KEY = 'ksp_exam_date';
function getExamDate()       { return localStorage.getItem(EXAM_DATE_KEY) || ''; }
function saveExamDate(d: string) { localStorage.setItem(EXAM_DATE_KEY, d); }
function daysLeft(dt: string) {
  if (!dt) return -1;
  return Math.ceil((new Date(dt).getTime() - Date.now()) / 86400000);
}

// ── Personalized Target Banner ─────────────────────────
function TargetCutoffBanner({ lang }: { lang: 'en' | 'kn' }) {
  const settings = useMemo(() => getSettings(), []);
  const cutoffInfo = useMemo(() => getLatestCutoff(settings), [settings]);
  const trend = useMemo(() => getCutoffTrend(settings), [settings]);
  const stats = useMemo(() => getOverallStats(), []);
  const tests = useMemo(() => getAllTests(), []);

  const lastScore = tests.length > 0
    ? Math.round((tests[0].score / tests[0].total) * 100)
    : null;

  const gap = lastScore !== null ? lastScore - cutoffInfo.cutoff : null;
  const catLabel = settings.category.replace(/_/g, ' ');

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A5F, #1565C0)',
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {lang === 'kn' ? 'ನಿಮ್ಮ ಕಟ್-ಆಫ್ ಗುರಿ' : 'Your Cutoff Target'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.85)', marginTop: 2 }}>
            {catLabel} · {settings.region} · {settings.gender === 'M'
              ? (lang === 'kn' ? 'ಪುರುಷ' : 'Male')
              : (lang === 'kn' ? 'ಮಹಿಳೆ' : 'Female')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>
            {cutoffInfo.cutoff}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>
            {lang === 'kn' ? 'ಕಟ್-ಆಫ್ (2023)' : 'cutoff (2023)'}
          </div>
        </div>
      </div>

      {/* Target zones */}
      <div style={{ padding: '12px 14px', display: 'flex', gap: 8 }}>
        {[
          { label: lang === 'kn' ? 'ಕಟ್-ಆಫ್' : 'Cutoff', val: cutoffInfo.cutoff, color: '#DC2626', bg: '#FEF2F2' },
          { label: lang === 'kn' ? 'ಸುರಕ್ಷಿತ' : 'Safe', val: cutoffInfo.target, color: '#D97706', bg: '#FFFBEB' },
          { label: lang === 'kn' ? 'ಆರಾಮದಾಯಕ' : 'Comfortable', val: cutoffInfo.safeZone, color: '#16A34A', bg: '#F0FDF4' },
        ].map(({ label, val, color, bg }) => (
          <div key={label} style={{ flex: 1, background: bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center', border: `1px solid ${color}30` }}>
            <div style={{ fontWeight: 900, fontSize: 20, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 10, color, fontWeight: 700, marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Progress vs target */}
      {lastScore !== null && (
        <div style={{ padding: '0 14px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-text-3)', marginBottom: 4 }}>
            <span>{lang === 'kn' ? 'ಕೊನೆಯ ಮಾಕ್ ಅಂಕ' : 'Last Mock Score'}: <strong style={{ color: 'var(--c-text)' }}>{lastScore}</strong></span>
            <span style={{ fontWeight: 700, color: gap! >= 5 ? 'var(--c-correct)' : gap! >= 0 ? 'var(--c-warn)' : 'var(--c-wrong)' }}>
              {gap! >= 5  ? `✅ +${gap} ${lang === 'kn' ? 'ಸುರಕ್ಷಿತ' : 'above — Safe!'}` :
               gap! >= 0  ? `⚠️ +${gap} ${lang === 'kn' ? 'ಗಡಿರೇಖೆ' : '— Borderline'}` :
                            `❌ ${Math.abs(gap!)} ${lang === 'kn' ? 'ಕಡಿಮೆ' : 'below — Push harder!'}`}
            </span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{
              width: `${Math.min(100, lastScore)}%`,
              background: gap! >= 5 ? 'var(--c-correct)' : gap! >= 0 ? 'var(--c-warn)' : 'var(--c-wrong)',
            }} />
            {/* Cutoff marker */}
            <div style={{
              position: 'absolute', top: -2, left: `${cutoffInfo.cutoff}%`,
              width: 2, height: 10, background: '#DC2626', borderRadius: 1,
            }} />
          </div>
        </div>
      )}

      {/* Trend mini */}
      <div style={{
        padding: '8px 14px', borderTop: '1px solid var(--c-border)',
        background: 'var(--c-surface-2)',
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, color: 'var(--c-text-3)', fontWeight: 600 }}>
          {lang === 'kn' ? 'ಪ್ರವೃತ್ತಿ:' : 'Trend:'}
        </span>
        {trend.map(({ year, cutoff }) => (
          <span key={year} style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px',
            borderRadius: 20, background: 'var(--c-surface)',
            border: '1px solid var(--c-border)', color: 'var(--c-text-2)',
          }}>
            {year}: {cutoff}
          </span>
        ))}
        <span style={{ fontSize: 10, color: 'var(--c-text-4)', marginLeft: 'auto' }}>
          {lang === 'kn' ? '↑ ಹೆಚ್ಚುತ್ತಿದೆ' : '↑ Rising trend'}
        </span>
      </div>

      {/* Change settings hint */}
      <div style={{ padding: '6px 14px 10px', fontSize: 11, color: 'var(--c-text-4)', textAlign: 'center' }}>
        {lang === 'kn'
          ? 'ಪ್ರೊಫೈಲ್ → ⚙️ ಸೆಟ್ಟಿಂಗ್ ನಲ್ಲಿ ವರ್ಗ ಬದಲಾಯಿಸಿ'
          : 'Change category in Profile → ⚙️ Settings'}
      </div>
    </div>
  );
}

// ── Exam Date Widget (inline in hero) ─────────────────
function ExamDateInline({ lang }: { lang: 'en' | 'kn' }) {
  const T = useT();
  const [date,    setDate]    = useState(getExamDate);
  const [editing, setEditing] = useState(false);
  const days = daysLeft(date);

  const save = (val: string) => { saveExamDate(val); setDate(val); setEditing(false); };

  const fmtDate = date
    ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div style={{ fontSize: 13, marginTop: 6 }}>
      {date && !editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ opacity: .85 }}>📅 {fmtDate}</span>
          <span style={{
            fontWeight: 800, fontSize: 16,
            color: days <= 7 ? '#FEF3C7' : days <= 30 ? '#FDE68A' : '#BBF7D0',
          }}>
            {days === 0
              ? (lang === 'kn' ? '🎯 ಇಂದು ಪರೀಕ್ಷೆ!' : '🎯 Exam is today!')
              : days < 0 ? '—'
              : `${days} ${lang === 'kn' ? 'ದಿನ ಉಳಿದಿವೆ' : 'days left'}`}
          </span>
          <button onClick={() => setEditing(true)}
            style={{ fontSize: 11, background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 6, padding: '2px 8px', color: '#fff', cursor: 'pointer' }}>
            {lang === 'kn' ? 'ಬದಲಾಯಿಸಿ' : 'Change'}
          </button>
        </div>
      ) : editing ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <input type="date" defaultValue={date}
            min={new Date().toISOString().split('T')[0]}
            style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: 'none', fontSize: 13, outline: 'none' }}
            onChange={e => e.target.value && save(e.target.value)}
          />
          <button onClick={() => setEditing(false)}
            style={{ background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
            {lang === 'kn' ? 'ರದ್ದು' : 'Cancel'}
          </button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          style={{ background: 'rgba(255,255,255,.18)', border: 'none', borderRadius: 8, padding: '7px 16px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          📅 {lang === 'kn' ? 'ಪರೀಕ್ಷಾ ದಿನಾಂಕ ಹೊಂದಿಸಿ' : 'Set Exam Date →'}
        </button>
      )}
      {days >= 0 && days <= 30 && !editing && (
        <div style={{ marginTop: 6, fontSize: 12, background: 'rgba(254,243,199,.18)', borderRadius: 6, padding: '4px 10px', fontWeight: 600 }}>
          {lang === 'kn'
            ? '⚠️ 30 ದಿನಕ್ಕಿಂತ ಕಡಿಮೆ! ಪ್ರತಿದಿನ ಸಂಪೂರ್ಣ ಪರೀಕ್ಷೆ ಮಾಡಿ.'
            : '⚠️ Under 30 days! Prioritise Full Mocks daily.'}
        </div>
      )}
    </div>
  );
}

// ── Main Home ─────────────────────────────────────────
export default function Home({ lang, onNavigate }: Props) {
  const T       = useT();
  const streak  = useMemo(() => getStreak(), []);
  const stats   = useMemo(() => getOverallStats(), []);
  const tests   = useMemo(() => getAllTests(), []);
  const todayQs = useMemo(() => getTodayStudied(), []);
  const focus   = useMemo(() => getTodaysFocus(allQuestions as never, 4), []);
  const rising  = useMemo(() => getRisingTopics(allQuestions as never), []);

  const avgScore = tests.length
    ? Math.round(tests.slice(0, 5).reduce((s, t) => s + (t.score / t.total) * 100, 0) / Math.min(tests.length, 5))
    : null;

  const hrs = new Date().getHours();
  const greeting = hrs < 12
    ? T('home_greeting_morning')
    : hrs < 17 ? T('home_greeting_afternoon') : T('home_greeting_evening');

  return (
    <div className="page page-gap" style={{ paddingTop: 8 }}>

      {/* ── Greeting ── */}
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

      {/* ── Desktop Two Column Layout Wrapper ── */}
      <div className="home-desktop-grid">
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── Exam hero card ── */}
          <div className="card-primary" style={{ borderRadius: 16, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -20, top: -20, fontSize: 100, opacity: 0.07 }}>🚔</div>
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, marginBottom: 2 }}>
              {lang === 'kn' ? 'ಕೆಎಸ್ಪಿ ಸಿಪಿಸಿ ಪರೀಕ್ಷೆ' : 'KSP CPC Exam'}
            </div>
            <ExamDateInline lang={lang} />
            <div style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>
              {lang === 'kn' ? '3,991 ಹುದ್ದೆಗಳು • ಅಂದಾಜು 1:70+ ಅನುಪಾತ' : '3,991 vacancies • Est. 1:70+ ratio'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-sm"
                style={{ flex: 1, background: 'rgba(255,255,255,.18)', color: '#fff', borderRadius: 10, border: 'none', fontWeight: 700 }}
                onClick={() => onNavigate('test')}>
                {T('home_start_mock')}
              </button>
              <button className="btn btn-sm"
                style={{ flex: 1, background: 'rgba(255,255,255,.12)', color: '#fff', borderRadius: 10, border: '1px solid rgba(255,255,255,.3)', fontWeight: 700 }}
                onClick={() => onNavigate('insights')}>
                {T('home_view_cutoff')}
              </button>
            </div>
          </div>

          {/* ── Personalized Target Cutoff ── */}
          <TargetCutoffBanner lang={lang} />

          {/* ── Quick stats ── */}
          <div className="stats-grid">
            {[
              { val: todayQs,                              label: T('home_qs_done_today') },
              { val: `${stats.accuracy}%`,                  label: T('home_accuracy') },
              { val: avgScore !== null ? `${avgScore}%` : '—', label: T('home_avg_score') },
              { val: tests.length,                          label: T('home_tests_done') },
            ].map(({ val, label }) => (
              <div key={label} className="stat-card">
                <div className="stat-value">{val}</div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── Today's Focus ── */}
          {focus.length > 0 && (
            <div className="card" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div className="section-header" style={{ marginBottom: 10 }}>
                <span className="section-title">{T('home_today_focus')}</span>
              </div>
              {focus.map((f, i) => {
                const labelColor: Record<string, string> = {
                  '🔴 Critical': '#DC2626', '🟠 High': '#EA580C',
                  '🟡 Medium':   '#D97706', '🟢 Done':  '#16A34A',
                };
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < focus.length - 1 ? '1px solid var(--c-border)' : 'none',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: `${labelColor[f.label] ?? '#64748B'}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>
                      {SUBJECT_EMOJI[f.subject] ?? '📌'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.topic}
                      </div>
                      <div style={{ fontSize: 11, color: labelColor[f.label] ?? 'var(--c-text-3)', marginTop: 1, fontWeight: 700 }}>
                        {f.label} · {f.totalQuestions} Qs
                      </div>
                    </div>
                    <button className="btn btn-outline btn-sm"
                      style={{ flexShrink: 0, fontSize: 12, padding: '5px 10px' }}
                      onClick={() => onNavigate('practice', { topic: f.topic })}>
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
              { icon: '👤', label: T('home_progress'),       color: '#16A34A', tab: 'profile'  as Tab },
            ].map(({ icon, label, color, tab }) => (
              <button key={tab} className="card card-hover"
                style={{ border: '1px solid var(--c-border)', cursor: 'pointer', padding: 14, textAlign: 'left', background: 'none', width: '100%', boxSizing: 'border-box' }}
                onClick={() => onNavigate(tab)}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color }}>{label}</div>
              </button>
            ))}
          </div>

          {/* ── Rising Topics ── */}
          {rising.length > 0 && (
            <div className="card" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div className="section-title" style={{ marginBottom: 10 }}>
                🔥 {T('home_rising_topics')}
              </div>
              {rising.slice(0, 3).map((r, i) => {
                const subject = (allQuestions as any[]).find(q => q.topic === r.topic)?.subject || 'Unknown';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0',
                    borderBottom: i < 2 ? '1px solid var(--c-border)' : 'none',
                  }}>
                    <span style={{ fontSize: 20 }}>{SUBJECT_EMOJI[subject] ?? '📌'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r.topic}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{subject}</div>
                    </div>
                    <span className="badge badge-rising">↑</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

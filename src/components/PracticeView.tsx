// src/components/PracticeView.tsx — Complete with live bilingual toggle
import React, { useState, useMemo, useCallback, useRef } from 'react';
import rawQuestions from '../data/pyqs.json';
import { markAnswered, getAllAnswered, getSettings, saveSettings } from '../lib/storage';
import { computeRepeatScores } from '../lib/trendEngine';

interface Q {
  id: number;
  year: string;
  exam_year?: string;
  subject: string;
  topic: string;
  question: string;
  question_kn?: string;
  options: string[];
  options_kn?: string[];
  answer: number;
  correctAnswer?: number;
  explanation?: string;
  explanation_kn?: string;
  paper?: string;
  paper_kn?: string;
}

const raw = rawQuestions as unknown as Record<string, unknown>[];

// Normalise field names
const qs: Q[] = raw.map((r) => ({
  id:           Number(r.id),
  year:         String(r.year ?? r.exam_year ?? ''),
  exam_year:    String(r.exam_year ?? r.year ?? ''),
  subject:      String(r.subject ?? ''),
  topic:        String(r.topic ?? ''),
  question:     String(r.question ?? ''),
  question_kn:  r.question_kn ? String(r.question_kn) : undefined,
  options:      Array.isArray(r.options) ? (r.options as string[]) : [],
  options_kn:   Array.isArray(r.options_kn) ? (r.options_kn as string[]) : undefined,
  answer:       typeof r.correctAnswer === 'number' ? r.correctAnswer : typeof r.answer === 'number' ? r.answer : 0,
  correctAnswer:typeof r.correctAnswer === 'number' ? r.correctAnswer : undefined,
  explanation:  r.explanation ? String(r.explanation) : (r.solution ? String(r.solution) : undefined),
  explanation_kn: r.explanation_kn ? String(r.explanation_kn) : undefined,
  paper:        r.paper ? String(r.paper) : undefined,
  paper_kn:     r.paper_kn ? String(r.paper_kn) : undefined,
}));

const repeatScores = computeRepeatScores(qs as never);

// ── Helpers ──────────────────────────────────────────
const SUBJECT_COLOR: Record<string, string> = {
  'General Awareness': '#D97706',
  'General Science':   '#16A34A',
  'Reasoning':         '#7C3AED',
  'Mathematics':       '#0EA5E9',
};
const SUBJECT_PILL: Record<string, string> = {
  'General Awareness': 'pill-ga',
  'General Science':   'pill-sci',
  'Reasoning':         'pill-rsn',
  'Mathematics':       'pill-mth',
};

const LETTERS = ['A', 'B', 'C', 'D'];

function RepeatBadge({ qid }: { qid: number }) {
  const r = repeatScores[qid];
  if (!r || r.score === 0) return null;
  return (
    <span className={`badge ${r.score >= 2 ? 'badge-high' : 'badge-med'}`}>
      {r.score >= 2 ? '🔴 REPEAT' : '🟡 PREV'} · {r.years.join(', ')}
    </span>
  );
}

// ── Lang Toggle Button ────────────────────────────────
function LangBtn({ lang, onToggle }: { lang: 'en' | 'kn'; onToggle: () => void }) {
  return (
    <button
      className="lang-toggle"
      onClick={onToggle}
      style={{ fontSize: 12 }}
      title="Switch language"
    >
      <span className="lang-dot" />
      {lang === 'en' ? 'ಕನ್ನಡ' : 'English'}
    </button>
  );
}

type BrowseMode   = 'subject' | 'year' | 'topic';
type RepeatFilter = 'all' | 'high' | 'med';
type StatusFilter = 'all' | 'done' | 'wrong' | 'undone';

// ══════════════════════════════════════════════════════
// BROWSE LIST
// ══════════════════════════════════════════════════════
function BrowseList({
  onStart,
}: {
  onStart: (filtered: Q[], idx: number, label: string) => void;
}) {
  const [mode,         setMode]         = useState<BrowseMode>('subject');
  const [repeatFilter, setRepeatFilter] = useState<RepeatFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const answered = useMemo(() => getAllAnswered(), []);

  const years = useMemo(() =>
    [...new Set(qs.map(q => q.year))].filter(Boolean).sort((a, b) => Number(b) - Number(a)), []);

  const subjects = useMemo(() => {
    const m: Record<string, number> = {};
    qs.forEach(q => { m[q.subject] = (m[q.subject] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, []);

  const topicsBySubject = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    qs.forEach(q => {
      if (!m[q.subject]) m[q.subject] = {};
      m[q.subject][q.topic] = (m[q.subject][q.topic] || 0) + 1;
    });
    const r: Record<string, [string, number][]> = {};
    Object.entries(m).forEach(([s, ts]) => {
      r[s] = Object.entries(ts).sort((a, b) => b[1] - a[1]);
    });
    return r;
  }, []);

  const applyFilters = useCallback((base: Q[]) => base.filter(q => {
    const rs = repeatScores[q.id];
    if (repeatFilter === 'high' && (!rs || rs.score < 2)) return false;
    if (repeatFilter === 'med'  && (!rs || rs.score < 1)) return false;
    const a = answered[q.id];
    if (statusFilter === 'done'  && !a)              return false;
    if (statusFilter === 'undone' && a)               return false;
    if (statusFilter === 'wrong' && (!a || a.correct)) return false;
    return true;
  }), [repeatFilter, statusFilter, answered]);

  const topicDone = (subject: string, topic: string) =>
    qs.filter(q => q.subject === subject && q.topic === topic && answered[q.id]).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Mode tabs */}
      <div className="inner-tabs">
        {(['subject', 'year', 'topic'] as BrowseMode[]).map(m => (
          <button key={m} className={`inner-tab${mode === m ? ' active' : ''}`} onClick={() => setMode(m)}>
            {m === 'subject' ? '📖 Subject' : m === 'year' ? '📅 Year' : '🎯 Topic'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8 }}>
        <select
          style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
          value={repeatFilter}
          onChange={e => setRepeatFilter(e.target.value as RepeatFilter)}
        >
          <option value="all">All Questions</option>
          <option value="high">🔴 High Repeat (3+)</option>
          <option value="med">🟡 Repeated (2+)</option>
        </select>
        <select
          style={{ flex: 1, padding: '8px 10px', fontSize: 13 }}
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All Status</option>
          <option value="undone">⬜ Not Done</option>
          <option value="done">✅ Done</option>
          <option value="wrong">❌ Got Wrong</option>
        </select>
      </div>

      {/* ── BY SUBJECT ── */}
      {mode === 'subject' && subjects.map(([subject, total]) => {
        const done  = qs.filter(q => q.subject === subject && answered[q.id]).length;
        const pct   = Math.round((done / total) * 100);
        const color = SUBJECT_COLOR[subject] ?? '#64748B';
        const isExp = expanded === subject;
        const topics = topicsBySubject[subject] ?? [];

        return (
          <div key={subject} className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              style={{ width: '100%', padding: 14, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => setExpanded(isExp ? null : subject)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 4, height: 44, borderRadius: 2, background: color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--c-text)' }}>{subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>
                    {done}/{total} done · {topics.length} topics
                  </div>
                  <div className="progress-bar" style={{ marginTop: 6, height: 4 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: color, animation: 'fillBar 0.8s ease' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color }}>{pct}%</span>
                  <svg style={{ width: 16, color: 'var(--c-text-4)', transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s ease' }}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </button>

            {isExp && (
              <div style={{ borderTop: '1px solid var(--c-border)', animation: 'fadeUp 0.18s ease' }}>
                <div style={{ padding: '10px 14px' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onStart(applyFilters(qs.filter(q => q.subject === subject)), 0, subject)}
                  >
                    Practice All {total} Qs →
                  </button>
                </div>
                {topics.map(([topic, count], ti) => {
                  const td  = topicDone(subject, topic);
                  const tp  = Math.round((td / count) * 100);
                  const hot = qs.filter(q => q.subject === subject && q.topic === topic)
                                .some(q => (repeatScores[q.id]?.score ?? 0) >= 2);
                  return (
                    <button
                      key={topic}
                      style={{
                        width: '100%', padding: '11px 14px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left', borderTop: '1px solid var(--c-border)',
                        display: 'flex', alignItems: 'center', gap: 10, transition: 'var(--t-base)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      onClick={() => onStart(applyFilters(qs.filter(q => q.subject === subject && q.topic === topic)), 0, `${subject} › ${topic}`)}
                    >
                      <span style={{ fontSize: 11, color: 'var(--c-text-4)', width: 20, fontWeight: 700 }}>
                        {ti + 1}.
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)', display: 'flex', gap: 6, alignItems: 'center' }}>
                          {topic}
                          {hot && <span style={{ color: '#DC2626', fontSize: 10, fontWeight: 700 }}>🔴</span>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 1 }}>{td}/{count} done</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: tp === 100 ? 'var(--c-correct)' : 'var(--c-text-4)' }}>
                        {tp === 100 ? '✓' : `${tp}%`}
                      </span>
                      <svg style={{ width: 14, color: 'var(--c-text-4)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── BY YEAR ── */}
      {mode === 'year' && years.map(year => {
        const yqs  = qs.filter(q => q.year === year);
        const done = yqs.filter(q => answered[q.id]).length;
        const pct  = Math.round((done / yqs.length) * 100);
        return (
          <button
            key={year}
            className="card card-hover"
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }}
            onClick={() => onStart(applyFilters(yqs), 0, `KSP PC ${year}`)}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: 'linear-gradient(135deg, #1565C0, #0D47A1)',
              color: '#fff', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              boxShadow: 'var(--shadow-blue)',
            }}>
              <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{year}</div>
              <div style={{ fontSize: 9, opacity: 0.8, marginTop: 1 }}>KSP PC</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>KSP PC {year} Paper</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>
                {yqs.length} questions · ~{Math.ceil(yqs.length * 0.9)} min
              </div>
              <div className="progress-bar" style={{ marginTop: 6, height: 4 }}>
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: pct === 100 ? 'var(--c-correct)' : 'var(--c-primary)' }}>{pct}%</div>
              <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{done}/{yqs.length}</div>
            </div>
          </button>
        );
      })}

      {/* ── BY TOPIC ── */}
      {mode === 'topic' && (() => {
        const topicMap: Record<string, { subject: string; count: number }> = {};
        qs.forEach(q => {
          const k = `${q.subject}::${q.topic}`;
          if (!topicMap[k]) topicMap[k] = { subject: q.subject, count: 0 };
          topicMap[k].count++;
        });
        return Object.entries(topicMap)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([key, { subject, count }]) => {
            const topic   = key.split('::')[1];
            const topicQs = qs.filter(q => q.subject === subject && q.topic === topic);
            const done    = topicQs.filter(q => answered[q.id]).length;
            const pct     = Math.round((done / count) * 100);
            const hasHot  = topicQs.some(q => (repeatScores[q.id]?.score ?? 0) >= 2);
            return (
              <button
                key={key}
                style={{
                  padding: '12px 14px', border: '1px solid var(--c-border)',
                  borderRadius: 10, background: 'none', cursor: 'pointer',
                  textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', transition: 'var(--t-base)', boxShadow: 'var(--shadow-xs)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--c-surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                onClick={() => onStart(applyFilters(topicQs), 0, `${subject} › ${topic}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    {topic}
                    {hasHot && <span style={{ color: '#DC2626', fontSize: 10 }}>🔴</span>}
                  </div>
                  <div style={{ marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`badge ${SUBJECT_PILL[subject] ?? 'badge-low'}`} style={{ fontSize: 10 }}>{subject}</span>
                    <span style={{ fontSize: 11, color: 'var(--c-text-4)' }}>{count} Qs</span>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? 'var(--c-correct)' : 'var(--c-text-4)', flexShrink: 0 }}>
                  {pct === 100 ? '✓ Done' : `${pct}%`}
                </span>
              </button>
            );
          });
      })()}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// QUESTION VIEW — with live bilingual toggle
// ══════════════════════════════════════════════════════
function QuestionView({
  questions, startIdx, label, lang: initialLang, onLangToggle, onDone,
}: {
  questions: Q[];
  startIdx: number;
  label: string;
  lang: 'en' | 'kn';
  onLangToggle: () => void;
  onDone: () => void;
}) {
  const [idx,             setIdx]             = useState(startIdx);
  const [selected,        setSelected]        = useState<number | null>(null);
  const [showExp,         setShowExp]         = useState(false);
  const [lang,            setLang]            = useState<'en' | 'kn'>(initialLang);
  const [langAnimKey,     setLangAnimKey]     = useState(0);
  const answeredRef = useRef(getAllAnswered());

  const q = questions[idx];
  if (!q) return null;

  const prevAnswer = answeredRef.current[q.id];
  const isAnswered = prevAnswer !== undefined || selected !== null;

  const toggleLang = () => {
    setLang(l => l === 'en' ? 'kn' : 'en');
    setLangAnimKey(k => k + 1);
    onLangToggle();
  };

  const handleSelect = (optIdx: number) => {
    if (isAnswered) return;
    setSelected(optIdx);
    const correct = optIdx === q.answer;
    markAnswered(q.id, correct, 0);
    answeredRef.current = { ...answeredRef.current, [q.id]: { correct, ts: Date.now(), timeSec: 0 } };
    setShowExp(false);
  };

  const goNext = () => {
    if (idx < questions.length - 1) {
      setIdx(i => i + 1);
      setSelected(null);
      setShowExp(false);
    } else {
      onDone();
    }
  };

  const goPrev = () => {
    if (idx > 0) {
      setIdx(i => i - 1);
      setSelected(null);
      setShowExp(false);
    }
  };

  // Bilingual content
  const qText    = lang === 'kn' && q.question_kn ? q.question_kn : q.question;
  const opts     = lang === 'kn' && q.options_kn?.length ? q.options_kn : q.options;
  const expText  = lang === 'kn' && q.explanation_kn?.trim()
    ? q.explanation_kn
    : q.explanation;
  const paperLabel = lang === 'kn' && q.paper_kn ? q.paper_kn : (q.paper || `KSP PC ${q.year}`);
  const rs = repeatScores[q.id];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── Exam header bar ── */}
      <div className="q-exam-header" style={{ position: 'sticky', top: 56, zIndex: 10 }}>
        <span className="q-exam-year">{q.year}</span>
        <span className="q-exam-dot" />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {paperLabel} · {q.subject}
        </span>
        <span style={{ color: 'var(--c-text-4)', fontWeight: 500 }}>
          {idx + 1}/{questions.length}
        </span>
        <LangBtn lang={lang} onToggle={toggleLang} />
      </div>

      {/* ── Progress ── */}
      <div className="progress-bar" style={{ height: 3, borderRadius: 0 }}>
        <div className="progress-fill" style={{ width: `${((idx + 1) / questions.length) * 100}%` }} />
      </div>

      <div className="page page-gap" style={{ flex: 1 }}>

        {/* ── Badges ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span className={`badge ${SUBJECT_PILL[q.subject] ?? 'badge-low'}`}>{q.topic}</span>
          {rs && rs.score > 0 && <RepeatBadge qid={q.id} />}
        </div>

        {/* ── Question text (animated on lang change) ── */}
        <div key={`q-${langAnimKey}`} className={lang === 'kn' ? 'q-text-kn lang-enter' : 'q-text-en lang-enter'}>
          {qText}
        </div>

        {/* ── Options ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opts.map((opt, i) => {
            let cls = 'option-btn';
            if (isAnswered) {
              if (i === q.answer) cls += ' correct';
              else if (i === selected && selected !== q.answer) cls += ' wrong';
            } else if (selected === i) {
              cls += ' selected';
            }

            return (
              <button key={`${langAnimKey}-${i}`} className={cls} onClick={() => handleSelect(i)} disabled={isAnswered}>
                <span className="option-letter">{LETTERS[i]}</span>
                <span key={`opt-${langAnimKey}-${i}`} style={{ flex: 1, lineHeight: lang === 'kn' ? 1.9 : 1.5 }}
                  className={lang === 'kn' ? 'kn lang-enter' : 'lang-enter'}>
                  {opt}
                </span>
                {isAnswered && i === q.answer && (
                  <svg style={{ width: 20, color: 'var(--c-correct)', flexShrink: 0 }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                )}
                {isAnswered && i === selected && selected !== q.answer && (
                  <svg style={{ width: 20, color: 'var(--c-wrong)', flexShrink: 0 }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Explanation (auto-show after answer) ── */}
        {isAnswered && expText && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }}
              onClick={() => setShowExp(e => !e)}>
              {showExp ? '▲ Hide' : '💡 Show Explanation'}
            </button>
            {showExp && (
              <div className={`explanation-box${lang === 'kn' ? ' kn' : ''}`}>
                {expText}
              </div>
            )}
          </div>
        )}

        {/* No explanation fallback */}
        {isAnswered && !expText && (
          <div style={{ padding: '10px 14px', background: 'var(--c-surface-2)', borderRadius: 8, fontSize: 13, color: 'var(--c-text-3)' }}>
            {selected === q.answer
              ? '✅ Correct! Well done.'
              : `✗ Correct answer: ${LETTERS[q.answer]}. ${opts[q.answer]}`}
          </div>
        )}
      </div>

      {/* ── Footer navigation ── */}
      <div style={{
        position: 'sticky', bottom: 68, background: 'var(--c-surface)',
        borderTop: '1px solid var(--c-border)', padding: '10px 16px',
        display: 'flex', gap: 10, boxShadow: '0 -4px 12px rgba(0,0,0,.06)',
      }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={goPrev} disabled={idx === 0}>
          ← Prev
        </button>
        <button
          className={`btn ${idx < questions.length - 1 ? 'btn-primary' : 'btn-success'}`}
          style={{ flex: 2 }}
          onClick={goNext}
        >
          {idx < questions.length - 1 ? 'Next →' : '✓ Finish'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════
interface PracticeProps {
  lang: 'en' | 'kn';
  onLangToggle: () => void;
  initialTopic?: string;
}

export default function PracticeView({ lang, onLangToggle, initialTopic }: PracticeProps) {
  const [activeQs,  setActiveQs]  = useState<Q[] | null>(null);
  const [label,     setLabel]     = useState('');

  React.useEffect(() => {
    if (initialTopic) {
      const filtered = qs.filter(q => q.topic === initialTopic || q.subject === initialTopic);
      if (filtered.length > 0) { setActiveQs(filtered); setLabel(initialTopic); }
    }
  }, [initialTopic]);

  const handleStart = (questions: Q[], idx: number, lbl: string) => {
    setActiveQs(questions);
    setLabel(lbl);
  };

  if (activeQs && activeQs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <div>No questions match filters</div>
        <button className="btn btn-outline" onClick={() => setActiveQs(null)}>← Back</button>
      </div>
    );
  }

  return (
    <>
      {!activeQs && (
        <>
          <div className="top-bar">
            <span className="top-bar-title">📚 PYQ Practice</span>
            <span className="top-bar-badge">{qs.length} Qs</span>
          </div>
          <div className="page">
            <BrowseList onStart={handleStart} />
          </div>
        </>
      )}

      {activeQs && (
        <>
          <div className="top-bar">
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px 4px 0', color: 'var(--c-primary)', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setActiveQs(null)}
            >
              <svg style={{ width: 18 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Back
            </button>
            <span className="top-bar-title" style={{ fontSize: 14 }}>{label}</span>
          </div>
          <QuestionView
            questions={activeQs}
            startIdx={0}
            label={label}
            lang={lang}
            onLangToggle={onLangToggle}
            onDone={() => setActiveQs(null)}
          />
        </>
      )}
    </>
  );
}

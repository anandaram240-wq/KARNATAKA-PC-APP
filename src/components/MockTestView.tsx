// src/components/MockTestView.tsx — Complete upgrade with bilingual + exam date
import React, { useState, useEffect, useRef, useCallback } from 'react';
import rawQuestions from '../data/pyqs.json';
import cutoffData from '../data/cutoffs.json';
import { saveTestResult, getSettings } from '../lib/storage';

interface Q {
  id: number;
  year: string;
  subject: string;
  topic: string;
  question: string;
  question_kn?: string;
  options: string[];
  options_kn?: string[];
  answer: number;
  correctAnswer?: number;
  explanation?: string;
  paper?: string;
}

const raw = rawQuestions as unknown as Record<string, unknown>[];
const allQs: Q[] = raw.map(r => ({
  id:          Number(r.id),
  year:        String(r.year ?? r.exam_year ?? ''),
  subject:     String(r.subject ?? ''),
  topic:       String(r.topic ?? ''),
  question:    String(r.question ?? ''),
  question_kn: r.question_kn ? String(r.question_kn) : undefined,
  options:     Array.isArray(r.options)    ? (r.options    as string[]) : [],
  options_kn:  Array.isArray(r.options_kn) ? (r.options_kn as string[]) : undefined,
  answer:      typeof r.correctAnswer === 'number' ? r.correctAnswer : typeof r.answer === 'number' ? r.answer : 0,
  correctAnswer: typeof r.correctAnswer === 'number' ? r.correctAnswer : undefined,
  explanation: r.explanation ? String(r.explanation) : (r.solution ? String(r.solution) : undefined),
  paper:       r.paper ? String(r.paper) : undefined,
}));

type TestType = 'full' | 'year' | 'subject' | 'topic';

interface TestConfig {
  type: TestType;
  label: string;
  questions: Q[];
  timeMinutes: number;
}

const LETTERS = ['A', 'B', 'C', 'D'];

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

function buildTest(type: TestType, param?: string): TestConfig | null {
  const bySubject: Record<string, Q[]> = {};
  allQs.forEach(q => { if (!bySubject[q.subject]) bySubject[q.subject] = []; bySubject[q.subject].push(q); });
  const pick = (sub: string, n: number) => shuffle(bySubject[sub] ?? []).slice(0, n);

  if (type === 'full') {
    const qs = shuffle([
      ...pick('General Awareness', 70),
      ...pick('General Science', 21),
      ...pick('Reasoning', 7),
      ...pick('Mathematics', 2),
    ]).slice(0, 100);
    return { type, label: 'Full Mock Test', questions: qs, timeMinutes: 90 };
  }
  if (type === 'year' && param) {
    const qs = allQs.filter(q => q.year === param);
    return { type, label: `KSP PC ${param} Paper`, questions: qs, timeMinutes: 90 };
  }
  if (type === 'subject' && param) {
    return { type, label: `${param} Test`, questions: shuffle(allQs.filter(q => q.subject === param)).slice(0, 30), timeMinutes: 25 };
  }
  if (type === 'topic' && param) {
    return { type, label: `${param} Test`, questions: shuffle(allQs.filter(q => q.topic === param)).slice(0, 20), timeMinutes: 18 };
  }
  return null;
}

// ── Exam Date Widget ──────────────────────────────────
function ExamDateWidget() {
  const [examDate, setExamDate] = useState(() => {
    return localStorage.getItem('ksp_exam_date') || '';
  });
  const [editing, setEditing] = useState(false);

  const save = (val: string) => {
    localStorage.setItem('ksp_exam_date', val);
    setExamDate(val);
    setEditing(false);
  };

  const daysLeft = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="card" style={{ background: 'var(--c-surface-2)', padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>📅</span>
        <div style={{ flex: 1 }}>
          {examDate && !editing ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                Exam Date: {new Date(examDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 13, color: daysLeft! <= 30 ? 'var(--c-wrong)' : daysLeft! <= 60 ? 'var(--c-warn)' : 'var(--c-correct)', fontWeight: 700, marginTop: 2 }}>
                {daysLeft === 0 ? '🔔 Exam is today!' : `⏳ ${daysLeft} days remaining`}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text-2)' }}>Set your exam date</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>Get personalised countdown</div>
            </>
          )}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setEditing(true)}
          style={{ flexShrink: 0, padding: '6px 10px', fontSize: 12 }}
        >
          {examDate ? 'Change' : 'Set Date'}
        </button>
      </div>

      {editing && (
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <input
            type="date"
            defaultValue={examDate}
            min={new Date().toISOString().split('T')[0]}
            style={{ flex: 1, padding: '8px 12px', fontSize: 14, border: '1.5px solid var(--c-primary)', borderRadius: 8, outline: 'none' }}
            onChange={e => e.target.value && save(e.target.value)}
          />
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      )}

      {daysLeft !== null && daysLeft <= 30 && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--c-wrong-bg)', border: '1px solid var(--c-wrong-border)', borderRadius: 8, fontSize: 12, color: 'var(--c-wrong)', fontWeight: 600 }}>
          ⚠️ Less than 30 days! Prioritise Full Mocks daily.
        </div>
      )}
    </div>
  );
}

// ── Pre-Test Setup ────────────────────────────────────
interface PreTestProps {
  cfg: TestConfig;
  onStart: (lang: 'en' | 'kn', shuffle: boolean, timer: boolean) => void;
  onCancel: () => void;
  lang: 'en' | 'kn';
}

function PreTestSetup({ cfg, onStart, onCancel, lang: globalLang }: PreTestProps) {
  const [lang,       setLang]       = useState<'en' | 'kn'>(globalLang);
  const [doShuffle,  setDoShuffle]  = useState(false);
  const [showTimer,  setShowTimer]  = useState(true);

  return (
    <div className="page page-gap" style={{ paddingTop: 24 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📝</div>
        <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: -0.5 }}>{cfg.label}</div>
        <div style={{ fontSize: 13, color: 'var(--c-text-3)', marginTop: 4 }}>
          {cfg.questions.length} questions · {cfg.timeMinutes} minutes · −0.25 negative marking
        </div>
      </div>

      {/* Setup options */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Test Settings</div>

        {/* Language */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Language</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['en', 'kn'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  flex: 1, padding: '10px 0', border: `2px solid ${lang === l ? 'var(--c-primary)' : 'var(--c-border)'}`,
                  borderRadius: 10, background: lang === l ? 'var(--c-primary-light)' : 'var(--c-surface)',
                  fontWeight: 700, fontSize: 14, cursor: 'pointer', color: lang === l ? 'var(--c-primary)' : 'var(--c-text-2)',
                  transition: 'var(--t-base)',
                }}
              >
                {l === 'en' ? '🇬🇧 English' : '🇮🇳 ಕನ್ನಡ'}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        {[
          { label: 'Shuffle Questions', sub: 'Randomise question order', val: doShuffle, set: setDoShuffle },
          { label: 'Show Timer',        sub: `${cfg.timeMinutes} min countdown`,  val: showTimer,  set: setShowTimer  },
        ].map(({ label, sub, val, set }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 1 }}>{sub}</div>
            </div>
            <button
              onClick={() => set(v => !v)}
              style={{
                width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                background: val ? 'var(--c-primary)' : 'var(--c-surface-3)',
                position: 'relative', transition: 'var(--t-base)', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 3, left: val ? 24 : 3,
                width: 20, height: 20, borderRadius: '50%', background: '#fff',
                boxShadow: 'var(--shadow-sm)', transition: 'left 0.2s ease',
              }} />
            </button>
          </div>
        ))}
      </div>

      {/* Negative marking warning */}
      <div style={{ padding: '10px 14px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10, fontSize: 13, color: '#92400E', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span>⚠️</span>
        <div>
          <strong>Negative Marking:</strong> −¼ mark for each wrong answer.
          Minimum 30 marks (30%) required to qualify. Leave blank if unsure.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => onStart(lang, doShuffle, showTimer)}>
          Start Test →
        </button>
      </div>
    </div>
  );
}

// ── Active Test ───────────────────────────────────────
function ActiveTest({
  cfg, lang: testLang, onFinish
}: {
  cfg: TestConfig; lang: 'en' | 'kn'; onFinish: () => void;
}) {
  const [idx,         setIdx]         = useState(0);
  const [answers,     setAnswers]     = useState<Record<number, number>>({});
  const [marked,      setMarked]      = useState<Set<number>>(new Set());
  const [showPalette, setShowPalette] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeLeft,    setTimeLeft]    = useState(cfg.timeMinutes * 60);
  const [submitted,   setSubmitted]   = useState(false);
  const [result,      setResult]      = useState<ReturnType<typeof calcResult> | null>(null);
  const [reviewMode,  setReviewMode]  = useState(false);
  const [showExp,     setShowExp]     = useState<Record<number, boolean>>({});
  const [reviewFilter, setReviewFilter] = useState<'all' | 'wrong' | 'correct' | 'skipped'>('all');
  const [lang,        setLang]        = useState<'en' | 'kn'>(testLang);
  const [langAnimKey, setLangAnimKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(intervalRef.current!); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const fmt = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const timerCls = timeLeft <= 300 ? 'danger' : timeLeft <= 600 ? 'warn' : '';

  const calcResult = useCallback(() => {
    let correct = 0, wrong = 0;
    const breakdown: Record<string, { correct: number; total: number }> = {};
    cfg.questions.forEach(q => {
      if (!breakdown[q.subject]) breakdown[q.subject] = { correct: 0, total: 0 };
      breakdown[q.subject].total++;
      const a = answers[q.id];
      if (a === undefined) return;
      if (a === q.answer) { correct++; breakdown[q.subject].correct++; }
      else wrong++;
    });
    const raw   = correct - wrong * 0.25;
    const score = Math.max(0, Math.round(raw * 100) / 100);
    return { correct, wrong, skipped: cfg.questions.length - correct - wrong, raw, score, pct: Math.round((score / cfg.questions.length) * 100), breakdown };
  }, [answers, cfg.questions]);

  const handleSubmit = useCallback(() => {
    clearInterval(intervalRef.current!);
    const r = calcResult();
    setResult(r);
    setSubmitted(true);
    const settings = getSettings();
    saveTestResult({
      id: `${Date.now()}`,
      type: cfg.type,
      label: cfg.label,
      date: Date.now(),
      score: r.score,
      total: cfg.questions.length,
      timeSec: cfg.timeMinutes * 60 - timeLeft,
      breakdown: r.breakdown,
      answers,
    });
  }, [calcResult, cfg, timeLeft, answers]);

  const q = cfg.questions[idx];

  const toggleLang = () => {
    setLang(l => l === 'en' ? 'kn' : 'en');
    setLangAnimKey(k => k + 1);
  };

  // Result screen
  if (submitted && result && !reviewMode) {
    const cd = cutoffData as unknown as Array<{ year: number; cutoffs: Record<string, number> | null }>;
    const latest  = cd.filter(c => c.cutoffs).slice(-2)[0];
    const cutoff  = latest?.cutoffs?.['General_M'] ?? 75;
    const gap     = result.score - cutoff;
    const pct     = result.pct;
    const circCls = pct >= 70 ? 'pass' : pct >= 40 ? 'warn' : 'fail';
    const zoneCls = pct >= 70 ? 'safe-zone' : pct >= 40 ? 'border-zone' : 'risk-zone';

    return (
      <div className="page page-gap bounce-in">
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 20 }}>Test Complete 🎉</div>
        <div style={{ textAlign: 'center', color: 'var(--c-text-3)', fontSize: 13 }}>{cfg.label}</div>

        {/* Score card */}
        <div className={`card ${zoneCls}`} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 20 }}>
          <div className={`score-circle ${circCls}`}>
            <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1 }}>{result.score}</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>/ {cfg.questions.length}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{pct}%</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              ✓ {result.correct} · ✗ {result.wrong} · — {result.skipped}
            </div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>
              Raw: {result.raw.toFixed(2)} (−0.25 penalty applied)
            </div>
          </div>
        </div>

        {/* Cutoff bar */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Cutoff Comparison</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-text-3)', marginBottom: 4 }}>
            <span>0</span><span>Cutoff ({cutoff})</span><span>100</span>
          </div>
          <div className="cutoff-bar-track">
            <div className="cutoff-bar-fill" style={{ width: `${result.score}%`, background: gap >= 0 ? 'var(--c-correct)' : 'var(--c-wrong)' }} />
            <div className="cutoff-line" style={{ left: `${cutoff}%` }} />
          </div>
          <div style={{ marginTop: 10, fontWeight: 700, fontSize: 14, color: gap >= 5 ? 'var(--c-correct)' : gap >= 0 ? 'var(--c-warn)' : 'var(--c-wrong)' }}>
            {gap >= 5  ? `✅ ${gap.toFixed(1)} marks above cutoff — Safe zone!` :
             gap >= 0  ? `⚠️ ${gap.toFixed(1)} marks above — Borderline, push +5` :
                         `❌ ${Math.abs(gap).toFixed(1)} marks below cutoff`}
          </div>
        </div>

        {/* Subject breakdown */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Subject Breakdown</div>
          {Object.entries(result.breakdown).map(([sub, { correct, total }]) => {
            const acc = Math.round((correct / total) * 100);
            return (
              <div key={sub} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{sub}</span>
                  <span style={{ fontWeight: 700, color: acc >= 70 ? 'var(--c-correct)' : acc >= 50 ? 'var(--c-warn)' : 'var(--c-wrong)' }}>
                    {correct}/{total} ({acc}%)
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${acc}%`, background: acc >= 70 ? 'var(--c-correct)' : acc >= 50 ? 'var(--c-warn)' : 'var(--c-wrong)' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setReviewMode(true)}>Review →</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onFinish}>New Test</button>
        </div>
      </div>
    );
  }

  // Review mode
  if (submitted && reviewMode) {
    const filtered = cfg.questions.filter(q => {
      const a = answers[q.id];
      if (reviewFilter === 'correct') return a === q.answer;
      if (reviewFilter === 'wrong')   return a !== undefined && a !== q.answer;
      if (reviewFilter === 'skipped') return a === undefined;
      return true;
    });

    return (
      <div className="page page-gap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setReviewMode(false)}>← Results</button>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Review Questions</div>
          <button className="lang-toggle" onClick={toggleLang} style={{ marginLeft: 'auto', fontSize: 11 }}>
            <span className="lang-dot"/>{lang === 'en' ? 'ಕನ್ನಡ' : 'EN'}
          </button>
        </div>
        <div className="inner-tabs">
          {(['all','wrong','correct','skipped'] as const).map(f => (
            <button key={f} className={`inner-tab${reviewFilter === f ? ' active' : ''}`} onClick={() => setReviewFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {filtered.map((q, i) => {
          const ua = answers[q.id];
          const ok = ua === q.answer;
          const qText = lang === 'kn' && q.question_kn ? q.question_kn : q.question;
          const opts  = lang === 'kn' && q.options_kn?.length ? q.options_kn : q.options;
          return (
            <div key={q.id} className="card" style={{ borderLeft: `3px solid ${ua === undefined ? 'var(--c-text-4)' : ok ? 'var(--c-correct)' : 'var(--c-wrong)'}` }}>
              <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginBottom: 6 }}>
                Q{i+1} · KSP PC {q.year} · {q.topic}
              </div>
              <div className={`q-text-${lang === 'kn' ? 'kn' : 'en'}`} style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
                {qText}
              </div>
              {opts.map((opt, oi) => (
                <div key={oi} style={{
                  padding: '8px 12px', borderRadius: 8, marginBottom: 6, fontSize: 13,
                  background: oi === q.answer ? 'var(--c-correct-bg)' : oi === ua && ua !== q.answer ? 'var(--c-wrong-bg)' : 'var(--c-surface-2)',
                  border: `1px solid ${oi === q.answer ? 'var(--c-correct-border)' : oi === ua && ua !== q.answer ? 'var(--c-wrong-border)' : 'var(--c-border)'}`,
                  color: oi === q.answer ? '#14532D' : oi === ua && ua !== q.answer ? '#7F1D1D' : 'var(--c-text)',
                  fontWeight: oi === q.answer || oi === ua ? 600 : 400,
                  fontFamily: lang === 'kn' ? "'Noto Serif Kannada', serif" : undefined,
                  lineHeight: lang === 'kn' ? 1.9 : 1.5,
                }}>
                  {LETTERS[oi]}. {opt} {oi === q.answer ? '✓' : oi === ua ? '✗' : ''}
                </div>
              ))}
              {q.explanation && (
                <>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }}
                    onClick={() => setShowExp(e => ({ ...e, [q.id]: !e[q.id] }))}>
                    {showExp[q.id] ? '▲ Hide' : '💡 Explanation'}
                  </button>
                  {showExp[q.id] && <div className="explanation-box" style={{ marginTop: 8 }}>{q.explanation}</div>}
                </>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <div className="empty-state"><div>No questions in this category.</div></div>}
      </div>
    );
  }

  // Active test UI
  const qText = lang === 'kn' && q.question_kn ? q.question_kn : q.question;
  const opts  = lang === 'kn' && q.options_kn?.length ? q.options_kn : q.options;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh',
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 540,
      background: 'var(--c-surface)',
      zIndex: 90,
    }}>
      {/* Test header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)', padding: '10px 16px',
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text-2)' }}>{cfg.label}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="lang-toggle" onClick={toggleLang} style={{ fontSize: 11, padding: '3px 8px' }}>
              <span className="lang-dot"/>{lang === 'en' ? 'ಕನ್ನಡ' : 'EN'}
            </button>
            <div className={`timer ${timerCls}`}>{fmt(timeLeft)}</div>
          </div>
        </div>
        <div className="progress-bar" style={{ height: 3 }}>
          <div className="progress-fill" style={{ width: `${((idx+1)/cfg.questions.length)*100}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--c-text-4)' }}>
          <span>Q {idx+1} / {cfg.questions.length}</span>
          <span>Answered: {Object.keys(answers).length} · Marked: {marked.size}</span>
        </div>
      </div>

      {/* Scrollable question area */}
      <div className="page page-gap" style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
        {/* Exam label */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span className="q-exam-year">{q.year}</span>
          <span style={{ fontSize: 12, color: 'var(--c-text-3)', fontWeight: 600 }}>
            {q.subject} · {q.topic}
          </span>
        </div>

        {/* Question */}
        <div key={`${langAnimKey}-${idx}`} className={`lang-enter ${lang === 'kn' ? 'q-text-kn' : 'q-text-en'}`}>
          {qText}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {opts.map((opt, i) => {
            const sel = answers[q.id] === i;
            return (
              <button
                key={`${langAnimKey}-${i}`}
                className={`option-btn${sel ? ' selected' : ''}`}
                onClick={() => setAnswers(a => ({ ...a, [q.id]: i }))}
              >
                <span className="option-letter">{LETTERS[i]}</span>
                <span style={{ flex: 1, textAlign: 'left', lineHeight: lang === 'kn' ? 1.9 : 1.5 }}
                  className={lang === 'kn' ? 'kn' : ''}>
                  {opt}
                </span>
                {sel && <span style={{ color: 'var(--c-primary)', fontSize: 20, flexShrink: 0 }}>●</span>}
              </button>
            );
          })}
        </div>

        {/* Mark & palette */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${marked.has(q.id) ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => setMarked(m => { const n = new Set(m); n.has(q.id) ? n.delete(q.id) : n.add(q.id); return n; })}
          >
            📌 {marked.has(q.id) ? 'Marked' : 'Mark for Review'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPalette(p => !p)}>
            🗂 Palette
          </button>
        </div>

        {showPalette && (
          <div style={{ animation: 'fadeUp 0.18s ease' }}>
            <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--c-surface-3)', marginRight: 4, verticalAlign: 'middle' }}/>Unanswered</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--c-primary)', marginRight: 4, verticalAlign: 'middle' }}/>Answered</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--c-gold)', marginRight: 4, verticalAlign: 'middle' }}/>Marked</span>
            </div>
            <div className="palette-grid">
              {cfg.questions.map((pq, pi) => (
                <button
                  key={pq.id}
                  className={`palette-dot${pi === idx ? ' current' : ''}${marked.has(pq.id) ? ' marked' : answers[pq.id] !== undefined ? ' answered' : ' unanswered'}`}
                  onClick={() => { setIdx(pi); setShowPalette(false); }}
                >
                  {pi+1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom footer — zero fluctuation */}
      <div style={{
        flexShrink: 0,
        background: 'var(--c-surface)',
        borderTop: '1px solid var(--c-border)',
        padding: '10px 16px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
        display: 'flex', gap: 10,
        boxShadow: '0 -4px 12px rgba(0,0,0,.06)',
      }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setIdx(i => Math.max(0,i-1))} disabled={idx === 0}>← Prev</button>
        {idx < cfg.questions.length - 1
          ? <button className="btn btn-primary" style={{ flex: 2 }} onClick={() => setIdx(i => i+1)}>Next →</button>
          : <button className="btn btn-success" style={{ flex: 2 }} onClick={() => setShowConfirm(true)}>Submit ✓</button>
        }
      </div>

      {/* Submit confirm */}
      {showConfirm && (
        <div className="bottom-sheet-overlay" onClick={() => setShowConfirm(false)}>
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 540 }}>
            <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Submit Test?</div>
              <div style={{ fontSize: 14, color: 'var(--c-text-2)', marginBottom: 16 }}>
                Answered: <strong>{Object.keys(answers).length}</strong> / {cfg.questions.length}<br/>
                Unanswered: <strong>{cfg.questions.length - Object.keys(answers).length}</strong> (no marks deducted)
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setShowConfirm(false); handleSubmit(); }}>Yes, Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Selector ──────────────────────────────────────────
function Selector({ onStart }: { onStart: (cfg: TestConfig, lang: 'en' | 'kn') => void }) {
  const [pendingCfg, setPendingCfg] = useState<TestConfig | null>(null);
  const [mode, setMode] = useState<'main' | 'year' | 'subject' | 'topic'>('main');
  const years    = [...new Set(allQs.map(q => q.year))].filter(Boolean).sort((a,b) => Number(b)-Number(a));
  const subjects = [...new Set(allQs.map(q => q.subject))];
  const topicMap: Record<string,number> = {};
  allQs.forEach(q => { topicMap[q.topic] = (topicMap[q.topic]||0)+1; });
  const topics = Object.entries(topicMap).sort((a,b)=>b[1]-a[1]).slice(0,30);

  const pick = (type: TestType, param?: string) => {
    const cfg = buildTest(type, param);
    if (cfg) setPendingCfg(cfg);
  };

  if (pendingCfg) {
    return (
      <>
        <div className="top-bar">
          <button style={{ background:'none',border:'none',cursor:'pointer',color:'var(--c-primary)',fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:4,padding:'4px 8px 4px 0' }}
            onClick={() => setPendingCfg(null)}>
            <svg style={{width:18}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            Back
          </button>
          <span className="top-bar-title" style={{fontSize:14}}>Test Setup</span>
        </div>
        <PreTestSetup
          cfg={pendingCfg}
          lang="en"
          onStart={(lang, doShuffle) => {
            const cfg = { ...pendingCfg, questions: doShuffle ? shuffle(pendingCfg.questions) : pendingCfg.questions };
            onStart(cfg, lang);
          }}
          onCancel={() => setPendingCfg(null)}
        />
      </>
    );
  }

  return (
    <>
      <div className="top-bar">
        <span className="top-bar-title">📝 Mock Tests</span>
      </div>
      <div className="page page-gap">
        <ExamDateWidget />

        {mode === 'main' && (
          <>
            {/* Full Mock — hero card */}
            <button
              className="card-primary"
              style={{ borderRadius: 16, cursor: 'pointer', border: 'none', textAlign: 'left', width: '100%', position: 'relative', overflow: 'hidden' }}
              onClick={() => pick('full')}
            >
              <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 80, opacity: 0.1 }}>📝</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6, fontWeight: 600 }}>RECOMMENDED · KSP CPC 2026</div>
              <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6, letterSpacing: -0.5 }}>Full Mock Test</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 16 }}>
                100 Qs · 90 min · −0.25 negative marking<br/>
                Weighted: 70 GA + 21 Sci + 7 Reasoning + 2 Maths
              </div>
              <div style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 10, padding: '11px 18px', fontWeight: 700, fontSize: 15, textAlign: 'center' }}>
                Start Full Mock →
              </div>
            </button>

            {[
              { icon: '📅', label: 'Year-Wise Paper', sub: 'Solve real paper from a specific year', action: () => setMode('year') },
              { icon: '📖', label: 'Subject Test',    sub: '30 Qs · 25 min',                        action: () => setMode('subject') },
              { icon: '🎯', label: 'Topic Drill',     sub: '20 Qs · 18 min · focus one topic',       action: () => setMode('topic') },
            ].map(({ icon, label, sub, action }) => (
              <button key={label} className="card card-hover"
                style={{ border: '1px solid var(--c-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, padding: 14, width: '100%', background: 'none', textAlign: 'left' }}
                onClick={action}>
                <span style={{ fontSize: 30 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>{sub}</div>
                </div>
                <svg style={{ width:16, color:'var(--c-text-4)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            ))}
          </>
        )}

        {mode === 'year' && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start' }} onClick={() => setMode('main')}>← Back</button>
            <div className="section-title">Choose Year</div>
            {years.map(y => (
              <button key={y} className="card card-hover"
                style={{ border:'1px solid var(--c-border)',cursor:'pointer',display:'flex',alignItems:'center',gap:14,padding:14,width:'100%',background:'none',textAlign:'left' }}
                onClick={() => pick('year', y)}>
                <div style={{ width:52,height:52,borderRadius:12,background:'linear-gradient(135deg,#1565C0,#0D47A1)',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:17,flexShrink:0,boxShadow:'var(--shadow-blue)' }}>{y}</div>
                <div>
                  <div style={{ fontWeight:700,fontSize:15 }}>KSP PC {y}</div>
                  <div style={{ fontSize:12,color:'var(--c-text-3)' }}>{allQs.filter(q=>q.year===y).length} Qs · 90 min</div>
                </div>
              </button>
            ))}
          </>
        )}

        {mode === 'subject' && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start' }} onClick={() => setMode('main')}>← Back</button>
            <div className="section-title">Choose Subject</div>
            {subjects.map(s => (
              <button key={s} className="card card-hover"
                style={{ border:'1px solid var(--c-border)',cursor:'pointer',display:'flex',alignItems:'center',gap:14,padding:14,width:'100%',background:'none',textAlign:'left' }}
                onClick={() => pick('subject', s)}>
                <div style={{ flex:1,fontWeight:700,fontSize:15 }}>{s}</div>
                <div style={{ fontSize:12,color:'var(--c-text-3)' }}>30 Qs · 25 min</div>
              </button>
            ))}
          </>
        )}

        {mode === 'topic' && (
          <>
            <button className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start' }} onClick={() => setMode('main')}>← Back</button>
            <div className="section-title">Choose Topic</div>
            {topics.map(([topic, count]) => (
              <button key={topic} className="card card-hover"
                style={{ border:'1px solid var(--c-border)',cursor:'pointer',display:'flex',alignItems:'center',gap:14,padding:14,width:'100%',background:'none',textAlign:'left' }}
                onClick={() => pick('topic', topic)}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:14 }}>{topic}</div>
                  <div style={{ fontSize:11,color:'var(--c-text-3)' }}>{count} Qs available</div>
                </div>
                <div style={{ fontSize:12,color:'var(--c-text-3)' }}>20 Qs · 18 min</div>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}

// ── Main Export ───────────────────────────────────────
interface Props { lang: 'en' | 'kn'; initialType?: string; }

export default function MockTestView({ lang: globalLang, initialType }: Props) {
  const [state, setState] = useState<
    | { mode: 'select' }
    | { mode: 'test'; cfg: TestConfig; lang: 'en' | 'kn' }
  >(() => {
    if (initialType === 'full') {
      const cfg = buildTest('full');
      return cfg ? { mode: 'test', cfg, lang: globalLang } : { mode: 'select' };
    }
    return { mode: 'select' };
  });

  if (state.mode === 'select') {
    return <Selector onStart={(cfg, lang) => setState({ mode: 'test', cfg, lang })} />;
  }
  return <ActiveTest cfg={state.cfg} lang={state.lang} onFinish={() => setState({ mode: 'select' })} />;
}

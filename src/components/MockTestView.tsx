// src/components/MockTestView.tsx
// Clean mock test: year-wise paper feel, timer, review

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { addTestRecord } from '../lib/storage';

interface Question {
  id: number;
  subject: string;
  topic: string;
  question: string;
  question_kn?: string;
  options: string[];
  options_kn?: string[];
  correctAnswer: number;
  solution?: string;
  explanation?: string;
  year: string;
}

interface Props {
  questions: Question[];
  lang: 'en' | 'kn';
}

const YEARS = ['2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014'];

const T = {
  en: {
    selectPaper: 'Select Paper',
    mixedTest: 'Full Mixed Test',
    mixedDesc: 'Random 100 questions from all years',
    questionsLabel: 'questions',
    mins: 'min',
    startTest: 'Start Test',
    submit: 'Submit Test',
    submitConfirm: 'Are you sure you want to submit? You have unanswered questions.',
    review: 'Review Answers',
    backToSelect: 'Take Another Test',
    correct: 'Correct',
    wrong: 'Wrong',
    notAttempted: 'Not Attempted',
    yourScore: 'Your Score',
    timeTaken: 'Time Taken',
    accuracy: 'Accuracy',
    perSubject: 'Subject-wise Score',
    reviewMode: 'Review All Questions',
    markForReview: 'Mark',
    marked: 'Marked',
    prev: '← Prev',
    next: 'Next →',
    question: 'Q',
    answered: 'Answered',
    unanswered: 'Not answered',
    palette: 'Question Palette',
    totalTime: 'Total time',
    ksp: 'KSP PC',
  },
  kn: {
    selectPaper: 'ಪ್ರಶ್ನೆ ಪತ್ರ ಆಯ್ಕೆ',
    mixedTest: 'ಮಿಶ್ರ ಟೆಸ್ಟ್',
    mixedDesc: 'ಎಲ್ಲ ವರ್ಷದಿಂದ 100 ಯಾದೃಚ್ಛಿಕ ಪ್ರಶ್ನೆಗಳು',
    questionsLabel: 'ಪ್ರಶ್ನೆಗಳು',
    mins: 'ನಿಮಿಷ',
    startTest: 'ಟೆಸ್ಟ್ ಶುರು ಮಾಡಿ',
    submit: 'ಟೆಸ್ಟ್ ಸಲ್ಲಿಸಿ',
    submitConfirm: 'ನೀವು ಖಚಿತವಾಗಿ ಸಲ್ಲಿಸಲು ಬಯಸುತ್ತೀರಾ? ಕೆಲ ಪ್ರಶ್ನೆಗಳು ಉತ್ತರಿಸಿಲ್ಲ.',
    review: 'ಉತ್ತರ ನೋಡಿ',
    backToSelect: 'ಇನ್ನೊಂದು ಟೆಸ್ಟ್ ತೆಗೆಯಿರಿ',
    correct: 'ಸರಿ',
    wrong: 'ತಪ್ಪು',
    notAttempted: 'ಉತ್ತರಿಸಿಲ್ಲ',
    yourScore: 'ನಿಮ್ಮ ಸ್ಕೋರ್',
    timeTaken: 'ತೆಗೆದ ಸಮಯ',
    accuracy: 'ನಿಖರತೆ',
    perSubject: 'ವಿಷಯ ಅನುಸಾರ ಸ್ಕೋರ್',
    reviewMode: 'ಎಲ್ಲ ಪ್ರಶ್ನೆ ನೋಡಿ',
    markForReview: 'ಗುರುತಿಸಿ',
    marked: 'ಗುರುತಿಸಿದ',
    prev: '← ಹಿಂದೆ',
    next: 'ಮುಂದೆ →',
    question: 'ಪ್ರ',
    answered: 'ಉತ್ತರಿಸಿದ',
    unanswered: 'ಉತ್ತರಿಸಿಲ್ಲ',
    palette: 'ಪ್ರಶ್ನೆ ಪ್ಯಾಲೆಟ್',
    totalTime: 'ಒಟ್ಟು ಸಮಯ',
    ksp: 'KSP PC',
  },
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtMins(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

// ── Score Card ────────────────────────────────────────────────────────────
function ScoreCard({
  questions, answers, timeTaken, onReview, onReset, lang,
}: {
  questions: Question[];
  answers: (number | null)[];
  timeTaken: number;
  onReview: () => void;
  onReset: () => void;
  lang: 'en' | 'kn';
}) {
  const t = T[lang];
  const correct = answers.filter((a, i) => a !== null && a === questions[i].correctAnswer).length;
  const wrong   = answers.filter((a, i) => a !== null && a !== questions[i].correctAnswer).length;
  const notDone = answers.filter(a => a === null).length;
  const pct     = Math.round((correct / questions.length) * 100);

  // Subject breakdown
  const breakdown: Record<string, { total: number; correct: number }> = {};
  questions.forEach((q, i) => {
    if (!breakdown[q.subject]) breakdown[q.subject] = { total: 0, correct: 0 };
    breakdown[q.subject].total++;
    if (answers[i] === q.correctAnswer) breakdown[q.subject].correct++;
  });

  // Save to storage
  useEffect(() => {
    addTestRecord({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      year: [...new Set(questions.map(q => q.year))].join('/') || 'mixed',
      subject: 'all',
      total: questions.length,
      correct,
      timeSec: timeTaken,
      subjectBreakdown: breakdown,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoreColor = pct >= 70 ? 'var(--c-green)' : pct >= 40 ? 'var(--c-amber)' : 'var(--c-red)';

  return (
    <div className="fade-up" style={{ padding: '20px 16px', maxWidth: 500, margin: '0 auto', paddingBottom: 100 }}>
      {/* Score circle */}
      <div className="card" style={{ padding: '28px 20px', textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--c-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
          {t.yourScore}
        </div>
        <div style={{ fontSize: 64, fontWeight: 800, color: scoreColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {pct}%
        </div>
        <div style={{ fontSize: 16, color: 'var(--c-text-muted)', marginTop: 6 }}>
          {correct} / {questions.length}
        </div>
        <div style={{ fontSize: 13, color: 'var(--c-text-faint)', marginTop: 4 }}>
          {t.timeTaken}: {fmtMins(timeTaken)}
        </div>
      </div>

      {/* Breakdown pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: t.correct,      value: correct, color: 'var(--c-green)',  bg: 'var(--c-green-bg)' },
          { label: t.wrong,        value: wrong,   color: 'var(--c-red)',    bg: 'var(--c-red-bg)' },
          { label: t.notAttempted, value: notDone, color: 'var(--c-text-muted)', bg: 'var(--c-surface-low)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card-sm" style={{ padding: '14px 10px', textAlign: 'center', background: bg, border: `1px solid ${color}33` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Subject breakdown */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
          {t.perSubject}
        </div>
        {Object.entries(breakdown).map(([subj, { total, correct: c }]) => {
          const p = Math.round((c / total) * 100);
          return (
            <div key={subj} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ color: 'var(--c-text)', fontWeight: 600 }}>{subj}</span>
                <span style={{ color: p >= 70 ? 'var(--c-green)' : p >= 40 ? 'var(--c-amber)' : 'var(--c-red)', fontWeight: 700 }}>
                  {c}/{total} ({p}%)
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${p}%`, background: p >= 70 ? 'var(--c-green)' : p >= 40 ? 'var(--c-amber)' : 'var(--c-red)' }} />
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn-primary" style={{ width: '100%', marginBottom: 10 }} onClick={onReview}>
        {t.reviewMode}
      </button>
      <button className="btn-ghost" style={{ width: '100%' }} onClick={onReset}>
        {t.backToSelect}
      </button>
    </div>
  );
}

// ── Review Mode ───────────────────────────────────────────────────────────
function ReviewMode({ questions, answers, lang, onClose }: {
  questions: Question[]; answers: (number | null)[]; lang: 'en' | 'kn'; onClose: () => void;
}) {
  const t = T[lang];
  const [idx, setIdx] = useState(0);
  const q = questions[idx];
  const userAnswer = answers[idx];
  const question = (lang === 'kn' && q.question_kn) ? q.question_kn : q.question;
  const options = (lang === 'kn' && q.options_kn?.length) ? q.options_kn : q.options;
  const explanation = q.solution || q.explanation || '';
  const [showExp, setShowExp] = useState(false);

  useEffect(() => { setShowExp(false); }, [idx]);

  const optionClass = (i: number) => {
    if (i === q.correctAnswer) return 'option-btn selected-correct';
    if (i === userAnswer && i !== q.correctAnswer) return 'option-btn selected-wrong';
    return 'option-btn';
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--c-surface)', paddingBottom: 80 }}>
      <div className="top-bar" style={{ justifyContent: 'space-between' }}>
        <button className="btn-ghost" onClick={onClose} style={{ padding: '5px 12px', fontSize: 13 }}>← Back</button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-muted)' }}>Q {idx + 1} / {questions.length}</span>
        <div style={{ width: 60 }} />
      </div>
      <div style={{ padding: '16px 16px 0', maxWidth: 600, margin: '0 auto' }}>
        <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--c-text-faint)', marginBottom: 6 }}>{q.subject} · {q.topic}</div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, fontWeight: 500 }}>{question}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
          {options.map((opt, i) => (
            <button key={i} className={optionClass(i)} disabled>
              <span style={{ fontWeight: 700, marginRight: 10, color: 'var(--c-text-faint)', fontSize: 13 }}>{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 14, fontSize: 13, fontWeight: 600,
          color: userAnswer === q.correctAnswer ? 'var(--c-green)' : userAnswer === null ? 'var(--c-text-faint)' : 'var(--c-red)' }}>
          {userAnswer === null ? t.notAttempted : userAnswer === q.correctAnswer ? t.correct : t.wrong}
        </div>
        {explanation && (
          <>
            <button className="btn-ghost" onClick={() => setShowExp(v => !v)} style={{ width: '100%', marginBottom: showExp ? 10 : 0 }}>
              {showExp ? 'Hide Explanation' : 'Show Explanation'}
            </button>
            {showExp && <div className="explanation-box">{explanation}</div>}
          </>
        )}
      </div>
      <div style={{
        position: 'fixed', bottom: 62, left: 0, right: 0,
        padding: '10px 16px', background: 'var(--c-surface-mid)', borderTop: '1px solid var(--c-border)',
        display: 'flex', gap: 10,
      }}>
        <button className="btn-ghost" onClick={() => setIdx(i => i - 1)} disabled={idx === 0} style={{ flex: 1, opacity: idx === 0 ? 0.4 : 1 }}>{t.prev}</button>
        <button className="btn-primary" onClick={() => setIdx(i => i + 1)} disabled={idx === questions.length - 1} style={{ flex: 1 }}>{t.next}</button>
      </div>
    </div>
  );
}

// ── Main Mock Test View ───────────────────────────────────────────────────
type Screen = 'select' | 'test' | 'result' | 'review';

export function MockTestView({ questions, lang }: Props) {
  const t = T[lang];
  const [screen, setScreen] = useState<Screen>('select');
  const [testQs, setTestQs] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [marked, setMarked] = useState<boolean[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [timeSec, setTimeSec] = useState(0);
  const [limitSec, setLimitSec] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [timeTaken, setTimeTaken] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Start test
  const startTest = useCallback((qs: Question[], totalMinutes: number) => {
    const limit = totalMinutes * 60;
    setTestQs(qs);
    setAnswers(new Array(qs.length).fill(null));
    setMarked(new Array(qs.length).fill(false));
    setQIdx(0);
    setTimeSec(limit);
    setLimitSec(limit);
    setShowPalette(false);
    setScreen('test');
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeSec(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimeTaken(limit);
          setScreen('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const submitTest = useCallback(() => {
    const unanswered = answers.filter(a => a === null).length;
    if (unanswered > 0 && !window.confirm(t.submitConfirm)) return;
    clearInterval(timerRef.current);
    setTimeTaken(limitSec - timeSec);
    setScreen('result');
  }, [answers, t.submitConfirm, limitSec, timeSec]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const yearQCount = (y: string) => questions.filter(q => q.year === y).length;
  const timeForQs = (n: number) => Math.ceil(n * 0.72); // ~43 sec per question

  // ── Select screen ──────────────────────────────────────────────────────
  if (screen === 'select') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--c-surface)', paddingBottom: 80 }}>
        <div className="top-bar">
          <span style={{ fontWeight: 800, fontSize: 16 }}>Mock Test</span>
        </div>
        <div style={{ padding: '16px 16px', maxWidth: 500, margin: '0 auto' }}>
          <p style={{ fontSize: 13, color: 'var(--c-text-muted)', marginBottom: 20, marginTop: 4 }}>
            {t.selectPaper}
          </p>

          {/* Mixed test */}
          <button
            onClick={() => {
              const qs = [...questions].sort(() => Math.random() - 0.5).slice(0, 100);
              startTest(qs, timeForQs(100));
            }}
            style={{
              width: '100%', marginBottom: 16, padding: '16px',
              background: 'var(--c-primary)', color: '#fff',
              border: 'none', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left' as const,
            }}>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{t.mixedTest}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>{t.mixedDesc} · {timeForQs(100)} {t.mins}</div>
          </button>

          {/* Year papers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {YEARS.map(year => {
              const count = yearQCount(year);
              const mins = timeForQs(count);
              return (
                <button key={year}
                  onClick={() => {
                    const qs = questions.filter(q => q.year === year);
                    startTest(qs, mins);
                  }}
                  style={{
                    width: '100%', padding: '14px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--c-surface-mid)', border: '1.5px solid var(--c-border)',
                    borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--c-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--c-border)')}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-text)' }}>KSP PC {year}</div>
                    <div style={{ fontSize: 12, color: 'var(--c-text-muted)', marginTop: 2 }}>
                      {count} {t.questionsLabel} · {mins} {t.mins}
                    </div>
                  </div>
                  <span style={{ fontSize: 14, color: 'var(--c-primary)', fontWeight: 700 }}>{t.startTest} →</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Review screen ──────────────────────────────────────────────────────
  if (screen === 'review' || reviewing) {
    return <ReviewMode questions={testQs} answers={answers} lang={lang} onClose={() => { setScreen('result'); setReviewing(false); }} />;
  }

  // ── Result screen ──────────────────────────────────────────────────────
  if (screen === 'result') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--c-surface)', paddingBottom: 80 }}>
        <div className="top-bar">
          <span style={{ fontWeight: 800, fontSize: 16 }}>Results</span>
        </div>
        <ScoreCard
          questions={testQs}
          answers={answers}
          timeTaken={timeTaken}
          onReview={() => setReviewing(true)}
          onReset={() => setScreen('select')}
          lang={lang}
        />
      </div>
    );
  }

  // ── Active test screen ─────────────────────────────────────────────────
  const q = testQs[qIdx];
  const question = (lang === 'kn' && q.question_kn) ? q.question_kn : q.question;
  const options  = (lang === 'kn' && q.options_kn?.length) ? q.options_kn : q.options;
  const answeredCount = answers.filter(a => a !== null).length;
  const isAnswered = answers[qIdx] !== null;

  const selectAnswer = (idx: number) => {
    if (!isAnswered) {
      setAnswers(prev => { const n = [...prev]; n[qIdx] = idx; return n; });
    }
  };

  const timerPct = (timeSec / limitSec) * 100;
  const timerColor = timeSec < 300 ? 'var(--c-red)' : timeSec < 600 ? 'var(--c-amber)' : 'var(--c-primary)';

  const optionClass = (i: number) => {
    if (!isAnswered) return 'option-btn';
    if (i === q.correctAnswer) return 'option-btn selected-correct';
    if (i === answers[qIdx] && i !== q.correctAnswer) return 'option-btn selected-wrong';
    return 'option-btn';
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--c-surface)', paddingBottom: 130 }}>
      {/* Test top bar */}
      <div className="top-bar" style={{ flexDirection: 'column', height: 'auto', padding: '8px 16px', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text-muted)' }}>
            {t.question} {qIdx + 1}/{testQs.length} · {answeredCount} {t.answered}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: timerColor, fontVariantNumeric: 'tabular-nums' }}>
              {fmt(timeSec)}
            </span>
            <button className="btn-ghost" onClick={() => setShowPalette(v => !v)}
              style={{ padding: '4px 10px', fontSize: 12 }}>
              Grid
            </button>
          </div>
        </div>
        {/* Timer bar */}
        <div className="progress-bar" style={{ width: '100%' }}>
          <div className="progress-fill" style={{ width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear' }} />
        </div>
      </div>

      {/* Palette overlay */}
      {showPalette && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setShowPalette(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--c-surface-mid)', width: '100%', maxHeight: '60vh',
            borderRadius: '16px 16px 0 0', padding: '20px 16px',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontWeight: 700 }}>{t.palette}</span>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--c-text-faint)' }}>
                <span>🟢 {t.answered} ({answeredCount})</span>
                <span>⬜ {t.unanswered} ({testQs.length - answeredCount})</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {testQs.map((_, i) => (
                <button key={i} className={`q-dot ${i === qIdx ? 'current' : answers[i] !== null ? 'answered' : marked[i] ? 'marked' : ''}`}
                  onClick={() => { setQIdx(i); setShowPalette(false); }}>
                  {i + 1}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={submitTest} style={{ width: '100%', marginTop: 20 }}>
              {t.submit}
            </button>
          </div>
        </div>
      )}

      {/* Question */}
      <div style={{ padding: '16px 16px 0', maxWidth: 600, margin: '0 auto' }}>
        <div className="card" style={{ padding: '16px 18px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--c-text-faint)', marginBottom: 6 }}>
            {q.subject} · {q.topic}
          </div>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, fontWeight: 500 }}>{question}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {options.map((opt, i) => (
            <button key={i} className={optionClass(i)} onClick={() => selectAnswer(i)} disabled={isAnswered}>
              <span style={{ fontWeight: 700, marginRight: 10, color: 'var(--c-text-faint)', fontSize: 13 }}>
                {String.fromCharCode(65 + i)}.
              </span>
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '10px 16px 20px',
        background: 'var(--c-surface-mid)', borderTop: '1px solid var(--c-border)',
        display: 'flex', gap: 8,
      }}>
        <button className="btn-ghost" onClick={() => setQIdx(i => i - 1)} disabled={qIdx === 0}
          style={{ flex: 1, opacity: qIdx === 0 ? 0.4 : 1, padding: '10px 8px' }}>
          {t.prev}
        </button>
        <button className="btn-ghost"
          onClick={() => setMarked(prev => { const n = [...prev]; n[qIdx] = !n[qIdx]; return n; })}
          style={{ padding: '10px 12px', color: marked[qIdx] ? 'var(--c-amber)' : 'var(--c-text-muted)', borderColor: marked[qIdx] ? 'var(--c-amber)' : 'var(--c-border)' }}>
          {marked[qIdx] ? '🔖' : '📌'}
        </button>
        {qIdx < testQs.length - 1 ? (
          <button className="btn-primary" onClick={() => setQIdx(i => i + 1)} style={{ flex: 1, padding: '10px 8px' }}>
            {t.next}
          </button>
        ) : (
          <button className="btn-primary" onClick={submitTest} style={{ flex: 1, padding: '10px 8px' }}>
            {t.submit}
          </button>
        )}
      </div>
    </div>
  );
}

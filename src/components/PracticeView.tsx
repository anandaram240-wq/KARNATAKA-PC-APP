// src/components/PracticeView.tsx
// Clean subject/topic/year browsing + question card
// NO AI, NO auto-solution, explanation only on tap

import React, { useState, useMemo, useCallback } from 'react';
import { addPracticeRecord } from '../lib/storage';

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
  difficulty?: string;
}

interface Props {
  questions: Question[];
  lang: 'en' | 'kn';
}

type BrowseMode = 'year' | 'subject' | 'topic';

const SUBJECTS = ['Mathematics', 'General Science', 'General Awareness', 'Reasoning'];
const YEARS = ['2021', '2020', '2019', '2018', '2017', '2016', '2015', '2014'];

const SUBJECT_COLORS: Record<string, string> = {
  'Mathematics':        '#4f46e5',
  'General Science':    '#16a34a',
  'General Awareness':  '#d97706',
  'Reasoning':          '#9333ea',
};

const T = {
  en: {
    browseBy: 'Browse by',
    year: 'Year', subject: 'Subject', topic: 'Topic',
    allQuestions: 'All Questions',
    questions: 'questions',
    startPracticing: 'Start Practicing',
    prev: 'Prev', next: 'Next',
    showExplanation: 'Show Explanation',
    hideExplanation: 'Hide Explanation',
    correct: 'Correct!', wrong: 'Wrong',
    selectFilter: 'Select a filter to start',
    chooseYear: 'Choose a year',
    chooseSubject: 'Choose a subject',
    chooseTopic: 'Choose a topic',
    back: '← Back',
    diffMed: 'Medium', diffEasy: 'Easy', diffHard: 'Hard',
    tapToAnswer: 'Tap an option to answer',
    done: "Done! You've completed all questions in this set.",
    restartSet: 'Restart This Set',
  },
  kn: {
    browseBy: 'ಹುಡುಕಿ',
    year: 'ವರ್ಷ', subject: 'ವಿಷಯ', topic: 'ಟಾಪಿಕ್',
    allQuestions: 'ಎಲ್ಲಾ ಪ್ರಶ್ನೆಗಳು',
    questions: 'ಪ್ರಶ್ನೆಗಳು',
    startPracticing: 'ಅಭ್ಯಾಸ ಶುರು ಮಾಡಿ',
    prev: 'ಹಿಂದೆ', next: 'ಮುಂದೆ',
    showExplanation: 'ವಿವರಣೆ ತೋರಿಸಿ',
    hideExplanation: 'ವಿವರಣೆ ಮರೆಮಾಡಿ',
    correct: 'ಸರಿ!', wrong: 'ತಪ್ಪು',
    selectFilter: 'ಫಿಲ್ಟರ್ ಆಯ್ಕೆ ಮಾಡಿ',
    chooseYear: 'ವರ್ಷ ಆಯ್ಕೆ ಮಾಡಿ',
    chooseSubject: 'ವಿಷಯ ಆಯ್ಕೆ ಮಾಡಿ',
    chooseTopic: 'ಟಾಪಿಕ್ ಆಯ್ಕೆ ಮಾಡಿ',
    back: '← ಹಿಂದೆ',
    diffMed: 'ಮಧ್ಯಮ', diffEasy: 'ಸುಲಭ', diffHard: 'ಕಷ್ಟ',
    tapToAnswer: 'ಉತ್ತರಿಸಲು ಆಯ್ಕೆ ಮೇಲೆ ತಟ್ಟಿ',
    done: 'ಮುಗಿಯಿತು! ಈ ಸೆಟ್‌ನ ಎಲ್ಲ ಪ್ರಶ್ನೆಗಳೂ ಮಾಡಿದ್ದೀರಿ.',
    restartSet: 'ಮತ್ತೆ ಶುರು ಮಾಡಿ',
  },
};

// ── Question Card ─────────────────────────────────────────────────────────
function QuestionCard({
  q, qIndex, total, onAnswer, answered, showExp, onToggleExp, lang
}: {
  q: Question; qIndex: number; total: number;
  onAnswer: (idx: number) => void;
  answered: number | null;
  showExp: boolean;
  onToggleExp: () => void;
  lang: 'en' | 'kn';
}) {
  const t = T[lang];
  const question = (lang === 'kn' && q.question_kn) ? q.question_kn : q.question;
  const options  = (lang === 'kn' && q.options_kn?.length) ? q.options_kn : q.options;
  const explanation = q.solution || q.explanation || '';
  const isAnswered = answered !== null;

  const optionClass = (idx: number): string => {
    if (!isAnswered) return 'option-btn';
    if (idx === q.correctAnswer) return 'option-btn selected-correct';
    if (idx === answered && idx !== q.correctAnswer) return 'option-btn selected-wrong';
    return 'option-btn';
  };

  const diffLabel = q.difficulty === 'easy' ? t.diffEasy : q.difficulty === 'hard' ? t.diffHard : t.diffMed;
  const diffColor = q.difficulty === 'easy' ? 'var(--c-green)' : q.difficulty === 'hard' ? 'var(--c-red)' : 'var(--c-amber)';

  return (
    <div className="fade-up" style={{ padding: '0 16px 24px', maxWidth: 600, margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--c-text-muted)', marginBottom: 6, fontWeight: 500 }}>
          <span>Q {qIndex + 1} of {total}</span>
          <span style={{ color: diffColor, fontWeight: 600 }}>{diffLabel}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${((qIndex + 1) / total) * 100}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--c-text)', fontWeight: 500 }}>
          {question}
        </p>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
        {options.map((opt, idx) => (
          <button
            key={idx}
            className={optionClass(idx)}
            onClick={() => !isAnswered && onAnswer(idx)}
            disabled={isAnswered}
          >
            <span style={{ fontWeight: 700, marginRight: 10, color: 'var(--c-text-faint)', fontSize: 13 }}>
              {String.fromCharCode(65 + idx)}.
            </span>
            {opt}
          </button>
        ))}
      </div>

      {/* Result feedback */}
      {isAnswered && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginBottom: 12,
          background: answered === q.correctAnswer ? 'var(--c-green-bg)' : 'var(--c-red-bg)',
          border: `1px solid ${answered === q.correctAnswer ? 'var(--c-green)' : 'var(--c-red)'}`,
          color: answered === q.correctAnswer ? 'var(--c-green)' : 'var(--c-red)',
          fontSize: 14, fontWeight: 700,
        }}>
          {answered === q.correctAnswer ? t.correct : `${t.wrong} — Correct: ${String.fromCharCode(65 + q.correctAnswer)}`}
        </div>
      )}

      {/* Explanation toggle */}
      {isAnswered && explanation && (
        <>
          <button className="btn-ghost" onClick={onToggleExp}
            style={{ width: '100%', marginBottom: showExp ? 10 : 0 }}>
            {showExp ? t.hideExplanation : t.showExplanation}
          </button>
          {showExp && (
            <div className="explanation-box">{explanation}</div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Practice View ────────────────────────────────────────────────────
export function PracticeView({ questions, lang }: Props) {
  const t = T[lang];

  // Filter state
  const [mode, setMode] = useState<BrowseMode>('year');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // Practice state
  const [practicing, setPracticing] = useState(false);
  const [filteredQs, setFilteredQs] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showExp, setShowExp] = useState(false);

  // Compute topic list for selected subject
  const topics = useMemo(() => {
    if (!selectedSubject) return [];
    return [...new Set(questions.filter(q => q.subject === selectedSubject).map(q => q.topic))].sort();
  }, [selectedSubject, questions]);

  // Count questions for each filter
  const countFor = useCallback((type: string, value: string) => {
    if (type === 'year') return questions.filter(q => q.year === value).length;
    if (type === 'subject') return questions.filter(q => q.subject === value).length;
    if (type === 'topic') return questions.filter(q => q.topic === value && q.subject === selectedSubject).length;
    return questions.length;
  }, [questions, selectedSubject]);

  const startPractice = useCallback((qs: Question[]) => {
    const shuffled = [...qs].sort(() => Math.random() - 0.5);
    setFilteredQs(shuffled);
    setAnswers(new Array(shuffled.length).fill(null));
    setQIndex(0);
    setShowExp(false);
    setPracticing(true);
  }, []);

  const handleAnswer = useCallback((idx: number) => {
    const q = filteredQs[qIndex];
    setAnswers(prev => {
      const next = [...prev];
      next[qIndex] = idx;
      return next;
    });
    setShowExp(false);
    // Track in storage
    addPracticeRecord({
      questionId: q.id,
      correct: idx === q.correctAnswer,
      date: new Date().toISOString(),
    });
  }, [filteredQs, qIndex]);

  const goNext = () => { if (qIndex < filteredQs.length - 1) { setQIndex(i => i + 1); setShowExp(false); } };
  const goPrev = () => { if (qIndex > 0) { setQIndex(i => i - 1); setShowExp(false); } };

  // ── Practicing UI ──────────────────────────────────────────────────────
  if (practicing) {
    const isDone = qIndex >= filteredQs.length;
    const answered = answers[qIndex] ?? null;
    const correctCount = answers.filter((a, i) => a !== null && a === filteredQs[i]?.correctAnswer).length;
    const attemptedCount = answers.filter(a => a !== null).length;

    return (
      <div style={{ minHeight: '100dvh', background: 'var(--c-surface)', paddingBottom: 80 }}>
        {/* Top bar */}
        <div className="top-bar" style={{ justifyContent: 'space-between' }}>
          <button className="btn-ghost" onClick={() => setPracticing(false)}
            style={{ padding: '5px 12px', fontSize: 13 }}>
            {t.back}
          </button>
          <div style={{ fontSize: 13, color: 'var(--c-text-muted)', fontWeight: 600 }}>
            {attemptedCount > 0 && `${correctCount}/${attemptedCount} correct`}
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text-faint)' }}>
            {qIndex + 1}/{filteredQs.length}
          </div>
        </div>

        {!isDone ? (
          <>
            <div style={{ paddingTop: 16 }}>
              <QuestionCard
                q={filteredQs[qIndex]}
                qIndex={qIndex}
                total={filteredQs.length}
                onAnswer={handleAnswer}
                answered={answered}
                showExp={showExp}
                onToggleExp={() => setShowExp(v => !v)}
                lang={lang}
              />
            </div>

            {/* Nav buttons */}
            <div style={{
              position: 'fixed', bottom: 62, left: 0, right: 0,
              padding: '10px 16px',
              background: 'var(--c-surface-mid)',
              borderTop: '1px solid var(--c-border)',
              display: 'flex', gap: 10,
            }}>
              <button className="btn-ghost" onClick={goPrev} disabled={qIndex === 0}
                style={{ flex: 1, opacity: qIndex === 0 ? 0.4 : 1 }}>
                {t.prev}
              </button>
              <button className="btn-primary" onClick={goNext}
                disabled={answered === null || qIndex === filteredQs.length - 1}
                style={{ flex: 1 }}>
                {t.next}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '40px 16px', textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <p style={{ color: 'var(--c-text-muted)', fontSize: 14, lineHeight: 1.6 }}>{t.done}</p>
            <div className="card" style={{ padding: 20, margin: '20px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: 'var(--c-primary)' }}>
                {Math.round((correctCount / filteredQs.length) * 100)}%
              </div>
              <div style={{ color: 'var(--c-text-muted)', fontSize: 13 }}>
                {correctCount} / {filteredQs.length} correct
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginBottom: 10 }}
              onClick={() => startPractice(filteredQs)}>
              {t.restartSet}
            </button>
            <button className="btn-ghost" style={{ width: '100%' }}
              onClick={() => setPracticing(false)}>
              {t.back}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Browse UI ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--c-surface)', paddingBottom: 80 }}>
      {/* Top bar */}
      <div className="top-bar" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Practice</span>
        <button className="btn-primary"
          onClick={() => startPractice(questions)}
          style={{ padding: '6px 14px', fontSize: 12 }}>
          All {questions.length} Qs
        </button>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Mode switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['year', 'subject', 'topic'] as BrowseMode[]).map(m => (
            <button key={m} className={`subject-chip ${mode === m ? 'active' : ''}`}
              onClick={() => { setMode(m); setSelectedYear(null); setSelectedSubject(null); setSelectedTopic(null); }}>
              {t[m]}
            </button>
          ))}
        </div>

        {/* ── By Year ── */}
        {mode === 'year' && (
          <>
            <div style={{ fontSize: 12, color: 'var(--c-text-muted)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.chooseYear}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {YEARS.map(year => {
                const count = countFor('year', year);
                return (
                  <button key={year}
                    className={`card-sm ${selectedYear === year ? '' : ''}`}
                    onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                    style={{
                      padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: `1.5px solid ${selectedYear === year ? 'var(--c-primary)' : 'var(--c-border)'}`,
                      background: selectedYear === year ? 'var(--c-primary-bg)' : 'var(--c-surface-mid)',
                      cursor: 'pointer', width: '100%', fontFamily: 'inherit', borderRadius: 11,
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: selectedYear === year ? 'var(--c-primary)' : 'var(--c-surface-low)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 14,
                        color: selectedYear === year ? '#fff' : 'var(--c-text-muted)',
                      }}>{year}</div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: selectedYear === year ? 'var(--c-primary)' : 'var(--c-text)' }}>
                          KSP PC {year}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{count} {t.questions}</div>
                      </div>
                    </div>
                    {selectedYear === year && (
                      <button className="btn-primary" onClick={(e) => { e.stopPropagation(); startPractice(questions.filter(q => q.year === year)); }}
                        style={{ padding: '8px 16px', fontSize: 13 }}>
                        {t.startPracticing}
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── By Subject ── */}
        {mode === 'subject' && (
          <>
            <div style={{ fontSize: 12, color: 'var(--c-text-muted)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.chooseSubject}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUBJECTS.map(subj => {
                const count = countFor('subject', subj);
                const color = SUBJECT_COLORS[subj] || 'var(--c-primary)';
                const isSelected = selectedSubject === subj;
                return (
                  <button key={subj}
                    onClick={() => setSelectedSubject(isSelected ? null : subj)}
                    style={{
                      padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: `1.5px solid ${isSelected ? color : 'var(--c-border)'}`,
                      background: isSelected ? `${color}12` : 'var(--c-surface-mid)',
                      cursor: 'pointer', width: '100%', fontFamily: 'inherit', borderRadius: 11,
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: isSelected ? color : 'var(--c-surface-low)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 18,
                        color: isSelected ? '#fff' : color,
                      }}>
                        {subj === 'Mathematics' ? '∑' : subj === 'General Science' ? '⚗' : subj === 'Reasoning' ? '◈' : '★'}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: isSelected ? color : 'var(--c-text)' }}>{subj}</div>
                        <div style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>{count} {t.questions}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <button className="btn-primary"
                        onClick={(e) => { e.stopPropagation(); startPractice(questions.filter(q => q.subject === subj)); }}
                        style={{ padding: '8px 16px', fontSize: 13, background: color }}>
                        {t.startPracticing}
                      </button>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* ── By Topic ── */}
        {mode === 'topic' && (
          <>
            {/* Subject selector */}
            <div style={{ fontSize: 12, color: 'var(--c-text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.chooseSubject}
            </div>
            <div className="scroll-x" style={{ display: 'flex', gap: 8, marginBottom: 18, paddingBottom: 4 }}>
              {SUBJECTS.map(subj => (
                <button key={subj} className={`subject-chip ${selectedSubject === subj ? 'active' : ''}`}
                  onClick={() => { setSelectedSubject(subj); setSelectedTopic(null); }}
                  style={{ whiteSpace: 'nowrap' }}>
                  {subj.split(' ')[0]}
                </button>
              ))}
            </div>

            {selectedSubject && (
              <>
                <div style={{ fontSize: 12, color: 'var(--c-text-muted)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t.chooseTopic}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {topics.map(topic => {
                    const count = countFor('topic', topic);
                    const isSelected = selectedTopic === topic;
                    return (
                      <button key={topic}
                        onClick={() => setSelectedTopic(isSelected ? null : topic)}
                        style={{
                          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          border: `1.5px solid ${isSelected ? 'var(--c-primary)' : 'var(--c-border)'}`,
                          background: isSelected ? 'var(--c-primary-bg)' : 'var(--c-surface-mid)',
                          cursor: 'pointer', width: '100%', fontFamily: 'inherit', borderRadius: 10,
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isSelected ? 'var(--c-primary)' : 'var(--c-text)' }}>{topic}</div>
                          <div style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{count} {t.questions}</div>
                        </div>
                        {isSelected && (
                          <button className="btn-primary"
                            onClick={(e) => { e.stopPropagation(); startPractice(questions.filter(q => q.subject === selectedSubject && q.topic === topic)); }}
                            style={{ padding: '7px 14px', fontSize: 12 }}>
                            {t.startPracticing}
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {!selectedSubject && (
              <p style={{ color: 'var(--c-text-faint)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
                {t.chooseSubject} first
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

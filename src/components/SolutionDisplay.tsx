// src/components/SolutionDisplay.tsx
// Subject-smart solution display:
//   Maths/Reasoning  → GIVEN + numbered steps + Speed Trick
//   General Science  → Chapter tag + Explanation + Key Fact
//   General Awareness→ Explanation + Key Fact (no chapter)

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, BookOpen, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { useLang } from '../lib/LanguageContext';

// ── Props ─────────────────────────────────────────────────────────────────────
interface SolutionDisplayProps {
  solution:       string;
  isVisible:      boolean;
  onToggle:       () => void;
  alwaysShow?:    boolean;
  questionId?:    number;
  question?:      string;
  options?:       string[];
  correctAnswer?: number;
  topic?:         string;
  subject?:       string;
}

// ── Subject helpers ───────────────────────────────────────────────────────────
function isCalc(s = '') { return /math|reasoning/i.test(s); }
function isSci(s = '')  { return /science/i.test(s) && !/awareness/i.test(s); }

// ── Bad-solution check ────────────────────────────────────────────────────────
function isBad(s: string): boolean {
  if (!s || s.trim().length < 60) return true;
  if (/WHY WRONG OPTIONS FAIL/i.test(s))  return true;
  if (/Refer to NCERT Class/i.test(s))    return true;
  if (/established by the principles/i.test(s)) return true;
  return false;
}

// ── Strip markdown asterisks ──────────────────────────────────────────────────
function clean(t: string): string {
  return t
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g,     '$1')
    .replace(/__(.+?)__/g,     '$1')
    .replace(/_(.+?)_/g,       '$1')
    .replace(/`(.+?)`/g,       '$1');
}

// ── Source label ──────────────────────────────────────────────────────────────
function sourceLabel(s: string): string {
  if (!s) return '⚡ AI';
  if (s.includes('deepseek')) return '🐋 DeepSeek';
  if (s.includes('groq'))     return '⚡ Groq';
  if (s.includes('gemini'))   return '✨ Gemini';
  if (s.includes('local'))    return '🧠 Smart Solver';
  return '⚡ AI';
}

// ════════════════════════════════════════════════════════════════════════════════
//  PARSER — MATHS / REASONING
//  Sections: GIVEN · SOLUTION (STEP N | title) · SPEED TRICK · FORMULA · EXAM TIP
// ════════════════════════════════════════════════════════════════════════════════
interface MathsParsed {
  given:      string[];
  steps:      { title: string; lines: string[] }[];
  answer:     string;
  speedTrick: string[];
  formula:    string;
  examTip:    string;
}

function parseMaths(raw: string): MathsParsed | null {
  if (!raw?.trim()) return null;
  if (!/━+\s*(GIVEN|SOLUTION)/i.test(raw)) return null;

  const out: MathsParsed = { given: [], steps: [], answer: '', speedTrick: [], formula: '', examTip: '' };
  type Sec = 'none'|'given'|'solution'|'trick'|'formula'|'tip';
  let sec: Sec = 'none';
  let step: { title: string; lines: string[] } | null = null;

  for (const raw_line of raw.split('\n')) {
    const t = raw_line.trim();
    if (!t || /^═{4,}/.test(t)) continue;

    if (/━+\s*GIVEN\s*━*/i.test(t))        { sec = 'given';    continue; }
    if (/━+\s*FIND\s*━*/i.test(t))          { continue; } // skip FIND section
    if (/━+\s*SOLUTION\s*━*/i.test(t))      { sec = 'solution'; step = null; continue; }
    if (/━+\s*SPEED TRICK\s*━*/i.test(t))   { if (step) { out.steps.push(step); step = null; } sec = 'trick'; continue; }
    if (/━+\s*FORMULA\s*━*/i.test(t))       { if (step) { out.steps.push(step); step = null; } sec = 'formula'; continue; }
    if (/━+\s*CONCEPT.*━*/i.test(t))        { if (step) { out.steps.push(step); step = null; } sec = 'formula'; continue; }
    if (/━+\s*EXAM TIP\s*━*/i.test(t))      { sec = 'tip'; continue; }

    switch (sec) {
      case 'given':
        out.given.push(clean(t)); break;
      case 'solution':
        if (/^STEP\s*\d+\s*\|/i.test(t)) {
          if (step) out.steps.push(step);
          step = { title: clean(t.replace(/^STEP\s*\d+\s*\|\s*/i, '').trim()), lines: [] };
        } else if (/^∴\s*ANSWER/i.test(t)) {
          if (step) { out.steps.push(step); step = null; }
          out.answer = clean(t);
        } else if (step) {
          step.lines.push(clean(t));
        }
        break;
      case 'trick':
        out.speedTrick.push(clean(t)); break;
      case 'formula':
        if (/^FORMULA\s*:/i.test(t)) out.formula = clean(t.replace(/^FORMULA\s*:\s*/i, '').trim());
        else if (/^RULE\s*:/i.test(t)) { /* ignore rule */ }
        else if (!out.formula) out.formula = clean(t);
        break;
      case 'tip':
        if (!out.examTip) out.examTip = clean(t); break;
    }
  }
  if (step) out.steps.push(step);
  if (!out.given.length && !out.steps.length) return null;
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════
//  PARSER — SCIENCE / GK
//  Sections: CHAPTER (optional) · EXPLANATION · KEY FACT · RELATED FACTS · EXAM TIP
// ════════════════════════════════════════════════════════════════════════════════
interface ScienceParsed {
  chapter:       string;   // empty for GK
  explanation:   string[];
  keyFact:       string;
  relatedFacts:  string[];
  examTip:       string;
}

function parseScience(raw: string): ScienceParsed | null {
  if (!raw?.trim()) return null;
  if (!/━+\s*(EXPLANATION|CHAPTER)/i.test(raw)) return null;

  const out: ScienceParsed = { chapter: '', explanation: [], keyFact: '', relatedFacts: [], examTip: '' };
  type Sec = 'none'|'chapter'|'explanation'|'keyfact'|'related'|'tip';
  let sec: Sec = 'none';

  for (const raw_line of raw.split('\n')) {
    const t = raw_line.trim();
    if (!t || /^═{4,}/.test(t)) continue;

    if (/━+\s*CHAPTER\s*━*/i.test(t))        { sec = 'chapter';     continue; }
    if (/━+\s*EXPLANATION\s*━*/i.test(t))     { sec = 'explanation'; continue; }
    if (/━+\s*KEY FACT\s*━*/i.test(t))        { sec = 'keyfact';    continue; }
    if (/━+\s*RELATED FACTS?\s*━*/i.test(t))  { sec = 'related';    continue; }
    if (/━+\s*EXAM TIP\s*━*/i.test(t))        { sec = 'tip';        continue; }

    switch (sec) {
      case 'chapter':
        if (!out.chapter) out.chapter = clean(t); break;
      case 'explanation':
        out.explanation.push(clean(t)); break;
      case 'keyfact':
        if (!out.keyFact) out.keyFact = clean(t); break;
      case 'related':
        out.relatedFacts.push(clean(t)); break;
      case 'tip':
        if (!out.examTip) out.examTip = clean(t); break;
    }
  }
  if (!out.explanation.length) return null;
  return out;
}

// ════════════════════════════════════════════════════════════════════════════════
//  CARD — MATHS & REASONING
// ════════════════════════════════════════════════════════════════════════════════
const STEP_COLORS = ['#6366f1','#8b5cf6','#0d9488','#d97706','#dc2626'];

function MathsCard({ p, source }: { p: MathsParsed; source: string }) {
  const [showTrick, setShowTrick] = useState(false);

  return (
    <div>
      {/* GIVEN */}
      {p.given.length > 0 && (
        <div style={{ padding: '14px 18px', background: '#0c1220', borderLeft: '3px solid #3b82f6', borderBottom: '1px solid #1e293b' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 900, color: '#60a5fa', letterSpacing: 2, textTransform: 'uppercase' }}>📋 Given</p>
          {p.given.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: 6 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', fontFamily: 'monospace', lineHeight: 1.6 }}>{line}</p>
            </div>
          ))}
        </div>
      )}

      {/* STEPS */}
      {p.steps.length > 0 && (
        <div style={{ padding: '16px 18px', background: '#0f172a', borderLeft: '3px solid #6366f1', borderBottom: '1px solid #1e293b' }}>
          <p style={{ margin: '0 0 14px', fontSize: 10, fontWeight: 900, color: '#818cf8', letterSpacing: 2, textTransform: 'uppercase' }}>🔢 Step-by-Step Solution</p>
          {p.steps.map((step, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{
                  minWidth: 30, height: 30, borderRadius: 10, flexShrink: 0,
                  background: `linear-gradient(135deg, ${STEP_COLORS[i % STEP_COLORS.length]}, ${STEP_COLORS[(i+1) % STEP_COLORS.length]})`,
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900,
                }}>
                  {i + 1}
                </div>
                {step.title && (
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#e2e8f0' }}>{step.title}</p>
                )}
              </div>
              <div style={{ paddingLeft: 40, borderLeft: `2px solid ${STEP_COLORS[i % STEP_COLORS.length]}30` }}>
                {step.lines.map((line, j) => (
                  <p key={j} style={{
                    margin: '3px 0', fontSize: 13, lineHeight: 1.75,
                    color: /[=→∴]/.test(line) ? '#f1f5f9' : '#94a3b8',
                    fontFamily: /[\d=→∴+\-×÷]/.test(line) ? 'monospace' : 'inherit',
                    fontWeight: /[=→∴]/.test(line) ? 700 : 400,
                  }}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {/* Answer */}
          {p.answer && (
            <div style={{ marginTop: 8, padding: '12px 16px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(16,185,129,0.08))', border: '1px solid rgba(52,211,153,0.3)' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#34d399', fontFamily: 'monospace', letterSpacing: 0.3 }}>
                {p.answer}
              </p>
            </div>
          )}
        </div>
      )}

      {/* SPEED TRICK — collapsible */}
      {p.speedTrick.length > 0 && (
        <div style={{ borderBottom: '1px solid #1e293b' }}>
          <button
            onClick={() => setShowTrick(v => !v)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 18px', cursor: 'pointer', border: 'none',
              background: showTrick ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.05)',
              borderLeft: '3px solid #f59e0b', transition: 'background 0.2s',
            }}
          >
            <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="#fff" />
            </div>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1.2 }}>
              ⚡ Speed Trick
            </span>
            <span style={{ fontSize: 10, color: '#92400e', fontWeight: 700 }}>
              {showTrick ? 'Hide' : 'Tap to reveal shortcut'}
            </span>
            {showTrick ? <ChevronUp size={14} color="#fbbf24" /> : <ChevronDown size={14} color="#92400e" />}
          </button>
          {showTrick && (
            <div style={{ padding: '14px 18px 16px', background: 'rgba(245,158,11,0.06)' }}>
              {p.speedTrick.map((line, i) => (
                <p key={i} style={{
                  margin: '4px 0', fontSize: 13, lineHeight: 1.7,
                  color: line.includes('⚡') ? '#fde68a' : '#d97706',
                  fontFamily: 'monospace', fontWeight: line.includes('⚡') ? 800 : 500,
                }}>{line}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULA */}
      {p.formula && (
        <div style={{ padding: '12px 18px', background: '#0a0e1a', borderLeft: '3px solid #7c3aed', borderBottom: '1px solid #1e293b' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 900, color: '#c4b5fd', letterSpacing: 2, textTransform: 'uppercase' }}>Formula</p>
          <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', fontFamily: 'monospace', lineHeight: 1.6 }}>{p.formula}</p>
        </div>
      )}

      {/* EXAM TIP */}
      {p.examTip && (
        <div style={{ padding: '12px 18px', background: '#0a0e1a', borderLeft: '3px solid #0d9488' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 900, color: '#2dd4bf', letterSpacing: 2, textTransform: 'uppercase' }}>Exam Tip</p>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{p.examTip}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '7px 18px', background: '#060a14', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 10, color: '#334155', fontWeight: 600 }}>KSP Master</p>
        {source && (
          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
            {sourceLabel(source)}
          </span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
//  CARD — SCIENCE & GK
// ════════════════════════════════════════════════════════════════════════════════
function ScienceGKCard({ p, source }: { p: ScienceParsed; source: string }) {
  return (
    <div>
      {/* CHAPTER TAG — Science only */}
      {p.chapter && (
        <div style={{ padding: '10px 18px', background: 'linear-gradient(90deg, rgba(14,165,233,0.12), rgba(6,182,212,0.06))', borderLeft: '3px solid #0ea5e9', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📘</span>
            <div>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 900, color: '#38bdf8', letterSpacing: 2, textTransform: 'uppercase' }}>Chapter</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#bae6fd' }}>{p.chapter}</p>
            </div>
          </div>
        </div>
      )}

      {/* EXPLANATION */}
      {p.explanation.length > 0 && (
        <div style={{ padding: '16px 18px', background: '#0f172a', borderLeft: '3px solid #6366f1', borderBottom: '1px solid #1e293b' }}>
          <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 900, color: '#818cf8', letterSpacing: 2, textTransform: 'uppercase' }}>📖 Explanation</p>
          {p.explanation.map((line, i) => {
            if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
            return (
              <p key={i} style={{ margin: '0 0 8px', fontSize: 13, color: '#cbd5e1', lineHeight: 1.75 }}>
                {line}
              </p>
            );
          })}
        </div>
      )}

      {/* KEY FACT */}
      {p.keyFact && (
        <div style={{ padding: '14px 18px', background: 'rgba(245,158,11,0.06)', borderLeft: '3px solid #f59e0b', borderBottom: '1px solid #1e293b' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 900, color: '#fbbf24', letterSpacing: 2, textTransform: 'uppercase' }}>💡 Key Fact</p>
          <p style={{ margin: 0, fontSize: 13, color: '#fde68a', fontWeight: 600, lineHeight: 1.65 }}>{p.keyFact}</p>
        </div>
      )}

      {/* RELATED FACTS — GK only */}
      {p.relatedFacts.length > 0 && (
        <div style={{ padding: '14px 18px', background: '#0a0e1a', borderLeft: '3px solid #8b5cf6', borderBottom: '1px solid #1e293b' }}>
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 900, color: '#a78bfa', letterSpacing: 2, textTransform: 'uppercase' }}>🔗 Related Facts</p>
          {p.relatedFacts.map((fact, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 5 }}>
              <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: 13, flexShrink: 0 }}>→</span>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.65 }}>{fact}</p>
            </div>
          ))}
        </div>
      )}

      {/* EXAM TIP */}
      {p.examTip && (
        <div style={{ padding: '12px 18px', background: '#0a0e1a', borderLeft: '3px solid #0d9488' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 900, color: '#2dd4bf', letterSpacing: 2, textTransform: 'uppercase' }}>🎯 Exam Tip</p>
          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{p.examTip}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '7px 18px', background: '#060a14', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 10, color: '#334155', fontWeight: 600 }}>KSP Master</p>
        {source && (
          <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
            {sourceLabel(source)}
          </span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
//  LOADING SKELETON
// ════════════════════════════════════════════════════════════════════════════════
function LoadingCard() {
  return (
    <>
      <style>{`
        @keyframes ai-spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
      <div style={{ padding: '36px 24px 28px', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.15)', borderTop: '3px solid #6366f1', borderRight: '3px solid #8b5cf6', animation: 'ai-spin 0.9s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 900, color: '#fff' }}>Generating solution...</p>
          <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>AI solving step-by-step</p>
        </div>
      </div>
      <div style={{ padding: '16px 24px 24px', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[80, 60, 90, 45, 70, 35].map((w, i) => (
          <div key={i} style={{ height: 9, borderRadius: 5, width: `${w}%`, background: 'linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%)', backgroundSize: '200% 100%', animation: `shimmer 1.6s ease-in-out infinite`, animationDelay: `${i * 0.12}s` }} />
        ))}
      </div>
    </>
  );
}

interface SolutionSection {
  header: string;
  lines: string[];
}

function parseRawSections(text: string): SolutionSection[] {
  const sections: SolutionSection[] = [];
  let currentSection: SolutionSection = { header: '', lines: [] };

  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^━+\s*(.*?)\s*━+$/.test(trimmed)) {
      const match = trimmed.match(/^━+\s*(.*?)\s*━+$/);
      const header = match ? match[1].trim() : trimmed;
      if (currentSection.header || currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { header, lines: [] };
    } else {
      currentSection.lines.push(line);
    }
  }
  if (currentSection.header || currentSection.lines.length > 0) {
    sections.push(currentSection);
  }
  return sections;
}

type SolutionType = 'maths' | 'direction' | 'blood' | 'coding' | 'series' | 'syllogism' | 'puzzle' | 'reasoning' | 'simple';

function detectTypeLocal(subject = '', topic = ''): SolutionType {
  const s = subject.toLowerCase();
  const t = topic.toLowerCase();

  if (/math|arithmetic|algebra|geometry|mensuration|trigonometry|number system|percentage|profit|loss|interest|ratio|proportion|lcm|hcf|speed|distance|time|work/i.test(s + ' ' + t)) return 'maths';
  if (/direction|compass|north|south|east|west|displacement/i.test(t)) return 'direction';
  if (/blood|relation|family/i.test(t)) return 'blood';
  if (/cod(ing|e)|decod/i.test(t)) return 'coding';
  if (/series|sequence|pattern|next term|missing number|missing letter/i.test(t)) return 'series';
  if (/syllogism|statement|conclusion|venn/i.test(t)) return 'syllogism';
  if (/seating|sitting|arrangement|rank|position|puzzle|order/i.test(t)) return 'puzzle';
  if (/reasoning|logic/i.test(s)) return 'reasoning';

  return 'simple';
}

function AlphabetChart() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return (
    <div style={{
      margin: '0 0 12px',
      padding: '14px',
      background: '#070c19',
      borderRadius: '12px',
      border: '1px solid #1e293b',
    }}>
      <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 900, color: '#38bdf8', letterSpacing: 1.5, textTransform: 'uppercase' }}>
        🔤 Alphabet Position Table
      </p>
      
      {/* Table grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '4px', textAlign: 'center', marginBottom: 12 }}>
        {alphabet.slice(0, 13).map((char, idx) => (
          <div key={char} style={{ background: '#1e293b50', borderRadius: '4px', padding: '4px 2px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{char}</div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#60a5fa' }}>{idx + 1}</div>
          </div>
        ))}
        {alphabet.slice(13).map((char, idx) => (
          <div key={char} style={{ background: '#1e293b50', borderRadius: '4px', padding: '4px 2px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{char}</div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#60a5fa' }}>{idx + 14}</div>
          </div>
        ))}
      </div>

      {/* Shortcuts */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, borderTop: '1px solid #1e293b', paddingTop: 8, fontSize: 11 }}>
        <div>
          <span style={{ color: '#fbbf24', fontWeight: 800 }}>EJOTY:</span>{' '}
          <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>E=5, J=10, O=15, T=20, Y=25</span>
        </div>
        <div>
          <span style={{ color: '#a78bfa', fontWeight: 800 }}>Opposites (Sum=27):</span>{' '}
          <span style={{ fontFamily: 'monospace', color: '#cbd5e1' }}>A-Z, B-Y, C-X, D-W, E-V, F-U, G-T, H-S, I-R, J-Q, K-P, L-O, M-N</span>
        </div>
      </div>
    </div>
  );
}

function CompassChart() {
  return (
    <div style={{
      margin: '0 0 12px',
      padding: '14px',
      background: '#070c19',
      borderRadius: '12px',
      border: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }}>
      {/* SVG Compass */}
      <svg width="70" height="70" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
        <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="2" />
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
        
        <line x1="50" y1="10" x2="50" y2="90" stroke="#334155" strokeWidth="1.5" />
        <line x1="10" y1="50" x2="90" y2="50" stroke="#334155" strokeWidth="1.5" />
        
        <line x1="22" y1="22" x2="78" y2="78" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,2" />
        <line x1="22" y1="78" x2="78" y2="22" stroke="#1e293b" strokeWidth="1" strokeDasharray="2,2" />
        
        <polygon points="50,12 55,42 50,38 45,42" fill="#ef4444" />
        <polygon points="50,88 55,58 50,62 45,58" fill="#cbd5e1" />
        
        <text x="50" y="8" textAnchor="middle" fontSize="10" fontWeight="900" fill="#f87171">N</text>
        <text x="50" y="98" textAnchor="middle" fontSize="10" fontWeight="900" fill="#cbd5e1">S</text>
        <text x="96" y="53" textAnchor="middle" fontSize="10" fontWeight="900" fill="#cbd5e1">E</text>
        <text x="4" y="53" textAnchor="middle" fontSize="10" fontWeight="900" fill="#cbd5e1">W</text>
      </svg>

      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 900, color: '#38bdf8', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          🧭 Direction Compass
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
          <strong style={{ color: '#fbbf24' }}>Right turn:</strong> 90° Clockwise (N → E)<br />
          <strong style={{ color: '#fbbf24' }}>Left turn:</strong> 90° Anti-Clockwise (N → W)
        </p>
      </div>
    </div>
  );
}

function RawFallback({ text, type }: { text: string; type?: SolutionType }) {
  const sections = parseRawSections(text);

  return (
    <div style={{ padding: '16px 18px', background: '#0f172a', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {type === 'coding' && <AlphabetChart />}
      {type === 'direction' && <CompassChart />}
      {sections.map((section, sIdx) => {
        const header = section.header.toUpperCase();
        
        // 1. Diagram / Monospace sections (Compass, Diagrams, Family tree, grids, charts)
        const isMonospace = /COMPASS|DIAGRAM|TREE|CHART|TABLE|GRID|ARRANGEMENT/i.test(header);
        
        // 2. Yellow/Orange highlighted tip/trick/rules cards
        const isHighlight = /TRICK|RULE|STRATEGY|TIP/i.test(header);
        
        // 3. Green success answer banner
        const isAnswer = /ANSWER|∴/i.test(header) || (section.lines.length === 1 && /^∴|^ANSWER/i.test(section.lines[0].trim()));

        if (isMonospace) {
          const content = section.lines.join('\n').trim();
          if (!content) return null;
          return (
            <div key={sIdx} style={{
              padding: '14px',
              background: '#070c19',
              borderRadius: '12px',
              border: '1px solid #1e293b',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
              overflowX: 'auto',
            }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 900, color: '#38bdf8', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                📊 {section.header}
              </p>
              <pre style={{
                margin: 0,
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#bae6fd',
                lineHeight: 1.5,
                whiteSpace: 'pre',
              }}>
                {content}
              </pre>
            </div>
          );
        }

        if (isHighlight) {
          const contentLines = section.lines.filter(l => l.trim());
          if (contentLines.length === 0) return null;
          return (
            <div key={sIdx} style={{
              padding: '14px',
              background: 'rgba(245,158,11,0.06)',
              borderRadius: '12px',
              borderLeft: '4px solid #f59e0b',
              borderTop: '1px solid rgba(245,158,11,0.15)',
              borderRight: '1px solid rgba(245,158,11,0.15)',
              borderBottom: '1px solid rgba(245,158,11,0.15)',
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 900, color: '#fbbf24', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                ⚡ {section.header}
              </p>
              {contentLines.map((line, idx) => (
                <p key={idx} style={{ margin: '4px 0', fontSize: 13, color: '#fde68a', lineHeight: 1.6, fontWeight: 500 }}>
                  {clean(line)}
                </p>
              ))}
            </div>
          );
        }

        if (isAnswer) {
          const contentLines = section.lines.filter(l => l.trim());
          if (contentLines.length === 0) return null;
          return (
            <div key={sIdx} style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(16,185,129,0.08))',
              border: '1px solid rgba(52,211,153,0.3)',
            }}>
              {contentLines.map((line, idx) => (
                <p key={idx} style={{ margin: 0, fontSize: 15, fontWeight: 900, color: '#34d399', fontFamily: 'monospace' }}>
                  {clean(line)}
                </p>
              ))}
            </div>
          );
        }

        const contentLines = section.lines.filter(l => l.trim());
        if (contentLines.length === 0 && !section.header) return null;

        return (
          <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.header && (
              <p style={{ margin: '4px 0 6px', fontSize: 10, fontWeight: 900, color: '#818cf8', letterSpacing: 2, textTransform: 'uppercase' }}>
                {section.header}
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {contentLines.map((line, idx) => {
                const cleanLine = clean(line);
                const stepMatch = cleanLine.match(/^(STEP\s*\d+|MOVE\s*\d+|Clue\s*\d+|Conclusion\s*[IVX]+)\s*(?:\||:)\s*(.*)$/i);
                if (stepMatch) {
                  const [_, prefix, content] = stepMatch;
                  return (
                    <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', margin: '4px 0' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#1e293b',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        flexShrink: 0
                      }}>
                        {prefix}
                      </span>
                      <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{content}</p>
                    </div>
                  );
                }
                
                return (
                  <p key={idx} style={{
                    margin: '3px 0',
                    fontSize: 13,
                    color: /[=→∴]/.test(cleanLine) ? '#f1f5f9' : '#94a3b8',
                    fontFamily: /[\d=→∴+\-×÷]/.test(cleanLine) ? 'monospace' : 'inherit',
                    fontWeight: /[=→∴]/.test(cleanLine) ? 700 : 400,
                    lineHeight: 1.65
                  }}>
                    {cleanLine}
                  </p>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════════
export function SolutionDisplay({
  solution: initialSolution,
  isVisible, onToggle, alwaysShow = false,
  questionId, question, options, correctAnswer, topic, subject,
}: SolutionDisplayProps) {

  const { lang } = useLang();
  const [aiSolution,   setAiSolution]   = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error,        setError]        = useState('');
  const [source,       setSource]       = useState('');
  const [triggered,    setTriggered]    = useState(false);

  const subj = subject ?? '';
  
  // Only display solutions for Math and Reasoning questions
  if (!isCalc(subj)) {
    return null;
  }

  const displaySolution = aiSolution || initialSolution || '';


  // Choose the right parser based on subject
  const mathsParsed  = isCalc(subj) ? parseMaths(displaySolution) : null;
  const scienceParsed = !isCalc(subj) ? parseScience(displaySolution) : null;
  const hasGoodSolution = mathsParsed !== null || scienceParsed !== null || (!isBad(displaySolution) && displaySolution.trim().length > 60);

  // ── Generate AI solution ────────────────────────────────────────────────────
  const generate = async () => {
    if (!questionId || !question || !options || isGenerating) return;
    setIsGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, question, options, correctAnswer, topic, subject, lang }),
      });
      const data = await res.json();
      if (data.solution) {
        setAiSolution(data.solution);
        setSource(data.source || 'local-solver');
      } else {
        setError('Tap "Try Again" to load solution.');
      }
    } catch {
      setError('Check connection and tap Try Again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on reveal if solution is bad
  useEffect(() => {
    if (isVisible && !triggered && !aiSolution && !isGenerating && questionId && (!initialSolution || isBad(initialSolution))) {
      setTriggered(true);
      generate();
    }
  }, [isVisible]);

  // ── "View Solution" button ──────────────────────────────────────────────────
  if (!alwaysShow && !isVisible) {
    const isGkOrSci = !isCalc(subj);
    return (
      <div style={{ marginTop: 20 }}>
        <button
          onClick={onToggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', padding: '13px 18px', borderRadius: 14, cursor: 'pointer',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
            border: '2px dashed rgba(99,102,241,0.35)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.6)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.35)'; }}
        >
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Eye size={18} color="#fff" />
          </div>
          <div style={{ textAlign: 'left', flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#4f46e5' }}>View Solution</p>
            <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
              {isGkOrSci ? 'Explanation + Key Fact' : 'Step-by-step + Speed Trick'}
            </p>
          </div>
          <ChevronDown size={16} color="#a5b4fc" />
        </button>
        {error && <p style={{ fontSize: 11, color: '#f87171', marginTop: 6, textAlign: 'center' }}>{error}</p>}
      </div>
    );
  }

  // ── Solution card ───────────────────────────────────────────────────────────
  return (
    <div style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden', border: '1px solid #1e293b', boxShadow: '0 8px 32px rgba(0,0,0,0.35)' }}>

      {/* Header */}
      <div
        onClick={() => alwaysShow ? undefined : onToggle()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', cursor: alwaysShow ? 'default' : 'pointer', background: 'linear-gradient(90deg, #0b1120, #1e1b4b)', borderBottom: '1px solid #1e293b' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={13} color="#fff" />
          </div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 0.3 }}>Solution</span>
          {(isGenerating || source) && (
            <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
              {isGenerating ? '⏳ Generating...' : sourceLabel(source)}
            </span>
          )}
        </div>
        {!alwaysShow && <EyeOff size={15} color="rgba(255,255,255,0.4)" />}
      </div>

      {/* Content */}
      {isGenerating ? (
        <LoadingCard />
      ) : mathsParsed ? (
        <MathsCard p={mathsParsed} source={source} />
      ) : scienceParsed ? (
        <ScienceGKCard p={scienceParsed} source={source} />
      ) : error ? (
        <div style={{ padding: 24, background: '#0f172a', textAlign: 'center' }}>
          <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</p>
          <button onClick={generate} style={{ padding: '8px 22px', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      ) : displaySolution ? (
        <RawFallback text={displaySolution} type={detectTypeLocal(subject, topic)} />
      ) : (
        <div style={{ padding: 24, background: '#0f172a', textAlign: 'center' }}>
          <button onClick={generate} style={{ padding: '8px 22px', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #6366f1)', color: '#fff', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            Generate Solution
          </button>
        </div>
      )}
    </div>
  );
}

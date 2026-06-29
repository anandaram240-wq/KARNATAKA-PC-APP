// src/components/InsightsView.tsx
import React, { useState, useMemo } from 'react';
import cutoffData from '../data/cutoffs.json';
import competitionData from '../data/competition.json';
import rawQuestions from '../data/pyqs.json';
import { getSettings, saveSettings, type UserSettings } from '../lib/storage';
import { computeTopicTrends, getYearTopicBreakdown, computeRepeatScores } from '../lib/trendEngine';

interface Q { id: number; year: string; subject: string; topic: string; question: string; options: string[]; answer: number; }
const allQs = rawQuestions as unknown as Q[];
const repeatScores = computeRepeatScores(allQs as never);
const topicTrends = computeTopicTrends(allQs as never);

type Section = 'cutoff' | 'yearwise' | 'trends' | 'competition' | 'repeats';

interface CutoffEntry {
  year: number; examDate: string | null; region: string;
  vacancies: number; estimatedApplicants: number | null; ratio: string;
  isEstimated: boolean;
  cutoffs: Record<string, number> | null;
  projectedCutoffs?: Record<string, number>;
  status?: string;
  applicationDeadline?: string;
  topperScore?: number | null; rank500Score?: number | null; difficulty?: number | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  'General': 'General', 'OBC_2A': 'OBC 2A', 'OBC_2B': 'OBC 2B',
  'OBC_3A': 'OBC 3A', 'OBC_3B': 'OBC 3B', 'SC': 'SC', 'ST': 'ST', 'CAT01': 'CAT-01'
};
const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

const cd = cutoffData as unknown as CutoffEntry[];
const comp = competitionData as { cycles: typeof competitionData.cycles; topicWeightByYear: Record<string, Record<string, number>> };
const officialYears = cd.filter(c => c.cutoffs && c.status !== 'upcoming').reverse();

function Stars({ n }: { n: number | null }) {
  if (!n) return <span style={{ color: 'var(--c-text-4)' }}>—</span>;
  return <span className="stars">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

// ── CUTOFF CALCULATOR ───────────────────────────────────────────────────
function CutoffCalculator() {
  const settings = useMemo(() => getSettings(), []);
  const [category, setCategory] = useState<string>(
    settings.category === 'OBC_2A' ? 'OBC_2A' :
    settings.category === 'SC' ? 'SC' :
    settings.category === 'ST' ? 'ST' : 'General'
  );
  const [region, setRegion] = useState<'NKK' | 'KK'>(settings.region);
  const [gender, setGender] = useState<'M' | 'F'>(settings.gender);
  const [score, setScore] = useState(65);

  const getCutoffForYear = (year: CutoffEntry, cat: string, g: string) => {
    const key = `${cat}_${g}`;
    return year.cutoffs?.[key] ?? year.projectedCutoffs?.[key] ?? null;
  };

  const latestYear = cd.filter(c => c.cutoffs).slice(-1)[0];
  const cutoff = latestYear ? getCutoffForYear(latestYear, category, gender) : null;
  const projected = cd.find(c => c.status === 'upcoming');
  const projCutoff = projected ? getCutoffForYear(projected, category, gender) : null;

  const gap = cutoff !== null ? score - cutoff : null;

  const zoneInfo = gap === null ? null :
    gap >= 8  ? { cls: 'safe-zone',   icon: '✅', text: `${gap} marks above cutoff — Safe zone` } :
    gap >= 3  ? { cls: 'border-zone', icon: '⚠️', text: `${gap} marks above cutoff — Borderline, push for 5 more` } :
    gap >= 0  ? { cls: 'risk-zone',   icon: '🟡', text: `Just at cutoff — Very risky zone` } :
                { cls: 'risk-zone',   icon: '❌', text: `${Math.abs(gap)} marks BELOW cutoff — Serious work needed` };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Settings */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🎯 Your Profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-3)', marginBottom: 4 }}>Category</div>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '8px 10px', fontSize: 13 }}>
              {CATEGORY_KEYS.map(k => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-3)', marginBottom: 4 }}>Region</div>
            <select value={region} onChange={e => setRegion(e.target.value as 'NKK' | 'KK')} style={{ padding: '8px 10px', fontSize: 13 }}>
              <option value="NKK">NKK</option>
              <option value="KK">KK (KK Quota)</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text-3)', marginBottom: 4 }}>Gender</div>
            <select value={gender} onChange={e => setGender(e.target.value as 'M' | 'F')} style={{ padding: '8px 10px', fontSize: 13 }}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
        </div>
      </div>

      {/* Score slider */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Your Expected Score</span>
          <span style={{ fontWeight: 900, fontSize: 24, color: 'var(--c-primary)' }}>{score}</span>
        </div>
        <input type="range" className="score-input" min={30} max={100} value={score}
          onChange={e => setScore(Number(e.target.value))} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text-4)', marginTop: 4 }}>
          <span>30 (min qualify)</span><span>65</span><span>80</span><span>100</span>
        </div>
      </div>

      {/* Result zone */}
      {cutoff !== null && zoneInfo && (
        <div className={`card ${zoneInfo.cls}`} style={{ padding: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{zoneInfo.icon}</div>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{zoneInfo.text}</div>
          <div style={{ fontSize: 13 }}>
            Latest cutoff ({latestYear.year}, {CATEGORY_LABELS[category]} {gender === 'M' ? 'Male' : 'Female'}): <strong>{cutoff}</strong> marks
          </div>
          {projCutoff && (
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
              2026 projected cutoff: ~{projCutoff} marks (estimated)
            </div>
          )}
          {/* Bar */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, opacity: 0.8 }}>
              <span>0</span><span>Cutoff: {cutoff}</span><span>100</span>
            </div>
            <div className="cutoff-bar-track">
              <div className="cutoff-bar-fill" style={{
                width: `${score}%`,
                background: gap! >= 0 ? 'var(--c-correct)' : 'var(--c-wrong)',
              }} />
              <div className="cutoff-line" style={{ left: `${cutoff}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Cutoff table for all years */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 0', fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
          📊 {CATEGORY_LABELS[category]} {gender === 'M' ? 'Male' : 'Female'} — Year-wise Cutoffs
          {' '}<span style={{ fontSize: 11, color: 'var(--c-warn)', fontWeight: 600 }}>(estimated*)</span>
        </div>
        <div className="scroll-x">
          <table className="cutoff-table" style={{ minWidth: 300 }}>
            <thead>
              <tr>
                <th>Year</th><th>Cutoff</th><th>Trend</th><th>Topper</th><th>Difficulty</th>
              </tr>
            </thead>
            <tbody>
              {cd.filter(c => c.cutoffs || c.projectedCutoffs).map((c, i, arr) => {
                const val = getCutoffForYear(c, category, gender);
                const prev = i > 0 ? getCutoffForYear(arr[i - 1], category, gender) : null;
                const trend = val && prev ? (val > prev ? '↑' : val === prev ? '→' : '↓') : '—';
                const trendClass = trend === '↑' ? 'trend-up' : trend === '↓' ? 'trend-down' : 'trend-same';
                return (
                  <tr key={c.year}>
                    <td style={{ fontWeight: 700 }}>
                      {c.year}
                      {c.status === 'upcoming' && <span className="badge badge-new" style={{ marginLeft: 4, fontSize: 9 }}>Upcoming</span>}
                    </td>
                    <td style={{ fontWeight: 700, color: c.status === 'upcoming' ? 'var(--c-text-3)' : 'var(--c-text)' }}>
                      {val !== null ? (c.status === 'upcoming' ? `~${val}*` : val) : '—'}
                    </td>
                    <td className={trendClass} style={{ fontSize: 16 }}>{trend}</td>
                    <td style={{ color: 'var(--c-text-3)' }}>{c.topperScore ?? '—'}</td>
                    <td><Stars n={c.difficulty ?? null} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--c-text-3)' }}>
          * Data estimated from merit list analysis. Official data at ksp-recruitment.in after each cycle.
          Minimum qualifying marks: 30 (30%) for all categories.
        </div>
      </div>

      {/* Full category table for latest year */}
      {latestYear?.cutoffs && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 14px 8px', fontWeight: 700, fontSize: 14 }}>
            All Categories — {latestYear.year} Estimated Cutoffs (NKK)
          </div>
          <div className="scroll-x">
            <table className="cutoff-table">
              <thead><tr><th>Category</th><th>Male</th><th>Female</th></tr></thead>
              <tbody>
                {CATEGORY_KEYS.map(cat => (
                  <tr key={cat} style={{ background: cat === category ? 'var(--c-primary-light)' : '' }}>
                    <td style={{ textAlign: 'left', fontWeight: cat === category ? 700 : 400 }}>
                      {CATEGORY_LABELS[cat]} {cat === category ? '← You' : ''}
                    </td>
                    <td>{latestYear.cutoffs![`${cat}_M`] ?? '—'}</td>
                    <td>{latestYear.cutoffs![`${cat}_F`] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── YEAR-WISE ANALYSIS ──────────────────────────────────────────────────
function YearwiseAnalysis() {
  const years = [...new Set(allQs.map(q => q.year))].sort((a, b) => Number(b) - Number(a));
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [compareYear, setCompareYear] = useState<string | null>(null);

  if (selectedYear) {
    const bd = getYearTopicBreakdown(allQs as never, selectedYear);
    const cycleData = comp.cycles.find(c => String(c.year) === selectedYear);
    const cutoffEntry = cd.find(c => c.year === Number(selectedYear));
    const maxPct = Math.max(...bd.subjects.map(s => s.pct));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setSelectedYear(null)}>← All Years</button>
          <div style={{ fontWeight: 800, fontSize: 18 }}>KSP PC {selectedYear}</div>
        </div>

        {/* Overview card */}
        <div className="card-primary" style={{ borderRadius: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Total Questions', val: bd.total },
              { label: 'Vacancies (NKK)', val: cutoffEntry?.vacancies ?? '—' },
              { label: 'Applicants (est.)', val: cycleData?.applicants ? `~${(cycleData.applicants / 1000).toFixed(0)}K` : '—' },
              { label: 'Competition Ratio', val: cycleData?.ratio ?? '—' },
              { label: 'Difficulty', val: cycleData?.paperDifficulty ? '★'.repeat(cycleData.paperDifficulty) : '—' },
              { label: 'Topper Score', val: cycleData?.topperScore ?? '—' },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{ fontSize: 11, opacity: 0.75 }}>{label}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject weight bar chart */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Subject Weight Breakdown</div>
          {bd.subjects.map(({ subject, count, pct }) => (
            <div key={subject} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{subject}</span>
                <span style={{ color: 'var(--c-text-3)' }}>{count} Qs ({pct}%)</span>
              </div>
              <div style={{ height: 20, background: 'var(--c-surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${(pct / maxPct) * 100}%`,
                  background: 'var(--c-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: 8, fontSize: 11, fontWeight: 700, color: '#fff',
                  transition: 'width 0.6s ease',
                }}>{pct}%</div>
              </div>
            </div>
          ))}
        </div>

        {/* Top 10 topics */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Top Topics This Year</div>
          {bd.topics.slice(0, 10).map(({ topic, count, pct }, i) => (
            <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: i < 3 ? 'var(--c-gold)' : 'var(--c-surface-3)',
                color: i < 3 ? '#fff' : 'var(--c-text-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700
              }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{topic}</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)' }}>{count} Qs ({pct}%)</div>
            </div>
          ))}
        </div>

        {/* Cutoff info */}
        {cutoffEntry?.cutoffs && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Estimated Cutoffs — {selectedYear}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              {['General', 'OBC_2A', 'SC', 'ST'].map(cat => (
                <div key={cat} style={{ background: 'var(--c-surface-2)', padding: '8px 12px', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--c-text-2)', fontSize: 12 }}>{CATEGORY_LABELS[cat]}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--c-text)' }}>
                    {cutoffEntry.cutoffs![`${cat}_M`]}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>Male</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {years.map(year => {
        const cycleData = comp.cycles.find(c => String(c.year) === year);
        const cutoffEntry = cd.find(c => c.year === Number(year));
        const yearQs = allQs.filter(q => q.year === year);
        return (
          <button key={year} className="card card-hover"
            style={{ border: '1px solid var(--c-border)', cursor: 'pointer', textAlign: 'left', width: '100%', display: 'flex', gap: 14, alignItems: 'center', padding: 14, background: 'none' }}
            onClick={() => setSelectedYear(year)}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, background: 'var(--c-primary)',
              color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', flexShrink: 0
            }}>
              <div style={{ fontSize: 17, fontWeight: 900 }}>{year}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>KSP PC {year}</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginTop: 2 }}>
                {yearQs.length} Qs
                {cycleData?.vacancies && ` · ${cycleData.vacancies.total} vacancies`}
                {cycleData?.ratio && ` · ${cycleData.ratio}`}
              </div>
              {cutoffEntry?.difficulty && (
                <div style={{ fontSize: 11, color: 'var(--c-gold)', marginTop: 2 }}>
                  Difficulty: {'★'.repeat(cutoffEntry.difficulty)}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--c-primary)' }}>
                {cutoffEntry?.cutoffs?.['General_M'] ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--c-text-3)' }}>Gen Cutoff</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── TOPIC TRENDS ────────────────────────────────────────────────────────
function TopicTrends() {
  const rising = Object.entries(topicTrends)
    .filter(([, v]) => v.trend === 'rising' && v.recentCount >= 3)
    .sort((a, b) => b[1].recentCount - a[1].recentCount);
  const falling = Object.entries(topicTrends)
    .filter(([, v]) => v.trend === 'falling' && v.oldCount >= 5)
    .sort((a, b) => b[1].oldCount - a[1].oldCount);
  const stable = Object.entries(topicTrends)
    .filter(([, v]) => v.trend === 'stable' && (v.recentCount + v.oldCount) >= 8)
    .sort((a, b) => (b[1].recentCount + b[1].oldCount) - (a[1].recentCount + a[1].oldCount));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Strategic advice */}
      <div className="card" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 8 }}>📈 2026 Exam Strategy</div>
        <div style={{ fontSize: 13, color: '#78350F', lineHeight: 1.6 }}>
          <strong>Prioritize:</strong> Karnataka GK (rising, 28% weight) + Current Affairs (rising, 20% weight)<br/>
          <strong>De-prioritize:</strong> Maths (falling, only ~2%). Spend LESS time here.<br/>
          <strong>New in 2024:</strong> Law/IPC questions — expect to increase in 2026.
        </div>
      </div>

      {rising.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">🔥 Rising Topics</span>
            <span className="badge badge-hot">Study First</span>
          </div>
          {rising.slice(0, 8).map(([topic, data]) => (
            <div key={topic} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
              <span className="badge badge-rising">📈 Rising</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{topic}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                  Recent papers: {data.recentCount} Qs · Earlier: {data.oldCount} Qs
                </div>
              </div>
              <div style={{ fontSize: 20, color: '#DC2626' }}>↑</div>
            </div>
          ))}
        </div>
      )}

      {falling.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">📉 Declining Topics</span>
            <span style={{ fontSize: 12, color: 'var(--c-text-3)' }}>Spend less time</span>
          </div>
          {falling.slice(0, 5).map(([topic, data]) => (
            <div key={topic} className="card" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, padding: 12, opacity: 0.8 }}>
              <span className="badge badge-low">📉</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{topic}</div>
                <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                  Recent: {data.recentCount} Qs (was {data.oldCount})
                </div>
              </div>
              <div style={{ fontSize: 20, color: '#16A34A' }}>↓</div>
            </div>
          ))}
        </div>
      )}

      {stable.length > 0 && (
        <div>
          <div className="section-header">
            <span className="section-title">→ Stable Topics</span>
          </div>
          {stable.slice(0, 5).map(([topic, data]) => (
            <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--c-border)' }}>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{topic}</div>
              <div style={{ fontSize: 12, color: 'var(--c-text-3)' }}>~{data.recentCount} Qs/year</div>
              <div style={{ fontSize: 16, color: 'var(--c-text-3)' }}>→</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── COMPETITION ─────────────────────────────────────────────────────────
function Competition() {
  const cycles = comp.cycles.filter(c => c.vacancies);
  const maxApplicants = Math.max(...cycles.map(c => c.applicants ?? 0));
  const settings = useMemo(() => getSettings(), []);
  const [avgScore, setAvgScore] = useState(65);

  const CUTOFF_MAP: Record<string, number> = {
    'General_NKK': 75, 'General_KK': 67, 'OBC_2A_NKK': 68, 'OBC_2A_KK': 60,
    'OBC_2B_NKK': 65, 'SC_NKK': 60, 'SC_KK': 52, 'ST_NKK': 56, 'ST_KK': 48,
    'CAT01_NKK': 63,
  };
  const settingsKey = `${settings.category}_${settings.region}`;
  const cutoff = CUTOFF_MAP[settingsKey] ?? 75;
  const gap = avgScore - cutoff;
  const prob = gap >= 15 ? 95 : gap >= 10 ? 85 : gap >= 5 ? 65 : gap >= 0 ? 35 : gap >= -5 ? 15 : 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Applicants chart */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Competition Growth</div>
        {cycles.map(c => {
          const barPct = c.applicants ? (c.applicants / (maxApplicants || 1)) * 100 : 20;
          return (
            <div key={c.year} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{c.year}</span>
                <span style={{ color: 'var(--c-text-3)' }}>
                  {c.applicants ? `~${(c.applicants / 1000).toFixed(0)}K applicants` : 'Upcoming'} · {c.vacancies.total.toLocaleString()} vacancies · {c.ratio}
                </span>
              </div>
              <div className="comp-bar" style={{ width: `${Math.max(barPct, 10)}%` }}>
                {c.ratio}
              </div>
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: 'var(--c-warn)', marginTop: 8, fontWeight: 600 }}>
          ⚠️ Competition up 55%+ in 5 years. 2026 est. 1:70+ ratio — most competitive ever.
        </div>
      </div>

      {/* Selection probability */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Selection Probability Calculator</div>
        <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginBottom: 10 }}>
          Your avg mock score (last 5 tests):
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <input type="range" className="score-input" min={30} max={100} value={avgScore}
            onChange={e => setAvgScore(Number(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontWeight: 900, fontSize: 22, color: 'var(--c-primary)', minWidth: 40 }}>{avgScore}</span>
        </div>
        <div style={{
          padding: 16, borderRadius: 12, textAlign: 'center',
          background: prob >= 70 ? 'var(--c-correct-bg)' : prob >= 40 ? 'var(--c-warn-bg)' : 'var(--c-wrong-bg)',
          border: `1px solid ${prob >= 70 ? 'var(--c-correct)' : prob >= 40 ? 'var(--c-warn)' : 'var(--c-wrong)'}`,
        }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: prob >= 70 ? 'var(--c-correct)' : prob >= 40 ? 'var(--c-warn)' : 'var(--c-wrong)' }}>
            {prob}%
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>
            Estimated Selection Probability
          </div>
          <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 6 }}>
            Based on 2024 cutoff ({cutoff} marks) for {settings.category} {settings.region}
            {gap < 0 ? ` — Need +${Math.abs(gap)} more marks` : ` — ${gap} marks above cutoff`}
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--c-text-3)' }}>
          Score to reach 70%+ probability: <strong>{cutoff + 5}</strong> marks
        </div>
      </div>

      {/* Merit list distribution */}
      {officialYears.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Merit List Score Distribution</div>
          {officialYears.map(c => {
            if (!c.topperScore || !c.rank500Score) return null;
            const cutoffVal = c.cutoffs?.['General_M'] ?? 65;
            return (
              <div key={c.year} style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                  {c.year} — General (NKK)
                  {c.isEstimated && <span style={{ fontSize: 10, color: 'var(--c-text-3)', marginLeft: 4 }}>*est</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Topper', val: c.topperScore, color: '#FFA000' },
                    { label: '500th Rank', val: c.rank500Score, color: 'var(--c-primary)' },
                    { label: 'Cutoff', val: cutoffVal, color: 'var(--c-wrong)' },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: 'center', background: 'var(--c-surface-2)', borderRadius: 8, padding: '8px 6px' }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color }}>{val}</div>
                      <div style={{ fontSize: 10, color: 'var(--c-text-3)', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NKK vs KK */}
      <div className="card" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#1E40AF' }}>
          🗺 NKK vs KK Region
        </div>
        <div style={{ fontSize: 13, color: '#1E3A5F', lineHeight: 1.7 }}>
          <strong>KK Region (Kalyana Karnataka):</strong><br/>
          Special quota under Article 371(J) for districts:<br/>
          Bidar, Kalaburagi, Yadgir, Vijayapura, Raichur, Koppal<br/><br/>
          • Lower competition than NKK<br/>
          • Cutoffs typically 6–8 marks lower<br/>
          • Separate notification and merit list<br/>
          • If you belong to these districts, strongly recommend applying in KK quota
        </div>
      </div>
    </div>
  );
}

// ── HIGH REPEAT QUESTIONS ───────────────────────────────────────────────
function HighRepeatQuestions({ onPractice }: { onPractice: (qs: Q[]) => void }) {
  const highRepeat = useMemo(() =>
    allQs.filter(q => (repeatScores[q.id]?.score ?? 0) >= 2)
      .slice(0, 50), []);
  const medRepeat = useMemo(() =>
    allQs.filter(q => (repeatScores[q.id]?.score ?? 0) === 1)
      .slice(0, 50), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#991B1B', marginBottom: 6 }}>
          🔴 {highRepeat.length} High Probability Questions
        </div>
        <div style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 12 }}>
          These questions appeared in 3+ exam years. Highest chance of repeating in 2026.
          MUST study these first.
        </div>
        <button className="btn btn-danger" onClick={() => onPractice(highRepeat)}>
          Practice All {highRepeat.length} High-Repeat Questions →
        </button>
      </div>

      <div className="card" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#92400E', marginBottom: 6 }}>
          🟡 {medRepeat.length} Medium Probability Questions
        </div>
        <div style={{ fontSize: 13, color: '#78350F', marginBottom: 12 }}>
          Appeared in 2 exam years. Moderate chance of repeating. Study after high-repeat.
        </div>
        <button className="btn btn-gold" onClick={() => onPractice(medRepeat)}>
          Practice {medRepeat.length} Repeated Questions →
        </button>
      </div>

      {/* Preview */}
      <div className="section-title">Preview — High Repeat Questions</div>
      {highRepeat.slice(0, 8).map((q, i) => {
        const r = repeatScores[q.id];
        return (
          <div key={q.id} className="card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="badge badge-high">🔴 {r?.years.join(', ')}</span>
              <span style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{q.topic}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>
              {i + 1}. {q.question.substring(0, 120)}{q.question.length > 120 ? '...' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN InsightsView ───────────────────────────────────────────────────
interface InsightsProps {
  initialSection?: string;
  onPracticeQuestions?: (qs: Q[]) => void;
}

export default function InsightsView({ initialSection, onPracticeQuestions }: InsightsProps) {
  const [section, setSection] = useState<Section>(
    initialSection === 'cutoff' ? 'cutoff' :
    initialSection === 'yearwise' ? 'yearwise' : 'cutoff'
  );

  const tabs: { id: Section; label: string; icon: string }[] = [
    { id: 'cutoff', label: 'Cutoff', icon: '🎯' },
    { id: 'yearwise', label: 'Year', icon: '📅' },
    { id: 'trends', label: 'Trends', icon: '📈' },
    { id: 'competition', label: 'Competition', icon: '⚔️' },
    { id: 'repeats', label: 'Repeats', icon: '🔴' },
  ];

  return (
    <>
      <div className="top-bar">
        <span className="top-bar-title">📊 Insights</span>
      </div>
      <div className="page page-gap">
        {/* Inner tabs */}
        <div className="scroll-x" style={{ marginBottom: -8 }}>
          <div style={{ display: 'flex', gap: 6, paddingBottom: 4 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                className={`chip${section === t.id ? ' active' : ''}`}
                onClick={() => setSection(t.id)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {section === 'cutoff'      && <CutoffCalculator />}
        {section === 'yearwise'    && <YearwiseAnalysis />}
        {section === 'trends'      && <TopicTrends />}
        {section === 'competition' && <Competition />}
        {section === 'repeats'     && (
          <HighRepeatQuestions
            onPractice={(qs) => onPracticeQuestions?.(qs)}
          />
        )}
      </div>
    </>
  );
}

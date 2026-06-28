// src/components/ProgressView.tsx
import React, { useMemo, useState } from 'react';
import rawQuestions from '../data/pyqs.json';
import { getAllAnswered, getOverallStats, getAllTests, getStreak, getTopicStats } from '../lib/storage';

interface Q { id: number; subject: string; topic: string; year: string; }
const allQs = rawQuestions as unknown as Q[];

const SUBJECT_COLOR: Record<string, string> = {
  'General Awareness': '#D97706',
  'General Science':   '#16A34A',
  'Reasoning':         '#7C3AED',
  'Mathematics':       '#0EA5E9',
};

export default function ProgressView() {
  const [tab, setTab] = useState<'overview' | 'topics' | 'tests' | 'streak'>('overview');
  const answered = useMemo(() => getAllAnswered(), []);
  const stats     = useMemo(() => getOverallStats(), []);
  const tests     = useMemo(() => getAllTests(), []);
  const streak    = useMemo(() => getStreak(), []);
  const topicStats = useMemo(() => getTopicStats(allQs), []);

  // Subject breakdown
  const subjectData = useMemo(() => {
    const map: Record<string, { total: number; done: number; correct: number }> = {};
    allQs.forEach(q => {
      if (!map[q.subject]) map[q.subject] = { total: 0, done: 0, correct: 0 };
      map[q.subject].total++;
      const a = answered[q.id];
      if (a) { map[q.subject].done++; if (a.correct) map[q.subject].correct++; }
    });
    return map;
  }, [answered]);

  // Topic mastery table sorted by weakest first
  const topicMastery = useMemo(() => {
    return Object.entries(topicStats)
      .filter(([, v]) => v.done > 0)
      .map(([key, v]) => {
        const [subject, topic] = key.split('::');
        const acc = Math.round((v.correct / v.done) * 100);
        const pct = Math.round((v.done / v.total) * 100);
        return { subject, topic, ...v, acc, pct };
      })
      .sort((a, b) => a.acc - b.acc); // weakest first
  }, [topicStats]);

  // Heatmap data (last 6 months)
  const heatmapDays = useMemo(() => {
    const days: { date: string; active: boolean; today: boolean }[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    for (let i = 181; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      days.push({ date: str, active: streak.days.includes(str), today: str === todayStr });
    }
    return days;
  }, [streak]);

  const avgScore = tests.length
    ? Math.round(tests.slice(0, 10).reduce((s, t) => s + (t.score / t.total) * 100, 0) / Math.min(tests.length, 10))
    : null;

  return (
    <>
      <div className="top-bar">
        <span className="top-bar-title">📈 My Progress</span>
        <span className="top-bar-badge">{stats.total} Qs Done</span>
      </div>

      <div className="page page-gap">
        {/* Inner tabs */}
        <div className="inner-tabs">
          {(['overview', 'topics', 'tests', 'streak'] as const).map(t => (
            <button key={t} className={`inner-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? 'Overview' : t === 'topics' ? 'Topics' : t === 'tests' ? 'Tests' : 'Streak'}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            {/* Main stats */}
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

            {avgScore !== null && (
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className={`score-circle ${avgScore >= 70 ? 'pass' : avgScore >= 50 ? 'warn' : 'fail'}`}>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{avgScore}</div>
                  <div style={{ fontSize: 10, fontWeight: 600 }}>avg score</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>Average Mock Score</div>
                  <div style={{ fontSize: 13, color: 'var(--c-text-2)', marginTop: 4 }}>
                    Last {Math.min(tests.length, 10)} tests
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: avgScore >= 75 ? 'var(--c-correct)' : 'var(--c-warn)' }}>
                    {avgScore >= 75 ? '✅ Above General cutoff (~75)' : `⚠️ Need +${75 - avgScore} to reach General cutoff`}
                  </div>
                </div>
              </div>
            )}

            {/* Subject breakdown */}
            <div className="section-title">Subject Mastery</div>
            {Object.entries(subjectData).map(([subject, { total, done, correct }]) => {
              const acc = done > 0 ? Math.round((correct / done) * 100) : 0;
              const coverage = Math.round((done / total) * 100);
              const color = SUBJECT_COLOR[subject] ?? '#64748B';
              return (
                <div key={subject} className="card" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 4, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{subject}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                        {done}/{total} attempted · {correct} correct
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: acc >= 70 ? 'var(--c-correct)' : acc >= 50 ? 'var(--c-warn)' : 'var(--c-wrong)' }}>
                        {done > 0 ? `${acc}%` : '—'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--c-text-3)' }}>accuracy</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text-3)' }}>
                      <span>Coverage: {coverage}%</span>
                      <span>Accuracy: {done > 0 ? acc : 0}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${coverage}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* ── TOPICS ── */}
        {tab === 'topics' && (
          <>
            <div style={{ fontSize: 12, color: 'var(--c-text-3)', marginBottom: 4 }}>
              Sorted by weakest accuracy first — focus on red topics
            </div>
            {topicMastery.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <div>No topics practiced yet.</div>
                <div style={{ fontSize: 13 }}>Go to PYQs tab to start practicing.</div>
              </div>
            ) : (
              topicMastery.map(({ subject, topic, total, done, correct, acc, pct }) => (
                <div key={`${subject}::${topic}`} className="card" style={{
                  padding: 12,
                  borderLeft: `3px solid ${acc < 50 ? 'var(--c-wrong)' : acc < 70 ? 'var(--c-warn)' : 'var(--c-correct)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{topic}</div>
                      <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>{subject}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: acc < 50 ? 'var(--c-wrong)' : acc < 70 ? 'var(--c-warn)' : 'var(--c-correct)' }}>
                        {acc}%
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--c-text-3)' }}>{done}/{total}</div>
                    </div>
                  </div>
                  <div className="progress-bar" style={{ height: 3 }}>
                    <div className="progress-fill" style={{
                      width: `${acc}%`,
                      background: acc < 50 ? 'var(--c-wrong)' : acc < 70 ? 'var(--c-warn)' : 'var(--c-correct)'
                    }} />
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* ── TESTS ── */}
        {tab === 'tests' && (
          <>
            {tests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📝</div>
                <div>No tests taken yet.</div>
                <div style={{ fontSize: 13 }}>Go to Test tab to take your first mock.</div>
              </div>
            ) : (
              <>
                {/* Score trend */}
                <div className="card">
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Score Trend (last 10 tests)</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60 }}>
                    {tests.slice(0, 10).reverse().map((t, i) => {
                      const pct = Math.round((t.score / t.total) * 100);
                      return (
                        <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <div style={{
                            width: '100%', height: `${pct * 0.55}px`,
                            borderRadius: '4px 4px 0 0',
                            background: pct >= 70 ? 'var(--c-correct)' : pct >= 50 ? 'var(--c-warn)' : 'var(--c-wrong)',
                            minHeight: 4,
                          }} />
                          <div style={{ fontSize: 9, color: 'var(--c-text-4)' }}>{pct}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--c-text-3)' }}>
                    General cutoff line: ~75 marks · Each bar = one test
                  </div>
                </div>

                {/* Test list */}
                {tests.slice(0, 20).map(t => {
                  const pct = Math.round((t.score / t.total) * 100);
                  const date = new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  const mins = Math.round(t.timeSec / 60);
                  return (
                    <div key={t.id} className="card" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                        background: pct >= 70 ? 'var(--c-correct-bg)' : pct >= 50 ? 'var(--c-warn-bg)' : 'var(--c-wrong-bg)',
                        border: `1.5px solid ${pct >= 70 ? 'var(--c-correct)' : pct >= 50 ? 'var(--c-warn)' : 'var(--c-wrong)'}`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: pct >= 70 ? 'var(--c-correct)' : pct >= 50 ? 'var(--c-warn)' : 'var(--c-wrong)' }}>
                          {t.score.toFixed(0)}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--c-text-3)' }}>/{t.total}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{t.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text-3)' }}>
                          {date} · {mins} min · {pct}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        {/* ── STREAK ── */}
        {tab === 'streak' && (
          <>
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <div className="streak-flame">🔥</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: '#EA580C', lineHeight: 1, marginTop: 8 }}>
                {streak.current}
              </div>
              <div style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>Day Streak</div>
              <div style={{ fontSize: 13, color: 'var(--c-text-3)', marginTop: 4 }}>
                Best: {streak.best} days · Total days studied: {streak.days.length}
              </div>
            </div>

            {/* Heatmap */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Study Heatmap (last 6 months)</div>
              <div className="heatmap-grid">
                {heatmapDays.map(({ date, active, today }) => (
                  <div
                    key={date}
                    className={`heatmap-cell${active ? ' active' : ''}${today ? ' today' : ''}`}
                    title={date}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 11, color: 'var(--c-text-3)' }}>
                <div className="heatmap-cell" style={{ width: 12, height: 12 }} />
                <span>No study</span>
                <div className="heatmap-cell active" style={{ width: 12, height: 12 }} />
                <span>Studied</span>
              </div>
            </div>

            {/* Milestones */}
            <div className="section-title">Milestones</div>
            {[
              { label: 'First 100 questions', target: 100, icon: '📚' },
              { label: '500 questions done', target: 500, icon: '📖' },
              { label: '1000 questions done', target: 1000, icon: '🎓' },
              { label: '7-day streak', target: 7, icon: '🔥', isStreak: true },
              { label: '30-day streak', target: 30, icon: '⚡', isStreak: true },
            ].map(({ label, target, icon, isStreak }) => {
              const current = isStreak ? streak.best : stats.total;
              const done = current >= target;
              return (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: '1px solid var(--c-border)',
                  opacity: done ? 1 : 0.5
                }}>
                  <span style={{ fontSize: 24 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--c-text-3)', marginTop: 2 }}>
                      {Math.min(current, target)}/{target}
                    </div>
                    <div className="progress-bar" style={{ height: 3, marginTop: 4 }}>
                      <div className="progress-fill green" style={{ width: `${Math.min((current / target) * 100, 100)}%` }} />
                    </div>
                  </div>
                  {done && <span style={{ color: 'var(--c-correct)', fontSize: 20 }}>✓</span>}
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

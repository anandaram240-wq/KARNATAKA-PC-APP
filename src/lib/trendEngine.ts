// src/lib/trendEngine.ts
// Computes repeat scores and topic trends from pyqs data

export interface QuestionWithScore {
  id: number;
  repeatScore: number;     // 0=low, 1=medium, 2=high
  repeatYears: string[];   // years this question (or similar) appeared
  trendTag?: '🔥 Hot' | '📈 Rising' | '📉 Falling';
}

interface RawQuestion {
  id: number;
  topic: string;
  subject: string;
  question: string;
  year: string;
}

// ── Topic trend analysis ───────────────────────────────────────────────────────
export function computeTopicTrends(questions: RawQuestion[]) {
  const byTopicYear: Record<string, Record<string, number>> = {};
  questions.forEach(q => {
    if (!byTopicYear[q.topic]) byTopicYear[q.topic] = {};
    byTopicYear[q.topic][q.year] = (byTopicYear[q.topic][q.year] || 0) + 1;
  });

  const recent = ['2018', '2019', '2020', '2021'];
  const older  = ['2014', '2015', '2016', '2017'];

  const trends: Record<string, { trend: 'rising' | 'falling' | 'stable'; recentCount: number; oldCount: number }> = {};

  Object.entries(byTopicYear).forEach(([topic, yearMap]) => {
    const recentCount = recent.reduce((s, y) => s + (yearMap[y] || 0), 0);
    const oldCount    = older.reduce((s, y)  => s + (yearMap[y] || 0), 0);
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (recentCount > oldCount * 1.2) trend = 'rising';
    else if (oldCount > recentCount * 1.2) trend = 'falling';
    trends[topic] = { trend, recentCount, oldCount };
  });

  return trends;
}

// ── Repeat probability ─────────────────────────────────────────────────────────
export function computeRepeatScores(questions: RawQuestion[]): Record<number, { score: number; years: string[] }> {
  // Group by normalized question text (first 80 chars lowercase)
  const groups: Record<string, { ids: number[]; years: string[] }> = {};

  questions.forEach(q => {
    const key = q.question.trim().toLowerCase().replace(/\s+/g, ' ').substring(0, 80);
    if (!groups[key]) groups[key] = { ids: [], years: [] };
    groups[key].ids.push(q.id);
    if (!groups[key].years.includes(q.year)) groups[key].years.push(q.year);
  });

  const result: Record<number, { score: number; years: string[] }> = {};

  Object.values(groups).forEach(({ ids, years }) => {
    const score = years.length === 1 ? 0 : years.length === 2 ? 1 : 2;
    ids.forEach(id => { result[id] = { score, years }; });
  });

  // Fill remaining questions with 0
  questions.forEach(q => {
    if (!result[q.id]) result[q.id] = { score: 0, years: [q.year] };
  });

  return result;
}

// ── Top rising topics for home screen ─────────────────────────────────────────
export function getRisingTopics(questions: RawQuestion[]) {
  const trends = computeTopicTrends(questions);
  return Object.entries(trends)
    .filter(([, v]) => v.trend === 'rising' && v.recentCount >= 3)
    .sort((a, b) => b[1].recentCount - a[1].recentCount)
    .slice(0, 5)
    .map(([topic, v]) => ({ topic, recentCount: v.recentCount }));
}

// ── Topic frequency map ────────────────────────────────────────────────────────
export function getTopicFrequency(questions: RawQuestion[]) {
  const map: Record<string, number> = {};
  questions.forEach(q => {
    const k = q.subject + '::' + q.topic;
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

// Year-wise topic breakdown for deep analysis
export function getYearTopicBreakdown(questions: RawQuestion[], year: string) {
  const qs = questions.filter(q => q.year === year);
  const subjectMap: Record<string, number> = {};
  const topicMap: Record<string, number> = {};
  qs.forEach(q => {
    subjectMap[q.subject] = (subjectMap[q.subject] || 0) + 1;
    topicMap[q.topic] = (topicMap[q.topic] || 0) + 1;
  });
  const total = qs.length;
  return {
    total,
    subjects: Object.entries(subjectMap)
      .sort((a, b) => b[1] - a[1])
      .map(([s, c]) => ({ subject: s, count: c, pct: Math.round((c / total) * 100) })),
    topics: Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => ({ topic: t, count: c, pct: Math.round((c / total) * 100) })),
  };
}

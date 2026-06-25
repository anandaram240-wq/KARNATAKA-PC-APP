// src/lib/storage.ts
// Simple localStorage wrapper — no AI, no complexity

const PREFIX = 'ksp_';

export interface TestRecord {
  id: string;
  date: string;
  year: string | 'mixed';
  subject: string | 'all';
  total: number;
  correct: number;
  timeSec: number;
  subjectBreakdown: Record<string, { total: number; correct: number }>;
}

export interface PracticeRecord {
  questionId: number;
  correct: boolean;
  date: string;
}

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function set<T>(key: string, value: T): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
}

// ── Practice history ──────────────────────────────────────────────────────
export function getPracticeHistory(): PracticeRecord[] {
  return get<PracticeRecord[]>('practice_history', []);
}

export function addPracticeRecord(record: PracticeRecord): void {
  const history = getPracticeHistory();
  history.push(record);
  // keep last 5000 only
  set('practice_history', history.slice(-5000));
}

// ── Test history ──────────────────────────────────────────────────────────
export function getTestHistory(): TestRecord[] {
  return get<TestRecord[]>('test_history', []);
}

export function addTestRecord(record: TestRecord): void {
  const history = getTestHistory();
  history.unshift(record); // newest first
  set('test_history', history.slice(0, 200));
}

// ── Progress stats (derived) ──────────────────────────────────────────────
export interface ProgressStats {
  totalPracticed: number;
  totalCorrect: number;
  accuracy: number;
  totalTests: number;
  bestScore: number;
  lastScore: number;
  subjectAccuracy: Record<string, { total: number; correct: number }>;
  recentTests: TestRecord[];
}

export function getProgressStats(): ProgressStats {
  const tests = getTestHistory();
  const practice = getPracticeHistory();

  const totalPracticed = practice.length;
  const totalCorrect = practice.filter(p => p.correct).length;
  const accuracy = totalPracticed > 0 ? Math.round((totalCorrect / totalPracticed) * 100) : 0;
  const scores = tests.map(t => Math.round((t.correct / t.total) * 100));
  const bestScore = scores.length ? Math.max(...scores) : 0;
  const lastScore = scores.length ? scores[0] : 0;

  const subjectAccuracy: Record<string, { total: number; correct: number }> = {};
  practice.forEach(() => {}); // placeholder — we track via tests
  tests.forEach(t => {
    Object.entries(t.subjectBreakdown).forEach(([subj, { total, correct }]) => {
      if (!subjectAccuracy[subj]) subjectAccuracy[subj] = { total: 0, correct: 0 };
      subjectAccuracy[subj].total += total;
      subjectAccuracy[subj].correct += correct;
    });
  });

  return {
    totalPracticed,
    totalCorrect,
    accuracy,
    totalTests: tests.length,
    bestScore,
    lastScore,
    subjectAccuracy,
    recentTests: tests.slice(0, 10),
  };
}

// ── Dark mode preference ──────────────────────────────────────────────────
export function getDarkMode(): boolean {
  return get<boolean>('dark_mode', false);
}
export function setDarkMode(v: boolean): void {
  set('dark_mode', v);
}

// ── Language preference ───────────────────────────────────────────────────
export function getLang(): 'en' | 'kn' {
  return get<'en' | 'kn'>('lang', 'en');
}
export function setLang(v: 'en' | 'kn'): void {
  set('lang', v);
}

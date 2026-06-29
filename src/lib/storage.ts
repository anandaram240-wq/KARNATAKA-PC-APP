// src/lib/storage.ts — All localStorage persistence with Firebase Sync

import { syncAnswer, syncTest, syncStreak, syncSettings } from './firebaseSync';
import allQuestions from '../data/pyqs.json';

const KEYS = {
  answered:  'ksp_answered',   // Record<questionId, {correct,ts}>
  tests:     'ksp_tests',      // TestResult[]
  streak:    'ksp_streak',     // StreakData
  settings:  'ksp_settings',   // UserSettings
  dark:      'ksp_dark',
  lang:      'ksp_lang',
};

export interface AnsweredQuestion {
  correct: boolean;
  ts: number;       // timestamp
  timeSec: number;  // seconds taken
}

export interface TestResult {
  id: string;
  type: 'full' | 'year' | 'subject' | 'topic' | 'smart';
  label: string;
  date: number;
  score: number;
  total: number;
  timeSec: number;
  breakdown: Record<string, { correct: number; total: number }>;
  answers: Record<number, number>; // qid → chosen option index
}

export interface StreakData {
  current: number;
  best: number;
  lastDate: string; // YYYY-MM-DD
  days: string[];   // YYYY-MM-DD array
}

export interface UserSettings {
  category: 'General' | 'OBC_2A' | 'OBC_2B' | 'OBC_3A' | 'OBC_3B' | 'SC' | 'ST' | 'CAT01';
  region: 'NKK' | 'KK';
  gender: 'M' | 'F';
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function load<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function getActiveEmail(): string | null {
  try {
    const s = localStorage.getItem('ksp_user_profile');
    if (!s) return null;
    const p = JSON.parse(s);
    return p.email && p.email !== 'guest@local' ? p.email : null;
  } catch {
    return null;
  }
}

// ── Theme & Language ───────────────────────────────────────────────────────────
export const getDarkMode = () => load(KEYS.dark, false);
export const setDarkMode = (v: boolean) => save(KEYS.dark, v);
export const getLang = (): 'en' | 'kn' => load(KEYS.lang, 'en');
export const setLang = (v: 'en' | 'kn') => save(KEYS.lang, v);

// ── Settings ───────────────────────────────────────────────────────────────────
export const getSettings = (): UserSettings =>
  load(KEYS.settings, { category: 'General', region: 'NKK', gender: 'M' });
export const saveSettings = (s: UserSettings) => {
  save(KEYS.settings, s);
  const email = getActiveEmail();
  if (email) syncSettings(email, s);
};

// ── Answered questions ─────────────────────────────────────────────────────────
export const getAllAnswered = (): Record<number, AnsweredQuestion> =>
  load(KEYS.answered, {});

export const markAnswered = (qid: number, correct: boolean, timeSec = 0) => {
  const all = getAllAnswered();
  all[qid] = { correct, ts: Date.now(), timeSec };
  save(KEYS.answered, all);
  touchStreak();

  // Replicate to Firebase
  const email = getActiveEmail();
  if (email) {
    const qInfo = (allQuestions as any[]).find(q => q.id === qid);
    const subject = qInfo ? qInfo.subject : 'Unknown';
    syncAnswer(email, qid, correct, timeSec, subject);
  }
};

export const isAnswered = (qid: number) => qid in getAllAnswered();

// Per-topic stats
export const getTopicStats = (questions: { id: number; topic: string; subject: string }[]) => {
  const answered = getAllAnswered();
  const map: Record<string, { total: number; done: number; correct: number }> = {};
  questions.forEach(q => {
    const k = q.subject + '::' + q.topic;
    if (!map[k]) map[k] = { total: 0, done: 0, correct: 0 };
    map[k].total++;
    if (answered[q.id]) {
      map[k].done++;
      if (answered[q.id].correct) map[k].correct++;
    }
  });
  return map;
};

// Per-subject stats
export const getSubjectStats = (questions: { id: number; subject: string }[]) => {
  const answered = getAllAnswered();
  const map: Record<string, { total: number; done: number; correct: number }> = {};
  questions.forEach(q => {
    if (!map[q.subject]) map[q.subject] = { total: 0, done: 0, correct: 0 };
    map[q.subject].total++;
    if (answered[q.id]) {
      map[q.subject].done++;
      if (answered[q.id].correct) map[q.subject].correct++;
    }
  });
  return map;
};

// Overall accuracy
export const getOverallStats = () => {
  const answered = getAllAnswered();
  const entries = Object.values(answered);
  const total = entries.length;
  const correct = entries.filter(e => e.correct).length;
  return { total, correct, accuracy: total ? Math.round((correct / total) * 100) : 0 };
};

// ── Test Results ───────────────────────────────────────────────────────────────
export const getAllTests = (): TestResult[] => load(KEYS.tests, []);

export const saveTestResult = (t: TestResult) => {
  const all = getAllTests();
  all.unshift(t);
  save(KEYS.tests, all.slice(0, 50)); // keep last 50

  // Replicate to Firebase
  const email = getActiveEmail();
  if (email) {
    syncTest(email, t);
  }
};

// ── Streak ─────────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

export const getStreak = (): StreakData =>
  load(KEYS.streak, { current: 0, best: 0, lastDate: '', days: [] });

const touchStreak = () => {
  const d = today();
  const s = getStreak();
  if (s.lastDate === d) return; // already counted today
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];
  const newStreak = s.lastDate === yStr ? s.current + 1 : 1;
  const days = [...new Set([...s.days, d])].slice(-365);
  const newStreakData = {
    current: newStreak,
    best: Math.max(s.best, newStreak),
    lastDate: d,
    days,
  };
  save(KEYS.streak, newStreakData);

  // Replicate to Firebase
  const email = getActiveEmail();
  if (email) {
    syncStreak(email, newStreakData);
  }
};

export const getTodayStudied = () => {
  const answered = getAllAnswered();
  const t = Date.now();
  const since = t - 86400000; // last 24h
  return Object.values(answered).filter(a => a.ts > since).length;
};

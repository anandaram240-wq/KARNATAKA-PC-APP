// src/lib/adminDataService.ts — V3 Enterprise Analytics
// Researched from: Mixpanel, Amplitude, PostHog, Plausible, Stripe, ChartMogul, Vercel, Linear
//
// KEY FIXES vs V2:
//  - growthPct() returns null (not 100) when no previous data → no more "+100% lies"
//  - Engagement score recalibrated (fairer for new users, max 100 with 20 Qs)
//  - retentionCurve: Day1/Day7/Day30 % (Amplitude style)
//  - movementStats: new/churned/resurrected/net (ChartMogul style)
//  - contentPerformance: per-subject attempt+accuracy+AI requests (PostHog style)
//  - questionDifficulty: top hard questions from AI request frequency
//  - engagedSessionRate: % sessions with real activity (GA4 style)
//  - Smart fallback chain: analytics_daily → analytics → visitors → users

import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  docId:           string;
  email:           string;
  name:            string;
  avatar:          string;
  firstSeen:       any;
  updatedAt:       any;
  totalTests:      number;
  totalQuestions:  number;
  totalCorrect:    number;
  accuracy:        number;
  bestScore:       number;
  lastScore:       number;
  subjectAccuracy: Record<string, number>;
  topicAccuracy:   Record<string, number>;
  testHistory:     any[];
  isNew7Days:      boolean;
  engagementScore: number;
  segment:         UserSegment;
  avgQsPerSession: number;
}

export type UserSegment = 'active' | 'at_risk' | 'churned' | 'new';

export interface AdminVisitor {
  docId:      string;
  email:      string;
  name:       string;
  loginType:  string;
  device:     string;
  browser:    string;
  firstSeen:  any;
  lastSeen:   any;
  visitCount: number;
  isGuest:    boolean;
}

export interface AnalyticsSession {
  sessionId:   string;
  loginType:   string;
  email:       string | null;
  name:        string | null;
  device:      string;
  browser:     string;
  referrer:    string;
  firstSeenAt: string;
  lastSeenAt:  string;
  pageViews:   number;
  dateKey:     string;
}

export interface DailyStat {
  date:            string;
  totalHits:       number;
  uniqueSessions:  number;
  googleSessions:  number;
  guestSessions:   number;
  anonSessions:    number;
  mobileSessions:  number;
  desktopSessions: number;
  tabletSessions:  number;
}

export interface AISolution {
  docId:       string;
  questionId:  string;
  subject:     string;
  topic:       string;
  source:      string;
  generatedAt: string;
}

export interface Broadcast {
  docId:   string;
  message: string;
  sentBy:  string;
  sentAt:  any;
}

export interface CohortRow {
  cohortLabel: string;
  weekStart:   string;
  sizes:       number[];
  pcts:        number[];
}

export type HourlyHeatmap = number[][];

export interface SegmentSummary {
  active:   number;
  at_risk:  number;
  churned:  number;
  new:      number;
}

// ── NEW V3 Types ──────────────────────────────────────────────────────────────

export interface RetentionCurve {
  day1Pct:  number | null;  // % of users who came back Day 1
  day7Pct:  number | null;  // % of users who came back Day 7
  day30Pct: number | null;  // % of users who came back Day 30
  day1Base: number;         // how many users eligible for Day 1
  day7Base: number;
  day30Base: number;
}

export interface MovementStats {
  newThisWeek:     number;
  churnedThisWeek: number;
  resurrected:     number;
  netGrowth:       number;
  newLastWeek:     number;
}

export interface ContentPerformance {
  subject:    string;
  attempts:   number;  // total questions answered by all users
  avgAccuracy:number;
  aiRequests: number;
  health:     'healthy' | 'struggling' | 'hard' | 'unknown';
  trend:      'up' | 'down' | 'stable';
}

export interface QuestionDifficulty {
  questionId: string;
  subject:    string;
  topic:      string;
  requests:   number;
  difficulty: number; // 0-100 (100 = hardest)
}

export interface ActivityEvent {
  id:        string;
  type:      'test' | 'visit' | 'ai' | 'new_user';
  user:      string;
  detail:    string;
  timestamp: string;
  icon:      string;
  color:     string;
}

export interface GlobalStats {
  // All-time
  allTimeGoogleUsers:  number;
  allTimeGuestUsers:   number;
  allTimeTotalUsers:   number;
  allTimeSessions:     number;
  allTimePageHits:     number;

  // Quality
  totalQsSolved:    number;
  totalCorrect:     number;
  avgAccuracy:      number;
  totalAISolutions: number;
  avgEngagement:    number;
  engagedSessionPct:number; // % sessions with ≥1 question (GA4 engagement rate)
  avgQsPerSession:  number;

  // Today
  activeToday:          number;
  activeYesterday:      number;
  activePast7Days:      number;
  newUsersToday:        number;
  newUsersThisWeek:     number;
  todayHits:            number;
  todaySessions:        number;
  todayGoogleSessions:  number;
  todayGuestSessions:   number;

  // Growth — null means "no previous period data" (never show fake 100%)
  wowGrowth:  number | null;
  momGrowth:  number | null;
  wowUsers:   number | null;
  onlineNow:  number;

  // Device
  mobileCount:  number;
  desktopCount: number;
  tabletCount:  number;

  // Subject
  subjectQs:       Record<string, number>;
  subjectAccuracy: Record<string, number>;

  // Charts
  last7Days:  DailyStat[];
  last30Days: DailyStat[];

  // Segments
  segments: SegmentSummary;

  // Top users
  topUsers: AdminUser[];

  // V3 additions
  retentionCurve:     RetentionCurve;
  movementStats:      MovementStats;
  contentPerformance: ContentPerformance[];
  questionDifficulty: QuestionDifficulty[];
  activityFeed:       ActivityEvent[];
}

export interface AdminDashboardData {
  users:        AdminUser[];
  visitors:     AdminVisitor[];
  sessions:     AnalyticsSession[];
  dailyStats:   DailyStat[];
  aiSolutions:  AISolution[];
  broadcasts:   Broadcast[];
  cohortRows:   CohortRow[];
  hourlyHeatmap:HourlyHeatmap;
  globalStats:  GlobalStats;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeJSON(raw?: string) {
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function tsToMs(ts: any): number {
  if (!ts) return 0;
  if (ts?.toDate)             return ts.toDate().getTime();
  if (typeof ts === 'string') return new Date(ts).getTime();
  if (typeof ts === 'number') return ts;
  return 0;
}

function daysBefore(n: number): number { return Date.now() - n * 86_400_000; }

// ── FIXED: growthPct — returns null when no baseline (Stripe/Plausible style)
// NEVER returns 100 when previous=0 — that was a lie
export function growthPct(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;   // no data at all
  if (previous === 0 && current > 0)  return null;    // new period — show "✨ New"
  if (previous > 0  && current === 0) return -100;    // everything dropped
  return Math.round(((current - previous) / previous) * 100);
}

// ── FIXED: Engagement Score — recalibrated so new users aren't punished
// Old: needed 50 Qs for full activity score → too harsh
// New: 20 Qs = full activity score, loyalty bonus for returning users
function calcEngagement(accuracy: number, totalQ: number, totalTests: number): number {
  const accuracyPts = Math.min(accuracy, 100) * 0.30;              // 0–30
  const activityPts = Math.min(totalQ / 20, 1) * 40;               // 0–40 (20 Qs = full)
  const loyaltyPts  = totalTests > 1 ? 30 : totalTests === 1 ? 15 : 0; // 0/15/30
  return Math.min(Math.round(accuracyPts + activityPts + loyaltyPts), 100);
}

function calcSegment(lastSeenMs: number, firstSeenMs: number): UserSegment {
  if (!lastSeenMs) return 'new';
  const daysSinceActive = (Date.now() - lastSeenMs) / 86_400_000;
  const daysSinceJoined = firstSeenMs ? (Date.now() - firstSeenMs) / 86_400_000 : 999;
  if (daysSinceJoined <= 7)  return 'new';
  if (daysSinceActive <= 7)  return 'active';
  if (daysSinceActive <= 30) return 'at_risk';
  return 'churned';
}

// ── V3: Retention Curve (Amplitude style) ────────────────────────────────────
// Day N retention = % of users whose firstSeen was >N days ago AND came back
function buildRetentionCurve(users: AdminUser[]): RetentionCurve {
  const now = Date.now();
  const D1  = 1  * 86_400_000;
  const D7  = 7  * 86_400_000;
  const D30 = 30 * 86_400_000;

  // Only users who joined >N days ago are eligible for that retention bucket
  const eligible1  = users.filter(u => (now - (tsToMs(u.firstSeen) || tsToMs(u.updatedAt))) >= D1);
  const eligible7  = users.filter(u => (now - (tsToMs(u.firstSeen) || tsToMs(u.updatedAt))) >= D7);
  const eligible30 = users.filter(u => (now - (tsToMs(u.firstSeen) || tsToMs(u.updatedAt))) >= D30);

  // Returned = their updatedAt is after (firstSeen + N days)
  const returned = (users: AdminUser[], minGap: number) =>
    users.filter(u => {
      const first = tsToMs(u.firstSeen) || tsToMs(u.updatedAt);
      const last  = tsToMs(u.updatedAt);
      return first > 0 && (last - first) >= minGap;
    }).length;

  const calc = (eligible: AdminUser[], minGap: number): number | null => {
    if (eligible.length < 3) return null; // not enough data
    return Math.round((returned(eligible, minGap) / eligible.length) * 100);
  };

  return {
    day1Pct:  calc(eligible1,  D1),
    day7Pct:  calc(eligible7,  D7),
    day30Pct: calc(eligible30, D30),
    day1Base: eligible1.length,
    day7Base: eligible7.length,
    day30Base: eligible30.length,
  };
}

// ── V3: Movement Stats (ChartMogul style) ────────────────────────────────────
function buildMovementStats(users: AdminUser[]): MovementStats {
  const now         = Date.now();
  const weekAgoMs   = now - 7  * 86_400_000;
  const twoWeekMs   = now - 14 * 86_400_000;
  const monthAgoMs  = now - 30 * 86_400_000;

  const newThisWeek = users.filter(u => {
    const first = tsToMs(u.firstSeen) || tsToMs(u.updatedAt);
    return first >= weekAgoMs;
  }).length;

  const newLastWeek = users.filter(u => {
    const first = tsToMs(u.firstSeen) || tsToMs(u.updatedAt);
    return first >= twoWeekMs && first < weekAgoMs;
  }).length;

  // Churned: last active was 8-37 days ago (dropped out this "window")
  const churnedThisWeek = users.filter(u => {
    const last = tsToMs(u.updatedAt);
    return last >= monthAgoMs && last < weekAgoMs;
  }).length;

  // Resurrected: was inactive >30 days, then active again this week
  const resurrected = users.filter(u => {
    const first = tsToMs(u.firstSeen) || 0;
    const last  = tsToMs(u.updatedAt);
    const age   = last - first;
    return last >= weekAgoMs && age >= 30 * 86_400_000 && first > 0;
  }).length;

  return {
    newThisWeek,
    churnedThisWeek,
    resurrected,
    netGrowth: newThisWeek - churnedThisWeek + resurrected,
    newLastWeek,
  };
}

// ── V3: Content Performance (PostHog style) ──────────────────────────────────
function buildContentPerformance(users: AdminUser[], aiSolutions: AISolution[]): ContentPerformance[] {
  const SUBJECTS = ['Mathematics', 'Reasoning', 'General Science', 'General Awareness'];
  return SUBJECTS.map(subject => {
    const withData   = users.filter(u => u.subjectAccuracy[subject] !== undefined);
    const avgAcc     = withData.length > 0
      ? Math.round(withData.reduce((s, u) => s + (u.subjectAccuracy[subject] ?? 0), 0) / withData.length)
      : 0;
    const attempts   = users.reduce((s, u) => {
      // Estimate attempts from test history where subject matches
      const subjectTests = u.testHistory.filter((t: any) => t.subject === subject);
      return s + subjectTests.reduce((a: number, t: any) => a + (t.total || 0), 0);
    }, 0);
    const aiRequests = aiSolutions.filter(s => s.subject === subject).length;

    let health: ContentPerformance['health'] = 'unknown';
    if (withData.length > 0) {
      if (avgAcc >= 70)      health = 'healthy';
      else if (avgAcc >= 50) health = 'struggling';
      else                   health = 'hard';
    }

    // Trend: if avg accuracy > 60 and has AI requests, it's being worked on
    const trend: ContentPerformance['trend'] =
      aiRequests > 5 && avgAcc < 60 ? 'down' :
      avgAcc >= 65 ? 'up' : 'stable';

    return { subject, attempts, avgAccuracy: avgAcc, aiRequests, health, trend };
  });
}

// ── V3: Question Difficulty (Edu-specific insight) ───────────────────────────
function buildQuestionDifficulty(aiSolutions: AISolution[]): QuestionDifficulty[] {
  const freq: Record<string, { count: number; subject: string; topic: string }> = {};
  aiSolutions.forEach(s => {
    if (!freq[s.questionId]) freq[s.questionId] = { count: 0, subject: s.subject, topic: s.topic };
    freq[s.questionId].count++;
  });
  const maxReq = Math.max(...Object.values(freq).map(f => f.count), 1);
  return Object.entries(freq)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 15)
    .map(([qId, data]) => ({
      questionId: qId,
      subject:    data.subject,
      topic:      data.topic,
      requests:   data.count,
      difficulty: Math.round((data.count / maxReq) * 100),
    }));
}

// ── V3: Activity Feed ─────────────────────────────────────────────────────────
function buildActivityFeed(
  users: AdminUser[], sessions: AnalyticsSession[],
  aiSolutions: AISolution[], visitors: AdminVisitor[]
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  // Recent test completions from user history
  users.forEach(u => {
    u.testHistory.slice(-3).forEach((t: any) => {
      if (!t.date) return;
      events.push({
        id:        `test_${u.docId}_${t.test_id}`,
        type:      'test',
        user:      u.name,
        detail:    `${t.type} · ${t.subject} · ${t.percentage ?? 0}%`,
        timestamp: t.date,
        icon:      '📝',
        color:     (t.percentage ?? 0) >= 70 ? '#10b981' : '#f59e0b',
      });
    });
  });

  // Recent AI requests
  aiSolutions.slice(0, 10).forEach(s => {
    events.push({
      id:        `ai_${s.docId}`,
      type:      'ai',
      user:      'Student',
      detail:    `AI help · Q#${s.questionId} · ${s.subject}`,
      timestamp: s.generatedAt,
      icon:      '🤖',
      color:     '#7c5cfc',
    });
  });

  // Recent visitors
  visitors.slice(0, 5).forEach(v => {
    events.push({
      id:        `visit_${v.docId}`,
      type:      'visit',
      user:      v.name || (v.isGuest ? 'Guest' : v.email),
      detail:    `${v.isGuest ? 'Guest' : 'Google'} · ${v.device}`,
      timestamp: typeof v.lastSeen === 'string' ? v.lastSeen : '',
      icon:      v.isGuest ? '👤' : '🔵',
      color:     v.isGuest ? '#64648a' : '#3b82f6',
    });
  });

  return events
    .filter(e => !!e.timestamp)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 25);
}

// ── Cohort Retention Heatmap ─────────────────────────────────────────────────
function buildCohorts(users: AdminUser[]): CohortRow[] {
  const cohortMap: Record<string, AdminUser[]> = {};
  users.forEach(u => {
    const ms = tsToMs(u.firstSeen) || tsToMs(u.updatedAt);
    if (!ms) return;
    const d    = new Date(ms);
    const day  = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const mon  = new Date(d);
    mon.setDate(d.getDate() + diff);
    const key = mon.toISOString().slice(0, 10);
    if (!cohortMap[key]) cohortMap[key] = [];
    cohortMap[key].push(u);
  });

  return Object.keys(cohortMap).sort().slice(-6).map(weekStart => {
    const cohort = cohortMap[weekStart];
    const label  = new Date(weekStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const sizes: number[] = [];
    const pcts:  number[] = [];
    for (let w = 0; w < 5; w++) {
      const weekMs = new Date(weekStart).getTime() + w * 7 * 86_400_000;
      if (w === 0) {
        sizes.push(cohort.length);
        pcts.push(100);
      } else {
        const cnt = cohort.filter(u => tsToMs(u.updatedAt) >= weekMs).length;
        sizes.push(cnt);
        pcts.push(cohort.length > 0 ? Math.round((cnt / cohort.length) * 100) : 0);
      }
    }
    return { cohortLabel: label, weekStart, sizes, pcts };
  });
}

// ── Hourly Heatmap ────────────────────────────────────────────────────────────
function buildHourlyHeatmap(sessions: AnalyticsSession[]): HourlyHeatmap {
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  sessions.forEach(s => {
    if (!s.firstSeenAt) return;
    const d = new Date(s.firstSeenAt);
    if (isNaN(d.getTime())) return;
    let dow = d.getDay();
    dow = dow === 0 ? 6 : dow - 1;
    grid[dow][d.getHours()] += (s.pageViews || 1);
  });
  return grid;
}

// ─── Main Loader ──────────────────────────────────────────────────────────────

export async function loadAdminData(): Promise<AdminDashboardData> {

  const [
    usersSnap, visitorsSnap, solutionsSnap, broadcastsSnap,
    analyticsSnap, dailySnap,
  ] = await Promise.all([
    getDocs(collection(db, 'users')).catch(() => null),
    getDocs(collection(db, 'visitors')).catch(() => null),
    getDocs(collection(db, 'math_solutions')).catch(() => null),
    getDocs(collection(db, 'broadcasts')).catch(() => null),
    getDocs(collection(db, 'analytics')).catch(() => null),
    getDocs(collection(db, 'analytics_daily')).catch(() => null),
  ]);

  // ── 1. Users ─────────────────────────────────────────────────────────────
  const users: AdminUser[] = [];
  const weekAgoMs = daysBefore(7);

  usersSnap?.forEach(d => {
    const raw     = d.data();
    const perf    = safeJSON(raw.performance);
    const overall = perf?.overall ?? {};

    const firstSeenMs = tsToMs(raw.firstSeen) || tsToMs(raw.updatedAt);
    const lastSeenMs  = tsToMs(raw.updatedAt);
    const accuracy    = Math.round(overall.overall_accuracy ?? 0);
    const totalQ      = overall.total_questions ?? 0;
    const totalTests  = overall.total_tests ?? 0;
    const engagementScore = calcEngagement(accuracy, totalQ, totalTests);
    const segment     = calcSegment(lastSeenMs, firstSeenMs);

    users.push({
      docId:           d.id,
      email:           raw.email  || d.id,
      name:            raw.name   || raw.email?.split('@')[0] || 'Student',
      avatar:          raw.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(raw.name || 'S')}&background=7c5cfc&color=fff&size=64`,
      firstSeen:       raw.firstSeen  ?? raw.updatedAt,
      updatedAt:       raw.updatedAt,
      totalTests,
      totalQuestions:  totalQ,
      totalCorrect:    overall.total_correct   ?? 0,
      accuracy,
      bestScore:       Math.round(overall.best_score_percentage ?? 0),
      lastScore:       Math.round(overall.last_score_percentage ?? 0),
      subjectAccuracy: overall.subject_accuracy ?? {},
      topicAccuracy:   overall.topic_accuracy   ?? {},
      testHistory:     (perf?.tests ?? []).slice(-10),
      isNew7Days:      lastSeenMs >= weekAgoMs,
      engagementScore,
      segment,
      avgQsPerSession: totalTests > 0 ? Math.round(totalQ / totalTests) : 0,
    });
  });
  users.sort((a, b) => b.totalQuestions - a.totalQuestions);

  // ── 2. Visitors ──────────────────────────────────────────────────────────
  const visitors: AdminVisitor[] = [];
  const googleEmailsInVisitors = new Set<string>();

  visitorsSnap?.forEach(d => {
    const v = d.data();
    visitors.push({
      docId:      d.id,
      email:      v.email     ?? d.id,
      name:       v.name      ?? 'Unknown',
      loginType:  v.loginType ?? 'guest',
      device:     v.device    ?? 'unknown',
      browser:    v.browser   ?? 'unknown',
      firstSeen:  v.firstSeen,
      lastSeen:   v.lastSeen,
      visitCount: v.visitCount ?? 1,
      isGuest:    v.isGuest   ?? true,
    });
    if (!v.isGuest && v.email) googleEmailsInVisitors.add(v.email);
  });

  // Backfill google users not in visitors
  users.forEach(u => {
    if (!googleEmailsInVisitors.has(u.email)) {
      visitors.push({
        docId:      `backfill_${u.docId}`,
        email:      u.email,
        name:       u.name,
        loginType:  'google',
        device:     'unknown',
        browser:    'unknown',
        firstSeen:  u.firstSeen,
        lastSeen:   u.updatedAt,
        visitCount: Math.max(u.totalTests, 1),
        isGuest:    false,
      });
    }
  });
  visitors.sort((a, b) => tsToMs(b.lastSeen) - tsToMs(a.lastSeen));

  // ── 3. Analytics Sessions ────────────────────────────────────────────────
  const sessions: AnalyticsSession[] = [];
  analyticsSnap?.forEach(d => {
    const s = d.data();
    sessions.push({
      sessionId:   d.id,
      loginType:   s.loginType  ?? 'anonymous',
      email:       s.email      ?? null,
      name:        s.name       ?? null,
      device:      s.device     ?? 'unknown',
      browser:     s.browser    ?? 'unknown',
      referrer:    s.referrer   ?? 'direct',
      firstSeenAt: s.firstSeenAt ?? '',
      lastSeenAt:  s.lastSeenAt  ?? '',
      pageViews:   s.pageViews   ?? 1,
      dateKey:     s.dateKey     ?? '',
    });
  });
  sessions.sort((a, b) => (b.lastSeenAt > a.lastSeenAt ? 1 : -1));

  // ── 4. Daily Stats ───────────────────────────────────────────────────────
  const dailyStats: DailyStat[] = [];
  dailySnap?.forEach(d => {
    const s = d.data();
    dailyStats.push({
      date:            d.id,
      totalHits:       s.totalHits       ?? 0,
      uniqueSessions:  s.uniqueSessions  ?? 0,
      googleSessions:  s.googleSessions  ?? 0,
      guestSessions:   s.guestSessions   ?? 0,
      anonSessions:    s.anonSessions    ?? 0,
      mobileSessions:  s.mobileSessions  ?? 0,
      desktopSessions: s.desktopSessions ?? 0,
      tabletSessions:  s.tabletSessions  ?? 0,
    });
  });
  dailyStats.sort((a, b) => b.date.localeCompare(a.date));

  // ── 5. AI Solutions ──────────────────────────────────────────────────────
  const aiSolutions: AISolution[] = [];
  solutionsSnap?.forEach(d => {
    const s = d.data();
    aiSolutions.push({
      docId:       d.id,
      questionId:  String(s.questionId ?? d.id),
      subject:     s.subject     ?? 'Unknown',
      topic:       s.topic       ?? 'Unknown',
      source:      s.source      ?? 'groq',
      generatedAt: s.generatedAt ?? '',
    });
  });
  aiSolutions.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

  // ── 6. Broadcasts ────────────────────────────────────────────────────────
  const broadcasts: Broadcast[] = [];
  broadcastsSnap?.forEach(d => {
    const b = d.data();
    broadcasts.push({ docId: d.id, message: b.message ?? '', sentBy: b.sentBy ?? '', sentAt: b.sentAt });
  });
  broadcasts.sort((a, b) => tsToMs(b.sentAt) - tsToMs(a.sentAt));

  // ── 7. Cohort Heatmap + Hourly Map ───────────────────────────────────────
  const cohortRows    = buildCohorts(users);
  const hourlyHeatmap = buildHourlyHeatmap(sessions);

  // ── 8. V3 Analytics ──────────────────────────────────────────────────────
  const retentionCurve     = buildRetentionCurve(users);
  const movementStats      = buildMovementStats(users);
  const contentPerformance = buildContentPerformance(users, aiSolutions);
  const questionDifficulty = buildQuestionDifficulty(aiSolutions);
  const activityFeed       = buildActivityFeed(users, sessions, aiSolutions, visitors);

  // ── 9. Global Stats ───────────────────────────────────────────────────────
  const todayKey     = new Date().toISOString().slice(0, 10);
  const yesterdayKey = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const todayMs      = new Date(todayKey).getTime();

  const allTimeGoogleUsers = users.length;
  const allTimeGuestUsers  = visitors.filter(v => v.isGuest).length;
  const allTimeTotalUsers  = allTimeGoogleUsers + allTimeGuestUsers;

  // Smart fallback: use analytics → visitors for session count
  const allTimeSessions = sessions.length > 0
    ? sessions.length
    : visitors.reduce((s, v) => s + v.visitCount, 0);

  const allTimePageHits = dailyStats.reduce((s, d) => s + d.totalHits, 0) ||
    sessions.reduce((s, sess) => s + sess.pageViews, 0);

  // Quality
  const totalQsSolved  = users.reduce((s, u) => s + u.totalQuestions, 0);
  const totalCorrect   = users.reduce((s, u) => s + u.totalCorrect, 0);
  const avgAccuracy    = users.length > 0
    ? Math.round(users.reduce((s, u) => s + u.accuracy, 0) / users.length) : 0;
  const avgEngagement  = users.length > 0
    ? Math.round(users.reduce((s, u) => s + u.engagementScore, 0) / users.length) : 0;

  // Engaged session rate (GA4 style): sessions where user did ≥1 question
  const usersWithActivity = users.filter(u => u.totalQuestions > 0).length;
  const engagedSessionPct  = allTimeTotalUsers > 0
    ? Math.round((usersWithActivity / allTimeTotalUsers) * 100) : 0;
  const avgQsPerSession = users.filter(u => u.totalTests > 0).length > 0
    ? Math.round(totalQsSolved / Math.max(users.filter(u => u.totalTests > 0).length, 1)) : 0;

  // Active counts — fallback visitors → sessions
  const past7Key = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const sessActiveToday     = sessions.filter(s => s.lastSeenAt >= todayKey).length;
  const sessActiveYesterday = sessions.filter(s => s.lastSeenAt >= yesterdayKey && s.lastSeenAt < todayKey).length;
  const sessActivePast7     = sessions.filter(s => s.lastSeenAt >= past7Key).length;
  const visActiveToday      = visitors.filter(v => tsToMs(v.lastSeen) >= todayMs).length;
  const visActivePast7      = visitors.filter(v => tsToMs(v.lastSeen) >= todayMs - 7 * 86_400_000).length;

  const activeToday     = sessActiveToday  || visActiveToday;
  const activeYesterday = sessActiveYesterday;
  const activePast7     = sessActivePast7  || visActivePast7;

  const newUsersToday    = users.filter(u => tsToMs(u.updatedAt) >= todayMs).length;
  const newUsersThisWeek = movementStats.newThisWeek;

  // Today traffic
  const todayRow            = dailyStats.find(d => d.date === todayKey);
  const todayHits           = todayRow?.totalHits      ?? sessions.filter(s => s.dateKey === todayKey).reduce((n, s) => n + s.pageViews, 0);
  const todaySessions       = todayRow?.uniqueSessions ?? sessions.filter(s => s.dateKey === todayKey).length;
  const todayGoogleSessions = todayRow?.googleSessions ?? sessions.filter(s => s.dateKey === todayKey && s.loginType === 'google').length;
  const todayGuestSessions  = todayRow?.guestSessions  ?? sessions.filter(s => s.dateKey === todayKey && s.loginType === 'guest').length;

  // Device split
  const mobileCount  = sessions.length > 0
    ? sessions.filter(s => s.device === 'mobile').length
    : visitors.filter(v => v.device === 'mobile').length;
  const desktopCount = sessions.length > 0
    ? sessions.filter(s => s.device === 'desktop').length
    : visitors.filter(v => v.device === 'desktop').length;
  const tabletCount  = sessions.filter(s => s.device === 'tablet').length;

  // WoW/MoM growth — FIXED: returns null not 100 when no previous data
  const thisWeekKey = new Date(Date.now() - 7  * 86_400_000).toISOString().slice(0, 10);
  const lastWeekKey = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const thisMonthKey= new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const lastMonthKey= new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);

  const thisWeekSessions  = dailyStats.filter(d => d.date >= thisWeekKey).reduce((s, d) => s + d.uniqueSessions, 0);
  const lastWeekSessions  = dailyStats.filter(d => d.date >= lastWeekKey && d.date < thisWeekKey).reduce((s, d) => s + d.uniqueSessions, 0);
  const thisMonthSessions = dailyStats.filter(d => d.date >= thisMonthKey).reduce((s, d) => s + d.uniqueSessions, 0);
  const lastMonthSessions = dailyStats.filter(d => d.date >= lastMonthKey && d.date < thisMonthKey).reduce((s, d) => s + d.uniqueSessions, 0);
  const lastWeekUsers     = movementStats.newLastWeek;

  const wowGrowth = growthPct(thisWeekSessions, lastWeekSessions);
  const momGrowth = growthPct(thisMonthSessions, lastMonthSessions);
  const wowUsers  = growthPct(newUsersThisWeek, lastWeekUsers);

  // Segments
  const segments: SegmentSummary = {
    active:  users.filter(u => u.segment === 'active').length,
    at_risk: users.filter(u => u.segment === 'at_risk').length,
    churned: users.filter(u => u.segment === 'churned').length,
    new:     users.filter(u => u.segment === 'new').length,
  };

  // Subject breakdown
  const SUBJECTS = ['Mathematics', 'Reasoning', 'General Science', 'General Awareness'];
  const subjectQs:  Record<string, number> = {};
  const subjectAcc: Record<string, number> = {};
  SUBJECTS.forEach(subj => {
    const withSubj = users.filter(u => u.subjectAccuracy[subj] !== undefined);
    subjectAcc[subj] = withSubj.length > 0
      ? Math.round(withSubj.reduce((s, u) => s + (u.subjectAccuracy[subj] ?? 0), 0) / withSubj.length) : 0;
    subjectQs[subj] = aiSolutions.filter(s => s.subject === subj).length;
  });

  const topUsers  = [...users].sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 5);
  const fiveMinAgo= new Date(Date.now() - 5 * 60_000).toISOString();
  const onlineNow = sessions.filter(s => s.lastSeenAt >= fiveMinAgo).length;

  const last7Days  = dailyStats.slice(0, 7).reverse();
  const last30Days = dailyStats.slice(0, 30).reverse();

  return {
    users, visitors, sessions, dailyStats, aiSolutions, broadcasts,
    cohortRows, hourlyHeatmap,
    globalStats: {
      allTimeGoogleUsers, allTimeGuestUsers, allTimeTotalUsers,
      allTimeSessions, allTimePageHits,
      totalQsSolved, totalCorrect, avgAccuracy,
      totalAISolutions: aiSolutions.length,
      avgEngagement, engagedSessionPct, avgQsPerSession,
      activeToday, activeYesterday, activePast7Days: activePast7,
      newUsersToday, newUsersThisWeek,
      todayHits, todaySessions, todayGoogleSessions, todayGuestSessions,
      wowGrowth, momGrowth, wowUsers, onlineNow,
      mobileCount, desktopCount, tabletCount,
      subjectQs, subjectAccuracy: subjectAcc,
      last7Days, last30Days,
      segments, topUsers,
      retentionCurve, movementStats, contentPerformance,
      questionDifficulty, activityFeed,
    },
  };
}

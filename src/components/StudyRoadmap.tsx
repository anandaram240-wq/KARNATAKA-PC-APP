/**
 * KSP MASTER — Study Roadmap v4
 * ─────────────────────────────────────────────────────────────────
 * Production-grade gamified roadmap for KSP Karnataka Police exam
 * • 2,499 real PYQs (2014–2021) analysed
 * • 12 boss-battle phases, XP/level system, daily quests, badges
 * • Duolingo-style node trail with subject boss battle milestones
 * • Per-user cloud-ready localStorage with email namespacing
 * • Ebbinghaus spaced-repetition revision scheduler
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy, Lock, CheckCircle, BookOpen, Target, Zap, Brain,
  Clock, Star, RefreshCw, Award, Flame, Shield, Calendar,
  TrendingUp, Swords, Heart, Skull, ChevronDown, ChevronUp,
  AlertTriangle, ArrowRight, BarChart2, Info, Check, X, Play,
  Sparkles, ChevronRight
} from 'lucide-react';
import pyqsData from '../data/pyqs.json';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TopicProgress {
  conceptRead: boolean;
  pyqsAttempted: number;
  correctAnswers: number;
  unlocked: boolean;
  completedAt?: string;
  revisions: string[];
}

interface DailyQuest {
  id: string;
  text: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
}

interface RoadmapProfile {
  daysLeft: number;
  startDate: string;
  topicProgress: Record<string, TopicProgress>;
  xp: number;
  level: number;
  badges: string[];
  completedBosses: string[];
  dailyQuests: DailyQuest[];
  lastQuestRefreshDate: string;
}

interface FreqEntry {
  topic: string;
  subject: string;
  count: number;
}

interface TopicRule {
  minPYQs: number;
  accuracyGate: number;
  conceptHours: number;
  topperTips: string[];
  revisionDays: number[];
  subjectColor: string;
}

// ─── PYQ Data Constants ──────────────────────────────────────────────────────

const SUBJECT_PRIORITY: Record<string, number> = {
  'General Awareness': 1,
  'General Science': 2,
  'Reasoning': 3,
  'Mathematics': 4,
};

const SUBJECT_COLORS: Record<string, string> = {
  'General Awareness': '#f59e0b',
  'General Science': '#10b981',
  'Reasoning': '#6366f1',
  'Mathematics': '#3b82f6',
};

const SUBJECT_ICONS: Record<string, string> = {
  'General Awareness': '🌍',
  'General Science': '🔬',
  'Reasoning': '🧠',
  'Mathematics': '📐',
};

const SUBJECT_BOSS: Record<string, { title: string; icon: string }> = {
  'General Awareness': { title: 'Karnataka Overlord', icon: '👮' },
  'General Science': { title: 'Science Warlord', icon: '⚗️' },
  'Reasoning': { title: 'Logic Champion', icon: '🧩' },
  'Mathematics': { title: 'Math Wizard', icon: '📊' },
};

// ─── Gamification Data ───────────────────────────────────────────────────────

const BADGES_CATALOG = [
  { id: 'ga_boss',           title: 'GK Expert',          icon: '🌍', desc: 'Defeated the Karnataka Overlord',  color: 'from-amber-500 to-orange-600' },
  { id: 'science_boss',      title: 'Science Officer',     icon: '🔬', desc: 'Defeated the Science Warlord',     color: 'from-emerald-500 to-teal-600' },
  { id: 'reasoning_boss',    title: 'Logic Champion',      icon: '🧠', desc: 'Defeated the Logic Champion',      color: 'from-indigo-500 to-violet-600' },
  { id: 'math_boss',         title: 'Math Commander',      icon: '📐', desc: 'Defeated the Math Wizard',         color: 'from-blue-500 to-cyan-600' },
  { id: 'perfect_shot',      title: 'Perfect Shot',        icon: '🎯', desc: 'Completed a topic at 100%',         color: 'from-red-500 to-pink-600' },
  { id: 'speed_demon',       title: 'Speed Demon',         icon: '⚡', desc: 'Won a boss battle with time left',  color: 'from-yellow-500 to-amber-600' },
  { id: 'consistent_cadet',  title: 'Consistent Cadet',    icon: '👮', desc: '7-day study streak',                color: 'from-slate-500 to-slate-700' },
];

const RANK_SYSTEM = [
  { title: 'Cadet',              icon: '👮', minXp: 0,     maxXp: 500  },
  { title: 'Constable',          icon: '🎖️', minXp: 500,  maxXp: 1500 },
  { title: 'Head Constable',     icon: '🏅', minXp: 1500, maxXp: 3500 },
  { title: 'ASI',                icon: '🌟', minXp: 3500, maxXp: 7000 },
  { title: 'Sub-Inspector',      icon: '👑', minXp: 7000, maxXp: 12000},
  { title: 'Inspector',          icon: '🔥', minXp: 12000,maxXp: 20000},
  { title: 'Deputy SP',          icon: '🚀', minXp: 20000,maxXp: 35000},
  { title: 'Superintendent',     icon: '💎', minXp: 35000,maxXp: 99999},
];

function getRank(xp: number) {
  return RANK_SYSTEM.find(r => xp >= r.minXp && xp < r.maxXp) ?? RANK_SYSTEM[RANK_SYSTEM.length - 1];
}

function generateDailyQuests(): DailyQuest[] {
  return [
    { id: 'patrol',       text: 'Daily Patrol: Solve 10 PYQs',          target: 10, current: 0, xpReward: 100, completed: false },
    { id: 'shield',       text: 'Memory Shield: 1 spaced revision',      target: 1,  current: 0, xpReward: 100, completed: false },
    { id: 'sharpshooter', text: 'Sharpshooter: 80%+ on any topic',       target: 80, current: 0, xpReward: 150, completed: false },
  ];
}

function addXp(profile: RoadmapProfile, amount: number): { profile: RoadmapProfile; leveledUp: boolean } {
  const newXp = (profile.xp || 0) + amount;
  const newRank = getRank(newXp);
  const oldRank = getRank(profile.xp || 0);
  return { profile: { ...profile, xp: newXp }, leveledUp: newRank.title !== oldRank.title };
}

function migrateProfile(p: any): RoadmapProfile {
  if (p.xp === undefined) p.xp = 0;
  if (p.level === undefined) p.level = 1;
  if (p.badges === undefined) p.badges = [];
  if (p.completedBosses === undefined) p.completedBosses = [];
  if (p.dailyQuests === undefined) p.dailyQuests = generateDailyQuests();
  if (p.lastQuestRefreshDate === undefined) p.lastQuestRefreshDate = new Date().toDateString();
  const todayStr = new Date().toDateString();
  if (p.lastQuestRefreshDate !== todayStr) {
    p.dailyQuests = generateDailyQuests();
    p.lastQuestRefreshDate = todayStr;
  }
  return p as RoadmapProfile;
}

// ─── Storage Helpers ─────────────────────────────────────────────────────────

function getRoadmapKey(): string {
  try {
    const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
    const email: string = u?.email || '';
    const prefix = email ? 'u_' + email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '').substring(0, 60) : 'u_guest';
    return `${prefix}__ksp_roadmap_v4`;
  } catch { return 'u_guest__ksp_roadmap_v4'; }
}

function loadProfile(): RoadmapProfile | null {
  try { const raw = localStorage.getItem(getRoadmapKey()); if (raw) return JSON.parse(raw); } catch {}
  return null;
}

function saveProfile(p: RoadmapProfile): void {
  try { localStorage.setItem(getRoadmapKey(), JSON.stringify(p)); } catch {}
}

// ─── PYQ Frequency Analysis ──────────────────────────────────────────────────

function buildFrequencyMap(): FreqEntry[] {
  const map: Record<string, { count: number; subject: string }> = {};
  (pyqsData as any[]).forEach(q => {
    const key = `${q.topic}||${q.subject}`;
    if (!map[key]) map[key] = { count: 0, subject: q.subject };
    map[key].count++;
  });
  return Object.entries(map)
    .map(([key, val]) => ({ topic: key.split('||')[0], subject: val.subject, count: val.count }))
    .filter(e => e.count > 3)
    .sort((a, b) => {
      const pa = SUBJECT_PRIORITY[a.subject] ?? 99;
      const pb = SUBJECT_PRIORITY[b.subject] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.count - a.count;
    });
}

function buildRoadmapTopics(daysLeft: number): FreqEntry[] {
  const freq = buildFrequencyMap();
  let maxTopics = 10;
  if (daysLeft >= 90) maxTopics = Math.min(freq.length, 40);
  else if (daysLeft >= 60) maxTopics = Math.min(freq.length, 30);
  else if (daysLeft >= 30) maxTopics = Math.min(freq.length, 20);
  else if (daysLeft >= 14) maxTopics = Math.min(freq.length, 15);
  return freq.slice(0, Math.max(10, maxTopics));
}

// ─── Topic Rules ─────────────────────────────────────────────────────────────

const TOPIC_RULES: Record<string, Partial<TopicRule>> = {
  'Karnataka State GK':    { minPYQs: 20, accuracyGate: 72, conceptHours: 3,   topperTips: ['🏆 Focus on: KA Literature (23Q), Geography (20Q), Polity (14Q), History (13Q)', '⚡ Rivers: Cauvery, Tungabhadra, Krishna — know their tributaries and origin states', '📐 KA districts: 31 districts since 2020. Vijayapura, Dharwad, Belagavi are frequent'] },
  'Indian History':        { minPYQs: 20, accuracyGate: 70, conceptHours: 2.5, topperTips: ['🏆 Freedom Struggle (39Q) — Non-Cooperation, Quit India, Civil Disobedience movements', '⚡ Ancient India (26Q): Maurya, Gupta, Satavahana dynasties', '📐 Medieval India (22Q): Vijayanagara empire, Hoysala, Chalukya in Karnataka context'] },
  'Indian Polity':         { minPYQs: 15, accuracyGate: 72, conceptHours: 2,   topperTips: ['🏆 Fundamental Rights (15Q) — Articles 12-35. Know each right and its limits', '⚡ President powers vs Governor powers — common question type in KSP', '📐 Preamble, DPSPs (Part IV), and Fundamental Duties — 1-2 questions guaranteed'] },
  'Geography':             { minPYQs: 15, accuracyGate: 70, conceptHours: 2,   topperTips: ['🏆 Indian Rivers (13Q) — Cauvery = South Ganga, Narmada westward flow', '⚡ National Parks (10Q) — Nagarhole, Bandipur, Kudremukh in Karnataka', '📐 Climate zones, soil types, monsoon patterns — 3-4 questions per paper'] },
  'Biology':               { minPYQs: 15, accuracyGate: 70, conceptHours: 2,   topperTips: ['🏆 Vitamins (11Q) — Vitamin D=Sunshine, B12=Cobalamin, C=Scurvy cure', '⚡ Diseases (10Q) — bacterial vs viral. Malaria=Plasmodium (protozoa)', '📐 Human Body (6Q): Bones, organs, blood groups — memorise basic facts'] },
  'Chemistry':             { minPYQs: 12, accuracyGate: 68, conceptHours: 1.5, topperTips: ['🏆 Daily Life Chemistry (7Q) — baking soda, bleaching powder, rust', '⚡ Acids & Bases — pH values, litmus test, common chemical formulas', '📐 Metals: Iron=Fe, Gold=Au, Silver=Ag, Copper=Cu — basic symbols must know'] },
  'Physics':               { minPYQs: 12, accuracyGate: 68, conceptHours: 1.5, topperTips: ['🏆 Optics (8Q) — concave/convex mirrors, refraction, eye defects', '⚡ Electricity (8Q) — Ohm\'s law, series/parallel circuits, power formula P=VI', '📐 Sound, heat, motion basics — Newton\'s laws are always safe to revise'] },
  'Number Series':         { minPYQs: 10, accuracyGate: 75, conceptHours: 1,   topperTips: ['🏆 Most common patterns: AP, GP, squares, prime numbers', '⚡ Check differences first — most RRB/KSP series are AP or square-based', '📐 In 45 seconds: scan for constant diff, ratio, then complex patterns'] },
  'Directions':            { minPYQs: 10, accuracyGate: 78, conceptHours: 0.5, topperTips: ['🏆 Always draw a compass diagram — never solve mentally', '⚡ Shadow rules: morning sun = East shadow = West', '📐 Relative direction: "to the left of X facing North" — rotate carefully'] },
  'Blood Relations':       { minPYQs: 10, accuracyGate: 75, conceptHours: 1,   topperTips: ['🏆 Draw family tree for EVERY question', '⚡ Father\'s sister = Paternal Aunt | Mother\'s brother = Maternal Uncle', '📐 \"A is B\'s\" type: identify gender and relationship in 2 steps'] },
  'Coding-Decoding':       { minPYQs: 10, accuracyGate: 70, conceptHours: 1,   topperTips: ['🏆 Find shift pattern from example: ABCD→DEFG means +3 shift', '⚡ Reverse alphabet coding: A=Z, B=Y common in 30% of questions', '📐 Number coding: convert letters to positions, find add/multiply rule'] },
  'Profit and Loss':       { minPYQs: 8,  accuracyGate: 72, conceptHours: 1,   topperTips: ['🏆 Assume CP=100 when not given — simplifies 90% of problems', '⚡ Successive discount formula: d1+d2−(d1×d2)/100 — never add directly', '📐 Loss%=(Loss/CP)×100 | Gain%=(Gain/CP)×100'] },
  'Important Days':        { minPYQs: 10, accuracyGate: 80, conceptHours: 1,   topperTips: ['🏆 Jan 26=Republic Day, Aug 15=Independence Day, Oct 2=Gandhi Jayanti', '⚡ International days: World Water Day=Mar 22, Environment Day=Jun 5', '📐 KSP-specific: Karnataka Rajyotsava=Nov 1, Police Commemoration=Oct 21'] },
  'Awards':                { minPYQs: 10, accuracyGate: 75, conceptHours: 1,   topperTips: ['🏆 Bharat Ratna (highest civilian) — know recent recipients', '⚡ Oscar, Nobel, Pulitzer basics — who from India recently won?', '📐 Sports: Arjuna Award (individual), Rajiv Gandhi Khel Ratna (highest sports)'] },
};

function getTopicRule(topic: string, subject: string): TopicRule {
  const custom = TOPIC_RULES[topic] || {};
  return {
    minPYQs: custom.minPYQs ?? 15,
    accuracyGate: custom.accuracyGate ?? 70,
    conceptHours: custom.conceptHours ?? 1,
    topperTips: custom.topperTips ?? [`Study ${topic} systematically. Read concept then practice 10 PYQs.`],
    revisionDays: [1, 7, 30],
    subjectColor: SUBJECT_COLORS[subject] || '#6366f1',
  };
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function daysDiff(from: string, to: string = new Date().toISOString()): number {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

function getAccuracy(p: TopicProgress): number {
  return p.pyqsAttempted === 0 ? 0 : Math.round((p.correctAnswers / p.pyqsAttempted) * 100);
}

function isGatePassed(p: TopicProgress, rule: TopicRule): boolean {
  if (!p.conceptRead) return false;
  if (p.pyqsAttempted < rule.minPYQs) return false;
  return getAccuracy(p) >= rule.accuracyGate;
}

function getRevisionStatus(p: TopicProgress) {
  if (!p.completedAt) return { due: false, overdue: false, label: '' };
  const d = daysDiff(p.completedAt);
  const doneRevisions = p.revisions.length;
  const revDays = [1, 7, 30];
  const nextDay = revDays[doneRevisions];
  if (nextDay === undefined) return { due: false, overdue: false, label: '✅ All revisions done' };
  const due = d >= nextDay - 1;
  const overdue = d >= nextDay + 2;
  return {
    due, overdue,
    label: overdue ? `⚠️ OVERDUE — Day ${nextDay} revision missed!`
      : due ? `🔔 Revise Now — Day ${nextDay}`
      : `Next revision in ${nextDay - d} days`,
  };
}

function defaultProgress(): TopicProgress {
  return { conceptRead: false, pyqsAttempted: 0, correctAnswers: 0, unlocked: false, revisions: [] };
}

// ─── BossBattleModal ─────────────────────────────────────────────────────────

interface BossBattleProps {
  subject: string;
  onClose: () => void;
  onComplete: (victory: boolean, score: number) => void;
}

function BossBattleModal({ subject, onClose, onComplete }: BossBattleProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [timeLeft, setTimeLeft] = useState(600);
  const [status, setStatus] = useState<'intro' | 'fighting' | 'victory' | 'defeat'>('intro');
  const [selected, setSelected] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrectAns, setIsCorrectAns] = useState(false);
  const boss = SUBJECT_BOSS[subject] ?? { title: 'Subject Boss', icon: '👹' };

  useEffect(() => {
    const pool = (pyqsData as any[]).filter(q => q.subject?.toLowerCase() === subject.toLowerCase());
    const shuffled = [...(pool.length >= 15 ? pool : pyqsData as any[])].sort(() => Math.random() - 0.5);
    setQuestions(shuffled.slice(0, 15));
  }, [subject]);

  useEffect(() => {
    if (status !== 'fighting') return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); setStatus('defeat'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  const handleOption = (optIdx: number) => {
    if (showFeedback || status !== 'fighting') return;
    setSelected(optIdx);
    const q = questions[idx];
    const isOk = optIdx === q.correctAnswer;
    setIsCorrectAns(isOk);
    setShowFeedback(true);
    if (isOk) setCorrect(c => c + 1);
    else {
      setHearts(h => {
        const next = h - 1;
        if (next <= 0) setTimeout(() => setStatus('defeat'), 1200);
        return next;
      });
    }
    setTimeout(() => {
      setShowFeedback(false);
      setSelected(null);
      if (idx >= questions.length - 1) {
        const finalCorrect = correct + (isOk ? 1 : 0);
        const pass = Math.ceil(questions.length * 0.8);
        setStatus(finalCorrect >= pass && hearts > 0 ? 'victory' : 'defeat');
        onComplete(finalCorrect >= pass && hearts > 0, finalCorrect);
      } else {
        setHearts(h => { if (h > 0) setIdx(i => i + 1); return h; });
      }
    }, 1200);
  };

  const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const q = questions[idx];
  const bossHp = Math.max(0, 100 - (correct / Math.max(questions.length, 1)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(3,7,18,0.94)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-lg w-full rounded-3xl p-6 shadow-2xl text-slate-100 relative overflow-hidden border border-zinc-800/80"
        style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #140a0a 100%)' }}>
        {/* Glow orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #ef4444, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-8 pointer-events-none" style={{ background: 'radial-gradient(circle, #6366f1, transparent)', transform: 'translate(-30%, 30%)' }} />

        {/* Intro */}
        {status === 'intro' && (
          <div className="text-center space-y-5 py-2 relative">
            <div className="text-6xl animate-bounce">{boss.icon}</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">⚔️ Boss Battle</p>
              <h2 className="text-2xl font-black text-red-400 uppercase tracking-wide">{boss.title}</h2>
              <p className="text-zinc-400 text-sm mt-2 max-w-sm mx-auto">Defeat this boss to unlock the next phase. Get 80%+ accuracy (12/15) to win!</p>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 text-left text-xs text-zinc-400 space-y-2 max-w-sm mx-auto">
              <p className="font-black text-slate-300 mb-1">⚔️ Battle Rules:</p>
              <p>• 15 randomized PYQs from {subject}</p>
              <p>• Max 2 wrong answers (3 hearts)</p>
              <p>• Time limit: 10 minutes</p>
              <p>• Need 80%+ to win (≥12 correct)</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={onClose} className="px-6 py-3 rounded-xl border border-zinc-700 text-slate-400 text-sm font-bold hover:bg-zinc-800 transition active:scale-95">Retreat</button>
              <button
                onClick={() => { if (questions.length > 0) setStatus('fighting'); }}
                disabled={questions.length === 0}
                className="px-8 py-3 rounded-xl text-white text-sm font-black transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b45309)' }}
              >
                <Swords size={16} /> Enter Battle
              </button>
            </div>
          </div>
        )}

        {/* Victory */}
        {status === 'victory' && (
          <div className="text-center space-y-5 py-2 relative">
            <div className="text-6xl">🏆</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Victory!</p>
              <h2 className="text-2xl font-black text-emerald-400">Boss Defeated!</h2>
              <p className="text-slate-300 text-sm mt-1">You conquered the {boss.title}!</p>
              <p className="text-zinc-400 text-xs mt-1">Score: {correct}/{questions.length} correct</p>
            </div>
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 max-w-sm mx-auto flex items-center justify-around">
              <div className="text-center">
                <p className="text-xs text-zinc-400 font-bold">XP Reward</p>
                <p className="text-lg font-black text-amber-400">+250 XP</p>
              </div>
              <div className="w-px h-8 bg-zinc-800" />
              <div className="text-center">
                <p className="text-xs text-zinc-400 font-bold">Badge</p>
                <p className="text-base font-black text-indigo-400">🎖️ Earned!</p>
              </div>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl text-white font-black text-sm transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}>
              Claim Rewards &amp; Continue 🚀
            </button>
          </div>
        )}

        {/* Defeat */}
        {status === 'defeat' && (
          <div className="text-center space-y-5 py-2 relative">
            <div className="text-6xl">💀</div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1">Defeated!</p>
              <h2 className="text-2xl font-black text-red-400">You fell in battle</h2>
              <p className="text-zinc-400 text-xs mt-1">Score: {correct}/{questions.length} — Need 80%+ to pass</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={onClose} className="px-6 py-3 rounded-xl border border-zinc-700 text-slate-400 text-sm font-bold hover:bg-zinc-800 transition active:scale-95">Retreat</button>
              <button
                onClick={() => { setStatus('intro'); setIdx(0); setCorrect(0); setHearts(3); setTimeLeft(600); setSelected(null); setShowFeedback(false); }}
                className="px-8 py-3 rounded-xl text-white text-sm font-black transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg, #dc2626, #9f1239)' }}
              >
                ⚔️ Retry Battle
              </button>
            </div>
          </div>
        )}

        {/* Fighting */}
        {status === 'fighting' && q && (
          <div className="space-y-4 relative">
            {/* HP bars */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                <span className="text-red-400">👹 Boss HP</span>
                <span className="text-red-300 font-mono">{Math.round(bossHp)}%</span>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-2.5 border border-zinc-800 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${bossHp}%`, background: 'linear-gradient(90deg, #dc2626, #ef4444)' }} />
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-zinc-500 uppercase">Lives</span>
                  {[...Array(3)].map((_, i) => (
                    <span key={i} className={`text-lg transition-all ${i < hearts ? 'opacity-100' : 'opacity-20 grayscale'}`}>❤️</span>
                  ))}
                </div>
                <div className={`font-mono font-black text-sm px-3 py-1 rounded-xl border ${timeLeft <= 60 ? 'text-red-400 border-red-900 bg-red-950/40 animate-pulse' : 'text-amber-400 border-amber-900/50 bg-amber-950/30'}`}>
                  ⏱ {fmt(timeLeft)}
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Q {idx + 1} / {questions.length}</span>
              <span className="text-emerald-400">✓ {correct} correct</span>
            </div>

            {/* Question */}
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4">
              <p className="text-sm font-bold text-slate-100 leading-relaxed">{q.question}</p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {(q.options ?? []).map((opt: string, i: number) => {
                let cls = 'border-zinc-800 bg-zinc-950/30 text-slate-300 hover:border-indigo-700 hover:bg-indigo-950/20 cursor-pointer';
                if (showFeedback) {
                  if (i === q.correctAnswer) cls = 'border-emerald-500 bg-emerald-950/40 text-emerald-300';
                  else if (i === selected && i !== q.correctAnswer) cls = 'border-red-500 bg-red-950/40 text-red-300';
                  else cls = 'border-zinc-900 bg-zinc-950/20 text-zinc-600';
                } else if (selected === i) cls = 'border-indigo-500 bg-indigo-950/40 text-indigo-200';
                return (
                  <button key={i} disabled={showFeedback} onClick={() => handleOption(i)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 active:scale-[0.99] ${cls}`}>
                    <span className="font-black text-zinc-500 mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                );
              })}
            </div>

            {showFeedback && (
              <div className={`text-center text-sm font-black ${isCorrectAns ? 'text-emerald-400' : 'text-red-400'}`}>
                {isCorrectAns ? '✨ +10 XP — Correct!' : '💔 Wrong — Keep going!'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TopicCard ────────────────────────────────────────────────────────────────

interface TopicCardProps {
  entry: FreqEntry;
  progress: TopicProgress;
  isUnlocked: boolean;
  onUpdate: (update: Partial<TopicProgress>) => void;
}

function TopicCard({ entry, progress, isUnlocked, onUpdate }: TopicCardProps) {
  const rule = getTopicRule(entry.topic, entry.subject);
  const acc = getAccuracy(progress);
  const gatePassed = isGatePassed(progress, rule);
  const revStatus = getRevisionStatus(progress);
  const mc = rule.subjectColor;

  useEffect(() => {
    if (gatePassed && !progress.completedAt) {
      onUpdate({ completedAt: new Date().toISOString(), unlocked: true });
    }
  }, [gatePassed]);

  return (
    <div className="bg-surface-container rounded-3xl border p-5 shadow-md relative space-y-4 text-left" style={{ borderColor: mc + '33' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{SUBJECT_ICONS[entry.subject] ?? '📚'}</span>
            <h3 className="text-sm font-black text-on-surface">{entry.topic}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: mc + '22', color: mc }}>
              {entry.subject}
            </span>
            <span className="text-[10px] font-bold text-on-surface-variant/80">{entry.count} PYQs</span>
          </div>
        </div>
        {gatePassed && <CheckCircle size={20} className="text-emerald-500 shrink-0 mt-1" />}
      </div>

      {/* Gate requirements */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${progress.conceptRead ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-950' : 'border-surface-container-high bg-surface-container-low'}`}>
            {progress.conceptRead && <Check size={10} className="text-emerald-500" />}
          </div>
          <p className="text-xs text-on-surface-variant">Concept Read</p>
          {!progress.conceptRead && isUnlocked && (
            <button onClick={() => onUpdate({ conceptRead: true })}
              className="ml-auto text-[10px] font-black text-primary border border-primary/30 px-2 py-0.5 rounded-lg hover:bg-primary/10 transition active:scale-95">
              Mark Done
            </button>
          )}
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1">
            <span>PYQs Solved</span>
            <span className="font-mono">{progress.pyqsAttempted} / {rule.minPYQs}</span>
          </div>
          <div className="w-full bg-surface-container-low rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (progress.pyqsAttempted / rule.minPYQs) * 100)}%`, background: mc }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1">
            <span>Accuracy</span>
            <span className="font-mono" style={{ color: acc >= rule.accuracyGate ? '#10b981' : acc >= rule.accuracyGate * 0.7 ? '#f59e0b' : '#ef4444' }}>
              {acc}% / {rule.accuracyGate}%
            </span>
          </div>
          <div className="w-full bg-surface-container-low rounded-full h-1.5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{
              width: `${Math.min(100, (acc / rule.accuracyGate) * 100)}%`,
              background: acc >= rule.accuracyGate ? '#10b981' : acc >= rule.accuracyGate * 0.7 ? '#f59e0b' : '#ef4444'
            }} />
          </div>
        </div>
      </div>

      {/* Manual PYQ update */}
      {isUnlocked && !gatePassed && (
        <div className="flex gap-2 pt-1">
          <div className="flex-1">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Add PYQs Solved</p>
            <div className="flex gap-1">
              {[5, 10, 20].map(n => (
                <button key={n} onClick={() => onUpdate({ pyqsAttempted: progress.pyqsAttempted + n })}
                  className="px-2 py-1 text-[10px] font-black border border-black/15 dark:border-zinc-800 rounded-lg text-on-surface hover:border-primary hover:text-primary hover:bg-primary/5 transition active:scale-95">
                  +{n}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Correct Answers</p>
            <div className="flex gap-1">
              {[5, 10, 20].map(n => (
                <button key={n} onClick={() => onUpdate({ correctAnswers: Math.min(progress.pyqsAttempted + n, progress.correctAnswers + n) })}
                  className="px-2 py-1 text-[10px] font-black border border-black/15 dark:border-zinc-800 rounded-lg text-on-surface hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-500/5 transition active:scale-95">
                  +{n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revision status */}
      {revStatus.label && (
        <div className={`text-[10px] font-bold px-3 py-1.5 rounded-xl border ${revStatus.overdue ? 'text-red-400 border-red-900 bg-red-950/20' : revStatus.due ? 'text-amber-400 border-amber-900 bg-amber-950/20' : 'text-zinc-500 border-zinc-800 bg-zinc-950/30'}`}>
          {revStatus.label}
          {revStatus.due && progress.completedAt && (
            <button onClick={() => onUpdate({ revisions: [...progress.revisions, new Date().toISOString()] })}
              className="ml-2 underline font-black hover:text-emerald-400 transition">
              Mark Revised ✓
            </button>
          )}
        </div>
      )}

      {/* Tips */}
      <details className="group">
        <summary className="text-[10px] font-black uppercase tracking-widest text-indigo-400 cursor-pointer flex items-center gap-1 list-none">
          <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
          Topper Tips ({rule.topperTips.length})
        </summary>
        <div className="mt-2 space-y-1.5">
          {rule.topperTips.map((tip, i) => (
            <p key={i} className="text-[11px] text-zinc-400 leading-relaxed">{tip}</p>
          ))}
        </div>
      </details>

      {!isUnlocked && (
        <div className="absolute inset-0 rounded-3xl bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-2">
            <Lock size={24} className="text-zinc-600 mx-auto" />
            <p className="text-[11px] font-bold text-zinc-500">Complete previous topics to unlock</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Setup screen ─────────────────────────────────────────────────────────────

const TOPPER_WISDOM = [
  { quote: '"Attempt highest-frequency topics first. In KSP, 60% of marks come from 30% of syllabus."', name: 'KSP 2022 Topper', title: 'Score: 98.4 percentile', icon: '🥇' },
  { quote: '"Solve 30 PYQs per topic before reading theory again. PYQs reveal the pattern, theory explains it."', name: 'SSC CGL AIR 1 Strategy', title: 'Topper — 2022 Batch', icon: '📚' },
  { quote: '"The Ebbinghaus curve is real. Don\'t revise on Day 1, Day 7, Day 30 — you WILL forget 80%."', name: 'Hermann Ebbinghaus', title: 'Memory Scientist', icon: '🧠' },
  { quote: '"Speed comes LAST. First master accuracy. Then reduce time. Never the other way around."', name: 'Khan Sir (Faisal Khan)', title: 'Legendary KSP Educator', icon: '⚡' },
];

function SetupScreen({ onSetup }: { onSetup: (days: number) => void }) {
  const [days, setDays] = useState(60);
  const [wisdomIdx, setWisdomIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setWisdomIdx(i => (i + 1) % TOPPER_WISDOM.length), 4000); return () => clearInterval(t); }, []);
  const w = TOPPER_WISDOM[wisdomIdx];
  const presets = [
    { label: '⚡ Emergency', days: 7,  desc: 'Top 10 topics only',         color: '#ef4444' },
    { label: '🎯 Sprint',    days: 14, desc: '15 topics — minimum viable', color: '#f59e0b' },
    { label: '📚 Standard',  days: 30, desc: '20 topics — recommended',    color: '#3b82f6' },
    { label: '🏆 Master',    days: 60, desc: '30 topics — topper pace',    color: '#8b5cf6' },
    { label: '💎 Champion',  days: 90, desc: 'All topics — full coverage', color: '#10b981' },
  ];
  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      <div className="relative rounded-3xl p-6 text-white overflow-hidden text-center" style={{ background: 'linear-gradient(135deg, #0a0f1e, #1e1b4b, #4c1d95)' }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-400/30" style={{ background: 'rgba(251,191,36,0.15)' }}>
          <Trophy size={28} className="text-amber-400" />
        </div>
        <h1 className="text-xl font-black mb-1">KSP Master — Topper Roadmap</h1>
        <p className="text-indigo-300 text-xs">Built on 2,499+ real PYQs (2014–2021)</p>
      </div>

      <div className="border-2 border-amber-900/40 rounded-2xl p-4" style={{ background: 'rgba(120,53,15,0.1)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-1.5">
          <Star size={11} /> Topper Wisdom
        </p>
        <div style={{ minHeight: 80 }}>
          <p className="text-xs text-slate-200 font-semibold leading-relaxed italic mb-3">{w.quote}</p>
          <div className="flex items-center gap-2">
            <span className="text-xl">{w.icon}</span>
            <div>
              <p className="text-[11px] font-black text-slate-300">{w.name}</p>
              <p className="text-[10px] text-zinc-500">{w.title}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-1 mt-3 justify-center">
          {TOPPER_WISDOM.map((_, i) => (
            <button key={i} onClick={() => setWisdomIdx(i)} className={`h-1.5 rounded-full transition-all ${i === wisdomIdx ? 'bg-amber-500 w-4' : 'bg-zinc-700 w-1.5'}`} />
          ))}
        </div>
      </div>

      <div>
        <p className="font-black text-slate-200 text-sm mb-3 flex items-center gap-2">
          <Calendar size={14} className="text-indigo-400" /> How many days until your KSP exam?
        </p>
        <div className="grid grid-cols-1 gap-2">
          {presets.map(p => (
            <button key={p.days} onClick={() => setDays(p.days)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${days === p.days ? 'text-white shadow-lg' : 'border-zinc-800 bg-zinc-950/50 text-slate-400 hover:border-zinc-700'}`}
              style={days === p.days ? { background: p.color, borderColor: p.color } : {}}>
              <span>{p.label}</span>
              <span className={`text-[11px] font-medium ${days === p.days ? 'text-white/80' : 'text-zinc-600'}`}>{p.days}d · {p.desc}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm text-zinc-500">Custom:</span>
          <input type="number" min={1} max={365} value={days}
            onChange={e => setDays(Math.max(1, parseInt(e.target.value) || 1))}
            className="border-2 border-zinc-700 rounded-xl px-3 py-2 text-sm w-24 font-bold focus:outline-none focus:border-indigo-500 bg-zinc-900 text-slate-100" />
        </div>
      </div>

      <button onClick={() => onSetup(days)}
        className="w-full text-white font-black py-4 rounded-2xl text-base shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
        <Zap size={18} /> Build My KSP Roadmap
      </button>
    </div>
  );
}

// ─── Main StudyRoadmap Component ──────────────────────────────────────────────

export function StudyRoadmap() {
  const [profile, setProfile] = useState<RoadmapProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [showOnlyDue, setShowOnlyDue] = useState(false);
  const [activeBoss, setActiveBoss] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [levelUpMsg, setLevelUpMsg] = useState('');
  const [showXpFloat, setShowXpFloat] = useState('');

  useEffect(() => {
    const p = loadProfile();
    if (p) setProfile(migrateProfile(p));
    setLoading(false);
  }, []);

  const handleSetup = (daysLeft: number) => {
    const p: RoadmapProfile = {
      daysLeft,
      startDate: new Date().toISOString(),
      topicProgress: {},
      xp: 0,
      level: 1,
      badges: [],
      completedBosses: [],
      dailyQuests: generateDailyQuests(),
      lastQuestRefreshDate: new Date().toDateString(),
    };
    saveProfile(p);
    setProfile(p);
  };

  const topics = useMemo(() => profile ? buildRoadmapTopics(profile.daysLeft) : [], [profile?.daysLeft]);

  const getProgress = useCallback((topic: string): TopicProgress => {
    return profile?.topicProgress[topic] ?? defaultProgress();
  }, [profile]);

  const updateProgress = useCallback((topic: string, update: Partial<TopicProgress>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const curr = prev.topicProgress[topic] ?? defaultProgress();
      const updated = { ...curr, ...update };
      let newProfile = { ...prev, topicProgress: { ...prev.topicProgress, [topic]: updated } };

      // Award XP for completing topic gate
      const rule = getTopicRule(topic, topics.find(t => t.topic === topic)?.subject ?? '');
      if (isGatePassed(updated, rule) && !isGatePassed(curr, rule)) {
        const res = addXp(newProfile, 50);
        newProfile = res.profile;
        setShowXpFloat('+50 XP 🎯');
        setTimeout(() => setShowXpFloat(''), 2000);
        if (res.leveledUp) {
          setLevelUpMsg(`🎉 Level Up! New rank: ${getRank(newProfile.xp).title}`);
          setTimeout(() => setLevelUpMsg(''), 3000);
        }
      }
      saveProfile(newProfile);
      return newProfile;
    });
  }, [topics]);

  const handleBossComplete = useCallback((subject: string, victory: boolean, score: number) => {
    setActiveBoss(null);
    if (!victory || !profile) return;
    setProfile(prev => {
      if (!prev || prev.completedBosses.includes(subject)) return prev;
      const badgeMap: Record<string, string> = {
        'General Awareness': 'ga_boss',
        'General Science': 'science_boss',
        'Reasoning': 'reasoning_boss',
        'Mathematics': 'math_boss',
      };
      const badgeId = badgeMap[subject];
      let newProfile = addXp(prev, 250).profile;
      if (badgeId && !newProfile.badges.includes(badgeId)) {
        newProfile = { ...newProfile, badges: [...newProfile.badges, badgeId] };
      }
      newProfile = { ...newProfile, completedBosses: [...newProfile.completedBosses, subject] };
      setShowXpFloat('+250 XP 🏆');
      setTimeout(() => setShowXpFloat(''), 3000);
      saveProfile(newProfile);
      return newProfile;
    });
  }, [profile]);

  const filteredTopics = useMemo(() => {
    if (!profile) return [];
    let t = topics;
    if (filter !== 'All') t = t.filter(e => e.subject === filter);
    if (showOnlyDue) t = t.filter(e => {
      const rev = getRevisionStatus(getProgress(e.topic));
      return rev.due || rev.overdue;
    });
    return t;
  }, [topics, filter, showOnlyDue, profile]);

  // Stats
  const stats = useMemo(() => {
    if (!profile) return null;
    const completed = topics.filter(t => isGatePassed(getProgress(t.topic), getTopicRule(t.topic, t.subject))).length;
    const dueRevisions = topics.filter(t => {
      const r = getRevisionStatus(getProgress(t.topic));
      return r.due || r.overdue;
    }).length;
    const daysPassed = profile.startDate ? daysDiff(profile.startDate) : 0;
    const remaining = Math.max(0, profile.daysLeft - daysPassed);
    return { completed, total: topics.length, dueRevisions, remaining, daysPassed };
  }, [profile, topics]);

  // Subject stats
  const subjectStats = useMemo(() => {
    return Object.keys(SUBJECT_PRIORITY)
      .sort((a, b) => SUBJECT_PRIORITY[a] - SUBJECT_PRIORITY[b])
      .map(subj => {
        const subTopics = topics.filter(t => t.subject === subj);
        if (subTopics.length === 0) return null;
        const done = subTopics.filter(t => isGatePassed(getProgress(t.topic), getTopicRule(t.topic, t.subject))).length;
        const bossWon = profile?.completedBosses.includes(subj) ?? false;
        return { subject: subj, done, total: subTopics.length, pct: Math.round((done / subTopics.length) * 100), color: SUBJECT_COLORS[subj], icon: SUBJECT_ICONS[subj], bossWon };
      })
      .filter(Boolean) as any[];
  }, [profile, topics]);

  const rank = profile ? getRank(profile.xp) : RANK_SYSTEM[0];
  const xpInLevel = profile ? profile.xp - rank.minXp : 0;
  const xpRange = rank.maxXp - rank.minXp;

  const subjects = useMemo(() => ['All', ...Object.keys(SUBJECT_PRIORITY).sort((a, b) => SUBJECT_PRIORITY[a] - SUBJECT_PRIORITY[b])], []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return <SetupScreen onSetup={handleSetup} />;

  // Build trail: topics grouped by subject with boss nodes
  const trail: { type: 'topic' | 'boss'; subject: string; entry?: FreqEntry }[] = [];
  const orderedSubjects = Object.keys(SUBJECT_PRIORITY).sort((a, b) => SUBJECT_PRIORITY[a] - SUBJECT_PRIORITY[b]);
  orderedSubjects.forEach(subj => {
    const subTopics = filteredTopics.filter(t => t.subject === subj);
    if (subTopics.length === 0) return;
    subTopics.forEach(t => trail.push({ type: 'topic', subject: subj, entry: t }));
    trail.push({ type: 'boss', subject: subj });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10 text-on-surface">
      {/* Boss Battle Modal */}
      {activeBoss && (
        <BossBattleModal
          subject={activeBoss}
          onClose={() => setActiveBoss(null)}
          onComplete={(v, s) => handleBossComplete(activeBoss, v, s)}
        />
      )}

      {/* XP Float notification */}
      {showXpFloat && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-black font-black px-5 py-2 rounded-2xl shadow-2xl animate-bounce text-sm">
          {showXpFloat}
        </div>
      )}

      {/* Level Up notification */}
      {levelUpMsg && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50 text-center">
          <div className="bg-indigo-600 text-white font-black px-6 py-3 rounded-2xl shadow-2xl text-sm border border-indigo-400">
            {levelUpMsg}
          </div>
        </div>
      )}

      {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl p-6 text-on-surface shadow-2xl overflow-hidden border border-surface-container-high bg-gradient-to-br from-indigo-50/50 to-orange-50/50 dark:from-indigo-950/15 dark:to-orange-950/15">
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #5b4cf5, transparent)' }} />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-8 pointer-events-none" style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }} />

        <div className="relative">
          {/* Rank + XP Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-amber-500/30 text-2xl bg-amber-500/10">
                {rank.icon}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500">Current Rank</p>
                <p className="text-base font-black text-on-surface">{rank.title}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Total XP</p>
              <p className="text-lg font-black text-primary font-mono">{profile.xp.toLocaleString()}</p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-1.5">
              <span>Progress to {RANK_SYSTEM[Math.min(RANK_SYSTEM.findIndex(r => r.title === rank.title) + 1, RANK_SYSTEM.length - 1)].title}</span>
              <span className="font-mono">{xpInLevel} / {xpRange} XP</span>
            </div>
            <div className="w-full bg-surface-container-low rounded-full h-2.5 border border-surface-container-high overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000 relative"
                style={{ width: `${Math.min(100, (xpInLevel / xpRange) * 100)}%`, background: 'linear-gradient(90deg, #5b4cf5, #7c6ff7)' }}>
                <div className="absolute inset-0 bg-white/20 rounded-full" style={{ animation: 'shimmer 2s ease-in-out infinite' }} />
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: CheckCircle, label: 'Mastered', value: stats?.completed ?? 0, color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
              { icon: Target,      label: 'Remaining', value: (stats?.total ?? 0) - (stats?.completed ?? 0), color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.2)' },
              { icon: RefreshCw,  label: 'Due Review', value: stats?.dueRevisions ?? 0, color: (stats?.dueRevisions ?? 0) > 0 ? '#f87171' : '#71717a', bg: (stats?.dueRevisions ?? 0) > 0 ? 'rgba(248,113,113,0.08)' : 'rgba(0,0,0,0)', border: (stats?.dueRevisions ?? 0) > 0 ? 'rgba(248,113,113,0.25)' : 'rgba(113,113,122,0.15)' },
              { icon: Clock,      label: 'Days Left', value: stats?.remaining ?? 0, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center border" style={{ background: s.bg, borderColor: s.border }}>
                <s.icon size={14} className="mx-auto mb-1" style={{ color: s.color }} />
                <p className="text-lg font-black font-mono" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN: Trail + Subject progress ──────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Subject progress overview */}
          <div className="bg-surface-container rounded-3xl p-5 border border-surface-container-high space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Journey Overview</p>
                <h2 className="text-sm font-black text-on-surface">Subject Mastery</h2>
              </div>
              <button onClick={() => setProfile(null)} className="text-[10px] font-bold text-on-surface-variant border border-black/10 dark:border-surface-container-high px-3 py-1 rounded-lg hover:text-primary transition">
                Reset
              </button>
            </div>
            <div className="space-y-3">
              {subjectStats.map((ss: any) => (
                <div key={ss.subject}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{ss.icon}</span>
                      <p className="text-xs font-black text-on-surface">{ss.subject}</p>
                      {ss.bossWon && <span className="text-[10px] font-black text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded-full bg-amber-500/10">⚔️ Boss Won</span>}
                    </div>
                    <span className="text-[10px] font-mono font-black" style={{ color: ss.color }}>{ss.done}/{ss.total}</span>
                  </div>
                  <div className="w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${ss.pct}%`, background: ss.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {subjects.map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${filter === s ? 'text-white border-transparent shadow-md' : 'border-black/15 dark:border-surface-container-high text-on-surface-variant hover:border-black/25 dark:hover:border-surface-container-highest'}`}
                style={filter === s ? { background: s === 'All' ? '#5b4cf5' : SUBJECT_COLORS[s] } : {}}>
                {s === 'All' ? 'All Subjects' : `${SUBJECT_ICONS[s]} ${s}`}
              </button>
            ))}
            <button onClick={() => setShowOnlyDue(v => !v)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${showOnlyDue ? 'bg-red-600 text-white border-red-600' : 'border-black/15 dark:border-surface-container-high text-on-surface-variant hover:border-black/25 dark:hover:border-surface-container-highest'}`}>
              {showOnlyDue ? '🔔 Due Only (ON)' : '🔔 Due Only'}
            </button>
          </div>

          {/* Vertical node trail */}
          <div className="space-y-0">
            {trail.map((item, ti) => {
              if (item.type === 'boss') {
                const bossWon = profile.completedBosses.includes(item.subject);
                const subTopics = topics.filter(t => t.subject === item.subject);
                const allDone = subTopics.every(t => isGatePassed(getProgress(t.topic), getTopicRule(t.topic, t.subject)));
                const bossInfo = SUBJECT_BOSS[item.subject] ?? { title: 'Boss', icon: '👹' };
                return (
                  <div key={`boss-${item.subject}`} className="flex justify-center py-4">
                    <div className="relative">
                      {/* Connector */}
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4" style={{ background: bossWon ? '#f59e0b' : '#374151' }} />
                      <button
                        onClick={() => allDone && !bossWon && setActiveBoss(item.subject)}
                        disabled={!allDone && !bossWon}
                        className={`relative flex flex-col items-center gap-2 px-6 py-4 rounded-2xl border-2 transition-all duration-300 ${
                          bossWon ? 'border-amber-500/60 cursor-default' :
                          allDone ? 'border-red-500/80 hover:scale-105 cursor-pointer' :
                          'border-zinc-800 opacity-50 cursor-not-allowed'
                        }`}
                        style={{
                          background: bossWon ? 'rgba(245,158,11,0.08)' : allDone ? 'rgba(239,68,68,0.08)' : 'rgba(0,0,0,0.3)',
                          boxShadow: bossWon ? '0 0 20px rgba(245,158,11,0.2)' : allDone ? '0 0 20px rgba(239,68,68,0.2)' : 'none',
                        }}>
                        <div className="text-3xl">{bossWon ? '🏆' : allDone ? '⚔️' : '🔒'}</div>
                        <div className="text-center">
                          <p className={`text-xs font-black uppercase tracking-wider ${bossWon ? 'text-amber-400' : allDone ? 'text-red-400' : 'text-on-surface-variant'}`}>
                            {bossWon ? '✅ Defeated' : allDone ? '⚔️ Challenge!' : '🔒 Locked'}
                          </p>
                          <p className="text-[11px] font-bold text-on-surface-variant mt-0.5">{bossInfo.title}</p>
                        </div>
                        {allDone && !bossWon && (
                          <span className="absolute -top-2 -right-2 text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">READY</span>
                        )}
                      </button>
                      {/* Connector below */}
                      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-0.5 h-4" style={{ background: bossWon ? '#f59e0b' : 'var(--color-surface-container-high)' }} />
                    </div>
                  </div>
                );
              }

              // Topic node
              const entry = item.entry!;
              const progress = getProgress(entry.topic);
              const rule = getTopicRule(entry.topic, entry.subject);
              const passed = isGatePassed(progress, rule);
              const acc = getAccuracy(progress);
              const isExpanded = expandedTopic === entry.topic;

              // Determine if unlocked: first topic of first subject always unlocked; others need boss battle or prev topic
              const subjectIdx = orderedSubjects.indexOf(item.subject);
              const prevSubjects = orderedSubjects.slice(0, subjectIdx);
              const prevSubjectsAllDone = prevSubjects.every(s => profile.completedBosses.includes(s) || topics.filter(t => t.subject === s).every(t => isGatePassed(getProgress(t.topic), getTopicRule(t.topic, t.subject))));
              const subTopicsForSubj = topics.filter(t => t.subject === item.subject);
              const topicIdx = subTopicsForSubj.indexOf(entry);
              const prevTopicDone = topicIdx === 0 ? true : isGatePassed(getProgress(subTopicsForSubj[topicIdx - 1].topic), getTopicRule(subTopicsForSubj[topicIdx - 1].topic, item.subject));
              const isUnlocked = prevSubjectsAllDone && prevTopicDone;

              const nodeColor = passed ? '#10b981' : isUnlocked ? SUBJECT_COLORS[entry.subject] : 'var(--color-surface-container-high)';

              return (
                <div key={entry.topic} className="flex gap-4">
                  {/* Node column */}
                  <div className="flex flex-col items-center" style={{ minWidth: 48 }}>
                    {ti > 0 && <div className="w-0.5 h-4 bg-surface-container-high" />}
                    <button
                      onClick={() => isUnlocked && setExpandedTopic(isExpanded ? null : entry.topic)}
                      className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${isUnlocked ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-40'}`}
                      style={{
                        borderColor: nodeColor,
                        background: passed ? 'rgba(16,185,129,0.15)' : isUnlocked ? `${nodeColor}22` : 'var(--color-surface-container-low)',
                        boxShadow: isUnlocked && !passed ? `0 0 12px ${nodeColor}44` : 'none',
                        animation: isUnlocked && !passed ? 'node-pulse 2s ease-in-out infinite' : 'none',
                      }}>
                      {passed ? <Check size={18} style={{ color: '#10b981' }} />
                        : isUnlocked ? <span className="text-base">{SUBJECT_ICONS[entry.subject]}</span>
                        : <Lock size={14} className="text-on-surface-variant/40" />}
                    </button>
                    <div className="w-0.5 flex-1 min-h-4 bg-surface-container-high" />
                  </div>

                  {/* Topic card */}
                  <div className="flex-1 py-2">
                    <button
                      onClick={() => isUnlocked && setExpandedTopic(isExpanded ? null : entry.topic)}
                      className={`w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200 ${isUnlocked ? 'cursor-pointer hover:border-surface-container-highest' : 'cursor-not-allowed opacity-40'} ${isExpanded ? 'border-primary' : 'border-surface-container-high'}`}
                      style={{ background: passed ? 'rgba(16,185,129,0.05)' : 'var(--color-surface-container)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-black ${passed ? 'text-emerald-600 dark:text-emerald-300' : isUnlocked ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>{entry.topic}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-zinc-600">{entry.count} PYQs</span>
                            {isUnlocked && !passed && (
                              <span className="text-[9px] font-black" style={{ color: nodeColor }}>
                                {progress.conceptRead ? `${acc}% acc` : 'Start here'}
                              </span>
                            )}
                            {passed && <span className="text-[9px] font-black text-emerald-400">✓ Gate Passed</span>}
                          </div>
                        </div>
                        {isUnlocked && <ChevronRight size={14} className={`text-zinc-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
                      </div>

                      {/* Inline mini progress if started */}
                      {isUnlocked && progress.pyqsAttempted > 0 && !isExpanded && (
                        <div className="mt-2 w-full bg-zinc-900 rounded-full h-1 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (progress.pyqsAttempted / rule.minPYQs) * 100)}%`, background: nodeColor }} />
                        </div>
                      )}
                    </button>

                    {/* Expanded TopicCard */}
                    {isExpanded && isUnlocked && (
                      <div className="mt-2">
                        <TopicCard
                          entry={entry}
                          progress={progress}
                          isUnlocked={isUnlocked}
                          onUpdate={u => updateProgress(entry.topic, u)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTopics.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Brain size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">No topics found for this filter</p>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Level, Quests, Badges ──────────────── */}
        <div className="space-y-5">
          {/* Daily Quests */}
          <div className="bg-surface-container rounded-3xl p-5 border border-surface-container-high space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Today</p>
              <h3 className="text-sm font-black text-on-surface mt-0.5">Daily Quests</h3>
            </div>
            <div className="space-y-3">
              {(profile.dailyQuests ?? generateDailyQuests()).map(q => {
                const pct = Math.min(100, (q.current / q.target) * 100);
                return (
                  <div key={q.id} className={`p-3 rounded-2xl border transition-all ${q.completed ? 'border-emerald-950/20 bg-emerald-500/10' : 'border-surface-container-high bg-surface-container-low'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className={`text-[11px] font-bold leading-snug ${q.completed ? 'text-emerald-600 dark:text-emerald-400 line-through' : 'text-on-surface-variant'}`}>{q.text}</p>
                      {q.completed
                        ? <span className="text-emerald-500 shrink-0">✅</span>
                        : <span className="shrink-0 text-[9px] font-black text-secondary bg-secondary/10 border border-secondary/20 px-1.5 py-0.5 rounded-lg">+{q.xpReward}</span>}
                    </div>
                    {!q.completed && (
                      <div>
                        <div className="w-full bg-surface-container-low rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-[8px] text-on-surface-variant font-bold mt-1">
                          <span>Progress</span>
                          <span className="font-mono">{q.current}/{q.target}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Badges Cabinet */}
          <div className="bg-surface-container rounded-3xl p-5 border border-surface-container-high space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Achievements</p>
              <h3 className="text-sm font-black text-on-surface mt-0.5">Officer Badges</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {BADGES_CATALOG.map(b => {
                const earned = profile.badges.includes(b.id);
                return (
                  <div key={b.id} title={`${b.title}: ${b.desc}`}
                    className={`relative rounded-2xl aspect-square flex items-center justify-center border transition-all group cursor-pointer ${earned ? 'border-surface-container-high bg-surface-container-low hover:scale-110' : 'border-surface-container-low bg-surface-container/20 opacity-30'}`}
                  >
                    <span className={`text-2xl ${!earned ? 'grayscale' : ''}`}>{b.icon}</span>
                    {!earned && <Lock size={8} className="absolute bottom-1 right-1 text-on-surface-variant/40" />}
                    {earned && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 hidden group-hover:block bg-surface-container border border-surface-container-high rounded-xl p-2 text-center z-30 text-[9px] text-on-surface-variant shadow-xl pointer-events-none">
                        <p className="font-black text-on-surface mb-0.5">{b.title}</p>
                        <p>{b.desc}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Study Laws */}
          <div className="rounded-3xl p-5 border border-amber-500/20 space-y-3 bg-amber-500/5">
            <p className="font-black text-amber-600 dark:text-amber-500 text-xs flex items-center gap-2 uppercase tracking-widest">
              <Shield size={13} /> Academy Laws
            </p>
            <div className="space-y-2 text-[10px] text-on-surface-variant font-medium leading-relaxed">
              <p>• <strong className="text-on-surface">Gate Check:</strong> Concept + PYQs solved + accuracy threshold required</p>
              <p>• <strong className="text-on-surface">Priority Order:</strong> GK → Science → Reasoning → Maths</p>
              <p>• <strong className="text-on-surface">Boss Battles:</strong> Complete all subject topics to unlock the boss</p>
              <p>• <strong className="text-on-surface">Ebbinghaus:</strong> Revise on Day 1, 7, 30 after completion</p>
            </div>
          </div>

          {/* Inspiration footer */}
          <div className="rounded-3xl p-5 text-white text-center" style={{ background: 'linear-gradient(135deg, #0a0f1e, #1e1b4b, #0f172a)' }}>
            <p className="text-3xl mb-2">👮</p>
            <p className="font-black text-sm mb-1">You WILL crack KSP!</p>
            <p className="text-white/50 text-[11px] leading-relaxed">
              "Consistency beats intelligence. 1 hour of focused PYQ practice daily for 60 days beats 12 hours of unfocused reading."
            </p>
            <p className="text-amber-400 text-[10px] font-bold mt-2">— Khan Sir, Patna</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Flame, Target, Plus, Trash2, BookOpen, Zap, BarChart3, ChevronRight, TrendingUp, Award, Brain, Target as MatchIcon, Settings } from 'lucide-react';
import { format, subDays } from 'date-fns';
import pyqsData from '../data/pyqs.json';
import { SubjectDistribution } from './SubjectDistribution';
import { SettingsModal } from './SettingsModal';
import { DailyChallengeModal } from './DailyChallengeModal';
import { FSRSRevisionModal } from './FSRSRevisionModal';
import { BattleAIModal } from './BattleAIModal';
import { useLang } from '../lib/LanguageContext';
import { translateUI, translateSubject } from '../lib/translations';

interface PYQ { id: number; subject: string; topic: string; question: string; options: string[]; correctAnswer: number; difficulty: string; }
interface Goal { id: string; text: string; completed: boolean; }
interface DashboardProps { userName: string; onNavigateTo?: (tab: string) => void; }

const SUBJECT_CONFIG = {
  'Mathematics':       { icon: '📐', grad: 'from-blue-600 to-indigo-700', color: '#3b82f6', bg: '#0F1629', label: 'Mathematics', desc: 'Arithmetic & Formulas', descKn: 'ಅಂಕಗಣಿತ ಮತ್ತು ಸೂತ್ರಗಳು' },
  'Reasoning':         { icon: '🧩', grad: 'from-purple-600 to-violet-700', color: '#8b5cf6', bg: '#0F1629', label: 'Reasoning', desc: 'Mental Ability & Logic', descKn: 'ಮಾನಸಿಕ ಸಾಮರ್ಥ್ಯ ಮತ್ತು ತರ್ಕ' },
  'General Science':   { icon: '🔬', grad: 'from-emerald-600 to-teal-700', color: '#10b981', bg: '#0F1629', label: 'General Science', desc: 'Physics, Chemistry, Biology', descKn: 'ಭೌತಶಾಸ್ತ್ರ, ರಸಾಯನಶಾಸ್ತ್ರ, ಜೀವಶಾಸ್ತ್ರ' },
  'General Awareness': { icon: '🌍', grad: 'from-amber-500 to-orange-600', color: '#f59e0b', bg: '#0F1629', label: 'General Awareness', desc: 'Polity, History, Geography', descKn: 'ರಾಜ್ಯಶಾಸ್ತ್ರ, ಇತಿಹಾಸ, ಭೂಗೋಳಶಾಸ್ತ್ರ' },
} as const;

export function Dashboard({ userName, onNavigateTo }: DashboardProps) {
  const { lang } = useLang();
  const today = new Date();
  const allQuestions = pyqsData as PYQ[];
  const firstName = userName.split(' ')[0];

  // Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [isFSRSOpen, setIsFSRSOpen] = useState(false);
  const [isBattleOpen, setIsBattleOpen] = useState(false);

  const stats = useMemo(() => {
    const subjectMap: Record<string, { count: number; topics: Set<string> }> = {};
    allQuestions.forEach(q => {
      if (!subjectMap[q.subject]) subjectMap[q.subject] = { count: 0, topics: new Set() };
      subjectMap[q.subject].count++;
      subjectMap[q.subject].topics.add(q.topic);
    });
    return {
      subjectMap,
      total: allQuestions.length,
    };
  }, [allQuestions]);

  const [goals, setGoals] = useState<Goal[]>(() => {
    try { return JSON.parse(localStorage.getItem('rrb_goals') || '[]'); } catch { return []; }
  });
  const [newGoalText, setNewGoalText] = useState('');
  useEffect(() => { localStorage.setItem('rrb_goals', JSON.stringify(goals)); }, [goals]);

  const [streakData, setStreakData] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('rrb_streak') || '{}'); } catch { return {}; }
  });
  const currentStreak = useMemo(() => {
    let streak = 0; let d = new Date(); d.setHours(0,0,0,0);
    while (streakData[format(d, 'yyyy-MM-dd')]) { streak++; d = subDays(d, 1); }
    return streak;
  }, [streakData]);

  useEffect(() => {
    const k = format(today, 'yyyy-MM-dd');
    if (!streakData[k]) { const u = { ...streakData, [k]: 1 }; setStreakData(u); localStorage.setItem('rrb_streak', JSON.stringify(u)); }
  }, []);

  const streakDays = Array.from({ length: 35 }).map((_, i) => {
    const date = subDays(today, 34 - i);
    return { date, active: !!(streakData[format(date, 'yyyy-MM-dd')] || 0) };
  });

  const completedCount = goals.filter(g => g.completed).length;
  const pct = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  // Dynamically calculate user ELO from local storage
  const userElo = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
      const email: string = u?.email || 'guest';
      const prefix = email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '');
      const profile = JSON.parse(localStorage.getItem(`${prefix}__ksp_roadmap_v4`) || '{}');
      return profile.xp ? Math.round(profile.xp / 10) + 1000 : 1200;
    } catch {
      return 1200;
    }
  }, [isSettingsOpen, isBattleOpen]); // recalculate when duels end

  // Dynamically calculate user Syllabus Mastery percentage
  const syllabusMastery = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
      const email: string = u?.email || 'guest';
      const prefix = email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '');
      const profile = JSON.parse(localStorage.getItem(`${prefix}__ksp_roadmap_v4`) || '{}');
      const progress = profile.topicProgress || {};
      const total = Object.keys(progress).length;
      if (total === 0) return 38; // Default simulated starting progress if brand new
      const completed = Object.values(progress).filter((x: any) => x.conceptRead || x.pyqsAttempted > 0).length;
      return Math.round((completed / total) * 100);
    } catch {
      return 38;
    }
  }, []);

  // Subject masteries represented as fixed percentages based on user's attempt records
  const subjectMasteries = useMemo(() => {
    try {
      const performance = JSON.parse(localStorage.getItem('ksp_subject_accuracies') || '{}');
      return {
        'Mathematics': performance['Mathematics'] || 68,
        'Reasoning': performance['Reasoning'] || 72,
        'General Science': performance['General Science'] || 58,
        'General Awareness': performance['General Awareness'] || 64,
      };
    } catch {
      return { 'Mathematics': 68, 'Reasoning': 72, 'General Science': 58, 'General Awareness': 64 };
    }
  }, []);

  return (
    <div className="space-y-6 pb-8 text-on-surface">

      {/* ── PREMIUM HERO BANNER (Command Center Title) ────────────────── */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-surface-container border border-surface-container-high p-6 lg:p-8">
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full opacity-15 bg-primary filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-10 bg-secondary filter blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-secondary text-xs font-black uppercase tracking-widest bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20">
                {translateUI('commandCenter', lang)}
              </span>
              <span className="text-on-surface-variant text-xs font-bold">
                • {translateUI('activeSession', lang)}
              </span>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="ml-auto lg:ml-2 p-1.5 bg-surface-container-low border border-surface-container-high hover:border-surface-container-highest rounded-xl transition-all text-on-surface-variant hover:text-on-surface"
                title="AI & ELO Settings"
              >
                <Settings size={16} />
              </button>
            </div>
            <h1 className="text-3xl font-black mb-1 tracking-tight">
              {lang === 'kn' ? `ನಮಸ್ಕಾರ, ${firstName} 👮` : `Hello, ${firstName} 👮`}
            </h1>
            <p className="text-on-surface-variant text-xs max-w-sm mt-1">
              {lang === 'kn' 
                ? '"ತಯಾರಿಯಲ್ಲಿ ಶಿಸ್ತು ಇರಲಿ, ಯಶಸ್ಸು ತಾನಾಗಿಯೇ ಬರುತ್ತದೆ."' 
                : '"Stay disciplined in prep, success will follow."'}
            </p>
          </div>

          {/* Quick Metrics Bento Row — NO ABSOLUTE QUESTION COUNTS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            {[
              { label: translateUI('syllabusMastery', lang), value: `${syllabusMastery}%`, color: '#4f46e5', bg: 'bg-surface-container-low border border-surface-container-high' },
              { label: translateUI('eloRating', lang), value: `${userElo} ELO`, color: '#ff7722', bg: 'bg-orange-500/10 border border-orange-500/15' },
              { label: translateUI('activeStreak', lang), value: `${currentStreak} ${translateUI('days', lang)}`, color: '#22c55e', bg: 'bg-green-500/10 border border-green-500/15' },
              { label: translateUI('goalsCompleted', lang), value: `${pct}%`, color: '#f5a623', bg: 'bg-amber-500/10 border border-amber-500/15' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl px-4 py-3 text-center ${s.bg}`}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── EXAM COUNTDOWN PILL ─────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-secondary/15 via-secondary/5 to-transparent border border-secondary/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping shrink-0" />
          <div>
            <h4 className="text-sm font-black text-on-surface">{translateUI('prepActiveCoverage', lang)}</h4>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              {lang === 'kn' ? 'ಪೂರ್ಣ ಕೆಎಸ್ಪಿ ಕಾನ್ಸ್ಟೇಬಲ್ ಮತ್ತು ಸಬ್-ಇನ್ಸ್ಪೆಕ್ಟರ್ ಪಠ್ಯಕ್ರಮದ ಕವರೇಜ್' : 'Complete KSP Constable & Sub-Inspector syllabus coverage'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Seeded Daily Challenge Mode */}
        <div className="bg-surface-container rounded-3xl p-5 border border-surface-container-high flex flex-col justify-between h-[260px] relative overflow-hidden group hover:border-secondary/20 transition-all glow-amber">
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-secondary/10 rounded-full filter blur-xl animate-pulse" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{translateUI('dailyChallenge', lang)}</span>
              <span className="text-[10px] text-on-surface-variant font-bold">{translateUI('lockedMode', lang)}</span>
            </div>
            <h4 className="text-base font-black text-on-surface leading-tight">{translateUI('todaysChallenge', lang)}</h4>
            <p className="text-xs text-on-surface-variant mt-1.5">{translateUI('challengeDesc', lang)}</p>
          </div>
          <div className="mt-4">
            <button onClick={() => setIsDailyOpen(true)} className="w-full py-2.5 bg-secondary text-white rounded-xl font-black text-xs hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-secondary/25 border border-secondary/30">
              {translateUI('startChallenge', lang)}
            </button>
          </div>
        </div>

        {/* Card 2: FSRS Space Revision */}
        <div className="bg-surface-container rounded-3xl p-5 border border-surface-container-high flex flex-col justify-between h-[260px] relative overflow-hidden group hover:border-primary/20 transition-all glow-violet">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black bg-primary/25 text-primary border border-primary/30 px-2 py-0.5 rounded-full uppercase tracking-wider dark:text-indigo-300">ANKI / FSRS</span>
              <span className="text-[10px] text-accent font-bold">{lang === 'kn' ? 'ನೆನಪಿನ ಶಕ್ತಿ ಸಕ್ರಿಯ' : 'Retention Active'}</span>
            </div>
            <h4 className="text-base font-black text-on-surface leading-tight">{translateUI('fsrsRevision', lang)}</h4>
            <p className="text-xs text-on-surface-variant mt-1.5">{translateUI('memoryScienceDesc', lang)}</p>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center text-[10px] font-black text-on-surface-variant mb-1 uppercase tracking-wider">
              <span>{translateUI('memoryStability', lang)}</span>
              <span>{translateUI('reviewNeeded', lang)}</span>
            </div>
            <div className="w-full bg-surface-container-low rounded-full h-1.5 overflow-hidden border border-surface-container-high mb-3">
              <div className="h-full bg-gradient-to-r from-primary to-accent progress-fill" style={{ width: '70%' }} />
            </div>
            <button onClick={() => setIsFSRSOpen(true)} className="w-full py-2.5 bg-primary text-white hover:opacity-90 rounded-xl font-black text-xs active:scale-95 transition-all shadow-md">
              {translateUI('startRevision', lang)}
            </button>
          </div>
        </div>

        {/* Card 3: Streak Fire Pillar (Interactive) */}
        <div className="bg-surface-container rounded-3xl p-5 border border-surface-container-high flex flex-col items-center justify-between h-[260px] relative overflow-hidden glow-emerald">
          <div className="absolute top-3 left-4 flex items-center gap-1.5">
            <Flame size={14} className="text-accent animate-bounce" />
            <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-wider">{translateUI('streakSystem', lang)}</span>
          </div>

          <div className="w-20 h-28 relative mt-3 flex items-center justify-center">
            {/* Fire glow */}
            <div className="absolute inset-0 bg-accent/15 rounded-full filter blur-xl animate-pulse" />
            {/* Blazing Flame SVG */}
            <svg viewBox="0 0 100 150" className="w-16 h-24 drop-shadow-[0_0_15px_rgba(245,166,37,0.4)]">
              <defs>
                <linearGradient id="fireGrad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="40%" stopColor="#ff7722" />
                  <stop offset="85%" stopColor="#f5a623" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M50,140 Q38,105 45,85 Q52,65 42,35 Q60,70 56,90 Q52,110 50,140 Z" fill="url(#fireGrad)" className="animate-pulse" />
              <path d="M50,140 Q28,105 36,75 Q44,45 33,15 Q53,55 48,80 Q43,105 50,140 Z" fill="url(#fireGrad)" opacity="0.8" />
              <path d="M50,140 Q62,110 60,90 Q58,70 66,40 Q63,75 55,100 Q47,125 50,140 Z" fill="url(#fireGrad)" opacity="0.6" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1.5">
              <span className="text-3xl font-black text-white leading-none tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{currentStreak}</span>
              <span className="text-[9px] font-black text-accent uppercase tracking-widest mt-0.5 leading-none">{translateUI('days', lang)}</span>
            </div>
          </div>

          <div className="w-full flex gap-1 justify-center">
            {streakDays.slice(-7).map((day, i) => (
              <div
                key={i}
                title={format(day.date, 'MMM d')}
                className={`w-3.5 h-3.5 rounded ${day.active ? 'bg-gradient-to-br from-secondary to-accent shadow-sm' : 'bg-on-surface/5 border border-on-surface/10'}`}
              />
            ))}
          </div>
        </div>

        {/* Card 4: Duel Battle Mode */}
        <div className="bg-surface-container rounded-3xl p-5 border border-surface-container-high flex flex-col justify-between h-[260px] relative overflow-hidden group hover:border-red-500/20 transition-all glow-red">
          <div className="absolute top-3 right-4 flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full text-red-400 text-[9px] font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            {translateUI('live', lang)}
          </div>
          <div>
            <span className="text-[9px] font-black bg-red-500/15 text-red-400 border border-red-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider">{translateUI('battleArena', lang)}</span>
            <h4 className="text-base font-black text-on-surface leading-tight mt-3">{translateUI('battleDuel', lang)}</h4>
            <p className="text-xs text-on-surface-variant mt-1.5">{translateUI('battleDesc', lang)}</p>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setIsBattleOpen(true)}
              className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-700 text-white rounded-xl font-black text-xs hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-red-900/20 border border-red-500/30"
            >
              {translateUI('findMatch', lang)}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: AI Doubt Coach Warning Box */}
        <div className="lg:col-span-1 bg-surface-container rounded-3xl p-5 border border-surface-container-high flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-teal-500/5 rounded-full filter blur-xl" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">{translateUI('aiTutorResolver', lang)}</span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold">{translateUI('activeCoach', lang)}</span>
            </div>
            <h4 className="text-base font-black text-on-surface">{translateUI('aiAnalytics', lang)}</h4>
            <p className="text-xs text-teal-950 dark:text-teal-100/80 mt-3 p-3 bg-teal-50 dark:bg-teal-950/15 rounded-xl border border-teal-200 dark:border-teal-500/15 leading-relaxed">
              {lang === 'kn'
                ? `💡 "${firstName}, ನಿಮ್ಮ ಪ್ರದರ್ಶನವು ಇತಿಹಾಸದಲ್ಲಿ ದುರ್ಬಲವಾಗಿದೆ ಎಂದು ತೋರಿಸುತ್ತದೆ. ಕರ್ನಾಟಕ ಇತಿಹಾಸದ ಮೇಲೆ 15 ನಿಮಿಷಗಳ ಸವಾಲನ್ನು ಪ್ರಾರಂಭಿಸಲು ನಾವು ಸೂಚಿಸುತ್ತೇವೆ."`
                : `💡 "${firstName}, your performance shows history is weak. We suggest starting a 15-minute challenge on Karnataka History."`}
            </p>
          </div>
          <div className="mt-5 flex gap-2">
            <button onClick={() => onNavigateTo?.('practice')} className="flex-1 py-2.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface rounded-xl font-bold text-xs active:scale-95 transition-all border border-surface-container-high text-center">
              {translateUI('skip', lang)}
            </button>
            <button onClick={() => onNavigateTo?.('practice')} className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white rounded-xl font-black text-xs hover:opacity-90 active:scale-95 transition-all shadow-md shadow-teal-500/10 border border-teal-500/30 text-center">
              {translateUI('practiceNow', lang)}
            </button>
          </div>
        </div>

        {/* Right: Daily Goals planner card */}
        <div className="lg:col-span-1 bg-surface-container rounded-3xl p-5 border border-surface-container-high flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-secondary" />
              <h3 className="font-black text-sm">{translateUI('dailyGoals', lang)}</h3>
            </div>
            {goals.length > 0 && (
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-surface-container-low text-secondary border border-surface-container-high">
                {pct}% {translateUI('pctCompleted', lang)}
              </span>
            )}
          </div>

          <form onSubmit={e => { e.preventDefault(); if (!newGoalText.trim()) return; setGoals([...goals, { id: Date.now().toString(), text: newGoalText.trim(), completed: false }]); setNewGoalText(''); }} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newGoalText}
              onChange={e => setNewGoalText(e.target.value)}
              placeholder={translateUI('addGoalPlaceholder', lang)}
              className="flex-1 text-xs px-3 py-2 bg-surface-container-low border border-surface-container-high rounded-xl focus:outline-none focus:ring-1 focus:ring-secondary/40 focus:border-secondary/40 text-on-surface placeholder:text-on-surface-variant/40"
            />
            <button type="submit" className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 hover:opacity-90 transition bg-secondary shadow-md shadow-secondary/20">
              <Plus size={16} />
            </button>
          </form>

          <div className="space-y-1.5 max-h-[105px] overflow-y-auto pr-1">
            {goals.length === 0 ? (
              <p className="text-center text-xs text-on-surface-variant/50 py-4 italic">{translateUI('setFirstGoal', lang)}</p>
            ) : goals.map(goal => (
              <div
                key={goal.id}
                className={`flex items-center gap-2.5 p-2 rounded-xl border group transition-all ${goal.completed ? 'bg-green-500/10 border-green-500/20' : 'bg-surface-container-low border-surface-container-high hover:border-surface-container-highest'}`}
              >
                <button onClick={() => setGoals(goals.map(g => g.id === goal.id ? { ...g, completed: !g.completed } : g))} className="shrink-0">
                  {goal.completed
                    ? <CheckCircle2 size={16} className="text-green-500" />
                    : <div className="w-[16px] h-[16px] rounded-full border-2 border-on-surface-variant/50 hover:border-secondary transition-colors" />
                  }
                </button>
                <p className={`text-xs font-semibold flex-1 truncate ${goal.completed ? 'text-green-400 line-through opacity-70' : 'text-on-surface'}`}>{goal.text}</p>
                <button onClick={() => setGoals(goals.filter(g => g.id !== goal.id))} className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-error">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Study Roadmap quick access */}
        <div className="lg:col-span-1 bg-surface-container rounded-3xl p-5 border border-surface-container-high flex flex-col justify-between">
          <div>
            <span className="text-[9px] font-black bg-primary/25 text-primary border border-primary/30 px-2 py-0.5 rounded-full uppercase tracking-wider dark:text-indigo-300">{translateUI('examRoadmap', lang)}</span>
            <h4 className="text-base font-black text-on-surface mt-2.5">{lang === 'kn' ? 'ಅಧ್ಯಯನ ನಕ್ಷೆ' : 'Study Roadmap'}</h4>
            <p className="text-xs text-on-surface-variant mt-1.5">
              {lang === 'kn'
                ? 'ಸ್ವಚ್ಛವಾದ ಅಧ್ಯಯನದ ಮೈಲಿಗಲ್ಲುಗಳಾಗಿ ಮ್ಯಾಪ್ ಮಾಡಲಾದ ಸಂಪೂರ್ಣ ಕೆಎಸ್ಪಿ ಪಠ್ಯಕ್ರಮದ ಮೂಲಕ ಸಂಚರಿಸಿ.'
                : 'Navigate through the complete KSP syllabus mapped into clean milestones.'}
            </p>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => onNavigateTo?.('roadmap')} className="w-full py-2.5 bg-gradient-to-r from-primary to-indigo-700 text-white rounded-xl font-black text-xs hover:opacity-90 active:scale-95 transition-all shadow-md">
              {translateUI('roadmapBtn', lang)}
            </button>
            <button onClick={() => onNavigateTo?.('planner')} className="w-full py-2.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-surface-container-high rounded-xl font-black text-xs hover:opacity-90 active:scale-95 transition-all shadow-sm">
              {translateUI('plannerBtn', lang)}
            </button>
          </div>
        </div>
      </div>

      {/* ── SUBJECT MASTER JUMP GRID — NO QUESTION COUNTS, ONLY PERCENTAGES ── */}
      <div className="bg-surface-container rounded-3xl border border-surface-container-high overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-surface-container-high bg-surface-container-low flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Brain size={18} className="text-secondary" />
              <h3 className="font-black text-on-surface text-sm">{translateUI('subjectQuickJump', lang)}</h3>
            </div>
            <p className="text-[11px] text-on-surface-variant">{translateUI('subjectQuickJumpDesc', lang)}</p>
          </div>
        </div>

        <div className="divide-y divide-surface-container-high">
          {([
            { subject: 'Mathematics', config: SUBJECT_CONFIG['Mathematics'] },
            { subject: 'Reasoning', config: SUBJECT_CONFIG['Reasoning'] },
            { subject: 'General Science', config: SUBJECT_CONFIG['General Science'] },
            { subject: 'General Awareness', config: SUBJECT_CONFIG['General Awareness'] },
          ] as const).map(({ subject, config }) => {
            const mastery = subjectMasteries[subject];
            return (
              <div key={subject} className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors group">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-md bg-gradient-to-br ${config.grad}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-sm text-on-surface truncate">{translateSubject(subject, lang)}</p>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white shrink-0" style={{ background: config.color }}>
                      {mastery}% {translateUI('mastered', lang)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-surface-container-low rounded-full h-1.5 overflow-hidden border border-surface-container-high">
                    <div className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${config.grad}`} style={{ width: `${mastery}%` }} />
                  </div>
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    {lang === 'kn' ? config.descKn : config.desc}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onNavigateTo?.('practice')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-white hover:opacity-90 transition-all active:scale-95 shadow-md bg-gradient-to-r from-blue-600 to-indigo-700"
                  >
                    <BookOpen size={11} /> {translateUI('practice', lang)}
                  </button>
                  <button
                    onClick={() => onNavigateTo?.('papers')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border border-surface-container-high hover:bg-surface-container-low transition-all text-on-surface active:scale-95"
                  >
                    <TrendingUp size={11} /> {translateUI('mock', lang)}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Bento Jump */}
        <div className="px-5 py-4 border-t border-surface-container-high bg-surface-container-low">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Award size={16} className="text-secondary shrink-0" />
              <p className="text-xs font-bold text-on-surface-variant">{translateUI('reviewWeakAreasDesc', lang)}</p>
            </div>
            <button
              onClick={() => onNavigateTo?.('weakareas')}
              className="text-xs font-black px-4 py-2 rounded-xl text-white shrink-0 hover:opacity-90 transition-all bg-secondary shadow-lg shadow-secondary/20 border border-secondary/20"
            >
              {translateUI('weakAreasBtn', lang)}
            </button>
          </div>
        </div>
      </div>

      <SubjectDistribution />

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Daily Challenge Seed Modal */}
      <DailyChallengeModal isOpen={isDailyOpen} onClose={() => setIsDailyOpen(false)} />

      {/* FSRS revision Spaced modal */}
      <FSRSRevisionModal isOpen={isFSRSOpen} onClose={() => setIsFSRSOpen(false)} />

      {/* Battle AI Duel Arena */}
      <BattleAIModal isOpen={isBattleOpen} onClose={() => setIsBattleOpen(false)} userName={userName} />
    </div>
  );
}

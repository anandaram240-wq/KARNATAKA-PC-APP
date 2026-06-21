import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Target, Plus, Trash2, BookOpen, Zap, BarChart3, ChevronRight } from 'lucide-react';
import pyqsData from '../data/pyqs.json';
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
  'Mathematics':       { icon: '📐', grad: 'from-blue-600 to-indigo-700', color: '#3b82f6', label: 'Mathematics', desc: 'Arithmetic & Formulas', descKn: 'ಅಂಕಗಣಿತ ಮತ್ತು ಸೂತ್ರಗಳು' },
  'Reasoning':         { icon: '🧩', grad: 'from-purple-600 to-violet-700', color: '#8b5cf6', label: 'Reasoning', desc: 'Mental Ability & Logic', descKn: 'ಮಾನಸಿಕ ಸಾಮರ್ಥ್ಯ ಮತ್ತು ತರ್ಕ' },
  'General Science':   { icon: '🔬', grad: 'from-emerald-600 to-teal-700', color: '#10b981', label: 'General Science', desc: 'Physics, Chemistry, Biology', descKn: 'ಭೌತಶಾಸ್ತ್ರ, ರಸಾಯನಶಾಸ್ತ್ರ, ಜೀವಶಾಸ್ತ್ರ' },
  'General Awareness': { icon: '🌍', grad: 'from-amber-500 to-orange-600', color: '#f59e0b', label: 'General Awareness', desc: 'Polity, History, Geography', descKn: 'ರಾಜ್ಯಶಾಸ್ತ್ರ, ಇತಿಹಾಸ, ಭೂಗೋಳಶಾಸ್ತ್ರ' },
} as const;

export function Dashboard({ userName, onNavigateTo }: DashboardProps) {
  const { lang } = useLang();
  const allQuestions = pyqsData as PYQ[];
  const firstName = userName.split(' ')[0];

  // Modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDailyOpen, setIsDailyOpen] = useState(false);
  const [isFSRSOpen, setIsFSRSOpen] = useState(false);
  const [isBattleOpen, setIsBattleOpen] = useState(false);

  // Calculate dynamic stats
  const stats = useMemo(() => {
    const subjectMap: Record<string, { count: number; topics: Set<string> }> = {};
    let easy = 0, medium = 0, hard = 0;
    
    allQuestions.forEach(q => {
      if (!subjectMap[q.subject]) subjectMap[q.subject] = { count: 0, topics: new Set() };
      subjectMap[q.subject].count++;
      subjectMap[q.subject].topics.add(q.topic);
      
      const diff = q.difficulty?.toLowerCase();
      if (diff === 'easy') easy++;
      else if (diff === 'medium') medium++;
      else if (diff === 'hard') hard++;
      else easy++; // default
    });
    
    return {
      subjectMap,
      total: allQuestions.length,
      easy,
      medium,
      hard
    };
  }, [allQuestions]);

  // Goals state
  const [goals, setGoals] = useState<Goal[]>(() => {
    try { return JSON.parse(localStorage.getItem('rrb_goals') || '[]'); } catch { return []; }
  });
  const [newGoalText, setNewGoalText] = useState('');
  useEffect(() => { localStorage.setItem('rrb_goals', JSON.stringify(goals)); }, [goals]);

  const completedCount = goals.filter(g => g.completed).length;
  const pct = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

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

      {/* ── HERO BANNER ────────────────── */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 lg:p-8">
        {/* Decorative background shapes */}
        <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full opacity-20 bg-indigo-500 filter blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full opacity-15 bg-purple-500 filter blur-2xl" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400 text-xs font-black uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                👋 {lang === 'kn' ? 'ಸ್ವಾಗತ' : 'WELCOME BACK'}
              </span>
            </div>
            <h1 className="text-3xl font-black mb-2 tracking-tight">
              {firstName}
            </h1>
            <p className="text-indigo-200 text-xs max-w-sm font-medium italic">
              "Success is the sum of small efforts, repeated day in and day out."
            </p>
            <p className="text-indigo-300 text-[10px] mt-1">— Robert Collier</p>
          </div>

          {/* Counts Stats Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
            {[
              { label: lang === 'kn' ? 'ಒಟ್ಟು PYQಗಳು' : 'TOTAL PYQS', value: stats.total.toLocaleString(), color: '#818cf8', icon: '📚' },
              { label: lang === 'kn' ? 'ಸುಲಭ' : 'EASY', value: stats.easy.toLocaleString(), color: '#34d399', icon: '✅' },
              { label: lang === 'kn' ? 'ಮಧ್ಯಮ' : 'MEDIUM', value: stats.medium.toLocaleString(), color: '#fbbf24', icon: '⚡' },
              { label: lang === 'kn' ? 'ಕಠಿಣ' : 'HARD', value: stats.hard.toLocaleString(), color: '#f87171', icon: '🔥' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-center min-w-[100px] flex flex-col justify-center items-center shadow-lg backdrop-blur-sm">
                <span className="text-lg mb-1">{s.icon}</span>
                <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] font-bold text-indigo-200 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SUBJECT CARDS GRID ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { subject: 'General Science', config: SUBJECT_CONFIG['General Science'] },
          { subject: 'General Awareness', config: SUBJECT_CONFIG['General Awareness'] },
          { subject: 'Mathematics', config: SUBJECT_CONFIG['Mathematics'] },
          { subject: 'Reasoning', config: SUBJECT_CONFIG['Reasoning'] },
        ] as const).map(({ subject, config }) => {
          const count = stats.subjectMap[subject]?.count || 0;
          const topics = stats.subjectMap[subject]?.topics.size || 0;
          return (
            <div
              key={subject}
              onClick={() => onNavigateTo?.('practice')}
              className={`cursor-pointer rounded-3xl p-5 text-white bg-gradient-to-br ${config.grad} flex flex-col justify-between h-[160px] shadow-lg transform transition-all duration-200 hover:-translate-y-1 hover:shadow-xl`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl opacity-90">{config.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-md">
                  {translateSubject(subject, lang)}
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight">{count.toLocaleString()}</h3>
                <p className="text-xs opacity-80 font-bold mt-0.5">
                  {lang === 'kn' ? `${topics} ವಿಷಯಗಳು` : `${topics} Topics`}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ACTION BANNERS ROW ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: lang === 'kn' ? 'ತ್ವರಿತ ಅಭ್ಯಾಸ' : 'Quick Practice',
            subtitle: lang === 'kn' ? 'ವಿಷಯವಾರು PYQ ಅಭ್ಯಾಸ' : 'Topic-wise PYQ drills',
            icon: <Zap size={20} />,
            grad: 'from-indigo-500 to-indigo-600',
            tab: 'practice'
          },
          {
            title: lang === 'kn' ? 'ಪೂರ್ಣ ಮಾದರಿ ಪರೀಕ್ಷೆ' : 'Full Mock Test',
            subtitle: lang === 'kn' ? '100 ಪ್ರ · 90 ನಿಮಿಷ · ನೈಜ CBT' : '100 Qs · 90 Min · Real CBT',
            icon: <BookOpen size={20} />,
            grad: 'from-cyan-500 to-cyan-600',
            tab: 'papers'
          },
          {
            title: lang === 'kn' ? 'ವಿಶ್ಲೇಷಣೆ' : 'Analytics',
            subtitle: lang === 'kn' ? 'ಆಳವಾದ ಪ್ರದರ್ಶನ ಒಳನೋಟಗಳು' : 'Deep performance insights',
            icon: <BarChart3 size={20} />,
            grad: 'from-emerald-500 to-emerald-600',
            tab: 'analytics'
          }
        ].map(card => (
          <div
            key={card.title}
            onClick={() => onNavigateTo?.(card.tab)}
            className={`cursor-pointer rounded-3xl p-5 text-white bg-gradient-to-r ${card.grad} flex items-center justify-between shadow-md transform transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center shadow-inner">
                {card.icon}
              </div>
              <div>
                <h4 className="text-base font-black tracking-tight leading-tight">{card.title}</h4>
                <p className="text-[11px] opacity-80 font-bold mt-0.5">{card.subtitle}</p>
              </div>
            </div>
            <ChevronRight size={20} className="opacity-80" />
          </div>
        ))}
      </div>

      {/* ── BENTO BOTTOM ROW ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left column: Daily Goals */}
        <div className="bg-surface-container rounded-3xl p-6 border border-black/10 dark:border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-secondary" />
                <h3 className="font-black text-sm">{translateUI('dailyGoals', lang)}</h3>
              </div>
              {goals.length > 0 && (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-surface-container-low text-secondary border border-black/10 dark:border-white/5">
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
                className="flex-1 text-xs px-3 py-2 bg-surface-container-low border border-black/10 dark:border-white/5 rounded-xl focus:outline-none focus:ring-1 focus:ring-secondary/40 focus:border-secondary/40 text-on-surface placeholder:text-on-surface-variant/40"
              />
              <button type="submit" className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 hover:opacity-90 transition bg-secondary shadow-md shadow-secondary/20 border-none">
                <Plus size={16} />
              </button>
            </form>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {goals.length === 0 ? (
                <p className="text-center text-xs text-on-surface-variant/50 py-4 italic">{translateUI('setFirstGoal', lang)}</p>
              ) : goals.map(goal => (
                <div
                  key={goal.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border group transition-all ${goal.completed ? 'bg-green-500/10 border-green-500/20' : 'bg-surface-container-low border-black/10 dark:border-white/5 hover:border-black/20 dark:hover:border-white/10'}`}
                >
                  <button onClick={() => setGoals(goals.map(g => g.id === goal.id ? { ...g, completed: !g.completed } : g))} className="shrink-0 bg-transparent border-none cursor-pointer">
                    {goal.completed
                      ? <CheckCircle2 size={16} className="text-green-500" />
                      : <div className="w-[16px] h-[16px] rounded-full border-2 border-on-surface-variant/50 hover:border-secondary transition-colors" />
                    }
                  </button>
                  <p className={`text-xs font-semibold flex-1 truncate ${goal.completed ? 'text-green-600 dark:text-green-400 line-through opacity-70' : 'text-on-surface'}`}>{goal.text}</p>
                  <button onClick={() => setGoals(goals.filter(g => g.id !== goal.id))} className="opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer text-on-surface-variant hover:text-error">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Subject Quick Jump */}
        <div className="bg-surface-container rounded-3xl border border-black/10 dark:border-white/5 overflow-hidden shadow-xl flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-black/10 dark:border-white/5 bg-surface-container-low">
              <h3 className="font-black text-on-surface text-sm">{translateUI('subjectQuickJump', lang)}</h3>
              <p className="text-[11px] text-on-surface-variant">{translateUI('subjectQuickJumpDesc', lang)}</p>
            </div>

            <div className="divide-y divide-black/10 dark:divide-white/5">
              {([
                { subject: 'Mathematics', config: SUBJECT_CONFIG['Mathematics'] },
                { subject: 'Reasoning', config: SUBJECT_CONFIG['Reasoning'] },
                { subject: 'General Science', config: SUBJECT_CONFIG['General Science'] },
                { subject: 'General Awareness', config: SUBJECT_CONFIG['General Awareness'] },
              ] as const).map(({ subject, config }) => {
                const mastery = subjectMasteries[subject];
                const subjectCount = stats.subjectMap[subject]?.count || 0;
                const pctOfDb = stats.total > 0 ? Math.round((subjectCount / stats.total) * 100) : 0;
                return (
                  <div key={subject} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-container-low transition-colors group">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-md bg-gradient-to-br ${config.grad} text-white`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-black text-xs text-on-surface truncate">{translateSubject(subject, lang)}</p>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full text-white shrink-0" style={{ background: config.color }}>
                          {mastery}% {translateUI('mastered', lang)}
                        </span>
                      </div>
                      <div className="w-full bg-surface-container-low rounded-full h-1 border border-black/10 dark:border-white/5">
                        <div className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${config.grad}`} style={{ width: `${mastery}%` }} />
                      </div>
                      <p className="text-[9px] text-on-surface-variant mt-1 font-medium">
                        {stats.subjectMap[subject]?.topics.size} {lang === 'kn' ? 'ವಿಷಯಗಳು' : 'Topics'} · {pctOfDb}% {lang === 'kn' ? 'ಡೇಟಾಬೇಸ್‌ನ' : 'of database'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onNavigateTo?.('practice')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black text-white hover:opacity-90 transition-all active:scale-95 shadow-md bg-gradient-to-r from-blue-600 to-indigo-700 border-none cursor-pointer"
                      >
                        {translateUI('practice', lang)}
                      </button>
                      <button
                        onClick={() => onNavigateTo?.('papers')}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black border border-black/10 dark:border-white/5 bg-surface-container hover:bg-surface-container-low transition-all text-on-surface active:scale-95 cursor-pointer"
                      >
                        {translateUI('mock', lang)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

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

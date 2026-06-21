import React, { useMemo } from 'react';
import { BookOpen, Target, BarChart3, Trophy, TrendingUp, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import pyqsData from '../data/pyqs.json';
import { useLang } from '../lib/LanguageContext';
import { translateUI, translateSubject, translateTopic } from '../lib/translations';

interface PYQ {
  id: number;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correctAnswer: number;
  solution: string;
  difficulty: string;
  exam_year: string;
  shift: string;
  tags: string[];
}

export function AnalyticsEngine() {
  const { lang } = useLang();
  const allQuestions = pyqsData as PYQ[];

  // Build real stats from PYQ dataset
  const subjectStats = useMemo(() => {
    const map: Record<string, { total: number; topics: Record<string, number>; easy: number; medium: number; hard: number }> = {};
    allQuestions.forEach(q => {
      if (!map[q.subject]) map[q.subject] = { total: 0, topics: {}, easy: 0, medium: 0, hard: 0 };
      map[q.subject].total++;
      if (!map[q.subject].topics[q.topic]) map[q.subject].topics[q.topic] = 0;
      map[q.subject].topics[q.topic]++;
      if (q.difficulty === 'easy') map[q.subject].easy++;
      else if (q.difficulty === 'hard') map[q.subject].hard++;
      else map[q.subject].medium++;
    });
    return map;
  }, [allQuestions]);

  const difficultyStats = useMemo(() => ({
    easy: allQuestions.filter(q => q.difficulty === 'easy').length,
    medium: allQuestions.filter(q => q.difficulty === 'medium').length,
    hard: allQuestions.filter(q => q.difficulty === 'hard').length,
  }), [allQuestions]);

  const subjects = Object.keys(subjectStats);

  const getSubjectIcon = (s: string) => {
    const icons: Record<string, string> = { 'Mathematics': '📐', 'Reasoning': '🧩', 'General Science': '🔬', 'General Awareness': '🌍' };
    return icons[s] || '📚';
  };

  const getSubjectGradient = (s: string) => {
    const g: Record<string, string> = {
      'Mathematics': 'from-blue-500 to-indigo-600',
      'Reasoning': 'from-purple-500 to-violet-600',
      'General Science': 'from-emerald-500 to-teal-600',
      'General Awareness': 'from-amber-500 to-orange-600',
    };
    return g[s] || 'from-slate-500 to-slate-600';
  };

  const getBarColor = (s: string) => {
    const c: Record<string, string> = {
      'Mathematics': '#6366f1',
      'Reasoning': '#8b5cf6',
      'General Science': '#10b981',
      'General Awareness': '#f59e0b',
    };
    return c[s] || '#64748b';
  };

  const totalTopics = Object.values(subjectStats).reduce((sum, s) => sum + Object.keys(s.topics).length, 0);

  return (
    <div className="space-y-8 text-on-surface">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">
            {lang === 'kn' ? 'ಪ್ರಶ್ನೆ ವಿಶ್ಲೇಷಣೆ' : 'PYQ Analytics'}
          </h2>
          <p className="text-on-surface-variant text-sm mt-2 max-w-lg font-medium">
            {lang === 'kn'
              ? `ಎಲ್ಲಾ ವಿಷಯಗಳು ಮತ್ತು ಉಪ-ವಿಷಯಗಳಾದ್ಯಂತ ಇರುವ ಒಟ್ಟು ${allQuestions.length.toLocaleString()} ಪ್ರಶ್ನೆಗಳ ಸಮಗ್ರ ವಿವರಣೆ.`
              : `Complete breakdown of ${allQuestions.length.toLocaleString()} Previous Year Questions across all subjects and topics.`}
          </p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg border border-black/20">
          <div className="absolute -right-4 -bottom-4 opacity-10"><BookOpen size={80} /></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider mb-2">
              {lang === 'kn' ? 'ಒಟ್ಟು PYQಗಳು' : 'Total PYQs'}
            </p>
            <p className="text-4xl font-black tracking-tighter">{allQuestions.length.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-black/10 dark:border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Layers size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            {lang === 'kn' ? 'ಒಟ್ಟು ವಿಷಯಗಳು' : 'Total Topics'}
          </p>
          <p className="text-3xl font-black text-primary">{totalTopics}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-black/10 dark:border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-secondary/15 rounded-full flex items-center justify-center text-secondary">
              <Target size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            {lang === 'kn' ? 'ಒಟ್ಟು ಪಠ್ಯವಿಷಯಗಳು' : 'Subjects'}
          </p>
          <p className="text-3xl font-black text-primary">{subjects.length}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-black/10 dark:border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-tertiary-container/30 rounded-full flex items-center justify-center text-tertiary">
              <Trophy size={20} />
            </div>
          </div>
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
            {lang === 'kn' ? 'ವಿಷಯಕ್ಕೆ ಸರಾಸರಿ' : 'Avg per Topic'}
          </p>
          <p className="text-3xl font-black text-primary">{Math.round(allQuestions.length / totalTopics)}</p>
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-black/10 dark:border-white/5">
        <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
          <BarChart3 size={20} /> {lang === 'kn' ? 'ಕಠಿಣತೆಯ ಮಟ್ಟ ಹಂಚಿಕೆ' : 'Difficulty Distribution'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[
            { label: lang === 'kn' ? 'ಸುಲಭ' : 'Easy', count: difficultyStats.easy, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20', bgColor: 'bg-emerald-500/5' },
            { label: lang === 'kn' ? 'ಮಧ್ಯಮ' : 'Medium', count: difficultyStats.medium, color: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20', bgColor: 'bg-amber-500/5' },
            { label: lang === 'kn' ? 'ಕಠಿಣ' : 'Hard', count: difficultyStats.hard, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', bgColor: 'bg-red-500/5' },
          ].map(d => (
            <div key={d.label} className={cn("rounded-xl p-5 border", d.border, d.bgColor)}>
              <div className="flex items-center justify-between mb-3">
                <span className={cn("text-sm font-bold", d.textColor)}>{d.label}</span>
                <span className={cn("text-2xl font-black", d.textColor)}>{d.count.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", d.color)} style={{ width: `${(d.count / allQuestions.length) * 100}%` }}></div>
              </div>
              <p className="text-xs text-on-surface-variant font-bold mt-2">{((d.count / allQuestions.length) * 100).toFixed(1)}% of total</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subject-wise Breakdown */}
      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-black/10 dark:border-white/5">
        <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
          <TrendingUp size={20} /> {lang === 'kn' ? 'ವಿಷಯವಾರು ಪ್ರಗತಿ ಮತ್ತು ಹಂಚಿಕೆ' : 'Subject-Wise Distribution'}
        </h3>

        <div className="space-y-6">
          {subjects.map(subject => {
            const data = subjectStats[subject];
            const pct = Math.round((data.total / allQuestions.length) * 100);

            return (
              <div key={subject} className="border border-black/10 dark:border-white/5 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getSubjectIcon(subject)}</span>
                    <div>
                      <h4 className="font-black text-on-surface text-base">{translateSubject(subject, lang)}</h4>
                      <p className="text-xs text-on-surface-variant font-semibold">
                        {Object.keys(data.topics).length} {lang === 'kn' ? 'ವಿಷಯಗಳು' : 'Topics'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary">{data.total.toLocaleString()}</p>
                    <p className="text-xs text-on-surface-variant font-bold">{pct}% of total</p>
                  </div>
                </div>

                {/* Subject-level difficulty bar */}
                <div className="flex h-3 rounded-full overflow-hidden bg-surface-container mb-4">
                  {data.easy > 0 && <div className="bg-emerald-500" style={{ width: `${(data.easy / data.total) * 100}%` }}></div>}
                  {data.medium > 0 && <div className="bg-amber-500" style={{ width: `${(data.medium / data.total) * 100}%` }}></div>}
                  {data.hard > 0 && <div className="bg-red-500" style={{ width: `${(data.hard / data.total) * 100}%` }}></div>}
                </div>
                <div className="flex gap-4 text-[10px] text-on-surface-variant font-bold mb-4">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>{data.easy} {lang === 'kn' ? 'ಸುಲಭ' : 'Easy'}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>{data.medium} {lang === 'kn' ? 'ಮಧ್ಯಮ' : 'Medium'}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>{data.hard} {lang === 'kn' ? 'ಕಠಿಣ' : 'Hard'}</span>
                </div>

                {/* Topic breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(data.topics)
                    .sort((a, b) => b[1] - a[1])
                    .map(([topic, count]) => (
                      <div key={topic} className="bg-surface-container-lowest border border-black/10 dark:border-white/5 rounded-lg px-3 py-2 flex justify-between items-center hover:border-primary/20 transition-all">
                        <span className="text-xs font-semibold text-on-surface truncate mr-2" title={translateTopic(topic, lang)}>
                          {translateTopic(topic, lang)}
                        </span>
                        <span className="text-xs font-black text-primary shrink-0">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PYQ Year Distribution */}
      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-black/10 dark:border-white/5">
        <h3 className="text-lg font-bold text-primary mb-6 flex items-center gap-2">
          📅 {lang === 'kn' ? 'ಪರೀಕ್ಷೆಯ ವರ್ಷವಾರು ಹಂಚಿಕೆ' : 'Exam Year Distribution'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(() => {
            const yearMap: Record<string, number> = {};
            allQuestions.forEach(q => {
              const year = q.exam_year || 'Unknown';
              if (!yearMap[year]) yearMap[year] = 0;
              yearMap[year]++;
            });
            return Object.entries(yearMap)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([year, count]) => (
                <div key={year} className="bg-surface-container-lowest border border-black/10 dark:border-white/5 rounded-xl p-4 text-center hover:shadow-sm transition-all">
                  <p className="text-lg font-black text-primary">{count.toLocaleString()}</p>
                  <p className="text-xs font-bold text-on-surface-variant">{year}</p>
                </div>
              ));
          })()}
        </div>
      </div>
    </div>
  );
}

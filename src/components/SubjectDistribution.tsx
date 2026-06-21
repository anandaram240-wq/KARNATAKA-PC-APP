import React, { useState, useMemo } from 'react';
import { BookOpen, ChevronRight, ChevronDown } from 'lucide-react';
import pyqsData from '../data/pyqs.json';
import { cn } from '../lib/utils';

interface PYQ {
  id: number;
  subject: string;
  topic: string;
  sub_topic?: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

const SUBJECT_CONFIG: Record<string, { gradient: string; color: string; border: string; bg: string; icon: string }> = {
  'Mathematics': {
    gradient: 'from-blue-500 to-indigo-600',
    color: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-900',
    bg: 'bg-blue-500/5',
    icon: '📐'
  },
  'Reasoning': {
    gradient: 'from-purple-500 to-violet-600',
    color: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-100 dark:border-purple-900',
    bg: 'bg-purple-500/5',
    icon: '🧩'
  },
  'General Science': {
    gradient: 'from-emerald-500 to-teal-600',
    color: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-900',
    bg: 'bg-emerald-500/5',
    icon: '🔬'
  },
  'General Awareness': {
    gradient: 'from-amber-500 to-orange-600',
    color: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-900',
    bg: 'bg-amber-500/5',
    icon: '🌍'
  }
};

export function SubjectDistribution() {
  const allQuestions = pyqsData as PYQ[];
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Group questions by subject -> topic -> sub_topic
  const distribution = useMemo(() => {
    const dist: Record<string, { count: number; topics: Record<string, { count: number; sub_topics: Record<string, number> }> }> = {};

    allQuestions.forEach(q => {
      const subj = q.subject;
      const topic = q.topic;
      const st = q.sub_topic || 'General';

      if (!dist[subj]) dist[subj] = { count: 0, topics: {} };
      dist[subj].count++;

      if (!dist[subj].topics[topic]) dist[subj].topics[topic] = { count: 0, sub_topics: {} };
      dist[subj].topics[topic].count++;
      dist[subj].topics[topic].sub_topics[st] = (dist[subj].topics[topic].sub_topics[st] || 0) + 1;
    });
    return dist;
  }, [allQuestions]);

  const totalQuestions = allQuestions.length;

  return (
    <div className="bg-surface-container rounded-2xl shadow-sm border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="bg-white/5 px-6 py-5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/10 border border-secondary/20 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-secondary" />
            </div>
            <div>
              <h3 className="text-on-surface font-black text-lg">Subject & Topic Weightings</h3>
              <p className="text-on-surface-variant text-xs mt-0.5">Syllabus Topic Ratios — Click any subject to explore weightings</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-white font-black text-xl">100%</span>
            <span className="text-on-surface-variant text-xs ml-1 font-bold">Covered</span>
          </div>
        </div>
      </div>

      {/* Subject bars */}
      <div className="p-6 space-y-4">
        {Object.entries(distribution)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([subject, subjData]) => {
            const cfg = SUBJECT_CONFIG[subject] || SUBJECT_CONFIG['General Awareness'];
            const pct = Math.round((subjData.count / totalQuestions) * 100);
            const isExpanded = expandedSubject === subject;
            const topicsSorted = Object.entries(subjData.topics).sort((a, b) => b[1].count - a[1].count);

            return (
              <div key={subject} className={cn('rounded-xl border transition-all duration-300', isExpanded ? `${cfg.border} bg-white/5 shadow-md` : 'border-white/5 hover:border-white/10')}>
                {/* Subject Row */}
                <button
                  className={cn('w-full text-left p-4 flex items-center gap-4 rounded-xl transition-colors', isExpanded ? 'bg-white/5' : 'hover:bg-white/5')}
                  onClick={() => {
                    setExpandedSubject(isExpanded ? null : subject);
                    setExpandedTopic(null);
                  }}
                >
                  {/* Icon */}
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shrink-0 shadow-md', cfg.gradient)}>
                    {cfg.icon}
                  </div>

                  {/* Name + bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-white text-sm">{subject}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('font-black text-base', cfg.color)}>{pct}%</span>
                        <span className="text-on-surface-variant text-xs font-semibold">Weight</span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', cfg.gradient)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-on-surface-variant font-bold">{topicsSorted.length} Chapters</span>
                      <span className="text-xs text-white/10">•</span>
                      <span className="text-xs text-on-surface-variant">
                        Top Chapter: {topicsSorted[0]?.[0]} ({Math.round((topicsSorted[0]?.[1].count / subjData.count) * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
                  <div className="shrink-0 transition-transform duration-300">
                    {isExpanded ? <ChevronDown size={18} className="text-on-surface-variant" /> : <ChevronRight size={18} className="text-on-surface-variant/40" />}
                  </div>
                </button>

                {/* Topics Dropdown */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {topicsSorted.map(([topic, topicData]) => {
                        const topicPct = Math.round((topicData.count / subjData.count) * 100);
                        const topicKey = `${subject}__${topic}`;
                        const isTopicExpanded = expandedTopic === topicKey;
                        const subtopicsSorted = Object.entries(topicData.sub_topics).sort((a, b) => b[1] - a[1]);

                        return (
                          <div key={topic} className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
                            <button
                              className="w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/5 transition-colors"
                              onClick={() => setExpandedTopic(isTopicExpanded ? null : topicKey)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-white truncate">{topic}</span>
                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <span className={cn('text-xs font-bold', cfg.color)}>{topicPct}%</span>
                                  </div>
                                </div>
                                <div className="h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full bg-gradient-to-r', cfg.gradient)}
                                    style={{ width: `${topicPct}%` }}
                                  />
                                </div>
                              </div>
                              {subtopicsSorted.length > 0 && (
                                <span className="text-on-surface-variant shrink-0">
                                  {isTopicExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </span>
                              )}
                            </button>

                            {/* Sub-topics */}
                            {isTopicExpanded && subtopicsSorted.length > 0 && (
                              <div className="px-3 pb-2 pt-1 border-t border-white/5 bg-white/5">
                                {subtopicsSorted.map(([st, stCount]) => (
                                  <div key={st} className="flex items-center justify-between py-1">
                                    <span className="text-[10px] text-on-surface-variant truncate flex-1">{st}</span>
                                    <span className={cn('text-[10px] font-bold ml-2 shrink-0', cfg.color)}>{Math.round((stCount / topicData.count) * 100)}%</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Footer Legend */}
      <div className="px-6 py-4 bg-white/5 border-t border-white/5">
        <div className="flex flex-wrap items-center gap-4 text-xs text-on-surface-variant">
          <span className="font-semibold text-white">Exam Syllabus Coverage:</span>
          {['2014', '2016', '2018', '2020', '2021', '2024'].map(yr => (
            <span key={yr} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
              {yr} Papers
            </span>
          ))}
          <span className="ml-auto text-on-surface-variant">Based on actual KSP exam syllabus weightings</span>
        </div>
      </div>
    </div>
  );
}

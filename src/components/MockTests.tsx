import React, { useState, useMemo, useEffect } from 'react';
import { Play, Clock, FileText, CheckCircle2, AlertCircle, Award, BookOpen, Target, Zap, BarChart3, ChevronRight, Layers, Lock, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import { TakeTest } from './TakeTest';
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

interface MockConfig {
  id: string;
  type: 'full' | 'subject' | 'topic';
  title: string;
  duration: number; // minutes
  questionCount: number;
  subject?: string;
  topic?: string;
  questions: PYQ[];
}

// Seeded random helper
function getSeededRandom(seed: number) {
  return function() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// Shuffles an array with a seeded random generator
function shuffleSeeded<T>(arr: T[], rand: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Scrambles option ordering and scales numbers for mathematical/reasoning variations
function mutateMockQuestions(questions: PYQ[], testIndex: number): PYQ[] {
  const rand = getSeededRandom(testIndex * 999);
  return questions.map(q => {
    // Clone question and options to prevent modifying original pyqs.json database!
    const qCopy = { ...q, options: [...q.options] };
    const originalCorrectText = qCopy.options[qCopy.correctAnswer];

    // Shuffle options using seeded random
    const optIndices = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [optIndices[i], optIndices[j]] = [optIndices[j], optIndices[i]];
    }

    const newOptions = optIndices.map(i => qCopy.options[i]);
    const newCorrectIdx = newOptions.indexOf(originalCorrectText);

    qCopy.options = newOptions;
    if (newCorrectIdx !== -1) {
      qCopy.correctAnswer = newCorrectIdx;
    }

    // Dynamic numerical mutations for math/reasoning questions
    if ((qCopy.subject === 'Mathematics' || qCopy.subject === 'Reasoning') && rand() < 0.6) {
      // Swapping names
      qCopy.question = qCopy.question
        .replace(/Ramesh/g, 'Suresh')
        .replace(/Suresh/g, 'Naresh')
        .replace(/Gopal/g, 'Vijay')
        .replace(/A and B/g, 'P and Q')
        .replace(/B and C/g, 'Q and R');

      // Math scale multiplication (mutates even numbers between 2 and 200 by a factor of 2)
      const scale = 2;
      qCopy.question = qCopy.question.replace(/\b\d+\b/g, (match) => {
        const num = parseInt(match);
        if (num > 1 && num < 200 && num % 2 === 0) {
          return String(num * scale);
        }
        return match;
      });

      qCopy.options = qCopy.options.map(opt => {
        return opt.replace(/\b\d+\b/g, (match) => {
          const num = parseInt(match);
          if (num > 1 && num < 200 && num % 2 === 0) {
            return String(num * scale);
          }
          return match;
        });
      });
    }

    return qCopy;
  });
}

export function MockTests() {
  const { lang, questions: langQuestions } = useLang();
  const allQuestions = (langQuestions.length > 0 ? langQuestions : pyqsData) as PYQ[];
  const [activeMode, setActiveMode] = useState<'subject' | 'topic' | 'full'>('full');
  const [activeMock, setActiveMock] = useState<MockConfig | null>(null);
  
  // Storage for completed mock test metrics
  const [completedMocks, setCompletedMocks] = useState<Record<string, { score: number; total: number; timestamp: number }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('ksp_completed_mocks') || '{}');
    } catch {
      return {};
    }
  });

  // Save completion history to local storage
  const saveCompletedMock = (mockId: string, score: number, total: number) => {
    const updated = {
      ...completedMocks,
      [mockId]: { score, total, timestamp: Date.now() }
    };
    setCompletedMocks(updated);
    localStorage.setItem('ksp_completed_mocks', JSON.stringify(updated));

    // Increase user ELO rating point bonuses
    try {
      const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
      const email: string = u?.email || 'guest';
      const prefix = email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '');
      const roadmapKey = `${prefix}__ksp_roadmap_v4`;
      const profile = JSON.parse(localStorage.getItem(roadmapKey) || '{"xp":0}');
      profile.xp = (profile.xp || 0) + 150; // +150 XP per mock exam completion
      localStorage.setItem(roadmapKey, JSON.stringify(profile));
    } catch {}
  };

  // Topic selector states
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [selectedTopic, setSelectedTopic] = useState('');

  // Syllabus mapping
  const syllabus = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    allQuestions.forEach(q => {
      if (!map[q.subject]) map[q.subject] = {};
      if (!map[q.subject][q.topic]) map[q.subject][q.topic] = 0;
      map[q.subject][q.topic]++;
    });
    return map;
  }, [allQuestions]);

  const subjects = Object.keys(syllabus);

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

  // Generate mock test configurations (up to 100+ series)
  const generateMock = (type: 'full' | 'subject' | 'topic', index: number = 1, subject?: string, topic?: string): MockConfig => {
    let questions: PYQ[] = [];
    let title = '';
    let duration = 90;

    if (type === 'full') {
      title = `KSP Full Mock Test #${index}`;
      duration = 90;

      // Seeded shuffle to pull 25 questions from each of the 4 subjects
      const rand = getSeededRandom(index * 1000);
      subjects.forEach(s => {
        const subjectQs = allQuestions.filter(q => q.subject === s);
        const shuffled = shuffleSeeded(subjectQs, rand);
        questions.push(...shuffled.slice(0, 25));
      });

      // Shuffled combinations mutated for fresh numbers
      const finalRand = getSeededRandom(index * 2000);
      questions = shuffleSeeded(questions, finalRand);
      questions = mutateMockQuestions(questions, index);
    } else if (type === 'subject' && subject) {
      title = `${subject} Mastery Test`;
      duration = 30;
      const subjectQs = allQuestions.filter(q => q.subject === subject);
      const rand = getSeededRandom(index * 3000);
      questions = shuffleSeeded(subjectQs, rand).slice(0, 25);
    } else if (type === 'topic' && subject && topic) {
      title = `${topic} Topic Test`;
      duration = 20;
      const topicQs = allQuestions.filter(q => q.subject === subject && q.topic === topic);
      const rand = getSeededRandom(index * 4000);
      const count = Math.min(20, topicQs.length);
      questions = shuffleSeeded(topicQs, rand).slice(0, count);
    }

    return {
      id: `${type}-${subject || 'full'}-${topic || 'all'}-test-${index}`,
      type,
      title,
      duration,
      questionCount: questions.length,
      subject,
      topic,
      questions,
    };
  };

  const startMock = (type: 'full' | 'subject' | 'topic', index: number = 1, subject?: string, topic?: string) => {
    const mock = generateMock(type, index, subject, topic);
    setActiveMock(mock);
  };

  const handleComplete = (score: number) => {
    if (activeMock) {
      saveCompletedMock(activeMock.id, score, activeMock.questions.length);
    }
  };

  if (activeMock) {
    return (
      <TakeTest
        title={activeMock.title}
        questions={activeMock.questions}
        duration={activeMock.duration}
        subject={activeMock.subject}
        onClose={() => setActiveMock(null)}
        onComplete={handleComplete}
      />
    );
  }

  // Calculate statistics percentages
  const totalCompleted = Object.keys(completedMocks).length;
  const avgAccuracy = totalCompleted > 0
    ? Math.round(Object.values(completedMocks).reduce((sum, m) => sum + (m.score / m.total) * 100, 0) / totalCompleted)
    : 0;

  // Filter full mock tests listing
  const mockIndices = Array.from({ length: 100 }, (_, i) => i + 1);

  return (
    <div className="space-y-8 text-on-surface">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black text-primary tracking-tight">CBT Test Series (ಅಭ್ಯಾಸ ಪರೀಕ್ಷೆಗಳು)</h2>
        <p className="text-on-surface-variant text-sm mt-1 max-w-lg font-medium">
          {lang === 'kn' 
            ? 'ವಿಷಯವಾರು ಹಾಗೂ ಪೂರ್ಣ ಪ್ರಮಾಣದ KSP ಮಾದರಿ ಪರೀಕ್ಷೆಗಳು (2014-2024).' 
            : 'Complete KSP Constable & Sub-Inspector Previous Year Questions (2014–2024) mapped into dynamic mock test series.'}
        </p>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Predicted Score Card */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 relative overflow-hidden shadow-lg border border-black/20">
          <div className="absolute -right-4 -bottom-4 opacity-10"><Award size={80} /></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider mb-1">
              {lang === 'kn' ? 'ಮುನ್ಸೂಚಿತ ಸ್ಕೋರ್' : 'Predicted Score'}
            </p>
            <p className="text-4xl font-black tracking-tighter">-- / 100</p>
            <p className="text-xs text-indigo-200/70 mt-2">
              {totalCompleted > 0 
                ? `${lang === 'kn' ? 'ನಿಮ್ಮ ನಿಖರತೆ ಆಧಾರಿತ:' : 'Based on accuracy:'} ${avgAccuracy}%` 
                : (lang === 'kn' ? 'ಮೌಲ್ಯಮಾಪನ ಪಡೆಯಲು ಪರೀಕ್ಷೆ ಬರೆಯಿರಿ' : 'Take mocks to calculate accuracy')}
            </p>
          </div>
        </div>

        {/* Mocks Completed Card with Circle Progress */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-black/10 dark:border-white/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  className="text-surface-container-high"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  className="text-primary"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - Math.min(totalCompleted, 100) / 100)}
                />
              </svg>
              <span className="absolute text-sm font-black text-on-surface">{totalCompleted}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                {lang === 'kn' ? 'ಪೂರ್ಣಗೊಂಡ ಮಾದರಿ ಪರೀಕ್ಷೆಗಳು' : 'Completed Mocks'}
              </p>
              <p className="text-sm font-bold text-on-surface-variant/80">
                {lang === 'kn' ? 'ಗುರಿ: ೧೦೦ ಪರೀಕ್ಷೆಗಳು' : 'Goal: 100 Mocks'}
              </p>
            </div>
          </div>
        </div>

        {/* Total PYQs Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-black/10 dark:border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              {lang === 'kn' ? 'ಲಭ್ಯವಿರುವ ಒಟ್ಟು PYQಗಳು' : 'Total PYQs Available'}
            </p>
            <p className="text-2xl font-black text-on-surface">{allQuestions.length.toLocaleString()}</p>
            <p className="text-xs text-on-surface-variant mt-1">2014–2024 Syllabus Mapped</p>
          </div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex bg-surface-container-lowest rounded-2xl p-1.5 w-fit border border-black/10 dark:border-white/5 gap-1.5">
        {([
          { id: 'full' as const, label: lang === 'kn' ? '೧೦೦+ ಪೂರ್ಣ ಮಾದರಿ ಸರಣಿ' : '100+ Full Mock Series', icon: Target },
          { id: 'subject' as const, label: lang === 'kn' ? 'ವಿಷಯವಾರು ಪರೀಕ್ಷೆಗಳು' : 'Subject Tests', icon: BookOpen },
          { id: 'topic' as const, label: lang === 'kn' ? 'ವಿಷಯವಾರು ಕೌಶಲ್ಯ ಪರೀಕ್ಷೆಗಳು' : 'Topic Tests', icon: Layers },
        ]).map(mode => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={cn(
              "px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border cursor-pointer",
              activeMode === mode.id 
                ? "bg-primary text-white border-primary shadow-sm" 
                : "text-on-surface-variant hover:bg-surface-container bg-surface-container-lowest border-black/10 dark:border-white/5"
            )}
          >
            <mode.icon size={14} />
            {mode.label}
          </button>
        ))}
      </div>

      {/* 100 Full Mock Series */}
      {activeMode === 'full' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-2xl p-6">
            <h3 className="font-black text-on-surface text-base flex items-center gap-2">
              <Target size={18} className="text-secondary" /> KSP Full CBT Exam Series
            </h3>
            <p className="text-xs text-on-surface-variant mt-2 leading-relaxed max-w-xl font-medium">
              {lang === 'kn' 
                ? '೧೦೦ ಪೂರ್ಣ ಪ್ರಮಾಣದ ಪರೀಕ್ಷೆಗಳು. ಗಣಿತ ಮತ್ತು ತಾರ್ಕಿಕ ವಿಷಯಗಳಲ್ಲಿ ನಿಖರ ಪದ್ಧತಿಯ ಪ್ರಶ್ನೆಗಳು.' 
                : '100 structured exam papers covering all subjects in equal proportions. Values are dynamically mutated in Math and Reasoning to test your actual concepts.'}
            </p>
          </div>

          {/* Test cards scrollable grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mockIndices.map(idx => {
              const mockId = `full-full-all-test-${idx}`;
              const record = completedMocks[mockId];
              const isDone = !!record;

              return (
                <div key={idx} className={`bg-surface-container-lowest rounded-2xl p-5 border transition-all ${
                  isDone ? 'border-emerald-500/20 bg-emerald-500/5 shadow-sm' : 'border-black/10 dark:border-white/5 hover:border-primary/20 dark:hover:border-white/10'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-black text-secondary bg-secondary/15 px-2 py-0.5 rounded-full uppercase tracking-wider">Test #{idx}</span>
                    {isDone && <CheckCircle2 className="text-emerald-500" size={16} />}
                  </div>
                  <h4 className="font-black text-sm text-on-surface mb-2 truncate">KSP Full Test #{idx}</h4>
                  
                  <div className="flex items-center gap-3 text-[10px] text-on-surface-variant font-bold mb-5">
                    <span className="flex items-center gap-1"><Clock size={12} /> 90 Min</span>
                    <span className="w-1 h-1 bg-slate-400 dark:bg-slate-700 rounded-full"></span>
                    <span>100 Qs</span>
                  </div>

                  {isDone ? (
                    <div className="space-y-3">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-center">
                        <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">Accuracy</p>
                        <p className="text-sm font-black text-on-surface mt-1 leading-none">
                          {Math.round((record.score / record.total) * 100)}%
                        </p>
                      </div>
                      <button
                        onClick={() => startMock('full', idx)}
                        className="w-full py-2 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-xl text-xs font-bold transition-all border border-black/10 dark:border-white/5 active:scale-95 cursor-pointer"
                      >
                        Retake Exam
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startMock('full', idx)}
                      className="w-full bg-[#1e1b4b] hover:bg-[#312e81] text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md border border-black/10 cursor-pointer"
                    >
                      <Play size={12} fill="currentColor" /> Take Test
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subject Mocks */}
      {activeMode === 'subject' && (
        <div className="space-y-4">
          <h3 className="font-bold text-primary flex items-center gap-2">
            <BookOpen size={18} /> Subject-Wise Practice Tests
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.map(subject => {
              const subjectQs = allQuestions.filter(q => q.subject === subject);
              return (
                <div key={subject} className="bg-surface-container-lowest rounded-2xl overflow-hidden hover:shadow-md transition-all border border-black/10 dark:border-white/5 flex flex-col justify-between group">
                  <div>
                    <div className={cn("h-2 bg-gradient-to-r", getSubjectGradient(subject))}></div>
                    <div className="p-5">
                      <div className="text-3xl mb-3">{getSubjectIcon(subject)}</div>
                      <h4 className="font-black text-on-surface text-base mb-1">{translateSubject(subject, lang)}</h4>
                      <p className="text-[10px] text-on-surface-variant mb-4 font-semibold">
                        {subjectQs.length.toLocaleString()} {lang === 'kn' ? 'ಲಭ್ಯವಿರುವ ಪ್ರಶ್ನೆಗಳು' : 'Available PYQs'}
                      </p>
                      
                      <div className="flex items-center gap-3 text-[10px] text-on-surface-variant font-bold mb-5">
                        <span className="flex items-center gap-1"><Clock size={12} /> 30 Min</span>
                        <span className="w-1 h-1 bg-slate-400 dark:bg-slate-700 rounded-full"></span>
                        <span className="flex items-center gap-1"><FileText size={12} /> 25 Qs</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <button
                      onClick={() => startMock('subject', 1, subject)}
                      className="w-full bg-[#1e1b4b] hover:bg-[#312e81] text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all border border-black/10 cursor-pointer shadow-md shadow-indigo-950/15"
                    >
                      <Play size={12} fill="currentColor" /> {lang === 'kn' ? 'ಪರೀಕ್ಷೆ ಆರಂಭಿಸಿ' : 'Start Mock'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Topic Mocks */}
      {activeMode === 'topic' && (
        <div className="space-y-6">
          <h3 className="font-bold text-primary flex items-center gap-2">
            <Layers size={18} /> Topic-Wise Skill Tests
          </h3>

          {/* Subject Selector */}
          <div className="flex gap-2 flex-wrap">
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => { setSelectedSubject(s); setSelectedTopic(''); }}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border cursor-pointer",
                  selectedSubject === s
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-surface-container-lowest text-on-surface-variant border-black/10 dark:border-white/5 hover:bg-surface-container"
                )}
              >
                <span>{getSubjectIcon(s)}</span>
                {translateSubject(s, lang)}
              </button>
            ))}
          </div>

          {/* Topics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(syllabus[selectedSubject] || {}).map(([topic, count], idx) => {
              const topicQs = allQuestions.filter(q => q.subject === selectedSubject && q.topic === topic);
              return (
                <div key={topic} className="bg-surface-container-lowest rounded-2xl p-5 border border-black/10 dark:border-white/5 hover:border-primary/20 dark:hover:border-white/10 transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h4 className="font-black text-on-surface text-sm truncate" title={translateTopic(topic, lang)}>{translateTopic(topic, lang)}</h4>
                      <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase shrink-0">
                        {topicQs.length} Qs
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] text-on-surface-variant font-bold mb-5">
                      <span className="flex items-center gap-1"><Clock size={12} /> 20 Min</span>
                      <span className="w-1 h-1 bg-slate-400 dark:bg-slate-700 rounded-full"></span>
                      <span>Syllabus Target</span>
                    </div>
                  </div>

                  <button
                    onClick={() => startMock('topic', idx + 1, selectedSubject, topic)}
                    className="w-full bg-[#1e1b4b] hover:bg-[#312e81] text-white py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all border border-black/10 cursor-pointer"
                  >
                    <Play size={12} fill="currentColor" /> {lang === 'kn' ? 'ಅಭ್ಯಾಸ ಆರಂಭಿಸಿ' : 'Practice Test'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

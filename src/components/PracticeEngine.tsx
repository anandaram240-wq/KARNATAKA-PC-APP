import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  BookOpen, ChevronRight, CheckCircle2, XCircle,
  Search, Zap, Filter, Pencil, X, Save, CheckCircle, Flag
} from 'lucide-react';
import { SolutionDisplay } from './SolutionDisplay';
import { cn } from '../lib/utils';
import { cleanText } from '../lib/cleanText';
import pyqsData from '../data/pyqs.json';
import { useLang } from '../lib/LanguageContext';
import { translateUI, translateSubject, translateTopic } from '../lib/translations';
import {
  startLiveSession,
  trackAnswer,
  finalizeSession,
} from '../lib/performanceEngine';
import { toggleFlag } from '../lib/confusionTracker';

/** Fisher-Yates shuffle (mutates and returns arr) */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface PYQ {
  id: number;
  subject: string;
  topic: string;
  sub_topic?: string;
  branch?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  solution: string;
  difficulty: string;
  exam_year: string;
  exam_date?: string;
  shift: string;
  source?: string;
  tags: string[];
}

// ── Topic/sub_topic map for Maths & Reasoning ──────────────────────
const TOPIC_MAP: Record<string, Record<string, string[]>> = {
  Mathematics: {
    'Number System':        ['Prime Numbers','Divisibility','Remainders','Digits','Factors','Consecutive Numbers','Number Properties','HCF & LCM','Fractions'],
    'LCM & HCF':           ['HCF','LCM','HCF & LCM','Bell/Time Problem'],
    'Simplification':      ['BODMAS','Simplification','Evaluate'],
    'Percentage':          ['Basic %','% Change','Election','Successive %','Population','Mixture'],
    'Profit & Loss':       ['Basic P&L','Discount & Marked Price','Successive Discount','Chain Sale','Dishonest Dealings','Buy & Get Free'],
    'Simple Interest':     ['Basic SI','Exact Days SI','Finding Principal','Finding Rate'],
    'Compound Interest':   ['Basic CI','CI vs SI Difference','Half-Yearly Compounding','Quarterly Compounding'],
    'Average':             ['Basic Average','Change in Average','Cricket Average','Weighted Average'],
    'Ratio & Proportion':  ['Division in Ratio','Proportional','Income-Saving Ratio','Variation'],
    'Ages':                ['Two Person Ages','Sum of Ages','Ratio of Ages','Past & Future Ages','Multiplied Age'],
    'Speed Distance & Time':['Basic STD','Trains','Relative Speed','Average Speed','Boats & Streams'],
    'Time & Work':         ['Efficiency','Multiple of Work','Work & Wages','Pipes & Work Combined'],
    'Pipes & Cisterns':    ['Two Pipe','Three Pipe','Leak Problems'],
    'Mensuration':         ['Area','Perimeter','Volume','Surface Area','Cylinder','Cone','Sphere','Cube & Cuboid'],
    'Geometry':            ['Triangles','Quadrilaterals','Circles','Angles & Lines','Polygon Properties'],
    'Trigonometry':        ['Computation','Heights & Distances','Identities'],
    'Algebra':             ['Expressions','Quadratic','Linear Equations (Word)','Missing Value','Commercial Algebra'],
    'Squares & Cube Roots':['Square Roots','Cube Roots','Perfect Squares'],
    'Statistics':          ['Mean','Median','Mode','Frequency Distribution'],
    'Data Interpretation': ['Pie Chart','Bar Graph','Line Graph','Table/Graph'],
    'Mixture & Alligation':['Basic Mixture','Alligation Method','Concentration Mix'],
  },
  Reasoning: {
    'Number Series':           ['Arithmetic Progression','Geometric Progression','Prime Series','Mixed Series','Counting Series'],
    'Letter Series':           ['Mixed','Backward Series','Skip Series','Forward Series'],
    'Analogy':                 ['Word Analogy','Number Analogy','Letter Analogy','Mixed Analogy'],
    'Coding-Decoding':         ['Word Coding','Number Coding','Letter Coding'],
    'Mathematical Operations': ['Symbol Substitution','Operator Replacement','BODMAS'],
    'Classification & Odd One Out': ['Word Odd One Out','Number Odd One Out'],
    'Syllogism':               ['Two Statement','Three Statement','Possibility Cases'],
    'Statement & Conclusion':  ['Assumptions','Arguments','Conclusions'],
    'Blood Relations':         ['Direct Relation','Photo Based','Family Tree'],
    'Direction Sense':         ['Linear Direction','Point Direction','Town Direction','Shadow Problems'],
    'Seating Arrangement':     ['Linear','Circular'],
    'Ranking & Order':         ['Row Position','Rank Order','Number Arrangement','Vertical Stack'],
    'Venn Diagram':            ['Set Relations'],
    'Mirror & Water Image':    ['Lateral Mirror','Horizontal Mirror','Water Image'],
    'Calendar & Clock':        ['Calendar','Clock'],
    'Embedded Figures':        ['Figure Recognition'],
  },
};

// ── Local corrections store ───────────────────────────────────────────────────
const CORR_KEY = 'rrb_topic_corrections';

function loadCorrections(): Record<number, { topic: string; sub_topic: string }> {
  try { return JSON.parse(localStorage.getItem(CORR_KEY) || '{}'); } catch { return {}; }
}
function saveCorrections(c: Record<number, { topic: string; sub_topic: string }>) {
  localStorage.setItem(CORR_KEY, JSON.stringify(c));
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
interface EditModalProps {
  q: PYQ;
  onSave: (id: number, topic: string, sub_topic: string) => void;
  onClose: () => void;
}

function EditModal({ q, onSave, onClose }: EditModalProps) {
  const subjectTopics = TOPIC_MAP[q.subject] || {};
  const topicKeys = Object.keys(subjectTopics);
  const [selTopic, setSelTopic] = useState(q.topic);
  const [selSub, setSelSub] = useState(q.sub_topic || '');
  const [saved, setSaved] = useState(false);

  const subs = subjectTopics[selTopic] || [];

  const handleTopicChange = (t: string) => {
    setSelTopic(t);
    setSelSub((TOPIC_MAP[q.subject]?.[t] || [])[0] || '');
  };

  const handleSave = () => {
    onSave(q.id, selTopic, selSub);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 900);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-indigo-600 to-indigo-700">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Pencil size={16} /> Edit Classification
            </h3>
            <p className="text-indigo-100 text-xs mt-0.5 font-bold">Question ID #{q.id}</p>
          </div>
          <button onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors border border-transparent cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Question preview */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-3 font-semibold">
            {cleanText(q.question)}
          </p>
          <div className="flex gap-2 mt-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {q.subject}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
              Current: {q.topic} › {q.sub_topic || '—'}
            </span>
          </div>
        </div>

        {/* Selectors */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1.5 tracking-wide">
              ✏️ Correct Topic
            </label>
            {topicKeys.length > 0 ? (
              <select
                value={selTopic}
                onChange={e => handleTopicChange(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {topicKeys.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selTopic}
                onChange={e => setSelTopic(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1.5 tracking-wide">
              🏷️ Correct Sub-Topic
            </label>
            {subs.length > 0 ? (
              <select
                value={selSub}
                onChange={e => setSelSub(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {subs.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selSub}
                onChange={e => setSelSub(e.target.value)}
                placeholder="Enter sub-topic..."
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all border cursor-pointer",
              saved
                ? "bg-emerald-500 border-emerald-600 scale-95"
                : "bg-indigo-600 border-indigo-700 hover:bg-indigo-700 shadow-md"
            )}
          >
            {saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Correction</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  PRACTICE ENGINE
// ══════════════════════════════════════════════════════════════════

interface PracticeEngineProps {
  initialSubject?: string;
  initialTopic?: string;
}

export function PracticeEngine({ initialSubject, initialTopic }: PracticeEngineProps = {}) {
  const [corrections, setCorrections] = useState(loadCorrections);
  const [editingQ, setEditingQ] = useState<PYQ | null>(null);
  const [editSavedId, setEditSavedId] = useState<number | null>(null);

  const { questions: langQuestions, lang, loading: langLoading, setLang } = useLang();
  const activeQuestions = langQuestions.length > 0 ? langQuestions : (pyqsData as PYQ[]);

  // Merge corrections into questions
  const allQuestions = useMemo(() => {
    return (activeQuestions as PYQ[]).map(q => {
      const corr = corrections[q.id];
      if (corr) return { ...q, topic: corr.topic, sub_topic: corr.sub_topic };
      return q;
    });
  }, [corrections, activeQuestions]);

  // Re-map sessionQuestions when language changes
  useEffect(() => {
    if (!isPracticing || sessionQuestions.length === 0) return;
    const idMap = new Map<number, PYQ>(allQuestions.map(q => [q.id, q]));
    setSessionQuestions(prev =>
      prev.map(q => idMap.get(q.id) ?? q)
    );
  }, [allQuestions]); // eslint-disable-line react-hooks/exhaustive-deps

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
  
  const [selectedSubject, setSelectedSubject] = useState(() => initialSubject || subjects[0] || '');
  const [selectedTopic, setSelectedTopic] = useState(() => initialTopic || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, { selected: number; correct: boolean }>>({});
  const [isPracticing, setIsPracticing] = useState(false);

  const filteredQuestions = useMemo(() => {
    let qs = allQuestions.filter(q => q.subject === selectedSubject);
    if (branchFilter !== 'all') qs = qs.filter(q => q.branch === branchFilter);
    if (selectedTopic !== 'all') qs = qs.filter(q => q.topic === selectedTopic);
    if (difficultyFilter !== 'all') qs = qs.filter(q => q.difficulty === difficultyFilter);
    if (yearFilter !== 'all') qs = qs.filter(q => q.exam_year === yearFilter);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      qs = qs.filter(q => q.question.toLowerCase().includes(query));
    }
    return qs;
  }, [allQuestions, selectedSubject, selectedTopic, branchFilter, difficultyFilter, yearFilter, searchQuery]);

  const [sessionQuestions, setSessionQuestions] = useState<PYQ[]>([]);
  
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('rrb_confusion_flags') || '[]') as { id: number }[];
      return new Set(stored.map(e => e.id));
    } catch { return new Set(); }
  });

  const isPracticingRef = useRef(false);
  useEffect(() => { isPracticingRef.current = isPracticing; }, [isPracticing]);

  useEffect(() => {
    return () => {
      if (isPracticingRef.current) {
        finalizeSession();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const practiceQuestions = isPracticing && sessionQuestions.length > 0 ? sessionQuestions : filteredQuestions;
  const currentQ = practiceQuestions[currentQIndex];

  // Restore selected answer if the question has already been answered in this session
  useEffect(() => {
    if (!currentQ) return;
    const answered = answeredQuestions[currentQ.id];
    if (answered) {
      setSelectedAnswer(answered.selected);
    } else {
      setSelectedAnswer(null);
    }
    setShowSolution(false);
  }, [currentQIndex, currentQ, answeredQuestions]);

  const topics = selectedSubject ? Object.keys(syllabus[selectedSubject] || {}) : [];

  const stats = useMemo(() => {
    const answered = Object.keys(answeredQuestions).length;
    const correct = Object.values(answeredQuestions).filter(a => a.correct).length;
    return { answered, correct, accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0 };
  }, [answeredQuestions]);

  const handleSaveCorrection = useCallback((id: number, topic: string, sub_topic: string) => {
    const updated = { ...corrections, [id]: { topic, sub_topic } };
    setCorrections(updated);
    saveCorrections(updated);
    setEditSavedId(id);
    setTimeout(() => setEditSavedId(null), 2000);
  }, [corrections]);

  const handleSelectAnswer = (idx: number) => {
    if (selectedAnswer !== null || !currentQ) return;
    setSelectedAnswer(idx);
    const isCorrect = idx === currentQ.correctAnswer;
    setAnsweredQuestions(prev => ({ ...prev, [currentQ.id]: { selected: idx, correct: isCorrect } }));
    trackAnswer(currentQ.id, currentQ.subject, currentQ.topic, isCorrect);
    // DO NOT auto-reveal/auto-expand the solution in practice engine to prevent irritations
    setShowSolution(false);
  };

  const handleNext = () => {
    const qs = isPracticing && sessionQuestions.length > 0 ? sessionQuestions : filteredQuestions;
    if (currentQIndex < qs.length - 1) {
      setCurrentQIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
    }
  };

  const startPractice = () => {
    startLiveSession('Subject Practice', selectedSubject, selectedTopic === 'all' ? 'All Topics' : selectedTopic);
    setSessionQuestions(shuffle(filteredQuestions));
    setIsPracticing(true);
    setCurrentQIndex(0);
    setSelectedAnswer(null);
    setShowSolution(false);
    setAnsweredQuestions({});
  };

  const handleFlagToggle = useCallback(() => {
    if (!currentQ) return;
    const nowFlagged = toggleFlag(
      currentQ.id,
      currentQ.subject,
      currentQ.topic,
      currentQ.sub_topic,
      currentQ.question,
    );
    setFlaggedIds(prev => {
      const next = new Set(prev);
      if (nowFlagged) next.add(currentQ.id); else next.delete(currentQ.id);
      return next;
    });
  }, [currentQ]);

  const exitPractice = () => {
    finalizeSession();
    setIsPracticing(false);
  };

  const getSubjectIcon = (subject: string) => {
    const icons: Record<string, string> = {
      'Mathematics': '📐',
      'Reasoning': '🧩',
      'General Science': '🔬',
      'General Awareness': '🌍',
    };
    return icons[subject] || '📚';
  };

  if (isPracticing && currentQ) {
    const isCorrected = !!corrections[currentQ.id];
    const isCurrentFlagged = flaggedIds.has(currentQ.id);

    if (langLoading) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-semibold text-sm">Switching language…</p>
      </div>
    );

    return (
      <>
        {/* Edit Modal */}
        {editingQ && (
          <EditModal
            q={editingQ}
            onSave={handleSaveCorrection}
            onClose={() => setEditingQ(null)}
          />
        )}

        <div className="fixed inset-0 z-[60] bg-zinc-50 dark:bg-[#080816] flex flex-col h-[100dvh] overflow-hidden font-sans">
          
          {/* Header Bar */}
          <header className="shrink-0 bg-white dark:bg-[#0c0c22] border-b border-zinc-200 dark:border-zinc-800/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={exitPractice}
                className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-all border border-zinc-200 dark:border-zinc-700/50 cursor-pointer"
                title="Exit Practice"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-50 truncate flex items-center gap-1.5">
                  {lang === 'kn' ? 'ವಿಷಯವಾರು ಅಭ್ಯಾಸ' : 'Subject Mastery Practice'}
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {translateSubject(selectedSubject, lang)}
                  </span>
                </h2>
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 truncate">
                  {selectedTopic !== 'all' ? translateTopic(selectedTopic, lang) : (lang === 'kn' ? 'ಎಲ್ಲಾ ವಿಷಯಗಳು' : 'All Topics')}
                </p>
              </div>
            </div>

            {/* Stats Summary Panel */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              <div className="flex items-center gap-3 sm:gap-4 bg-zinc-50 dark:bg-[#111129] px-3 sm:px-5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="text-center">
                  <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">{translateUI('answered', lang)}</p>
                  <p className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400">{stats.answered}</p>
                </div>
                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />
                <div className="text-center">
                  <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">{translateUI('correct', lang)}</p>
                  <p className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">{stats.correct}</p>
                </div>
                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />
                <div className="text-center">
                  <p className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tight">{translateUI('accuracy', lang)}</p>
                  <p className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400">{stats.accuracy}%</p>
                </div>
              </div>
            </div>
          </header>

          {/* Practice Layout Content Body */}
          <div className="flex-1 flex overflow-hidden min-h-0 bg-zinc-50 dark:bg-[#080816]">
            
            {/* Left Scrollable Question Container - Centered Practice Canvas */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-h-0 flex flex-col items-center">
                <div className="w-full max-w-4xl space-y-6 py-2">
                
                {/* Meta details header of Question */}
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800/80 gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-xs font-black">
                      Q {currentQIndex + 1} / {practiceQuestions.length}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-black uppercase border',
                      currentQ.difficulty === 'easy' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/30' :
                      currentQ.difficulty === 'hard' ? 'text-red-600 bg-red-50 dark:bg-red-950/25 border-red-200 dark:border-red-800/30' :
                      'text-amber-600 bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/30'
                    )}>
                      {currentQ.difficulty}
                    </span>
                    {currentQ.exam_year && (
                      <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700/50">
                        {currentQ.exam_date ?? currentQ.exam_year} • {currentQ.shift}
                      </span>
                    )}
                    <span className={cn(
                      "text-[10px] font-black px-2 py-0.5 rounded border",
                      isCorrected
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/50"
                    )}>
                      {isCorrected && '✏️ '}{currentQ.topic}{currentQ.sub_topic ? ` › ${currentQ.sub_topic}` : ''}
                    </span>
                  </div>

                  {/* Header Utility Buttons */}
                  <div className="flex items-center gap-2">
                    {/* EN / KN Switcher */}
                    <div className="relative flex items-center bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-full p-0.5 w-24 h-8 cursor-pointer select-none">
                      <div 
                        onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
                        className="absolute inset-0"
                      />
                      <div 
                        className={cn(
                          "absolute top-0.5 bottom-0.5 w-[44px] rounded-full bg-indigo-600 shadow-md transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] pointer-events-none",
                          lang === 'kn' ? "left-[47px]" : "left-0.5"
                        )}
                      />
                      <button 
                        onClick={() => setLang('en')}
                        className={cn(
                          "relative z-10 w-1/2 text-center text-[10px] font-black transition-colors duration-200 pointer-events-none", 
                          lang === 'en' ? "text-white" : "text-zinc-500 dark:text-zinc-400"
                        )}
                      >
                        EN
                      </button>
                      <button 
                        onClick={() => setLang('kn')}
                        className={cn(
                          "relative z-10 w-1/2 text-center text-[10px] font-black transition-colors duration-200 pointer-events-none", 
                          lang === 'kn' ? "text-white" : "text-zinc-500 dark:text-zinc-400"
                        )}
                      >
                        KN
                      </button>
                    </div>

                    {/* FLAG BUTTON */}
                    <button
                      onClick={handleFlagToggle}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer',
                        isCurrentFlagged
                          ? 'bg-red-500 text-white border-red-600'
                          : 'bg-white hover:bg-red-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-red-200 hover:text-red-500'
                      )}
                    >
                      <Flag size={13} />
                      {isCurrentFlagged ? 'Flagged' : 'Flag'}
                    </button>

                    {/* EDIT TOPIC BUTTON */}
                    <button
                      onClick={() => setEditingQ(currentQ)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                        editSavedId === currentQ.id
                          ? "bg-emerald-500 text-white border-emerald-600"
                          : "bg-white hover:bg-amber-50 dark:bg-zinc-800 text-amber-600 dark:text-amber-500 border-zinc-200 dark:border-zinc-700 hover:border-amber-200"
                      )}
                    >
                      {editSavedId === currentQ.id
                        ? <><CheckCircle size={13} /> Fixed!</>
                        : <><Pencil size={13} /> Edit Topic</>
                      }
                    </button>
                  </div>
                </div>

                {/* Question Statement */}
                <div className="space-y-4 max-w-4xl">
                  <p className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-200 leading-relaxed">
                    {cleanText(currentQ.question)}
                  </p>
                </div>

                {/* Options List */}
                <div className="space-y-3.5 max-w-3xl">
                  {currentQ.options.map((opt, idx) => {
                    const isCorrect = idx === currentQ.correctAnswer;
                    const isSelected = idx === selectedAnswer;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(idx)}
                        className={cn(
                          "w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-left transition-all duration-200 border-2 cursor-pointer shadow-sm",
                          selectedAnswer === null 
                            ? "bg-white hover:bg-zinc-100/50 dark:bg-zinc-900 dark:hover:bg-zinc-800/80 border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50" 
                            : "",
                          selectedAnswer !== null && isCorrect 
                            ? "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100 border-emerald-500 shadow-emerald-500/10" 
                            : "",
                          selectedAnswer !== null && isSelected && !isCorrect 
                            ? "bg-red-500/10 text-red-900 dark:text-red-100 border-red-500 shadow-red-500/10" 
                            : "",
                          selectedAnswer !== null && !isCorrect && !isSelected 
                            ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 opacity-40 cursor-default" 
                            : ""
                        )}
                      >
                        <span className={cn(
                          'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-all border-2',
                          selectedAnswer === null ? 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' :
                          isCorrect ? 'bg-emerald-500 text-white border-emerald-400' :
                          'bg-red-500 text-white border-red-400'
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        
                        <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex-1">{cleanText(opt)}</span>
                        
                        {selectedAnswer !== null && isCorrect && <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />}
                        {selectedAnswer !== null && isSelected && !isCorrect && <XCircle className="text-red-500 shrink-0" size={18} />}
                      </button>
                    );
                  })}
                </div>

                {/* Plain Static Solution display (if answered) */}
                {selectedAnswer !== null && (
                  <div className="max-w-3xl">
                    <SolutionDisplay
                      solution={currentQ.solution}
                      isVisible={showSolution}
                      onToggle={() => setShowSolution(!showSolution)}
                      correctAnswer={currentQ.correctAnswer}
                      options={currentQ.options}
                    />
                  </div>
                )}

                </div>
              </div>

              {/* Bottom Nav Buttons for Question */}
              <footer className="shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-800/80 flex justify-between items-center bg-white dark:bg-[#0c0c22]">
                <button
                  onClick={handlePrev}
                  disabled={currentQIndex === 0}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer border bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                >
                  <ChevronRight size={14} className="rotate-180" /> {translateUI('previous', lang)}
                </button>
                <p className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400">
                  {currentQIndex + 1} / {practiceQuestions.length} {isCurrentFlagged && <span className="text-red-500 ml-1">🚩</span>}
                </p>
                <button
                  onClick={handleNext}
                  disabled={currentQIndex === practiceQuestions.length - 1}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-40 flex items-center gap-1.5 cursor-pointer border border-indigo-500"
                >
                  {translateUI('next', lang)} <ChevronRight size={14} />
                </button>
              </footer>

            </div>

          </div>
        </div>
      </>
    );
  }

  // ── Selection UI ───────────────────────────────────────────────────────────
  return (
    <>
      {editingQ && (
        <EditModal
          q={editingQ}
          onSave={handleSaveCorrection}
          onClose={() => setEditingQ(null)}
        />
      )}

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight">{translateUI('practiceEngine', lang)}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 font-semibold">
              {translateUI('practiceEngineDesc', lang)}
              {Object.keys(corrections).length > 0 && (
                <span className="ml-2 text-green-600 dark:text-green-400 font-bold">
                  ✏️ {Object.keys(corrections).length} {translateUI('userCorrectionsActive', lang)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={translateUI('searchQuestions', lang)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        </div>

        {/* Subject Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjects.map(subject => {
            const count = allQuestions.filter(q => q.subject === subject).length;
            const topicCount = Object.keys(syllabus[subject]).length;
            const isActive = selectedSubject === subject;
            return (
              <button
                key={subject}
                onClick={() => { setSelectedSubject(subject); setSelectedTopic('all'); setBranchFilter('all'); }}
                className={cn(
                  'relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 border flex items-center justify-between cursor-pointer',
                  isActive 
                    ? 'border-indigo-600 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 shadow-md ring-2 ring-indigo-500/20' 
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getSubjectIcon(subject)}</span>
                  <div>
                    <h3 className="font-black text-sm">{translateSubject(subject, lang)}</h3>
                    <p className="text-[10px] font-bold opacity-85 mt-0.5">
                      {count.toLocaleString()} {lang === 'kn' ? 'ಪ್ರಶ್ನೆಗಳು' : 'PYQs'} · {topicCount} {lang === 'kn' ? 'ವಿಷಯಗಳು' : 'Topics'}
                    </p>
                  </div>
                </div>
                {isActive && <CheckCircle2 size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm border border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2 text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <Filter size={16} /> {translateUI('filters', lang)}
              </h3>

              {selectedSubject === 'General Science' && (
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2 block">{translateUI('branch', lang)}</label>
                  <div className="flex gap-2 flex-wrap">
                    {['all', 'Physics', 'Chemistry', 'Biology'].map(b => (
                      <button
                        key={b}
                        onClick={() => { setBranchFilter(b); setSelectedTopic('all'); }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                          branchFilter === b 
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' 
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        )}
                      >
                        {b === 'all' ? translateUI('branchAll', lang) : translateTopic(b, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2 block">{translateUI('topic', lang)}</label>
                <select
                  className="w-full bg-white dark:bg-zinc-800 p-2 rounded-lg text-sm border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
                  value={selectedTopic}
                  onChange={e => setSelectedTopic(e.target.value)}
                >
                  <option value="all">{translateUI('allTopics', lang)}</option>
                  {topics
                    .filter(topic => branchFilter === 'all' || allQuestions.some(q => q.subject === selectedSubject && q.topic === topic && q.branch === branchFilter))
                    .map(topic => {
                      const topicQs = allQuestions.filter(q => q.subject === selectedSubject && q.topic === topic);
                      return (
                        <option key={topic} value={topic}>
                          {translateTopic(topic, lang)} ({topicQs.length} {lang === 'kn' ? 'ಪ್ರಶ್ನೆಗಳು' : 'Questions'})
                        </option>
                      );
                    })
                  }
                </select>
              </div>

              <div className="mb-4">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2 block">{translateUI('difficulty', lang)}</label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'easy', 'medium', 'hard'].map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficultyFilter(d)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer border',
                        difficultyFilter === d 
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' 
                          : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      )}
                    >
                      {d === 'all' ? translateUI('diffAll', lang) : d === 'easy' ? translateUI('diffEasy', lang) : d === 'medium' ? translateUI('diffMedium', lang) : translateUI('diffHard', lang)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2 block">{translateUI('examYear', lang)}</label>
                <select
                  className="w-full bg-white dark:bg-zinc-800 p-2 rounded-lg text-sm border border-zinc-300 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none text-zinc-900 dark:text-zinc-100"
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                >
                  <option value="all">{translateUI('allYears', lang)}</option>
                  {[...new Set(allQuestions.filter(q => q.subject === selectedSubject).map(q => q.exam_year))]
                    .sort((a, b) => b.localeCompare(a))
                    .map(yr => {
                      return <option key={yr} value={yr}>{yr}</option>;
                    })
                  }
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{lang === 'kn' ? 'ಹೊಂದುವ PYQಗಳು' : 'Matching PYQs'}</p>
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{filteredQuestions.length.toLocaleString()}</p>
              </div>
            </div>

            {filteredQuestions.length > 0 && (
              <button
                onClick={startPractice}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md hover:shadow-lg border border-indigo-700 cursor-pointer"
              >
                <Zap size={18} /> {translateUI('startPracticeDrill', lang)}
              </button>
            )}
          </div>

          {/* Topic Cards */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {topics.map(topic => {
                const topicQs = allQuestions.filter(q => q.subject === selectedSubject && q.topic === topic);
                const easy   = topicQs.filter(q => q.difficulty === 'easy').length;
                const medium = topicQs.filter(q => q.difficulty === 'medium').length;
                const hard   = topicQs.filter(q => q.difficulty === 'hard').length;
                const isSelected = selectedTopic === topic;

                return (
                  <div
                    key={topic}
                    onClick={() => setSelectedTopic(topic === selectedTopic ? 'all' : topic)}
                    className={cn(
                      'bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-sm border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]',
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-500/5 shadow-[0_0_12px_rgba(99,102,241,0.15)] ring-2 ring-indigo-500/20' 
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-400'
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-sm truncate mr-2" title={translateTopic(topic, lang)}>
                        {translateTopic(topic, lang)}
                      </h4>
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{topicQs.length}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-3 font-semibold">
                      {topicQs.length} {lang === 'kn' ? 'ಪ್ರಶ್ನೆಗಳು' : 'Questions'}
                    </p>
                    
                    {/* Multi-segmented Progress Bar */}
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 mb-3.5">
                      {easy > 0 && <div className="bg-emerald-500" style={{ width: `${(easy / topicQs.length) * 105}%` }} />}
                      {medium > 0 && <div className="bg-amber-500" style={{ width: `${(medium / topicQs.length) * 105}%` }} />}
                      {hard > 0 && <div className="bg-red-500" style={{ width: `${(hard / topicQs.length) * 105}%` }} />}
                    </div>
                    
                    {/* Colored difficulty breakdown text */}
                    <div className="flex gap-2.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
                      {easy > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {easy} {lang === 'kn' ? 'ಸುಲಭ' : 'Easy'}</span>}
                      {medium > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {medium} {lang === 'kn' ? 'ಮಧ್ಯಮ' : 'Med'}</span>}
                      {hard > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {hard} {lang === 'kn' ? 'ಕಠಿಣ' : 'Hard'}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

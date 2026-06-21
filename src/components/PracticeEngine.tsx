import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  BookOpen, ChevronRight, CheckCircle2, XCircle,
  Search, BarChart3, Zap, Filter, Pencil, X, Save, CheckCircle, Flag,
  Bot, Sparkles, Loader2, Send
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
import { enrichSolution, enrichedToText } from '../lib/solutionEnricher';
import { toggleFlag, isFlagged } from '../lib/confusionTracker';
import { loadNSSolutions, getNSSolution, isNSPracticeId } from '../lib/nsSolutionLoader';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

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

// ── Canonical topic/sub_topic map for Maths & Reasoning ──────────────────────
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div>
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
              <Pencil size={16} /> Edit Classification
            </h3>
            <p className="text-indigo-100 text-xs mt-0.5">Question ID #{q.id}</p>
          </div>
          <button onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Question preview */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
            {cleanText(q.question)}
          </p>
          <div className="flex gap-2 mt-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {q.subject}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              Current: {q.topic} › {q.sub_topic || '—'}
            </span>
          </div>
        </div>

        {/* Selectors */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 tracking-wide">
              ✏️ Correct Topic
            </label>
            {topicKeys.length > 0 ? (
              <select
                value={selTopic}
                onChange={e => handleTopicChange(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 tracking-wide">
              🏷️ Correct Sub-Topic
            </label>
            {subs.length > 0 ? (
              <select
                value={selSub}
                onChange={e => setSelSub(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all",
              saved
                ? "bg-green-500 scale-95"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md"
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

  // Socratic AI coach states
  const [isSocraticOpen, setIsSocraticOpen] = useState(false);
  const [socraticMessages, setSocraticMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [socraticInput, setSocraticInput] = useState('');
  const [isSocraticLoading, setIsSocraticLoading] = useState(false);
  const socraticEndRef = useRef<HTMLDivElement>(null);

  // Merge corrections into questions
  const allQuestions = useMemo(() => {
    return (activeQuestions as PYQ[]).map(q => {
      const corr = corrections[q.id];
      if (corr) return { ...q, topic: corr.topic, sub_topic: corr.sub_topic };
      return q;
    });
  }, [corrections, activeQuestions]);

  // ── KEY FIX: Re-map sessionQuestions when language changes ────────────────
  // allQuestions has new translated text; sessionQuestions holds old language snapshot.
  // Build id→question map and remap in-place, preserving shuffle order & position.
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
  
  const subjectPercentages = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
      const email: string = u?.email || 'guest';
      const prefix = email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '');
      const profile = JSON.parse(localStorage.getItem(`${prefix}__ksp_roadmap_v4`) || '{}');
      const progress = profile.topicProgress || {};
      
      let totalCompleted = 0;
      Object.keys(syllabus).forEach(subj => {
        const topicsList = Object.keys(syllabus[subj] || {});
        topicsList.forEach(t => {
          const prog = progress[t];
          if (prog && (prog.conceptRead || prog.pyqsAttempted > 0)) {
            totalCompleted++;
          }
        });
      });
      
      const res: Record<string, number> = {};
      Object.keys(syllabus).forEach(subj => {
        const topicsList = Object.keys(syllabus[subj] || {});
        if (topicsList.length === 0) {
          res[subj] = 0;
          return;
        }
        if (totalCompleted === 0) {
          // Default simulated starting progress if brand new
          const defaultSimulated: Record<string, number> = { 'Mathematics': 68, 'Reasoning': 72, 'General Science': 58, 'General Awareness': 64 };
          res[subj] = defaultSimulated[subj] || 60;
          return;
        }
        let completed = 0;
        topicsList.forEach(t => {
          const prog = progress[t];
          if (prog && (prog.conceptRead || prog.pyqsAttempted > 0)) {
            completed++;
          }
        });
        res[subj] = Math.round((completed / topicsList.length) * 100);
      });
      return res;
    } catch {
      return { 'Mathematics': 68, 'Reasoning': 72, 'General Science': 58, 'General Awareness': 64 };
    }
  }, [syllabus]);

  const [selectedSubject, setSelectedSubject] = useState(() => initialSubject || subjects[0] || '');
  const [selectedTopic, setSelectedTopic] = useState(() => initialTopic || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  // Preload NS batch solutions on mount
  useEffect(() => { loadNSSolutions(); }, []);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<number, { selected: number; correct: boolean }>>({});
  const [isPracticing, setIsPracticing] = useState(false);
  // Shuffled question list for this session
  const [sessionQuestions, setSessionQuestions] = useState<typeof filteredQuestions>([]);
  // Flag state for current question
  const [flaggedIds, setFlaggedIds] = useState<Set<number>>(() => {
    // Load all currently flagged ids from confusionTracker
    try {
      const stored = JSON.parse(localStorage.getItem('rrb_confusion_flags') || '[]') as { id: number }[];
      return new Set(stored.map(e => e.id));
    } catch { return new Set(); }
  });

  // ── Auto-finalize if user switches tabs while practicing ──────────────────
  // Store isPracticing in a ref so the cleanup can read the latest value
  const isPracticingRef = useRef(false);
  useEffect(() => { isPracticingRef.current = isPracticing; }, [isPracticing]);

  useEffect(() => {
    return () => {
      // Component unmounting (user left via sidebar) — save whatever was answered
      if (isPracticingRef.current) {
        finalizeSession();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const topics = selectedSubject ? Object.keys(syllabus[selectedSubject] || {}) : [];

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

  // ── practiceQuestions & currentQ defined here so handlers below can use them ──
  // When practicing: use shuffled sessionQuestions. Otherwise: use filtered list.
  const practiceQuestions = isPracticing && sessionQuestions.length > 0 ? sessionQuestions : filteredQuestions;
  const currentQ = practiceQuestions[currentQIndex];

  // Reset Socratic state when question changes
  useEffect(() => {
    setSocraticMessages([]);
    setIsSocraticOpen(false);
    setIsSocraticLoading(false);
  }, [currentQIndex]);

  // Scroll Socratic chat to bottom
  useEffect(() => {
    socraticEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [socraticMessages, isSocraticLoading]);

  const initSocraticTutor = async () => {
    if (!currentQ) return;
    setIsSocraticLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const origQ = pyqsData.find((x: any) => x.id === currentQ.id);
      const questionText = origQ?.question || currentQ.question;
      const optionsText = (origQ?.options || currentQ.options).map((o: string, i: number) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n');
      const correctAnsText = String.fromCharCode(65 + currentQ.correctAnswer);
      const solutionText = origQ?.solution || currentQ.solution;

      const prompt = `Question: ${questionText}
Options:
${optionsText}
Correct Answer: ${correctAnsText}
Solution Explanation: ${solutionText}
Student's Action: ${selectedAnswer !== null ? `Chose Option ${String.fromCharCode(65 + selectedAnswer)}` : 'None'}

You are their KSP Socratic Coach. The student has opened the drawer to get help. Introduce yourself as KSP Command Center AI Coach, and provide a single brief, encouraging Socratic hint or guiding question about how to think about this question, without revealing the answer. Limit to 3 sentences. You can use English mixed with Kannada (bilingual) if helpful.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are the KSP (Karnataka Police Exam) Command Center Socratic Coach. You guide students step-by-step using active recall. Never reveal the direct answer. Always end with a question or a tiny challenge."
        }
      });
      const greeting = response.text || "Hello! Let's tackle this question. What is your first thought about this concept?";
      setSocraticMessages([{ role: 'model', text: greeting }]);
    } catch (err) {
      console.error(err);
      setSocraticMessages([{ role: 'model', text: "Hello Aspirant! Let's break down this KSP question together. What's your initial thought on how we should approach this?" }]);
    } finally {
      setIsSocraticLoading(false);
    }
  };

  const handleSocraticSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socraticInput.trim() || isSocraticLoading || !currentQ) return;

    const userText = socraticInput.trim();
    setSocraticMessages(prev => [...prev, { role: 'user', text: userText }]);
    setSocraticInput('');
    setIsSocraticLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const origQ = pyqsData.find((x: any) => x.id === currentQ.id);
      const questionText = origQ?.question || currentQ.question;
      const optionsText = (origQ?.options || currentQ.options).map((o: string, i: number) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n');
      const correctAnsText = String.fromCharCode(65 + currentQ.correctAnswer);
      const solutionText = origQ?.solution || currentQ.solution;

      // Build chat context
      const chatHistoryPrompt = socraticMessages.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n');
      
      const prompt = `Context Question: ${questionText}
Options:
${optionsText}
Correct Answer: ${correctAnsText}
Solution Explanation: ${solutionText}

Chat History:
${chatHistoryPrompt}
Student: ${userText}

Tutor (Socratic Coach):
Review the chat history and the student's response. Guide them step-by-step. Do NOT tell them the answer or if they are correct/incorrect directly, but lead them towards it. Ask questions, prompt calculations, or explain concepts. Limit your response to 3 sentences max, bilingual Kannada-English.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "You are the KSP (Karnataka Police Exam) Command Center Socratic Coach. You guide students step-by-step using active recall. Never reveal the direct answer. Always end with a question or a tiny challenge."
        }
      });

      setSocraticMessages(prev => [...prev, { role: 'model', text: response.text || "Let's think. What formula should we apply first?" }]);
    } catch (err) {
      console.error(err);
      setSocraticMessages(prev => [...prev, { role: 'model', text: "Sorry, I lost my connection. Let's try again! What's the next step?" }]);
    } finally {
      setIsSocraticLoading(false);
    }
  };


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
    // ── Track this answer in the live session ──────────────────────────────
    trackAnswer(currentQ.id, currentQ.subject, currentQ.topic, isCorrect);
    // Auto-reveal the explanation panel
    setShowSolution(true);
  };

  const handleNext = () => {
    // practiceQuestions is defined later but handleNext is called inside practice mode
    // so we use sessionQuestions when practicing
    const qs = isPracticing && sessionQuestions.length > 0 ? sessionQuestions : filteredQuestions;
    if (currentQIndex < qs.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowSolution(false);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
      setSelectedAnswer(null);
      setShowSolution(false);
    }
  };
  const startPractice = () => {
    // ── Start a new performance-tracking session ───────────────────────────
    startLiveSession('Subject Practice', selectedSubject, selectedTopic === 'all' ? 'All Topics' : selectedTopic);
    // Shuffle questions for this session (Fisher-Yates)
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
    // ── Finalize & save session to performance engine ─────────────────────
    finalizeSession();
    setIsPracticing(false);
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      'Mathematics': 'from-blue-500 to-indigo-600',
      'Reasoning': 'from-purple-500 to-violet-600',
      'General Science': 'from-emerald-500 to-teal-600',
      'General Awareness': 'from-amber-500 to-orange-600',
    };
    return colors[subject] || 'from-slate-500 to-slate-600';
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

  const getDifficultyColor = (d: string) => {
    if (d === 'easy') return 'text-emerald-600 bg-emerald-50';
    if (d === 'hard') return 'text-red-600 bg-red-50';
    return 'text-amber-600 bg-amber-50';
  };

  if (isPracticing && currentQ) {
    const isCorrected = !!corrections[currentQ.id];
    const isCurrentFlagged = flaggedIds.has(currentQ.id);

    // Language loading overlay — shown briefly when switching language mid-session
    if (langLoading) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-on-surface-variant font-semibold text-sm">Switching language…</p>
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

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={exitPractice}
                className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
              >
                <ChevronRight size={18} className="rotate-180 text-primary" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                  {translateUI('practiceMode', lang)}
                  {lang !== 'en' && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {lang === 'kn' ? '🏴 ಕನ್ನಡ' : lang}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-on-surface-variant">
                  {translateSubject(selectedSubject, lang)} {selectedTopic !== 'all' ? `› ${translateTopic(selectedTopic, lang)}` : ''}
                </p>
              </div>

            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-6 bg-surface-container-lowest px-5 py-2.5 rounded-xl border border-surface-container-high">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">{translateUI('answered', lang)}</p>
                  <p className="text-lg font-black text-primary">{stats.answered}</p>
                </div>
                <div className="w-px h-8 bg-surface-container-high" />
                <div className="text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">{translateUI('correct', lang)}</p>
                  <p className="text-lg font-black text-tertiary">{stats.correct}</p>
                </div>
                <div className="w-px h-8 bg-surface-container-high" />
                <div className="text-center">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase">{translateUI('accuracy', lang)}</p>
                  <p className="text-lg font-black text-secondary">{stats.accuracy}%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-surface-container/75 backdrop-blur-md rounded-2xl shadow-xl border border-black/10 dark:border-white/5 overflow-hidden">
            {/* Card Header */}
            <div className="p-6 border-b border-black/10 dark:border-b border-white/5 bg-surface-container-low/30 flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-primary text-white px-3 py-1 rounded-lg text-sm font-bold">
                  Q {currentQIndex + 1} / {filteredQuestions.length}
                </span>
                <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase', getDifficultyColor(currentQ.difficulty))}>
                  {currentQ.difficulty}
                </span>
                {currentQ.exam_year && (
                  <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                    {currentQ.exam_date ?? currentQ.exam_year} • {currentQ.shift}
                  </span>
                )}
                {/* Topic + sub_topic badge */}
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded border",
                  isCorrected
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-surface-container text-on-surface-variant border-surface-container-high"
                )}>
                  {isCorrected && '✏️ '}{currentQ.topic}{currentQ.sub_topic ? ` › ${currentQ.sub_topic}` : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Spring-animated Toggle EN | KN */}
                <div className="relative flex items-center bg-[#171F3A] border border-white/10 rounded-full p-0.5 w-24 h-8 cursor-pointer select-none">
                  <div 
                    onClick={() => setLang(lang === 'en' ? 'kn' : 'en')}
                    className="absolute inset-0"
                  />
                  <div 
                    className={cn(
                      "absolute top-0.5 bottom-0.5 w-[44px] rounded-full bg-gradient-to-r from-primary to-violet-600 shadow-md transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] pointer-events-none",
                      lang === 'kn' ? "left-[47px]" : "left-0.5"
                    )}
                  />
                  <button 
                    onClick={() => setLang('en')}
                    className={cn(
                      "relative z-10 w-1/2 text-center text-[10px] font-black transition-colors duration-200 pointer-events-none", 
                      lang === 'en' ? "text-white" : "text-on-surface-variant"
                    )}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => setLang('kn')}
                    className={cn(
                      "relative z-10 w-1/2 text-center text-[10px] font-black transition-colors duration-200 pointer-events-none", 
                      lang === 'kn' ? "text-white" : "text-on-surface-variant"
                    )}
                  >
                    KN
                  </button>
                </div>

                {/* FLAG (Confused) BUTTON */}
                <button
                  onClick={handleFlagToggle}
                  title={isCurrentFlagged ? 'Remove confusion flag' : 'Flag as confusing / need to revisit'}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border',
                    isCurrentFlagged
                      ? 'bg-error text-white border-error'
                      : 'bg-[#0F1629] text-on-surface-variant border-white/10 hover:bg-error/10 hover:text-error hover:border-error/30'
                  )}
                >
                  <Flag size={13} />
                  {isCurrentFlagged ? 'Flagged' : 'Flag'}
                </button>

                {/* EDIT BUTTON */}
                <button
                  onClick={() => setEditingQ(currentQ)}
                  title="Report wrong classification"
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    editSavedId === currentQ.id
                      ? "bg-green-500 text-white border-green-500"
                      : "bg-[#0F1629] text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                  )}
                >
                  {editSavedId === currentQ.id
                    ? <><CheckCircle size={13} /> Fixed!</>
                    : <><Pencil size={13} /> Edit Topic</>
                  }
                </button>
              </div>
            </div>

            {/* Question Body */}
            <div className="p-8">
              {/* Question Text */}
              <div className="mb-8">
                <p className="text-lg font-semibold text-on-surface leading-relaxed">
                  {cleanText(currentQ.question)}
                </p>
              </div>

              {/* Option List - Custom Wide Pill Buttons with Gradient Borders */}
              <div className="space-y-4 max-w-3xl">
                {currentQ.options.map((opt, idx) => {
                  const isCorrect = idx === currentQ.correctAnswer;
                  const isSelected = idx === selectedAnswer;

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      className={cn(
                        "group relative p-[1.5px] rounded-full transition-all duration-300 cursor-pointer overflow-hidden shadow-sm",
                        selectedAnswer === null ? "bg-white/5 hover:bg-gradient-to-r hover:from-primary hover:to-secondary" : "",
                        selectedAnswer !== null && isCorrect ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-correct" : "",
                        selectedAnswer !== null && isSelected && !isCorrect ? "bg-gradient-to-r from-red-500 to-rose-600 animate-wrong shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "",
                        selectedAnswer !== null && !isCorrect && !isSelected ? "bg-white/5 opacity-40" : ""
                      )}
                    >
                      <div className={cn(
                        "flex items-center gap-4 px-6 py-4 rounded-full bg-[#0F1629] transition-all duration-300 w-full relative",
                        selectedAnswer === null ? "group-hover:bg-[#0F1629]/90" : "",
                        selectedAnswer !== null && isCorrect ? "bg-emerald-950/40 text-emerald-100" : "",
                        selectedAnswer !== null && isSelected && !isCorrect ? "bg-red-950/40 text-red-100" : ""
                      )}>
                        {/* Float-up XP text inside the correct option */}
                        {selectedAnswer !== null && isCorrect && isSelected && (
                          <span className="absolute right-16 text-emerald-400 font-extrabold text-xs tracking-wider animate-float-up pointer-events-none">
                            +10 XP
                          </span>
                        )}

                        <span className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all border',
                          selectedAnswer === null ? 'bg-[#171F3A] text-on-surface-variant border-white/10 group-hover:border-primary/50 group-hover:text-white' :
                          isCorrect ? 'bg-emerald-500 text-white border-emerald-400' :
                          'bg-red-500 text-white border-red-400'
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        
                        <span className="font-semibold text-sm text-on-surface flex-1">{cleanText(opt)}</span>

                        {selectedAnswer !== null && isCorrect && <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />}
                        {selectedAnswer !== null && isSelected && !isCorrect && <XCircle className="text-red-400 shrink-0" size={20} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Socratic AI Coach button */}
              {selectedAnswer !== null && (
                <div className="mt-6 flex justify-start">
                  <button
                    onClick={() => {
                      setIsSocraticOpen(true);
                      if (socraticMessages.length === 0) {
                        initSocraticTutor();
                      }
                    }}
                    className="relative overflow-hidden rounded-xl p-[1px] transition-all duration-300 hover:scale-[1.02] shadow-[0_0_15px_rgba(91,76,245,0.25)] hover:shadow-[0_0_20px_rgba(91,76,245,0.4)]"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 animate-pulse" />
                    <span className="relative flex items-center gap-2 px-6 py-3 rounded-[11px] bg-[#0F1629] text-white text-xs font-black tracking-wide">
                      <Sparkles size={14} className="text-secondary animate-pulse animate-duration-1000" />
                      {translateUI('askSocraticCoach', lang)}
                    </span>
                  </button>
                </div>
              )}

              {/* Solution — NS batch files take priority for step-by-step */}
              {selectedAnswer !== null && currentQ && (() => {
                // 1. Check NS practice batch (IDs 5001–5100)
                const nsBatchSol = isNSPracticeId(currentQ.id)
                  ? getNSSolution(currentQ.id)
                  : null;
                // 2. Fallback: enrich existing solution
                const isPremiumPrebaked = currentQ.solution && currentQ.solution.includes('**Given:**');
                
                const enriched = (!nsBatchSol && !isPremiumPrebaked) ? enrichSolution({
                  question: currentQ.question,
                  options: currentQ.options,
                  correctAnswer: currentQ.correctAnswer,
                  subject: currentQ.subject,
                  topic: currentQ.topic,
                  sub_topic: currentQ.sub_topic,
                  existingSolution: currentQ.solution,
                }) : null;
                const finalSolution = nsBatchSol ?? (isPremiumPrebaked ? currentQ.solution : (enriched ? enrichedToText(enriched) : currentQ.solution));
                return (
                  <SolutionDisplay
                    solution={finalSolution}
                    isVisible={showSolution}
                    onToggle={() => setShowSolution(!showSolution)}
                    questionId={currentQ.id}
                    question={currentQ.question}
                    options={currentQ.options}
                    correctAnswer={currentQ.correctAnswer}
                    topic={currentQ.topic}
                    subject={currentQ.subject}
                  />
                );
              })()}
            </div>

             {/* Navigation */}
            <div className="p-6 border-t border-black/10 dark:border-t border-white/5 flex justify-between items-center bg-[#0F1629]/50">
              <button
                onClick={handlePrev}
                disabled={currentQIndex === 0}
                className="px-5 py-2.5 bg-[#171F3A] text-on-surface rounded-lg font-bold disabled:opacity-40 flex items-center gap-2 hover:bg-[#1f2a4e] transition-colors border border-black/10 dark:border-white/5"
              >
                <ChevronRight size={16} className="rotate-180" /> {translateUI('previous', lang)}
              </button>
              <p className="text-xs font-bold text-on-surface-variant">
                {currentQIndex + 1} / {practiceQuestions.length} {isCurrentFlagged && <span className="text-error ml-1">🚩</span>}
              </p>
              <button
                onClick={handleNext}
                disabled={currentQIndex === practiceQuestions.length - 1}
                className="px-5 py-2.5 bg-primary text-white rounded-lg font-bold disabled:opacity-40 flex items-center gap-2 hover:bg-primary-container transition-colors"
              >
                {translateUI('next', lang)} <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        {isSocraticOpen && (
          <div className="fixed inset-y-0 right-0 w-96 bg-[#0B0F19] border-l border-white/5 shadow-2xl flex flex-col z-50 animate-slide-in">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0F1629]">
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary animate-pulse" size={16} />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {lang === 'kn' ? 'ಸೋಕ್ರೆಟಿಕ್ AI ಕೋಚ್' : 'Socratic AI Coach'}
                  </h3>
                  <p className="text-[10px] text-on-surface-variant">
                    {lang === 'kn' ? 'ಸಕ್ರಿಯ ಕಲಿಕಾ ಮಾರ್ಗದರ್ಶಿ' : 'Active Learning Guide'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSocraticOpen(false)}
                className="text-on-surface-variant hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Message list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#080C18]/50">
              {socraticMessages.map((msg, idx) => (
                <div key={idx} className={cn("flex gap-3 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black border",
                    msg.role === 'user'
                      ? "bg-secondary text-white border-secondary-container"
                      : "bg-primary text-white border-primary-container"
                  )}>
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  <div className={cn(
                    "p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm",
                    msg.role === 'user'
                      ? "bg-[#ff7722]/15 border border-[#ff7722]/30 text-white rounded-tr-none"
                      : "bg-[#0F1629] border border-white/5 text-slate-200 rounded-tl-none"
                  )}>
                    <div className="prose prose-sm max-w-none text-slate-200">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isSocraticLoading && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="w-7 h-7 rounded-full bg-primary border border-primary-container text-white flex items-center justify-center shrink-0 text-[10px] font-black">
                    AI
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#0F1629] border border-white/5 text-slate-200 rounded-tl-none flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-primary" />
                    <span className="text-xs text-on-surface-variant">
                      {lang === 'kn' ? 'ಮಾರ್ಗದರ್ಶಿ ಹಂತಗಳನ್ನು ಯೋಚಿಸುತ್ತಿದೆ...' : 'Thinking guiding steps...'}
                    </span>
                  </div>
                </div>
              )}
              <div ref={socraticEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/5 bg-[#0F1629]">
              <form onSubmit={handleSocraticSend} className="flex gap-2">
                <input
                  type="text"
                  value={socraticInput}
                  onChange={e => setSocraticInput(e.target.value)}
                  placeholder={lang === 'kn' ? 'ನಿಮ್ಮ ಉತ್ತರ ಅಥವಾ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ...' : 'Type your response or question...'}
                  className="flex-1 bg-[#080C18] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-all placeholder:text-on-surface-variant/50"
                  disabled={isSocraticLoading}
                />
                <button
                  type="submit"
                  disabled={!socraticInput.trim() || isSocraticLoading}
                  className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl flex items-center justify-center hover:bg-primary-container disabled:opacity-40 disabled:hover:bg-primary transition-all shrink-0"
                >
                  <Send size={12} />
                </button>
              </form>
            </div>
          </div>
        )}
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
            <h2 className="text-3xl font-bold text-primary tracking-tight">{translateUI('practiceEngine', lang)}</h2>
            <p className="text-on-surface-variant text-sm mt-2">
              {translateUI('practiceEngineDesc', lang)}
              {Object.keys(corrections).length > 0 && (
                <span className="ml-2 text-green-600 font-bold">
                  ✏️ {Object.keys(corrections).length} {translateUI('userCorrectionsActive', lang)}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={translateUI('searchQuestions', lang)}
                className="pl-9 pr-4 py-2 bg-surface-container-lowest border border-surface-container-high rounded-xl text-sm focus:outline-none focus:border-primary w-64"
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
                    ? 'border-primary bg-primary/5 text-primary shadow-md ring-2 ring-primary/20' 
                    : 'border-black/10 dark:border-white/5 bg-surface-container-lowest text-on-surface-variant hover:border-black/20 dark:hover:border-white/10'
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
                {isActive && <CheckCircle2 size={18} className="text-primary shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-black/10 dark:border-white/5">
              <h3 className="font-bold text-primary mb-4 flex items-center gap-2 text-sm">
                <Filter size={16} /> {translateUI('filters', lang)}
              </h3>

              {selectedSubject === 'General Science' && (
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-2 block">{translateUI('branch', lang)}</label>
                  <div className="flex gap-2 flex-wrap">
                    {['all', 'Physics', 'Chemistry', 'Biology'].map(b => (
                      <button
                        key={b}
                        onClick={() => { setBranchFilter(b); setSelectedTopic('all'); }}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border',
                          branchFilter === b 
                            ? 'bg-primary text-white border-primary shadow-sm' 
                            : 'bg-surface-container-lowest text-on-surface-variant border-black/10 dark:border-white/5 hover:border-black/20 dark:hover:border-white/10 hover:bg-surface-container-low'
                        )}
                      >
                        {b === 'all' ? translateUI('branchAll', lang) : translateTopic(b, lang)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-2 block">{translateUI('topic', lang)}</label>
                <select
                  className="w-full bg-surface-container-lowest p-2 rounded-lg text-sm border border-black/10 dark:border-white/5 focus:ring-2 focus:ring-primary outline-none text-on-surface"
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
                <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-2 block">{translateUI('difficulty', lang)}</label>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'easy', 'medium', 'hard'].map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficultyFilter(d)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer border',
                        difficultyFilter === d 
                          ? 'bg-primary text-white border-primary shadow-sm' 
                          : 'bg-surface-container-lowest text-on-surface-variant border-black/10 dark:border-white/5 hover:border-black/20 dark:hover:border-white/10 hover:bg-surface-container-low'
                      )}
                    >
                      {d === 'all' ? translateUI('diffAll', lang) : d === 'easy' ? translateUI('diffEasy', lang) : d === 'medium' ? translateUI('diffMedium', lang) : translateUI('diffHard', lang)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase mb-2 block">{translateUI('examYear', lang)}</label>
                <select
                  className="w-full bg-surface-container-lowest p-2 rounded-lg text-sm border border-black/10 dark:border-white/5 focus:ring-2 focus:ring-primary outline-none text-on-surface"
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

              <div className="pt-4 border-t border-black/10 dark:border-white/5">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{lang === 'kn' ? 'ಹೊಂದುವ PYQಗಳು' : 'Matching PYQs'}</p>
                <p className="text-3xl font-black text-primary mt-1">{filteredQuestions.length.toLocaleString()}</p>
              </div>
            </div>

            {filteredQuestions.length > 0 && (
              <button
                onClick={startPractice}
                className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md hover:shadow-lg border-none cursor-pointer"
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
                      'bg-surface-container-lowest rounded-xl p-5 shadow-sm border cursor-pointer transition-all hover:shadow-md hover:scale-[1.01]',
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-[0_0_12px_rgba(91,76,245,0.15)] ring-2 ring-primary/20' 
                        : 'border-black/10 dark:border-white/5 hover:border-primary/45'
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-black text-on-surface text-sm truncate mr-2" title={translateTopic(topic, lang)}>
                        {translateTopic(topic, lang)}
                      </h4>
                      <span className="text-xl font-black text-primary leading-none">{topicQs.length}</span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant mb-3">
                      {topicQs.length} {lang === 'kn' ? 'ಪ್ರಶ್ನೆಗಳು' : 'Questions'}
                    </p>
                    
                    {/* Multi-segmented Progress Bar */}
                    <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-container mb-3.5">
                      {easy > 0 && <div className="bg-emerald-500" style={{ width: `${(easy / topicQs.length) * 100}%` }} />}
                      {medium > 0 && <div className="bg-amber-500" style={{ width: `${(medium / topicQs.length) * 100}%` }} />}
                      {hard > 0 && <div className="bg-red-500" style={{ width: `${(hard / topicQs.length) * 100}%` }} />}
                    </div>
                    
                    {/* Colored difficulty breakdown text */}
                    <div className="flex gap-2.5 text-[10px] font-bold text-on-surface-variant/80">
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

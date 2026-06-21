import React, { useState, useEffect, useMemo } from 'react';
import { X, Trophy, Timer, Share2, ArrowRight, CheckCircle2, XCircle, ShieldAlert, Sparkles, Award } from 'lucide-react';
import pyqsData from '../data/pyqs.json';
import { cleanText } from '../lib/cleanText';

interface PYQ {
  id: number;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: string;
  solution: string;
}

interface DailyChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// LCG seed random generator
function getSeededRandom(seed: number) {
  return function() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

export function DailyChallengeModal({ isOpen, onClose }: DailyChallengeModalProps) {
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0); // 0 to 5
  const [timeTaken, setTimeTaken] = useState(0); // in seconds
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // Get current date string for key
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Filter and extract 5 seeded daily questions
  const dailyQuestions = useMemo(() => {
    const allQs = pyqsData as PYQ[];
    const dateNum = new Date().getFullYear() * 10000 + (new Date().getMonth() + 1) * 100 + new Date().getDate();
    const rand = getSeededRandom(dateNum);
    const temp = [...allQs];
    const selected: PYQ[] = [];
    for (let i = 0; i < 5; i++) {
      if (temp.length === 0) break;
      const idx = Math.floor(rand() * temp.length);
      selected.push(temp[idx]);
      temp.splice(idx, 1);
    }
    return selected;
  }, []);

  // Timer effect
  useEffect(() => {
    let t: any;
    if (timerActive && !completed) {
      t = setInterval(() => {
        setTimeTaken(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(t);
  }, [timerActive, completed]);

  // Load daily lock status on mount or open
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem(`ksp_daily_${todayStr}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setScore(parsed.score);
          setTimeTaken(parsed.timeTaken);
          setCompleted(true);
          setTimerActive(false);
        } catch {
          resetChallenge();
        }
      } else {
        resetChallenge();
      }
    }
  }, [isOpen, todayStr]);

  const resetChallenge = () => {
    setCompleted(false);
    setCurrentIdx(0);
    setSelectedOpt(null);
    setCorrectAnswersCount(0);
    setTimeTaken(0);
    setTimerActive(true);
    setShowSolution(false);
  };

  const handleOptionClick = (idx: number) => {
    if (selectedOpt !== null) return; // already answered
    setSelectedOpt(idx);
    const correct = idx === dailyQuestions[currentIdx].correctAnswer;
    if (correct) {
      setCorrectAnswersCount(prev => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < 4) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOpt(null);
      setShowSolution(false);
    } else {
      // Completed! Save state and lock today
      const finalScore = correctAnswersCount;
      setScore(finalScore);
      setCompleted(true);
      setTimerActive(false);
      localStorage.setItem(
        `ksp_daily_${todayStr}`,
        JSON.stringify({ score: finalScore, timeTaken })
      );

      // Add ELO XP bonus dynamically
      try {
        const u = JSON.parse(localStorage.getItem('rrb_user') || '{}');
        const email: string = u?.email || 'guest';
        const prefix = email.toLowerCase().replace(/[@.]/g, '_').replace(/[^a-z0-9_]/g, '');
        const roadmapKey = `${prefix}__ksp_roadmap_v4`;
        const profile = JSON.parse(localStorage.getItem(roadmapKey) || '{"xp":0}');
        profile.xp = (profile.xp || 0) + (finalScore * 20); // 20 XP per correct question
        localStorage.setItem(roadmapKey, JSON.stringify(profile));
      } catch {}
    }
  };

  const shareText = () => {
    const pct = Math.round((score / 5) * 100);
    const text = `🏆 KSP Daily Challenge [${todayStr}]\nAccuracy Score: ${pct}%\nRecall Duration: ${timeTaken}s\nChallenge status: Completed 👮\nCan you beat my speed? Try it on KSP Master Pro!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const currentQ = dailyQuestions[currentIdx];
  const progressPercent = Math.round(((currentIdx + (selectedOpt !== null ? 1 : 0)) / 5) * 100);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
      <div className="bg-surface-container border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl spring-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="text-secondary" size={20} />
            <h3 className="text-on-surface font-black text-base">ಇಂದಿನ ಸವಾಲು (Daily Challenge)</h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!completed ? (
            <div className="space-y-6">
              {/* Status Info bar */}
              <div className="flex items-center justify-between text-xs font-black text-on-surface-variant uppercase tracking-wider bg-white/5 px-4 py-3 rounded-2xl border border-white/5">
                <span className="flex items-center gap-1.5"><Timer size={14} className="text-secondary" /> {timeTaken}s elapsed</span>
                <span>Seed Challenge Queue</span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-secondary to-accent progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase text-on-surface-variant tracking-widest">
                  <span>Current Question</span>
                  <span>Accuracy Target: 100%</span>
                </div>
              </div>

              {/* Question card */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5 shadow-inner">
                <span className="text-[10px] font-black bg-secondary/15 text-secondary border border-secondary/25 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {currentQ.subject}
                </span>
                <p className="text-sm font-bold text-on-surface mt-4 leading-relaxed whitespace-pre-wrap">
                  {cleanText(currentQ.question)}
                </p>
              </div>

              {/* Options list */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOpt === idx;
                  const isCorrect = idx === currentQ.correctAnswer;
                  const isAnswered = selectedOpt !== null;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(idx)}
                      disabled={isAnswered}
                      className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left text-xs font-semibold transition-all ${
                        !isAnswered
                          ? 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10 active:scale-[0.98]'
                          : isCorrect
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                          : isSelected
                          ? 'border-red-500 bg-red-500/10 text-red-400 font-extrabold'
                          : 'border-white/5 bg-white/5 opacity-40'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border ${
                        !isAnswered ? 'bg-[#171F3A] border-white/10 text-on-surface-variant' :
                        isCorrect ? 'bg-emerald-500 border-emerald-400 text-white' :
                        'bg-red-500 border-red-400 text-white'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{cleanText(opt)}</span>
                      {isAnswered && isCorrect && <CheckCircle2 size={16} className="text-emerald-400" />}
                      {isAnswered && isSelected && !isCorrect && <XCircle size={16} className="text-red-400" />}
                    </button>
                  );
                })}
              </div>

              {/* solution display button */}
              {selectedOpt !== null && (
                <div className="space-y-3">
                  <button
                    onClick={() => setShowSolution(prev => !prev)}
                    className="text-xs text-secondary font-black underline"
                  >
                    {showSolution ? 'Hide Solution Details' : 'Show Solution Details'}
                  </button>
                  {showSolution && (
                    <div className="bg-[#0c1220] border border-white/5 rounded-2xl p-4 text-xs text-on-surface-variant leading-relaxed">
                      <h5 className="font-black text-white mb-2 uppercase tracking-wide">💡 Explanation</h5>
                      <p className="whitespace-pre-wrap">{cleanText(currentQ.solution || 'Standard KSP solution applied.')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Results Screen */
            <div className="text-center py-6 space-y-6">
              <div className="w-20 h-20 bg-secondary/15 rounded-full flex items-center justify-center mx-auto border border-secondary/30">
                <Trophy size={40} className="text-secondary animate-bounce" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">Daily Challenge Locked!</h4>
                <p className="text-xs text-on-surface-variant mt-1.5">You have locked in your accuracy score for today.</p>
              </div>

              {/* Statistics Panel */}
              <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Accuracy Score</p>
                  <p className="text-xl font-black text-white mt-1">{Math.round((score / 5) * 100)}%</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider">Recall Speed</p>
                  <p className="text-xl font-black text-white mt-1">{timeTaken}s</p>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 max-w-sm mx-auto text-xs text-emerald-200/80 font-bold flex gap-2 justify-center items-center">
                <Award size={16} className="text-emerald-400 shrink-0" />
                <span>Gain ELO score updates upon daily challenge completions!</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/5 flex shrink-0">
          {!completed ? (
            <button
              onClick={handleNext}
              disabled={selectedOpt === null}
              className="w-full py-3 bg-secondary text-white rounded-2xl font-black text-xs hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {currentIdx < 4 ? <><ArrowRight size={14} /> Next Question</> : 'Calculate Final Score'}
            </button>
          ) : (
            <div className="w-full flex gap-3">
              <button
                onClick={shareText}
                className="flex-1 py-3 bg-gradient-to-r from-secondary to-accent text-white rounded-2xl font-black text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-secondary/20 border border-secondary/20"
              >
                <Share2 size={14} />
                {copied ? 'Copied to Clipboard!' : 'Share Results'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 text-on-surface border border-white/5 rounded-2xl font-bold text-xs hover:bg-white/10 active:scale-[0.98] transition-all"
              >
                Close Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

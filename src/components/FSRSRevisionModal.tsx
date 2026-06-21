import React, { useState, useEffect, useMemo } from 'react';
import { X, Brain, CheckCircle2, ChevronRight, AlertCircle, Eye, RefreshCw, Award } from 'lucide-react';
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

interface FSRSRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshFlags?: () => void;
}

interface FSRSRecord {
  interval: number; // in days
  ease: number; // ease factor
  due: string; // ISO date string
}

export function FSRSRevisionModal({ isOpen, onClose, onRefreshFlags }: FSRSRevisionModalProps) {
  const [queue, setQueue] = useState<PYQ[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [cardsReviewed, setCardsReviewed] = useState(0);

  // Initialize and load the queue
  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen]);

  const loadQueue = () => {
    // 1. Get confusion flagged question IDs
    let flaggedIds: number[] = [];
    try {
      flaggedIds = JSON.parse(localStorage.getItem('rrb_confusion_flags') || '[]');
    } catch {
      flaggedIds = [];
    }

    const allQs = pyqsData as PYQ[];
    let selectedQs: PYQ[] = [];

    // Filter questions by due date or flagged status
    const fsrsData: Record<number, FSRSRecord> = JSON.parse(localStorage.getItem('ksp_fsrs_intervals') || '{}');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter flagged questions that are due (or have no FSRS record yet)
    const dueFlagged = allQs.filter(q => {
      if (!flaggedIds.includes(q.id)) return false;
      const record = fsrsData[q.id];
      if (!record) return true; // not reviewed yet, due now
      return new Date(record.due) <= today;
    });

    selectedQs = dueFlagged;

    // 2. Fallback: If 0 cards are due, pull 10 weakest questions or random questions
    if (selectedQs.length === 0) {
      // Pick 10 questions with low accuracy or random if none
      const shuffled = [...allQs].sort(() => 0.5 - Math.random());
      selectedQs = shuffled.slice(0, 10);
    }

    setQueue(selectedQs);
    setCurrentIdx(0);
    setRevealed(false);
    setSessionCompleted(false);
    setCardsReviewed(0);
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!queue[currentIdx]) return;
    const qId = queue[currentIdx].id;

    // Load FSRS intervals object
    const fsrsData: Record<number, FSRSRecord> = JSON.parse(localStorage.getItem('ksp_fsrs_intervals') || '{}');
    const record = fsrsData[qId] || { interval: 0, ease: 2.5, due: '' };

    let newInterval = 1;
    let newEase = record.ease;

    // FSRS Spaced repetition calculation
    switch (rating) {
      case 'again':
        newInterval = 1; // repeat tomorrow
        newEase = Math.max(1.3, record.ease - 0.2);
        break;
      case 'hard':
        newInterval = record.interval === 0 ? 2 : Math.round(record.interval * 1.2);
        newEase = Math.max(1.3, record.ease - 0.15);
        break;
      case 'good':
        newInterval = record.interval === 0 ? 5 : Math.round(record.interval * record.ease);
        break;
      case 'easy':
        newInterval = record.interval === 0 ? 10 : Math.round(record.interval * record.ease * 1.5);
        newEase = record.ease + 0.15;
        // Ifrated Easy, remove from confusion/flagged list entirely since user mastered it
        try {
          const flaggedIds: number[] = JSON.parse(localStorage.getItem('rrb_confusion_flags') || '[]');
          const updated = flaggedIds.filter(id => id !== qId);
          localStorage.setItem('rrb_confusion_flags', JSON.stringify(updated));
          onRefreshFlags?.();
        } catch {}
        break;
    }

    // Save scheduled date
    const d = new Date();
    d.setDate(d.getDate() + newInterval);
    d.setHours(0, 0, 0, 0);

    fsrsData[qId] = {
      interval: newInterval,
      ease: parseFloat(newEase.toFixed(2)),
      due: d.toISOString()
    };
    localStorage.setItem('ksp_fsrs_intervals', JSON.stringify(fsrsData));

    setCardsReviewed(prev => prev + 1);

    // Proceed to next question in queue
    if (currentIdx < queue.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setRevealed(false);
    } else {
      setSessionCompleted(true);
    }
  };

  if (!isOpen) return null;

  const currentQ = queue[currentIdx];
  const progressPercent = queue.length > 0 ? Math.round((cardsReviewed / queue.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
      <div className="bg-surface-container border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl spring-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="text-secondary" size={20} />
            <h3 className="text-on-surface font-black text-base">ಇಂದಿನ ಪರಿಷ್ಕರಣೆ (Active Revision)</h3>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!sessionCompleted && currentQ ? (
            <div className="space-y-6">
              {/* Progress status */}
              <div className="space-y-1">
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                  <div className="h-full bg-gradient-to-r from-primary to-violet-500 progress-fill" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase text-on-surface-variant tracking-widest">
                  <span>Anki / FSRS Queue</span>
                  <span>Progress: {progressPercent}%</span>
                </div>
              </div>

              {/* Card Question face */}
              <div className="bg-white/5 border border-white/5 rounded-2xl p-6 shadow-inner relative overflow-hidden">
                <span className="text-[10px] font-black bg-primary/20 text-indigo-300 border border-primary/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {currentQ.subject} › {currentQ.topic}
                </span>
                <p className="text-sm font-bold text-on-surface mt-4 leading-relaxed whitespace-pre-wrap">
                  {cleanText(currentQ.question)}
                </p>
              </div>

              {/* Show Answer option or ratings */}
              {!revealed ? (
                <button
                  onClick={handleReveal}
                  className="w-full py-4 bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 text-white rounded-2xl font-black text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Eye size={16} className="text-secondary" />
                  Show Memory Answer Reveal
                </button>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  {/* Correct Option details */}
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider mb-1">✅ Correct Answer</p>
                    <p className="text-xs font-bold text-white leading-relaxed">
                      {String.fromCharCode(65 + currentQ.correctAnswer)}) {cleanText(currentQ.options[currentQ.correctAnswer])}
                    </p>
                  </div>

                  {/* Solution display */}
                  {currentQ.solution && (
                    <div className="bg-[#0c1220] border border-white/5 rounded-2xl p-4 text-xs text-on-surface-variant leading-relaxed">
                      <h5 className="font-black text-white mb-2 uppercase tracking-wide">📝 Explanation Details</h5>
                      <p className="whitespace-pre-wrap leading-relaxed">{cleanText(currentQ.solution)}</p>
                    </div>
                  )}

                  {/* Anki memory response ratings */}
                  <div className="space-y-2">
                    <p className="text-center text-[10px] font-black text-on-surface-variant uppercase tracking-wider">How well did you recall this?</p>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        onClick={() => handleRate('again')}
                        className="py-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center"
                      >
                        <span className="text-sm">🔴</span>
                        <span className="mt-1">Again</span>
                      </button>
                      <button
                        onClick={() => handleRate('hard')}
                        className="py-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center"
                      >
                        <span className="text-sm">🟡</span>
                        <span className="mt-1">Hard</span>
                      </button>
                      <button
                        onClick={() => handleRate('good')}
                        className="py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center"
                      >
                        <span className="text-sm">🟢</span>
                        <span className="mt-1">Good</span>
                      </button>
                      <button
                        onClick={() => handleRate('easy')}
                        className="py-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex flex-col items-center"
                      >
                        <span className="text-sm">🔵</span>
                        <span className="mt-1">Easy</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Completed Revision */
            <div className="text-center py-6 space-y-6 animate-fade-in">
              <div className="w-20 h-20 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 size={40} className="text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">Revision Session Complete!</h4>
                <p className="text-xs text-on-surface-variant mt-1.5">You have verified your memory stability records for this session.</p>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 max-w-sm mx-auto flex items-center gap-3">
                <div className="text-2xl text-secondary">🧠</div>
                <div className="text-left">
                  <h5 className="text-xs font-bold text-white">Stability Upgraded</h5>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Spaced repetition schedules adjust due dates based on recall ease.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/5 shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/5 text-on-surface border border-white/5 rounded-2xl font-bold text-xs hover:bg-white/10 active:scale-[0.98] transition-all"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}

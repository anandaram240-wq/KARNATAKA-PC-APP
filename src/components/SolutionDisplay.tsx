import React from 'react';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useLang } from '../lib/LanguageContext';

interface SolutionDisplayProps {
  solution: string;
  isVisible: boolean;
  onToggle: () => void;
  alwaysShow?: boolean;
  correctAnswer?: number;
  options?: string[];
  questionId?: number;
  question?: string;
  topic?: string;
  subject?: string;
}

export function SolutionDisplay({
  solution,
  isVisible,
  onToggle,
  alwaysShow = false,
  correctAnswer,
  options,
}: SolutionDisplayProps) {
  const { lang } = useLang();

  // If alwaysShow is true, it is always visible. Otherwise, check isVisible.
  const show = alwaysShow || isVisible;

  const getLetter = (idx?: number) => {
    if (idx === undefined) return '';
    return String.fromCharCode(65 + idx);
  };

  const getCorrectText = () => {
    if (correctAnswer === undefined || !options || !options[correctAnswer]) return '';
    return `${getLetter(correctAnswer)}) ${options[correctAnswer]}`;
  };

  // Clean solution text
  const cleanSolution = solution && solution.trim().length > 5 ? solution.trim() : '';

  if (!show) {
    return (
      <div className="mt-4">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 dark:bg-indigo-400/5 dark:hover:bg-indigo-400/10 border border-indigo-500/30 dark:border-indigo-400/30 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
              {lang === 'kn' ? 'ವಿವರಣೆಯನ್ನು ವೀಕ್ಷಿಸಿ' : 'View Explanation'}
            </span>
          </div>
          <ChevronDown size={16} className="text-indigo-600 dark:text-indigo-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-hidden shadow-sm">
      {/* Header */}
      {!alwaysShow && (
        <div
          onClick={onToggle}
          className="flex items-center justify-between px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {lang === 'kn' ? 'ವಿವರಣೆ' : 'Explanation'}
            </span>
          </div>
          <ChevronUp size={14} className="text-zinc-500" />
        </div>
      )}

      {/* Body */}
      <div className="p-4 space-y-3 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-normal whitespace-pre-wrap">
        {correctAnswer !== undefined && (
          <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold mb-2">
            ✅ {lang === 'kn' ? 'ಸರಿಯಾದ ಉತ್ತರ' : 'Correct Answer'}: {getCorrectText()}
          </div>
        )}
        
        {cleanSolution ? (
          <div className="text-xs sm:text-sm font-medium">
            {cleanSolution}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
            {lang === 'kn'
              ? 'ಈ ಪ್ರಶ್ನೆಗೆ ಯಾವುದೇ ಹೆಚ್ಚುವರಿ ವಿವರಣೆ ಲಭ್ಯವಿಲ್ಲ.'
              : 'No additional explanation available for this question.'}
          </p>
        )}
      </div>
    </div>
  );
}

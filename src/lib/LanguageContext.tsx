import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import enData from '../data/pyqs.json';
import { LANGUAGES, LangOption } from './languages';

export type { LangOption };


interface LanguageCtx {
  lang: string;
  langOption: LangOption;
  questions: any[];
  loading: boolean;
  setLang: (code: string) => void;
}

const LanguageContext = createContext<LanguageCtx>({
  lang: 'en', langOption: LANGUAGES[0], questions: enData as any[], loading: false,
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('rrb_lang') || 'en');
  const [questions, setQuestions] = useState<any[]>(enData as any[]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async (code: string) => {
    setLoading(true);
    if (code === 'en') {
      setQuestions(enData as any[]);
      setLoading(false);
      return;
    }
    if (code === 'kn') {
      // Map all 2499 questions on-the-fly to Kannada fields
      const knQuestions = enData.map((q: any) => ({
        ...q,
        question: q.question_kn && q.question_kn.trim() !== '' ? q.question_kn : q.question,
        options: q.options_kn && q.options_kn.length > 0 && q.options_kn.every(Boolean) ? q.options_kn : q.options,
        solution: q.solution_kn && q.solution_kn.trim() !== '' ? q.solution_kn : q.solution,
        shift: q.shift_kn && q.shift_kn.trim() !== '' ? q.shift_kn : q.shift,
        paper: q.paper_kn && q.paper_kn.trim() !== '' ? q.paper_kn : q.paper,
      }));
      setQuestions(knQuestions);
      setLoading(false);
      return;
    }
    try {
      const mod = await import(`../data/pyqs_${code}.json`);
      setQuestions(mod.default as any[]);
    } catch (e) {
      console.warn(`Failed to load pyqs_${code}.json, falling back to English`, e);
      setQuestions(enData as any[]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload when language changes
  useEffect(() => {
    loadData(lang);
  }, [lang, loadData]);

  const setLang = useCallback((code: string) => {
    localStorage.setItem('rrb_lang', code);
    setLangState(code);
  }, []);

  const langOption = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ lang, langOption, questions, loading, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() { return useContext(LanguageContext); }

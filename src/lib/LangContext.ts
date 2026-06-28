// src/lib/LangContext.ts
import { createContext } from 'react';
import type { Lang } from './i18n';

export const LangContext = createContext<Lang>('en');

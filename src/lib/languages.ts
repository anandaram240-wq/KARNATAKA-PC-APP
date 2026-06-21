// Language constants — kept separate from context to satisfy Vite Fast Refresh
export interface LangOption {
  code: string;
  name: string;
  native: string;
  flag: string;
}

export const LANGUAGES: LangOption[] = [
  { code: 'en', name: 'English',   native: 'English',  flag: '🇬🇧' },
  { code: 'kn', name: 'Kannada',   native: 'ಕನ್ನಡ',   flag: '🇮🇳' },
];


"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'en' | 'ar';
export type Direction = 'ltr' | 'rtl';

interface LanguageContextType {
  language: Language;
  direction: Direction;
  appName: string;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const APP_NAME_TRANSLATIONS: Record<Language, string> = {
  en: "Voya",
  ar: "فويا"
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [direction, setDirection] = useState<Direction>('ltr');
  const [appName, setAppName] = useState<string>(APP_NAME_TRANSLATIONS.en);

  useEffect(() => {
    // Attempt to load saved language from localStorage
    const savedLang = localStorage.getItem('voya_language') as Language | null;
    if (savedLang) {
      setLanguageState(savedLang);
      const newDirection = savedLang === 'ar' ? 'rtl' : 'ltr';
      setDirection(newDirection);
      setAppName(APP_NAME_TRANSLATIONS[savedLang]);
      document.documentElement.lang = savedLang;
      document.documentElement.dir = newDirection;
    } else {
      // Default to English if nothing is saved
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
      setAppName(APP_NAME_TRANSLATIONS.en);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    const newDirection = lang === 'ar' ? 'rtl' : 'ltr';
    setLanguageState(lang);
    setDirection(newDirection);
    setAppName(APP_NAME_TRANSLATIONS[lang]);
    document.documentElement.lang = lang;
    document.documentElement.dir = newDirection;
    localStorage.setItem('voya_language', lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  }, [language, setLanguage]);

  return (
    <LanguageContext.Provider value={{ language, direction, appName, toggleLanguage, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

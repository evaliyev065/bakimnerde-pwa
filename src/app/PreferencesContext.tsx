import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLanguage = "tr" | "en";
export type AppTheme = "light" | "dark";

export const LANGUAGE_STORAGE_KEY = "bakimnerde_pwa_language";
export const THEME_STORAGE_KEY = "bakimnerde_pwa_theme";

interface PreferencesValue {
  language: AppLanguage;
  locale: "tr-TR" | "en-US";
  theme: AppTheme;
  setLanguage(language: AppLanguage): void;
  setTheme(theme: AppTheme): void;
  toggleLanguage(): void;
  toggleTheme(): void;
  t(turkish: string, english: string): string;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

function storedLanguage(): AppLanguage {
  return localStorage.getItem(LANGUAGE_STORAGE_KEY) === "en" ? "en" : "tr";
}

function storedTheme(): AppTheme {
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(storedLanguage);
  const [theme, setTheme] = useState<AppTheme>(storedTheme);
  const t = useCallback((turkish: string, english: string) => language === "tr" ? turkish : english, [language]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const value = useMemo<PreferencesValue>(() => ({
    language,
    locale: language === "tr" ? "tr-TR" : "en-US",
    theme,
    setLanguage,
    setTheme,
    toggleLanguage: () => setLanguage((current) => current === "tr" ? "en" : "tr"),
    toggleTheme: () => setTheme((current) => current === "light" ? "dark" : "light"),
    t,
  }), [language, t, theme]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (value === null) throw new Error("PreferencesProvider is missing.");
  return value;
}

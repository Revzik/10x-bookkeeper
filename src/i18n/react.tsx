import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "./index";
import { normalizeLocale, t as translate } from "./index";

interface I18nContextValue {
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  t: (key) => key,
});

export const I18nProvider = ({ locale, children }: { locale?: string | null; children: ReactNode }) => {
  const normalizedLocale = normalizeLocale(locale);
  const value = useMemo<I18nContextValue>(() => {
    return {
      locale: normalizedLocale,
      t: (key, vars) => translate(normalizedLocale, key, vars),
    };
  }, [normalizedLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useT = (): I18nContextValue => useContext(I18nContext);

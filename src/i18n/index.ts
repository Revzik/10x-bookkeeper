import en from "./en.json";
import pl from "./pl.json";

export type Locale = "en" | "pl";
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  pl,
};

const getValueByPath = (object: Record<string, unknown>, path: string): string | undefined => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, object) as string | undefined;
};

export const normalizeLocale = (locale?: string | null): Locale => {
  if (locale?.toLowerCase().startsWith("pl")) {
    return "pl";
  }
  return "en";
};

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale] ?? dictionaries.en;

export const getLocalePrefix = (locale: Locale): string => (locale === "pl" ? "/pl" : "");

export const withLocalePath = (locale: Locale, path: string): string => {
  const prefix = getLocalePrefix(locale);
  if (!prefix) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${prefix}${normalizedPath === "/" ? "" : normalizedPath}`;
};

export const t = (locale: Locale, key: string, vars?: Record<string, string | number>): string => {
  const dictionary = getDictionary(locale);
  const value = getValueByPath(dictionary as Record<string, unknown>, key);

  if (!value) {
    return key;
  }

  if (!vars) {
    return value;
  }

  return Object.entries(vars).reduce((result, [name, replacement]) => {
    return result.replaceAll(`{${name}}`, String(replacement));
  }, value);
};

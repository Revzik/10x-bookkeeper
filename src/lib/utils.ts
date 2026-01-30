import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { type Locale, normalizeLocale, t } from "@/i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const getRelativeTimeLocale = (): Locale => {
  if (typeof document !== "undefined") {
    return normalizeLocale(document.documentElement.lang);
  }

  if (typeof navigator !== "undefined") {
    return normalizeLocale(navigator.language);
  }

  return "en";
};

/**
 * Format ISO timestamp to relative time string or date
 *
 * - < 1 minute: "just now"
 * - < 1 hour: "Xm ago"
 * - < 24 hours: "Xh ago"
 * - >= 24 hours: Formatted date (e.g., "Jan 15, 2024")
 */
export function formatRelativeTime(isoString: string): string {
  const locale = getRelativeTimeLocale();
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return t(locale, "common.time.justNow");
  }

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffMinutes < 60) {
    return formatter.format(-diffMinutes, "minute");
  }

  if (diffHours < 24) {
    return formatter.format(-diffHours, "hour");
  }

  // For anything 24h+, show the date
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

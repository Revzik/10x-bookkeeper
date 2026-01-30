import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitialTheme, toggleTheme, type Theme } from "@/lib/theme";
import { useT } from "@/i18n/react";

/**
 * ThemeToggle - Switch between light and dark themes
 *
 * Features:
 * - Persists preference to localStorage
 * - Respects system preference on first visit
 * - Smooth icon transition
 * - Accessible button with aria-label
 */
export const ThemeToggle = () => {
  const { t } = useT();
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  const handleToggle = () => {
    setTheme((current) => toggleTheme(current));
  };

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled aria-label={t("common.theme.loading")}>
        <div className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="h-9 w-9 p-0"
      aria-label={theme === "light" ? t("common.theme.switchToDark") : t("common.theme.switchToLight")}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 transition-transform duration-200" />
      ) : (
        <Sun className="h-4 w-4 transition-transform duration-200" />
      )}
    </Button>
  );
};

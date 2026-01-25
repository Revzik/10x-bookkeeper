import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInitialTheme, toggleTheme, type Theme } from "@/lib/theme";

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
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" disabled aria-label="Theme toggle loading">
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
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4 transition-transform duration-200" />
      ) : (
        <Sun className="h-4 w-4 transition-transform duration-200" />
      )}
    </Button>
  );
};

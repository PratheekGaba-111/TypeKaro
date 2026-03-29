import React, { useCallback, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "ui.theme";

const isTheme = (value: unknown): value is Theme => value === "dark" || value === "light";

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "dark";
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }

  const attr = document.documentElement.dataset.theme;
  if (isTheme(attr)) {
    return attr;
  }

  return "dark";
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme,
    toggleTheme
  }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
};


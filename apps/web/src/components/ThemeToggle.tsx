import React from "react";
import { useTheme } from "../state/ThemeContext";

export const ThemeToggle: React.FC = React.memo(() => {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === "dark" ? "Light" : "Dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Switch to ${nextLabel} theme`}
      title={`Switch to ${nextLabel} theme`}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className={`theme-toggle-thumb ${theme === "light" ? "theme-toggle-thumb-on" : ""}`} />
      </span>
      <span className="theme-toggle-text">{theme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
});


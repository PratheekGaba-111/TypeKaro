import React from "react";
import { ThemeToggle } from "./ThemeToggle";

export const AuthShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen items-center justify-center mesh-bg px-6">
      <div className="gradient-panel page-enter relative w-full max-w-md rounded-3xl p-10 shadow-glow">
        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip chip-mint">Access Pass</span>
            <span className="chip chip-lilac">Level Gate</span>
          </div>
          <h1 className="mt-3 font-display text-3xl text-cloud">TypeKaro</h1>
          <p className="mt-3 text-sm text-cloud/70">
            Sign in to track your progress and level up your typing skills.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
};

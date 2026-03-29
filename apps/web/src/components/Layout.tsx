import React, { useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { api } from "../lib/api";
import { ThemeToggle } from "./ThemeToggle";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link ${isActive ? "nav-link-active" : ""}`;

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch {
      // ignore
    }
    logout();
    navigate("/login");
  }, [logout, navigate]);

  return (
    <div className="min-h-screen mesh-bg">
      <header className="site-header flex flex-col gap-4 border-b border-overlay/10 px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip chip-mint">Arcade Mode</span>
            <span className="chip chip-lilac">Mastery Track</span>
          </div>
          <h1 className="mt-3 font-display text-3xl text-cloud">Typing Mastery</h1>
          <p className="text-xs uppercase tracking-[0.4em] text-cloud/50">Training Hub</p>
        </div>
        <nav className="flex flex-wrap items-center gap-3">
          <NavLink to="/typing" className={linkClass}>
            Typing Lab
          </NavLink>
          <NavLink to="/piano" className={linkClass}>
            Piano Tiles
          </NavLink>
          <NavLink to="/bubbles" className={linkClass}>
            Bubble Keys
          </NavLink>
          <NavLink to="/word-rush" className={linkClass}>
            Word Rush
          </NavLink>
          <NavLink to="/results" className={linkClass}>
            Results
          </NavLink>
          <NavLink to="/dashboard" className={linkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            History
          </NavLink>
        </nav>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <span className="text-xs text-cloud/60">{user.email}</span>
              <button
                onClick={handleLogout}
                className="btn-outline btn-outline-sm"
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </header>
      <main className="page-enter mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        {children}
      </main>
    </div>
  );
};

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserDTO } from "@app/shared";

const STORAGE_KEY = "typing_user";

interface AuthContextValue {
  user: UserDTO | null;
  setUser: (user: UserDTO | null) => void;
  logout: () => void;
  isHydrating: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserDTO | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setUserState(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsHydrating(false);
  }, []);

  const setUser = (next: UserDTO | null) => {
    setUserState(next);
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const logout = () => {
    setUser(null);
  };

  const value = useMemo(() => ({ user, setUser, logout, isHydrating }), [user, isHydrating]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

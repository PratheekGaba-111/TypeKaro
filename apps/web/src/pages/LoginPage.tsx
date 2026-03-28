import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import type { AuthResponse } from "@app/shared";
import { useAuth } from "../state/AuthContext";
import { AuthShell } from "../components/AuthShell";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? "/typing";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await api.post<AuthResponse>("/api/auth/login", {
        email,
        password
      });
      setUser(response.user);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-xs uppercase tracking-[0.2em] text-cloud/60">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input-field"
          placeholder="you@studio.com"
          required
        />
        <label className="text-xs uppercase tracking-[0.2em] text-cloud/60">Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input-field"
          placeholder="Minimum 8 characters"
          required
        />
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-xs text-cloud/60">
          Need an account?{" "}
          <Link to="/signup" className="link-accent">
            Create one
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

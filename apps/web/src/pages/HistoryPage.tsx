import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { HistoryResponse, SessionDTO } from "@app/shared";

export const HistoryPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionDTO[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get<HistoryResponse>("/api/history");
        setSessions(response.sessions);
      } catch {
        setSessions([]);
      }
    };
    load();
  }, []);

  const rows = useMemo(
    () =>
      sessions.map((session) => ({
        ...session,
        displayTime: new Date(session.createdAt).toLocaleString()
      })),
    [sessions]
  );

  const handleClear = async () => {
    const confirmed = window.confirm("Clear all history for this account?");
    if (!confirmed) {
      return;
    }
    try {
      await api.delete("/api/history");
      setSessions([]);
    } catch {
      // ignore
    }
  };

  return (
    <div className="gradient-panel rounded-3xl p-8 shadow-glow">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Session History</p>
          <h2 className="mt-2 font-display text-2xl">All runs</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-cloud/60">{rows.length} sessions</span>
          <button onClick={handleClear} className="btn-outline btn-outline-sm text-accent">
            Clear History
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <p className="text-cloud/70">No sessions yet. Complete a typing run to populate history.</p>
        ) : (
          rows.map((session) => (
            <div
              key={session.id}
              className="session-row flex flex-col gap-2 rounded-2xl p-5 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm text-cloud/70">
                  {session.displayTime}
                </p>
                <p className="mt-1 font-display text-lg text-cloud">WPM {session.wpm}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-cloud/70">
                <span>Accuracy: {session.accuracy}%</span>
                <span>Net WPM: {session.netWpm}</span>
                <span>Efficiency: {session.efficiency}</span>
              </div>
              <Link to={`/history/${session.id}`} className="btn-outline btn-outline-sm">
                View
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

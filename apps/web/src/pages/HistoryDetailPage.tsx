import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { HistoryItemResponse, SessionDTO } from "@app/shared";
import { StatCard } from "../components/StatCard";
import { TranscriptDiff } from "../components/TranscriptDiff";
import { diffStrings } from "../utils/diff";

export const HistoryDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Session not found.");
      return;
    }
    const load = async () => {
      try {
        const response = await api.get<HistoryItemResponse>(`/api/history/${id}`);
        setSession(response.session);
      } catch {
        setError("Session not found.");
      }
    };
    load();
  }, [id]);

  const diff = useMemo(() => {
    if (!session?.targetText || !session?.typedText) {
      return null;
    }
    return diffStrings(session.targetText, session.typedText);
  }, [session]);

  const targetLength = session?.targetText ? session.targetText.length : session?.textLength ?? 0;

  if (error) {
    return (
      <div className="gradient-panel rounded-3xl p-8 shadow-glow">
        <h2 className="font-display text-2xl">Session unavailable</h2>
        <p className="mt-3 text-cloud/70">{error}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => navigate(-1)} className="btn-outline btn-outline-sm">
            Go back
          </button>
          <Link to="/history" className="btn-outline btn-outline-sm">
            History
          </Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="panel-solid rounded-3xl border border-white/10 px-6 py-8 text-sm text-cloud/70">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Session Detail</p>
            <h2 className="mt-2 font-display text-2xl">History Replay</h2>
            <p className="mt-2 text-sm text-cloud/60">
              {new Date(session.createdAt).toLocaleString()}
            </p>
          </div>
          <Link to="/history" className="btn-outline btn-outline-sm">
            Back to History
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-6">
          <StatCard label="WPM" value={session.wpm} />
          <StatCard label="Accuracy" value={`${session.accuracy}%`} />
          <StatCard label="Net WPM" value={session.netWpm} />
          <StatCard label="Efficiency" value={session.efficiency} />
        </div>
        <div className="grid gap-6">
          <StatCard label="Time Taken" value={`${(session.timeTakenMs / 1000).toFixed(1)}s`} />
          <StatCard label="Target Length" value={targetLength} />
          <StatCard label="Errors" value={diff?.errors ?? 0} />
        </div>
      </section>

      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Transcript</p>
        <div className="mt-4">
          {session.targetText && session.typedText ? (
            <TranscriptDiff targetText={session.targetText} typedText={session.typedText} />
          ) : (
            <p className="text-cloud/70">Transcript not stored for this session.</p>
          )}
        </div>
      </section>
    </div>
  );
};

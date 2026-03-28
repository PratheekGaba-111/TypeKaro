import React, { useEffect, useMemo, useState } from "react";
import { StatCard } from "../components/StatCard";
import { api } from "../lib/api";
import type { HistoryResponse, SessionDTO } from "@app/shared";
import { ProgressBar } from "../components/ProgressBar";
import { calculateXp, summarizeGamification } from "../utils/gamification";
import { diffStrings } from "../utils/diff";
import { TranscriptDiff } from "../components/TranscriptDiff";

const RESULT_KEY = "last_result";

interface StoredResult {
  sessionId: string;
  metrics: {
    wpm: number;
    accuracy: number;
    netWpm: number;
    efficiency: number;
  };
  imageUrl: string;
  generationTimeMs: number;
  targetText: string;
  typedText: string;
  timeTakenMs: number;
  drillId?: string;
  drillLabel?: string;
  targetAccuracy?: number | null;
  targetWpm?: number | null;
  baseXp?: number;
  bonusXp?: number;
  totalXp?: number;
  meetsTarget?: boolean;
}

export const ResultsPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const result = useMemo<StoredResult | null>(() => {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredResult;
    } catch {
      return null;
    }
  }, []);

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

  const gamification = useMemo(() => summarizeGamification(sessions), [sessions]);
  const diff = useMemo(
    () => (result ? diffStrings(result.targetText, result.typedText) : null),
    [result]
  );
  const xpEarned = result
    ? result.totalXp ?? calculateXp(result.metrics.netWpm, result.metrics.accuracy)
    : 0;
  const xpBonus = result?.bonusXp ?? 0;
  const accuracy = result?.metrics.accuracy ?? 0;
  const errorRate = Math.max(0, Math.round((100 - accuracy) * 100) / 100);
  const errorCount = diff?.errors ?? 0;
  const grade = accuracy >= 97 ? "A" : accuracy >= 93 ? "B" : accuracy >= 85 ? "C" : "D";
  const focusTip =
    accuracy < 90
      ? "Slow down and prioritize accuracy before speed."
      : result && result.metrics.wpm < 40
      ? "Increase speed with shorter bursts and steady rhythm."
      : "Great balance. Focus on consistency to level up.";

  if (!result) {
    return (
      <div className="gradient-panel rounded-3xl p-8 shadow-glow">
        <h2 className="font-display text-2xl">No results yet</h2>
        <p className="mt-3 text-cloud/70">
          Run a typing session in the lab to see your session report.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 md:grid-cols-2">
        <div className="gradient-panel rounded-3xl p-8 shadow-glow">
          <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Session Reward</p>
          <h2 className="mt-3 font-display text-2xl">XP Earned</h2>
          <p className="mt-4 font-display text-4xl text-mint">+{xpEarned} XP</p>
          {xpBonus > 0 ? (
            <p className="mt-2 text-sm text-cloud/60">Includes +{xpBonus} XP bonus</p>
          ) : null}
          <p className="mt-3 text-sm text-cloud/60">
            Current streak: {gamification.streak} days
          </p>
          {result.drillLabel ? (
            <p className="mt-3 text-sm text-cloud/60">Drill: {result.drillLabel}</p>
          ) : null}
          {typeof result.meetsTarget === "boolean" ? (
            <p className="mt-2 text-sm text-cloud/60">
              {result.meetsTarget ? "Target met. Bonus awarded." : "Target missed. Try again."}
            </p>
          ) : null}
          <div className="mt-6">
            <ProgressBar
              label={`Level ${gamification.level}`}
              value={gamification.currentLevelXp}
              max={500}
            />
          </div>
        </div>
        <div className="grid gap-6">
          <StatCard label="WPM" value={result.metrics.wpm} />
          <StatCard label="Accuracy" value={`${result.metrics.accuracy}%`} />
          <StatCard label="Net WPM" value={result.metrics.netWpm} />
          <StatCard label="Efficiency" value={result.metrics.efficiency} />
        </div>
      </section>

      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Session Summary</p>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          <StatCard label="Time Taken" value={`${(result.timeTakenMs / 1000).toFixed(1)}s`} />
          <StatCard label="Target Length" value={result.targetText.length} />
          <StatCard label="Typed Length" value={result.typedText.length} />
        </div>
      </section>

      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Session Feedback</p>
        <div className="mt-4 grid gap-6 md:grid-cols-4">
          <StatCard label="Grade" value={grade} />
          <StatCard label="Error Rate" value={`${errorRate}%`} />
          <StatCard label="Errors" value={errorCount} />
          <StatCard label="Focus Tip" value={focusTip} />
        </div>
      </section>

      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Transcript</p>
        <div className="mt-4">
          <TranscriptDiff targetText={result.targetText} typedText={result.typedText} />
        </div>
      </section>
    </div>
  );
};

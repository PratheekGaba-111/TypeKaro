import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../components/StatCard";
import { api } from "../lib/api";
import type { HistoryResponse, SessionDTO } from "@app/shared";
import { ProgressBar } from "../components/ProgressBar";
import { calculateXp, summarizeGamification } from "../utils/gamification";
import { diffStrings } from "../utils/diff";
import { TranscriptDiff } from "../components/TranscriptDiff";
import {
  averageMetrics,
  countSessionsInLastDays,
  getCoachFocus,
  getTrendDeltas,
  readWeeklySessionsGoal
} from "../utils/insights";

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
  const weeklyGoal = useMemo(() => readWeeklySessionsGoal(), []);
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

  const sessionsForInsights = useMemo(() => {
    if (!result) {
      return sessions;
    }
    if (sessions.some((session) => session.id === result.sessionId)) {
      return sessions;
    }
    const synthetic: SessionDTO = {
      id: result.sessionId,
      userId: "",
      textLength: result.targetText.length,
      timeTakenMs: result.timeTakenMs,
      wpm: result.metrics.wpm,
      accuracy: result.metrics.accuracy,
      netWpm: result.metrics.netWpm,
      generationTimeMs: result.generationTimeMs,
      efficiency: result.metrics.efficiency,
      imageUrl: result.imageUrl,
      targetText: result.targetText,
      typedText: result.typedText,
      createdAt: new Date().toISOString()
    };
    return [synthetic, ...sessions];
  }, [result, sessions]);

  const weeklyCount = useMemo(() => countSessionsInLastDays(sessionsForInsights, 7), [sessionsForInsights]);
  const onTrack = weeklyCount >= weeklyGoal;

  const baselineSessions = useMemo(() => {
    if (!result) return sessionsForInsights;
    return sessionsForInsights.filter((session) => session.id !== result.sessionId);
  }, [result, sessionsForInsights]);

  const last5 = useMemo(() => baselineSessions.slice(0, 5), [baselineSessions]);
  const last5Avg = useMemo(() => averageMetrics(last5), [last5]);
  const trends = useMemo(() => getTrendDeltas(baselineSessions, 3), [baselineSessions]);
  const coach = useMemo(() => getCoachFocus(sessionsForInsights, result?.targetText), [result?.targetText, sessionsForInsights]);

  const xpEarned = result
    ? result.totalXp ?? calculateXp(result.metrics.netWpm, result.metrics.accuracy)
    : 0;
  const xpBonus = result?.bonusXp ?? 0;
  const accuracy = result?.metrics.accuracy ?? 0;
  const errorRate = Math.max(0, Math.round((100 - accuracy) * 100) / 100);
  const errorCount = diff?.errors ?? 0;
  const grade = accuracy >= 97 ? "A" : accuracy >= 93 ? "B" : accuracy >= 85 ? "C" : "D";

  const formatSigned = (value: number, suffix = "", decimals = 1) => {
    if (!Number.isFinite(value)) return "—";
    const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals;
    const sign = rounded > 0 ? "+" : "";
    return `${sign}${rounded}${suffix}`;
  };

  const trendChip = (() => {
    const direction = trends.direction?.netWpm ?? "flat";
    if (direction === "up") return { label: "Trend: Up", className: "chip chip-mint" };
    if (direction === "down") return { label: "Trend: Down", className: "chip" };
    return { label: "Trend: Flat", className: "chip chip-lilac" };
  })();

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
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/typing" className="btn-outline btn-outline-sm">
              Back to Typing Lab
            </Link>
            {result.sessionId ? (
              <Link to={`/history/${result.sessionId}`} className="btn-outline btn-outline-sm">
                View in History
              </Link>
            ) : null}
          </div>
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Compared to you</p>
            <h2 className="mt-2 font-display text-2xl">Recent trend</h2>
          </div>
          <span className={trendChip.className}>{trendChip.label}</span>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <StatCard
            label="WPM Δ"
            value={last5.length ? formatSigned(result.metrics.wpm - last5Avg.wpm) : "—"}
            hint={last5.length ? `Last 5 avg: ${last5Avg.wpm}` : "Complete 1+ sessions to compare."}
          />
          <StatCard
            label="Accuracy Δ"
            value={last5.length ? formatSigned(result.metrics.accuracy - last5Avg.accuracy, "%") : "—"}
            hint={last5.length ? `Last 5 avg: ${last5Avg.accuracy}%` : "Complete 1+ sessions to compare."}
          />
          <StatCard
            label="Net WPM Δ"
            value={last5.length ? formatSigned(result.metrics.netWpm - last5Avg.netWpm) : "—"}
            hint={last5.length ? `Last 5 avg: ${last5Avg.netWpm}` : "Complete 1+ sessions to compare."}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="gradient-panel rounded-3xl p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Coach</p>
              <h2 className="mt-2 font-display text-2xl">{coach.title}</h2>
            </div>
            <span className="chip chip-mint">Next step</span>
          </div>
          <p className="mt-4 text-sm text-cloud/70">{coach.reason}</p>
          <ul className="mt-5 space-y-2 text-sm text-cloud/70">
            {coach.nextSteps.map((step) => (
              <li key={step} className="flex gap-2">
                <span className="text-mint">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to={`/typing?drill=${coach.drillId}`} className="btn-primary">
              {coach.ctaLabel}
            </Link>
            <Link to="/typing" className="btn-outline">
              Open Typing Lab
            </Link>
          </div>
        </div>

        <div className="gradient-panel rounded-3xl p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Weekly goal</p>
              <h3 className="mt-2 font-display text-2xl">Sessions</h3>
            </div>
            <span className={onTrack ? "chip chip-mint" : "chip"}>{onTrack ? "On track" : "Catch up"}</span>
          </div>
          <p className="mt-4 text-sm text-cloud/70">
            {weeklyCount} / {weeklyGoal} sessions in the last 7 days.
          </p>
          <div className="mt-6">
            <ProgressBar value={weeklyCount} max={weeklyGoal} unit="sessions" />
          </div>
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
          <StatCard label="Coach Focus" value={coach.title} hint={coach.reason} />
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

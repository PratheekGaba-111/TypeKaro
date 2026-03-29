import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../lib/api";
import type { HistoryResponse, SessionDTO } from "@app/shared";
import { StatCard } from "../components/StatCard";
import { ProgressBar } from "../components/ProgressBar";
import { summarizeGamification } from "../utils/gamification";
import {
  countSessionsInLastDays,
  filterSessionsInLastDays,
  getCoachFocus,
  readWeeklySessionsGoal,
  writeWeeklySessionsGoal
} from "../utils/insights";

export const DashboardPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(() => readWeeklySessionsGoal());
  const [range, setRange] = useState<"7" | "30" | "all">("30");

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

  const weeklyCount = useMemo(() => countSessionsInLastDays(sessions, 7), [sessions]);
  const onTrack = weeklyCount >= weeklyGoal;
  const coach = useMemo(() => getCoachFocus(sessions), [sessions]);

  const rangeSessions = useMemo(() => {
    if (range === "all") {
      return sessions;
    }
    const days = range === "7" ? 7 : 30;
    return filterSessionsInLastDays(sessions, days);
  }, [range, sessions]);

  const stats = useMemo(() => {
    if (!sessions.length) {
      return { avgWpm: 0, bestWpm: 0, avgAccuracy: 0, avgEfficiency: 0, count: 0 };
    }
    const totalWpm = sessions.reduce((sum, s) => sum + s.wpm, 0);
    const totalAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0);
    const totalEfficiency = sessions.reduce((sum, s) => sum + s.efficiency, 0);
    const bestWpm = Math.max(...sessions.map((s) => s.wpm));
    return {
      avgWpm: Math.round((totalWpm / sessions.length) * 100) / 100,
      bestWpm,
      avgAccuracy: Math.round((totalAccuracy / sessions.length) * 100) / 100,
      avgEfficiency: Math.round((totalEfficiency / sessions.length) * 100) / 100,
      count: sessions.length
    };
  }, [sessions]);

  const gamification = useMemo(() => summarizeGamification(sessions), [sessions]);

  const formatAxisDate = (createdAt: string) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const chartData = useMemo(() => {
    const chronological = [...rangeSessions].reverse();
    return chronological.map((session, index) => ({
      name: formatAxisDate(session.createdAt) || `${index + 1}`,
      fullLabel: new Date(session.createdAt).toLocaleString(),
      wpm: session.wpm,
      accuracy: session.accuracy,
      efficiency: session.efficiency
    }));
  }, [rangeSessions]);

  const recentRows = useMemo(
    () =>
      rangeSessions.slice(0, 5).map((session) => ({
        ...session,
        displayTime: new Date(session.createdAt).toLocaleString()
      })),
    [rangeSessions]
  );

  const tooltipStyles = useMemo(
    () => ({
      content: {
        background: "linear-gradient(145deg, rgb(var(--c-ink) / 0.92), rgb(var(--c-ink) / 0.78))",
        border: "1px solid rgb(var(--c-overlay) / 0.14)",
        borderRadius: "14px",
        boxShadow: "0 18px 44px rgb(0 0 0 / 0.22)",
        backdropFilter: "blur(16px)"
      } satisfies React.CSSProperties,
      label: { color: "rgb(var(--c-cloud) / 0.95)" } satisfies React.CSSProperties,
      item: { color: "rgb(var(--c-cloud) / 0.85)" } satisfies React.CSSProperties
    }),
    []
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Level" value={`Lv ${gamification.level}`} />
        <StatCard label="Total XP" value={gamification.totalXp} />
        <StatCard label="Streak" value={`${gamification.streak} days`} />
        <StatCard label="Sessions" value={stats.count} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="gradient-panel rounded-3xl p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Weekly goal</p>
              <h2 className="mt-2 font-display text-2xl">Sessions</h2>
            </div>
            <span className={onTrack ? "chip chip-mint" : "chip"}>{onTrack ? "On track" : "Catch up"}</span>
          </div>
          <p className="mt-4 text-sm text-cloud/70">
            {weeklyCount} / {weeklyGoal} sessions in the last 7 days.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setWeeklyGoal((prev) => writeWeeklySessionsGoal(prev - 1))}
              className="btn-outline btn-outline-sm"
              aria-label="Decrease weekly goal"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={50}
              value={weeklyGoal}
              onChange={(event) => setWeeklyGoal(writeWeeklySessionsGoal(Number(event.target.value)))}
              className="input-field w-28 text-center"
            />
            <button
              onClick={() => setWeeklyGoal((prev) => writeWeeklySessionsGoal(prev + 1))}
              className="btn-outline btn-outline-sm"
              aria-label="Increase weekly goal"
            >
              +
            </button>
          </div>
          <div className="mt-6">
            <ProgressBar value={weeklyCount} max={weeklyGoal} unit="sessions" />
          </div>
        </div>

        <div className="gradient-panel rounded-3xl p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Coach focus</p>
              <h2 className="mt-2 font-display text-2xl">This week: {coach.title}</h2>
            </div>
            <span className="chip chip-lilac">Coach</span>
          </div>
          <p className="mt-4 text-sm text-cloud/70">{coach.reason}</p>
          <ul className="mt-5 space-y-2 text-sm text-cloud/70">
            {coach.nextSteps.slice(0, 3).map((step) => (
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
              Go to Typing Lab
            </Link>
          </div>
        </div>
      </section>

      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Level Progress</p>
            <h2 className="mt-2 font-display text-2xl">XP to Next Level</h2>
          </div>
          <p className="text-sm text-cloud/60">{gamification.xpToNext} XP needed</p>
        </div>
        <div className="mt-6">
          <ProgressBar value={gamification.currentLevelXp} max={500} />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <StatCard label="Avg WPM" value={stats.avgWpm} />
        <StatCard label="Best WPM" value={stats.bestWpm} />
        <StatCard label="Avg Accuracy" value={`${stats.avgAccuracy}%`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="gradient-panel rounded-3xl p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Performance</p>
              <h2 className="mt-2 font-display text-2xl">WPM & Accuracy</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRange("7")}
                className={range === "7" ? "chip chip-mint" : "chip"}
              >
                Last 7
              </button>
              <button
                onClick={() => setRange("30")}
                className={range === "30" ? "chip chip-mint" : "chip"}
              >
                Last 30
              </button>
              <button
                onClick={() => setRange("all")}
                className={range === "all" ? "chip chip-mint" : "chip"}
              >
                All
              </button>
            </div>
          </div>
          <p className="mt-4 text-sm text-cloud/60">Efficiency avg: {stats.avgEfficiency}</p>
          <div className="mt-6 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgb(var(--c-overlay) / 0.14)" strokeDasharray="4 4" />
                <XAxis
                  dataKey="name"
                  stroke="rgb(var(--c-cloud) / 0.65)"
                  tick={{ fill: "rgb(var(--c-cloud) / 0.75)" }}
                />
                <YAxis
                  stroke="rgb(var(--c-cloud) / 0.65)"
                  tick={{ fill: "rgb(var(--c-cloud) / 0.75)" }}
                />
                <Tooltip
                  contentStyle={tooltipStyles.content}
                  labelStyle={tooltipStyles.label}
                  itemStyle={tooltipStyles.item}
                  labelFormatter={(_, payload) =>
                    payload && payload.length ? String(payload[0]?.payload?.fullLabel ?? "") : ""
                  }
                />
                <Line type="monotone" dataKey="wpm" stroke="rgb(var(--c-mint) / 1)" strokeWidth={2} />
                <Line type="monotone" dataKey="accuracy" stroke="rgb(var(--c-lilac) / 1)" strokeWidth={2} />
                <Line type="monotone" dataKey="efficiency" stroke="rgb(var(--c-accent) / 1)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="gradient-panel rounded-3xl p-8 shadow-glow">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Recent sessions</p>
              <h3 className="mt-2 font-display text-2xl">Last 5</h3>
            </div>
            <span className="text-sm text-cloud/60">{rangeSessions.length} in range</span>
          </div>
          <div className="mt-6 space-y-4">
            {recentRows.length === 0 ? (
              <p className="text-sm text-cloud/70">No sessions yet. Complete a run in Typing Lab.</p>
            ) : (
              recentRows.map((session) => (
                <div key={session.id} className="rounded-2xl border border-overlay/10 bg-overlay/5 p-4">
                  <p className="text-xs text-cloud/60">{session.displayTime}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <p className="font-display text-lg text-cloud">WPM {session.wpm}</p>
                    <span className="text-sm text-cloud/70">Acc {session.accuracy}%</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link to={`/history/${session.id}`} className="btn-outline btn-outline-sm">
                      View
                    </Link>
                    <span className="text-xs text-cloud/60">Net {session.netWpm}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

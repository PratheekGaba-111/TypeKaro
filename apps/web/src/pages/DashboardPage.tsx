import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../lib/api";
import type { HistoryResponse, SessionDTO } from "@app/shared";
import { StatCard } from "../components/StatCard";
import { ProgressBar } from "../components/ProgressBar";
import { summarizeGamification } from "../utils/gamification";

export const DashboardPage: React.FC = () => {
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

  const chartData = useMemo(() => {
    const chronological = [...sessions].reverse();
    return chronological.map((session, index) => ({
      name: `${index + 1}`,
      wpm: session.wpm,
      accuracy: session.accuracy,
      efficiency: session.efficiency
    }));
  }, [sessions]);

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

      <section className="gradient-panel rounded-3xl p-8 shadow-glow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cloud/60">Performance</p>
            <h2 className="mt-2 font-display text-2xl">WPM & Accuracy</h2>
          </div>
          <p className="text-sm text-cloud/60">Efficiency avg: {stats.avgEfficiency}</p>
        </div>
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
              />
              <Line type="monotone" dataKey="wpm" stroke="rgb(var(--c-mint) / 1)" strokeWidth={2} />
              <Line type="monotone" dataKey="accuracy" stroke="rgb(var(--c-lilac) / 1)" strokeWidth={2} />
              <Line type="monotone" dataKey="efficiency" stroke="rgb(var(--c-accent) / 1)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};

import type { SessionDTO } from "@app/shared";
import type { DrillId } from "./drills";

export const WEEKLY_SESSIONS_GOAL_KEY = "goals.weekly_sessions.v1";
export const DEFAULT_WEEKLY_SESSIONS_GOAL = 5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const readWeeklySessionsGoal = () => {
  try {
    const raw = localStorage.getItem(WEEKLY_SESSIONS_GOAL_KEY);
    if (!raw) return DEFAULT_WEEKLY_SESSIONS_GOAL;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_WEEKLY_SESSIONS_GOAL;
    return clamp(Math.floor(parsed), 1, 50);
  } catch {
    return DEFAULT_WEEKLY_SESSIONS_GOAL;
  }
};

export const writeWeeklySessionsGoal = (goal: number) => {
  const safe = clamp(Math.floor(goal), 1, 50);
  try {
    localStorage.setItem(WEEKLY_SESSIONS_GOAL_KEY, String(safe));
  } catch {
    // ignore
  }
  return safe;
};

const parseCreatedAtMs = (createdAt: string) => {
  const ms = Date.parse(createdAt);
  return Number.isFinite(ms) ? ms : null;
};

export const filterSessionsInLastDays = (sessions: SessionDTO[], days: number, nowMs = Date.now()) => {
  const windowMs = days * 24 * 60 * 60 * 1000;
  const cutoff = nowMs - windowMs;
  return sessions.filter((session) => {
    const createdAtMs = parseCreatedAtMs(session.createdAt);
    if (createdAtMs === null) return false;
    return createdAtMs >= cutoff;
  });
};

export const countSessionsInLastDays = (sessions: SessionDTO[], days: number, nowMs = Date.now()) =>
  filterSessionsInLastDays(sessions, days, nowMs).length;

export interface MetricAverages {
  wpm: number;
  accuracy: number;
  netWpm: number;
}

export const averageMetrics = (sessions: SessionDTO[]): MetricAverages => {
  if (!sessions.length) {
    return { wpm: 0, accuracy: 0, netWpm: 0 };
  }
  const total = sessions.reduce(
    (acc, session) => {
      acc.wpm += session.wpm;
      acc.accuracy += session.accuracy;
      acc.netWpm += session.netWpm;
      return acc;
    },
    { wpm: 0, accuracy: 0, netWpm: 0 }
  );
  return {
    wpm: Math.round((total.wpm / sessions.length) * 100) / 100,
    accuracy: Math.round((total.accuracy / sessions.length) * 100) / 100,
    netWpm: Math.round((total.netWpm / sessions.length) * 100) / 100
  };
};

export type TrendDirection = "up" | "down" | "flat";

export const trendDirection = (delta: number, threshold: number) => {
  if (!Number.isFinite(delta)) return "flat" as const;
  if (delta > threshold) return "up" as const;
  if (delta < -threshold) return "down" as const;
  return "flat" as const;
};

export interface TrendDeltas {
  lastAvg: MetricAverages;
  prevAvg: MetricAverages | null;
  delta: MetricAverages | null;
  direction: { wpm: TrendDirection; accuracy: TrendDirection; netWpm: TrendDirection } | null;
}

export const getTrendDeltas = (sessions: SessionDTO[], windowSize = 3): TrendDeltas => {
  const last = sessions.slice(0, windowSize);
  const prev = sessions.slice(windowSize, windowSize * 2);
  const lastAvg = averageMetrics(last);
  if (!prev.length) {
    return { lastAvg, prevAvg: null, delta: null, direction: null };
  }
  const prevAvg = averageMetrics(prev);
  const delta = {
    wpm: Math.round((lastAvg.wpm - prevAvg.wpm) * 100) / 100,
    accuracy: Math.round((lastAvg.accuracy - prevAvg.accuracy) * 100) / 100,
    netWpm: Math.round((lastAvg.netWpm - prevAvg.netWpm) * 100) / 100
  };
  return {
    lastAvg,
    prevAvg,
    delta,
    direction: {
      wpm: trendDirection(delta.wpm, 0.5),
      accuracy: trendDirection(delta.accuracy, 0.25),
      netWpm: trendDirection(delta.netWpm, 0.5)
    }
  };
};

const countMatches = (text: string, regex: RegExp) => {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
};

const pickEnduranceDrill = (text: string): DrillId => {
  const safe = text || "";
  const digits = countMatches(safe, /\d/g);
  const punctuation = countMatches(safe, /[.,!?;:'"()[\]{}\-—]/g);
  if (digits >= 3) return "numbers";
  if (punctuation >= 3) return "punctuation";
  return "long";
};

export interface CoachFocus {
  focusId: "accuracy" | "speed" | "endurance";
  title: string;
  drillId: DrillId;
  ctaLabel: string;
  reason: string;
  nextSteps: string[];
}

export const getCoachFocus = (sessions: SessionDTO[], targetText?: string): CoachFocus => {
  if (!sessions.length) {
    return {
      focusId: "accuracy",
      title: "Start with accuracy",
      drillId: "accuracy",
      ctaLabel: "Start Accuracy Drill",
      reason: "Build clean keystrokes first. A strong accuracy base makes speed gains feel effortless.",
      nextSteps: [
        "Aim for 95%+ accuracy on your next run.",
        "Type slower than you think you need to.",
        "Stay relaxed and avoid backspacing mid-word."
      ]
    };
  }

  const recent = sessions.slice(0, 5);
  const avg = averageMetrics(recent.length ? recent : sessions);

  if (avg.accuracy > 0 && avg.accuracy < 92) {
    return {
      focusId: "accuracy",
      title: "Accuracy focus",
      drillId: "accuracy",
      ctaLabel: "Start Accuracy Drill",
      reason: `Your recent accuracy sits around ${avg.accuracy}%. Tighten precision before pushing speed.`,
      nextSteps: [
        "Aim for 95%+ accuracy on the next run.",
        "Slow down on tricky letter pairs and spaces.",
        "Keep eyes one word ahead to reduce corrections."
      ]
    };
  }

  if (avg.netWpm > 0 && avg.netWpm < 40) {
    return {
      focusId: "speed",
      title: "Speed ramp",
      drillId: "rhythm",
      ctaLabel: "Start Rhythm Drill",
      reason: `Your net speed averages ${avg.netWpm} WPM. Build a steady cadence to raise sustainable pace.`,
      nextSteps: [
        "Hold an even tempo instead of sprinting.",
        "Minimize hesitation on longer words.",
        "Keep accuracy above 92% while increasing pace."
      ]
    };
  }

  const enduranceText = targetText || recent[0]?.targetText || sessions[0]?.targetText || "";
  const drillId = pickEnduranceDrill(enduranceText);
  const ctaLabel =
    drillId === "numbers" ? "Start Numbers Drill" : drillId === "punctuation" ? "Start Punctuation Drill" : "Start Long Text";
  const title = "Endurance polish";
  const reason =
    "You’re holding solid accuracy and net speed. Build consistency across longer, more varied text to level up.";
  const nextSteps =
    drillId === "numbers"
      ? ["Practice number-row control with smooth transitions.", "Avoid looking down; trust muscle memory.", "Keep errors low while maintaining rhythm."]
      : drillId === "punctuation"
      ? ["Type punctuation deliberately (quotes, commas, dashes).", "Pause at clauses; don’t rush symbols.", "Scan ahead to anticipate punctuation."]
      : ["Do one longer passage run to build endurance.", "Keep posture relaxed and cadence steady.", "Focus on consistency from first line to last."];

  return { focusId: "endurance", title, drillId, ctaLabel, reason, nextSteps };
};

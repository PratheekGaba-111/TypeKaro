import type { SessionDTO } from "@app/shared";

export const calculateXp = (netWpm: number, accuracy: number) => {
  return Math.round(netWpm * 2 + accuracy / 2);
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const calculateStreak = (sessions: SessionDTO[]) => {
  if (!sessions.length) {
    return 0;
  }

  const dates = new Set(
    sessions.map((session) => toDateKey(new Date(session.createdAt)))
  );

  let streak = 0;
  const today = new Date();

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = toDateKey(date);
    if (dates.has(key)) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
};

export const summarizeGamification = (sessions: SessionDTO[]) => {
  const totalXp = sessions.reduce(
    (sum, session) => sum + calculateXp(session.netWpm, session.accuracy),
    0
  );

  const level = Math.floor(totalXp / 500) + 1;
  const currentLevelXp = totalXp % 500;
  const xpToNext = 500 - currentLevelXp;
  const streak = calculateStreak(sessions);

  return {
    totalXp,
    level,
    xpToNext,
    currentLevelXp,
    streak
  };
};

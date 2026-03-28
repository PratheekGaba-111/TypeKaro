import type { Metrics } from "@app/shared";

const round = (value: number) => Math.round(value * 100) / 100;

export const editDistance = (target: string, typed: string) => {
  const rows = target.length;
  const cols = typed.length;
  const dp: number[][] = Array.from({ length: rows + 1 }, () =>
    Array(cols + 1).fill(0)
  );

  for (let i = 0; i <= rows; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= cols; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= rows; i += 1) {
    for (let j = 1; j <= cols; j += 1) {
      const cost = target[i - 1] === typed[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[rows][cols];
};

export const calculateMetrics = (
  targetText: string,
  typedText: string,
  timeTakenMs: number,
  generationTimeMs: number
): Metrics => {
  const timeMinutes = timeTakenMs > 0 ? timeTakenMs / 60000 : 0;
  const typedChars = typedText.length;
  const targetLength = targetText.length || 0;
  const errors = editDistance(targetText, typedText);

  const grossWpm = timeMinutes > 0 ? (typedChars / 5) / timeMinutes : 0;
  const accuracy =
    targetLength > 0 ? Math.max(0, ((targetLength - errors) / targetLength) * 100) : 0;
  const netWpm =
    timeMinutes > 0 ? Math.max(0, grossWpm - errors / timeMinutes) : 0;
  const efficiency =
    generationTimeMs > 0 ? netWpm / (generationTimeMs / 1000) : netWpm;

  return {
    wpm: round(grossWpm),
    accuracy: round(accuracy),
    netWpm: round(netWpm),
    efficiency: round(efficiency)
  };
};

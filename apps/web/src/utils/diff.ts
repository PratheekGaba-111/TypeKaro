export type DiffKind = "correct" | "replace" | "insert" | "delete";

export interface DiffPair {
  targetChar: string;
  typedChar: string;
  kind: DiffKind;
}

interface DiffResult {
  pairs: DiffPair[];
  errors: number;
}

export const diffStrings = (target: string, typed: string): DiffResult => {
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

  const pairs: DiffPair[] = [];
  let i = rows;
  let j = cols;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const cost = target[i - 1] === typed[j - 1] ? 0 : 1;
      if (dp[i][j] === dp[i - 1][j - 1] + cost) {
        pairs.push({
          targetChar: target[i - 1],
          typedChar: typed[j - 1],
          kind: cost === 0 ? "correct" : "replace"
        });
        i -= 1;
        j -= 1;
        continue;
      }
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      pairs.push({
        targetChar: target[i - 1],
        typedChar: "",
        kind: "delete"
      });
      i -= 1;
      continue;
    }

    if (j > 0) {
      pairs.push({
        targetChar: "",
        typedChar: typed[j - 1],
        kind: "insert"
      });
      j -= 1;
    }
  }

  const ordered = pairs.reverse();
  const errors = ordered.reduce(
    (sum, pair) => (pair.kind === "correct" ? sum : sum + 1),
    0
  );

  return { pairs: ordered, errors };
};

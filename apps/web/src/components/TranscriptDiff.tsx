import React, { useMemo } from "react";
import { diffStrings } from "../utils/diff";

interface TranscriptDiffProps {
  targetText: string;
  typedText: string;
}

export const TranscriptDiff: React.FC<TranscriptDiffProps> = ({ targetText, typedText }) => {
  const diff = useMemo(() => diffStrings(targetText, typedText), [targetText, typedText]);

  const renderLine = (line: "target" | "typed") => (
    <p className="diff-line">
      {diff.pairs.map((pair, index) => {
        const isTarget = line === "target";
        const char = isTarget ? pair.targetChar : pair.typedChar;
        const displayChar = char === "" ? "\u00A0" : char;
        let className = "diff-char";
        if (pair.kind === "replace") {
          className += " diff-replace";
        } else if (pair.kind === "delete" && isTarget) {
          className += " diff-missing";
        } else if (pair.kind === "insert" && !isTarget) {
          className += " diff-extra";
        } else if (
          (pair.kind === "delete" && !isTarget) ||
          (pair.kind === "insert" && isTarget)
        ) {
          className += " diff-ghost";
        }
        return (
          <span key={`${pair.kind}-${index}`} className={className}>
            {displayChar}
          </span>
        );
      })}
    </p>
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-display text-xl">Target</h3>
        <div className="mt-2 text-cloud/80">{renderLine("target")}</div>
      </div>
      <div>
        <h3 className="font-display text-xl">Typed</h3>
        <div className="mt-2 text-cloud/80">{renderLine("typed")}</div>
      </div>
    </div>
  );
};

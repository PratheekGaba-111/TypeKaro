import React from "react";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
}

export const ProgressBar = React.memo<ProgressBarProps>(({ value, max, label }) => {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.min(100, Math.round((value / safeMax) * 100));

  return (
    <div className="w-full">
      {label ? <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">{label}</p> : null}
      <div className="progress-track mt-2 h-3 w-full rounded-full">
        <div
          className="progress-fill h-3 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-cloud/60">{value} / {max} XP</p>
    </div>
  );
});

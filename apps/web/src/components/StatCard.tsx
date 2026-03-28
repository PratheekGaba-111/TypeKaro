import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
}

export const StatCard = React.memo<StatCardProps>(({ label, value, hint }) => {
  return (
    <div className="gradient-panel stat-card rounded-2xl p-6 shadow-glow">
      <p className="text-xs uppercase tracking-[0.2em] text-cloud/60">{label}</p>
      <h3 className="stat-value mt-3 font-display text-3xl text-cloud">{value}</h3>
      {hint ? <p className="mt-2 text-sm text-cloud/60">{hint}</p> : null}
    </div>
  );
});

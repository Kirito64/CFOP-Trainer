import type { ReactNode } from "react";

export const shortDate = (at: number) => new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/** Minutes, or hours and minutes past an hour. */
export function duration(ms: number): string {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim();
}

export function Metric({ label, value, children, accent }: { label: string; value: ReactNode; children?: ReactNode; accent?: boolean }) {
  return (
    <div className={`metric-card ${accent ? "metric-accent" : ""}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {children && <p>{children}</p>}
    </div>
  );
}

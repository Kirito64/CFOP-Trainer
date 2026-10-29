import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LearnStatus } from "../db/db";

export function PageHeader({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[65ch]">
        <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
        {children && <div className="mt-3 text-sm leading-relaxed text-ink-2">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

type Variant = "primary" | "quiet" | "outline" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  quiet: "text-ink-2 hover:bg-panel-2 hover:text-ink",
  outline: "border border-rule bg-panel text-ink hover:border-ink-3",
  danger: "border border-rule bg-panel text-hold hover:border-hold",
};

export function Button({ variant = "outline", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${VARIANT[variant]} ${className}`}
    />
  );
}

export function Tabs<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl border border-rule bg-panel p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
            o.value === value ? "bg-steel-soft text-steel" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const STATUS_STYLE: Record<LearnStatus, string> = {
  new: "border-rule text-ink-3",
  learning: "border-warn text-warn",
  known: "border-ready text-ready",
};
const STATUS_LABEL: Record<LearnStatus, string> = { new: "Not learned", learning: "Learning", known: "Known" };

export function StatusPill({ status }: { status: LearnStatus }) {
  return <span className={`rounded-full border px-2 text-xs leading-5 font-medium ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export const statusLabel = (s: LearnStatus) => STATUS_LABEL[s];

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-rule bg-panel-2 px-1.5 font-sans text-[0.8rem] font-semibold text-ink-2">{children}</kbd>;
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-rule pb-1.5">
        <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-rule px-5 py-8 text-center text-ink-2">{children}</div>;
}

/** Seconds with two decimals, the way timers print them. */
export function fmt(ms: number | null | undefined, dnf = false): string {
  if (dnf) return "DNF";
  if (ms == null || !Number.isFinite(ms)) return "–";
  const s = Math.floor(ms / 10) / 100;
  if (s < 60) return s.toFixed(2);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, "0")}`;
}

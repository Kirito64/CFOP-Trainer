import type { ReactNode, SVGProps } from "react";

export type IconName = "today" | "train" | "recognise" | "timer" | "drills" | "library" | "stats" | "settings" | "arrow" | "chevron" | "check" | "menu" | "close" | "target" | "bolt" | "clock";

const paths: Record<IconName, ReactNode> = {
  today: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 11h18m-13 4h3m-3 3h6" /></>,
  train: <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></>,
  recognise: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  timer: <><circle cx="12" cy="14" r="8" /><path d="M9 2h6m-3 4V2m6 6 2-2m-8 5v4l3 2" /></>,
  drills: <><path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" /></>,
  library: <><rect x="3" y="4" width="4" height="16" rx="1" /><rect x="10" y="4" width="4" height="16" rx="1" /><path d="m17 5 4 14M3 16h4m3 0h4" /></>,
  stats: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7" /></>,
  settings: <><path d="M4 7h16M4 17h16" /><circle cx="9" cy="7" r="3" fill="var(--panel)" /><circle cx="15" cy="17" r="3" fill="var(--panel)" /></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  check: <path d="m5 12 4 4L19 6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};

export function Icon({ name, size = 20, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

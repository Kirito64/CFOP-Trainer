import { createBrowserRouter, NavLink, Outlet, ScrollRestoration } from "react-router";

const NAV = [
  { to: "/", label: "Today", end: true },
  { to: "/train", label: "Train algs" },
  { to: "/recognise", label: "Recognise" },
  { to: "/timer", label: "Timer" },
  { to: "/drills", label: "Drills" },
  { to: "/library/OLL", label: "Library" },
  { to: "/stats", label: "Stats" },
  { to: "/settings", label: "Settings" },
];

function Shell() {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[13rem_1fr]">
      <nav
        aria-label="Main"
        className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-rule bg-panel px-3 py-2 md:h-dvh md:flex-col md:overflow-visible md:border-r md:border-b-0 md:px-4 md:py-6"
      >
        <div className="mr-3 flex shrink-0 items-center gap-2 font-display text-xl font-semibold md:mb-6 md:mr-0">
          <img src="/favicon.svg" alt="" className="size-6" />
          CFOP Trainer
        </div>
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `shrink-0 rounded-md px-3 py-1.5 text-[0.95rem] font-medium whitespace-nowrap transition-colors ${
                isActive ? "bg-steel-soft text-ink" : "text-ink-2 hover:bg-panel-2 hover:text-ink"
              }`
            }
          >
            {n.label}
          </NavLink>
        ))}
      </nav>
      <main className="min-w-0 px-4 py-6 md:px-10 md:py-8">
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}

const lazy = (load: () => Promise<{ default: React.ComponentType }>) => async () => ({ Component: (await load()).default });

export const router = createBrowserRouter([
  {
    Component: Shell,
    children: [
      { index: true, lazy: lazy(() => import("./features/today/TodayPage")) },
      { path: "train", lazy: lazy(() => import("./features/trainer/TrainerPage")) },
      { path: "recognise", lazy: lazy(() => import("./features/recognition/RecognitionPage")) },
      { path: "timer", lazy: lazy(() => import("./features/timer/TimerPage")) },
      { path: "drills", lazy: lazy(() => import("./features/drills/DrillsPage")) },
      { path: "drills/:drill", lazy: lazy(() => import("./features/drills/DrillPage")) },
      { path: "library/:set", lazy: lazy(() => import("./features/library/LibraryPage")) },
      { path: "library/:set/:caseId", lazy: lazy(() => import("./features/library/CasePage")) },
      { path: "stats", lazy: lazy(() => import("./features/stats/StatsPage")) },
      { path: "settings", lazy: lazy(() => import("./features/settings/SettingsPage")) },
    ],
  },
]);

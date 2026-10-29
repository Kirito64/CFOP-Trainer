import { useState } from "react";
import { createBrowserRouter, Link, Outlet, ScrollRestoration, useLocation } from "react-router";
import { Icon, type IconName } from "./components/Icon";
import { useSettings } from "./db/settings";

const NAV = [
  { to: "/", match: "/", label: "Today", icon: "today" },
  { to: "/train", match: "/train", label: "Train algs", icon: "train" },
  { to: "/recognise", match: "/recognise", label: "Recognise", icon: "recognise" },
  { to: "/timer", match: "/timer", label: "Timer", icon: "timer" },
  { to: "/drills", match: "/drills", label: "Drills", icon: "drills" },
  { to: "/library/OLL", match: "/library", label: "Library", icon: "library" },
  { to: "/stats", match: "/stats", label: "Stats", icon: "stats" },
  { to: "/settings", match: "/settings", label: "Settings", icon: "settings" },
] satisfies { to: string; match: string; label: string; icon: IconName }[];

function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const settings = useSettings();
  const current = NAV.find((n) => pathname === n.match || (n.match !== "/" && pathname.startsWith(`${n.match}/`)));
  const navItem = (n: (typeof NAV)[number]) => {
    const active = current === n;
    return (
      <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}
        aria-current={active ? "page" : undefined} className={`nav-item ${active ? "is-active" : ""}`}>
        <Icon name={n.icon} size={19} />
        <span>{n.label}</span>
        <span className="nav-active-dot" />
      </Link>
    );
  };
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <aside className="app-sidebar">
        <Link to="/" className="brand"><img src="/favicon.svg" alt="" /><span>CFOP<span className="brand-subtitle">TRAINER</span></span></Link>
        <nav aria-label="Main" className="desktop-navigation">
          <p className="nav-label">WORKSPACE</p>
          {NAV.slice(0, 5).map(navItem)}
          <p className="nav-label mt-8">YOUR CUBING</p>
          {NAV.slice(5, 7).map(navItem)}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/settings" className="goal-note"><Icon name="target" /><span>Your next milestone<strong>Sub-{settings.goalMs / 1000}<span> seconds</span></strong></span><Icon name="chevron" size={16} /></Link>
          <nav aria-label="Preferences">{navItem(NAV[7])}</nav>
          <p className="local-note"><span /> Saved on this device</p>
        </div>
      </aside>
      <div className="app-content">
        <header className="workspace-bar">
          <Link to="/" className="mobile-brand"><img src="/favicon.svg" alt="" />CFOP Trainer</Link>
          <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={13} /><span>{current?.label ?? "Practice"}</span></div>
          <span className="workspace-caption">A little faster. Every day.</span>
          <button className="mobile-menu-button" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} /></button>
        </header>
        {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="mobile-navigation">{NAV.map(navItem)}</nav>}
        <main id="main-content" className="main-content" tabIndex={-1}><Outlet /></main>
      </div>
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

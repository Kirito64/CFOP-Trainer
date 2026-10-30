import { useState } from "react";
import { Button, PageHeader, Section, Tabs } from "../../components/ui";
import { db, SYNCED_TABLES, syncedTable } from "../../db/db";
import { saveSetting, useSettings } from "../../db/settings";
import { getTheme, setTheme, type Theme } from "../../lib/theme";
import { addPasskey, ApiError, deleteAccount, registerPasskey, signInWithPasskey, signOut } from "../../sync/api";
import { markSignedOut, pushEverything, resetSyncCursor, syncNow, useSyncState } from "../../sync/sync";
import { SmartCubeSection } from "./SmartCubeSection";

export default function SettingsPage() {
  const settings = useSettings();
  const [theme, setThemeState] = useState<Theme>(getTheme());

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />

      <AccountSection />

      <Section title="Training">
        <dl className="divide-y divide-rule">
          <Row label="New algs a day" hint="How many new cases the daily review introduces. Two or three keeps them from blurring together.">
            <NumberInput value={settings.newPerDay} min={0} max={10} onChange={(v) => saveSetting("newPerDay", v)} />
          </Row>
          <Row label="F2L slots" hint="Which slots F2L cases are trained in during daily review. Front-left uses the mirrored algs.">
            <div className="flex gap-3">
              {(["FR", "FL"] as const).map((s) => (
                <label key={s} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="accent-[var(--steel)]"
                    checked={settings.f2lSlots.includes(s)}
                    onChange={(e) => saveSetting("f2lSlots", e.target.checked ? [...settings.f2lSlots, s] : settings.f2lSlots.filter((x) => x !== s))}
                  />
                  {s === "FR" ? "Front right" : "Front left"}
                </label>
              ))}
            </div>
          </Row>
          <Row label="Goal average" hint="Used by Today to plan your sessions.">
            <NumberInput value={settings.goalMs / 1000} min={3} max={60} step={0.5} suffix="s" onChange={(v) => saveSetting("goalMs", Math.round(v * 1000))} />
          </Row>
        </dl>
      </Section>

      <Section title="Timer">
        <dl className="divide-y divide-rule">
          <Row label="Hold time" hint="How long to hold space before the timer turns green.">
            <NumberInput value={settings.holdMs} min={0} max={1000} step={50} suffix="ms" onChange={(v) => saveSetting("holdMs", v)} />
          </Row>
          <Row label="Hide time while solving" hint="Some people find the running clock distracting.">
            <input type="checkbox" className="accent-[var(--steel)]" checked={settings.hideRunningTime} onChange={(e) => saveSetting("hideRunningTime", e.target.checked)} />
          </Row>
        </dl>
      </Section>

      <SmartCubeSection />

      <Section title="Appearance">
        <Tabs<Theme>
          label="Theme"
          value={theme}
          onChange={(t) => {
            setTheme(t);
            setThemeState(t);
          }}
          options={[
            { value: "system", label: "Match system" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </Section>

      <BackupSection />
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-3">
      <div className="max-w-md">
        <dt className="font-medium">{label}</dt>
        {hint && <dd className="text-sm text-ink-2">{hint}</dd>}
      </div>
      <dd>{children}</dd>
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, suffix }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
        }}
        className="w-20 rounded-md border border-rule bg-panel px-2 py-1 text-right"
      />
      {suffix && <span className="text-ink-2">{suffix}</span>}
    </label>
  );
}

function AccountSection() {
  const sync = useSyncState();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const run = async (action: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (done) setMessage({ text: done });
    } catch (e) {
      setMessage({ text: e instanceof ApiError ? e.message : String(e), error: true });
    } finally {
      setBusy(false);
    }
  };

  const user = "user" in sync ? sync.user : undefined;

  return (
    <Section title="Account and sync">
      <p className="mb-4 max-w-[65ch] text-ink-2">
        Everything is saved on this device first. Sign in with a passkey to back it up and use it on your other devices. There's no password and no
        email.
      </p>

      {sync.status === "checking" && <p className="text-ink-2">Checking…</p>}

      {sync.status === "signed-out" && (
        <div className="flex flex-col gap-5">
          <div>
            <Button variant="primary" disabled={busy} onClick={() => run(async () => (await signInWithPasskey(), await syncNow()), "Signed in. Your data is syncing.")}>
              Sign in with a passkey
            </Button>
          </div>
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => (await registerPasskey(name.trim()), await syncNow()), "Account created. Your data is syncing.");
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-sm text-ink-2">New here? Pick a name for your account</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                className="rounded-md border border-rule bg-panel px-3 py-1.5"
                placeholder="Your name"
              />
            </label>
            <Button type="submit" disabled={busy || !name.trim()}>
              Create account with a passkey
            </Button>
          </form>
        </div>
      )}

      {user && (
        <div className="flex flex-col gap-4">
          <p>
            Signed in as <strong>{user.name}</strong>.{" "}
            <span className="text-ink-2">
              {sync.status === "syncing" && "Syncing…"}
              {sync.status === "synced" && `Synced at ${new Date(sync.at ?? Date.now()).toLocaleTimeString()}.`}
              {sync.status === "offline" && "Offline. Changes will sync when you're back online."}
              {sync.status === "error" && `Last sync failed: ${sync.message}`}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => run(syncNow)}>
              Sync now
            </Button>
            <Button disabled={busy} onClick={() => run(addPasskey, "Passkey added. You can sign in with it on that device now.")}>
              Add a passkey for another device
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await signOut();
                  await resetSyncCursor();
                  markSignedOut();
                }, "Signed out. Your data stays on this device.")
              }
            >
              Sign out
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (!confirm("Delete your account and everything synced to it? Data on this device stays.")) return;
                void run(async () => {
                  await deleteAccount();
                  await resetSyncCursor();
                  markSignedOut();
                }, "Account deleted.");
              }}
            >
              Delete account
            </Button>
          </div>
        </div>
      )}

      {sync.status === "offline" && !user && <p className="text-ink-2">Can't reach the server right now. Everything still works on this device.</p>}
      {message && <p className={`mt-3 text-sm ${message.error ? "text-hold" : "text-ready"}`}>{message.text}</p>}
    </Section>
  );
}

function BackupSection() {
  const [message, setMessage] = useState<string | null>(null);

  const exportAll = async () => {
    const data = Object.fromEntries(await Promise.all(SYNCED_TABLES.map(async (t) => [t, await syncedTable(t).toArray()] as const)));
    const blob = new Blob([JSON.stringify({ app: "cfop-trainer", version: 1, exportedAt: new Date().toISOString(), data })], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cfop-trainer-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.app !== "cfop-trainer") throw new Error("That file isn't a CFOP Trainer backup.");
      let n = 0;
      await db.transaction("rw", SYNCED_TABLES.map((t) => db[t]), async () => {
        for (const t of SYNCED_TABLES) {
          const rows = (parsed.data?.[t] ?? []) as { id: string; updatedAt: number }[];
          const local = await syncedTable(t).bulkGet(rows.map((r) => r.id));
          const newer = rows.filter((r, i) => !local[i] || local[i]!.updatedAt < r.updatedAt);
          await syncedTable(t).bulkPut(newer as never[]);
          n += newer.length;
        }
      });
      setMessage(`Imported ${n} records.`);
      void pushEverything();
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  return (
    <Section title="Backup">
      <p className="mb-3 text-ink-2">Download everything as a JSON file, or restore one. Restoring keeps whichever copy of each record is newer.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={exportAll}>Download backup</Button>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-rule bg-panel px-3.5 py-1.5 font-medium hover:border-ink-3">
          Restore from file
          <input type="file" accept="application/json" className="sr-only" onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
        </label>
      </div>
      {message && <p className="mt-2 text-sm text-ink-2">{message}</p>}
    </Section>
  );
}

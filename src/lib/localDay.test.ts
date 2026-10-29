import { expect, test } from "bun:test";
import { localDay } from "./localDay";

test("uses local calendar midnight and the next day's exclusive boundary", () => {
  const day = localDay(new Date(2026, 9, 29, 23, 59).getTime());
  expect(day.start).toBe(new Date(2026, 9, 29).getTime());
  expect(day.end).toBe(new Date(2026, 9, 30).getTime());
  expect(localDay(day.end).start).toBe(day.end);
});

test("handles 23-hour and 25-hour daylight-saving days", () => {
  const script = `import { localDay } from ${JSON.stringify(import.meta.dir + "/localDay.ts")};
    const hours = (date) => { const d = localDay(date.getTime()); return (d.end - d.start) / 3600000; };
    console.log(JSON.stringify([hours(new Date(2026, 2, 8, 12)), hours(new Date(2026, 10, 1, 12))]));`;
  const child = Bun.spawnSync([process.execPath, "-e", script], { env: { ...process.env, TZ: "America/New_York" } });
  expect(child.exitCode).toBe(0);
  expect(JSON.parse(child.stdout.toString())).toEqual([23, 25]);
});

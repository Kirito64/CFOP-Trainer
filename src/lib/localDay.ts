export interface LocalDay {
  start: number;
  end: number;
}

/** Calendar boundaries rather than 24-hour offsets, including daylight-saving days. */
export function localDay(at = Date.now()): LocalDay {
  const start = new Date(at);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

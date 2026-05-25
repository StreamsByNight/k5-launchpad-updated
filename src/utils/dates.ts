/** YYYY-MM-DD in the given IANA timezone */
export function toDateKey(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-CA', { timeZone });
}

/** Parse YYYY-MM-DD as local calendar date (no UTC shift) */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(timeZone: string): string {
  return toDateKey(new Date(), timeZone);
}

export function formatLongDate(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimeRange(startIso: string | null, endIso: string | null, timeZone: string): string | undefined {
  if (!startIso) return undefined;
  const opts: Intl.DateTimeFormatOptions = {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  const start = new Date(startIso).toLocaleTimeString('en-US', opts);
  if (!endIso) return `Start: ${start}`;
  const end = new Date(endIso).toLocaleTimeString('en-US', opts);
  return `Start: ${start} | End: ${end}`;
}

export function addDays(dateKey: string, days: number, timeZone: string): string {
  const d = fromDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d, timeZone);
}

/** Monday–Sunday week containing dateKey */
export function weekRange(dateKey: string, timeZone: string): { start: string; end: string } {
  const d = fromDateKey(dateKey);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateKey(start, timeZone), end: toDateKey(end, timeZone) };
}

export function isDateInRange(key: string, start: string, end: string): boolean {
  return key >= start && key <= end;
}

export function isoToDateKey(iso: string, timeZone: string): string {
  return toDateKey(new Date(iso), timeZone);
}

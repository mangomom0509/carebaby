export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStart(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function ageMonths(birth: Date, today: Date): number {
  let months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) months -= 1;
  return Math.max(0, months);
}

export function dPlus(birth: Date, today: Date): number {
  return Math.floor((today.getTime() - birth.getTime()) / 86400000) + 1;
}

export function ageDays(birth: Date, today: Date): number {
  return Math.floor((today.getTime() - birth.getTime()) / 86400000);
}

export function addMonths(d: Date, months: number): Date {
  const result = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  return result;
}

// ISO 8601 week string, e.g. "2026-W43". Week starts Monday; week 1 is the
// week containing the year's first Thursday.
export function isoWeekString(d: Date): string {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNum = (date.getDay() + 6) % 7; // Mon=0..Sun=6
  date.setDate(date.getDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(date.getFullYear(), 0, 4);
  const firstDayNum = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3);
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86400000));
  return `${date.getFullYear()}-W${pad(week)}`;
}

// Monday..Sunday range (inclusive) of the week containing `d`.
export function weekRange(d: Date): { start: Date; end: Date } {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNum = (date.getDay() + 6) % 7; // Mon=0..Sun=6
  const start = new Date(date);
  start.setDate(date.getDate() - dayNum);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

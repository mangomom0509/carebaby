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

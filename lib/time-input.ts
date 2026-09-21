// Keeps a time text input to digits only (max 4) while typing — e.g. typing
// "0730" shows as-is, and normalizeTime() below turns it into "07:30" on save.
export function formatTimeInput(text: string): string {
  return text.replace(/\D/g, '').slice(0, 4);
}

// Accepts "0730", "730", "07:30", or "7:30" and returns a normalized "HH:MM",
// or null if the input doesn't resolve to a valid time.
export function normalizeTime(text: string): string | null {
  const trimmed = text.trim();
  let hour: number;
  let minute: number;
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [h, m] = trimmed.split(':');
    hour = Number(h);
    minute = Number(m);
  } else {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 4) {
      hour = Number(digits.slice(0, 2));
      minute = Number(digits.slice(2));
    } else if (digits.length === 3) {
      hour = Number(digits.slice(0, 1));
      minute = Number(digits.slice(1));
    } else {
      return null;
    }
  }
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Age-band sleep reference guide. Content lives in lib/data/sleep-guide.json
// so it can be reviewed and edited directly without touching TypeScript.
// The sleep-hour ranges and safe-sleep practices were cross-checked against
// public secondary sources citing AAP/AASM guidance, not read from the AAP's
// own site directly in this session — treat as general reference, not
// medical advice, until reviewed (see each entry's `reviewed` field).
import SLEEP_GUIDE from './data/sleep-guide.json';

export type SleepBand = '0-3' | '4-6' | '7-9' | '10-12' | '13-18' | '19-24' | '25-30' | '31-36';

export interface SleepGuideEntry {
  band: SleepBand;
  totalSleepHours: string;
  napInfo: string;
  notes: string[];
  safeSleepTips: string[];
  reviewed: boolean;
}

export const SLEEP_BANDS: { id: SleepBand; label: string }[] = [
  { id: '0-3', label: '0~3개월' },
  { id: '4-6', label: '4~6개월' },
  { id: '7-9', label: '7~9개월' },
  { id: '10-12', label: '10~12개월' },
  { id: '13-18', label: '13~18개월' },
  { id: '19-24', label: '19~24개월' },
  { id: '25-30', label: '25~30개월' },
  { id: '31-36', label: '31~36개월' },
];

export function bandForAgeMonths(months: number): SleepBand {
  if (months <= 3) return '0-3';
  if (months <= 6) return '4-6';
  if (months <= 9) return '7-9';
  if (months <= 12) return '10-12';
  if (months <= 18) return '13-18';
  if (months <= 24) return '19-24';
  if (months <= 30) return '25-30';
  return '31-36';
}

const GUIDE_BY_BAND: Record<string, SleepGuideEntry> = Object.fromEntries(
  (SLEEP_GUIDE as SleepGuideEntry[]).map((g) => [g.band, g]),
);

export function sleepGuideForBand(band: SleepBand): SleepGuideEntry | undefined {
  return GUIDE_BY_BAND[band];
}

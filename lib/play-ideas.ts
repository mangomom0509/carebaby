// Play ideas by age band. Content lives in lib/data/play-ideas.json so it can
// be reviewed and edited directly without touching TypeScript — see that
// file's `reviewed` field. This is a general activity guide, not medical
// advice; development speed varies by child.
import PLAY_IDEAS from './data/play-ideas.json';
import type { DevDomain } from './dev-milestones';

export type PlayBand = '0-3' | '4-6' | '7-9' | '10-12' | '13-18' | '19-24';

export interface PlayIdea {
  id: string;
  band: PlayBand;
  name: string;
  materials: string[];
  steps: string[];
  durationMinutes: string;
  domains: DevDomain[];
  safetyNote: string;
  reviewed: boolean;
}

export const PLAY_BANDS: { id: PlayBand; label: string }[] = [
  { id: '0-3', label: '0~3개월' },
  { id: '4-6', label: '4~6개월' },
  { id: '7-9', label: '7~9개월' },
  { id: '10-12', label: '10~12개월' },
  { id: '13-18', label: '13~18개월' },
  { id: '19-24', label: '19~24개월' },
];

export function bandForAgeMonths(months: number): PlayBand {
  if (months <= 3) return '0-3';
  if (months <= 6) return '4-6';
  if (months <= 9) return '7-9';
  if (months <= 12) return '10-12';
  if (months <= 18) return '13-18';
  return '19-24';
}

export function playsForBand(band: PlayBand): PlayIdea[] {
  return (PLAY_IDEAS as PlayIdea[]).filter((p) => p.band === band);
}

const PLAY_BY_ID: Record<string, PlayIdea> = Object.fromEntries((PLAY_IDEAS as PlayIdea[]).map((p) => [p.id, p]));

export function domainsForPlayId(playId: string): DevDomain[] {
  return PLAY_BY_ID[playId]?.domains ?? [];
}

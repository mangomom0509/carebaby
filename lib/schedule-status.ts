import type { ScheduleLogEntry, ScheduleTemplateItem } from './types';

export type ScheduleKind = 'wake' | 'sleep' | 'meal' | 'other';

const WAKE_RE = /기상/;
const SLEEP_RE = /잠/;
const MEAL_RE = /밥|식|수유|간식|아침|점심|저녁|물/;

export function scheduleItemKind(label: string): ScheduleKind {
  if (WAKE_RE.test(label)) return 'wake';
  if (SLEEP_RE.test(label)) return 'sleep';
  if (MEAL_RE.test(label)) return 'meal';
  return 'other';
}

export function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

interface StatusItem {
  item: ScheduleTemplateItem;
  kind: ScheduleKind;
  effStart: number;
  log: ScheduleLogEntry | null;
}

function buildStatusItems(template: ScheduleTemplateItem[], logs: Record<string, ScheduleLogEntry>): StatusItem[] {
  return template
    .map((item) => {
      const log = logs[item.id] ?? null;
      const kind = scheduleItemKind(item.label);
      const effStart = toMin(log ? log.start_time : item.time);
      return { item, kind, effStart, log };
    })
    .sort((a, b) => a.effStart - b.effStart);
}

export type CurrentStatus = 'sleep' | 'meal' | 'play';

export function computeCurrentStatus(
  template: ScheduleTemplateItem[],
  logs: Record<string, ScheduleLogEntry>,
  nowMin: number,
): CurrentStatus {
  const items = buildStatusItems(template, logs);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.kind !== 'sleep') continue;
    let effEnd: number;
    let wake: StatusItem | null = null;
    for (let j = i + 1; j < items.length; j++) {
      if (items[j].kind === 'wake') {
        wake = items[j];
        break;
      }
      if (items[j].kind === 'sleep') break;
    }
    if (wake) {
      effEnd = wake.effStart;
    } else {
      const next = items[i + 1];
      effEnd = next ? next.effStart : 1440;
    }
    if (nowMin >= it.effStart && nowMin < effEnd) return 'sleep';
  }
  for (const it of items) {
    if (it.kind === 'meal' && nowMin >= it.effStart && nowMin < it.effStart + 30) return 'meal';
  }
  return 'play';
}

export function nextByKind(
  template: ScheduleTemplateItem[],
  logs: Record<string, ScheduleLogEntry>,
  kind: ScheduleKind,
  nowMin: number,
): ScheduleTemplateItem | null {
  const items = template.filter((t) => scheduleItemKind(t.label) === kind && !logs[t.id]).sort((a, b) => toMin(a.time) - toMin(b.time));
  if (items.length === 0) return null;
  const future = items.filter((t) => toMin(t.time) >= nowMin);
  return future.length ? future[0] : items[0];
}

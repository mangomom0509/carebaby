import { listDoneCheckups } from './api/checkups';
import { listRecordsForMonth } from './api/records';
import { listGrowthRecords } from './api/growth';
import { listPhotosForMonth } from './api/photos';
import { listScheduleLogForMonth, listScheduleTemplate } from './api/schedule';
import { listDoneVaccines } from './api/vaccines';
import { listDoneDevChecks } from './api/dev-checks';
import { CHECKUPS, type CheckupRef } from './checkups';
import { ageDays, ageMonths, parseISO } from './dates';
import { DEV_MILESTONES, type DevMilestoneRef } from './dev-milestones';
import { headCircumferencePercentile, lengthPercentile, weightPercentile, type GrowthPercentile } from './growth-standards';
import { isFeedLabel, isGramMealLabel, isSnackLabel, isWaterLabel } from './schedule-labels';
import { scheduleItemKind } from './schedule-status';
import { VACCINE_DOSES, type VaccineDoseRef } from './vaccines';
import type { Child, GrowthRecord, PhotoEntry } from './types';

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const next = new Date(year, month, 1);
  const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
  return { start, end };
}

export interface MonthlyReportData {
  year: number;
  month: number;
  ageMonthsAtEnd: number;
  growth: {
    latest: GrowthRecord | null;
    previous: GrowthRecord | null;
    weightPct: GrowthPercentile | null;
    heightPct: GrowthPercentile | null;
    headPct: GrowthPercentile | null;
  };
  feeding: {
    feedTotal: number;
    feedCount: number;
    feedAvgAmount: number | null;
    waterTotal: number;
    waterCount: number;
    mealCount: number;
    snackCount: number;
  };
  sleep: {
    avgDailyMinutes: number | null;
  };
  devChecksThisMonth: { milestone: DevMilestoneRef; doneAt: string }[];
  vaccinesThisMonth: { dose: VaccineDoseRef; actualDate: string }[];
  checkupsThisMonth: { checkup: CheckupRef; doneAt: string }[];
  photos: PhotoEntry[];
}

export async function buildMonthlyReport(child: Child, year: number, month: number): Promise<MonthlyReportData> {
  const { start, end } = monthRange(year, month);
  const monthEnd = new Date(year, month, 0); // last day of the target month
  const birth = parseISO(child.birth);

  const [template, scheduleLogs, monthRecords, growthRecords, doneVax, doneChk, doneDev, photos] = await Promise.all([
    listScheduleTemplate(child.id),
    listScheduleLogForMonth(child.id, year, month),
    listRecordsForMonth(child.id, year, month),
    listGrowthRecords(child.id),
    listDoneVaccines(child.id),
    listDoneCheckups(child.id),
    listDoneDevChecks(child.id),
    listPhotosForMonth(child.id, year, month),
  ]);

  // --- Growth: latest record as-of the end of this month, plus the one before it.
  const sortedGrowth = growthRecords.slice().sort((a, b) => (a.measured_date < b.measured_date ? -1 : 1));
  const upToMonthEnd = sortedGrowth.filter((g) => g.measured_date < end);
  const latest = upToMonthEnd[upToMonthEnd.length - 1] ?? null;
  const previous = upToMonthEnd.length > 1 ? upToMonthEnd[upToMonthEnd.length - 2] : null;
  const latestAgeDays = latest ? ageDays(birth, parseISO(latest.measured_date)) : 0;
  const weightPct = latest?.weight_kg != null ? weightPercentile(child.gender, latestAgeDays, latest.weight_kg) : null;
  const heightPct = latest?.height_cm != null ? lengthPercentile(child.gender, latestAgeDays, latest.height_cm) : null;
  const headPct = latest?.head_circumference_cm != null ? headCircumferencePercentile(child.gender, latestAgeDays, latest.head_circumference_cm) : null;

  // --- Feeding: schedule_log (regular-pattern) + ad-hoc records, both restricted to this month.
  const templateById = new Map(template.map((t) => [t.id, t]));
  let feedTotal = 0,
    feedCount = 0,
    waterTotal = 0,
    waterCount = 0,
    mealCount = 0,
    snackCount = 0;
  for (const log of scheduleLogs) {
    const item = templateById.get(log.item_id);
    if (!item) continue;
    if (isFeedLabel(item.label) && log.amount != null) {
      feedTotal += log.amount;
      feedCount += 1;
    } else if (isWaterLabel(item.label) && log.amount != null) {
      waterTotal += log.amount;
      waterCount += 1;
    } else if (isGramMealLabel(item.label)) {
      mealCount += 1;
    } else if (isSnackLabel(item.label)) {
      snackCount += 1;
    }
  }
  for (const r of monthRecords) {
    if (r.type === 'feed' && r.amount != null) {
      feedTotal += r.amount;
      feedCount += 1;
    } else if (r.type === 'water' && r.amount != null) {
      waterTotal += r.amount;
      waterCount += 1;
    } else if (r.type === 'meal' || r.type === 'kidmeal') {
      mealCount += 1;
    } else if (r.type === 'snack') {
      snackCount += 1;
    }
  }

  // --- Sleep: fixed daily schedule's sleep-kind windows (regular-pattern only).
  let avgDailyMinutes: number | null = null;
  if (child.regular_pattern) {
    let totalMinutes = 0;
    let hasSleepItem = false;
    for (const item of template) {
      if (scheduleItemKind(item.label) !== 'sleep' || !item.end_time) continue;
      const [sh, sm] = item.time.split(':').map(Number);
      const [eh, em] = item.end_time.split(':').map(Number);
      let mins = eh * 60 + em - (sh * 60 + sm);
      if (mins < 0) mins += 24 * 60; // crosses midnight
      totalMinutes += mins;
      hasSleepItem = true;
    }
    avgDailyMinutes = hasSleepItem ? totalMinutes : null;
  }

  // --- This month's completed dev checks / vaccines / checkups, each with its date.
  const devDateById = new Map(
    doneDev.filter((d) => d.done_at >= start && d.done_at < end).map((d) => [d.milestone_id, d.done_at.slice(0, 10)]),
  );
  const devChecksThisMonth = DEV_MILESTONES.filter((m) => devDateById.has(m.id))
    .map((milestone) => ({ milestone, doneAt: devDateById.get(milestone.id)! }))
    .sort((a, b) => (a.doneAt < b.doneAt ? -1 : 1));

  const vaxDateById = new Map(doneVax.filter((v) => v.actual_date >= start && v.actual_date < end).map((v) => [v.vaccine_id, v.actual_date]));
  const vaccinesThisMonth = VACCINE_DOSES.filter((v) => vaxDateById.has(v.id))
    .map((dose) => ({ dose, actualDate: vaxDateById.get(dose.id)! }))
    .sort((a, b) => (a.actualDate < b.actualDate ? -1 : 1));

  const chkDateById = new Map(doneChk.filter((c) => c.done_at >= start && c.done_at < end).map((c) => [c.checkup_id, c.done_at]));
  const checkupsThisMonth = CHECKUPS.filter((c) => chkDateById.has(c.id))
    .map((checkup) => ({ checkup, doneAt: chkDateById.get(checkup.id)! }))
    .sort((a, b) => (a.doneAt < b.doneAt ? -1 : 1));

  return {
    year,
    month,
    ageMonthsAtEnd: ageMonths(birth, monthEnd),
    growth: { latest, previous, weightPct, heightPct, headPct },
    feeding: {
      feedTotal,
      feedCount,
      feedAvgAmount: feedCount ? Math.round(feedTotal / feedCount) : null,
      waterTotal,
      waterCount,
      mealCount,
      snackCount,
    },
    sleep: { avgDailyMinutes },
    devChecksThisMonth,
    vaccinesThisMonth,
    checkupsThisMonth,
    photos,
  };
}

export function formatShortDate(iso: string): string {
  const d = parseISO(iso.slice(0, 10));
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export { daysInMonth };

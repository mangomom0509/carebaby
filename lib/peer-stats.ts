import type { PlayLog } from './types';
import { domainsForPlayId } from './play-ideas';
import type { DevDomain } from './dev-milestones';
import { weekRange, toISO } from './dates';

// Counts how many times each development domain was played in the week
// containing `weekAnchor`. Used both for the local "my child" balance view
// and, only when the user has opted in, as the payload uploaded for peer
// stats — same numbers, two different destinations.
export function domainCountsForWeek(playLogs: PlayLog[], weekAnchor: Date): Partial<Record<DevDomain, number>> {
  const { start, end } = weekRange(weekAnchor);
  const startIso = toISO(start);
  const endIso = toISO(end);
  const counts: Partial<Record<DevDomain, number>> = {};
  for (const log of playLogs) {
    if (log.played_date < startIso || log.played_date > endIso) continue;
    for (const domain of domainsForPlayId(log.play_id)) {
      counts[domain] = (counts[domain] ?? 0) + 1;
    }
  }
  return counts;
}

export function topDomains(counts: Record<string, number>, max = 2): string[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .filter(([, v]) => v > 0)
    .map(([k]) => k);
}

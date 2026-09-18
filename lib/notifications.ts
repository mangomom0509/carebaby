import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import type { NextVisit } from './vaccines';
import type { ScheduleTemplateItem } from './types';

const ENABLED_KEY = 'todak-notifications-enabled';
const SCHEDULE_PREFIX = 'todak-schedule-';
const VACCINE_ID = 'todak-vaccine-due';
const CHANNEL_ID = 'todak-reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '토닥 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getNotificationsEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';
}

// Returns the resulting enabled state (false if permission was denied).
export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  if (enabled) {
    await ensureAndroidChannel();
    const perm = await Notifications.requestPermissionsAsync();
    if (perm.status !== 'granted') {
      await AsyncStorage.setItem(ENABLED_KEY, 'false');
      return false;
    }
  } else {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
  return enabled;
}

// Reschedules the daily reminders for the active child's fixed schedule.
// Safe to call often (e.g. on Home load) — it replaces the previous set.
export async function syncScheduleNotifications(childName: string, template: ScheduleTemplateItem[]): Promise<void> {
  if (!(await getNotificationsEnabled())) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled.filter((n) => n.identifier.startsWith(SCHEDULE_PREFIX)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  for (const item of template) {
    const [hour, minute] = item.time.split(':').map(Number);
    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
    await Notifications.scheduleNotificationAsync({
      identifier: `${SCHEDULE_PREFIX}${item.id}`,
      content: { title: `${childName} ${item.label} 시간이에요`, body: `오늘의 스케줄 · ${item.time} ${item.label}` },
      trigger: { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL_ID },
    });
  }
}

// Reschedules the single upcoming-vaccine reminder (9am on the due date).
export async function syncVaccineNotification(childName: string, visit: NextVisit | null): Promise<void> {
  if (!(await getNotificationsEnabled())) return;
  await Notifications.cancelScheduledNotificationAsync(VACCINE_ID).catch(() => {});
  if (!visit) return;
  const due = visit.dueDate;
  const fireAt = new Date(due.getFullYear(), due.getMonth(), due.getDate(), 9, 0, 0);
  if (fireAt.getTime() <= Date.now()) return;
  const label = visit.doses.length > 1 ? `${visit.doses.length}종 동시 접종` : `${visit.doses[0].vaccineName} ${visit.doses[0].doseLabel}`;
  await Notifications.scheduleNotificationAsync({
    identifier: VACCINE_ID,
    content: { title: `${childName} 예방접종 알림`, body: `오늘은 ${label} 예정일이에요.` },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: fireAt, channelId: CHANNEL_ID },
  });
}

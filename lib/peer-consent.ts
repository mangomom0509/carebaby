// Local-only opt-in flag for the peer play stats feature. No server-side
// consent record is kept — data only reaches the server once this is true,
// so the local flag is the complete record of whether a child is opted in.
import AsyncStorage from '@react-native-async-storage/async-storage';

function storageKey(childId: string): string {
  return `todak-peer-stats-consent-${childId}`;
}

export async function getPeerStatsConsent(childId: string): Promise<boolean> {
  const v = await AsyncStorage.getItem(storageKey(childId));
  return v === 'true';
}

export async function setPeerStatsConsent(childId: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(storageKey(childId), value ? 'true' : 'false');
}

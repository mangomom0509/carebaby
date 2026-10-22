// A random ID used only for the opt-in peer play stats feature. Deliberately
// unrelated to the account/family system — generated and stored locally per
// child, never derived from the logged-in user's id.
import AsyncStorage from '@react-native-async-storage/async-storage';

function storageKey(childId: string): string {
  return `todak-peer-anon-id-${childId}`;
}

function randomId(): string {
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}

export async function getOrCreateAnonId(childId: string): Promise<string> {
  const key = storageKey(childId);
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const id = randomId();
  await AsyncStorage.setItem(key, id);
  return id;
}

export async function clearAnonId(childId: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey(childId));
}

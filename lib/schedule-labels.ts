export function isFeedLabel(label: string): boolean {
  return /수유/.test(label);
}
export function isWaterLabel(label: string): boolean {
  return /물/.test(label) && !isFeedLabel(label);
}
export function isGramMealLabel(label: string): boolean {
  return /이유식|유아식/.test(label);
}
export function isSnackLabel(label: string): boolean {
  return /간식/.test(label);
}
export function scheduleAmountUnit(label: string): 'ml' | 'g' | null {
  if (isFeedLabel(label) || isWaterLabel(label)) return 'ml';
  if (isGramMealLabel(label)) return 'g';
  return null;
}

export const AMOUNT_LEVELS = ['많이 먹음', '보통', '조금 먹음', '안 먹음'];

// Korean national infant/child health checkup program (영유아 건강검진) reference
// schedule. Ages are anchor points for a recommended window, not exact
// deadlines — always confirm with a pediatrician / 국민건강보험공단 안내.
export type CheckupKind = '건강검진' | '구강검진';

export interface CheckupRef {
  id: string;
  label: string;
  kind: CheckupKind;
  ageMonths: number;
  ageNote: string;
}

export const CHECKUPS: CheckupRef[] = [
  { id: 'health-1', label: '영유아 건강검진 1차', kind: '건강검진', ageMonths: 4, ageNote: '4~6개월' },
  { id: 'health-2', label: '영유아 건강검진 2차', kind: '건강검진', ageMonths: 9, ageNote: '9~12개월' },
  { id: 'health-3', label: '영유아 건강검진 3차', kind: '건강검진', ageMonths: 18, ageNote: '18~24개월' },
  { id: 'oral-1', label: '영유아 구강검진 1차', kind: '구강검진', ageMonths: 18, ageNote: '18~29개월' },
  { id: 'health-4', label: '영유아 건강검진 4차', kind: '건강검진', ageMonths: 30, ageNote: '30~36개월' },
  { id: 'health-5', label: '영유아 건강검진 5차', kind: '건강검진', ageMonths: 42, ageNote: '42~48개월' },
  { id: 'oral-2', label: '영유아 구강검진 2차', kind: '구강검진', ageMonths: 42, ageNote: '42~53개월' },
  { id: 'health-6', label: '영유아 건강검진 6차', kind: '건강검진', ageMonths: 54, ageNote: '54~60개월' },
  { id: 'oral-3', label: '영유아 구강검진 3차', kind: '구강검진', ageMonths: 54, ageNote: '54~65개월' },
  { id: 'health-7', label: '영유아 건강검진 7차', kind: '건강검진', ageMonths: 66, ageNote: '66~71개월' },
];

export function checkupDueDate(birth: Date, checkup: CheckupRef): Date {
  return new Date(birth.getFullYear(), birth.getMonth() + checkup.ageMonths, birth.getDate());
}

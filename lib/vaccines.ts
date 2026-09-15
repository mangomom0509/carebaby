// Korean National Immunization Program (질병관리청 표준예방접종일정표) reference
// schedule. Ages are anchor points, not strict rules — always confirm the exact
// timing with a pediatrician. `id` values are stored in the `vaccine_doses`
// table's `vaccine_id` column when a dose is marked done.
export interface VaccineDoseRef {
  id: string;
  vaccineName: string;
  doseLabel: string;
  minAgeMonths: number;
  ageNote: string;
  visitGroup: string;
}

export const VACCINE_DOSES: VaccineDoseRef[] = [
  { id: 'hepb-1', vaccineName: 'B형간염', doseLabel: '1차', minAgeMonths: 0, ageNote: '출생 시', visitGroup: '출생 시' },
  { id: 'bcg-1', vaccineName: 'BCG(결핵)', doseLabel: '1회', minAgeMonths: 0, ageNote: '생후 4주 이내', visitGroup: '출생 시' },
  { id: 'hepb-2', vaccineName: 'B형간염', doseLabel: '2차', minAgeMonths: 1, ageNote: '1개월', visitGroup: '1개월' },

  { id: 'dtap-1', vaccineName: 'DTaP(디프테리아·파상풍·백일해)', doseLabel: '1차', minAgeMonths: 2, ageNote: '2개월', visitGroup: '2개월' },
  { id: 'ipv-1', vaccineName: 'IPV(폴리오)', doseLabel: '1차', minAgeMonths: 2, ageNote: '2개월', visitGroup: '2개월' },
  { id: 'hib-1', vaccineName: 'Hib(b형헤모필루스인플루엔자)', doseLabel: '1차', minAgeMonths: 2, ageNote: '2개월', visitGroup: '2개월' },
  { id: 'pcv-1', vaccineName: '폐렴구균(단백결합)', doseLabel: '1차', minAgeMonths: 2, ageNote: '2개월', visitGroup: '2개월' },

  { id: 'dtap-2', vaccineName: 'DTaP(디프테리아·파상풍·백일해)', doseLabel: '2차', minAgeMonths: 4, ageNote: '4개월', visitGroup: '4개월' },
  { id: 'ipv-2', vaccineName: 'IPV(폴리오)', doseLabel: '2차', minAgeMonths: 4, ageNote: '4개월', visitGroup: '4개월' },
  { id: 'hib-2', vaccineName: 'Hib(b형헤모필루스인플루엔자)', doseLabel: '2차', minAgeMonths: 4, ageNote: '4개월', visitGroup: '4개월' },
  { id: 'pcv-2', vaccineName: '폐렴구균(단백결합)', doseLabel: '2차', minAgeMonths: 4, ageNote: '4개월', visitGroup: '4개월' },

  { id: 'hepb-3', vaccineName: 'B형간염', doseLabel: '3차', minAgeMonths: 6, ageNote: '6개월', visitGroup: '6개월' },
  { id: 'dtap-3', vaccineName: 'DTaP(디프테리아·파상풍·백일해)', doseLabel: '3차', minAgeMonths: 6, ageNote: '6개월', visitGroup: '6개월' },
  { id: 'ipv-3', vaccineName: 'IPV(폴리오)', doseLabel: '3차', minAgeMonths: 6, ageNote: '6~18개월', visitGroup: '6개월' },
  { id: 'hib-3', vaccineName: 'Hib(b형헤모필루스인플루엔자)', doseLabel: '3차', minAgeMonths: 6, ageNote: '6개월', visitGroup: '6개월' },
  { id: 'pcv-3', vaccineName: '폐렴구균(단백결합)', doseLabel: '3차', minAgeMonths: 6, ageNote: '6개월', visitGroup: '6개월' },

  { id: 'mmr-1', vaccineName: 'MMR(홍역·유행성이하선염·풍진)', doseLabel: '1차', minAgeMonths: 12, ageNote: '12~15개월', visitGroup: '12개월' },
  { id: 'varicella-1', vaccineName: '수두', doseLabel: '1회', minAgeMonths: 12, ageNote: '12~15개월', visitGroup: '12개월' },
  { id: 'hib-4', vaccineName: 'Hib(b형헤모필루스인플루엔자)', doseLabel: '4차', minAgeMonths: 12, ageNote: '12~15개월', visitGroup: '12개월' },
  { id: 'pcv-4', vaccineName: '폐렴구균(단백결합)', doseLabel: '4차', minAgeMonths: 12, ageNote: '12~15개월', visitGroup: '12개월' },
  { id: 'hepa-1', vaccineName: 'A형간염', doseLabel: '1차', minAgeMonths: 12, ageNote: '12~23개월', visitGroup: '12개월' },
  { id: 'jev-live-1', vaccineName: '일본뇌염(생백신)', doseLabel: '1차', minAgeMonths: 12, ageNote: '12~23개월', visitGroup: '12개월' },

  { id: 'dtap-4', vaccineName: 'DTaP(디프테리아·파상풍·백일해)', doseLabel: '4차', minAgeMonths: 15, ageNote: '15~18개월', visitGroup: '15~18개월' },

  { id: 'hepa-2', vaccineName: 'A형간염', doseLabel: '2차', minAgeMonths: 18, ageNote: '1차 접종 후 6~12개월 뒤', visitGroup: '18~24개월' },
  { id: 'jev-live-2', vaccineName: '일본뇌염(생백신)', doseLabel: '2차', minAgeMonths: 24, ageNote: '24~35개월', visitGroup: '24개월' },

  { id: 'dtap-5', vaccineName: 'DTaP(디프테리아·파상풍·백일해)', doseLabel: '5차', minAgeMonths: 48, ageNote: '4~6세', visitGroup: '4~6세' },
  { id: 'ipv-4', vaccineName: 'IPV(폴리오)', doseLabel: '4차', minAgeMonths: 48, ageNote: '4~6세', visitGroup: '4~6세' },
  { id: 'mmr-2', vaccineName: 'MMR(홍역·유행성이하선염·풍진)', doseLabel: '2차', minAgeMonths: 48, ageNote: '4~6세', visitGroup: '4~6세' },
];

export function vaccineDueDate(birth: Date, dose: VaccineDoseRef): Date {
  const d = new Date(birth.getFullYear(), birth.getMonth() + dose.minAgeMonths, birth.getDate());
  return d;
}

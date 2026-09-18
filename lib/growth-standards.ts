// WHO Child Growth Standards (세계보건기구 아동성장표준), 0~5세 일 단위 LMS 기준값.
// 한국 질병관리청 2017 소아청소년 성장도표도 0~35개월 구간은 이 WHO 기준을 그대로 채택하고
// 있어, 이 앱이 다루는 영유아 연령대(0~만 5세)에는 이 데이터가 공식 기준과 같습니다.
// 원본: WorldHealthOrganization/anthro (weianthro.txt / lenanthro.txt / hcanthro.txt).
import weightLms from './growth-lms/weight.json';
import lengthLms from './growth-lms/length.json';
import headLms from './growth-lms/head.json';
import type { Gender } from './types';

type LmsTriple = [number, number, number]; // [L, M, S]
type LmsTable = { boys: (LmsTriple | undefined)[]; girls: (LmsTriple | undefined)[] };

const MAX_DAY = 1826; // ~5세

function sexKey(gender: Gender): 'boys' | 'girls' {
  return gender === '남아' ? 'boys' : 'girls';
}

function lookup(table: LmsTable, gender: Gender, ageDays: number): LmsTriple | null {
  const clamped = Math.max(0, Math.min(MAX_DAY, Math.round(ageDays)));
  const row = table[sexKey(gender)][clamped];
  return row ?? null;
}

// Standard normal CDF via the Abramowitz-Stegun approximation (accurate to ~1e-7).
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

function lmsZScore(value: number, l: number, m: number, s: number): number {
  if (Math.abs(l) < 1e-9) return Math.log(value / m) / s;
  return (Math.pow(value / m, l) - 1) / (l * s);
}

export interface GrowthPercentile {
  zScore: number;
  percentile: number; // 1~99 (clamped)
}

function computePercentile(table: LmsTable, gender: Gender, ageDays: number, value: number): GrowthPercentile | null {
  const lms = lookup(table, gender, ageDays);
  if (!lms || value <= 0) return null;
  const [l, m, s] = lms;
  const z = lmsZScore(value, l, m, s);
  const percentile = Math.round(Math.max(1, Math.min(99, normalCdf(z) * 100)));
  return { zScore: z, percentile };
}

export function weightPercentile(gender: Gender, ageDays: number, weightKg: number): GrowthPercentile | null {
  return computePercentile(weightLms as LmsTable, gender, ageDays, weightKg);
}

export function lengthPercentile(gender: Gender, ageDays: number, heightCm: number): GrowthPercentile | null {
  return computePercentile(lengthLms as LmsTable, gender, ageDays, heightCm);
}

export function headCircumferencePercentile(gender: Gender, ageDays: number, headCm: number): GrowthPercentile | null {
  return computePercentile(headLms as LmsTable, gender, ageDays, headCm);
}

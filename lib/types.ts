export type Gender = '여아' | '남아';

export type RecordType =
  | 'feed'
  | 'water'
  | 'meal'
  | 'kidmeal'
  | 'snack'
  | 'sleep'
  | 'diaper'
  | 'shot'
  | 'temp'
  | 'routine';

export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface FamilyMember {
  family_id: string;
  user_id: string;
  role: 'owner' | 'member';
  display_name: string | null;
  joined_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  birth: string; // ISO date
  gender: Gender;
  photo_path: string | null;
  regular_pattern: boolean;
  created_at: string;
}

export interface VaccineDose {
  id: string;
  child_id: string;
  vaccine_id: string;
  actual_date: string;
}

export interface CheckupDone {
  id: string;
  child_id: string;
  checkup_id: string;
  done_at: string;
}

export interface DevCheck {
  id: string;
  child_id: string;
  milestone_id: string;
  done_at: string;
}

export interface Todo {
  id: string;
  family_id: string;
  label: string;
  done: boolean;
  created_at: string;
}

export interface ScheduleTemplateItem {
  id: string;
  child_id: string;
  time: string; // HH:MM
  end_time: string | null;
  label: string;
  default_amount: number | null;
  sort_order: number;
}

export interface ScheduleLogEntry {
  id: string;
  child_id: string;
  item_id: string;
  log_date: string;
  start_time: string;
  end_time: string | null;
  amount: number | null;
  level: string | null;
}

export interface RecordEntry {
  id: string;
  child_id: string;
  record_date: string;
  time: string;
  type: RecordType;
  amount: number | null;
  level: string | null;
  note: string | null;
  sub: string | null;
  end_time: string | null;
  source_schedule_item: string | null;
  created_at: string;
}

export interface DiaryEntry {
  child_id: string;
  entry_date: string;
  text: string;
  updated_at: string;
}

export interface DailyNote {
  child_id: string;
  note_date: string;
  text: string;
  author: string;
  note_time: string;
  ack: boolean;
}

export interface PhotoEntry {
  child_id: string;
  photo_date: string;
  storage_path: string;
  created_at: string;
}

export interface GrowthRecord {
  id: string;
  child_id: string;
  measured_date: string;
  height_cm: number | null;
  weight_kg: number | null;
  head_circumference_cm: number | null;
  created_at: string;
}

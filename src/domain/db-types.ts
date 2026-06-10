import { CourseDeliverable } from '../types';

// ─── Typed database row shapes ──────────────────────────────────────
// These match the column names returned by Supabase, so we never use `any`.

export interface DbCourseRow {
  id: string;
  code: string;
  name: string;
  credits: number;
  grade_progress?: number;
  impact_level?: string;
  theme_color?: string;
  grade?: string;
  weightage?: {
    quizzes?: number;
    assignments?: number;
    midterm?: number;
    final?: number;
    project?: number;
  };
  // legacy field
  color?: string;
  gradeProgress?: number;
  impactLevel?: string;
  themeColor?: string;
}

export interface DbDeadlineRow {
  id: string;
  title: string;
  course: string;
  topic: string;
  due_date: string;
  priority: 'urgent' | 'moderate' | 'normal';
}

export interface DbTodoRow {
  id: string;
  text: string;
  completed: boolean;
  due_date: string;
  created_at: string;
  completed_at?: string | null;
  course?: string | null;
}

export interface DbDeliverableRow {
  id: string;
  course_id: string;
  type: CourseDeliverable['type'];
  title: string;
  date: string;
  score?: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
}

export interface DbOnboardingRow {
  loadout_committed: boolean;
  committed_at?: string | null;
  version?: number;
}

export interface DbProfileRow {
  name: string;
  registration_number?: string;
  degree: string;
  university_name: string;
  graduation_year: string | number;
  current_cgpa: number;
  target_gpa: number;
  semester: string;
  course_count?: number;
}

export interface DbAcademicCalendarRow {
  id: string;
  user_id: string;
  semesters: any[];
  raw_text?: string | null;
  uploaded_at: string;
  created_at: string;
}

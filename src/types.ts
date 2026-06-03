export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  gradeProgress: number;
  impactLevel: 'heavy' | 'standard' | 'minimal';
  grade: string;
  weightage: {
    quizzes: number;
    assignments: number;
    midterm: number;
    final: number;
    project: number;
  };
}

export interface Deadline {
  id: string;
  title: string;
  course: string;
  topic: string;
  dueDate: string;
  priority: 'urgent' | 'moderate' | 'normal';
}

export interface Stat {
  label: string;
  value: string;
  color: string;
}

export interface UserProfile {
  name: string;
  degree: string;
  universityName: string;
  graduationYear: string;
  currentCgpa: number;
  targetGpa: number;
  semester: string;
  courseCount: number;
}

export interface OnboardingState {
  loadoutCommitted: boolean;
  committedAt?: string;
  version: number;
}

export interface SemesterBreak {
  name: string;
  startDate: string;
  endDate: string;
}

export interface SemesterInfo {
  name: string;
  startDate: string;
  endDate: string;
  breaks: SemesterBreak[];
  examPeriod?: { startDate: string; endDate: string };
}

export interface AcademicCalendarData {
  id: string;
  semesters: SemesterInfo[];
  rawText?: string;
  uploadedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'deadline' | 'exam' | 'break' | 'holiday' | 'custom';
  courseId?: string;
  weekNumber?: number;
}


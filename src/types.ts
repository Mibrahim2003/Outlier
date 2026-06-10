export type ThemeColor = 'yellow' | 'pink' | 'green' | 'blue';

export const GRADE_SCALE: { grade: string; gpc: number }[] = [
  { grade: 'A',  gpc: 4.00 },
  { grade: 'A-', gpc: 3.67 },
  { grade: 'B+', gpc: 3.33 },
  { grade: 'B',  gpc: 3.00 },
  { grade: 'B-', gpc: 2.67 },
  { grade: 'C+', gpc: 2.33 },
  { grade: 'C',  gpc: 2.00 },
  { grade: 'C-', gpc: 1.67 },
  { grade: 'D+', gpc: 1.33 },
  { grade: 'D',  gpc: 1.00 },
  { grade: 'F',  gpc: 0.00 },
];

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  gradeProgress: number;
  impactLevel: 'heavy' | 'standard' | 'minimal';
  themeColor?: ThemeColor;
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

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  dueDate: string;        // ISO date string (YYYY-MM-DD) — links to calendar
  createdAt: string;      // ISO datetime string
  completedAt?: string;   // ISO datetime string, set when checked off
  course?: string;        // optional course association
}

export interface Stat {
  label: string;
  value: string;
  color: string;
}

export interface UserProfile {
  name: string;
  registrationNumber?: string;
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

export interface CourseDeliverable {
  id: string;
  courseId: string;
  type: 'quiz' | 'assignment' | 'midterm' | 'final' | 'project';
  title: string;
  date: string;
  score?: string;
  status: string;
  metadata?: {
    classAvg?: string | number;
    progress?: number;
    topics?: string;
    highestScore?: number;
    toppersCount?: number;
    // Project specific metadata
    projectIdea?: string;
    scopeFeedback?: string;
    milestonesGenerated?: boolean;
    totalMarks?: number;
    // GPA engine fields
    obtainedMarks?: number;
    classStdDev?: number;
    classSize?: number;
    extractionSource?: 'ai' | 'manual';
  };
}


import { z } from 'zod';
import * as schemas from './schemas';

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

export type ThemeColor = z.infer<typeof schemas.ThemeColorSchema>;
export type Course = z.infer<typeof schemas.CourseSchema>;
export type Deadline = z.infer<typeof schemas.DeadlineSchema>;
export type Todo = z.infer<typeof schemas.TodoSchema>;
export type Stat = z.infer<typeof schemas.StatSchema>;
export type UserProfile = z.infer<typeof schemas.UserProfileSchema>;
export type OnboardingState = z.infer<typeof schemas.OnboardingStateSchema>;
export type SemesterBreak = z.infer<typeof schemas.SemesterBreakSchema>;
export type SemesterInfo = z.infer<typeof schemas.SemesterInfoSchema>;
export type AcademicCalendarData = z.infer<typeof schemas.AcademicCalendarDataSchema>;
export type CalendarEvent = z.infer<typeof schemas.CalendarEventSchema>;
export type CourseDeliverable = z.infer<typeof schemas.CourseDeliverableSchema>;

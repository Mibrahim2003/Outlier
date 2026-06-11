import { z } from 'zod';

// ─── CORE APPLICATION SCHEMAS ──────────────────────────────────

export const ThemeColorSchema = z.enum(['yellow', 'pink', 'green', 'blue']);

export const CourseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  credits: z.number(),
  gradeProgress: z.number(),
  impactLevel: z.enum(['heavy', 'standard', 'minimal']),
  themeColor: ThemeColorSchema.optional(),
  grade: z.string(),
  weightage: z.object({
    quizzes: z.number(),
    assignments: z.number(),
    midterm: z.number(),
    final: z.number(),
    project: z.number(),
  }),
});

export const DeadlineSchema = z.object({
  id: z.string(),
  title: z.string(),
  course: z.string(),
  topic: z.string(),
  dueDate: z.string(),
  priority: z.enum(['urgent', 'moderate', 'normal']),
});

export const TodoSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
  dueDate: z.string(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
  course: z.string().optional(),
});

export const StatSchema = z.object({
  label: z.string(),
  value: z.string(),
  color: z.string(),
});

export const UserProfileSchema = z.object({
  name: z.string(),
  registrationNumber: z.string().optional(),
  degree: z.string(),
  universityName: z.string(),
  graduationYear: z.string(),
  currentCgpa: z.number(),
  targetGpa: z.number(),
  semester: z.string(),
  courseCount: z.number(),
});

export const OnboardingStateSchema = z.object({
  loadoutCommitted: z.boolean(),
  committedAt: z.string().optional(),
  version: z.number(),
});

export const SemesterBreakSchema = z.object({
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
});

export const SemesterInfoSchema = z.object({
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  breaks: z.array(SemesterBreakSchema),
  examPeriod: z.object({
    startDate: z.string(),
    endDate: z.string()
  }).optional(),
});

export const AcademicCalendarDataSchema = z.object({
  id: z.string(),
  semesters: z.array(SemesterInfoSchema),
  rawText: z.string().optional(),
  uploadedAt: z.string(),
});

export const CalendarEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string(),
  type: z.enum(['deadline', 'exam', 'break', 'holiday', 'custom']),
  courseId: z.string().optional(),
  weekNumber: z.number().optional(),
});

export const CourseDeliverableSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  type: z.enum(['quiz', 'assignment', 'midterm', 'final', 'project']),
  title: z.string(),
  date: z.string(),
  score: z.string().optional(),
  status: z.string(),
  metadata: z.object({
    classAvg: z.union([z.string(), z.number()]).optional(),
    progress: z.number().optional(),
    topics: z.string().optional(),
    highestScore: z.number().optional(),
    toppersCount: z.number().optional(),
    projectIdea: z.string().optional(),
    scopeFeedback: z.string().optional(),
    milestonesGenerated: z.boolean().optional(),
    totalMarks: z.number().optional(),
    obtainedMarks: z.number().optional(),
    classStdDev: z.number().optional(),
    classSize: z.number().optional(),
    extractionSource: z.enum(['ai', 'manual']).optional(),
  }).optional(),
});

// ─── AI RESPONSE SCHEMAS (WITH PASSTHROUGH FOR LLM SAFETY) ─────

export const AIStudyPrioritySchema = z.array(
  z.object({
    title: z.string().optional(),
    desc: z.string().optional(),
    priority: z.string().optional(),
    courseId: z.string().optional(),
    task: z.string().optional(),
    reason: z.string().optional(),
  }).passthrough()
);

export const AIClassMarksSchema = z.object({
  myScore: z.number().nullable(),
  allScores: z.array(z.number()),
  highestScore: z.number(),
  toppersCount: z.number()
}).passthrough();

export const AICourseCriticalActionSchema = z.object({
  topic: z.string(),
  insight: z.string(),
}).passthrough();

export const AICourseStudyPlanSchema = z.array(z.string());

export const AIProjectScopeAnalysisSchema = z.object({
  feedback: z.string(),
}).passthrough();

export const AIProjectMilestoneSchema = z.array(
  z.object({
    title: z.string(),
    daysFromNow: z.number(),
  }).passthrough()
);

export const AICalendarSemesterListSchema = z.array(
  z.object({
    name: z.string(),
    startDate: z.string(),
    endDate: z.string(),
    breaks: z.array(SemesterBreakSchema).optional(),
    examPeriod: z.object({
      startDate: z.string(),
      endDate: z.string()
    }).optional()
  }).passthrough()
);

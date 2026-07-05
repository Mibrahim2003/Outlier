import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CohortStandingPanel } from '../CohortStandingPanel';
import { Analytics } from '../Analytics';
import { calculateCohortStanding, calculateCourseStatus } from '../../utils/gpaEngine';
import type { Course, CourseDeliverable } from '../../types';

// No vitest globals in this repo — clean the DOM between tests explicitly.
afterEach(cleanup);

// ─── Shared fixtures ────────────────────────────────────────────
// Canonical weighted case: quiz 9/10 (avg 5, sd 2) → z = +2 at weight 10;
// midterm 40/60 (avg 45, sd 5) → z = −1 at weight 30.
// weightedZ = (2·10 − 1·30)/40 = −0.25 → percentile ≈ 40.1 → "Top 60%".

const course: Course = {
  id: 'c1',
  code: 'CS-101',
  name: 'Data Structures',
  credits: 3,
  gradeProgress: 0,
  impactLevel: 'standard',
  grade: '',
  weightage: { quizzes: 10, assignments: 0, midterm: 30, final: 40, project: 20 },
};

const quizWithStats: CourseDeliverable = {
  id: 'q1',
  courseId: 'c1',
  type: 'quiz',
  title: 'Quiz 1',
  date: '2026-03-10',
  score: '9',
  status: 'graded',
  metadata: { classAvg: 5, classStdDev: 2, totalMarks: 10, highestScore: 10, classSize: 42 },
};

const midtermWithStats: CourseDeliverable = {
  id: 'm1',
  courseId: 'c1',
  type: 'midterm',
  title: 'Midterm Exam',
  date: '2026-04-02',
  score: '40',
  status: 'graded',
  metadata: { classAvg: 45, classStdDev: 5, totalMarks: 60, highestScore: 55, classSize: 38, lectureRange: '1-8' },
};

// Scored but with no class stats at all — standing has no data, yet the course
// still has a projected grade (80% on the quiz → a real letter, never N/A).
const quizNoStats: CourseDeliverable = {
  id: 'q9',
  courseId: 'c1',
  type: 'quiz',
  title: 'Quiz 1',
  date: '2026-03-10',
  score: '8',
  status: 'graded',
  metadata: { totalMarks: 10 },
};

// ─── Analytics domain-hook mocks (same style as Analytics.test.tsx) ──

const mockData = vi.hoisted(() => ({
  deliverables: [] as unknown[],
}));

const addTodoMock = vi.fn();

vi.mock('../../domain/profile/useProfile', () => ({
  useProfile: () => ({
    userProfile: { name: 'Ibrahim Tester', currentCgpa: 3.2, targetGpa: 3.8, semester: '3' },
  }),
}));

vi.mock('../../domain/courses/useCourses', () => ({
  useCourses: () => ({
    courses: [
      {
        id: 'c1',
        code: 'CS-101',
        name: 'Data Structures',
        credits: 3,
        gradeProgress: 0,
        impactLevel: 'standard',
        grade: '',
        weightage: { quizzes: 10, assignments: 0, midterm: 30, final: 40, project: 20 },
      },
    ],
  }),
}));

vi.mock('../../domain/deadlines/useDeadlines', () => ({
  useDeadlines: () => ({ deadlines: [] }),
}));

vi.mock('../../domain/deliverables/useDeliverables', () => ({
  useDeliverables: () => ({ deliverables: mockData.deliverables }),
}));

vi.mock('../../domain/todos/useTodos', () => ({
  useTodos: () => ({ addTodo: addTodoMock }),
}));

vi.mock('../../domain/calendar/useCalendar', () => ({
  useCalendar: () => ({ academicCalendar: null }),
}));

vi.mock('../../hooks/useAI', () => ({
  useAI: () => ({ getStudyPriorities: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: undefined, isLoading: false }),
}));

beforeEach(() => {
  addTodoMock.mockClear();
  mockData.deliverables = [];
});

const renderAnalytics = () =>
  render(
    <MemoryRouter>
      <Analytics />
    </MemoryRouter>
  );

// ─── 5) CohortStandingPanel ─────────────────────────────────────

describe('CohortStandingPanel — with class data', () => {
  const deliverables = [quizWithStats, midtermWithStats];
  const standing = calculateCohortStanding(course, deliverables);
  const courseStatus = calculateCourseStatus(course, deliverables);

  const renderPanel = () =>
    render(
      <CohortStandingPanel
        standing={standing}
        courseStatus={courseStatus}
        themeColor="blue"
        deliverables={deliverables}
      />
    );

  it('shows the Top X% headline and the Class Average row', () => {
    renderPanel();
    // percentile ≈ 40.1 → topPercentOf → 60
    expect(screen.getByText(/top 60%/i)).toBeInTheDocument();
    expect(screen.getByText(/class average/i)).toBeInTheDocument();
  });

  it('caveats with the covered weight and the smallest sample size', () => {
    renderPanel();
    // statsCoveredWeight = 40; minSampleSize = min(42, 38) = 38
    expect(screen.getByText(/based on 40% of your grade/i)).toBeInTheDocument();
    expect(screen.getByText(/smallest sample: 38 scores/i)).toBeInTheDocument();
  });

  it('states the weighted-points gap to the topper and names the biggest-gap category', () => {
    renderPanel();
    // gap = 1 (quiz) + 7.5 (midterm) = 8.5 points, dominated by the midterm
    expect(screen.getByText(/8\.5 weighted points/i)).toBeInTheDocument();
    expect(screen.getByText(/most of that gap sits in the midterm/i)).toBeInTheDocument();
  });

  it('shows the Current Projected Grade block from courseStatus.estimatedGrade', () => {
    renderPanel();
    expect(screen.getByText(/current projected grade/i)).toBeInTheDocument();
    // weightedZ = −0.25 → B− on the default scale
    expect(courseStatus.estimatedGrade).toBe('B-');
    expect(screen.getByText(courseStatus.estimatedGrade)).toBeInTheDocument();
  });
});

describe('CohortStandingPanel — no class data', () => {
  const deliverables = [quizNoStats];
  const standing = calculateCohortStanding(course, deliverables);
  const courseStatus = calculateCourseStatus(course, deliverables);

  const renderPanel = () =>
    render(
      <CohortStandingPanel
        standing={standing}
        courseStatus={courseStatus}
        themeColor="blue"
        deliverables={deliverables}
      />
    );

  it('shows a coaching empty state instead of N/A rows', () => {
    const { container } = renderPanel();
    expect(standing.hasData).toBe(false);
    expect(screen.getByText(/no class data yet/i)).toBeInTheDocument();
    // Copy tells the user to upload a class marksheet to unlock standing.
    expect(screen.getByText(/upload a class marksheet/i)).toBeInTheDocument();
    // Never "N/A" anywhere in the panel.
    expect(container.textContent).not.toMatch(/N\/A/);
    expect(screen.queryByText(/N\/A/)).not.toBeInTheDocument();
  });

  it('still shows the Current Projected Grade block', () => {
    renderPanel();
    expect(screen.getByText(/current projected grade/i)).toBeInTheDocument();
    // 8/10 = 80% on the absolute fallback → a real letter grade, not N/A
    expect(screen.getByText(courseStatus.estimatedGrade)).toBeInTheDocument();
    expect(courseStatus.estimatedGrade).not.toBe('N/A');
  });
});

// ─── 6) Analytics ───────────────────────────────────────────────

describe('Analytics — Weak Topics', () => {
  it('lists the below-average deliverable with its lecture range and adds a study task on click', () => {
    mockData.deliverables = [quizWithStats, midtermWithStats];
    renderAnalytics();

    expect(screen.getByText(/weak topics/i)).toBeInTheDocument();
    // Only the midterm (z = −1) is weak; it carries lectureRange '1-8'.
    expect(screen.getByText('Midterm Exam')).toBeInTheDocument();
    expect(screen.getByText(/lectures 1-8/i)).toBeInTheDocument();

    const addButton = screen.getByRole('button', { name: /add study task/i });
    fireEvent.click(addButton);

    expect(addTodoMock).toHaveBeenCalledTimes(1);
    const todo = addTodoMock.mock.calls[0][0];
    expect(todo.text).toContain('CS-101');
    expect(todo.text).toContain('Midterm Exam');
    expect(todo.text).toContain('1-8');
    expect(todo.course).toBe('CS-101');

    // The row flips to a confirmation.
    expect(screen.getByText(/task added/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add study task/i })).not.toBeInTheDocument();
  });

  it('shows the coaching empty state (never N/A) when no class data exists but a course does', () => {
    mockData.deliverables = [];
    renderAnalytics();

    const heading = screen.getByRole('heading', { name: /weak topics/i });
    const card = heading.closest('.border-t-secondary') as HTMLElement | null;
    expect(card).not.toBeNull();

    expect(within(card!).getByText(/no class data yet/i)).toBeInTheDocument();
    expect(within(card!).getByText(/upload a class marksheet/i)).toBeInTheDocument();
    expect(card!.textContent).not.toMatch(/N\/A/);
  });
});

describe('Analytics — cohort standing chips', () => {
  it('shows the Top X% chip and the semester standing line, without touching GPA privacy', () => {
    mockData.deliverables = [quizWithStats, midtermWithStats];
    renderAnalytics();

    // weightedZ −0.25 → percentile ≈ 40.1 → Top 60%.
    // Both are visible WITHOUT clicking Reveal — standing is not GPA.
    expect(screen.getByText(/top 60% of class/i)).toBeInTheDocument();
    expect(screen.getByText(/averaging the/i)).toBeInTheDocument();
    expect(screen.getByText('top 60%')).toBeInTheDocument();

    // GPA is still masked: the reveal control has not been used.
    expect(screen.getByRole('button', { name: /reveal gpa and cgpa/i })).toBeInTheDocument();
    expect(screen.getAllByText('•.••').length).toBeGreaterThan(0);
  });
});

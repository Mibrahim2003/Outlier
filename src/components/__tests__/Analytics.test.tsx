import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Analytics } from '../Analytics';

// This suite is configured without vitest globals, so Testing Library's automatic
// afterEach cleanup never registers — unmount between tests explicitly so each test
// asserts against a fresh DOM (otherwise a prior render's masks leak into the next test).
afterEach(cleanup);

// Product rule (CLAUDE.md → "GPA & CGPA"): GPA/CGPA is private — hidden by default
// behind an explicit reveal action, and NEVER rendered on load. These tests guard that
// rule on the Analytics GPA tile row, which is where the aggregate GPA/CGPA values
// live (semester GPA, target CGPA, projected CGPA, required GPA).

// currentCgpa > 0 so every projection block (required GPA + projected CGPA) renders.
vi.mock('../../domain/profile/useProfile', () => ({
  useProfile: () => ({
    userProfile: { name: 'Ibrahim Tester', currentCgpa: 3.2, targetGpa: 3.8, semester: '3' },
  }),
}));

vi.mock('../../domain/courses/useCourses', () => ({
  useCourses: () => ({
    courses: [{ id: 'c1', code: 'CS-101', name: 'Intro to CS', credits: 3, weightage: {} }],
  }),
}));

vi.mock('../../domain/deadlines/useDeadlines', () => ({
  useDeadlines: () => ({ deadlines: [] }),
}));

vi.mock('../../domain/deliverables/useDeliverables', () => ({
  useDeliverables: () => ({ deliverables: [] }),
}));

vi.mock('../../domain/todos/useTodos', () => ({
  useTodos: () => ({ addTodo: vi.fn() }),
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

const MASK = '•.••'; // •.••

const renderAnalytics = () =>
  render(
    <MemoryRouter>
      <Analytics />
    </MemoryRouter>
  );

describe('Analytics — GPA/CGPA privacy', () => {
  it('hides every GPA/CGPA value behind a mask on load, with a reveal control', () => {
    renderAnalytics();

    // Nothing is revealed on mount: each of the four sensitive tiles shows the mask
    // (semester GPA, target CGPA, projected CGPA, required GPA).
    expect(screen.getAllByText(MASK).length).toBeGreaterThanOrEqual(4);

    // The only affordance is an explicit "Reveal" action.
    expect(
      screen.getByRole('button', { name: /reveal gpa and cgpa/i })
    ).toBeInTheDocument();

    // The tile scaffolding is still visible so the user knows what can be revealed.
    expect(screen.getByText(/semester gpa/i)).toBeInTheDocument();
  });

  it('reveals the values only after the explicit reveal action, and can hide them again', () => {
    renderAnalytics();

    fireEvent.click(screen.getByRole('button', { name: /reveal gpa and cgpa/i }));

    // Once revealed, no masks remain — every gated slot now shows its real value.
    expect(screen.queryByText(MASK)).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /hide gpa and cgpa/i })
    ).toBeInTheDocument();

    // Hiding again restores the masks.
    fireEvent.click(screen.getByRole('button', { name: /hide gpa and cgpa/i }));
    expect(screen.getAllByText(MASK).length).toBeGreaterThanOrEqual(4);
  });
});

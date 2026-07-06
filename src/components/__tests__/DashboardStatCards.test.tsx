import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from '../Dashboard';

// This suite runs without vitest globals, so Testing Library's automatic
// afterEach cleanup never registers — unmount explicitly between tests.
afterEach(cleanup);

// ---------------------------------------------------------------------------
// Mocks — fixture deadlines straddle the 7-day window on purpose:
//   * Alpha Report — due in 2 days   → inside the window
//   * Beta Essay   — due in 30 days  → outside (future)
//   * Gamma Lab    — 30 days overdue → outside (past)
// Only Alpha Report may count toward the "Deadlines" stat and the banner.
// ---------------------------------------------------------------------------

vi.mock('../../domain/profile/useProfile', () => ({
  useProfile: () => ({ userProfile: { name: 'Ibrahim Tester', targetGpa: 3.8 } }),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../../domain/courses/useCourses', () => ({
  useCourses: () => ({ courses: [] }),
}));

vi.mock('../../domain/deliverables/useDeliverables', () => ({
  useDeliverables: () => ({ deliverables: [] }),
}));

vi.mock('../../domain/deadlines/useDeadlines', () => {
  const iso = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  };
  return {
    useDeadlines: () => ({
      deadlines: [
        { id: 'soon', title: 'Alpha Report', course: 'CS-101', topic: 'arrays', dueDate: iso(2), priority: 'urgent' },
        { id: 'far', title: 'Beta Essay', course: 'ENG-210', topic: 'poetry', dueDate: iso(30), priority: 'normal' },
        { id: 'past', title: 'Gamma Lab', course: 'PHY-101', topic: 'optics', dueDate: iso(-30), priority: 'moderate' },
      ],
    }),
  };
});

vi.mock('../../domain/todos/useTodos', () => {
  // Local date, not toISOString() (UTC) — the UTC date is yesterday between
  // local midnight and UTC midnight, which made this suite fail overnight.
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return {
    useTodos: () => ({
      todos: [
        // Two uncompleted todos due today → Pending Tasks reads 2, which keeps
        // it distinguishable from the Deadlines stat (1).
        { id: 't1', text: 'Read Chapter 5', completed: false, dueDate: today, createdAt: new Date().toISOString() },
        { id: 't2', text: 'Draft outline', completed: false, dueDate: today, createdAt: new Date().toISOString() },
      ],
      toggleTodo: vi.fn(),
    }),
  };
});

vi.mock('../../hooks/useAI', () => ({
  useAI: () => ({
    getDashboardInsight: vi.fn().mockResolvedValue('Mocked AI insight'),
  }),
}));

vi.mock('../../utils/dateUtils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/dateUtils')>();
  return {
    // Keep the real helpers (parseLocalDate, isSameDay, …) so the deadline
    // window filter runs for real; pin only the time-of-day-dependent pair.
    ...actual,
    getGreeting: () => 'Good morning',
    getDeadlineStatus: () => ({ text: '2 days left', isUrgent: true }),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<div>CALENDAR_PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );

/** The stat card link wrapping the given stat label. */
const statCard = (label: string): HTMLElement => {
  const card = screen.getByText(label).closest('a');
  expect(card).not.toBeNull();
  return card as HTMLElement;
};

// ---------------------------------------------------------------------------
// 7. Deadlines stat counts the next-7-days window, not all deadlines ever
// ---------------------------------------------------------------------------

describe('Dashboard stat cards — deadline window', () => {
  it('the Deadlines card counts only deadlines due in the next 7 days', () => {
    renderDashboard();
    const card = statCard('Deadlines');
    // 3 deadlines exist, but only Alpha Report falls inside the window.
    expect(within(card).getByText('1')).toBeInTheDocument();
    expect(within(card).queryByText('3')).not.toBeInTheDocument();
  });

  it('the banner "upcoming deadlines this week" count agrees with the card', () => {
    renderDashboard();
    const banner = screen.getByText(/upcoming deadline/i);
    expect(banner.textContent).toContain('1');
    // Singular phrasing confirms the count is exactly one.
    expect(banner.textContent).not.toMatch(/deadlines/i);
  });

  it('the sidebar Deadlines section lists only next-7-day deadlines', () => {
    renderDashboard();
    expect(screen.getByText('Alpha Report')).toBeInTheDocument();
    expect(screen.queryByText('Beta Essay')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma Lab')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Stat cards navigate to /calendar
// ---------------------------------------------------------------------------

describe('Dashboard stat cards — navigation', () => {
  it('the Pending Tasks card counts uncompleted todos due today', () => {
    renderDashboard();
    expect(within(statCard('Pending Tasks')).getByText('2')).toBeInTheDocument();
  });

  it('clicking the Pending Tasks card navigates to /calendar', () => {
    renderDashboard();
    fireEvent.click(statCard('Pending Tasks'));
    expect(screen.getByText('CALENDAR_PAGE')).toBeInTheDocument();
  });

  it('clicking the Deadlines card navigates to /calendar', () => {
    renderDashboard();
    fireEvent.click(statCard('Deadlines'));
    expect(screen.getByText('CALENDAR_PAGE')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 9. Sidebar deadline cards navigate to /calendar
// ---------------------------------------------------------------------------

describe('Dashboard deadlines sidebar — navigation', () => {
  it('clicking an upcoming-deadline card navigates to /calendar', () => {
    renderDashboard();
    fireEvent.click(screen.getByText('Alpha Report'));
    expect(screen.getByText('CALENDAR_PAGE')).toBeInTheDocument();
  });
});

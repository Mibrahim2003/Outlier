import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NotificationBell } from '../NotificationBell';
import { Layout } from '../Layout';
import type { Deadline } from '../../types';

// This suite runs without vitest globals, so Testing Library's automatic
// afterEach cleanup never registers — unmount explicitly between tests.
afterEach(cleanup);

// ---------------------------------------------------------------------------
// Mocks — deadlines come from a mutable fixture so each test picks its own
// window shape; nothing touches Supabase.
// ---------------------------------------------------------------------------

const fixtures = vi.hoisted(() => ({
  deadlines: [] as Deadline[],
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}));

vi.mock('../../domain/deadlines/useDeadlines', () => ({
  useDeadlines: () => ({ deadlines: fixtures.deadlines }),
}));

// Layout also renders GlobalSearch, which pulls these three hooks.
vi.mock('../../domain/courses/useCourses', () => ({
  useCourses: () => ({ courses: [] }),
}));
vi.mock('../../domain/deliverables/useDeliverables', () => ({
  useDeliverables: () => ({ deliverables: [] }),
}));
vi.mock('../../domain/todos/useTodos', () => ({
  useTodos: () => ({ todos: [] }),
}));

beforeEach(() => {
  fixtures.deadlines = [];
});

// ---------------------------------------------------------------------------
// Helpers — due dates are computed relative to "now" so the suite never rots.
// ---------------------------------------------------------------------------

const isoDaysFromNow = (offset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

const makeDeadline = (
  overrides: Partial<Deadline> & Pick<Deadline, 'id' | 'dueDate'>
): Deadline => ({
  title: 'Untitled deadline',
  course: 'CS-101',
  topic: 'general',
  priority: 'normal',
  ...overrides,
});

/** Bell mounted outside the Routes so it survives navigation to /calendar. */
const renderBell = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <NotificationBell />
      <Routes>
        <Route path="/dashboard" element={<div>DASHBOARD_PAGE</div>} />
        <Route path="/calendar" element={<div>CALENDAR_PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );

const bellButton = () => screen.getByRole('button', { name: 'Notifications' });

// ---------------------------------------------------------------------------
// 1. Placement in the Layout top bar
// ---------------------------------------------------------------------------

describe('NotificationBell — placement', () => {
  it('renders a bell button with accessible name "Notifications" in the Layout top bar', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>content</div>
        </Layout>
      </MemoryRouter>
    );
    const bell = screen.getByRole('button', { name: 'Notifications' });
    expect(bell.closest('nav')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Urgency dot — only for deadlines due within 48 hours
// ---------------------------------------------------------------------------

describe('NotificationBell — urgency dot', () => {
  it('shows the indicator dot when a deadline is due within 48 hours', () => {
    fixtures.deadlines = [
      makeDeadline({ id: 'd1', title: 'Algebra Quiz', dueDate: isoDaysFromNow(1), priority: 'urgent' }),
    ];
    renderBell();
    expect(screen.getByTestId('notification-dot')).toBeInTheDocument();
  });

  it('shows no dot when the nearest deadline is 5 days out', () => {
    fixtures.deadlines = [
      makeDeadline({ id: 'd1', title: 'Data Report', dueDate: isoDaysFromNow(5) }),
    ];
    renderBell();
    expect(screen.queryByTestId('notification-dot')).not.toBeInTheDocument();
  });

  it('shows no dot when there are no deadlines at all', () => {
    renderBell();
    expect(screen.queryByTestId('notification-dot')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3–5. Popover contents
// ---------------------------------------------------------------------------

describe('NotificationBell — popover', () => {
  it('lists only deadlines due in the next 7 days, soonest first', () => {
    fixtures.deadlines = [
      // Deliberately out of order: the later one comes first in the fixture.
      makeDeadline({ id: 'later', title: 'Data Report', course: 'DS-330', dueDate: isoDaysFromNow(5) }),
      makeDeadline({ id: 'sooner', title: 'Algebra Quiz', course: 'MATH-202', dueDate: isoDaysFromNow(1), priority: 'urgent' }),
      makeDeadline({ id: 'far', title: 'Far Future Essay', dueDate: isoDaysFromNow(30) }),
      makeDeadline({ id: 'past', title: 'Ancient Lab', dueDate: isoDaysFromNow(-3) }),
    ];
    renderBell();
    fireEvent.click(bellButton());

    const sooner = screen.getByText('Algebra Quiz');
    const later = screen.getByText('Data Report');
    expect(sooner).toBeInTheDocument();
    expect(later).toBeInTheDocument();
    // Past and beyond-7-days deadlines are excluded.
    expect(screen.queryByText('Far Future Essay')).not.toBeInTheDocument();
    expect(screen.queryByText('Ancient Lab')).not.toBeInTheDocument();
    // Soonest first: the 1-day deadline precedes the 5-day one in the DOM.
    expect(
      sooner.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('each row shows the deadline title and its course', () => {
    fixtures.deadlines = [
      makeDeadline({ id: 'd1', title: 'Algebra Quiz', course: 'MATH-202', dueDate: isoDaysFromNow(1) }),
    ];
    renderBell();
    fireEvent.click(bellButton());

    const row = screen.getByRole('button', { name: /algebra quiz/i });
    expect(row.textContent).toMatch(/MATH-202/);
  });

  it('clicking a row navigates to /calendar and closes the popover', () => {
    fixtures.deadlines = [
      makeDeadline({ id: 'd1', title: 'Algebra Quiz', course: 'MATH-202', dueDate: isoDaysFromNow(1) }),
      makeDeadline({ id: 'd2', title: 'Data Report', course: 'DS-330', dueDate: isoDaysFromNow(5) }),
    ];
    renderBell();
    fireEvent.click(bellButton());
    fireEvent.click(screen.getByRole('button', { name: /algebra quiz/i }));

    expect(screen.getByText('CALENDAR_PAGE')).toBeInTheDocument();
    // Popover closed — its other row is gone.
    expect(screen.queryByText('Data Report')).not.toBeInTheDocument();
  });

  it('shows an empty-state message when nothing is due within 7 days', () => {
    fixtures.deadlines = [
      makeDeadline({ id: 'far', title: 'Far Future Essay', dueDate: isoDaysFromNow(30) }),
    ];
    renderBell();
    fireEvent.click(bellButton());

    expect(screen.getByText(/nothing due/i)).toBeInTheDocument();
    expect(screen.queryByText('Far Future Essay')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. Toggle behavior
// ---------------------------------------------------------------------------

describe('NotificationBell — toggling', () => {
  it('clicking the bell a second time closes the popover', () => {
    fixtures.deadlines = [
      makeDeadline({ id: 'd1', title: 'Algebra Quiz', dueDate: isoDaysFromNow(1) }),
    ];
    renderBell();

    fireEvent.click(bellButton());
    expect(screen.getByText('Algebra Quiz')).toBeInTheDocument();

    fireEvent.click(bellButton());
    expect(screen.queryByText('Algebra Quiz')).not.toBeInTheDocument();
  });
});

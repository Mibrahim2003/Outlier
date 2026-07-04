import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom';
import { GlobalSearch } from '../GlobalSearch';
import { Layout } from '../Layout';

// This suite runs without vitest globals, so Testing Library's automatic
// afterEach cleanup never registers — unmount explicitly between tests.
afterEach(cleanup);

// ---------------------------------------------------------------------------
// Mocks — the search runs client-side over data from the four domain hooks;
// nothing touches Supabase.
// ---------------------------------------------------------------------------

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}));

// Layout renders the initials avatar, which pulls the profile hook.
vi.mock('../../domain/profile/useProfile', () => ({
  useProfile: () => ({ userProfile: { name: 'Ibrahim Tester' } }),
}));

vi.mock('../../domain/courses/useCourses', () => ({
  useCourses: () => ({
    courses: [
      {
        id: 'c1',
        code: 'CS-101',
        name: 'Intro to Computer Science',
        credits: 3,
        weightage: {},
        gradeProgress: 0,
        impactLevel: 'standard',
        themeColor: 'yellow',
      },
      {
        id: 'c2',
        code: 'DS-330',
        name: 'Data Science Basics',
        credits: 3,
        weightage: {},
        gradeProgress: 0,
        impactLevel: 'standard',
        themeColor: 'blue',
      },
      {
        id: 'c3',
        code: 'MATH-202',
        name: 'Linear Algebra',
        credits: 3,
        weightage: {},
        gradeProgress: 0,
        impactLevel: 'standard',
        themeColor: 'green',
      },
    ],
  }),
}));

vi.mock('../../domain/deliverables/useDeliverables', () => ({
  useDeliverables: () => ({
    deliverables: [
      {
        id: 'd1',
        courseId: 'c1',
        type: 'quiz',
        title: 'Recursion Quiz 3',
        date: '2026-07-09',
        metadata: {},
      },
    ],
  }),
}));

vi.mock('../../domain/deadlines/useDeadlines', () => ({
  useDeadlines: () => ({
    deadlines: [
      {
        id: 'dl1',
        title: 'Lab Report Submission',
        course: 'PHY-101',
        topic: 'kinematics',
        dueDate: '2026-07-10',
        priority: 'high',
      },
    ],
  }),
}));

vi.mock('../../domain/todos/useTodos', () => ({
  useTodos: () => ({
    todos: [
      { id: 't1', text: 'Email professor about regrade', completed: false, dueDate: '2026-07-08' },
      // 10 matching tasks for the same query — exercises the max-8 cap.
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `overflow-${i + 1}`,
        text: `Overflow task ${i + 1}`,
        completed: false,
        dueDate: '2026-07-15',
      })),
    ],
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLACEHOLDER = 'Search courses and tasks...';

/** Marker page for /courses/:id — echoes the id so navigation is assertable. */
const CourseProbe = () => {
  const { id } = useParams();
  return <div>COURSE_PAGE:{id}</div>;
};

/**
 * GlobalSearch stays mounted outside the Routes so the input survives
 * navigation (needed to assert it clears after selecting a result).
 */
const renderSearch = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <GlobalSearch />
      <Routes>
        <Route path="/" element={<div>HOME_PAGE</div>} />
        <Route path="/courses/:id" element={<CourseProbe />} />
        <Route path="/calendar" element={<div>CALENDAR_PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );

const searchInput = () => screen.getByPlaceholderText(PLACEHOLDER);

const typeQuery = (value: string) => {
  fireEvent.change(searchInput(), { target: { value } });
};

// ---------------------------------------------------------------------------
// 1. Presence in the Layout top bar
// ---------------------------------------------------------------------------

describe('GlobalSearch — placement', () => {
  it('renders an input with the search placeholder', () => {
    renderSearch();
    expect(searchInput()).toBeInTheDocument();
  });

  it('is rendered inside the Layout top navigation', () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>content</div>
        </Layout>
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(PLACEHOLDER);
    expect(input.closest('nav')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2–5. Query behavior and results
// ---------------------------------------------------------------------------

describe('GlobalSearch — querying', () => {
  it('shows no dropdown for queries shorter than 2 characters', () => {
    renderSearch();
    typeQuery('c');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('matches courses case-insensitively on name', () => {
    renderSearch();
    typeQuery('INTRO');
    expect(screen.getByText('Intro to Computer Science')).toBeInTheDocument();
  });

  it('matches courses on code', () => {
    renderSearch();
    typeQuery('math-2');
    expect(screen.getByText('Linear Algebra')).toBeInTheDocument();
  });

  it('matches deliverables on title and shows the owning course name', () => {
    renderSearch();
    typeQuery('recursion');
    const option = screen.getByRole('option', { name: /recursion quiz 3/i });
    expect(option).toBeInTheDocument();
    expect(option.textContent).toContain('Intro to Computer Science');
  });

  it('matches deadlines on topic', () => {
    renderSearch();
    typeQuery('kinemat');
    expect(screen.getByRole('option', { name: /lab report submission/i })).toBeInTheDocument();
  });

  it('matches todos on text', () => {
    renderSearch();
    typeQuery('regrade');
    expect(
      screen.getByRole('option', { name: /email professor about regrade/i })
    ).toBeInTheDocument();
  });

  it('shows a "no matches" message for a 2+ char query matching nothing', () => {
    renderSearch();
    typeQuery('zzzznothing');
    expect(screen.getByText(/no match/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('caps the dropdown at 8 results even when more items match', () => {
    renderSearch();
    typeQuery('overflow task');
    expect(screen.getAllByRole('option')).toHaveLength(8);
  });
});

// ---------------------------------------------------------------------------
// 3 & 6. Selection → navigation, then reset
// ---------------------------------------------------------------------------

describe('GlobalSearch — selecting results', () => {
  it('navigates to /courses/<id> when a course result is clicked', () => {
    renderSearch();
    typeQuery('linear algebra');
    fireEvent.click(screen.getByRole('option', { name: /linear algebra/i }));
    expect(screen.getByText('COURSE_PAGE:c3')).toBeInTheDocument();
  });

  it('navigates to the owning course when a deliverable result is clicked', () => {
    renderSearch();
    typeQuery('recursion quiz');
    fireEvent.click(screen.getByRole('option', { name: /recursion quiz 3/i }));
    expect(screen.getByText('COURSE_PAGE:c1')).toBeInTheDocument();
  });

  it('navigates to /calendar when a deadline result is clicked', () => {
    renderSearch();
    typeQuery('lab report');
    fireEvent.click(screen.getByRole('option', { name: /lab report submission/i }));
    expect(screen.getByText('CALENDAR_PAGE')).toBeInTheDocument();
  });

  it('navigates to /calendar when a task result is clicked', () => {
    renderSearch();
    typeQuery('regrade');
    fireEvent.click(screen.getByRole('option', { name: /email professor/i }));
    expect(screen.getByText('CALENDAR_PAGE')).toBeInTheDocument();
  });

  it('clears the input and closes the dropdown after selecting a result', () => {
    renderSearch();
    typeQuery('linear algebra');
    fireEvent.click(screen.getByRole('option', { name: /linear algebra/i }));

    expect(searchInput()).toHaveValue('');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Keyboard navigation inside the dropdown
// ---------------------------------------------------------------------------

describe('GlobalSearch — keyboard navigation', () => {
  it('ArrowDown moves the highlight and Enter selects the highlighted result', () => {
    renderSearch();
    // 'science' matches both course names, in order: c1 then c2.
    typeQuery('science');
    expect(screen.getAllByRole('option')).toHaveLength(2);

    fireEvent.keyDown(searchInput(), { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: /data science basics/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    fireEvent.keyDown(searchInput(), { key: 'Enter' });
    expect(screen.getByText('COURSE_PAGE:c2')).toBeInTheDocument();
  });

  it('ArrowUp moves the highlight back up before Enter selects', () => {
    renderSearch();
    typeQuery('science');

    fireEvent.keyDown(searchInput(), { key: 'ArrowDown' });
    fireEvent.keyDown(searchInput(), { key: 'ArrowUp' });
    expect(screen.getByRole('option', { name: /intro to computer science/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    fireEvent.keyDown(searchInput(), { key: 'Enter' });
    expect(screen.getByText('COURSE_PAGE:c1')).toBeInTheDocument();
  });

  it('Escape closes the dropdown without navigating', () => {
    renderSearch();
    typeQuery('science');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(searchInput(), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByText('HOME_PAGE')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Global "/" shortcut
// ---------------------------------------------------------------------------

describe('GlobalSearch — "/" shortcut', () => {
  it('focuses the search input when "/" is pressed outside a text field', () => {
    renderSearch();
    const input = searchInput();
    expect(document.activeElement).not.toBe(input);

    const notPrevented = fireEvent.keyDown(document.body, { key: '/' });

    expect(document.activeElement).toBe(input);
    // The shortcut consumed the keystroke so "/" is not typed anywhere.
    expect(notPrevented).toBe(false);
  });

  it('does not steal focus when "/" is typed inside another input', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GlobalSearch />
        <input aria-label="decoy field" />
      </MemoryRouter>
    );
    const decoy = screen.getByLabelText('decoy field');
    decoy.focus();

    const notPrevented = fireEvent.keyDown(decoy, { key: '/' });

    expect(document.activeElement).toBe(decoy);
    expect(document.activeElement).not.toBe(searchInput());
    // Not prevented — the "/" character types normally into the decoy.
    expect(notPrevented).toBe(true);
  });

  it('does not steal focus when "/" is typed inside a textarea', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <GlobalSearch />
        <textarea aria-label="decoy notes" />
      </MemoryRouter>
    );
    const decoy = screen.getByLabelText('decoy notes');
    decoy.focus();

    const notPrevented = fireEvent.keyDown(decoy, { key: '/' });

    expect(document.activeElement).toBe(decoy);
    expect(notPrevented).toBe(true);
  });
});

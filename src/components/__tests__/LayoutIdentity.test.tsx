import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from '../Layout';

// This suite runs without vitest globals, so Testing Library's automatic
// afterEach cleanup never registers — unmount explicitly between tests.
afterEach(cleanup);

// ---------------------------------------------------------------------------
// Mocks — profile comes from a mutable fixture so each test picks its own
// name shape; nothing touches Supabase.
// ---------------------------------------------------------------------------

const fixtures = vi.hoisted(() => ({
  userProfile: { name: 'Ibrahim Tester' } as { name: string } | null,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}));

vi.mock('../../domain/deadlines/useDeadlines', () => ({
  useDeadlines: () => ({ deadlines: [] }),
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

vi.mock('../../domain/profile/useProfile', () => ({
  useProfile: () => ({ userProfile: fixtures.userProfile }),
}));

beforeEach(() => {
  fixtures.userProfile = { name: 'Ibrahim Tester' };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Marker for /courses that echoes the query string so navigation targets
 *  (including `?action=add`) can be asserted precisely. */
const CoursesMarker = () => {
  const location = useLocation();
  return <div>COURSES_PAGE{location.search}</div>;
};

/** Layout wraps marker routes so navigations triggered from the shell
 *  (sidebar button, avatar link) land on an observable page. */
const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Layout>
        <Routes>
          <Route path="/dashboard" element={<div>DASHBOARD_PAGE</div>} />
          <Route path="/courses" element={<CoursesMarker />} />
          <Route path="/settings" element={<div>SETTINGS_PAGE</div>} />
          <Route path="/onboarding" element={<div>ONBOARDING_PAGE</div>} />
        </Routes>
      </Layout>
    </MemoryRouter>
  );

const avatarLink = () => screen.getByRole('link', { name: 'Account settings' });

// ---------------------------------------------------------------------------
// A. Sidebar "Add Course" button
// ---------------------------------------------------------------------------

describe('Layout — sidebar Add Course button', () => {
  it('renders an "Add Course" button and no "New Project" label anywhere', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: /add course/i })).toBeInTheDocument();
    expect(screen.queryByText(/new project/i)).not.toBeInTheDocument();
  });

  it('navigates to /courses with ?action=add when clicked', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: /add course/i }));
    // The marker echoes location.search, so this asserts both the pathname
    // and the exact query string that opens the add-course modal.
    expect(screen.getByText('COURSES_PAGE?action=add')).toBeInTheDocument();
  });

  it('does not navigate to /onboarding (the old wrong behavior)', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: /add course/i }));
    expect(screen.queryByText('ONBOARDING_PAGE')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// B. Initials avatar
// ---------------------------------------------------------------------------

describe('Layout — initials avatar', () => {
  it('renders no stock-photo <img> from picsum.photos anywhere in the shell', () => {
    const { container } = renderLayout();
    const images = Array.from(container.querySelectorAll('img'));
    const stockPhotos = images.filter((img) =>
      (img.getAttribute('src') ?? '').includes('picsum.photos')
    );
    expect(stockPhotos).toHaveLength(0);
  });

  it('shows "IT" for the two-word profile name "Ibrahim Tester"', () => {
    fixtures.userProfile = { name: 'Ibrahim Tester' };
    renderLayout();
    expect(within(avatarLink()).getByText('IT')).toBeInTheDocument();
  });

  it('shows a single initial "I" for the one-word name "Ibrahim"', () => {
    fixtures.userProfile = { name: 'Ibrahim' };
    renderLayout();
    expect(within(avatarLink()).getByText('I')).toBeInTheDocument();
  });

  it('uppercases initials for the lowercase name "ibrahim tester"', () => {
    fixtures.userProfile = { name: 'ibrahim tester' };
    renderLayout();
    expect(within(avatarLink()).getByText('IT')).toBeInTheDocument();
  });

  it('renders the "?" placeholder without crashing when the profile is null', () => {
    fixtures.userProfile = null;
    renderLayout();
    const avatar = avatarLink();
    expect(avatar).toBeInTheDocument();
    expect(within(avatar).getByText('?')).toBeInTheDocument();
  });

  it('renders the "?" placeholder when the profile name is empty', () => {
    fixtures.userProfile = { name: '' };
    renderLayout();
    expect(within(avatarLink()).getByText('?')).toBeInTheDocument();
  });

  it('links to /settings — clicking the avatar navigates there', () => {
    renderLayout();
    const avatar = avatarLink();
    expect(avatar).toHaveAttribute('href', '/settings');
    fireEvent.click(avatar);
    expect(screen.getByText('SETTINGS_PAGE')).toBeInTheDocument();
  });
});

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
// Static source text of CourseDetail (Vite `?raw` import — does not execute the
// module). CourseDetail is a heavy component (tabs, uploads, AI flows); per the
// spec a static source-level assertion is acceptable for that item.
import courseDetailSource from '../CourseDetail.tsx?raw';
import { LandingPage } from '../LandingPage';
import { Dashboard } from '../Dashboard';
import { Layout } from '../Layout';
import { Analytics } from '../Analytics';

// This suite runs without vitest globals, so Testing Library's automatic afterEach
// cleanup never registers — unmount explicitly between tests.
afterEach(cleanup);

// jsdom has no IntersectionObserver; LandingPage uses motion's `whileInView`,
// which needs one to exist. A no-op stub is enough — the content is in the DOM
// either way, only the entrance animation is skipped.
beforeAll(() => {
  if (!('IntersectionObserver' in globalThis)) {
    class IntersectionObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      writable: true,
      configurable: true,
      value: IntersectionObserverStub,
    });
  }
});

// ---------------------------------------------------------------------------
// Mocks — components render against fixed data, never touching Supabase.
// ---------------------------------------------------------------------------

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}));

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
        name: 'Intro to CS',
        credits: 3,
        weightage: {},
        gradeProgress: 85,
        impactLevel: 'standard',
        themeColor: 'yellow',
      },
    ],
  }),
}));

vi.mock('../../domain/deadlines/useDeadlines', () => ({
  useDeadlines: () => ({ deadlines: [] }),
}));

vi.mock('../../domain/deliverables/useDeliverables', () => ({
  useDeliverables: () => ({ deliverables: [] }),
}));

vi.mock('../../domain/todos/useTodos', () => ({
  useTodos: () => ({ todos: [], toggleTodo: vi.fn(), addTodo: vi.fn() }),
}));

vi.mock('../../domain/calendar/useCalendar', () => ({
  useCalendar: () => ({ academicCalendar: null }),
}));

vi.mock('../../hooks/useAI', () => ({
  useAI: () => ({
    getDashboardInsight: vi.fn().mockResolvedValue('Mocked AI insight'),
    getStudyPriorities: vi.fn(),
  }),
}));

// Fixed AI study priorities so the Analytics "AI Study Priorities" list renders
// real <li> items (the useQuery below feeds them straight in).
const STUDY_PRIORITIES = vi.hoisted(() => [
  { title: 'Review sorting algorithms', priority: 'critical', reason: 'Low quiz average' },
  { title: 'Redo assignment 2 problems', priority: 'high', reason: 'Weak topic before the midterm' },
]);

vi.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQuery: () => ({ data: STUDY_PRIORITIES, isLoading: false }),
}));

// ---------------------------------------------------------------------------
// Honest-UI spec: no fabricated stats, no fake claims, no dead controls.
// ---------------------------------------------------------------------------

describe('LandingPage — honest marketing', () => {
  const renderLanding = () =>
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

  it('contains none of the fabricated marketing stats', () => {
    renderLanding();
    const text = (document.body.textContent ?? '').toLowerCase();

    for (const fabricated of [
      '50k+',
      '98% accuracy',
      '95% success',
      '12 hours saved',
      'a+ average increase',
    ]) {
      expect(text).not.toContain(fabricated);
    }
  });

  it('does not claim university-portal syncing', () => {
    renderLanding();
    const text = document.body.textContent ?? '';

    expect(text).not.toMatch(/automatic sync/i);
    expect(text).not.toMatch(/real-time sync/i);
  });

  it('has a working Features nav link pointing at an existing #features section', () => {
    const { container } = renderLanding();

    const featuresLink = screen.getByRole('link', { name: /^features$/i });
    expect(featuresLink).toHaveAttribute('href', '#features');
    expect(container.querySelector('#features')).not.toBeNull();
  });

  it('has no external social/repo links in the footer (no GitHub/Twitter/Discord)', () => {
    const { container } = renderLanding();

    // The product page ships no "view source" link — the repo is private and
    // wrong-named, so a dead GitHub link would be dishonest chrome.
    expect(screen.queryByRole('link', { name: /github/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/twitter/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/discord/i)).not.toBeInTheDocument();
    for (const anchor of Array.from(container.querySelectorAll('a'))) {
      const href = anchor.getAttribute('href') ?? '';
      expect(href).not.toMatch(/twitter|discord|github/i);
    }
  });

  it('has no CTA restricted to "with Google" (email/password is also supported)', () => {
    renderLanding();
    expect(document.body.textContent ?? '').not.toMatch(/with google/i);
  });
});

describe('Dashboard — no fake AI Insights badge', () => {
  it('never renders the exact text "AI Insights" in the banner or anywhere else', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Case-sensitive on purpose: the legitimate AI card copy ("daily AI insight",
    // "Generate Insight") must stay allowed; only the fabricated badge is banned.
    expect(document.body.textContent ?? '').not.toContain('AI Insights');
    expect(screen.queryByText('AI Insights')).not.toBeInTheDocument();
  });
});

describe('Layout — sidebar has no dead Help button', () => {
  const renderLayout = () =>
    render(
      <MemoryRouter>
        <Layout>
          <div>content</div>
        </Layout>
      </MemoryRouter>
    );

  it('does not render a Help button', () => {
    renderLayout();
    expect(screen.queryByRole('button', { name: /help/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^help$/i)).not.toBeInTheDocument();
  });

  it('still renders a working Logout button', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});

describe('CourseDetail — no fabricated resources', () => {
  it('contains no "Recommended Resource" block', () => {
    expect(courseDetailSource).not.toMatch(/recommended resource/i);
  });

  it('references no picsum.photos placeholder images', () => {
    expect(courseDetailSource).not.toContain('picsum.photos');
  });
});

describe('Analytics — AI Study Priorities items are not styled as clickable', () => {
  it('renders the priority list items without a cursor-pointer class', () => {
    render(
      <MemoryRouter>
        <Analytics />
      </MemoryRouter>
    );

    // Sanity check: we are looking at the right section and the mocked
    // priorities actually rendered as list items.
    expect(screen.getByText(/AI Study Priorities/i)).toBeInTheDocument();

    for (const priority of STUDY_PRIORITIES) {
      const listItem = screen.getByText(priority.title).closest('li');
      expect(listItem).not.toBeNull();
      expect(listItem?.className ?? '').not.toContain('cursor-pointer');
    }
  });
});

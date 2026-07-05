import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeliverables } from '../deliverables/useDeliverables';
import { useCourses } from '../courses/useCourses';
import { Course, CourseDeliverable } from '../../types';

afterEach(cleanup);

// Contract under test: when Supabase returns { error }, the mutationFn REJECTS,
// so the optimistic cache patch is rolled back to the pre-mutation snapshot.
// A silently swallowed error would leave the UI claiming a write that never
// happened on the server.

const h = vi.hoisted(() => {
  const results: Record<string, { select: StepResultLike; delete: StepResultLike; upsert: StepResultLike }> = {};
  const calls: string[] = [];
  type StepResultLike = { data?: unknown[]; error: { message: string } | null };

  const defaults = () => ({
    select: { data: [], error: null } as StepResultLike,
    delete: { error: null } as StepResultLike,
    upsert: { error: null } as StepResultLike,
  });

  const setResults = (
    table: string,
    overrides: Partial<{ select: StepResultLike; delete: StepResultLike; upsert: StepResultLike }>
  ) => {
    results[table] = { ...defaults(), ...overrides };
  };

  const reset = () => {
    for (const key of Object.keys(results)) delete results[key];
    calls.length = 0;
  };

  // Chainable builder: every chain step returns the builder, and awaiting it
  // (at any depth: .select().eq(), .delete().eq().in(), .upsert(p, o)) resolves
  // to whatever the test configured for the current terminal operation.
  const makeBuilder = (table: string) => {
    let mode: 'select' | 'delete' | 'upsert' = 'select';
    const resultFor = () => (results[table] ?? defaults())[mode];
    const builder: Record<string, unknown> = {};
    builder.select = () => { mode = 'select'; calls.push(`${table}.select`); return builder; };
    builder.delete = () => { mode = 'delete'; calls.push(`${table}.delete`); return builder; };
    builder.upsert = () => { mode = 'upsert'; calls.push(`${table}.upsert`); return builder; };
    builder.eq = () => builder;
    builder.in = () => builder;
    builder.then = (
      onFulfilled: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(resultFor()).then(onFulfilled, onRejected);
    return builder;
  };

  return { results, calls, setResults, reset, makeBuilder };
});

vi.mock('../../lib/supabase', () => ({
  supabase: { from: (table: string) => h.makeBuilder(table) },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, session: null, loading: false }),
}));

beforeEach(() => {
  h.reset();
});

const createClientAndWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

const deliverable: CourseDeliverable = {
  id: 'd1',
  courseId: 'c1',
  type: 'quiz',
  title: 'Quiz 1',
  date: '2026-07-10',
  status: 'scheduled',
  metadata: {},
};

// Snake_case row so the hook's SELECT mapping reproduces the same deliverable.
const deliverableRow = {
  id: 'd1',
  course_id: 'c1',
  type: 'quiz',
  title: 'Quiz 1',
  date: '2026-07-10',
  score: null,
  status: 'scheduled',
  metadata: {},
};

const course: Course = {
  id: 'c1',
  code: 'CS-101',
  name: 'INTRO TO CS',
  credits: 3,
  gradeProgress: 0,
  impactLevel: 'standard',
  themeColor: 'yellow',
  grade: 'N/A',
  weightage: { quizzes: 10, assignments: 20, midterm: 25, final: 35, project: 10 },
};

describe('optimistic rollback on Supabase errors', () => {
  it('setDeliverables: a failed DELETE rolls the removal back into the cache', async () => {
    h.setResults('course_deliverables', {
      select: { data: [deliverableRow], error: null },
      delete: { error: { message: 'network down' } },
    });

    const { queryClient, wrapper } = createClientAndWrapper();
    queryClient.setQueryData(['deliverables', 'u1'], [deliverable]);

    const { result } = renderHook(() => useDeliverables(), { wrapper });
    await waitFor(() => expect(result.current.deliverables).toHaveLength(1));

    act(() => {
      result.current.setDeliverables([]); // optimistic removal of d1
    });

    // The mutationFn must reject on { error }, triggering the rollback: the
    // removal does not stick and d1 is back in the cache.
    await waitFor(() => expect(h.calls).toContain('course_deliverables.delete'));
    await waitFor(() => {
      const cache = queryClient.getQueryData<CourseDeliverable[]>(['deliverables', 'u1']);
      expect(cache?.some((d) => d.id === 'd1')).toBe(true);
    });
  });

  it('addDeliverable: a failed UPSERT rolls the optimistic insert back out', async () => {
    h.setResults('course_deliverables', {
      select: { data: [], error: null },
      upsert: { error: { message: 'network down' } },
    });

    const { queryClient, wrapper } = createClientAndWrapper();
    queryClient.setQueryData(['deliverables', 'u1'], []);

    const { result } = renderHook(() => useDeliverables(), { wrapper });
    await waitFor(() => expect(result.current.deliverables).toHaveLength(0));

    act(() => {
      result.current.addDeliverable(deliverable);
    });

    // The upsert ran (so the optimistic insert had been applied first)…
    await waitFor(() => expect(h.calls).toContain('course_deliverables.upsert'));
    // …and the rejection rolled the cache back to empty.
    await waitFor(() => {
      const cache = queryClient.getQueryData<CourseDeliverable[]>(['deliverables', 'u1']);
      expect(cache).toEqual([]);
    });
  });

  it('setCourses: a failed DELETE keeps the course in the cache', async () => {
    // Course rows pass through normalizeCourse, so the seeded row is fully
    // shaped and the assertion checks id presence rather than deep equality.
    h.setResults('courses', {
      select: { data: [{ ...course, grade_progress: 0, impact_level: 'standard', theme_color: 'yellow' }], error: null },
      delete: { error: { message: 'network down' } },
    });

    const { queryClient, wrapper } = createClientAndWrapper();
    queryClient.setQueryData(['courses', 'u1'], [course]);

    const { result } = renderHook(() => useCourses(), { wrapper });
    await waitFor(() => expect(result.current.courses).toHaveLength(1));

    act(() => {
      result.current.setCourses([]); // optimistic removal of c1
    });

    await waitFor(() => expect(h.calls).toContain('courses.delete'));
    await waitFor(() => {
      const cache = queryClient.getQueryData<Course[]>(['courses', 'u1']);
      expect(cache?.some((c) => c.id === 'c1')).toBe(true);
    });
  });
});

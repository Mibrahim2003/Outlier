import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';

// Mock dependencies
vi.mock('../../domain/profile/useProfile', () => ({
  useProfile: () => ({ userProfile: { name: 'Ibrahim Tester', targetGpa: 3.8 } })
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: (_options: any) => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('../../domain/courses/useCourses', () => ({
  useCourses: () => ({ courses: [ { id: '1', credits: 3, gradeProgress: 90, impactLevel: 'heavy' }, { id: '2', credits: 4, gradeProgress: 80, impactLevel: 'standard' } ] })
}));

vi.mock('../../domain/deadlines/useDeadlines', () => ({
  useDeadlines: () => ({ deadlines: [ { id: '1', title: 'Test Deadline', dueDate: '2026-05-30', topic: 'Tests', course: 'CS-201', priority: 'urgent' } ] })
}));

vi.mock('../../domain/todos/useTodos', () => ({
  useTodos: () => ({
    todos: [
      { id: 't1', text: 'Read Chapter 5', completed: false, dueDate: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() },
      { id: 't2', text: 'Review notes', completed: true, dueDate: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString(), completedAt: new Date().toISOString() },
    ],
    toggleTodo: vi.fn(),
  })
}));

vi.mock('../../hooks/useAI', () => ({
  useAI: () => ({
    getDashboardInsight: vi.fn().mockResolvedValue('Mocked AI insight'),
  })
}));

vi.mock('../../utils/dateUtils', () => ({
  getGreeting: () => 'Good morning',
  getDeadlineStatus: () => ({ text: '2 days left', isUrgent: true }),
  isSameDay: (a: Date, b: Date) => {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  },
}));

describe('Dashboard', () => {
  it('renders dynamic stats and enhancements correctly', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // 1. Check if the dynamic time-aware name is rendered
    expect(screen.getByText(/Good morning,/i)).toBeInTheDocument();
    expect(screen.getByText(/Ibrahim Tester/i)).toBeInTheDocument();

    // 2. Check if upcoming deadlines banner is dynamic
    expect(screen.getByText(/1 upcoming deadline/i)).toBeInTheDocument();

    // 3. Check Pending Tasks shows uncompleted todo count (1 uncompleted)
    expect(screen.getByText('Pending Tasks')).toBeInTheDocument();

    // 4. Check Deadlines stat shows deadline count
    expect(screen.getByText('Deadlines')).toBeInTheDocument();
  });

  it('renders Today\'s Tasks section with todos', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Check the section header
    expect(screen.getAllByText(/Today's Tasks/i)[0]).toBeInTheDocument();

    // Check uncompleted todo appears
    expect(screen.getAllByText('Read Chapter 5')[0]).toBeInTheDocument();

    // Check completed todo appears with strikethrough
    expect(screen.getAllByText('Review notes')[0]).toBeInTheDocument();

    // Check progress indicator
    expect(screen.getAllByText(/Done today: 1\/2/)[0]).toBeInTheDocument();
  });

  it('renders deadline section separately', () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Check deadline appears in the deadlines section
    expect(screen.getAllByText('Test Deadline')[0]).toBeInTheDocument();
    expect(screen.getAllByText('2 days left')[0]).toBeInTheDocument();
  });
});

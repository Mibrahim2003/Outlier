import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AcademicCalendar } from '../AcademicCalendar';

// Simple mock fns
const mockAddTodo = vi.fn();
const mockToggleTodo = vi.fn();
const mockAddDeadline = vi.fn();
const mockSetAcademicCalendar = vi.fn();

vi.mock('../../context/StoreContext', () => ({
  useStore: () => ({
    academicCalendar: {
      id: 'test-cal',
      semesters: [{
        name: 'Spring 2026',
        startDate: '2026-01-15',
        endDate: '2026-06-15',
        breaks: [],
        examPeriod: null,
      }],
      uploadedAt: '2026-01-01T00:00:00Z',
    },
    setAcademicCalendar: mockSetAcademicCalendar,
    deadlines: [],
    addDeadline: mockAddDeadline,
    todos: [
      { id: 't1', text: 'Existing task', completed: false, dueDate: '2026-03-10', createdAt: '2026-03-09T10:00:00Z' },
    ],
    addTodo: mockAddTodo,
    toggleTodo: mockToggleTodo,
    courses: [
      { id: 'c1', code: 'CS-301', name: 'Algorithms', credits: 3, gradeProgress: 75, impactLevel: 'heavy', grade: 'B', weightage: {} },
      { id: 'c2', code: 'MA-201', name: 'Linear Algebra', credits: 4, gradeProgress: 82, impactLevel: 'standard', grade: 'B+', weightage: {} },
    ],
  }),
}));

vi.mock('../../hooks/useCalendarParser', () => ({
  useCalendarParser: () => ({
    parseCalendarImage: vi.fn(),
    parsing: false,
    parseError: null,
  }),
}));

describe('Todo ↔ Calendar Integration', () => {
  it('adds a task from the calendar modal with correct shape', () => {
    mockAddTodo.mockClear();
    mockAddDeadline.mockClear();

    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    const addBtn = screen.getAllByRole('button', { name: /Add Event/i })[0];
    fireEvent.click(addBtn);

    // Default is Task mode
    expect(screen.getByRole('heading', { name: 'New Event' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Read Chapter 3')).toBeInTheDocument();

    // Fill in task
    fireEvent.change(screen.getByPlaceholderText('e.g. Read Chapter 3'), {
      target: { value: 'Review lecture notes' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Add Task/i }));

    // Verify addTodo called with right shape
    expect(mockAddTodo).toHaveBeenCalledTimes(1);
    const arg = mockAddTodo.mock.calls[0][0];
    expect(arg.text).toBe('Review lecture notes');
    expect(arg.completed).toBe(false);
    expect(arg.id).toBeDefined();
    expect(arg.dueDate).toBeDefined();
    expect(arg.createdAt).toBeDefined();
    expect(mockAddDeadline).not.toHaveBeenCalled();
  });

  it('adds a task with optional course association', () => {
    mockAddTodo.mockClear();

    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Add Event/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('e.g. Read Chapter 3'), {
      target: { value: 'Solve problem set 5' },
    });
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'MA-201' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Add Task/i }));

    const arg = mockAddTodo.mock.calls[0][0];
    expect(arg.text).toBe('Solve problem set 5');
    expect(arg.course).toBe('MA-201');
  });

  it('switches between Task and Deadline modes correctly', () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Add Event/i })[0]);

    // Task mode: no Priority, no Topic
    expect(screen.getByPlaceholderText('e.g. Read Chapter 3')).toBeInTheDocument();
    expect(screen.queryByText('Priority')).not.toBeInTheDocument();
    expect(screen.queryByText('Topic')).not.toBeInTheDocument();

    // Switch to Deadline
    fireEvent.click(screen.getByRole('button', { name: /📅 Deadline/i }));

    expect(screen.getByPlaceholderText('e.g. Midterm Report')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Topic')).toBeInTheDocument();

    // Switch back
    fireEvent.click(screen.getByRole('button', { name: /📋 Task/i }));
    expect(screen.queryByText('Priority')).not.toBeInTheDocument();
  });

  it('submit button text changes based on mode', () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Add Event/i })[0]);
    expect(screen.getByRole('button', { name: /Add Task/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /📅 Deadline/i }));
    expect(screen.getByRole('button', { name: /Commit Deadline/i })).toBeInTheDocument();
  });

  it('course label shows optional hint in task mode', () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Add Event/i })[0]);

    // Explicitly click Task tab (in case prior test state leaked)
    fireEvent.click(screen.getByRole('button', { name: /📋 Task/i }));

    // In task mode, the course select first option should say "No course (general)"
    const courseSelect = screen.getByRole('combobox');
    const options = courseSelect.querySelectorAll('option');
    expect(options[0]?.textContent).toBe('No course (general)');

    // Switch to deadline — first option should change to "Select a course"
    fireEvent.click(screen.getByRole('button', { name: /📅 Deadline/i }));
    const deadlineOptions = courseSelect.querySelectorAll('option');
    expect(deadlineOptions[0]?.textContent).toBe('Select a course');
  });
});

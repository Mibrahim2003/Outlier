import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AcademicCalendar } from '../AcademicCalendar';

// Mock function definitions
const mockAddDeadline = vi.fn();
const mockAddTodo = vi.fn();
const mockToggleTodo = vi.fn();
const mockSetAcademicCalendar = vi.fn();

// Mock store context with test parameters
vi.mock('../../context/StoreContext', () => ({
  useStore: () => ({
    academicCalendar: {
      id: 'test-cal',
      semesters: [{
        name: 'Fall 2026',
        startDate: '2026-08-25',
        endDate: '2026-12-15',
        breaks: [
          { name: 'Fall Break', startDate: '2026-10-14', endDate: '2026-10-15' },
        ],
        examPeriod: { startDate: '2026-12-08', endDate: '2026-12-15' },
      }],
      uploadedAt: '2026-08-01T00:00:00Z',
    },
    setAcademicCalendar: mockSetAcademicCalendar,
    deadlines: [
      { id: 'd1', title: 'Midterm Exam', course: 'CS-201', topic: 'Algorithms', dueDate: '2026-10-12', priority: 'urgent' },
      { id: 'd2', title: 'Normal HW', course: 'CS-201', topic: 'Homework', dueDate: '2026-10-15', priority: 'normal' },
    ],
    addDeadline: mockAddDeadline,
    todos: [
      { id: 't1', text: 'Study Chapter 8', completed: false, dueDate: '2026-10-12', createdAt: '2026-10-10T10:00:00Z' },
      { id: 't2', text: 'Review slides', completed: true, dueDate: '2026-10-12', createdAt: '2026-10-10T10:00:00Z', completedAt: '2026-10-12T15:00:00Z' },
    ],
    addTodo: mockAddTodo,
    toggleTodo: mockToggleTodo,
    courses: [
      { id: 'c1', code: 'CS-201', name: 'Data Structures', credits: 3, gradeProgress: 88, impactLevel: 'standard', grade: 'B+', weightage: {} }
    ]
  })
}));

vi.mock('../../hooks/useCalendarParser', () => ({
  useCalendarParser: () => ({
    parseCalendarImage: vi.fn(),
    parsing: false,
    parseError: null,
  })
}));

describe('AcademicCalendar - Loaded State & Actions', () => {
  it('renders the semester name and calendar grid', () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    expect(screen.getByText('Fall 2026')).toBeInTheDocument();
    expect(screen.getByText('MON')).toBeInTheDocument();
    expect(screen.getByText('FRI')).toBeInTheDocument();
    expect(screen.getByText('WEEK')).toBeInTheDocument();
  });

  it('filters out normal-priority deadlines when checked', async () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    const filterCheckbox = screen.getAllByLabelText(/Hide Normal Priority/i)[0];
    expect(filterCheckbox).not.toBeChecked();

    // Toggle filter
    fireEvent.click(filterCheckbox);
    expect(filterCheckbox).toBeChecked();
  });

  it('triggers the Edit Semester modal and allows changing dates', async () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    const editBtn = screen.getAllByRole('button', { name: /Edit Semester/i })[0];
    fireEvent.click(editBtn);

    // Modal title should appear
    expect(screen.getByRole('heading', { name: 'Edit Semester' })).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Fall 2026');
    fireEvent.change(nameInput, { target: { value: 'Fall 2026 Refined' } });

    const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    // Verify callback
    expect(mockSetAcademicCalendar).toHaveBeenCalled();
  });

  it('opens unified modal with Task/Deadline toggle', async () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    // Click the Add Event button
    const addBtn = screen.getAllByRole('button', { name: /Add Event/i })[0];
    fireEvent.click(addBtn);

    // Modal title should appear as "New Event"
    expect(screen.getByRole('heading', { name: 'New Event' })).toBeInTheDocument();

    // Both toggle buttons should exist
    expect(screen.getByRole('button', { name: /📋 Task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /📅 Deadline/i })).toBeInTheDocument();
  });

  it('submits a task via the unified modal', async () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    const addBtn = screen.getAllByRole('button', { name: /Add Event/i })[0];
    fireEvent.click(addBtn);

    // Default mode should be "Task" — fill in title
    const titleInput = screen.getByPlaceholderText('e.g. Read Chapter 3');
    fireEvent.change(titleInput, { target: { value: 'Practice Problems Set 4' } });

    const submitBtn = screen.getByRole('button', { name: /Add Task/i });
    fireEvent.click(submitBtn);

    // addTodo should be called (not addDeadline)
    expect(mockAddTodo).toHaveBeenCalled();
    expect(mockAddDeadline).not.toHaveBeenCalled();
  });

  it('submits a deadline via the unified modal in Deadline mode', async () => {
    mockAddDeadline.mockClear();
    mockAddTodo.mockClear();

    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    const addBtn = screen.getAllByRole('button', { name: /Add Event/i })[0];
    fireEvent.click(addBtn);

    // Switch to Deadline mode
    const deadlineTab = screen.getByRole('button', { name: /Deadline/i });
    fireEvent.click(deadlineTab);

    // Fill in required fields
    const titleInput = screen.getByPlaceholderText('e.g. Midterm Report');
    fireEvent.change(titleInput, { target: { value: 'Term Assignment' } });

    const courseSelect = screen.getByRole('combobox');
    fireEvent.change(courseSelect, { target: { value: 'CS-201' } });

    const commitBtn = screen.getByRole('button', { name: /Commit Deadline/i });
    fireEvent.click(commitBtn);

    // addDeadline should be called (not addTodo)
    expect(mockAddDeadline).toHaveBeenCalled();
    expect(mockAddTodo).not.toHaveBeenCalled();
  });
});

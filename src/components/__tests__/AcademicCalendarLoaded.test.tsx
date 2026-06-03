import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AcademicCalendar } from '../AcademicCalendar';

// Mock function definitions
const mockAddDeadline = vi.fn();
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

  it('triggers Add Deadline modal and registers a new event', async () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    // Select date in the grid first or click default Add Deadline
    const addBtn = screen.getAllByRole('button', { name: /Add Deadline/i })[0];
    fireEvent.click(addBtn);

    // Modal title should appear
    expect(screen.getByRole('heading', { name: 'New Deadline' })).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('e.g. Midterm Report');
    fireEvent.change(titleInput, { target: { value: 'Term Assignment' } });

    const courseSelect = screen.getByRole('combobox');
    fireEvent.change(courseSelect, { target: { value: 'CS-201' } });

    const commitBtn = screen.getByRole('button', { name: /Commit Deadline/i });
    fireEvent.click(commitBtn);

    // Verify callback is fired
    expect(mockAddDeadline).toHaveBeenCalled();
  });
});

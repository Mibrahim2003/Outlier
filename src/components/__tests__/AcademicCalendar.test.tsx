import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AcademicCalendar } from '../AcademicCalendar';

// Mock useStore — no calendar uploaded
const mockSetAcademicCalendar = vi.fn();

vi.mock('../../context/StoreContext', () => ({
  useStore: () => ({
    academicCalendar: null,
    setAcademicCalendar: mockSetAcademicCalendar,
    deadlines: [],
  })
}));

vi.mock('../../hooks/useCalendarParser', () => ({
  useCalendarParser: () => ({
    parseCalendarImage: vi.fn().mockResolvedValue(null),
    parsing: false,
    parseError: null,
  })
}));

describe('AcademicCalendar - Upload State', () => {
  it('renders upload prompt when no calendar data exists', () => {
    render(
      <MemoryRouter>
        <AcademicCalendar />
      </MemoryRouter>
    );

    // The heading contains "Upload Your" + <br> + "Academic Calendar"
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toMatch(/Upload Your/i);
    expect(screen.getByText(/Select File/i)).toBeInTheDocument();
  });
});

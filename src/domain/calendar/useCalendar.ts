import { useState } from 'react';
import { AcademicCalendarData } from '../../types';

export function useCalendar() {
  const [academicCalendar, setAcademicCalendarState] = useState<AcademicCalendarData | null>(() => {
    try {
      const stored = localStorage.getItem('academic_calendar');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setAcademicCalendar = (calendar: AcademicCalendarData | null) => {
    setAcademicCalendarState(calendar);
    try {
      if (calendar) {
        localStorage.setItem('academic_calendar', JSON.stringify(calendar));
      } else {
        localStorage.removeItem('academic_calendar');
      }
    } catch (e) {
      console.warn('Failed to persist academic calendar to localStorage', e);
    }
  };

  return { academicCalendar, setAcademicCalendar };
}

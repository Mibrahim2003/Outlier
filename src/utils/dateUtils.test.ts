import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getGreeting,
  getDeadlineStatus,
  getSemesterWeekNumber,
  getCalendarGrid,
  isDateInRange,
  isBreakDay,
  isSameDay,
  formatDateShort
} from './dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getGreeting', () => {
    it('returns Good morning before 12 PM', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 10, 0, 0)); // 10:00 AM
      expect(getGreeting()).toBe('Good morning');
    });

    it('returns Good afternoon between 12 PM and 6 PM', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 14, 0, 0)); // 2:00 PM
      expect(getGreeting()).toBe('Good afternoon');
    });

    it('returns Good evening after 6 PM', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 19, 0, 0)); // 7:00 PM
      expect(getGreeting()).toBe('Good evening');
    });
  });

  describe('getDeadlineStatus', () => {
    it('handles invalid dates gracefully', () => {
      expect(getDeadlineStatus('invalid date')).toEqual({ text: 'invalid date', isUrgent: false });
    });

    it('returns Due Today for the same day', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 10, 0, 0));
      expect(getDeadlineStatus('2026-06-03T18:00:00Z')).toEqual({ text: 'Due Today', isUrgent: true });
    });

    it('returns Due Tomorrow for the next day', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 10, 0, 0));
      expect(getDeadlineStatus('2026-06-04T18:00:00Z')).toEqual({ text: 'Due Tomorrow', isUrgent: true });
    });

    it('returns urgent status for dates within 3 days', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 10, 0, 0));
      expect(getDeadlineStatus('2026-06-05T18:00:00Z')).toEqual({ text: '2 days left', isUrgent: true });
    });

    it('returns non-urgent status for dates further out', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 10, 0, 0));
      expect(getDeadlineStatus('2026-06-10T18:00:00Z')).toEqual({ text: '7 days left', isUrgent: false });
    });

    it('handles overdue dates', () => {
      vi.setSystemTime(new Date(2026, 5, 3, 10, 0, 0));
      expect(getDeadlineStatus('2026-06-01T18:00:00Z')).toEqual({ text: 'Overdue by 2d', isUrgent: true });
    });
  });

  describe('getSemesterWeekNumber', () => {
    it('returns 0 for a date before the semester starts', () => {
      const semesterStart = new Date(2026, 8, 1); // Sept 1, 2026 (Tuesday)
      const date = new Date(2026, 7, 30); // Aug 30, 2026 (Sunday)
      expect(getSemesterWeekNumber(date, semesterStart)).toBe(0);
    });

    it('returns week 1 for a date in the first week', () => {
      const semesterStart = new Date(2026, 8, 1); // Sept 1, 2026 (Tuesday)
      const date1 = new Date(2026, 7, 31); // Aug 31, 2026 (Monday - aligned start)
      const date2 = new Date(2026, 8, 6); // Sept 6, 2026 (Sunday - end of week 1)
      expect(getSemesterWeekNumber(date1, semesterStart)).toBe(1);
      expect(getSemesterWeekNumber(date2, semesterStart)).toBe(1);
    });

    it('returns week 2 for a date in the second week', () => {
      const semesterStart = new Date(2026, 8, 1); // Sept 1, 2026
      const date = new Date(2026, 8, 7); // Sept 7, 2026 (Monday)
      expect(getSemesterWeekNumber(date, semesterStart)).toBe(2);
    });
  });

  describe('getCalendarGrid', () => {
    it('generates a grid for a standard month', () => {
      // June 2026 starts on Monday and has 30 days
      const grid = getCalendarGrid(2026, 5); // Month is 0-indexed
      expect(grid.length).toBe(5); // 5 weeks
      expect(grid[0][0]?.getDate()).toBe(1); // June 1st is Monday
      expect(grid[0][6]?.getDate()).toBe(7); // June 7th is Sunday
    });

    it('pads the grid with nulls correctly', () => {
      // May 2026 starts on Friday and has 31 days
      const grid = getCalendarGrid(2026, 4); // May
      expect(grid[0][0]).toBeNull(); // Monday
      expect(grid[0][1]).toBeNull(); // Tuesday
      expect(grid[0][2]).toBeNull(); // Wednesday
      expect(grid[0][3]).toBeNull(); // Thursday
      expect(grid[0][4]?.getDate()).toBe(1); // Friday is the 1st
    });
  });

  describe('isDateInRange', () => {
    const start = new Date(2026, 5, 1);
    const end = new Date(2026, 5, 10);

    it('returns true if date is within range', () => {
      expect(isDateInRange(new Date(2026, 5, 5), start, end)).toBe(true);
    });

    it('returns true if date is exactly start or end', () => {
      expect(isDateInRange(new Date(2026, 5, 1), start, end)).toBe(true);
      expect(isDateInRange(new Date(2026, 5, 10), start, end)).toBe(true);
    });

    it('returns false if date is outside range', () => {
      expect(isDateInRange(new Date(2026, 4, 31), start, end)).toBe(false);
      expect(isDateInRange(new Date(2026, 5, 11), start, end)).toBe(false);
    });
  });

  describe('isBreakDay', () => {
    const breaks = [
      { id: '1', name: 'Spring Break', startDate: '2026-03-16', endDate: '2026-03-20' },
      { id: '2', name: 'Thanksgiving', startDate: '2026-11-25', endDate: '2026-11-27' },
    ];

    it('returns the break name if date falls on a break day', () => {
      expect(isBreakDay(new Date('2026-03-18T10:00:00Z'), breaks)).toBe('Spring Break');
    });

    it('returns null if date does not fall on a break day', () => {
      expect(isBreakDay(new Date('2026-03-21T10:00:00Z'), breaks)).toBeNull();
    });
  });

  describe('isSameDay', () => {
    it('returns true for the same calendar day', () => {
      const a = new Date(2026, 5, 3, 10, 0, 0);
      const b = new Date(2026, 5, 3, 18, 0, 0);
      expect(isSameDay(a, b)).toBe(true);
    });

    it('returns false for different days', () => {
      const a = new Date(2026, 5, 3, 10, 0, 0);
      const b = new Date(2026, 5, 4, 10, 0, 0);
      expect(isSameDay(a, b)).toBe(false);
    });
  });

  describe('formatDateShort', () => {
    it('formats date correctly', () => {
      const date = new Date(2026, 9, 12); // Oct 12, 2026
      expect(formatDateShort(date)).toBe('Oct 12, 2026');
    });
  });
});

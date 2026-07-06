import { describe, it, expect } from 'vitest';
import { 
  getSemesterWeekNumber, 
  getCalendarGrid, 
  isDateInRange, 
  isBreakDay, 
  isSameDay,
  getDeadlineStatus,
  toLocalISODate
} from '../dateUtils';

describe('toLocalISODate', () => {
  it('formats the local calendar date, zero-padded', () => {
    expect(toLocalISODate(new Date(2026, 6, 5, 0, 30))).toBe('2026-07-05');
    expect(toLocalISODate(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01');
  });
});

describe('getSemesterWeekNumber', () => {
  it('returns 1 for the first week of the semester', () => {
    // Semester starts Monday Aug 25, 2026
    const semStart = new Date(2026, 7, 25); // Aug 25
    const date = new Date(2026, 7, 25); // same day
    expect(getSemesterWeekNumber(date, semStart)).toBe(1);
  });

  it('returns 2 for a date in the second week', () => {
    const semStart = new Date(2026, 7, 25); // Mon Aug 25
    const date = new Date(2026, 8, 1); // Mon Sep 1
    expect(getSemesterWeekNumber(date, semStart)).toBe(2);
  });

  it('returns 0 for a date before the semester starts', () => {
    const semStart = new Date(2026, 7, 25);
    const date = new Date(2026, 7, 20);
    expect(getSemesterWeekNumber(date, semStart)).toBe(0);
  });

  it('handles semester starting on a Wednesday', () => {
    // Wed Aug 27, 2026 — the Monday of that week is Aug 25
    const semStart = new Date(2026, 7, 27);
    // Aug 27 (Wed) should be in week 1
    expect(getSemesterWeekNumber(new Date(2026, 7, 27), semStart)).toBe(1);
    // Sep 1 (Mon) should be week 2
    expect(getSemesterWeekNumber(new Date(2026, 8, 1), semStart)).toBe(2);
  });
});

describe('getCalendarGrid', () => {
  it('generates correct number of weeks for a month', () => {
    // October 2026: starts on Thursday, 31 days
    const grid = getCalendarGrid(2026, 9); // month is 0-indexed
    expect(grid.length).toBeGreaterThanOrEqual(4);
    expect(grid.length).toBeLessThanOrEqual(6);
  });

  it('each week has exactly 7 entries', () => {
    const grid = getCalendarGrid(2026, 9);
    for (const week of grid) {
      expect(week.length).toBe(7);
    }
  });

  it('first valid date is the 1st of the month', () => {
    const grid = getCalendarGrid(2026, 9);
    const allDates = grid.flat().filter(d => d !== null) as Date[];
    expect(allDates[0].getDate()).toBe(1);
  });

  it('last valid date is the last day of the month', () => {
    const grid = getCalendarGrid(2026, 9);
    const allDates = grid.flat().filter(d => d !== null) as Date[];
    expect(allDates[allDates.length - 1].getDate()).toBe(31);
  });

  it('handles February correctly', () => {
    // Feb 2026 is not a leap year, 28 days
    const grid = getCalendarGrid(2026, 1);
    const allDates = grid.flat().filter(d => d !== null) as Date[];
    expect(allDates.length).toBe(28);
  });
});

describe('isDateInRange', () => {
  it('returns true for a date within the range', () => {
    expect(isDateInRange(
      new Date(2026, 9, 15),
      new Date(2026, 9, 10),
      new Date(2026, 9, 20)
    )).toBe(true);
  });

  it('returns true for start boundary', () => {
    expect(isDateInRange(
      new Date(2026, 9, 10),
      new Date(2026, 9, 10),
      new Date(2026, 9, 20)
    )).toBe(true);
  });

  it('returns true for end boundary', () => {
    expect(isDateInRange(
      new Date(2026, 9, 20),
      new Date(2026, 9, 10),
      new Date(2026, 9, 20)
    )).toBe(true);
  });

  it('returns false for a date outside the range', () => {
    expect(isDateInRange(
      new Date(2026, 9, 25),
      new Date(2026, 9, 10),
      new Date(2026, 9, 20)
    )).toBe(false);
  });
});

describe('isBreakDay', () => {
  const breaks = [
    { name: 'Fall Break', startDate: '2026-10-14', endDate: '2026-10-15' },
    { name: 'Thanksgiving', startDate: '2026-11-25', endDate: '2026-11-29' },
  ];

  it('returns break name when date falls on a break', () => {
    expect(isBreakDay(new Date(2026, 9, 14), breaks)).toBe('Fall Break');
    expect(isBreakDay(new Date(2026, 10, 27), breaks)).toBe('Thanksgiving');
  });

  it('returns null when date is not a break', () => {
    expect(isBreakDay(new Date(2026, 9, 13), breaks)).toBeNull();
    expect(isBreakDay(new Date(2026, 9, 16), breaks)).toBeNull();
  });
});

describe('isSameDay', () => {
  it('returns true for same dates', () => {
    expect(isSameDay(new Date(2026, 9, 15), new Date(2026, 9, 15))).toBe(true);
  });

  it('returns true regardless of time differences', () => {
    const a = new Date(2026, 9, 15, 8, 30);
    const b = new Date(2026, 9, 15, 22, 0);
    expect(isSameDay(a, b)).toBe(true);
  });

  it('returns false for different dates', () => {
    expect(isSameDay(new Date(2026, 9, 15), new Date(2026, 9, 16))).toBe(false);
  });
});

describe('getDeadlineStatus (regression)', () => {
  it('returns raw string for invalid dates', () => {
    const result = getDeadlineStatus('not-a-date');
    expect(result.text).toBe('not-a-date');
    expect(result.isUrgent).toBe(false);
  });
});

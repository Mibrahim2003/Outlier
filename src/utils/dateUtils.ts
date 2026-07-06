export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Parse a date string as LOCAL time. A bare 'YYYY-MM-DD' is otherwise parsed as
 * UTC midnight by the Date constructor, which shifts it to the previous day for
 * users in negative-UTC-offset timezones. Other formats pass through unchanged.
 */
export function parseLocalDate(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  return new Date(dateStr);
}

/**
 * Format a Date as LOCAL 'YYYY-MM-DD'. The `toISOString().split('T')[0]` idiom
 * uses UTC, so between local midnight and UTC midnight it returns yesterday —
 * use this everywhere a calendar date is meant.
 */
export function toLocalISODate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getDeadlineStatus(dueDateStr: string): { text: string; isUrgent: boolean } {
  // Try to parse the date. If invalid, return the raw string.
  const dueDate = parseLocalDate(dueDateStr);
  if (isNaN(dueDate.getTime())) {
    return { text: dueDateStr, isUrgent: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(dueDate);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, isUrgent: true };
  if (diffDays === 0) return { text: 'Due Today', isUrgent: true };
  if (diffDays === 1) return { text: 'Due Tomorrow', isUrgent: true };
  if (diffDays <= 3) return { text: `${diffDays} days left`, isUrgent: true };
  return { text: `${diffDays} days left`, isUrgent: false };
}

// ─── Calendar Utilities ────────────────────────────────────────

import { SemesterBreak } from '../types';

/**
 * Calculate the semester week number for a given date.
 * Week 1 starts on the Monday of (or before) the semester start date.
 * Returns 0 if the date is before the semester starts, or the week number otherwise.
 */
export function getSemesterWeekNumber(date: Date, semesterStart: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const start = new Date(semesterStart);
  start.setHours(0, 0, 0, 0);

  // Align semester start to its Monday (week boundary)
  const startDay = start.getDay(); // 0=Sun, 1=Mon
  const mondayOffset = startDay === 0 ? -6 : 1 - startDay;
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() + mondayOffset);

  const diffMs = d.getTime() - weekStart.getTime();
  if (diffMs < 0) return 0;

  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/**
 * Generate a 2D grid for a calendar month view.
 * Each row is a week (Mon–Sun), padded with nulls for days outside the month.
 */
export function getCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Day of week for the 1st (shift so Mon=0, Sun=6)
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;

  const grid: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  // Pad leading nulls
  for (let i = 0; i < startDow; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      grid.push(currentWeek);
      currentWeek = [];
    }
  }

  // Pad trailing nulls
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    grid.push(currentWeek);
  }

  return grid;
}

/**
 * Check if a date falls within a given range (inclusive).
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return d >= s && d <= e;
}

/**
 * Check if a date falls on a break day.
 * Returns the break name if it does, null otherwise.
 */
export function isBreakDay(date: Date, breaks: SemesterBreak[]): string | null {
  for (const b of breaks) {
    if (isDateInRange(date, new Date(b.startDate), new Date(b.endDate))) {
      return b.name;
    }
  }
  return null;
}

/**
 * Check if two dates are the same calendar day.
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Format a date as a short readable string, e.g. "Oct 12, 2026"
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}


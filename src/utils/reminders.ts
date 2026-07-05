import { CourseDeliverable, Deadline } from '../types';
import { parseLocalDate } from './dateUtils';

/**
 * Reminder rules for scheduled deliverables. A "reminder" is a real deadline
 * row, so scheduled work shows up on the dashboard and calendar. Pure module —
 * `today` is injectable so the rules are testable at any fixed date.
 */

const TYPE_SINGULAR: Record<CourseDeliverable['type'], string> = {
  quiz: 'Quiz',
  assignment: 'Assignment',
  midterm: 'Midterm',
  final: 'Final',
  project: 'Project',
};

/** Exams apply the most pressure; assignments the least. */
export const reminderPriorityFor = (type: CourseDeliverable['type']): Deadline['priority'] =>
  type === 'midterm' || type === 'final' ? 'urgent'
  : type === 'assignment' ? 'normal'
  : 'moderate';

/** True when the date is today or later. Invalid/legacy free-text dates are never "upcoming". */
export const isTodayOrFuture = (dateStr: string, today: Date = new Date()): boolean => {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return false;
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  return d >= startOfToday;
};

/**
 * Builds the deadline row for a scheduled deliverable, or null when no
 * reminder should exist — a reminder that is born overdue is just noise.
 * The topic prefers the quiz's lecture range, then explicit topics, then
 * the deliverable type.
 */
export const buildReminder = (
  courseCode: string,
  deliverable: CourseDeliverable,
  today: Date = new Date()
): Deadline | null => {
  if (!isTodayOrFuture(deliverable.date, today)) return null;
  return {
    id: crypto.randomUUID(),
    title: `${courseCode}: ${deliverable.title}`,
    course: courseCode,
    topic: deliverable.metadata?.lectureRange
      ? `Lectures ${deliverable.metadata.lectureRange}`
      : deliverable.metadata?.topics || TYPE_SINGULAR[deliverable.type],
    dueDate: deliverable.date,
    priority: reminderPriorityFor(deliverable.type),
  };
};

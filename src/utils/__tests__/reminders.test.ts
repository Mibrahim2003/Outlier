import { describe, it, expect } from 'vitest';
import { reminderPriorityFor, isTodayOrFuture, buildReminder } from '../reminders';
import { CourseDeliverable } from '../../types';

// Fixed "now" so date rules are deterministic: Sunday 2026-07-05, mid-afternoon.
const TODAY = new Date('2026-07-05T15:30:00');

const makeDeliverable = (overrides: Partial<CourseDeliverable> = {}): CourseDeliverable => ({
  id: 'd1',
  courseId: 'c1',
  type: 'quiz',
  title: 'Quiz 2',
  date: '2026-07-10',
  status: 'scheduled',
  ...overrides,
});

describe('reminderPriorityFor', () => {
  it('maps exams to urgent, assignments to normal, quizzes and projects to moderate', () => {
    expect(reminderPriorityFor('midterm')).toBe('urgent');
    expect(reminderPriorityFor('final')).toBe('urgent');
    expect(reminderPriorityFor('assignment')).toBe('normal');
    expect(reminderPriorityFor('quiz')).toBe('moderate');
    expect(reminderPriorityFor('project')).toBe('moderate');
  });
});

describe('isTodayOrFuture', () => {
  it('treats the same calendar day as upcoming even later in the day', () => {
    expect(isTodayOrFuture('2026-07-05', TODAY)).toBe(true);
  });

  it('treats yesterday as past and tomorrow as upcoming', () => {
    expect(isTodayOrFuture('2026-07-04', TODAY)).toBe(false);
    expect(isTodayOrFuture('2026-07-06', TODAY)).toBe(true);
  });

  it('never treats invalid or free-text dates as upcoming', () => {
    expect(isTodayOrFuture('sometime next week', TODAY)).toBe(false);
    expect(isTodayOrFuture('', TODAY)).toBe(false);
  });

  it('defaults today to now when not injected', () => {
    expect(isTodayOrFuture('2999-01-01')).toBe(true);
    expect(isTodayOrFuture('2000-01-01')).toBe(false);
  });
});

describe('buildReminder', () => {
  it('returns null for a deliverable dated in the past', () => {
    expect(buildReminder('CS-101', makeDeliverable({ date: '2026-07-04' }), TODAY)).toBeNull();
  });

  it('returns null for invalid / free-text dates', () => {
    expect(buildReminder('CS-101', makeDeliverable({ date: 'sometime next week' }), TODAY)).toBeNull();
    expect(buildReminder('CS-101', makeDeliverable({ date: '' }), TODAY)).toBeNull();
  });

  it('builds a reminder dated today (same day still counts)', () => {
    const reminder = buildReminder('CS-101', makeDeliverable({ date: '2026-07-05' }), TODAY);
    expect(reminder).not.toBeNull();
    expect(reminder!.dueDate).toBe('2026-07-05');
  });

  it('builds the full deadline shape for an upcoming quiz with a lecture range', () => {
    const deliverable = makeDeliverable({
      title: 'Quiz 2',
      date: '2026-07-10',
      metadata: { lectureRange: '1-5' },
    });
    const reminder = buildReminder('CS-101', deliverable, TODAY);

    expect(reminder).not.toBeNull();
    expect(typeof reminder!.id).toBe('string');
    expect(reminder!.id.length).toBeGreaterThan(0);
    expect(reminder!.title).toBe('CS-101: Quiz 2');
    expect(reminder!.course).toBe('CS-101');
    expect(reminder!.dueDate).toBe('2026-07-10');
    expect(reminder!.priority).toBe('moderate');
    expect(reminder!.topic).toBe('Lectures 1-5');
  });

  it('falls back to metadata.topics when there is no lecture range', () => {
    const reminder = buildReminder(
      'CS-101',
      makeDeliverable({ metadata: { topics: 'Recursion and trees' } }),
      TODAY
    );
    expect(reminder!.topic).toBe('Recursion and trees');
  });

  it('prefers the lecture range over explicit topics', () => {
    const reminder = buildReminder(
      'CS-101',
      makeDeliverable({ metadata: { lectureRange: '3-6', topics: 'Recursion and trees' } }),
      TODAY
    );
    expect(reminder!.topic).toBe('Lectures 3-6');
  });

  it('falls back to the singular type label when no metadata topic exists', () => {
    const cases: { type: CourseDeliverable['type']; label: string; priority: string }[] = [
      { type: 'quiz', label: 'Quiz', priority: 'moderate' },
      { type: 'assignment', label: 'Assignment', priority: 'normal' },
      { type: 'midterm', label: 'Midterm', priority: 'urgent' },
      { type: 'final', label: 'Final', priority: 'urgent' },
      { type: 'project', label: 'Project', priority: 'moderate' },
    ];
    for (const { type, label, priority } of cases) {
      const reminder = buildReminder('CS-101', makeDeliverable({ type, metadata: undefined }), TODAY);
      expect(reminder!.topic).toBe(label);
      expect(reminder!.priority).toBe(priority);
    }
  });
});

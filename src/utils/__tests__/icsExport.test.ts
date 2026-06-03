import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { generateICS } from '../icsExport';
import { Deadline, AcademicCalendarData } from '../../types';

describe('icsExport - generateICS', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-28T12:00:00.000Z'));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('generates a valid ICS string with deadlines', () => {
    const deadlines: Deadline[] = [
      {
        id: '1',
        title: 'Midterm',
        course: 'CS101',
        topic: 'Arrays',
        dueDate: '2026-10-15',
        priority: 'urgent',
      }
    ];

    const ics = generateICS(deadlines, null);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261015');
    expect(ics).toContain('SUMMARY:[CS101] Midterm');
    expect(ics).toContain('DESCRIPTION:Priority: urgent\\nTopic: Arrays');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('generates a valid ICS string with calendar breaks and exams', () => {
    const calendar: AcademicCalendarData = {
      id: 'cal1',
      uploadedAt: '2026-05-28',
      semesters: [
        {
          name: 'Fall 2026',
          startDate: '2026-09-01',
          endDate: '2026-12-15',
          breaks: [
            { name: 'Thanksgiving', startDate: '2026-11-26', endDate: '2026-11-27' }
          ],
          examPeriod: {
            startDate: '2026-12-10',
            endDate: '2026-12-15'
          }
        }
      ]
    };

    const ics = generateICS([], calendar);

    expect(ics).toContain('SUMMARY:Break: Thanksgiving');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261126');
    // DTEND should be exclusive (one day after 2026-11-27) -> 20261128
    expect(ics).toContain('DTEND;VALUE=DATE:20261128');

    expect(ics).toContain('SUMMARY:Fall 2026 Exams');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261210');
    // DTEND should be exclusive -> 20261216
    expect(ics).toContain('DTEND;VALUE=DATE:20261216');
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateICS } from './icsExport';
import { Deadline, AcademicCalendarData } from '../types';

describe('icsExport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-03T12:00:00Z'));
    
    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: () => '1234-5678-9012-3456',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('generates an empty calendar correctly', () => {
    const icsString = generateICS([], null);
    expect(icsString).toContain('BEGIN:VCALENDAR');
    expect(icsString).toContain('VERSION:2.0');
    expect(icsString).toContain('PRODID:-//AI Study Dashboard//Neo-Brutalist Edition//EN');
    expect(icsString).toContain('CALSCALE:GREGORIAN');
    expect(icsString).toContain('METHOD:PUBLISH');
    expect(icsString).toContain('END:VCALENDAR');
    
    // Should not contain any events
    expect(icsString).not.toContain('BEGIN:VEVENT');
  });

  it('generates ICS with deadlines', () => {
    const deadlines: Deadline[] = [
      {
        id: 'd1',
        title: 'Project 1',
        course: 'CS101',
        topic: 'React',
        dueDate: '2026-06-15',
        priority: 'urgent',
      },
    ];

    const icsString = generateICS(deadlines, null);
    expect(icsString).toContain('BEGIN:VEVENT');
    expect(icsString).toContain('UID:1234-5678-9012-3456@aistudydashboard.com');
    expect(icsString).toContain('DTSTAMP:20260603T120000Z');
    expect(icsString).toContain('DTSTART;VALUE=DATE:20260615');
    expect(icsString).toContain('SUMMARY:[CS101] Project 1');
    expect(icsString).toContain('DESCRIPTION:Priority: urgent\\nTopic: React');
    expect(icsString).toContain('END:VEVENT');
  });

  it('generates ICS with calendar breaks and exams', () => {
    const calendar: AcademicCalendarData = {
      id: 'cal1',
      uploadedAt: '2026-06-01',
      semesters: [
        {
          name: 'Fall 2026',
          startDate: '2026-09-01',
          endDate: '2026-12-15',
          breaks: [
            { name: 'Thanksgiving', startDate: '2026-11-25', endDate: '2026-11-27' },
          ],
          examPeriod: { startDate: '2026-12-10', endDate: '2026-12-15' },
        },
      ],
    };

    const icsString = generateICS([], calendar);
    
    // Check Break Event
    expect(icsString).toContain('SUMMARY:Break: Thanksgiving');
    expect(icsString).toContain('DTSTART;VALUE=DATE:20261125');
    expect(icsString).toContain('DTEND;VALUE=DATE:20261128'); // endDate + 1 day
    
    // Check Exam Event
    expect(icsString).toContain('SUMMARY:Fall 2026 Exams');
    expect(icsString).toContain('DTSTART;VALUE=DATE:20261210');
    expect(icsString).toContain('DTEND;VALUE=DATE:20261216'); // endDate + 1 day
  });

  it('handles missing topics in deadlines gracefully', () => {
    const deadlines: Deadline[] = [
      {
        id: 'd1',
        title: 'Quiz 1',
        course: 'MATH101',
        dueDate: '2026-06-15',
        priority: 'normal',
      },
    ];

    const icsString = generateICS(deadlines, null);
    expect(icsString).toContain('DESCRIPTION:Priority: normal\\nTopic: N/A');
  });
});

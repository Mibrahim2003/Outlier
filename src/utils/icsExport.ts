import { Deadline, AcademicCalendarData, SemesterInfo } from '../types';

function formatDateToICS(dateStr: string): string {
  // Assuming dateStr is YYYY-MM-DD
  return dateStr.replace(/-/g, '');
}

function generateUID(): string {
  return crypto.randomUUID() + '@aistudydashboard.com';
}

function generateTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export function generateICS(deadlines: Deadline[], calendar: AcademicCalendarData | null): string {
  let icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Study Dashboard//Neo-Brutalist Edition//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  const nowStamp = generateTimestamp();

  // Export deadlines
  for (const dl of deadlines) {
    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${generateUID()}`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;VALUE=DATE:${formatDateToICS(dl.dueDate)}`,
      `SUMMARY:[${dl.course}] ${dl.title}`,
      `DESCRIPTION:Priority: ${dl.priority}\\nTopic: ${dl.topic || 'N/A'}`,
      'END:VEVENT'
    );
  }

  // Export calendar breaks and exams if available
  if (calendar && calendar.semesters) {
    for (const sem of calendar.semesters) {
      if (sem.breaks) {
        for (const b of sem.breaks) {
          // ICS expects DTEND to be exclusive for VALUE=DATE, so we should add 1 day to endDate.
          // But parsing dates here might be complex without a lib.
          // Let's just create a Date object, add 1 day, and format it.
          const endD = new Date(b.endDate);
          endD.setDate(endD.getDate() + 1);
          const endStr = endD.toISOString().split('T')[0].replace(/-/g, '');

          icsLines.push(
            'BEGIN:VEVENT',
            `UID:${generateUID()}`,
            `DTSTAMP:${nowStamp}`,
            `DTSTART;VALUE=DATE:${formatDateToICS(b.startDate)}`,
            `DTEND;VALUE=DATE:${endStr}`,
            `SUMMARY:Break: ${b.name}`,
            'END:VEVENT'
          );
        }
      }
      
      if (sem.examPeriod) {
        const endD = new Date(sem.examPeriod.endDate);
        endD.setDate(endD.getDate() + 1);
        const endStr = endD.toISOString().split('T')[0].replace(/-/g, '');

        icsLines.push(
          'BEGIN:VEVENT',
          `UID:${generateUID()}`,
          `DTSTAMP:${nowStamp}`,
          `DTSTART;VALUE=DATE:${formatDateToICS(sem.examPeriod.startDate)}`,
          `DTEND;VALUE=DATE:${endStr}`,
          `SUMMARY:${sem.name} Exams`,
          'END:VEVENT'
        );
      }
    }
  }

  icsLines.push('END:VCALENDAR');
  
  return icsLines.join('\r\n');
}

export function exportToICS(deadlines: Deadline[], calendar: AcademicCalendarData | null) {
  const icsData = generateICS(deadlines, calendar);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'academic_calendar.ics';
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

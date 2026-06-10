import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AcademicCalendarData } from '../../types';
import { DbAcademicCalendarRow } from '../db-types';

export function useCalendar(userId: string | undefined, reportSyncError: (msg: string) => void) {
  const [academicCalendar, setAcademicCalendarState] = useState<AcademicCalendarData | null>(null);

  const hydrateCalendar = (data: DbAcademicCalendarRow | null) => {
    if (!data) {
      setAcademicCalendarState(null);
      return;
    }
    setAcademicCalendarState({
      id: data.id,
      semesters: data.semesters || [],
      rawText: data.raw_text ?? undefined,
      uploadedAt: data.uploaded_at,
    });
  };

  const reset = () => {
    setAcademicCalendarState(null);
  };

  const setAcademicCalendar = (calendar: AcademicCalendarData | null) => {
    setAcademicCalendarState(calendar);

    if (!userId) return;

    if (calendar) {
      void supabase
        .from('academic_calendars')
        .upsert(
          {
            id: calendar.id,
            user_id: userId,
            semesters: calendar.semesters,
            raw_text: calendar.rawText ?? null,
            uploaded_at: calendar.uploadedAt,
          },
          { onConflict: 'user_id' } // Only one calendar per user
        )
        .then(({ error }) => {
          if (error) {
            reportSyncError(`Failed to save academic calendar: ${error.message}`);
          }
        });
    } else {
      void supabase
        .from('academic_calendars')
        .delete()
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) {
            reportSyncError(`Failed to delete academic calendar: ${error.message}`);
          }
        });
    }
  };

  return { academicCalendar, setAcademicCalendar, hydrateCalendar, reset };
}

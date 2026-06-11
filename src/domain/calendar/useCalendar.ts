import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { AcademicCalendarData } from '../../types';
import { useAuth } from '../../context/AuthContext';

export function useCalendar() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: academicCalendar = null, isLoading } = useQuery({
    queryKey: ['calendar', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from('academic_calendars').select('*').eq('user_id', userId).maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return null;
      return {
        id: data.id,
        semesters: data.semesters || [],
        rawText: data.raw_text ?? undefined,
        uploadedAt: data.uploaded_at,
      } as AcademicCalendarData;
    },
    enabled: !!userId,
  });

  const setAcademicCalendarMutation = useMutation({
    mutationFn: async (calendar: AcademicCalendarData | null) => {
      if (calendar) {
        const { error } = await supabase.from('academic_calendars').upsert({
          id: calendar.id,
          user_id: userId!,
          semesters: calendar.semesters,
          raw_text: calendar.rawText ?? null,
          uploaded_at: calendar.uploadedAt,
        }, { onConflict: 'user_id' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('academic_calendars').delete().eq('user_id', userId!);
        if (error) throw error;
      }
    },
    onMutate: async (newCalendar) => {
      await queryClient.cancelQueries({ queryKey: ['calendar', userId] });
      const previousCalendar = queryClient.getQueryData(['calendar', userId]);
      queryClient.setQueryData(['calendar', userId], newCalendar);
      return { previousCalendar };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['calendar', userId], context?.previousCalendar);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', userId] });
    },
  });

  return { 
    academicCalendar, 
    isLoading,
    setAcademicCalendar: setAcademicCalendarMutation.mutate 
  };
}

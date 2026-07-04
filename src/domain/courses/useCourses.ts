import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Course, ThemeColor } from '../../types';
import { DbCourseRow } from '../db-types';
import { useAuth } from '../../context/AuthContext';

export const normalizeCourse = (course: DbCourseRow): Course => {
  const legacyColor = typeof course?.color === 'string' ? course.color : '';

  let impactLevel: Course['impactLevel'] = (course?.impactLevel || course?.impact_level) as Course['impactLevel'];
  if (!impactLevel || !['heavy', 'standard', 'minimal'].includes(impactLevel)) {
    if (legacyColor.includes('secondary')) impactLevel = 'heavy';
    else if (legacyColor.includes('primary')) impactLevel = 'standard';
    else if (Number(course?.credits) >= 4) impactLevel = 'heavy';
    else if (Number(course?.credits) === 3) impactLevel = 'standard';
    else impactLevel = 'minimal';
  }

  return {
    id: String(course?.id ?? crypto.randomUUID()),
    code: String(course?.code ?? 'UNKNOWN'),
    name: String(course?.name ?? 'UNKNOWN COURSE'),
    credits: Number(course?.credits ?? 0),
    gradeProgress: Number(course?.gradeProgress ?? course?.grade_progress ?? 0),
    impactLevel,
    themeColor: (course?.themeColor || course?.theme_color || 'yellow') as ThemeColor,
    grade: String(course?.grade ?? 'N/A'),
    weightage: {
      quizzes: Number(course?.weightage?.quizzes ?? 0),
      assignments: Number(course?.weightage?.assignments ?? 0),
      midterm: Number(course?.weightage?.midterm ?? 0),
      final: Number(course?.weightage?.final ?? 0),
      project: Number(course?.weightage?.project ?? 0),
    },
  };
};

const toPayload = (course: Course, userId: string) => ({
  id: course.id,
  user_id: userId,
  code: course.code,
  name: course.name,
  credits: course.credits,
  grade_progress: course.gradeProgress,
  impact_level: course.impactLevel,
  theme_color: course.themeColor,
  grade: course.grade,
  weightage: course.weightage,
});

export function useCourses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from('courses').select('*').eq('user_id', userId);
      if (error) throw error;
      return data.map(normalizeCourse);
    },
    enabled: !!userId,
  });

  const addCourseMutation = useMutation({
    meta: { sound: 'success' },
    mutationFn: async (course: Course) => {
      const normalized = normalizeCourse(course as unknown as DbCourseRow);
      const { error } = await supabase.from('courses').upsert(toPayload(normalized, userId!), { onConflict: 'user_id,id' });
      if (error) throw error;
    },
    onMutate: async (newCourse) => {
      await queryClient.cancelQueries({ queryKey: ['courses', userId] });
      const previousCourses = queryClient.getQueryData(['courses', userId]);
      const normalized = normalizeCourse(newCourse as unknown as DbCourseRow);
      // Mirror the DB upsert: replace an existing course in place, append a new one.
      queryClient.setQueryData(['courses', userId], (old: Course[] = []) =>
        old.some((c) => c.id === normalized.id)
          ? old.map((c) => (c.id === normalized.id ? normalized : c))
          : [...old, normalized]
      );
      return { previousCourses };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['courses', userId], context?.previousCourses);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', userId] });
    },
  });

  const removeCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase.from('courses').delete().eq('user_id', userId!).eq('id', courseId);
      if (error) throw error;
    },
    onMutate: async (courseId) => {
      await queryClient.cancelQueries({ queryKey: ['courses', userId] });
      const previousCourses = queryClient.getQueryData(['courses', userId]);
      queryClient.setQueryData(['courses', userId], (old: Course[] = []) => old.filter(c => c.id !== courseId));
      return { previousCourses };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['courses', userId], context?.previousCourses);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', userId] });
    },
  });

  // Bulk add/set courses for Onboarding
  const setCoursesMutation = useMutation({
    mutationFn: async (nextCourses: Course[]) => {
      const removedIds = courses.map((c) => c.id).filter((id) => !nextCourses.some((n) => n.id === id));
      if (removedIds.length > 0) {
        await supabase.from('courses').delete().eq('user_id', userId!).in('id', removedIds);
      }
      if (nextCourses.length > 0) {
        const payload = nextCourses.map((c) => toPayload(normalizeCourse(c as any), userId!));
        await supabase.from('courses').upsert(payload, { onConflict: 'user_id,id' });
      }
    },
    onMutate: async (nextCourses) => {
      await queryClient.cancelQueries({ queryKey: ['courses', userId] });
      const previousCourses = queryClient.getQueryData(['courses', userId]);
      queryClient.setQueryData(['courses', userId], nextCourses.map(c => normalizeCourse(c as any)));
      return { previousCourses };
    },
    onError: (_err, _, context: any) => {
      queryClient.setQueryData(['courses', userId], context?.previousCourses);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['courses', userId] });
    },
  });

  return { 
    courses, 
    isLoading,
    addCourse: addCourseMutation.mutate, 
    removeCourse: removeCourseMutation.mutate,
    setCourses: setCoursesMutation.mutate
  };
}

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Course, ThemeColor } from '../../types';
import { DbCourseRow } from '../db-types';

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

export function useCourses(userId: string | undefined, reportSyncError: (msg: string) => void) {
  const [courses, setCoursesState] = useState<Course[]>([]);

  const hydrateCourses = (data: DbCourseRow[]) => {
    setCoursesState(data.map(normalizeCourse));
  };

  const syncCourses = async (nextCourses: Course[], previousCourses: Course[]) => {
    if (!userId) return;

    const removedIds = previousCourses
      .map((c) => c.id)
      .filter((id) => !nextCourses.some((n) => n.id === id));

    if (removedIds.length > 0) {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('user_id', userId)
        .in('id', removedIds);
      if (error) reportSyncError(`Failed to delete removed courses: ${error.message}`);
    }

    if (nextCourses.length > 0) {
      const payload = nextCourses.map((c) => toPayload(c, userId));
      const { error } = await supabase.from('courses').upsert(payload, { onConflict: 'user_id,id' });
      if (error) reportSyncError(`Failed to sync courses: ${error.message}`);
    }
  };

  const setCourses = (nextCourses: Course[]) => {
    const normalized = nextCourses.map(normalizeCourse);
    let snapshotPrev: Course[] = [];
    setCoursesState((prev) => {
      snapshotPrev = prev;
      return normalized;
    });
    void syncCourses(normalized, snapshotPrev);
  };

  const addCourse = (course: Course) => {
    const normalized = normalizeCourse(course as unknown as DbCourseRow);
    setCoursesState((prev) => [...prev, normalized]);

    if (!userId) return;

    void supabase
      .from('courses')
      .upsert(toPayload(normalized, userId), { onConflict: 'user_id,id' })
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to add course: ${error.message}`);
          setCoursesState((prev) => prev.filter((c) => c.id !== normalized.id));
        }
      });
  };

  const removeCourse = (courseId: string) => {
    let removedCourse: Course | undefined;
    setCoursesState((prev) => {
      removedCourse = prev.find((c) => c.id === courseId);
      return prev.filter((c) => c.id !== courseId);
    });

    if (!userId) return;

    void supabase
      .from('courses')
      .delete()
      .eq('user_id', userId)
      .eq('id', courseId)
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to remove course: ${error.message}`);
          if (removedCourse) setCoursesState((prev) => [...prev, removedCourse!]);
        }
      });
  };

  const reset = () => setCoursesState([]);

  return { courses, setCourses, addCourse, removeCourse, hydrateCourses, reset };
}

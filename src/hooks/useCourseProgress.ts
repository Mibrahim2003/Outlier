import { useMemo } from 'react';
import { Course } from '../types';
import { useDeliverables } from '../domain/deliverables/useDeliverables';
import { useProfile } from '../domain/profile/useProfile';
import { calculateCourseStatus } from '../utils/gpaEngine';

export interface CourseProgressEntry {
  /** Share (0–100) of the course's grade weight that has been graded so far. */
  progress: number;
  /** Letter grade projected from the graded weight, or 'N/A' when nothing is graded. */
  estimatedGrade: string;
}

/**
 * Maps each course id to its live grade status. Replaces the legacy
 * `course.gradeProgress` / `course.grade` fields, which were created at
 * onboarding and never updated.
 */
export function useCourseProgress(courses: Course[]): Map<string, CourseProgressEntry> {
  const { deliverables } = useDeliverables();
  const { userProfile } = useProfile();

  return useMemo(() => {
    const map = new Map<string, CourseProgressEntry>();
    for (const course of courses) {
      const status = calculateCourseStatus(
        course,
        deliverables.filter((d) => d.courseId === course.id),
        userProfile?.gradingScale,
      );
      map.set(course.id, {
        progress: Math.round(status.coveredWeight),
        estimatedGrade: status.estimatedGrade,
      });
    }
    return map;
  }, [courses, deliverables, userProfile?.gradingScale]);
}

import { useMemo } from 'react';
import { Course } from '../types';
import { useDeliverables } from '../domain/deliverables/useDeliverables';
import { useProfile } from '../domain/profile/useProfile';
import { calculateCourseStatus } from '../utils/gpaEngine';

/**
 * Maps each course id to its "grade progress" — the share (0–100) of the course's
 * grade weight that has actually been graded so far. Replaces the legacy
 * `course.gradeProgress` field, which was created as 0 and never updated.
 */
export function useCourseProgress(courses: Course[]): Map<string, number> {
  const { deliverables } = useDeliverables();
  const { userProfile } = useProfile();

  return useMemo(() => {
    const map = new Map<string, number>();
    for (const course of courses) {
      const status = calculateCourseStatus(
        course,
        deliverables.filter((d) => d.courseId === course.id),
        userProfile?.gradingScale,
      );
      map.set(course.id, Math.round(status.coveredWeight));
    }
    return map;
  }, [courses, deliverables, userProfile?.gradingScale]);
}

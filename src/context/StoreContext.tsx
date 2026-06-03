import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Course, Deadline, UserProfile, OnboardingState, AcademicCalendarData } from '../types';

interface StoreContextType {
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile | null) => void;
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  addCourse: (course: Course) => void;
  removeCourse: (courseId: string) => void;
  deadlines: Deadline[];
  setDeadlines: (deadlines: Deadline[]) => void;
  addDeadline: (deadline: Deadline) => void;
  onboardingState: OnboardingState;
  commitLoadout: () => void;
  resetLoadoutCommit: () => void;
  academicCalendar: AcademicCalendarData | null;
  setAcademicCalendar: (calendar: AcademicCalendarData | null) => void;
  isHydrating: boolean;
  syncError: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  loadoutCommitted: false,
  version: 1,
};

const normalizeCourse = (course: any): Course => {
  const legacyColor = typeof course?.color === 'string' ? course.color : '';

  let impactLevel: Course['impactLevel'] = course?.impactLevel;
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
    gradeProgress: Number(course?.gradeProgress ?? 0),
    impactLevel,
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

const mapOnboardingRow = (row: any): OnboardingState => ({
  loadoutCommitted: Boolean(row?.loadout_committed),
  committedAt: row?.committed_at ?? undefined,
  version: Number(row?.version ?? 1),
});

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [courses, setCoursesState] = useState<Course[]>([]);
  const [deadlines, setDeadlinesState] = useState<Deadline[]>([]);
  const [onboardingState, setOnboardingState] = useState<OnboardingState>(DEFAULT_ONBOARDING_STATE);
  const [academicCalendar, setAcademicCalendarState] = useState<AcademicCalendarData | null>(() => {
    try {
      const stored = localStorage.getItem('academic_calendar');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [isHydrating, setIsHydrating] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reportSyncError = (message: string) => {
    setSyncError(message);
    console.warn(message);
    // Auto-dismiss after 6s so transient failures don't linger forever
    if (syncErrorTimer.current) clearTimeout(syncErrorTimer.current);
    syncErrorTimer.current = setTimeout(() => setSyncError(null), 6000);
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setUserProfileState(null);
      setCoursesState([]);
      setDeadlinesState([]);
      setOnboardingState(DEFAULT_ONBOARDING_STATE);
      setSyncError(null);
      setIsHydrating(false);
      return;
    }

    // Capture the user ID at effect-start so we can detect stale responses
    // from a previous auth session if the user logs out/in rapidly.
    const targetUserId = user.id;
    let cancelled = false;

    const hydrateStore = async () => {
      setIsHydrating(true);
      setSyncError(null);

      try {
        const [profileRes, coursesRes, deadlinesRes, onboardingRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', targetUserId).maybeSingle(),
          supabase.from('courses').select('*').eq('user_id', targetUserId),
          supabase.from('deadlines').select('*').eq('user_id', targetUserId),
          supabase.from('onboarding_states').select('*').eq('user_id', targetUserId).maybeSingle(),
        ]);

        // Guard: if the user changed while we were fetching, discard results.
        if (cancelled) return;

        if (profileRes.error && profileRes.error.code !== 'PGRST116') {
          reportSyncError(`Failed to load profile from Supabase: ${profileRes.error.message}`);
        }
        if (coursesRes.error) {
          reportSyncError(`Failed to load courses from Supabase: ${coursesRes.error.message}`);
        }
        if (deadlinesRes.error) {
          reportSyncError(`Failed to load deadlines from Supabase: ${deadlinesRes.error.message}`);
        }
        if (onboardingRes.error && onboardingRes.error.code !== 'PGRST116') {
          reportSyncError(`Failed to load onboarding state from Supabase: ${onboardingRes.error.message}`);
        }

        setUserProfileState(
          profileRes.data
            ? {
                name: profileRes.data.name,
                degree: profileRes.data.degree,
                universityName: profileRes.data.university_name,
                graduationYear: String(profileRes.data.graduation_year),
                currentCgpa: Number(profileRes.data.current_cgpa),
                targetGpa: Number(profileRes.data.target_gpa),
                semester: profileRes.data.semester,
                courseCount: Number(profileRes.data.course_count ?? 0),
              }
            : null,
        );

        setCoursesState((coursesRes.data ?? []).map(normalizeCourse));
        setDeadlinesState(
          (deadlinesRes.data ?? []).map((row: any) => ({
            id: String(row.id),
            title: row.title,
            course: row.course,
            topic: row.topic,
            dueDate: row.due_date,
            priority: row.priority,
          })),
        );
        setOnboardingState(onboardingRes.data ? mapOnboardingRow(onboardingRes.data) : DEFAULT_ONBOARDING_STATE);
      } catch (err) {
        if (!cancelled) {
          reportSyncError(`Failed to connect to Supabase: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };

    void hydrateStore();

    // Cleanup: if the effect re-runs (user changed), mark this run as stale.
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  const setUserProfile = (profile: UserProfile | null) => {
    setUserProfileState(profile);

    if (!user || !profile) return;

    void supabase
      .from('profiles')
      .upsert(
        {
          user_id: user.id,
          name: profile.name,
          degree: profile.degree,
          university_name: profile.universityName,
          graduation_year: profile.graduationYear,
          current_cgpa: profile.currentCgpa,
          target_gpa: profile.targetGpa,
          semester: profile.semester,
          course_count: profile.courseCount,
        },
        { onConflict: 'user_id' },
      )
      .then(({ error }) => {
        if (error) reportSyncError(`Failed to save profile: ${error.message}`);
      });
  };

  const syncCourses = async (nextCourses: Course[], previousCourses: Course[]) => {
    if (!user) return;

    const removedIds = previousCourses
      .map((course) => course.id)
      .filter((id) => !nextCourses.some((next) => next.id === id));

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('user_id', user.id)
        .in('id', removedIds);

      if (deleteError) {
        reportSyncError(`Failed to delete removed courses: ${deleteError.message}`);
      }
    }

    if (nextCourses.length > 0) {
      const payload = nextCourses.map((course) => ({
        id: course.id,
        user_id: user.id,
        code: course.code,
        name: course.name,
        credits: course.credits,
        grade_progress: course.gradeProgress,
        impact_level: course.impactLevel,
        grade: course.grade,
        weightage: course.weightage,
      }));

      const { error: upsertError } = await supabase.from('courses').upsert(payload, { onConflict: 'user_id,id' });
      if (upsertError) {
        reportSyncError(`Failed to sync courses: ${upsertError.message}`);
      }
    }
  };

  const setCourses = (nextCourses: Course[]) => {
    const normalized = nextCourses.map(normalizeCourse);
    // Capture previous from the functional updater to avoid stale closure race
    let snapshotPrev: Course[] = [];
    setCoursesState((prev) => {
      snapshotPrev = prev;
      return normalized;
    });

    void syncCourses(normalized, snapshotPrev);
  };

  const addCourse = (course: Course) => {
    const normalized = normalizeCourse(course);
    setCoursesState((prev) => [...prev, normalized]);

    if (!user) return;

    void supabase
      .from('courses')
      .upsert(
        {
          id: normalized.id,
          user_id: user.id,
          code: normalized.code,
          name: normalized.name,
          credits: normalized.credits,
          grade_progress: normalized.gradeProgress,
          impact_level: normalized.impactLevel,
          grade: normalized.grade,
          weightage: normalized.weightage,
        },
        { onConflict: 'user_id,id' },
      )
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to add course: ${error.message}`);
          setCoursesState((prev) => prev.filter((c) => c.id !== normalized.id));
        }
      });
  };

  const removeCourse = (courseId: string) => {
    // Capture the specific course for atomic rollback instead of clobbering
    // the whole array snapshot (which could undo concurrent edits).
    let removedCourse: Course | undefined;
    setCoursesState((prev) => {
      removedCourse = prev.find((c) => c.id === courseId);
      return prev.filter((c) => c.id !== courseId);
    });

    if (!user) return;

    void supabase
      .from('courses')
      .delete()
      .eq('user_id', user.id)
      .eq('id', courseId)
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to remove course: ${error.message}`);
          // Atomic rollback: re-insert only the removed course
          if (removedCourse) {
            setCoursesState((prev) => [...prev, removedCourse!]);
          }
        }
      });
  };

  const syncDeadlines = async (nextDeadlines: Deadline[], previousDeadlines: Deadline[]) => {
    if (!user) return;

    const removedIds = previousDeadlines
      .map((deadline) => deadline.id)
      .filter((id) => !nextDeadlines.some((next) => next.id === id));

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('deadlines')
        .delete()
        .eq('user_id', user.id)
        .in('id', removedIds);

      if (deleteError) {
        reportSyncError(`Failed to delete removed deadlines: ${deleteError.message}`);
      }
    }

    if (nextDeadlines.length > 0) {
      const payload = nextDeadlines.map((deadline) => ({
        id: deadline.id,
        user_id: user.id,
        title: deadline.title,
        course: deadline.course,
        topic: deadline.topic,
        due_date: deadline.dueDate,
        priority: deadline.priority,
      }));

      const { error: upsertError } = await supabase.from('deadlines').upsert(payload, { onConflict: 'user_id,id' });
      if (upsertError) {
        reportSyncError(`Failed to sync deadlines: ${upsertError.message}`);
      }
    }
  };

  const setDeadlines = (nextDeadlines: Deadline[]) => {
    // Capture previous from functional updater to avoid stale closure race
    let snapshotPrev: Deadline[] = [];
    setDeadlinesState((prev) => {
      snapshotPrev = prev;
      return nextDeadlines;
    });

    void syncDeadlines(nextDeadlines, snapshotPrev);
  };

  const addDeadline = (deadline: Deadline) => {
    setDeadlines([...deadlines, deadline]);
  };

  const commitLoadout = () => {
    const next = {
      ...onboardingState,
      loadoutCommitted: true,
      committedAt: new Date().toISOString(),
    };
    setOnboardingState(next);

    if (!user) return;

    void supabase
      .from('onboarding_states')
      .upsert(
        {
          user_id: user.id,
          loadout_committed: true,
          committed_at: next.committedAt,
          version: next.version,
        },
        { onConflict: 'user_id' },
      )
      .then(({ error }) => {
        if (error) reportSyncError(`Failed to commit onboarding loadout: ${error.message}`);
      });
  };

  const resetLoadoutCommit = () => {
    const next = {
      ...onboardingState,
      loadoutCommitted: false,
      committedAt: undefined,
    };
    setOnboardingState(next);

    if (!user) return;

    void supabase
      .from('onboarding_states')
      .upsert(
        {
          user_id: user.id,
          loadout_committed: false,
          committed_at: null,
          version: next.version,
        },
        { onConflict: 'user_id' },
      )
      .then(({ error }) => {
        if (error) reportSyncError(`Failed to reset onboarding loadout: ${error.message}`);
      });
  };

  const setAcademicCalendar = (calendar: AcademicCalendarData | null) => {
    setAcademicCalendarState(calendar);
    try {
      if (calendar) {
        localStorage.setItem('academic_calendar', JSON.stringify(calendar));
      } else {
        localStorage.removeItem('academic_calendar');
      }
    } catch (e) {
      console.warn('Failed to persist academic calendar to localStorage', e);
    }
  };

  return (
    <StoreContext.Provider
      value={{
        userProfile,
        setUserProfile,
        courses,
        setCourses,
        addCourse,
        removeCourse,
        deadlines,
        setDeadlines,
        addDeadline,
        onboardingState,
        commitLoadout,
        resetLoadoutCommit,
        academicCalendar,
        setAcademicCalendar,
        isHydrating,
        syncError,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

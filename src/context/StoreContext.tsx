import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Course, Deadline, Todo, UserProfile, OnboardingState, AcademicCalendarData, CourseDeliverable } from '../types';

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
  todos: Todo[];
  addTodo: (todo: Todo) => void;
  toggleTodo: (id: string) => void;
  removeTodo: (id: string) => void;
  clearCompletedTodos: () => void;
  deliverables: CourseDeliverable[];
  setDeliverables: (deliverables: CourseDeliverable[]) => void;
  addDeliverable: (deliverable: CourseDeliverable) => void;
  updateDeliverable: (deliverable: CourseDeliverable) => void;
  removeDeliverable: (id: string) => void;
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
    themeColor: course?.themeColor || course?.theme_color || 'yellow',
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
  const [todos, setTodosState] = useState<Todo[]>([]);
  const [deliverables, setDeliverablesState] = useState<CourseDeliverable[]>([]);
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
      setTodosState([]);
      setDeliverablesState([]);
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
        const [profileRes, coursesRes, deadlinesRes, todosRes, onboardingRes, deliverablesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('user_id', targetUserId).maybeSingle(),
          supabase.from('courses').select('*').eq('user_id', targetUserId),
          supabase.from('deadlines').select('*').eq('user_id', targetUserId),
          supabase.from('todos').select('*').eq('user_id', targetUserId),
          supabase.from('onboarding_states').select('*').eq('user_id', targetUserId).maybeSingle(),
          supabase.from('course_deliverables').select('*').eq('user_id', targetUserId),
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
        if (todosRes.error) {
          reportSyncError(`Failed to load todos from Supabase: ${todosRes.error.message}`);
        }
        if (deliverablesRes.error) {
          reportSyncError(`Failed to load deliverables from Supabase: ${deliverablesRes.error.message}`);
        }
        if (onboardingRes.error && onboardingRes.error.code !== 'PGRST116') {
          reportSyncError(`Failed to load onboarding state from Supabase: ${onboardingRes.error.message}`);
        }

        setUserProfileState(
          profileRes.data
            ? {
                name: profileRes.data.name,
                registrationNumber: profileRes.data.registration_number,
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
        setTodosState(
          (todosRes.data ?? []).map((row: any) => ({
            id: String(row.id),
            text: row.text,
            completed: Boolean(row.completed),
            dueDate: row.due_date,
            createdAt: row.created_at,
            completedAt: row.completed_at ?? undefined,
            course: row.course ?? undefined,
          })),
        );
        setDeliverablesState(
          (deliverablesRes.data ?? []).map((row: any) => ({
            id: String(row.id),
            courseId: row.course_id,
            type: row.type,
            title: row.title,
            date: row.date,
            score: row.score ?? undefined,
            status: row.status,
            metadata: row.metadata,
          }))
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
          registration_number: profile.registrationNumber || '',
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
        theme_color: course.themeColor,
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
          theme_color: normalized.themeColor,
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

  // ─── Deliverables CRUD ────────────────────────────────────────────

  const syncDeliverables = async (nextDeliverables: CourseDeliverable[], previousDeliverables: CourseDeliverable[]) => {
    if (!user) return;

    const removedIds = previousDeliverables
      .map((d) => d.id)
      .filter((id) => !nextDeliverables.some((next) => next.id === id));

    if (removedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('course_deliverables')
        .delete()
        .eq('user_id', user.id)
        .in('id', removedIds);

      if (deleteError) reportSyncError(`Failed to delete removed deliverables: ${deleteError.message}`);
    }

    if (nextDeliverables.length > 0) {
      const payload = nextDeliverables.map((d) => ({
        id: d.id,
        user_id: user.id,
        course_id: d.courseId,
        type: d.type,
        title: d.title,
        date: d.date,
        score: d.score ?? null,
        status: d.status,
        metadata: d.metadata ?? {},
      }));

      const { error: upsertError } = await supabase.from('course_deliverables').upsert(payload, { onConflict: 'user_id,id' });
      if (upsertError) reportSyncError(`Failed to sync deliverables: ${upsertError.message}`);
    }
  };

  const setDeliverables = (nextDeliverables: CourseDeliverable[]) => {
    let snapshotPrev: CourseDeliverable[] = [];
    setDeliverablesState((prev) => {
      snapshotPrev = prev;
      return nextDeliverables;
    });
    void syncDeliverables(nextDeliverables, snapshotPrev);
  };

  const addDeliverable = (deliverable: CourseDeliverable) => {
    setDeliverablesState((prev) => [...prev, deliverable]);

    if (!user) return;

    void supabase
      .from('course_deliverables')
      .upsert(
        {
          id: deliverable.id,
          user_id: user.id,
          course_id: deliverable.courseId,
          type: deliverable.type,
          title: deliverable.title,
          date: deliverable.date,
          score: deliverable.score ?? null,
          status: deliverable.status,
          metadata: deliverable.metadata ?? {},
        },
        { onConflict: 'user_id,id' },
      )
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to add deliverable: ${error.message}`);
          setDeliverablesState((prev) => prev.filter((d) => d.id !== deliverable.id));
        }
      });
  };

  const updateDeliverable = (deliverable: CourseDeliverable) => {
    setDeliverablesState((prev) => prev.map(d => d.id === deliverable.id ? deliverable : d));

    if (!user) return;

    void supabase
      .from('course_deliverables')
      .upsert(
        {
          id: deliverable.id,
          user_id: user.id,
          course_id: deliverable.courseId,
          type: deliverable.type,
          title: deliverable.title,
          date: deliverable.date,
          score: deliverable.score ?? null,
          status: deliverable.status,
          metadata: deliverable.metadata ?? {},
        },
        { onConflict: 'user_id,id' },
      )
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to update deliverable: ${error.message}`);
        }
      });
  };

  const removeDeliverable = (id: string) => {
    let removedItem: CourseDeliverable | undefined;
    setDeliverablesState((prev) => {
      removedItem = prev.find((d) => d.id === id);
      return prev.filter((d) => d.id !== id);
    });

    if (!user) return;

    void supabase
      .from('course_deliverables')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to remove deliverable: ${error.message}`);
          if (removedItem) {
            setDeliverablesState((prev) => [...prev, removedItem!]);
          }
        }
      });
  };

  // ─── Todo CRUD ────────────────────────────────────────────

  const addTodo = (todo: Todo) => {
    setTodosState((prev) => [...prev, todo]);

    if (!user) return;

    void supabase
      .from('todos')
      .upsert(
        {
          id: todo.id,
          user_id: user.id,
          text: todo.text,
          completed: todo.completed,
          due_date: todo.dueDate,
          course: todo.course ?? null,
          created_at: todo.createdAt,
          completed_at: todo.completedAt ?? null,
        },
        { onConflict: 'user_id,id' },
      )
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to add todo: ${error.message}`);
          setTodosState((prev) => prev.filter((t) => t.id !== todo.id));
        }
      });
  };

  const toggleTodo = (id: string) => {
    let updatedTodo: Todo | undefined;
    setTodosState((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          updatedTodo = {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? new Date().toISOString() : undefined,
          };
          return updatedTodo;
        }
        return t;
      }),
    );

    if (!user || !updatedTodo) return;

    void supabase
      .from('todos')
      .update({
        completed: updatedTodo.completed,
        completed_at: updatedTodo.completedAt ?? null,
      })
      .eq('user_id', user.id)
      .eq('id', id)
      .then(({ error }) => {
        if (error) reportSyncError(`Failed to toggle todo: ${error.message}`);
      });
  };

  const removeTodo = (id: string) => {
    let removedItem: Todo | undefined;
    setTodosState((prev) => {
      removedItem = prev.find((t) => t.id === id);
      return prev.filter((t) => t.id !== id);
    });

    if (!user) return;

    void supabase
      .from('todos')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          reportSyncError(`Failed to remove todo: ${error.message}`);
          if (removedItem) {
            setTodosState((prev) => [...prev, removedItem!]);
          }
        }
      });
  };

  const clearCompletedTodos = () => {
    const completedIds = todos.filter((t) => t.completed).map((t) => t.id);
    if (completedIds.length === 0) return;

    setTodosState((prev) => prev.filter((t) => !t.completed));

    if (!user) return;

    void supabase
      .from('todos')
      .delete()
      .eq('user_id', user.id)
      .in('id', completedIds)
      .then(({ error }) => {
        if (error) reportSyncError(`Failed to clear completed todos: ${error.message}`);
      });
  };

  // ─── Midnight Auto-Clear for Completed Todos ─────────────
  useEffect(() => {
    const checkMidnightClear = () => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      setTodosState((prev) => {
        const toRemove = prev.filter(
          (t) => t.completed && t.completedAt && t.completedAt.split('T')[0] < todayStr,
        );
        if (toRemove.length === 0) return prev;

        // Also delete from Supabase
        if (user) {
          void supabase
            .from('todos')
            .delete()
            .eq('user_id', user.id)
            .in('id', toRemove.map((t) => t.id))
            .then(({ error }) => {
              if (error) console.warn('Midnight auto-clear failed:', error.message);
            });
        }

        return prev.filter((t) => !toRemove.some((r) => r.id === t.id));
      });
    };

    // Check every 60 seconds
    const interval = setInterval(checkMidnightClear, 60_000);
    // Also run on mount
    checkMidnightClear();

    return () => clearInterval(interval);
  }, [user?.id]);

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
        todos,
        addTodo,
        toggleTodo,
        removeTodo,
        clearCompletedTodos,
        deliverables,
        setDeliverables,
        addDeliverable,
        updateDeliverable,
        removeDeliverable,
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

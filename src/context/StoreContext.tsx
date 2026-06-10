import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Course, Deadline, Todo, UserProfile, OnboardingState, AcademicCalendarData, CourseDeliverable } from '../types';

// Domain hooks
import { useProfile } from '../domain/profile/useProfile';
import { useCourses } from '../domain/courses/useCourses';
import { useDeadlines } from '../domain/deadlines/useDeadlines';
import { useTodos } from '../domain/todos/useTodos';
import { useDeliverables } from '../domain/deliverables/useDeliverables';
import { useOnboarding } from '../domain/onboarding/useOnboarding';
import { useCalendar } from '../domain/calendar/useCalendar';

// DB row types for hydration casting
import type { DbCourseRow, DbDeadlineRow, DbTodoRow, DbDeliverableRow, DbOnboardingRow, DbProfileRow } from '../domain/db-types';

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

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  const [isHydrating, setIsHydrating] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reportSyncError = (message: string) => {
    setSyncError(message);
    console.warn(message);
    if (syncErrorTimer.current) clearTimeout(syncErrorTimer.current);
    syncErrorTimer.current = setTimeout(() => setSyncError(null), 6000);
  };

  const userId = user?.id;

  // ─── Compose domain hooks ──────────────────────────────────────────
  const profile = useProfile(userId, reportSyncError);
  const courseDomain = useCourses(userId, reportSyncError);
  const deadlineDomain = useDeadlines(userId, reportSyncError);
  const todoDomain = useTodos(userId, reportSyncError);
  const deliverableDomain = useDeliverables(userId, reportSyncError);
  const onboardingDomain = useOnboarding(userId, reportSyncError);
  const calendarDomain = useCalendar();

  // ─── Hydration ─────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      profile.reset();
      courseDomain.reset();
      deadlineDomain.reset();
      todoDomain.reset();
      deliverableDomain.reset();
      onboardingDomain.reset();
      setSyncError(null);
      setIsHydrating(false);
      return;
    }

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

        if (cancelled) return;

        if (profileRes.error && profileRes.error.code !== 'PGRST116') {
          reportSyncError(`Failed to load profile from Supabase: ${profileRes.error.message}`);
        }
        if (coursesRes.error) reportSyncError(`Failed to load courses from Supabase: ${coursesRes.error.message}`);
        if (deadlinesRes.error) reportSyncError(`Failed to load deadlines from Supabase: ${deadlinesRes.error.message}`);
        if (todosRes.error) reportSyncError(`Failed to load todos from Supabase: ${todosRes.error.message}`);
        if (deliverablesRes.error) reportSyncError(`Failed to load deliverables from Supabase: ${deliverablesRes.error.message}`);
        if (onboardingRes.error && onboardingRes.error.code !== 'PGRST116') {
          reportSyncError(`Failed to load onboarding state from Supabase: ${onboardingRes.error.message}`);
        }

        // Hydrate each domain with typed data
        profile.hydrateProfile(profileRes.data as DbProfileRow | null);
        courseDomain.hydrateCourses((coursesRes.data ?? []) as DbCourseRow[]);
        deadlineDomain.hydrateDeadlines((deadlinesRes.data ?? []) as DbDeadlineRow[]);
        todoDomain.hydrateTodos((todosRes.data ?? []) as DbTodoRow[]);
        deliverableDomain.hydrateDeliverables((deliverablesRes.data ?? []) as DbDeliverableRow[]);
        onboardingDomain.hydrateOnboarding(onboardingRes.data as DbOnboardingRow | null);
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

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading]);

  // ─── Compose the store value ───────────────────────────────────────
  return (
    <StoreContext.Provider
      value={{
        userProfile: profile.userProfile,
        setUserProfile: profile.setUserProfile,
        courses: courseDomain.courses,
        setCourses: courseDomain.setCourses,
        addCourse: courseDomain.addCourse,
        removeCourse: courseDomain.removeCourse,
        deadlines: deadlineDomain.deadlines,
        setDeadlines: deadlineDomain.setDeadlines,
        addDeadline: deadlineDomain.addDeadline,
        todos: todoDomain.todos,
        addTodo: todoDomain.addTodo,
        toggleTodo: todoDomain.toggleTodo,
        removeTodo: todoDomain.removeTodo,
        clearCompletedTodos: todoDomain.clearCompletedTodos,
        deliverables: deliverableDomain.deliverables,
        setDeliverables: deliverableDomain.setDeliverables,
        addDeliverable: deliverableDomain.addDeliverable,
        updateDeliverable: deliverableDomain.updateDeliverable,
        removeDeliverable: deliverableDomain.removeDeliverable,
        onboardingState: onboardingDomain.onboardingState,
        commitLoadout: onboardingDomain.commitLoadout,
        resetLoadoutCommit: onboardingDomain.resetLoadoutCommit,
        academicCalendar: calendarDomain.academicCalendar,
        setAcademicCalendar: calendarDomain.setAcademicCalendar,
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

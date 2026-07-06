import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, FileText, CalendarClock, ListChecks } from 'lucide-react';
import { useCourses } from '../domain/courses/useCourses';
import { useDeliverables } from '../domain/deliverables/useDeliverables';
import { useDeadlines } from '../domain/deadlines/useDeadlines';
import { useTodos } from '../domain/todos/useTodos';
import { cardVariants, ZeeMascot } from './ui';

interface SearchResult {
  key: string;
  kind: 'course' | 'deliverable' | 'deadline' | 'task';
  label: string;
  sublabel: string;
  to: string;
}

const KIND_ICONS: Record<SearchResult['kind'], React.ElementType> = {
  course: BookOpen,
  deliverable: FileText,
  deadline: CalendarClock,
  task: ListChecks,
};

const DELIVERABLE_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  assignment: 'Assignment',
  midterm: 'Midterm',
  final: 'Final',
  project: 'Project',
};

const MAX_RESULTS = 8;

/**
 * Client-side search over everything already in the TanStack Query cache:
 * courses, deliverables, deadlines, and tasks. Selecting a result navigates
 * to the owning course page (courses/deliverables) or the calendar
 * (deadlines/tasks).
 */
export const GlobalSearch = () => {
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { deliverables } = useDeliverables();
  const { deadlines } = useDeadlines();
  const { todos } = useTodos();

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // `/` focuses the search from anywhere that isn't already a text field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const matches = (...fields: (string | undefined)[]) =>
      fields.some((f) => f?.toLowerCase().includes(q));

    const courseName = (courseId: string) =>
      courses.find((c) => c.id === courseId)?.name ?? 'Unknown course';

    const found: SearchResult[] = [];

    for (const course of courses) {
      if (!matches(course.name, course.code)) continue;
      found.push({
        key: `course-${course.id}`,
        kind: 'course',
        label: course.name,
        sublabel: `Course · ${course.code}`,
        to: `/courses/${course.id}`,
      });
    }
    for (const d of deliverables) {
      if (!matches(d.title, d.metadata?.topics)) continue;
      found.push({
        key: `deliverable-${d.id}`,
        kind: 'deliverable',
        label: d.title,
        sublabel: `${DELIVERABLE_LABELS[d.type] ?? 'Deliverable'} · ${courseName(d.courseId)}`,
        to: `/courses/${d.courseId}`,
      });
    }
    for (const deadline of deadlines) {
      if (!matches(deadline.title, deadline.topic, deadline.course)) continue;
      found.push({
        key: `deadline-${deadline.id}`,
        kind: 'deadline',
        label: deadline.title,
        sublabel: `Deadline · due ${deadline.dueDate}`,
        to: '/calendar',
      });
    }
    for (const todo of todos) {
      if (!matches(todo.text, todo.course)) continue;
      found.push({
        key: `task-${todo.id}`,
        kind: 'task',
        label: todo.text,
        sublabel: `Task · ${todo.dueDate}`,
        to: '/calendar',
      });
    }

    return found.slice(0, MAX_RESULTS);
  }, [query, courses, deliverables, deadlines, todos]);

  const showDropdown = isOpen && query.trim().length >= 2;
  const clampedActive = Math.min(activeIndex, Math.max(results.length - 1, 0));

  const selectResult = (result: SearchResult) => {
    setQuery('');
    setIsOpen(false);
    setActiveIndex(0);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    navigate(result.to);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!showDropdown || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectResult(results[clampedActive]);
    }
  };

  return (
    <div className="relative hidden md:block w-96">
      <div className={`flex items-center px-4 py-2 w-full ${cardVariants({ shadow: 'sm' })}`}>
        <Search size={18} className="mr-2 text-ink" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={showDropdown}
          aria-label="Search courses and tasks"
          className="bg-transparent border-none focus:ring-0 w-full font-medium text-sm outline-none"
          placeholder="Search courses and tasks..."
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setIsOpen(false)}
          onKeyDown={handleKeyDown}
        />
        <kbd className="text-[10px] font-black border-2 border-ink/30 px-1.5 py-0.5 text-ink/40">/</kbd>
      </div>

      {showDropdown && (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-ink shadow-[6px_6px_0px_#1A1A1A] z-50 max-h-96 overflow-y-auto"
          // Keep input focus so onBlur doesn't close the list before the click lands.
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.length === 0 ? (
            <div className="p-4 flex items-center gap-3">
              <ZeeMascot variant="cooked" size={40} className="shrink-0" />
              <p className="text-sm font-bold uppercase tracking-widest text-ink/40">
                No matches for “{query.trim()}”
              </p>
            </div>
          ) : (
            results.map((result, i) => {
              const Icon = KIND_ICONS[result.kind];
              return (
                <button
                  key={result.key}
                  role="option"
                  aria-selected={i === clampedActive}
                  onClick={() => selectResult(result)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full text-left p-3 flex items-center gap-3 border-b-2 border-ink/10 last:border-b-0 transition-colors ${
                    i === clampedActive ? 'bg-primary-container' : 'bg-white'
                  }`}
                >
                  <span className="w-8 h-8 border-2 border-ink bg-background flex items-center justify-center shrink-0">
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black text-sm leading-tight truncate">{result.label}</span>
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-ink/50 truncate">
                      {result.sublabel}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

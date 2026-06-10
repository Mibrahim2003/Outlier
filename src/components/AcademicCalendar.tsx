import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Upload, ChevronLeft, ChevronRight, Loader2, AlertCircle, Flame, Plus, Download, Settings, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useCalendarParser } from '../hooks/useCalendarParser';
import { 
  getCalendarGrid, 
  getSemesterWeekNumber, 
  isBreakDay, 
  isDateInRange, 
  isSameDay, 
  formatDateShort 
} from '../utils/dateUtils';
import { SemesterInfo, Deadline, Todo } from '../types';
import { exportToICS } from '../utils/icsExport';
import { useSearchParams } from 'react-router-dom';

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const AcademicCalendar = () => {
  const { academicCalendar, setAcademicCalendar, deadlines, addDeadline, todos, addTodo, toggleTodo, courses } = useStore();
  const { parseCalendarImage, parsing, parseError } = useCalendarParser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Calendar View State
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);

  // Filters State
  const [showExams, setShowExams] = useState(true);
  const [hideNormalPriority, setHideNormalPriority] = useState(false);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Add Deadline Form State
  const [newDlTitle, setNewDlTitle] = useState('');
  const [newDlCourse, setNewDlCourse] = useState('');
  const [newDlTopic, setNewDlTopic] = useState('');
  const [newDlPriority, setNewDlPriority] = useState<'urgent' | 'moderate' | 'normal'>('moderate');

  // Unified modal: Task vs Deadline mode
  const [eventType, setEventType] = useState<'task' | 'deadline'>('task');

  // Handle ?action=add-task query param from Dashboard navigation
  useEffect(() => {
    const action = searchParams.get('action');
    let timeoutId: ReturnType<typeof setTimeout>;
    if (action === 'add-task' && academicCalendar) {
      timeoutId = setTimeout(() => {
        setSelectedDate(new Date());
        setEventType('task');
        setIsAddModalOpen(true);
        // Clear the param so it doesn't re-trigger
        setSearchParams({}, { replace: true });
      }, 0);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchParams, academicCalendar, setSearchParams]);

  const allSemesters = academicCalendar?.semesters ?? [];

  const findSemesterForDate = (date: Date): SemesterInfo | null => {
    return allSemesters.find(s =>
      isDateInRange(date, new Date(s.startDate), new Date(s.endDate))
    ) || null;
  };

  const activeSemester: SemesterInfo | null = useMemo(() => {
    const semesters = academicCalendar?.semesters ?? [];
    const viewDate = new Date(viewYear, viewMonth, 15);
    const found = semesters.find(s =>
      isDateInRange(viewDate, new Date(s.startDate), new Date(s.endDate))
    );
    return found || semesters[0] || null;
  }, [academicCalendar, viewYear, viewMonth]);

  // Edit Semester Form State
  const [editSemName, setEditSemName] = useState(activeSemester?.name || '');
  const [editSemStart, setEditSemStart] = useState(activeSemester?.startDate || '');
  const [editSemEnd, setEditSemEnd] = useState(activeSemester?.endDate || '');

  const grid = useMemo(() => getCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const weeksRemaining = useMemo(() => {
    if (!activeSemester) return null;
    const end = new Date(activeSemester.endDate);
    const diffMs = end.getTime() - new Date().getTime();
    if (diffMs < 0) return 0;
    return Math.max(0, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }, [activeSemester]);

  const totalWeeks = useMemo(() => {
    if (!activeSemester) return null;
    const start = new Date(activeSemester.startDate);
    const end = new Date(activeSemester.endDate);
    const diffMs = end.getTime() - start.getTime();
    return Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
  }, [activeSemester]);

  const handleFile = async (file: File) => {
    const semesters = await parseCalendarImage(file);
    if (semesters && semesters.length > 0) {
      setAcademicCalendar({
        id: crypto.randomUUID(),
        semesters,
        uploadedAt: new Date().toISOString(),
      });
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(today);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  const getDeadlinesForDate = (date: Date) => {
    return deadlines.filter(d => {
      if (hideNormalPriority && d.priority === 'normal') return false;
      const dd = new Date(d.dueDate);
      return isSameDay(dd, date);
    });
  };

  const getTodosForDate = (date: Date) => {
    return todos.filter(t => {
      const td = new Date(t.dueDate + 'T00:00:00');
      return isSameDay(td, date);
    });
  };

  const getWeekForDate = (date: Date): number | null => {
    const sem = findSemesterForDate(date);
    if (!sem) return null;
    const wk = getSemesterWeekNumber(date, new Date(sem.startDate));
    return wk > 0 ? wk : null;
  };

  // Handlers for forms
  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !newDlTitle) return;

    // ISO string handling, avoiding timezone shift
    const d = new Date(selectedDate);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const dueDateStr = d.toISOString().split('T')[0];

    if (eventType === 'task') {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        text: newDlTitle,
        completed: false,
        dueDate: dueDateStr,
        createdAt: new Date().toISOString(),
        course: newDlCourse || undefined,
      };
      addTodo(newTodo);
    } else {
      if (!newDlCourse) return;
      const newDeadline: Deadline = {
        id: crypto.randomUUID(),
        title: newDlTitle,
        course: newDlCourse,
        topic: newDlTopic,
        dueDate: dueDateStr,
        priority: newDlPriority,
      };
      addDeadline(newDeadline);
    }

    setIsAddModalOpen(false);
    // Reset all form fields
    setNewDlTitle('');
    setNewDlTopic('');
    setNewDlCourse('');
    setNewDlPriority('moderate');
    setEventType('task');
  };

  const handleEditSemester = (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicCalendar || !activeSemester) return;

    const updatedSemesters = academicCalendar.semesters.map(s => {
      if (s.name === activeSemester.name && s.startDate === activeSemester.startDate) {
        return {
          ...s,
          name: editSemName,
          startDate: editSemStart,
          endDate: editSemEnd,
        };
      }
      return s;
    });

    setAcademicCalendar({
      ...academicCalendar,
      semesters: updatedSemesters,
    });
    setIsEditModalOpen(false);
  };

  const openEditModal = () => {
    if (activeSemester) {
      setEditSemName(activeSemester.name);
      setEditSemStart(activeSemester.startDate);
      setEditSemEnd(activeSemester.endDate);
      setIsEditModalOpen(true);
    }
  };

  // ─── Upload State ─────────────────────────────
  if (!academicCalendar) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className={`bg-white border-4 ${dragOver ? 'border-[#FFDE59]' : 'border-[#1A1A1A]'} border-dashed shadow-[8px_8px_0px_#1A1A1A] p-16 max-w-xl w-full text-center space-y-8 transition-all ${dragOver ? 'translate-x-[-3px] translate-y-[-3px] shadow-[10px_10px_0px_#FFDE59]' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="inline-block bg-[#FFDE59] border-4 border-[#1A1A1A] p-5 shadow-[4px_4px_0px_#1A1A1A]">
            <Upload size={56} strokeWidth={3} className="text-[#1A1A1A]" />
          </div>
          <h2 className="text-4xl font-black tracking-[-0.03em] uppercase leading-none">
            Upload Your<br />Academic Calendar
          </h2>
          <p className="text-lg font-bold opacity-60 leading-relaxed max-w-sm mx-auto">
            Drop your university's academic calendar image and we'll extract everything automatically.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="bg-[#FFDE59] border-4 border-[#1A1A1A] px-10 py-5 font-black text-lg uppercase tracking-widest shadow-[6px_6px_0px_#1A1A1A] hover:shadow-[3px_3px_0px_#1A1A1A] hover:translate-x-[3px] hover:translate-y-[3px] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all disabled:opacity-50 flex items-center gap-3 mx-auto"
          >
            {parsing ? (
              <>
                <Loader2 className="animate-spin" size={22} />
                Parsing with AI...
              </>
            ) : (
              <>
                <Upload size={22} strokeWidth={3} />
                Select File
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={onFileSelect}
          />
          <p className="text-[11px] font-black uppercase tracking-[0.15em] opacity-30">
            PNG • JPG • PDF Screenshots • Max 10 MB
          </p>
          {parseError && (
            <div className="bg-[#A8275A] text-white border-4 border-[#1A1A1A] p-4 flex items-center gap-3 font-black text-sm shadow-[4px_4px_0px_#1A1A1A]">
              <AlertCircle size={20} strokeWidth={3} />
              {parseError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Calendar View ────────────────────────────
  return (
    <div className="space-y-8 relative">
      {/* Filters and Actions Top Bar */}
      <div className="bg-white border-4 border-[#1A1A1A] shadow-[4px_4px_0px_#1A1A1A] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={showExams} 
                onChange={(e) => setShowExams(e.target.checked)} 
              />
              <div className={`w-12 h-6 border-3 border-[#1A1A1A] transition-colors ${showExams ? 'bg-[#FFDE59]' : 'bg-[#1A1A1A]/10'}`}></div>
              <div className={`absolute top-0 w-6 h-6 border-3 border-[#1A1A1A] bg-white transition-transform ${showExams ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
            <span className="font-black text-xs uppercase tracking-widest">Show Exams</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={hideNormalPriority} 
                onChange={(e) => setHideNormalPriority(e.target.checked)} 
              />
              <div className={`w-12 h-6 border-3 border-[#1A1A1A] transition-colors ${hideNormalPriority ? 'bg-[#A8275A]' : 'bg-[#1A1A1A]/10'}`}></div>
              <div className={`absolute top-0 w-6 h-6 border-3 border-[#1A1A1A] bg-white transition-transform ${hideNormalPriority ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
            <span className="font-black text-xs uppercase tracking-widest">Hide Normal Priority</span>
          </label>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={openEditModal}
            className="flex items-center gap-2 bg-white border-3 border-[#1A1A1A] px-3 py-1.5 font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Settings size={14} strokeWidth={3} />
            Edit Semester
          </button>
          <button 
            onClick={() => exportToICS(deadlines, academicCalendar)}
            className="flex items-center gap-2 bg-ink text-white border-3 border-[#1A1A1A] px-3 py-1.5 font-black text-[10px] uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Download size={14} strokeWidth={3} />
            Export .ICS
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl md:text-6xl font-black tracking-[-0.04em] uppercase leading-none">
            {activeSemester?.name || monthLabel}
          </h1>
          {activeSemester && (
            <div className="flex items-center gap-3 mt-3">
              <span className="bg-[#1A1A1A] text-white px-3 py-1 font-black text-xs uppercase tracking-[0.1em]">
                {formatDateShort(new Date(activeSemester.startDate))} — {formatDateShort(new Date(activeSemester.endDate))}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {weeksRemaining !== null && totalWeeks !== null && (
            <div className="bg-[#FFDE59] border-4 border-[#1A1A1A] px-4 py-2 shadow-[4px_4px_0px_#1A1A1A]">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] opacity-60">Weeks Left</p>
              <p className="text-2xl font-black tracking-tighter leading-none">{weeksRemaining}<span className="text-sm opacity-40">/{totalWeeks}</span></p>
            </div>
          )}
          <button
            onClick={goToday}
            className="bg-[#FFDE59] border-4 border-[#1A1A1A] px-5 py-3 font-black uppercase text-sm tracking-[0.1em] shadow-[4px_4px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
          >
            Today
          </button>
          <div className="flex">
            <button
              onClick={prevMonth}
              className="bg-white border-4 border-[#1A1A1A] p-3 shadow-[3px_3px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              <ChevronLeft size={20} strokeWidth={3} />
            </button>
            <button
              onClick={nextMonth}
              className="bg-white border-4 border-[#1A1A1A] border-l-0 p-3 shadow-[3px_3px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              <ChevronRight size={20} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calendar Grid */}
        <div className="lg:col-span-8">
          <div className="bg-white border-4 border-[#1A1A1A] shadow-[8px_8px_0px_#1A1A1A] overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b-4 border-[#1A1A1A]">
              <div className="p-3 text-center border-r border-ink/15 bg-[#1A1A1A] text-[#FFDE59]">
                <span className="text-xs font-black uppercase tracking-[0.15em]">WEEK</span>
              </div>
              {DAY_LABELS.map(day => (
                <div key={day} className="p-3 text-center border-r border-ink/15 last:border-r-0 bg-[#FFF6E3]">
                  <span className="text-xs font-black uppercase tracking-[0.1em]">{day}</span>
                </div>
              ))}
            </div>

            {/* Week rows */}
            {grid.map((week, wi) => {
              const firstDateInWeek = week.find(d => d !== null);
              const weekNum = firstDateInWeek ? getWeekForDate(firstDateInWeek) : null;
              const isCurrentWeek = week.some(d => d && isSameDay(d, today));

              return (
                <div key={wi} className={`grid grid-cols-8 border-b border-ink/15 last:border-b-0 ${isCurrentWeek ? 'bg-[#FFDE59]/25' : ''}`}>
                  {/* Week number column */}
                  <div className={`text-center border-r border-ink/15 flex items-center justify-center min-h-[90px] ${
                    weekNum !== null
                      ? isCurrentWeek
                        ? 'bg-[#FFDE59]'
                        : 'bg-[#1A1A1A]/5'
                      : 'bg-[#1A1A1A]/3'
                  }`}>
                    {weekNum !== null ? (
                      <span className={`text-lg font-black ${isCurrentWeek ? 'text-[#1A1A1A]' : 'opacity-50'}`}>
                        {weekNum}
                      </span>
                    ) : (
                      <span className="text-sm font-black opacity-15">—</span>
                    )}
                  </div>

                  {/* Day cells */}
                  {week.map((date, di) => {
                    if (!date) {
                      return <div key={di} className="border-r border-ink/15 last:border-r-0 min-h-[90px] bg-[#F5F0E3] opacity-25"></div>;
                    }

                    const isToday = isSameDay(date, today);
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    const breakName = allSemesters.length > 0
                      ? allSemesters.reduce<string | null>((found, s) => found || isBreakDay(date, s.breaks), null)
                      : null;
                    const isExamDay = showExams && allSemesters.some(s =>
                      s.examPeriod && isDateInRange(date, new Date(s.examPeriod.startDate), new Date(s.examPeriod.endDate))
                    );
                    const dayDeadlines = getDeadlinesForDate(date);
                    const dayTodos = getTodosForDate(date);
                    const isInSemester = findSemesterForDate(date) !== null;

                    return (
                      <div
                        key={di}
                        onClick={() => setSelectedDate(date)}
                        className={`flex flex-col items-center justify-between pb-2 pt-3 border-r border-ink/15 last:border-r-0 min-h-[90px] cursor-pointer transition-all relative group
                          ${!isInSemester && !breakName && !isExamDay ? 'bg-[#F5F0E3]/50' : 'bg-white'}
                          ${isToday ? 'bg-[#FFDE59]/10' : ''}
                          ${isSelected ? '!z-10 shadow-[inset_0_0_0_2px_#1A1A1A]' : ''}
                          ${breakName ? 'bg-ink/5' : ''}
                          ${isExamDay && !breakName ? 'bg-[#A8275A]/5' : ''}
                          hover:bg-[#FFDE59]/20
                        `}
                      >
                        {/* Centered Date Number */}
                        <div className="flex-1 flex items-center justify-center w-full">
                          {isToday ? (
                            <div className="w-9 h-9 rounded-full bg-ink text-[#FFDE59] flex items-center justify-center shadow-[2px_2px_0px_#A8275A] font-luxury font-extrabold text-base">
                              {date.getDate()}
                            </div>
                          ) : (
                            <span className={`font-luxury text-3xl font-extrabold tracking-tight ${
                              isExamDay 
                                ? 'text-[#A8275A]' 
                                : !isInSemester && !breakName && !isExamDay
                                  ? 'text-ink/45'
                                  : 'text-ink'
                            }`}>
                              {date.getDate()}
                            </span>
                          )}
                        </div>

                        {/* Event Indicators Row */}
                        <div className="flex items-center justify-center gap-1 w-full mt-auto min-h-[12px] z-10">
                          {/* Break Dot */}
                          {breakName && (
                            <div 
                              title={`Break: ${breakName}`}
                              className="w-2 h-2 rounded-full bg-ink/25 border border-ink/40"
                            />
                          )}

                          {/* Exam Dot */}
                          {isExamDay && !breakName && (
                            <div 
                              title="Exam Period"
                              className="w-2 h-2 rounded-full bg-[#A8275A] border border-ink animate-pulse"
                            />
                          )}

                          {/* Deadline Squares */}
                          {dayDeadlines.slice(0, 3).map(dl => (
                            <div
                              key={dl.id}
                              title={`[${dl.course}] ${dl.title}`}
                              className={`w-2 h-2 border border-ink ${
                                dl.priority === 'urgent' ? 'bg-[#A8275A]' :
                                dl.priority === 'moderate' ? 'bg-[#FFDE59]' : 'bg-ink'
                              }`}
                            />
                          ))}
                          {dayDeadlines.length > 3 && (
                            <span className="text-[7px] font-bold opacity-60">+{dayDeadlines.length - 3}</span>
                          )}

                          {/* Todo Circles */}
                          {dayTodos.filter(t => !t.completed).slice(0, 3).map(todo => (
                            <div
                              key={todo.id}
                              title={todo.text}
                              className="w-2 h-2 rounded-full border-[1.5px] border-[#1A1A1A] bg-white"
                            />
                          ))}
                          {dayTodos.filter(t => t.completed).length > 0 && dayTodos.filter(t => !t.completed).length < 3 && (
                            dayTodos.filter(t => t.completed).slice(0, 3 - dayTodos.filter(t => !t.completed).length).map(todo => (
                              <div
                                key={todo.id}
                                title={`✓ ${todo.text}`}
                                className="w-2 h-2 rounded-full border-[1.5px] border-ink/30 bg-[#FFDE59]/60"
                              />
                            ))
                          )}
                        </div>
                        
                        {/* Hover Add Button (subtle) */}
                        <div className="absolute inset-0 bg-[#FFDE59]/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                           <Plus size={24} strokeWidth={3} className="text-[#1A1A1A] opacity-50" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day Detail Sidebar */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-white border-4 border-[#1A1A1A] shadow-[8px_8px_0px_#1A1A1A] sticky top-28 flex-1 flex flex-col min-h-[400px]">
            {/* Sidebar Header */}
            <div className="bg-[#1A1A1A] text-white p-6 border-b-4 border-[#1A1A1A]">
              {selectedDate ? (
                <>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFDE59]">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                  </p>
                  <h3 className="text-4xl font-black tracking-[-0.04em] mt-1 leading-none">
                    {formatDateShort(selectedDate)}
                  </h3>
                  {(() => {
                    const wk = getWeekForDate(selectedDate);
                    return wk !== null ? (
                      <span className="inline-block mt-3 bg-[#FFDE59] text-[#1A1A1A] border-2 border-white px-3 py-1 text-xs font-black uppercase tracking-[0.1em] shadow-[3px_3px_0px_rgba(255,255,255,0.3)]">
                        Week {wk}
                      </span>
                    ) : (
                      <span className="inline-block mt-3 bg-white/10 text-white/50 px-3 py-1 text-xs font-black uppercase tracking-[0.1em]">
                        Off-Semester
                      </span>
                    );
                  })()}
                </>
              ) : (
                <p className="text-sm font-bold opacity-60">Select a day to view details</p>
              )}
            </div>

            {/* Sidebar Content */}
            <div className="p-6 space-y-4 bg-[#FFF6E3] flex-1 overflow-y-auto">
              {selectedDate && (() => {
                const dayDeadlines = getDeadlinesForDate(selectedDate);
                const dayTodos = getTodosForDate(selectedDate);
                const breakName = allSemesters.reduce<string | null>((found, s) => found || isBreakDay(selectedDate, s.breaks), null);
                const isExamDay = showExams && allSemesters.some(s =>
                  s.examPeriod && isDateInRange(selectedDate, new Date(s.examPeriod.startDate), new Date(s.examPeriod.endDate))
                );

                const hasAnything = dayDeadlines.length > 0 || dayTodos.length > 0 || breakName || isExamDay;

                if (!hasAnything) {
                  return (
                    <div className="text-center p-6 border-4 border-dashed border-[#1A1A1A] opacity-30 font-black text-sm uppercase tracking-[0.15em]">
                      No events
                    </div>
                  );
                }

                const uncompletedTodos = dayTodos.filter(t => !t.completed);
                const completedTodos = dayTodos.filter(t => t.completed);

                return (
                  <>
                    {breakName && (
                      <div className="bg-white text-ink p-5 border-3 border-ink shadow-[4px_4px_0px_#1A1A1A]">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">🏖 Break</p>
                        <h4 className="text-xl font-black tracking-tight mt-1">{breakName}</h4>
                      </div>
                    )}
                    {isExamDay && (
                      <div className="bg-[#A8275A] text-white p-5 border-4 border-[#1A1A1A] shadow-[5px_5px_0px_#1A1A1A]">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FFDE59]">
                          <Flame className="inline -mt-0.5 mr-1" size={12} />
                          Exam Period
                        </p>
                        <h4 className="text-xl font-black tracking-tight mt-1">Finals</h4>
                      </div>
                    )}

                    {/* Tasks Section */}
                    {dayTodos.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/50 flex items-center gap-2">
                          📋 Tasks ({uncompletedTodos.length}/{dayTodos.length})
                        </p>
                        {uncompletedTodos.map(todo => (
                          <div
                            key={todo.id}
                            className="flex items-center gap-3 p-4 bg-white border-3 border-ink shadow-[3px_3px_0px_#1A1A1A] cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#1A1A1A] transition-all"
                            onClick={() => toggleTodo(todo.id)}
                          >
                            <div className="w-5 h-5 border-3 border-ink flex-shrink-0 flex items-center justify-center bg-white" />
                            <span className="font-bold text-sm flex-1">{todo.text}</span>
                            {todo.course && <span className="text-[9px] font-black uppercase opacity-40">{todo.course}</span>}
                          </div>
                        ))}
                        {completedTodos.map(todo => (
                          <div
                            key={todo.id}
                            className="flex items-center gap-3 p-4 bg-white/50 border-2 border-ink/20 cursor-pointer hover:border-ink/40 transition-all"
                            onClick={() => toggleTodo(todo.id)}
                          >
                            <div className="w-5 h-5 border-3 border-ink/40 flex-shrink-0 flex items-center justify-center bg-[#FFDE59]/60">
                              <span className="text-[10px] font-black">✓</span>
                            </div>
                            <span className="font-bold text-sm flex-1 line-through opacity-40">{todo.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Deadlines Section */}
                    {dayDeadlines.length > 0 && (
                      <div className="space-y-2">
                        {dayTodos.length > 0 && (
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ink/50 mt-2">
                            📅 Deadlines ({dayDeadlines.length})
                          </p>
                        )}
                        {dayDeadlines.map(dl => (
                          <div key={dl.id} className={`p-5 border-3 border-ink border-l-[10px] shadow-[4px_4px_0px_#1A1A1A] bg-white ${
                            dl.priority === 'urgent' ? 'border-l-[#A8275A]' :
                            dl.priority === 'moderate' ? 'border-l-[#FFDE59]' :
                            'border-l-ink'
                          }`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-50">{dl.course}</p>
                            <h4 className="text-lg font-black tracking-tight">{dl.title}</h4>
                            {dl.topic && <p className="text-xs font-bold opacity-50 mt-1">Topic: {dl.topic}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Add Event Button at bottom of sidebar */}
            <div className="p-4 bg-white border-t-4 border-[#1A1A1A]">
              <button
                onClick={() => setIsAddModalOpen(true)}
                disabled={!selectedDate}
                className="w-full bg-[#FFDE59] border-4 border-[#1A1A1A] py-4 font-black uppercase tracking-[0.15em] shadow-[4px_4px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus strokeWidth={3} size={20} />
                Add Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Add Event Modal */}
      {isAddModalOpen && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/80 backdrop-blur-sm">
          <div className="bg-white border-4 border-[#1A1A1A] shadow-[12px_12px_0px_#FFDE59] w-full max-w-md">
            <div className="bg-[#1A1A1A] text-white p-4 flex justify-between items-center border-b-4 border-[#1A1A1A]">
              <h2 className="text-2xl font-black uppercase tracking-widest">New Event</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="hover:text-[#A8275A] transition-colors">
                <X strokeWidth={3} />
              </button>
            </div>
            <form onSubmit={handleAddEvent} className="p-6 space-y-6">
              {/* Task / Deadline Toggle */}
              <div className="flex border-3 border-[#1A1A1A]">
                <button
                  type="button"
                  onClick={() => setEventType('task')}
                  className={`flex-1 py-3 font-black text-xs uppercase tracking-widest transition-all ${
                    eventType === 'task'
                      ? 'bg-[#FFDE59] text-[#1A1A1A] shadow-[inset_0_-3px_0px_#1A1A1A]'
                      : 'bg-white text-ink/40 hover:bg-[#FFF6E3]'
                  }`}
                >
                  📋 Task
                </button>
                <button
                  type="button"
                  onClick={() => setEventType('deadline')}
                  className={`flex-1 py-3 font-black text-xs uppercase tracking-widest border-l-3 border-[#1A1A1A] transition-all ${
                    eventType === 'deadline'
                      ? 'bg-[#A8275A] text-white shadow-[inset_0_-3px_0px_#1A1A1A]'
                      : 'bg-white text-ink/40 hover:bg-[#FFF6E3]'
                  }`}
                >
                  📅 Deadline
                </button>
              </div>

              <div className="bg-[#FFDE59]/30 p-3 border-l-4 border-[#FFDE59]">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-60">Selected Date</p>
                <p className="text-lg font-black">{formatDateShort(selectedDate)}</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.1em]">
                  {eventType === 'task' ? 'What do you need to do?' : 'Title'}
                </label>
                <input 
                  required
                  value={newDlTitle}
                  onChange={e => setNewDlTitle(e.target.value)}
                  className="w-full bg-[#FFF6E3] border-3 border-[#1A1A1A] p-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#FFDE59]/50" 
                  placeholder={eventType === 'task' ? 'e.g. Read Chapter 3' : 'e.g. Midterm Report'}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.1em]">
                  Course {eventType === 'task' && <span className="opacity-40">(optional)</span>}
                </label>
                <select 
                  required={eventType === 'deadline'}
                  value={newDlCourse}
                  onChange={e => setNewDlCourse(e.target.value)}
                  className="w-full bg-[#FFF6E3] border-3 border-[#1A1A1A] p-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#FFDE59]/50"
                >
                  <option value="">{eventType === 'task' ? 'No course (general)' : 'Select a course'}</option>
                  {courses.map(c => <option key={c.id} value={c.code}>{c.code} - {c.name}</option>)}
                  {eventType === 'deadline' && <option value="GENERAL">General</option>}
                </select>
              </div>

              {/* Deadline-only fields */}
              {eventType === 'deadline' && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em]">Topic</label>
                    <input 
                      value={newDlTopic}
                      onChange={e => setNewDlTopic(e.target.value)}
                      className="w-full bg-[#FFF6E3] border-3 border-[#1A1A1A] p-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#FFDE59]/50" 
                      placeholder="e.g. Binary Trees"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.1em]">Priority</label>
                    <div className="flex gap-4">
                      {(['urgent', 'moderate', 'normal'] as const).map(p => (
                        <label key={p} className="flex-1 cursor-pointer">
                          <input 
                            type="radio" 
                            name="priority" 
                            className="sr-only peer"
                            checked={newDlPriority === p}
                            onChange={() => setNewDlPriority(p)}
                          />
                          <div className={`text-center py-2 border-3 border-[#1A1A1A] font-black text-xs uppercase tracking-widest transition-all
                            peer-checked:shadow-[3px_3px_0px_#1A1A1A] peer-checked:translate-x-[-3px] peer-checked:translate-y-[-3px]
                            ${p === 'urgent' ? 'peer-checked:bg-[#A8275A] peer-checked:text-white' : 
                              p === 'moderate' ? 'peer-checked:bg-[#FFDE59]' : 
                              'peer-checked:bg-ink peer-checked:text-white'}
                            bg-white opacity-60 peer-checked:opacity-100
                          `}>
                            {p}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className={`w-full border-4 border-[#1A1A1A] py-4 font-black uppercase tracking-widest shadow-[4px_4px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all ${
                eventType === 'task' ? 'bg-[#FFDE59]' : 'bg-[#A8275A] text-white'
              }`}>
                {eventType === 'task' ? 'Add Task' : 'Commit Deadline'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Semester Modal */}
      {isEditModalOpen && activeSemester && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1A1A]/80 backdrop-blur-sm">
          <div className="bg-white border-4 border-[#1A1A1A] shadow-[12px_12px_0px_#A8275A] w-full max-w-md">
            <div className="bg-[#1A1A1A] text-white p-4 flex justify-between items-center border-b-4 border-[#1A1A1A]">
              <h2 className="text-2xl font-black uppercase tracking-widest">Edit Semester</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="hover:text-[#A8275A] transition-colors">
                <X strokeWidth={3} />
              </button>
            </div>
            <form onSubmit={handleEditSemester} className="p-6 space-y-6">
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.1em]">Semester Name</label>
                <input 
                  required
                  value={editSemName}
                  onChange={e => setEditSemName(e.target.value)}
                  className="w-full bg-[#FFF6E3] border-3 border-[#1A1A1A] p-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#A8275A]/30" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em]">Start Date</label>
                  <input 
                    required
                    type="date"
                    value={editSemStart}
                    onChange={e => setEditSemStart(e.target.value)}
                    className="w-full bg-[#FFF6E3] border-3 border-[#1A1A1A] p-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#A8275A]/30" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.1em]">End Date</label>
                  <input 
                    required
                    type="date"
                    value={editSemEnd}
                    onChange={e => setEditSemEnd(e.target.value)}
                    className="w-full bg-[#FFF6E3] border-3 border-[#1A1A1A] p-3 font-bold focus:outline-none focus:ring-4 focus:ring-[#A8275A]/30" 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-ink text-white border-4 border-[#1A1A1A] py-4 font-black uppercase tracking-widest shadow-[4px_4px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

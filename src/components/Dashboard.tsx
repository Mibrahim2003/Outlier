import { Link, useNavigate } from 'react-router-dom';
import { Stat } from '../types';
import { Sparkles, AlertCircle, Clock, CheckCircle2, Calendar, Loader2, Plus, ListChecks } from 'lucide-react';
import { motion } from 'motion/react';
import { useProfile } from '../domain/profile/useProfile';
import { useCourses } from '../domain/courses/useCourses';
import { useDeadlines } from '../domain/deadlines/useDeadlines';
import { useTodos } from '../domain/todos/useTodos';
import { useAI } from '../hooks/useAI';

import { getThemeBgClass } from '../utils/impactStyles';
import { getGreeting, getDeadlineStatus, isSameDay } from '../utils/dateUtils';
import { ErrorBoundary } from 'react-error-boundary';
import { WidgetErrorFallback } from './ErrorBoundary';
import { useLocalStorage } from '../hooks/useLocalStorage';

export const Dashboard = () => {
  const { userProfile } = useProfile();
  const { courses } = useCourses();
  const { deadlines } = useDeadlines();
  const { todos, toggleTodo } = useTodos();
  const { getDashboardInsight, loading } = useAI();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().split('T')[0];
  const [insight, setInsight] = useLocalStorage<string | null>(`daily-insight-${todayStr}`, null);

  const handleGenerateInsight = async () => {
    const res = await getDashboardInsight(courses, deadlines);
    if (res) {
      setInsight(res);
    }
  };

  const userName = userProfile?.name || 'Student';
  const greeting = getGreeting();


  // Today's todos
  const today = new Date();
  const todayTodos = todos.filter(t => {
    const td = new Date(t.dueDate + 'T00:00:00');
    return isSameDay(td, today);
  });
  const uncompletedTodayTodos = todayTodos.filter(t => !t.completed);
  const completedTodayTodos = todayTodos.filter(t => t.completed);

  const dynamicStats: Stat[] = [
    { label: 'Pending Tasks', value: uncompletedTodayTodos.length.toString(), color: 'bg-secondary' },
    { label: 'Deadlines', value: deadlines.length.toString(), color: 'bg-primary' },
  ];

  return (
    <div className="space-y-12">
      {/* Welcome Banner */}
      <section className="relative bg-primary-container border-3 border-ink p-6 md:p-10 shadow-[6px_6px_0px_#1A1A1A] flex flex-col md:flex-row justify-between items-start md:items-center overflow-hidden">
        <div className="space-y-4 z-10">
          <div className="inline-block bg-secondary text-white px-3 py-1 font-bold border-2 border-ink -rotate-2 mb-2 shadow-[2px_2px_0px_#1A1A1A]">
            <span className="flex items-center gap-2 text-xs uppercase tracking-tighter">
              <Sparkles size={14} fill="currentColor" /> AI Insights
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">{greeting}, {userName}</h1>
          <p className="text-lg md:text-xl font-medium opacity-80">
            You have <span className="underline decoration-4 decoration-secondary">{deadlines.length} upcoming {deadlines.length === 1 ? 'deadline' : 'deadlines'}</span> this week.
          </p>
        </div>
        <div className="hidden lg:block absolute right-[-20px] top-[-20px] bottom-[-20px] w-64 border-l-4 border-ink shadow-[-6px_0px_0px_rgba(0,0,0,0.1)] hazard-stripes skew-x-[-15deg]">
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Left: Main Dashboard Content */}
        <div className="lg:col-span-8 space-y-12">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            
            {dynamicStats.map((stat) => (
              <div key={stat.label} className="bg-white border-3 border-ink shadow-[3px_3px_0px_#1A1A1A] group hover:translate-y-[-2px] transition-all">
                <div className={`h-3 ${stat.color} border-b-4 border-ink`}></div>
                <div className="p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{stat.label}</p>
                  <p className="text-3xl md:text-4xl font-black mt-1">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* My Courses Grid */}
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">My Courses</h2>
              <div className="flex gap-4">
                <button 
                  onClick={() => navigate('/onboarding')}
                  className="text-xs bg-tertiary text-white border-2 border-ink px-3 py-1 font-bold uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </button>
                <Link to="/courses" className="text-sm font-bold underline decoration-4 decoration-primary flex items-center">View All</Link>
              </div>
            </div>
            
            {courses.length === 0 ? (
              <div className="bg-white border-3 border-ink border-dashed p-10 text-center shadow-[3px_3px_0px_#1A1A1A]">
                <p className="text-lg font-bold mb-4 opacity-60 uppercase tracking-widest">No Active Courses</p>
                <button 
                  onClick={() => navigate('/onboarding')}
                  className="bg-primary-container border-3 border-ink px-6 py-3 font-black uppercase tracking-widest shadow-[3px_3px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  Add Your First Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Link key={course.id} to={`/courses/${course.id}`}>
                    <motion.div 
                      whileHover={{ y: -4, x: -4, boxShadow: '10px 10px 0px #1A1A1A' }}
                      className="bg-white border-3 border-ink shadow-[6px_6px_0px_#1A1A1A] flex flex-col cursor-pointer h-full"
                    >
                      <div className={`h-4 ${getThemeBgClass(course.themeColor)} border-b-4 border-ink`}></div>
                      <div className="p-6 flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="bg-ink text-white px-2 py-1 text-[10px] font-black uppercase">{course.code}</span>
                          <span className="text-[10px] font-bold uppercase opacity-60">{course.credits} Credits</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black leading-tight">{course.name}</h3>
                        <div className="pt-4">
                          <div className="flex justify-between text-[10px] font-black mb-1 uppercase tracking-tighter">
                            <span>Grade Progress</span>
                            <span>{course.gradeProgress}%</span>
                          </div>
                          <div className="w-full h-3 bg-background border-2 border-ink">
                            <div className={`h-full ${getThemeBgClass(course.themeColor)}`} style={{ width: `${course.gradeProgress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* AI Recommendations Widget */}
          <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
            <div className="bg-white border-3 border-ink shadow-[6px_6px_0px_#1A1A1A]">
              <div className="bg-secondary p-4 border-b-4 border-ink flex items-center gap-3">
                <Sparkles className="text-white" fill="currentColor" size={24} />
                <span className="text-white font-black uppercase tracking-widest text-lg">🤖 AI Says...</span>
              </div>
              <div className="p-8 min-h-[120px] flex items-center">
                {loading ? (
                  <div className="flex items-center gap-3 text-ink/60 font-medium w-full justify-center">
                    <Loader2 className="animate-spin" />
                    <span>Connecting to Gemini 2.5 Flash...</span>
                  </div>
                ) : insight ? (
                  <div className="w-full">
                    <p className="text-xl md:text-2xl font-medium leading-snug mb-4">
                      {insight}
                    </p>
                    <button 
                      onClick={handleGenerateInsight}
                      className="bg-white text-ink border-2 border-ink px-4 py-2 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    >
                      Regenerate Insight
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-start gap-4">
                    <p className="text-xl md:text-2xl font-medium opacity-60 italic">
                      Click below to generate your daily AI insight based on your current courses and deadlines.
                    </p>
                    <button 
                      onClick={handleGenerateInsight}
                      className="bg-secondary text-white border-3 border-ink px-6 py-3 text-sm font-black uppercase tracking-widest shadow-[4px_4px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-2"
                    >
                      <Sparkles size={16} /> Generate Insight
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ErrorBoundary>
        </div>

        {/* Right Sidebar: Today's Tasks + Upcoming Deadlines */}
        <div className="lg:col-span-4">
          <div className="bg-white border-3 border-ink shadow-[6px_6px_0px_#1A1A1A] sticky top-28">
            {/* Today's Tasks Section */}
            <div className="p-6 border-b-4 border-ink flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                <ListChecks size={22} strokeWidth={3} />
                Today's Tasks
              </h2>
              <button 
                onClick={() => navigate('/calendar?action=add-task')}
                className="bg-primary-container border-2 border-ink p-1 shadow-[2px_2px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3 bg-[#FFF6E3]">
              {todayTodos.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed border-ink opacity-40 font-bold">
                  <CheckCircle2 className="mx-auto mb-2" size={28} />
                  <p className="uppercase tracking-widest text-xs">No tasks for today</p>
                  <button
                    onClick={() => navigate('/calendar?action=add-task')}
                    className="mt-3 text-[10px] font-black uppercase tracking-widest underline decoration-2 hover:text-secondary transition-colors"
                  >
                    Add a task →
                  </button>
                </div>
              ) : (
                <>
                  {uncompletedTodayTodos.map(todo => (
                    <div
                      key={todo.id}
                      onClick={() => toggleTodo(todo.id)}
                      className="flex items-center gap-3 p-3 bg-white border-3 border-ink shadow-[2px_2px_0px_#1A1A1A] cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#1A1A1A] transition-all"
                    >
                      <div className="w-5 h-5 border-3 border-ink flex-shrink-0 bg-white" />
                      <span className="font-bold text-sm flex-1">{todo.text}</span>
                      {todo.course && <span className="text-[9px] font-black uppercase opacity-30">{todo.course}</span>}
                    </div>
                  ))}
                  {completedTodayTodos.map(todo => (
                    <div
                      key={todo.id}
                      onClick={() => toggleTodo(todo.id)}
                      className="flex items-center gap-3 p-3 bg-white/50 border-2 border-ink/15 cursor-pointer hover:border-ink/30 transition-all"
                    >
                      <div className="w-5 h-5 border-3 border-ink/30 flex-shrink-0 flex items-center justify-center bg-[#FFDE59]/50">
                        <span className="text-[10px] font-black">✓</span>
                      </div>
                      <span className="font-bold text-sm flex-1 line-through opacity-30">{todo.text}</span>
                    </div>
                  ))}
                  {/* Progress indicator */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                      Done today: {completedTodayTodos.length}/{todayTodos.length}
                    </span>
                    <div className="w-24 h-2 bg-white border-2 border-ink">
                      <div 
                        className="h-full bg-[#FFDE59] transition-all" 
                        style={{ width: `${todayTodos.length > 0 ? (completedTodayTodos.length / todayTodos.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Upcoming Deadlines Section */}
            <div className="p-6 border-t-4 border-ink flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">📅 Deadlines</h2>
            </div>
            <div className="p-6 space-y-6">
              {deadlines.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed border-ink opacity-60 font-bold">
                  <Calendar className="mx-auto mb-2" size={32} />
                  <p className="uppercase tracking-widest text-xs">No upcoming deadlines!</p>
                </div>
              ) : deadlines.map((deadline) => {
                const status = getDeadlineStatus(deadline.dueDate);
                return (
                  <div 
                    key={deadline.id}
                    className="p-4 border-3 border-ink shadow-[3px_3px_0px_#1A1A1A] bg-white relative overflow-hidden group hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                      deadline.priority === 'urgent' ? 'bg-secondary' : 
                      deadline.priority === 'moderate' ? 'bg-primary' : 'bg-tertiary'
                    }`}></div>
                    <div className="flex justify-between items-start pl-2">
                      <div>
                        <p className={`text-[10px] font-black uppercase mb-1 ${
                          status.isUrgent ? 'text-secondary bg-secondary/10 inline-block px-1' : 'text-ink/60'
                        }`}>{status.text}</p>
                        <h4 className="text-lg font-black leading-tight">{deadline.title}</h4>
                        <p className="text-xs opacity-60">Topic: {deadline.topic}</p>
                      </div>
                      {deadline.priority === 'urgent' ? <AlertCircle size={18} className="text-secondary" /> : 
                       deadline.priority === 'moderate' ? <Clock size={18} className="text-primary" /> : 
                       <CheckCircle2 size={18} className="text-tertiary" />}
                    </div>
                  </div>
                );
              })}
              <button 
                onClick={() => navigate('/calendar')}
                className="w-full py-4 border-3 border-ink text-sm font-black uppercase tracking-widest hover:bg-ink hover:text-white transition-all active:translate-x-[2px] active:translate-y-[2px]"
              >
                Open Full Calendar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


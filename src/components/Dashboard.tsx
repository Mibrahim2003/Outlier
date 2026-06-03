import { Link, useNavigate } from 'react-router-dom';
import { Stat } from '../types';
import { Sparkles, ArrowRight, AlertCircle, Clock, CheckCircle2, Calendar, Loader2, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../context/StoreContext';
import { useAI } from '../hooks/useAI';
import { useEffect, useState } from 'react';
import { getDashboardImpactStyles } from '../utils/impactStyles';
import { calculateGPA } from '../utils/gradeUtils';
import { getGreeting, getDeadlineStatus } from '../utils/dateUtils';

export const Dashboard = () => {
  const { userProfile, courses, deadlines } = useStore();
  const { getDashboardInsight, loading } = useAI();
  const [insight, setInsight] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (courses.length > 0) {
      getDashboardInsight(courses, deadlines).then(res => {
        if (res) setInsight(res);
      });
    }
  }, [courses, deadlines]);

  const userName = userProfile?.name?.split(' ')[0] || 'Student';
  const greeting = getGreeting();

  const currentGPA = parseFloat(calculateGPA(courses));
  const targetGPA = userProfile?.targetGpa || 4.0;
  const gpaProgress = Math.min((currentGPA / targetGPA) * 100, 100);

  const dynamicStats: Stat[] = [
    { label: 'Active Courses', value: courses.length.toString(), color: 'bg-tertiary' },
    { label: 'Pending Tasks', value: deadlines.length.toString(), color: 'bg-secondary' },
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
        <div className="hidden lg:block w-48 h-48 border-3 border-ink shadow-[3px_3px_0px_#1A1A1A] bg-white rotate-3 overflow-hidden">
          <img 
            alt="Abstract academic" 
            className="w-full h-full object-cover grayscale contrast-125" 
            src="https://picsum.photos/seed/study/300/300"
            referrerPolicy="no-referrer"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Left: Main Dashboard Content */}
        <div className="lg:col-span-8 space-y-12">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* GPA Custom Card */}
            <div className="bg-white border-3 border-ink shadow-[3px_3px_0px_#1A1A1A] group hover:translate-y-[-2px] transition-all flex flex-col">
              <div className="h-3 bg-primary-container border-b-4 border-ink"></div>
              <div className="p-4 flex flex-col flex-1 justify-center">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">GPA Progress</p>
                  <p className="text-[10px] font-black uppercase tracking-widest">{currentGPA.toFixed(2)} / {targetGPA.toFixed(2)}</p>
                </div>
                <div className="w-full h-4 bg-background border-2 border-ink mt-auto">
                  <div className="h-full bg-primary-container" style={{ width: `${gpaProgress}%` }}></div>
                </div>
              </div>
            </div>
            
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
                      <div className={`h-4 ${getDashboardImpactStyles(course.impactLevel)} border-b-4 border-ink`}></div>
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
                            <div className={`h-full ${getDashboardImpactStyles(course.impactLevel)}`} style={{ width: `${course.gradeProgress}%` }}></div>
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
                <p className="text-xl md:text-2xl font-medium leading-snug">
                  {insight}
                </p>
              ) : (
                <p className="text-xl md:text-2xl font-medium">
                  "Focus on <span className="font-black bg-primary-container px-2">CS-201</span> — your Quiz 1 score was <span className="italic underline">below average</span>. Try the 'Binary Tree' review set in your library."
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Upcoming Deadlines */}
        <div className="lg:col-span-4">
          <div className="bg-white border-3 border-ink shadow-[6px_6px_0px_#1A1A1A] sticky top-28">
            <div className="p-6 border-b-4 border-ink flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter">Upcoming Deadlines</h2>
              <button 
                  onClick={() => alert('Quick Add Deadline functionality would open a modal here!')}
                  className="bg-secondary text-white border-2 border-ink p-1 shadow-[2px_2px_0px_#1A1A1A] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  <Plus size={18} />
              </button>
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


import { Link, useNavigate } from 'react-router-dom';
import { Stat } from '../types';
import { Sparkles, AlertCircle, Clock, CheckCircle2, Loader2, Plus, ListChecks } from 'lucide-react';
import { motion, useMotionValue } from 'motion/react';
import { useProfile } from '../domain/profile/useProfile';
import { useCourses } from '../domain/courses/useCourses';
import { useDeadlines } from '../domain/deadlines/useDeadlines';
import { useTodos } from '../domain/todos/useTodos';
import { useAI } from '../hooks/useAI';
import { useCourseProgress } from '../hooks/useCourseProgress';
import { useMutation } from '@tanstack/react-query';

import { getThemeBgClass } from '../utils/impactStyles';
import { getGreeting, getDeadlineStatus, isSameDay, parseLocalDate } from '../utils/dateUtils';
import { ErrorBoundary } from 'react-error-boundary';
import { WidgetErrorFallback } from './ErrorBoundary';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button, Card } from './ui';
import { VectorStar, RobotHead, FacetedPolygon, IsometricCube, Pyramid } from './BannerAssets';
import React from 'react';

type AssetPhysicsState = {
  x: any;
  y: any;
  vx: React.MutableRefObject<number>;
  vy: React.MutableRefObject<number>;
  isDragging: React.MutableRefObject<boolean>;
  ref: React.RefObject<HTMLDivElement | null>;
  baseX: React.MutableRefObject<number>;
  baseY: React.MutableRefObject<number>;
};

const PhysicsAsset = ({ children, className, index, registerAsset }: { children: React.ReactNode, className?: string, index: number, registerAsset: (i: number, s: AssetPhysicsState) => void }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const isDragging = React.useRef(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  const vx = React.useRef(0);
  const vy = React.useRef(0);
  const baseX = React.useRef(0);
  const baseY = React.useRef(0);

  React.useEffect(() => {
    vx.current = (Math.random() - 0.5) * 0.15;
    vy.current = (Math.random() - 0.5) * 0.15;
    if (ref.current && ref.current.parentElement) {
       const parentRect = ref.current.parentElement.getBoundingClientRect();
       const rect = ref.current.getBoundingClientRect();
       baseX.current = (rect.left - parentRect.left) + rect.width / 2;
       baseY.current = (rect.top - parentRect.top) + rect.height / 2;
    }
    registerAsset(index, { x, y, vx, vy, isDragging, ref, baseX, baseY });
  }, [index, registerAsset, x, y]);

  return (
    <motion.div
      ref={ref}
      drag
      dragMomentum={false}
      onDragStart={() => (isDragging.current = true)}
      onDrag={(_, info) => {
         x.set(x.get() + info.delta.x);
         y.set(y.get() + info.delta.y);
      }}
      onDragEnd={(_, info) => {
         isDragging.current = false;
         vx.current = info.velocity.x * 0.02;
         vy.current = info.velocity.y * 0.02;
      }}
      style={{ x, y, touchAction: 'none' }}
      className={`cursor-grab active:cursor-grabbing ${className}`}
    >
      {children}
    </motion.div>
  );
};

const AssetCluster = () => {
  const physicsStateArray = React.useRef<AssetPhysicsState[]>([]);

  const registerAsset = React.useCallback((index: number, state: AssetPhysicsState) => {
    physicsStateArray.current[index] = state;
  }, []);

  React.useEffect(() => {
    let animationFrameId: number;
    const NUM_ASSETS = 17;

    const loop = () => {
      const assets = physicsStateArray.current;
      if (assets.filter(Boolean).length !== NUM_ASSETS) {
         animationFrameId = requestAnimationFrame(loop);
         return;
      }

      // 1. Resolve Collisions (Circle-based O(N^2))
      for (let i = 0; i < assets.length; i++) {
         for (let j = i + 1; j < assets.length; j++) {
            const a1 = assets[i];
            const a2 = assets[j];
            
            const cx1 = a1.baseX.current + a1.x.get();
            const cy1 = a1.baseY.current + a1.y.get();
            const cx2 = a2.baseX.current + a2.x.get();
            const cy2 = a2.baseY.current + a2.y.get();

            const dx = cx2 - cx1;
            const dy = cy2 - cy1;
            const distSq = dx*dx + dy*dy;
            const radius = 25; 
            const minDistSq = (radius * 2) * (radius * 2);

            if (distSq < minDistSq && distSq > 0.1) {
               const dist = Math.sqrt(distSq);
               const overlap = (radius * 2) - dist;
               
               const nx = dx / dist;
               const ny = dy / dist;

               if (!a1.isDragging.current) {
                  a1.x.set(a1.x.get() - nx * (overlap / 2));
                  a1.y.set(a1.y.get() - ny * (overlap / 2));
               }
               if (!a2.isDragging.current) {
                  a2.x.set(a2.x.get() + nx * (overlap / 2));
                  a2.y.set(a2.y.get() + ny * (overlap / 2));
               }

               const dvx = a1.vx.current - a2.vx.current;
               const dvy = a1.vy.current - a2.vy.current;
               const dotProduct = dvx * nx + dvy * ny;

               if (dotProduct > 0) {
                  const impulse = dotProduct;
                  if (!a1.isDragging.current) {
                     a1.vx.current -= impulse * nx;
                     a1.vy.current -= impulse * ny;
                  }
                  if (!a2.isDragging.current) {
                     a2.vx.current += impulse * nx;
                     a2.vy.current += impulse * ny;
                  }
               }
            }
         }
      }

      // 2. Apply Forces & Move
      for (let i = 0; i < assets.length; i++) {
         const asset = assets[i];
         if (asset.isDragging.current) continue;

         const currentX = asset.x.get();
         const currentY = asset.y.get();
         
         // Friction
         asset.vx.current *= 0.90;
         asset.vy.current *= 0.90;

         // Home Gravity (pull towards 0, 0 offset)
         const k = 0.001; 
         asset.vx.current -= currentX * k;
         asset.vy.current -= currentY * k;

         // Micro Brownian motion to keep them "alive"
         asset.vx.current += (Math.random() - 0.5) * 0.02;
         asset.vy.current += (Math.random() - 0.5) * 0.02;

         asset.x.set(currentX + asset.vx.current);
         asset.y.set(currentY + asset.vy.current);
      }

      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <>
      {/* Top Row Assets */}
      <PhysicsAsset index={0} registerAsset={registerAsset} className="absolute top-4 left-[4%]"><VectorStar fill="#68D391" size={32} className="-rotate-12" /></PhysicsAsset>
      <PhysicsAsset index={1} registerAsset={registerAsset} className="absolute top-2 left-[15%]"><VectorStar fill="#FF69B4" size={48} className="rotate-6" /></PhysicsAsset>
      <PhysicsAsset index={2} registerAsset={registerAsset} className="absolute top-10 left-[30%]"><RobotHead size={40} className="rotate-12" /></PhysicsAsset>
      <PhysicsAsset index={3} registerAsset={registerAsset} className="absolute top-8 left-[42%]"><VectorStar fill="#4299E1" size={28} className="-rotate-6" /></PhysicsAsset>
      <PhysicsAsset index={4} registerAsset={registerAsset} className="absolute -top-4 left-[55%]"><FacetedPolygon fill="#FF69B4" size={56} className="rotate-45" /></PhysicsAsset>
      <PhysicsAsset index={5} registerAsset={registerAsset} className="absolute top-6 left-[65%]"><RobotHead size={32} className="-rotate-6" /></PhysicsAsset>
      <PhysicsAsset index={6} registerAsset={registerAsset} className="absolute top-2 left-[75%]"><FacetedPolygon fill="#68D391" size={64} className="-rotate-12" /></PhysicsAsset>
      <PhysicsAsset index={7} registerAsset={registerAsset} className="absolute top-4 left-[85%]"><VectorStar fill="#4299E1" size={32} className="rotate-12" /></PhysicsAsset>
      <PhysicsAsset index={8} registerAsset={registerAsset} className="absolute top-10 right-[4%]"><VectorStar fill="#FF69B4" size={48} className="rotate-6" /></PhysicsAsset>
      <PhysicsAsset index={9} registerAsset={registerAsset} className="absolute top-[40%] left-[80%]"><IsometricCube fill="#FF69B4" size={24} className="rotate-12" /></PhysicsAsset>

      {/* Bottom Row Assets */}
      <PhysicsAsset index={10} registerAsset={registerAsset} className="absolute bottom-2 left-[2%]"><FacetedPolygon fill="#FF69B4" size={40} className="rotate-12" /></PhysicsAsset>
      <PhysicsAsset index={11} registerAsset={registerAsset} className="absolute bottom-2 left-[40%]"><VectorStar fill="#68D391" size={40} className="-rotate-6" /></PhysicsAsset>
      <PhysicsAsset index={12} registerAsset={registerAsset} className="absolute bottom-6 left-[50%]"><RobotHead size={32} className="rotate-12" /></PhysicsAsset>
      <PhysicsAsset index={13} registerAsset={registerAsset} className="absolute bottom-0 left-[62%]"><Pyramid fill="#4299E1" size={56} className="-rotate-12" /></PhysicsAsset>
      <PhysicsAsset index={14} registerAsset={registerAsset} className="absolute bottom-8 left-[75%]"><RobotHead size={36} className="-rotate-12" /></PhysicsAsset>
      <PhysicsAsset index={15} registerAsset={registerAsset} className="absolute bottom-4 right-[12%]"><Pyramid fill="#4299E1" size={72} className="rotate-12" /></PhysicsAsset>
      <PhysicsAsset index={16} registerAsset={registerAsset} className="absolute bottom-8 right-[2%]"><FacetedPolygon fill="#68D391" size={40} className="-rotate-12" /></PhysicsAsset>
    </>
  );
};

export const Dashboard = () => {
  const { userProfile } = useProfile();
  const { courses } = useCourses();
  const { deadlines } = useDeadlines();
  const { todos, toggleTodo } = useTodos();
  const { getDashboardInsight } = useAI();
  const navigate = useNavigate();
  const courseProgress = useCourseProgress(courses);

  const todayStr = new Date().toISOString().split('T')[0];
  const [insight, setInsight] = useLocalStorage<string | null>(`daily-insight-${todayStr}`, null);

  const insightMutation = useMutation({
    mutationFn: () => getDashboardInsight(courses, deadlines),
    onSuccess: (data) => {
      if (data) setInsight(data);
    }
  });

  const loading = insightMutation.isPending;

  const handleGenerateInsight = React.useCallback(() => {
    insightMutation.mutate();
  }, [insightMutation]);

  const hasAutoFetched = React.useRef(false);
  React.useEffect(() => {
    // Only auto-fetch if enabled, insight is missing, and we haven't already fired it this mount.
    if (userProfile?.autoGenerateInsights && !insight && !hasAutoFetched.current) {
      hasAutoFetched.current = true;
      handleGenerateInsight();
    }
  }, [userProfile?.autoGenerateInsights, insight, handleGenerateInsight]);

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

  // Deadlines falling within the next 7 days (today → today + 7), soonest first.
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  const upcomingDeadlines = deadlines
    .filter((d) => {
      const due = parseLocalDate(d.dueDate);
      return !isNaN(due.getTime()) && due >= weekStart && due <= weekEnd;
    })
    .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());

  const dynamicStats: Stat[] = [
    { label: 'Pending Tasks', value: uncompletedTodayTodos.length.toString(), color: 'bg-[#4299E1]' },
    { label: 'Deadlines', value: deadlines.length.toString(), color: 'bg-[#FF69B4]' },
  ];

  return (
    <div className="space-y-12">
      {/* Welcome Banner */}
      <div className="relative border-[4px] border-ink bg-[#FFE8A3] shadow-[8px_8px_0px_#1A1A1A] flex flex-col overflow-hidden mb-12 p-8 md:p-12 min-h-[200px] justify-center cursor-default">
        
        {/* Scattered Background Assets (Tossable Physics) */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <AssetCluster />
        </div>

        {/* Foreground Content */}
        <div className="z-10 relative space-y-4 max-w-4xl pointer-events-none">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-tight pointer-events-auto flex flex-wrap items-center gap-x-2 gap-y-4">
            <span>{greeting},</span>
            <span className="inline-block bg-white px-4 py-1 border-[4px] border-ink shadow-[4px_4px_0px_#1A1A1A] font-black -rotate-2">
              {userName}
            </span>
          </h1>
          
          <p className="text-base md:text-lg font-bold text-ink pointer-events-auto flex flex-wrap items-center gap-x-2 mt-4">
            <span>You have</span>
            <span className="inline-block bg-[#68D391] px-3 py-1 border-[3px] border-ink shadow-[3px_3px_0px_#1A1A1A] font-black rotate-1">
              <span className="text-white px-1.5 py-0.5 bg-ink mr-2">{upcomingDeadlines.length}</span>
              upcoming {upcomingDeadlines.length === 1 ? 'deadline' : 'deadlines'}
            </span>
            <span>this week.</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Left: Main Dashboard Content */}
        <div className="lg:col-span-8 space-y-12">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {dynamicStats.map((stat) => (
              <div 
                key={stat.label} 
                className="group relative border-[4px] border-ink bg-[#FFF5E1] shadow-[8px_8px_0px_#1A1A1A] hover:shadow-[0px_0px_0px_#1A1A1A] hover:translate-x-[8px] hover:translate-y-[8px] transition-all duration-150 ease-out cursor-pointer p-[6px]"
              >
                <div className="border-[3px] border-ink bg-white flex flex-col justify-center items-center py-6 h-full">
                  <p className="text-[12px] md:text-sm font-black uppercase tracking-widest text-ink mb-2">
                    {stat.label}
                  </p>
                  <p className="text-6xl md:text-7xl font-black text-ink">
                    {stat.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* My Courses Grid */}
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase">My Courses</h2>
              <div className="flex gap-4">
                <Button
                  onClick={() => navigate('/courses?action=add')}
                  variant="tertiary" size="xs"
                  className="flex items-center gap-1"
                >
                  <Plus size={14} /> Add
                </Button>
                <Link to="/courses" className="text-sm font-bold underline decoration-4 decoration-primary flex items-center">View All</Link>
              </div>
            </div>
            
            {courses.length === 0 ? (
              <Card shadow="sm" className="border-dashed p-10 text-center">
                <p className="text-lg font-bold mb-4 opacity-60 uppercase tracking-widest">No Active Courses</p>
                <Button onClick={() => navigate('/courses?action=add')}>
                  Add Your First Course
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {courses.map((course) => {
                  const progress = courseProgress.get(course.id)?.progress ?? 0;
                  return (
                    <Link key={course.id} to={`/courses/${course.id}`}>
                      <div
                        className={`border-[4px] border-ink shadow-[8px_8px_0px_#1A1A1A] hover:shadow-[0px_0px_0px_#1A1A1A] hover:translate-x-[8px] hover:translate-y-[8px] transition-all duration-150 ease-out flex flex-col cursor-pointer aspect-square overflow-hidden ${getThemeBgClass(course.themeColor)}`}
                      >
                        <div className="p-6 md:p-8 flex flex-col h-full gap-4">
                          {/* Top Row */}
                          <div className="flex justify-between items-center flex-shrink-0">
                            <div className="bg-white border-[3px] border-ink px-3 py-1 font-black text-ink text-sm md:text-base">
                              {course.code}
                            </div>
                            <span className="text-xs md:text-sm font-black text-ink tracking-widest">{course.credits} CREDITS</span>
                          </div>

                          {/* Course Name — fills the leftover space between header and progress */}
                          <div className="flex-1 min-h-0 flex items-center overflow-hidden">
                            <h3 className="text-2xl md:text-3xl font-black text-ink leading-tight tracking-tighter uppercase line-clamp-3 break-words">
                              {course.name}
                            </h3>
                          </div>
                          
                          {/* Progress */}
                          <div className="flex-shrink-0">
                            <div className="flex justify-between text-[11px] md:text-[12px] font-black text-ink mb-2 tracking-widest uppercase">
                              <span>Grade Progress</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full h-4 bg-white border-[3px] border-ink flex">
                              <div className="h-full bg-ink" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Recommendations Widget */}
          <ErrorBoundary FallbackComponent={WidgetErrorFallback}>
            <Card shadow="md">
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
                    <Button onClick={handleGenerateInsight} variant="outline" size="xs">
                      Regenerate Insight
                    </Button>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-start gap-4">
                    <p className="text-xl md:text-2xl font-medium opacity-60 italic">
                      Click below to generate your daily AI insight based on your current courses and deadlines.
                    </p>
                    <Button onClick={handleGenerateInsight} variant="secondary" className="flex items-center gap-2">
                      <Sparkles size={16} /> Generate Insight
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </ErrorBoundary>
        </div>

        {/* Right Sidebar: Today's Tasks + Upcoming Deadlines */}
        <div className="lg:col-span-4">
          <Card shadow="md" className="sticky top-28">
            {/* Today's Tasks Section */}
            <div className="p-6 border-b-4 border-ink flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                <ListChecks size={22} strokeWidth={3} />
                Today's Tasks
              </h2>
              <Button 
                onClick={() => navigate('/calendar?action=add-task')}
                variant="primary" size="icon"
                className="w-8 h-8"
              >
                <Plus size={18} />
              </Button>
            </div>
            <div className="p-6 space-y-3 bg-[#FFF6E3]">
              {todayTodos.length === 0 ? (
                <div className="text-center p-6 font-bold">
                  <img
                    src="/sleeping-face.png"
                    alt="Sleeping face — no tasks today"
                    className="mx-auto mb-3 w-24 h-24 object-contain"
                  />
                  <p className="uppercase tracking-widest text-base font-black mb-1">No tasks today</p>
                  <button
                    onClick={() => navigate('/calendar?action=add-task')}
                    className="mt-2 text-xs font-black uppercase tracking-widest underline decoration-2 hover:text-secondary transition-colors"
                  >
                    Add a task —
                  </button>
                </div>
              ) : (
                <>
                  {uncompletedTodayTodos.map(todo => (
                    <Card
                      key={todo.id}
                      shadow="sm" interactive
                      onClick={() => toggleTodo(todo.id)}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="w-5 h-5 border-3 border-ink flex-shrink-0 bg-white" />
                      <span className="font-bold text-sm flex-1">{todo.text}</span>
                      {todo.course && <span className="text-[9px] font-black uppercase opacity-30">{todo.course}</span>}
                    </Card>
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
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center p-6 font-bold">
                  <img
                    src="/phew-face.png"
                    alt="Relieved face — no deadlines this week"
                    className="mx-auto mb-3 w-24 h-24 object-contain"
                  />
                  <p className="uppercase tracking-widest text-base font-black mb-1">No deadlines this week</p>
                  <button
                    onClick={() => navigate('/calendar?action=add-deadline')}
                    className="mt-2 text-xs font-black uppercase tracking-widest underline decoration-2 hover:text-secondary transition-colors"
                  >
                    Add a deadline —
                  </button>
                </div>
              ) : upcomingDeadlines.map((deadline) => {
                const status = getDeadlineStatus(deadline.dueDate);
                return (
                  <Card 
                    key={deadline.id}
                    shadow="sm" interactive
                    className="p-4 relative overflow-hidden"
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
                  </Card>
                );
              })}
              <Button 
                onClick={() => navigate('/calendar')}
                variant="outline"
                className="w-full"
              >
                Open Full Calendar
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};


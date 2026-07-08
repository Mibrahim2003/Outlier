import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Zap, Clock, AlertTriangle, Plus, X, ArrowRight } from 'lucide-react';
import { useCourses } from '../domain/courses/useCourses';
import { useOnboarding } from '../domain/onboarding/useOnboarding';
import { useProfile } from '../domain/profile/useProfile';
import { Course } from '../types';
import { getImpactStyles, getImpactLevelForCredits, ThemeColor, getThemeBgClass } from '../utils/impactStyles';
import { ZeeMascot } from './ui';

export const Onboarding = () => {
  const navigate = useNavigate();
  const { courses, addCourse, removeCourse } = useCourses();
  const { onboardingState, commitLoadout } = useOnboarding();
  const { userProfile } = useProfile();

  // User can revisit this page to add courses, so no auto-redirect here.


  // Track form state
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    code: '',
    name: '',
    credits: 3,
    weightage: { quizzes: 10, assignments: 20, midterm: 25, final: 35, project: 10 },
    themeColor: 'yellow'
  });

  // Explicit State Machine Logic
  const totalWeight = useMemo(() => {
    if (!newCourse.weightage) return 0;
    return Object.values(newCourse.weightage).reduce((sum: number, val) => sum + (Number(val) || 0), 0);
  }, [newCourse.weightage]);

  const isCourseValid =
    newCourse.code?.trim() !== '' &&
    newCourse.name?.trim() !== '' &&
    Number(newCourse.credits) > 0 &&
    totalWeight === 100;

  const statusLabel = isCourseValid ? 'Ready to add' : 'Fill in the details';

  const totalCredits = courses.reduce((acc, c) => acc + c.credits, 0);

  // Progress against the course count committed during profile setup. Used for
  // the bottom bar and a gentle nudge — never a hard gate (the student can add
  // fewer or more than planned).
  const targetCount = userProfile?.courseCount ?? 0;
  const progressPct =
    targetCount > 0
      ? Math.min(100, Math.round((courses.length / targetCount) * 100))
      : courses.length > 0
        ? 100
        : 0;
  const courseCountHint =
    targetCount > 0
      ? courses.length < targetCount
        ? `${targetCount - courses.length} more to reach your ${targetCount}`
        : courses.length === targetCount
          ? `All ${targetCount} added — you're set`
          : `${courses.length - targetCount} over your planned ${targetCount}`
      : isCourseValid
        ? 'New course ready to add'
        : 'Fill in the form to add a course';

  const handleAddCourse = () => {
    if (!isCourseValid) return;

    addCourse({
      id: crypto.randomUUID(),
      code: newCourse.code!.trim(),
      name: newCourse.name!.trim(),
      credits: Number(newCourse.credits),
      impactLevel: getImpactLevelForCredits(Number(newCourse.credits)),
      themeColor: newCourse.themeColor || 'yellow',
      gradeProgress: 0,
      grade: 'N/A',
      weightage: newCourse.weightage || { quizzes: 10, assignments: 20, midterm: 25, final: 35, project: 10 }
    });

    // Reset basic fields
    setNewCourse({ ...newCourse, code: '', name: '' });
  };

  return (
    <div className="bg-background font-body text-on-background industrial-grid min-h-screen relative overflow-x-hidden">

      {/* ─── FLOATING HEADER ───────────────────────── */}
      <header className="fixed top-0 left-0 w-full z-[100] pointer-events-none p-6 flex justify-between items-start">
        <div className="pointer-events-auto bg-primary-container border-4 border-on-background p-4 neo-brutal-shadow-lg flex items-center gap-2">
          <TrendingUp size={26} strokeWidth={2.5} />
          <span className="text-3xl font-bold tracking-tighter uppercase">Outlier</span>
        </div>
        <div className="pointer-events-auto bg-on-background text-white p-4 border-4 border-on-background neo-brutal-shadow-lg">
          <span className="text-sm font-bold tracking-[0.3em]">STEP 2 OF 2</span>
        </div>
      </header>

      {/* ─── MAIN CONTENT ──────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-32 relative z-10">

        {/* HERO ANCHOR BLOCK */}
        <section className="relative mb-16">
          <div className="absolute -top-4 -left-4 bg-secondary text-white px-3 py-1 border-4 border-on-background z-20 text-[10px] font-bold uppercase tracking-widest neo-brutal-shadow-lg">
            Almost there
          </div>
          <h1 className="font-headline font-bold text-5xl md:text-7xl lg:text-[7.5rem] leading-[0.8] tracking-tighter uppercase relative z-10">
            BUILD YOUR<br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px #1A1A1A' }}>SEMESTER</span>
          </h1>
          <div className="mt-[-1.5rem] ml-8 md:ml-16 bg-white border-4 border-on-background p-4 md:p-5 neo-brutal-shadow-lg relative z-20 inline-block max-w-lg">
            <p className="text-base font-bold uppercase leading-tight flex items-start gap-3">
              <Zap className="shrink-0 text-secondary" size={20} />
              Add each course and how its grade breaks down. This is what Outlier tracks all semester.
            </p>
          </div>
        </section>

        {/* ─── COURSE BUILDER (8-col / 4-col) ──────────────── */}
        <div className="bg-white border-8 border-on-background p-0 neo-shadow-aggressive relative mb-16 max-w-7xl mx-auto flex flex-col lg:flex-row">

          <div className="absolute -top-5 -left-4 bg-primary-container text-on-background px-4 py-1.5 border-4 border-on-background z-20 text-base font-black uppercase tracking-widest neo-brutal-shadow-lg hidden md:block">
            Your courses
          </div>

          {/* LEFT: INPUT (8-col structural equivalent) */}
          <div className="w-full lg:w-2/3 border-b-4 lg:border-b-0 lg:border-r-4 border-on-background p-6 md:p-10 relative bg-[#fdfdfd] flex flex-col">

            <div className={`border-4 border-on-background p-3 mb-8 text-center font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${isCourseValid ? 'bg-primary-container text-on-background' : 'bg-on-background text-white'}`}>
              {isCourseValid ? <Zap size={16} /> : <Clock size={16} />}
              {statusLabel}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                <div>
                  <label className="block font-headline text-lg font-bold uppercase mb-2 text-on-background/80">Course code</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-2xl md:text-3xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="e.g. CS50"
                    type="text"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-headline text-lg font-bold uppercase mb-2 text-on-background/80">Course name</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-xl md:text-2xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="Intro to Computer Science"
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="md:col-span-1 space-y-8">
                <div>
                  <label className="block font-headline text-lg font-bold uppercase mb-2 text-on-background/80">Credits</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-2xl md:text-4xl text-center font-bold uppercase focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="3"
                    type="number"
                    min={1}
                    max={6}
                    value={newCourse.credits || ''}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block font-headline text-lg font-bold uppercase mb-2 text-on-background/80">Colour</label>
                  <div className="flex gap-2 mt-4">
                    {(['blue', 'yellow', 'purple', 'pink', 'green'] as ThemeColor[]).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCourse({ ...newCourse, themeColor: color })}
                        aria-label={`${color} colour`}
                        className={`w-8 h-8 rounded-full border-4 shadow-sm ${newCourse.themeColor === color ? 'border-ink scale-125' : 'border-transparent opacity-80 hover:opacity-100'} ${getThemeBgClass(color)} transition-all`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Grade breakdown block */}
            <div className="mt-12 bg-on-background p-6 neo-brutal-shadow-lg relative border-4 border-on-background">
              <label className="block text-white font-headline text-2xl font-bold uppercase mb-6 border-b-2 border-white pb-2 flex justify-between items-end gap-2">
                Grade breakdown
                <span className={`text-[10px] md:text-sm font-body tracking-widest ${totalWeight === 100 ? 'text-primary-container' : 'text-secondary'}`}>
                  {totalWeight !== 100 && <AlertTriangle className="inline align-text-bottom mr-1" size={14} />}
                  {totalWeight}% / 100%
                </span>
              </label>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { key: 'quizzes', label: 'Quizzes' },
                  { key: 'assignments', label: 'Assignments' },
                  { key: 'midterm', label: 'Midterm' },
                  { key: 'project', label: 'Project' },
                  { key: 'final', label: 'Final' },
                ].map((item) => (
                  <div key={item.key} className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase text-white tracking-widest">{item.label}</label>
                    <input
                      className="w-full bg-transparent border-b-4 border-white text-white p-2 text-2xl font-bold focus:outline-none focus:border-primary-container text-center"
                      type="number"
                      min={0}
                      max={100}
                      value={newCourse.weightage?.[item.key as keyof typeof newCourse.weightage] || ''}
                      onChange={(e) => setNewCourse({
                        ...newCourse,
                        weightage: {
                          ...newCourse.weightage!,
                          [item.key]: parseInt(e.target.value) || 0
                        }
                      })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex justify-end">
              <button
                type="button"
                onClick={handleAddCourse}
                disabled={!isCourseValid}
                className="group relative bg-secondary text-white border-4 border-on-background px-8 py-4 font-headline uppercase font-bold text-xl tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 transition-transform flex items-center gap-3 neo-brutal-shadow-lg"
              >
                <Plus size={28} strokeWidth={3} />
                Add course
              </button>
            </div>
          </div>

          {/* RIGHT: COURSE SUMMARY (4-col structural equivalent) */}
          <div className="w-full lg:w-1/3 p-6 md:p-8 bg-[#f4f4f4] flex flex-col justify-between">
            <div>
              <h3 className="font-headline text-2xl font-bold uppercase tracking-tighter mb-6 border-b-4 border-on-background pb-2 flex items-center justify-between">
                Your courses
                <span className="text-xs bg-on-background text-white px-3 py-1 font-body tracking-[0.3em] font-bold">
                  {courses.length.toString().padStart(2, '0')}{userProfile?.courseCount ? ` / ${String(userProfile.courseCount).padStart(2, '0')}` : ''}
                </span>
              </h3>

              <div className="flex flex-col gap-3 min-h-[150px]">
                {courses.length === 0 ? (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-background border-2 border-on-background border-dashed p-6 text-center opacity-50 font-bold uppercase text-sm tracking-widest">
                    <ZeeMascot variant="locked-in" size={64} />
                    No courses yet
                  </div>
                ) : (
                  courses.map((course, i) => (
                    <div key={i} className={`border-4 border-on-background p-3 flex justify-between items-center neo-brutal-shadow-lg ${getImpactStyles(course.impactLevel)}`}>
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-black text-lg leading-tight tracking-tight uppercase">{course.code}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 truncate">{course.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-sm tracking-widest border-l-2 pl-3 border-current leading-tight">({course.credits})</span>
                        <button onClick={() => removeCourse(course.id)} aria-label={`Remove ${course.code}`} className="hover:scale-125 transition-transform flex items-center">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Meta & Summary */}
            <div className="mt-12 pt-6 border-t-4 border-on-background/20 space-y-4">
              <div className="flex justify-between items-end font-bold uppercase text-on-background">
                <span className="text-sm tracking-widest opacity-80">Total credits</span>
                <span className="text-5xl font-black leading-none">{totalCredits.toString().padStart(2, '0')}</span>
              </div>
              <div className="bg-background border-4 border-on-background p-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-8 h-full bg-[repeating-linear-gradient(45deg,#A8275A,#A8275A_5px,#1A1A1A_5px,#1A1A1A_10px)] opacity-20"></div>
                <p className="text-[11px] uppercase font-bold tracking-[0.2em] leading-relaxed relative z-10">
                  {courses.length} course{courses.length === 1 ? '' : 's'} added<br/>
                  {courseCountHint}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FINAL CTA ─────────────────────── */}
        <div className="relative pt-8 mt-12 mb-20 max-w-4xl mx-auto">
          <div className="absolute -top-10 left-0 text-left opacity-20 pointer-events-none hidden md:block z-0">
            <span className="text-[6rem] font-bold uppercase tracking-tighter leading-none block">READY?</span>
          </div>

          <button
            className="group w-full relative z-10"
            onClick={() => {
              commitLoadout();
              navigate('/dashboard');
            }}
            disabled={courses.length === 0}
          >
            <div className={`absolute inset-0 translate-x-2 translate-y-2 ${courses.length === 0 ? 'bg-on-background/30' : 'bg-on-background'}`}></div>
            <div className={`relative border-4 border-on-background p-6 md:p-8 flex items-center justify-center gap-8 transition-transform ${courses.length === 0 ? 'bg-background opacity-50 cursor-not-allowed' : 'bg-primary-container group-hover:-translate-x-1 group-hover:-translate-y-1'}`}>
              <span className="font-headline font-bold text-3xl md:text-5xl uppercase tracking-tighter">
                {onboardingState.loadoutCommitted ? 'Back to dashboard' : 'Start tracking'}
              </span>
              <ArrowRight size={44} strokeWidth={3} className="group-hover:translate-x-4 transition-transform block" />
            </div>
          </button>
        </div>

      </main>

      {/* ─── ROOT LAYERS ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 w-full h-4 bg-on-background z-[100]">
        <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${progressPct}%` }}></div>
      </div>
      <div className="fixed -bottom-10 left-10 text-[15rem] font-bold uppercase text-on-background opacity-[0.03] select-none pointer-events-none whitespace-nowrap z-0">
        OUTLIER
      </div>
    </div>
  );
};

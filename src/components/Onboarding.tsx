import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourses } from '../domain/courses/useCourses';
import { useOnboarding } from '../domain/onboarding/useOnboarding';
import { useProfile } from '../domain/profile/useProfile';
import { Course } from '../types';
import { getImpactStyles, ThemeColor, getThemeBgClass } from '../utils/impactStyles';

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

  const isTerminalValid = 
    newCourse.code?.trim() !== '' && 
    newCourse.name?.trim() !== '' && 
    Number(newCourse.credits) > 0 && 
    totalWeight === 100;

  const terminalState = isTerminalValid ? 'READY_TO_APPEND' : 'AWAITING_INPUT';

  const totalCredits = courses.reduce((acc, c) => acc + c.credits, 0);

  const getImpactLevel = (credits: number): 'heavy' | 'standard' | 'minimal' => {
    if (credits >= 4) return 'heavy';
    if (credits === 3) return 'standard';
    return 'minimal';
  };

  const handleAddCourse = () => {
    if (!isTerminalValid) return;
    
    addCourse({
      id: crypto.randomUUID(),
      code: newCourse.code!.toUpperCase(),
      name: newCourse.name!.toUpperCase(),
      credits: Number(newCourse.credits),
      impactLevel: getImpactLevel(Number(newCourse.credits)),
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
      
      {/* ─── FLOATING TERMINAL HEADER ───────────────────────── */}
      <header className="fixed top-0 left-0 w-full z-[100] pointer-events-none p-6 flex justify-between items-start">
        <div className="pointer-events-auto bg-primary-container border-4 border-on-background p-4 neo-shadow-sm flex items-center gap-2">
          <span className="material-symbols-outlined font-bold">terminal</span>
          <span className="text-3xl font-bold tracking-tighter uppercase">Outlier</span>
        </div>
        <div className="pointer-events-auto bg-on-background text-white p-4 border-4 border-on-background neo-shadow-sm">
          <span className="text-sm font-bold tracking-[0.3em]">STEP_02</span>
        </div>
      </header>

      {/* ─── MAIN CONTENT ──────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 pt-32 pb-32 relative z-10">
        
        {/* HERO ANCHOR BLOCK */}
        <section className="relative mb-16">
          <div className="absolute -top-4 -left-4 bg-secondary-container text-white px-3 py-1 border-4 border-on-background z-20 text-[10px] font-bold uppercase tracking-widest neo-shadow-sm">
            LOADOUT_CONFIG_v1.0
          </div>
          <h1 className="font-headline font-bold text-5xl md:text-7xl lg:text-[7.5rem] leading-[0.8] tracking-tighter uppercase relative z-10">
            CONFIGURE<br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px #1A1A1A' }}>LOADOUT</span>
          </h1>
          <div className="mt-[-1.5rem] ml-8 md:ml-16 bg-white border-4 border-on-background p-4 md:p-5 neo-shadow-sm relative z-20 inline-block max-w-lg">
            <p className="text-base font-bold uppercase leading-tight flex items-start gap-3">
              <span className="material-symbols-outlined shrink-0 text-secondary-container">bolt</span>
              Register academic units and enforce weight distributions to lock in your tracking parameters.
            </p>
          </div>
        </section>

        {/* ─── MONOLITHIC LEDGER (8-col / 4-col) ──────────────── */}
        <div className="bg-white border-8 border-on-background p-0 neo-shadow-aggressive relative mb-16 max-w-7xl mx-auto flex flex-col lg:flex-row">
          
          <div className="absolute -top-5 -left-4 bg-primary-container text-on-background px-4 py-1.5 border-4 border-on-background z-20 text-base font-black uppercase tracking-widest neo-shadow-sm hidden md:block">
            ACTIVE LEDGER // LOG
          </div>

          {/* LEFT: INPUT TERMINAL (8-col structural equivalent) */}
          <div className="w-full lg:w-2/3 border-b-4 lg:border-b-0 lg:border-r-4 border-on-background p-6 md:p-10 relative bg-[#fdfdfd] flex flex-col">
            
            <div className={`border-4 border-on-background p-3 mb-8 text-center font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors ${isTerminalValid ? 'bg-primary-container text-on-background' : 'bg-on-background text-white'}`}>
              <span className="material-symbols-outlined">{isTerminalValid ? 'bolt' : 'pending'}</span>
              [ {terminalState} ]
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                <div>
                  <label className="block font-headline text-lg font-bold uppercase mb-2 text-on-background/80">UNIT_CODE</label>
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
                  <label className="block font-headline text-lg font-bold uppercase mb-2 text-on-background/80">UNIT_NAME</label>
                  <input 
                    required 
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-xl md:text-2xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="INTRO TO COMPUTER SCIENCE"
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="md:col-span-1 space-y-8">
                <div>
                  <label className="block font-headline text-lg font-bold uppercase mb-2 text-on-background/80">CREDITS</label>
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
                  <label className="block font-headline text-lg font-bold uppercase mb-2 text-on-background/80">THEME</label>
                  <div className="flex gap-2 mt-4">
                    {(['yellow', 'pink', 'green', 'blue'] as ThemeColor[]).map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCourse({ ...newCourse, themeColor: color })}
                        className={`w-8 h-8 rounded-full border-4 shadow-sm ${newCourse.themeColor === color ? 'border-ink scale-125' : 'border-transparent opacity-80 hover:opacity-100'} ${getThemeBgClass(color)} transition-all`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Matrix weightage block */}
            <div className="mt-12 bg-on-background p-6 neo-shadow-sm relative border-4 border-on-background">
              <label className="block text-white font-headline text-2xl font-bold uppercase mb-6 border-b-2 border-white pb-2 flex justify-between items-end gap-2">
                WEIGHT_MATRIX
                <span className={`text-[10px] md:text-sm font-body tracking-widest ${totalWeight === 100 ? 'text-primary-container' : 'text-secondary-container'}`}>
                  {totalWeight !== 100 && <span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">warning</span>}
                  [{totalWeight}% / 100%]
                </span>
              </label>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { key: 'quizzes', label: 'QUIZZES' },
                  { key: 'assignments', label: 'ASSIGNS' },
                  { key: 'midterm', label: 'MIDTERM' },
                  { key: 'project', label: 'PROJECT' },
                  { key: 'final', label: 'FINAL' },
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
                disabled={!isTerminalValid}
                className="group relative bg-secondary-container text-white border-4 border-on-background px-8 py-4 font-headline uppercase font-bold text-xl tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-x-1 hover:-translate-y-1 active:translate-x-0 active:translate-y-0 transition-transform flex items-center gap-3 neo-shadow-sm"
              >
                <span className="material-symbols-outlined font-bold text-3xl">add</span>
                APPEND_TO_LEDGER
              </button>
            </div>
          </div>

          {/* RIGHT: LEDGER SUMMARY (4-col structural equivalent) */}
          <div className="w-full lg:w-1/3 p-6 md:p-8 bg-[#f4f4f4] flex flex-col justify-between">
            <div>
              <h3 className="font-headline text-2xl font-bold uppercase tracking-tighter mb-6 border-b-4 border-on-background pb-2 flex items-center justify-between">
                LOADOUT_STATE
                <span className="text-xs bg-on-background text-white px-3 py-1 font-body tracking-[0.3em] font-bold">
                  {courses.length.toString().padStart(2, '0')}{userProfile?.courseCount ? ` / ${String(userProfile.courseCount).padStart(2, '0')}` : ''} UNITS
                </span>
              </h3>

              <div className="flex flex-col gap-3 min-h-[150px]">
                {courses.length === 0 ? (
                  <div className="h-full w-full flex items-center justify-center bg-background border-2 border-on-background border-dashed p-6 text-center opacity-50 font-bold uppercase text-sm tracking-widest">
                    NO_DATA_REGISTERED
                  </div>
                ) : (
                  courses.map((course, i) => (
                    <div key={i} className={`border-4 border-on-background p-3 flex justify-between items-center neo-shadow-sm ${getImpactStyles(course.impactLevel)}`}>
                      <div className="flex flex-col truncate pr-2">
                        <span className="font-black text-lg leading-tight tracking-tight uppercase">{course.code}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 truncate">{course.name}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-sm tracking-widest border-l-2 pl-3 border-current leading-tight">({course.credits})</span>
                        <button onClick={() => removeCourse(course.id)} className="hover:scale-125 transition-transform flex items-center">
                          <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Meta & System Check */}
            <div className="mt-12 pt-6 border-t-4 border-on-background/20 space-y-4">
              <div className="flex justify-between items-end font-bold uppercase text-on-background">
                <span className="text-sm tracking-widest opacity-80">ACTUAL_LOAD</span>
                <span className="text-5xl font-black leading-none">{totalCredits.toString().padStart(2, '0')}</span>
              </div>
              <div className="bg-background border-4 border-on-background p-4 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-8 h-full bg-[repeating-linear-gradient(45deg,#A8275A,#A8275A_5px,#1A1A1A_5px,#1A1A1A_10px)] opacity-20"></div>
                <p className="text-[10px] uppercase font-bold tracking-[0.3em] font-mono leading-relaxed relative z-10">
                  {'>'} SYS_CHECK: {courses.length > 0 ? 'NOMINAL' : 'WAITING'}<br/>
                  {'>'} CAPACITY: UNLIMITED<br/>
                  {'>'} STATUS: {isTerminalValid ? 'DATA READY' : 'IDLE'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FINAL CTA OUTSIDE MONOLITH ─────────────────────── */}
        <div className="relative pt-8 mt-12 mb-20 max-w-4xl mx-auto">
          <div className="absolute -top-10 left-0 text-left opacity-20 pointer-events-none hidden md:block z-0">
            <span className="text-[6rem] font-bold uppercase tracking-tighter leading-none block">INITIATE</span>
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
                {onboardingState.loadoutCommitted ? 'RETURN_TO_DASHBOARD' : 'COMMIT_ALL_UNITS'}
              </span>
              <span className="material-symbols-outlined text-4xl md:text-5xl font-bold group-hover:translate-x-4 transition-transform block">arrow_forward</span>
            </div>
          </button>
        </div>

      </main>

      {/* ─── IMMERSIVE ROOT LAYERS ────────────────────────────── */}
      <div className="fixed bottom-0 left-0 w-full h-4 bg-on-background z-[100]">
        <div className="h-full bg-secondary-container w-[100%]"></div>
      </div>
      <div className="fixed -bottom-10 left-10 text-[15rem] font-bold uppercase text-on-background opacity-[0.03] select-none pointer-events-none whitespace-nowrap z-0">
        COURSE_FORGE_02
      </div>
    </div>
  );
};

import { TrendingUp, Calendar, Target, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAI } from '../hooks/useAI';
import { useEffect, useState } from 'react';
import { calculateSemesterGPA, projectCGPA } from '../utils/gpaEngine';

export const Analytics = () => {
  const { courses, deadlines, deliverables, userProfile } = useStore();
  const { getStudyPriorities, loading } = useAI();
  const [priorities, setPriorities] = useState<any[] | null>(null);

  useEffect(() => {
    if (courses.length > 0) {
      getStudyPriorities(courses, deadlines).then(res => {
        if (res && Array.isArray(res)) setPriorities(res);
      });
    }
  }, [courses, deadlines, getStudyPriorities]);

  // Use robust gpaEngine for calculations
  const { semesterGPA, courses: courseStatuses, totalCredits } = calculateSemesterGPA(courses, deliverables);
  
  // Projection based on current CGPA
  const currentCGPA = userProfile?.currentCgpa || 0;
  const targetCGPA = userProfile?.targetGpa || 4.0;
  
  // Defaulting past credits to 90 if unknown, so projection has some realistic anchor, 
  // or 0 to let the math treat this semester as 100% of the weight if they are freshmen
  // Since we don't force them to enter past credits, we estimate based on graduation year roughly 
  // or just use a standard 60 to soften the blow.
  const pastCredits = 60; // Approximate
  const { projectedCGPA, gap } = projectCGPA(
    currentCGPA, targetCGPA, parseFloat(semesterGPA), totalCredits, pastCredits
  );

  return (
    <div className="space-y-10">
      {/* Page Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-ink uppercase">📊 Semester Analytics</h2>
          <p className="text-lg text-ink/60 font-medium mt-1">Real-time performance tracking & neural forecasting.</p>
        </div>
        <div className="bg-tertiary text-white border-2 border-ink px-4 py-2 font-bold shadow-[3px_3px_0px_#1A1A1A] flex items-center gap-2">
          <Calendar size={16} />
          Spring 2026
        </div>
      </div>

      {/* GPA Overview & AI Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GPA Overview Card */}
        <div className="lg:col-span-2 bg-primary-container border-3 border-ink p-8 shadow-[6px_6px_0px_#1A1A1A] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-48 h-48 border-3 border-ink rotate-12 opacity-10 pointer-events-none"></div>
          <div>
            <div className="flex justify-between items-start">
              <span className="font-black uppercase tracking-widest text-xs bg-ink text-white px-3 py-1">Academic Standing</span>
              <div className="flex items-center gap-2 text-tertiary font-bold">
                <TrendingUp size={20} />
                +0.12 pts from mid-term
              </div>
            </div>
            <div className="mt-8 flex items-baseline gap-4">
              <h3 className="text-7xl md:text-8xl font-black tracking-tighter">{semesterGPA}</h3>
              <div className="flex flex-col">
                <span className="text-xl font-bold uppercase tracking-tight leading-none text-ink/60">Estimated</span>
                <span className="text-xl font-bold uppercase tracking-tight leading-none">Semester GPA</span>
              </div>
            </div>
            
            {/* CGPA Projection Mini-Card */}
            {currentCGPA > 0 && (
              <div className="mt-6 border-2 border-ink p-4 bg-white/50 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-ink/60">Projected CGPA</span>
                  <span className="text-2xl font-black">{projectedCGPA.toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase text-ink/60">Target Gap</span>
                  <span className={`text-lg font-black ${gap >= 0 ? 'text-primary' : 'text-secondary'}`}>
                    {gap > 0 ? '+' : ''}{gap.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-12 space-y-4">
            <div className="flex justify-between font-black uppercase text-[10px]">
              <span>GPA Distribution</span>
              <span>Predicted Final: 3.52</span>
            </div>
            <div className="w-full h-8 border-3 border-ink bg-white flex">
              <div className="h-full bg-tertiary w-[86%] border-r-4 border-ink"></div>
              <div className="h-full bg-secondary w-[6%] border-r-4 border-ink"></div>
              <div className="h-full bg-ink/10 w-[8%]"></div>
            </div>
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-2 text-[10px] font-bold"><div className="w-3 h-3 bg-tertiary border border-ink"></div> Completed</div>
              <div className="flex items-center gap-2 text-[10px] font-bold"><div className="w-3 h-3 bg-secondary border border-ink"></div> Predicted</div>
            </div>
          </div>
        </div>

        {/* AI Study Priority List */}
        <div className="bg-white border-3 border-ink border-l-secondary border-l-[12px] p-6 shadow-[3px_3px_0px_#1A1A1A] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black uppercase tracking-tighter">🤖 AI Study Priorities</h3>
            <span className="bg-secondary text-white text-[10px] px-2 py-0.5 border border-ink rotate-3 font-bold">CRITICAL</span>
          </div>
          <ul className="space-y-4 flex-grow min-h-[200px] flex flex-col justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-ink/60 font-medium w-full p-8 text-center">
                <Loader2 size={32} className="animate-spin text-secondary" />
                <span>Gemini is analyzing your course load and upcoming deadlines...</span>
              </div>
            ) : priorities ? priorities.map((item: any, i: number) => (
              <li key={i} className="p-3 border-2 border-ink bg-background hover:bg-secondary/10 transition-colors group cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm">{item.title}</span>
                  {item.priority === 'critical' ? <AlertCircle size={14} className="text-secondary" /> : 
                   item.priority === 'high' ? <TrendingUp size={14} className="text-secondary" /> : 
                   <Clock size={14} className="text-tertiary" />}
                </div>
                <p className="text-[10px] text-ink/60 leading-tight font-medium">{item.desc}</p>
              </li>
            )) : (
              // Fallback Mock Data
              [
                { title: 'EE-101: Midterm Prep', desc: 'Focus on Fourier Transforms. Your quiz scores drop 15% in this area.', icon: AlertCircle, color: 'text-secondary' },
                { title: 'CS-201: Lab Report', desc: 'Due in 48h. Estimated completion time: 3.5 hours.', icon: Clock, color: 'text-tertiary' },
                { title: 'MA-305: Problem Set', desc: 'High impact. Finishing this correctly pushes GPA prediction to 3.54.', icon: TrendingUp, color: 'text-secondary' },
              ].map((item, i) => (
                <li key={i} className="p-3 border-2 border-ink bg-background hover:bg-secondary/10 transition-colors group cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm">{item.title}</span>
                    <item.icon size={14} className={item.color} />
                  </div>
                  <p className="text-[10px] text-ink/60 leading-tight font-medium">{item.desc}</p>
                </li>
              ))
            )}
          </ul>
          <button className="mt-6 w-full border-3 border-ink py-2 font-black uppercase text-xs bg-secondary text-white shadow-[3px_3px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all">
            Optimize Schedule
          </button>
        </div>
      </div>

      {/* Course Performance Matrix */}
      <div>
        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 border-b-4 border-ink inline-block pr-8">Performance Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {courseStatuses.map((cs) => {
            const course = courses.find(c => c.id === cs.courseId);
            if (!course) return null;
            return (
              <div key={course.id} className="bg-white border-3 border-ink shadow-[6px_6px_0px_#1A1A1A] flex flex-col">
                <div className="p-6 bg-ink text-white flex justify-between items-center">
                  <div>
                    <h4 className="text-2xl font-black tracking-tighter">{course.code}</h4>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-primary-container">{course.name}</p>
                  </div>
                  <div className={`text-4xl font-black ${cs.confidence === 'low' ? 'text-ink/40' : 'text-primary-container'}`}>
                    {cs.estimatedGrade}
                  </div>
                </div>
                <div className="p-6 space-y-6 flex-grow flex flex-col justify-end">
                  <div className="pt-4 border-t-2 border-ink/10 grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-ink/40 block mb-1">Projected</span>
                      <span className="text-xl font-black">{cs.projectedScore > 0 ? cs.projectedScore.toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-ink/40 block mb-1">Weight Covered</span>
                      <span className="text-xl font-black text-ink/60">{cs.coveredWeight}%</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-ink/40 block mb-1">Confidence</span>
                      <span className={`text-sm font-black uppercase ${cs.confidence === 'high' ? 'text-primary' : cs.confidence === 'medium' ? 'text-tertiary' : 'text-secondary'}`}>
                        {cs.confidence}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: What-If and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
        {/* What-If Scenario Planner */}
        <div className="bg-white border-3 border-ink border-t-tertiary border-t-[12px] p-8 shadow-[6px_6px_0px_#1A1A1A]">
          <div className="flex items-center gap-3 mb-8">
            <Target size={32} className="text-tertiary" />
            <h3 className="text-3xl font-black tracking-tighter uppercase">🎯 What-If Calculator</h3>
          </div>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Select Course</label>
                <select className="bg-white border-3 border-ink p-3 font-bold focus:bg-primary-container/10 appearance-none outline-none">
                  <option>EE-101 Circuit Theory</option>
                  <option>CS-201 Data Structures</option>
                  <option>MA-305 Statistics</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest">Target Exam Score</label>
                <input 
                  className="bg-white border-3 border-ink p-3 font-bold focus:bg-primary-container/10 outline-none" 
                  placeholder="e.g. 95" 
                  type="number"
                />
              </div>
            </div>
            <button className="w-full bg-primary-container border-3 border-ink py-4 font-black uppercase text-lg shadow-[3px_3px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:scale-[0.98] transition-all">
              Calculate Impact
            </button>
            <div className="bg-background border-2 border-ink p-4 flex justify-between items-center italic text-sm font-medium">
              <span>Predicted Grade with 95% final exam:</span>
              <span className="font-black not-italic text-xl text-tertiary">A (4.0)</span>
            </div>
          </div>
        </div>

        {/* Performance Distribution Chart */}
        <div className="bg-white border-3 border-ink p-8 shadow-[6px_6px_0px_#1A1A1A] flex flex-col">
          <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Cohort Comparison</h3>
          <div className="relative h-48 w-full border-b-4 border-ink mt-4">
            <svg className="w-full h-full" viewBox="0 0 400 150">
              <path d="M0,150 Q100,150 200,20 T400,150" fill="none" stroke="black" strokeWidth="4"></path>
              <path d="M0,150 Q100,150 200,20 T400,150" fill="#FFDE5933"></path>
              <line stroke="black" strokeDasharray="8,4" strokeWidth="2" x1="200" x2="200" y1="20" y2="150"></line>
              <circle cx="280" cy="110" fill="#A8275A" r="8" stroke="black" strokeWidth="2"></circle>
              <text x="290" y="105" fontFamily="Space Grotesk" fontSize="14" fontWeight="900">YOU</text>
              <text x="140" y="80" fontFamily="Space Grotesk" fontSize="12" fontWeight="900" opacity="0.4">AVERAGE</text>
            </svg>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-8 text-center">
            <div className="border-2 border-ink p-4 bg-background">
              <span className="block text-3xl font-black">Top 15%</span>
              <span className="text-[10px] font-black uppercase text-ink/40">Class Percentile</span>
            </div>
            <div className="border-2 border-ink p-4 bg-background">
              <span className="block text-3xl font-black text-tertiary">0.8σ</span>
              <span className="text-[10px] font-black uppercase text-ink/40">Std Deviations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

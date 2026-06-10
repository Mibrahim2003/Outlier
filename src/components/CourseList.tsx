import { Link } from 'react-router-dom';
import { BookOpen, AlertCircle, TrendingUp } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getThemeBgClass, getThemeBottomBorderClass } from '../utils/impactStyles';

export const CourseList = () => {
  const { courses } = useStore();

  return (
    <div className="space-y-8 pb-20">
      <header className="bg-primary-container border-3 border-ink p-8 md:p-10 shadow-[6px_6px_0px_#1A1A1A]">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-2">My Courses</h1>
        <p className="text-xl font-bold opacity-80 uppercase tracking-tight">Overview of your academic workload</p>
      </header>

      {courses.length === 0 ? (
        <div className="bg-white border-3 border-ink p-12 shadow-[6px_6px_0px_#1A1A1A] text-center">
          <BookOpen className="mx-auto mb-4 opacity-40" size={48} />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">No Courses Found</h2>
          <p className="font-bold opacity-60">You haven't added any courses yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link 
              key={course.id} 
              to={`/courses/${course.id}`}
              className={`bg-white border-3 border-ink p-6 flex flex-col gap-4 shadow-[6px_6px_0px_#1A1A1A] hover:shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[4px] hover:translate-y-[4px] transition-all cursor-pointer border-b-8 ${getThemeBottomBorderClass(course.themeColor)}`}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{course.code}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">{course.name}</p>
                </div>
                <div className="bg-ink text-white px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                  {course.credits} CR
                </div>
              </div>

              <div className="flex-1 mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Grade Progress</span>
                    <span>{course.gradeProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-background border-2 border-ink overflow-hidden">
                    <div 
                      className={`h-full ${getThemeBgClass(course.themeColor)}`} 
                      style={{ width: `${course.gradeProgress}%` }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-end pt-4 border-t-2 border-ink border-dashed">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Impact</p>
                    <div className="flex items-center gap-1 text-xs font-bold uppercase">
                      {course.impactLevel === 'heavy' && <AlertCircle size={14} className="text-secondary" />}
                      {course.impactLevel === 'standard' && <TrendingUp size={14} className="text-primary-container" />}
                      {course.impactLevel === 'minimal' && <BookOpen size={14} />}
                      {course.impactLevel}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Target</p>
                    <p className="text-2xl font-black leading-none">{course.grade || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

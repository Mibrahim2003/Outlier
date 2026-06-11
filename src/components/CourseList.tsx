import { Link } from 'react-router-dom';
import { BookOpen, AlertCircle, TrendingUp } from 'lucide-react';
import { useCourses } from '../domain/courses/useCourses';
import { getThemeBgClass, getThemeBottomBorderClass } from '../utils/impactStyles';
import { Card, Badge } from './ui';

export const CourseList = () => {
  const { courses } = useCourses();

  return (
    <div className="space-y-8 pb-20">
      <Card shadow="md" className="bg-primary-container p-8 md:p-10">
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-2">My Courses</h1>
        <p className="text-xl font-bold opacity-80 uppercase tracking-tight">Overview of your academic workload</p>
      </Card>

      {courses.length === 0 ? (
        <Card shadow="md" className="p-12 text-center">
          <BookOpen className="mx-auto mb-4 opacity-40" size={48} />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">No Courses Found</h2>
          <p className="font-bold opacity-60">You haven't added any courses yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link 
              key={course.id} 
              to={`/courses/${course.id}`}
            >
              <Card 
                shadow="md" interactive 
                className={`p-6 flex flex-col gap-4 h-full border-b-8 ${getThemeBottomBorderClass(course.themeColor)}`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">{course.code}</h3>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60">{course.name}</p>
                  </div>
                  <Badge>{course.credits} CR</Badge>
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
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

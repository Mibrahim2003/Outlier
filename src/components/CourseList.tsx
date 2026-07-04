import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, AlertCircle, TrendingUp, Plus } from 'lucide-react';
import { useCourses } from '../domain/courses/useCourses';
import { useCourseProgress } from '../hooks/useCourseProgress';
import { getThemeBgClass, getThemeBottomBorderClass } from '../utils/impactStyles';
import { Card, Badge, Button } from './ui';
import { CourseFormModal } from './CourseFormModal';

export const CourseList = () => {
  const { courses, addCourse } = useCourses();
  const courseProgress = useCourseProgress(courses);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);

  // Handle ?action=add query param from Dashboard navigation
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    if (searchParams.get('action') === 'add') {
      timeoutId = setTimeout(() => {
        setShowAddModal(true);
        // Clear the param so it doesn't re-trigger
        setSearchParams({}, { replace: true });
      }, 0);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [searchParams, setSearchParams]);

  return (
    <div className="space-y-8 pb-20">
      <Card shadow="md" className="bg-primary-container p-8 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-2">My Courses</h1>
          <p className="text-xl font-bold opacity-80 uppercase tracking-tight">Overview of your academic workload</p>
        </div>
        <Button variant="ink" onClick={() => setShowAddModal(true)} className="flex items-center gap-2 shrink-0">
          <Plus size={16} /> Add Course
        </Button>
      </Card>

      {courses.length === 0 ? (
        <Card shadow="md" className="p-12 text-center">
          <BookOpen className="mx-auto mb-4 opacity-40" size={48} />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">No Courses Found</h2>
          <p className="font-bold opacity-60 mb-6">You haven't added any courses yet.</p>
          <Button onClick={() => setShowAddModal(true)}>Add Your First Course</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const status = courseProgress.get(course.id);
            const progress = status?.progress ?? 0;
            return (
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
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-background border-2 border-ink overflow-hidden">
                      <div
                        className={`h-full ${getThemeBgClass(course.themeColor)}`}
                        style={{ width: `${progress}%` }}
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
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Est. Grade</p>
                      <p className="text-2xl font-black leading-none">{status?.estimatedGrade ?? 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <CourseFormModal
          onClose={() => setShowAddModal(false)}
          onSubmit={(course) => addCourse(course)}
        />
      )}
    </div>
  );
};

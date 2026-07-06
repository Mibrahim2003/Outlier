import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCourses } from '../domain/courses/useCourses';
import { useCourseProgress } from '../hooks/useCourseProgress';
import { Card, Button, CourseCard, ZeeMascot } from './ui';
import { CourseFormModal } from './CourseFormModal';

// Zee's short declaratives (see public/brand/zee/README.md). Rotates daily so
// the banner stays alive without any state or randomness within a session.
const ZEE_QUOTES = [
  'Average is a choice.',
  'Weights first. Panic never.',
  'See you at +2σ.',
  'The curve is not your friend. Beat it.',
];

const dailyZeeQuote = (): string => {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  return ZEE_QUOTES[dayOfYear % ZEE_QUOTES.length];
};

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

  const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);

  return (
    <div className="space-y-12 pb-20">
      {/* Header Banner — same visual grammar as the Dashboard welcome banner */}
      <div className="relative border-[4px] border-ink bg-[#FFE8A3] shadow-[8px_8px_0px_#1A1A1A] p-8 md:p-12 overflow-hidden">
        <div className="flex items-center justify-between gap-8">
          <div className="space-y-5 min-w-0">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-tight flex flex-wrap items-center gap-x-3 gap-y-4">
              <span>My</span>
              <span className="inline-block bg-white px-4 py-1 border-[4px] border-ink shadow-[4px_4px_0px_#1A1A1A] font-black -rotate-2 uppercase">
                Courses
              </span>
            </h1>

            {courses.length > 0 && (
              <p className="text-base md:text-lg font-bold text-ink flex flex-wrap items-center gap-x-2 gap-y-3">
                <span>You're carrying</span>
                <span className="inline-block bg-[#68D391] px-3 py-1 border-[3px] border-ink shadow-[3px_3px_0px_#1A1A1A] font-black rotate-1">
                  <span className="text-white px-1.5 py-0.5 bg-ink mr-2">{courses.length}</span>
                  {courses.length === 1 ? 'course' : 'courses'}
                </span>
                <span>worth</span>
                <span className="inline-block bg-[#A2D9F9] px-3 py-1 border-[3px] border-ink shadow-[3px_3px_0px_#1A1A1A] font-black -rotate-1">
                  {totalCredits} credit hours
                </span>
                <span>this semester.</span>
              </p>
            )}

            <Button variant="ink" onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
              <Plus size={16} /> Add Course
            </Button>
          </div>

          {/* Zee, on brand-ambassador duty */}
          <div className="hidden md:flex flex-col items-center gap-3 shrink-0 pr-2">
            <span className="inline-block bg-white px-3 py-1.5 border-[3px] border-ink shadow-[3px_3px_0px_#1A1A1A] font-black text-xs uppercase tracking-widest rotate-2">
              {dailyZeeQuote()}
            </span>
            <ZeeMascot variant="locked-in" size={120} />
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card shadow="md" className="p-12 text-center">
          <ZeeMascot variant="study" size={112} className="mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">No Courses Yet</h2>
          <p className="font-bold opacity-60 mb-6">Average is a choice. Add your first course and start climbing.</p>
          <Button onClick={() => setShowAddModal(true)}>Add Your First Course</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progress={courseProgress.get(course.id)?.progress ?? 0}
              estimatedGrade={courseProgress.get(course.id)?.estimatedGrade ?? 'N/A'}
            />
          ))}
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

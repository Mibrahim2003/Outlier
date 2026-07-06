import { Link } from 'react-router-dom';
import { AlertCircle, BookOpen, TrendingUp } from 'lucide-react';
import { Course } from '../../types';
import { getThemeBgClass } from '../../utils/impactStyles';

const IMPACT_META = {
  heavy: { Icon: AlertCircle, className: 'text-secondary' },
  standard: { Icon: TrendingUp, className: 'text-tertiary' },
  minimal: { Icon: BookOpen, className: 'text-ink' },
} as const;

export interface CourseCardProps {
  course: Course;
  /** Share (0–100) of the grade weight graded so far. */
  progress: number;
  /**
   * Projected letter grade. When provided the card grows a footer row with the
   * impact level and grade (CourseList); omit for the compact Dashboard card.
   */
  estimatedGrade?: string;
}

/**
 * The one course card. Dashboard and CourseList both render this so the
 * neo-brutalist treatment (theme color floods the card, white code chip,
 * ink progress bar, hard 8px shadow) can never drift between pages.
 */
export const CourseCard = ({ course, progress, estimatedGrade }: CourseCardProps) => {
  const impact = IMPACT_META[course.impactLevel] ?? IMPACT_META.standard;

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

          {/* Footer — impact + projected grade (CourseList only) */}
          {estimatedGrade !== undefined && (
            <div className="flex-shrink-0 flex justify-between items-center pt-3 border-t-[3px] border-ink border-dashed">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-ink uppercase tracking-widest">
                <impact.Icon size={14} className={impact.className} strokeWidth={3} />
                {course.impactLevel}
              </div>
              <div className="bg-white border-[3px] border-ink px-3 py-1 font-black text-ink text-base leading-none">
                {estimatedGrade}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

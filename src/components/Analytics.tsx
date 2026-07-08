import { TrendingUp, TrendingDown, Minus, Calendar, Target, AlertCircle, Clock, Loader2, ChevronDown, ChevronUp, Plus, Check, Zap, Eye, EyeOff, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProfile } from '../domain/profile/useProfile';
import { useCourses } from '../domain/courses/useCourses';
import { useDeadlines } from '../domain/deadlines/useDeadlines';
import { useDeliverables } from '../domain/deliverables/useDeliverables';
import { useTodos } from '../domain/todos/useTodos';
import { useCalendar } from '../domain/calendar/useCalendar';
import { useAI } from '../hooks/useAI';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { calculateSemesterGPA, projectCGPA, estimateGrade, calculateCohortStanding, deriveWeakTopics, topPercentOf, CATEGORY_LABELS } from '../utils/gpaEngine';
import { isDateInRange, toLocalISODate } from '../utils/dateUtils';
import { getThemeBgClass } from '../utils/impactStyles';
import { Todo } from '../types';
import { Card, Button, Badge, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ZeeMascot } from './ui';
import { DistributionStrip, ZTrendSparkline, zeeForStanding } from './charts';

/** Extract the semester number from values like "3", "SEMESTER 03", or "Semester 3". */
const semesterToNumber = (semester?: string): number => {
  const n = parseInt(String(semester ?? '').replace(/\D/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/**
 * Placeholder rendered in place of a real GPA/CGPA number while it is hidden.
 * Product rule (CLAUDE.md → "GPA & CGPA"): GPA/CGPA is private — kept hidden by
 * default behind an explicit reveal action and never rendered on load. We render
 * this mask *instead of* the value (conditional render, not a CSS blur) so the real
 * number is genuinely absent from the DOM until the user reveals it. `select-none`
 * keeps it uncopyable and `aria-hidden` keeps it out of the accessibility tree.
 * Inherits its parent's font size/weight so revealing causes no layout shift.
 */
const GpaMask = ({ className = '' }: { className?: string }) => (
  <span className={`select-none ${className}`} aria-hidden="true">•.••</span>
);

/** Small uppercase overline used for every secondary label on this page. */
const Overline = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <p className={`text-[10px] font-black uppercase tracking-widest text-ink/50 ${className}`}>{children}</p>
);

/** KPI stat tile: label → value → caption. The value slot carries any masking. */
const StatTile = ({ label, value, caption, className = '' }: { label: string; value: ReactNode; caption: ReactNode; className?: string }) => (
  <div className={`p-5 ${className}`}>
    <Overline>{label}</Overline>
    <span className="text-3xl md:text-4xl font-black tracking-tighter block mt-1">{value}</span>
    <span className="text-[11px] font-bold text-ink/50 block mt-1 leading-snug">{caption}</span>
  </div>
);

/** Section heading grammar shared by every zone below the header. */
const SectionHeader = ({ overline, title, sub }: { overline: string; title: string; sub?: string }) => (
  <div className="mb-6">
    <Overline>{overline}</Overline>
    <h3 className="text-2xl font-black uppercase tracking-tighter border-b-4 border-ink inline-block pr-8 mt-1">{title}</h3>
    {sub && <p className="text-sm text-ink/60 font-medium mt-2">{sub}</p>}
  </div>
);

export const Analytics = () => {
  const { userProfile } = useProfile();
  const { courses } = useCourses();
  const { deadlines } = useDeadlines();
  const { deliverables } = useDeliverables();
  const { addTodo } = useTodos();
  const { academicCalendar } = useCalendar();
  const { getStudyPriorities } = useAI();

  const { data: priorities, isLoading: loading } = useQuery({
    queryKey: ['ai-priorities', courses, deadlines],
    queryFn: () => getStudyPriorities(courses, deadlines),
    staleTime: 1000 * 60 * 60, // cache for an hour
    enabled: courses.length > 0,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedPastCredits, setAdvancedPastCredits] = useState<string>('');

  // GPA/CGPA is private: hidden by default, shown only after an explicit reveal, never on load
  // (CLAUDE.md → "GPA & CGPA"). This flag is intentionally ephemeral — it is NOT persisted, so
  // every fresh load and every remount of Analytics starts hidden.
  const [gpaRevealed, setGpaRevealed] = useState(false);

  // What-If Calculator state
  const [whatIfCourseId, setWhatIfCourseId] = useState<string>('');
  const [whatIfScore, setWhatIfScore] = useState<string>('');
  const [whatIfResult, setWhatIfResult] = useState<{ grade: string; gpc: number } | null>(null);

  // Optimize Schedule modal state
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [taskApprovals, setTaskApprovals] = useState<{ text: string; checked: boolean; date: string }[]>([]);

  // Use robust gpaEngine for calculations
  const { semesterGPA, courses: courseStatuses, totalCredits } = calculateSemesterGPA(courses, deliverables, userProfile?.gradingScale);

  // Cohort standing per course — every number comes from the engine, never
  // re-derived here. Standing is NOT GPA, so it does not sit behind the reveal
  // (the privacy rule covers GPA/CGPA values only).
  const standingByCourse = new Map(
    courses.map(c => [c.id, calculateCohortStanding(c, deliverables.filter(d => d.courseId === c.id))])
  );
  const coursesWithCohortData = courses.filter(c => standingByCourse.get(c.id)?.hasData);
  const semesterAvgPercentile = coursesWithCohortData.length > 0
    ? coursesWithCohortData.reduce((sum, c) => sum + standingByCourse.get(c.id)!.percentile, 0) / coursesWithCohortData.length
    : null;
  const zee = zeeForStanding(semesterAvgPercentile !== null, semesterAvgPercentile ?? 0);

  // Deterministic weak topics across all courses, worst first.
  const weakTopicRows = courses
    .flatMap(c =>
      deriveWeakTopics(c, deliverables.filter(d => d.courseId === c.id))
        .map(wt => ({ ...wt, courseCode: c.code }))
    )
    .sort((a, b) => a.z - b.z);

  // Deliverable ids whose "add study task" button was already used this visit.
  const [addedWeakTopicIds, setAddedWeakTopicIds] = useState<Set<string>>(new Set());

  const handleAddWeakTopicTask = (row: typeof weakTopicRows[number]) => {
    const scope = row.lectureRange ? ` (Lectures ${row.lectureRange})` : row.topics ? ` — ${row.topics}` : '';
    addTodo({
      id: crypto.randomUUID(),
      text: `Review ${row.courseCode} ${row.title}${scope}`,
      completed: false,
      dueDate: toLocalISODate(),
      createdAt: new Date().toISOString(),
      course: row.courseCode,
    });
    setAddedWeakTopicIds(prev => new Set(prev).add(row.deliverableId));
  };

  // Projection based on current CGPA
  const currentCGPA = userProfile?.currentCgpa || 0;
  const targetCGPA = userProfile?.targetGpa || 4.0;

  // Smart pastCredits: derive from semester number × avg credit load
  // If user provided advanced override, use that instead
  const estimatedPastCredits = (() => {
    if (advancedPastCredits && !isNaN(parseInt(advancedPastCredits))) {
      return parseInt(advancedPastCredits);
    }
    // Past semesters × average 15 credit hours per semester. Robust to both the
    // numeric ("3") and legacy ("SEMESTER 03") stored formats.
    const semNum = semesterToNumber(userProfile?.semester);
    return Math.max(0, (semNum - 1) * 15);
  })();

  const { projectedCGPA, requiredSemesterGPA } = projectCGPA(
    currentCGPA, targetCGPA, parseFloat(semesterGPA), totalCredits, estimatedPastCredits
  );

  // Average weight coverage across all courses
  const avgWeightCoverage = (() => {
    const coursesWithData = courseStatuses.filter(cs => cs.coveredWeight > 0);
    if (coursesWithData.length === 0) return 0;
    return Math.round(coursesWithData.reduce((sum, cs) => sum + cs.coveredWeight, 0) / coursesWithData.length);
  })();

  // Active semester from calendar
  const activeSemester = (() => {
    if (!academicCalendar?.semesters?.length) return null;
    const now = new Date();
    return academicCalendar.semesters.find(s =>
      isDateInRange(now, new Date(s.startDate), new Date(s.endDate))
    ) || academicCalendar.semesters[0] || null;
  })();

  // What-If Calculator logic
  const handleWhatIf = () => {
    if (!whatIfCourseId || !whatIfScore) return;
    const course = courses.find(c => c.id === whatIfCourseId);
    if (!course) return;
    const cs = courseStatuses.find(s => s.courseId === whatIfCourseId);
    if (!cs) return;

    const score = parseFloat(whatIfScore);
    if (isNaN(score)) return;

    // Calculate: current weighted + hypothetical remaining weight at this score
    const remainingWeight = 100 - cs.coveredWeight;
    const newWeightedScore = cs.weightedScore + (score / 100) * remainingWeight;
    const newProjectedScore = newWeightedScore; // Now out of 100

    const result = estimateGrade(newProjectedScore, 100, userProfile?.gradingScale);
    setWhatIfResult(result);
  };

  // Optimize Schedule: create approval tasks from AI priorities
  const openOptimizeModal = () => {
    if (!priorities || priorities.length === 0) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = toLocalISODate(tomorrow);

    setTaskApprovals((priorities as any[]).map((p: any) => ({
      text: p.title || p.task || 'Study Task',
      checked: true,
      date: dateStr,
    })));
    setShowOptimizeModal(true);
  };

  const handleAddApprovedTasks = () => {
    const approved = taskApprovals.filter(t => t.checked);
    approved.forEach(task => {
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        text: task.text,
        completed: false,
        dueDate: task.date,
        createdAt: new Date().toISOString(),
      };
      addTodo(newTodo);
    });
    setShowOptimizeModal(false);
  };

  // Grade sensitivity for advanced analytics
  const gradeSensitivity = courseStatuses.map(cs => {
    const course = courses.find(c => c.id === cs.courseId);
    if (!course || cs.coveredWeight >= 100) return null;

    const remainingWeight = 100 - cs.coveredWeight;
    const scenarios = [60, 70, 80, 90, 100].map(finalScore => {
      const newWeighted = cs.weightedScore + (finalScore / 100) * remainingWeight;
      const grade = estimateGrade(newWeighted, 100, userProfile?.gradingScale);
      return { finalScore, ...grade };
    });

    return { courseId: cs.courseId, code: course.code, name: course.name, scenarios, remainingWeight };
  }).filter(Boolean);

  return (
    <div className="space-y-12">
      {/* ── Standing banner — same visual grammar as the Dashboard/Courses welcome banners: hard border, hard shadow, rotated word-chip, Zee on ambassador duty ── */}
      <div className="relative border-4 border-ink bg-primary-container shadow-[8px_8px_0px_#1A1A1A] p-8 md:p-12 overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-4 min-w-0 flex-1">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-ink tracking-tighter leading-tight flex flex-wrap items-center gap-x-3 gap-y-2">
                <span>Where you</span>
                <span className="inline-block bg-white px-4 py-1 border-4 border-ink shadow-[4px_4px_0px_#1A1A1A] font-black -rotate-2 uppercase">
                  Stand
                </span>
              </h1>
              <Badge variant="tertiary" size="lg" className="flex items-center gap-2 shrink-0">
                <Calendar size={16} />
                {activeSemester?.name ?? (userProfile?.semester ? `Semester ${semesterToNumber(userProfile?.semester)}` : 'Current Semester')}
              </Badge>
            </div>

            {semesterAvgPercentile !== null ? (
              <p className="text-base md:text-lg font-bold text-ink flex flex-wrap items-center gap-x-2 gap-y-3">
                <span>You're averaging</span>
                <span className="inline-block bg-tertiary text-white px-3 py-1 border-3 border-ink shadow-[3px_3px_0px_#1A1A1A] font-black rotate-1">
                  Top {topPercentOf(semesterAvgPercentile)}%
                </span>
                <span>of class, averaged across {coursesWithCohortData.length} course{coursesWithCohortData.length === 1 ? '' : 's'} with class data.</span>
              </p>
            ) : courses.length === 0 ? (
              <p className="text-base md:text-lg font-bold text-ink">
                Add your first course and Zee starts tracking your curve.
              </p>
            ) : (
              <p className="text-base md:text-lg font-bold text-ink">
                Upload a class marksheet on any graded quiz or exam (from a course page) to unlock your standing.
              </p>
            )}

            <p className="text-sm font-bold text-ink/70 italic">"{zee.line}" — Zee</p>

            {courses.length === 0 && (
              <Link to="/courses?action=add" className="inline-block">
                <Button variant="ink" size="sm" className="flex items-center gap-2">
                  <Plus size={14} /> Add Your First Course
                </Button>
              </Link>
            )}
          </div>

          {/* Zee, reacting to the real number this banner is about */}
          <div className="hidden md:flex flex-col items-center gap-3 shrink-0">
            <ZeeMascot variant={zee.variant} size={zee.variant === 'on-curve' ? 144 : 100} />
          </div>
        </div>
      </div>

      {/* ── Zone 1 · GPA — private, masked until the explicit reveal ────── */}
      <Card shadow="md" className="p-0">
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <Overline>GPA · private — hidden until you reveal it</Overline>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGpaRevealed(v => !v)}
            aria-pressed={gpaRevealed}
            aria-label={gpaRevealed ? 'Hide GPA and CGPA' : 'Reveal GPA and CGPA'}
            className="flex items-center gap-1.5 shrink-0"
          >
            {gpaRevealed ? <EyeOff size={14} strokeWidth={3} /> : <Eye size={14} strokeWidth={3} />}
            {gpaRevealed ? 'Hide' : 'Reveal'}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Semester GPA"
            value={gpaRevealed ? semesterGPA : <GpaMask className="text-ink/30" />}
            caption="estimated from graded work so far"
            className="lg:border-r-2 sm:border-r-2 border-b-2 lg:border-b-0 border-ink/10"
          />
          <StatTile
            label="Target CGPA"
            value={gpaRevealed ? targetCGPA.toFixed(2) : <GpaMask className="text-ink/30" />}
            caption="the goal you set"
            className="lg:border-r-2 border-b-2 lg:border-b-0 border-ink/10"
          />
          <StatTile
            label="Projected CGPA"
            value={currentCGPA > 0 ? (gpaRevealed ? projectedCGPA.toFixed(2) : <GpaMask className="text-ink/30" />) : '—'}
            caption={currentCGPA > 0 ? `based on ~${estimatedPastCredits} past credit hrs` : 'set your current CGPA in Settings'}
            className="sm:border-r-2 border-b-2 sm:border-b-0 border-ink/10"
          />
          <StatTile
            label="Required GPA"
            value={currentCGPA > 0 ? (gpaRevealed ? requiredSemesterGPA.toFixed(2) : <GpaMask className="text-ink/30" />) : '—'}
            caption={currentCGPA > 0 ? 'this semester to hit your target' : 'set your current CGPA in Settings'}
          />
        </div>

        {/* Coursework-graded meter — how firm every estimate above is */}
        <div className="border-t-3 border-ink p-5">
          <div className="flex justify-between font-black uppercase text-[10px] mb-2">
            <span>Coursework graded</span>
            <span>{avgWeightCoverage}%</span>
          </div>
          <div className="w-full h-6 border-3 border-ink bg-white flex overflow-hidden">
            <div className="h-full bg-tertiary transition-all duration-500" style={{ width: `${avgWeightCoverage}%` }}></div>
            <div className="h-full bg-ink/10" style={{ width: `${100 - avgWeightCoverage}%` }}></div>
          </div>
          <p className="text-[11px] font-bold text-ink/50 mt-2">
            Grade estimates firm up as more of your coursework is graded.
          </p>
        </div>
      </Card>

      {/* ── Zone 2 · Which courses drive it? ────────────────────── */}
      {courses.length > 0 && (
        <div>
          <SectionHeader
            overline="Course by course"
            title="Course Standing"
            sub="You against the class in every course — the marker on each curve is you."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {courseStatuses.map((cs) => {
              const course = courses.find(c => c.id === cs.courseId);
              if (!course) return null;
              const standing = standingByCourse.get(course.id);
              // Z trend: latest deliverable's Z vs the one before it (date order).
              const trendPoints = standing?.hasData ? standing.deliverables : [];
              const trendDelta = trendPoints.length >= 2
                ? trendPoints[trendPoints.length - 1].z - trendPoints[trendPoints.length - 2].z
                : null;
              const gap = standing?.hasData ? standing.gapToTopper : null;
              return (
                <Card key={course.id} shadow="md" className="flex flex-col">
                  <div className={`p-5 border-b-3 border-ink flex justify-between items-start gap-4 ${getThemeBgClass(course.themeColor)}`}>
                    <div>
                      <h4 className="text-2xl font-black tracking-tighter uppercase">{course.code}</h4>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-ink/60">{course.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-4xl font-black leading-none block">
                        {cs.coveredWeight > 0 ? cs.estimatedGrade : '—'}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-ink/60 block mt-1">
                        {cs.coveredWeight > 0 ? `estimated · ${cs.coveredWeight}% graded` : 'no grades yet'}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-4 flex-grow flex flex-col">
                    {standing?.hasData ? (
                      <>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span className="bg-ink text-white px-2 py-1 text-[10px] font-black uppercase">
                            Top {topPercentOf(standing.percentile)}% of class
                          </span>
                          {trendDelta !== null && (
                            <div
                              className="flex items-center gap-2"
                              title={`Standing vs class on the latest graded item moved ${trendDelta >= 0 ? 'up' : 'down'} ${Math.abs(trendDelta).toFixed(2)}σ from the one before`}
                            >
                              <span className="flex items-center gap-1 text-[10px] font-black uppercase">
                                {trendDelta > 0.1 ? <TrendingUp size={12} className="text-tertiary" /> :
                                 trendDelta < -0.1 ? <TrendingDown size={12} className="text-secondary" /> :
                                 <Minus size={12} className="opacity-60" />}
                                {trendDelta > 0.1 ? 'Climbing' : trendDelta < -0.1 ? 'Slipping' : 'Steady'}
                              </span>
                              <ZTrendSparkline points={trendPoints} themeColor={course.themeColor} />
                            </div>
                          )}
                        </div>

                        <DistributionStrip standing={standing} themeColor={course.themeColor} />

                        <div className="grid grid-cols-3 gap-2 pt-3 border-t-2 border-ink/10">
                          <div>
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink/50">
                              <span className={`w-3 h-3 border-2 border-ink shrink-0 ${getThemeBgClass(course.themeColor)}`}></span> You
                            </span>
                            <span className="text-lg font-black block mt-0.5">
                              {standing.yourPct !== null ? standing.yourPct.toFixed(1) + '%' : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink/50">
                              <span className="w-3 h-3 border-2 border-ink bg-ink/20 shrink-0"></span> Class avg
                            </span>
                            <span className="text-lg font-black block mt-0.5">
                              {standing.classAvgPct !== null ? standing.classAvgPct.toFixed(1) + '%' : '—'}
                            </span>
                          </div>
                          <div>
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink/50">
                              <span className="w-3 h-3 border-2 border-ink bg-secondary shrink-0"></span> Topper
                            </span>
                            <span className="text-lg font-black block mt-0.5">
                              {standing.topperPct !== null ? standing.topperPct.toFixed(1) + '%' : '—'}
                            </span>
                          </div>
                        </div>

                        {gap !== null && gap.points > 0.05 && (
                          <p className="text-sm font-bold leading-snug border-2 border-ink bg-background p-3">
                            <span className="font-black text-secondary">{gap.points.toFixed(1)} weighted points</span> behind the topper
                            {gap.topCategory && (
                              <> — most of it in {CATEGORY_LABELS[gap.topCategory.category]} ({gap.topCategory.weight}% of your grade)</>
                            )}.
                          </p>
                        )}
                        {gap !== null && gap.points <= 0.05 && (
                          <p className="text-sm font-bold leading-snug border-2 border-ink bg-background p-3">
                            Level with the topper on everything graded so far.
                          </p>
                        )}

                        <p className="text-[10px] font-bold uppercase tracking-widest text-ink/40 mt-auto">
                          Based on {standing.statsCoveredWeight}% of your grade
                          {standing.minSampleSize !== null && <> · smallest sample: {standing.minSampleSize} scores</>}
                        </p>
                      </>
                    ) : (
                      <div className="border-2 border-dashed border-ink p-5 text-center space-y-2 my-auto">
                        <ZeeMascot variant="big-brain" size={56} className="mx-auto" />
                        <p className="text-sm font-bold">No class data yet.</p>
                        <p className="text-xs font-medium text-ink/60">
                          Upload a class marksheet on a graded item to unlock this course's standing.
                        </p>
                        <Link to={`/courses/${course.id}`} className="inline-block text-xs font-black uppercase tracking-widest underline underline-offset-4">
                          Open course
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Zone 3 · What do I do about it? ─────────────────────── */}
      {courses.length > 0 && (
        <div>
          <SectionHeader
            overline="What to do about it"
            title="Action Plan"
            sub="What to study next — straight from your marks, plus what the AI flags from your workload."
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Study Plan: deterministic weak topics first, AI narrative second */}
            <Card shadow="md" className="lg:col-span-2 border-t-secondary border-t-[12px]">
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ZeeMascot variant="study" size={40} />
                    <BookOpen size={18} className="text-secondary" />
                    <h3 className="text-lg font-black uppercase tracking-tighter">Weak Topics</h3>
                    <Overline>· worst first</Overline>
                  </div>
                  {weakTopicRows.length > 0 ? (
                    <div className="space-y-3">
                      {weakTopicRows.map(row => (
                        <div key={row.deliverableId} className="border-2 border-ink bg-background p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm">{row.courseCode}</span>
                              <span className="font-bold text-sm">{row.title}</span>
                              {row.lectureRange && (
                                <span className="text-xs font-bold text-ink/60 italic">Lectures {row.lectureRange}</span>
                              )}
                              {!row.lectureRange && row.topics && (
                                <span className="text-xs font-bold text-ink/60 italic">{row.topics}</span>
                              )}
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-secondary mt-1">
                              Z {row.z.toFixed(1)} · bottom {Math.min(99, Math.max(1, Math.round(row.percentile)))}% of class on this one
                            </p>
                          </div>
                          {addedWeakTopicIds.has(row.deliverableId) ? (
                            <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-tertiary shrink-0">
                              <Check size={12} strokeWidth={4} /> Task added
                            </span>
                          ) : (
                            <Button
                              onClick={() => handleAddWeakTopicTask(row)}
                              variant="outline" size="xs"
                              className="flex items-center gap-1 shrink-0"
                            >
                              <Plus size={12} /> Add study task
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : coursesWithCohortData.length > 0 ? (
                    <div className="border-2 border-dashed border-ink p-6 text-center space-y-2">
                      <ZeeMascot variant="smug" size={56} className="mx-auto" />
                      <p className="text-sm font-bold">
                        No weak topics detected — you're at or above the class average on everything measured so far.
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-ink p-6 text-center space-y-1">
                      <p className="text-sm font-bold">No class data yet.</p>
                      <p className="text-sm font-medium text-ink/60">
                        Upload a class marksheet on a graded quiz or exam (from any course page) and weak topics will show up here automatically.
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-ink/10 pt-5">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <ZeeMascot variant="big-brain" size={40} />
                      <h3 className="text-lg font-black uppercase tracking-tighter">AI Study Priorities</h3>
                    </div>
                    <Button
                      onClick={openOptimizeModal}
                      disabled={!priorities || priorities.length === 0}
                      variant="secondary" size="xs"
                      className="flex items-center gap-1.5"
                    >
                      <Zap size={12} />
                      Add to Calendar
                    </Button>
                  </div>
                  {loading ? (
                    <div className="flex flex-col items-center gap-3 text-ink/60 font-medium w-full p-6 text-center">
                      <Loader2 size={28} className="animate-spin text-secondary" />
                      <span className="text-sm">Analyzing your course load and upcoming deadlines...</span>
                    </div>
                  ) : priorities && priorities.length > 0 ? (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {priorities.map((item: any, i: number) => (
                        <li key={i} className="p-3 border-2 border-ink bg-background">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <span className="font-bold text-sm">{item.title || item.task}</span>
                            {item.priority === 'critical' ? <AlertCircle size={14} className="text-secondary shrink-0" /> :
                             item.priority === 'high' ? <TrendingUp size={14} className="text-secondary shrink-0" /> :
                             <Clock size={14} className="text-tertiary shrink-0" />}
                          </div>
                          <p className="text-[10px] text-ink/60 leading-tight font-medium">{item.desc || item.reason}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-ink/40 font-medium w-full p-6 text-center">
                      <AlertCircle size={24} />
                      <span className="text-sm">Add courses and deadlines to get AI-powered study priorities.</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Grade Simulator — the What-If calculator */}
            <Card shadow="md" className="border-t-tertiary border-t-[12px]">
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ZeeMascot variant="pencil" size={40} />
                    <Target size={18} className="text-tertiary" />
                    <h3 className="text-xl font-black tracking-tighter uppercase">Grade Simulator</h3>
                  </div>
                  <p className="text-sm text-ink/60 font-medium">
                    If you score X% on everything left, what grade lands?
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Select Course</label>
                  <select
                    value={whatIfCourseId}
                    onChange={e => { setWhatIfCourseId(e.target.value); setWhatIfResult(null); }}
                    className="bg-white border-3 border-ink p-3 font-bold focus:bg-primary-container/10 appearance-none outline-none"
                  >
                    <option value="">Choose a course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">Target Score on Remaining Work (%)</label>
                  <input
                    className="bg-white border-3 border-ink p-3 font-bold focus:bg-primary-container/10 outline-none"
                    placeholder="e.g. 85"
                    type="number"
                    min="0"
                    max="100"
                    value={whatIfScore}
                    onChange={e => { setWhatIfScore(e.target.value); setWhatIfResult(null); }}
                  />
                </div>
                <Button
                  onClick={handleWhatIf}
                  disabled={!whatIfCourseId || !whatIfScore}
                  variant="primary" size="lg"
                  className="w-full"
                >
                  Calculate Impact
                </Button>
                {whatIfResult && (
                  <div className="bg-background border-2 border-ink p-4 flex justify-between items-center gap-3">
                    <span className="font-bold text-sm">
                      If you score <span className="font-black">{whatIfScore}%</span> on all remaining work:
                    </span>
                    <span className="font-black text-xl text-tertiary shrink-0">{whatIfResult.grade} ({whatIfResult.gpc.toFixed(2)})</span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Advanced Analytics (owner-approved metrics only) ────── */}
      {/* Hidden with no courses — every panel inside needs course data to say anything. */}
      {courses.length > 0 && (
      <div>
        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          variant="outline"
          className="flex items-center gap-3"
        >
          {showAdvanced ? <ChevronUp size={18} strokeWidth={3} /> : <ChevronDown size={18} strokeWidth={3} />}
          Advanced Analytics
        </Button>

        {showAdvanced && (
          <div className="mt-6 space-y-8">
            {/* Past Credit Hours Input */}
            <Card shadow="sm" className="p-6">
              <h4 className="text-lg font-black uppercase tracking-tighter mb-4">Past Credit Hours</h4>
              <p className="text-sm text-ink/60 font-medium mb-4">
                Enter the total credit hours you've completed before this semester. This improves the accuracy of your CGPA projection.
                Currently estimated at <span className="font-black text-ink">{estimatedPastCredits}</span> based on your semester number.
              </p>
              <div className="flex gap-4 items-end">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest">Total Past Credit Hours</label>
                  <input
                    className="bg-white border-3 border-ink p-3 font-bold focus:bg-primary-container/10 outline-none"
                    placeholder={`e.g. ${estimatedPastCredits}`}
                    type="number"
                    min="0"
                    value={advancedPastCredits}
                    onChange={e => setAdvancedPastCredits(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Grade Sensitivity Table */}
            {gradeSensitivity.length > 0 && (
              <Card shadow="sm" className="p-6">
                <h4 className="text-lg font-black uppercase tracking-tighter mb-2">What You Need on the Final</h4>
                <p className="text-sm text-ink/60 font-medium mb-6">
                  For each course, see how different scores on remaining work affect your final grade.
                </p>
                <div className="space-y-6">
                  {gradeSensitivity.map((item: any) => (
                    <div key={item.courseId}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-black text-lg uppercase">{item.code}</span>
                        <span className="text-xs text-ink/50 font-bold">{item.name}</span>
                        <span className="ml-auto text-[10px] font-black uppercase bg-background border border-ink px-2 py-0.5">
                          {item.remainingWeight.toFixed(0)}% remaining
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {item.scenarios.map((s: any) => (
                          <div key={s.finalScore} className="border-2 border-ink p-3 text-center bg-background">
                            <span className="block text-[10px] font-black uppercase text-ink/40">Score {s.finalScore}%</span>
                            <span className="block text-xl font-black mt-1">{s.grade}</span>
                            <span className="block text-[10px] font-bold text-ink/40">{s.gpc.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
      )}

      {/* Optimize Schedule Approval Modal */}
      <Modal open={showOptimizeModal} onClose={() => setShowOptimizeModal(false)}>
        <ModalContent>
          <ModalHeader onClose={() => setShowOptimizeModal(false)}>
            <h3 className="text-xl font-black uppercase tracking-tighter">Review Tasks</h3>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <p className="text-sm text-ink/60 font-medium">
              These tasks were generated from your AI study priorities. Uncheck any you don't want, edit the text, or change the due date.
            </p>
            {taskApprovals.map((task, i) => (
              <div key={i} className={`border-2 border-ink p-4 flex items-start gap-3 transition-all ${task.checked ? 'bg-background' : 'bg-ink/5 opacity-60'}`}>
                <button
                  onClick={() => setTaskApprovals(prev => prev.map((t, j) => j === i ? { ...t, checked: !t.checked } : t))}
                  className={`shrink-0 w-6 h-6 border-2 border-ink flex items-center justify-center mt-0.5 ${task.checked ? 'bg-tertiary text-white' : 'bg-white'}`}
                >
                  {task.checked && <Check size={14} strokeWidth={4} />}
                </button>
                <div className="flex-1 space-y-2">
                  <input
                    className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-ink"
                    value={task.text}
                    onChange={e => setTaskApprovals(prev => prev.map((t, j) => j === i ? { ...t, text: e.target.value } : t))}
                  />
                  <input
                    type="date"
                    className="text-xs font-bold border border-ink px-2 py-1 bg-white outline-none"
                    value={task.date}
                    onChange={e => setTaskApprovals(prev => prev.map((t, j) => j === i ? { ...t, date: e.target.value } : t))}
                  />
                </div>
              </div>
            ))}
          </ModalBody>
          <ModalFooter className="flex gap-4">
            <Button
              onClick={() => setShowOptimizeModal(false)}
              variant="outline" size="sm"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddApprovedTasks}
              disabled={taskApprovals.filter(t => t.checked).length === 0}
              variant="tertiary" size="sm"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Add {taskApprovals.filter(t => t.checked).length} to Calendar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <div className="pb-12"></div>
    </div>
  );
};

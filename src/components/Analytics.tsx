import { TrendingUp, Calendar, Target, AlertCircle, Clock, Loader2, ChevronDown, ChevronUp, Plus, Check, Zap } from 'lucide-react';
import { useProfile } from '../domain/profile/useProfile';
import { useCourses } from '../domain/courses/useCourses';
import { useDeadlines } from '../domain/deadlines/useDeadlines';
import { useDeliverables } from '../domain/deliverables/useDeliverables';
import { useTodos } from '../domain/todos/useTodos';
import { useCalendar } from '../domain/calendar/useCalendar';
import { useAI } from '../hooks/useAI';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { calculateSemesterGPA, projectCGPA, estimateGrade } from '../utils/gpaEngine';
import { isDateInRange } from '../utils/dateUtils';
import { Todo } from '../types';
import { Card, Button, Badge, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './ui';

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

  // What-If Calculator state
  const [whatIfCourseId, setWhatIfCourseId] = useState<string>('');
  const [whatIfScore, setWhatIfScore] = useState<string>('');
  const [whatIfResult, setWhatIfResult] = useState<{ grade: string; gpc: number } | null>(null);

  // Optimize Schedule modal state
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [taskApprovals, setTaskApprovals] = useState<{ text: string; checked: boolean; date: string }[]>([]);

  // Query manages lifecycle now

  // Use robust gpaEngine for calculations
  const { semesterGPA, courses: courseStatuses, totalCredits } = calculateSemesterGPA(courses, deliverables);

  // Projection based on current CGPA
  const currentCGPA = userProfile?.currentCgpa || 0;
  const targetCGPA = userProfile?.targetGpa || 4.0;

  // Smart pastCredits: derive from semester number × avg credit load
  // If user provided advanced override, use that instead
  const estimatedPastCredits = (() => {
    if (advancedPastCredits && !isNaN(parseInt(advancedPastCredits))) {
      return parseInt(advancedPastCredits);
    }
    const semStr = userProfile?.semester || '1';
    const semNum = parseInt(semStr) || 1;
    // Past semesters × average 15 credit hours per semester
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

    const result = estimateGrade(newProjectedScore, 100);
    setWhatIfResult(result);
  };

  // Optimize Schedule: create approval tasks from AI priorities
  const openOptimizeModal = () => {
    if (!priorities || priorities.length === 0) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

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
      const grade = estimateGrade(newWeighted, 100);
      return { finalScore, ...grade };
    });

    return { courseId: cs.courseId, code: course.code, name: course.name, scenarios, remainingWeight };
  }).filter(Boolean);

  return (
    <div className="space-y-10">
      {/* Page Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-ink uppercase">📊 Semester Analytics</h2>
          <p className="text-lg text-ink/60 font-medium mt-1">Real-time performance tracking & grade forecasting.</p>
        </div>
        <Badge variant="tertiary" size="lg" className="flex items-center gap-2">
          <Calendar size={16} />
          {activeSemester?.name || userProfile?.semester ? `Semester ${userProfile?.semester}` : 'Current Semester'}
        </Badge>
      </div>

      {/* GPA Overview & AI Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* GPA Overview Card */}
        <Card shadow="md" className="lg:col-span-2 bg-primary-container p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-48 h-48 border-3 border-ink rotate-12 opacity-10 pointer-events-none"></div>
          <div>
            <div className="flex justify-between items-start">
              <span className="font-black uppercase tracking-widest text-xs bg-ink text-white px-3 py-1">Academic Standing</span>
              <span className="bg-white border-2 border-ink px-3 py-1 text-xs font-black uppercase">
                Target: {targetCGPA.toFixed(2)} CGPA
              </span>
            </div>
            <div className="mt-8 flex items-baseline gap-4">
              <h3 className="text-7xl md:text-8xl font-black tracking-tighter">{semesterGPA}</h3>
              <div className="flex flex-col">
                <span className="text-xl font-bold uppercase tracking-tight leading-none text-ink/60">Estimated</span>
                <span className="text-xl font-bold uppercase tracking-tight leading-none">Semester GPA</span>
              </div>
            </div>

            {/* Required Semester GPA — core view */}
            {currentCGPA > 0 && (
              <div className="mt-4 border-2 border-ink p-3 bg-white/50 flex items-center gap-3">
                <Target size={18} className="text-tertiary shrink-0" />
                <span className="text-sm font-bold">
                  You need a <span className="text-xl font-black text-tertiary">{requiredSemesterGPA.toFixed(2)}</span> semester GPA to reach your {targetCGPA.toFixed(2)} CGPA target.
                </span>
              </div>
            )}

            {/* CGPA Projection Mini-Card */}
            {currentCGPA > 0 && (
              <div className="mt-4 border-2 border-ink p-4 bg-white/50 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-ink/60">Projected CGPA</span>
                  <span className="text-2xl font-black">{projectedCGPA.toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase text-ink/60">Based on</span>
                  <span className="text-sm font-bold text-ink/60">
                    ~{estimatedPastCredits} past credit hrs
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Real Weight Coverage Bar */}
          <div className="mt-12 space-y-4">
            <div className="flex justify-between font-black uppercase text-[10px]">
              <span>Semester Progress (Weight Graded)</span>
              <span>{avgWeightCoverage}% of coursework evaluated</span>
            </div>
            <div className="w-full h-8 border-3 border-ink bg-white flex overflow-hidden">
              <div
                className="h-full bg-tertiary transition-all duration-500"
                style={{ width: `${avgWeightCoverage}%` }}
              ></div>
              <div
                className="h-full bg-ink/10"
                style={{ width: `${100 - avgWeightCoverage}%` }}
              ></div>
            </div>
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-2 text-[10px] font-bold"><div className="w-3 h-3 bg-tertiary border border-ink"></div> Graded</div>
              <div className="flex items-center gap-2 text-[10px] font-bold"><div className="w-3 h-3 bg-ink/10 border border-ink"></div> Remaining</div>
            </div>
          </div>
        </Card>

        {/* AI Study Priority List */}
        <Card shadow="sm" className="border-l-secondary border-l-[12px] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black uppercase tracking-tighter">🤖 AI Study Priorities</h3>
            <span className="bg-secondary text-white text-[10px] px-2 py-0.5 border border-ink rotate-3 font-bold">CRITICAL</span>
          </div>
          <ul className="space-y-4 flex-grow min-h-[200px] flex flex-col justify-center">
            {loading ? (
              <div className="flex flex-col items-center gap-3 text-ink/60 font-medium w-full p-8 text-center">
                <Loader2 size={32} className="animate-spin text-secondary" />
                <span>Analyzing your course load and upcoming deadlines...</span>
              </div>
            ) : priorities ? priorities.map((item: any, i: number) => (
              <li key={i} className="p-3 border-2 border-ink bg-background hover:bg-secondary/10 transition-colors group cursor-pointer">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-sm">{item.title || item.task}</span>
                  {item.priority === 'critical' ? <AlertCircle size={14} className="text-secondary" /> :
                   item.priority === 'high' ? <TrendingUp size={14} className="text-secondary" /> :
                   <Clock size={14} className="text-tertiary" />}
                </div>
                <p className="text-[10px] text-ink/60 leading-tight font-medium">{item.desc || item.reason}</p>
              </li>
            )) : (
              <div className="flex flex-col items-center gap-3 text-ink/40 font-medium w-full p-8 text-center">
                <AlertCircle size={28} />
                <span className="text-sm">Add courses and deadlines to get AI-powered study priorities.</span>
              </div>
            )}
          </ul>
          <Button
            onClick={openOptimizeModal}
            disabled={!priorities || priorities.length === 0}
            variant="secondary" size="sm"
            className="mt-6 w-full flex items-center justify-center gap-2"
          >
            <Zap size={14} />
            Add to Calendar
          </Button>
        </Card>
      </div>

      {/* Course Performance Matrix */}
      <div>
        <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 border-b-4 border-ink inline-block pr-8">Performance Matrix</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {courseStatuses.map((cs) => {
            const course = courses.find(c => c.id === cs.courseId);
            if (!course) return null;
            return (
              <Card key={course.id} shadow="md" className="flex flex-col">
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
              </Card>
            );
          })}
        </div>
      </div>

      {/* What-If Calculator */}
      <Card shadow="md" className="border-t-tertiary border-t-[12px] p-8">
        <div className="flex items-center gap-3 mb-8">
          <Target size={32} className="text-tertiary" />
          <h3 className="text-3xl font-black tracking-tighter uppercase">🎯 What-If Calculator</h3>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
            <div className="bg-background border-2 border-ink p-4 flex justify-between items-center">
              <span className="font-bold text-sm">
                If you score <span className="font-black">{whatIfScore}%</span> on all remaining work:
              </span>
              <span className="font-black text-xl text-tertiary">{whatIfResult.grade} ({whatIfResult.gpc.toFixed(2)})</span>
            </div>
          )}
        </div>
      </Card>

      {/* Advanced Analytics Toggle */}
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
              <h4 className="text-lg font-black uppercase tracking-tighter mb-4">📋 Past Credit Hours</h4>
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
                <h4 className="text-lg font-black uppercase tracking-tighter mb-2">📊 What You Need on the Final</h4>
                <p className="text-sm text-ink/60 font-medium mb-6">
                  For each course, see how different scores on remaining work affect your final grade.
                </p>
                <div className="space-y-6">
                  {gradeSensitivity.map((item: any) => (
                    <div key={item.courseId}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-black text-lg">{item.code}</span>
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

      {/* Optimize Schedule Approval Modal */}
      <Modal open={showOptimizeModal} onClose={() => setShowOptimizeModal(false)}>
        <ModalContent>
          <ModalHeader onClose={() => setShowOptimizeModal(false)}>
            <h3 className="text-xl font-black uppercase tracking-tighter">📋 Review Tasks</h3>
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

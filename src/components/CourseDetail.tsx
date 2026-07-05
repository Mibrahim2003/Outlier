import { useState, FormEvent, ChangeEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAI } from '../hooks/useAI';
import { useMutation } from '@tanstack/react-query';
import { CourseDeliverable, Deadline } from '../types';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  CheckCircle2,
  Target,
  Calendar,
  Star,
  Upload,
  Plus,
  Folder,
  Settings,
  Pencil,
  Bell
} from 'lucide-react';
import { useProfile } from '../domain/profile/useProfile';
import { useCourses } from '../domain/courses/useCourses';
import { useDeliverables } from '../domain/deliverables/useDeliverables';
import { useDeadlines } from '../domain/deadlines/useDeadlines';
import { useTodos } from '../domain/todos/useTodos';
import { getThemeBgClass, getThemeTextClass, ThemeColor } from '../utils/impactStyles';
import { calculateCourseStatus, calculateCohortStanding, deriveWeakTopics, topPercentOf } from '../utils/gpaEngine';
import { parseLocalDate, formatDateShort } from '../utils/dateUtils';
import { Button, Card, Badge, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './ui';
import { CourseFormModal } from './CourseFormModal';
import { CohortStandingPanel } from './CohortStandingPanel';

const TABS = ['Quizzes', 'Assignments', 'Midterm', 'Final', 'Project', 'AI Insights'];

const TYPE_LABELS: Record<CourseDeliverable['type'], { singular: string; plural: string }> = {
  quiz: { singular: 'Quiz', plural: 'quizzes' },
  assignment: { singular: 'Assignment', plural: 'assignments' },
  midterm: { singular: 'Midterm', plural: 'midterms' },
  final: { singular: 'Final', plural: 'finals' },
  project: { singular: 'Project', plural: 'projects' },
};

/** ISO dates render as "Oct 12, 2026"; legacy free-text dates pass through unchanged. */
const formatDeliverableDate = (dateStr: string): string => {
  const d = parseLocalDate(dateStr);
  return isNaN(d.getTime()) ? dateStr : formatDateShort(d);
};

const isTodayOrFuture = (dateStr: string): boolean => {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
};

// Real performance chart: one pair of bars (you vs. class average) per graded
// deliverable. Ungraded items (no score or no class average yet) are hidden;
// if nothing is graded the chart renders nothing so we never show fake bars.
const PerformanceChart = ({ title, items, themeColor }: { title: string; items: CourseDeliverable[]; themeColor: ThemeColor }) => {
  const graded = items
    .map((item) => {
      const score = parseFloat(item.score || '');
      const classAvg = parseFloat(item.metadata?.classAvg as string ?? '');
      const total = item.metadata?.totalMarks || 100;
      if (isNaN(score) || isNaN(classAvg) || total <= 0) return null;
      const clamp = (n: number) => Math.max(0, Math.min(100, n));
      return {
        id: item.id,
        title: item.title,
        yourPct: clamp((score / total) * 100),
        classPct: clamp((classAvg / total) * 100),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (graded.length === 0) return null;

  return (
    <Card shadow="sm" className="p-8">
      <h4 className="text-sm font-black uppercase tracking-widest mb-6">{title}</h4>
      <div className="relative h-48 w-full border-b-4 border-ink flex items-end justify-around px-8 gap-8">
        {graded.map((bar) => (
          <div key={bar.id} className="flex-1 flex items-end justify-center gap-2 h-full">
            <div className="flex flex-col items-center justify-end gap-1 flex-1 h-full">
              <span className="text-[10px] font-black">{bar.yourPct.toFixed(0)}%</span>
              <div
                className={`w-full ${getThemeBgClass(themeColor)} border-2 border-ink`}
                style={{ height: `${bar.yourPct}%` }}
              ></div>
            </div>
            <div className="flex flex-col items-center justify-end gap-1 flex-1 h-full">
              <span className="text-[10px] font-black opacity-50">{bar.classPct.toFixed(0)}%</span>
              <div
                className="w-full bg-ink/20 border-2 border-ink"
                style={{ height: `${bar.classPct}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-around text-[10px] font-black uppercase tracking-widest mt-3 px-8 gap-8">
        {graded.map((bar) => (
          <span key={bar.id} className="flex-1 text-center truncate" title={bar.title}>{bar.title}</span>
        ))}
      </div>
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2 text-[10px] font-bold"><div className={`w-3 h-3 ${getThemeBgClass(themeColor)} border border-ink`}></div> You</div>
        <div className="flex items-center gap-2 text-[10px] font-bold"><div className="w-3 h-3 bg-ink/20 border border-ink"></div> Class Average</div>
      </div>
    </Card>
  );
};

export const CourseDetail = () => {
  const { id } = useParams();
  const { courses } = useCourses();
  const localCourse = courses.find((c) => c.id === id);

  if (!localCourse) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-4xl font-black uppercase">Course Not Found</h2>
        <Link to="/dashboard" className="text-tertiary underline font-bold">Return to Dashboard</Link>
      </div>
    );
  }

  return <CourseDetailContent localCourse={localCourse} />;
};

const CourseDetailContent = ({ localCourse }: { localCourse: any }) => {
  const navigate = useNavigate();
  const { userProfile } = useProfile();
  const { addCourse, removeCourse } = useCourses();
  const { deliverables, addDeliverable, updateDeliverable, setDeliverables } = useDeliverables();
  const { addDeadline } = useDeadlines();
  const { addTodo } = useTodos();
  const { getCourseInsight, getCourseCriticalAction, generateCourseStudyPlan, extractClassMarks, analyzeProjectScope, generateProjectMilestones } = useAI();

  const [activeTab, setActiveTab] = useState(0);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [criticalAction, setCriticalAction] = useState<{topic: string, insight: string} | null>(null);
  const [studyPlanGenerated, setStudyPlanGenerated] = useState(false);

  // Edit Course Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Add Deliverable Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'quiz' | 'assignment' | 'midterm' | 'final' | 'project'>('quiz');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTopics, setNewTopics] = useState('');
  const [newTotalMarks, setNewTotalMarks] = useState('100');
  const [newQuizNumber, setNewQuizNumber] = useState('');
  const [newLectureRange, setNewLectureRange] = useState('');

  // Upload Marks Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDeliverableType, setUploadDeliverableType] = useState<'quiz' | 'assignment' | 'midterm' | 'final' | 'project'>('quiz');
  const [uploadDeliverableId, setUploadDeliverableId] = useState('');
  const [uploadMode, setUploadMode] = useState<'manual' | 'bulk'>('manual');
  const [myScore, setMyScore] = useState('');
  const [classAvg, setClassAvg] = useState('');
  const [bulkScores, setBulkScores] = useState('');
  const [extractedHighestScore, setExtractedHighestScore] = useState<number | undefined>();
  const [extractedToppersCount, setExtractedToppersCount] = useState<number | undefined>();

  const [initProjectTitle, setInitProjectTitle] = useState('');
  const [initProjectIdea, setInitProjectIdea] = useState('');
  const [initProjectDeadline, setInitProjectDeadline] = useState('');
  
  const course = localCourse;

  const courseDeliverables = deliverables.filter(d => d.courseId === localCourse.id);
  const quizzes = courseDeliverables.filter(d => d.type === 'quiz');
  const assignments = courseDeliverables.filter(d => d.type === 'assignment');
  const midterms = courseDeliverables.filter(d => d.type === 'midterm');
  const finals = courseDeliverables.filter(d => d.type === 'final');
  const projects = courseDeliverables.filter(d => d.type === 'project');

  // All grade/cohort math comes from the engine — components never re-derive it.
  const courseStatus = calculateCourseStatus(course, courseDeliverables, userProfile?.gradingScale);
  const standing = calculateCohortStanding(course, courseDeliverables);
  const standingById = new Map(standing.deliverables.map(s => [s.id, s]));
  const weakTopics = deriveWeakTopics(course, courseDeliverables);

  // Deterministic evidence for the AI: it narrates these computed facts
  // instead of guessing a diagnosis from raw rows.
  const cohortEvidence = standing.hasData
    ? JSON.stringify({
        weightedZScore: Number(standing.weightedZ.toFixed(2)),
        classPercentile: Number(standing.percentile.toFixed(1)),
        percentOfGradeWithClassData: standing.statsCoveredWeight,
        weightedPointsBehindTopper: standing.gapToTopper ? Number(standing.gapToTopper.points.toFixed(1)) : null,
        biggestGapCategory: standing.gapToTopper?.topCategory ?? null,
        weakestDeliverablesVsClass: weakTopics.map(w => ({
          title: w.title,
          zScore: Number(w.z.toFixed(2)),
          lectureRange: w.lectureRange,
          topics: w.topics,
        })),
      })
    : undefined;

  const insightMutation = useMutation({
    mutationFn: () => getCourseInsight(course, courseDeliverables, cohortEvidence),
    onSuccess: (insight) => { if (insight) setAiInsight(insight); }
  });

  const criticalActionMutation = useMutation({
    mutationFn: () => getCourseCriticalAction(course, courseDeliverables, cohortEvidence),
    onSuccess: (action) => {
      if (action) {
        setCriticalAction(action);
        setStudyPlanGenerated(false);
      }
    }
  });

  const studyPlanMutation = useMutation({
    mutationFn: () => {
      if (!criticalAction) throw new Error("No critical action");
      return generateCourseStudyPlan(course, courseDeliverables, criticalAction.topic);
    },
    onSuccess: (tasks) => {
      if (tasks) {
        const today = new Date().toISOString().split('T')[0];
        tasks.forEach((task: string) => {
          addTodo({ id: crypto.randomUUID(), text: task, completed: false, dueDate: today, createdAt: new Date().toISOString(), course: course.code });
        });
        setStudyPlanGenerated(true);
      }
    }
  });

  const handleGenerateInsight = () => insightMutation.mutate();
  const handleGenerateCriticalAction = () => criticalActionMutation.mutate();
  const handleGenerateStudyPlan = () => studyPlanMutation.mutate();

  // ─── Reminders ────────────────────────────────────────────────
  // A "reminder" is a real deadline row, so scheduled deliverables show up on
  // the dashboard and calendar. Only today-or-future dates get one — a
  // reminder that is born overdue is just noise.

  const buildReminder = (deliverable: CourseDeliverable): Deadline | null => {
    if (!isTodayOrFuture(deliverable.date)) return null;
    const priority: Deadline['priority'] =
      deliverable.type === 'midterm' || deliverable.type === 'final' ? 'urgent'
      : deliverable.type === 'assignment' ? 'normal'
      : 'moderate';
    return {
      id: crypto.randomUUID(),
      title: `${course.code}: ${deliverable.title}`,
      course: course.code,
      topic: deliverable.metadata?.lectureRange
        ? `Lectures ${deliverable.metadata.lectureRange}`
        : deliverable.metadata?.topics || TYPE_LABELS[deliverable.type].singular,
      dueDate: deliverable.date,
      priority,
    };
  };

  const handleSetReminder = (deliverable: CourseDeliverable) => {
    const reminder = buildReminder(deliverable);
    if (!reminder) return;
    addDeadline(reminder);
    updateDeliverable({ ...deliverable, metadata: { ...deliverable.metadata, deadlineId: reminder.id } });
  };

  // ─── Course edit / delete ─────────────────────────────────────

  const handleDeleteCourse = () => {
    // course_deliverables has no FK to courses, so orphaned rows must be
    // removed explicitly alongside the course.
    setDeliverables(deliverables.filter(d => d.courseId !== course.id));
    removeCourse(course.id);
    navigate('/courses');
  };

  // Project Functions

  const handleInitializeProject = (e: FormEvent) => {
    e.preventDefault();
    if (!initProjectTitle || !initProjectDeadline) return;

    const project: CourseDeliverable = {
      id: crypto.randomUUID(),
      courseId: course.id,
      type: 'project',
      title: initProjectTitle,
      date: initProjectDeadline,
      status: 'scheduled',
      metadata: {
        projectIdea: initProjectIdea,
        totalMarks: 100
      }
    };

    const reminder = buildReminder(project);
    if (reminder) {
      project.metadata!.deadlineId = reminder.id;
      addDeadline(reminder);
    }
    addDeliverable(project);
  };


  const scopeMutation = useMutation({
    mutationFn: (project: any) => analyzeProjectScope(project.metadata.projectIdea, project.date),
    onSuccess: (analysis, project) => {
      if (analysis) updateDeliverable({ ...project, metadata: { ...project.metadata, scopeFeedback: analysis.feedback } });
    }
  });

  const milestoneMutation = useMutation({
    mutationFn: (project: any) => generateProjectMilestones(project.metadata.projectIdea, project.date),
    onSuccess: (milestones, project) => {
      if (milestones) {
        milestones.forEach(m => {
          const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + m.daysFromNow);
          addTodo({ id: crypto.randomUUID(), text: `[${project.title}] ${m.title}`, completed: false, dueDate: dueDate.toISOString().split('T')[0], createdAt: new Date().toISOString(), course: course.code });
        });
        updateDeliverable({ ...project, metadata: { ...project.metadata, milestonesGenerated: true } });
      }
    }
  });

  const handleAnalyzeScope = () => {
    const project = projects[0];
    if (!project || !project.metadata?.projectIdea) return;
    scopeMutation.mutate(project);
  };

  const handleGenerateMilestones = () => {
    const project = projects[0];
    if (!project || !project.metadata?.projectIdea) return;
    milestoneMutation.mutate(project);
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const deliverable: CourseDeliverable = {
      id: crypto.randomUUID(),
      courseId: course.id,
      type: modalType,
      title: newTitle,
      date: newDate || new Date().toISOString().split('T')[0],
      status: 'scheduled',
      metadata: {
        topics: newTopics || undefined,
        totalMarks: parseFloat(newTotalMarks) || 100,
        quizNumber: modalType === 'quiz' && newQuizNumber ? parseInt(newQuizNumber) : undefined,
        lectureRange: modalType === 'quiz' && newLectureRange ? newLectureRange : undefined,
      }
    };

    const reminder = buildReminder(deliverable);
    if (reminder) {
      deliverable.metadata!.deadlineId = reminder.id;
      addDeadline(reminder);
    }
    addDeliverable(deliverable);

    setIsModalOpen(false);
    setNewTitle('');
    setNewDate('');
    setNewTopics('');
    setNewTotalMarks('100');
    setNewQuizNumber('');
    setNewLectureRange('');
  };

  // Auto-title quizzes from the quiz number, but never clobber a custom title.
  const handleQuizNumberChange = (value: string) => {
    setNewQuizNumber(value);
    if (value && (newTitle === '' || /^Quiz \d+$/.test(newTitle))) {
      setNewTitle(`Quiz ${value}`);
    }
  };

  const marksMutation = useMutation({
    mutationFn: ({ base64String, fileType, totalMarks }: any) => extractClassMarks(base64String, fileType, userProfile?.registrationNumber, totalMarks),
    onSuccess: (extracted) => {
      if (extracted) {
        if (extracted.myScore !== null) setMyScore(extracted.myScore.toString());
        setBulkScores(extracted.allScores.join(', '));
        setExtractedHighestScore(extracted.highestScore);
        setExtractedToppersCount(extracted.toppersCount);
      }
    }
  });

  const aiLoading = insightMutation.isPending || criticalActionMutation.isPending || studyPlanMutation.isPending || scopeMutation.isPending || milestoneMutation.isPending || marksMutation.isPending;

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const deliverable = deliverables.find(d => d.id === uploadDeliverableId);
    if (!deliverable) return;
    const totalMarks = deliverable.metadata?.totalMarks || 100;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      marksMutation.mutate({ base64String, fileType: file.type, totalMarks });
    };
    reader.readAsDataURL(file);
  };

  const handleUploadMarks = (e: FormEvent) => {
    e.preventDefault();
    if (!uploadDeliverableId) return;

    const deliverable = deliverables.find(d => d.id === uploadDeliverableId);
    if (!deliverable) return;

    let finalAvg = 0;
    let finalStdDev = 0;

    let highest = extractedHighestScore;
    let toppers = extractedToppersCount;
    let sampleSize: number | undefined;

    if (uploadMode === 'bulk') {
      const scores = bulkScores.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      if (scores.length > 0) {
        finalAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const squareDiffs = scores.map(s => Math.pow(s - finalAvg, 2));
        finalStdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / scores.length);
        sampleSize = scores.length;

        if (highest === undefined) {
           highest = Math.max(...scores);
           toppers = scores.filter(s => s === highest).length;
        }
      }
    } else {
      finalAvg = parseFloat(classAvg);
    }

    const myNumericScore = parseFloat(myScore);
    const totalMarks = deliverable.metadata?.totalMarks || 100;
    const progress = (myNumericScore / totalMarks) * 100;

    const updatedDeliverable: CourseDeliverable = {
      ...deliverable,
      score: myScore,
      status: myNumericScore < finalAvg ? 'below-average' : 'graded',
      metadata: {
        ...deliverable.metadata,
        classAvg: isNaN(finalAvg) ? undefined : finalAvg.toFixed(1),
        classStdDev: isNaN(finalStdDev) || finalStdDev === 0 ? undefined : Number(finalStdDev.toFixed(2)),
        progress: isNaN(progress) ? undefined : progress,
        highestScore: highest,
        toppersCount: toppers,
        classSize: sampleSize ?? deliverable.metadata?.classSize
      }
    };

    updateDeliverable(updatedDeliverable);

    setIsUploadModalOpen(false);
    setMyScore('');
    setClassAvg('');
    setBulkScores('');
    setUploadDeliverableId('');
    setExtractedHighestScore(undefined);
    setExtractedToppersCount(undefined);
  };

  const openModal = (type: 'quiz' | 'assignment' | 'midterm' | 'final' | 'project') => {
    setModalType(type);
    setIsModalOpen(true);
  };

  const renderAssessments = (title: string, items: CourseDeliverable[], type: 'quiz' | 'assignment' | 'midterm' | 'final') => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black uppercase tracking-tighter">{title}</h3>
        <div className="flex gap-3">
          <Button
            onClick={() => { setUploadDeliverableType(type); setIsUploadModalOpen(true); }}
            variant="outline" size="xs"
            className="flex items-center gap-2"
          >
            <Upload size={14} />
            Upload Marks
          </Button>
          <Button
            onClick={() => openModal(type)}
            variant="primary" size="xs"
            className="flex items-center gap-2"
          >
            <Plus size={14} />
            Add {TYPE_LABELS[type].singular}
          </Button>
        </div>
      </div>

      {items.map((item) => (
        <Card key={item.id} shadow="sm" className={`p-6 ${item.status === 'scheduled' ? 'border-dashed' : ''}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h4 className="text-xl font-black leading-tight">{item.title}</h4>
                {item.status === 'graded' && (
                  <span className="bg-tertiary/20 text-tertiary px-2 py-0.5 text-[10px] font-black uppercase border border-tertiary">Graded</span>
                )}
                {item.status === 'below-average' && (
                  <span className="bg-secondary/20 text-secondary px-2 py-0.5 text-[10px] font-black uppercase border border-secondary">Below Average</span>
                )}
                {item.status === 'scheduled' && (
                  <span className="bg-ink/10 text-ink px-2 py-0.5 text-[10px] font-black uppercase border border-ink/30">Scheduled</span>
                )}
                {(() => {
                  const ds = standingById.get(item.id);
                  if (!ds) return null;
                  return (
                    <span
                      className="bg-white text-ink px-2 py-0.5 text-[10px] font-black uppercase border-2 border-ink"
                      title={`Z-score ${ds.z.toFixed(2)} vs the class on this ${TYPE_LABELS[item.type].singular.toLowerCase()}`}
                    >
                      Top {topPercentOf(ds.percentile)}% · Z {ds.z >= 0 ? '+' : ''}{ds.z.toFixed(1)}
                    </span>
                  );
                })()}
              </div>
              <div className="flex items-center gap-4 text-xs font-bold opacity-60 flex-wrap">
                <span className="flex items-center gap-1"><Calendar size={12} /> {formatDeliverableDate(item.date)}</span>
                {item.score && <span className="flex items-center gap-1"><Star size={12} /> Score: {item.score}</span>}
                {item.metadata?.classAvg && <span className="italic">Class Avg: {item.metadata.classAvg}</span>}
                {item.metadata?.highestScore !== undefined && (
                  <span className="italic">
                    High: {item.metadata.highestScore}
                    {item.metadata?.toppersCount
                      ? item.metadata.highestScore === (item.metadata.totalMarks || 100)
                        ? ` — ${item.metadata.toppersCount} hit full marks`
                        : ` (${item.metadata.toppersCount} at the top)`
                      : ''}
                  </span>
                )}
                {item.metadata?.lectureRange && <span className="italic">Lectures: {item.metadata.lectureRange}</span>}
                {item.metadata?.topics && <span className="italic">Topics: {item.metadata.topics}</span>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {item.metadata?.progress !== undefined && (
                <div className="w-32 h-3 bg-background border-2 border-ink">
                  <div className={`h-full ${item.metadata.progress >= 70 ? 'bg-tertiary' : 'bg-secondary'}`} style={{ width: `${item.metadata.progress}%` }}></div>
                </div>
              )}
              {item.status === 'scheduled' && (
                item.metadata?.deadlineId ? (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-tertiary">
                    <CheckCircle2 size={12} /> Reminder Set
                  </span>
                ) : isTodayOrFuture(item.date) ? (
                  <Button
                    onClick={() => handleSetReminder(item)}
                    variant="outline" size="xs"
                    className="px-3 py-1 text-[10px] flex items-center gap-1"
                  >
                    <Bell size={10} /> Set Reminder
                  </Button>
                ) : null
              )}
            </div>
          </div>
        </Card>
      ))}
      {items.length === 0 && (
        <div className="text-center p-8 border-2 border-dashed border-ink opacity-60 font-bold uppercase tracking-widest text-xs">
          No {TYPE_LABELS[type].plural} found.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Back Button + Edit */}
      <div className="flex items-center justify-between gap-4">
        <Link to="/dashboard" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
        <Button
          onClick={() => setIsEditModalOpen(true)}
          variant="outline" size="xs"
          className="flex items-center gap-2"
        >
          <Pencil size={12} /> Edit Course
        </Button>
      </div>

      {/* Course Header — Yellow card */}
      <Card shadow="md" className={`${getThemeBgClass(course.themeColor)} ${getThemeTextClass(course.themeColor)} p-8 md:p-10 relative overflow-hidden`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none uppercase">{course.code}</h1>
            <p className="text-xl md:text-2xl font-black uppercase tracking-tight opacity-80">{course.name}</p>
          </div>
          <Card shadow="sm" className="bg-white text-ink p-4 text-center min-w-[100px]">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Est. Grade</p>
            <p className="text-4xl font-black leading-none mt-1">{courseStatus.estimatedGrade}</p>
          </Card>
        </div>
        
        {/* Weightage Pills */}
        <div className="flex flex-wrap gap-3 mt-6">
          <span className="bg-ink text-white px-3 py-1 text-xs font-black uppercase tracking-widest">
            {course.credits} Credit Hours
          </span>
          {course.weightage && Object.entries(course.weightage).map(([key, val]) => (
            <Badge key={key} variant="outline" className="px-3 py-1">
              {key} {val as number}%
            </Badge>
          ))}
        </div>
      </Card>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab, i) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(i)}
            variant={activeTab === i ? 'ink' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            {i === 0 && <FileText size={14} />}
            {i === 1 && <FileText size={14} />}
            {i === 2 && <Target size={14} />}
            {i === 3 && <Target size={14} />}
            {i === 4 && <Folder size={14} />}
            {i === 5 && <Sparkles size={14} />}
            {tab}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Tab Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quizzes Tab */}
          {activeTab === 0 && (
            <div className="space-y-6">
              {renderAssessments('Active Quizzes', quizzes, 'quiz')}

              <PerformanceChart title="Your Performance vs Class Average" items={quizzes} themeColor={course.themeColor} />
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 1 && (
            <div className="space-y-6">
              {renderAssessments('Assignments', assignments, 'assignment')}
              <PerformanceChart title="Your Performance vs Class Average" items={assignments} themeColor={course.themeColor} />
            </div>
          )}

          {/* Midterms Tab */}
          {activeTab === 2 && (
            <div className="space-y-6">
              {renderAssessments('Midterms', midterms, 'midterm')}
              <PerformanceChart title="Your Performance vs Class Average" items={midterms} themeColor={course.themeColor} />
            </div>
          )}

          {/* Finals Tab */}
          {activeTab === 3 && (
            <div className="space-y-6">
              {renderAssessments('Finals', finals, 'final')}
              <PerformanceChart title="Your Performance vs Class Average" items={finals} themeColor={course.themeColor} />
            </div>
          )}

          {/* Project Tab */}
          {activeTab === 4 && (
            <div className="space-y-6">
              {projects.length === 0 ? (
                <Card shadow="md" className="p-8">
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">Project Setup</h3>
                  <p className="text-sm font-medium opacity-80 mb-6">Enter your project details to enable milestone tracking and scope analysis.</p>
                  
                  <form onSubmit={handleInitializeProject} className="space-y-4">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest opacity-60">Project Title</label>
                      <input 
                        type="text" 
                        value={initProjectTitle}
                        onChange={(e) => setInitProjectTitle(e.target.value)}
                        className="w-full bg-background border-2 border-ink p-3 font-bold focus:outline-none focus:ring-2 focus:ring-tertiary"
                        placeholder="e.g., Compiler Construction Phase 1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest opacity-60">Final Deadline</label>
                      <input
                        type="date"
                        value={initProjectDeadline}
                        onChange={(e) => setInitProjectDeadline(e.target.value)}
                        className="w-full bg-background border-2 border-ink p-3 font-bold focus:outline-none focus:ring-2 focus:ring-tertiary"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest opacity-60">Project Idea / Description</label>
                      <textarea 
                        value={initProjectIdea}
                        onChange={(e) => setInitProjectIdea(e.target.value)}
                        className="w-full bg-background border-2 border-ink p-3 font-bold focus:outline-none focus:ring-2 focus:ring-tertiary h-24"
                        placeholder="Describe your architecture, tools, and MVP features..."
                        required
                      />
                    </div>
                    <Button 
                      type="submit"
                      variant="ink" size="lg" className="w-full"
                    >
                      Save Project
                    </Button>
                  </form>
                </Card>
              ) : (
                <div className="space-y-8">
                  {/* Master Project Header */}
                  <Card shadow="md" className="flex justify-between items-start bg-ink text-white p-6">
                    <div>
                      <span className="bg-white/20 text-white px-2 py-1 text-[10px] font-black uppercase tracking-widest border border-white/30">Course Project</span>
                      <h3 className="text-3xl font-black uppercase tracking-tighter mt-2">{projects[0].title}</h3>
                      <p className="text-sm font-bold opacity-80 mt-1">Due: {formatDeliverableDate(projects[0].date)}</p>
                    </div>
                    <Button 
                      onClick={() => { setUploadDeliverableType('project'); setIsUploadModalOpen(true); }}
                      variant="outline" size="xs" className="text-ink bg-white border-white hover:bg-gray-100"
                    >
                      <Upload size={14} /> Upload Final Marks
                    </Button>
                  </Card>

                  {/* Tech Lead Scope Analyzer */}
                  <Card shadow="md" className="bg-secondary text-white p-6">
                    <h4 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2"><Sparkles size={20} /> Tech Lead Scope Analyzer</h4>
                    <p className="text-sm opacity-80 mt-2 mb-4 font-medium">The AI acts as a ruthless Senior Tech Lead to analyze your project idea for scope creep and grade risk.</p>
                    
                    {projects[0].metadata?.scopeFeedback ? (
                      <div className="bg-black/20 border-l-4 border-white p-4 font-medium leading-relaxed">
                        {projects[0].metadata.scopeFeedback}
                        <button 
                          onClick={handleAnalyzeScope}
                          disabled={aiLoading}
                          className="mt-4 bg-white/10 border-2 border-white/50 px-3 py-1 text-[10px] font-black uppercase block hover:bg-white hover:text-secondary transition-all disabled:opacity-50"
                        >
                          {scopeMutation.isPending ? 'Re-analyzing...' : 'Request Re-Analysis'}
                        </button>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleAnalyzeScope}
                        disabled={aiLoading}
                        variant="outline" size="sm" className="bg-white text-ink"
                      >
                        {scopeMutation.isPending ? 'Analyzing Scope...' : 'Analyze Scope'}
                      </Button>
                    )}
                  </Card>

                  {/* Milestone Generator */}
                  <Card shadow="md" className="p-6">
                    <h4 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2"><Target size={20} /> Tactical Milestones</h4>
                    <p className="text-sm opacity-60 mt-2 mb-4 font-medium">Break this project down into 4 actionable milestones with staggered deadlines.</p>
                    
                    {projects[0].metadata?.milestonesGenerated ? (
                      <div className="flex items-center gap-3 text-tertiary font-black uppercase tracking-widest text-sm border-2 border-tertiary p-4 bg-tertiary/10">
                        <CheckCircle2 size={24} /> Milestones Injected into Global Todos!
                      </div>
                    ) : (
                      <Button 
                        onClick={handleGenerateMilestones}
                        disabled={aiLoading}
                        variant="primary" size="sm"
                      >
                        {milestoneMutation.isPending ? 'Generating Milestones...' : 'Generate & Inject Milestones'}
                      </Button>
                    )}
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* AI Insights Tab */}
          {activeTab === 5 && (
            <Card shadow="md" className="bg-secondary text-white p-8 relative overflow-hidden">
              <Sparkles className="absolute -right-4 -top-4 opacity-20" size={120} fill="currentColor" />
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={24} fill="currentColor" />
                  <h3 className="text-2xl font-black uppercase tracking-tighter">AI Insights</h3>
                </div>
                
                {aiInsight ? (
                  <div className="space-y-4">
                    <p className="text-lg font-medium leading-snug italic">
                      "{aiInsight}"
                    </p>
                    <Button 
                      onClick={handleGenerateInsight}
                      disabled={aiLoading}
                      variant="outline" size="sm" className="bg-white text-ink mt-4"
                    >
                      {insightMutation.isPending ? 'Analyzing...' : 'Regenerate Insight'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-lg font-medium leading-snug">
                      Generate a personalized, brutally honest insight about your performance in this course based on your recent deliverables.
                    </p>
                    <Button 
                      onClick={handleGenerateInsight}
                      disabled={aiLoading}
                      variant="outline" size="sm" className="bg-white text-ink mt-4"
                    >
                      {insightMutation.isPending ? 'Analyzing...' : 'Generate Insight'}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Critical Insight - Always visible at bottom */}
          <Card shadow="md" className="bg-ink text-white p-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-secondary border-2 border-white/20 mt-1">
                <Settings size={20} />
              </div>
              <div className="space-y-3 flex-1">
                {criticalAction ? (
                  <>
                    <h4 className="text-xl font-black uppercase tracking-tighter">Critical Insight: {criticalAction.topic}</h4>
                    <p className="font-medium leading-relaxed opacity-90">
                      {criticalAction.insight}
                    </p>
                    {studyPlanGenerated ? (
                      <p className="text-xs font-black uppercase tracking-widest text-tertiary mt-4">
                        <CheckCircle2 size={14} className="inline mr-1" /> Study Plan added to Today's Tasks
                      </p>
                    ) : (
                      <Button 
                        onClick={handleGenerateStudyPlan}
                        disabled={aiLoading}
                        variant="outline" size="sm" className="bg-white text-ink mt-2"
                      >
                        {studyPlanMutation.isPending ? 'Generating Plan...' : 'Generate Study Plan'}
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <h4 className="text-xl font-black uppercase tracking-tighter">Critical Weakness Scan</h4>
                    <p className="font-medium leading-relaxed opacity-60 italic">
                      Identify your biggest vulnerability in {course.code} based on recent performance.
                    </p>
                    <Button 
                      onClick={handleGenerateCriticalAction}
                      disabled={aiLoading}
                      variant="secondary" size="sm" className="mt-2 flex items-center gap-2"
                    >
                      <Sparkles size={14} /> {criticalActionMutation.isPending ? 'Analyzing...' : 'Scan for Weaknesses'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <CohortStandingPanel
            standing={standing}
            courseStatus={courseStatus}
            themeColor={course.themeColor}
            deliverables={courseDeliverables}
          />
        </div>
      </div>

      {/* Add Deliverable Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalContent>
          <ModalHeader onClose={() => setIsModalOpen(false)}>
            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">
              Add {TYPE_LABELS[modalType].singular}
            </h3>
          </ModalHeader>
          <form onSubmit={handleAddSubmit}>
            <ModalBody className="space-y-6">
              {modalType === 'quiz' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest opacity-60">Quiz Number</label>
                    <select
                      value={newQuizNumber}
                      onChange={(e) => handleQuizNumberChange(e.target.value)}
                      className="w-full bg-background border-2 border-ink p-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary-container"
                    >
                      <option value="">Select...</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>Quiz {n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest opacity-60">Lecture Range</label>
                    <input
                      type="text"
                      value={newLectureRange}
                      onChange={(e) => setNewLectureRange(e.target.value)}
                      className="w-full bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                      placeholder="e.g., 1-5"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  placeholder={`e.g., ${modalType === 'quiz' ? 'Quiz 4: Graphs' : modalType === 'midterm' ? 'Midterm Exam' : modalType === 'final' ? 'Final Exam' : 'HW 3'}`}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                  {(!newDate || isTodayOrFuture(newDate))
                    ? 'A reminder will be added to your deadlines'
                    : 'Past date — recorded without a reminder'}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Topics / Syllabus (Optional)</label>
                <input
                  type="text"
                  value={newTopics}
                  onChange={(e) => setNewTopics(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  placeholder="e.g., Chapter 4-5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Total Marks</label>
                <input
                  type="number"
                  value={newTotalMarks}
                  onChange={(e) => setNewTotalMarks(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  placeholder="e.g., 100"
                  required
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                type="submit"
                variant="ink" size="lg"
                className="w-full"
              >
                Add {TYPE_LABELS[modalType].singular}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Upload Marks Modal */}
      <Modal open={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)}>
        <ModalContent>
          <ModalHeader onClose={() => setIsUploadModalOpen(false)} className="bg-tertiary text-white">
            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">
              Upload Marks
            </h3>
          </ModalHeader>
          <form onSubmit={handleUploadMarks}>
            <ModalBody className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Select {uploadDeliverableType}</label>
                <select 
                  value={uploadDeliverableId}
                  onChange={(e) => setUploadDeliverableId(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold focus:outline-none focus:ring-2 focus:ring-tertiary"
                  required
                >
                  <option value="" disabled>Choose a scheduled {uploadDeliverableType}...</option>
                  {courseDeliverables.filter(q => q.type === uploadDeliverableType && q.status === 'scheduled').map(q => (
                    <option key={q.id} value={q.id}>{q.title} ({q.date})</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setUploadMode('manual')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 border-ink transition-all ${uploadMode === 'manual' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-background'}`}
                >
                  Manual Entry
                </button>
                <button 
                  type="button"
                  onClick={() => setUploadMode('bulk')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 border-ink transition-all ${uploadMode === 'bulk' ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-background'}`}
                >
                  Bulk Paste
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Your Score</label>
                <input 
                  type="text" 
                  value={myScore}
                  onChange={(e) => setMyScore(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-tertiary"
                  placeholder="e.g., 85"
                  required
                />
              </div>

              {uploadMode === 'manual' ? (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest opacity-60">Class Average</label>
                  <input 
                    type="text" 
                    value={classAvg}
                    onChange={(e) => setClassAvg(e.target.value)}
                    className="w-full bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-tertiary"
                    placeholder="e.g., 72.5"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2 bg-ink/5 p-4 border-2 border-dashed border-ink">
                    <label className="text-xs font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
                      <Sparkles size={14} /> Extract via AI (Image/PDF)
                    </label>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={handleFileUpload}
                      disabled={aiLoading}
                      className="w-full text-xs font-bold file:mr-4 file:py-2 file:px-4 file:border-2 file:border-ink file:bg-white file:text-ink file:font-black file:uppercase file:tracking-widest hover:file:bg-background file:transition-all cursor-pointer disabled:opacity-50"
                    />
                    {aiLoading && <p className="text-[10px] font-black uppercase text-tertiary animate-pulse">Extracting numbers...</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest opacity-60">Review Class Scores (Comma Separated)</label>
                    <textarea 
                      value={bulkScores}
                      onChange={(e) => setBulkScores(e.target.value)}
                      className="w-full h-24 bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-tertiary resize-none"
                      placeholder="Upload file to extract, or paste manually: 85, 90, 72..."
                      required
                    />
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                type="submit"
                variant="tertiary" size="lg"
                className="w-full"
              >
                Upload & Grade
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit Course Modal */}
      {isEditModalOpen && (
        <CourseFormModal
          onClose={() => setIsEditModalOpen(false)}
          course={course}
          onSubmit={(updated) => addCourse(updated)}
          onDelete={handleDeleteCourse}
          deliverableCount={courseDeliverables.length}
        />
      )}
    </div>
  );
};

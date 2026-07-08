import { useState, FormEvent, ChangeEvent } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAI } from '../hooks/useAI';
import { useMutation } from '@tanstack/react-query';
import { Course, CourseDeliverable, Deadline } from '../types';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  FileQuestion,
  GraduationCap,
  CheckCircle2,
  Target,
  Calendar,
  Star,
  Upload,
  Plus,
  Folder,
  Pencil,
  Trash2,
  Bell,
  type LucideIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useProfile } from '../domain/profile/useProfile';
import { useCourses } from '../domain/courses/useCourses';
import { useDeliverables } from '../domain/deliverables/useDeliverables';
import { useDeadlines } from '../domain/deadlines/useDeadlines';
import { useTodos } from '../domain/todos/useTodos';
import { getThemeBgClass, getThemeTextClass, ThemeColor } from '../utils/impactStyles';
import { calculateCourseStatus, calculateCohortStanding, deriveWeakTopics, topPercentOf } from '../utils/gpaEngine';
import { parseLocalDate, formatDateShort, toLocalISODate } from '../utils/dateUtils';
import { buildReminder, isTodayOrFuture } from '../utils/reminders';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Button, Card, Badge, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, ZeeMascot } from './ui';
import { CourseFormModal } from './CourseFormModal';
import { CohortStandingPanel } from './CohortStandingPanel';

// Midterm and final are singletons: a course has exactly one of each, named
// automatically. Quizzes are capped at 5 (product rule: quiz number 1–5).
const SINGLETON_TYPES = new Set<CourseDeliverable['type']>(['midterm', 'final']);
const AUTO_TITLES: Partial<Record<CourseDeliverable['type'], string>> = {
  midterm: 'Midterm Exam',
  final: 'Final Exam',
};
const MAX_QUIZZES = 5;

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

// Real performance chart: one pair of bars (you vs. class average) per graded
// deliverable. Ungraded items (no score or no class average yet) are hidden;
// if nothing is graded the chart renders nothing so we never show fake bars.
const PerformanceChart = ({ title, items, themeColor }: { title: string; items: CourseDeliverable[]; themeColor?: ThemeColor }) => {
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
            {[
              { pct: bar.yourPct, barClass: `${getThemeBgClass(themeColor)} border-2 border-ink`, labelClass: '' },
              { pct: bar.classPct, barClass: 'bg-ink/20 border-2 border-ink', labelClass: 'opacity-50' },
            ].map((series, si) => (
              // Bars live on an h-40 track inside the h-48 chart: the spare
              // headroom keeps the value label inside the box even at 100%.
              <div key={si} className="relative flex-1 h-40">
                <div
                  className={`absolute bottom-0 left-0 right-0 ${series.barClass}`}
                  style={{ height: `${series.pct}%` }}
                ></div>
                <span
                  className={`absolute left-0 right-0 text-center text-[10px] font-black ${series.labelClass}`}
                  style={{ bottom: `calc(${series.pct}% + 3px)` }}
                >
                  {series.pct.toFixed(0)}%
                </span>
              </div>
            ))}
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
        <ZeeMascot variant="cooked" size={112} className="mx-auto" />
        <h2 className="text-4xl font-black uppercase">Course Not Found</h2>
        <Link to="/dashboard" className="text-tertiary underline font-bold">Return to Dashboard</Link>
      </div>
    );
  }

  // Keyed by id so per-course localStorage state resets when navigating
  // directly between two course pages.
  return <CourseDetailContent key={localCourse.id} localCourse={localCourse} />;
};

const CourseDetailContent = ({ localCourse }: { localCourse: Course }) => {
  const navigate = useNavigate();
  const { userProfile } = useProfile();
  const { addCourse, removeCourse } = useCourses();
  const { deliverables, addDeliverable, updateDeliverable, removeDeliverable, setDeliverables } = useDeliverables();
  const { deadlines, addDeadline, setDeadlines } = useDeadlines();
  const { addTodo } = useTodos();
  const { getCourseInsight, getCourseCriticalAction, generateCourseStudyPlan, extractClassMarks, analyzeProjectScope, generateProjectMilestones } = useAI();

  const [activeTab, setActiveTab] = useState<string>('');

  // AI output is paid for — persist it like the Dashboard insight does instead
  // of burning quota again on every visit. Insight is fresh per day; the
  // critical action sticks until the student re-scans.
  const todayStr = toLocalISODate();
  const [aiInsight, setAiInsight] = useLocalStorage<string | null>(`course-insight-${localCourse.id}-${todayStr}`, null);
  const [criticalAction, setCriticalAction] = useLocalStorage<{topic: string, insight: string} | null>(`critical-action-${localCourse.id}`, null);
  const [studyPlanGenerated, setStudyPlanGenerated] = useLocalStorage<boolean>(`study-plan-done-${localCourse.id}`, false);

  // Edit Course Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Add / Edit Deliverable Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'quiz' | 'assignment' | 'midterm' | 'final' | 'project'>('quiz');
  const [editingDeliverable, setEditingDeliverable] = useState<CourseDeliverable | null>(null);
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

  // Delete-deliverable confirmation (styled modal, not native window.confirm)
  const [deletingDeliverable, setDeletingDeliverable] = useState<CourseDeliverable | null>(null);

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

  // Tabs follow the weightage: a category carrying 0% of the grade has no
  // reason to exist on screen. Legacy rows without weightage show everything.
  const w = course.weightage;
  const tabs: { key: string; label: string; icon: LucideIcon }[] = [
    ...(!w || w.quizzes > 0 ? [{ key: 'quiz', label: 'Quizzes', icon: FileQuestion }] : []),
    ...(!w || w.assignments > 0 ? [{ key: 'assignment', label: 'Assignments', icon: FileText }] : []),
    ...(!w || w.midterm > 0 ? [{ key: 'midterm', label: 'Midterm', icon: Target }] : []),
    ...(!w || w.final > 0 ? [{ key: 'final', label: 'Final', icon: GraduationCap }] : []),
    ...(!w || w.project > 0 ? [{ key: 'project', label: 'Project', icon: Folder }] : []),
    { key: 'insights', label: 'AI Insights', icon: Sparkles },
  ];
  const currentTab = tabs.some(t => t.key === activeTab) ? activeTab : tabs[0].key;

  const gradedCount = courseDeliverables.filter(d => d.score !== undefined && d.score !== '').length;
  const usedQuizNumbers = new Set(quizzes.map(q => q.metadata?.quizNumber).filter((n): n is number => n !== undefined));

  // Engine truth for the AI — replaces the stale legacy grade fields.
  const engineStatus = JSON.stringify({
    estimatedGrade: courseStatus.estimatedGrade,
    projectedScorePct: Number(courseStatus.projectedScore.toFixed(1)),
    percentOfGradeAccountedFor: courseStatus.coveredWeight,
    confidence: courseStatus.confidence,
  });

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
    mutationFn: () => getCourseInsight(course, courseDeliverables, cohortEvidence, engineStatus),
    onSuccess: (insight) => { if (insight) setAiInsight(insight); }
  });

  const criticalActionMutation = useMutation({
    mutationFn: () => getCourseCriticalAction(course, courseDeliverables, cohortEvidence, engineStatus),
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
        // One task per day starting today — a 3-task pileup on one day gets skipped.
        tasks.forEach((task: string, i: number) => {
          const due = new Date();
          due.setDate(due.getDate() + i);
          addTodo({ id: crypto.randomUUID(), text: task, completed: false, dueDate: toLocalISODate(due), createdAt: new Date().toISOString(), course: course.code });
        });
        setStudyPlanGenerated(true);
      }
    }
  });

  const handleGenerateInsight = () => insightMutation.mutate();
  const handleGenerateCriticalAction = () => criticalActionMutation.mutate();
  const handleGenerateStudyPlan = () => studyPlanMutation.mutate();

  // ─── Reminders ────────────────────────────────────────────────
  // Rules live in utils/reminders.ts (pure + tested); this just binds the course.

  const buildCourseReminder = (deliverable: CourseDeliverable): Deadline | null =>
    buildReminder(course.code, deliverable);

  const handleSetReminder = (deliverable: CourseDeliverable) => {
    const reminder = buildCourseReminder(deliverable);
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

    const reminder = buildCourseReminder(project);
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
          addTodo({ id: crypto.randomUUID(), text: `[${project.title}] ${m.title}`, completed: false, dueDate: toLocalISODate(dueDate), createdAt: new Date().toISOString(), course: course.code });
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

  const resetModalFields = () => {
    setEditingDeliverable(null);
    setNewTitle('');
    setNewDate('');
    setNewTopics('');
    setNewTotalMarks('100');
    setNewQuizNumber('');
    setNewLectureRange('');
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Singletons are named automatically — no one names their only final.
    const title = newTitle || AUTO_TITLES[modalType] || '';
    if (!title) return;

    const totalMarks = parseFloat(newTotalMarks);
    if (isNaN(totalMarks) || totalMarks <= 0) {
      toast.error('Total marks must be a positive number');
      return;
    }

    if (editingDeliverable) {
      const updated: CourseDeliverable = {
        ...editingDeliverable,
        title,
        date: newDate || editingDeliverable.date,
        metadata: {
          ...editingDeliverable.metadata,
          topics: newTopics || undefined,
          totalMarks,
          quizNumber: modalType === 'quiz' && newQuizNumber ? parseInt(newQuizNumber) : editingDeliverable.metadata?.quizNumber,
          lectureRange: modalType === 'quiz' ? (newLectureRange || undefined) : editingDeliverable.metadata?.lectureRange,
        },
      };
      // Keep the linked reminder in sync with the new title/date.
      if (updated.metadata?.deadlineId) {
        setDeadlines(deadlines.map(dl => dl.id === updated.metadata!.deadlineId
          ? { ...dl, title: `${course.code}: ${updated.title}`, dueDate: updated.date }
          : dl));
      }
      updateDeliverable(updated);
    } else {
      const deliverable: CourseDeliverable = {
        id: crypto.randomUUID(),
        courseId: course.id,
        type: modalType,
        title,
        date: newDate || toLocalISODate(),
        status: 'scheduled',
        metadata: {
          topics: newTopics || undefined,
          totalMarks,
          quizNumber: modalType === 'quiz' && newQuizNumber ? parseInt(newQuizNumber) : undefined,
          lectureRange: modalType === 'quiz' && newLectureRange ? newLectureRange : undefined,
        }
      };

      const reminder = buildCourseReminder(deliverable);
      if (reminder) {
        deliverable.metadata!.deadlineId = reminder.id;
        addDeadline(reminder);
      }
      addDeliverable(deliverable);
    }

    setIsModalOpen(false);
    resetModalFields();
  };

  const openEditModal = (item: CourseDeliverable) => {
    setEditingDeliverable(item);
    setModalType(item.type);
    setNewTitle(item.title);
    setNewDate(item.date);
    setNewTopics(item.metadata?.topics ?? '');
    setNewTotalMarks(String(item.metadata?.totalMarks ?? 100));
    setNewQuizNumber(item.metadata?.quizNumber !== undefined ? String(item.metadata.quizNumber) : '');
    setNewLectureRange(item.metadata?.lectureRange ?? '');
    setIsModalOpen(true);
  };

  const handleDeleteDeliverable = (item: CourseDeliverable) => setDeletingDeliverable(item);

  const confirmDeleteDeliverable = () => {
    const item = deletingDeliverable;
    if (!item) return;
    // Reminders are real deadline rows — remove the linked one too.
    if (item.metadata?.deadlineId) {
      setDeadlines(deadlines.filter(dl => dl.id !== item.metadata!.deadlineId));
    }
    removeDeliverable(item.id);
    setDeletingDeliverable(null);
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

    // Garbage in here poisons every downstream stat (Z-score, percentile,
    // grade projection) — reject it at the door.
    const totalMarks = deliverable.metadata?.totalMarks || 100;
    const myNumericScore = parseFloat(myScore);
    if (isNaN(myNumericScore) || myNumericScore < 0 || myNumericScore > totalMarks) {
      toast.error(`Your score must be a number between 0 and ${totalMarks}`);
      return;
    }

    let finalAvg = 0;
    let finalStdDev = 0;

    let highest = extractedHighestScore;
    let toppers = extractedToppersCount;
    let sampleSize: number | undefined;

    if (uploadMode === 'bulk') {
      const scores = bulkScores.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n >= 0 && n <= totalMarks);
      if (scores.length === 0) {
        toast.error(`No valid scores found — paste comma-separated numbers between 0 and ${totalMarks}`);
        return;
      }
      finalAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const squareDiffs = scores.map(s => Math.pow(s - finalAvg, 2));
      finalStdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / scores.length);
      sampleSize = scores.length;

      if (highest === undefined) {
         highest = Math.max(...scores);
         toppers = scores.filter(s => s === highest).length;
      }
    } else {
      finalAvg = parseFloat(classAvg);
      if (isNaN(finalAvg) || finalAvg < 0 || finalAvg > totalMarks) {
        toast.error(`Class average must be a number between 0 and ${totalMarks}`);
        return;
      }
    }

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
    resetModalFields();
    setModalType(type);
    setIsModalOpen(true);
  };

  const renderAssessments = (title: string, items: CourseDeliverable[], type: 'quiz' | 'assignment' | 'midterm' | 'final') => {
    // A course has one midterm and one final; quizzes cap at 5. Once the slot
    // is full the Add button disappears instead of inviting duplicates.
    const singletonFull = SINGLETON_TYPES.has(type) && items.length >= 1;
    const quizzesFull = type === 'quiz' && items.length >= MAX_QUIZZES;
    const canAdd = !singletonFull && !quizzesFull;

    return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black uppercase tracking-tighter">{title}</h3>
        <div className="flex gap-3">
          {items.length > 0 && (
            <Button
              onClick={() => { setUploadDeliverableType(type); setIsUploadModalOpen(true); }}
              variant="outline" size="xs"
              className="flex items-center gap-2"
            >
              <Upload size={14} />
              Upload Marks
            </Button>
          )}
          {canAdd && (
            <Button
              onClick={() => openModal(type)}
              variant="primary" size="xs"
              className="flex items-center gap-2"
            >
              <Plus size={14} />
              Add {TYPE_LABELS[type].singular}
            </Button>
          )}
        </div>
      </div>

      {items.map((item) => (
        <Card key={item.id} shadow="sm" className={`p-6 ${item.status === 'scheduled' ? 'border-dashed' : ''}`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h4 className="text-xl font-black leading-tight">{item.title}</h4>
                {item.status === 'graded' && <Badge variant="tertiary" size="sm">Graded</Badge>}
                {item.status === 'below-average' && <Badge variant="secondary" size="sm">Below Average</Badge>}
                {item.status === 'scheduled' && <Badge variant="outline" size="sm">Scheduled</Badge>}
                {(() => {
                  const ds = standingById.get(item.id);
                  if (!ds) return null;
                  return (
                    <Badge
                      variant="outline" size="sm"
                      title={`Z-score ${ds.z.toFixed(2)} vs the class on this ${TYPE_LABELS[item.type].singular.toLowerCase()}`}
                    >
                      Top {topPercentOf(ds.percentile)}% · Z {ds.z >= 0 ? '+' : ''}{ds.z.toFixed(1)}
                    </Badge>
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(item)}
                  aria-label={`Edit ${item.title}`}
                  className="p-1.5 border-2 border-ink bg-white hover:bg-background transition-colors cursor-pointer"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDeleteDeliverable(item)}
                  aria-label={`Delete ${item.title}`}
                  className="p-1.5 border-2 border-ink bg-white hover:bg-secondary hover:text-white transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        </Card>
      ))}
      {items.length === 0 && (
        <div className="text-center p-8 border-2 border-dashed border-ink space-y-3">
          <ZeeMascot
            variant={SINGLETON_TYPES.has(type) ? 'cooked' : 'pencil'}
            size={72}
            className="mx-auto"
          />
          <p className="font-bold uppercase tracking-widest text-xs opacity-60">
            {SINGLETON_TYPES.has(type)
              ? `No ${TYPE_LABELS[type].singular.toLowerCase()} scheduled. The calm before the curve.`
              : `No ${TYPE_LABELS[type].plural} yet. Weights first. Panic never.`}
          </p>
        </div>
      )}
    </div>
    );
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Back Button + Edit */}
      <div className="flex items-center justify-between gap-4">
        <Link to="/courses" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} />
          Back to Courses
        </Link>
        <Button
          onClick={() => setIsEditModalOpen(true)}
          variant="outline" size="xs"
          className="flex items-center gap-2"
        >
          <Pencil size={12} /> Edit Course
        </Button>
      </div>

      {/* Course Header — theme-colored card */}
      <Card shadow="md" className={`${getThemeBgClass(course.themeColor)} ${getThemeTextClass(course.themeColor)} p-8 md:p-10 relative overflow-hidden`}>
        {/* Zee's dot — his old seat on the curve, tied to every course header */}
        <svg viewBox="0 0 64 96" className="absolute top-0 right-8 md:right-12 w-6 md:w-8 pointer-events-none" aria-hidden="true">
          <line x1="32" y1="0" x2="32" y2="58" stroke="#1A1A1A" strokeWidth="3" strokeDasharray="6 5" />
          <circle cx="32" cy="72" r="12" fill="#a8275a" stroke="#1A1A1A" strokeWidth="4" />
        </svg>
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
          {course.weightage && Object.entries(course.weightage)
            .filter(([, val]) => (val as number) > 0)
            .map(([key, val]) => (
              <Badge key={key} variant="outline" className="px-3 py-1">
                {key} {val as number}%
              </Badge>
            ))}
        </div>
      </Card>

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            variant={currentTab === tab.key ? 'ink' : 'outline'}
            size="sm"
            className="flex items-center gap-2"
          >
            <tab.icon size={14} />
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Tab Content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quizzes Tab */}
          {currentTab === 'quiz' && (
            <div className="space-y-6">
              {renderAssessments('Quizzes', quizzes, 'quiz')}

              <PerformanceChart title="Your Performance vs Class Average" items={quizzes} themeColor={course.themeColor} />
            </div>
          )}

          {/* Assignments Tab */}
          {currentTab === 'assignment' && (
            <div className="space-y-6">
              {renderAssessments('Assignments', assignments, 'assignment')}
              <PerformanceChart title="Your Performance vs Class Average" items={assignments} themeColor={course.themeColor} />
            </div>
          )}

          {/* Midterm Tab */}
          {currentTab === 'midterm' && (
            <div className="space-y-6">
              {renderAssessments('Midterm', midterms, 'midterm')}
              <PerformanceChart title="Your Performance vs Class Average" items={midterms} themeColor={course.themeColor} />
            </div>
          )}

          {/* Final Tab */}
          {currentTab === 'final' && (
            <div className="space-y-6">
              {renderAssessments('Final', finals, 'final')}
              <PerformanceChart title="Your Performance vs Class Average" items={finals} themeColor={course.themeColor} />
            </div>
          )}

          {/* Project Tab */}
          {currentTab === 'project' && (
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
                        className="w-full bg-background border-[3px] border-ink p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A] transition-shadow"
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
                        className="w-full bg-background border-[3px] border-ink p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A] transition-shadow"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest opacity-60">Project Idea / Description</label>
                      <textarea 
                        value={initProjectIdea}
                        onChange={(e) => setInitProjectIdea(e.target.value)}
                        className="w-full bg-background border-[3px] border-ink p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A] transition-shadow h-24"
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
                  {/* Master Project Header — course accent color, same as the page header */}
                  <Card shadow="md" className={`flex flex-col md:flex-row justify-between items-start gap-4 ${getThemeBgClass(course.themeColor)} ${getThemeTextClass(course.themeColor)} p-6`}>
                    <div>
                      <span className="inline-block bg-white text-ink px-3 py-1 border-[3px] border-ink shadow-[3px_3px_0px_#1A1A1A] text-[10px] font-black uppercase tracking-widest -rotate-1">Course Project</span>
                      <h3 className="text-3xl font-black uppercase tracking-tighter mt-3">{projects[0].title}</h3>
                      <p className="text-sm font-bold opacity-80 mt-1">Due: {formatDeliverableDate(projects[0].date)}</p>
                    </div>
                    <Button
                      onClick={() => { setUploadDeliverableType('project'); setIsUploadModalOpen(true); }}
                      variant="outline" size="xs" className="flex items-center gap-2 shrink-0"
                    >
                      <Upload size={14} /> Upload Final Marks
                    </Button>
                  </Card>

                  {/* Tech Lead Scope Analyzer — header-strip grammar, flat body */}
                  <Card shadow="md" className="p-0 overflow-hidden">
                    <div className="bg-secondary border-b-4 border-ink p-4 flex items-center gap-3">
                      <Sparkles className="text-white" fill="currentColor" size={20} />
                      <h4 className="text-white text-xl font-black uppercase tracking-tighter">Tech Lead Scope Analyzer</h4>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-sm opacity-60 font-medium">The AI acts as a ruthless Senior Tech Lead to analyze your project idea for scope creep and grade risk.</p>

                      {projects[0].metadata?.scopeFeedback ? (
                        <>
                          <div className="border-2 border-ink bg-background p-4 font-medium leading-relaxed">
                            {projects[0].metadata.scopeFeedback}
                          </div>
                          <Button
                            onClick={handleAnalyzeScope}
                            disabled={aiLoading}
                            variant="outline" size="xs"
                          >
                            {scopeMutation.isPending ? 'Re-analyzing...' : 'Request Re-Analysis'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={handleAnalyzeScope}
                          disabled={aiLoading}
                          variant="secondary" size="sm"
                        >
                          {scopeMutation.isPending ? 'Analyzing Scope...' : 'Analyze Scope'}
                        </Button>
                      )}
                    </div>
                  </Card>

                  {/* Milestone Generator */}
                  <Card shadow="md" className="p-6">
                    <h4 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2"><Target size={20} /> Tactical Milestones</h4>
                    <p className="text-sm opacity-60 mt-2 mb-4 font-medium">Break this project down into 4 actionable milestones with staggered deadlines.</p>

                    {projects[0].metadata?.milestonesGenerated ? (
                      <div className="flex items-center gap-3 font-black uppercase tracking-widest text-sm border-[3px] border-ink bg-[#daf5bc] p-4 shadow-[4px_4px_0px_#1A1A1A]">
                        <CheckCircle2 size={24} className="text-tertiary shrink-0" /> Milestones Injected into Global Todos!
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

          {/* AI Insights Tab — same header-strip grammar as the Dashboard "AI Says" card */}
          {currentTab === 'insights' && (
            <Card shadow="md" className="p-0 overflow-hidden">
              <div className="bg-secondary border-b-4 border-ink p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-white" fill="currentColor" size={24} />
                  <h3 className="text-white text-2xl font-black uppercase tracking-tighter">AI Insights</h3>
                </div>
                <ZeeMascot variant="big-brain" size={52} className="shrink-0" />
              </div>
              <div className="p-8 space-y-5">
                {gradedCount === 0 ? (
                  // No graded work = nothing to analyze. Don't let the AI guess.
                  <span className="inline-block bg-white px-4 py-2 border-[3px] border-ink shadow-[3px_3px_0px_#1A1A1A] font-black text-sm -rotate-1">
                    "Upload marks. I can't fight a curve I can't see." — Zee
                  </span>
                ) : aiInsight ? (
                  <>
                    <p className="text-xl md:text-2xl font-medium leading-snug">
                      "{aiInsight}"
                    </p>
                    <Button
                      onClick={handleGenerateInsight}
                      disabled={aiLoading}
                      variant="outline" size="sm"
                    >
                      {insightMutation.isPending ? 'Zee is running the numbers…' : 'Regenerate Insight'}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-medium leading-snug opacity-60 italic">
                      Generate a personalized, brutally honest insight about your performance in this course based on your recent deliverables.
                    </p>
                    <Button
                      onClick={handleGenerateInsight}
                      disabled={aiLoading}
                      variant="secondary" size="sm" className="flex items-center gap-2"
                    >
                      <Sparkles size={14} /> {insightMutation.isPending ? 'Zee is running the numbers…' : 'Generate Insight'}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Critical Weakness Scan — hazard stripes signal danger; card itself stays on-vibe white */}
          <Card shadow="md" className="p-0 overflow-hidden">
            <div className="hazard-stripes h-4 border-b-4 border-ink" aria-hidden="true"></div>
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="p-1.5 bg-white border-[3px] border-ink shadow-[3px_3px_0px_#1A1A1A] shrink-0">
                  <ZeeMascot variant="locked-in" size={44} />
                </div>
                <div className="space-y-3 flex-1">
                  {criticalAction ? (
                    <>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="text-xl font-black uppercase tracking-tighter">Critical Weakness:</h4>
                        <span className="inline-block bg-secondary text-white px-3 py-1 border-[3px] border-ink shadow-[3px_3px_0px_#1A1A1A] font-black text-sm uppercase tracking-widest -rotate-1">
                          {criticalAction.topic}
                        </span>
                      </div>
                      <p className="font-medium leading-relaxed">
                        {criticalAction.insight}
                      </p>
                      {studyPlanGenerated ? (
                        <p className="text-xs font-black uppercase tracking-widest text-tertiary mt-4">
                          <CheckCircle2 size={14} className="inline mr-1" /> Study Plan added to your Tasks
                        </p>
                      ) : (
                        <Button
                          onClick={handleGenerateStudyPlan}
                          disabled={aiLoading}
                          variant="ink" size="sm" className="mt-2"
                        >
                          {studyPlanMutation.isPending ? 'Zee is drafting the plan…' : 'Generate Study Plan'}
                        </Button>
                      )}
                    </>
                  ) : gradedCount === 0 ? (
                    <>
                      <h4 className="text-xl font-black uppercase tracking-tighter">Critical Weakness Scan</h4>
                      <p className="font-medium leading-relaxed opacity-60 italic">
                        No graded work yet — upload marks on a quiz, assignment or exam and Zee will hunt your weakest topic.
                      </p>
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
                        <Sparkles size={14} /> {criticalActionMutation.isPending ? 'Zee is running the numbers…' : 'Scan for Weaknesses'}
                      </Button>
                    </>
                  )}
                </div>
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

      {/* Add / Edit Deliverable Modal */}
      <Modal open={isModalOpen} onClose={() => { setIsModalOpen(false); resetModalFields(); }}>
        <ModalContent>
          <ModalHeader onClose={() => { setIsModalOpen(false); resetModalFields(); }}>
            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">
              {editingDeliverable ? 'Edit' : 'Add'} {TYPE_LABELS[modalType].singular}
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
                      {/* A quiz number can exist once per course; an edit keeps its own. */}
                      {[1, 2, 3, 4, 5]
                        .filter((n) => !usedQuizNumbers.has(n) || n === editingDeliverable?.metadata?.quizNumber)
                        .map((n) => (
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
              {/* One midterm, one final — they name themselves. */}
              {!SINGLETON_TYPES.has(modalType) && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest opacity-60">Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                    placeholder={`e.g., ${modalType === 'quiz' ? 'Quiz 4: Graphs' : 'HW 3'}`}
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary-container"
                />
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                  {editingDeliverable
                    ? (editingDeliverable.metadata?.deadlineId ? 'Linked reminder updates with this date' : 'No reminder linked')
                    : (!newDate || isTodayOrFuture(newDate))
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
                {editingDeliverable ? 'Save Changes' : `Add ${TYPE_LABELS[modalType].singular}`}
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
                  className="w-full bg-background border-[3px] border-ink p-3 font-bold focus:outline-none focus:shadow-[4px_4px_0px_#1A1A1A] transition-shadow"
                  required
                >
                  <option value="" disabled>Choose a {uploadDeliverableType}...</option>
                  {courseDeliverables
                    .filter(q => q.type === uploadDeliverableType)
                    .sort((a, b) => Number(b.status === 'scheduled') - Number(a.status === 'scheduled'))
                    .map(q => (
                      <option key={q.id} value={q.id}>
                        {q.title} ({formatDeliverableDate(q.date)}){q.status !== 'scheduled' ? ' — graded, re-upload' : ''}
                      </option>
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
                  type="number" min={0} step="any"
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
                    type="number" min={0} step="any"
                    value={classAvg}
                    onChange={(e) => setClassAvg(e.target.value)}
                    className="w-full bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-tertiary"
                    placeholder="e.g., 72.5"
                    required
                  />
                  <p className="text-[11px] font-bold opacity-60">
                    Class average alone gives your gap to the mean. Switch to <span className="font-black">Bulk Paste</span> and paste the class scores to unlock your Z-score & percentile.
                  </p>
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

      {/* Delete Deliverable Confirmation */}
      {deletingDeliverable && (
        <Modal open onClose={() => setDeletingDeliverable(null)}>
          <ModalContent>
            <ModalHeader onClose={() => setDeletingDeliverable(null)}>
              <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">
                Delete {deletingDeliverable.title}?
              </h3>
            </ModalHeader>
            <ModalBody>
              <p className="text-sm font-bold">
                Its recorded score{deletingDeliverable.metadata?.deadlineId ? ' and its reminder' : ''} will be
                permanently deleted. This cannot be undone.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => setDeletingDeliverable(null)}>
                Keep
              </Button>
              <Button type="button" variant="danger" onClick={confirmDeleteDeliverable} className="flex items-center gap-2">
                <Trash2 size={14} /> Yes, Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
};

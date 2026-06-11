import { useState, FormEvent, ChangeEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAI } from '../hooks/useAI';
import { CourseDeliverable } from '../types';
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
  Settings
} from 'lucide-react';
import { useProfile } from '../domain/profile/useProfile';
import { useCourses } from '../domain/courses/useCourses';
import { useDeliverables } from '../domain/deliverables/useDeliverables';
import { useTodos } from '../domain/todos/useTodos';
import { getThemeBgClass, getThemeTextClass } from '../utils/impactStyles';
import { calculateCourseStatus } from '../utils/gpaEngine';
import { Button, Card, Badge, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './ui';

const TABS = ['Quizzes', 'Assignments', 'Midterm', 'Final', 'Project', 'AI Insights'];

export const CourseDetail = () => {
  const { id } = useParams();
  const { userProfile } = useProfile();
  const { courses } = useCourses();
  const { deliverables, addDeliverable, updateDeliverable } = useDeliverables();
  const { addTodo } = useTodos();
  const { getCourseInsight, getCourseCriticalAction, generateCourseStudyPlan, extractClassMarks, loading: aiLoading } = useAI();
  
  const [activeTab, setActiveTab] = useState(0);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [criticalAction, setCriticalAction] = useState<{topic: string, insight: string} | null>(null);
  const [studyPlanGenerated, setStudyPlanGenerated] = useState(false);
  
  // Add Deliverable Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'quiz' | 'assignment' | 'midterm' | 'final' | 'project'>('quiz');
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTopics, setNewTopics] = useState('');
  const [newTotalMarks, setNewTotalMarks] = useState('100');

  // Upload Marks Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDeliverableType, setUploadDeliverableType] = useState<'quiz' | 'midterm' | 'final' | 'project'>('quiz');
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
  
  const { analyzeProjectScope, generateProjectMilestones } = useAI();

  const localCourse = courses.find((c) => c.id === id);

  if (!localCourse) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-4xl font-black uppercase">Course Not Found</h2>
        <Link to="/dashboard" className="text-tertiary underline font-bold">Return to Dashboard</Link>
      </div>
    );
  }

  const course = {
    ...localCourse,
    instructor: 'Dr. AI Professor',
  };

  const courseDeliverables = deliverables.filter(d => d.courseId === localCourse.id);
  const quizzes = courseDeliverables.filter(d => d.type === 'quiz');
  const assignments = courseDeliverables.filter(d => d.type === 'assignment');
  const midterms = courseDeliverables.filter(d => d.type === 'midterm');
  const finals = courseDeliverables.filter(d => d.type === 'final');
  const projects = courseDeliverables.filter(d => d.type === 'project');

  // Use the new gpaEngine for all calculations
  const courseStatus = calculateCourseStatus(course, courseDeliverables);
  
  const statYourAverage = courseStatus.coveredWeight > 0 ? courseStatus.projectedScore.toFixed(1) + '%' : 'N/A';
  
  // Calculate class average (basic average of all entered classAvgs)
  let classAvgsCount = 0;
  let classAvgsSum = 0;
  let stdDevCount = 0;
  let stdDevSum = 0;
  
  courseDeliverables.forEach(d => {
    const avg = parseFloat(d.metadata?.classAvg as string || 'NaN');
    if (!isNaN(avg)) {
      classAvgsSum += avg;
      classAvgsCount++;
    }
    const stdDev = parseFloat(d.metadata?.classStdDev as unknown as string || 'NaN');
    if (!isNaN(stdDev)) {
      stdDevSum += stdDev;
      stdDevCount++;
    }
  });
  
  const statClassAverage = classAvgsCount > 0 ? (classAvgsSum / classAvgsCount).toFixed(1) + '%' : 'N/A';
  const statStdDeviation = stdDevCount > 0 ? (stdDevSum / stdDevCount).toFixed(1) : 'N/A';
  
  const statProjectedGrade = courseStatus.estimatedGrade;
  const statProjectedNote = `Based on weightage (${courseStatus.coveredWeight}% of final grade accounted for)`;
  
  let statDistanceTopper = 'N/A';
  let maxGapSum = 0;
  let gapCount = 0;
  courseDeliverables.forEach(d => {
    const highest = d.metadata?.highestScore;
    const score = parseFloat(d.score || '0');
    if (highest !== undefined && !isNaN(score)) {
       const max = d.metadata?.totalMarks || 100;
       maxGapSum += ((highest - score) / max) * 100;
       gapCount++;
    }
  });
  
  if (gapCount > 0) {
    statDistanceTopper = '-' + (maxGapSum / gapCount).toFixed(1) + '%';
  }

  const handleGenerateInsight = async () => {
    const insight = await getCourseInsight(course, courseDeliverables);
    if (insight) {
      setAiInsight(insight);
    }
  };

  const handleGenerateCriticalAction = async () => {
    const action = await getCourseCriticalAction(course, courseDeliverables);
    if (action) {
      setCriticalAction(action);
      setStudyPlanGenerated(false);
    }
  };

  const handleGenerateStudyPlan = async () => {
    if (!criticalAction) return;
    const tasks = await generateCourseStudyPlan(course, courseDeliverables, criticalAction.topic);
    if (tasks) {
      const today = new Date().toISOString().split('T')[0];
      tasks.forEach((task: string) => {
        addTodo({
          id: crypto.randomUUID(),
          text: task,
          completed: false,
          dueDate: today,
          createdAt: new Date().toISOString(),
          course: course.code
        });
      });
      setStudyPlanGenerated(true);
    }
  };

  // Project Functions

  const handleInitializeProject = (e: FormEvent) => {
    e.preventDefault();
    if (!initProjectTitle || !initProjectDeadline) return;

    addDeliverable({
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
    });
  };


  const handleAnalyzeScope = async () => {
    const project = projects[0];
    if (!project || !project.metadata?.projectIdea) return;
    
    const analysis = await analyzeProjectScope(project.metadata.projectIdea, project.date);
    if (analysis) {
      updateDeliverable({
        ...project,
        metadata: {
          ...project.metadata,
          scopeFeedback: analysis.feedback
        }
      });
    }
  };

  const handleGenerateMilestones = async () => {
    const project = projects[0];
    if (!project || !project.metadata?.projectIdea) return;
    
    const milestones = await generateProjectMilestones(project.metadata.projectIdea, project.date);
    if (milestones) {
      milestones.forEach(m => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + m.daysFromNow);
        addTodo({
          id: crypto.randomUUID(),
          text: `[${project.title}] ${m.title}`,
          completed: false,
          dueDate: dueDate.toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          course: course.code
        });
      });

      updateDeliverable({
        ...project,
        metadata: {
          ...project.metadata,
          milestonesGenerated: true
        }
      });
    }
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    addDeliverable({
      id: crypto.randomUUID(),
      courseId: course.id,
      type: modalType,
      title: newTitle,
      date: newDate || new Date().toISOString().split('T')[0],
      status: 'scheduled',
      metadata: {
        topics: newTopics || undefined,
        totalMarks: parseFloat(newTotalMarks) || 100,
      }
    });

    setIsModalOpen(false);
    setNewTitle('');
    setNewDate('');
    setNewTopics('');
    setNewTotalMarks('100');
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const deliverable = deliverables.find(d => d.id === uploadDeliverableId);
    if (!deliverable) return;
    const totalMarks = deliverable.metadata?.totalMarks || 100;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      const extracted = await extractClassMarks(base64String, file.type, userProfile?.registrationNumber, totalMarks);
      if (extracted) {
        if (extracted.myScore !== null) {
          setMyScore(extracted.myScore.toString());
        }
        setBulkScores(extracted.allScores.join(', '));
        setExtractedHighestScore(extracted.highestScore);
        setExtractedToppersCount(extracted.toppersCount);
      }
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

    if (uploadMode === 'bulk') {
      const scores = bulkScores.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      if (scores.length > 0) {
        finalAvg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const squareDiffs = scores.map(s => Math.pow(s - finalAvg, 2));
        finalStdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / scores.length);
        
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
        toppersCount: toppers
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

  const renderAssessments = (title: string, items: CourseDeliverable[], type: 'quiz' | 'midterm' | 'final') => (
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
            Add {type === 'quiz' ? 'Quiz' : type === 'midterm' ? 'Midterm' : 'Final'}
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
              </div>
              <div className="flex items-center gap-4 text-xs font-bold opacity-60">
                <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                {item.score && <span className="flex items-center gap-1"><Star size={12} /> Score: {item.score}</span>}
                {item.metadata?.classAvg && <span className="italic">Class Avg: {item.metadata.classAvg}</span>}
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
                <Button variant="outline" size="xs" className="px-3 py-1 text-[10px]">
                  Set Reminder
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
      {items.length === 0 && (
        <div className="text-center p-8 border-2 border-dashed border-ink opacity-60 font-bold uppercase tracking-widest text-xs">
          No {type === 'quiz' ? 'quizzes' : type === 'midterm' ? 'midterms' : 'finals'} found.
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* Back Button */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
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
            <p className="text-4xl font-black leading-none mt-1">{course.grade}</p>
          </Card>
        </div>
        
        {/* Weightage Pills */}
        <div className="flex flex-wrap gap-3 mt-6">
          <span className="bg-ink text-white px-3 py-1 text-xs font-black uppercase tracking-widest">
            {course.credits} Credit Hours
          </span>
          {course.weightage && Object.entries(course.weightage).map(([key, val]) => (
            <Badge key={key} variant="outline" className="px-3 py-1">
              {key} {val}%
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

              {/* Performance Chart */}
              <Card shadow="sm" className="p-8">
                <h4 className="text-sm font-black uppercase tracking-widest mb-6">Your Performance vs Class Average</h4>
                <div className="relative h-48 w-full border-b-4 border-ink flex items-end justify-around px-8 gap-8">
                  {['Quiz 1', 'Quiz 2', 'Quiz 3'].map((label, i) => (
                    <div key={label} className="flex-1 flex items-end justify-center gap-2 h-full">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div 
                          className={`w-full ${getThemeBgClass(course.themeColor)} border-2 border-ink`} 
                          style={{ height: i === 0 ? '80%' : i === 1 ? '50%' : '10%' }}
                        ></div>
                      </div>
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div 
                          className="w-full bg-ink/20 border-2 border-ink" 
                          style={{ height: i === 0 ? '65%' : i === 1 ? '72%' : '10%' }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-around text-[10px] font-black uppercase tracking-widest mt-3 px-8">
                  <span>Quiz 1</span>
                  <span>Quiz 2</span>
                  <span>Quiz 3</span>
                </div>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2 text-[10px] font-bold"><div className={`w-3 h-3 ${getThemeBgClass(course.themeColor)} border border-ink`}></div> You</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold"><div className="w-3 h-3 bg-ink/20 border border-ink"></div> Class Average</div>
                </div>
              </Card>
            </div>
          )}

          {/* Assignments Tab */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase tracking-tighter">Assignments</h3>
                <Button 
                  onClick={() => openModal('assignment')}
                  variant="primary" size="xs"
                  className="flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Assignment
                </Button>
              </div>
              {assignments.map((item) => (
                <Card key={item.id} shadow="sm" className="p-6 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="p-2 border-2 border-ink bg-tertiary text-white">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-lg">{item.title}</h4>
                      <p className="text-xs font-bold opacity-40 uppercase tracking-widest">{item.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase opacity-40">Score</p>
                    <p className="font-black text-xl">{item.score || '-'}</p>
                  </div>
                </Card>
              ))}
              {assignments.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-ink opacity-60 font-bold uppercase tracking-widest text-xs">
                  No assignments found.
                </div>
              )}
            </div>
          )}

          {/* Midterms Tab */}
          {activeTab === 2 && renderAssessments('Midterms', midterms, 'midterm')}

          {/* Finals Tab */}
          {activeTab === 3 && renderAssessments('Finals', finals, 'final')}

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
                        type="text" 
                        value={initProjectDeadline}
                        onChange={(e) => setInitProjectDeadline(e.target.value)}
                        className="w-full bg-background border-2 border-ink p-3 font-bold focus:outline-none focus:ring-2 focus:ring-tertiary"
                        placeholder="e.g., Dec 15"
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
                      <p className="text-sm font-bold opacity-80 mt-1">Due: {projects[0].date}</p>
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
                          {aiLoading ? 'Re-analyzing...' : 'Request Re-Analysis'}
                        </button>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleAnalyzeScope}
                        disabled={aiLoading}
                        variant="outline" size="sm" className="bg-white text-ink"
                      >
                        {aiLoading ? 'Analyzing Scope...' : 'Analyze Scope'}
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
                        {aiLoading ? 'Generating Milestones...' : 'Generate & Inject Milestones'}
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
                      {aiLoading ? 'Analyzing...' : 'Regenerate Insight'}
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
                      {aiLoading ? 'Analyzing...' : 'Generate Insight'}
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
                        {aiLoading ? 'Generating Plan...' : 'Generate Study Plan'}
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
                      <Sparkles size={14} /> {aiLoading ? 'Analyzing...' : 'Scan for Weaknesses'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          {/* Quick Stats */}
          <Card shadow="sm" className="p-0">
            <div className="p-6 border-b-4 border-ink">
              <h3 className="text-xl font-black uppercase tracking-tighter">Quick Stats</h3>
            </div>
            <div className="p-6 space-y-5">
              {[
                { label: 'Your Average', value: statYourAverage },
                { label: 'Class Average', value: statClassAverage },
                { label: 'Std Deviation', value: statStdDeviation },
              ].map((stat) => (
                <div key={stat.label} className="flex justify-between items-center border-b border-ink/10 pb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{stat.label}</span>
                  <span className="text-xl font-black">{stat.value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center border-b border-ink/10 pb-3">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Distance from Topper</span>
                <span className="text-xl font-black text-secondary">{statDistanceTopper}</span>
              </div>
            </div>
            {/* Current Projected Grade */}
            <div className={`p-6 ${getThemeBgClass(course.themeColor)} ${getThemeTextClass(course.themeColor)} border-t-4 border-ink`}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1">Current Projected Grade</p>
              <p className="text-4xl font-black leading-none">{statProjectedGrade}</p>
              <p className="text-[10px] font-bold uppercase mt-2 opacity-60">{statProjectedNote}</p>
            </div>
          </Card>

          {/* Recommended Resource */}
          <Card shadow="sm" className="overflow-hidden p-0">
            <div className="h-48 bg-ink overflow-hidden relative">
              <img 
                alt="Code visualization" 
                className="w-full h-full object-cover opacity-60 mix-blend-luminosity" 
                src="https://picsum.photos/seed/code/400/300"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-6">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Recommended Resource</p>
              <h4 className="text-lg font-black leading-tight">Visualizing Data Structures: An Interactive Guide</h4>
            </div>
          </Card>
        </div>
      </div>

      {/* Add Deliverable Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <ModalContent>
          <ModalHeader onClose={() => setIsModalOpen(false)}>
            <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">
              Add {modalType === 'quiz' ? 'Quiz' : modalType === 'midterm' ? 'Midterm' : modalType === 'final' ? 'Final' : 'Assignment'}
            </h3>
          </ModalHeader>
          <form onSubmit={handleAddSubmit}>
            <ModalBody className="space-y-6">
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
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Date (Optional)</label>
                <input 
                  type="text" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  placeholder="e.g., Dec 01"
                />
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
                Set Reminder
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
    </div>
  );
};

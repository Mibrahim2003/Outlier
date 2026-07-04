import { useMemo, useState, FormEvent } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Course } from '../types';
import { getThemeBgClass, getImpactLevelForCredits, ThemeColor } from '../utils/impactStyles';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './ui';

const WEIGHT_CATEGORIES = [
  { key: 'quizzes', label: 'Quizzes' },
  { key: 'assignments', label: 'Assignments' },
  { key: 'midterm', label: 'Midterm' },
  { key: 'final', label: 'Final' },
  { key: 'project', label: 'Project' },
] as const;

const DEFAULT_WEIGHTAGE: Course['weightage'] = { quizzes: 10, assignments: 20, midterm: 25, final: 35, project: 10 };

interface CourseFormModalProps {
  onClose: () => void;
  /** When present the modal edits this course; otherwise it creates a new one. */
  course?: Course;
  onSubmit: (course: Course) => void;
  /** Edit mode only: called after the user confirms deletion. */
  onDelete?: () => void;
  /** Edit mode only: how many deliverables would be deleted along with the course. */
  deliverableCount?: number;
}

/**
 * Shared add/edit course form. Mount it only while open (`{isOpen && <CourseFormModal …/>}`)
 * so each opening starts from fresh state.
 */
export const CourseFormModal = ({ onClose, course, onSubmit, onDelete, deliverableCount = 0 }: CourseFormModalProps) => {
  const isEdit = !!course;

  const [code, setCode] = useState(course?.code ?? '');
  const [name, setName] = useState(course?.name ?? '');
  const [credits, setCredits] = useState(course?.credits ?? 3);
  const [themeColor, setThemeColor] = useState<ThemeColor>(course?.themeColor ?? 'yellow');
  const [weightage, setWeightage] = useState<Course['weightage']>(course?.weightage ?? DEFAULT_WEIGHTAGE);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const totalWeight = useMemo(
    () => Object.values(weightage).reduce((sum, val) => sum + (Number(val) || 0), 0),
    [weightage]
  );

  const isValid = code.trim() !== '' && name.trim() !== '' && Number(credits) > 0 && totalWeight === 100;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    onSubmit({
      id: course?.id ?? crypto.randomUUID(),
      code: code.trim().toUpperCase(),
      name: name.trim().toUpperCase(),
      credits: Number(credits),
      impactLevel: getImpactLevelForCredits(Number(credits)),
      themeColor,
      gradeProgress: course?.gradeProgress ?? 0,
      grade: course?.grade ?? 'N/A',
      weightage,
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose}>
      <ModalContent>
        <ModalHeader onClose={onClose}>
          <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">
            {isEdit ? `Edit ${course.code}` : 'Add Course'}
          </h3>
        </ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Course Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold uppercase placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  placeholder="e.g. CS50"
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Course Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold uppercase placeholder:opacity-30 focus:outline-none focus:ring-2 focus:ring-primary-container"
                  placeholder="e.g. Intro to Computer Science"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Credit Hours</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={credits || ''}
                  onChange={(e) => setCredits(parseInt(e.target.value) || 0)}
                  className="w-full bg-background border-2 border-ink p-3 font-bold focus:outline-none focus:ring-2 focus:ring-primary-container"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest opacity-60">Accent Color</label>
                <div className="flex gap-3 pb-1">
                  {(['yellow', 'pink', 'green', 'blue', 'purple'] as ThemeColor[]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setThemeColor(color)}
                      aria-label={`${color} accent`}
                      aria-pressed={themeColor === color}
                      className={`w-9 h-9 rounded-full border-4 transition-all ${
                        themeColor === color ? 'border-ink scale-110' : 'border-ink/20 opacity-80 hover:opacity-100'
                      } ${getThemeBgClass(color)}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Weightage matrix */}
            <div className="border-2 border-ink bg-ink p-4 space-y-4">
              <div className="flex justify-between items-end border-b-2 border-white pb-2">
                <span className="text-white font-black uppercase tracking-widest text-sm">Grade Weightage</span>
                <span className={`text-xs font-black tracking-widest ${totalWeight === 100 ? 'text-primary-container' : 'text-[#ff8fa3]'}`}>
                  {totalWeight}% / 100%
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {WEIGHT_CATEGORIES.map((cat) => (
                  <div key={cat.key} className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase text-white tracking-widest">{cat.label}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={weightage[cat.key] || ''}
                      onChange={(e) =>
                        setWeightage((prev) => ({ ...prev, [cat.key]: parseInt(e.target.value) || 0 }))
                      }
                      className="w-full bg-transparent border-b-4 border-white text-white p-2 text-xl font-bold text-center focus:outline-none focus:border-primary-container"
                    />
                  </div>
                ))}
              </div>
              {totalWeight !== 100 && (
                <p className="text-[10px] font-black uppercase tracking-widest text-[#ff8fa3]">
                  Weights must add up to exactly 100%
                </p>
              )}
            </div>

            {/* Danger zone — edit mode only */}
            {isEdit && onDelete && (
              <div className="border-2 border-error p-4 space-y-3">
                <div className="flex items-center gap-2 text-error">
                  <AlertTriangle size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">Danger Zone</span>
                </div>
                {confirmingDelete ? (
                  <div className="space-y-3">
                    <p className="text-sm font-bold">
                      Delete {course.code} permanently?
                      {deliverableCount > 0 && (
                        <> Its {deliverableCount} recorded {deliverableCount === 1 ? 'deliverable' : 'deliverables'} (quizzes, marks, projects) will be deleted too.</>
                      )}{' '}
                      This cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
                        Keep Course
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => { onDelete(); onClose(); }}
                        className="flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Yes, Delete Everything
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-bold opacity-70">Remove this course and all its data.</p>
                    <Button type="button" variant="danger" size="sm" onClick={() => setConfirmingDelete(true)} className="flex items-center gap-2 shrink-0">
                      <Trash2 size={14} /> Delete Course
                    </Button>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="ink" disabled={!isValid}>
              {isEdit ? 'Save Changes' : 'Add Course'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
};

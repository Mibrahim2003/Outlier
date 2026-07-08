import { useMemo, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../domain/profile/useProfile';
import { UserProfile } from '../types';
import { Button, Input, cardVariants, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from './ui';
import { DEFAULT_GRADING_SCALE } from '../utils/gpaEngine';
import {
  Trash2,
  Plus,
  Settings as SettingsIcon,
  GraduationCap,
  Swords,
  Heart,
  Terminal,
  Cpu,
  Volume2,
  UserRound,
  KeyRound,
  LogOut,
  Loader2,
  RotateCcw,
  Check,
} from 'lucide-react';

type SectionId = 'account' | 'profile' | 'grading' | 'ai' | 'feedback';

const SECTIONS: { id: SectionId; label: string; icon: typeof GraduationCap }[] = [
  { id: 'account', label: 'Account', icon: UserRound },
  { id: 'profile', label: 'Academic Profile', icon: GraduationCap },
  { id: 'grading', label: 'Grading Scale', icon: SettingsIcon },
  { id: 'ai', label: 'AI Engine', icon: Cpu },
  { id: 'feedback', label: 'Feedback & Sound', icon: Volume2 },
];

// ─── Shared bits ─────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, title, hint }: { icon: typeof GraduationCap; title: string; hint?: string }) => (
  <div className="border-b-4 border-ink pb-4">
    <div className="flex items-center gap-3">
      <Icon size={28} className="text-ink" />
      <h3 className="text-2xl font-black uppercase tracking-widest text-ink">{title}</h3>
    </div>
    {hint && <p className="text-xs font-bold text-ink/50 uppercase tracking-widest mt-2">{hint}</p>}
  </div>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <span className="text-error text-xs font-bold mt-1 block">{message}</span> : null;

const ToggleSwitch = ({ checked, onChange, accent, label }: { checked: boolean; onChange: (value: boolean) => void; accent: 'secondary' | 'tertiary'; label: string }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input
      type="checkbox"
      className="sr-only peer"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      aria-label={label}
    />
    <div className={`relative w-16 h-8 bg-white border-4 border-ink ${accent === 'secondary' ? 'peer-checked:bg-secondary' : 'peer-checked:bg-tertiary'} after:content-[''] after:absolute after:top-0 after:left-0 after:bg-ink after:h-full after:w-6 after:transition-transform peer-checked:after:translate-x-8 shadow-[2px_2px_0px_#1A1A1A]`}></div>
  </label>
);

const SaveBar = ({ isDirty, isSubmitting }: { isDirty: boolean; isSubmitting: boolean }) => (
  <div className="flex items-center justify-end gap-4 pt-4 border-t-2 border-ink/10">
    {isDirty && !isSubmitting && (
      <span className="text-xs font-black uppercase tracking-widest text-secondary">Unsaved changes</span>
    )}
    <Button type="submit" disabled={!isDirty || isSubmitting} className="flex items-center gap-2">
      {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
      {isSubmitting ? 'Saving...' : 'Save Changes'}
    </Button>
  </div>
);

// ─── Account ─────────────────────────────────────────────────────

const AccountSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const providers = user?.identities?.map((i) => i.provider) ?? [];
  const hasEmailIdentity = providers.includes('email');
  const providerLabel = providers.length > 0
    ? providers.map((p) => (p === 'email' ? 'Email & Password' : p.charAt(0).toUpperCase() + p.slice(1))).join(' + ')
    : 'Unknown';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const deleteArmed = deleteConfirmText.trim().toUpperCase() === 'DELETE';

  const closeDelete = () => {
    if (deleting) return;
    setShowDelete(false);
    setDeleteConfirmText('');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    // Wipes the auth.users row; every public table cascades off it. See
    // migrations/20260708000000_add_delete_account_rpc.sql.
    const { error } = await supabase.rpc('delete_user_account');
    if (error) {
      setDeleting(false);
      toast.error('Could not delete account', { description: error.message });
      return;
    }
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    setUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      toast.success('Password updated');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={UserRound} title="Account" />

      {/* Identity */}
      <div className="p-4 bg-background border-3 border-ink shadow-[4px_4px_0px_#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-ink/50 mb-1">Signed in as</p>
          <p className="font-black text-lg break-all">{user?.email || 'Unknown'}</p>
        </div>
        <span className="shrink-0 bg-ink text-white px-3 py-1 text-xs font-black uppercase tracking-widest self-start sm:self-center">
          {providerLabel}
        </span>
      </div>

      {/* Password */}
      <div className="p-4 bg-white border-3 border-ink shadow-[4px_4px_0px_#1A1A1A] space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound size={18} />
          <h4 className="font-black uppercase tracking-widest text-lg">Password</h4>
        </div>
        {hasEmailIdentity ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">New Password</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Confirm New Password</label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat it"
                />
              </div>
            </div>
            <FieldError message={passwordError ?? undefined} />
            <Button type="submit" variant="outline" size="sm" disabled={updatingPassword || !newPassword} className="flex items-center gap-2">
              {updatingPassword && <Loader2 size={14} className="animate-spin" />}
              {updatingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        ) : (
          <p className="text-sm font-bold opacity-70">
            You sign in with Google, so your password is managed by your Google account.
          </p>
        )}
      </div>

      {/* Sign out */}
      <div className="p-4 bg-white border-3 border-ink shadow-[4px_4px_0px_#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-black uppercase tracking-widest text-lg">Sign Out</h4>
          <p className="text-sm font-bold opacity-70 mt-1">End your session on this device.</p>
        </div>
        <Button variant="danger" size="sm" onClick={handleSignOut} className="flex items-center gap-2 shrink-0">
          <LogOut size={14} /> Sign Out
        </Button>
      </div>

      {/* Danger zone — delete account */}
      <div className="p-4 bg-white border-3 border-error shadow-[4px_4px_0px_#1A1A1A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="font-black uppercase tracking-widest text-lg text-error">Delete Account</h4>
          <p className="text-sm font-bold opacity-70 mt-1">
            Permanently erase your account and all of its data. This cannot be undone.
          </p>
        </div>
        <Button variant="danger" size="sm" onClick={() => setShowDelete(true)} className="flex items-center gap-2 shrink-0">
          <Trash2 size={14} /> Delete Account
        </Button>
      </div>

      {showDelete && (
        <Modal open onClose={closeDelete}>
          <ModalContent>
            <ModalHeader onClose={closeDelete}>
              <h3 className="text-2xl font-black uppercase tracking-tighter leading-none text-error">Delete account</h3>
            </ModalHeader>
            <ModalBody className="space-y-4">
              <p className="text-sm font-bold">
                This permanently deletes your account and <span className="font-black">everything in it</span> — profile,
                courses, marks, calendar, reminders, and tasks. It cannot be undone.
              </p>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest block">
                  Type <span className="text-error">DELETE</span> to confirm
                </label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button type="button" variant="outline" onClick={closeDelete} disabled={deleting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteAccount}
                disabled={deleting || !deleteArmed}
                className="flex items-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : 'Delete Forever'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
};

// ─── Academic Profile ────────────────────────────────────────────

// CGPA cap follows the user's grading scale (top GPC) so 4.0 / 5.0 / 10.0
// universities can all enter their real numbers — same rule as ProfileSetup.
const makeProfileFormSchema = (maxGpa: number) =>
  z.object({
    name: z.string().trim().min(1, 'Your name is required'),
    registrationNumber: z.string().trim().optional(),
    universityName: z.string().trim().min(1, 'University name is required'),
    degree: z.string().trim().min(1, 'Degree is required'),
    graduationYear: z.string().trim().min(4, 'Enter your graduation year'),
    semester: z.string().trim().min(1, 'Semester is required'),
    currentCgpa: z.number({ error: 'Enter your current CGPA' }).min(0, 'Cannot be negative').max(maxGpa, `Cannot exceed ${maxGpa}`),
    targetGpa: z.number({ error: 'Enter your target CGPA' }).min(0, 'Cannot be negative').max(maxGpa, `Cannot exceed ${maxGpa}`),
  });

type ProfileFormValues = z.infer<ReturnType<typeof makeProfileFormSchema>>;

const ProfileSection = ({ userProfile, onSave }: { userProfile: UserProfile; onSave: (profile: UserProfile) => Promise<void> }) => {
  const maxGpa = useMemo(() => {
    const scale = userProfile.gradingScale;
    return scale && scale.length > 0 ? Math.max(...scale.map((s) => s.gpc)) : 10;
  }, [userProfile.gradingScale]);
  const schema = useMemo(() => makeProfileFormSchema(maxGpa), [maxGpa]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: userProfile.name,
      registrationNumber: userProfile.registrationNumber ?? '',
      universityName: userProfile.universityName,
      degree: userProfile.degree,
      graduationYear: userProfile.graduationYear,
      semester: userProfile.semester,
      currentCgpa: userProfile.currentCgpa,
      targetGpa: userProfile.targetGpa,
    },
  });

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await onSave({ ...userProfile, ...values });
      reset(values);
      toast.success('Profile saved');
    } catch {
      // The global mutation error toast already reported the failure.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <SectionHeader icon={GraduationCap} title="Academic Profile" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Full Name</label>
          <Input {...register('name')} />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Registration Number</label>
          <Input {...register('registrationNumber')} placeholder="e.g. 2021034" />
          <p className="text-[10px] font-bold text-ink/40 uppercase tracking-widest mt-1">
            Used to find you in uploaded class marksheets
          </p>
          <FieldError message={errors.registrationNumber?.message} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">University Name</label>
          <Input {...register('universityName')} />
          <FieldError message={errors.universityName?.message} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Degree / Major</label>
          <Input {...register('degree')} />
          <FieldError message={errors.degree?.message} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Current Semester</label>
          <Input type="number" min="1" max="12" {...register('semester')} />
          <FieldError message={errors.semester?.message} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Graduation Year</label>
          <Input type="number" min="2000" max="2100" {...register('graduationYear')} placeholder="e.g. 2027" />
          <FieldError message={errors.graduationYear?.message} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Current CGPA</label>
          <Input type="number" step="0.01" min="0" max={maxGpa} {...register('currentCgpa', { valueAsNumber: true })} />
          <FieldError message={errors.currentCgpa?.message} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Target CGPA</label>
          <Input type="number" step="0.01" min="0" max={maxGpa} {...register('targetGpa', { valueAsNumber: true })} />
          <FieldError message={errors.targetGpa?.message} />
        </div>
      </div>

      <SaveBar isDirty={isDirty} isSubmitting={isSubmitting} />
    </form>
  );
};

// ─── Grading Scale ───────────────────────────────────────────────

const GradingFormSchema = z.object({
  gradingScale: z
    .array(
      z.object({
        grade: z.string().trim().min(1, 'Required'),
        gpc: z.number({ error: 'Enter a number' }).min(0, 'Min 0').max(5, 'Max 5'),
        minPercentage: z.number({ error: 'Enter a number' }).min(0, 'Min 0').max(100, 'Max 100'),
      })
    )
    .min(1, 'Keep at least one grade row')
    .superRefine((rows, ctx) => {
      const seen = new Set<string>();
      rows.forEach((row, index) => {
        const key = row.grade.trim().toUpperCase();
        if (!key) return;
        if (seen.has(key)) {
          ctx.addIssue({ code: 'custom', message: `Duplicate grade "${row.grade.trim()}"`, path: [index, 'grade'] });
        }
        seen.add(key);
      });
    }),
});

type GradingFormValues = z.infer<typeof GradingFormSchema>;

const GradingSection = ({ userProfile, onSave }: { userProfile: UserProfile; onSave: (profile: UserProfile) => Promise<void> }) => {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<GradingFormValues>({
    resolver: zodResolver(GradingFormSchema),
    defaultValues: {
      gradingScale: (userProfile.gradingScale?.length ? userProfile.gradingScale : DEFAULT_GRADING_SCALE).map((row) => ({
        grade: row.grade,
        gpc: row.gpc,
        minPercentage: row.minPercentage ?? 0,
      })),
    },
  });

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'gradingScale' });

  const onSubmit = async (values: GradingFormValues) => {
    try {
      await onSave({ ...userProfile, gradingScale: values.gradingScale });
      reset(values);
      toast.success('Grading scale saved');
    } catch {
      // The global mutation error toast already reported the failure.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <SectionHeader
          icon={SettingsIcon}
          title="Grading Scale"
          hint="The GPA engine uses this to project your grades"
        />
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => replace(DEFAULT_GRADING_SCALE.map((row) => ({ ...row, minPercentage: row.minPercentage ?? 0 })))}
            className="flex items-center gap-2"
          >
            <RotateCcw size={14} /> Reset to Default
          </Button>
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={() => append({ grade: '', gpc: 4.0, minPercentage: 90 })}
            className="flex items-center gap-2"
          >
            <Plus size={14} /> Add Grade
          </Button>
        </div>
      </div>

      <p className="text-sm font-bold opacity-70">
        Match this to your university's official scale. Row order doesn't matter — grades are matched from the highest minimum percentage down.
      </p>

      <FieldError message={errors.gradingScale?.root?.message || errors.gradingScale?.message} />

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 bg-white border-2 border-ink shadow-[4px_4px_0px_#1A1A1A]">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Letter Grade</label>
              <input
                {...register(`gradingScale.${index}.grade` as const)}
                className="w-full bg-background border-2 border-ink p-2 font-bold text-lg uppercase outline-none focus:ring-2 focus:ring-ink"
                placeholder="e.g. A"
              />
              <FieldError message={errors.gradingScale?.[index]?.grade?.message} />
            </div>

            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">GPA Value (GPC)</label>
              <input
                type="number"
                step="0.01"
                {...register(`gradingScale.${index}.gpc` as const, { valueAsNumber: true })}
                className="w-full bg-background border-2 border-ink p-2 font-bold text-lg outline-none focus:ring-2 focus:ring-ink"
                placeholder="e.g. 4.0"
              />
              <FieldError message={errors.gradingScale?.[index]?.gpc?.message} />
            </div>

            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Min Percentage (%)</label>
              <input
                type="number"
                step="1"
                {...register(`gradingScale.${index}.minPercentage` as const, { valueAsNumber: true })}
                className="w-full bg-background border-2 border-ink p-2 font-bold text-lg outline-none focus:ring-2 focus:ring-ink"
                placeholder="e.g. 85"
              />
              <FieldError message={errors.gradingScale?.[index]?.minPercentage?.message} />
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              className="p-3 bg-error text-white border-2 border-ink hover:bg-error/90 transition-colors shadow-[2px_2px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              aria-label="Remove row"
            >
              <Trash2 size={20} />
            </button>
          </div>
        ))}
      </div>

      <SaveBar isDirty={isDirty} isSubmitting={isSubmitting} />
    </form>
  );
};

// ─── AI Engine ───────────────────────────────────────────────────

const PERSONAS = [
  { value: 'tactical', label: 'Tactical', icon: Swords, quote: 'Cold, precise, direct. I will apply pressure.' },
  { value: 'supportive', label: 'Supportive', icon: Heart, quote: "Encouraging and patient. You're doing great." },
  { value: 'bare_minimum', label: 'Bare Minimum', icon: Terminal, quote: 'Zero filler. Just facts and raw numbers.' },
] as const;

const AISection = ({ userProfile, onPatch }: { userProfile: UserProfile; onPatch: (patch: Partial<UserProfile>) => void }) => {
  const currentPersona = userProfile.aiPersona || 'tactical';

  return (
    <div className="space-y-6">
      <SectionHeader icon={Cpu} title="AI Engine" hint="Changes here apply instantly" />

      <div className="space-y-8 pt-2">
        {/* Persona Selector */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-widest block">AI Persona</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PERSONAS.map((persona) => {
              const Icon = persona.icon;
              const isSelected = currentPersona === persona.value;
              return (
                <button
                  key={persona.value}
                  type="button"
                  onClick={() => onPatch({ aiPersona: persona.value })}
                  aria-pressed={isSelected}
                  className={`cursor-pointer p-4 border-3 border-ink text-left transition-all ${
                    isSelected
                      ? 'bg-ink text-white shadow-none translate-y-[4px] translate-x-[4px]'
                      : 'bg-white text-ink shadow-[4px_4px_0px_#1A1A1A] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={20} />
                    <span className="font-black uppercase tracking-widest">{persona.label}</span>
                  </div>
                  <p className={`text-sm font-medium opacity-80 ${isSelected ? 'text-white' : 'text-ink/70'}`}>
                    "{persona.quote}"
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Automation Toggle */}
        <div className="p-4 bg-white border-3 border-ink shadow-[4px_4px_0px_#1A1A1A] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="font-black uppercase tracking-widest text-lg">Auto-Generate Daily Insights</h4>
            <p className="text-xs font-bold text-error uppercase tracking-widest mt-1">
              Warning: Turning this on will consume Gemini API tokens automatically every day you log in.
            </p>
          </div>
          <ToggleSwitch
            checked={userProfile.autoGenerateInsights ?? false}
            onChange={(value) => onPatch({ autoGenerateInsights: value })}
            accent="secondary"
            label="Auto-generate daily insights"
          />
        </div>
      </div>
    </div>
  );
};

// ─── Feedback & Sound ────────────────────────────────────────────

const FeedbackSection = ({ userProfile, onPatch }: { userProfile: UserProfile; onPatch: (patch: Partial<UserProfile>) => void }) => (
  <div className="space-y-6">
    <SectionHeader icon={Volume2} title="Feedback & Sound" hint="Changes here apply instantly" />

    <div className="pt-2">
      <div className="p-4 bg-background border-3 border-ink shadow-[4px_4px_0px_#1A1A1A] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h4 className="font-black uppercase tracking-widest text-lg">Interface Sounds</h4>
          <p className="text-sm font-bold opacity-70 mt-1">
            Play a subtle confirmation sound when you save changes. Off keeps the app fully silent.
          </p>
        </div>
        <ToggleSwitch
          checked={userProfile.soundEnabled ?? true}
          onChange={(value) => onPatch({ soundEnabled: value })}
          accent="tertiary"
          label="Interface sounds"
        />
      </div>
    </div>
  </div>
);

// ─── Settings page ───────────────────────────────────────────────

export const Settings = () => {
  const { userProfile, isLoading, setUserProfile, setUserProfileAsync } = useProfile();
  const [activeSection, setActiveSection] = useState<SectionId>('account');

  // Instant-apply for discrete choices (toggles, persona). The profile
  // mutation is optimistic with rollback, so the UI updates immediately and
  // a failure both reverts the control and raises the global error toast.
  const patchProfile = (patch: Partial<UserProfile>) => {
    if (!userProfile) return;
    setUserProfile({ ...userProfile, ...patch });
  };

  // Awaitable save for the per-section forms, so their Save buttons can
  // report real persistence before clearing the dirty state.
  const saveProfile = async (profile: UserProfile) => {
    await setUserProfileAsync(profile);
  };

  if (isLoading || !userProfile) {
    return (
      <div className="flex items-center justify-center py-32 text-ink/60">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  const sectionCardClass = (id: SectionId, extra = '') =>
    `${activeSection === id ? '' : 'hidden'} p-8 border-4 border-ink ${cardVariants({ shadow: 'md' })} ${extra}`;

  return (
    <div className="max-w-5xl space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-ink uppercase">Control Room</h2>
          <p className="text-lg text-ink/60 font-medium mt-1">Configure your account and academic parameters.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Section Navigation */}
        <nav className="md:col-span-4 lg:col-span-3 flex md:flex-col gap-3 overflow-x-auto md:overflow-visible md:sticky md:top-8">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-3 shrink-0 p-4 border-3 border-ink text-left font-black uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-ink text-white shadow-none translate-x-[2px] translate-y-[2px]'
                    : 'bg-white text-ink shadow-[4px_4px_0px_#1A1A1A] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[6px_6px_0px_#1A1A1A]'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm">{section.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sections stay mounted (hidden via CSS) so in-progress edits
            survive switching between sections. */}
        <div className="md:col-span-8 lg:col-span-9 space-y-12">
          <section className={sectionCardClass('account', 'bg-white')}>
            <AccountSection />
          </section>

          <section className={sectionCardClass('profile', 'bg-white')}>
            <ProfileSection userProfile={userProfile} onSave={saveProfile} />
          </section>

          <section className={sectionCardClass('grading', 'bg-background')}>
            <GradingSection userProfile={userProfile} onSave={saveProfile} />
          </section>

          <section className={sectionCardClass('ai', 'bg-[#E6E6FA]')}>
            <AISection userProfile={userProfile} onPatch={patchProfile} />
          </section>

          <section className={sectionCardClass('feedback', 'bg-white')}>
            <FeedbackSection userProfile={userProfile} onPatch={patchProfile} />
          </section>
        </div>
      </div>
    </div>
  );
};

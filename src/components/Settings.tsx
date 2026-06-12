import { useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserProfileSchema } from '../schemas';
import { useProfile } from '../domain/profile/useProfile';
import { Button, Input, cardVariants } from './ui';
import { DEFAULT_GRADING_SCALE } from '../utils/gpaEngine';
import { Trash2, Plus, Settings as SettingsIcon, GraduationCap, ArrowRight, Swords, Heart, Terminal, Cpu } from 'lucide-react';

type SettingsFormValues = z.infer<typeof UserProfileSchema>;

export const Settings = () => {
  const { userProfile, setUserProfile } = useProfile();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(UserProfileSchema),
    defaultValues: {
      name: '',
      universityName: '',
      degree: '',
      semester: '1',
      targetGpa: 4.0,
      currentCgpa: 0,
      courseCount: 0,
      gradingScale: DEFAULT_GRADING_SCALE,
      aiPersona: 'tactical',
      autoGenerateInsights: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'gradingScale',
  });

  // Pre-fill the form once userProfile is available
  useEffect(() => {
    if (userProfile) {
      reset({
        ...userProfile,
        gradingScale: userProfile.gradingScale || DEFAULT_GRADING_SCALE,
        aiPersona: userProfile.aiPersona || 'tactical',
        autoGenerateInsights: userProfile.autoGenerateInsights ?? false,
      });
    }
  }, [userProfile, reset]);

  const onSubmit = async (data: SettingsFormValues) => {
    await setUserProfile(data);
  };

  const currentPersona = useWatch({ control, name: 'aiPersona' });

  return (
    <div className="max-w-4xl space-y-10">
      {/* Page Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-ink uppercase">⚙️ Control Room</h2>
          <p className="text-lg text-ink/60 font-medium mt-1">Configure your academic parameters.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
        
        {/* Academic Profile Section */}
        <section className={`p-8 bg-white border-4 border-ink ${cardVariants({ shadow: 'md' })} space-y-6`}>
          <div className="flex items-center gap-3 border-b-4 border-ink pb-4">
            <GraduationCap size={28} className="text-ink" />
            <h3 className="text-2xl font-black uppercase tracking-widest text-ink">Academic Profile</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Full Name</label>
              <Input {...register('name')} />
              {errors.name && <span className="text-error text-xs font-bold">{errors.name.message}</span>}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">University Name</label>
              <Input {...register('universityName')} />
              {errors.universityName && <span className="text-error text-xs font-bold">{errors.universityName.message}</span>}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Degree / Major</label>
              <Input {...register('degree')} />
              {errors.degree && <span className="text-error text-xs font-bold">{errors.degree.message}</span>}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Current Semester</label>
              <Input type="number" min="1" max="12" {...register('semester')} />
              {errors.semester && <span className="text-error text-xs font-bold">{errors.semester.message}</span>}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Target CGPA</label>
              <Input type="number" step="0.01" max="4.0" {...register('targetGpa', { valueAsNumber: true })} />
              {errors.targetGpa && <span className="text-error text-xs font-bold">{errors.targetGpa.message}</span>}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Current CGPA</label>
              <Input type="number" step="0.01" max="4.0" {...register('currentCgpa', { valueAsNumber: true })} />
              {errors.currentCgpa && <span className="text-error text-xs font-bold">{errors.currentCgpa.message}</span>}
            </div>
          </div>
        </section>

        {/* Grading Scale Section */}
        <section className={`p-8 bg-background border-4 border-ink ${cardVariants({ shadow: 'md' })} space-y-6`}>
          <div className="flex items-center justify-between border-b-4 border-ink pb-4">
            <div className="flex items-center gap-3">
              <SettingsIcon size={28} className="text-ink" />
              <h3 className="text-2xl font-black uppercase tracking-widest text-ink">Grading Scale</h3>
            </div>
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={() => append({ grade: 'A+', gpc: 4.0, minPercentage: 90 })}
              className="flex items-center gap-2"
            >
              <Plus size={16} /> Add Grade
            </Button>
          </div>
          
          <p className="text-sm font-bold opacity-70">
            Tune the grading scale to exactly match your university's policies. The GPA engine uses this to project your grades dynamically.
          </p>

          <div className="space-y-4 pt-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-end gap-4 p-4 bg-white border-2 border-ink shadow-[4px_4px_0px_#1A1A1A]">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-[10px] font-black uppercase tracking-widest mb-1 block">Letter Grade</label>
                  <input
                    {...register(`gradingScale.${index}.grade` as const)}
                    className="w-full bg-background border-2 border-ink p-2 font-bold text-lg uppercase outline-none focus:ring-2 focus:ring-ink"
                    placeholder="e.g. A"
                  />
                  {errors.gradingScale?.[index]?.grade && (
                    <span className="text-error text-xs font-bold mt-1 block">{errors.gradingScale[index]?.grade?.message}</span>
                  )}
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
        </section>

        {/* AI Engine Section */}
        <section className={`p-8 bg-[#E6E6FA] border-4 border-ink ${cardVariants({ shadow: 'md' })} space-y-6`}>
          <div className="flex items-center gap-3 border-b-4 border-ink pb-4">
            <Cpu size={28} className="text-ink" />
            <h3 className="text-2xl font-black uppercase tracking-widest text-ink">AI Engine</h3>
          </div>
          
          <div className="space-y-8 pt-4">
            {/* Persona Selector */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest block">AI Persona</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { value: 'tactical', label: 'Tactical', icon: Swords, quote: "Cold, precise, direct. I will apply pressure." },
                  { value: 'supportive', label: 'Supportive', icon: Heart, quote: "Encouraging and patient. You're doing great." },
                  { value: 'bare_minimum', label: 'Bare Minimum', icon: Terminal, quote: "Zero filler. Just facts and raw numbers." }
                ].map((persona) => {
                  const Icon = persona.icon;
                  const isSelected = currentPersona === persona.value;
                  return (
                    <div 
                      key={persona.value}
                      onClick={() => setValue('aiPersona', persona.value as any, { shouldDirty: true })}
                      className={`cursor-pointer p-4 border-3 border-ink transition-all ${
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
                    </div>
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
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('autoGenerateInsights')} className="sr-only peer" />
                <div className="relative w-16 h-8 bg-white border-4 border-ink peer-checked:bg-secondary after:content-[''] after:absolute after:top-0 after:left-0 after:bg-ink after:h-full after:w-6 after:transition-transform peer-checked:after:translate-x-8 shadow-[2px_2px_0px_#1A1A1A]"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Submit Actions */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="flex items-center gap-2 text-lg"
          >
            {isSubmitting ? 'Saving changes...' : 'Save Parameters'}
            <ArrowRight size={20} />
          </Button>
        </div>
      </form>
    </div>
  );
};

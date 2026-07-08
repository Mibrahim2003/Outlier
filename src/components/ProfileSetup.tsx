import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Minus, Plus, ArrowRight, BookOpen, Loader2 } from 'lucide-react';
import { useProfile } from '../domain/profile/useProfile';
import { GIT_SHA } from '../utils/buildInfo';

export const ProfileSetup = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfileAsync } = useProfile();

  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    registrationNumber: userProfile?.registrationNumber || '',
    degree: userProfile?.degree || '',
    universityName: userProfile?.universityName || '',
    graduationYear: userProfile?.graduationYear || '',
    currentCgpa: userProfile?.currentCgpa || 0,
    targetGpa: userProfile?.targetGpa || 0,
    semester: userProfile?.semester || '1',
    courseCount: userProfile?.courseCount || 5,
  });
  const [isSaving, setIsSaving] = useState(false);

  // CGPA ceiling follows the configured grading scale's top GPC. At first-time
  // setup there's no scale yet, so allow any common CGPA system (4.0 / 5.0 / 10.0)
  // instead of hard-capping at 4 and blocking non-4.0 universities.
  const maxGpa = useMemo(() => {
    const scale = userProfile?.gradingScale;
    if (scale && scale.length > 0) return Math.max(...scale.map((s) => s.gpc));
    return 10;
  }, [userProfile?.gradingScale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    try {
      // Await the first-time save so a failure keeps the user here (with the
      // global error toast) instead of dropping them on onboarding profile-less.
      await setUserProfileAsync(formData);
      navigate('/onboarding');
    } catch {
      setIsSaving(false);
    }
  };

  const setCourseVolume = (val: number) => {
    setFormData(prev => ({ ...prev, courseCount: val }));
  };

  return (
    <div className="bg-background font-body text-on-background industrial-grid min-h-screen relative overflow-x-hidden">
      <header className="fixed top-0 left-0 w-full z-[100] pointer-events-none p-6 flex justify-between items-start">
        <div className="pointer-events-auto bg-primary-container border-4 border-on-background p-4 neo-brutal-shadow-lg flex items-center gap-2">
          <TrendingUp size={26} strokeWidth={2.5} />
          <span className="text-3xl font-bold tracking-tighter uppercase">Outlier</span>
        </div>
        <div className="pointer-events-auto bg-on-background text-white p-4 border-4 border-on-background neo-brutal-shadow-lg">
          <span className="text-sm font-bold tracking-[0.3em]">STEP 1 OF 2</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32 relative">
        <section className="relative mb-12">
          <div className="absolute -top-4 -left-4 bg-secondary text-white px-3 py-1 border-4 border-on-background z-20 text-[10px] font-bold uppercase tracking-widest neo-brutal-shadow-lg">
            Getting started
          </div>
          <h1 className="font-headline font-bold text-5xl md:text-7xl lg:text-[7.5rem] leading-[0.8] tracking-tighter uppercase relative z-10">
            YOUR<br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px #1A1A1A' }}>PROFILE</span>
          </h1>
          <div className="mt-[-1rem] ml-8 md:ml-16 max-w-md bg-white border-4 border-on-background p-4 md:p-5 neo-brutal-shadow-lg relative z-20">
            <p className="text-base md:text-lg font-bold uppercase leading-tight">
              Tell us about you and your goal. This is the baseline Outlier measures every result against.
            </p>
          </div>
        </section>

        <form className="space-y-16" onSubmit={handleSubmit}>
          {/* Dossier Block */}
          <div className="bg-white border-8 border-on-background p-6 md:p-8 neo-shadow-aggressive relative mb-16 max-w-5xl">
            <div className="absolute -top-5 -left-4 bg-primary-container text-on-background px-4 py-1.5 border-4 border-on-background z-20 text-base font-black uppercase tracking-widest neo-brutal-shadow-lg">
              About you
            </div>

            <div className="space-y-8">
              {/* Full Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block font-headline text-lg md:text-xl font-bold uppercase mb-2 text-on-background/80">Full name</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-2xl md:text-4xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="e.g. Lamine Yamal"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-headline text-lg md:text-xl font-bold uppercase mb-2 text-on-background/80">Registration number</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-2xl md:text-4xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="e.g. 2021034"
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Focus and Institution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block font-headline text-base font-bold uppercase mb-2 text-on-background/80">Degree / Major</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="B.S. Computer Science"
                    type="text"
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-headline text-base font-bold uppercase mb-2 text-on-background/80">University</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="Your university"
                    type="text"
                    value={formData.universityName}
                    onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 bg-on-background p-6 neo-brutal-shadow-lg">
              <label className="block text-white font-headline text-2xl font-bold uppercase mb-4 border-b-2 border-white pb-2">Timeline</label>
              <div className="space-y-4">
                <div>
                  <span className="text-white/50 text-[10px] font-bold uppercase tracking-[0.4em]">Graduation year</span>
                  <input
                    required
                    className="w-full bg-transparent border-b-4 border-white text-white p-2 text-3xl font-bold focus:outline-none focus:border-primary-container"
                    placeholder="202X"
                    type="number"
                    min={2020}
                    max={2040}
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                  />
                </div>
                <div>
                  <span className="text-white/50 text-[10px] font-bold uppercase tracking-[0.4em]">Current semester</span>
                  <select
                    className="w-full bg-white border-4 border-on-background p-3 text-lg font-bold uppercase appearance-none focus:bg-primary-container focus:outline-none text-on-background"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  >
                    <option value="1">Semester 1</option>
                    <option value="2">Semester 2</option>
                    <option value="3">Semester 3</option>
                    <option value="4">Semester 4</option>
                    <option value="5">Semester 5</option>
                    <option value="6">Semester 6</option>
                    <option value="7">Semester 7</option>
                    <option value="8">Semester 8</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="md:col-span-8 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <div className="bg-primary-container border-4 border-on-background p-6 neo-brutal-shadow-lg flex flex-col justify-between group overflow-hidden relative">
                  <span className="text-6xl absolute -right-2 -bottom-2 font-bold opacity-10 group-hover:scale-110 transition-transform">CGPA</span>
                  <label className="font-headline text-lg font-bold uppercase">Current CGPA</label>
                  <input
                    required
                    className="bg-transparent border-b-4 border-on-background text-5xl font-bold w-full focus:outline-none mt-6"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    min={0}
                    max={maxGpa}
                    value={formData.currentCgpa || ''}
                    onChange={(e) => setFormData({ ...formData, currentCgpa: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="bg-white border-4 border-on-background p-6 neo-brutal-shadow-lg flex flex-col justify-between relative">
                  <div className="absolute top-0 right-0 h-full w-2 bg-[repeating-linear-gradient(45deg,#A8275A,#A8275A_5px,#1A1A1A_5px,#1A1A1A_10px)]"></div>
                  <label className="font-headline text-lg font-bold uppercase">Target CGPA</label>
                  <input
                    required
                    className="bg-transparent border-b-4 border-secondary text-5xl font-bold w-full focus:outline-none mt-6"
                    placeholder={maxGpa.toFixed(2)}
                    type="number"
                    step="0.01"
                    min={0}
                    max={maxGpa}
                    value={formData.targetGpa || ''}
                    onChange={(e) => setFormData({ ...formData, targetGpa: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 bg-white border-4 border-on-background p-8 neo-brutal-shadow-lg">
            <div className="md:w-1/2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none">HOW MANY<br />COURSES</h2>
              <p className="text-sm font-bold uppercase mt-2 text-on-background/60">How many courses are you taking this semester?</p>
            </div>
            <div className="md:w-1/2 flex items-center justify-between gap-6">
              <button
                className="bg-secondary text-white border-4 border-on-background w-16 h-16 flex items-center justify-center neo-brutal-shadow-lg active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                type="button"
                onClick={() => setCourseVolume(Math.max(1, formData.courseCount - 1))}
                aria-label="One fewer course"
              >
                <Minus size={28} strokeWidth={3} />
              </button>
              <span className="text-7xl md:text-8xl font-bold tracking-tighter">
                {formData.courseCount.toString().padStart(2, '0')}
              </span>
              <button
                className="bg-primary-container border-4 border-on-background w-16 h-16 flex items-center justify-center neo-brutal-shadow-lg active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                type="button"
                onClick={() => setCourseVolume(Math.min(10, formData.courseCount + 1))}
                aria-label="One more course"
              >
                <Plus size={28} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="relative pt-16">
            <div className="absolute -top-6 right-0 text-right opacity-20 pointer-events-none">
              <span className="text-[6rem] font-bold uppercase tracking-tighter leading-none block">READY?</span>
            </div>
            <button className="group w-full relative disabled:cursor-not-allowed" type="submit" disabled={isSaving}>
              <div className="absolute inset-0 bg-on-background translate-x-2 translate-y-2"></div>
              <div className={`relative bg-primary-container border-4 border-on-background p-6 md:p-8 flex items-center justify-center gap-8 transition-transform ${isSaving ? 'opacity-70' : 'group-hover:-translate-x-1 group-hover:-translate-y-1'}`}>
                <span className="font-headline font-bold text-3xl md:text-5xl uppercase tracking-tighter">{isSaving ? 'Saving…' : 'Save & Continue'}</span>
                {isSaving
                  ? <Loader2 size={44} strokeWidth={3} className="animate-spin" />
                  : <ArrowRight size={44} strokeWidth={3} className="group-hover:translate-x-4 transition-transform" />}
              </div>
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-24">
          <div className="md:col-span-2 border-4 border-on-background p-6 bg-white flex flex-col justify-between min-h-[120px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] mb-4 text-secondary">Your data is private</p>
            <p className="text-lg font-bold leading-tight">Your GPA is yours. It stays hidden by default and never leaves your account.</p>
          </div>
          <div className="border-4 border-on-background p-6 bg-primary-container flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold break-all">{GIT_SHA}</span>
            <span className="text-[8px] font-bold tracking-widest uppercase">Build</span>
          </div>
          <div className="border-4 border-on-background p-6 bg-on-background text-white flex flex-col justify-between">
            <BookOpen size={20} />
            <p className="text-xs font-bold uppercase tracking-widest mt-4">Next: add your courses</p>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-4 bg-on-background z-[100]">
        <div className="h-full bg-secondary w-1/2"></div>
      </div>
      <div className="fixed -bottom-10 left-10 text-[15rem] font-bold uppercase text-on-background opacity-[0.03] select-none pointer-events-none whitespace-nowrap">
        OUTLIER
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

export const ProfileSetup = () => {
  const navigate = useNavigate();
  const { userProfile, setUserProfile } = useStore();

  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    registrationNumber: userProfile?.registrationNumber || '',
    degree: userProfile?.degree || '',
    universityName: userProfile?.universityName || '',
    graduationYear: userProfile?.graduationYear || '',
    currentCgpa: userProfile?.currentCgpa || 0,
    targetGpa: userProfile?.targetGpa || 0,
    semester: userProfile?.semester || 'SEMESTER 01',
    courseCount: userProfile?.courseCount || 5,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(formData);
    navigate('/onboarding');
  };

  const setCourseVolume = (val: number) => {
    setFormData(prev => ({ ...prev, courseCount: val }));
  };

  return (
    <div className="bg-background font-body text-on-background industrial-grid min-h-screen relative overflow-x-hidden">
      <header className="fixed top-0 left-0 w-full z-[100] pointer-events-none p-6 flex justify-between items-start">
        <div className="pointer-events-auto bg-primary-container border-4 border-on-background p-4 neo-shadow-sm flex items-center gap-2">
          <span className="material-symbols-outlined font-bold">terminal</span>
          <span className="text-3xl font-bold tracking-tighter uppercase">Outlier</span>
        </div>
        <div className="pointer-events-auto bg-on-background text-white p-4 border-4 border-on-background neo-shadow-sm">
          <span className="text-sm font-bold tracking-[0.3em]">STEP_01</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-32 relative">
        <section className="relative mb-12">
          <div className="absolute -top-4 -left-4 bg-secondary-container text-white px-3 py-1 border-4 border-on-background z-20 text-[10px] font-bold uppercase tracking-widest neo-shadow-sm">
            INIT_SEQUENCE_v0.9
          </div>
          <h1 className="font-headline font-bold text-5xl md:text-7xl lg:text-[7.5rem] leading-[0.8] tracking-tighter uppercase relative z-10">
            ESTABLISH<br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px #1A1A1A' }}>PROFILE</span>
          </h1>
          <div className="mt-[-1rem] ml-8 md:ml-16 max-w-md bg-white border-4 border-on-background p-4 md:p-5 neo-shadow-sm relative z-20">
            <p className="text-base md:text-lg font-bold uppercase leading-tight">
              Configure your academic core parameters. This technical profile will serve as the foundation for your performance analytics.
            </p>
          </div>
        </section>

        <form className="space-y-16" onSubmit={handleSubmit}>
          {/* Dossier Block */}
          <div className="bg-white border-8 border-on-background p-6 md:p-8 neo-shadow-aggressive relative mb-16 max-w-5xl">
            <div className="absolute -top-5 -left-4 bg-primary-container text-on-background px-4 py-1.5 border-4 border-on-background z-20 text-base font-black uppercase tracking-widest neo-shadow-sm">
              01 // CORE IDENTITY
            </div>

            <div className="space-y-8">
              {/* Full Identity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block font-headline text-lg md:text-xl font-bold uppercase mb-2 text-on-background/80">FULL LEGAL ALIAS</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-2xl md:text-4xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="USER_IDENTIFICATION"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-headline text-lg md:text-xl font-bold uppercase mb-2 text-on-background/80">REGISTRATION NUMBER</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-2xl md:text-4xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="E.G. 2021034"
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                  />
                </div>
              </div>

              {/* Focus and Institution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block font-headline text-base font-bold uppercase mb-2 text-on-background/80">ACADEMIC_FOCUS</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="B.S. COMPUTER SCIENCE"
                    type="text"
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-headline text-base font-bold uppercase mb-2 text-on-background/80">INSTITUTION</label>
                  <input
                    required
                    className="w-full bg-background/50 border-b-4 border-on-background p-3 text-xl font-bold uppercase placeholder:text-on-background/20 focus:bg-primary-container focus:outline-none transition-all"
                    placeholder="UNIVERSITY NAME"
                    type="text"
                    value={formData.universityName}
                    onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4 bg-on-background p-6 neo-shadow-sm">
              <label className="block text-white font-headline text-2xl font-bold uppercase mb-4 border-b-2 border-white pb-2">TIMELINE</label>
              <div className="space-y-4">
                <div>
                  <span className="text-white/50 text-[10px] font-bold uppercase tracking-[0.4em]">GRADUATION</span>
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
                  <span className="text-white/50 text-[10px] font-bold uppercase tracking-[0.4em]">CURRENT_PHASE</span>
                  <select
                    className="w-full bg-white border-4 border-on-background p-3 text-lg font-bold uppercase appearance-none focus:bg-primary-container focus:outline-none text-on-background"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  >
                    <option>SEMESTER 01</option>
                    <option>SEMESTER 02</option>
                    <option>SEMESTER 03</option>
                    <option>SEMESTER 04</option>
                    <option>SEMESTER 05</option>
                    <option>SEMESTER 06</option>
                    <option>SEMESTER 07</option>
                    <option>SEMESTER 08</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="md:col-span-8 relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <div className="bg-primary-container border-4 border-on-background p-6 neo-shadow-sm flex flex-col justify-between group overflow-hidden relative">
                  <span className="text-6xl absolute -right-2 -bottom-2 font-bold opacity-10 group-hover:scale-110 transition-transform">CGPA</span>
                  <label className="font-headline text-lg font-bold uppercase">CURRENT_STANDING</label>
                  <input
                    required
                    className="bg-transparent border-b-4 border-on-background text-5xl font-bold w-full focus:outline-none mt-6"
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    min={0}
                    max={4}
                    value={formData.currentCgpa || ''}
                    onChange={(e) => setFormData({ ...formData, currentCgpa: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="bg-white border-4 border-on-background p-6 neo-shadow-sm flex flex-col justify-between relative">
                  <div className="absolute top-0 right-0 h-full w-2 bg-[repeating-linear-gradient(45deg,#A8275A,#A8275A_5px,#1A1A1A_5px,#1A1A1A_10px)]"></div>
                  <label className="font-headline text-lg font-bold uppercase">TARGET_GOAL</label>
                  <input
                    required
                    className="bg-transparent border-b-4 border-secondary-container text-5xl font-bold w-full focus:outline-none mt-6"
                    placeholder="4.00"
                    type="number"
                    step="0.01"
                    min={0}
                    max={4}
                    value={formData.targetGpa || ''}
                    onChange={(e) => setFormData({ ...formData, targetGpa: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 bg-white border-4 border-on-background p-8 neo-shadow-sm">
            <div className="md:w-1/2">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none">COURSE<br />VOLUME</h2>
              <p className="text-sm font-bold uppercase mt-2 text-on-background/60">Define the quantity of active academic units for optimization.</p>
            </div>
            <div className="md:w-1/2 flex items-center justify-between gap-6">
              <button
                className="bg-secondary-container text-white border-4 border-on-background w-16 h-16 flex items-center justify-center neo-shadow-sm active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                type="button"
                onClick={() => setCourseVolume(Math.max(1, formData.courseCount - 1))}
              >
                <span className="material-symbols-outlined text-3xl font-bold">remove</span>
              </button>
              <span className="text-7xl md:text-8xl font-bold tracking-tighter">
                {formData.courseCount.toString().padStart(2, '0')}
              </span>
              <button
                className="bg-primary-container border-4 border-on-background w-16 h-16 flex items-center justify-center neo-shadow-sm active:translate-x-1 active:translate-y-1 active:shadow-none transition-all"
                type="button"
                onClick={() => setCourseVolume(Math.min(10, formData.courseCount + 1))}
              >
                <span className="material-symbols-outlined text-3xl font-bold">add</span>
              </button>
            </div>
          </div>

          <div className="relative pt-16">
            <div className="absolute -top-6 right-0 text-right opacity-20 pointer-events-none">
              <span className="text-[6rem] font-bold uppercase tracking-tighter leading-none block">READY?</span>
            </div>
            <button className="group w-full relative" type="submit">
              <div className="absolute inset-0 bg-on-background translate-x-2 translate-y-2"></div>
              <div className="relative bg-primary-container border-4 border-on-background p-6 md:p-8 flex items-center justify-center gap-8 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform">
                <span className="font-headline font-bold text-3xl md:text-5xl uppercase tracking-tighter">SAVE & CONTINUE</span>
                <span className="material-symbols-outlined text-4xl md:text-5xl font-bold group-hover:translate-x-4 transition-transform">arrow_forward</span>
              </div>
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-24">
          <div className="md:col-span-2 border-4 border-on-background p-6 bg-white flex flex-col justify-between min-h-[120px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.5em] mb-4 text-secondary-container">DATA_ENCRYPTION_ACTIVE</p>
            <p className="text-lg font-bold leading-tight">All metrics are processed via focus-optimization algorithms. Privacy is structural.</p>
          </div>
          <div className="border-4 border-on-background p-6 bg-primary-container flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-bold">v0.9.4</span>
            <span className="text-[8px] font-bold tracking-widest uppercase">SYSTEM_BUILD</span>
          </div>
          <div className="border-4 border-on-background p-6 bg-on-background text-white flex flex-col justify-between">
            <span className="material-symbols-outlined">upcoming</span>
            <p className="text-xs font-bold uppercase tracking-widest mt-4">Next: Schedule Sync</p>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-4 bg-on-background z-[100]">
        <div className="h-full bg-secondary-container w-1/2"></div>
      </div>
      <div className="fixed -bottom-10 left-10 text-[15rem] font-bold uppercase text-on-background opacity-[0.03] select-none pointer-events-none whitespace-nowrap">
        CORE_SYSTEM_01
      </div>
    </div>
  );
};

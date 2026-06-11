import { BarChart3, BrainCircuit, BellRing } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'motion/react';
import { Button, cardVariants, buttonVariants } from './ui';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
};

export const LandingPage = () => {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* TopNavBar */}
      <nav className={`fixed top-0 w-full z-50 bg-background flex justify-between items-center h-20 px-6 md:px-12 ${cardVariants({ shadow: 'sm' })} !border-x-0 !border-t-0 !border-b-4 !rounded-none`}>
        <div className="text-2xl font-black text-ink uppercase tracking-tighter">
          Outlier
        </div>
        <div className="hidden md:flex gap-8 items-center font-bold tracking-tighter uppercase text-sm">
          <a className="text-ink border-b-4 border-ink pb-1" href="#">Home</a>
          <a className="text-ink/60 hover:bg-primary-container hover:shadow-[2px_2px_0px_#1A1A1A] transition-all px-2" href="#">Features</a>
          <Link className="text-ink/60 hover:bg-primary-container hover:shadow-[2px_2px_0px_#1A1A1A] transition-all px-2" to="/dashboard">Dashboard</Link>
        </div>
        <Link to="/auth">
          <Button variant="primary" size="sm">Sign In with Google</Button>
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 pb-20 px-6 md:px-12 min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Decorative Shapes */}
        <div className="absolute top-40 left-10 w-24 h-24 bg-secondary border-3 border-ink -rotate-12 hidden lg:block"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 rounded-full bg-tertiary border-3 border-ink hidden lg:block"></div>
        <div className="absolute top-60 right-10 w-16 h-16 bg-primary-container border-3 border-ink rotate-45 hidden lg:block"></div>

        <div className="z-10 text-center max-w-5xl">
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl md:text-9xl font-black uppercase tracking-tighter mb-6 leading-none"
          >
            Track. <span className="bg-primary-container px-4">Analyze.</span> <br />Dominate.
          </motion.h1>
          <p className="text-xl md:text-3xl font-medium max-w-3xl mx-auto mb-12 border-l-8 border-ink pl-6 text-left">
            AI-powered academic dashboard that tracks your grades, predicts your GPA, and tells you exactly what to study next.
          </p>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <Link to="/auth">
              <Button variant="primary" size="lg" className="px-12 py-6 text-2xl md:text-4xl">
                Get Started with Google
              </Button>
            </Link>
          </div>
        </div>

      </main>

      {/* Ticker Tape */}
      <div className="bg-ink text-primary-container border-y-4 border-ink py-4 overflow-hidden flex whitespace-nowrap">
        <div className="animate-marquee font-black uppercase tracking-tighter text-2xl flex gap-8 px-4 items-center">
          <span>DOMINATE YOUR CLASSES • NEVER MISS A DEADLINE • PREDICT YOUR GPA •</span>
          <span>DOMINATE YOUR CLASSES • NEVER MISS A DEADLINE • PREDICT YOUR GPA •</span>
          <span>DOMINATE YOUR CLASSES • NEVER MISS A DEADLINE • PREDICT YOUR GPA •</span>
          <span>DOMINATE YOUR CLASSES • NEVER MISS A DEADLINE • PREDICT YOUR GPA •</span>
        </div>
      </div>

      {/* Bento Grid Features */}
      <section className="py-24 px-6 md:px-12 bg-white relative border-b-4 border-ink" style={{ backgroundImage: 'radial-gradient(circle, #1A1A1A 1px, transparent 1px)', backgroundSize: '32px 32px' }}>
        <div className="absolute inset-0 bg-white/85"></div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto relative z-10"
        >
          {/* Card 1: Smart Grade Tracking */}
          <motion.div variants={itemVariants} className={`${cardVariants({ shadow: 'md', interactive: true })} bg-primary-container p-8 flex flex-col gap-6 group hover:shadow-[12px_12px_0px_#1A1A1A] hover:-translate-y-2 hover:-translate-x-1`}>
            <div className="w-16 h-16 border-3 border-ink bg-white flex items-center justify-center">
              <BarChart3 size={32} />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter">Smart Grade Tracking</h3>
            <p className="text-lg font-medium">Automatic sync with your university portals. Visualize your trajectory with brutalist precision.</p>
            <div className="mt-auto pt-6 border-t-4 border-ink">
              <span className="font-black uppercase text-sm">Real-time Sync Enabled</span>
            </div>
          </motion.div>
          {/* Card 2: AI Study Recommendations */}
          <motion.div variants={itemVariants} className={`${cardVariants({ shadow: 'md', interactive: true })} bg-secondary p-8 text-white flex flex-col gap-6 -rotate-1 origin-bottom-left hover:rotate-0 hover:shadow-[12px_12px_0px_#1A1A1A] hover:-translate-y-2 hover:-translate-x-1`}>
            <div className="w-16 h-16 border-3 border-ink bg-white text-ink flex items-center justify-center">
              <BrainCircuit size={32} />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter">AI Study Recommendations</h3>
            <p className="text-lg font-medium">Our neural network identifies your weak spots before you even take the midterm.</p>
            <div className="mt-auto pt-6 border-t-4 border-ink">
              <span className="font-black uppercase text-sm bg-white text-ink px-2">98% Accuracy Rate</span>
            </div>
          </motion.div>
          {/* Card 3: Assignment Reminders */}
          <motion.div variants={itemVariants} className={`${cardVariants({ shadow: 'md', interactive: true })} bg-tertiary p-8 text-white flex flex-col gap-6 hover:shadow-[12px_12px_0px_#1A1A1A] hover:-translate-y-2 hover:-translate-x-1`}>
            <div className="w-16 h-16 border-3 border-ink bg-white text-ink flex items-center justify-center">
              <BellRing size={32} />
            </div>
            <h3 className="text-3xl font-black uppercase tracking-tighter">Assignment Reminders</h3>
            <p className="text-lg font-medium">Never miss a deadline. Get aggressive alerts that ensure you stay on top of your game.</p>
            <div className="mt-auto pt-6 border-t-4 border-ink">
              <span className="font-black uppercase text-sm">Anti-Procrastination Mode</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Social Proof / Stats */}
      <section className="bg-ink text-background py-20 px-6 md:px-12 overflow-hidden relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, type: "spring" }}
          className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12"
        >
          <div className="text-center md:text-left">
            <div className="text-7xl md:text-9xl font-black leading-none">50K+</div>
            <div className="text-xl font-bold uppercase tracking-widest text-primary-container">Students Forging Success</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800 border-2 border-zinc-700 p-4 font-bold uppercase text-xs">A+ Average Increase</div>
            <div className="bg-zinc-800 border-2 border-zinc-700 p-4 font-bold uppercase text-xs">12 Hours Saved Weekly</div>
            <div className="bg-zinc-800 border-2 border-zinc-700 p-4 font-bold uppercase text-xs">95% Success Rate</div>
            <div className="bg-zinc-800 border-2 border-zinc-700 p-4 font-bold uppercase text-xs">GPA Prediction AI</div>
          </div>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 text-center bg-background border-t-4 border-ink">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -2, y: 50 }}
          whileInView={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
          viewport={{ once: false, amount: 0.5 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
          className="max-w-4xl mx-auto bg-white border-8 border-ink p-12 shadow-[16px_16px_0px_#A8275A] relative"
        >
          <div className="absolute -top-10 -right-10 bg-primary-container border-3 border-ink p-4 font-black uppercase -rotate-12 transition-transform hover:scale-110 hover:-rotate-6 cursor-default">
            Free Forever
          </div>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-8">Ready to Win?</h2>
          <p className="text-2xl font-bold mb-12">Join the elite cohort of students using data to destroy their competition.</p>
          <Link to="/auth" className={`${buttonVariants({ variant: 'primary', size: 'lg' })} !px-12 !py-6 text-2xl inline-flex w-full md:w-auto`}>
            Start Forging Now
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t-4 border-ink w-full">
        <div className="flex flex-col md:flex-row justify-between items-center py-12 px-6 md:px-12 w-full gap-8">
          <div className="flex flex-col gap-4">
            <div className="font-black text-3xl text-ink uppercase tracking-tighter">Outlier</div>
            <p className="uppercase tracking-widest text-sm text-ink/60 font-bold">
              Built for students who want to win.
            </p>
          </div>
          <div className="flex gap-8 font-bold uppercase tracking-widest text-sm">
            <a className="text-ink hover:text-secondary transition-colors" href="#">Twitter</a>
            <a className="text-ink hover:text-secondary transition-colors" href="#">Discord</a>
            <a className="text-ink hover:text-secondary transition-colors" href="#">GitHub</a>
          </div>
          <div className="text-xs font-bold uppercase tracking-tighter text-ink/40">
            © 2026 Outlier Academic Systems. No soft corners allowed.
          </div>
        </div>
      </footer>
    </div>
  );
};

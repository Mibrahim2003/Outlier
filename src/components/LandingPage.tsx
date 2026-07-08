import { useState } from 'react';
import { CalendarDays, Hash, BellRing, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useTransform,
  useScroll,
  Variants,
} from 'motion/react';
import { ZeeMascot, buttonVariants, type ZeeVariant } from './ui';

// jsdom has no matchMedia; guard so tests and old browsers never crash.
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

// ---------------------------------------------------------------------------
// Motion helpers. Reveals are scoped to small blocks with default viewport
// margins so content can never sit stuck at opacity 0 on tall sections.
// ---------------------------------------------------------------------------
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 110, damping: 14 },
  },
};

const wordItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 120, damping: 14 },
  },
};

const inView = { once: true, amount: 0.25 } as const;

/** Headline text that reveals word by word. */
const SplitWords = ({ text, delay = 0 }: { text: string; delay?: number }) => (
  <motion.span
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: 0.08, delayChildren: delay } },
    }}
  >
    {text.split(' ').map((word, i) => (
      <motion.span key={i} variants={wordItem} className="inline-block whitespace-pre">
        {word}{' '}
      </motion.span>
    ))}
  </motion.span>
);

/** Hand-drawn ink underline that draws itself in. */
const DrawnUnderline = ({ delay = 0 }: { delay?: number }) => (
  <motion.svg
    viewBox="0 0 160 14"
    className="absolute -bottom-[0.22em] left-0 w-full"
    fill="none"
    aria-hidden="true"
  >
    <motion.path
      d="M4 10 C 45 3, 115 2, 156 7"
      stroke="#1A1A1A"
      strokeWidth="7"
      strokeLinecap="square"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
    />
  </motion.svg>
);

/** Zee that does a little shake when the cursor lands on it. */
const WigglyZee = ({ variant, size, className }: { variant: ZeeVariant; size: number; className?: string }) => (
  <motion.div
    className={className}
    whileHover={
      prefersReducedMotion
        ? undefined
        : { rotate: [0, -5, 5, -2, 0], transition: { duration: 0.5 } }
    }
  >
    <ZeeMascot variant={variant} size={size} />
  </motion.div>
);

// ---------------------------------------------------------------------------
// The bell curve — the page's signature motif. Every curve on the page is
// sampled from this same gaussian so dots always ride exactly on the line.
// ---------------------------------------------------------------------------
const gaussianY = (x: number) => 52 - 40 * Math.exp(-((x - 80) ** 2) / 1800);

const curvePath = Array.from({ length: 31 }, (_, i) => {
  const x = 10 + i * 5;
  return `${i === 0 ? 'M' : 'L'}${x} ${gaussianY(x).toFixed(1)}`;
}).join(' ');

/**
 * Fixed mini bell curve, framed as a labelled instrument. The "YOU" dot travels
 * from the mean toward +2σ as you scroll. Hidden until the story starts so it
 * never collides with the hero.
 */
const CurveHUD = () => {
  const { scrollYProgress } = useScroll();
  // Invisible over the hero, fades away before the footer so it never covers text.
  const opacity = useTransform(scrollYProgress, [0, 0.06, 0.11, 0.86, 0.93], [0, 0, 1, 1, 0]);
  const progress = useSpring(scrollYProgress, { stiffness: 60, damping: 18 });
  // Dot completes its climb by 85% scroll — journey ends while the HUD is still visible.
  const cx = useTransform(progress, (v) => 80 + 60 * Math.min(v / 0.85, 1));
  const cy = useTransform(cx, (x) => gaussianY(x));
  const labelX = useTransform(cx, (x) => x + 9);
  const labelY = useTransform(cy, (y) => y + 3);

  if (prefersReducedMotion) return null;

  return (
    <motion.div
      style={{ opacity }}
      className="pointer-events-none fixed bottom-5 right-5 z-40 hidden border-3 border-ink bg-white p-2.5 shadow-[5px_5px_0px_#1A1A1A] md:block"
      aria-hidden="true"
    >
      <p className="mb-1 border-b-2 border-ink pb-1 text-[10px] font-black uppercase tracking-widest">
        Your climb
      </p>
      <svg viewBox="0 0 170 60" className="w-48">
        <path d={curvePath} stroke="#1A1A1A" strokeWidth="2.5" fill="none" />
        <line
          x1="140"
          y1="52"
          x2="140"
          y2="24"
          stroke="#A8275A"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <motion.circle cx={cx} cy={cy} r="5.5" fill="#ffde59" stroke="#1A1A1A" strokeWidth="2.5" />
        <motion.text
          x={labelX}
          y={labelY}
          fontSize="9"
          fontWeight="900"
          fontFamily="Space Grotesk, sans-serif"
          fill="#1A1A1A"
        >
          YOU
        </motion.text>
      </svg>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// The lens — Wispr's magnifier trick, retold as the product metaphor:
// raw marks look like noise; through Outlier's lens the class decodes into
// a curve, Z-scores, and the outlier zone.
// ---------------------------------------------------------------------------
const BIG_CURVE = 'M20 240 C 320 240, 440 30, 600 30 C 760 30, 880 240, 1180 240';

const MARKS = [
  { v: '14/20', z: '+0.6σ', x: '12%', y: '16%', rot: -8, good: true, topper: false },
  { v: '11/20', z: '-1.1σ', x: '76%', y: '12%', rot: 6, good: false, topper: false },
  { v: '16/20', z: '+1.2σ', x: '64%', y: '62%', rot: -5, good: true, topper: false },
  { v: '13/20', z: '-0.2σ', x: '26%', y: '66%', rot: 4, good: false, topper: false },
  { v: '19/20', z: '+2.1σ', x: '87%', y: '38%', rot: -10, good: true, topper: true },
  { v: '15/20', z: '+0.2σ', x: '6%', y: '46%', rot: 8, good: true, topper: false },
];

const SIGMA_TICKS: Array<[number, string]> = [
  [190, '-2σ'],
  [395, '-1σ'],
  [600, '0'],
  [805, '+1σ'],
  [1010, '+2σ'],
];

const LensMarks = ({ decoded }: { decoded: boolean }) => (
  <>
    {MARKS.map((m) => (
      <div
        key={m.v}
        className="absolute select-none"
        style={{ left: m.x, top: m.y, transform: `rotate(${m.rot}deg)` }}
        aria-hidden="true"
      >
        <p
          className={`text-2xl font-black tracking-tighter md:text-3xl ${
            decoded ? 'text-white' : 'text-ink/15'
          }`}
        >
          {m.v}
        </p>
        {decoded && (
          <p className={`text-xs font-black ${m.good ? 'text-primary-container' : 'text-white/40'}`}>
            {m.z}
            {m.topper && ' 👑'}
          </p>
        )}
      </div>
    ))}
  </>
);

/** What you see without Outlier: numbers with no meaning. */
const BlindScene = ({ lensActive }: { lensActive: boolean }) => (
  <div className="absolute inset-0 bg-white">
    <svg viewBox="0 0 1200 270" className="absolute bottom-0 left-0 w-full" fill="none" aria-hidden="true">
      <path d={BIG_CURVE} stroke="#1A1A1A" strokeOpacity="0.07" strokeWidth="4" />
    </svg>
    <LensMarks decoded={false} />
    <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-3xl font-black uppercase tracking-tighter text-ink/25 md:text-5xl">
        A semester of raw marks
      </p>
      {/* Instruction retires once the lens is in hand — stale hints cheapen the trick. */}
      <p
        className={`mt-3 text-xs font-black uppercase tracking-[0.3em] text-ink/40 transition-opacity duration-300 ${
          lensActive ? 'opacity-0' : 'opacity-100'
        }`}
      >
        Move the lens — decode the class
      </p>
    </div>
  </div>
);

/** What Outlier sees: the curve, the standings, the outlier zone. */
const DecodedScene = () => (
  <div className="absolute inset-0 bg-ink">
    <p className="absolute left-1/2 top-6 -translate-x-1/2 whitespace-nowrap text-sm font-black uppercase tracking-[0.3em] text-primary-container">
      What Outlier sees
    </p>
    <LensMarks decoded />
    <svg viewBox="0 0 1200 270" className="absolute bottom-0 left-0 w-full" fill="none" aria-hidden="true">
      <path d={BIG_CURVE} stroke="#FFF6E3" strokeWidth="4" />
      <line x1="1010" y1="240" x2="1010" y2="150" stroke="#ffde59" strokeWidth="3" strokeDasharray="7 7" />
      <circle cx="1010" cy="213" r="9" fill="#ffde59" stroke="#1A1A1A" strokeWidth="3" />
      {SIGMA_TICKS.map(([x, label]) => (
        <g key={label}>
          <line x1={x} y1="240" x2={x} y2="248" stroke="#FFF6E3" strokeOpacity="0.4" strokeWidth="2" />
          <text
            x={x}
            y="262"
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fontFamily="Space Grotesk, sans-serif"
            fill="#FFF6E3"
            opacity="0.45"
          >
            {label}
          </text>
        </g>
      ))}
      <text
        x="600"
        y="75"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        letterSpacing="0.08em"
        fontFamily="Space Grotesk, sans-serif"
        fill="#FFF6E3"
        opacity="0.7"
      >
        MOST STUDENTS LIVE HERE
      </text>
      <text
        x="1010"
        y="130"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        letterSpacing="0.08em"
        fontFamily="Space Grotesk, sans-serif"
        fill="#ffde59"
      >
        THE OUTLIER ZONE — YOU
      </text>
    </svg>
  </div>
);

/**
 * Interactive magnifier: clip-path circle follows the cursor, glass ring on top.
 * Easter egg: double-click locks X-RAY MODE — the whole class stays decoded.
 */
const LensScene = () => {
  const [lensActive, setLensActive] = useState(false);
  const [xray, setXray] = useState(false);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const lx = useSpring(rawX, { stiffness: 300, damping: 30 });
  const ly = useSpring(rawY, { stiffness: 300, damping: 30 });
  const rawR = useMotionValue(0);
  const r = useSpring(rawR, { stiffness: 150, damping: 20 });
  const clip = useMotionTemplate`circle(${r}px at ${lx}px ${ly}px)`;
  const ringX = useTransform(lx, (v) => v - 150);
  const ringY = useTransform(ly, (v) => v - 150);
  const ringOpacity = useTransform(r, [0, 140], [0, 1]);

  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set(e.clientX - rect.left);
    rawY.set(e.clientY - rect.top);
  };

  return (
    <div className="relative mx-auto max-w-5xl">
      {!prefersReducedMotion && (
        <div
          className={`relative hidden h-[480px] select-none overflow-hidden border-4 border-ink bg-white shadow-[10px_10px_0px_#1A1A1A] lg:block ${
            xray ? '' : 'cursor-none'
          }`}
          onMouseMove={move}
          onMouseEnter={() => {
            rawR.set(150);
            setLensActive(true);
          }}
          onMouseLeave={() => {
            rawR.set(0);
            setLensActive(false);
          }}
          onDoubleClick={() => setXray((v) => !v)}
        >
          <BlindScene lensActive={lensActive} />
          <motion.div style={{ clipPath: xray ? 'none' : clip }} className="absolute inset-0">
            <DecodedScene />
          </motion.div>
          {/* the glass */}
          {!xray && (
            <motion.div
              style={{ x: ringX, y: ringY, opacity: ringOpacity }}
              className="pointer-events-none absolute left-0 top-0 h-[300px] w-[300px]"
              aria-hidden="true"
            >
              <div className="absolute inset-0 rounded-full border-4 border-ink shadow-[6px_6px_0px_rgba(26,26,26,0.35)]" />
              <div className="absolute bottom-1 right-1 h-4 w-16 translate-x-1/2 translate-y-1/2 rotate-45 border-3 border-ink bg-primary-container" />
            </motion.div>
          )}
          {xray && (
            <div className="absolute left-4 top-4 -rotate-6 border-2 border-ink bg-secondary px-3 py-1 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0px_#1A1A1A]">
              X-ray mode
            </div>
          )}
        </div>
      )}
      {/* Mobile / reduced motion: the decoded truth, no lens needed */}
      <div
        className={`relative h-[380px] overflow-hidden border-4 border-ink shadow-[8px_8px_0px_#1A1A1A] ${
          prefersReducedMotion ? '' : 'lg:hidden'
        }`}
      >
        <DecodedScene />
      </div>
    </div>
  );
};

/** Act II product mock: the standing you see after uploading a marksheet. */
const StandingPanel = () => (
  <div className="relative border-3 border-ink bg-white p-6 shadow-[8px_8px_0px_#1A1A1A]">
    <div className="absolute -right-4 -top-4 rotate-6 border-2 border-ink bg-primary-container px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
      Example
    </div>
    <p className="text-xs font-black uppercase tracking-widest text-ink/50">
      Your standing — after upload
    </p>
    <svg viewBox="0 0 170 60" className="mt-4 w-full" aria-hidden="true">
      <path d={curvePath} stroke="#1A1A1A" strokeWidth="2" fill="none" />
      <line x1="80" y1="52" x2="80" y2="12" stroke="#1A1A1A" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
      <line x1="98" y1="52" x2="98" y2="16" stroke="#A8275A" strokeWidth="2" strokeDasharray="4 4" />
      <motion.circle
        cx="98"
        cy={gaussianY(98)}
        r="5"
        fill="#ffde59"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 12 }}
      />
      <text x="105" y={gaussianY(98) + 3} fontSize="8" fontWeight="900" fontFamily="Space Grotesk, sans-serif" fill="#1A1A1A">
        YOU +0.6σ
      </text>
      <text x="80" y="9" textAnchor="middle" fontSize="7" fontWeight="700" fontFamily="Space Grotesk, sans-serif" fill="#1A1A1A" opacity="0.5">
        CLASS AVG
      </text>
    </svg>
    <div className="mt-4 grid gap-2">
      {[
        ['Class average', '15.8 / 20'],
        ['Topper', '19.5 / 20 — 4.2 ahead of you'],
        ['Your percentile', '73rd'],
      ].map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between gap-4 border-2 border-ink bg-background px-4 py-2.5 text-xs font-bold uppercase"
        >
          <span className="text-ink/60">{label}</span>
          <span className="text-right font-black">{value}</span>
        </div>
      ))}
    </div>
  </div>
);

const Eyebrow = ({ children, className = 'text-secondary' }: { children: React.ReactNode; className?: string }) => (
  <motion.p variants={rise} className={`font-luxury text-xl italic ${className}`}>
    {children}
  </motion.p>
);

const actHeadline = 'mt-4 text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none';

// Example weighting shown in Act III — illustrative, real weights come from the course.
const WEIGHTS = [
  { label: 'Quizzes', pct: 15, yours: true },
  { label: 'Assignments', pct: 5, yours: true },
  { label: 'Midterm', pct: 30, yours: false },
  { label: 'Project', pct: 10, yours: true },
  { label: 'Final', pct: 40, yours: true },
];

const midtermStripes = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 6px, transparent 6px 12px)',
};

// Easter egg: clicking hero Zee cycles his moods.
const ZEE_CYCLE: ZeeVariant[] = ['hyped', 'smug', 'big-brain', 'pencil', 'dub'];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export const LandingPage = () => {
  const [zeeIdx, setZeeIdx] = useState(0);
  // Hero mouse parallax — Zee and the shapes drift with the cursor.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const zeeX = useSpring(useTransform(mx, (v) => v * 22), { stiffness: 60, damping: 14 });
  const zeeY = useSpring(useTransform(my, (v) => v * 16), { stiffness: 60, damping: 14 });
  const blobX = useSpring(useTransform(mx, (v) => v * -14), { stiffness: 50, damping: 16 });
  const blobY = useSpring(useTransform(my, (v) => v * -10), { stiffness: 50, damping: 16 });

  // Magnetic primary CTA — drifts a few px toward the cursor while hovered.
  const magRawX = useMotionValue(0);
  const magRawY = useMotionValue(0);
  const magX = useSpring(magRawX, { stiffness: 220, damping: 16 });
  const magY = useSpring(magRawY, { stiffness: 220, damping: 16 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (prefersReducedMotion) return;
    mx.set(e.clientX / window.innerWidth - 0.5);
    my.set(e.clientY / window.innerHeight - 0.5);
  };

  const handleMagnetMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    magRawX.set(Math.max(-8, Math.min(8, (e.clientX - rect.left - rect.width / 2) * 0.2)));
    magRawY.set(Math.max(-6, Math.min(6, (e.clientY - rect.top - rect.height / 2) * 0.3)));
  };

  const resetMagnet = () => {
    magRawX.set(0);
    magRawY.set(0);
  };

  return (
    <div id="top" className="min-h-screen overflow-x-hidden bg-background text-ink">
      <CurveHUD />

      {/* Nav */}
      <nav className="fixed top-0 z-50 flex h-20 w-full items-center justify-between border-b-4 border-ink bg-background px-6 md:px-12">
        <a href="#top" className="text-2xl font-black uppercase tracking-tighter text-ink">
          Outlier
        </a>
        <div className="hidden items-center gap-8 text-sm font-bold uppercase tracking-tighter md:flex">
          <a
            className="px-2 text-ink/60 transition-all hover:bg-primary-container hover:shadow-[2px_2px_0px_#1A1A1A]"
            href="#story"
          >
            The story
          </a>
          <a
            className="px-2 text-ink/60 transition-all hover:bg-primary-container hover:shadow-[2px_2px_0px_#1A1A1A]"
            href="#features"
          >
            Features
          </a>
        </div>
        <Link to="/auth" className={buttonVariants({ variant: 'primary', size: 'sm' })}>
          Sign in
        </Link>
      </nav>

      {/* Hero — exactly one screen, nothing bleeding in from below */}
      <header
        onMouseMove={handleMouseMove}
        className="relative flex h-screen min-h-[560px] flex-col items-center justify-center overflow-hidden border-b-4 border-ink px-6 pt-20 text-center"
      >
        {/* drifting shapes */}
        <motion.div
          style={{ x: blobX, y: blobY }}
          className="absolute left-[7%] top-[24%] hidden h-24 w-24 rounded-full border-3 border-ink bg-[#d7bcf5] lg:block"
          aria-hidden="true"
        />
        <motion.div
          style={{ x: blobX, y: blobY }}
          className="absolute bottom-[20%] left-[14%] hidden h-14 w-14 rotate-45 border-3 border-ink bg-primary-container lg:block"
          aria-hidden="true"
        />
        <motion.div
          style={{ x: blobX, y: blobY }}
          className="absolute bottom-[26%] right-[9%] hidden h-20 w-20 rounded-full border-3 border-ink bg-tertiary lg:block"
          aria-hidden="true"
        />
        <motion.div
          style={{ x: zeeX, y: zeeY }}
          className="absolute right-[6%] top-[19%] hidden cursor-pointer lg:block"
          onClick={() => setZeeIdx((i) => (i + 1) % ZEE_CYCLE.length)}
          whileTap={{ scale: 0.9, rotate: -6 }}
        >
          <motion.div
            animate={prefersReducedMotion ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <WigglyZee variant={ZEE_CYCLE[zeeIdx]} size={160} />
          </motion.div>
        </motion.div>

        <div className="z-10 max-w-5xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-sm font-bold uppercase tracking-[0.3em] text-ink/60"
          >
            For students stuck in the middle of the curve
          </motion.p>
          <h1 className="text-6xl font-black uppercase leading-none tracking-tighter md:text-9xl">
            <SplitWords text="Every class has an outlier." />
            <br />
            <motion.span
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 110, damping: 14 }}
              className="mt-3 inline-block"
            >
              Make it{' '}
              <span className="relative inline-block bg-primary-container px-3">
                you.
                <DrawnUnderline delay={1.15} />
              </span>
            </motion.span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mx-auto mt-8 max-w-2xl border-l-8 border-ink pl-6 text-left text-xl font-medium md:text-2xl"
          >
            Outlier turns your raw marks into your exact class standing — class average, Z-score,
            gap to the topper — and a plan to climb it.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05 }}
            className="mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row"
          >
            <motion.div
              style={{ x: magX, y: magY }}
              onMouseMove={handleMagnetMove}
              onMouseLeave={resetMagnet}
            >
              <Link
                to="/auth"
                className={`${buttonVariants({ variant: 'primary', size: 'lg' })} text-xl`}
              >
                Start climbing — free
              </Link>
            </motion.div>
            <a
              href="#story"
              className={`${buttonVariants({ variant: 'outline', size: 'lg' })} text-xl`}
            >
              Read the story ↓
            </a>
          </motion.div>
        </div>

        <motion.p
          animate={prefersReducedMotion ? undefined : { y: [0, 8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-6 text-xs font-black uppercase tracking-[0.3em] text-ink/50"
        >
          ↓ Scroll the story
        </motion.p>
      </header>

      {/* Marquee */}
      <div className="marquee-pause overflow-hidden border-b-4 border-ink bg-ink py-4">
        <div className="animate-marquee">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
              {[
                'see your real standing',
                'predict your GPA',
                'find your weak topics',
                'recover from a bad mid',
                'never miss a deadline',
              ].map((phrase) => (
                <span
                  key={phrase}
                  className="flex items-center text-2xl font-black uppercase tracking-tighter text-primary-container"
                >
                  <span className="px-6">{phrase}</span>
                  <span className="text-white">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Prologue — the map. The story curve gets its own stage. */}
      <section id="story" className="border-b-4 border-ink px-6 py-24 text-center">
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={inView}>
          <Eyebrow>Prologue — the map</Eyebrow>
          <motion.h2 variants={rise} className={actHeadline}>
            Every class is a <span className="bg-primary-container px-3">curve.</span>
          </motion.h2>
          <motion.p variants={rise} className="mx-auto mt-6 max-w-2xl text-lg font-medium">
            Most students huddle around the average and never find out where they really stand.
            Outliers live in the right tail. Same marks, two ways of seeing them — Outlier is the
            lens.
          </motion.p>
        </motion.div>
        <div className="mt-12">
          <LensScene />
        </div>
      </section>

      {/* Act I — the blindfold */}
      <section className="relative mx-auto grid max-w-6xl items-center gap-14 overflow-visible px-6 py-28 md:grid-cols-2">
        <span
          className="absolute left-[4%] top-16 -rotate-12 text-6xl font-black text-ink/10 select-none"
          aria-hidden="true"
        >
          ?
        </span>
        <span
          className="absolute bottom-14 left-[42%] rotate-6 text-7xl font-black text-ink/10 select-none"
          aria-hidden="true"
        >
          ?
        </span>
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={inView}>
          <Eyebrow>Act I — the blindfold</Eyebrow>
          <motion.h2 variants={rise} className={actHeadline}>
            You got 14 out of 20. Is that…{' '}
            <span className="bg-primary-container px-3">good?</span>
          </motion.h2>
          <motion.p variants={rise} className="mt-6 max-w-md text-lg font-medium">
            Without the class average, a mark is just a number. Above the mean? Below it? Two marks
            from the topper, or ten? Most students walk the whole semester blind — a number in a
            spreadsheet they've never seen.
          </motion.p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={inView}
          transition={{ type: 'spring', stiffness: 110, damping: 14 }}
          className="relative"
        >
          <div className="rotate-2 border-3 border-ink bg-white p-8 shadow-[8px_8px_0px_#1A1A1A] transition-transform duration-300 hover:rotate-0">
            <p className="text-sm font-bold uppercase tracking-tighter text-ink/50">
              Quiz 2 — Data Structures
            </p>
            <p className="mt-2 text-7xl font-black tracking-tighter">
              14<span className="text-3xl text-ink/40"> / 20</span>
            </p>
            <div className="mt-6 grid gap-2">
              {['Class average', 'Your rank', 'Gap to topper'].map((label) => (
                <div
                  key={label}
                  className="flex justify-between border-2 border-ink bg-background px-4 py-3 text-sm font-bold uppercase"
                >
                  <span className="text-ink/60">{label}</span>
                  <span className="tracking-[0.3em] text-ink/30">???</span>
                </div>
              ))}
            </div>
          </div>
          <WigglyZee variant="cooked" size={110} className="absolute -right-4 -top-14" />
        </motion.div>
      </section>

      {/* Act II — the reveal */}
      <section
        id="features"
        className="relative overflow-hidden border-y-4 border-ink bg-[#d7bcf5] px-6 py-24 md:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={inView}>
              <Eyebrow className="text-ink/70">Act II — the reveal</Eyebrow>
              <motion.h2 variants={rise} className={actHeadline}>
                Upload the marksheet.{' '}
                <span className="bg-white px-3">See everything.</span>
              </motion.h2>
              <motion.p variants={rise} className="mt-6 text-lg font-medium">
                Set up your semester once. Drop in your quizzes, assignments, midterm, project —
                Outlier reads the sheet and pulls out what nobody tells you.
              </motion.p>
              <motion.ol variants={rise} className="mt-8 grid gap-3">
                {['Set up your semester', 'Upload your marks', 'Watch the curve appear'].map(
                  (step, i) => (
                    <li
                      key={step}
                      className="flex items-center gap-4 border-3 border-ink bg-white px-5 py-3 text-sm font-bold uppercase tracking-tighter shadow-[4px_4px_0px_#1A1A1A]"
                    >
                      <span className="text-2xl font-black text-secondary">0{i + 1}</span>
                      {step}
                    </li>
                  )
                )}
              </motion.ol>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: 1 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={inView}
              transition={{ type: 'spring', stiffness: 90, damping: 14 }}
              className="lg:mt-10"
            >
              <StandingPanel />
            </motion.div>
          </div>
        </div>

        <div className="pointer-events-auto absolute -bottom-2 right-6 hidden md:block">
          <WigglyZee variant="trend-spotter" size={130} />
        </div>
      </section>

      {/* Act III — the comeback */}
      <section className="relative overflow-hidden bg-ink px-6 py-28 text-background md:px-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={inView}>
              <Eyebrow className="text-primary-container">Act III — the comeback</Eyebrow>
              <motion.h2 variants={rise} className={actHeadline}>
                Bombed the mid?{' '}
                <span className="bg-primary-container px-3 text-ink">
                  The math says you're still alive.
                </span>
              </motion.h2>
              <motion.p variants={rise} className="mt-6 text-lg font-medium text-background/70">
                A midterm worth 30% hurts. It doesn't decide anything. The rest of the grade —
                quizzes, assignments, the project, the final — is still on the table, and it's in
                your hands. Outlier tells you which category to attack, which topics are weak, and
                what grade is still reachable.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={inView}
              transition={{ type: 'spring', stiffness: 90, damping: 14 }}
              className="border-3 border-background/30 bg-zinc-900 p-6"
            >
              <p className="text-xs font-black uppercase tracking-widest text-background/50">
                The comeback plan
              </p>
              <div className="mt-5 flex h-20 w-full gap-1.5">
                {WEIGHTS.map((w, i) => (
                  <motion.div
                    key={w.label}
                    initial={{ scaleY: 0, opacity: 0 }}
                    whileInView={{ scaleY: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{
                      delay: i * 0.1,
                      type: 'spring',
                      stiffness: 90,
                      damping: 14,
                    }}
                    style={{
                      width: `${w.pct}%`,
                      ...(w.yours ? {} : midtermStripes),
                    }}
                    className={`flex origin-bottom items-end justify-center border-2 pb-2 text-xs font-black ${
                      w.yours
                        ? 'border-ink bg-primary-container text-ink'
                        : 'border-zinc-600 bg-zinc-800 text-white/40'
                    }`}
                  >
                    {w.pct}%
                  </motion.div>
                ))}
              </div>
              <div className="mt-2 flex w-full gap-1.5 text-xs font-bold uppercase tracking-tighter text-background/60">
                {WEIGHTS.map((w) => (
                  <span
                    key={w.label}
                    style={{ width: `${w.pct}%` }}
                    className={`text-center ${w.yours ? '' : 'line-through opacity-50'}`}
                  >
                    {w.label}
                  </span>
                ))}
              </div>
              <div className="mt-6 grid gap-2.5">
                {[
                  ['Attack', 'remaining quizzes — 15% still open'],
                  ['Secure', 'the project — 10% fully in your control'],
                  ['Prepare', 'the final — 40%, the real battlefield'],
                ].map(([verb, rest]) => (
                  <div
                    key={verb}
                    className="border-l-4 border-primary-container pl-3 text-sm font-bold uppercase tracking-tighter text-background/80"
                  >
                    <span className="text-primary-container">{verb}</span> → {rest}
                  </div>
                ))}
              </div>
              <p className="mt-6 text-2xl font-black uppercase tracking-tighter md:text-3xl">
                Still in your hands:{' '}
                <span className="bg-primary-container px-2 text-ink">70%</span>
              </p>
              <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-background/40">
                Example weighting — yours comes from your own courses.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="absolute -bottom-1 right-8 hidden md:block">
          <WigglyZee variant="locked-in" size={130} />
        </div>
      </section>

      {/* Act IV — the quiet part */}
      <section className="mx-auto max-w-6xl px-6 py-28">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={inView}
          className="flex items-end justify-between gap-6"
        >
          <div>
            <Eyebrow>Act IV — the quiet part</Eyebrow>
            <motion.h2 variants={rise} className={actHeadline}>
              Everything else? <span className="bg-primary-container px-3">Handled.</span>
            </motion.h2>
          </div>
          <motion.div variants={rise} className="hidden shrink-0 md:block">
            <WigglyZee variant="fuel-up" size={120} />
          </motion.div>
        </motion.div>
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {[
            {
              icon: CalendarDays,
              title: 'Calendar, read for you',
              body: 'Upload the academic calendar PDF — weeks, breaks and finals get mapped for you.',
            },
            {
              icon: Hash,
              title: 'Week numbers, always right',
              body: 'Know exactly which week of the semester you are in, breaks excluded.',
            },
            {
              icon: BellRing,
              title: 'Deadline & quiz reminders',
              body: 'Assignments and quizzes land on your radar before they land on you.',
            },
            {
              icon: ListChecks,
              title: 'Todos in one place',
              body: 'Course tasks and personal ones, together, so nothing slips.',
            },
          ].map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              variants={rise}
              className="border-3 border-ink bg-white p-6 shadow-[4px_4px_0px_#1A1A1A] transition-all hover:-translate-y-1 hover:shadow-[7px_7px_0px_#1A1A1A]"
            >
              <div className="flex h-12 w-12 items-center justify-center border-3 border-ink bg-primary-container">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 text-xl font-black uppercase tracking-tighter">{title}</h3>
              <p className="mt-2 text-sm font-medium text-ink/70">{body}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Act V — the choice */}
      <section className="border-t-4 border-ink bg-background px-6 py-32 text-center">
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={inView}>
          <Eyebrow className="mx-auto text-secondary">Act V — the choice</Eyebrow>
          <motion.p variants={rise} className="mx-auto mt-2 max-w-xl text-lg font-medium">
            Two roads from here. Keep guessing — or see the curve.
          </motion.p>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          whileInView={{ scale: 1, opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ type: 'spring', bounce: 0.4, duration: 0.8 }}
          className="relative mx-auto mt-12 max-w-4xl border-8 border-ink bg-white p-12 shadow-[16px_16px_0px_#A8275A]"
        >
          <div className="absolute -right-10 -top-10 -rotate-12 cursor-default border-3 border-ink bg-primary-container p-4 font-black uppercase transition-transform hover:-rotate-6 hover:scale-110">
            Free Forever
          </div>
          <div className="flex justify-center">
            <motion.div
              animate={prefersReducedMotion ? undefined : { y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <WigglyZee variant="dub" size={130} />
            </motion.div>
          </div>
          <h2 className="mt-6 text-4xl font-black uppercase tracking-tighter md:text-6xl">
            The average is waiting for you to settle in.{' '}
            <span className="bg-secondary px-3 text-white">Don't.</span>
          </h2>
          <div className="mt-10">
            <Link
              to="/auth"
              className={`${buttonVariants({ variant: 'ink', size: 'lg' })} w-full text-xl md:w-auto`}
            >
              Become the outlier
            </Link>
            <p className="mt-4 text-xs font-bold uppercase tracking-widest text-ink/50">
              No card needed
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t-4 border-ink bg-background">
        <div className="flex w-full flex-col items-center justify-between gap-8 px-6 py-12 md:flex-row md:px-12">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <div className="text-3xl font-black uppercase tracking-tighter text-ink">Outlier</div>
            <p className="text-sm font-bold uppercase tracking-widest text-ink/60">
              For students who refuse the average.
            </p>
          </div>
          <p className="text-xs font-bold uppercase tracking-tighter text-ink/40">
            © 2026 Outlier — every curve has a right tail.
          </p>
        </div>
      </footer>
    </div>
  );
};

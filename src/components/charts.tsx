import { CohortStanding, DeliverableStanding } from '../utils/gpaEngine';
import { getThemeHexColor, ThemeColor } from '../utils/impactStyles';
import type { ZeeVariant } from './ui';

/**
 * Zee reacts to the student's real standing — the mascot literally embodies
 * the number it sits beside (lore: public/brand/zee/README.md). Single source
 * so the same number always earns the same face and the same line, whether
 * it's one course (CohortStandingPanel) or the semester average (Analytics).
 * Thresholds are percentile-space equivalents of weightedZ >= 1 and >= 0
 * (Φ(1) ≈ 84.13, Φ(0) = 50) so callers never need to hand over a raw Z.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const zeeForStanding = (hasData: boolean, percentile: number): { variant: ZeeVariant; line: string } => {
  if (!hasData) {
    return { variant: 'big-brain', line: "Upload marks. I can't fight a curve I can't see." };
  }
  if (percentile >= 84.13) return { variant: 'on-curve', line: 'Told you. The curve fears you.' };
  if (percentile >= 50) return { variant: 'on-curve', line: 'Above the mean. Keep climbing.' };
  return { variant: 'study', line: 'Below average is a temporary address.' };
};

/**
 * Neo-brutalist bell curve with three markers: class average (Z = 0), you, and
 * the topper composite. Pure presentation — every value comes from the engine.
 * Shared by CourseDetail's Standing panel and the Analytics course board.
 */
export const DistributionStrip = ({ standing, themeColor }: { standing: CohortStanding; themeColor?: ThemeColor }) => {
  const xOf = (z: number) => 12 + ((Math.min(2.8, Math.max(-2.8, z)) + 3) / 6) * 256;
  const curve = Array.from({ length: 61 }, (_, i) => {
    const z = -3 + i * 0.1;
    const y = 78 - 62 * Math.exp(-(z * z) / 2);
    return `${xOf(z).toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const youX = xOf(standing.weightedZ);
  const themeHex = getThemeHexColor(themeColor);

  return (
    <svg viewBox="0 0 280 92" className="w-full" role="img" aria-label="Class score distribution with markers for the class average, you, and the topper">
      <polyline points={curve} fill="none" stroke="#1A1A1A" strokeWidth="3" />
      {/* baseline */}
      <line x1="8" y1="80" x2="272" y2="80" stroke="#1A1A1A" strokeWidth="4" />
      {/* class average marker (Z = 0) */}
      <line x1={xOf(0)} y1="18" x2={xOf(0)} y2="80" stroke="#1A1A1A" strokeWidth="2" strokeDasharray="4 3" opacity="0.4" />
      {/* topper marker */}
      {standing.topperZ !== null && (
        <>
          <line x1={xOf(standing.topperZ)} y1="30" x2={xOf(standing.topperZ)} y2="80" stroke="#a8275a" strokeWidth="3" />
          <rect x={xOf(standing.topperZ) - 4} y="76" width="8" height="8" fill="#a8275a" stroke="#1A1A1A" strokeWidth="1.5" />
        </>
      )}
      {/* you marker */}
      <line x1={youX} y1="24" x2={youX} y2="80" stroke="#1A1A1A" strokeWidth="4" />
      <rect x={youX - 5} y="75" width="10" height="10" fill={themeHex} stroke="#1A1A1A" strokeWidth="2" />
    </svg>
  );
};

/**
 * Sparkline of the per-deliverable Z-scores in date order — how the student's
 * standing vs the class has moved, graded item by graded item. The dashed
 * midline is the class average (Z = 0); the end dot wears the course accent.
 * Callers only render this with two or more points.
 */
export const ZTrendSparkline = ({ points, themeColor }: { points: DeliverableStanding[]; themeColor?: ThemeColor }) => {
  const W = 120, H = 36, PAD = 6;
  const clampZ = (z: number) => Math.min(2.5, Math.max(-2.5, z));
  const xOf = (i: number) => PAD + (i / (points.length - 1)) * (W - 2 * PAD);
  const yOf = (z: number) => H / 2 - (clampZ(z) / 2.5) * (H / 2 - PAD);
  const line = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p.z).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-28 h-9 shrink-0" role="img" aria-label="Standing vs class over time, one point per graded item">
      <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#1A1A1A" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
      <polyline points={line} fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xOf(points.length - 1)} cy={yOf(last.z)} r="4" fill={getThemeHexColor(themeColor)} stroke="#1A1A1A" strokeWidth="2" />
    </svg>
  );
};

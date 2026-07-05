import { Upload } from 'lucide-react';
import { CourseDeliverable } from '../types';
import { CohortStanding, CourseStatus, CATEGORY_LABELS, topPercentOf } from '../utils/gpaEngine';
import { getThemeBgClass, getThemeTextClass, getThemeHexColor, ThemeColor } from '../utils/impactStyles';
import { Card } from './ui';

/**
 * Neo-brutalist bell curve with three markers: class average (Z = 0), you, and
 * the topper composite. Pure presentation — every value comes from the engine.
 */
const DistributionStrip = ({ standing, themeColor }: { standing: CohortStanding; themeColor?: ThemeColor }) => {
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

interface CohortStandingPanelProps {
  standing: CohortStanding;
  courseStatus: CourseStatus;
  themeColor?: ThemeColor;
  deliverables: CourseDeliverable[];
}

/**
 * Right-sidebar Standing panel for CourseDetail. Replaces the old Quick Stats:
 * one composition answering "where do I stand and what closes the gap",
 * with an honest coaching empty state instead of N/A rows.
 */
export const CohortStandingPanel = ({ standing, courseStatus, themeColor, deliverables }: CohortStandingPanelProps) => {
  const gap = standing.gapToTopper;
  const showGapSentence = gap !== null && gap.points > 0.05;
  const levelWithTopper = gap !== null && gap.points <= 0.05;

  // Full-marks texture: the most recent deliverable where someone maxed the paper.
  const fullMarksEvent = [...deliverables]
    .reverse()
    .find(d =>
      d.metadata?.highestScore !== undefined &&
      d.metadata?.toppersCount !== undefined &&
      d.metadata.highestScore === (d.metadata.totalMarks || 100)
    );

  return (
    <Card shadow="sm" className="p-0">
      <div className="p-6 border-b-4 border-ink">
        <h3 className="text-xl font-black uppercase tracking-tighter">Class Standing</h3>
      </div>

      {standing.hasData ? (
        <div className="p-6 space-y-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Where you stand</p>
            <p className="text-5xl font-black leading-none mt-1">Top {topPercentOf(standing.percentile)}%</p>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2">of your class on graded work</p>
          </div>

          <DistributionStrip standing={standing} themeColor={themeColor} />

          <div className="space-y-2 text-[10px] font-black uppercase tracking-widest">
            <div className="flex justify-between items-center border-b border-ink/10 pb-2">
              <span className="flex items-center gap-2">
                <span className={`w-3 h-3 border-2 border-ink ${getThemeBgClass(themeColor)}`}></span> You
              </span>
              <span className="text-base">{standing.yourPct !== null ? standing.yourPct.toFixed(1) + '%' : '—'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-ink/10 pb-2">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-ink bg-ink/20"></span> Class Average
              </span>
              <span className="text-base">{standing.classAvgPct !== null ? standing.classAvgPct.toFixed(1) + '%' : '—'}</span>
            </div>
            {standing.topperPct !== null && (
              <div className="flex justify-between items-center border-b border-ink/10 pb-2">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-ink bg-secondary"></span> Topper
                </span>
                <span className="text-base text-secondary">{standing.topperPct.toFixed(1)}%</span>
              </div>
            )}
          </div>

          {showGapSentence && (
            <p className="text-sm font-bold leading-snug border-2 border-ink bg-background p-3">
              You're <span className="font-black text-secondary">{gap.points.toFixed(1)} weighted points</span> behind the topper
              {gap.topCategory && (
                <> — most of that gap sits in {CATEGORY_LABELS[gap.topCategory.category]} ({gap.topCategory.weight}% of your grade)</>
              )}.
            </p>
          )}
          {levelWithTopper && (
            <p className="text-sm font-bold leading-snug border-2 border-ink bg-background p-3">
              You're level with the topper on everything graded so far. Hold the line.
            </p>
          )}

          {fullMarksEvent && (
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
              {fullMarksEvent.title}: {fullMarksEvent.metadata!.toppersCount} student{fullMarksEvent.metadata!.toppersCount === 1 ? '' : 's'} hit full marks
            </p>
          )}

          <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
            Based on {standing.statsCoveredWeight}% of your grade
            {standing.minSampleSize !== null && <> · smallest sample: {standing.minSampleSize} scores</>}
          </p>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {courseStatus.coveredWeight > 0 && (
            <div className="flex justify-between items-center border-b border-ink/10 pb-3">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Your Average</span>
              <span className="text-xl font-black">{courseStatus.projectedScore.toFixed(1)}%</span>
            </div>
          )}
          <div className="border-2 border-dashed border-ink p-4 space-y-2">
            <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Upload size={14} /> No class data yet
            </p>
            <p className="text-sm font-medium leading-snug opacity-80">
              Upload a class marksheet on any graded quiz, assignment or exam to unlock your standing — class average, percentile, and your gap to the topper.
            </p>
          </div>
        </div>
      )}

      {/* Current Projected Grade. With zero graded work there is no grade to
          project — say so instead of rendering the engine's 'N/A' sentinel. */}
      <div className={`p-6 ${getThemeBgClass(themeColor)} ${getThemeTextClass(themeColor)} border-t-4 border-ink`}>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1">Current Projected Grade</p>
        <p className="text-4xl font-black leading-none">
          {courseStatus.coveredWeight > 0 ? courseStatus.estimatedGrade : '—'}
        </p>
        <p className="text-[10px] font-bold uppercase mt-2 opacity-60">
          {courseStatus.coveredWeight > 0
            ? `Based on weightage (${courseStatus.coveredWeight}% of final grade accounted for)`
            : 'No graded work yet — upload marks to see a projection'}
        </p>
      </div>
    </Card>
  );
};

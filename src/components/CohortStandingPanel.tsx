import { Upload } from 'lucide-react';
import { CourseDeliverable } from '../types';
import { CohortStanding, CourseStatus, CATEGORY_LABELS, topPercentOf } from '../utils/gpaEngine';
import { getThemeBgClass, getThemeTextClass, ThemeColor } from '../utils/impactStyles';
import { Card, ZeeMascot } from './ui';
import { DistributionStrip, zeeForStanding } from './charts';

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
  const zee = zeeForStanding(standing.hasData, standing.percentile);

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
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Where you stand</p>
              <p className="text-5xl font-black leading-none mt-1">Top {topPercentOf(standing.percentile)}%</p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2">of your class on graded work</p>
            </div>
            {/* on-curve is a landscape composition (full bell curve) — needs more width than a portrait Zee */}
            <ZeeMascot variant={zee.variant} size={zee.variant === 'on-curve' ? 96 : 64} className="shrink-0" />
          </div>

          <p className="text-[10px] font-black uppercase tracking-widest text-secondary">
            "{zee.line}" — Zee
          </p>

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
          <div className="border-2 border-dashed border-ink p-4 space-y-3">
            <ZeeMascot variant={zee.variant} size={72} className="mx-auto" />
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary text-center">
              "{zee.line}" — Zee
            </p>
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

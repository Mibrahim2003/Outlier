import { Course, CourseDeliverable } from '../types';
import { parseLocalDate } from './dateUtils';

export const DEFAULT_GRADING_SCALE = [
  { grade: 'A', gpc: 4.00, minPercentage: 85 },
  { grade: 'A-', gpc: 3.67, minPercentage: 80 },
  { grade: 'B+', gpc: 3.33, minPercentage: 75 },
  { grade: 'B', gpc: 3.00, minPercentage: 71 },
  { grade: 'B-', gpc: 2.67, minPercentage: 68 },
  { grade: 'C+', gpc: 2.33, minPercentage: 64 },
  { grade: 'C', gpc: 2.00, minPercentage: 61 },
  { grade: 'C-', gpc: 1.67, minPercentage: 58 },
  { grade: 'D+', gpc: 1.33, minPercentage: 54 },
  { grade: 'D', gpc: 1.00, minPercentage: 50 },
  { grade: 'F', gpc: 0.00, minPercentage: 0 },
];

export type GradingScale = { grade: string; gpc: number; minPercentage?: number }[];

/**
 * Standard normal CDF Φ(z) — Zelen & Severo (1964) approximation, |error| < 7.5e-8.
 * Turns a Z-score into "fraction of the class at or below you".
 */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/** Percentile (0–100) of a Z-score under a normal curve. */
export function percentileFromZ(z: number): number {
  return normalCdf(z) * 100;
}

/** "Top X%" reading of a percentile, clamped so we never claim Top 0% or Top 100%. */
export function topPercentOf(percentile: number): number {
  return Math.min(99, Math.max(1, Math.round(100 - percentile)));
}

/**
 * Maps a Z-score to a grade on the USER'S grading scale (relative grading).
 * Thresholds are spaced evenly from +1.5σ (top grade) down to −3.0σ (last
 * passing grade), lowest grade as catch-all. For the 11-grade default scale
 * this reproduces the historical fixed table exactly (0.5σ steps), so default
 * users see no drift — but custom scales now get their own letters and GPCs.
 */
export function gradeFromZ(z: number, gradingScale: GradingScale = DEFAULT_GRADING_SCALE): { grade: string; gpc: number } {
  const effectiveScale = gradingScale && gradingScale.length > 0 ? gradingScale : DEFAULT_GRADING_SCALE;
  const sorted = [...effectiveScale].sort((a, b) => b.gpc - a.gpc);
  const n = sorted.length;
  if (n === 1) return { grade: sorted[0].grade, gpc: sorted[0].gpc };

  const zHigh = 1.5;
  const zLow = -3.0;
  for (let i = 0; i < n - 1; i++) {
    const threshold = n >= 3 ? zHigh - i * ((zHigh - zLow) / (n - 2)) : 0;
    if (z >= threshold) return { grade: sorted[i].grade, gpc: sorted[i].gpc };
  }
  return { grade: sorted[n - 1].grade, gpc: sorted[n - 1].gpc };
}

/**
 * Estimates a grade based on relative grading (z-score) if class stats are available,
 * or falls back to absolute grading based on percentage using the provided grading scale.
 */
export function estimateGrade(score: number, maxScore: number, gradingScale: GradingScale = DEFAULT_GRADING_SCALE, classAvg?: number, classStdDev?: number): { grade: string; gpc: number } {
  // gradingScale can arrive as null (a profile that never set a custom scale) or
  // empty (all rows deleted in Settings); a default parameter only covers
  // `undefined`, so coerce those cases to the default explicitly.
  const effectiveScale = gradingScale && gradingScale.length > 0 ? gradingScale : DEFAULT_GRADING_SCALE;
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  if (classAvg !== undefined && classStdDev !== undefined && classStdDev > 0) {
    const zScore = (score - classAvg) / classStdDev;
    return gradeFromZ(zScore, effectiveScale);
  }

  // Absolute fallback based on standard percentage cutoffs dynamically
  // Sort by minPercentage descending
  const sortedScale = [...effectiveScale].sort((a, b) => (b.minPercentage || 0) - (a.minPercentage || 0));
  
  for (const scale of sortedScale) {
    if (percentage >= (scale.minPercentage || 0)) {
      return { grade: scale.grade, gpc: scale.gpc };
    }
  }

  // Fallback to F
  return { grade: 'F', gpc: 0.00 };
}

// ─── Cohort standing ───────────────────────────────────────────
// Single source of truth for every cohort number the app shows.
// Components must render these values, never re-derive them.

type CategoryKey = 'quizzes' | 'assignments' | 'midterm' | 'final' | 'project';

const TYPE_TO_CATEGORY: Record<CourseDeliverable['type'], CategoryKey> = {
  quiz: 'quizzes',
  assignment: 'assignments',
  midterm: 'midterm',
  final: 'final',
  project: 'project',
};

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  quizzes: 'quizzes',
  assignments: 'assignments',
  midterm: 'the midterm',
  final: 'the final',
  project: 'the project',
};

/** Metadata values arrive as number OR string depending on row age; coerce both. */
const metaNumber = (v: unknown): number => (typeof v === 'number' ? v : parseFloat(String(v ?? '')));

/** Z-score of one deliverable vs its class, or null when class stats are missing. */
function deliverableZ(d: CourseDeliverable): number | null {
  const score = parseFloat(d.score || '');
  const classAvg = metaNumber(d.metadata?.classAvg);
  const classStdDev = metaNumber(d.metadata?.classStdDev);
  if (isNaN(score) || isNaN(classAvg) || isNaN(classStdDev) || classStdDev <= 0) return null;
  return (score - classAvg) / classStdDev;
}

export interface DeliverableStanding {
  id: string;
  title: string;
  type: CourseDeliverable['type'];
  date: string;
  z: number;
  percentile: number;
  /** Share of the final grade this deliverable carries (points out of 100). */
  weightShare: number;
}

export interface CohortStanding {
  hasData: boolean;
  /** Course-level Z: each deliverable's Z weighted by its share of the final grade. */
  weightedZ: number;
  /** Φ(weightedZ) × 100 — "you're at or above this fraction of the class". */
  percentile: number;
  /** % of the final grade that has class stats behind it. */
  statsCoveredWeight: number;
  /** Weighted class average / your score / topper composite, as % of covered weight. */
  classAvgPct: number | null;
  yourPct: number | null;
  topperPct: number | null;
  /** Topper composite's weighted Z (for placing the topper marker on the curve). */
  topperZ: number | null;
  /** Smallest known marksheet sample among the deliverables used (honesty caveat). */
  minSampleSize: number | null;
  /** Weighted gap to the topper in points of the final grade, with the category holding the biggest closable share. */
  gapToTopper: { points: number; topCategory: { category: CategoryKey; weight: number; points: number } | null } | null;
  /** Date-ordered per-deliverable standings — doubles as the Z trend. */
  deliverables: DeliverableStanding[];
}

const EMPTY_STANDING: CohortStanding = {
  hasData: false,
  weightedZ: 0,
  percentile: 50,
  statsCoveredWeight: 0,
  classAvgPct: null,
  yourPct: null,
  topperPct: null,
  topperZ: null,
  minSampleSize: null,
  gapToTopper: null,
  deliverables: [],
};

/**
 * Computes the student's standing against the class for one course.
 * Every aggregate is weighted by how much the deliverable matters to the final
 * grade: a deliverable in a category worth W% shares W equally with the other
 * deliverables of that category that also have class stats.
 */
export function calculateCohortStanding(course: Course, deliverables: CourseDeliverable[]): CohortStanding {
  // Weight shares for the Z-bearing set, per category.
  const zSet = deliverables.filter(d => deliverableZ(d) !== null);
  if (zSet.length === 0) return EMPTY_STANDING;

  const catCounts: Partial<Record<CategoryKey, number>> = {};
  zSet.forEach(d => {
    const cat = TYPE_TO_CATEGORY[d.type];
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  const weightShareOf = (d: CourseDeliverable): number => {
    const cat = TYPE_TO_CATEGORY[d.type];
    const catWeight = course.weightage?.[cat] || 0;
    const count = catCounts[cat] || 0;
    return count > 0 ? catWeight / count : 0;
  };

  let zWeightedSum = 0;
  let weightSum = 0;
  let avgPctSum = 0;
  let yourPctSum = 0;
  let topperPctSum = 0;
  let topperWeightSum = 0;
  let topperZSum = 0;
  let topperZWeightSum = 0;
  let minSampleSize: number | null = null;
  const perDeliverable: DeliverableStanding[] = [];

  zSet.forEach(d => {
    const z = deliverableZ(d)!;
    const w = weightShareOf(d);
    if (w <= 0) return;
    const total = d.metadata?.totalMarks || 100;
    const score = parseFloat(d.score || '0');
    const classAvg = metaNumber(d.metadata?.classAvg);
    const classStdDev = metaNumber(d.metadata?.classStdDev);

    zWeightedSum += z * w;
    weightSum += w;
    avgPctSum += (classAvg / total) * 100 * w;
    yourPctSum += (score / total) * 100 * w;

    const highest = d.metadata?.highestScore;
    if (highest !== undefined && !isNaN(highest)) {
      topperPctSum += (highest / total) * 100 * w;
      topperWeightSum += w;
      topperZSum += ((highest - classAvg) / classStdDev) * w;
      topperZWeightSum += w;
    }

    const sample = d.metadata?.classSize;
    if (sample !== undefined && sample > 0) {
      minSampleSize = minSampleSize === null ? sample : Math.min(minSampleSize, sample);
    }

    perDeliverable.push({
      id: d.id,
      title: d.title,
      type: d.type,
      date: d.date,
      z,
      percentile: percentileFromZ(z),
      weightShare: w,
    });
  });

  if (weightSum <= 0) return EMPTY_STANDING;

  const weightedZ = zWeightedSum / weightSum;

  // Weighted gap to the topper, attributed per category. Computed over the
  // deliverables that have BOTH a score and a topper score; each carries its
  // category weight split among that category's gap-bearing deliverables.
  const gapSet = deliverables.filter(d => {
    const score = parseFloat(d.score || '');
    return !isNaN(score) && d.metadata?.highestScore !== undefined;
  });
  const gapCatCounts: Partial<Record<CategoryKey, number>> = {};
  gapSet.forEach(d => {
    const cat = TYPE_TO_CATEGORY[d.type];
    gapCatCounts[cat] = (gapCatCounts[cat] || 0) + 1;
  });
  const gapByCategory: Partial<Record<CategoryKey, number>> = {};
  let gapPoints = 0;
  let gapWeightSeen = 0;
  gapSet.forEach(d => {
    const cat = TYPE_TO_CATEGORY[d.type];
    const catWeight = course.weightage?.[cat] || 0;
    const count = gapCatCounts[cat] || 0;
    const w = count > 0 ? catWeight / count : 0;
    if (w <= 0) return;
    const total = d.metadata?.totalMarks || 100;
    const score = parseFloat(d.score || '0');
    const highest = d.metadata!.highestScore!;
    const gap = Math.max(0, (highest - score) / total) * w; // points of the final grade
    gapByCategory[cat] = (gapByCategory[cat] || 0) + gap;
    gapPoints += gap;
    gapWeightSeen += w;
  });

  let topCategory: { category: CategoryKey; weight: number; points: number } | null = null;
  (Object.keys(gapByCategory) as CategoryKey[]).forEach(cat => {
    const points = gapByCategory[cat]!;
    if (points > 0 && (!topCategory || points > topCategory.points)) {
      topCategory = { category: cat, weight: course.weightage?.[cat] || 0, points };
    }
  });

  // Date order (invalid/legacy dates keep insertion order at the end).
  perDeliverable.sort((a, b) => {
    const ta = parseLocalDate(a.date).getTime();
    const tb = parseLocalDate(b.date).getTime();
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return ta - tb;
  });

  return {
    hasData: true,
    weightedZ,
    percentile: percentileFromZ(weightedZ),
    statsCoveredWeight: Math.round(weightSum),
    classAvgPct: avgPctSum / weightSum,
    yourPct: yourPctSum / weightSum,
    topperPct: topperWeightSum > 0 ? topperPctSum / topperWeightSum : null,
    topperZ: topperZWeightSum > 0 ? topperZSum / topperZWeightSum : null,
    minSampleSize,
    gapToTopper: gapWeightSeen > 0 ? { points: gapPoints, topCategory } : null,
    deliverables: perDeliverable,
  };
}

export interface WeakTopic {
  deliverableId: string;
  courseId: string;
  title: string;
  type: CourseDeliverable['type'];
  z: number;
  percentile: number;
  lectureRange?: string;
  topics?: string;
}

/**
 * Deterministic weak-topic detection: the below-class-average deliverables
 * (z < 0), worst first, joined with their lecture ranges / topics so the
 * student knows exactly what to study. No AI guessing — the AI only narrates.
 */
export function deriveWeakTopics(course: Course, deliverables: CourseDeliverable[], limit = 3): WeakTopic[] {
  const standing = calculateCohortStanding(course, deliverables);
  if (!standing.hasData) return [];

  const byId = new Map(deliverables.map(d => [d.id, d]));
  return standing.deliverables
    .filter(ds => ds.z < 0)
    .sort((a, b) => a.z - b.z)
    .slice(0, limit)
    .map(ds => {
      const d = byId.get(ds.id);
      return {
        deliverableId: ds.id,
        courseId: course.id,
        title: ds.title,
        type: ds.type,
        z: ds.z,
        percentile: ds.percentile,
        lectureRange: d?.metadata?.lectureRange,
        topics: d?.metadata?.topics,
      };
    });
}

export interface CourseStatus {
  weightedScore: number;
  coveredWeight: number;
  projectedScore: number;
  estimatedGrade: string;
  estimatedGPC: number;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Calculates the predicted status for a single course.
 */
export function calculateCourseStatus(course: Course, deliverables: CourseDeliverable[], gradingScale: GradingScale = DEFAULT_GRADING_SCALE): CourseStatus {
  let totalWeightedScore = 0; // accumulated percentage points
  let totalCoveredWeight = 0; // out of 100

  const categories = ['quizzes', 'assignments', 'midterm', 'final', 'project'] as const;
  const typeMap: Record<string, string> = {
    'quizzes': 'quiz',
    'assignments': 'assignment',
    'midterm': 'midterm',
    'final': 'final',
    'project': 'project'
  };

  categories.forEach(cat => {
    const catWeight = course.weightage?.[cat] || 0;
    if (catWeight === 0) return;

    const catDeliverables = deliverables.filter(d => 
      d.type === typeMap[cat] && d.score !== undefined && d.score !== '' && !isNaN(parseFloat(d.score))
    );

    if (catDeliverables.length > 0) {
      // Average the percentages of all deliverables in this category so far
      let catPercentSum = 0;
      let count = 0;

      catDeliverables.forEach(d => {
        const score = parseFloat(d.score || '0');
        const max = d.metadata?.totalMarks || 100;
        if (max > 0) {
          catPercentSum += (score / max);
          count++;
        }
      });

      const avgCatPercent = count > 0 ? (catPercentSum / count) : 0;
      
      // We assume this average holds for the entire category weight
      totalWeightedScore += avgCatPercent * catWeight;
      totalCoveredWeight += catWeight;
    }
  });

  const projectedScore = totalCoveredWeight > 0 
    ? (totalWeightedScore / totalCoveredWeight) * 100 
    : 0;

  // Relative grading path: use the GRADE-WEIGHTED course-level Z (a quiz worth
  // 3% must not count as much as a midterm worth 30%), mapped through the
  // user's grading scale. Absolute fallback when no class stats exist.
  const standing = calculateCohortStanding(course, deliverables);

  const estimatedResult = standing.hasData
    ? gradeFromZ(standing.weightedZ, gradingScale)
    : estimateGrade(projectedScore, 100, gradingScale);

  // If nothing is graded, don't project an F, project an N/A basically, but use 0 as numbers
  if (totalCoveredWeight === 0) {
    return {
      weightedScore: 0,
      coveredWeight: 0,
      projectedScore: 0,
      estimatedGrade: 'N/A',
      estimatedGPC: 0,
      confidence: 'low'
    };
  }

  let confidence: 'low' | 'medium' | 'high' = 'low';
  if (totalCoveredWeight >= 80) confidence = 'high';
  else if (totalCoveredWeight >= 40) confidence = 'medium';

  return {
    weightedScore: totalWeightedScore,
    coveredWeight: totalCoveredWeight,
    projectedScore,
    estimatedGrade: estimatedResult.grade,
    estimatedGPC: estimatedResult.gpc,
    confidence
  };
}

export interface SemesterStatus {
  courses: (CourseStatus & { courseId: string; credits: number })[];
  semesterGPA: string;
  totalCredits: number;
}

/**
 * Calculates the overall semester GPA by aggregating predicted GPCs across all courses.
 */
export function calculateSemesterGPA(courses: Course[], deliverables: CourseDeliverable[], gradingScale: GradingScale = DEFAULT_GRADING_SCALE): SemesterStatus {
  let totalPoints = 0;
  let totalCredits = 0;

  const courseStatuses = courses.map(course => {
    const courseDelivs = deliverables.filter(d => d.courseId === course.id);
    const status = calculateCourseStatus(course, courseDelivs, gradingScale);
    
    // Only count courses where we have at least SOME data
    if (status.coveredWeight > 0) {
      totalPoints += status.estimatedGPC * course.credits;
      totalCredits += course.credits;
    }

    return {
      ...status,
      courseId: course.id,
      credits: course.credits
    };
  });

  const semesterGPA = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';

  return {
    courses: courseStatuses,
    semesterGPA,
    totalCredits
  };
}

/**
 * Projects new CGPA and calculates the gap to target.
 */
export function projectCGPA(currentCGPA: number, targetCGPA: number, semesterGPA: number, semesterCredits: number, pastCredits: number = 0) {
  if (semesterCredits === 0) {
    return { projectedCGPA: currentCGPA, gap: currentCGPA - targetCGPA, requiredSemesterGPA: 0 };
  }

  // If pastCredits is not provided (0), we just say the projected CGPA is the semester GPA 
  // (which is inaccurate for actual CGPA, but better than blowing up. Or we assume a default).
  // Actually, if pastCredits is 0 but currentCGPA > 0, we can estimate pastCredits based on the current semester.
  // Assuming this is semester N, past credits is roughly (N-1) * semesterCredits.
  // But we don't have N here easily. Let's just use what's passed.
  
  const totalCredits = pastCredits + semesterCredits;
  const projectedCGPA = totalCredits > 0 
    ? ((currentCGPA * pastCredits) + (semesterGPA * semesterCredits)) / totalCredits 
    : semesterGPA;

  const gap = projectedCGPA - targetCGPA;

  // Calculate what semester GPA is needed to hit the target exactly
  const requiredPointsForTarget = (targetCGPA * totalCredits) - (currentCGPA * pastCredits);
  const requiredSemesterGPA = semesterCredits > 0 ? requiredPointsForTarget / semesterCredits : 0;

  return {
    projectedCGPA: Number(projectedCGPA.toFixed(2)),
    gap: Number(gap.toFixed(2)),
    requiredSemesterGPA: Number(requiredSemesterGPA.toFixed(2))
  };
}

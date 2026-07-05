import { describe, it, expect } from 'vitest';
import {
  normalCdf,
  percentileFromZ,
  topPercentOf,
  gradeFromZ,
  estimateGrade,
  calculateCohortStanding,
  deriveWeakTopics,
  DEFAULT_GRADING_SCALE,
} from '../gpaEngine';
import type { Course, CourseDeliverable } from '../../types';

// ─── Fixtures ───────────────────────────────────────────────────

const makeCourse = (weightage: Course['weightage']): Course => ({
  id: 'c1',
  code: 'CS-101',
  name: 'Data Structures',
  credits: 3,
  gradeProgress: 0,
  impactLevel: 'standard',
  grade: '',
  weightage,
});

const makeDeliverable = (
  over: Partial<CourseDeliverable> & Pick<CourseDeliverable, 'id' | 'type'>
): CourseDeliverable => ({
  courseId: 'c1',
  title: over.id,
  date: '2026-03-01',
  status: 'graded',
  ...over,
});

// The canonical weighted test case from the spec:
// quiz 9/10 (classAvg 5, stdDev 2)   → z = +2.0, category weight 10
// midterm 40/60 (classAvg 45, stdDev 5) → z = −1.0, category weight 30
const WEIGHTED_COURSE = makeCourse({ quizzes: 10, assignments: 0, midterm: 30, final: 40, project: 20 });

const QUIZ = makeDeliverable({
  id: 'q1',
  type: 'quiz',
  title: 'Quiz 1',
  date: '2026-03-10',
  score: '9',
  metadata: { classAvg: 5, classStdDev: 2, totalMarks: 10, highestScore: 10, classSize: 42 },
});

const MIDTERM = makeDeliverable({
  id: 'm1',
  type: 'midterm',
  title: 'Midterm Exam',
  date: '2026-04-02',
  // classAvg stored as string: both string and number must work
  score: '40',
  metadata: { classAvg: '45', classStdDev: 5, totalMarks: 60, highestScore: 55, classSize: 38, lectureRange: '1-8' },
});

// ─── 1) normalCdf / percentileFromZ / topPercentOf ──────────────

describe('normalCdf', () => {
  it('is the standard normal CDF, accurate to <= 0.001', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 3);
    expect(Math.abs(normalCdf(1.5) - 0.9332)).toBeLessThanOrEqual(0.001);
    expect(Math.abs(normalCdf(-1) - 0.1587)).toBeLessThanOrEqual(0.001);
    expect(Math.abs(normalCdf(0.8) - 0.7881)).toBeLessThanOrEqual(0.001);
  });
});

describe('percentileFromZ', () => {
  it('is normalCdf(z) * 100', () => {
    expect(percentileFromZ(0)).toBeCloseTo(50, 2);
    expect(Math.abs(percentileFromZ(1.5) - 93.32)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(percentileFromZ(-1) - 15.87)).toBeLessThanOrEqual(0.1);
  });
});

describe('topPercentOf', () => {
  it('rounds 100 - percentile and clamps to [1, 99]', () => {
    expect(topPercentOf(99.9)).toBe(1);
    expect(topPercentOf(0)).toBe(99);
    expect(topPercentOf(79)).toBe(21);
    expect(topPercentOf(100)).toBe(1);
    expect(topPercentOf(-5)).toBe(99);
  });
});

// ─── 2) gradeFromZ / estimateGrade (scale-aware) ────────────────

const CUSTOM_5_SCALE = [
  { grade: 'A+', gpc: 4.33 },
  { grade: 'B', gpc: 3.0 },
  { grade: 'C', gpc: 2.0 },
  { grade: 'D', gpc: 1.0 },
  { grade: 'F', gpc: 0 },
];

describe('DEFAULT_GRADING_SCALE', () => {
  it('is exported with 11 grades from A (4.00) to F (0.00)', () => {
    expect(DEFAULT_GRADING_SCALE).toHaveLength(11);
    expect(DEFAULT_GRADING_SCALE[0]).toMatchObject({ grade: 'A', gpc: 4.0 });
    expect(DEFAULT_GRADING_SCALE[10]).toMatchObject({ grade: 'F', gpc: 0.0 });
  });
});

describe('gradeFromZ', () => {
  it('reproduces the exact default-scale table (0.5-sigma steps from +1.5 to -3.0, F below)', () => {
    const table: [number, string, number][] = [
      [1.5, 'A', 4.0],
      [1.0, 'A-', 3.67],
      [0.5, 'B+', 3.33],
      [0, 'B', 3.0],
      [-0.5, 'B-', 2.67],
      [-1.0, 'C+', 2.33],
      [-1.5, 'C', 2.0],
      [-2.0, 'C-', 1.67],
      [-2.5, 'D+', 1.33],
      [-3.0, 'D', 1.0],
      [-3.01, 'F', 0.0],
    ];
    table.forEach(([z, grade, gpc]) => {
      expect(gradeFromZ(z, DEFAULT_GRADING_SCALE)).toEqual({ grade, gpc });
    });
    // Between-threshold sanity: values inside a band get the band's grade.
    expect(gradeFromZ(2.4, DEFAULT_GRADING_SCALE).grade).toBe('A');
    expect(gradeFromZ(0.2, DEFAULT_GRADING_SCALE).grade).toBe('B');
    expect(gradeFromZ(-0.7, DEFAULT_GRADING_SCALE).grade).toBe('C+');
  });

  it('spaces thresholds evenly for a custom 5-grade scale (1.5, 0, -1.5, -3.0)', () => {
    expect(gradeFromZ(1.6, CUSTOM_5_SCALE)).toEqual({ grade: 'A+', gpc: 4.33 });
    expect(gradeFromZ(1.5, CUSTOM_5_SCALE)).toEqual({ grade: 'A+', gpc: 4.33 });
    expect(gradeFromZ(0.2, CUSTOM_5_SCALE)).toEqual({ grade: 'B', gpc: 3.0 });
    expect(gradeFromZ(0, CUSTOM_5_SCALE)).toEqual({ grade: 'B', gpc: 3.0 });
    expect(gradeFromZ(-1.4, CUSTOM_5_SCALE)).toEqual({ grade: 'C', gpc: 2.0 });
    expect(gradeFromZ(-3.0, CUSTOM_5_SCALE)).toEqual({ grade: 'D', gpc: 1.0 });
    expect(gradeFromZ(-3.5, CUSTOM_5_SCALE)).toEqual({ grade: 'F', gpc: 0 });
  });
});

describe('estimateGrade (relative path)', () => {
  it('uses the scale-aware z mapping when class stats are present, not a hardcoded table', () => {
    // z = (80 - 70) / 5 = 2 → top grade of the USER'S scale: A+ 4.33
    // (the old hardcoded behavior would return 'A' 4.00 — that is a failure)
    expect(estimateGrade(80, 100, CUSTOM_5_SCALE, 70, 5)).toEqual({ grade: 'A+', gpc: 4.33 });
  });

  it('maps to the default scale on the relative path when using the default scale', () => {
    // z = 2 → A on the default scale
    expect(estimateGrade(80, 100, DEFAULT_GRADING_SCALE, 70, 5)).toEqual({ grade: 'A', gpc: 4.0 });
  });
});

// ─── 3) calculateCohortStanding ─────────────────────────────────

describe('calculateCohortStanding', () => {
  it('weights each deliverable Z by its share of the final grade (not a naive mean)', () => {
    // Pass in reverse date order to also prove the output is date-sorted.
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [MIDTERM, QUIZ]);

    expect(standing.hasData).toBe(true);
    // (2·10 + (−1)·30) / 40 = −0.25 — the unweighted mean +0.5 would be wrong
    expect(standing.weightedZ).toBeCloseTo(-0.25, 6);
    expect(Math.abs(standing.percentile - 40.1)).toBeLessThanOrEqual(0.2);
    expect(standing.statsCoveredWeight).toBe(40);
  });

  it('computes weighted percentage composites for you and the class average', () => {
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [QUIZ, MIDTERM]);
    // yourPct = (90·10 + 66.667·30) / 40 ≈ 72.5
    expect(standing.yourPct).not.toBeNull();
    expect(standing.yourPct!).toBeCloseTo(72.5, 1);
    // classAvgPct = (50·10 + 75·30) / 40 = 68.75 (classAvg '45' arrives as a string)
    expect(standing.classAvgPct).not.toBeNull();
    expect(standing.classAvgPct!).toBeCloseTo(68.75, 1);
  });

  it('reports the smallest known class sample size', () => {
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [QUIZ, MIDTERM]);
    expect(standing.minSampleSize).toBe(38);
  });

  it('reports minSampleSize null when no deliverable carries classSize', () => {
    const quiz = makeDeliverable({
      id: 'q1',
      type: 'quiz',
      score: '9',
      metadata: { classAvg: 5, classStdDev: 2, totalMarks: 10 },
    });
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [quiz]);
    expect(standing.hasData).toBe(true);
    expect(standing.minSampleSize).toBeNull();
  });

  it('computes the weighted gap to the topper in points of the final grade, attributed by category', () => {
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [QUIZ, MIDTERM]);
    // quiz gap  = ((10 − 9) / 10) · 10 = 1 point
    // midterm gap = ((55 − 40) / 60) · 30 = 7.5 points
    expect(standing.gapToTopper).not.toBeNull();
    expect(standing.gapToTopper!.points).toBeCloseTo(8.5, 6);
    expect(standing.gapToTopper!.topCategory).not.toBeNull();
    expect(standing.gapToTopper!.topCategory!.category).toBe('midterm');
    expect(standing.gapToTopper!.topCategory!.points).toBeCloseTo(7.5, 6);
    expect(standing.gapToTopper!.topCategory!.weight).toBe(30);
  });

  it('gapToTopper is null when no deliverable has both a score and a highestScore', () => {
    const noTopper = makeDeliverable({
      id: 'q1',
      type: 'quiz',
      score: '9',
      metadata: { classAvg: 5, classStdDev: 2, totalMarks: 10 },
    });
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [noTopper]);
    expect(standing.hasData).toBe(true);
    expect(standing.gapToTopper).toBeNull();
  });

  it('never reports a negative gap: scoring above the recorded topper contributes 0', () => {
    const aboveTopper = makeDeliverable({
      id: 'q1',
      type: 'quiz',
      score: '10',
      metadata: { classAvg: 5, classStdDev: 2, totalMarks: 10, highestScore: 9 },
    });
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [aboveTopper]);
    expect(standing.gapToTopper).not.toBeNull();
    expect(standing.gapToTopper!.points).toBe(0);
    expect(standing.gapToTopper!.topCategory).toBeNull();
  });

  it('lists one entry per stat-bearing deliverable, sorted by date ascending', () => {
    // Input intentionally in reverse date order.
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [MIDTERM, QUIZ]);
    expect(standing.deliverables).toHaveLength(2);
    expect(standing.deliverables.map(d => d.id)).toEqual(['q1', 'm1']);

    const [quizEntry, midEntry] = standing.deliverables;
    expect(quizEntry).toMatchObject({ id: 'q1', title: 'Quiz 1', type: 'quiz', date: '2026-03-10' });
    expect(quizEntry.z).toBeCloseTo(2, 6);
    expect(Math.abs(quizEntry.percentile - 97.72)).toBeLessThanOrEqual(0.1);
    expect(quizEntry.weightShare).toBe(10);

    expect(midEntry).toMatchObject({ id: 'm1', title: 'Midterm Exam', type: 'midterm', date: '2026-04-02' });
    expect(midEntry.z).toBeCloseTo(-1, 6);
    expect(midEntry.weightShare).toBe(30);
  });

  it('splits a category weight evenly among its stat-bearing deliverables', () => {
    const q1 = makeDeliverable({
      id: 'q1', type: 'quiz', date: '2026-02-01', score: '8',
      metadata: { classAvg: 6, classStdDev: 2, totalMarks: 10 }, // z = +1
    });
    const q2 = makeDeliverable({
      id: 'q2', type: 'quiz', date: '2026-03-01', score: '4',
      metadata: { classAvg: 6, classStdDev: 2, totalMarks: 10 }, // z = −1
    });
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [q1, q2]);
    expect(standing.hasData).toBe(true);
    // quizzes weight 10 split between two quizzes → 5 each
    expect(standing.deliverables.map(d => d.weightShare)).toEqual([5, 5]);
    expect(standing.weightedZ).toBeCloseTo(0, 6);
    expect(standing.percentile).toBeCloseTo(50, 2);
    expect(standing.statsCoveredWeight).toBe(10);
  });

  it('coerces string classAvg values ("70.0") on the z path', () => {
    const quiz = makeDeliverable({
      id: 'q1', type: 'quiz', score: '80',
      metadata: { classAvg: '70.0', classStdDev: 5 }, // totalMarks absent → defaults to 100
    });
    const course = makeCourse({ quizzes: 15, assignments: 20, midterm: 25, final: 30, project: 10 });
    const standing = calculateCohortStanding(course, [quiz]);
    expect(standing.hasData).toBe(true);
    expect(standing.weightedZ).toBeCloseTo(2, 6);
    expect(standing.statsCoveredWeight).toBe(15);
    // totalMarks defaults to 100 → yourPct 80, classAvgPct 70
    expect(standing.yourPct!).toBeCloseTo(80, 6);
    expect(standing.classAvgPct!).toBeCloseTo(70, 6);
  });

  it('returns safe defaults when no deliverable has class stats', () => {
    const noStats = [
      makeDeliverable({ id: 'q1', type: 'quiz', score: '9' }),
      // classStdDev of 0 does NOT count as class stats
      makeDeliverable({
        id: 'q2', type: 'quiz', score: '7',
        metadata: { classAvg: 5, classStdDev: 0, totalMarks: 10 },
      }),
      // classAvg without a score does not count either
      makeDeliverable({ id: 'm1', type: 'midterm', metadata: { classAvg: 45, classStdDev: 5 } }),
    ];
    const standing = calculateCohortStanding(WEIGHTED_COURSE, noStats);
    expect(standing.hasData).toBe(false);
    expect(standing.percentile).toBe(50);
    expect(standing.weightedZ).toBe(0);
    expect(standing.statsCoveredWeight).toBe(0);
    expect(standing.classAvgPct).toBeNull();
    expect(standing.yourPct).toBeNull();
    expect(standing.minSampleSize).toBeNull();
    expect(standing.gapToTopper).toBeNull();
    expect(standing.deliverables).toEqual([]);
  });

  it('returns hasData false when the stat-bearing deliverables all sit in zero-weight categories', () => {
    const assignment = makeDeliverable({
      id: 'a1', type: 'assignment', score: '9',
      metadata: { classAvg: 5, classStdDev: 2, totalMarks: 10 },
    });
    // assignments carry weight 0 in this course
    const standing = calculateCohortStanding(WEIGHTED_COURSE, [assignment]);
    expect(standing.hasData).toBe(false);
    expect(standing.percentile).toBe(50);
    expect(standing.deliverables).toEqual([]);
  });
});

// ─── 4) deriveWeakTopics ────────────────────────────────────────

describe('deriveWeakTopics', () => {
  const course = makeCourse({ quizzes: 20, assignments: 20, midterm: 30, final: 20, project: 10 });
  const weakSet: CourseDeliverable[] = [
    makeDeliverable({
      id: 'q1', type: 'quiz', title: 'Quiz 1', date: '2026-02-05', score: '5',
      metadata: { classAvg: 6, classStdDev: 2, totalMarks: 10 }, // z = −0.5
    }),
    makeDeliverable({
      id: 'q2', type: 'quiz', title: 'Quiz 2', date: '2026-02-20', score: '2',
      metadata: { classAvg: 6, classStdDev: 2, totalMarks: 10, lectureRange: '5-8', topics: 'Trees & Graphs' }, // z = −2
    }),
    makeDeliverable({
      id: 'm1', type: 'midterm', title: 'Midterm', date: '2026-03-10', score: '40',
      metadata: { classAvg: 45, classStdDev: 5, totalMarks: 60 }, // z = −1
    }),
    makeDeliverable({
      id: 'a1', type: 'assignment', title: 'Assignment 1', date: '2026-03-15', score: '4',
      metadata: { classAvg: 7, classStdDev: 2, totalMarks: 10 }, // z = −1.5
    }),
    makeDeliverable({
      id: 'q3', type: 'quiz', title: 'Quiz 3', date: '2026-03-20', score: '9',
      metadata: { classAvg: 6, classStdDev: 2, totalMarks: 10 }, // z = +1.5 — above average, excluded
    }),
  ];

  it('returns only below-average deliverables, worst first, capped at the default limit of 3', () => {
    const topics = deriveWeakTopics(course, weakSet);
    expect(topics).toHaveLength(3);
    expect(topics.map(t => t.deliverableId)).toEqual(['q2', 'a1', 'm1']);
    expect(topics[0].z).toBeCloseTo(-2, 6);
    expect(topics[1].z).toBeCloseTo(-1.5, 6);
    expect(topics[2].z).toBeCloseTo(-1, 6);
  });

  it('copies lectureRange and topics from the deliverable metadata', () => {
    const topics = deriveWeakTopics(course, weakSet);
    const worst = topics[0];
    expect(worst).toMatchObject({
      deliverableId: 'q2',
      courseId: 'c1',
      title: 'Quiz 2',
      type: 'quiz',
      lectureRange: '5-8',
      topics: 'Trees & Graphs',
    });
    expect(Math.abs(worst.percentile - percentileFromZ(-2))).toBeLessThanOrEqual(0.001);
  });

  it('respects a custom limit', () => {
    const topics = deriveWeakTopics(course, weakSet, 2);
    expect(topics.map(t => t.deliverableId)).toEqual(['q2', 'a1']);
  });

  it('returns [] when there is no class data', () => {
    const noStats = [makeDeliverable({ id: 'q1', type: 'quiz', score: '3' })];
    expect(deriveWeakTopics(course, noStats)).toEqual([]);
    expect(deriveWeakTopics(course, [])).toEqual([]);
  });
});

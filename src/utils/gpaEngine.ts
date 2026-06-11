import { Course, CourseDeliverable } from '../types';

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
 * Estimates a grade based on relative grading (z-score) if class stats are available,
 * or falls back to absolute grading based on percentage using the provided grading scale.
 */
export function estimateGrade(score: number, maxScore: number, gradingScale: GradingScale = DEFAULT_GRADING_SCALE, classAvg?: number, classStdDev?: number): { grade: string; gpc: number } {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

  if (classAvg !== undefined && classStdDev !== undefined && classStdDev > 0) {
    const zScore = (score - classAvg) / classStdDev;
    
    // Z-score mapping (estimation of standard curve)
    if (zScore >= 1.5) return { grade: 'A', gpc: 4.00 };
    if (zScore >= 1.0) return { grade: 'A-', gpc: 3.67 };
    if (zScore >= 0.5) return { grade: 'B+', gpc: 3.33 };
    if (zScore >= 0.0) return { grade: 'B', gpc: 3.00 };
    if (zScore >= -0.5) return { grade: 'B-', gpc: 2.67 };
    if (zScore >= -1.0) return { grade: 'C+', gpc: 2.33 };
    if (zScore >= -1.5) return { grade: 'C', gpc: 2.00 };
    if (zScore >= -2.0) return { grade: 'C-', gpc: 1.67 };
    if (zScore >= -2.5) return { grade: 'D+', gpc: 1.33 };
    if (zScore >= -3.0) return { grade: 'D', gpc: 1.00 };
    return { grade: 'F', gpc: 0.00 };
  }

  // Absolute fallback based on standard percentage cutoffs dynamically
  // Sort by minPercentage descending
  const sortedScale = [...gradingScale].sort((a, b) => (b.minPercentage || 0) - (a.minPercentage || 0));
  
  for (const scale of sortedScale) {
    if (percentage >= (scale.minPercentage || 0)) {
      return { grade: scale.grade, gpc: scale.gpc };
    }
  }

  // Fallback to F
  return { grade: 'F', gpc: 0.00 };
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

  // Let's try to find an average z-score for the whole course if possible, 
  // else we fallback to absolute grade of the projected score
  let zScoreSum = 0;
  let zScoreCount = 0;

  deliverables.forEach(d => {
    const score = parseFloat(d.score || '0');
    const classAvg = typeof d.metadata?.classAvg === 'number' ? d.metadata.classAvg : parseFloat(d.metadata?.classAvg as string || 'NaN');
    const classStdDev = typeof d.metadata?.classStdDev === 'number' ? d.metadata.classStdDev : parseFloat(d.metadata?.classStdDev as unknown as string || 'NaN');

    if (!isNaN(score) && !isNaN(classAvg) && !isNaN(classStdDev) && classStdDev > 0) {
      zScoreSum += (score - classAvg) / classStdDev;
      zScoreCount++;
    }
  });

  let estimatedResult;
  if (zScoreCount > 0) {
    const avgZScore = zScoreSum / zScoreCount;
    // Reverse engineer a dummy score/avg to use estimateGrade just for z-score mapping
    estimatedResult = estimateGrade(avgZScore, 1, gradingScale, 0, 1);
  } else {
    estimatedResult = estimateGrade(projectedScore, 100, gradingScale);
  }

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

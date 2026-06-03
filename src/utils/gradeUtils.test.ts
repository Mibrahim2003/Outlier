import { describe, it, expect } from 'vitest';
import { getGradeDetails, calculateGPA, calculateRequiredFinal } from './gradeUtils';
import { Course } from '../types';

describe('gradeUtils', () => {
  describe('getGradeDetails', () => {
    it('returns correct grade and points for percentages', () => {
      expect(getGradeDetails(95)).toEqual({ letter: 'A', points: 4.0 });
      expect(getGradeDetails(93)).toEqual({ letter: 'A', points: 4.0 });
      expect(getGradeDetails(90)).toEqual({ letter: 'A-', points: 3.7 });
      expect(getGradeDetails(88)).toEqual({ letter: 'B+', points: 3.3 });
      expect(getGradeDetails(85)).toEqual({ letter: 'B', points: 3.0 });
      expect(getGradeDetails(80)).toEqual({ letter: 'B-', points: 2.7 });
      expect(getGradeDetails(78)).toEqual({ letter: 'C+', points: 2.3 });
      expect(getGradeDetails(75)).toEqual({ letter: 'C', points: 2.0 });
      expect(getGradeDetails(70)).toEqual({ letter: 'C-', points: 1.7 });
      expect(getGradeDetails(68)).toEqual({ letter: 'D+', points: 1.3 });
      expect(getGradeDetails(65)).toEqual({ letter: 'D', points: 1.0 });
      expect(getGradeDetails(50)).toEqual({ letter: 'F', points: 0.0 });
    });
  });

  describe('calculateGPA', () => {
    it('returns 0.00 for empty courses array', () => {
      expect(calculateGPA([])).toBe('0.00');
    });

    it('returns 0.00 when total credits is 0', () => {
      const courses: Course[] = [
        { id: '1', code: 'CS101', name: 'Intro', credits: 0, gradeProgress: 95, color: 'red' },
      ];
      expect(calculateGPA(courses)).toBe('0.00');
    });

    it('calculates correct GPA for multiple courses', () => {
      const courses: Course[] = [
        { id: '1', code: 'CS101', name: 'Intro', credits: 3, gradeProgress: 95, color: 'red' }, // A (4.0 * 3 = 12)
        { id: '2', code: 'MATH201', name: 'Calc', credits: 4, gradeProgress: 85, color: 'blue' }, // B (3.0 * 4 = 12)
        { id: '3', code: 'PHYS101', name: 'Physics', credits: 3, gradeProgress: 75, color: 'green' }, // C (2.0 * 3 = 6)
      ];
      // Total points: 12 + 12 + 6 = 30
      // Total credits: 3 + 4 + 3 = 10
      // GPA: 30 / 10 = 3.00
      expect(calculateGPA(courses)).toBe('3.00');
    });

    it('formats GPA to two decimal places', () => {
      const courses: Course[] = [
        { id: '1', code: 'CS101', name: 'Intro', credits: 3, gradeProgress: 90, color: 'red' }, // A- (3.7 * 3 = 11.1)
        { id: '2', code: 'MATH201', name: 'Calc', credits: 3, gradeProgress: 80, color: 'blue' }, // B- (2.7 * 3 = 8.1)
      ];
      // Total points: 19.2
      // Total credits: 6
      // GPA: 19.2 / 6 = 3.20
      expect(calculateGPA(courses)).toBe('3.20');
    });
  });

  describe('calculateRequiredFinal', () => {
    it('returns null if final weight is 0 or less', () => {
      expect(calculateRequiredFinal(90, 0, 93)).toBeNull();
      expect(calculateRequiredFinal(90, -10, 93)).toBeNull();
    });

    it('returns 0 if target is already achieved', () => {
      // current progress is 95%, final is 20%. target is 70%
      expect(calculateRequiredFinal(95, 20, 70)).toBe(0);
    });

    it('returns null if target is impossible to achieve', () => {
      // current progress is 50%, final is 20%. target is 90%
      // Current actual points: 50 * 0.8 = 40
      // Max possible with final: 40 + 20 = 60
      expect(calculateRequiredFinal(50, 20, 90)).toBeNull();
    });

    it('calculates the correct required percentage on the final', () => {
      // current progress is 85%, final is 20%. target is 90%
      // Current actual points: 85 * 0.80 = 68
      // Points needed from final: 90 - 68 = 22
      // Since final is 20 points, we need 22 points out of 20, which is 110%, so it should return null because > finalWeight
      expect(calculateRequiredFinal(85, 20, 90)).toBeNull();

      // Let's do a possible one
      // current progress is 85%, final is 30%. target is 80%
      // Current actual points: 85 * 0.70 = 59.5
      // Points needed: 80 - 59.5 = 20.5
      // Required percentage on final: (20.5 / 30) * 100 = 68.333...
      expect(calculateRequiredFinal(85, 30, 80)).toBe(68.3);
    });
  });
});

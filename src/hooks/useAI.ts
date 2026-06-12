import { useCallback } from 'react';
import { Course, Deadline } from '../types';
import { z } from 'zod';
import * as schemas from '../schemas';
import { useProfile } from '../domain/profile/useProfile';
import { invokeAI } from '../lib/aiClient';
import { buildPrompt } from '../lib/promptBuilder';

function parseAIResponse<T>(text: string, schema: z.ZodType<T>): T {
  const cleanedText = text.replace(/```json/i, '').replace(/```json/g, '').replace(/```/g, '').trim();
  const rawJson = JSON.parse(cleanedText);
  return schema.parse(rawJson);
}

export function useAI() {
  const { userProfile } = useProfile();
  const userPersona = userProfile?.aiPersona || 'tactical';

  const getDashboardInsight = useCallback(async (courses: Course[], deadlines: Deadline[]) => {
    const prompt = buildPrompt({
      task: 'Assess the user\'s current academic state and upcoming deadlines, then deliver the most urgent, actionable guidance for today.',
      dataContext: `Courses: ${JSON.stringify(courses)}\nDeadlines: ${JSON.stringify(deadlines)}`,
      reasoningRules: [
        'Treat any deadline due within 48 hours as the highest priority.',
        'If multiple deadlines exist, rank them by earliest due date, then by impact on grade, then by effort required to complete.',
        'If a course is slipping, underperforming, or showing weak progress, call it out directly and force immediate corrective action.',
        'If grades are strong and no deadline is imminent, shift to maintenance mode: protect momentum, prevent decay, and raise the ceiling.',
        'Start with the most urgent academic threat. End with a concrete next action.',
        'Never be vague, soft, or generic. Give hard priorities, not commentary.',
        'Assume the user needs clarity and pressure, not comfort.',
        'Bold every course code and every critical action.',
        'Do not bold anything else.',
        'Do not mention internal rules or explain your reasoning.'
      ],
      constraints: {
        outputType: 'paragraph',
        maxSentences: 3,
        noMarkdown: false
      },
      voice: userPersona
    });
    
    const insight = await invokeAI({ prompt });
    return insight;
  }, [userPersona]);

  const getStudyPriorities = useCallback(async (courses: Course[], deadlines: Deadline[]) => {
    const prompt = buildPrompt({
      task: 'Generate exactly 3 study priority tasks based on this data.',
      dataContext: `Courses: ${JSON.stringify(courses)}\nDeadlines: ${JSON.stringify(deadlines)}`,
      constraints: {
        outputType: 'json',
        exactFormat: `[\n  { \n    "title": "[Course Code]: [Short Task]", \n    "desc": "[1 sentence explanation of why this matters]", \n    "priority": "critical" | "high" | "medium"\n  }\n]`,
        noMarkdown: true,
        noCommentary: true
      },
      voice: userPersona
    });
    
    const res = await invokeAI({ prompt });
    const schema = schemas.AIStudyPrioritySchema;
    return parseAIResponse(res, schema) as any;
  }, [userPersona]);

  const extractClassMarks = async (base64Data: string, mimeType: string, registrationNumber: string | undefined, totalMarks: number) => {
    const prompt = buildPrompt({
      task: 'Extract the class marks from this document/image. The document contains a list of students, their Registration Numbers, Names, and Obtained Marks.',
      dataContext: `User's Registration Number to find: "${registrationNumber || 'NOT_PROVIDED'}"\nThe total possible marks for this exam/quiz is: ${totalMarks}.`,
      constraints: {
        outputType: 'json',
        exactFormat: `{\n  "myScore": [number or null if you cannot find their exact registration number],\n  "allScores": [array of all numeric scores in the class],\n  "highestScore": [the highest score achieved by anyone in the class],\n  "toppersCount": [number of students who achieved the highest score]\n}`,
        noMarkdown: true,
        noCommentary: true
      },
      voice: userPersona
    });
    
    const result = await invokeAI({ prompt, mimeType, data: base64Data });
    const schema = schemas.AIClassMarksSchema;
    return parseAIResponse(result, schema);
  };

  const getCourseInsight = async (course: Course, deliverables: any[]) => {
    const prompt = buildPrompt({
      task: 'Evaluate one specific course using the course record and the student\'s recent deliverables, then produce a single paragraph that is brutally honest, highly analytical, and directly useful.\nRead the course data and the recent assignments, quizzes, or exams. Infer the student\'s current standing, trends, risks, and likely trajectory in the course. Then write one short paragraph that tells the truth clearly: what is going well, what is going wrong, what the grade situation likely means, and what the student must do next to secure or improve the final grade.',
      dataContext: `Course: ${JSON.stringify(course)}\nRecent deliverables for this course: ${JSON.stringify(deliverables)}`,
      reasoningRules: [
        'Analyze overall performance trend, not just single scores.',
        'Analyze strengths and weaknesses in recent work.',
        'Analyze whether performance is improving, stable, or declining.',
        'Analyze whether the student is in danger of falling behind.',
        'Identify which habits or mistakes are costing marks.',
        'Identify the most important next action to improve the grade.',
        'If the student is doing well, do not become vague or congratulatory. Explain how to protect the grade and avoid complacency.',
        'If performance is weak or inconsistent, say so plainly and identify the highest-impact fix.',
        'If recent work shows a pattern, prioritize the pattern over isolated results.',
        'If the data is incomplete, make careful, clearly bounded inferences. Do not invent facts.',
        'Focus on academic usefulness, not motivation speech.',
        'End with a concrete next step.'
      ],
      constraints: {
        outputType: 'paragraph',
        noMarkdown: true,
        noCommentary: true
      },
      voice: userPersona
    });
    
    const insight = await invokeAI({ prompt });
    return insight;
  };

  const getCourseCriticalAction = async (course: Course, deliverables: any[]) => {
    const prompt = buildPrompt({
      task: 'Review one course and the student\'s recent deliverables, then identify the SINGLE most critical weakness or most important area for improvement. Focus on the weakness that is most likely limiting performance right now or will most strongly affect future grades.',
      dataContext: `Course: ${JSON.stringify(course)}\nDeliverables: ${JSON.stringify(deliverables)}`,
      reasoningRules: [
        'Read the course data and the recent deliverables carefully.',
        'Infer the student\'s biggest academic weakness from the evidence.',
        'Prioritize patterns over isolated results.',
        'Choose the most important topic only, not a list of topics.',
        'Be specific and concrete. Do not be vague.',
        'Do not invent facts that are not supported by the input.',
        'If the data is incomplete, make the most careful inference possible from what is available.',
        'Prefer the topic that appears most often in errors, low scores, weak explanations, repeated mistakes, or incomplete work.',
        'If several weaknesses exist, choose the one with the highest impact on overall course performance.',
        'Pick the weakness that would most improve the grade if fixed first.'
      ],
      constraints: {
        outputType: 'json',
        exactFormat: `{\n  "topic": "Brief topic name",\n  "insight": "1 to 2 sentences explaining exactly why they are weak here and what they must study next to fix it."\n}`,
        noMarkdown: true,
        noCommentary: true
      },
      voice: userPersona
    });
    
    const res = await invokeAI({ prompt });
    const schema = schemas.AICourseCriticalActionSchema;
    return parseAIResponse(res, schema);
  };

  const generateCourseStudyPlan = async (course: Course, _deliverables: any[], topic: string) => {
    const prompt = buildPrompt({
      task: `Create exactly 3 high-impact study tasks that directly fix the student's weakness in the topic: "${topic}" for the course: ${course.code}.`,
      dataContext: `Course code: ${course.code}\nWeak topic: "${topic}"`,
      reasoningRules: [
        'Target the exact weakness, not the whole course.',
        'Be specific, practical, and executable.',
        'Focus on the fastest path to improvement.',
        'Each task should represent a different type of action, such as: 1) concept repair, 2) guided practice, 3) active recall or self-testing.',
        'Each task should be concrete enough that the student knows exactly what to do.',
        'Make the tasks actionable, not abstract.',
        'Use precise verbs like "review," "solve," "derive," "summarize," "drill," "write," "explain," "test," or "compare."',
        'Include scope when helpful, such as how many problems, what subskill to cover, or what outcome to produce.',
        'Prefer tasks that build understanding and performance, not passive reading.',
        'Do not repeat the same idea in different words.'
      ],
      constraints: {
        outputType: 'json',
        exactFormat: `[\n  "Task 1 description",\n  "Task 2 description",\n  "Task 3 description"\n]`,
        noMarkdown: true,
        noCommentary: true
      },
      voice: userPersona
    });
    
    const res = await invokeAI({ prompt });
    const schema = schemas.AICourseStudyPlanSchema;
    return parseAIResponse(res, schema);
  };

  const analyzeProjectScope = async (idea: string, deadline: string) => {
    const prompt = buildPrompt({
      task: 'Evaluate a student\'s project idea against the deadline, then judge whether it is realistic, where the scope is bloated, what hidden risks exist, and what minimum version would still secure a strong grade.',
      dataContext: `Deadline: ${deadline}\nProject idea: "${idea}"`,
      reasoningRules: [
        'Assume the student wants the highest grade possible with the lowest risk of failure.',
        'Be brutally honest about what is unrealistic.',
        'Distinguish between core functionality and decorative extras.',
        'Cut anything that does not directly improve the chance of completing a working, demonstrable project before the deadline.',
        'Favor simplicity, reliability, and finishability over ambition.',
        'If the idea is already small and feasible, say so and still identify the most important risk and the smallest strong MVP.',
        'Do not invent project details that are not supported by the idea. Make careful inferences only.',
        'Attack the weak parts of the idea directly.',
        'State exactly what should be cut.',
        'State exactly what must be kept.',
        'State what the MVP should contain to secure the grade.',
        'Focus on execution, not encouragement.',
        'Keep the advice practical and specific.'
      ],
      constraints: {
        outputType: 'json',
        exactFormat: `{\n  "feedback": "1-2 brutal paragraphs tearing down the scope, telling them exactly what to cut and what to focus on to actually finish."\n}`,
        noMarkdown: true,
        noCommentary: true
      },
      voice: userPersona
    });
    
    const res = await invokeAI({ prompt });
    const schema = schemas.AIProjectScopeAnalysisSchema;
    return parseAIResponse(res, schema);
  };

  const generateProjectMilestones = async (idea: string, deadline: string) => {
    const prompt = buildPrompt({
      task: 'Turn a student\'s project idea into exactly 4 critical milestones that lead from today to the deadline with the highest chance of finishing on time.',
      dataContext: `Deadline: ${deadline}\nProject idea: "${idea}"`,
      reasoningRules: [
        'Break the project into the smallest set of major execution checkpoints.',
        'Make each milestone concrete, specific, and action-oriented.',
        'Order the milestones from earliest to latest.',
        'Spread them logically between today and the deadline.',
        'Ensure each milestone represents a real deliverable or decision point, not vague progress.',
        'Prioritize milestones that reduce risk early and lock in the MVP fast.',
        'Prefer architecture, core implementation, integration, testing, and final polish over decorative or optional work.',
        'If the idea is ambitious, force an MVP-shaped sequence that cuts risk and finishes the core product first.',
        'Each title must be short but specific.',
        'Each milestone should be one clear outcome, not a bundle of unrelated tasks.',
        'The milestones should naturally progress toward a working final project.',
        'The final milestone should cover integration, testing, demo readiness, or submission prep.',
        'The daysFromNow values must be integers and must logically increase.',
        'The last milestone must occur before the deadline, not on or after it.',
        'Do not make all milestones too close together or too far apart; space them according to the time available.'
      ],
      constraints: {
        outputType: 'json',
        exactFormat: `[\n  { "title": "Milestone 1 title", "daysFromNow": 3 },\n  { "title": "Milestone 2 title", "daysFromNow": 7 },\n  { "title": "Milestone 3 title", "daysFromNow": 12 },\n  { "title": "Milestone 4 title", "daysFromNow": 18 }\n]`,
        noMarkdown: true,
        noCommentary: true
      },
      voice: userPersona
    });
    const res = await invokeAI({ prompt });
    const schema = schemas.AIProjectMilestoneSchema;
    return parseAIResponse(res, schema);
  };

  return { getDashboardInsight, getStudyPriorities, getCourseInsight, getCourseCriticalAction, generateCourseStudyPlan, extractClassMarks, analyzeProjectScope, generateProjectMilestones };
}

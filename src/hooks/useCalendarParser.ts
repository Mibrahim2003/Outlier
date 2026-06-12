import { useState } from 'react';
import { SemesterInfo } from '../types';
import { z } from 'zod';
import * as schemas from '../schemas';
import { invokeAI } from '../lib/aiClient';
import { buildPrompt } from '../lib/promptBuilder';

function parseAIResponse<T>(text: string, schema: z.ZodType<T>): T {
  const cleanedText = text.replace(/```json/i, '').replace(/```json/g, '').replace(/```/g, '').trim();
  const rawJson = JSON.parse(cleanedText);
  return schema.parse(rawJson);
}

export function useCalendarParser() {
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const parseCalendarImage = async (file: File): Promise<SemesterInfo[] | null> => {

    setParsing(true);
    setParseError(null);

    try {
      // Validate file size early to prevent connection drops by API gateway
      if (file.size > 4 * 1024 * 1024) {
        throw new Error('File is too large (max 4MB). Please compress the PDF or use an image snippet.');
      }

      // Convert file to base64
      const base64 = await fileToBase64(file);
      const mimeType = file.type || 'image/png';

      const prompt = buildPrompt({
        task: 'Analyze this university academic calendar image and extract ALL semester information.',
        reasoningRules: [
          'Extract ALL semesters visible (Fall, Spring, Summer).',
          'Use ISO date format (YYYY-MM-DD).',
          'Include ALL breaks, holidays, and recesses.',
          'Include exam/finals period if visible.',
          'If a date is ambiguous, make your best estimate based on typical academic schedules.',
          'Return an array even if there is only one semester.'
        ],
        constraints: {
          outputType: 'json',
          exactFormat: `[\n  {\n    "name": "Fall 2026",\n    "startDate": "2026-08-25",\n    "endDate": "2026-12-15",\n    "breaks": [\n      { "name": "Fall Break", "startDate": "2026-10-14", "endDate": "2026-10-15" },\n      { "name": "Thanksgiving Break", "startDate": "2026-11-25", "endDate": "2026-11-29" }\n    ],\n    "examPeriod": { "startDate": "2026-12-08", "endDate": "2026-12-15" }\n  }\n]`,
          noMarkdown: true,
          noCommentary: true
        }
      });

      const textResult = await invokeAI({ prompt, mimeType, data: base64 });
      
      const schema = schemas.AICalendarSemesterListSchema;
      const semesters = parseAIResponse(textResult, schema);
      return semesters as SemesterInfo[];
    } catch (e: any) {
      console.error('Calendar parsing error:', e);
      setParseError(e.message || 'Failed to parse calendar. Please try again.');
      return null;
    } finally {
      setParsing(false);
    }
  };

  return { parseCalendarImage, parsing, parseError };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:mime;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

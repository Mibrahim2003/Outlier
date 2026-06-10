import { useState } from 'react';
import { SemesterInfo } from '../types';
import { supabase } from '../lib/supabase';
import { z } from 'zod';

const MAX_RETRIES = 3;

function parseAIResponse<T>(text: string, schema: z.ZodType<T>): T {
  const cleanedText = text.replace(/```json/i, '').replace(/```json/g, '').replace(/```/g, '').trim();
  const rawJson = JSON.parse(cleanedText);
  return schema.parse(rawJson);
}

async function invokeWithRetry(prompt: string, mimeType: string, base64: string, retries = MAX_RETRIES): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { prompt, mimeType, data: base64 }
    });
    
    // Supabase invoke returns error for non-2xx status, or inside data.error
    const isError = error || (data && data.error);
    const errorMessage = error?.message || data?.error;
    
    // Simple retry check for rate limits or server errors
    if (isError && (errorMessage?.toLowerCase().includes('rate limit') || errorMessage?.includes('500') || errorMessage?.includes('503'))) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 3000;
        console.warn(`Proxy returned error. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }

    if (error) {
      if (error.message === 'Failed to send a request to the Edge Function') {
        throw new Error('Network error or file too large for proxy. Please try a smaller file (< 4MB) or check your connection.');
      }
      throw new Error(error.message || 'Failed to fetch from proxy');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data.text;
  }
  throw new Error('Max retries exceeded');
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

      const prompt = `You are an expert academic calendar parser. Analyze this university academic calendar image and extract ALL semester information.

Return ONLY valid JSON in this exact structure (no markdown, no code fences):
[
  {
    "name": "Fall 2026",
    "startDate": "2026-08-25",
    "endDate": "2026-12-15",
    "breaks": [
      { "name": "Fall Break", "startDate": "2026-10-14", "endDate": "2026-10-15" },
      { "name": "Thanksgiving Break", "startDate": "2026-11-25", "endDate": "2026-11-29" }
    ],
    "examPeriod": { "startDate": "2026-12-08", "endDate": "2026-12-15" }
  }
]

Rules:
- Extract ALL semesters visible (Fall, Spring, Summer)
- Use ISO date format (YYYY-MM-DD)
- Include ALL breaks, holidays, and recesses
- Include exam/finals period if visible
- If a date is ambiguous, make your best estimate based on typical academic schedules
- Return an array even if there's only one semester`;

      const textResult = await invokeWithRetry(prompt, mimeType, base64);
      
      const schema = z.array(z.object({
        name: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        breaks: z.array(z.object({
          name: z.string(),
          startDate: z.string(),
          endDate: z.string()
        })).optional(),
        examPeriod: z.object({
          startDate: z.string(),
          endDate: z.string()
        }).optional()
      }).passthrough());
      
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


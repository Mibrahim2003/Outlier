import { useState } from 'react';
import { SemesterInfo } from '../types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const MAX_RETRIES = 3;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);
    
    const retryable = [429, 500, 503];
    if (retryable.includes(response.status) && attempt < retries) {
      // Exponential backoff: 3s, 6s, 12s
      const delay = Math.pow(2, attempt) * 3000;
      console.warn(`Gemini API ${response.status}. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }

    return response;
  }
  // Should not reach here, but just in case:
  throw new Error('Max retries exceeded');
}

function friendlyError(status: number): string {
  switch (status) {
    case 429: return 'Gemini API is rate limited. Please wait a minute and try again.';
    case 401: case 403: return 'Invalid or missing Gemini API key. Check your .env file.';
    case 500: case 503: return 'Gemini API is temporarily unavailable. Try again shortly.';
    default: return `Gemini API returned error ${status}. Please try again.`;
  }
}

export function useCalendarParser() {
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  const parseCalendarImage = async (file: File): Promise<SemesterInfo[] | null> => {
    if (!apiKey) {
      setParseError('Missing VITE_GEMINI_API_KEY. Add it to your .env file.');
      return null;
    }

    setParsing(true);
    setParseError(null);

    try {
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

      const body = JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.2,
        },
      });

      const response = await fetchWithRetry(
        `${GEMINI_API_URL}?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }
      );

      if (!response.ok) {
        throw new Error(friendlyError(response.status));
      }

      const data = await response.json();
      let text = data.candidates[0].content.parts[0].text;
      
      // Strip markdown code fences if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const semesters: SemesterInfo[] = JSON.parse(text);
      return semesters;
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


import { z } from 'zod';

/**
 * Pulls the first complete JSON value (object or array) out of a model
 * response, tolerating the stray prose Gemini sometimes adds despite the
 * "return ONLY JSON" contract (e.g. "Here is the analysis: {…}"). Tracks
 * bracket depth while ignoring any brackets that appear inside string literals.
 * Returns the JSON substring, or null if no balanced JSON value is present.
 */
export function extractJsonSnippet(raw: string): string | null {
  const start = raw.search(/[{[]/);
  if (start === -1) return null;

  const open = raw[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return raw.slice(start, i + 1);
  }

  return null; // unbalanced — no complete value found
}

/**
 * Parses a model response into a typed value. Strips code fences, recovers the
 * JSON even when the model wraps it in commentary, and turns empty / malformed
 * / off-contract responses into clear, retryable errors instead of letting a
 * raw SyntaxError or ZodError bubble up as a cryptic failure toast.
 */
export function parseAIResponse<T>(text: string, schema: z.ZodType<T>): T {
  if (!text || !text.trim()) {
    throw new Error('The AI returned an empty response. Please try again.');
  }

  // Remove any ```json / ``` code fences the model may have wrapped the JSON in.
  const defenced = text.replace(/```(?:json)?/gi, '').trim();

  let raw: unknown;
  try {
    raw = JSON.parse(defenced);
  } catch {
    // The model added prose around the JSON despite the contract — recover the
    // first complete JSON value and parse that instead.
    const snippet = extractJsonSnippet(defenced);
    if (!snippet) {
      throw new Error('The AI response was not valid JSON. Please try again.');
    }
    try {
      raw = JSON.parse(snippet);
    } catch {
      throw new Error('The AI response was not valid JSON. Please try again.');
    }
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new Error('The AI response did not match the expected format. Please try again.');
  }
  return result.data;
}

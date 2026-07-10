import { supabase } from './supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

const MAX_RETRIES = 3;

/** Thrown when the per-user or global daily AI quota is exhausted. Not retryable. */
export class AIQuotaError extends Error {
  reason: string;
  constructor(message: string, reason: string) {
    super(message);
    this.name = 'AIQuotaError';
    this.reason = reason;
  }
}

interface AIClientOptions {
  prompt: string;
  mimeType?: string;
  data?: string; // base64
  retries?: number;
  /** Ask the proxy to run Gemini in native JSON mode (responseMimeType: application/json). */
  json?: boolean;
}

const backoff = (attempt: number) =>
  new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 3000));

export async function invokeAI({ prompt, mimeType, data: base64Data, retries = MAX_RETRIES, json }: AIClientOptions): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { prompt, mimeType, data: base64Data, json },
    });

    if (!error) {
      // The function can still report an application-level error in the body.
      if (data?.error) throw new Error(data.error);
      return data.text;
    }

    // Non-2xx response from the function: inspect status + structured body.
    if (error instanceof FunctionsHttpError) {
      let status = 0;
      let body: { error?: string; reason?: string; limit?: number } | null = null;
      try {
        status = error.context?.status ?? 0;
        body = await error.context.json();
      } catch {
        /* body was not JSON */
      }

      // Quota exhausted — surface immediately, never retry.
      if (status === 429) {
        throw new AIQuotaError(
          body?.error || "You've reached today's AI limit. Please try again tomorrow.",
          body?.reason || 'rate_limited',
        );
      }

      // Transient server / upstream errors — retry with backoff.
      if ((status === 500 || status === 502 || status === 503) && attempt < retries) {
        console.warn(`AI proxy returned ${status}. Retrying... (attempt ${attempt + 1}/${retries})`);
        await backoff(attempt);
        continue;
      }

      throw new Error(body?.error || `AI proxy error (HTTP ${status})`);
    }

    // No HTTP response at all (network / relay failure).
    if (error.message === 'Failed to send a request to the Edge Function') {
      throw new Error(
        base64Data
          ? 'Network error or file too large. Please try a smaller file (< 4MB) or check your connection.'
          : 'Network error: Could not reach the AI proxy. Please check your internet connection or ensure the Edge Function is running.',
      );
    }

    if (attempt < retries) {
      await backoff(attempt);
      continue;
    }
    throw new Error(error.message || 'Failed to fetch from AI proxy');
  }

  throw new Error('Max retries exceeded while calling AI proxy');
}

import { supabase } from './supabase';

const MAX_RETRIES = 3;

interface AIClientOptions {
  prompt: string;
  mimeType?: string;
  data?: string; // base64
  retries?: number;
}

export async function invokeAI({ prompt, mimeType, data: base64Data, retries = MAX_RETRIES }: AIClientOptions): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { prompt, mimeType, data: base64Data }
    });
    
    // Supabase invoke returns error for non-2xx status, or inside data.error
    const isError = error || (data && data.error);
    const errorMessage = error?.message || data?.error;
    
    // Simple retry check for rate limits or server errors
    if (isError && (errorMessage?.toLowerCase().includes('rate limit') || errorMessage?.includes('500') || errorMessage?.includes('503'))) {
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 3000;
        console.warn(`AI Proxy returned error. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }

    if (error) {
      if (error.message === 'Failed to send a request to the Edge Function') {
        if (base64Data) {
          throw new Error('Network error or file too large. Please try a smaller file (< 4MB) or check your connection.');
        } else {
          throw new Error('Network error: Could not reach the AI Proxy. Please check your internet connection or ensure the Edge Function is running.');
        }
      }
      throw new Error(error.message || 'Failed to fetch from AI proxy');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data.text;
  }
  throw new Error('Max retries exceeded while calling AI proxy');
}

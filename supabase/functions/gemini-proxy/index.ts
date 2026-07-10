import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

// Production origin(s) are allow-listed via a secret (comma-separated, exact
// scheme+host), so they never need a code change:
//   supabase secrets set ALLOWED_ORIGINS="https://your-app.com,https://www.your-app.com"
const ENV_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Any localhost / 127.0.0.1 port is allowed for local development (Vite may pick
// 3000, 3001, 5173, … depending on what's free). This is safe: a remote attacker
// cannot make a victim's browser issue requests from the victim's own loopback
// interface. Public origins must be listed explicitly via ALLOWED_ORIGINS above.
const isLocalhost = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const DEV_FALLBACK_ORIGIN = 'http://localhost:3000';

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const isAllowed = isLocalhost(origin) || ENV_ORIGINS.includes(origin);
  return {
    // Echo the caller's origin only when allowed; otherwise a placeholder so
    // disallowed sites simply fail the browser's CORS check.
    'Access-Control-Allow-Origin': isAllowed ? origin : DEV_FALLBACK_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
};

// Daily quotas. Override via edge-function secrets without redeploying code:
//   supabase secrets set AI_USER_DAILY_LIMIT=50 AI_GLOBAL_DAILY_LIMIT=5000
const USER_DAILY_LIMIT = parseInt(Deno.env.get('AI_USER_DAILY_LIMIT') ?? '50', 10);
const GLOBAL_DAILY_LIMIT = parseInt(Deno.env.get('AI_GLOBAL_DAILY_LIMIT') ?? '5000', 10);

const secondsUntilUtcMidnight = (): number => {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0);
  return Math.max(1, Math.ceil((next - now.getTime()) / 1000));
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
    });

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return json({ error: 'Server configuration error: Gemini API key missing' }, 500);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ error: 'Server configuration error: Supabase environment missing' }, 500);
    }

    // ── Authenticate the caller ──────────────────────────────────────────
    // Verify the JWT (don't just decode it) and bind the request to a user.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Unauthorized: Missing token' }, 401);
    }

    // Scoped to the caller's token so RLS / auth.uid() resolve to this user.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized: Invalid token' }, 401);
    }

    // ── Validate the request body (cheap; before spending quota) ─────────
    const bodyText = await req.text();
    if (!bodyText) {
      return json({ error: 'Empty request body' }, 400);
    }

    let payloadObj;
    try {
      payloadObj = JSON.parse(bodyText);
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { prompt, mimeType, data } = payloadObj;

    if (!prompt || typeof prompt !== 'string') {
      return json({ error: 'Prompt is required and must be a string' }, 400);
    }
    if (prompt.length > 500000) {
      return json({ error: 'Prompt exceeds maximum length of 500000 characters' }, 400);
    }
    if (data) {
      if (typeof data !== 'string' || data.length > 10 * 1024 * 1024) { // ~7MB decoded
        return json({ error: 'Image data too large (max ~7MB base64)' }, 400);
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!mimeType || !allowedTypes.includes(mimeType)) {
        return json({ error: 'Unsupported file type. Only JPEG, PNG, WEBP, and PDF are allowed.' }, 400);
      }
    }

    // ── Rate limit (per-user + global daily) ─────────────────────────────
    // Reserve a slot just before the paid call. Fail CLOSED so the proxy
    // never spends on AI when the limiter is unavailable.
    const { data: quota, error: quotaError } = await supabase.rpc('consume_ai_quota', {
      p_user_limit: USER_DAILY_LIMIT,
      p_global_limit: GLOBAL_DAILY_LIMIT,
    });

    if (quotaError) {
      console.error('Quota check failed:', quotaError.message);
      return json({ error: 'Rate limiter unavailable, please retry shortly' }, 503, { 'Retry-After': '5' });
    }

    if (!quota?.allowed) {
      const message = quota?.reason === 'global_daily_limit'
        ? 'The app has reached its global daily AI limit. Please try again tomorrow.'
        : `Daily AI limit reached (${quota?.limit ?? USER_DAILY_LIMIT}/day). Resets at midnight UTC.`;
      return json(
        { error: message, reason: quota?.reason ?? 'rate_limited', limit: quota?.limit },
        429,
        { 'Retry-After': String(secondsUntilUtcMidnight()) },
      );
    }

    const rateHeaders: Record<string, string> = {
      'X-RateLimit-Limit': String(quota.limit ?? USER_DAILY_LIMIT),
      'X-RateLimit-Remaining': String(quota.remaining ?? 0),
    };

    // ── Call Gemini ──────────────────────────────────────────────────────
    const model = 'gemini-2.5-flash'; // handles both text and inline files
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const parts: Array<Record<string, unknown>> = [{ text: prompt }];
    if (data && mimeType) {
      parts.push({ inlineData: { mimeType, data } });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2 }, // keep it analytical and deterministic
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return json({ error: `Gemini API returned ${response.status}` }, response.status, rateHeaders);
    }

    const result = await response.json();
    // Gemini may split one reply across several parts (long JSON payloads do
    // this routinely) — taking only parts[0] truncates the response mid-value.
    // Join every text part, skipping thought parts if the model emits them.
    const candidate = result.candidates?.[0];
    const generatedText = (candidate?.content?.parts ?? [])
      .filter((p: { text?: string; thought?: boolean }) => typeof p.text === 'string' && !p.thought)
      .map((p: { text: string }) => p.text)
      .join('');

    if (!generatedText) {
      const reason = candidate?.finishReason ?? result.promptFeedback?.blockReason ?? 'no_output';
      console.error('Gemini returned no text. Reason:', reason, JSON.stringify(result).slice(0, 2000));
      return json({ error: `The AI returned no usable output (${reason}). Please try again.` }, 502, rateHeaders);
    }

    return json({ text: generatedText }, 200, rateHeaders);

  } catch (error) {
    // Log full detail server-side; never echo internal error text to the client.
    console.error('Proxy error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});

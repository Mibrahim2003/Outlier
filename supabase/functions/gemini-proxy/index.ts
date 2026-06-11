import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};



Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Gemini API key missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let userId = 'anonymous';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub || 'anonymous';
      } catch (e) {
        // invalid token
      }
    }

    if (userId === 'anonymous') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }



    const bodyText = await req.text();
    if (!bodyText) {
      return new Response(JSON.stringify({ error: 'Empty request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let payloadObj;
    try {
      payloadObj = JSON.parse(bodyText);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { prompt, mimeType, data } = payloadObj;

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required and must be a string' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (prompt.length > 500000) {
      return new Response(
        JSON.stringify({ error: 'Prompt exceeds maximum length of 500000 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data) {
      if (typeof data !== 'string' || data.length > 10 * 1024 * 1024) { // ~7MB decoded
        return new Response(
          JSON.stringify({ error: 'Image data too large (max ~7MB base64)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!mimeType || !allowedTypes.includes(mimeType)) {
        return new Response(
          JSON.stringify({ error: 'Unsupported file type. Only JPEG, PNG, WEBP, and PDF are allowed.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const model = data && mimeType ? 'gemini-2.5-flash' : 'gemini-2.5-flash'; // 2.5 flash handles both
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    let parts = [{ text: prompt }];
    
    if (data && mimeType) {
      parts.push({
        inlineData: {
          mimeType,
          data
        }
      } as any);
    }

    const body = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.2, // keep it analytical and deterministic
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      return new Response(
        JSON.stringify({ error: `Gemini API returned ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(
      JSON.stringify({ text: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

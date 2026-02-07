import type { Config, Context } from '@netlify/functions';

export default async (request: Request, _context: Context) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { name, size, mimeType } = await request.json();

    if (!name || !size || !mimeType) {
      return new Response(JSON.stringify({ error: 'Missing file metadata' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // BYOK: prefer client-provided API key, fall back to server env var
    const apiKey =
      request.headers.get('X-Gemini-Key') || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'API key required. Please configure your Gemini API key in Settings.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Protocol: Resumable upload for Google APIs
    // POST https://generativelanguage.googleapis.com/upload/v1beta/files?key=API_KEY
    // Headers:
    //  X-Goog-Upload-Protocol: resumable
    //  X-Goog-Upload-Command: start
    //  X-Goog-Upload-Header-Content-Length: <file_size>
    //  X-Goog-Upload-Header-Content-Type: <mime_type>
    // Body: JSON metadata { file: { display_name: name } }

    const reqUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

    const response = await fetch(reqUrl, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': size.toString(),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: name } }),
    });

    const uploadUrl = response.headers.get('x-goog-upload-url');

    if (!uploadUrl) {
      const text = await response.text();
      console.error(
        `[gemini-upload] Google API error: ${response.status} ${response.statusText} - ${text}`
      );
      return new Response(
        JSON.stringify({
          error:
            'Failed to initiate upload. Please check your API key and try again.',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ uploadUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[gemini-upload] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred. Please try again.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const config: Config = {
  path: '/api/gemini-upload',
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};

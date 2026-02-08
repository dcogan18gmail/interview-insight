import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { Plugin, IncomingMessage } from 'vite';

/**
 * Dev-only proxy plugin that handles /api/gemini-upload and /proxy-upload
 * directly in the Vite dev server, so we don't need `netlify dev`.
 * In production, Netlify Functions and Edge Functions handle these routes.
 */
function devApiProxy(): Plugin {
  return {
    name: 'dev-api-proxy',
    configureServer(server) {
      // Helper: collect request body into a Buffer
      function collectBody(req: IncomingMessage): Promise<Buffer> {
        return new Promise((resolve, reject) => {
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => resolve(Buffer.concat(chunks)));
          req.on('error', reject);
        });
      }

      // --- /api/gemini-upload: initiate resumable upload with Google ---
      server.middlewares.use('/api/gemini-upload', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Gemini-Key',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const body = await collectBody(req);
          const { name, size, mimeType } = JSON.parse(body.toString());

          // BYOK: prefer client header, fall back to env var
          const apiKey =
            req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

          if (!apiKey) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API key required.' }));
            return;
          }

          const reqUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
          const googleRes = await fetch(reqUrl, {
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

          const uploadUrl = googleRes.headers.get('x-goog-upload-url');
          if (!uploadUrl) {
            const text = await googleRes.text();
            console.error(
              '[dev-proxy] Google API error:',
              googleRes.status,
              text
            );
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to initiate upload.' }));
            return;
          }

          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify({ uploadUrl }));
        } catch (err) {
          console.error('[dev-proxy] gemini-upload error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Upload initiation failed.' }));
        }
      });

      // --- /proxy-upload: forward file chunks to Google ---
      server.middlewares.use('/proxy-upload', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'PUT, OPTIONS',
            'Access-Control-Allow-Headers':
              'Content-Type, X-Upload-Url, Content-Range, X-Goog-Upload-Command, X-Goog-Upload-Offset',
          });
          res.end();
          return;
        }

        if (req.method !== 'PUT') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const uploadUrl = req.headers['x-upload-url'];
        if (!uploadUrl || typeof uploadUrl !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing X-Upload-Url header' }));
          return;
        }

        // Validate URL (same check as the edge function)
        try {
          const parsed = new URL(uploadUrl);
          if (
            parsed.protocol !== 'https:' ||
            parsed.hostname !== 'generativelanguage.googleapis.com' ||
            !parsed.pathname.startsWith('/upload/')
          ) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid upload URL' }));
            return;
          }
        } catch {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid upload URL' }));
          return;
        }

        try {
          const body = await collectBody(req);

          const forwardHeaders: Record<string, string> = {};
          if (req.headers['content-range'])
            forwardHeaders['Content-Range'] = req.headers[
              'content-range'
            ] as string;
          if (req.headers['x-goog-upload-command'])
            forwardHeaders['X-Goog-Upload-Command'] = req.headers[
              'x-goog-upload-command'
            ] as string;
          if (req.headers['x-goog-upload-offset'])
            forwardHeaders['X-Goog-Upload-Offset'] = req.headers[
              'x-goog-upload-offset'
            ] as string;
          if (req.headers['content-type'])
            forwardHeaders['Content-Type'] = req.headers[
              'content-type'
            ] as string;
          forwardHeaders['Content-Length'] = body.length.toString();

          const googleRes = await fetch(uploadUrl, {
            method: 'PUT',
            headers: forwardHeaders,
            body,
          });

          const responseBody = await googleRes.text();
          res.writeHead(googleRes.status, {
            'Content-Type':
              googleRes.headers.get('content-type') || 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(responseBody);
        } catch (err) {
          console.error('[dev-proxy] proxy-upload error:', err);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy error' }));
        }
      });
    },
  };
}

export default defineConfig({
  server: { port: 3000, host: '0.0.0.0' },
  plugins: [react(), tsconfigPaths(), devApiProxy()],
});

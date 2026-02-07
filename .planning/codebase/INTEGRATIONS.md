# External Integrations

**Analysis Date:** 2026-02-06

## APIs & External Services

**Google Gemini AI (Primary Integration):**

- Purpose: AI-powered audio/video transcription and translation
- Model: `gemini-3-pro-preview`
- SDK/Client: `@google/genai` (latest) - client-side in `services/geminiService.ts`
- Server SDK: `@google/genai/server` (`GoogleAIFileManager`) - used in `netlify/functions/gemini-upload.ts`
- Auth: `GEMINI_API_KEY` environment variable
- API key source: https://aistudio.google.com/app/apikey

**Gemini API Usage - Two Distinct Flows:**

1. **File Upload (Resumable Upload Protocol):**
   - Initiated by: `netlify/functions/gemini-upload.ts` (Netlify serverless function)
   - Endpoint: `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`
   - Protocol: Google resumable upload (`X-Goog-Upload-Protocol: resumable`)
   - Flow:
     1. Client sends file metadata to `/.netlify/functions/gemini-upload`
     2. Function calls Google API to initiate resumable upload, returns `uploadUrl`
     3. Client uploads file in 8MB chunks via `/proxy-upload` edge function
     4. Edge function (`netlify/edge-functions/proxy-upload.ts`) streams each chunk to Google
     5. Final chunk returns `file.uri` for use in content generation
   - Auth on server: `process.env.GEMINI_API_KEY` in the Netlify function
   - Auth on client: API key injected at build time via `process.env.API_KEY`

2. **Content Generation (Streaming):**
   - Initiated by: `services/geminiService.ts` (`generateTranscript` function)
   - Uses: `GoogleGenAI.models.generateContentStream()` client-side
   - Input: File URI (from upload) + structured prompt
   - Output: JSONL stream of `TranscriptSegment` objects
   - Config: `maxOutputTokens: 65536`, `temperature: 0.3`
   - Handles long files via iterative loop (up to 40 iterations with retry logic)
   - Auth: API key embedded in client bundle at build time (`process.env.API_KEY`)

**Google Fonts CDN:**

- Purpose: Load Inter font family
- URL: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap`
- Referenced in: `index.html`
- Auth: None (public CDN)

## Data Storage

**Databases:**

- None. The application is stateless; no database is used.

**File Storage:**

- Google Gemini File API (temporary) - Files are uploaded for AI processing and referenced by URI
- Client-side only: `File` objects held in React state during a session
- No persistent file storage

**Caching:**

- None. No client-side or server-side caching layer.

## Authentication & Identity

**Auth Provider:**

- None. The application has no user authentication or identity system.

**API Authentication:**

- Gemini API Key (`GEMINI_API_KEY`) - used in two places:
  1. Server-side in `netlify/functions/gemini-upload.ts` via `process.env.GEMINI_API_KEY`
  2. Client-side in `services/geminiService.ts` via `process.env.API_KEY` (injected at build time by Vite in `vite.config.ts`)
- **Security note:** The API key is embedded in the client-side JavaScript bundle. This is a known security concern documented in `DEPLOYMENT_GUIDE.md`.

## Monitoring & Observability

**Error Tracking:**

- None. No Sentry, Datadog, or equivalent.

**Logs:**

- `console.log` / `console.error` / `console.warn` throughout `services/geminiService.ts` for transcription progress and errors
- `console.error` in `netlify/functions/gemini-upload.ts` for upload failures
- No structured logging framework

## CI/CD & Deployment

**Hosting:**

- Netlify (static site + serverless functions + edge functions)
- Build output: `dist/` directory
- SPA routing via `netlify.toml` redirect rule

**CI Pipeline:**

- None configured in the repository
- Deployment is manual via:
  1. Netlify CLI (`netlify deploy --prod`)
  2. Netlify web drag-and-drop
  3. Git-connected auto-deploy (documented but not configured)

**Deployment Configuration:**

- `netlify.toml` - Build command, publish directory, functions directory, edge functions, redirects

## Environment Configuration

**Required env vars:**

- `GEMINI_API_KEY` - Google Gemini API key (required for both file upload and content generation)

**Template:**

- `.env.example` - Contains `GEMINI_API_KEY=your_api_key_here`

**Local development:**

- `.env.local` - Local override (gitignored)
- Vite reads env vars from `.env.local` and injects them at build time

**Production:**

- Set `GEMINI_API_KEY` in Netlify dashboard (Site settings > Environment variables)

**Secrets location:**

- No dedicated secrets manager
- Env vars managed via Netlify dashboard for production
- `.env.local` for local development

## Webhooks & Callbacks

**Incoming:**

- None

**Outgoing:**

- None

## Serverless Functions

**Netlify Functions (`netlify/functions/`):**

- `gemini-upload.ts` - POST handler that initiates a resumable upload to Google Gemini File API
  - Accepts: `{ name, size, mimeType }` JSON body
  - Returns: `{ uploadUrl }` for client-side chunked upload
  - Auth: Server-side `GEMINI_API_KEY`

**Netlify Edge Functions (`netlify/edge-functions/`):**

- `proxy-upload.ts` - PUT proxy that streams file chunks to Google's resumable upload URL
  - Accepts: Binary body with upload metadata headers (`X-Upload-Url`, `Content-Range`, `X-Goog-Upload-Command`, `X-Goog-Upload-Offset`)
  - Streams request body directly to Google (bypasses Netlify's 6MB function size limit)
  - Returns: Google's response (including `file.uri` on final chunk)
  - CORS: Allows all origins (`*`)

## Client-Side Document Generation

**DOCX Export (`components/TranscriptView.tsx`):**

- Library: `docx` ^9.0.0
- Generates Word documents entirely client-side
- Export formats: English only, Original only, Combined, or All three
- No server-side document generation

---

_Integration audit: 2026-02-06_

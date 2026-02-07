# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Single-Page Application (SPA) with serverless backend functions

**Key Characteristics:**

- React SPA with all UI state managed in the root `App` component via `useState` hooks
- No client-side routing -- the entire app is a single-view wizard-style flow (upload -> process -> view)
- Backend logic split between Netlify Functions (Node.js) for API-key-protected initiation and Netlify Edge Functions (Deno) for streaming file upload proxy
- AI transcription performed client-side via the `@google/genai` SDK with the API key injected at build time through Vite `define`

## Layers

**Presentation Layer (React Components):**

- Purpose: Render UI and capture user interaction
- Location: `components/`
- Contains: `FileUpload.tsx`, `TranscriptView.tsx`, `LoadingState.tsx`
- Depends on: Types from `types.ts`, parent-provided props/callbacks
- Used by: `App.tsx`

**Application/Orchestration Layer (App Root):**

- Purpose: Manage application state machine (IDLE -> UPLOADING -> PROCESSING -> COMPLETED/ERROR) and coordinate between service layer and presentation
- Location: `App.tsx`
- Contains: All top-level state (`useState` hooks), event handlers (`handleFileSelected`, `handleStartTranscription`, `handleReset`), conditional rendering logic
- Depends on: `services/geminiService.ts`, `components/*`, `types.ts`
- Used by: `index.tsx` (entry point)

**Service Layer (Gemini Integration):**

- Purpose: Encapsulate all Gemini AI API communication -- file upload orchestration and streaming transcript generation
- Location: `services/geminiService.ts`
- Contains: `uploadFile()` function (chunked upload via Netlify proxy), `generateTranscript()` function (streaming JSONL transcription with retry/dedup logic)
- Depends on: `@google/genai` SDK, Netlify function endpoints (`/.netlify/functions/gemini-upload`, `/proxy-upload`)
- Used by: `App.tsx`

**Serverless Backend Layer (Netlify Functions):**

- Purpose: Protect API keys and proxy large file uploads to Google's Gemini File API, bypassing browser CORS and Netlify's 6MB function body limit
- Location: `netlify/functions/` and `netlify/edge-functions/`
- Contains:
  - `netlify/functions/gemini-upload.ts` -- Netlify Function (Node.js): Initiates resumable upload session with Google, returns upload URL
  - `netlify/edge-functions/proxy-upload.ts` -- Edge Function (Deno): Proxies chunked PUT requests to Google's resumable upload endpoint, streaming the body
- Depends on: `GEMINI_API_KEY` env var (server-side), `@netlify/functions`, `@netlify/edge-functions`
- Used by: `services/geminiService.ts` (via HTTP fetch)

**Types Layer:**

- Purpose: Shared TypeScript type definitions
- Location: `types.ts`
- Contains: `TranscriptionStatus` enum, `TranscriptSegment` interface, `FileData` interface
- Depends on: Nothing
- Used by: All layers

## Data Flow

**File Upload Flow:**

1. User selects/drops a file in `FileUpload` component -> validates type/size, extracts duration via HTML5 `<video>` element
2. `FileUpload` calls `onFileSelected(fileData)` with a `FileData` object containing the raw `File` reference
3. User clicks "Generate Transcript" in `App.tsx` -> `handleStartTranscription()` fires
4. `uploadFile()` in `services/geminiService.ts` POSTs file metadata to `/.netlify/functions/gemini-upload`
5. The Netlify Function (`netlify/functions/gemini-upload.ts`) calls Google's resumable upload API with the API key to get an upload URL
6. `uploadFile()` slices the file into 8MB chunks and PUTs each chunk to `/proxy-upload` (Edge Function)
7. The Edge Function (`netlify/edge-functions/proxy-upload.ts`) streams each chunk to Google's upload URL
8. On the final chunk, Google returns file metadata including `file.uri`
9. `uploadFile()` returns the `fileUri` string to `App.tsx`

**Transcription Flow:**

1. `App.tsx` calls `generateTranscript(fileUri, mimeType, duration, onProgress)`
2. `generateTranscript()` enters a loop (max 40 iterations) that calls Gemini's `generateContentStream` with the file URI and a detailed prompt
3. The streaming response is parsed as JSONL -- each line is a `TranscriptSegment` with speaker, originalText, englishText, and timestamp
4. De-duplication logic (`isDuplicate()`) filters repeated segments when resuming mid-file
5. Progress callbacks update `App.tsx` state, which renders `LoadingState` with a live preview of the current segment
6. When the transcript reaches the end of the file duration (or max retries/loops), the full `TranscriptSegment[]` is returned
7. `App.tsx` sets status to COMPLETED, rendering `TranscriptView`

**Export Flow:**

1. User clicks "Download .docx" in `TranscriptView` -> selects export type (english/original/combined/all)
2. `TranscriptView` generates a DOCX document in-browser using the `docx` library (`Packer.toBlob()`)
3. The blob is saved via a dynamically created `<a>` element with `download` attribute
4. Alternatively, user can "Copy" the transcript as formatted plain text to clipboard

**State Management:**

- All state lives in `App.tsx` via six `useState` hooks: `status`, `fileData`, `transcript`, `errorMessage`, `progress`, `currentSegment`
- No external state management library (no Redux, Zustand, etc.)
- State machine is implicit via the `TranscriptionStatus` enum (IDLE -> UPLOADING -> PROCESSING -> COMPLETED | ERROR)
- Components are pure presentational -- they receive data and callbacks via props

## Key Abstractions

**TranscriptionStatus (State Machine):**

- Purpose: Governs which UI phase is displayed and what actions are available
- Examples: `types.ts` line 1-7
- Pattern: TypeScript enum with 5 states: IDLE, UPLOADING, PROCESSING, COMPLETED, ERROR

**TranscriptSegment (Data Model):**

- Purpose: Represents a single unit of transcribed speech
- Examples: `types.ts` line 9-14
- Pattern: Interface with speaker identification, dual-language text (original + English translation), and numeric timestamp

**FileData (Upload Metadata):**

- Purpose: Encapsulates all metadata about an uploaded file needed for processing
- Examples: `types.ts` line 16-23
- Pattern: Interface bridging browser File API with Gemini File API (holds raw `File`, optional `base64`, optional `fileUri`)

**Resumable Upload Protocol:**

- Purpose: Upload large media files (up to 2GB) to Google Gemini File API via chunked resumable upload
- Examples: `services/geminiService.ts` lines 68-135, `netlify/functions/gemini-upload.ts`, `netlify/edge-functions/proxy-upload.ts`
- Pattern: Two-phase upload: (1) Netlify Function initiates session and gets upload URL, (2) Edge Function proxies 8MB chunks to that URL

**Streaming JSONL Transcript Parser:**

- Purpose: Parse Gemini's streaming response into structured transcript segments in real-time
- Examples: `services/geminiService.ts` lines 20-44 (`parseBuffer`)
- Pattern: Accumulates text in a buffer, splits on newlines, parses each complete line as JSON, returns remaining partial line for next iteration

## Entry Points

**Browser Entry:**

- Location: `index.html` -> `index.tsx`
- Triggers: Page load in browser
- Responsibilities: Mounts React app to `#root` DOM element, wraps in StrictMode

**Netlify Function -- Upload Initiation:**

- Location: `netlify/functions/gemini-upload.ts`
- Triggers: POST to `/.netlify/functions/gemini-upload`
- Responsibilities: Validates file metadata, initiates resumable upload session with Google Gemini File API using server-side API key, returns upload URL

**Netlify Edge Function -- Upload Proxy:**

- Location: `netlify/edge-functions/proxy-upload.ts`
- Triggers: PUT to `/proxy-upload` (mapped in `netlify.toml`)
- Responsibilities: Proxies chunked file upload data from the browser to Google's resumable upload URL, handles CORS

## Error Handling

**Strategy:** Try-catch at each layer boundary with error propagation up to `App.tsx` for user-facing display

**Patterns:**

- `App.tsx` wraps the entire transcription flow in a try-catch, setting `TranscriptionStatus.ERROR` and extracting the error message for display
- `services/geminiService.ts` has nested try-catch: outer for fatal errors, inner per-chunk for retryable errors (up to `MAX_RETRIES = 3`)
- `geminiService.ts` uses a retry mechanism with a 5-second "nudge" forward on mid-file stalls, and breaks after `MAX_LOOPS = 40` to prevent infinite loops
- Netlify functions return HTTP status codes (400, 405, 500) with error text in the response body
- `FileUpload.tsx` validates file type and size locally before any upload, displaying inline error messages
- `parseBuffer()` silently ignores non-JSON lines (using empty catch blocks) to tolerate preamble text or markdown in Gemini responses

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.warn` / `console.error` throughout `services/geminiService.ts` for loop progress tracking and error diagnostics. No structured logging framework.

**Validation:** Client-side only. `FileUpload.tsx` validates MIME type (audio/_ or video/_) and file size (max 2GB). `gemini-upload.ts` validates presence of name/size/mimeType in the request body.

**Authentication:** No user authentication. The Gemini API key is the sole credential:

- Client-side: Injected at build time via `vite.config.ts` `define` (exposes key in browser bundle)
- Server-side: Read from `process.env.GEMINI_API_KEY` in Netlify Functions

**CORS:** Handled by the Edge Function (`proxy-upload.ts`) which adds `Access-Control-Allow-Origin: *` headers to both preflight and actual responses.

**Configuration:** Single environment variable (`GEMINI_API_KEY`) configured via `.env.local` for development and Netlify dashboard for production. Vite injects it into the client bundle as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`.

---

_Architecture analysis: 2026-02-06_

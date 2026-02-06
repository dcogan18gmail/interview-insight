# Codebase Concerns

**Analysis Date:** 2026-02-06

## Tech Debt

**API Key Exposed to Client Bundle:**
- Issue: The Gemini API key is injected into the frontend JavaScript bundle via Vite's `define` config. `vite.config.ts` lines 13-15 use `JSON.stringify(env.GEMINI_API_KEY)` to replace `process.env.API_KEY` at build time, meaning the key is embedded in the shipped JS and visible to anyone inspecting the page source or network requests.
- Files: `vite.config.ts`, `services/geminiService.ts` (line 8)
- Impact: Any user can extract the API key from the browser bundle and use it for their own purposes, incurring costs on the key owner's account and potentially exhausting rate limits.
- Fix approach: Move all Gemini API calls (content generation) to a Netlify Function or Edge Function that keeps the key server-side. The frontend should call a backend endpoint (e.g., `/.netlify/functions/gemini-transcribe`) rather than directly using the `@google/genai` SDK in the browser.

**Unpinned "latest" Dependency:**
- Issue: `@google/genai` is pinned to `"latest"` in `package.json` line 13. Any `npm install` pulls whatever version is current, which can introduce breaking changes without warning.
- Files: `package.json` (line 13)
- Impact: Builds are non-reproducible. A breaking change in the Google GenAI SDK can silently break production deployments. The `package-lock.json` provides some protection, but any fresh install or CI without lock file will get an arbitrary version.
- Fix approach: Pin to a specific semver version (e.g., `"@google/genai": "^0.x.y"`) after verifying which version is currently in the lockfile.

**Monolithic App Component (God Component):**
- Issue: `App.tsx` (196 lines) manages all application state (6 `useState` hooks), orchestrates the entire upload-transcribe-display flow, and contains all the UI rendering logic for every state. There is no state management layer, no custom hooks, and no separation between orchestration and presentation.
- Files: `App.tsx`
- Impact: Adding new features (e.g., multiple files, history, settings) requires modifying this single file. Hard to unit test state transitions independently.
- Fix approach: Extract a `useTranscription()` custom hook containing all state and handler logic. Create sub-components for each state (idle-with-file, error, etc.). Consider a reducer pattern for the state machine (IDLE -> UPLOADING -> PROCESSING -> COMPLETED | ERROR).

**No State Management Beyond useState:**
- Issue: All application state lives in local `useState` hooks inside `App.tsx`. There is no context, no reducer, no external state library.
- Files: `App.tsx` (lines 9-14)
- Impact: State is not shareable across component trees. Adding features like notification toasts, settings panels, or route-based navigation will require significant refactoring.
- Fix approach: At minimum, extract to `useReducer` with a typed state machine. For larger growth, consider React Context or a lightweight library like Zustand.

**Dead Code / Legacy Fallback in Upload Flow:**
- Issue: The `FileData` type still includes a `base64` field (marked "Optional now") and `App.tsx` lines 39-44 contain a dead code path that handles `base64` with a comment "Fallback for legacy small files" that immediately throws an error.
- Files: `types.ts` (line 20), `App.tsx` (lines 39-44)
- Impact: Confusing for future developers. The base64 field on the type suggests it should be populated, but nothing populates it.
- Fix approach: Remove the `base64` field from `FileData` interface and remove the dead `else if` branch in `App.tsx`.

**Hardcoded Model Name:**
- Issue: The Gemini model name `'gemini-3-pro-preview'` is hardcoded in `services/geminiService.ts` line 17.
- Files: `services/geminiService.ts` (line 17)
- Impact: Changing models requires a code change and redeploy. Cannot A/B test models or fall back to a different model.
- Fix approach: Make it configurable via environment variable with a sensible default (e.g., `process.env.GEMINI_MODEL || 'gemini-3-pro-preview'`).

## Known Bugs

**Memory Leak in FileUpload - Object URL Not Revoked:**
- Symptoms: Each time a file is selected, `URL.createObjectURL(file)` is called in `FileUpload.tsx` line 74 to extract duration metadata, but the resulting object URL is never revoked. The `<video>` element is removed from the DOM via `media.remove()`, but the blob URL remains in memory.
- Files: `components/FileUpload.tsx` (line 74)
- Trigger: Select a file, cancel, select another file repeatedly.
- Workaround: None currently. The leak is small per instance but cumulative.

**"Download All" Uses Fragile setTimeout Chaining:**
- Symptoms: The "Download All (3 Files)" feature in `TranscriptView.tsx` uses `setTimeout` with 200ms and 400ms delays to stagger downloads. On slow machines or when the browser throttles, downloads may fail or overlap. Timing is arbitrary and unreliable.
- Files: `components/TranscriptView.tsx` (lines 99-111)
- Trigger: Click "Download All" on a slow device or when browser is under load.
- Workaround: Download files individually using the single-file buttons.

**Duration Extraction Silently Fails to Zero:**
- Symptoms: When the browser cannot extract metadata from a media file (unsupported codec, corrupt file), the `onerror` handler in `FileUpload.tsx` sets `duration: 0`. This zero duration propagates to `generateTranscript()` where it causes incorrect progress calculations and may cause the loop control logic to exit prematurely (line 157: `currentStartTime >= durationSeconds - 2` evaluates as `0 >= -2` which is true, so transcription ends immediately).
- Files: `components/FileUpload.tsx` (lines 62-70), `services/geminiService.ts` (line 157)
- Trigger: Upload a file whose codec the browser cannot decode metadata for (e.g., some `.mkv` or `.flac` formats).
- Workaround: None. The transcription will silently produce zero or minimal output.

## Security Considerations

**API Key in Client-Side Bundle (Critical):**
- Risk: The Gemini API key is compiled into the frontend bundle and shipped to every user's browser. Anyone can open DevTools, inspect the JavaScript, and extract the key.
- Files: `vite.config.ts` (lines 13-15), `services/geminiService.ts` (line 8)
- Current mitigation: None.
- Recommendations: Move all Gemini SDK usage to server-side Netlify Functions. The frontend should only communicate with your own backend endpoints.

**Wildcard CORS on Edge Function:**
- Risk: The proxy-upload edge function sets `Access-Control-Allow-Origin: "*"` on all responses, including preflight. This allows any website to use the proxy endpoint to upload files to the Google API through your infrastructure.
- Files: `netlify/edge-functions/proxy-upload.ts` (lines 8, 41, 52)
- Current mitigation: None.
- Recommendations: Restrict the `Access-Control-Allow-Origin` header to the actual deployment domain(s). Use an allowlist of origins.

**No Rate Limiting on Upload Endpoints:**
- Risk: The Netlify Function (`gemini-upload`) and Edge Function (`proxy-upload`) have no rate limiting. An attacker could flood them with requests, exhausting API quotas or incurring costs.
- Files: `netlify/functions/gemini-upload.ts`, `netlify/edge-functions/proxy-upload.ts`
- Current mitigation: None beyond Netlify's platform-level limits.
- Recommendations: Add rate limiting middleware. Consider requiring authentication or CAPTCHA for uploads.

**No Input Validation on Upload Proxy:**
- Risk: The edge function (`proxy-upload.ts`) forwards any URL provided in the `X-Upload-Url` header to Google's API. While it expects a Google upload URL, there is no validation that the URL actually points to `generativelanguage.googleapis.com`. An attacker could use the proxy as an open relay to make PUT requests to arbitrary URLs.
- Files: `netlify/edge-functions/proxy-upload.ts` (line 20)
- Current mitigation: None.
- Recommendations: Validate that `uploadUrl` starts with `https://generativelanguage.googleapis.com/` before proxying.

**No Content-Security-Policy Headers:**
- Risk: No CSP headers are configured. The app loads Google Fonts from an external CDN (`fonts.googleapis.com`) in `index.html` line 7.
- Files: `index.html`, `netlify.toml`
- Current mitigation: None.
- Recommendations: Add CSP headers via `netlify.toml` `[[headers]]` configuration.

**Incomplete .gitignore:**
- Risk: The `.gitignore` only excludes `.netlify`. It does NOT exclude `node_modules/`, `dist/`, `.env.local`, `.env`, `.DS_Store`, or other common patterns. If someone runs `git add .`, they will commit secrets (`.env.local` with API key), 600+ MB of `node_modules`, and build artifacts.
- Files: `.gitignore`
- Current mitigation: The repo has no commits yet, so nothing has been committed. But the risk is imminent.
- Recommendations: Immediately add `node_modules/`, `dist/`, `.env.local`, `.env`, `.DS_Store`, and `*.log` to `.gitignore`.

**Error Messages Leak Server Internals:**
- Risk: The `gemini-upload` Netlify Function returns raw Google API error responses including status codes and body text directly to the client (line 56). The catch block on line 66 returns `String(error)` which may include stack traces.
- Files: `netlify/functions/gemini-upload.ts` (lines 56, 66)
- Current mitigation: None.
- Recommendations: Return generic error messages to the client. Log detailed errors server-side only.

## Performance Bottlenecks

**Repeated Full-File Gemini API Calls in Transcription Loop:**
- Problem: The `generateTranscript()` function in `geminiService.ts` sends the entire audio/video file reference to the Gemini API in a loop (up to `MAX_LOOPS = 40` iterations). Each iteration sends a new `generateContentStream` request with the full file URI plus a prompt asking to "resume from timestamp X." The API processes the entire file each time but is asked to skip to a specific point.
- Files: `services/geminiService.ts` (lines 153-315)
- Cause: Gemini's content generation API does not support native seeking within media files. The workaround of prompting "start from second X" still requires the model to process the full file.
- Improvement path: Explore if newer Gemini API versions support native chunked transcription. Alternatively, pre-split long audio files into segments client-side before uploading. Consider caching completed segments to avoid re-processing on retry.

**No Request Cancellation:**
- Problem: Once a transcription starts, there is no way to cancel it. If the user navigates away or clicks "reset," the ongoing `generateContentStream` calls continue running in the background, consuming API quota and bandwidth.
- Files: `services/geminiService.ts` (lines 209-255), `App.tsx` (lines 73-80 `handleReset`)
- Cause: No `AbortController` is used for fetch calls or stream consumption. The `handleReset` function only resets state; it does not cancel in-flight requests.
- Improvement path: Pass an `AbortSignal` through to both `uploadFile()` and `generateTranscript()`. Abort on reset or component unmount.

**Large File Chunked Upload Without Resume:**
- Problem: If a chunk upload fails midway through a large file (e.g., at chunk 5 of 10), the entire upload must restart from the beginning. There is no resume capability despite using Google's resumable upload protocol.
- Files: `services/geminiService.ts` (lines 68-135)
- Cause: The upload offset is tracked locally but not persisted. On error, the function throws and the upload URL is lost.
- Improvement path: Store the upload URL and last successful offset. On retry, resume from the last successful chunk rather than restarting.

## Fragile Areas

**JSONL Parsing from LLM Output:**
- Files: `services/geminiService.ts` (lines 20-43 `parseBuffer`)
- Why fragile: The parser relies on the Gemini model outputting valid JSONL. It uses regex to strip commas, brackets, and other artifacts (`replace(/,$/, '').replace(/^\[/, '').replace(/\]$/, '')`). If the model changes its output format (e.g., wraps in markdown code blocks, adds preamble text, or changes field names), parsing silently fails and segments are dropped.
- Safe modification: Add more robust parsing that handles markdown code fences (` ```json ... ``` `), array wrappers, and trailing commas. Add logging for unparseable lines to aid debugging.
- Test coverage: Zero. No tests exist for this parsing logic, which is the most critical data transformation in the application.

**Loop Control Logic in generateTranscript:**
- Files: `services/geminiService.ts` (lines 270-308)
- Why fragile: The loop decides whether transcription is "complete" based on heuristics: segment count, timestamps, estimated remaining time, and retry counts. Multiple interacting conditions (`segmentsInThisChunk === 0`, `remainingTime < 10`, `progressRatio > 0.99`, `timeLeft < 10`) create a complex state space with edge cases. The `currentStartTime += 5` nudge on retry (line 287) can cause content to be skipped.
- Safe modification: Changes to any threshold or condition should be tested against recordings of varying lengths. Log every loop iteration's decision inputs.
- Test coverage: Zero.

**Duplicate Detection Logic:**
- Files: `services/geminiService.ts` (lines 47-66 `isDuplicate`)
- Why fragile: Uses exact string matching on lowercased text. Segments that differ by punctuation, whitespace, or minor wording (which is common with LLM variation across requests) will not be caught as duplicates. Short segments under 10 characters are exempted entirely, which means short duplicate phrases will appear multiple times.
- Safe modification: Consider fuzzy matching (Levenshtein distance or similar). Add unit tests with known duplicate and non-duplicate pairs.
- Test coverage: Zero.

## Scaling Limits

**Netlify Function Cold Start + Timeout:**
- Current capacity: Netlify Functions have a 10-second execution timeout on the free tier (26s on Pro).
- Limit: The `gemini-upload` function makes an HTTP request to Google's API to initiate a resumable upload. If Google's API is slow to respond, the function will timeout. Large files that need many chunks will make many requests through the edge function proxy.
- Scaling path: Move to Netlify Background Functions for long operations, or move the upload orchestration entirely to the client (which is partially already done via the edge function proxy).

**Client-Side Transcript Generation:**
- Current capacity: Works for files where the Gemini API can transcribe within ~40 loop iterations.
- Limit: Very long recordings (multi-hour interviews) may exhaust the 40-loop limit (`MAX_LOOPS = 40` in `services/geminiService.ts` line 150). Each loop makes a full API call, so a 2-hour recording could require many iterations and significant time.
- Scaling path: Increase `MAX_LOOPS` or make it dynamic based on file duration. Better yet, implement server-side job processing with status polling.

**Browser Memory for Long Transcripts:**
- Current capacity: Hundreds of transcript segments render fine.
- Limit: Thousands of segments rendered in a single scrollable div (`max-h-[600px]` in `TranscriptView.tsx` line 176) with no virtualization will cause performance degradation.
- Scaling path: Implement virtual scrolling (e.g., `react-window` or `@tanstack/virtual`).

## Dependencies at Risk

**`@google/genai` at "latest":**
- Risk: Unpinned version. The Google GenAI SDK is in active development and has had breaking changes between versions (e.g., API surface changes, method renames, import path changes).
- Impact: Any `npm install` can pull a breaking version, failing builds or runtime behavior silently.
- Migration plan: Pin to the specific version currently in `package-lock.json`. Monitor release notes for breaking changes.

**`deno.lock` File Present But No Deno Configuration:**
- Risk: A `deno.lock` file exists at the project root, but there is no `deno.json` or `deno.jsonc` configuration. The project uses npm/Node.js. This is likely a leftover artifact.
- Impact: Confusing for developers who may think Deno is required. No functional impact.
- Migration plan: Delete `deno.lock` if Deno is not used.

## Missing Critical Features

**No Authentication or Authorization:**
- Problem: Anyone who accesses the deployed URL can upload files and use the Gemini API at the owner's expense. There is no login, no session management, no usage tracking.
- Blocks: Cannot deploy publicly without risk of abuse and runaway API costs.

**No Error Recovery / Retry UI:**
- Problem: When transcription fails mid-way (e.g., network error at loop 15 of 40), all progress is lost. The user sees a generic error and must start over completely. There is no way to resume a partial transcription.
- Blocks: Usability for long recordings where failures are more likely.

**No Accessibility (a11y):**
- Problem: No ARIA labels, no keyboard navigation support, no screen reader considerations. The file upload uses a hidden `<input>` overlay which may not be accessible. The loading spinner has no `aria-live` region. The transcript view has no semantic structure.
- Blocks: Cannot meet WCAG compliance requirements.

**No Linting or Formatting Tooling:**
- Problem: No `.eslintrc`, `.prettierrc`, `biome.json`, or any other code quality tool is configured. No `lint` or `format` script in `package.json`.
- Blocks: Code style consistency as the team grows.

## Test Coverage Gaps

**Zero Test Coverage:**
- What's not tested: The entire application. There are no test files, no test framework configured, no test scripts in `package.json`, and no testing dependencies installed (no Jest, Vitest, React Testing Library, Cypress, Playwright, etc.).
- Files: Every file in the project: `App.tsx`, `services/geminiService.ts`, `components/FileUpload.tsx`, `components/TranscriptView.tsx`, `components/LoadingState.tsx`, `netlify/functions/gemini-upload.ts`, `netlify/edge-functions/proxy-upload.ts`
- Risk: Any change to any file can break functionality with no automated detection. The JSONL parsing logic (`parseBuffer`), duplicate detection (`isDuplicate`), and loop control logic in `generateTranscript` are particularly high-risk areas that rely entirely on manual testing.
- Priority: **High** - At minimum, add unit tests for `parseBuffer`, `isDuplicate`, and the `generateTranscript` loop control logic in `services/geminiService.ts`. Add component tests for the state transitions in `App.tsx`.

---

*Concerns audit: 2026-02-06*

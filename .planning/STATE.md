# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Users can upload an interview recording and get a complete, structured transcript with translations and analysis -- with full visibility into the process.
**Current focus:** Phase 6 complete, ready for Phase 7

## Current Position

Phase: 6 of 9 (Enhanced Transcription Experience)
Plan: 3 of 3
Status: Phase complete
Last activity: 2026-02-08 -- Phase 6 complete (all 3 plans, verification passed)

Progress: [████████████████░░░░] ~53% (16 plans of ~30+ estimated total)

## Performance Metrics

**Velocity:**

- Total plans completed: 16
- Average duration: ~3m 10s
- Total execution time: ~0.84 hours

**By Phase:**

| Phase                                | Plans | Total    | Avg/Plan |
| ------------------------------------ | ----- | -------- | -------- |
| 01-security-hardening                | 3/3   | ~5m 29s  | ~1m 50s  |
| 02-development-tooling               | 2/2   | ~7m 43s  | ~3m 52s  |
| 03-storage-foundation                | 2/2   | ~6m 10s  | ~3m 05s  |
| 04-core-architecture-refactor        | 3/3   | ~14m 59s | ~5m 00s  |
| 05-multi-project-dashboard           | 3/3   | ~8m 00s  | ~2m 40s  |
| 06-enhanced-transcription-experience | 3/3   | ~9m 33s  | ~3m 11s  |

**Recent Trend:**

- Last 5 plans: 05-03 (2m 00s), 06-01 (4m 01s), 06-02 (3m 12s), 06-03 (2m 20s)
- Trend: Phase 6 integration wiring complete; all 7 TRNS requirements connected end-to-end

_Updated after each plan completion_

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- BYOK (Bring Your Own Key) model: Solves billing problem, enables public-facing usage without owner paying for all API calls
- Browser localStorage for persistence: Ships faster than cloud DB, sufficient for v1, accounts/sync deferred to v2
- Stay on Netlify: Already deployed, free tier, serverless functions work well for proxy pattern
- PBKDF2 100k iterations for key derivation: Balances security with browser performance (01-01)
- App-generated passphrase (not user-provided): Simpler UX, encryption-at-rest protects against raw localStorage exfiltration (01-01)
- CSP allows unsafe-inline for style-src: Required by Tailwind CSS inline styles (01-01)
- CORS restricted to explicit origin allowlist (no wildcard): Prevents unauthorized cross-origin access (01-02)
- SSRF prevention via URL hostname/protocol/path validation on proxy: Only forwards to generativelanguage.googleapis.com (01-02)
- BYOK via X-Gemini-Key request header with env var fallback: Enables per-user keys while preserving backward compat (01-02)
- Rate limits: 100/60s for proxy-upload, 20/60s for gemini-upload (01-02)
- Migrated gemini-upload to Netlify Functions v2 format: Required for rate limiting config (01-02)
- Validate API key before encrypting and storing: Prevents invalid keys in storage (01-03)
- Async createAI() replaces sync getAI() singleton: Fresh instance per transcription, supports key changes (01-03)
- Removed loadEnv from vite.config.ts: Only used for API key injection, no longer needed (01-03)
- ESLint 9.39.2 pinned exactly (NOT ESLint 10) for typescript-eslint compatibility (02-01)
- caughtErrorsIgnorePattern added to no-unused-vars for underscore-prefixed catch params (02-01)
- Accessibility fix: added keyboard listener and role to download menu overlay in TranscriptView (02-01)
- TypeScript strict + noUncheckedIndexedAccess enabled with zero errors (02-02)
- All 22 dependencies pinned to exact installed versions, no range specifiers (02-02)
- lint-staged runs eslint --fix + prettier --write on staged TS/TSX files (02-02)
- CI pipeline targets Node 22 with npm cache on ubuntu-latest (02-02)
- Schema version starts at 1, stored in ii:meta localStorage key (03-01)
- ProjectStatus as union type (not enum) for JSON serialization simplicity (03-01)
- Corrupted localStorage keys removed on read failure, return null not throw (03-01)
- Cross-browser quota detection: DOMException code 22/1014, QuotaExceededError, NS_ERROR_DOM_QUOTA_REACHED (03-01)
- ParseResult<T> discriminated union over boolean type guards for consistent error reporting (03-01)
- saveProject defaults to debounced (300ms) with immediate=true override for critical writes (03-02)
- createProject always persists immediately (immediate=true) (03-02)
- deleteProject removes both metadata entry AND transcript key atomically (03-02)
- saveTranscript syncs segmentCount back to project metadata (03-02)
- beforeunload listener guarded with typeof window check for SSR safety (03-02)
- cleanupOrphanedTranscripts iterates localStorage in reverse for safe removal during iteration (03-02)
- SettingsProvider wraps ProjectsProvider (outer > inner) for future dependency direction (04-01)
- Existing App.tsx useState hooks preserved alongside new contexts for zero-regression migration (04-01)
- react-router 7.13.0 and vite-tsconfig-paths 6.1.0 pinned to exact versions (04-01)
- geminiService accepts apiKey as first parameter, caller responsible for key retrieval (04-02)
- useTranscription hook uses TRANSITIONS map for valid state machine transitions (04-02)
- Download All uses 100ms delay between sequential saves for browser compatibility (04-02)
- durationUnknown flag set via spread conditional to avoid always-present field (04-02)
- ApiKeyForm uses useSettings dispatch directly instead of prop callbacks (04-03)
- ProjectPage maps hook TranscriptionState to TranscriptionStatus enum for LoadingState compat (04-03)
- SettingsProvider > ProjectsProvider > BrowserRouter nesting order in App.tsx (04-03)
- DashboardPage is Phase 5 placeholder with functional project list (04-03)
- Use string|null (not optional ?) for v2 metadata fields -- simpler null-check indicator logic (05-01)
- DashboardLayout as nested route element wrapping dashboard routes; settings outside (05-01)
- Sidebar primary label: interviewee name falling back to project name (05-01)
- DashboardPage.tsx deleted, replaced by DashboardLayout + CenterPanel (05-01)
- ConfirmDialog uses native dialog showModal() for focus trap, backdrop, and Escape handling (05-02)
- Inline rename always updates project.name regardless of whether interviewee was displayed (05-02)
- Project created in storage immediately on upload start, not on transcription completion (05-02)
- createdProjectId local state tracks new project through lifecycle to prevent infinite update loops (05-02)
- saveTranscript called directly from storageService since context only manages metadata (05-02)
- MetadataField sub-component manages own editing state locally, no lifted state needed (05-03)
- Empty string edits convert to null to maintain needs-info indicator convention (05-03)
- TranscriptPanel loads transcript synchronously from localStorage via getTranscript (05-03)
- OnboardingView checks apiKeyConfigured from SettingsContext to mark step 1 as done (05-03)
- AbortError explicitly re-thrown before retry logic in inner catch to prevent cancellation swallowed by retry mechanism (06-01)
- Local accumulatedSegments array in startTranscription closure avoids stale machineState for CANCELLED dispatch (06-01)
- PROGRESS reducer accumulates segments into transcript array for real-time persistence (06-01)
- fileUri tracked in state machine via UPLOAD_COMPLETE event for resume-without-re-upload within 48h (06-01)
- debouncedSaveTranscript uses existing debouncedWrite infrastructure (300ms) not a new timer (06-01)
- cancel() dispatches CANCEL synchronously before abort() to prevent race conditions via TRANSITIONS map (06-01)
- useRef<HTMLDivElement>(null!) pattern for React 18 strict ref typing in useAutoScroll (06-02)
- formatTimestampMmSs implemented locally in LiveTranscriptView rather than importing from docxExport (06-02)
- SegmentRow as inline sub-component in LiveTranscriptView for cohesion (06-02)
- CANCELLING and CANCELLED added to TranscriptionStatus enum for complete status mapping (06-03)
- statusMap updated: cancelling/cancelled map to their own enum values, not aliased to PROCESSING/IDLE (06-03)
- CenterPanel unchanged in 06-03: no status guards block cancelled projects from reaching TranscriptPanel (06-03)

### Pending Todos

- **Human UAT pass (Phases 1-6)** -- Golden-path UAT in progress. 6 passed, 13 pending (4 retests after fixes), 3 skipped. Resume file: `.planning/phases/00-golden-path/golden-path-UAT.md`
- **Transcription accuracy pipeline** -- Current LLM-only approach produces nondeterministic timestamps/turns. Plan a phase to introduce dedicated ASR (Whisper or equivalent) for deterministic segmentation, with Gemini only for translation/analysis. See Blockers/Concerns for details. Consider inserting as Phase 7 or 7.1 before UI Polish.
- **Progress tracker anchoring** -- ProgressStepper disappears between state transitions instead of staying visible. Needs investigation and fix.

### Blockers/Concerns

**Phase 1 (Security) -- RESOLVED:**

- Browser extension attack surface: Malicious extensions can steal localStorage keys. This is accepted tradeoff for browser-based BYOK but should be documented in user-facing security guidance.
- ~~Client code must be updated to send X-Gemini-Key header and use new /api/gemini-upload endpoint~~ (completed in 01-03)

**Phase 3 (Storage) -- COMPLETE:**

- IndexedDB migration threshold: localStorage has ~5-10MB quota but exact limits vary by browser. Need to test with actual long transcripts to determine practical limits and migration trigger point.

**Phase 6 (Transcription) -- PARTIALLY RESOLVED:**

- ~~Gemini API resumability: Need to verify whether Gemini's Files API supports resuming partial transcriptions mid-stream.~~ Verified: AbortSignal is client-only, no server-side resume. File URIs persist 48h. Strategy: re-transcribe from scratch using persisted fileUri, skip re-upload.

**Transcription Accuracy -- OPEN (architectural):**

- Timestamps, conversational turns, and speaker segmentation are nondeterministic because Gemini handles all of it. The same file can produce different timestamps and turn boundaries on different runs. This is inherent to LLM-based transcription.
- **Recommended approach:** Introduce a dedicated ASR pipeline stage (e.g., Whisper via API or local) that produces deterministic timestamps and speaker diarization. Then use Gemini only for translation, analysis, and enrichment on top of the structured ASR output. This separates "what was said and when" (ASR, deterministic) from "what does it mean" (LLM, creative).
- **Scope:** This is a significant architectural change. Should be planned as its own phase (likely Phase 7 or inserted before UI Polish). Requires: evaluating ASR options (Whisper API, AssemblyAI, Deepgram), defining the pipeline interface, refactoring geminiService to accept pre-segmented input.
- **Impact on current work:** Current transcription works end-to-end but results vary between runs. Acceptable for v1 launch. Accuracy improvements should be planned before any production/enterprise use.

## Session Continuity

Last session: 2026-02-08
Stopped at: Golden-path UAT — 9 fixes applied (Fixes 1-9 + stepper anchoring). 6 passed, 13 pending (including 4 retests of fixed bugs), 3 skipped. All fixes committed and pushed.
Resume file: .planning/phases/00-golden-path/golden-path-UAT.md
Resume action: Clear localStorage, restart `npm run dev`, full retest starting from test 7. See UAT file for test-by-test expected behaviors.

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-06)

**Core value:** Users can upload an interview recording and get a complete, structured transcript with translations and analysis -- with full visibility into the process.
**Current focus:** Phase 5 - Multi-Project Dashboard

## Current Position

Phase: 5 of 9 (Multi-Project Dashboard)
Plan: 1 of 3
Status: In progress
Last activity: 2026-02-08 -- Completed 05-01-PLAN.md (Schema Extension and 3-Panel Layout)

Progress: [███████████░░░░░░░░░] ~37% (11 plans of ~30+ estimated total)

## Performance Metrics

**Velocity:**

- Total plans completed: 11
- Average duration: ~3m 20s
- Total execution time: ~0.61 hours

**By Phase:**

| Phase                         | Plans | Total    | Avg/Plan |
| ----------------------------- | ----- | -------- | -------- |
| 01-security-hardening         | 3/3   | ~5m 29s  | ~1m 50s  |
| 02-development-tooling        | 2/2   | ~7m 43s  | ~3m 52s  |
| 03-storage-foundation         | 2/2   | ~6m 10s  | ~3m 05s  |
| 04-core-architecture-refactor | 3/3   | ~14m 59s | ~5m 00s  |
| 05-multi-project-dashboard    | 1/3   | ~3m 00s  | ~3m 00s  |

**Recent Trend:**

- Last 5 plans: 04-01 (8m 20s), 04-02 (3m 15s), 04-03 (3m 24s), 05-01 (3m 00s)
- Trend: Phase 5 started; schema + layout foundation completed cleanly with 1 minor deviation

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

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 1 (Security) -- RESOLVED:**

- Browser extension attack surface: Malicious extensions can steal localStorage keys. This is accepted tradeoff for browser-based BYOK but should be documented in user-facing security guidance.
- ~~Client code must be updated to send X-Gemini-Key header and use new /api/gemini-upload endpoint~~ (completed in 01-03)

**Phase 3 (Storage) -- COMPLETE:**

- IndexedDB migration threshold: localStorage has ~5-10MB quota but exact limits vary by browser. Need to test with actual long transcripts to determine practical limits and migration trigger point.

**Phase 6 (Transcription):**

- Gemini API resumability: Need to verify whether Gemini's Files API supports resuming partial transcriptions mid-stream. If not supported, intermediate state persistence strategy may need adjustment.

## Session Continuity

Last session: 2026-02-08T03:11:43Z
Stopped at: Completed 05-01-PLAN.md (Schema Extension and 3-Panel Layout) -- Phase 5 plan 1 of 3
Resume file: .planning/phases/05-multi-project-dashboard/05-02-PLAN.md

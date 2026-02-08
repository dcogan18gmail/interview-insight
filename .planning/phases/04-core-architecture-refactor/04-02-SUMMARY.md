---
phase: 04-core-architecture-refactor
plan: 02
subsystem: api, ui
tags: [docx, gemini, state-machine, hooks, react, byok]

# Dependency graph
requires:
  - phase: 04-01
    provides: src/ directory structure, SettingsContext, types with durationUnknown field
provides:
  - Standalone docxExport service (generateDocxBlob, saveBlob, formatTimestamp)
  - Stateless geminiService with explicit apiKey parameter (ARCH-05)
  - useTranscription state machine hook with typed TRANSITIONS map (ARCH-06)
  - BUG-01 fix (ObjectURL leak in FileUpload)
  - BUG-02 fix (download timing race condition in TranscriptView)
  - BUG-03 fix (duration extraction 0-duration flagging)
affects: [04-03, 05-ui-overhaul, 06-transcription]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [state-machine-reducer, explicit-dependency-injection, service-extraction]

key-files:
  created:
    - src/services/docxExport.ts
    - src/features/project/hooks/useTranscription.ts
  modified:
    - src/services/geminiService.ts
    - src/features/project/components/TranscriptView.tsx
    - src/features/project/components/FileUpload.tsx
    - src/app/App.tsx

key-decisions:
  - 'geminiService accepts apiKey as first parameter, caller responsible for key retrieval'
  - 'useTranscription hook uses TRANSITIONS map for valid state machine transitions'
  - 'Download All uses 100ms delay between sequential saves for browser compatibility'
  - 'durationUnknown flag set via spread conditional to avoid always-present field'

patterns-established:
  - 'Service extraction: move domain logic out of components into /services/'
  - 'Explicit dependency injection: services receive all dependencies as parameters'
  - 'State machine hook: useReducer + TRANSITIONS map for predictable lifecycle management'

# Metrics
duration: 3m 15s
completed: 2026-02-08
---

# Phase 4 Plan 2: Service Extraction, State Machine Hook, and Bug Fixes Summary

**Extracted docxExport service and useTranscription state machine hook, made geminiService stateless via explicit apiKey injection, fixed ObjectURL leak/download timing/duration extraction bugs**

## Performance

- **Duration:** 3m 15s
- **Started:** 2026-02-08T00:30:28Z
- **Completed:** 2026-02-08T00:33:43Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Created standalone docxExport service extracting DOCX generation from TranscriptView (ARCH-07)
- Made geminiService pure/stateless by removing createAI helper and accepting apiKey as explicit parameter (ARCH-05)
- Created useTranscription hook with typed state machine (idle/uploading/processing/completed/error) and TRANSITIONS map (ARCH-06)
- Fixed BUG-01: ObjectURL now revoked after metadata extraction in both success and error paths
- Fixed BUG-02: Download All uses sequential async/await instead of brittle setTimeout
- Fixed BUG-03: Duration extraction flags 0-duration files with durationUnknown: true

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract docxExport service, refactor geminiService, fix BUG-02** - `b7d08fe` (feat)
2. **Task 2: Create useTranscription hook with state machine, fix BUG-01 and BUG-03** - `636034b` (feat)

## Files Created/Modified

- `src/services/docxExport.ts` - Standalone DOCX generation service with generateDocxBlob, saveBlob, formatTimestamp exports
- `src/features/project/hooks/useTranscription.ts` - Transcription state machine hook with TRANSITIONS map and typed events
- `src/services/geminiService.ts` - Stateless service: uploadFile(apiKey, ...) and generateTranscript(apiKey, ...) with no hidden dependencies
- `src/features/project/components/TranscriptView.tsx` - Uses extracted docxExport service, sequential downloads (BUG-02 fixed)
- `src/features/project/components/FileUpload.tsx` - ObjectURL cleanup (BUG-01) and durationUnknown flag (BUG-03)
- `src/app/App.tsx` - Updated to pass apiKey to geminiService functions

## Decisions Made

- geminiService accepts apiKey as first parameter -- caller (App.tsx, useTranscription) is responsible for key retrieval from cryptoService
- useTranscription hook uses TRANSITIONS map pattern for valid state transitions, invalid events are no-ops
- Download All uses 100ms delay between sequential saves for browser compatibility (replacing 200ms/400ms setTimeout)
- durationUnknown flag applied via spread conditional `...(validDuration ? {} : { durationUnknown: true })` to avoid always-present field

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated App.tsx callers to match new geminiService signatures**

- **Found during:** Task 1 (geminiService refactor)
- **Issue:** App.tsx called uploadFile(file, cb) and generateTranscript(uri, type, dur, cb) without apiKey, causing TypeScript errors
- **Fix:** Added getDecryptedKey import, decrypt key before calling services, pass apiKey as first argument
- **Files modified:** src/app/App.tsx
- **Verification:** npx tsc --noEmit passes
- **Committed in:** b7d08fe (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to maintain type safety after signature change. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- docxExport service ready for import by any component needing DOCX generation
- useTranscription hook ready for consumption by ProjectPage in Plan 03
- geminiService is now pure -- Plan 03 can wire useTranscription hook which calls getDecryptedKey internally
- All three bugs fixed, production build passes

---

_Phase: 04-core-architecture-refactor_
_Completed: 2026-02-08_

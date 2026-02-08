---
phase: 04-core-architecture-refactor
plan: 01
subsystem: ui, infra
tags: [react-context, vite, tsconfig-paths, react-router, directory-structure]

# Dependency graph
requires:
  - phase: 03-storage-foundation
    provides: storageService CRUD, storageService.types, cryptoService
provides:
  - src/ directory structure with feature-based organization
  - SettingsContext with useSettings() hook for API key state
  - ProjectsContext with useProjects() hook for project CRUD state
  - @ path alias resolving to src/ via vite-tsconfig-paths
  - FileData.durationUnknown optional field for BUG-03
  - react-router installed (used in Plan 02+)
affects: [04-02, 04-03, 05-ux-polish, 06-transcription-pipeline]

# Tech tracking
tech-stack:
  added: [react-router 7.13.0, vite-tsconfig-paths 6.1.0]
  patterns: [feature-based directory structure, Kent C. Dodds context pattern, @ path alias]

key-files:
  created:
    - src/contexts/SettingsContext.tsx
    - src/contexts/ProjectsContext.tsx
    - src/app/App.tsx
    - src/index.tsx
    - src/types/index.ts
    - src/services/geminiService.ts
    - src/services/cryptoService.ts
    - src/services/storageService.ts
    - src/services/storageService.types.ts
    - src/features/project/components/FileUpload.tsx
    - src/features/project/components/TranscriptView.tsx
    - src/features/project/components/LoadingState.tsx
    - src/features/settings/components/Settings.tsx
  modified:
    - vite.config.ts
    - tsconfig.json
    - index.html
    - tailwind.config.js
    - package.json
    - package-lock.json

key-decisions:
  - "SettingsProvider wraps ProjectsProvider (outer > inner) for future dependency direction"
  - "Existing App.tsx useState hooks preserved alongside new contexts for zero-regression migration"
  - "react-router and vite-tsconfig-paths pinned to exact versions (no range specifiers)"

patterns-established:
  - "Feature-based directory: src/features/{domain}/components/ and src/features/{domain}/hooks/"
  - "Kent C. Dodds context pattern: useReducer + createContext + custom hook with undefined guard"
  - "@ alias resolves to src/ via tsconfig paths + vite-tsconfig-paths plugin"

# Metrics
duration: 8m 20s
completed: 2026-02-08
---

# Phase 4 Plan 1: Src Directory Migration and Context Providers Summary

**Migrated all source files to src/ with feature-based structure, installed react-router and vite-tsconfig-paths, and created SettingsContext + ProjectsContext providers with useReducer**

## Performance

- **Duration:** 8m 20s
- **Started:** 2026-02-08T00:19:03Z
- **Completed:** 2026-02-08T00:27:23Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- All source files moved from project root into src/ with feature-based directory structure (src/app, src/features, src/contexts, src/services, src/types)
- Vite, TypeScript, ESLint, and Tailwind build chain updated to work with src/ directory -- all three pass with zero errors
- SettingsContext tracks API key configuration state via useReducer with KEY_SAVED/KEY_CLEARED actions
- ProjectsContext wraps storageService CRUD (create, update, delete) with React state management and exposes useProjects() hook
- Both providers wired into App.tsx component tree (SettingsProvider outer, ProjectsProvider inner)
- FileData type extended with optional durationUnknown field for BUG-03 fix in Plan 02

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate to src/ directory and update all configs** - `820d7d8` (feat)
2. **Task 2: Create SettingsContext and ProjectsContext** - `a878f26` (feat)

**Plan metadata:** (pending)

## Files Created/Modified

- `src/index.tsx` - App entry point with @/ imports
- `src/index.css` - Tailwind base styles (moved from root)
- `src/app/App.tsx` - Main app component with provider wrappers
- `src/types/index.ts` - Shared types with durationUnknown field added to FileData
- `src/contexts/SettingsContext.tsx` - API key state via useReducer, exports SettingsProvider + useSettings
- `src/contexts/ProjectsContext.tsx` - Project CRUD state wrapping storageService, exports ProjectsProvider + useProjects
- `src/features/project/components/FileUpload.tsx` - File upload component (moved, imports updated)
- `src/features/project/components/TranscriptView.tsx` - Transcript display component (moved, imports updated)
- `src/features/project/components/LoadingState.tsx` - Loading progress component (moved, imports updated)
- `src/features/settings/components/Settings.tsx` - Settings modal component (moved, imports updated)
- `src/services/geminiService.ts` - Gemini API service (moved, imports updated)
- `src/services/cryptoService.ts` - BYOK crypto service (moved, imports updated)
- `src/services/storageService.ts` - Storage CRUD service (moved, imports updated)
- `src/services/storageService.types.ts` - Storage type definitions (moved, imports updated)
- `vite.config.ts` - Replaced manual path alias with tsconfigPaths plugin
- `tsconfig.json` - Paths updated to ./src/\*, added include: ["src"]
- `index.html` - Script src updated to /src/index.tsx
- `tailwind.config.js` - Content glob updated to ./src/\*\*
- `package.json` - Added react-router 7.13.0, vite-tsconfig-paths 6.1.0 (pinned exact)

## Decisions Made

- SettingsProvider wraps ProjectsProvider (outer > inner) so ProjectsContext can later depend on settings state
- Existing App.tsx useState hooks preserved alongside new contexts -- zero-regression migration strategy (Plan 03 will switch components to use contexts)
- New dependencies (react-router 7.13.0, vite-tsconfig-paths 6.1.0) pinned to exact versions matching project convention from Phase 02-02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- src/ directory structure ready for routing (Plan 02) and component decomposition (Plan 03)
- SettingsContext and ProjectsContext available for consumption by page components
- react-router installed and ready for route definitions
- All existing functionality preserved -- app renders identically to before migration

---

_Phase: 04-core-architecture-refactor_
_Completed: 2026-02-08_

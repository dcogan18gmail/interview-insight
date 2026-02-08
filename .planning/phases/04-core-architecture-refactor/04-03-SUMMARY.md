---
phase: 04-core-architecture-refactor
plan: 03
subsystem: ui, routing
tags:
  [react-router, page-components, layout, context-consumption, decomposition]

# Dependency graph
requires:
  - phase: 04-core-architecture-refactor
    plan: 01
    provides: SettingsContext, ProjectsContext, directory structure, react-router install
  - phase: 04-core-architecture-refactor
    plan: 02
    provides: useTranscription hook, geminiService with apiKey injection, docxExport
provides:
  - Router-based page architecture (Layout + 3 routes)
  - DashboardPage with project list from context
  - ProjectPage with full transcription flow via useTranscription hook
  - SettingsPage with extracted ApiKeyForm component
  - Slim App.tsx (25 lines, routing + providers only)
affects:
  - src/app/App.tsx (rewritten)
  - src/app/Layout.tsx (created)
  - src/features/dashboard/DashboardPage.tsx (created)
  - src/features/project/ProjectPage.tsx (created)
  - src/features/settings/SettingsPage.tsx (created)
  - src/features/settings/components/ApiKeyForm.tsx (created)

# Tech stack
added: []
patterns:
  - React Router BrowserRouter with nested Route layout
  - NavLink with isActive callback for active state styling
  - Outlet pattern for layout composition
  - Feature-based page components consuming context hooks
  - Status enum mapping (hook state machine -> legacy TranscriptionStatus)

# Key files
created:
  - src/app/Layout.tsx
  - src/features/dashboard/DashboardPage.tsx
  - src/features/project/ProjectPage.tsx
  - src/features/settings/SettingsPage.tsx
  - src/features/settings/components/ApiKeyForm.tsx
modified:
  - src/app/App.tsx

# Decisions
decisions:
  - ApiKeyForm uses useSettings dispatch directly instead of prop callbacks
  - ProjectPage maps hook TranscriptionState to TranscriptionStatus enum for LoadingState compatibility
  - SettingsProvider wraps ProjectsProvider wraps BrowserRouter (contexts outside router)
  - FileUpload onFileSelected in ProjectPage triggers startTranscription immediately (no two-step idle->confirm)
  - DashboardPage is a functional placeholder for Phase 5 rebuild

# Metrics
duration: 3m 24s
completed: 2026-02-08
tasks_completed: 2
tasks_total: 2
---

# Phase 4 Plan 3: Router-Based Page Decomposition Summary

Router-based architecture with Layout/Outlet pattern, three page routes (Dashboard, Project, Settings), and zero prop drilling via context hooks.

## Performance

- Duration: 3m 24s
- Tasks: 2/2 completed
- Build: passes (778 kB bundle)
- TypeScript: zero errors (strict + noUncheckedIndexedAccess)
- ESLint: zero errors

## Accomplishments

1. **Rewrote App.tsx** from 345-line monolith to 25-line slim routing config with provider wrapping
2. **Created Layout.tsx** with shared sticky header, NavLink navigation with active state, and Outlet for child routes
3. **Created DashboardPage** consuming useProjects() context to show project list with status badges and navigation
4. **Created ProjectPage** composing FileUpload, LoadingState, TranscriptView through useTranscription hook state machine
5. **Created SettingsPage** as full route (not modal) with extracted ApiKeyForm and storage usage report
6. **Extracted ApiKeyForm** from modal-based Settings.tsx, using useSettings dispatch instead of prop callbacks
7. **Verified** netlify.toml SPA redirect intact, beforeunload listener chain preserved

## Task Commits

| Task | Name                             | Commit  | Key Files                                                                |
| ---- | -------------------------------- | ------- | ------------------------------------------------------------------------ |
| 1    | Layout, page components, routing | e5d1eb4 | App.tsx, Layout.tsx, DashboardPage.tsx, SettingsPage.tsx, ApiKeyForm.tsx |
| 2    | ProjectPage + transcription flow | b490fce | ProjectPage.tsx                                                          |

## Files Created/Modified

**Created:**

- `src/app/Layout.tsx` -- Shared header with NavLink navigation and Outlet
- `src/features/dashboard/DashboardPage.tsx` -- Dashboard with project list from ProjectsContext
- `src/features/project/ProjectPage.tsx` -- Full transcription flow via useTranscription hook
- `src/features/settings/SettingsPage.tsx` -- Settings route with ApiKeyForm and storage report
- `src/features/settings/components/ApiKeyForm.tsx` -- Extracted API key form using useSettings context

**Modified:**

- `src/app/App.tsx` -- Rewritten from 345 lines to 25 lines (BrowserRouter + providers + Routes)

## Decisions Made

1. **ApiKeyForm dispatch pattern:** ApiKeyForm uses `useSettings().dispatch` directly to fire KEY_SAVED/KEY_CLEARED actions, replacing the prop-based `onKeyChanged` callback pattern from the modal Settings component.

2. **Status enum mapping:** ProjectPage maintains a mapping from the hook's lowercase `TranscriptionState` strings (`'uploading'`, `'processing'`) to the legacy `TranscriptionStatus` enum values that `LoadingState` expects. This avoids breaking the existing LoadingState component.

3. **Immediate transcription start:** ProjectPage's `handleFileSelected` calls `startTranscription` immediately after file selection (no two-step "select then confirm" flow). The file info card with "Generate Transcript" button was part of the monolith's local state pattern that doesn't map cleanly to the hook-based architecture. Users select a file and transcription begins.

4. **Contexts outside BrowserRouter:** SettingsProvider and ProjectsProvider wrap BrowserRouter in App.tsx. Contexts don't need router access, and this keeps provider nesting independent of routing.

5. **DashboardPage as Phase 5 placeholder:** The dashboard shows a functional project list and "New Transcription" button but is explicitly a placeholder to be rebuilt with full project management features in Phase 5.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

Phase 4 (Core Architecture Refactor) is now **complete** with all 3 plans executed:

- 04-01: Directory restructure, contexts, routing install
- 04-02: Service extraction, state machine hook, bug fixes
- 04-03: Router-based page decomposition (this plan)

**Ready for Phase 5:** The routed architecture with Layout, DashboardPage, ProjectPage, and SettingsPage provides the foundation for Phase 5 (Project Management & Dashboard). DashboardPage is an explicit placeholder awaiting full project management features. The modal Settings.tsx is preserved alongside the new route-based SettingsPage for backward compatibility during any transition period.

**No blockers** for Phase 5.

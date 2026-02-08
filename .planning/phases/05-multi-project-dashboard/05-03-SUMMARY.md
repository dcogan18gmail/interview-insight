---
phase: 05-multi-project-dashboard
plan: 03
subsystem: ui, dashboard
tags:
  [
    center-panel,
    metadata-editing,
    onboarding,
    transcript-display,
    needs-info-indicator,
  ]

requires:
  - phase: 05-multi-project-dashboard
    provides: 3-panel layout shell, extended ProjectMetadata with 6 nullable fields, DashboardLayout
  - phase: 04-core-architecture-refactor
    provides: ProjectsContext with updateProject, SettingsContext, TranscriptView component, storageService getTranscript
provides:
  - Contextual center panel (WelcomeView, OnboardingView, TranscriptPanel, not-found fallback)
  - Fully editable metadata panel with click-to-edit fields and "needs info" indicators
  - TranscriptPanel loading transcript from localStorage via getTranscript
  - Guided onboarding flow for zero-project state
affects:
  [
    06-transcription (TranscriptPanel status states),
    future search/filter features,
  ]

tech-stack:
  added: []
  patterns:
    [
      click-to-edit inline fields,
      null-as-needs-info convention,
      conditional panel rendering,
    ]

key-files:
  created:
    - src/features/dashboard/components/WelcomeView.tsx
    - src/features/dashboard/components/OnboardingView.tsx
    - src/features/dashboard/components/TranscriptPanel.tsx
  modified:
    - src/features/dashboard/components/CenterPanel.tsx
    - src/features/dashboard/components/MetadataPanel.tsx

key-decisions:
  - 'MetadataField sub-component manages its own editing state locally (no lifted state needed)'
  - 'Empty string edits convert to null to maintain the needs-info indicator convention'
  - 'TranscriptPanel loads transcript data synchronously from localStorage via getTranscript'
  - 'OnboardingView checks apiKeyConfigured from SettingsContext to mark step 1 as done'

patterns-established:
  - 'Click-to-edit fields: click shows input, Enter/blur saves, Escape cancels'
  - 'Null = needs info: amber italic indicator for blank metadata fields'
  - 'Status-dependent rendering: TranscriptPanel switches on project.status for different UX states'

duration: 2min
completed: 2026-02-08
---

# Phase 5 Plan 3: Center Panel Content States and Editable Metadata Summary

**Center panel with contextual views (welcome stats, guided onboarding, transcript display, error states) and fully editable metadata panel with amber "needs info" indicators on null fields**

## Performance

- **Duration:** ~2 minutes
- **Started:** 2026-02-08T03:16:47Z
- **Completed:** 2026-02-08T03:19:28Z
- **Tasks:** 2/2
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Built WelcomeView with project count, completed count, total segments stats, and New Project CTA
- Built OnboardingView with 3-step guided setup (API key, upload, transcript) with checkmark indicators
- Built TranscriptPanel that loads transcript from localStorage and handles all 5 project statuses (idle, uploading, processing, error, completed)
- Replaced CenterPanel placeholder with proper routing: zero projects -> OnboardingView, has projects -> WelcomeView, selected project -> TranscriptPanel, invalid ID -> not-found fallback
- Rebuilt MetadataPanel with 6 editable fields using click-to-edit MetadataField sub-component
- Null field values show amber italic "Needs info" indicator (clickable to start editing)
- Empty string edits automatically convert to null to maintain needs-info convention
- Read-only system fields section: status badge, created/updated dates, file name/size, formatted duration, segment count

## Task Commits

1. **Task 1: Center panel content states** - `fad863c` (feat)
2. **Task 2: Editable metadata panel with needs-info indicators** - `76bb34d` (feat)

## Files Created/Modified

- `src/features/dashboard/components/WelcomeView.tsx` - Welcome/summary view with stats grid and New Project button for has-projects-none-selected state
- `src/features/dashboard/components/OnboardingView.tsx` - Guided 3-step onboarding for zero-project state with API key check
- `src/features/dashboard/components/TranscriptPanel.tsx` - Status-aware transcript display; loads from storageService, reuses existing TranscriptView component
- `src/features/dashboard/components/CenterPanel.tsx` - Route-aware center panel composing WelcomeView, OnboardingView, TranscriptPanel, and ProjectPage
- `src/features/dashboard/components/MetadataPanel.tsx` - Full editable metadata panel with MetadataField sub-component, StatusBadge, and utility formatters

## Decisions Made

- MetadataField manages its own editing state locally -- no need to lift state since each field is independent
- Empty string edits convert to null to maintain the "needs info" convention (amber indicator reappears)
- TranscriptPanel loads transcript synchronously from localStorage (getTranscript returns immediately) -- no async needed
- OnboardingView checks `useSettings().state.apiKeyConfigured` to show checkmark on step 1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 5 complete: all 3 plans (schema/layout, project entry interactions, center panel + metadata) delivered
- Dashboard has full 3-panel layout with interactive sidebar, contextual center content, and editable metadata
- Phase 6 (Transcription) can proceed: TranscriptPanel already handles all project status states and renders transcript via existing TranscriptView

---

_Phase: 05-multi-project-dashboard_
_Completed: 2026-02-08_

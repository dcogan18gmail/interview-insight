---
phase: 05-multi-project-dashboard
plan: 01
subsystem: storage, layout
tags: [schema-migration, localStorage, 3-panel-layout, sidebar, react-router]

requires:
  - phase: 04-core-architecture-refactor
    provides: react-router routing, contexts, page decomposition
provides:
  - Extended ProjectMetadata with 6 new nullable fields
  - v1-to-v2 schema migration
  - 3-panel dashboard layout shell (sidebar + center + metadata panel)
  - Collapsible sidebar with sorted project list
affects: [05-02 (ProjectEntry component), 05-03 (metadata panel editing)]

tech-stack:
  added: []
  patterns: [nested layout routes, collapsible sidebar, schema migration]

key-files:
  created:
    - src/features/dashboard/DashboardLayout.tsx
    - src/features/dashboard/components/Sidebar.tsx
    - src/features/dashboard/components/CenterPanel.tsx
    - src/features/dashboard/components/MetadataPanel.tsx
  modified:
    - src/services/storageService.types.ts
    - src/services/storageService.ts
    - src/app/App.tsx
    - src/app/Layout.tsx
    - src/features/settings/SettingsPage.tsx

key-decisions:
  - 'Use string|null (not optional ?) for v2 fields so null-check indicator logic is simpler'
  - 'DashboardLayout as nested route element wrapping dashboard routes, settings route outside'
  - 'Sidebar shows interviewee name falling back to project name as primary label'
  - 'Delete DashboardPage.tsx -- DashboardLayout + CenterPanel replaces its role'
  - 'SettingsPage gets own px-6 py-10 padding since Layout main no longer constrains width'

duration: 2min
completed: 2026-02-08
---

# Phase 5 Plan 1: Schema Extension and 3-Panel Layout Summary

**Extended ProjectMetadata with 6 nullable metadata fields, v1-to-v2 migration, and built a 3-panel dashboard shell with collapsible sidebar showing sorted project list**

## Performance

- **Duration:** ~3 minutes
- **Started:** 2026-02-08T03:08:44Z
- **Completed:** 2026-02-08T03:11:43Z
- **Tasks:** 2/2
- **Files modified:** 9 (4 created, 4 modified, 1 deleted)

## Accomplishments

- Extended ProjectMetadata with interviewee, interviewer, participants, interviewDate, originalLanguage, and location fields (all string|null)
- Bumped CURRENT_SCHEMA_VERSION from 1 to 2
- Implemented v1-to-v2 migration that adds null defaults to all existing projects in localStorage
- Updated validator to accept both v1 (fields absent) and v2 (fields string|null) data
- Built 3-panel layout: collapsible sidebar (w-64/w-12), flexible center panel, right metadata panel (w-72)
- Sidebar displays projects sorted by updatedAt descending with interviewee/project name, short date, and language
- Sidebar collapses smoothly via CSS transition with chevron toggle
- New Project button in sidebar header navigates to /project/new
- CenterPanel handles three states: welcome (no selection), new project (file upload), existing project (placeholder)
- MetadataPanel shows all project fields with "Not set" indicators for null values
- Routing updated with nested DashboardLayout; settings route remains outside the 3-panel layout
- Layout.tsx main element updated to flex-1 full width for proper 3-panel support

## Task Commits

1. **Task 1: Extend ProjectMetadata schema and implement v1-to-v2 migration** - `2ad2af0` (feat)
2. **Task 2: Build 3-panel layout shell with collapsible sidebar** - `1454188` (feat)

## Files Created/Modified

- `src/services/storageService.types.ts` - Added 6 new string|null fields to ProjectMetadata, bumped CURRENT_SCHEMA_VERSION to 2
- `src/services/storageService.ts` - Added v1-to-v2 migration, updated validator and createProject
- `src/features/dashboard/DashboardLayout.tsx` - New 3-panel layout shell with Sidebar, Outlet, MetadataPanel
- `src/features/dashboard/components/Sidebar.tsx` - Collapsible sidebar with sorted project list and New Project button
- `src/features/dashboard/components/CenterPanel.tsx` - Route-dependent center content (welcome, new, existing)
- `src/features/dashboard/components/MetadataPanel.tsx` - Right panel showing project metadata fields
- `src/app/App.tsx` - Updated routing with nested DashboardLayout
- `src/app/Layout.tsx` - Removed max-w-5xl from main, added flex-col for full-width support
- `src/features/settings/SettingsPage.tsx` - Added own padding since Layout main no longer constrains
- `src/features/dashboard/DashboardPage.tsx` - Deleted (replaced by DashboardLayout + CenterPanel)

## Decisions Made

- Use `string | null` (not optional `?`) for v2 metadata fields -- makes null-check indicator logic simpler (check `=== null`)
- DashboardLayout is a nested route element wrapping only dashboard routes; settings remains outside
- Sidebar primary label: `project.interviewee ?? project.name` (interviewee with project name fallback)
- Deleted DashboardPage.tsx since DashboardLayout + CenterPanel fully replaces its role
- SettingsPage gets its own `px-6 py-10` padding since Layout main no longer provides it
- Sidebar collapsed state shows single-letter avatars with tooltips for quick project switching

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added padding to SettingsPage**

- **Found during:** Task 2
- **Issue:** Removing `max-w-5xl px-6 py-10` from Layout main caused SettingsPage to render without padding
- **Fix:** Added `px-6 py-10` directly to SettingsPage's root div
- **Files modified:** src/features/settings/SettingsPage.tsx
- **Commit:** 1454188

## Issues Encountered

None

## Next Phase Readiness

- Plan 05-02 (ProjectEntry component) can proceed: sidebar renders minimal stubs that 05-02 replaces with full ProjectEntry (double-click rename, three-dot delete menu)
- Plan 05-03 (metadata panel editing) can proceed: MetadataPanel is a placeholder showing read-only fields that 05-03 makes editable

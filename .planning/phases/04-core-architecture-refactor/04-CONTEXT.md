# Phase 4: Core Architecture Refactor - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Decompose the monolithic App.tsx (330 lines, 7 state variables, zero hooks/contexts) into a feature-based module structure with React Router navigation, Context API state management, and extracted hooks. Fix three known bugs (ObjectURL memory leak, download timing, 0-duration handling). Dashboard UI and multi-project features belong to Phase 5 — this phase creates the architectural skeleton they plug into.

</domain>

<decisions>
## Implementation Decisions

### Route structure & navigation

- Claude's discretion — user trusts best practices
- Guidance: React Router with routes for dashboard, project detail, and settings
- Settings can surface as route or modal — choose based on standard SPA patterns
- URL patterns, back navigation, and route guards at Claude's discretion

### Module/folder organization

- Claude's discretion — user trusts best practices
- Guidance: Feature-based folder structure under src/ (not layer-based)
- Shared hooks, utils, and types extracted to common locations
- Granularity level at Claude's discretion — balance between too flat and too nested

### State boundaries & contexts

- Claude's discretion — user trusts best practices
- Guidance: SettingsContext for API key state, ProjectsContext for project/transcript state
- Context separation, interaction patterns, and what lives where at Claude's discretion
- No prop drilling — contexts provide state to consuming components

### Transcription state machine

- Claude's discretion — user trusts best practices
- Guidance: useTranscription hook with explicit state machine replacing current status enum
- State transitions, recovery/retry behavior, and state granularity at Claude's discretion
- Current states: IDLE, UPLOADING, PROCESSING, COMPLETED, ERROR — extend as needed

### Bug fixes

- ObjectURL memory leak: URL.revokeObjectURL called on cleanup (required)
- Download timing: async/await replaces brittle setTimeout (required)
- Duration extraction: handle 0-duration gracefully without silent failure (required)

### Claude's Discretion

All four architectural areas (routing, folder organization, state boundaries, state machine design) are fully at Claude's discretion. User explicitly deferred to best practices with no specific preferences. Bug fixes have clear requirements from the roadmap.

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User expressed trust in best practices across all areas.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 04-core-architecture-refactor_
_Context gathered: 2026-02-07_

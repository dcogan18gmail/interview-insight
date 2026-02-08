# Phase 5: Multi-Project Dashboard - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a multi-project dashboard where users can manage interview projects with CRUD operations (create, rename, delete) and navigate between them. The dashboard is a 3-panel layout: sidebar project list, center transcript panel, right metadata panel. This phase builds the panels, project management UI, and editable metadata fields. Auto-extracting metadata from transcripts is a future phase.

</domain>

<decisions>
## Implementation Decisions

### 3-Panel Layout (Linear-inspired)

- **Left panel:** Collapsible sidebar with project list. Fixed width. Each entry shows: interviewee/subject name, short-form interview date, and original language.
- **Center panel:** Transcript view (complete or in-progress) for the selected project. When no project is selected, shows a welcome/summary view (total projects, recent activity, quick stats).
- **Right panel:** Editable metadata panel with fields for: interviewee/subject, interviewer, other participants, interview date, upload date, original language, length, number of turns/segments, location of interview. Fields start blank with "needs info" indicators if not filled out. All fields are user-editable.
- Reference: Linear's clean 3-panel layout — minimal, functional, not cluttered.
- Sidebar is collapsible (toggle button or similar).
- Fixed sidebar width (not resizable).
- Desktop/browser only for now — mobile is out of scope, but if adding scaffolding, responsive behavior is at Claude's discretion.

### Project List (Sidebar) Display

- Sort by most recently updated (descending).
- Layout style (cards vs list items in sidebar): Claude's discretion.

### Rename Interaction

- Double-click project name in sidebar to enter inline edit mode.
- Enter saves, Escape cancels.

### Create Flow

- "New Project" button in both the sidebar header AND the main panel (when no project selected / empty state).
- Lean toward: prompt for project name first (or auto-generate), then show upload interface. Claude's discretion on exact flow.

### Delete Flow

- Triggered via three-dot menu (...) on each project entry in the sidebar.
- Confirmation style: Claude's discretion (modal dialog or inline confirmation).

### Metadata Schema Extension

- Extend ProjectMetadata with new fields: interviewee, interviewer, participants, interviewDate, originalLanguage, location. These are all optional string fields (user-editable, start blank).
- Schema migration from v1 to v2: add new fields with null/empty defaults.
- Right panel renders all metadata fields as editable inputs. Blank fields show "needs info" visual indicator.

### Claude's Discretion

- Sidebar entry layout style (cards vs compact list items)
- Delete confirmation style (modal dialog vs inline)
- Exact create flow (name-first vs upload-first, auto-generate name)
- Responsive scaffolding for future mobile support
- Last-project-deleted behavior (onboarding replay vs empty state)
- Welcome/summary view content when no project selected
- Sidebar collapse animation and toggle button design

</decisions>

<specifics>
## Specific Ideas

- "Linear" as the reference for how the 3-panel layout should feel — clean, minimal, not cluttered.
- Each sidebar entry represents a different interview (typically a single uploaded file).
- Right metadata panel fields should be editable and call out blank fields as needing to be filled out.
- Guided onboarding when dashboard has zero projects: step-by-step walkthrough showing "1. Add your API key, 2. Upload a recording, 3. Get your transcript" — shows what's done and what's next.
- Failed/error projects: show error status plus what went wrong AND a retry button. Both explanation and action.

</specifics>

<deferred>
## Deferred Ideas

- **AI auto-extraction of metadata from transcripts** — After transcription completes, use Gemini to identify interviewee name, language, participants, etc. from the transcript content and auto-populate metadata fields. Needs a roadmap home (new phase or folded into existing one). High priority — the metadata panel is less useful without it.
- **Mobile/responsive layout** — Out of scope for this build. Browser-only.

</deferred>

---

_Phase: 05-multi-project-dashboard_
_Context gathered: 2026-02-07_

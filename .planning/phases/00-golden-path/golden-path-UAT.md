---
status: testing
phase: golden-path (Phases 1-6)
source: 01-03-SUMMARY.md, 02-01-SUMMARY.md, 02-02-SUMMARY.md, 03-01-SUMMARY.md, 03-02-SUMMARY.md, 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md
started: 2026-02-08T17:00:00Z
updated: 2026-02-08T20:15:00Z
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

number: 7
name: Sidebar Collapse (retest)
expected: |
Click the collapse toggle on the sidebar. Width transitions smoothly (~200ms).
In collapsed state, shows "?" for projects without interviewee name.
Click again to expand. No layout jank.
awaiting: user response (fixes 6-9 applied, ready for retest)

## Tests

### 1. Fresh Start — Onboarding View

expected: Clear localStorage, open app. See 3-panel layout, onboarding view with 3 uncompleted steps, CTA for first step.
result: pass

### 2. Navigation to Settings

expected: Click the Settings link/icon in the header. URL changes to /settings without page reload. Settings page shows API key form. Back/forward browser buttons work.
result: pass

### 3. Invalid API Key Rejection

expected: Enter an invalid key (e.g., "test123"), click Validate & Save. Error message appears. Key is NOT stored (no green badge after refresh).
result: skipped
reason: User jumped ahead to valid key entry

### 4. Valid API Key — Save and Persist

expected: Enter your valid Gemini API key, click Validate & Save. Green "Key configured" badge appears. Refresh page — badge still shows, no "API Key Required" prompt.
result: pass

### 5. Return to Dashboard — Onboarding Updates

expected: Navigate back to dashboard (/). Step 1 "Add your API key" now shows green checkmark. CTA points to step 2.
result: skipped
reason: User jumped ahead to project creation

### 6. Three-Panel Layout

expected: Sidebar on left (~256px), center panel takes remaining space, right metadata panel not visible yet (no project selected). Each area should scroll independently if content overflows. No horizontal scrollbar on window.
result: pass

### 7. Sidebar Collapse

expected: Click the collapse toggle on the sidebar. Width transitions smoothly (~200ms). In collapsed state, project initials or narrow strip visible (first+last from interviewee, or "?" if unset). Click again to expand. No layout jank.
result: [pending]
note: Previously minor issue — Fix 8 applied (initials + "?" placeholder). Needs retest.

### 8. Create New Project — File Upload

expected: Click "New Project" or navigate to /project/new. File upload UI appears. Select an audio/video file. Project appears in sidebar immediately with "uploading" status. Clicking the project in sidebar during transcription does NOT disrupt progress.
result: pass
note: First project transcription completed successfully. Sidebar click guard not explicitly tested but no disruption observed.

### 9. Progress Stepper During Transcription

expected: After file upload starts, see a horizontal 4-stage stepper (Uploading → Processing → Transcribing → Complete). During processing wait, animated sliding bar shows activity. Once segments arrive, progress bar fills with percentage display. Time estimate appears. Cancel button visible.
result: pass
note: User did not report progress bar issues this round — fix appears effective.

### 10. Live Transcript — Segments Appear

expected: During transcription, transcript segments appear below the stepper. Each segment fades in smoothly. The latest segment has a subtle shimmer/pulse. Speaker names shown in badges, timestamps in MM:SS format.
result: pass
note: First transcription completed with segments visible.

### 11. Live Transcript — Auto-Scroll Behavior

expected: While segments are arriving, view auto-scrolls to keep latest segment visible. Scroll UP manually — auto-scroll stops, "Jump to latest" pill appears at bottom center. Click the pill — jumps back to bottom, pill disappears.
result: skipped
reason: Not explicitly tested in this round

### 12. Transcription Completes

expected: Progress stepper reaches 100%, briefly flashes green, then fades out. Full transcript is displayed. Project status in sidebar updates to completed.
result: pass
note: First transcription completed. Second transcription stuck in processing (see test 16).

### 13. Download Functionality

expected: With completed transcript, click download dropdown. Select "Download All". 3 .docx files download with descriptive names (ProjectName_Variant_Date.docx) without browser blocking.
result: [pending]
note: Previously minor issue — Fix 9 applied (descriptive filenames). Needs retest.

### 14. View Project from Sidebar

expected: Click the completed project in sidebar. Center panel shows transcript. Right metadata panel shows correct segment count and reconciled duration. Editable fields show "Needs info" in amber italic.
result: [pending]
note: Previously major issue — Fix 7 applied (correct segmentCount + duration reconciliation). Needs retest.

### 15. Edit Metadata Field

expected: Click a "Needs info" field (e.g., Interviewee). Input appears. Type a name, press Enter. Field updates, "Needs info" indicator disappears. Value persists after page refresh.
result: [pending]

### 16. Create Second Project and Rename

expected: Create another project (New Project → upload file → wait for completion or cancel). Status updates to completed. Double-click the project name in sidebar. Input appears with text selected. Type new name, press Enter. Name updates immediately.
result: [pending]
note: Previously blocker — Fix 6 applied (immediate writes + removed CenterPanel safety net). Needs retest.

### 17. Delete Project with Confirmation

expected: Click three-dot menu on a project in sidebar. Click "Delete". Confirmation dialog appears with backdrop. Tab key stays trapped inside dialog. Press Escape — dialog closes, project NOT deleted. Re-open and click confirm — project removed from sidebar.
result: [pending]

### 18. Cancel In-Progress Transcription

expected: Start a new transcription. After a few segments appear, click Cancel button. Confirmation dialog: "Cancel transcription? Partial results will be saved." Confirm. Transcription stops. Partial transcript displayed below amber "Transcription Cancelled" card with segment count and "Start Fresh" button.
result: [pending]

### 19. Sidebar Indicator for Cancelled Project

expected: The cancelled project in sidebar shows a small amber dot next to its name. Hover shows tooltip "Transcription incomplete".
result: [pending]

### 20. Recovery Card on Revisit

expected: Navigate away from cancelled project (click another project or go to dashboard). Click back on the cancelled project. TranscriptPanel shows amber "Transcription was interrupted" recovery card with segment count and "Re-upload & Transcribe" button. Partial transcript shown dimmed below.
result: [pending]

### 21. Corrupted Storage Recovery

expected: Open DevTools console. Run: localStorage.setItem('ii:projects', '{invalid json'). Refresh app. App loads normally with empty project list (not a crash). No error screen.
result: [pending]

### 22. Data Persists Across Refresh

expected: With at least one completed project, refresh the page (F5). All projects still in sidebar. Select one — transcript still available. Metadata edits preserved.
result: [pending]

## Summary

total: 22
passed: 6
issues: 0
pending: 13
skipped: 3

## Gaps

- truth: "Collapsed sidebar shows meaningful project identification"
  status: fixed
  reason: "User reported: single letter initial not sufficient, should be first+last initials or pending icon when metadata blank"
  severity: minor
  test: 7
  root_cause: "Sidebar collapsed view used first char of project label. No interviewee-awareness."
  artifacts:
  - path: "src/features/dashboard/components/Sidebar.tsx"
    issue: "Single char display in collapsed NavLink"
    missing: []
    fix: "Fix 8 — Shows first+last initials from interviewee name, or '?' placeholder when unset"

- truth: "Download files have unique, descriptive filenames"
  status: fixed
  reason: "User reported: basic/generic download filenames, should include project name, download scope, and timestamp"
  severity: minor
  test: 13
  root_cause: "Hardcoded 'transcript_english.docx' etc. in TranscriptView. Project metadata not passed to component."
  artifacts:
  - path: "src/features/project/components/TranscriptView.tsx"
    issue: "Hardcoded filenames at lines 23-27, 35"
    missing: []
    fix: "Fix 9 — buildFilename generates ProjectName_Variant_YYYY-MM-DD.docx. projectName prop threaded from callers."

- truth: "Completed project metadata shows correct segment count and duration"
  status: fixed
  reason: "User reported: showing 0 total segments in metadata. Duration mismatch - metadata lists ~13 min but transcript timestamps go up to 21 min."
  severity: major
  test: 14
  root_cause: "TWO issues: (1) updateProject({...project, status: 'completed'}) used stale project from React state with segmentCount=0, overwriting saveTranscript's correct value. (2) Duration from browser HTMLMediaElement.duration was inaccurate for this file; Gemini timestamps reflected real audio length with no reconciliation."
  artifacts:
  - path: "src/features/project/ProjectPage.tsx"
    issue: "Completion useEffect spreads stale project object with segmentCount=0"
  - path: "src/features/project/components/FileUpload.tsx"
    issue: "Browser duration extraction can be inaccurate for certain codecs"
    missing: []
    fix: "Fix 7 — Completion updateProject now includes segmentCount and reconciles duration from max transcript timestamp."

- truth: "Second project transcription completes and UI updates to completed state"
  status: fixed
  reason: "User reported: second project console shows loop successful but stuck in processing state in UI. On refresh shows segment count but never completes. Both entries exist in sidebar."
  severity: blocker
  test: 16
  root_cause: "storageSaveProject used debounced write (300ms). Completion useEffect called updateProject then navigate. Component unmounted before debounce timer fired, so status='completed' never persisted to localStorage. Additionally, CenterPanel safety net (from Fix 4) mounted a disconnected ProjectPage at /project/{id} with no transcription running."
  artifacts:
  - path: "src/contexts/ProjectsContext.tsx"
    issue: "storageSaveProject called with default immediate=false (debounced)"
  - path: "src/features/dashboard/components/CenterPanel.tsx"
    issue: "Safety net rendered disconnected ProjectPage for processing-status projects"
    missing: []
    fix: "Fix 6 — updateProject now uses immediate=true for localStorage writes. CenterPanel safety net removed. Fix 7 also applies."

## Additional Findings (not tied to specific tests)

### Layout: Logo/Settings positioning

reported: "Logo/home button at top should be all the way left, currently all the way to left of center panel and stops before left panel. Settings button toward top right is similar just on other side."
severity: cosmetic

### Architecture: Transcription nondeterminism

reported: "Timestamping, conversational turns, etc are quite nondeterministic. Running through LLM — how can we add more structure to ensure accuracy?"
severity: architectural concern — not a bug, but a product quality issue for future improvement
note: This is inherent to Gemini-based transcription. Structured improvements could include: pre-processing audio with a dedicated ASR model (Whisper) for timestamps/segmentation, then using LLM only for translation and analysis. Would require Phase 7+ planning.

## Fixes Applied During UAT

### Fix 1: Route swap during transcription (commit e782ace)

**Bug:** CenterPanel swapped from ProjectPage (with ProgressStepper) to TranscriptPanel (spinner only) when handleFileSelected navigated from /project/new to /project/{id}.
**Fix:** Removed navigate from handleFileSelected. Now stays on /project/new during active transcription. Navigates to real project URL on completion/error/cancel.
**Status:** Committed. Partially fixes the issue — prevents auto-navigate but not manual sidebar clicks.

### Fix 2: CSP updates for dev compatibility (commit fbc5c72)

**Bug:** netlify.toml CSP blocked Vite inline scripts, blob: URLs for audio duration, and Vite HMR WebSocket.
**Fix:** Added 'unsafe-inline' to script-src, media-src 'self' blob:, ws://localhost:\* to connect-src.
**Status:** Committed.

### Fix 3: Vite dev proxy plugin (uncommitted)

**Bug:** Netlify CLI edge function runtime crashes with "Stream body too big" on file uploads.
**Fix:** Added devApiProxy() Vite plugin in vite.config.ts that handles /api/gemini-upload and /proxy-upload directly in Node.js dev server. Bypasses Netlify CLI entirely for local dev.
**Status:** Working but uncommitted. Use `npm run dev` (not `netlify dev`) for local testing.

### Fix 4: Sidebar click guard for active transcription (uncommitted)

**Bug:** Clicking project in sidebar during active transcription navigated to /project/{id}, unmounting ProjectPage and killing useTranscription hook. Transcription completed in background but state was lost.
**Fix:** Two-layer protection: (1) ProjectEntry.handleClick no-ops when project is uploading/processing and current route is /project/new, (2) Collapsed sidebar NavLinks also guarded.
**Status:** Applied, pending verification.

### Fix 5: Progress bar indeterminate animation + percentage display (uncommitted)

**Bug:** Progress bar appeared empty/static during processing wait. User couldn't tell if anything was happening.
**Fix:** Added indeterminate sliding animation during initial processing stage (before first segment arrives). Added percentage display ("27% · Estimating..."). Shows "Waiting for AI..." text during indeterminate phase.
**Status:** Applied, pending verification.

### Fix 6: Immediate localStorage writes for updateProject (uncommitted)

**Bug:** `storageSaveProject` used debounced (300ms) writes by default. When completion useEffect called `updateProject({status: 'completed'})` then `navigate()`, component unmounted before the debounce timer fired. The `status: 'completed'` write never persisted to localStorage. On refresh, project was stuck in 'processing'. Also removed CenterPanel safety net (from Fix 4) that created disconnected ProjectPage instances for processing-status projects.
**Fix:** Changed `ProjectsContext.updateProject` to use `storageSaveProject(project, true)` (immediate writes). Removed CenterPanel safety net.
**Status:** Applied, pending verification.

### Fix 7: Correct segmentCount + duration reconciliation on completion (uncommitted)

**Bug:** `updateProject({...project, status: 'completed'})` used stale project object from React state with `segmentCount: 0`, overwriting the correct value that `saveTranscript` had just written. Also, browser-detected file duration was inaccurate (~13m) while transcript timestamps went to ~21m.
**Fix:** Completion `updateProject` now includes `segmentCount: segments.length`. Also reconciles `fileInfo.duration` from max transcript timestamp when it exceeds browser-detected duration. Cancelled state also saves correct segmentCount.
**Status:** Applied, pending verification.

### Fix 8: Sidebar collapsed initials improvement (uncommitted)

**Bug:** Single character initial in collapsed sidebar wasn't sufficient for identification.
**Fix:** Shows first+last initials from interviewee name when available (e.g., "JD" for "John Doe"). Shows "?" placeholder when interviewee metadata is not yet set.
**Status:** Applied, pending verification.

### Fix 9: Descriptive download filenames (uncommitted)

**Bug:** Hardcoded generic filenames (transcript_english.docx).
**Fix:** `buildFilename()` generates `ProjectName_Variant_YYYY-MM-DD.docx`. Added `projectName` prop to TranscriptView, threaded from TranscriptPanel and ProjectPage.
**Status:** Applied, pending verification.

## Known Issues for Next Session

1. **Dev server: use `npm run dev` not `netlify dev`** — Vite dev proxy handles API routes locally.
2. **Logo/settings positioning** — cosmetic: should extend to edges of full layout, not just center panel.
3. **Transcription nondeterminism** — architectural: timestamps/turns from LLM are inherently variable. Future improvement: use dedicated ASR (Whisper) for timestamps, LLM only for translation/analysis.

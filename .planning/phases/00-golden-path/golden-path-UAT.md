---
status: testing
phase: golden-path (Phases 1-6)
source: 01-03-SUMMARY.md, 02-01-SUMMARY.md, 02-02-SUMMARY.md, 03-01-SUMMARY.md, 03-02-SUMMARY.md, 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md
started: 2026-02-08T17:00:00Z
updated: 2026-02-08T18:30:00Z
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

number: 8
name: Create New Project — File Upload
expected: |
Click "New Project" or navigate to /project/new. File upload UI appears.
Select an audio/video file. Project appears in sidebar immediately with "uploading" status.
awaiting: retry after fixes

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

expected: Click the collapse toggle on the sidebar. Width transitions smoothly (~200ms). In collapsed state, project initials or narrow strip visible. Click again to expand. No layout jank.
result: [pending]

### 8. Create New Project — File Upload

expected: Click "New Project" or navigate to /project/new. File upload UI appears. Select an audio/video file. Project appears in sidebar immediately with "uploading" status.
result: issue
reported: "Upload works with Vite dev proxy but clicking project in sidebar during transcription loses progress bar and transcript gets stuck in 'processing' forever. Transcription actually completes in background (console shows full loop completion) but ProjectPage unmounts when user clicks sidebar, killing the useTranscription hook."
severity: blocker

### 9. Progress Stepper During Transcription

expected: After file upload starts, see a horizontal 4-stage stepper (Uploading → Processing → Transcribing → Complete). Progress bar fills smoothly. Time estimate appears after initial progress ("Estimating..." then "~N min remaining"). Cancel button visible.
result: issue
reported: "Progress stepper shows 4 stages but no percentage or meaningful progress. Stages visible but progress bar appears empty/static. Time estimate not updating. Upload phase too fast to see (local proxy). Processing phase: progress only updates when segments stream in."
severity: major

### 10. Live Transcript — Segments Appear

expected: During transcription, transcript segments appear below the stepper. Each segment fades in smoothly. The latest segment has a subtle shimmer/pulse. Speaker names shown in badges, timestamps in MM:SS format.
result: [pending]

### 11. Live Transcript — Auto-Scroll Behavior

expected: While segments are arriving, view auto-scrolls to keep latest segment visible. Scroll UP manually — auto-scroll stops, "Jump to latest" pill appears at bottom center. Click the pill — jumps back to bottom, pill disappears.
result: [pending]

### 12. Transcription Completes

expected: Progress stepper reaches 100%, briefly flashes green, then fades out. Full transcript is displayed. Project status in sidebar updates to completed.
result: [pending]

### 13. Download Functionality

expected: With completed transcript, click download dropdown. Select "Download All". 3 .docx files download (english, original, combined) without browser blocking.
result: [pending]

### 14. View Project from Sidebar

expected: Click the completed project in sidebar. Center panel shows transcript. Right metadata panel appears with editable fields. Some fields show "Needs info" in amber italic.
result: pass
reported: "Metadata panel looks good so far"

### 15. Edit Metadata Field

expected: Click a "Needs info" field (e.g., Interviewee). Input appears. Type a name, press Enter. Field updates, "Needs info" indicator disappears. Value persists after page refresh.
result: [pending]

### 16. Create Second Project and Rename

expected: Create another project (New Project → upload file → wait for completion or cancel). Double-click the project name in sidebar. Input appears with text selected. Type new name, press Enter. Name updates immediately.
result: [pending]

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
passed: 4
issues: 2
pending: 14
skipped: 2

## Gaps

- truth: "User can upload a file and see transcription progress without losing it"
  status: failed
  reason: "Clicking project in sidebar during active transcription unmounts ProjectPage, killing useTranscription hook. Transcription completes in background but dispatch goes nowhere. Project stuck in 'processing' forever."
  severity: blocker
  test: 8
  root_cause: "Transcription state lives in useTranscription hook inside ProjectPage. When user navigates via sidebar click to /project/{id}, CenterPanel renders TranscriptPanel instead of ProjectPage. Hook unmounts, state lost. Fix 1 (commit e782ace) prevented auto-navigate but not manual sidebar clicks."
  artifacts:
  - path: "src/features/dashboard/components/CenterPanel.tsx"
    issue: "Routes to TranscriptPanel for all non-'new' project IDs, including actively-transcribing ones"
  - path: "src/features/project/ProjectPage.tsx"
    issue: "Transcription state is local to this component, not in a shared context"
    missing:
  - "CenterPanel must render ProjectPage (not TranscriptPanel) for projects in uploading/processing state during the active session"
  - "OR: sidebar click on active-transcription project should navigate to /project/new instead of /project/{id}"

- truth: "Progress stepper shows meaningful progress percentage and time estimate"
  status: failed
  reason: "Progress bar shows stages but no visible percentage fill. Time estimate not updating. Upload too fast to observe locally."
  severity: major
  test: 9
  root_cause: "Needs investigation. ProgressStepper receives progress prop from getUnifiedProgress but bar may not be visually updating. Also time estimate depends on progress > 5% and elapsed > 3s."
  artifacts:
  - path: "src/features/project/components/ProgressStepper.tsx"
    issue: "Bar may not show visual progress — check width style binding"
    missing: []

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

## Known Issues for Next Session

1. **BLOCKER: Sidebar navigation kills transcription** — Need to prevent ProjectPage unmount during active transcription. Best approach: make CenterPanel aware of active transcription state and keep rendering ProjectPage.
2. **MAJOR: Progress bar not showing visual progress** — Investigate ProgressStepper.tsx width style binding.
3. **Dev server: use `npm run dev` not `netlify dev`** — Vite dev proxy handles API routes locally.

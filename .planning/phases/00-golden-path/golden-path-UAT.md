---
status: testing
phase: golden-path (Phases 1-6)
source: 01-03-SUMMARY.md, 02-01-SUMMARY.md, 02-02-SUMMARY.md, 03-01-SUMMARY.md, 03-02-SUMMARY.md, 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-SUMMARY.md, 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md
started: 2026-02-08T17:00:00Z
updated: 2026-02-08T17:45:00Z
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

number: 8
name: Create New Project — File Upload
expected: |
Click "New Project" or navigate to /project/new. File upload UI appears.
Select an audio/video file. Project appears in sidebar immediately with "uploading" status.
awaiting: user response

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
reported: "Upload failed immediately with 'Transcription Failed' error. Console shows proxy-upload returned ERR_EMPTY_RESPONSE. Also CSP blocked blob: URL for media duration extraction ('Could not extract duration'). Progress stepper briefly appeared before error replaced it."
severity: blocker

### 9. Progress Stepper During Transcription

expected: After file upload starts, see a horizontal 4-stage stepper (Uploading → Processing → Transcribing → Complete). Progress bar fills smoothly. Time estimate appears after initial progress ("Estimating..." then "~N min remaining"). Cancel button visible.
result: [pending]

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
issues: 1
pending: 15
skipped: 2

## Gaps

- truth: "User can upload a file and transcription begins with visible progress"
  status: failed
  reason: "Upload failed with ERR_EMPTY_RESPONSE from proxy-upload edge function. CSP also blocked blob: URL for duration extraction. Netlify dev server crashed (WebSocket flood from missing ws: in CSP connect-src)."
  severity: blocker
  test: 8
  root_cause: "Two CSP issues in netlify.toml: (1) missing media-src blob: directive blocked audio duration extraction, (2) missing ws://localhost:\* in connect-src caused Vite HMR WebSocket reconnect flood that crashed netlify dev, which caused proxy-upload to return empty response."
  artifacts:
  - path: "netlify.toml"
    issue: "CSP missing media-src blob: and ws://localhost:\* in connect-src"
    missing:
  - "Add media-src 'self' blob: to CSP"
  - "Add ws://localhost:_ wss://localhost:_ to connect-src"
    debug_session: ""

## Fixes Applied During UAT

### Fix 1: Route swap during transcription (commit e782ace)

**Bug:** CenterPanel swapped from ProjectPage (with ProgressStepper) to TranscriptPanel (spinner only) when handleFileSelected navigated from /project/new to /project/{id}.
**Fix:** Removed navigate from handleFileSelected. Now stays on /project/new during active transcription. Navigates to real project URL on completion/error/cancel.

### Fix 2: CSP updates for dev compatibility (not yet committed)

**Bug:** netlify.toml CSP blocked (1) Vite inline scripts (script-src), (2) blob: URLs for audio duration (media-src), (3) Vite HMR WebSocket (connect-src ws:).
**Fix:** Added 'unsafe-inline' to script-src, media-src 'self' blob:, ws://localhost:_ wss://localhost:_ to connect-src.
**Status:** Edited but not committed. Needs verification that upload works after restart.

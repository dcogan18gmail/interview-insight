# Phase 6: Enhanced Transcription Experience - Context

**Gathered:** 2026-02-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the transcription process visible, controllable, and resilient. Users see transcript segments growing in real-time, can cancel or retry, and don't lose work when the browser closes or crashes mid-transcription. This phase enhances the existing useTranscription hook and transcript display — it does NOT add new transcription features (speaker diarization, translation, etc.).

</domain>

<decisions>
## Implementation Decisions

### Live transcript display

- Claude's discretion on segment arrival animation (fade-in vs instant — pick what feels right)
- Auto-scroll when user is at the bottom; if user has scrolled up, hold position
- Sticky "Jump to latest" pill at bottom of transcript area when user is scrolled away from latest content — clickable to snap back down
- Latest in-progress segment has a subtle pulse/shimmer to indicate it's still being processed
- Completed segments have no special treatment — standard appearance

### Progress & stage indication

- Combo display: horizontal stepper showing discrete stages (Uploading → Processing → Transcribing → Complete) WITH a unified progress bar underneath
- Placement: inline above the transcript content (scrolls away as transcript grows, not sticky)
- Show time estimates (e.g., "~2 min remaining") based on file size and progress
- Completion transition: quick and subtle — bar fills to 100%, brief success indicator, then fades away. No fanfare

### Cancel & retry behavior

- Cancel button lives inline with the progress indicator
- Cancel requires confirmation dialog: "Cancel transcription? Partial results will be saved."
- After cancellation, show both options: partial transcript with "Resume" action AND option to discard and start fresh (re-upload)
- Sidebar shows a subtle visual indicator on projects with incomplete/cancelled transcriptions

### Interruption recovery

- Claude's discretion on recovery notification pattern (banner vs inline message)
- Resume strategy: full re-transcription (reliable), but keep old partial segments visible and dimmed during re-processing — new segments progressively replace old ones
- No auto-detection alert on app launch — the subtle sidebar indicator is sufficient
- Interrupted state revealed when user clicks into the project

### Claude's Discretion

- Segment arrival animation style
- Recovery notification UX pattern (banner vs inline)
- Exact progress stage granularity (how many sub-stages within each major stage)
- Dimming/styling treatment for old partial segments during re-transcription
- Progress bar color and animation

</decisions>

<specifics>
## Specific Ideas

- Progress display should be a combo: stepper with discrete named stages + unified progress bar — "best of both worlds"
- Cancel/retry should offer both paths: resume with partial data OR discard and start fresh — "have our cake and eat it too"
- Re-transcription approach: full re-upload for reliability, but old partial segments remain visible (dimmed) during re-processing so user has context to read
- All indicators and transitions should be subtle — the recurring theme was "option 1 but make it subtle/quick/no fanfare"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 06-enhanced-transcription-experience_
_Context gathered: 2026-02-07_

# Phase 6: Enhanced Transcription Experience - Research

**Researched:** 2026-02-08
**Domain:** Real-time transcript display, progress UX, cancellation, and interruption recovery
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Live transcript display:**
  - Claude's discretion on segment arrival animation (fade-in vs instant -- pick what feels right)
  - Auto-scroll when user is at the bottom; if user has scrolled up, hold position
  - Sticky "Jump to latest" pill at bottom of transcript area when user is scrolled away from latest content -- clickable to snap back down
  - Latest in-progress segment has a subtle pulse/shimmer to indicate it's still being processed
  - Completed segments have no special treatment -- standard appearance

- **Progress & stage indication:**
  - Combo display: horizontal stepper showing discrete stages (Uploading -> Processing -> Transcribing -> Complete) WITH a unified progress bar underneath
  - Placement: inline above the transcript content (scrolls away as transcript grows, not sticky)
  - Show time estimates (e.g., "~2 min remaining") based on file size and progress
  - Completion transition: quick and subtle -- bar fills to 100%, brief success indicator, then fades away. No fanfare

- **Cancel & retry behavior:**
  - Cancel button lives inline with the progress indicator
  - Cancel requires confirmation dialog: "Cancel transcription? Partial results will be saved."
  - After cancellation, show both options: partial transcript with "Resume" action AND option to discard and start fresh (re-upload)
  - Sidebar shows a subtle visual indicator on projects with incomplete/cancelled transcriptions

- **Interruption recovery:**
  - Claude's discretion on recovery notification pattern (banner vs inline message)
  - Resume strategy: full re-transcription (reliable), but keep old partial segments visible and dimmed during re-processing -- new segments progressively replace old ones
  - No auto-detection alert on app launch -- the subtle sidebar indicator is sufficient
  - Interrupted state revealed when user clicks into the project

### Claude's Discretion

- Segment arrival animation style
- Recovery notification UX pattern (banner vs inline)
- Exact progress stage granularity (how many sub-stages within each major stage)
- Dimming/styling treatment for old partial segments during re-transcription
- Progress bar color and animation

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope

</user_constraints>

## Summary

Phase 6 transforms the transcription process from a "wait and hope" black box into a visible, controllable, resilient experience. The existing `useTranscription` hook and `geminiService` already do streaming transcription in a multi-loop architecture (prompt Gemini, parse JSONL segments from stream, accumulate, re-prompt for continuation). Phase 6 wraps this with: (1) a live-scrolling transcript display that shows segments arriving in real-time, (2) a multi-stage progress indicator with time estimation, (3) cancel/retry via AbortController, and (4) localStorage-based partial result persistence for crash recovery.

The codebase is well-structured for this enhancement. The `useTranscription` hook already dispatches `PROGRESS` events with each segment, `storageService` already has debounced writes and safe read/write infrastructure, and the `@google/genai` SDK (v1.30.0 installed) natively supports `abortSignal` in `GenerateContentConfig`. The key technical challenge is threading an AbortController through the multi-loop `generateTranscript` function while also debounce-flushing partial segments to localStorage at each progress callback.

**Primary recommendation:** Extend the existing `useTranscription` state machine with `cancelling` and `cancelled` states, pass an AbortController signal through to `geminiService`, add debounced localStorage persistence of partial segments via the existing `storageService` infrastructure, and build the UI layer (progress stepper, live transcript, jump-to-latest pill) as new components that compose with the existing `TranscriptView` rendering pattern. No new libraries are required for core functionality; `react-intersection-observer` (2.3 kB gzipped) is recommended for the auto-scroll anchor detection.

## Standard Stack

### Core

| Library       | Version | Purpose                                                           | Why Standard                                                 |
| ------------- | ------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| React         | 18.3.1  | UI framework (already installed)                                  | Project foundation                                           |
| @google/genai | 1.30.0  | Gemini streaming API with AbortSignal support (already installed) | Has native `config.abortSignal` field                        |
| Tailwind CSS  | 3.4.18  | Styling and animations (already installed)                        | Project design system, has `animate-pulse`, custom keyframes |

### Supporting

| Library                     | Version | Purpose                                      | When to Use                                    |
| --------------------------- | ------- | -------------------------------------------- | ---------------------------------------------- |
| react-intersection-observer | 9.x     | `useInView` hook for scroll anchor detection | Auto-scroll / "Jump to latest" pill visibility |

### Alternatives Considered

| Instead of                  | Could Use                            | Tradeoff                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| react-intersection-observer | Raw IntersectionObserver API         | react-intersection-observer is 2.3 kB gzipped, handles ref management and cleanup automatically, widely used. Raw API adds boilerplate for ref cleanup and threshold management. Recommend the library for reliability. |
| Custom scroll detection     | scroll event + getBoundingClientRect | IntersectionObserver is more performant (no layout thrash), especially during rapid segment arrival. Scroll events fire too frequently and require throttling.                                                          |
| External progress library   | Custom Tailwind components           | No library needed. Tailwind's `transition-all`, custom keyframes, and utility classes handle stepper + progress bar cleanly.                                                                                            |

**Installation:**

```bash
npm install react-intersection-observer
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  features/project/
    hooks/
      useTranscription.ts          # MODIFY: Add cancel, new states, AbortController
      useAutoScroll.ts             # NEW: Auto-scroll + "jump to latest" logic
    components/
      LoadingState.tsx             # REPLACE: New progress stepper + bar
      TranscriptView.tsx           # MODIFY: Support live-growing mode
      LiveTranscriptView.tsx       # NEW: Wraps TranscriptView with auto-scroll + jump pill
      ProgressStepper.tsx          # NEW: Stage stepper + progress bar combo
      CancelConfirmDialog.tsx      # NEW: Cancel confirmation (reuse ConfirmDialog pattern)
  services/
    geminiService.ts              # MODIFY: Accept AbortSignal, propagate to SDK
    storageService.ts             # MINOR: May add helpers for partial transcript state
    storageService.types.ts       # MODIFY: Add 'cancelled' to ProjectStatus, partial transcript metadata
  features/dashboard/components/
    ProjectEntry.tsx              # MODIFY: Add subtle indicator for incomplete/cancelled
    Sidebar.tsx                   # NO CHANGE (ProjectEntry handles indicator)
```

### Pattern 1: AbortController Threading Through Multi-Loop Transcription

**What:** The `generateTranscript` function runs in a while-loop, making multiple `generateContentStream` calls. An AbortController must be checked at each loop iteration AND passed to each SDK streaming call.

**When to use:** Any time a long-running async process has multiple sequential network calls.

**Example:**

```typescript
// In geminiService.ts
export const generateTranscript = async (
  apiKey: string,
  fileUri: string,
  mimeType: string,
  durationSeconds: number,
  onProgress: (percentage: number, segment: TranscriptSegment | null) => void,
  signal?: AbortSignal // NEW parameter
): Promise<TranscriptSegment[]> => {
  // ...existing setup...

  while (!isComplete && loopCount < MAX_LOOPS) {
    // Check abort before each iteration
    if (signal?.aborted) {
      throw new DOMException('Transcription cancelled', 'AbortError');
    }

    // Pass signal to SDK via config
    const stream = await aiClient.models.generateContentStream({
      model: MODEL_NAME,
      contents: {
        parts: [{ fileData: { fileUri, mimeType } }, { text: promptText }],
      },
      config: {
        maxOutputTokens: 65536,
        temperature: 0.3,
        abortSignal: signal, // SDK-native abort support
      },
    });

    for await (const chunk of stream) {
      if (signal?.aborted) {
        throw new DOMException('Transcription cancelled', 'AbortError');
      }
      // ...existing chunk processing...
    }
  }
};
```

**Key insight from SDK types (verified in installed `@google/genai@1.30.0`):**

```typescript
// From node_modules/@google/genai/dist/genai.d.ts line 2884-2890
export declare interface GenerateContentConfig {
  abortSignal?: AbortSignal;
  // NOTE: AbortSignal is a client-only operation. Using it to cancel an
  // operation will not cancel the request in the service. You will still
  // be charged usage for any applicable operations.
}
```

### Pattern 2: Upload Cancellation via Fetch AbortSignal

**What:** The `uploadFile` function uses `fetch()` for chunked upload. The `fetch` API natively supports AbortSignal via the `signal` option.

**When to use:** Cancelling file uploads in progress.

**Example:**

```typescript
// In geminiService.ts uploadFile
export const uploadFile = async (
  apiKey: string,
  file: File,
  onUploadProgress: (progress: number) => void,
  signal?: AbortSignal // NEW parameter
): Promise<string> => {
  // Pass signal to each fetch call
  const response = await fetch('/api/gemini-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Gemini-Key': apiKey },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      mimeType: file.type,
    }),
    signal, // Native fetch abort support
  });

  // ...in the upload loop...
  const proxyResponse = await fetch('/proxy-upload', {
    method: 'PUT',
    headers: {
      /* ...existing headers... */
    },
    body: arrayBuffer,
    signal, // Abort chunk upload too
  });
};
```

### Pattern 3: State Machine Extension for Cancel/Cancelled States

**What:** Extend the existing TRANSITIONS map with `cancelling` and `cancelled` states.

**When to use:** When adding new lifecycle states to an existing state machine.

**Example:**

```typescript
// Extended TranscriptionState
export type TranscriptionState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'cancelling' // NEW: abort signal sent, waiting for cleanup
  | 'cancelled' // NEW: cancellation complete, partial results saved
  | 'completed'
  | 'error';

// Extended TRANSITIONS map
const TRANSITIONS: Record<
  TranscriptionState,
  Partial<Record<TranscriptionEvent['type'], TranscriptionState>>
> = {
  idle: { START: 'uploading' },
  uploading: {
    UPLOAD_COMPLETE: 'processing',
    ERROR: 'error',
    PROGRESS: 'uploading',
    CANCEL: 'cancelling',
  },
  processing: {
    PROCESSING_COMPLETE: 'completed',
    ERROR: 'error',
    PROGRESS: 'processing',
    CANCEL: 'cancelling',
  },
  cancelling: { CANCELLED: 'cancelled', ERROR: 'error' },
  cancelled: { RESET: 'idle', RESUME: 'uploading' }, // Resume = full re-transcription
  completed: { RESET: 'idle' },
  error: { RESET: 'idle' },
};
```

### Pattern 4: Debounced Partial Segment Persistence

**What:** Flush accumulated segments to localStorage periodically during streaming, using the existing debounced write infrastructure.

**When to use:** When data arrives incrementally and must survive browser crashes.

**Example:**

```typescript
// In useTranscription.ts - enhanced startTranscription
// After each PROGRESS dispatch that includes a new segment:
const accumulatedSegments: TranscriptSegment[] = [];

const onSegmentProgress = (
  percentage: number,
  segment: TranscriptSegment | null
) => {
  if (segment) {
    accumulatedSegments.push(segment);
  }
  dispatch({ type: 'PROGRESS', percentage, segment });

  // Debounced flush to localStorage (every ~300ms via existing saveTranscript)
  if (projectId && accumulatedSegments.length > 0) {
    saveTranscript({
      projectId,
      segments: [...accumulatedSegments],
      completedAt: null, // null = incomplete
    });
  }
};
```

**Key detail:** `saveTranscript` in `storageService.ts` currently does an immediate write. For debounced partial saves, we should add a `debouncedSaveTranscript` variant that uses the existing `debouncedWrite` infrastructure, or call `saveTranscript` less frequently (e.g., every N segments or on a timer).

### Pattern 5: Auto-Scroll with IntersectionObserver Anchor

**What:** Place an invisible sentinel element at the bottom of the transcript scroll container. Use IntersectionObserver to detect when the sentinel is visible. Auto-scroll only when sentinel is in view (user is at bottom). Show "Jump to latest" pill when sentinel is out of view.

**When to use:** Any scrollable container with dynamically growing content.

**Example:**

```typescript
// useAutoScroll.ts
import { useRef, useCallback, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

export function useAutoScroll() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { ref: sentinelRef, inView: isAtBottom } = useInView({
    threshold: 0,
  });

  const scrollToBottom = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: scrollContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  // Auto-scroll when new content arrives AND user is at bottom
  const onNewContent = useCallback(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [isAtBottom, scrollToBottom]);

  return {
    scrollContainerRef,
    sentinelRef, // Attach to invisible div at bottom of content
    isAtBottom, // Controls "Jump to latest" visibility
    scrollToBottom,
    onNewContent,
  };
}
```

### Pattern 6: Time Estimation Based on File Duration and Progress

**What:** Estimate remaining time using audio duration and current transcription progress. AI transcription of audio typically processes at approximately 1-3 minutes per hour of audio.

**When to use:** Displaying "~X min remaining" estimates.

**Example:**

```typescript
function estimateRemainingTime(
  durationSeconds: number,
  progressPercent: number,
  elapsedMs: number
): string | null {
  if (progressPercent < 5 || elapsedMs < 3000) return null; // Too early to estimate

  const remainingPercent = 100 - progressPercent;
  const msPerPercent = elapsedMs / progressPercent;
  const remainingMs = remainingPercent * msPerPercent;
  const remainingMinutes = Math.ceil(remainingMs / 60000);

  if (remainingMinutes <= 1) return '< 1 min remaining';
  return `~${remainingMinutes} min remaining`;
}
```

### Anti-Patterns to Avoid

- **Anti-pattern: Scroll event listener for auto-scroll detection.** Scroll events fire at 60+ fps during scrolling and cause layout thrashing when checking scroll position. Use IntersectionObserver instead -- it's async and batched by the browser.

- **Anti-pattern: Saving to localStorage on every single segment.** With rapid segment arrival during streaming, this can cause performance issues (localStorage.setItem is synchronous and blocks the main thread). Debounce saves to every 300ms or every N segments.

- **Anti-pattern: Creating a new AbortController on every render.** Store the AbortController in a `useRef` so it persists across renders without triggering re-renders. Create a new one at the start of each transcription.

- **Anti-pattern: Using `scrollIntoView` on the last segment element.** This can cause jarring jumps when segments are added rapidly. Use `scrollTo` with `behavior: 'smooth'` on the container instead, targeting `scrollHeight`.

- **Anti-pattern: Treating AbortError as a real error.** When catching errors after cancel, check `error.name === 'AbortError'` and handle it as a normal cancellation flow, not an error state.

## Don't Hand-Roll

| Problem                       | Don't Build                               | Use Instead                                             | Why                                                                                                                                           |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Scroll position detection     | Manual scroll event + offset calculations | `react-intersection-observer` `useInView`               | Handles observer lifecycle, ref management, threshold config, cleanup. Manual approach causes layout thrashing.                               |
| Abort signal threading        | Custom boolean flag checked in loops      | Native `AbortController` + `AbortSignal`                | Built into browser, fetch, and @google/genai SDK. Signal propagates through entire call chain automatically.                                  |
| Confirmation dialog           | New dialog from scratch                   | Reuse existing `ConfirmDialog` component                | Already exists at `src/features/dashboard/components/ConfirmDialog.tsx` with proper `<dialog>` element, Escape handling, and variant styling. |
| Debounced localStorage writes | Custom debounce for transcript saves      | Existing `storageService.debouncedWrite` infrastructure | Already implemented with timer management and `beforeunload` flush.                                                                           |

**Key insight:** The existing codebase already has most of the infrastructure needed. The main additions are new states in the state machine, AbortController plumbing, and new UI components. Very little "foundational" work is required.

## Common Pitfalls

### Pitfall 1: AbortError Propagation Through Multi-Loop Architecture

**What goes wrong:** The `generateTranscript` function has nested try/catch blocks (outer loop try/catch + inner chunk try/catch). An AbortError thrown inside the `for await` loop gets caught by the inner `catch (innerError)` block, which currently retries on error. This would cause the cancellation to be retried instead of propagated.

**Why it happens:** The existing retry logic treats all inner errors the same way, incrementing retryCount.

**How to avoid:** Add explicit AbortError detection at the top of the inner catch block:

```typescript
catch (innerError) {
  if (innerError instanceof DOMException && innerError.name === 'AbortError') {
    throw innerError; // Propagate cancellation, don't retry
  }
  // ...existing retry logic...
}
```

**Warning signs:** Cancel button appears to work but transcription continues in the background.

### Pitfall 2: Stale Segments After Cancel + Resume

**What goes wrong:** User cancels at segment 50, partial segments saved. User hits "Resume" which triggers full re-transcription. Old segments (1-50) and new segments (1-50) both exist in state, creating duplicates.

**Why it happens:** Resume doesn't clear old segments before starting re-transcription.

**How to avoid:** The user decision says "keep old partial segments visible and dimmed during re-processing -- new segments progressively replace old ones." Implementation: keep old segments in a separate `staleSegments` array for display. As new segments arrive with matching timestamps, remove the corresponding stale segment. When re-transcription completes, discard any remaining stale segments.

**Warning signs:** Duplicate text appearing in the transcript.

### Pitfall 3: localStorage Quota Exceeded During Partial Saves

**What goes wrong:** Long transcriptions accumulate many segments. Debounced saves write the full segment array each time, potentially hitting the ~5MB localStorage limit.

**Why it happens:** Each partial save serializes ALL accumulated segments, not just new ones.

**How to avoid:** The existing `safeWrite` already returns `{ ok: false, error: 'quota_exceeded' }`. Check this result in the debounced save callback and either: (a) reduce save frequency, (b) warn the user, or (c) trim old segments from storage. The existing `saveTranscript` already handles quota errors gracefully.

**Warning signs:** Console warnings about quota, segments not persisting.

### Pitfall 4: Race Condition Between Cancel and Completion

**What goes wrong:** User clicks cancel right as the last chunk arrives. The state machine receives both CANCEL and PROCESSING_COMPLETE events in rapid succession, potentially ending in an inconsistent state.

**Why it happens:** Async operations can complete between the time cancel is requested and the abort signal propagates.

**How to avoid:** The TRANSITIONS map prevents this by design -- `cancelling` state only allows `CANCELLED` and `ERROR` transitions. Once in `cancelling`, a `PROCESSING_COMPLETE` event is silently ignored (no-op). Ensure the cancel flow sets state to `cancelling` synchronously BEFORE calling `abortController.abort()`.

**Warning signs:** State machine stuck in `cancelling` without transitioning to `cancelled`.

### Pitfall 5: Progress Bar Jumping Backwards

**What goes wrong:** Gemini's multi-loop architecture means each loop resets progress. Segment timestamps from a new loop iteration may be lower than the previous loop's last timestamp (due to overlap detection starting before the previous endpoint).

**Why it happens:** The existing code calculates progress as `(segment.timestamp / durationSeconds) * 100`. If a new loop restarts from a slightly earlier timestamp, progress decreases.

**How to avoid:** Track a `maxProgressSoFar` value and never report progress below it:

```typescript
let maxProgress = 0;
const percentage = Math.max(maxProgress, calculatedPercentage);
maxProgress = percentage;
```

**Warning signs:** Progress bar visibly jumping from e.g., 45% back to 40%.

### Pitfall 6: Scroll Jump When "Jump to Latest" Clicked During Rapid Arrivals

**What goes wrong:** User clicks "Jump to latest", smooth scroll begins, but new segments arrive during the scroll animation, pushing the target further down. Scroll never catches up.

**Why it happens:** `scrollTo({ behavior: 'smooth' })` animates to a fixed target. New content added during animation changes `scrollHeight`.

**How to avoid:** After clicking "Jump to latest", briefly set a flag that forces `scrollTo` (with `behavior: 'instant'` or repeated calls) until the sentinel re-enters the viewport. Alternatively, use `behavior: 'instant'` for the jump-to-latest action and reserve `'smooth'` only for auto-scroll on new content arrival.

**Warning signs:** "Jump to latest" pill flickers or doesn't stay dismissed after click.

## Code Examples

### Verified: AbortSignal in @google/genai GenerateContentConfig

```typescript
// Source: Verified in installed node_modules/@google/genai/dist/genai.d.ts (v1.30.0), line 2881-2890
export declare interface GenerateContentConfig {
  httpOptions?: HttpOptions;
  /** Abort signal which can be used to cancel the request.
     NOTE: AbortSignal is a client-only operation. Using it to cancel an
     operation will not cancel the request in the service. You will still
     be charged usage for any applicable operations. */
  abortSignal?: AbortSignal;
  systemInstruction?: ContentUnion;
  temperature?: number;
  // ...other fields...
}
```

### Verified: Fetch API AbortSignal Support

```typescript
// Source: MDN Web API standard, supported in all modern browsers
const controller = new AbortController();

const response = await fetch(url, {
  method: 'POST',
  body: data,
  signal: controller.signal, // Native support
});

// To cancel:
controller.abort();
// fetch() rejects with DOMException { name: 'AbortError' }
```

### Verified: useInView from react-intersection-observer

```typescript
// Source: https://www.npmjs.com/package/react-intersection-observer
import { useInView } from 'react-intersection-observer';

function Component() {
  const { ref, inView } = useInView({ threshold: 0 });
  // inView === true when the element with ref is visible in viewport
  return <div ref={ref}>{inView ? 'Visible' : 'Not visible'}</div>;
}
```

### Verified: Existing ConfirmDialog API

```typescript
// Source: src/features/dashboard/components/ConfirmDialog.tsx
// Reusable for cancel confirmation with these props:
<ConfirmDialog
  open={showCancelConfirm}
  title="Cancel Transcription"
  message="Cancel transcription? Partial results will be saved."
  confirmLabel="Cancel Transcription"
  cancelLabel="Keep Going"
  variant="danger"
  onConfirm={handleConfirmCancel}
  onCancel={() => setShowCancelConfirm(false)}
/>
```

### Verified: Existing Debounced Write Infrastructure

```typescript
// Source: src/services/storageService.ts lines 456-504
// Already implemented: debounced batched writes with 300ms delay
// Already has beforeunload flush for crash safety
// saveProject(project, immediate=false) uses debounced writes by default
// Can model partial transcript saves on the same pattern
```

### Tailwind Shimmer/Pulse Animation for In-Progress Segment

```typescript
// Custom keyframe in tailwind.config.js or index.css
// For the "latest in-progress segment has a subtle pulse/shimmer"
@keyframes shimmer {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
}

// Or use Tailwind's built-in: className="animate-pulse" (fades 0->100% opacity)
// Recommendation: Use animate-pulse for simplicity, it's already available in Tailwind
```

### Horizontal Stepper + Progress Bar Combo

```tsx
// Stepper stages
const STAGES = ['Uploading', 'Processing', 'Transcribing', 'Complete'] as const;

function ProgressStepper({ currentStage, progress, timeEstimate }: Props) {
  return (
    <div className="space-y-3">
      {/* Stage stepper */}
      <div className="flex items-center justify-between">
        {STAGES.map((stage, i) => (
          <div key={stage} className="flex items-center">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                i < currentStageIndex
                  ? 'bg-indigo-600'
                  : i === currentStageIndex
                    ? 'animate-pulse bg-indigo-600'
                    : 'bg-slate-200'
              }`}
            />
            <span
              className={`ml-1.5 text-xs ${
                i <= currentStageIndex
                  ? 'font-medium text-indigo-700'
                  : 'text-slate-400'
              }`}
            >
              {stage}
            </span>
            {i < STAGES.length - 1 && (
              <div
                className={`mx-2 h-px w-8 ${
                  i < currentStageIndex ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Unified progress bar underneath */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-indigo-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time estimate + Cancel button row */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{timeEstimate ?? 'Estimating...'}</span>
        <button className="text-slate-400 transition-colors hover:text-red-500">
          Cancel
        </button>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach                           | Current Approach                                                   | When Changed                          | Impact                                                              |
| -------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------- |
| Custom boolean flags for cancellation  | `AbortController` / `AbortSignal` propagated through fetch and SDK | Browser standard, @google/genai v1.x+ | Signal propagates automatically through the entire call chain       |
| Scroll event listeners for auto-scroll | IntersectionObserver via `useInView` hook                          | Widely adopted 2022+                  | No layout thrashing, async batched, performant during rapid updates |
| `@google/generative-ai` (deprecated)   | `@google/genai` (current)                                          | 2024-2025 migration                   | New SDK has `config.abortSignal`, unified models API                |

**Deprecated/outdated:**

- `@google/generative-ai` package: Deprecated in favor of `@google/genai`. The project already uses the current SDK.
- `element.scrollIntoView()` for chat auto-scroll: Unreliable during rapid content addition. Container `scrollTo` with IntersectionObserver anchor is the current standard.

## Gemini API Resumability (Phase 6 Blocker Resolution)

**Blocker question:** "Need to verify whether Gemini's Files API supports resuming partial transcriptions mid-stream."

**Answer: Gemini does NOT support mid-stream transcription resume.** The `abortSignal` is described as a "client-only operation" in the SDK types -- it stops the client from reading the stream but does not pause or checkpoint the server-side generation. There is no server-side session ID, checkpoint, or continuation token for `generateContentStream`.

**However, the file URI persists for 48 hours** after upload. This means:

- Upload does NOT need to be repeated for retry/resume (as long as within 48 hours)
- Re-transcription must start from scratch (new `generateContentStream` call)
- The existing multi-loop architecture already handles "start from timestamp X" -- this can be leveraged

**Impact on recovery strategy:** The user decision of "full re-transcription (reliable)" is well-aligned with API capabilities. For resume after cancel/crash:

1. If within the same session and fileUri is available: skip upload, re-transcribe from beginning
2. If fileUri is lost (browser closed, 48h expired): full re-upload + re-transcribe
3. Old partial segments shown dimmed during re-processing (as decided)

**Confidence: HIGH** -- verified from installed SDK type definitions and official API documentation.

## Open Questions

1. **File URI persistence across page reloads**
   - What we know: Gemini file URIs persist for 48 hours server-side. The current code stores the fileUri only in the hook's closure (lost on reload).
   - What's unclear: Whether to persist the fileUri in localStorage alongside the partial transcript for resume-without-re-upload.
   - Recommendation: Store fileUri in TranscriptData or ProjectMetadata. On resume, first check if the stored fileUri is still valid (Gemini files.get), then either reuse it or re-upload. This avoids unnecessary re-uploads for crash recovery within 48h.

2. **Exact staging of progress bar across upload + transcription**
   - What we know: Upload progress is 0-100% of bytes. Transcription progress is 0-100% of duration. Combined progress needs unified 0-100%.
   - What's unclear: Exact weighting between stages for the unified bar.
   - Recommendation: Weight by typical time distribution. For a 100MB file: upload ~30% of total time, transcription ~70%. Map: Upload=0-25%, Processing(model init)=25-30%, Transcribing=30-95%, Complete=95-100%. The stepper shows which stage; the bar shows overall. Fine-tune weights based on file size (larger files = more upload weight).

3. **How to store the original File object for resume**
   - What we know: `File` objects cannot be serialized to localStorage. If the user cancels and wants to "Resume" in the same session, the File is still in memory. If the page reloads, the File is lost.
   - What's unclear: Whether "Resume" after page reload should require re-selecting the file.
   - Recommendation: For same-session resume, keep File reference in hook state. For cross-session resume, the fileUri approach (point 1) eliminates the need for the File object -- re-transcription uses the already-uploaded fileUri. If fileUri is expired, show "Re-upload required" message.

## Discretion Recommendations

### Segment Arrival Animation: Fade-in

**Recommendation:** Use a subtle `opacity: 0 -> 1` fade-in over 200ms for each new segment. This is less jarring than instant appearance during rapid arrivals, but fast enough to not feel laggy. Tailwind: `animate-fade-in` with a custom shorter duration (200ms vs the existing 500ms).

**Rationale:** The existing codebase already has `@keyframes fadeIn` in `index.css`. We can add a faster variant (`animate-fade-in-fast`) specifically for segments, keeping the existing animation for other UI elements.

### Recovery Notification: Inline Message

**Recommendation:** Use an inline message within the transcript area, not a banner. When the user navigates to a project with interrupted/cancelled transcription, show a card at the top of the transcript area with the partial segments below it, dimmed. The card says something like: "Transcription was interrupted. 47 segments recovered." with "Resume" and "Discard & Re-upload" buttons.

**Rationale:** The user specifically said "No auto-detection alert on app launch -- the subtle sidebar indicator is sufficient. Interrupted state revealed when user clicks into the project." An inline message fits this perfectly -- it's visible only when viewing the project, not a global notification.

### Progress Stage Granularity: 4 Major Stages

**Recommendation:** Keep the 4 stages from the user decision: Uploading, Processing, Transcribing, Complete. No sub-stages within each. The progress bar provides continuous granularity within each stage; the stepper just shows which phase you're in.

**Rationale:** More stages would make the stepper feel cluttered. The time estimate ("~2 min remaining") provides the detailed granularity users want.

### Dimming Treatment for Stale Partial Segments

**Recommendation:** Apply `opacity-40` to stale segments during re-transcription, with a subtle `text-slate-400` override. As fresh segments arrive with matching or later timestamps, crossfade the stale segment out and the new one in.

**Rationale:** Opacity 40% is readable if the user wants to glance at old content, but clearly distinguishable from fresh content. The crossfade transition (stale fades out as fresh fades in) makes the replacement smooth.

### Progress Bar Color and Animation

**Recommendation:** Use `bg-indigo-600` for the progress fill (matches existing design system color). Add a subtle animated gradient shimmer on the leading edge of the bar while actively progressing, similar to the OS-level progress bars users are familiar with. On completion, briefly flash `bg-green-500` for 1 second, then fade away.

**Rationale:** Indigo is the project's accent color (used throughout for buttons, badges, highlights). Green briefly signals success without fanfare.

## Sources

### Primary (HIGH confidence)

- Installed `@google/genai@1.30.0` type definitions (`node_modules/@google/genai/dist/genai.d.ts`) -- AbortSignal support, GenerateContentConfig interface, generateContentStream signature
- Existing codebase files (verified by reading): `useTranscription.ts`, `geminiService.ts`, `storageService.ts`, `storageService.types.ts`, `ProjectPage.tsx`, `LoadingState.tsx`, `TranscriptView.tsx`, `Sidebar.tsx`, `ProjectEntry.tsx`, `ConfirmDialog.tsx`, `CenterPanel.tsx`, `TranscriptPanel.tsx`
- [Gemini Files API documentation](https://ai.google.dev/gemini-api/docs/files) -- file retention (48h), resumable uploads, file URI reuse
- [MDN AbortSignal documentation](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) -- standard AbortController/AbortSignal API
- [react-intersection-observer npm](https://www.npmjs.com/package/react-intersection-observer) -- useInView hook API, 2.3 kB gzipped

### Secondary (MEDIUM confidence)

- [Tailwind CSS animation docs](https://tailwindcss.com/docs/animation) -- built-in animate-pulse, custom keyframes extension pattern
- [Chat scroll anchor pattern](https://tuffstuff9.hashnode.dev/intuitive-scrolling-for-chatbot-message-streaming) -- IntersectionObserver-based auto-scroll for streaming chat
- [AI transcription processing times](https://brasstranscripts.com/blog/how-long-does-ai-transcription-take-real-processing-times) -- 1-3 min per hour baseline for time estimation
- [AbortController in React patterns](https://www.j-labs.pl/en/tech-blog/how-to-use-the-useeffect-hook-with-the-abortcontroller/) -- useRef storage, cleanup patterns

### Tertiary (LOW confidence)

- None -- all critical claims verified against installed SDK types or primary documentation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- No new libraries needed except optional react-intersection-observer. All core work uses existing installed packages.
- Architecture: HIGH -- Existing codebase patterns (state machine, storageService, ConfirmDialog) directly support the required features. Verified SDK AbortSignal support in installed types.
- Pitfalls: HIGH -- Based on direct code analysis of the existing multi-loop generateTranscript architecture and state machine pattern.
- Gemini API resumability: HIGH -- Verified from installed SDK types that abortSignal is "client-only" and from API docs that file URIs persist 48h.

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable -- no fast-moving dependencies)

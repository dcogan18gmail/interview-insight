import { useCallback, useReducer, useRef } from 'react';
import { TranscriptSegment } from '@/types';
import { getDecryptedKey } from '@/services/cryptoService';
import { uploadFile, generateTranscript } from '@/services/geminiService';
import {
  debouncedSaveTranscript,
  flushPendingWrites,
} from '@/services/storageService';

// --- State Types ---

export type TranscriptionState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'cancelling'
  | 'cancelled'
  | 'completed'
  | 'error';

type TranscriptionEvent =
  | { type: 'START' }
  | { type: 'UPLOAD_COMPLETE'; fileUri: string }
  | { type: 'PROCESSING_COMPLETE'; transcript: TranscriptSegment[] }
  | { type: 'ERROR'; error: string }
  | { type: 'PROGRESS'; percentage: number; segment: TranscriptSegment | null }
  | { type: 'RESET' }
  | { type: 'CANCEL' }
  | { type: 'CANCELLED'; segments: TranscriptSegment[] }
  | { type: 'RESUME' };

interface TranscriptionMachineState {
  state: TranscriptionState;
  progress: number;
  currentSegment: TranscriptSegment | null;
  transcript: TranscriptSegment[];
  error: string | null;
  fileUri: string | null;
  staleSegments: TranscriptSegment[];
}

// --- Transition Map ---

/**
 * TRANSITIONS defines valid state transitions.
 * Each key is a current state, each value maps event types to the next state.
 * Events not listed for a state are ignored (no-op).
 */
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
  cancelled: { RESET: 'idle', RESUME: 'uploading' },
  completed: { RESET: 'idle' },
  error: { RESET: 'idle' },
};

// --- Reducer ---

const initialState: TranscriptionMachineState = {
  state: 'idle',
  progress: 0,
  currentSegment: null,
  transcript: [],
  error: null,
  fileUri: null,
  staleSegments: [],
};

function transcriptionReducer(
  current: TranscriptionMachineState,
  event: TranscriptionEvent
): TranscriptionMachineState {
  const nextState = TRANSITIONS[current.state]?.[event.type];

  // If no valid transition exists, return current state unchanged
  if (!nextState) {
    return current;
  }

  switch (event.type) {
    case 'START':
      return {
        ...initialState,
        state: 'uploading',
        staleSegments: [],
      };

    case 'UPLOAD_COMPLETE':
      return {
        ...current,
        state: 'processing',
        progress: 0,
        fileUri: event.fileUri,
      };

    case 'PROGRESS':
      return {
        ...current,
        progress: event.percentage,
        currentSegment: event.segment ?? current.currentSegment,
        // Accumulate segments into transcript array as they arrive
        transcript:
          event.segment !== null
            ? [...current.transcript, event.segment]
            : current.transcript,
      };

    case 'PROCESSING_COMPLETE':
      return {
        ...current,
        state: 'completed',
        progress: 100,
        transcript: event.transcript,
        staleSegments: [],
      };

    case 'ERROR':
      return {
        ...current,
        state: 'error',
        error: event.error,
      };

    case 'RESET':
      return { ...initialState };

    case 'CANCEL':
      return {
        ...current,
        state: 'cancelling',
      };

    case 'CANCELLED':
      return {
        ...current,
        state: 'cancelled',
        transcript: event.segments,
      };

    case 'RESUME':
      return {
        ...current,
        state: 'uploading',
        staleSegments: current.transcript,
        transcript: [],
        progress: 0,
        currentSegment: null,
        error: null,
      };

    default:
      return current;
  }
}

// --- Hook ---

interface UseTranscriptionReturn {
  machineState: TranscriptionMachineState;
  startTranscription: (
    file: File,
    mimeType: string,
    duration: number,
    projectId: string
  ) => Promise<void>;
  cancel: () => void;
  resume: (
    file: File,
    mimeType: string,
    duration: number,
    projectId: string
  ) => Promise<void>;
  reset: () => void;
}

export function useTranscription(): UseTranscriptionReturn {
  const [machineState, dispatch] = useReducer(
    transcriptionReducer,
    initialState
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  const startTranscription = useCallback(
    async (
      file: File,
      mimeType: string,
      duration: number,
      projectId: string
    ) => {
      // Create new AbortController for this transcription session
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const { signal } = abortController;

      dispatch({ type: 'START' });

      // Track accumulated segments locally (avoids stale closure over machineState)
      const accumulatedSegments: TranscriptSegment[] = [];

      try {
        // Decrypt API key from storage
        const apiKey = await getDecryptedKey();
        if (!apiKey) {
          throw new Error(
            'No API key configured. Please add your Gemini API key in Settings.'
          );
        }

        // Upload phase
        const fileUri = await uploadFile(
          apiKey,
          file,
          (percentage: number) => {
            dispatch({ type: 'PROGRESS', percentage, segment: null });
          },
          signal
        );

        dispatch({ type: 'UPLOAD_COMPLETE', fileUri });

        // Transcription phase
        const transcript = await generateTranscript(
          apiKey,
          fileUri,
          mimeType,
          duration,
          (percentage: number, segment: TranscriptSegment | null) => {
            if (segment) {
              accumulatedSegments.push(segment);
            }
            dispatch({ type: 'PROGRESS', percentage, segment });

            // Debounced flush of partial segments to localStorage
            if (accumulatedSegments.length > 0) {
              debouncedSaveTranscript({
                projectId,
                segments: [...accumulatedSegments],
                completedAt: null,
                fileUri,
              });
            }
          },
          signal
        );

        dispatch({ type: 'PROCESSING_COMPLETE', transcript });
      } catch (err) {
        // Handle cancellation as a normal flow, not an error
        if (err instanceof DOMException && err.name === 'AbortError') {
          dispatch({
            type: 'CANCELLED',
            segments: [...accumulatedSegments],
          });
          // Flush any pending writes immediately on cancellation
          flushPendingWrites();
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : 'An error occurred during transcription.';
        dispatch({ type: 'ERROR', error: message });
      }
    },
    []
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      dispatch({ type: 'CANCEL' });
      abortControllerRef.current.abort();
    }
  }, []);

  const resume = useCallback(
    async (
      file: File,
      mimeType: string,
      duration: number,
      projectId: string
    ) => {
      dispatch({ type: 'RESUME' });
      await startTranscription(file, mimeType, duration, projectId);
    },
    [startTranscription]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return { machineState, startTranscription, cancel, resume, reset };
}

import { useCallback, useReducer } from 'react';
import { TranscriptSegment } from '@/types';
import { getDecryptedKey } from '@/services/cryptoService';
import { uploadFile, generateTranscript } from '@/services/geminiService';

// --- State Types ---

export type TranscriptionState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error';

type TranscriptionEvent =
  | { type: 'START' }
  | { type: 'UPLOAD_COMPLETE' }
  | { type: 'PROCESSING_COMPLETE'; transcript: TranscriptSegment[] }
  | { type: 'ERROR'; error: string }
  | { type: 'PROGRESS'; percentage: number; segment: TranscriptSegment | null }
  | { type: 'RESET' };

interface TranscriptionMachineState {
  state: TranscriptionState;
  progress: number;
  currentSegment: TranscriptSegment | null;
  transcript: TranscriptSegment[];
  error: string | null;
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
  },
  processing: {
    PROCESSING_COMPLETE: 'completed',
    ERROR: 'error',
    PROGRESS: 'processing',
  },
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
      };

    case 'UPLOAD_COMPLETE':
      return {
        ...current,
        state: 'processing',
        progress: 0,
      };

    case 'PROGRESS':
      return {
        ...current,
        progress: event.percentage,
        currentSegment: event.segment ?? current.currentSegment,
      };

    case 'PROCESSING_COMPLETE':
      return {
        ...current,
        state: 'completed',
        progress: 100,
        transcript: event.transcript,
      };

    case 'ERROR':
      return {
        ...current,
        state: 'error',
        error: event.error,
      };

    case 'RESET':
      return { ...initialState };

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
    duration: number
  ) => Promise<void>;
  reset: () => void;
}

export function useTranscription(): UseTranscriptionReturn {
  const [machineState, dispatch] = useReducer(
    transcriptionReducer,
    initialState
  );

  const startTranscription = useCallback(
    async (file: File, mimeType: string, duration: number) => {
      dispatch({ type: 'START' });

      try {
        // Decrypt API key from storage
        const apiKey = await getDecryptedKey();
        if (!apiKey) {
          throw new Error(
            'No API key configured. Please add your Gemini API key in Settings.'
          );
        }

        // Upload phase
        const fileUri = await uploadFile(apiKey, file, (percentage: number) => {
          dispatch({ type: 'PROGRESS', percentage, segment: null });
        });

        dispatch({ type: 'UPLOAD_COMPLETE' });

        // Transcription phase
        const transcript = await generateTranscript(
          apiKey,
          fileUri,
          mimeType,
          duration,
          (percentage: number, segment: TranscriptSegment | null) => {
            dispatch({ type: 'PROGRESS', percentage, segment });
          }
        );

        dispatch({ type: 'PROCESSING_COMPLETE', transcript });
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'An error occurred during transcription.';
        dispatch({ type: 'ERROR', error: message });
      }
    },
    []
  );

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return { machineState, startTranscription, reset };
}

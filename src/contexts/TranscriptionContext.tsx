import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { TranscriptSegment } from '@/types';
import { getDecryptedKey } from '@/services/cryptoService';
import { uploadFile, generateTranscript } from '@/services/geminiService';
import {
  debouncedSaveTranscript,
  flushPendingWrites,
  saveTranscript,
} from '@/services/storageService';
import { useProjects } from '@/contexts/ProjectsContext';

// --- State Types (moved from useTranscription.ts) ---

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

// --- Extended Context State ---

interface TranscriptionContextState extends TranscriptionMachineState {
  activeProjectId: string | null;
  isTranscribing: boolean;
}

interface TranscriptionActions {
  startTranscription: (
    file: File,
    mimeType: string,
    duration: number,
    projectId: string
  ) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

// --- Transition Map (unchanged from useTranscription.ts) ---

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

// --- Reducer (unchanged from useTranscription.ts) ---

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

// --- Split Contexts (performance optimization) ---

const TranscriptionStateContext = createContext<
  TranscriptionContextState | undefined
>(undefined);
const TranscriptionActionsContext = createContext<
  TranscriptionActions | undefined
>(undefined);

// --- Provider ---

export function TranscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [machineState, dispatch] = useReducer(
    transcriptionReducer,
    initialState
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const { state: projectsState, updateProject } = useProjects();

  // Derive isTranscribing from machine state
  const isTranscribing = ['uploading', 'processing', 'cancelling'].includes(
    machineState.state
  );

  // --- Interrupt detection on initialization ---
  useEffect(() => {
    if (!projectsState.initialized) return;
    if (machineState.state !== 'idle') return;

    for (const project of projectsState.projects) {
      if (project.status === 'uploading' || project.status === 'processing') {
        updateProject({ ...project, status: 'interrupted' });
      }
    }
    // Only run once on initialization
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsState.initialized]);

  // --- beforeunload: show confirmation dialog during active transcription ---
  useEffect(() => {
    if (!isTranscribing) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      flushPendingWrites();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTranscribing]);

  // --- Actions ---

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

      setActiveProjectId(projectId);
      dispatch({ type: 'START' });

      // Update project status to uploading
      const project = projectsState.projects.find((p) => p.id === projectId);
      if (project) {
        updateProject({ ...project, status: 'uploading' });
      }

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

        // Update project status to processing
        const currentProject = projectsState.projects.find(
          (p) => p.id === projectId
        );
        if (currentProject) {
          updateProject({ ...currentProject, status: 'processing' });
        }

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

        // Save final transcript
        saveTranscript({
          projectId,
          segments: transcript,
          completedAt: new Date().toISOString(),
          fileUri,
        });

        // Reconcile metadata: include correct segmentCount and update duration
        const maxTimestamp =
          transcript.length > 0
            ? Math.max(...transcript.map((s) => s.timestamp ?? 0))
            : 0;
        const completedProject = projectsState.projects.find(
          (p) => p.id === projectId
        );
        if (completedProject) {
          const reconciledDuration =
            maxTimestamp > completedProject.fileInfo.duration
              ? maxTimestamp
              : completedProject.fileInfo.duration;
          updateProject({
            ...completedProject,
            status: 'completed',
            segmentCount: transcript.length,
            fileInfo: {
              ...completedProject.fileInfo,
              duration: reconciledDuration,
            },
          });
        }
      } catch (err) {
        // Handle cancellation as a normal flow, not an error
        if (err instanceof DOMException && err.name === 'AbortError') {
          dispatch({
            type: 'CANCELLED',
            segments: [...accumulatedSegments],
          });
          // Flush any pending writes immediately on cancellation
          flushPendingWrites();

          // Update project status to cancelled
          const cancelledProject = projectsState.projects.find(
            (p) => p.id === projectId
          );
          if (cancelledProject) {
            updateProject({
              ...cancelledProject,
              status: 'cancelled',
              segmentCount: accumulatedSegments.length,
            });
          }
          return;
        }

        const message =
          err instanceof Error
            ? err.message
            : 'An error occurred during transcription.';
        dispatch({ type: 'ERROR', error: message });

        // Update project status to error
        const errorProject = projectsState.projects.find(
          (p) => p.id === projectId
        );
        if (errorProject) {
          updateProject({ ...errorProject, status: 'error' });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      dispatch({ type: 'CANCEL' });
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
    setActiveProjectId(null);
  }, []);

  // --- Memoized context values ---

  const stateValue = useMemo<TranscriptionContextState>(
    () => ({
      ...machineState,
      activeProjectId,
      isTranscribing,
    }),
    [machineState, activeProjectId, isTranscribing]
  );

  const actionsValue = useMemo<TranscriptionActions>(
    () => ({
      startTranscription,
      cancel,
      reset,
    }),
    [startTranscription, cancel, reset]
  );

  return (
    <TranscriptionStateContext.Provider value={stateValue}>
      <TranscriptionActionsContext.Provider value={actionsValue}>
        {children}
      </TranscriptionActionsContext.Provider>
    </TranscriptionStateContext.Provider>
  );
}

// --- Consumer Hooks ---

export function useTranscriptionState(): TranscriptionContextState {
  const context = useContext(TranscriptionStateContext);
  if (context === undefined) {
    throw new Error(
      'useTranscriptionState must be used within a TranscriptionProvider'
    );
  }
  return context;
}

export function useTranscriptionActions(): TranscriptionActions {
  const context = useContext(TranscriptionActionsContext);
  if (context === undefined) {
    throw new Error(
      'useTranscriptionActions must be used within a TranscriptionProvider'
    );
  }
  return context;
}

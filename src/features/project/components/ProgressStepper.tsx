import React, { useRef, useMemo, useState, useEffect } from 'react';

// --- Types ---

interface ProgressStepperProps {
  currentStage: 'uploading' | 'processing' | 'transcribing' | 'complete';
  progress: number; // 0-100 unified progress
  timeEstimate: string | null; // e.g., "~2 min remaining" or null if too early
  onCancel?: () => void; // Cancel button callback (optional -- hidden when not provided)
  isComplete?: boolean; // Triggers the completion transition
  onFadeOutDone?: () => void; // Called when completion fade-out animation finishes
}

// --- Helpers ---

const STAGES = ['Uploading', 'Processing', 'Transcribing', 'Complete'] as const;

const STAGE_INDEX: Record<ProgressStepperProps['currentStage'], number> = {
  uploading: 0,
  processing: 1,
  transcribing: 2,
  complete: 3,
};

function estimateRemainingTime(
  progressPercent: number,
  elapsedMs: number
): string | null {
  if (progressPercent < 5 || elapsedMs < 3000) return null;
  const remainingPercent = 100 - progressPercent;
  const msPerPercent = elapsedMs / progressPercent;
  const remainingMs = remainingPercent * msPerPercent;
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  if (remainingMinutes <= 1) return '< 1 min remaining';
  return `~${remainingMinutes} min remaining`;
}

// --- Component ---

const ProgressStepper: React.FC<ProgressStepperProps> = ({
  currentStage,
  progress,
  timeEstimate: timeEstimateProp,
  onCancel,
  isComplete = false,
  onFadeOutDone,
}) => {
  const startTimeRef = useRef(Date.now());
  const [completionFlash, setCompletionFlash] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const currentIndex = STAGE_INDEX[currentStage];

  // Show indeterminate animation when processing but no real progress yet
  const isIndeterminate = currentStage === 'processing' && progress < 5;

  // Compute time estimate from progress and elapsed time
  const computedEstimate = useMemo(() => {
    const elapsed = Date.now() - startTimeRef.current;
    return estimateRemainingTime(progress, elapsed);
  }, [progress]);

  const displayEstimate = timeEstimateProp ?? computedEstimate;

  // Handle completion flash and fade-out
  useEffect(() => {
    if (isComplete && progress >= 100) {
      setCompletionFlash(true);
      const flashTimer = setTimeout(() => {
        setCompletionFlash(false);
        setFadeOut(true);
      }, 1000);
      // Notify parent when fade-out animation completes (1s flash + 1s fade)
      const doneTimer = setTimeout(() => {
        onFadeOutDone?.();
      }, 2000);
      return () => {
        clearTimeout(flashTimer);
        clearTimeout(doneTimer);
      };
    }
  }, [isComplete, progress, onFadeOutDone]);

  return (
    <div
      className={`w-full transition-opacity duration-1000 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Stage indicators */}
      <div className="mb-3 flex items-center justify-between">
        {STAGES.map((label, i) => {
          const isPast = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <React.Fragment key={label}>
              {/* Connector line before each stage (except first) */}
              {i > 0 && (
                <div
                  className={`mx-1 h-0.5 flex-1 ${isPast || isCurrent ? 'bg-indigo-600' : 'bg-slate-200'}`}
                />
              )}

              {/* Stage dot + label */}
              <div className="flex flex-col items-center">
                <div
                  className={`h-3 w-3 rounded-full ${
                    isPast
                      ? 'bg-indigo-600'
                      : isCurrent
                        ? 'animate-pulse bg-indigo-600'
                        : 'bg-slate-200'
                  }`}
                />
                <span
                  className={`mt-1 text-xs ${
                    isPast
                      ? 'font-bold text-indigo-700'
                      : isCurrent
                        ? 'font-bold text-indigo-700'
                        : isFuture
                          ? 'text-slate-400'
                          : ''
                  }`}
                >
                  {label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        {isIndeterminate ? (
          <div className="h-full w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-indigo-400" />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              completionFlash ? 'bg-green-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        )}
      </div>

      {/* Time estimate + Cancel row */}
      <div className="mt-1.5 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {isIndeterminate
            ? 'Waiting for AI...'
            : `${Math.round(progress)}% · ${displayEstimate ?? 'Estimating...'}`}
        </span>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 transition-colors hover:text-red-500"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgressStepper;

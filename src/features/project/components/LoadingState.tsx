import React from 'react';
import { TranscriptSegment, TranscriptionStatus } from '@/types';

interface LoadingStateProps {
  progress: number;
  currentSegment: TranscriptSegment | null;
  status?: TranscriptionStatus;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  progress,
  currentSegment,
  status,
}) => {
  return (
    <div className="animate-fade-in mx-auto w-full max-w-2xl py-8 text-center">
      {/* Status Icon */}
      <div className="relative mx-auto mb-6 h-16 w-16">
        {progress < 100 ? (
          <>
            <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-100 opacity-50"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
          </div>
        )}
      </div>

      {/* Status Text */}
      <h3 className="mb-2 text-xl font-bold text-gray-800">
        {status === TranscriptionStatus.UPLOADING
          ? 'Uploading File...'
          : progress === 0
            ? 'Initializing Model...'
            : progress < 100
              ? 'Transcribing Interview...'
              : 'Finalizing...'}
      </h3>

      {/* Progress Bar */}
      <div className="mb-4 h-4 w-full overflow-hidden rounded-full bg-gray-200 shadow-inner">
        <div
          className="flex h-4 items-center justify-end rounded-full bg-indigo-600 pr-2 transition-all duration-500 ease-out"
          style={{ width: `${Math.max(progress, 5)}%` }}
        >
          <span className="text-[10px] font-bold text-white">{progress}%</span>
        </div>
      </div>

      {/* Live Preview */}
      <div className="relative flex min-h-[100px] flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        {currentSegment ? (
          <div className="animate-slide-up w-full">
            <div className="mb-2 flex items-center justify-center">
              <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-indigo-700">
                {currentSegment.speaker}
              </span>
              {currentSegment.timestamp && (
                <span className="ml-2 font-mono text-xs text-gray-400">
                  {new Date(currentSegment.timestamp * 1000)
                    .toISOString()
                    .substr(14, 5)}
                </span>
              )}
            </div>
            <p className="text-lg font-medium leading-relaxed text-gray-800">
              &ldquo;{currentSegment.englishText}&rdquo;
            </p>
            {currentSegment.originalText !== currentSegment.englishText && (
              <p className="mt-1 text-sm italic text-gray-400">
                ({currentSegment.originalText})
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm italic text-gray-400">
            Waiting for audio processing to start...
          </p>
        )}

        {/* Decorative pulse for "live" feel */}
        <div className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-red-500"></div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Processing with Gemini 3 Pro • Large files may take a moment to start
      </p>
    </div>
  );
};

export default LoadingState;

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import type { ProjectMetadata } from '@/services/storageService.types';
import type { TranscriptSegment } from '@/types';
import { getTranscript } from '@/services/storageService';
import TranscriptView from '@/features/project/components/TranscriptView';

interface TranscriptPanelProps {
  project: ProjectMetadata;
}

export default function TranscriptPanel({ project }: TranscriptPanelProps) {
  const navigate = useNavigate();
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const data = getTranscript(project.id);
    setSegments(data?.segments ?? null);
    setLoading(false);
  }, [project.id]);

  // --- Idle: no transcription started ---
  if (project.status === 'idle') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <svg
            className="h-8 w-8 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-700">
          No Transcription Started
        </h3>
        <p className="text-sm text-slate-500">
          This project has been created but transcription has not begun yet.
        </p>
      </div>
    );
  }

  // --- Uploading / Processing: show spinner ---
  if (project.status === 'uploading' || project.status === 'processing') {
    const statusText =
      project.status === 'uploading'
        ? 'Uploading file...'
        : 'Processing transcript...';
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mb-4">
          <svg
            className="h-10 w-10 animate-spin text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-700">
          {statusText}
        </h3>
        <p className="text-sm text-slate-500">
          Please wait while we process your recording.
        </p>
      </div>
    );
  }

  // --- Error: show error with explanation ---
  if (project.status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-700">
          Transcription Failed
        </h3>
        <p className="mb-4 text-sm text-slate-500">
          Something went wrong while processing this recording. You can try
          again by creating a new project with the same file.
        </p>
        <p className="text-xs text-slate-400">
          If the problem persists, check your API key in Settings or try a
          smaller file.
        </p>
      </div>
    );
  }

  // --- Cancelled: show recovery card with partial transcript ---
  if (project.status === 'cancelled') {
    return (
      <div className="p-6">
        {/* Inline recovery card */}
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">
            Transcription was interrupted
          </h3>
          <p className="mt-1 text-sm text-amber-700">
            {project.segmentCount > 0
              ? `${project.segmentCount} segment${project.segmentCount !== 1 ? 's' : ''} recovered.`
              : 'No segments were saved.'}
          </p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => navigate('/project/new')}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              Re-upload & Transcribe
            </button>
          </div>
        </div>

        {/* Show partial transcript if available */}
        {segments && segments.length > 0 && (
          <div className="opacity-70">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Partial Transcript
            </p>
            <TranscriptView transcript={segments} />
          </div>
        )}
      </div>
    );
  }

  // --- Completed: load and show transcript ---
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-sm text-slate-400">Loading transcript...</div>
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <h3 className="mb-2 text-lg font-semibold text-slate-700">
          No Transcript Data
        </h3>
        <p className="text-sm text-slate-500">
          This project is marked as completed but no transcript data was found.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <TranscriptView transcript={segments} />
    </div>
  );
}

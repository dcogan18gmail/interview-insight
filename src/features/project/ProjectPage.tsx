import { useParams, useNavigate } from 'react-router';
import { useTranscription } from '@/features/project/hooks/useTranscription';
import { useSettings } from '@/contexts/SettingsContext';
import FileUpload from '@/features/project/components/FileUpload';
import LoadingState from '@/features/project/components/LoadingState';
import TranscriptView from '@/features/project/components/TranscriptView';
import { FileData, TranscriptionStatus } from '@/types';

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { state: settingsState } = useSettings();
  const { machineState, startTranscription, reset } = useTranscription();

  const isNew = projectId === 'new';
  const _ = isNew; // Acknowledge -- existing project loading deferred to Phase 5

  const handleFileSelected = (fileData: FileData) => {
    if (!fileData.file) return;
    if (!settingsState.apiKeyConfigured) {
      navigate('/settings');
      return;
    }
    startTranscription(fileData.file, fileData.type, fileData.duration);
  };

  const handleReset = () => {
    reset();
  };

  // Map hook state names to the TranscriptionStatus enum used by LoadingState
  const statusMap: Record<string, TranscriptionStatus> = {
    idle: TranscriptionStatus.IDLE,
    uploading: TranscriptionStatus.UPLOADING,
    processing: TranscriptionStatus.PROCESSING,
    completed: TranscriptionStatus.COMPLETED,
    error: TranscriptionStatus.ERROR,
  };

  const displayStatus =
    statusMap[machineState.state] ?? TranscriptionStatus.IDLE;

  return (
    <div className="flex flex-col items-center">
      {/* API Key Required Prompt */}
      {machineState.state === 'idle' && !settingsState.apiKeyConfigured && (
        <div className="animate-fade-in mb-8 w-full max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h3 className="mb-2 text-lg font-semibold text-amber-900">
            API Key Required
          </h3>
          <p className="mb-4 text-amber-700">
            To get started, you&apos;ll need to add your Gemini API key.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 font-medium text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
          >
            Open Settings
          </button>
        </div>
      )}

      {/* File Upload Stage */}
      {machineState.state === 'idle' && (
        <div className="animate-fade-in w-full max-w-2xl">
          <FileUpload onFileSelected={handleFileSelected} disabled={false} />
        </div>
      )}

      {/* Processing Stage */}
      {(machineState.state === 'uploading' ||
        machineState.state === 'processing') && (
        <LoadingState
          progress={machineState.progress}
          currentSegment={machineState.currentSegment}
          status={displayStatus}
        />
      )}

      {/* Error Stage */}
      {machineState.state === 'error' && (
        <div className="animate-fade-in w-full max-w-2xl rounded-xl border border-red-100 bg-red-50 p-8 text-center">
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
              ></path>
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            Processing Failed
          </h3>
          <p className="mb-6 text-gray-600">
            {machineState.error ?? 'Something went wrong.'}
          </p>
          <button
            onClick={handleReset}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results Stage */}
      {machineState.state === 'completed' && (
        <div className="w-full">
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleReset}
              className="flex items-center text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600"
            >
              <svg
                className="mr-1 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
              New Transcription
            </button>
          </div>
          <TranscriptView transcript={machineState.transcript} />
        </div>
      )}
    </div>
  );
}

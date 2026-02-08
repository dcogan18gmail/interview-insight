import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useTranscription } from '@/features/project/hooks/useTranscription';
import { useSettings } from '@/contexts/SettingsContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { saveTranscript } from '@/services/storageService';
import FileUpload from '@/features/project/components/FileUpload';
import ProgressStepper from '@/features/project/components/ProgressStepper';
import LiveTranscriptView from '@/features/project/components/LiveTranscriptView';
import TranscriptView from '@/features/project/components/TranscriptView';
import ConfirmDialog from '@/features/dashboard/components/ConfirmDialog';
import { FileData, TranscriptionStatus } from '@/types';

// --- Progress mapping helpers ---

function getProgressStage(
  state: string,
  progress: number
): 'uploading' | 'processing' | 'transcribing' | 'complete' {
  if (state === 'uploading') return 'uploading';
  if (state === 'processing' && progress < 5) return 'processing';
  if (state === 'processing') return 'transcribing';
  if (state === 'completed') return 'complete';
  return 'uploading';
}

function getUnifiedProgress(state: string, rawProgress: number): number {
  if (state === 'uploading') return Math.round(rawProgress * 0.25); // 0-25%
  if (state === 'processing') {
    if (rawProgress < 1) return 27; // Processing/init = 25-30%
    return 30 + Math.round(rawProgress * 0.65); // 30-95%
  }
  if (state === 'completed') return 100;
  return 0;
}

export default function ProjectPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { state: settingsState } = useSettings();
  const { machineState, startTranscription, cancel, reset } =
    useTranscription();
  const { state: projectsState, createProject, updateProject } = useProjects();

  const isNew = projectId === 'new';

  // Track the created project ID for the new project flow
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // Cancel confirmation dialog state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // --- Existing project loading ---
  const existingProject =
    !isNew && projectId
      ? (projectsState.projects.find((p) => p.id === projectId) ?? null)
      : null;

  // Derive project name for downloads (from created or existing project)
  const activeProjectName =
    (createdProjectId
      ? projectsState.projects.find((p) => p.id === createdProjectId)?.name
      : existingProject?.name) ?? undefined;

  // Redirect if existing project not found (after initialization)
  useEffect(() => {
    if (!isNew && projectId && projectsState.initialized && !existingProject) {
      navigate('/', { replace: true });
    }
  }, [isNew, projectId, projectsState.initialized, existingProject, navigate]);

  // --- New project: handle file selection and start transcription ---
  const handleFileSelected = (fileData: FileData) => {
    if (!fileData.file) return;
    if (!settingsState.apiKeyConfigured) {
      navigate('/settings');
      return;
    }

    // Create project in storage immediately
    const fileInfo = {
      name: fileData.name,
      type: fileData.type,
      size: fileData.size,
      duration: fileData.duration,
    };
    const { project, ok } = createProject(fileData.name, fileInfo);
    if (ok) {
      setCreatedProjectId(project.id);
      // Don't navigate yet — stay on /project/new so CenterPanel keeps rendering
      // ProjectPage (with ProgressStepper + LiveTranscriptView).
      // Navigate to the real project URL on completion/error/cancel.
    }

    startTranscription(
      fileData.file,
      fileData.type,
      fileData.duration,
      project.id
    );
  };

  // --- Update project status through transcription lifecycle ---
  useEffect(() => {
    const targetId = createdProjectId;
    if (!targetId) return;

    const project = projectsState.projects.find((p) => p.id === targetId);
    if (!project) return;

    if (machineState.state === 'uploading' && project.status !== 'uploading') {
      updateProject({ ...project, status: 'uploading' });
    } else if (
      machineState.state === 'processing' &&
      project.status !== 'processing'
    ) {
      updateProject({ ...project, status: 'processing' });
    } else if (
      machineState.state === 'completed' &&
      project.status !== 'completed'
    ) {
      const segments = machineState.transcript;
      saveTranscript({
        projectId: targetId,
        segments,
        completedAt: new Date().toISOString(),
      });

      // Reconcile metadata: include correct segmentCount and update duration
      // if transcript timestamps exceed browser-detected duration.
      const maxTimestamp =
        segments.length > 0
          ? Math.max(...segments.map((s) => s.timestamp ?? 0))
          : 0;
      const reconciledDuration =
        maxTimestamp > project.fileInfo.duration
          ? maxTimestamp
          : project.fileInfo.duration;

      updateProject({
        ...project,
        status: 'completed',
        segmentCount: segments.length,
        fileInfo: { ...project.fileInfo, duration: reconciledDuration },
      });
      // Navigate to the real project URL now that transcription is done
      navigate(`/project/${targetId}`, { replace: true });
    } else if (machineState.state === 'error' && project.status !== 'error') {
      updateProject({ ...project, status: 'error' });
      navigate(`/project/${targetId}`, { replace: true });
    } else if (
      machineState.state === 'cancelled' &&
      project.status !== 'cancelled'
    ) {
      updateProject({
        ...project,
        status: 'cancelled',
        segmentCount: machineState.transcript.length,
      });
      navigate(`/project/${targetId}`, { replace: true });
    }
  }, [
    machineState.state,
    createdProjectId,
    projectsState.projects,
    updateProject,
    machineState.transcript,
    navigate,
  ]);

  // Map hook state names to the TranscriptionStatus enum
  const statusMap: Record<string, TranscriptionStatus> = {
    idle: TranscriptionStatus.IDLE,
    uploading: TranscriptionStatus.UPLOADING,
    processing: TranscriptionStatus.PROCESSING,
    cancelling: TranscriptionStatus.CANCELLING,
    cancelled: TranscriptionStatus.CANCELLED,
    completed: TranscriptionStatus.COMPLETED,
    error: TranscriptionStatus.ERROR,
  };

  const _displayStatus =
    statusMap[machineState.state] ?? TranscriptionStatus.IDLE;

  const handleReset = () => {
    reset();
    setCreatedProjectId(null);
    navigate('/project/new', { replace: true });
  };

  // --- Cancel confirmation handlers ---
  const handleCancelClick = () => setShowCancelConfirm(true);
  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    cancel();
  };
  const handleCancelDismiss = () => setShowCancelConfirm(false);

  // --- Render for existing project (not a newly created one) ---
  if (!isNew && existingProject && !createdProjectId) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold text-slate-800">
          {existingProject.interviewee ?? existingProject.name}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Status: {existingProject.status} &middot;{' '}
          {existingProject.segmentCount} segments
        </p>
      </div>
    );
  }

  // --- Render for new/in-progress project ---
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

      {/* Processing Stage: ProgressStepper + LiveTranscriptView */}
      {(machineState.state === 'uploading' ||
        machineState.state === 'processing' ||
        machineState.state === 'cancelling') && (
        <div className="w-full">
          {/* Progress stepper + bar (inline, scrolls away) */}
          <ProgressStepper
            currentStage={getProgressStage(
              machineState.state,
              machineState.progress
            )}
            progress={getUnifiedProgress(
              machineState.state,
              machineState.progress
            )}
            timeEstimate={null}
            onCancel={
              machineState.state !== 'cancelling'
                ? handleCancelClick
                : undefined
            }
            isComplete={false}
          />

          {/* Live transcript display */}
          <div className="mt-4" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            <LiveTranscriptView
              segments={machineState.transcript}
              staleSegments={machineState.staleSegments}
              isStreaming={machineState.state !== 'cancelling'}
            />
          </div>
        </div>
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

      {/* Cancelled Stage: partial transcript + recovery */}
      {machineState.state === 'cancelled' && (
        <div className="w-full">
          {/* Inline recovery notification */}
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">
              Transcription Cancelled
            </h3>
            <p className="mt-1 text-sm text-amber-700">
              {machineState.transcript.length} segment
              {machineState.transcript.length !== 1 ? 's' : ''} saved.
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleReset}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Start Fresh
              </button>
            </div>
          </div>

          {/* Show partial transcript */}
          {machineState.transcript.length > 0 && (
            <TranscriptView
              transcript={machineState.transcript}
              projectName={activeProjectName}
            />
          )}
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
          <TranscriptView
            transcript={machineState.transcript}
            projectName={activeProjectName}
          />
        </div>
      )}

      {/* Cancel confirmation dialog */}
      <ConfirmDialog
        open={showCancelConfirm}
        title="Cancel Transcription"
        message="Cancel transcription? Partial results will be saved."
        confirmLabel="Cancel Transcription"
        cancelLabel="Keep Going"
        variant="danger"
        onConfirm={handleConfirmCancel}
        onCancel={handleCancelDismiss}
      />
    </div>
  );
}

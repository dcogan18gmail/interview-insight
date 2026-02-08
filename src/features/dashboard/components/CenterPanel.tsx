import { useParams } from 'react-router';
import { useProjects } from '@/contexts/ProjectsContext';
import { useTranscriptionState } from '@/contexts/TranscriptionContext';
import ProjectPage from '@/features/project/ProjectPage';
import WelcomeView from './WelcomeView';
import OnboardingView from './OnboardingView';
import TranscriptPanel from './TranscriptPanel';

export default function CenterPanel() {
  const { projectId } = useParams();
  const { state } = useProjects();
  const { projects } = state;
  const transcriptionState = useTranscriptionState();

  // No project selected -- choose between onboarding and welcome
  if (!projectId) {
    if (projects.length === 0) {
      return <OnboardingView />;
    }
    return <WelcomeView />;
  }

  // New project -- render file upload flow
  if (projectId === 'new') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <ProjectPage />
      </div>
    );
  }

  // Existing project -- look up
  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="text-center">
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
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-700">
            Project Not Found
          </h3>
          <p className="text-sm text-slate-500">
            This project may have been deleted or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  // Active transcription on this project -- show live view via ProjectPage
  if (
    transcriptionState.activeProjectId === projectId &&
    transcriptionState.isTranscribing
  ) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <ProjectPage />
      </div>
    );
  }

  // Completed/idle/etc -- show TranscriptPanel
  return <TranscriptPanel project={project} />;
}

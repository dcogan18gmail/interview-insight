import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranscriptionState } from '@/contexts/TranscriptionContext';
import { useProjects } from '@/contexts/ProjectsContext';
import { toast } from 'sonner';

/**
 * TranscriptionWatcher - Renderless component that watches transcription state
 * changes and fires toast notifications for background transcription events.
 *
 * Behaviors:
 * 1. Nav-away toast: When user navigates away from the active project while
 *    transcription is running, shows "Transcription continuing in background".
 * 2. Completion toast: When transcription completes while user is on another
 *    screen, shows a clickable toast to navigate to the project.
 * 3. Error toast: When transcription fails while user is on another screen,
 *    shows a persistent clickable error toast.
 */
export default function TranscriptionWatcher() {
  const transcriptionState = useTranscriptionState();
  const { state: projectsState } = useProjects();
  const navigate = useNavigate();
  const location = useLocation();

  const prevStateRef = useRef(transcriptionState.state);
  const prevPathRef = useRef(location.pathname);
  const activeProjectIdRef = useRef(transcriptionState.activeProjectId);

  // --- Nav-away toast ---
  useEffect(() => {
    const prevPath = prevPathRef.current;
    const currentPath = location.pathname;
    prevPathRef.current = currentPath;

    if (
      !transcriptionState.isTranscribing ||
      !transcriptionState.activeProjectId
    )
      return;

    const wasOnActiveProject =
      prevPath.includes(transcriptionState.activeProjectId) ||
      prevPath === '/project/new';
    const isOnActiveProject = currentPath.includes(
      transcriptionState.activeProjectId
    );

    if (wasOnActiveProject && !isOnActiveProject) {
      toast('Transcription continuing in background', { duration: 3000 });
    }
  }, [
    location.pathname,
    transcriptionState.isTranscribing,
    transcriptionState.activeProjectId,
  ]);

  // --- Completion/error toast ---
  useEffect(() => {
    const prevState = prevStateRef.current;
    const currentState = transcriptionState.state;
    prevStateRef.current = currentState;
    activeProjectIdRef.current = transcriptionState.activeProjectId;

    // Only fire on state transitions
    if (prevState === currentState) return;

    const projectId =
      transcriptionState.activeProjectId ?? activeProjectIdRef.current;
    if (!projectId) return;

    const project = projectsState.projects.find((p) => p.id === projectId);
    const projectName = project?.interviewee ?? project?.name ?? 'Unknown';

    const isOnActiveProject = location.pathname.includes(projectId);

    if (currentState === 'completed' && !isOnActiveProject) {
      toast.success(`Transcription complete: ${projectName}`, {
        action: {
          label: 'View',
          onClick: () => navigate(`/project/${projectId}`),
        },
        duration: 8000,
      });
    } else if (currentState === 'error' && !isOnActiveProject) {
      toast.error(`Transcription failed: ${projectName}`, {
        action: {
          label: 'View',
          onClick: () => navigate(`/project/${projectId}`),
        },
      });
    }
  }, [
    transcriptionState.state,
    transcriptionState.activeProjectId,
    projectsState.projects,
    location.pathname,
    navigate,
  ]);

  return null; // Renderless component
}

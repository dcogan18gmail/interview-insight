import { useParams, useNavigate } from 'react-router';
import ProjectPage from '@/features/project/ProjectPage';

export default function CenterPanel() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // No project selected -- show welcome / empty state
  if (!projectId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="mb-3 text-2xl font-bold text-slate-900">
            Welcome to Interview Insight
          </h2>
          <p className="mx-auto mb-6 max-w-md text-slate-600">
            Select a project from the sidebar or start a new transcription.
          </p>
          <button
            onClick={() => navigate('/project/new')}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Project
          </button>
        </div>
      </div>
    );
  }

  // New project -- render existing file upload flow
  if (projectId === 'new') {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <ProjectPage />
      </div>
    );
  }

  // Existing project -- placeholder for transcript view (Plan 03 enhances)
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-semibold text-slate-700">
          Transcript View
        </h3>
        <p className="text-sm text-slate-500">
          Transcript content will appear here.
        </p>
      </div>
    </div>
  );
}

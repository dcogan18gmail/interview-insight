import { useNavigate } from 'react-router';
import { useProjects } from '@/contexts/ProjectsContext';

export default function WelcomeView() {
  const navigate = useNavigate();
  const { state } = useProjects();
  const { projects } = state;

  const completedCount = projects.filter(
    (p) => p.status === 'completed'
  ).length;
  const totalSegments = projects.reduce((sum, p) => sum + p.segmentCount, 0);

  const mostRecent =
    projects.length > 0
      ? [...projects].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0]
      : null;

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <h2 className="mb-2 text-2xl font-bold text-slate-800">
        Interview Insight
      </h2>
      <p className="mb-8 text-slate-500">
        Select a project from the sidebar or start a new transcription.
      </p>

      <div className="mb-8 grid grid-cols-3 gap-6 text-center">
        <div>
          <div className="text-2xl font-bold text-indigo-600">
            {projects.length}
          </div>
          <div className="text-xs text-slate-400">Projects</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">
            {completedCount}
          </div>
          <div className="text-xs text-slate-400">Completed</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-slate-600">
            {totalSegments}
          </div>
          <div className="text-xs text-slate-400">Segments</div>
        </div>
      </div>

      <button
        onClick={() => navigate('/project/new')}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
      >
        <svg
          className="h-5 w-5"
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

      {mostRecent && (
        <p className="mt-6 text-xs text-slate-400">
          Last activity: {mostRecent.name} &middot;{' '}
          {new Date(mostRecent.updatedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

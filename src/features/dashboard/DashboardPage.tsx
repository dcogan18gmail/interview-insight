import { useNavigate } from 'react-router';
import { useProjects } from '@/contexts/ProjectsContext';

export default function DashboardPage() {
  const { state } = useProjects();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <div className="animate-fade-in mb-12 text-center">
        <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900">
          Turn Interviews into Text{' '}
          <span className="text-indigo-600">Instantly</span>
        </h2>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-600">
          Upload your audio or video interview files. Our AI detects the
          language, translates it to English, and formats it by speaker.
        </p>
      </div>

      {/* New Transcription Button */}
      <button
        onClick={() => navigate('/project/new')}
        className="mb-10 flex items-center rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 hover:shadow-indigo-300"
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
          ></path>
        </svg>
        New Transcription
      </button>

      {/* Project List */}
      {state.projects.length > 0 ? (
        <div className="w-full max-w-2xl space-y-3">
          <h3 className="mb-4 text-lg font-semibold text-slate-700">
            Recent Projects
          </h3>
          {state.projects.map((project) => (
            <button
              key={project.id}
              onClick={() => navigate(`/project/${project.id}`)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <h4 className="truncate font-medium text-slate-800">
                  {project.name}
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  {new Date(project.createdAt).toLocaleDateString()} &middot;{' '}
                  {project.segmentCount} segments &middot;{' '}
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                      project.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : project.status === 'error'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {project.status}
                  </span>
                </p>
              </div>
              <svg
                className="ml-4 h-5 w-5 flex-shrink-0 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ))}
        </div>
      ) : (
        <div className="w-full max-w-2xl rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-500">
            No projects yet. Start a new transcription to get going.
          </p>
        </div>
      )}
    </div>
  );
}

import { useProjects } from '@/contexts/ProjectsContext';

interface MetadataPanelProps {
  projectId: string;
}

export default function MetadataPanel({ projectId }: MetadataPanelProps) {
  const { state } = useProjects();
  const project = state.projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <aside className="w-72 flex-shrink-0 border-l border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-400">Project not found</p>
      </aside>
    );
  }

  return (
    <aside className="w-72 flex-shrink-0 overflow-y-auto border-l border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Project Details
      </h3>
      <dl className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-slate-400">Name</dt>
          <dd className="mt-0.5 text-sm text-slate-700">{project.name}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Status</dt>
          <dd className="mt-0.5">
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
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Interviewee</dt>
          <dd className="mt-0.5 text-sm text-slate-700">
            {project.interviewee ?? (
              <span className="italic text-slate-400">Not set</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Interviewer</dt>
          <dd className="mt-0.5 text-sm text-slate-700">
            {project.interviewer ?? (
              <span className="italic text-slate-400">Not set</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Interview Date</dt>
          <dd className="mt-0.5 text-sm text-slate-700">
            {project.interviewDate ?? (
              <span className="italic text-slate-400">Not set</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Language</dt>
          <dd className="mt-0.5 text-sm text-slate-700">
            {project.originalLanguage ?? (
              <span className="italic text-slate-400">Not set</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Location</dt>
          <dd className="mt-0.5 text-sm text-slate-700">
            {project.location ?? (
              <span className="italic text-slate-400">Not set</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Segments</dt>
          <dd className="mt-0.5 text-sm text-slate-700">
            {project.segmentCount}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">File</dt>
          <dd className="mt-0.5 truncate text-sm text-slate-700">
            {project.fileInfo.name}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-400">Created</dt>
          <dd className="mt-0.5 text-sm text-slate-700">
            {new Date(project.createdAt).toLocaleDateString()}
          </dd>
        </div>
      </dl>
    </aside>
  );
}

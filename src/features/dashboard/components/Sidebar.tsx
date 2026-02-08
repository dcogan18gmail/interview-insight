import { useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router';
import { useProjects } from '@/contexts/ProjectsContext';
import type { ProjectMetadata } from '@/services/storageService.types';

/** Format date as short form, e.g. "Jan 7" or "Dec 15, 2024" if not current year */
function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Get display label for a project: interviewee name, falling back to project name */
function getProjectLabel(project: ProjectMetadata): string {
  return project.interviewee ?? project.name;
}

/** Sort projects by updatedAt descending (most recent first) */
function sortByRecentlyUpdated(projects: ProjectMetadata[]): ProjectMetadata[] {
  return [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { state } = useProjects();
  const navigate = useNavigate();
  const { projectId } = useParams();

  const sortedProjects = sortByRecentlyUpdated(state.projects);

  return (
    <aside
      className={`flex flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50 transition-all duration-200 ${
        collapsed ? 'w-12' : 'w-64'
      }`}
    >
      {/* Sidebar header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
        {!collapsed && (
          <button
            onClick={() => navigate('/project/new')}
            className="flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <svg
              className="mr-1.5 h-4 w-4"
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
        )}
        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Project list */}
      <nav className="flex-1 overflow-y-auto">
        {collapsed ? (
          <div className="flex flex-col items-center gap-1 pt-2">
            {sortedProjects.map((project) => (
              <NavLink
                key={project.id}
                to={`/project/${project.id}`}
                className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                  projectId === project.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                }`}
                title={getProjectLabel(project)}
              >
                {getProjectLabel(project).charAt(0).toUpperCase()}
              </NavLink>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 p-2">
            {sortedProjects.map((project) => (
              <NavLink
                key={project.id}
                to={`/project/${project.id}`}
                className={`rounded-md px-3 py-2 transition-colors ${
                  projectId === project.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="truncate text-sm font-medium">
                  {getProjectLabel(project)}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  <span>{formatShortDate(project.updatedAt)}</span>
                  {project.originalLanguage && (
                    <>
                      <span className="text-slate-300">&middot;</span>
                      <span>{project.originalLanguage}</span>
                    </>
                  )}
                </div>
              </NavLink>
            ))}
            {sortedProjects.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-slate-400">
                No projects yet
              </p>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useProjects } from '@/contexts/ProjectsContext';
import type { ProjectMetadata } from '@/services/storageService.types';
import ConfirmDialog from './ConfirmDialog';

interface ProjectEntryProps {
  project: ProjectMetadata;
  isSelected: boolean;
}

/** Get display label: interviewee name with fallback to project name */
function getProjectLabel(project: ProjectMetadata): string {
  return project.interviewee ?? project.name;
}

export default function ProjectEntry({
  project,
  isSelected,
}: ProjectEntryProps) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { updateProject, removeProject } = useProjects();

  // Inline rename state
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Three-dot menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Focus and select input when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  // --- Inline rename handlers ---

  const startEditing = () => {
    setDraft(getProjectLabel(project));
    setEditing(true);
  };

  const saveRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== project.name) {
      updateProject({ ...project, name: trimmed });
    }
    setEditing(false);
  };

  const cancelRename = () => {
    setDraft(getProjectLabel(project));
    setEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  };

  const handleInputBlur = () => {
    saveRename();
  };

  // --- Delete handlers ---

  const handleDeleteClick = () => {
    setMenuOpen(false);
    setConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    setConfirmDelete(false);
    removeProject(project.id);
    // If the deleted project was currently selected, navigate to dashboard
    if (projectId === project.id) {
      navigate('/');
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(false);
  };

  // --- Incomplete indicator ---
  const isIncomplete =
    project.status === 'cancelled' || project.status === 'error';

  // --- Navigation ---

  const handleClick = () => {
    if (!editing) {
      navigate(`/project/${project.id}`);
    }
  };

  return (
    <>
      <div
        className={`group relative flex items-center rounded-md px-3 py-2 transition-colors ${
          isSelected
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Project name / inline edit */}
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              aria-label="Project name"
              className="w-full rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex items-center">
              <div
                className="truncate text-sm font-medium"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEditing();
                }}
              >
                {getProjectLabel(project)}
              </div>
              {isIncomplete && (
                <span
                  className="ml-1.5 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-amber-400"
                  title={
                    project.status === 'cancelled'
                      ? 'Transcription incomplete'
                      : 'Transcription failed'
                  }
                />
              )}
            </div>
          )}
        </div>

        {/* Three-dot menu button */}
        <div ref={menuRef} className="relative ml-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className={`rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 ${
              menuOpen ? 'visible' : 'invisible group-hover:visible'
            }`}
            aria-label="Project actions"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete '${project.name}'? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}
